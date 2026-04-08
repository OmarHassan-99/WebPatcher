import { ChatPromptTemplate } from "@langchain/core/prompts";
import { VulnerabilityInputSchema, PatchOutputSchema } from "../schemas";
import type { VulnerabilityInput, PatchOutput, PatchGeneratorConfig } from "../types";
import { PatchGenerationError } from "../types";
import { z } from "zod";
import { LLMProvider } from "./LLMProvider";
import { estimateTokens, truncateToTokenLimit, MAX_PROMPT_TOKENS } from "../utils/TokenEstimator";
import { RequestBudget } from "../utils/RequestBudget";
import { logger } from "../../logging/logger";

/** Priority order for severity levels (lower index = higher priority). */
const SEVERITY_PRIORITY: Record<string, number> = {
    High: 0,
    Medium: 1,
    Low: 2,
    Informational: 3,
};

export class PatchGenerator {
    private promptTemplate: ChatPromptTemplate;
    private lowSeverityPrompt: ChatPromptTemplate;
    private llmProvider: LLMProvider;
    private requestBudget: RequestBudget;

    constructor(config?: PatchGeneratorConfig) {
        this.llmProvider = LLMProvider.getInstance({
            temperature: config?.temperature
        });

        this.requestBudget = RequestBudget.getInstance();

        // ── Full prompt for HIGH / MEDIUM severity ──────────────
        this.promptTemplate = ChatPromptTemplate.fromMessages([
            [
                "system",
                `Act as a Senior Application Security Engineer and Secure Code Reviewer.

Your task is to generate a REALISTIC, production-ready remediation based on a ZAP alert.

You MUST output EXACTLY one valid JSON object with these 6 fields:
1. reasoning
2. vulnerable_code_example
3. analysis
4. root_cause
5. suggested_fix
6. file_type

Hard requirements:

- Output ONLY raw JSON. No markdown. No explanations.
- The fix MUST be directly implementable in a real project.
- DO NOT give generic advice.
- DO NOT say "use parameterized queries" without showing the REAL code.
- Infer the backend technology from the Tech Stack or from the URL/port/pattern.
- The vulnerable code MUST look like real code from a real controller/service/repository.
- Show the TRUE injection sink (query, ORM call, template render, header config, etc.).
- The suggested_fix MUST be a secure full replacement snippet, not a comment.
- If the issue is a missing header → show the exact middleware / server config.
- If the issue is input handling → show validation + safe usage.
- Keep examples minimal but realistic and runnable.

Code quality rules:

- Follow best practices of the detected framework.
- Use modern secure patterns (ORM, prepared statements, security middleware, CSP libraries, etc.).
- Do NOT use pseudo-code.
- Do NOT output placeholders like "your_table".

Reasoning rules:

- Max 2 short sentences.
- Focus only on why this code is vulnerable and why the fix works.

Context handling:

- If Tech Stack is provided → you MUST use it.
- If not provided → infer the most likely stack from the URL and vulnerability type and state it in file_type.

Security depth:

- Show both:
  - the vulnerable data flow
  - the secured data flow

Keep the response compact for fast LLM generation.`
            ],
            [
                "human",
                `Vulnerability: {alert_name}
Risk: {risk_level}
URL: {affected_url}
Description: {description}
{evidence_section}
{additional_context}`
            ],
        ]);

        // ── Compact prompt for LOW severity ─────────────────────
        this.lowSeverityPrompt = ChatPromptTemplate.fromMessages([
            [
                "system",
                `You are a security engineer. Output ONLY a JSON object with these 6 fields:
1. reasoning — 1 sentence why this is vulnerable
2. vulnerable_code_example — short realistic example
3. analysis — 1-2 sentence impact summary
4. root_cause — 1 sentence
5. suggested_fix — concise secure code patch
6. file_type — language/file type

Be concise. No markdown. No explanations outside the JSON.`
            ],
            [
                "human",
                `Vulnerability: {alert_name}
Risk: {risk_level}
URL: {affected_url}
Description: {description}
{evidence_section}
{additional_context}`
            ],
        ]);
    }

