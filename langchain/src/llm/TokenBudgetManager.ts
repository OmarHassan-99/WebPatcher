import { BaseChatModel } from "@langchain/core/language_models/chat_models";
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

    // تقبل الآن أي موديل يحقق واجهة BaseChatModel
    public async calculateTokens(model: BaseChatModel, text: string): Promise<number> {
        try {
            // ملاحظة: Groq/Llama3 قد لا تدعم getNumTokens برمجياً في بعض نسخ LangChain 
            // لذا الـ fallback هنا مهم جداً
            return await model.getNumTokens(text);
        } catch (error) {
            console.warn("[TokenBudgetManager] Failed to calculate tokens natively. Using fallback estimate.", error);
            return Math.ceil(text.length / 4); // 1 token ~= 4 chars
        }
    }

    public async needsReduction(model: BaseChatModel, text: string): Promise<boolean> {
        const tokens = await this.calculateTokens(model, text);
        return tokens > this.getBudget().maxInputAllowed;
    }
}