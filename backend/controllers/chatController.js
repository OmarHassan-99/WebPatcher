import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

export const handleChat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: "AI API Key is not configured" });
    }

    // Initialize Langchain ChatOpenAI matching the core DecisionMaker
    const model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: "qwen/qwen3-coder-30b-a3b-instruct",
      maxConcurrency: 1,
      maxTokens: 1000,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
      },
    });

    // Format the conversation history
    const formattedHistory = Array.isArray(history) 
      ? history.map(msg => `${msg.role === 'user' ? 'User' : 'Webpatchy'}: ${msg.content}`).join("\n")
      : "";

    const template = `
    You are Webpatchy, an elite cybersecurity AI assistant built into the WebPatcher platform.
    Your goal is to assist the user with understanding web vulnerabilities, explaining security concepts, or navigating the platform.
    Always be professional, concise, and helpful. Do not use markdown code blocks unless providing code examples.

    CONVERSATION HISTORY:
    {history}

    CURRENT USER MESSAGE:
    User: {message}

    RESPOND AS WEBPATCHY:
    `;

    const prompt = new PromptTemplate({
      template: template,
      inputVariables: ["history", "message"],
    });

    const formattedPrompt = await prompt.format({
      history: formattedHistory,
      message: message,
    });

    const response = await model.invoke(formattedPrompt);

    res.status(200).json({
      success: true,
      reply: response.content,
    });
  } catch (error) {
    console.error("Chat Controller Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to process chat message." });
  }
};
