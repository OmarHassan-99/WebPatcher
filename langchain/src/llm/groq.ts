import { ChatGroq } from "@langchain/groq";
import { logger } from "../../logging/logger";
export class GroqProvider {
    private static instance: GroqProvider;
    private llm: ChatGroq;
    private isInitialized = false;

private constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY environment variable is missing.");
    }

    // التعديل هنا: استخدام model بدل modelName
    this.llm = new ChatGroq({
        apiKey: apiKey, 
        model: "llama-3.3-70b-versatile", // تأكد من استخدام اسم موديل مدعوم زي ده
        temperature: 0.1,
        maxTokens: 4096,
        maxRetries: 3,
    });
}

    public static getInstance(): GroqProvider {
        if (!GroqProvider.instance) {
            GroqProvider.instance = new GroqProvider();
        }
        return GroqProvider.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
        this.isInitialized = true;
        logger.info("[GroqProvider] Initialized as Primary LLM Provider");
    }

    public getLLM(): ChatGroq {
        if (!this.isInitialized) {
            throw new Error("GroqProvider is not initialized.");
        }
        return this.llm;
    }

    /**
     * تنفيذ العمليات مع معالجة الـ Rate Limits الخاصة بـ Groq (429 Errors)
     */
    public async invokeWithFallback<T>(operation: (llm: ChatGroq) => Promise<T>): Promise<T> {
        if (!this.isInitialized) await this.initialize();

        try {
            // تنفيذ الطلب مباشرة باستخدام سرعة Groq
            return await operation(this.getLLM());
        } catch (error: any) {
            const errorMsg = error?.message || "";
            
            // معالجة خطأ الـ Rate Limit (429)
            if (errorMsg.includes("429") || error?.status === 429) {
                logger.warn("[GroqProvider] Rate limit hit. Groq Free Tier has strict limits.");
                // هنا يمكنك إضافة منطق الـ Sleep لو أردت، 
                // لكن Groq غالباً ما يطلب الانتظار لعدة ثوانٍ.
                throw new Error("Groq API Rate Limit reached. Please check your Groq Dashboard.");
            }

            logger.error("[GroqProvider] Generation failed.", error);
            throw error;
        }
    }

    // إضافة دالة للحصول على الرصيد المتبقي (وهمية حالياً لتوحيد الـ Interface مع Gemini)
    public getRemainingRequests(): number {
        return 999; // Groq لا يعطي الرصيد عبر الـ API بسهولة مثل Gemini
    }
}