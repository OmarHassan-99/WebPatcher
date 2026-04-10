import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..", "..");
const storageDir = path.join(repoRoot, "web_patcher_storage");

function findAllOpenapiYaml(dir) {
  const results = [];
  const stack = [dir];

  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const ent of entries) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
      } else if (ent.isFile() && ent.name.toLowerCase() === "openapi.yaml") {
        let stat;
        try {
          stat = fs.statSync(full);
        } catch {
          continue;
        }
        results.push({ path: full, mtimeMs: stat.mtimeMs });
      }
    }
  }

  return results;
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

const baseUrl =
  getArg("--url") ||
  getArg("--base-url") ||
  process.env.SCHEMATHESIS_BASE_URL ||
  process.env.TARGET_BASE_URL ||
  null;

if (!baseUrl) {
  console.error(
    "Missing URL. Provide --url http://localhost:3002 (or --base-url) or set SCHEMATHESIS_BASE_URL.",
  );
  process.exit(2);
}

if (!fs.existsSync(storageDir)) {
  console.error(`No storage dir found at: ${storageDir}`);
  process.exit(3);
}

const candidates = findAllOpenapiYaml(storageDir).sort(
  (a, b) => b.mtimeMs - a.mtimeMs,
);

if (candidates.length === 0) {
  console.error(`No Openapi.yaml found under: ${storageDir}`);
  process.exit(4);
}

const openapiPath = candidates[0].path;
const repoPath = path.dirname(openapiPath);
const reportPath =
  getArg("--report-path") || path.join(repoPath, "schemathesis-report.har");

console.log(`[schemathesis] OpenAPI: ${openapiPath}`);
console.log(`[schemathesis] Base URL: ${baseUrl}`);
console.log(`[schemathesis] Report: ${reportPath}`);

const st = process.platform === "win32" ? "st.exe" : "st";
const args = [
  "run",
  openapiPath,
  "--url",
  baseUrl,
  "--report",
  "har",
  "--report-har-path",
  reportPath,
];

const res = spawnSync(st, args, {
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    PYTHONUTF8: "1",
    PYTHONIOENCODING: "utf-8",
  },
});
process.exit(res.status ?? 1);

