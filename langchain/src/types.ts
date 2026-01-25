/**
 * Type exports for the PatchGenerator module
 * Re-exports types from schemas for convenient importing
 */

export type {
    VulnerabilityInput,
    PatchOutput,
    ZapFinding,
    ZapInstance
} from "./schemas";

/**
 * Configuration options for PatchGenerator
 */
export interface PatchGeneratorConfig {
    /** Ollama base URL (default: http://127.0.0.1:11434) */
    baseUrl?: string;
    /** Model name to use (default: mistral) */
    model?: string;
    /** Temperature for generation (default: 0.3) */
    temperature?: number;
    /** Request timeout in milliseconds (default: 120000) */
    timeout?: number;
}

/**
 * Error thrown when LLM fails to generate valid structured output
 */
export class PatchGenerationError extends Error {
    public readonly cause?: Error;
    public readonly rawResponse?: string;

    constructor(message: string, cause?: Error, rawResponse?: string) {
        super(message);
        this.name = "PatchGenerationError";
        this.cause = cause;
        this.rawResponse = rawResponse;
    }
}
