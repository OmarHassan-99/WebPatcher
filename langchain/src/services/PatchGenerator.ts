import { ChatPromptTemplate } from "@langchain/core/prompts";
import { VulnerabilityInputSchema, PatchOutputSchema } from "../schemas";
import type { VulnerabilityInput, PatchOutput, PatchGeneratorConfig } from "../types";
import { PatchGenerationError } from "../types";
import { z } from "zod";
import { LLMProvider } from "./LLMProvider";

export class PatchGenerator {
    private promptTemplate: ChatPromptTemplate;
    private llmProvider: LLMProvider;

    constructor(config?: PatchGeneratorConfig) {
        // Initialize the Singleton Provider
        this.llmProvider = LLMProvider.getInstance({
            temperature: config?.temperature
        });

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
- DO NOT say “use parameterized queries” without showing the REAL code.
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
- Do NOT output placeholders like “your_table”.

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

        try {
            const formattedPrompt = await this.promptTemplate.formatMessages({
                alert_name: validatedInput.alert_name,
                risk_level: validatedInput.risk_level,
                affected_url: validatedInput.affected_url,
                description: validatedInput.description,
                evidence_section: evidenceSection,
                additional_context: additionalContext,
            });

            // Hand off the generation to the LLMProvider which supports Qwen -> Mistral fallback
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

    async generatePatches(
        vulnerabilities: VulnerabilityInput[],
        context?: any,
        onProgress?: (current: number, total: number, name: string) => void
    ): Promise<Array<{ success: true; data: PatchOutput } | { success: false; error: string }>> {
        let completed = 0;

        // Ensure LLM config is loaded in advance if it hasn't been already
        await this.llmProvider.initialize();

        const promises = vulnerabilities.map(async (vuln, i) => {
            try {
                const startTime = Date.now();
                const data = await this.generatePatch(vuln, context);
                const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`[PatchGenerator] Patch ${i + 1}/${vulnerabilities.length} completed in ${duration}s: ${vuln.alert_name}`);
                
                if (onProgress) {
                    completed++;
                    onProgress(completed, vulnerabilities.length, vuln.alert_name);
                }
                
                return { success: true as const, data };
            } catch (error) {
                console.error(`[PatchGenerator] Patch ${i + 1}/${vulnerabilities.length} FAILED: ${vuln.alert_name}`);
                
                if (onProgress) {
                    completed++;
                    onProgress(completed, vulnerabilities.length, vuln.alert_name);
                }
                
                return {
                    success: false as const,
                    error: error instanceof Error ? error.message : "Unknown error",
                };
            }
        });

        return Promise.all(promises);
    }
}
