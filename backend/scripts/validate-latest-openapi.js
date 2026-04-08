import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// `RepoDownloader` stores downloads at: backend/../../web_patcher_storage
// but in practice it ends up at repo-root/web_patcher_storage.
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

if (!fs.existsSync(storageDir)) {
  console.error(
    `[openapi:validate:latest] No storage dir found at: ${storageDir}\n` +
      `Generate an Openapi.yaml first (start a scan with a GitHub repo URL).`,
  );
  process.exit(2);
}

const candidates = findAllOpenapiYaml(storageDir).sort(
  (a, b) => b.mtimeMs - a.mtimeMs,
);

if (candidates.length === 0) {
  console.error(
    `[openapi:validate:latest] No Openapi.yaml found under: ${storageDir}`,
  );
  process.exit(3);
}

const latest = candidates[0].path;
console.log(`[openapi:validate:latest] Validating: ${latest}`);

// Prefer calling the locally installed binary for reliability across npm/npx versions.
const swaggerCliBin =
  process.platform === "win32"
    ? path.join(repoRoot, "backend", "node_modules", ".bin", "swagger-cli.cmd")
    : path.join(repoRoot, "backend", "node_modules", ".bin", "swagger-cli");

const spawnOptions = {
  stdio: "inherit",
  shell: process.platform === "win32",
};

let result = spawnSync(swaggerCliBin, ["validate", latest], spawnOptions);

if (result.error) {
  console.warn(
    `[openapi:validate:latest] Failed to execute local swagger-cli at: ${swaggerCliBin}`,
  );
  console.warn(
    `[openapi:validate:latest] Spawn error: ${result.error.message}`,
  );
  console.warn(`[openapi:validate:latest] Falling back to npx...`);

  const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
  result = spawnSync(npxBin, ["swagger-cli", "validate", latest], spawnOptions);
}

process.exit(result.status ?? 1);

