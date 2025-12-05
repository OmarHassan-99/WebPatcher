import { ChatOpenAI } from "@langchain/openai";

export interface LLMConfig {
  apiKey: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
}

export function initializeLLM(): ChatOpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set"
    );
  }

  const config: LLMConfig = {
    apiKey,
    modelName: process.env.LLM_MODEL_NAME || "gpt-4-turbo",
    temperature: parseFloat(process.env.LLM_TEMPERATURE || "0.5"),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || "2000", 10),
  };

  const llm = new ChatOpenAI({
    apiKey: config.apiKey,
    modelName: config.modelName,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  });

  return llm;
}

export function getLLMConfig(): LLMConfig {
  return {
    apiKey: process.env.OPENAI_API_KEY || "",
    modelName: process.env.LLM_MODEL_NAME || "gpt-4-turbo",
    temperature: parseFloat(process.env.LLM_TEMPERATURE || "0.7"),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || "2000", 10),
  };
}
