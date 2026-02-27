export interface LLMConfig {
    maxInputTokens: number;
    maxOutputTokens: number;
    safetyMarginPct: number;
    temperature: number;
    contextLinesConfig: number;
}

export const defaultConfig: LLMConfig = {
    maxInputTokens: 32000,   // Dynamic cap to prevent overloads
    maxOutputTokens: 8192,
    safetyMarginPct: 0.10,   // 10% buffer for prompt framing
    temperature: 0.2,
    contextLinesConfig: 15   // N lines of code around the vulnerability
};
