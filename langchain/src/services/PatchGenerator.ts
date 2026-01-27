import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { VulnerabilityInputSchema, PatchOutputSchema } from "../schemas";
import type { VulnerabilityInput, PatchOutput, PatchGeneratorConfig } from "../types";
import { PatchGenerationError } from "../types";
import { z } from "zod";

/**
 * PatchGenerator - AI-powered vulnerability patch recommendation engine
 * Uses LangChain with Ollama to analyze security vulnerabilities from OWASP ZAP
 * and generate structured code patches.
 */
export class PatchGenerator {
    private llm: ChatOllama;
    private promptTemplate: ChatPromptTemplate;

    constructor(config?: PatchGeneratorConfig) {
        // Default configuration - no .env needed
        const baseUrl = config?.baseUrl ?? "http://127.0.0.1:11434";
        const model = config?.model ?? "mistral";
        const temperature = config?.temperature ?? 0.3;

        // Initialize ChatOllama with configuration
        this.llm = new ChatOllama({
            baseUrl,
            model,
            temperature,
            format: "json", // Enable JSON mode for structured output
        });

        // Create the prompt template instructing the LLM to act as a Senior Secure Coding Engineer
        this.promptTemplate = ChatPromptTemplate.fromMessages([
            [
                "system",
                `You are a Senior Secure Coding Engineer with 15+ years of experience in application security.
Your expertise includes:
- Identifying and remediating OWASP Top 10 vulnerabilities
- Secure code review and penetration testing
- Writing secure code in multiple programming languages
- Understanding attack vectors and exploitation techniques

When analyzing vulnerabilities, you must:
1. Provide a thorough security analysis explaining the impact and attack scenarios
2. Identify the exact root cause in the code or configuration
3. Write production-ready, secure code to fix the vulnerability
4. Specify the appropriate file type/language for the fix

Always respond with accurate, implementable security fixes that follow industry best practices.`,
            ],
            [
                "human",
                `Analyze the following security vulnerability and provide a detailed patch recommendation:

**Vulnerability Name:** {alert_name}
**Risk Level:** {risk_level}
**Affected URL:** {affected_url}
**Description:** {description}
{evidence_section}
{additional_context}

Provide your analysis and code fix recommendation.`,
            ],
        ]);
    }

    /**
     * Generate a security patch for a given vulnerability
     * 
     * @param vulnerability - Vulnerability details from the Extractor service
     * @returns Structured patch output with analysis, root cause, suggested fix, and file type
     * @throws PatchGenerationError if the LLM fails to generate valid output
     */
    async generatePatch(vulnerability: VulnerabilityInput): Promise<PatchOutput> {
        // Validate input against schema
        const validatedInput = VulnerabilityInputSchema.parse(vulnerability);

        // Build optional sections for the prompt
        const evidenceSection = validatedInput.evidence
            ? `**Evidence:** ${validatedInput.evidence}`
            : "";

        const additionalParts: string[] = [];
        if (validatedInput.method) additionalParts.push(`Method: ${validatedInput.method}`);
        if (validatedInput.parameter) additionalParts.push(`Parameter: ${validatedInput.parameter}`);
        if (validatedInput.attack_vector) additionalParts.push(`Attack Vector: ${validatedInput.attack_vector}`);
        if (validatedInput.cwe_id) additionalParts.push(`CWE ID: ${validatedInput.cwe_id}`);
        if (validatedInput.solution) additionalParts.push(`ZAP Suggestion: ${validatedInput.solution}`);

        const additionalContext = additionalParts.length > 0
            ? `**Additional Context:**\n${additionalParts.join("\n")}`
            : "";

        try {
            // Create the structured output chain using withStructuredOutput
            const structuredLlm = this.llm.withStructuredOutput(PatchOutputSchema, {
                name: "patch_recommendation",
            });

            // Format the prompt with vulnerability details
            const formattedPrompt = await this.promptTemplate.formatMessages({
                alert_name: validatedInput.alert_name,
                risk_level: validatedInput.risk_level,
                affected_url: validatedInput.affected_url,
                description: validatedInput.description,
                evidence_section: evidenceSection,
                additional_context: additionalContext,
            });

            // Invoke the structured LLM chain
            const result = await structuredLlm.invoke(formattedPrompt);

            // Validate the output matches our schema
            return PatchOutputSchema.parse(result);

        } catch (error) {
            // Handle Zod validation errors (Zod v4 uses .issues)
            if (error instanceof z.ZodError) {
                const issues = error.issues as Array<{ message: string }>;
                throw new PatchGenerationError(
                    `LLM output validation failed: ${issues.map((issue) => issue.message).join(", ")}`,
                    error
                );
            }

            // Handle other errors
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
     * Generate patches for multiple vulnerabilities
     * Processes sequentially to avoid overwhelming the LLM
     * 
     * @param vulnerabilities - Array of vulnerability details
     * @param onProgress - Optional callback for progress updates
     * @returns Array of patch outputs (or errors for failed generations)
     */
    async generatePatches(
        vulnerabilities: VulnerabilityInput[],
        onProgress?: (current: number, total: number, name: string) => void
    ): Promise<Array<{ success: true; data: PatchOutput } | { success: false; error: string }>> {
        const results: Array<{ success: true; data: PatchOutput } | { success: false; error: string }> = [];

        for (let i = 0; i < vulnerabilities.length; i++) {
            const vuln = vulnerabilities[i];

            // Call progress callback if provided
            if (onProgress) {
                onProgress(i + 1, vulnerabilities.length, vuln.alert_name);
            }

            try {
                const startTime = Date.now();
                const data = await this.generatePatch(vuln);
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
