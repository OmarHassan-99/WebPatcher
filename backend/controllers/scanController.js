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
  patchFileContent,
} from "../services/patchService.js";
import mongoose from "mongoose";
import { createAndSaveRecommendation } from "../services/recommendationService.js";
import { emitScanEvent, broadcastToUser } from "../services/socketService.js";
import { testAuthentication } from "../services/zapAuthService.js";
import ZapClient from "zaproxy";

// استدعاء الخدمات الجديدة
import RepoDownloader, { generateFileTreeForAI } from '../services/githubService.js';
import UrlMapper from '../services/UrlMapper.js';
import DecisionMaker from '../services/DecisionMaker.js';
import { localPatchService } from '../services/localPatchService.js';
import SemgrepService from '../services/smgrepService.js';
import DetectorService from '../services/detectorService.js';
import path from 'path';
import fs from 'fs';


export async function validateTargetAndRepoURLs(req, res) {
  try {
    const { targetURL, githubRepoUrl } = req.body;
    const errors = {};
    let installationId = null; // Needed later to clone the code if needed

    // 1. Validate Target URL
    if (!targetURL || !validateUrl(String(targetURL).trim())) {
      errors.targetUrl = "Invalid URL format (must be absolute, e.g., http://... or https://...)";
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
  const {
    url,
    targetName,
    githubRepoUrl,
    context,
    previousScanId,
    authConfig,
  } = req.body;
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
      authConfig: authConfig || undefined,
    });

    res.status(202).json({ scanJobId: scan._id.toString() });

    broadcastToUser(userId, "scan:created", { scanJobId: scan._id.toString() });
    runScanInBackground(
      url,
      scan._id,
      userId,
      githubRepoUrl,
      authConfig || null,
    );
  } catch (error) {
    console.error("[ScanController] Failed to create scan job:", error);
    res.status(500).json({ message: "Failed to start scan" });
  }
}

