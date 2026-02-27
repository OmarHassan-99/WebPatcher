import { ChatPromptTemplate } from "@langchain/core/prompts";
import { VulnerabilityInputSchema, PatchOutputSchema, BatchPatchOutputSchema } from "../schemas";
import type { VulnerabilityInput, PatchOutput, PatchGeneratorConfig } from "../types";
import { PatchGenerationError } from "../types";
import { z } from "zod";
import { GeminiProvider } from "../llm/gemini";
import { SmartPromptBuilder } from "../prompts/SmartPromptBuilder";
import { TokenBudgetManager } from "../llm/TokenBudgetManager";

export class PatchGenerator {
    private promptTemplate: ChatPromptTemplate;
    private llmProvider: GeminiProvider;
    private smartBuilder!: SmartPromptBuilder;

    constructor(config?: PatchGeneratorConfig) {
        this.llmProvider = GeminiProvider.getInstance();

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
    }

    private buildContext(context?: any): string {
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
        return additionalParts.length > 0
            ? `**Additional Context:**\n${additionalParts.join("\n\n")}`
            : "";
    }

    async generatePatch(vulnerability: VulnerabilityInput, context?: any): Promise<PatchOutput> {
        const validatedInput = VulnerabilityInputSchema.parse(vulnerability);

        const evidenceSection = validatedInput.evidence
            ? `**Evidence:** ${validatedInput.evidence}`
            : "";

        const additionalParts: string[] = [];
        const contextStr = this.buildContext(context);
        if (contextStr) additionalParts.push(contextStr);

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
        await this.llmProvider.initialize();

        const remaining = this.llmProvider.getRemainingRequests();
        console.log(`[PatchGenerator] Daily API budget: ${remaining} requests remaining.`);

        if (remaining <= 0) {
            console.error(`[PatchGenerator] No API requests left today. All patches will be marked as failed.`);
            return vulnerabilities.map((vuln) => ({
                success: false as const,
                error: "Daily API quota exhausted. Try again tomorrow or use a new API key.",
            }));
        }

        // ── Strategy 1: Deduplicate by alert_name ──────────────────────────
        const uniqueMap = new Map<string, { vuln: VulnerabilityInput; indices: number[] }>();
        vulnerabilities.forEach((vuln, i) => {
            const key = vuln.alert_name.toLowerCase();
            if (uniqueMap.has(key)) {
                uniqueMap.get(key)!.indices.push(i);
            } else {
                uniqueMap.set(key, { vuln, indices: [i] });
            }
        });

        const uniqueVulns = Array.from(uniqueMap.values()).map((v) => v.vuln);
        const dedupSaved = vulnerabilities.length - uniqueVulns.length;
        if (dedupSaved > 0) {
            console.log(`[PatchGenerator] Deduplication: ${vulnerabilities.length} vulns → ${uniqueVulns.length} unique types (saved ${dedupSaved} duplicate API calls)`);
        }

        // ── Strategy 2: Send ALL unique vulns in a SINGLE API call ─────────
        console.log(`[PatchGenerator] Sending ALL ${uniqueVulns.length} unique vulnerabilities in a SINGLE API call using Token Budgeting Pipeline...`);

        const results: Array<{ success: true; data: PatchOutput } | { success: false; error: string }> = new Array(vulnerabilities.length);
        let completed = 0;

        try {
            const batchResults = await this.generateBatch(uniqueVulns, context);

            // Map each unique result back to all original indices
            for (const [key, entry] of uniqueMap.entries()) {
                const matchedPatch = batchResults.find(
                    (p) => p.alert_name.toLowerCase() === key
                );

                for (const idx of entry.indices) {
                    if (matchedPatch) {
                        const patchOutput: PatchOutput = {
                            reasoning: matchedPatch.reasoning || "Analysis based on the vulnerability description.",
                            vulnerable_code_example: matchedPatch.vulnerable_code_example || "// See analysis",
                            analysis: matchedPatch.analysis || entry.vuln.description,
                            root_cause: matchedPatch.root_cause || "See analysis for details",
                            suggested_fix: matchedPatch.suggested_fix || "Please implement security best practices.",
                            file_type: matchedPatch.file_type || "unknown",
                        };
                        results[idx] = { success: true, data: patchOutput };
                        completed++;
                        console.log(`[PatchGenerator] Patch ${idx + 1}/${vulnerabilities.length} completed: ${entry.vuln.alert_name}`);
                    } else {
                        results[idx] = { success: false, error: "LLM did not return a patch for this vulnerability type." };
                        completed++;
                        console.error(`[PatchGenerator] Patch ${idx + 1}/${vulnerabilities.length} MISSING from batch: ${entry.vuln.alert_name}`);
                    }

                    if (onProgress) {
                        onProgress(completed, vulnerabilities.length, entry.vuln.alert_name);
                    }
                }
            }
        } catch (error) {
            console.error(`[PatchGenerator] Batch generation failed. Marking all patches as failed to preserve API quota.`);
            const errMsg = error instanceof Error ? error.message : "Unknown error";
            for (let i = 0; i < vulnerabilities.length; i++) {
                if (!results[i]) {
                    results[i] = { success: false, error: errMsg };
                    completed++;
                    if (onProgress) {
                        onProgress(completed, vulnerabilities.length, vulnerabilities[i].alert_name);
                    }
                }
            }
        }

        return results;
    }

