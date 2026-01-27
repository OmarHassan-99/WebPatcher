/**
 * WebPatcher AI Layer - PatchGenerator Module
 * 
 * This module provides AI-powered vulnerability patch recommendations
 * using LangChain with Ollama for structured output generation.
 * 
 * @example
 * ```typescript
 * import { PatchGenerator, ZapFindingAdapter } from "./langchain/src";
 * 
 * // After ZAP scan completes and extractor processes the report
 * const zapFindings = await extractZapReport(report, scanJobId);
 * 
 * // Convert ZAP findings to PatchGenerator format
 * const vulnerabilities = ZapFindingAdapter.convertAndFilter(zapFindings, "Medium");
 * 
 * // Generate patches
 * const generator = new PatchGenerator();
 * const patches = await generator.generatePatches(vulnerabilities);
 * ```
 */

// Main classes
export { PatchGenerator } from "./services/PatchGenerator";
export { ZapFindingAdapter } from "./adapters/ZapFindingAdapter";

// Types
export type {
  VulnerabilityInput,
  PatchOutput,
  PatchGeneratorConfig,
  ZapFinding,
  ZapInstance
} from "./types";
export { PatchGenerationError } from "./types";

// Schemas
export {
  VulnerabilityInputSchema,
  PatchOutputSchema,
  ZapFindingSchema,
  ZapInstanceSchema
} from "./schemas";
