import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import fs from 'fs';
import path from 'path';

class DecisionMaker {
    static instance = null;

    static getInstance() {
        if (!DecisionMaker.instance) {
            DecisionMaker.instance = new DecisionMaker(process.env.OPENAI_API_KEY);
        }
        return DecisionMaker.instance;
    }

    constructor(apiKey) {
        if (!apiKey) {
            throw new Error("API Key is required for DecisionMaker");
        }
        this.model = new ChatOpenAI({
            openAIApiKey: apiKey,
            modelName: "qwen/qwen3-coder-30b-a3b-instruct",
            maxConcurrency: 1,
            maxTokens: 1500,
            configuration: {
                baseURL: "https://openrouter.ai/api/v1",
            }
        });
    }

    async identifyInfectedFile(zapData, candidates, projectStructure) {

        const candidatesContent = candidates.map(filePath => {
            const content = fs.readFileSync(filePath, 'utf-8');

            return `File: ${filePath}\nContent Snippet:\n${content.substring(0, 2000)}\n---`;
        }).join('\n');


        const template = `
        You are a Senior Security Engineer. Your task is to identify the EXACT file responsible for a vulnerability by cross-referencing ZAP structural data and Semgrep semantic data.
 
        VULNERABILITY REPORT FROM ZAP:
        - Vulnerable URL: {url}
        - Vulnerability Type: {type}
        - Parameter: {parameter}
 
        PROJECT STRUCTURE:
        {structure}
 
        CANDIDATE FILES CODE (DISCOVERED VIA URL-MAPPING AND SEMGREP):
        {code}
 
        INSTRUCTIONS:
        1. Compare the URL path from ZAP with the Route/Controller patterns in the provided code.
        2. Look for semantic "sinks" (e.g., SQL queries, input reflection, insecure headers) that match the Vulnerability Type.
        3. Determine which file connects the ZAP entry point (URL/Parameter) to the actual insecure code.
        4. Return your answer in STRICT JSON format. No markdown, no extra text.
 
        OUTPUT FORMAT:
        {{
            "selected_file": "absolute/path/to/file",
            "reasoning": "Explain local logic flow from URL to specific vulnerable code sink",
            "confidence_score": 0.95
        }}
        `;

        const prompt = new PromptTemplate({
            template: template,
            inputVariables: ["url", "type", "parameter", "structure", "code"],
        });


        const formattedPrompt = await prompt.format({
            url: zapData.url,
            type: zapData.type,
            parameter: zapData.parameter,
            structure: projectStructure,
            code: candidatesContent
        });

        const maxRetries = 5;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.model.invoke(formattedPrompt);
                const rawContent = response.content;

                const jsonStr = this._extractJSON(rawContent);
                return JSON.parse(jsonStr);
            } catch (e) {
                lastError = e;
                const isRateLimit = e?.message?.includes("429") || e?.status === 429;

                if (isRateLimit && attempt < maxRetries) {
                    // Exponential backoff with a bit of jitter: 1s, 2s, 4s, 8s, 16s
                    const delayMs = Math.pow(2, attempt - 1) * 1000 + (Math.random() * 500);
                    console.warn(`⚠️ Rate limited (429) on attempt ${attempt}/${maxRetries}. Retrying in ${(delayMs / 1000).toFixed(1)}s...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }

                console.error(`❌ Failed to process AI request on attempt ${attempt}/${maxRetries}:`, e.message);
                
                if (attempt === maxRetries) {
                    return {
                        selected_file: null,
                        reasoning: `Failed after ${maxRetries} attempts: ${e.message}`,
                        confidence_score: 0,
                        error: e.message
                    };
                }
            }
        }
    }

    _extractJSON(text) {
        // Try to find JSON in markdown code blocks
        const jsonMatch = text.match(/```json\s?([\s\S]*?)\s?```/) || 
                          text.match(/```\s?([\s\S]*?)\s?```/);
        
        if (jsonMatch) {
            return jsonMatch[1].trim();
        }

        // If no code blocks, look for the first { and last }
        const braceMatch = text.match(/(\{[\s\S]*\})/);
        if (braceMatch) {
            return braceMatch[1].trim();
        }

        return text.trim();
    }
}

export default DecisionMaker;