import path from "path";
import { spawn } from "child_process";

/**
 * Runs Schemathesis against the provided OpenAPI file and base URL.
 * Writes a JSON HAR report to `reportPath`.
 *
 * NOTE: This function is async and streams output to console.
 */
export function runSchemathesisHarReport({
  openapiPath,
  baseUrl,
  reportPath,
}) {
  // Schemathesis v4 uses the `st` CLI.
  const cmd = process.platform === "win32" ? "st.exe" : "st";
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

  const child = spawn(cmd, args, {
    stdio: "inherit",
    shell: false,
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
    },
  });

  return child;
}

export function defaultSchemathesisReportPath(repoPath) {
  return path.join(repoPath, "schemathesis-report.har");
}

