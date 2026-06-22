import fs from 'fs';
import path from 'path';
import { ChatOpenAI } from '@langchain/openai';
import { collectCandidateSnippets, stripCodeFences } from './openapiService.js';
import { validateOpenapiWithSwaggerCli } from './openapiValidationService.js';

/**
 * Regenerates the OpenAPI spec for a repository after patches have been applied.
 *
 * @param {Object} opts
 * @param {string}  opts.repoPath   - Absolute path to the (now-patched) cloned repo
 * @param {string}  opts.targetUrl  - The running server base URL
 * @returns {Promise<Object>} { success, outputPath, yamlText, validationResult }
 */
export async function regenerateOpenApiWithSummary({ repoPath, targetUrl }) {
  const result = {
    success: false,
    outputPath: null,
    yamlText: null,
    validationResult: null,
    error: null,
  };

  try {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      result.error = 'Missing LLM API key. Set OPENROUTER_API_KEY (recommended) in backend/.env';
      return result;
    }

    // Collect candidate code snippets from the patched repo
    const candidates = collectCandidateSnippets(repoPath, 12, 220);

    if (candidates.length === 0) {
      result.error = 'No candidate files with API routes found in the repository';
      return result;
    }

    const projectHint = [
      `Target URL: ${targetUrl || 'http://localhost'}`,
      `Total candidate files: ${candidates.length}`,
      ...candidates.slice(0, 8).map((c, i) => `[${i + 1}] ${c.relativePath}`),
    ].join('\n');

    const prompt = `
You are an expert backend engineer and OpenAPI 3.0/3.0.3 documentation generator.

TASK
Generate a valid OpenAPI 3.0.3 YAML document for the REST API implemented by the provided backend source snippets.

INPUTS
${projectHint}

CANDIDATE FILE SNIPPETS
${candidates
  .map(
    (c, i) =>
      `FILE ${i + 1}: ${c.relativePath}\nSNIPPET:\n${c.snippet}\n----`,
  )
  .join('\n')}

REQUIREMENTS
- Output ONLY YAML (no markdown code fences).
- Include: "openapi", "info", "servers", "paths", and minimal "components" only when needed.
- Use the server URL from Target URL. If you cannot infer an API base path, still set servers.url to the provided Target URL.
- Only include endpoints you can infer from the snippets with reasonable confidence.
- For unknown request/response schemas, use placeholders (e.g., string, object) rather than guessing exact models.
- Prefer JSON requestBody if the code suggests JSON payloads.
- Do NOT require or add "summary" fields unless they are clearly supported by the code context.
- In the top-level "info" object, include a short "description" field.
- CRITICAL: For all string properties in schemas, you MUST include 'minLength: 1' to avoid empty string validation errors.
- CRITICAL: Do NOT use any $ref unless the referenced component is actually declared in the same YAML document.
- CRITICAL: Prefer inline schemas over invented reusable components.
- CRITICAL: If you declare any component under "components", every referenced schema/response/parameter must exist exactly once and be spelled identically.

OUTPUT
Return the YAML content only.
`.trim();

    const llm = new ChatOpenAI({
      apiKey,
      modelName: 'qwen/qwen3.6-plus',
      temperature: 0.2,
      maxTokens: 600,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
      },
    });

    const response = await llm.invoke(prompt);
    const yamlText = stripCodeFences(response.content ?? String(response));

    const outputPath = path.join(repoPath, 'Openapi.yaml');
    fs.writeFileSync(outputPath, yamlText, 'utf8');
    console.log(`[OpenApiUpdater] Wrote updated Openapi.yaml → ${outputPath}`);

    // Validate the regenerated spec
    const validationResult = validateOpenapiWithSwaggerCli(outputPath);
    console.log(`[OpenApiUpdater] Validation: ${validationResult.ok ? 'valid' : 'invalid'}`);
    if (!validationResult.ok && validationResult.error) {
      console.error(`[OpenApiUpdater] Validation error: ${validationResult.error}`);
    }

    result.success = true;
    result.outputPath = outputPath;
    result.yamlText = yamlText;
    result.validationResult = validationResult;

  } catch (err) {
    console.error('[OpenApiUpdater] Error:', err.message);
    result.error = err.message;

    // If there's a partial result (e.g., YAML was written but validation failed),
    // still return what we have.
    const fallbackPath = path.join(repoPath, 'Openapi.yaml');
    if (fs.existsSync(fallbackPath)) {
      result.outputPath = fallbackPath;
      result.yamlText = fs.readFileSync(fallbackPath, 'utf8');
    }
  }

  return result;
}
