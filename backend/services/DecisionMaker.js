import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import fs from 'fs';
import path from 'path';

class DecisionMaker {
    constructor(apiKey) {

        this.model = new ChatOpenAI({
            openAIApiKey: apiKey,
            modelName: "qwen/qwen3.6-plus",
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
        You are a Senior Security Engineer. Your task is to identify the EXACT file responsible for a vulnerability.

        VULNERABILITY REPORT FROM ZAP:
        - Vulnerable URL: {url}
        - Vulnerability Type: {type}
        - Parameter: {parameter}

        PROJECT STRUCTURE:
        {structure}

        CANDIDATE FILES CODE:
        {code}

        INSTRUCTIONS:
        1. Compare the URL path from ZAP with the Route definitions in the provided code.
        2. Identify which file handles the logic for this specific URL.
        3. Return your answer in STRICT JSON format.

        OUTPUT FORMAT:
        {{
            "selected_file": "absolute/path/to/file",
            "reasoning": "Why this file matches the ZAP URL",
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

        const response = await this.model.invoke(formattedPrompt);

        try {
            return JSON.parse(response.content);
        } catch (e) {

            console.error("Failed to parse AI response as JSON");
            return response.content;
        }
    }
}

export default DecisionMaker;