import { initializeLLM } from "../llm/llm";
import { formatFindingsForPrompt } from "../prompts/prompt";
import { logger } from "../logging/logger";
import { PromptTemplate } from "@langchain/core/prompts";

export async function executePatchChain(
  findings: unknown[]
): Promise<unknown[]> {
  logger.info(`Starting patch recommendation chain with ${findings.length} finding(s)`);

  const llmClient = initializeLLM();
  const findingsText = formatFindingsForPrompt(findings);

  logger.debug("Formatted findings for LLM prompt", { findingCount: findings.length });

  //  LangChain prompt template (Ahmed & Shrouk should work here to improve it more)
  const promptTemplate = PromptTemplate.fromTemplate(
    `You are a Senior cybersecurity expert analyzing security vulnerabilities discovered by OWASP ZAP (Automated Vulnerability Scanner).

For each vulnerability below, provide detailed patch recommendations ONLY as a valid JSON array. Do not add any markdown, code blocks, or extra text.

Vulnerability Details:
{findings_text}

Respond with ONLY a JSON array (no markdown, no code blocks) with objects containing these exact fields:
- vulnerability: The vulnerability name or type
- risk: Risk level (High, Medium, or Low)
- url: The URL where vulnerability was found
- analysis: Expert security analysis of the vulnerability and its impact
- patchRecommendation: Specific steps to fix this vulnerability
- secureCodeExample: Code snippet showing the secure fix

Example format (without the backticks - return valid JSON only):
["vulnerability": "Cross Site Scripting (Stored)", "risk": "High", "url": "https://example.com/post", "analysis": "...", "patchRecommendation": "...", "secureCodeExample": "..."]

Important: Return ONLY valid JSON. No markdown. No code blocks. No extra text.`
  );

  try {
    logger.debug("Building LangChain prompt template");

    const formattedPrompt = await promptTemplate.format({
      findings_text: findingsText,
    });

    logger.debug("Executing Ollama LLM via LangChain");
    const rawResult = await llmClient.generate(formattedPrompt);

    logger.debug("Received LLM response", { length: rawResult.length });

    // Return the raw result as is (wrapped in array to match signature)
    return [rawResult];
  } catch (error) {
    logger.error("Chain execution failed", error);
    throw error;
  }
}
