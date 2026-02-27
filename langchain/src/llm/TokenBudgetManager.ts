import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { LLMConfig, defaultConfig } from "../config/llm.config";

export class TokenBudgetManager {
    private config: LLMConfig;

    constructor(config: LLMConfig = defaultConfig) {
        this.config = config;
    }

    public getBudget(): { maxInputAllowed: number } {
        const absoluteMax = this.config.maxInputTokens;
        const margin = absoluteMax * this.config.safetyMarginPct;
        return { maxInputAllowed: Math.floor(absoluteMax - margin) };
    }

    public async calculateTokens(model: ChatGoogleGenerativeAI, text: string): Promise<number> {
        try {
            return await model.getNumTokens(text);
        } catch (error) {
            console.warn("[TokenBudgetManager] Failed to calculate tokens natively. Using fallback estimate.", error);
            // Fallback rule of thumb: 1 token ~= 4 characters in English
            return Math.ceil(text.length / 4);
        }
    }

    public async needsReduction(model: ChatGoogleGenerativeAI, text: string): Promise<boolean> {
        const tokens = await this.calculateTokens(model, text);
        return tokens > this.getBudget().maxInputAllowed;
    }
}
