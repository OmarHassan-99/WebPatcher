import { VulnerabilityInput } from "../schemas";
import { TokenBudgetManager } from "../llm/TokenBudgetManager";
import { SummarizationHook } from "../llm/SummarizationHook";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export class SmartPromptBuilder {
    private budgetManager: TokenBudgetManager;
    private summaryHook: SummarizationHook;

    constructor(llm: ChatGoogleGenerativeAI) {
        this.budgetManager = new TokenBudgetManager();
        this.summaryHook = new SummarizationHook(llm);
    }

    public async buildPipeline(vuln: VulnerabilityInput, model: ChatGoogleGenerativeAI): Promise<{ promptText: string; reductionLevel: number; modifiedVuln: VulnerabilityInput }> {
        let reductionLevel = 0;
        let modifiedVuln = { ...vuln };
        
        // Level 0: Full Content
        let promptText = this.constructDeterministicPrompt(modifiedVuln, true);
        if (!(await this.budgetManager.needsReduction(model, promptText))) {
            return { promptText, reductionLevel, modifiedVuln };
        }

        // Level 1: Core Fields Only (strip evidence and long solutions)
        reductionLevel = 1;
        promptText = this.constructDeterministicPrompt(modifiedVuln, false);
        if (!(await this.budgetManager.needsReduction(model, promptText))) {
            return { promptText, reductionLevel, modifiedVuln };
        }

        // Level 2: Summarization Hook on Description
        reductionLevel = 2;
        const summarizedDescription = await this.summaryHook.summarize(modifiedVuln.description);
        modifiedVuln.description = summarizedDescription;
        promptText = this.constructDeterministicPrompt(modifiedVuln, false);
        if (!(await this.budgetManager.needsReduction(model, promptText))) {
            return { promptText, reductionLevel, modifiedVuln };
        }

        // Level 3: Chunking flag (This signals PatchGenerator to handle massive files natively)
        reductionLevel = 3;
        return { promptText, reductionLevel, modifiedVuln };
    }

    public constructDeterministicPrompt(vuln: VulnerabilityInput, includeOptional: boolean): string {
        const parts = [
            `Alert Name: ${vuln.alert_name}`,
            `Risk: ${vuln.risk_level}`,
            `URL: ${vuln.affected_url}`,
            `Description: ${vuln.description}`
        ];

        if (includeOptional && vuln.evidence) parts.push(`Evidence: ${vuln.evidence}`);
        if (includeOptional && vuln.method) parts.push(`Method: ${vuln.method}`);
        if (includeOptional && vuln.parameter) parts.push(`Parameter: ${vuln.parameter}`);
        if (includeOptional && vuln.attack_vector) parts.push(`Attack Vector: ${vuln.attack_vector}`);
        if (includeOptional && vuln.cwe_id) parts.push(`CWE ID: ${vuln.cwe_id}`);
        if (includeOptional && vuln.solution) parts.push(`ZAP Suggestion: ${vuln.solution}`);

        return parts.join("\n");
    }
}
