import { ChatOpenAI } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export class CerebrasProvider {
    private static instance: CerebrasProvider;
    private llm: ChatOpenAI;

    private constructor() {
        const apiKey = process.env.CEREBRAS_API_KEY;
        if (!apiKey) throw new Error("CEREBRAS_API_KEY is missing.");

// في ملف llm/cerebras.ts
this.llm = new ChatOpenAI({
    apiKey: apiKey,
    configuration: {
        baseURL: "https://api.cerebras.ai/v1",
    },
    // استخدم الاسم ده بالظبط من القائمة اللي طلعتلك
    modelName: "llama3.1-8b", 
    temperature: 0.1,
});
    }

    public static getInstance(): CerebrasProvider {
        if (!CerebrasProvider.instance) {
            CerebrasProvider.instance = new CerebrasProvider();
        }
        return CerebrasProvider.instance;
    }

    public getLLM(): BaseChatModel {
        return this.llm;
    }

    /**
     * الدالة الناقصة: تنفيذ الطلب مع دعم الـ Fallback
     *
     */
    public async invokeWithFallback<T>(
        action: (llm: BaseChatModel) => Promise<T>
    ): Promise<T> {
        try {
            return await action(this.llm);
        } catch (error) {
            console.error("[CerebrasProvider] Error during LLM invocation:", error);
            throw error;
        }
    }

    public async initialize(): Promise<void> {
        console.log("[INFO] CerebrasProvider (Qwen-Coder) Initialized.");
    }

    /**
     * دالة افتراضية لمعرفة الرصيد (Cerebras قد لا تدعمها في الهيدرز حالياً بنفس شكل Groq)
     *
     */
    public getRemainingRequests(): number {
        return 999; // قيمة افتراضية حتى نتمكن من قراءة الهيدرز الحقيقية
    }
}