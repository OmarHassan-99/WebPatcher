import ScanJob from "../models/scanJobModel.js";
import Finding from "../models/FindingModel.js";
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

    // 2. Validate Repo URL
    const repoCheck = await validateRepo(githubRepoUrl);
    if (!repoCheck.valid) {
      errors.githubRepoUrl = repoCheck.message;
    } else if (repoCheck.type === "private") {
      installationId = repoCheck.installationId;
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
  const { url, targetName, githubRepoUrl, context } = req.body;
  let scanJobId = null;

  try {
    console.log(`[ScanController] Received request to scan URL: ${url}`);
    const scan = await ScanJob.create({
      user: req.session.user._id,
      targetUrl: url,
      githubRepoUrl,
      targetName,
      context,
    });
    scanJobId = scan._id;

    const { report } = await runZapScanService(url, scan._id);

    // Uncomment lama n3mel el queue
    // if (queue && typeof queue.add === "function") {
    //   await queue.add("scan", { scanId: scan._id });
    // }

    const extractedReport = await extractZapReport(report, scan._id);

    console.log("[ScanController] Scan complete. Sending report to user");

    // Send response immediately so user sees results
    res.status(200).json(extractedReport);

    // Generate patches in background (don't await - runs after response)
    console.log("[ScanController] Starting patch generation in background...");
    generatePatchesInBackground(extractedReport, scanJobId);
  } catch (error) {
    console.error("[ScanController] An error occurred:", error);
    if (scanJobId) {
      await ScanJob.findByIdAndUpdate(scanJobId, {
        $set: {
          status: "failed",
          finishedAt: Date.now(),
        },
      });
    }
    res.status(500).json({ message: "Failed to complete the scan" });
  }
}

async function generatePatchesInBackground(findings, scanJobId) {
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
      return;
    }

    console.log(
      `[ScanController] Generating patches for ${findings.length} finding(s)...`,
    );

    // Retrieve scan context to pass to LLM
    const scan = await ScanJob.findById(scanJobId).lean();
    const context = scan?.context || null;

    const patchResult = await generatePatchesForFindings(findings, "Medium", context);

    if (patchResult.success) {
      const successCount = patchResult.patches.filter((p) => p.success).length;
      const failedCount = patchResult.patches.filter((p) => !p.success).length;

      console.log(
        `[ScanController] Attempted ${patchResult.patches.length} patches: ${successCount} succeeded, ${failedCount} failed`,
      );

      console.log("\n" + "=".repeat(80));
      console.log(" AI-GENERATED PATCHES");
      console.log("=".repeat(80));

      let patchNum = 0;
      for (const patchData of patchResult.patches) {
        if (patchData.success && patchData.patch) {
          patchNum++;
          console.log(`\n [${patchNum}] ${patchData.vulnerability.alert_name}`);
          console.log(`   Risk: ${patchData.vulnerability.risk_level}`);
          console.log(`   URL: ${patchData.vulnerability.affected_url}`);
          console.log("-".repeat(60));
          console.log(`    REASONING:`);
          console.log(`   ${patchData.patch.reasoning}`);
          console.log(`\n    VULNERABLE CODE EXAMPLE:`);
          console.log(`   ${patchData.patch.vulnerable_code_example}`);
          console.log(`\n    ANALYSIS:`);
          console.log(`   ${patchData.patch.analysis}`);
          console.log(`\n    ROOT CAUSE:`);
          console.log(`   ${patchData.patch.root_cause}`);
          console.log(`\n    FILE TYPE: ${patchData.patch.file_type}`);
          console.log(`\n    SUGGESTED FIX:`);
          console.log(`   ${patchData.patch.suggested_fix}`);
          console.log("-".repeat(60));

          // Database saving disabled for now
          // await Finding.findOneAndUpdate(
          //   { scanJob: scanJobId, alertName: patchData.vulnerability.alert_name },
          //   { $set: { patch: patchData.patch, patchGeneratedAt: new Date() } }
          // );
        } else if (!patchData.success) {
          console.log(
            `\n FAILED: ${patchData.vulnerability?.alert_name || "Unknown"}`,
          );
          console.log(`   Error: ${patchData.error}`);
        }
      }

      console.log("\n" + "=".repeat(80));
      console.log(
        ` ${successCount}/${patchResult.patches.length} patches generated successfully`,
      );
      console.log("=".repeat(80) + "\n");
    } else {
      console.error(
        "[ScanController] Patch generation failed:",
        patchResult.error,
      );
    }
  } catch (error) {
    console.error(
      "[ScanController] Background patch generation error:",
      error.message,
    );
  }
}

export async function getScans(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const size = Math.min(50, parseInt(req.query.size) || 20);
    const filter = { user: req.session.user._id };
    if (req.query.status) filter.status = req.query.status;

    const scans = await ScanJob.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * size)
      .limit(size)
      .lean();

    const total = await ScanJob.countDocuments(filter);
    return res.json({ total, page, size, scans, success: true });
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

    await ScanJob.findByIdAndDelete(scanId);
    return res.json({ success: true, message: "Scan deleted successfully" });
  } catch (err) {
    console.error("deleteScan error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete scan" });
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

    const findings = await Finding.find({ scanJob: scanId })
      .sort({ severity: -1, createdAt: -1 })
      .lean();

    return res.json({ findings, status: scan.status });
  } catch (err) {
    console.error("getFindings error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch findings" });
  }
}
