import { ChatOpenAI } from "@langchain/openai";
import { logger } from "../../logging/logger";

interface LLMConfig {
    baseUrl?: string;
    temperature?: number;
    maxRetries?: number;
}

export class LLMProvider {
    private static instance: LLMProvider;

    private modelName = "qwen/qwen3-coder-next";
    private llm: ChatOpenAI | null = null;

    private currentModelName: string | null = null;
    private isInitialized = false;

    private constructor(_config?: LLMConfig) {
        // Config kept for interface compatibility; OpenRouter URL is fixed.
    }

    public static getInstance(config?: LLMConfig): LLMProvider {
        if (!LLMProvider.instance) {
            LLMProvider.instance = new LLMProvider(config);
        }
        return LLMProvider.instance;
    }

    /**
     * Initializes the LLM instance pointing at OpenRouter.
     * Fails immediately if OPENROUTER_API_KEY is not set.
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            throw new Error(
                "[LLMProvider] OPENROUTER_API_KEY is not set. " +
                "Add it to your .env file to use the OpenRouter API."
            );
        }

        logger.info(
            `[LLMProvider] Initializing OpenRouter provider with model: ${this.modelName}`
        );

        this.llm = new ChatOpenAI({
            modelName: this.modelName,
            temperature: 0.2,
            maxTokens: 2048,
            topP: 0.9,
            maxRetries: 3,           // Exponential backoff handled by LangChain
            streaming: false,
            apiKey,
            configuration: {
                baseURL: "https://openrouter.ai/api/v1",
                defaultHeaders: {
                    "HTTP-Referer": "https://webpatcher.app",
                    "X-Title": "WebPatcher",
                },
            },
        });

        this.currentModelName = this.modelName;
        this.isInitialized = true;

        logger.info(
            `[LLMProvider] OpenRouter provider ready (model=${this.modelName})`
        );
    }

    /**
     * Returns the currently active LLM instance.
     */
    public getLLM(): ChatOpenAI {
        if (!this.isInitialized || !this.llm) {
            throw new Error(
                "LLMProvider is not initialized. Call initialize() first."
            );
        }
        return this.llm;
    }

    /**
     * Executes an LLM generation call with error logging.
     * Rate-limit (429) errors are logged distinctly.
     * Token usage metadata from OpenRouter is logged after each successful call.
     */
    public async invokeWithFallback<T>(
        operation: (llm: ChatOpenAI) => Promise<T>
    ): Promise<T> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const result = await operation(this.getLLM());

            // Log token usage if the result carries metadata (LangChain AIMessage)
            this.logTokenUsage(result);

            return result;
        } catch (error: any) {
            const status = error?.response?.status ?? error?.status;

            if (status === 429) {
                logger.warn(
                    `[LLMProvider] Rate-limited by OpenRouter (429). ` +
                    `The request will be retried automatically by LangChain up to 3 times.`
                );
            }

            logger.error(
                `[LLMProvider] Generation failed on ${this.currentModelName}.`,
                error?.message ?? error
            );
            throw error;
        }
    }

    /**
     * Logs prompt / completion token counts when available.
     */
    private logTokenUsage(result: any): void {
        try {
            const usage =
                result?.response_metadata?.token_usage ??
                result?.usage_metadata ??
                result?.response_metadata?.usage;

            if (usage) {
                const prompt = usage.prompt_tokens ?? usage.input_tokens ?? "?";
                const completion =
                    usage.completion_tokens ?? usage.output_tokens ?? "?";
                const total = usage.total_tokens ?? "?";

                logger.info(
                    `[LLMProvider] Token usage — prompt: ${prompt}, completion: ${completion}, total: ${total}`
                );
            }
        } catch {
            // Non-critical — silently ignore if metadata shape is unexpected
        }
    }
}
