import { ChatOpenAI } from "@langchain/openai";
import { logger } from "../../logging/logger";
import { MAX_RESPONSE_TOKENS } from "../utils/TokenEstimator";

interface LLMConfig {
    temperature?: number;
    maxRetries?: number;
}

export class LLMProvider {
    private static instance: LLMProvider;

    private modelName = "qwen/qwen3-coder-30b-a3b-instruct";
    private llm: ChatOpenAI | null = null;
    private isInitialized = false;

    private constructor(private config?: LLMConfig) {}

    public static getInstance(config?: LLMConfig): LLMProvider {
        if (!LLMProvider.instance) {
            LLMProvider.instance = new LLMProvider(config);
        }
        return LLMProvider.instance;
    }

    /**
     * Initializes the LLM instance pointed at OpenRouter.
     * Validates that the API key is present before proceeding.
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error(
                "[LLMProvider] OPENAI_API_KEY is not set. " +
                "Please add it to your .env file."
            );
        }

        logger.info(`[LLMProvider] Initializing with OpenRouter model: ${this.modelName}`);

        this.llm = new ChatOpenAI({
            modelName: this.modelName,
            temperature: this.config?.temperature ?? 0.2,
            maxTokens: MAX_RESPONSE_TOKENS,
            topP: 0.9,
            maxRetries: 3,
            maxConcurrency: 1,
            apiKey,
            configuration: {
                baseURL: "https://openrouter.ai/api/v1",
                defaultHeaders: {
                    "HTTP-Referer": "https://webpatcher.app",
                    "X-Title": "WebPatcher",
                },
            },
        });

        logger.info(`[LLMProvider] Using OpenRouter endpoint: https://openrouter.ai/api/v1`);
        this.isInitialized = true;
    }

    /**
     * Returns the currently active LLM instance.
     */
    public getLLM(): ChatOpenAI {
        if (!this.isInitialized || !this.llm) {
            throw new Error("LLMProvider is not initialized. Call initialize() first.");
        }
        return this.llm;
    }

    /**
     * Executes an LLM generation call with exponential backoff retry logic.
     * Retries up to 3 times with delays of 1s → 2s → 4s.
     * Logs specific warnings for 429 rate-limit errors.
     */
    public async invokeWithFallback<T>(operation: (llm: ChatOpenAI) => Promise<T>): Promise<T> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const maxRetries = 5;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation(this.getLLM());
            } catch (error: any) {
                const isRateLimit =
                    error?.response?.status === 429 ||
                    error?.status === 429 ||
                    (error?.message && error.message.includes("429"));

                const isTokenOverflow =
                    error?.message &&
                    (error.message.includes("context_length") ||
                     error.message.includes("token") ||
                     error.message.includes("maximum context"));

                if (isTokenOverflow) {
                    logger.error(
                        `[LLMProvider] Token/context overflow on attempt ${attempt}/${maxRetries}: ${error.message}`
                    );
                }

                if (isRateLimit) {
                    logger.warn(
                        `[LLMProvider] Rate limited (429) on attempt ${attempt}/${maxRetries}. ` +
                        `Will retry after aggressive backoff.`
                    );
                }

                if (attempt === maxRetries) {
                    logger.error(
                        `[LLMProvider] Generation failed after ${maxRetries} attempts.`,
                        error
                    );
                    throw error;
                }

                // If it's a rate limit, we need to wait much longer (8 RPM limit = ~7.5s per request)
                const baseDelay = isRateLimit ? 10000 : 2000;
                const delayMs = Math.pow(2, attempt - 1) * baseDelay + (Math.random() * 1000);

                logger.warn(
                    `[LLMProvider] Attempt ${attempt}/${maxRetries} failed. ` +
                    `Retrying in ${(delayMs / 1000).toFixed(1)}s...`
                );
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }

        // Unreachable, but satisfies TypeScript
        throw new Error("[LLMProvider] Unexpected: retry loop exited without result.");
    }
}
