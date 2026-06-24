import fs from "fs";
import path from "path";
import { ChatOpenAI } from "@langchain/openai";

const TEXT_EXTENSIONS = new Set([
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".py",
  ".java",
  ".go",
  ".php",
  ".rb",
]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  "out",
  "vendor",
  ".venv",
  ".env",
]);

function makeRelativePath(repoPath, fullPath) {
  return path.relative(repoPath, fullPath).replace(/\\/g, "/");
}

function pickSnippetAroundMatch(
  content,
  needleRegex,
  maxBefore = 2000,
  maxAfter = 4500,
) {
  const match = content.match(needleRegex);
  if (!match || match.index === undefined) {
    return content.slice(0, maxBefore + maxAfter);
  }
  const start = Math.max(0, match.index - maxBefore);
  const end = Math.min(
    content.length,
    match.index + match[0].length + maxAfter,
  );
  return content.slice(start, end);
}

export function collectCandidateSnippets(
  repoPath,
  maxCandidateFiles = 12,
  maxScannedFiles = 200,
) {
  const keywordsRegexes = [
    /(express\.Router)/i,
    /(router\.(get|post|put|delete|patch)\s*\()/i,
    /(app\.(get|post|put|delete|patch)\s*\()/i,
    /(@app\.(get|post|put|delete|patch))/i, // FastAPI
    /(urlpatterns\s*=)/i, // Django
    /(Route\.|router\.|controller)/i, // generic
    /(swagger|openapi)/i,
  ];

  const candidates = [];
  let scannedFiles = 0;

  function walk(dir, depth) {
    if (candidates.length >= maxCandidateFiles) return;
    if (scannedFiles >= maxScannedFiles) return;
    if (depth > 10) return;

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (candidates.length >= maxCandidateFiles) return;
      if (scannedFiles >= maxScannedFiles) return;

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name), depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (!TEXT_EXTENSIONS.has(ext)) continue;

      const fullPath = path.join(dir, entry.name);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      // Skip very large files to avoid huge prompts / memory issues.
      if (stat.size > 250 * 1024) continue;

      let content;
      try {
        content = fs.readFileSync(fullPath, "utf8");
      } catch {
        continue;
      }

      scannedFiles++;

      const lowered = content.toLowerCase();
      const hasSignal =
        keywordsRegexes.some((rx) => rx.test(content)) ||
        lowered.includes("/api") ||
        lowered.includes("api/");

      if (!hasSignal) continue;

      // Prefer extracting around the first useful pattern.
      let snippet = content.slice(0, 6000);
      for (const rx of keywordsRegexes) {
        if (rx.test(content)) {
          snippet = pickSnippetAroundMatch(content, rx);
          break;
        }
      }

      candidates.push({
        relativePath: makeRelativePath(repoPath, fullPath),
        snippet: snippet.slice(0, 9000),
      });
    }
  }

  walk(repoPath, 0);
  return candidates;
}

export function stripCodeFences(text) {
  // Remove ```yaml ... ``` or generic ``` ... ```
  return text
    .replace(/```[a-zA-Z0-9_-]*\s*/g, "")
    .replace(/```/g, "")
    .trim();
}

export async function generateAndWriteOpenapiYaml({
  repoPath,
  targetUrl,
  maxCandidateFiles = 12,
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing LLM API key. Set OPENAI_API_KEY (recommended) in backend/.env",
    );
  }

  const candidates = collectCandidateSnippets(repoPath, maxCandidateFiles, 220);

  // Minimal “structure” so the model understands the project context.
  // We purposely keep it small to reduce tokens.
  const projectHint = [
    `Target URL: ${targetUrl || "http://localhost"}`,
    `Total candidate files: ${candidates.length}`,
    ...candidates.slice(0, 8).map((c, i) => `[${i + 1}] ${c.relativePath}`),
  ].join("\n");

  const prompt = `
You are an expert backend engineer and OpenAPI 3.0/3.0.3 documentation generator.

TASK
Generate a valid OpenAPI 3.0.3 YAML document for the REST API implemented by the provided backend source snippets.

INPUTS
${projectHint}

CANDIDATE FILE SNIPPETS
${candidates
  .map(
    (c, i) => `FILE ${i + 1}: ${c.relativePath}\nSNIPPET:\n${c.snippet}\n----`,
  )
  .join("\n")}

REQUIREMENTS
- Output ONLY YAML (no markdown code fences).
- Include: "openapi", "info", "servers", "paths", and minimal "components" if needed.
- Use the server URL from Target URL. If you cannot infer an API base path, still set servers.url to the provided Target URL.
- Only include endpoints you can infer from the snippets with reasonable confidence.
- For unknown request/response schemas, use placeholders (e.g., string, object) rather than guessing exact models.
- Prefer JSON requestBody if the code suggests JSON payloads.
- CRITICAL: For all string properties in schemas, you MUST include 'minLength: 1' to avoid empty string validation errors.

OUTPUT
Return the YAML content only.
`.trim();

  const llm = new ChatOpenAI({
    apiKey,
    modelName: "qwen/qwen3.6-plus",
    temperature: 0.2,
    maxTokens: 2400,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });

  const response = await llm.invoke(prompt);
  const yamlText = stripCodeFences(response.content ?? String(response));

  const outputPath = path.join(repoPath, "Openapi.yaml");
  fs.writeFileSync(outputPath, yamlText, "utf8");
  // Helpful for debugging: you can locate the file in the job folder.
  console.log(`[OpenApiService] Wrote Openapi.yaml -> ${outputPath}`);

  return { outputPath, yamlText };
}
