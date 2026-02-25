import ZapClient from "zaproxy";
import axios from "axios";
import ScanJob from "../models/scanJobModel.js";

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
async function pollWithTimeout(statusCheckFn, isCompleteFn, onProgressFn, maxWaitMs, stageName) {
  const startTime = Date.now();
  let sleepMs = 2000; // Start with 2s polling

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const status = await statusCheckFn();
      
      if (onProgressFn) {
        onProgressFn(status);
      }

      if (isCompleteFn(status)) {
        console.log(`[ZapService] ${stageName} finished successfully.`);
        return true;
      }
    } catch (e) {
      console.warn(`[ZapService] ${stageName} polling error:`, e?.message || e);
    }

    await sleep(sleepMs);
    // Gradually increase polling interval up to 5s to avoid hammering the API
    if (sleepMs < 5000) sleepMs += 1000;
  }

  console.warn(`[ZapService] ${stageName} timed out after ${maxWaitMs / 1000}s`);
  return false;
}

export async function runZapScanService(targetUrl, scanJobId) {
  console.log(`[ZapService] Starting scan for: ${targetUrl}`);

  await ScanJob.findByIdAndUpdate(scanJobId, {
    $set: { status: "running" },
  });

  try {
    console.log("Starting a new ZAP session to cleanup...");
    await zap.core.newSession({});
  } catch (err) {
    console.error("Failed to initialize ZAP session:", err);
    throw err;
  }

  // --- 1. Classic Spider ---
  try {
    console.log("[ZapService] Configuring and starting Classic Spider...");
    // Optimization: Increase threads & set a reasonable max depth
    await zap.spider.setOptionThreadCount({ integer: 10 });
    await zap.spider.setOptionMaxDepth({ integer: 5 });
    
    const spiderResponse = await zap.spider.scan({ url: targetUrl });
    const spiderId = spiderResponse.scan;

    await pollWithTimeout(
      async () => parseInt((await zap.spider.status(spiderId)).status, 10),
      (status) => status >= 100,
      (status) => console.log(`[ZapService] Spider progress: ${status}%`),
      5 * 60 * 1000, // 5 minute max
      "Classic Spider"
    );
  } catch (err) {
    console.warn("[ZapService] Classic Spidering error (continuing):", err?.message || err);
  }

  // --- 2. AJAX Spider ---
  try {
    console.log("[ZapService] Configuring and starting AJAX Spider...");
    // Optimization: Drastically speed up the AJAX spider
    await zap.ajaxSpider.setOptionMaxDuration({ integer: 2 }); // 2 minutes max per crawl
    await zap.ajaxSpider.setOptionNumberOfBrowsers({ integer: 5 }); // 5 concurrent browsers
    await zap.ajaxSpider.setOptionMaxCrawlDepth({ integer: 3 }); // Shallow depth
    await zap.ajaxSpider.setOptionEventWait({ integer: 200 }); // Wait 200ms after clicks
    await zap.ajaxSpider.setOptionReloadWait({ integer: 500 }); // Wait 500ms after page loads
    
    await zap.ajaxSpider.scan({ url: targetUrl });

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
          console.log(`[ZapService] AJAX Spider status: ${statusText}, found ${count} resources`);
        } catch (e) {
          console.log(`[ZapService] AJAX Spider status: ${statusText}`);
        }
      },
      7 * 60 * 1000, // 7 minute max wait to ensure the internal 5 min timeout fires
      "AJAX Spider"
    );
  } catch (err) {
    console.warn("[ZapService] AJAX Spidering error (continuing):", err?.message || err);
  }

  // --- 3. Active Scan ---
  try {
    console.log("[ZapService] Configuring a fast Active scan policy...");
    await zap.ascan.disableAllScanners({ scanpolicyname: "Default Policy" });

    // Enable high-priority web vulnerability scanners (SQLi, XSS, etc)
    // 40018: SQL Injection, 40012: Cross Site Scripting (Reflected), 40014: Cross Site Scripting (Persistent), 40016: Cross Site Scripting (Persistent) - Prime, 40017: Cross Site Scripting (Persistent) - Spider
    await zap.ascan.enableScanners({
      ids: "40018,40012,40014,40016,40017",
      scanpolicyname: "Default Policy",
    });

    // Optimization: Increase concurrent scanning threads
    await zap.ascan.setOptionThreadPerHost({ integer: 5 });

    const ascanResponse = await zap.ascan.scan({ url: targetUrl });
    const ascanId = ascanResponse.scan;

    await pollWithTimeout(
      async () => parseInt((await zap.ascan.status(ascanId)).status, 10),
      (status) => status >= 100,
      (status) => console.log(`[ZapService] Active Scan progress: ${status}%`),
      15 * 60 * 1000, // 15 minute max for the active scan
      "Active Scan"
    );
  } catch (err) {
    console.error("[ZapService] Active scan error:", err?.message || err);
  }

  // --- 4. Retrieve Alerts ---
  const alerts = await axios.get(
    "http://localhost:8080/JSON/alert/view/alerts/",
    {
      headers: { "X-ZAP-API-Key": zapOptions.apiKey },
      params: {
        baseurl: targetUrl,
        start: 0,
        count: 1000, // Safe batch limit
      },
    }
  );

  return { report: alerts.data };
}
