import ScanJob from "../models/scanJobModel.js";
import ScanReport from "../models/ScanReportModel.js";
import ScanRecommendation from "../models/ScanRecommendationModel.js";
//import queue from "../services/queue.js";
import { validateUrl } from "../utils/validator.js";
import { isHostReachable } from "../utils/network.js";
import { validateRepo } from "../utils/githubValidation.js";
import { runZapScanService } from "../services/zapService.js";
import { extractZapReport } from "../services/extractor.js";
import {
  generatePatchesForFindings,
  isLangChainApiHealthy,
} from "../services/patchService.js";
import mongoose from "mongoose";
import { createAndSaveRecommendation } from "../services/recommendationService.js";
import { emitScanEvent, broadcastToUser } from "../services/socketService.js";

import mappingService from "../services/mappingService.js";
import RepoDownloader from "../services/githubService.js";
const Downloader = new RepoDownloader();

export async function validateTargetAndRepoURLs(req, res) {
  try {
    const { targetURL, githubRepoUrl } = req.body;
    const errors = {};
    let installationId = null; // Needed later to clone the code if needed

    // 1. Validate Target URL
    if (!targetURL || !validateUrl(String(targetURL).trim())) {
      errors.targetUrl =
        "Invalid URL format (must be absolute, e.g., https://...)";
    } else {
      const check = await isHostReachable(targetURL);
      if (!check.ok) {
        errors.targetUrl = check.reason || "Target is not reachable";
      }
    }

    // 2. Validate Repo URL (if provided)
    if (githubRepoUrl && githubRepoUrl.trim() !== "") {
      const repoCheck = await validateRepo(githubRepoUrl);
      if (!repoCheck.valid) {
        errors.githubRepoUrl = repoCheck.message;
      } else if (repoCheck.type === "private") {
        installationId = repoCheck.installationId;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    return res.json({ success: true, valid: true, installationId });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Validation failed" });
  }
}

export async function startZapScan(req, res) {
  const { url, targetName, githubRepoUrl, context, previousScanId } = req.body;
  const userId = req.session.user._id;

  try {
    console.log(`[ScanController] Received request to scan URL: ${url}`);

    if (previousScanId) {
      // Hide the previous scan from the Target list UI
      await ScanJob.findByIdAndUpdate(previousScanId, {
        $set: { isHidden: true },
      });
    }

    const scan = await ScanJob.create({
      user: req.session.user._id,
      targetUrl: url,
      githubRepoUrl,
      targetName,
      previousScanId,
      context,
    });

    res.status(202).json({ scanJobId: scan._id.toString() });

    broadcastToUser(userId, "scan:created", { scanJobId: scan._id.toString() });
    runScanInBackground(url, scan._id, userId, githubRepoUrl);
  } catch (error) {
    console.error("[ScanController] Failed to create scan job:", error);
    res.status(500).json({ message: "Failed to start scan" });
  }
}

async function runScanInBackground(url, scanJobId, userId, githubRepoUrl) {
  try {
    const { report } = await runZapScanService(url, scanJobId, userId);

    const extractedReport = await extractZapReport(report, scanJobId);

    console.log(
      "===================================================================\n",
    );

    console.log(JSON.stringify(extractedReport, null, 2));
    try {
      //Sent report to mapping to map files
      console.log("\nStep 2: Parsing ZAP Report...");
      const alerts = extractedReport;

      //cloning repo
      const repoPath = await Downloader.downloadSourceCode(
        githubRepoUrl,
        "user_1",
      );
      console.log(`✅ Repo cloned to: ${repoPath}`);

      const rawAlert = alerts.find((a) => a.alertName === "SQL Injection");
      console.log(
        `✅ Target Alert Found: ${rawAlert.alertName} on ${rawAlert.instances[0].uri}`,
      );

      const targetAlert = {
        type: rawAlert.alertName,
        url: rawAlert.instances[0].uri, // ZAP بيبعت URI جوه instances
        parameter: rawAlert.instances[0].param || "", // ZAP بيبعت param وليس parameter
        evidence: rawAlert.instances[0].evidence || "",
      };

      console.log(
        `✅ Normalized Alert: Searching for "${targetAlert.parameter}" on ${targetAlert.url}`,
      );
      // mapping
      console.log("\nStep 3: Mapping URL to Source Code...");
      const location = await mappingService.mapAlertToCode(
        repoPath,
        targetAlert,
      );
      if (location) {
        console.log("-----------------------------------------");
        console.log(`🎯 MATCH FOUND!`);
        console.log(`📄 File: ${location.filePath}`);
        console.log(`📍 Line: ${location.line}`);
        console.log(`💻 Code: ${location.snippet}`);
        console.log("-----------------------------------------");
      } else {
        console.error("❌ Failed to map the vulnerability to code.");
      }
    } catch (error) {
      console.error("💥 Master Test Failed:", error.message);
    }
    console.log(
      "===================================================================\n",
    );

    console.log("[ScanController] Scan complete. Starting patch generation...");
    generatePatchesInBackground(extractedReport, scanJobId, userId);
  } catch (error) {
    console.error("[ScanController] Background scan error:", error);

    await ScanJob.findByIdAndUpdate(scanJobId, {
      $set: { status: "failed", finishedAt: Date.now() },
    });

    broadcastToUser(userId, "scan:status", {
      scanJobId: scanJobId.toString(),
      status: "failed",
    });

    emitScanEvent(scanJobId, "scan:error", {
      message: error.message || "Scan failed",
    });
  }
}

async function generatePatchesInBackground(findings, scanJobId, userId) {
  try {
    // Check if LangChain API is running
    const isHealthy = await isLangChainApiHealthy();
    if (!isHealthy) {
      console.log(
        "[ScanController] LangChain API not available - skipping patch generation",
      );
      console.log(
        "[ScanController] To enable patches, run: cd langchain && npm run server",
      );

      await ScanJob.findByIdAndUpdate(scanJobId, {
        $set: { status: "completed", finishedAt: Date.now() },
      });
      broadcastToUser(userId, "scan:status", {
        scanJobId: scanJobId.toString(),
        status: "completed",
      });

      emitScanEvent(scanJobId, "scan:complete", {
        stage: "done",
        successCount: 0,
        total: 0,
        message: "Scan complete (AI patching skipped — LangChain not running)",
      });
      return;
    }

    console.log(
      `[ScanController] Generating patches for ${findings.length} finding(s)...`,
    );

    await ScanJob.findByIdAndUpdate(scanJobId, {
      $set: { status: "patching" },
    });
    broadcastToUser(userId, "scan:status", {
      scanJobId: scanJobId.toString(),
      status: "patching",
    });

    emitScanEvent(scanJobId, "scan:stage", {
      stage: "patching",
      message: `AI generating patches for ${findings.length} finding(s)…`,
      total: findings.length,
    });

    // Retrieve scan context to pass to LLM
    const scan = await ScanJob.findById(scanJobId).lean();
    const context = scan?.context || null;

    const patchResult = await generatePatchesForFindings(
      findings,
      "Medium",
      context,
    );

    if (patchResult.success) {
      const total = patchResult.patches.length;
      let successCount = 0;

      console.log("\n" + "=".repeat(80));
      console.log(" AI-GENERATED PATCHES");
      console.log("=".repeat(80));

      let patchNum = 0;
      for (const [index, patchData] of patchResult.patches.entries()) {
        if (patchData.success && patchData.patch) {
          patchNum++;
          successCount++;
          console.log(`\n [${patchNum}] ${patchData.vulnerability.alert_name}`);
          console.log(`   Risk: ${patchData.vulnerability.risk_level}`);
          console.log(`   URL: ${patchData.vulnerability.affected_url}`);
          console.log("-".repeat(60));

          try {
            await createAndSaveRecommendation(
              scanJobId,
              patchData.vulnerability,
              patchData.patch,
            );
          } catch (dbErr) {
            console.error(
              `   [ScanController] Failed to save recommendation to DB: ${dbErr.message}`,
            );
          }

          emitScanEvent(scanJobId, "scan:patch", {
            index: index + 1,
            total,
            alert_name: patchData.vulnerability.alert_name,
            risk_level: patchData.vulnerability.risk_level,
            success: true,
          });
        } else if (!patchData.success) {
          console.log(
            `\n FAILED: ${patchData.vulnerability?.alert_name || "Unknown"}`,
          );
          console.log(`   Error: ${patchData.error}`);

          emitScanEvent(scanJobId, "scan:patch", {
            index: index + 1,
            total,
            alert_name: patchData.vulnerability?.alert_name || "Unknown",
            success: false,
            error: patchData.error,
          });
        }
      }

      console.log("\n" + "=".repeat(80));
      console.log(` ${successCount}/${total} patches generated successfully`);
      console.log("=".repeat(80) + "\n");

      await ScanJob.findByIdAndUpdate(scanJobId, {
        $set: { status: "completed", finishedAt: Date.now() },
      });
      broadcastToUser(userId, "scan:status", {
        scanJobId: scanJobId.toString(),
        status: "completed",
      });

      emitScanEvent(scanJobId, "scan:complete", {
        stage: "done",
        successCount,
        total,
        message: `Scan complete — ${successCount}/${total} patches generated`,
      });
    } else {
      console.error(
        "[ScanController] Patch generation failed:",
        patchResult.error,
      );
      emitScanEvent(scanJobId, "scan:error", {
        message: patchResult.error || "Patch generation failed",
      });
    }
  } catch (error) {
    console.error(
      "[ScanController] Background patch generation error:",
      error.message,
    );

    // uncomment the following if we want to update the scan status to failed if the patch generation fails
    // await ScanJob.findByIdAndUpdate(scanJobId, {
    //   $set: { status: "failed", finishedAt: Date.now() },
    // });
    // broadcastToUser(userId, "scan:status", {
    //   scanJobId: scanJobId.toString(),
    //   status: "failed",
    // });

    emitScanEvent(scanJobId, "scan:error", { message: error.message });
  }
}

export async function getScans(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const size = Math.min(50, parseInt(req.query.size) || 6);
    // $ne: true means -> not equal to true
    const filter = { user: req.session.user._id, isHidden: { $ne: true } };
    if (req.query.status) filter.status = req.query.status;

    const scans = await ScanJob.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * size)
      .limit(size)
      .lean();

    const total = await ScanJob.countDocuments(filter);
    return res.json({ scans, total, success: true });
  } catch (err) {
    console.error("listScans error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to list scans" });
  }
}

