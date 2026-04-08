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
import { testAuthentication } from "../services/zapAuthService.js";
import ZapClient from "zaproxy";

// استدعاء الخدمات الجديدة
import RepoDownloader, { generateFileTreeForAI } from '../services/githubService.js';
import UrlMapper from '../services/UrlMapper.js';
import DecisionMaker from '../services/DecisionMaker.js';
import { generateAndWriteOpenapiYaml } from "../services/openapiService.js";
import { validateOpenapiWithSwaggerCli } from "../services/openapiValidationService.js";
import {
  defaultSchemathesisReportPath,
  runSchemathesisHarReport,
} from "../services/schemathesisService.js";


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
    console.log(
      `[ScanController] GitHub repo URL: ${
        githubRepoUrl && String(githubRepoUrl).trim() !== ""
          ? githubRepoUrl
          : "(none)"
      }`,
    );

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
  let openapiTask = Promise.resolve(null);
  try {
    if (!githubRepoUrl || githubRepoUrl.trim() === "") {
      console.log(
        "[ScanController] No githubRepoUrl provided — skipping repo download + OpenAPI generation.",
      );
    }

    // Kick off repo download + OpenAPI generation in parallel with ZAP scanning.
    // This way, `Openapi.yaml` is produced sooner for later API-testing steps.
    let localRepoPath = null;
    const downloadTask =
      githubRepoUrl && githubRepoUrl.trim() !== ""
        ? (async () => {
            try {
              console.log(
                "[ScanController] Downloading repository for OpenAPI + mapping...",
              );
              const downloader = new RepoDownloader();
              return await downloader.downloadSourceCode(
                githubRepoUrl,
                userId,
              );
            } catch (downloadErr) {
              console.error(
                "[ScanController] Repository download failed:",
                downloadErr.message || downloadErr,
              );
              return null;
            }
          })()
        : Promise.resolve(null);

    // Start OpenAPI generation as soon as the download finishes, but do not
    // block mapping on it.
    openapiTask = downloadTask.then(async (repoPath) => {
      if (!repoPath) return null;
      try {
        const { outputPath } = await generateAndWriteOpenapiYaml({
          repoPath,
          targetUrl: url,
        });

        const validation = validateOpenapiWithSwaggerCli(outputPath);

        await ScanJob.findByIdAndUpdate(scanJobId, {
          $set: {
            openapiFilePath: outputPath,
            openapiValidation: {
              status: validation.ok
                ? "valid"
                : validation.error?.includes("execute swagger-cli")
                  ? "error"
                  : "invalid",
              error: validation.ok ? undefined : validation.error,
              validatedAt: new Date(),
            },
          },
        });

        if (validation.ok) {
          console.log("[ScanController] OpenAPI validation: valid");

          // Kick off Schemathesis API testing (HAR is JSON).
          // This is async and will update the scan record when it finishes.
          const reportPath = defaultSchemathesisReportPath(repoPath);
          await ScanJob.findByIdAndUpdate(scanJobId, {
            $set: {
              schemathesis: {
                status: "running",
                reportPath,
                ranAt: new Date(),
              },
            },
          });

          try {
            const child = runSchemathesisHarReport({
              openapiPath: outputPath,
              baseUrl: url,
              reportPath,
            });

            child.on("exit", async (code) => {
              const ok = code === 0;
              await ScanJob.findByIdAndUpdate(scanJobId, {
                $set: {
                  schemathesis: {
                    status: ok ? "passed" : "failed",
                    reportPath,
                    exitCode: code ?? 1,
                    finishedAt: new Date(),
                  },
                },
              });
            });

            child.on("error", async (err) => {
              await ScanJob.findByIdAndUpdate(scanJobId, {
                $set: {
                  schemathesis: {
                    status: "error",
                    reportPath,
                    exitCode: 1,
                    error: err?.message || String(err),
                    finishedAt: new Date(),
                  },
                },
              });
            });
          } catch (err) {
            await ScanJob.findByIdAndUpdate(scanJobId, {
              $set: {
                schemathesis: {
                  status: "error",
                  reportPath,
                  exitCode: 1,
                  error: err?.message || String(err),
                  finishedAt: new Date(),
                },
              },
            });
          }
        } else {
          console.error(
            "[ScanController] OpenAPI validation failed:",
            validation.error,
          );
        }
      } catch (openapiErr) {
        console.error(
          "[ScanController] OpenAPI generation failed:",
          openapiErr.message || openapiErr,
        );
      }
      return repoPath;
    });

    const skipZap = String(process.env.SKIP_ZAP || "").toLowerCase() === "true";

    let extractedReport = [];
    if (skipZap) {
      console.log(
        "[ScanController] SKIP_ZAP=true — skipping ZAP scan and running OpenAPI-only flow.",
      );
      // Ensure OpenAPI generation has a chance to finish; mapping/patching rely on ZAP findings.
      await openapiTask;

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
        message: "OpenAPI generated (ZAP skipped)",
      });
      return;
    }

    const { report } = await runZapScanService(url, scanJobId, userId, authConfig);

    extractedReport = await extractZapReport(report, scanJobId);
    console.log(extractedReport);

    console.log("===================================================================\n");

    // --- START: Source Code Mapping Logic ---
    localRepoPath = await downloadTask;
    if (
      githubRepoUrl &&
      githubRepoUrl.trim() !== "" &&
      extractedReport &&
      extractedReport.length > 0 &&
      localRepoPath
    ) {
      try {
        const projectStructure = generateFileTreeForAI(localRepoPath);
        const aiDecisionMaker = new DecisionMaker(
          process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
        );

        for (let finding of extractedReport) {
          console.log(
            `[Mapping] Processing Alert Type: ${finding.alertName}`,
          );

          for (let instance of finding.instances) {
            const routePattern = UrlMapper.getRoutePattern(instance.uri);
            const candidates = UrlMapper.findFilesWithSemgrep(
              localRepoPath,
              routePattern,
            );

            if (candidates.length > 0) {
              const aiResult = await aiDecisionMaker.identifyInfectedFile(
                {
                  url: instance.uri,
                  type: finding.alertName,
                  parameter: instance.param || "N/A",
                },
                candidates,
                projectStructure,
              );

              instance.source_file_path = aiResult.selected_file;
              console.log(
                `   [Mapped] URL: ${instance.uri} -> File: ${instance.source_file_path}`,
              );
            }
          }
        }

        await ScanReport.findOneAndUpdate(
          { scanJob: scanJobId },
          { $set: { findings: extractedReport } },
        );
      } catch (mappingError) {
        console.error(
          "[ScanController] Mapping process failed:",
          mappingError.message,
        );
      }
    }
    // --- END: Source Code Mapping Logic ---

    console.log("===================================================================\n");


    console.log("[ScanController] Scan complete. Starting patch generation...");
    generatePatchesInBackground(extractedReport, scanJobId, userId);
  } catch (error) {
    console.error("[ScanController] Background scan error:", error);

    // Even if ZAP fails, we still want the OpenAPI pipeline to finish (if started),
    // so the user can use the generated spec & test reports.
    try {
      await openapiTask;
    } catch (e) {
      console.error(
        "[ScanController] OpenAPI task failed while handling scan error:",
        e?.message || e,
      );
    }

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
