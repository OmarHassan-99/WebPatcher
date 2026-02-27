import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export class SummarizationHook {
    private llm: ChatGoogleGenerativeAI;

    constructor(llm: ChatGoogleGenerativeAI) {
        this.llm = llm;
    }

    public async summarize(text: string): Promise<string> {
        if (!text || text.trim().length === 0) return "";

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", "Compress the following security text into 3 strictly factual, extremely concise bullet points. Preserve technical nouns. Strip all HTML formatting. Maximum 50 words total."],
            ["human", "{text}"]
        ]);

        try {
            const formatted = await prompt.formatMessages({ text });
            // Using raw invoke for fast compression
            const res = await this.llm.invoke(formatted);
            return res.content.toString();
        } catch (error) {
            console.error("[SummarizationHook] Failed to summarize text. Returning truncated string.", error);
            // Absolute fallback string truncation if the fast LLM call fails
            return text.substring(0, 500) + "... [Truncated]";
        }
    }
}