    async generatePatch(vulnerability: VulnerabilityInput, context?: any): Promise<PatchOutput> {
        const validatedInput = VulnerabilityInputSchema.parse(vulnerability);

        const evidenceSection = validatedInput.evidence
            ? `**Evidence:** ${validatedInput.evidence}`
            : "";

        const additionalParts: string[] = [];

        if (context) {
            const techStackParts: string[] = [];
            if (context.db?.length > 0) techStackParts.push(`- Database: ${context.db.join(", ")}`);
            if (context.lang?.length > 0) techStackParts.push(`- Languages: ${context.lang.join(", ")}`);
            if (context.fw?.length > 0) techStackParts.push(`- Frameworks: ${context.fw.join(", ")}`);
            if (context.os?.length > 0) techStackParts.push(`- OS: ${context.os.join(", ")}`);
            if (context.ws?.length > 0) techStackParts.push(`- Web Server: ${context.ws.join(", ")}`);
            if (context.scm?.length > 0) techStackParts.push(`- SCM: ${context.scm.join(", ")}`);
            if (context.branch) techStackParts.push(`- Branch: ${context.branch}`);

            if (techStackParts.length > 0) {
                additionalParts.push(`Tech Stack:\n${techStackParts.join("\n")}`);
            }
        }

        if (validatedInput.method) additionalParts.push(`Method: ${validatedInput.method}`);
        if (validatedInput.parameter) additionalParts.push(`Parameter: ${validatedInput.parameter}`);
        if (validatedInput.attack_vector) additionalParts.push(`Attack Vector: ${validatedInput.attack_vector}`);
        if (validatedInput.cwe_id) additionalParts.push(`CWE ID: ${validatedInput.cwe_id}`);
        if (validatedInput.solution) additionalParts.push(`ZAP Suggestion: ${validatedInput.solution}`);

        const additionalContext = additionalParts.length > 0
            ? `**Additional Context:**\n${additionalParts.join("\n\n")}`
            : "";

        // Choose prompt based on severity
        const isLow = validatedInput.risk_level === "Low";
        const template = isLow ? this.lowSeverityPrompt : this.promptTemplate;

        try {
            const templateVars = {
                alert_name: validatedInput.alert_name,
                risk_level: validatedInput.risk_level,
                affected_url: validatedInput.affected_url,
                description: validatedInput.description,
                evidence_section: evidenceSection,
                additional_context: additionalContext,
            };

            // ── Token estimation & truncation ───────────────────
            const rawPromptText = [
                templateVars.alert_name,
                templateVars.risk_level,
                templateVars.affected_url,
                templateVars.description,
                templateVars.evidence_section,
                templateVars.additional_context,
            ].join(" ");

            const estimatedTokenCount = estimateTokens(rawPromptText);

            // If the human-message portion is too long, truncate the description
            if (estimatedTokenCount > MAX_PROMPT_TOKENS) {
                logger.warn(
                    `[PatchGenerator] Prompt too long (~${estimatedTokenCount} tokens). Truncating description.`
                );
                const descBudget = Math.max(200, MAX_PROMPT_TOKENS - estimateTokens(
                    rawPromptText.replace(templateVars.description, "")
                ));
                templateVars.description = truncateToTokenLimit(templateVars.description, descBudget);
            }

            const formattedPrompt = await template.formatMessages(templateVars);

            const result = await this.llmProvider.invokeWithFallback(async (llm) => {
                const structuredLlm = llm.withStructuredOutput(PatchOutputSchema, {
                    name: "patch_recommendation",
                });
                return await structuredLlm.invoke(formattedPrompt);
            });

            const processedResult = {
                reasoning: result.reasoning || "Analysis based on the vulnerability description and available evidence.",
                vulnerable_code_example: result.vulnerable_code_example || "// Unable to generate specific vulnerable code example\n// Please review the analysis and suggested fix for remediation guidance",
                analysis: result.analysis || validatedInput.description,
                root_cause: result.root_cause || "See analysis for details",
                suggested_fix: result.suggested_fix || "Please implement security best practices as described in the analysis",
                file_type: result.file_type || "unknown"
            };

            return PatchOutputSchema.parse(processedResult);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const issues = error.issues as Array<{ message: string }>;
                throw new PatchGenerationError(
                    `LLM output validation failed: ${issues.map((issue) => issue.message).join(", ")}`,
                    error
                );
            }

            if (error instanceof Error) {
                throw new PatchGenerationError(
                    `Failed to generate patch: ${error.message}`,
                    error
                );
            }

            throw new PatchGenerationError("Unknown error occurred during patch generation");
        }
    }

    /**
     * Performs full-file security remediation.
     * Takes the content of a file and returns a secure, production-ready version of the FULL file.
     *
     * @param fileName - The name of the file being patched
     * @param content - The original content of the file
     * @returns The patched content as a string
     */
    async patchFile(fileName: string, content: string): Promise<string> {
        await this.llmProvider.initialize();

        const systemPrompt = `Act as a Senior Application Security Engineer and secure code remediation expert.

Your task is to FIX vulnerabilities while STRICTLY preserving the original behavior.

CRITICAL RULES:
1. Return ONLY the full updated file content.
2. DO NOT include explanations, comments about changes, or markdown code blocks.
3. DO NOT truncate, summarize, or omit any part of the file.
4. The output MUST be a complete, runnable file.

LOGIC PRESERVATION (VERY IMPORTANT):
- DO NOT change the application's logic, flow, or functionality.
- DO NOT remove features unless they are inherently insecure and must be replaced with a secure equivalent.
- If replacing insecure code, ensure the new code produces the SAME functional outcome.
- Maintain function names, routes, APIs, and structure unless absolutely necessary for security.

SECURITY REQUIREMENTS:
- Fix real vulnerabilities (SQL injection, XSS, command injection, path traversal, etc.)
- Sanitize and validate all external inputs
- Replace insecure APIs with secure alternatives (e.g., prepared statements)
- Avoid introducing new vulnerabilities

CODE QUALITY:
- Ensure syntax is correct and consistent
- Keep code clean and production-ready
- Do NOT leave placeholders, TODOs, or incomplete fixes

STRICT VERIFICATION BEFORE OUTPUT:
- Ensure the output is NOT identical to the input if vulnerabilities exist
- Ensure the file is COMPLETE (no missing parts)
- Ensure logic is preserved and still functional

FINAL OUTPUT:
Return ONLY the patched code as plain text.`;

        const humanPrompt = `You are given a source code file.

File Name: ${fileName}

Code:
${content}

Task:
Fix all security vulnerabilities while STRICTLY preserving functionality and behavior.

IMPORTANT:
- Do NOT break or alter logic
- Do NOT remove working features
- Do NOT shorten the file
- Return the FULL file with secure fixes applied

Return ONLY the updated code.`;
        try {
            const result = await this.llmProvider.invokeWithFallback(async (llm) => {
                const response = await llm.invoke([
                    ["system", systemPrompt],
                    ["human", humanPrompt]
                ]);
                return response.content as string;
            });

            // Clean up any accidental markdown blocks if the LLM ignores instructions
            return result.replace(/^```(?:\w+)?\n/, "").replace(/\n```$/, "").trim();
        } catch (error) {
            logger.error(`[PatchGenerator] Failed to patch file ${fileName}:`, error);
            throw error;
        }
    }

    async generatePatches(
        vulnerabilities: VulnerabilityInput[],
        context?: any,
        onProgress?: (current: number, total: number, name: string) => void
    ): Promise<Array<{ success: true; data: PatchOutput } | { success: false; error: string }>> {

        // Ensure LLM config is loaded in advance
        await this.llmProvider.initialize();

        // ── Sort by priority: High → Medium → Low ──────────────
        const sorted = [...vulnerabilities].sort((a, b) => {
            const pa = SEVERITY_PRIORITY[a.risk_level] ?? 99;
            const pb = SEVERITY_PRIORITY[b.risk_level] ?? 99;
            return pa - pb;
        });

        const total = sorted.length;
        const results: Array<{ success: true; data: PatchOutput } | { success: false; error: string }> = [];
        let completed = 0;

        logger.info(`[PatchGenerator] Starting sequential processing of ${total} vulnerability(ies)`);

        for (let i = 0; i < total; i++) {
            const vuln = sorted[i];

            // ── Budget check ────────────────────────────────────
            if (!this.requestBudget.canMakeRequest()) {
                const remaining = total - i;
                logger.warn(
                    `[PatchGenerator] Daily LLM request limit reached. ` +
                    `Remaining ${remaining} vulnerability(ies) deferred.`
                );
                // Fill deferred entries
                for (let j = i; j < total; j++) {
                    results.push({
                        success: false,
                        error: "Daily LLM request limit reached. Remaining vulnerabilities deferred.",
                    });
                    completed++;
                    if (onProgress) {
                        onProgress(completed, total, sorted[j].alert_name);
                    }
                }
                break;
            }

            // ── Log current processing state ────────────────────
            const rawPromptEstimate = estimateTokens(
                `${vuln.alert_name} ${vuln.risk_level} ${vuln.affected_url} ${vuln.description || ""}`
            );
            logger.info(
                `[PatchGenerator] Processing vulnerability ${i + 1}/${total} | ` +
                `Severity: ${vuln.risk_level.toUpperCase()} | ` +
                `Estimated tokens: ~${rawPromptEstimate} | ` +
                `Remaining request budget: ${this.requestBudget.getRemaining()}`
            );

            try {
                const startTime = Date.now();
                const data = await this.generatePatch(vuln, context);
                const duration = ((Date.now() - startTime) / 1000).toFixed(1);

                // Record the request *after* it succeeds
                this.requestBudget.recordRequest();

                logger.info(
                    `[PatchGenerator] Patch ${i + 1}/${total} completed in ${duration}s: ${vuln.alert_name}`
                );

                completed++;
                if (onProgress) {
                    onProgress(completed, total, vuln.alert_name);
                }

                results.push({ success: true as const, data });
            } catch (error) {
                // Still count the request even on failure
                this.requestBudget.recordRequest();

                logger.error(
                    `[PatchGenerator] Patch ${i + 1}/${total} FAILED: ${vuln.alert_name}`
                );

                completed++;
                if (onProgress) {
                    onProgress(completed, total, vuln.alert_name);
                }

                results.push({
                    success: false as const,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }

        logger.info(
            `[PatchGenerator] Done — ${results.filter(r => r.success).length}/${total} patches generated. ` +
            `Requests used today: ${this.requestBudget.getUsed()}`
        );

        return results;
    }
}
