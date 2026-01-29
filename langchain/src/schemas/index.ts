import { z } from "zod";

/**
 * Schema for vulnerability input from the Extractor service
 * Contains details parsed from OWASP ZAP reports
 */
export const VulnerabilityInputSchema = z.object({
    alert_name: z.string().describe("Name of the vulnerability alert"),
    description: z.string().describe("Detailed description of the vulnerability"),
    risk_level: z.string().describe("Risk level: High, Medium, Low, or Informational"),
    affected_url: z.string().describe("The URL where the vulnerability was found"),
    evidence: z.string().optional().describe("Evidence of the vulnerability if available"),
    method: z.string().optional().describe("HTTP method (GET, POST, etc.)"),
    parameter: z.string().optional().describe("Affected parameter if applicable"),
    attack_vector: z.string().optional().describe("The attack vector used to exploit"),
    cwe_id: z.number().optional().describe("CWE ID if available"),
    solution: z.string().optional().describe("ZAP's suggested solution"),
});

/**
 * Schema for structured LLM output
 * Ensures the response follows a strict JSON format
 */
export const PatchOutputSchema = z.object({
    reasoning: z
        .string()
        .describe(
            "Your thought process and reasoning for this analysis, taking into account the provided tech stack context (languages, frameworks, databases, etc.). Explain how the context influences your recommendations."
        ),
    vulnerable_code_example: z
        .string()
        .describe(
            "A complete, realistic code example demonstrating the vulnerability in the context of the user's tech stack. Use the exact languages and frameworks specified in the context (e.g., Python/Django, JavaScript/Express, PHP/Laravel). Include comments explaining what makes it vulnerable."
        ),
    analysis: z
        .string()
        .describe(
            "Detailed security analysis of the vulnerability, its impact, and attack scenarios"
        ),
    root_cause: z
        .string()
        .describe(
            "The root cause of the vulnerability - what code pattern or configuration led to this issue"
        ),
    suggested_fix: z
        .string()
        .describe(
            "Complete code snippet showing the secure implementation to fix the vulnerability, using the user's tech stack"
        ),
    file_type: z
        .string()
        .describe(
            "The programming language or file type for the code fix (e.g., javascript, python, php, java)"
        ),
});

/**
 * Schema for ZAP Finding instances (from the extractor service)
 * This matches the output of backend/services/extractor.js
 */
export const ZapInstanceSchema = z.object({
    uri: z.string().optional().default(""),
    method: z.string().optional().default(""),
    param: z.string().optional().default(""),
    attack: z.string().optional().default(""),
    evidence: z.string().optional().default(""),
});

/**
 * Schema for ZAP Finding (from the extractor service)
 * This matches the output of backend/services/extractor.js after MongoDB storage
 * 
 * Note: instances can be an array (from MongoDB) or a single object
 * Note: cweId can be a string (from MongoDB) or number
 */
export const ZapFindingSchema = z.object({
    _id: z.any().optional(), // MongoDB ObjectId
    scanJob: z.any().optional(), // MongoDB ObjectId or string
    pluginId: z.string().optional(),
    alertName: z.string(),
    severity: z.string(), // "High", "Medium", "Low", "Informational"
    description: z.string(),
    solution: z.string().optional(),
    // instances can be array (from MongoDB) or single object
    instances: z.union([
        z.array(ZapInstanceSchema),
        ZapInstanceSchema,
    ]),
    // cweId can be string or number or null
    cweId: z.union([z.string(), z.number(), z.null()]).optional(),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional(),
    __v: z.any().optional(),
});

// Export schema types for external use
export type VulnerabilityInput = z.infer<typeof VulnerabilityInputSchema>;
export type PatchOutput = z.infer<typeof PatchOutputSchema>;
export type ZapFinding = z.infer<typeof ZapFindingSchema>;
export type ZapInstance = z.infer<typeof ZapInstanceSchema>;
