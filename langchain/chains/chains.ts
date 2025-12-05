import { initializeLLM } from "../llm/llm";
import { createPatchPrompt, formatFindingsForPrompt } from "../prompts/prompt";
import { logger } from "../logging/logger";

export async function executePatchChain(
  findings: unknown[]
): Promise<unknown[]> {
  logger.info(`Starting patch recommendation chain with ${findings.length} finding(s)`);

  const llm = initializeLLM();
  const findingsText = formatFindingsForPrompt(findings);
  const prompt = createPatchPrompt(findingsText);

  logger.debug("Formatted findings for LLM prompt", { findingCount: findings.length });

  try {
    logger.debug("Executing chain with Ollama LLM");
    const rawResult = await llm.call(prompt);

    logger.debug("Parsing LLM response as JSON");
    const result = JSON.parse(rawResult);

    logger.info("Chain execution completed successfully", { resultCount: result.length });
    return result;
  } catch (error) {
    logger.error("Chain execution failed", error);
    throw error;
  }
}
