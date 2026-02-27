import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

const DAILY_REQUEST_LIMIT = 18; // Keep 2 requests as safety buffer from the 20 free-tier limit

export class GeminiProvider {
    private static instance: GeminiProvider;
    private llm: ChatGoogleGenerativeAI;
    private isInitialized = false;

    // Daily request tracking
    private dailyRequestCount = 0;
    private lastResetDate: string = "";

    private constructor() {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error("GOOGLE_API_KEY environment variable is missing.");
        }

        this.llm = new ChatGoogleGenerativeAI({
            apiKey: apiKey,
            model: "gemini-2.5-flash",
            temperature: 0.2,
            maxOutputTokens: 8192,
            maxRetries: 2,
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                }
            ]
        });

        this.lastResetDate = new Date().toDateString();
    }

    public static getInstance(): GeminiProvider {
        if (!GeminiProvider.instance) {
            GeminiProvider.instance = new GeminiProvider();
        }
        return GeminiProvider.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
        this.isInitialized = true;
    }

    public getLLM(): ChatGoogleGenerativeAI {
        if (!this.isInitialized) {
            throw new Error("GeminiProvider is not initialized. Call initialize() first.");
        }
        return this.llm;
    }

    public getRemainingRequests(): number {
        this.checkDailyReset();
        return Math.max(0, DAILY_REQUEST_LIMIT - this.dailyRequestCount);
    }

    private checkDailyReset(): void {
        const today = new Date().toDateString();
        if (today !== this.lastResetDate) {
            console.log(`[GeminiProvider] New day detected. Resetting daily request counter (was ${this.dailyRequestCount}).`);
            this.dailyRequestCount = 0;
            this.lastResetDate = today;
        }
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public async invokeWithFallback<T>(operation: (llm: ChatGoogleGenerativeAI) => Promise<T>): Promise<T> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Check daily limit BEFORE making the call
        this.checkDailyReset();
        if (this.dailyRequestCount >= DAILY_REQUEST_LIMIT) {
            console.error(`[GeminiProvider] Daily request limit reached (${this.dailyRequestCount}/${DAILY_REQUEST_LIMIT}). No more API calls today.`);
            throw new Error(
                `Gemini daily request limit reached (${this.dailyRequestCount}/${DAILY_REQUEST_LIMIT}). ` +
                `Wait for daily reset or use a new API key from https://aistudio.google.com/apikey`
            );
        }

        const maxRetries = 5;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                this.dailyRequestCount++;
                console.log(`[GeminiProvider] API call #${this.dailyRequestCount}/${DAILY_REQUEST_LIMIT} today.`);
                const result = await operation(this.getLLM());
                return result;
            } catch (error: any) {
                attempt++;
                const errorMsg = error?.message || "";
                
                if (errorMsg.includes("429") || error?.status === 429) {
                    if (errorMsg.includes("PerDay") || errorMsg.includes("PerDayPerProject")) {
                        this.dailyRequestCount = DAILY_REQUEST_LIMIT; // Mark as exhausted
                        console.error(`[GeminiProvider] DAILY quota exhausted. Blocking further calls.`);
                        throw new Error(
                            "Gemini daily API quota exhausted (20 requests/day on free tier). " +
                            "Generate a new API key from a different project at https://aistudio.google.com/apikey, " +
                            "or enable billing on your current project."
                        );
                    }

                    console.error(`[GeminiProvider] Per-minute rate limit hit on attempt ${attempt}/${maxRetries}.`);
                    
                    if (attempt >= maxRetries) {
                        console.error("[GeminiProvider] Max retries reached. Failing.");
                        throw error;
                    }

                    let delayMs = Math.min(10000 * Math.pow(2, attempt), 60000);
                    
                    const retryMatch = errorMsg.match(/Please retry in (\d+(?:\.\d+)?)s/);
                    if (retryMatch && retryMatch[1]) {
                        delayMs = (parseFloat(retryMatch[1]) + 2) * 1000;
                    }

                    console.log(`[GeminiProvider] Waiting ${Math.round(delayMs / 1000)}s before retrying...`);
                    await this.sleep(delayMs);
                    this.dailyRequestCount++; // Count the retry too
                } else if (error?.name === "TimeoutError") {
                    console.error(`[GeminiProvider] Model timeout on attempt ${attempt}.`, error);
                    if (attempt >= maxRetries) throw error;
                    await this.sleep(2000);
                } else {
                    console.error(`[GeminiProvider] Generation failed.`, error);
                    throw error;
                }
            }
        }
        
        throw new Error("invokeWithFallback failed after max retries.");
    }
}
