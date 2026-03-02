import { ChatPromptTemplate } from "@langchain/core/prompts";
import { VulnerabilityInputSchema, PatchOutputSchema, BatchPatchOutputSchema } from "../schemas";
import type { VulnerabilityInput, PatchOutput, PatchGeneratorConfig } from "../types";
import { PatchGenerationError } from "../types";
import { z } from "zod";
// تم استبدال Gemini بـ Groq
import { GroqProvider } from "../llm/groq"; 
import { SmartPromptBuilder } from "../prompts/SmartPromptBuilder";
import { TokenBudgetManager } from "../llm/TokenBudgetManager";

export class PatchGenerator {
    private promptTemplate: ChatPromptTemplate;
    // تغيير النوع إلى GroqProvider
    private llmProvider: GroqProvider; 
    private smartBuilder!: SmartPromptBuilder;

    constructor(config?: PatchGeneratorConfig) {
        // الحصول على نسخة GroqProvider
        this.llmProvider = GroqProvider.getInstance(); 

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
                ... (باقي الـ System Prompt كما هو) ...`
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
        const evidenceSection = validatedInput.evidence ? `**Evidence:** ${validatedInput.evidence}` : "";
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

            // استخدام Groq لتوليد الإصلاح
            const result = await this.llmProvider.invokeWithFallback(async (llm) => {
                const structuredLlm = llm.withStructuredOutput(PatchOutputSchema, {
                    name: "patch_recommendation",
                });
                return await structuredLlm.invoke(formattedPrompt);
            });

            const processedResult = {
                reasoning: result.reasoning || "Analysis based on description.",
                vulnerable_code_example: result.vulnerable_code_example || "// See analysis",
                analysis: result.analysis || validatedInput.description,
                root_cause: result.root_cause || "See analysis",
                suggested_fix: result.suggested_fix || "Check best practices",
                file_type: result.file_type || "unknown"
            };

            return PatchOutputSchema.parse(processedResult);
        } catch (error) {
            throw new PatchGenerationError(`Groq generation failed`, error);
        }
    }

    async generatePatches(
        vulnerabilities: VulnerabilityInput[],
        context?: any,
        onProgress?: (current: number, total: number, name: string) => void
    ): Promise<Array<{ success: true; data: PatchOutput } | { success: false; error: string }>> {
        // تهيئة GroqProvider
        await this.llmProvider.initialize();

        const remaining = this.llmProvider.getRemainingRequests();
        console.log(`[PatchGenerator] Groq initialized. Processing batch...`);

        // منطق الـ Deduplication والـ Batching كما هو مستمر باستخدام Groq
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
        const results: Array<{ success: true; data: PatchOutput } | { success: false; error: string }> = new Array(vulnerabilities.length);
        
        try {
            const batchResults = await this.generateBatch(uniqueVulns, context);
            // توزيع النتائج كما في الكود الأصلي
            for (const [key, entry] of uniqueMap.entries()) {
                const matchedPatch = batchResults.find(p => p.alert_name.toLowerCase() === key);
                for (const idx of entry.indices) {
                    if (matchedPatch) {
                        results[idx] = { success: true, data: matchedPatch as PatchOutput };
                    } else {
                        results[idx] = { success: false, error: "No patch returned by Groq" };
                    }
                }
            }
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : "Batch failed";
            vulnerabilities.forEach((_, i) => results[i] = { success: false, error: errMsg });
        }
        return results;
    }

    private async generateBatch(vulnerabilities: VulnerabilityInput[], context?: any) {
        const contextStr = this.buildContext(context);
        const budgetManager = new TokenBudgetManager();

        if (!this.smartBuilder) {
            // ربط الـ SmartBuilder بموديل Groq
             this.smartBuilder = new SmartPromptBuilder(this.llmProvider.getLLM());
        }

        const vulnDescriptionsPromises = vulnerabilities.map(async (vuln) => {
            const validated = VulnerabilityInputSchema.parse(vuln);
            const { promptText } = await this.smartBuilder.buildPipeline(validated, this.llmProvider.getLLM());
            return `--- Vulnerability ---\n${promptText}`;
        });
        
        const vulnDescriptions = (await Promise.all(vulnDescriptionsPromises)).join("\n\n");

        const batchPrompt = ChatPromptTemplate.fromMessages([
            ["system", "Act as a Senior AppSec Engineer. Return ALL patches in a single JSON array named 'patches'."],
            ["human", "{vulnerabilities}\n{context}"]
        ]);

        const formattedPrompt = await batchPrompt.formatMessages({
            vulnerabilities: vulnDescriptions,
            context: contextStr,
        });

        // استخدام الـ invokeWithFallback الخاص بـ Groq
        const result = await this.llmProvider.invokeWithFallback(async (llm) => {
            const structuredLlm = llm.withStructuredOutput(BatchPatchOutputSchema, {
                name: "batch_patch_recommendations",
            });
            return await structuredLlm.invoke(formattedPrompt);
        });

        return result.patches;
    }
}