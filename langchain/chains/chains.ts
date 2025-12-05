import { initializeLLM } from "../llm/llm";
import { createPatchPromptTemplate, formatFindingsForPrompt } from "../prompts/prompt";
import { logger } from "../logging/logger";
import { StringOutputParser } from "@langchain/core/output_parsers";

export async function createPatchChain() {
  logger.debug("Initializing patch recommendation chain");

  const llm = initializeLLM();
  const prompt = createPatchPromptTemplate();

  const chain = prompt.pipe(llm).pipe(new StringOutputParser());

  logger.info("Patch recommendation chain initialized successfully");
  return chain;
}

export async function executePatchChain(
  findings: unknown[]
): Promise<unknown[]> {
  logger.info(`Starting patch recommendation chain with ${findings.length} finding(s)`);

  const chain = await createPatchChain();
  const findingsText = formatFindingsForPrompt(findings);

  logger.debug("Formatted findings for LLM prompt", { findingCount: findings.length });

  try {
    logger.debug("Executing chain with LLM");
    const rawResult = await chain.invoke({
      findings_text: findingsText,
    });

    logger.debug("Parsing LLM response as JSON");
    const result = JSON.parse(rawResult);

    logger.info("Chain execution completed successfully", { resultCount: result.length });
    return result;
  } catch (error) {
    logger.error("Chain execution failed", error);
    throw error;
  }
}
