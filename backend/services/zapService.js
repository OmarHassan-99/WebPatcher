import ZapClient from "zaproxy";
import axios from "axios";
import ScanJob from "../models/scanJobModel.js";
import { broadcastToUser, emitScanEvent } from "./socketService.js";
import { configureAuthentication, cleanupAuth } from "./zapAuthService.js";

const zapOptions = {
  apiKey: "123",
  proxy: {
    host: "127.0.0.1",
    port: 8080,
  },
};

const zap = new ZapClient(zapOptions);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to dynamically poll ZAP status APIs with a timeout to prevent hanging.
 * @param {Function} statusCheckFn - Async function returning the status text or percentage.
 * @param {Function} isCompleteFn - Function that evaluates the status to a boolean (true if done).
 * @param {Function} onProgressFn - Optional function to log or handle progress.
 * @param {number} maxWaitMs - Max total wait time for the stage.
 * @param {string} stageName - Logging label.
 */
async function pollWithTimeout(
  statusCheckFn,
  isCompleteFn,
  onProgressFn,
  maxWaitMs,
  stageName,
) {
  const startTime = Date.now();
  let sleepMs = 2000; // Start with 2s polling
  let consecutiveErrors = 0;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const status = await statusCheckFn();
      consecutiveErrors = 0; // reset on success

      if (onProgressFn) {
        onProgressFn(status);
      }

      if (isCompleteFn(status)) {
        console.log(`[ZapService] ${stageName} finished successfully.`);
        return true;
      }
    } catch (e) {
      consecutiveErrors++;
      console.warn(
        `[ZapService] ${stageName} polling error (${consecutiveErrors}/10):`,
        e?.message || e,
      );
      if (consecutiveErrors >= 10) {
        throw new Error(
          `ZAP API repeatedly unreachable. ZAP may have crashed (OOM) during intensive scans. Stage: ${stageName}`,
        );
      }
    }

    await sleep(sleepMs);
    // Gradually increase polling interval up to 5s to avoid hammering the API
    if (sleepMs < 5000) sleepMs += 1000;
  }

  console.warn(
    `[ZapService] ${stageName} timed out after ${maxWaitMs / 1000}s`,
  );
  return false;
}

