import { ChatOpenAI } from "@langchain/openai";
import axios from "axios";
import { logger } from "../../logging/logger";

interface LLMConfig {
    baseUrl?: string;
    temperature?: number;
    maxRetries?: number;
}

export class LLMProvider {
    private static instance: LLMProvider;
    
    private primaryModelName = "qwen2.5-coder:3b";
    private fallbackModelName = "mistral:latest";
    private baseUrl: string;
    
    // LangChain instances
    private primaryLLM: ChatOpenAI | null = null;
    private fallbackLLM: ChatOpenAI | null = null;
    
    private currentModelName: string | null = null;
    private isInitialized = false;

    private constructor(config?: LLMConfig) {
        this.baseUrl = config?.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    }

    public static getInstance(config?: LLMConfig): LLMProvider {
        if (!LLMProvider.instance) {
            LLMProvider.instance = new LLMProvider(config);
        }
        return LLMProvider.instance;
    }

    /**
     * Checks if a specific model exists in the local Ollama instance.
     */
    private async checkModelExists(modelName: string): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 2000 });
            const models = response.data?.models || [];
            return models.some((m: any) => m.name === modelName);
        } catch (error) {
            logger.warn(`[LLMProvider] Failed to check Ollama tags at ${this.baseUrl}/api/tags`);
            return false;
        }
    }

    /**
     * Initializes the LLM instances. Detects if Qwen is available; if not, falls back to Mistral.
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        logger.info(`[LLMProvider] Initializing LLM Provider. Checking for ${this.primaryModelName}...`);
        
        const qwenAvailable = await this.checkModelExists(this.primaryModelName);
        
        const baseLLMConfig = {
            configuration: { baseURL: `${this.baseUrl}/v1` },
            temperature: 0.1, // As requested in recent user edits
            maxRetries: 1, // Fail fast to trigger fallback
            apiKey: "ollama",
            maxTokens: 2000,
        };

        if (qwenAvailable) {
            logger.info(`[LLMProvider] ${this.primaryModelName} found. Setting as primary.`);
            this.primaryLLM = new ChatOpenAI({ ...baseLLMConfig, modelName: this.primaryModelName });
            this.currentModelName = this.primaryModelName;
        } else {
            logger.warn(`[LLMProvider] ${this.primaryModelName} NOT found. Falling back to ${this.fallbackModelName}.`);
        }

        // Always initialize fallback just in case the primary fails at runtime
        this.fallbackLLM = new ChatOpenAI({ ...baseLLMConfig, modelName: this.fallbackModelName });
        
        if (!this.currentModelName) {
            this.currentModelName = this.fallbackModelName;
        }

        this.isInitialized = true;
    }

    /**
     * Returns the currently active LLM instance.
     */
    public getLLM(): ChatOpenAI {
        if (!this.isInitialized) {
            throw new Error("LLMProvider is not initialized. Call initialize() first.");
        }
        
        if (this.currentModelName === this.primaryModelName && this.primaryLLM) {
            return this.primaryLLM;
        }
        
        return this.fallbackLLM!;
    }
    
    /**
     * Executes an LLM generation call with automatic fallback handling.
     * If Qwen throws an error (e.g. timeout or context length), it logs the error and retries with Mistral.
     */
    public async invokeWithFallback<T>(operation: (llm: ChatOpenAI) => Promise<T>): Promise<T> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Attempt with current LLM
            return await operation(this.getLLM());
        } catch (error) {
            // If we are already on the fallback model, throw the error upwards
            if (this.currentModelName === this.fallbackModelName) {
                logger.error(`[LLMProvider] Generation failed on fallback model (${this.fallbackModelName}).`, error);
                throw error;
            }

            // We were on the primary model, and it failed. Switch to fallback.
            logger.warn(`[LLMProvider] Error during generation with ${this.primaryModelName}. Switching to ${this.fallbackModelName}.`, error);
            this.currentModelName = this.fallbackModelName;

            try {
                // Retry operation immediately with fallback
                return await operation(this.getLLM());
            } catch (fallbackError) {
                logger.error(`[LLMProvider] Generation also failed on fallback model (${this.fallbackModelName}).`, fallbackError);
                throw fallbackError;
            }
        }
    }
}
