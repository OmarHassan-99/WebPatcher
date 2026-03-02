import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export class SummarizationHook {
    // تم تغيير النوع لدعم أي LLM (مثل Groq)
    private llm: BaseChatModel;

    constructor(llm: BaseChatModel) {
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
            const res = await this.llm.invoke(formatted);
            return res.content.toString();
        } catch (error) {
            console.error("[SummarizationHook] Failed to summarize text. Returning truncated string.", error);
            return text.substring(0, 500) + "... [Truncated]";
        }
    }
}