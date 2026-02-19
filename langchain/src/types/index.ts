

export type {
    VulnerabilityInput,
    PatchOutput,
    ZapFinding,
    ZapInstance
} from "../schemas";


export interface PatchGeneratorConfig {
    baseUrl?: string;
    model?: string;
    temperature?: number;
    timeout?: number;
}


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
