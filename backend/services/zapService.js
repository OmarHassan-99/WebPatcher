import ZapClient from "zaproxy";
import axios from "axios";
import ScanJob from "../models/scanJobModel.js";
import { broadcastToUser, emitScanEvent } from "./socketService.js";

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

export async function runZapScanService(targetUrl, scanJobId, userId) {
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
  } catch (err) {
    console.error("Failed to initialize ZAP session:", err);
    throw err;
  }

  try {
    //Classic spider
    emitScanEvent(scanJobId, "scan:stage", {
      stage: "spider",
      message: "Classic Spider starting…",
    });

    emitScanEvent(scanJobId, "scan:progress", {
      stage: "spider",
      percent: 0,
      message: "Classic Spider starting…",
    });
    console.log("[ZapService] Starting Classic Spider...");
    const spiderId = await zap.spider.scan({ url: targetUrl });
    while (true) {
      const response = await zap.spider.status(spiderId);
      const status = parseInt(response.status, 10);
      console.log(`[ZapService] Spider progress: ${status}%`);
      emitScanEvent(scanJobId, "scan:progress", {
        stage: "spider",
        percent: status,
        message: `Crawling site… ${status}%`,
      });
      if (status >= 100) break;
      await sleep(1000);
    }

    // Start AJAX Spider
    emitScanEvent(scanJobId, "scan:stage", {
      stage: "ajax_spider",
      message: "AJAX Spider starting…",
    });

    console.log("[ZapService] Starting AJAX Spider...");
    await zap.ajaxSpider.scan({ url: targetUrl });

    while (true) {
      const stat = await zap.ajaxSpider.status();
      const statusText = stat.status || stat; // depends on zaproxy client version

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

      if (
        statusText === "stopped" ||
        statusText === "complete" ||
        statusText === "completed"
      ) {
        console.log("[ZapService] AJAX Spider finished successfully.");
        break;
      }

      await sleep(5000);
    }
  } catch (err) {
    console.warn(
      "[ZapService] Spidering error (continuing):",
      err?.message || err,
    );
  }

  // Start Active Scan
  try {
    emitScanEvent(scanJobId, "scan:stage", {
      stage: "active_scan",
      message: "Active scan starting…",
    });

    emitScanEvent(scanJobId, "scan:progress", {
      stage: "active_scan",
      percent: 0,
      message: "Active scan starting…",
    });
    console.log("Configuring a fast scan policy...");
    await zap.ascan.disableAllScanners({ scanpolicyname: "Default Policy" });

    await zap.ascan.enableScanners({
      ids: "40018,40012,40014,40016,40017",
      scanpolicyname: "Default Policy",
    });

    const ascanResponse = await zap.ascan.scan({
      url: targetUrl,
    });
    const ascanId = ascanResponse.scan;
    while (true) {
      const response = await zap.ascan.status(ascanId);
      const status = parseInt(response.status, 10);
      console.log(`[ZapService] Active Scan progress: ${status}%`);
      emitScanEvent(scanJobId, "scan:progress", {
        stage: "active_scan",
        percent: status,
        message: `Active scan running… ${status}%`,
      });
      if (status >= 100) break;
      await sleep(5000);
    }
  } catch (err) {
    console.error("[ZapService] Active scan error:", err?.message || err);

    emitScanEvent(scanJobId, "scan:error", {
      message: err?.message || "Active scan failed",
    });

    return { report: { alerts: [] } };
  }

  // Collect alerts
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
        count: 1000,
      },
    },
  );

  return { report: alerts.data };
}