async function runScanInBackground(
  url,
  scanJobId,
  userId,
  githubRepoUrl,
  authConfig = null,
) {
  try {
    const { report } = await runZapScanService(
      url,
      scanJobId,
      userId,
      authConfig,
    );

    const extractedReport = await extractZapReport(report, scanJobId);
    console.log(extractedReport);

    console.log("===================================================================\n");

    // --- START: Source Code Mapping Logic ---
    if (githubRepoUrl && extractedReport && extractedReport.length > 0) {
      try {
        console.log("[ScanController] Starting repository download and source mapping...");
        const downloader = new RepoDownloader();
        const localRepoPath = await downloader.downloadSourceCode(githubRepoUrl, userId);
        const projectStructure = generateFileTreeForAI(localRepoPath);
        const aiDecisionMaker = DecisionMaker.getInstance();

        // 🎯 Detect Project Language Once
        const projectLanguage = await DetectorService.detectLanguage(localRepoPath);
        console.log(`[ScanController] Detected Project Language: ${projectLanguage}`);

        let savedFilesCount = 0;
        const MAX_SAVED_FILES = 5;

        // 🎯 Sort findings by Severity to ensure the most important 5 files are saved first
        const severityRank = { 'High': 3, 'Medium': 2, 'Low': 1, 'Informational': 0 };
        const sortedReport = [...extractedReport].sort((a, b) => 
          (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0)
        );

        for (let finding of sortedReport) {
          const isHighOrMedium = finding.severity === 'High' || finding.severity === 'Medium';
          
          if (!isHighOrMedium) {
            console.log(`[Mapping] Skipping low-impact alert: ${finding.alertName} (${finding.severity})`);
            continue;
          }

          console.log(`[Mapping] Processing High/Medium Alert: ${finding.alertName}`);
          
          // Cache mappings for this specific alert to avoid redundant AI calls for identical routes
          const findingCache = new Map();

          for (let instance of finding.instances) {
            const routePattern = UrlMapper.getRoutePattern(instance.uri);
            let finalMapping = null;

            if (routePattern && findingCache.has(routePattern)) {
              finalMapping = findingCache.get(routePattern);
              console.log(`   [Mapping Cache] Hit for ${routePattern} -> Reusing: ${finalMapping}`);
            } else {
              // 1. Structural Candidate Discovery (URL-based)
              let candidates = [];
              if (routePattern) {
                console.log(`   [Discovery] Finding structural candidates for pattern: ${routePattern}`);
                candidates = UrlMapper.findFilesWithSemgrep(localRepoPath, routePattern);
              }

              // 2. Semantic Candidate Discovery (Pattern-based)
              console.log(`   [Discovery] Finding semantic candidates for type: ${finding.alertName}`);
              const semanticCandidates = await SemgrepService.findCandidates(
                localRepoPath, 
                { parameter: instance.param || "N/A", type: finding.alertName }, 
                projectLanguage
              );

              // 3. Combine & Deduplicate
              const combinedSet = new Set([...candidates, ...semanticCandidates]);
              const finalCandidates = Array.from(combinedSet);
              console.log(`   [Candidates] Total unique candidates discovered: ${finalCandidates.length}`);
              
              if (finalCandidates.length === 1) {
                finalMapping = finalCandidates[0];
                console.log(`   [Mapped] EXACT: Found singular candidate -> ${finalMapping}`);
              }
              else if (finalCandidates.length > 0) {
                const aiResult = await aiDecisionMaker.identifyInfectedFile(
                  {
                    url: instance.uri,
                    type: finding.alertName,
                    parameter: instance.param || "N/A"
                  },
                  finalCandidates,
                  projectStructure
                );

                if (aiResult && aiResult.selected_file) {
                  finalMapping = aiResult.selected_file;
                  console.log(`✅ Success: AI identified the file!`);
                  console.log(`🎯 Targeted File: ${finalMapping}`);
                  console.log(`📝 Reason: ${aiResult.reasoning}`);
                  console.log(`📊 Confidence: ${(aiResult.confidence_score || 0) * 100}%`);
                } else {
                  console.error(`❌ Failed: AI could not make a clear decision for ${instance.uri}`);
                  if (aiResult) console.error("Full AI Result:", JSON.stringify(aiResult, null, 2));
                }
              }
              
              // Store in cache for subsequent instances of this alert
              if (routePattern) {
                findingCache.set(routePattern, finalMapping);
              }
            }

            // --- Storage Logic for Manual Review ---
            if (finalMapping) {
                instance.source_file_path = finalMapping;
                
                if (savedFilesCount >= MAX_SAVED_FILES) {
                    console.log(`   [Storage] Limit reached (${MAX_SAVED_FILES}). Skipping file copy for: ${path.basename(finalMapping)}`);
                    continue;
                }

                try {
                    const storageDir = path.join(process.cwd(), 'storage', 'original');
                    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

                    const alertClean = finding.alertName.replace(/[^a-z0-9]/gi, '_');
                    const fileName = path.basename(finalMapping);
                    const destPath = path.join(storageDir, `${alertClean}-${fileName}`);
                    
                    if (!fs.existsSync(destPath)) {
                        fs.copyFileSync(finalMapping, destPath);
                        savedFilesCount++;
                        console.log(`   [Storage] Saved copy in: ${destPath} (${savedFilesCount}/${MAX_SAVED_FILES})`);
                    }
                } catch (copyErr) {
                    console.error(`   [Storage] Failed to save copy: ${copyErr.message}`);
                }
            }
          }
        }

        await ScanReport.findOneAndUpdate(
          { scanJob: scanJobId },
          { $set: { findings: extractedReport } }
        );

        // --- START: Automated Full-File Patching Pipeline ---
        try {
          const originalStorageDir = path.join(process.cwd(), 'storage', 'original');
          const patchedStorageDir = path.join(process.cwd(), 'storage', 'patched');

          if (fs.existsSync(originalStorageDir)) {
            const filesToPatch = fs.readdirSync(originalStorageDir).filter(f => f !== '.gitignore');
            
            if (filesToPatch.length > 0) {
              console.log(`\n[ScanController] Initiating patching for ${filesToPatch.length} stored files...`);
              if (!fs.existsSync(patchedStorageDir)) fs.mkdirSync(patchedStorageDir, { recursive: true });

              for (const fileName of filesToPatch) {
                try {
                  const originalPath = path.join(originalStorageDir, fileName);
                  const originalContent = fs.readFileSync(originalPath, 'utf-8');

                  // Call the remediator LLM
                  const patchedContent = await patchFileContent(fileName, originalContent);

                  const patchedPath = path.join(patchedStorageDir, fileName);
                  fs.writeFileSync(patchedPath, patchedContent);
                  console.log(`✅ [Patching] Successfully saved remediated file: ${patchedPath}`);
                  
                  // Rate limit consideration for sequential patching
                  await new Promise(r => setTimeout(r, 2000));
                } catch (filePatchErr) {
                  console.error(`❌ [Patching] Failed to patch ${fileName}:`, filePatchErr.message);
                }
              }
            }
          }
        } catch (patchPipelineErr) {
          console.error("[ScanController] Patching pipeline failed:", patchPipelineErr.message);
        }
        // --- END: Automated Full-File Patching Pipeline ---

      } catch (mappingError) {
        console.error("[ScanController] Mapping process failed:", mappingError.message);
      }
    }
    // --- END: Source Code Mapping Logic ---

    console.log("===================================================================\n");


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
      "Low",
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


      // CODE PATCH
      try {
        console.log("[ScanController] Starting local storage file patching...");
        // This will process all files in storage
        await localPatchService.patchLocalFiles();
      } catch (localErr) {
        console.error(`[ScanController] Local storage patching failed: ${localErr.message}`);
      }

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

export async function testZapAuthentication(req, res) {
  try {
    const { targetUrl, authConfig } = req.body;

    if (!targetUrl || !authConfig || !authConfig.loginUrl) {
      return res.status(400).json({
        success: false,
        message: "Target URL and authentication configuration are required",
      });
    }

    if (!authConfig.username || !authConfig.password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const zapOptions = {
      apiKey: "123",
      proxy: { host: "127.0.0.1", port: 8080 },
    };
    const zap = new ZapClient(zapOptions);

    const result = await testAuthentication(zap, targetUrl, {
      ...authConfig,
      enabled: true,
    });

    return res.json({
      success: result.success,
      message: result.message,
    });
  } catch (err) {
    console.error("[ScanController] testAuthConfig error:", err);
    return res.status(500).json({
      success: false,
      message: `Authentication test failed: ${err.message}`,
    });
  }
}
