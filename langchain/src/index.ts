import * as dotenv from "dotenv";
import { executePatchChain } from "../chains/chains";
import { logger } from "../logging/logger";

//Contact me to get the Langchain .env file (it contains API keys and is not public)
dotenv.config();

async function runPatchRecommendationPipeline(findings: unknown[]) {
  logger.info("Starting WebPatcher LangChain pipeline");

  //Validation for input (I will later implement the validation using Zod or another library in patchSchema.ts)
  logger.info("Step 1: Validating extracted findings");
  if (!Array.isArray(findings) || findings.length === 0) {
    logger.error("Input validation failed: findings must be a non-empty array");
    throw new Error("Invalid findings: must be a non-empty array");
  }

  const validatedFindings = findings;
  logger.info(`Validated ${validatedFindings.length} finding(s)`);

  
  logger.info("Step 2: Executing patch recommendation chain");
  const patchRecommendations = await executePatchChain(validatedFindings);

  
  logger.info("Step 3: Validating patch recommendations output");
  if (!Array.isArray(patchRecommendations) || patchRecommendations.length === 0) {
    logger.error("Output validation failed: invalid response format");
    throw new Error("Invalid output: must be a non-empty array");
  }

  logger.info("Pipeline completed successfully", {
    inputCount: validatedFindings.length,
    outputCount: patchRecommendations.length,
  });

  return patchRecommendations;
}

// Data for Testing (just for now , I will later use findings coming from extractor service)
const mockFindings = [
  {
    scanJob: "scan-001",
    pluginId: "40018",
    alertName: "Cross Site Scripting (Stored)",
    severity: "High",
    description:
      "A stored cross-site scripting vulnerability was found in the application allowing attackers to inject malicious scripts.",
    solution:
      "Implement input validation and output encoding. Use Content Security Policy headers.",
    instances: {
      uri: "https://example.com/post",
      method: "POST",
      param: "comment",
      attack: "<script>alert('XSS')</script>",
      evidence: "The injected script was reflected in the response",
    },
    cweId: 79,
  },
  {
    scanJob: "scan-001",
    pluginId: "40015",
    alertName: "Cross Site Scripting (Reflected)",
    severity: "Medium",
    description:
      "A reflected cross-site scripting vulnerability was found where user input is echoed back without sanitization.",
    solution: "Sanitize and encode all user input before displaying it to the browser.",
    instances: {
      uri: "https://example.com/search",
      method: "GET",
      param: "q",
      attack: "<img src=x onerror=alert('XSS')>",
      evidence: "Payload was reflected in the search results page",
    },
    cweId: 79,
  },
];

async function main() {
  try {
    const results = await runPatchRecommendationPipeline(mockFindings);
    logger.info("Final patch recommendations:");
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    logger.error("Pipeline failed", error);
    process.exit(1);
  }
}

// Run the pipeline
main();
