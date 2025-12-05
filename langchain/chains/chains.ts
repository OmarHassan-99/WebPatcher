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

  // Create a LangChain prompt template
  const promptTemplate = PromptTemplate.fromTemplate(
    `You are a Senior cybersecurity expert analyzing security vulnerabilities discovered by OWASP ZAP.

For each vulnerability below, provide detailed patch recommendations in JSON format.

Vulnerability Details:
{findings_text}

For each vulnerability, respond with a JSON array containing objects with these exact fields:
- vulnerability: The vulnerability name or type
- risk: Assessment of risk level (High, Medium, or Low)
- url: The URL where the vulnerability was found
- analysis: Your expert analysis of the vulnerability and its potential impact
- patchRecommendation: Specific steps to fix this vulnerability
- secureCodeExample: A code snippet showing the secure fix

Ensure the response is valid JSON and can be parsed programmatically.
Return ONLY the JSON array, no other text.`
  );

  try {
    logger.debug("Building LangChain prompt template");
    
    // Format the prompt using LangChain template
    const formattedPrompt = await promptTemplate.format({
      findings_text: findingsText,
    });

    logger.debug("Executing Ollama LLM via LangChain");
    const rawResult = await llmClient.generate(formattedPrompt);

    logger.debug("Parsing LLM response as JSON");
    const result = JSON.parse(rawResult);

    logger.info("Chain execution completed successfully", { resultCount: result.length });
    return result;
  } catch (error) {
    logger.error("Chain execution failed", error);
    throw error;
  }
}
