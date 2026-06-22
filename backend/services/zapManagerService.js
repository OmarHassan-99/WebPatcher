import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ZAP_HOST = "127.0.0.1";
const ZAP_PORT = 8080;
const ZAP_API_KEY = "123";
const ZAP_DIR = path.join(__dirname, "Zed Attack Proxy");
const ZAP_JAR = "zap-2.17.0.jar";

let startInProgress = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function isZapReachable() {
  try {
    await axios.get(`http://${ZAP_HOST}:${ZAP_PORT}/JSON/core/view/version/`, {
      params: { apikey: ZAP_API_KEY },
      timeout: 2000,
    });
    return true;
  } catch {
    return false;
  }
}

export async function ensureZapRunning({ timeoutMs = 45000 } = {}) {
  if (await isZapReachable()) {
    return { started: false, reachable: true };
  }

  if (!startInProgress) {
    startInProgress = true;
    try {
      const child = spawn(
        "java",
        [
          "-Xmx4g",
          "-jar",
          ZAP_JAR,
          "-daemon",
          "-port",
          String(ZAP_PORT),
          "-config",
          `api.key=${ZAP_API_KEY}`,
          "-config",
          "callhome.optin=false",
        ],
        {
          cwd: ZAP_DIR,
          detached: true,
          stdio: "ignore",
          windowsHide: true,
        },
      );
      child.unref();
    } finally {
      startInProgress = false;
    }
  }

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isZapReachable()) {
      return { started: true, reachable: true };
    }
    await sleep(1000);
  }

  return { started: true, reachable: false };
}
