import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { VulnerabilityInput } from "../schemas";
import { TokenBudgetManager } from "../llm/TokenBudgetManager";
import { SummarizationHook } from "../llm/SummarizationHook";

/**
 * SmartPromptBuilder
 * وظيفته بناء الـ Prompt بشكل ذكي وتقليله تدريجياً إذا تجاوز حدود الـ Tokens الخاصة بالموديل.
 */
export class SmartPromptBuilder {
    private budgetManager: TokenBudgetManager;
    private summaryHook: SummarizationHook;

    // تم تغيير النوع إلى BaseChatModel ليدعم Groq و Gemini وغيرهم
    constructor(llm: BaseChatModel) {
        this.budgetManager = new TokenBudgetManager();
        this.summaryHook = new SummarizationHook(llm);
    }

    /**
     * بناء الـ Pipeline الذي يقرر مستوى اختصار الـ Prompt بناءً على ميزانية الـ Tokens
     */
    public async buildPipeline(
        vuln: VulnerabilityInput, 
        model: BaseChatModel
    ): Promise<{ promptText: string; reductionLevel: number; modifiedVuln: VulnerabilityInput }> {
        
        let reductionLevel = 0;
        let modifiedVuln = { ...vuln };
        
        // المستوى 0: محتوى كامل (Full Content)
        let promptText = this.constructDeterministicPrompt(modifiedVuln, true);
        if (!(await this.budgetManager.needsReduction(model, promptText))) {
            return { promptText, reductionLevel, modifiedVuln };
        }

        // المستوى 1: الحقول الأساسية فقط (حذف الشواهد والحلول الطويلة)
        reductionLevel = 1;
        promptText = this.constructDeterministicPrompt(modifiedVuln, false);
        if (!(await this.budgetManager.needsReduction(model, promptText))) {
            return { promptText, reductionLevel, modifiedVuln };
        }

        // المستوى 2: استخدام الـ Summarization Hook لتلخيص الوصف (Description)
        reductionLevel = 2;
        const summarizedDescription = await this.summaryHook.summarize(modifiedVuln.description);
        modifiedVuln.description = summarizedDescription;
        promptText = this.constructDeterministicPrompt(modifiedVuln, false);
        if (!(await this.budgetManager.needsReduction(model, promptText))) {
            return { promptText, reductionLevel, modifiedVuln };
        }

        // المستوى 3: تفعيل علم الـ Chunking (للتعامل مع الملفات الضخمة جداً)
        reductionLevel = 3;
        return { promptText, reductionLevel, modifiedVuln };
    }

    /**
     * بناء النص النهائي للـ Prompt بشكل منظم
     */
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