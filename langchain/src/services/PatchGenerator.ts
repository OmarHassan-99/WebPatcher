import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { VulnerabilityInputSchema, PatchOutputSchema } from "../schemas";
import type { VulnerabilityInput, PatchOutput, PatchGeneratorConfig } from "../types";
import { PatchGenerationError } from "../types";
import { z } from "zod";


export class PatchGenerator {
    private llm: ChatOllama;
    private promptTemplate: ChatPromptTemplate;

    constructor(config?: PatchGeneratorConfig) {
        const baseUrl = config?.baseUrl ?? "http://127.0.0.1:11434";
        const model = config?.model ?? "mistral";
        const temperature = config?.temperature ?? 0.3;


        this.llm = new ChatOllama({
            baseUrl,
            model,
            temperature,
            format: "json",
        });


        this.promptTemplate = ChatPromptTemplate.fromMessages([
            [
                "system",
                `You are a Senior Secure Coding Engineer with years of experience in application security.
Your expertise includes:
- Identifying and remediating OWASP Top 10 vulnerabilities
- Secure code review and penetration testing
- Writing secure code in multiple programming languages and frameworks
- Understanding attack vectors and exploitation techniques

When analyzing vulnerabilities, you MUST provide ALL of the following fields in your response:

1. **reasoning**: Your thought process analyzing the tech stack context
2. **vulnerable_code_example**: Complete code showing the vulnerability (in user's stack)
3. **analysis**: Security analysis of impact and attack scenarios
4. **root_cause**: Exact root cause in code or configuration
5. **suggested_fix**: Production-ready secure code fix (in user's stack)
6. **file_type**: Programming language/file type

CRITICAL: You MUST generate ALL SIX fields. If any field is missing, your response is invalid.

If Tech Stack context is provided (languages, frameworks, databases), use those EXACT technologies in your code examples. For Python/Django users, show Python/Django code. For JavaScript/Express users, show JavaScript/Express code.

Always respond with accurate, implementable security fixes that follow industry best practices and match the user's technology stack.`,
            ],
            [
                "human",
                `Analyze the following security vulnerability and provide a detailed patch recommendation.

**IMPORTANT**: You MUST respond with ALL SIX required fields. Do not skip any field.

**Vulnerability Name:** {alert_name}
**Risk Level:** {risk_level}
**Affected URL:** {affected_url}
**Description:** {description}
{evidence_section}
{additional_context}

Your response MUST include:
1. reasoning - Your thought process considering the tech stack
2. vulnerable_code_example - Complete vulnerable code in the user's tech stack
3. analysis - Security impact and attack scenarios
4. root_cause - Exact cause of the vulnerability
5. suggested_fix - Secure code fix in the user's tech stack
6. file_type - Language/framework (e.g., python, javascript, php)`,
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

            const structuredLlm = this.llm.withStructuredOutput(PatchOutputSchema, {
                name: "patch_recommendation",
            });


            const formattedPrompt = await this.promptTemplate.formatMessages({
                alert_name: validatedInput.alert_name,
                risk_level: validatedInput.risk_level,
                affected_url: validatedInput.affected_url,
                description: validatedInput.description,
                evidence_section: evidenceSection,
                additional_context: additionalContext,
            });


            const result = await structuredLlm.invoke(formattedPrompt);


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
        const results: Array<{ success: true; data: PatchOutput } | { success: false; error: string }> = [];

        for (let i = 0; i < vulnerabilities.length; i++) {
            const vuln = vulnerabilities[i];


            if (onProgress) {
                onProgress(i + 1, vulnerabilities.length, vuln.alert_name);
            }

            try {
                const startTime = Date.now();
                const data = await this.generatePatch(vuln, context);
                const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`[PatchGenerator] Patch ${i + 1}/${vulnerabilities.length} completed in ${duration}s: ${vuln.alert_name}`);
                results.push({ success: true as const, data });
            } catch (error) {
                console.error(`[PatchGenerator] Patch ${i + 1}/${vulnerabilities.length} FAILED: ${vuln.alert_name}`);
                results.push({
                    success: false as const,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }

        return results;
    }
}
