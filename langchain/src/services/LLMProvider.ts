import { ChatOpenAI } from "@langchain/openai";
import { logger } from "../../logging/logger";

interface LLMConfig {
    baseUrl?: string;
    temperature?: number;
    maxRetries?: number;
}

export class LLMProvider {
    private static instance: LLMProvider;

    private modelName = "qwen3-coder-next";
    private baseUrl: string;
    private apiKey: string | undefined;

    private llm: ChatOpenAI | null = null;
    private currentModelName: string | null = null;
    private isInitialized = false;

    private readonly MAX_RETRIES = 3;
    private readonly BASE_DELAY_MS = 1000;

    private constructor(config?: LLMConfig) {
        this.baseUrl = config?.baseUrl ?? "https://ollama.com";
        this.apiKey = process.env.OLLAMA_API_KEY;
    }

    public static getInstance(config?: LLMConfig): LLMProvider {
        if (!LLMProvider.instance) {
            LLMProvider.instance = new LLMProvider(config);
        }
        return LLMProvider.instance;
    }

    /**
     * Initializes the LLM instance pointing to Ollama Cloud.
     * Throws if OLLAMA_API_KEY is not set.
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        if (!this.apiKey) {
            const msg = "[LLMProvider] OLLAMA_API_KEY is not set. Cannot connect to Ollama Cloud.";
            logger.error(msg);
            throw new Error(msg);
        }

        logger.info(`[LLMProvider] Connecting to Ollama Cloud at ${this.baseUrl} with model ${this.modelName}`);

        this.llm = new ChatOpenAI({
            modelName: this.modelName,
            configuration: { baseURL: `${this.baseUrl}/v1` },
            apiKey: this.apiKey,
            temperature: 0.2,
            topP: 0.9,
            streaming: false,
            maxRetries: 1,
            maxTokens: 2000,
        });

        this.currentModelName = this.modelName;
        this.isInitialized = true;

        logger.info(`[LLMProvider] Successfully initialized. Model: ${this.currentModelName}`);
    }

    /**
     * Returns the active LLM instance.
     */
    public getLLM(): ChatOpenAI {
        if (!this.isInitialized || !this.llm) {
            throw new Error("LLMProvider is not initialized. Call initialize() first.");
        }
        return this.llm;
    }

    /**
     * Executes an LLM generation call with exponential-backoff retries.
     * Retries up to MAX_RETRIES times (1 s → 2 s → 4 s).
     */
    public async invokeWithFallback<T>(operation: (llm: ChatOpenAI) => Promise<T>): Promise<T> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        let lastError: unknown;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                logger.info(`[LLMProvider] Attempt ${attempt}/${this.MAX_RETRIES} with ${this.modelName}`);
                return await operation(this.getLLM());
            } catch (error) {
                lastError = error;
                const errorMsg = error instanceof Error ? error.message : String(error);
                logger.warn(`[LLMProvider] Attempt ${attempt}/${this.MAX_RETRIES} failed: ${errorMsg}`);

                if (attempt < this.MAX_RETRIES) {
                    const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    logger.info(`[LLMProvider] Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }

        logger.error(`[LLMProvider] All ${this.MAX_RETRIES} attempts failed for model ${this.modelName}.`);
        throw lastError;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
