import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSwaggerCliBin() {
  // Resolve to backend/node_modules/.bin/swagger-cli(.cmd)
  const backendDir = path.resolve(__dirname, "..");
  return process.platform === "win32"
    ? path.join(backendDir, "node_modules", ".bin", "swagger-cli.cmd")
    : path.join(backendDir, "node_modules", ".bin", "swagger-cli");
}

/**
 * Validates an OpenAPI YAML file using swagger-cli.
 * Returns structured result without throwing for validation failures.
 */
export function validateOpenapiWithSwaggerCli(openapiPath) {
  const swaggerCliBin = getSwaggerCliBin();
  const spawnOptions = {
    encoding: "utf8",
    shell: process.platform === "win32",
  };

  const result = spawnSync(
    swaggerCliBin,
    ["validate", openapiPath],
    spawnOptions,
  );

  // spawnSync may set result.error if it cannot execute the binary
  if (result.error) {
    return {
      ok: false,
      exitCode: result.status ?? 1,
      error: `Failed to execute swagger-cli: ${result.error.message}`,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  }

  const stdout = (result.stdout || "").trim();
  const stderr = (result.stderr || "").trim();

  if (result.status === 0) {
    return { ok: true, exitCode: 0, stdout, stderr };
  }

  return {
    ok: false,
    exitCode: result.status ?? 1,
    error: stderr || stdout || "OpenAPI validation failed",
    stdout,
    stderr,
  };
}