export async function runZapScanService(
  targetUrl,
  scanJobId,
  userId,
  authConfig = null,
) {
  console.log(`[ZapService] Starting scan for: ${targetUrl}`);

  await ScanJob.findByIdAndUpdate(scanJobId, {
    $set: { status: "running" },
  });

  emitScanEvent(scanJobId, "scan:stage", {
    stage: "init",
    message: "Starting ZAP session…",
  });

  try {
    console.log("Starting a new ZAP session to cleanup...");
    await zap.core.newSession({});

    console.log("Setting ZAP mode to 'attack'...");
    await zap.core.setMode({ mode: "attack" });
  } catch (err) {
    console.error("Failed to initialize ZAP session:", err);
    throw err;
  }

  // --- 0. Authenticated Context Setup (optional) ---
  let authContextId = null;
  let authUserId = null;
  if (authConfig && authConfig.enabled) {
    try {
      emitScanEvent(scanJobId, "scan:stage", {
        stage: "auth",
        message: "Configuring authenticated scanning…",
      });

      const authResult = configureAuthentication(zap, targetUrl, authConfig);
      authContextId = authResult.contextId;
      authUserId = authResult.userId;
      console.log(
        `[ZapService] Authentication configured: context=${authContextId}, user=${authUserId}`,
      );
    } catch (err) {
      console.error("[ZapService] Authentication setup failed:", err.message);
      emitScanEvent(scanJobId, "scan:stage", {
        stage: "auth",
        message: `Auth setup failed: ${err.message}. Continuing unauthenticated…`,
      });
    }
  }

  // --- 1. Classic Spider ---
  try {
    console.log("[ZapService] Configuring and starting Classic Spider...");

    emitScanEvent(scanJobId, "scan:stage", {
      stage: "spider",
      message: "Classic Spider starting…",
    });

    emitScanEvent(scanJobId, "scan:progress", {
      stage: "spider",
      percent: 0,
      message: "Classic Spider starting…",
    });

    // Optimization: Increase threads & set a reasonable max depth
    await zap.spider.setOptionThreadCount({ integer: 10 });
    await zap.spider.setOptionMaxDepth({ integer: 5 });

    const spiderParams = { url: targetUrl };
    if (authContextId) spiderParams.contextName = "auth-ctx";
    if (authUserId) spiderParams.as_user = authUserId;
    const spiderResponse = await zap.spider.scan(spiderParams);
    const spiderId = spiderResponse.scan;

    await pollWithTimeout(
      async () => parseInt((await zap.spider.status(spiderId)).status, 10),
      (status) => status >= 100,
      (status) => {
        console.log(`[ZapService] Spider progress: ${status}%`);
        emitScanEvent(scanJobId, "scan:progress", {
          stage: "spider",
          percent: status,
          message: `Crawling site… ${status}%`,
        });
      },
      5 * 60 * 1000, // 5 minute max
      "Classic Spider",
    );
  } catch (err) {
    console.warn(
      "[ZapService] Classic Spidering error (continuing):",
      err?.message || err,
    );
  }

  // --- 2. AJAX Spider ---
  try {
    console.log("[ZapService] Configuring and starting AJAX Spider...");

    emitScanEvent(scanJobId, "scan:stage", {
      stage: "ajax_spider",
      message: "AJAX Spider starting…",
    });

    // Optimization: Drastically speed up the AJAX spider
    await zap.ajaxSpider.setOptionMaxDuration({ integer: 2 }); // 2 minutes max per crawl
    await zap.ajaxSpider.setOptionNumberOfBrowsers({ integer: 5 }); // 5 concurrent browsers
    await zap.ajaxSpider.setOptionMaxCrawlDepth({ integer: 3 }); // Shallow depth
    await zap.ajaxSpider.setOptionEventWait({ integer: 200 }); // Wait 200ms after clicks
    await zap.ajaxSpider.setOptionReloadWait({ integer: 500 }); // Wait 500ms after page loads

    const ajaxSpiderParams = { url: targetUrl };
    if (authContextId) ajaxSpiderParams.contextName = "auth-ctx";
    await zap.ajaxSpider.scan(ajaxSpiderParams);

    await pollWithTimeout(
      async () => {
        const stat = await zap.ajaxSpider.status();
        return stat.status || stat;
      },
      (statusText) => ["stopped", "complete", "completed"].includes(statusText),
      async (statusText) => {
        try {
          const numResults = await zap.ajaxSpider.numberOfResults();
          const count = numResults.numberOfResults || numResults;
          console.log(
            `[ZapService] AJAX Spider status: ${statusText}, found ${count} resources`,
          );
          emitScanEvent(scanJobId, "scan:progress", {
            stage: "ajax_spider",
            percent: null,
            message: `AJAX Spider running… ${count} resources found`,
          });
        } catch (e) {
          console.log(`[ZapService] AJAX Spider status: ${statusText}`);
          emitScanEvent(scanJobId, "scan:progress", {
            stage: "ajax_spider",
            percent: null,
            message: `AJAX Spider: ${statusText}`,
          });
        }
      },
      7 * 60 * 1000, // 7 minute max wait to ensure the internal 5 min timeout fires
      "AJAX Spider",
    );
  } catch (err) {
    console.warn(
      "[ZapService] AJAX Spidering error (continuing):",
      err?.message || err,
    );
    emitScanEvent(scanJobId, "scan:progress", {
      stage: "ajax_spider",
      percent: null,
      message: `AJAX Spider error: ${err?.message || "Failed"}`,
    });
  }

  // --- 3. Active Scan ---
  try {
    console.log("[ZapService] Starting active scan with Pen Test policy...");

    emitScanEvent(scanJobId, "scan:stage", {
      stage: "active_scan",
      message: "Starting active scan with Pen Test policy…",
    });

    emitScanEvent(scanJobId, "scan:progress", {
      stage: "active_scan",
      percent: 0,
      message: "Active scan starting…",
    });

    // Create the Pen Test policy if it doesn't exist, then configure it.
    try {
      await zap.ascan.addScanPolicy({ scanpolicyname: "Pen Test" });
    } catch (e) {
      // Ignored: Policy likely already exists
    }

    // Set aggressive attack parameters: HIGH attack strength, LOW alert threshold
    await zap.ascan.updateScanPolicy({
      scanpolicyname: "Pen Test",
      attackstrength: "HIGH",
      alertthreshold: "LOW",
    });

    // Ensure all attack plugins are enabled for the Pen Test policy
    await zap.ascan.enableAllScanners({ scanpolicyname: "Pen Test" });

    // Optimization: Increase concurrent scanning threads
    await zap.ascan.setOptionThreadPerHost({ integer: 5 });

    const ascanParams = { url: targetUrl };
    if (authContextId) ascanParams.contextId = authContextId;
    if (authUserId) ascanParams.as_user = authUserId;
    const ascanResponse = await zap.ascan.scan({
      ...ascanParams,
      scanpolicyname: "Pen Test",
    });
    const ascanId = ascanResponse.scan;

    await pollWithTimeout(
      async () => parseInt((await zap.ascan.status(ascanId)).status, 10),
      (status) => status >= 100,
      (status) => {
        console.log(`[ZapService] Active scan progress: ${status}%`);
        emitScanEvent(scanJobId, "scan:progress", {
          stage: "active_scan",
          percent: status,
          message: `Active scan running… ${status}%`,
        });
      },
      30 * 60 * 1000, // 30 minute max for the active scan (Pen Test is aggressive)
      "Active Scan (Pen Test Mode)",
    );
    console.log("[ZapService] Scan completed");
  } catch (err) {
    console.error("[ZapService] Active scan error:", err?.message || err);

    emitScanEvent(scanJobId, "scan:error", {
      message: err?.message || "Active scan failed",
    });

    return { report: { alerts: [] } };
  }

  // --- 4. Retrieve Alerts ---
  await ScanJob.findByIdAndUpdate(scanJobId, {
    $set: { status: "analyzing" },
  });

  broadcastToUser(userId, "scan:status", {
    scanJobId: scanJobId.toString(),
    status: "analyzing",
  });

  emitScanEvent(scanJobId, "scan:stage", {
    stage: "extracting",
    message: "Extracting and classifying findings…",
  });

  await sleep(3000);

  const alerts = await axios.get(
    "http://localhost:8080/JSON/alert/view/alerts/",
    {
      headers: { "X-ZAP-API-Key": zapOptions.apiKey },
      params: {
        baseurl: targetUrl,
        start: 0,
        count: 1000, // Safe batch limit
      },
    },
  );

  // Cleanup authenticated context if it was used
  if (authContextId) {
    await cleanupAuth(zap);
  }

  return { report: alerts.data };
}