export async function deleteScan(req, res) {
  try {
    const { scanId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(scanId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Scan ID format" });
    }

    const scan = await ScanJob.findById(scanId);
    if (!scan) {
      return res
        .status(404)
        .json({ success: false, message: "Scan not found" });
    }

    if (String(scan.user) !== String(req.session.user._id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    await Promise.all([
      ScanJob.findByIdAndDelete(scanId),
      ScanReport.deleteOne({ scanJob: scanId }),
      ScanRecommendation.deleteOne({ scanJob: scanId }),
    ]);
    return res.json({ success: true, message: "Scan deleted successfully" });
  } catch (err) {
    console.error("deleteScan error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete scan" });
  }
}

export async function deleteBulkScans(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Scan IDs format" });
    }

    const deleted = await ScanJob.deleteMany({
      user: req.session.user._id,
      _id: { $in: ids },
    });
    await Promise.all([
      ScanReport.deleteMany({ scanJob: { $in: ids } }),
      ScanRecommendation.deleteMany({ scanJob: { $in: ids } }),
    ]);
    return res.json({
      success: true,
      message: `${deleted.deletedCount} scans deleted successfully`,
    });
  } catch (err) {
    console.error("deleteBulkScans error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete scans" });
  }
}

export async function getFindings(req, res) {
  try {
    const { scanId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(scanId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Scan ID format" });
    }

    const scan = await ScanJob.findById(scanId).lean();
    if (!scan) {
      return res
        .status(404)
        .json({ success: false, message: "Scan not found" });
    }

    if (String(scan.user) !== String(req.session.user._id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const scanReport = await ScanReport.findOne({ scanJob: scanId }).lean();
    const findings = scanReport?.findings ?? [];

    // Sort by severity: High → Medium → Low → Informational
    const severityOrder = { High: 0, Medium: 1, Low: 2, Informational: 3 };
    findings.sort(
      (a, b) =>
        (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4),
    );

    return res.json({ findings, status: scan.status, scan });
  } catch (err) {
    console.error("getFindings error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch findings" });
  }
}
