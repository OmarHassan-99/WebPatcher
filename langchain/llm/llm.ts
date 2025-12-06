import axios from "axios";

export interface LLMConfig {
  baseUrl: string;
  modelName: string;
  temperature: number;
}

export class OllamaClient {
  baseUrl: string;
  model: string;
  temperature: number;

  constructor(config: LLMConfig) {
    this.baseUrl = config.baseUrl;
    this.model = config.modelName;
    this.temperature = config.temperature;
  }

  async generate(prompt: string): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt,
        temperature: this.temperature,
        stream: false,
      });
      return response.data.response || "";
    } catch (error) {
      throw new Error(
        `Ollama API error: Make sure Ollama is running at ${this.baseUrl}. Error: ${
          (error as any).message
        }`
      );
    }
  }
}

export function initializeLLM(): OllamaClient {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const modelName = process.env.LLM_MODEL_NAME || "mistral"; //mistral was suggested by AI but I didn't find so I choose a temp model for now

  const config: LLMConfig = {
    baseUrl,
    modelName,
    temperature: parseFloat(process.env.LLM_TEMPERATURE || "0.7"),
  };

  return new OllamaClient(config);
}

export function getLLMConfig(): LLMConfig {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    modelName: process.env.LLM_MODEL_NAME || "mistral",
    temperature: parseFloat(process.env.LLM_TEMPERATURE || "0.7"),
  };
}