    private async generateBatch(
        vulnerabilities: VulnerabilityInput[],
        context?: any
    ): Promise<Array<{ alert_name: string; reasoning: string; vulnerable_code_example: string; analysis: string; root_cause: string; suggested_fix: string; file_type: string }>> {
        const contextStr = this.buildContext(context);

        // ==== SMART PROMPT BUILDER PIPELINE ====
        const budgetManager = new TokenBudgetManager();
        let pipelineTotalTokens = 0;

        if (!this.smartBuilder) {
             this.smartBuilder = new SmartPromptBuilder(this.llmProvider.getLLM());
        }

        const vulnDescriptionsPromises = vulnerabilities.map(async (vuln, i) => {
            const validated = VulnerabilityInputSchema.parse(vuln);
            
            // Pass the model into the pipeline to check limits and dynamically trim text
            const { promptText, reductionLevel } = await this.smartBuilder.buildPipeline(validated, this.llmProvider.getLLM());
            
            console.log(`[PatchGenerator|SmartPrompt] Vuln ${i + 1}/${vulnerabilities.length} processed. Reduction Level: ${reductionLevel} applied.`);
            
            return `--- Vulnerability ${i + 1} ---\n${promptText}`;
        });
        
        const vulnDescriptionsArray = await Promise.all(vulnDescriptionsPromises);
        const vulnDescriptions = vulnDescriptionsArray.join("\n\n");

        const batchPrompt = ChatPromptTemplate.fromMessages([
            [
                "system",
                `Act as a Senior Application Security Engineer and Secure Code Reviewer.

You will receive MULTIPLE vulnerabilities at once. For EACH vulnerability, generate a separate patch recommendation.

For EACH vulnerability, output these 7 fields:
1. alert_name (the EXACT alert name from the input)
2. reasoning
3. vulnerable_code_example
4. analysis
5. root_cause
6. suggested_fix
7. file_type

Return ALL patches in a single JSON object with a "patches" array. Each element must correspond to one of the input vulnerabilities.

Hard requirements:
- Output ONLY raw JSON. No markdown. No explanations.
- The fix MUST be directly implementable in a real project.
- DO NOT give generic advice.
- Infer the backend technology from the Tech Stack or from the URL/port/pattern.
- The vulnerable code MUST look like real code from a real controller/service/repository.
- The suggested_fix MUST be a secure full replacement snippet, not a comment.
- Keep examples minimal but realistic and runnable.
- Follow best practices of the detected framework.
- Use modern secure patterns.
- Do NOT use pseudo-code.

If Tech Stack is provided, you MUST use it in your code examples.`
            ],
            [
                "human",
                `{vulnerabilities}
{context}`
            ],
        ]);

        const formattedPrompt = await batchPrompt.formatMessages({
            vulnerabilities: vulnDescriptions,
            context: contextStr,
        });

        const promptTextForTokenCount = formattedPrompt.map(m => m.content).join("\n");
        const finalTokenCount = await budgetManager.calculateTokens(this.llmProvider.getLLM(), promptTextForTokenCount);
        console.log(`[PatchGenerator|BudgetManager] Final Batch Prompt Tokens: ${finalTokenCount} / Budget Max: ${budgetManager.getBudget().maxInputAllowed}`);

        if (finalTokenCount > budgetManager.getBudget().maxInputAllowed) {
            console.warn(`[PatchGenerator|BudgetManager] WARNING: Prompt exceeds input limit! LLM might truncate or fail. Chunking fallback should be triggered here.`);
        }

        const result = await this.llmProvider.invokeWithFallback(async (llm) => {
            const structuredLlm = llm.withStructuredOutput(BatchPatchOutputSchema, {
                name: "batch_patch_recommendations",
            });
            return await structuredLlm.invoke(formattedPrompt);
        });

        return result.patches as Array<{ alert_name: string; reasoning: string; vulnerable_code_example: string; analysis: string; root_cause: string; suggested_fix: string; file_type: string }>;
    }
}
