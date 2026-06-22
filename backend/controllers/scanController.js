import ScanJob from "../models/scanJobModel.js";
import ScanReport from "../models/ScanReportModel.js";
import ScanRecommendation from "../models/ScanRecommendationModel.js";
//import queue from "../services/queue.js";
import { validateUrl } from "../utils/validator.js";
import { isHostReachable } from "../utils/network.js";
import {
  validateGitHubToken,
  validateRepo,
} from "../utils/githubValidation.js";
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

import RepoDownloader, {
  generateFileTreeForAI,
} from "../services/githubService.js";
import UrlMapper from "../services/UrlMapper.js";
import DecisionMaker from "../services/DecisionMaker.js";
import { generateAndWriteOpenapiYaml } from "../services/openapiService.js";
import { validateOpenapiWithSwaggerCli } from "../services/openapiValidationService.js";
import {
  defaultSchemathesisReportPath,
  runSchemathesisHarReport,
} from "../services/schemathesisService.js";
import SemgrepService from "../services/smgrepService.js";
import DetectorService from "../services/detectorService.js";
import { runValidationCycle } from "../services/validationOrchestrator.js";
import {
  ensureZapRunning,
  isZapReachable,
} from "../services/zapManagerService.js";
import path from "path";
import fs from "fs";
import { encryptToken } from "../utils/crypto.js";

export async function validateTargetAndRepoURLs(req, res) {
  try {
    const { targetURL, githubRepoUrl, githubToken } = req.body;
    let match;
    let owner;
    let repoName;
    const errors = {};
    let installationId = null; // Needed later to clone the code if needed

    // 1. Validate Target URL
    if (!targetURL || !validateUrl(String(targetURL).trim())) {
      errors.targetUrl =
        "Invalid URL format (must be absolute, e.g., http://... or https://...)";
    } else {
      const check = await isHostReachable(targetURL);
      if (!check.ok) {
        errors.targetUrl = check.reason || "Target is not reachable";
      }
    }

    // 2. Validate Repo URL (if provided)
    if (githubRepoUrl && githubRepoUrl.trim() !== "") {
      const repoCheck = await validateRepo(githubRepoUrl);

      match = githubRepoUrl
        .trim()
        .replace(/\.git$/, "")
        .match(/github\.com\/([^/]+)\/([^/]+)/);
      owner = match[1];
      repoName = match[2];

      if (!repoCheck.valid) {
        errors.githubRepoUrl = repoCheck.message;
      } else {
        if (repoCheck.type === "private") {
          installationId = repoCheck.installationId;
          if (!githubToken || githubToken.trim() === "") {
            errors.githubToken =
              "A GitHub token is required to push patches to private repositories.";
          }
        }

        if (githubToken && githubToken.trim() !== "") {
          const tokenCheck = await validateGitHubToken(
            githubToken,
            owner,
            repoName,
          );

          if (!tokenCheck.valid) {
            errors.githubToken = tokenCheck.message;
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        errors,
        isRepoChecked:
          !errors.githubToken?.includes("'repo' scope") &&
          !errors.githubToken?.includes("push patches")
            ? { owner, repoName, errorType: "NO_PUSH_ACCESS" }
            : undefined,
      });
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
    githubToken,
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

    let encryptedToken = null;
    if (githubToken) {
      encryptedToken = encryptToken(githubToken);
    }

    const scan = await ScanJob.create({
      user: req.session.user._id,
      targetUrl: url,
      githubRepoUrl,
      githubToken: encryptedToken,
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
              return await downloader.downloadSourceCode(githubRepoUrl, userId);
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
        emitScanEvent(scanJobId, "scan:stage", {
          stage: "openapi",
          message: "Generating OpenAPI document...",
        });
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
        emitScanEvent(scanJobId, "scan:stage", {
          stage: "openapi",
          message: `OpenAPI written: ${outputPath}`,
        });
        console.log(`[ScanController] OpenAPI file path: ${outputPath}`);

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
              // Exit 0 = all tests passed
              // Exit 1 = test failures found (e.g. QUERY method compliance) — HAR report is still valid
              // Other  = unexpected error (crash, timeout, missing binary, etc.)
              let status;
              if (code === 0) status = "passed";
              else if (code === 1) status = "issues_found";
              else status = "error";

              await ScanJob.findByIdAndUpdate(scanJobId, {
                $set: {
                  schemathesis: {
                    status,
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
          emitScanEvent(scanJobId, "scan:stage", {
            stage: "openapi",
            message: "OpenAPI validation failed",
          });
        }
      } catch (openapiErr) {
        console.error(
          "[ScanController] OpenAPI generation failed:",
          openapiErr.message || openapiErr,
        );
        emitScanEvent(scanJobId, "scan:error", {
          stage: "openapi",
          message: openapiErr?.message || String(openapiErr),
        });
      }
      return repoPath;
    });

    const skipZapEnv =
      String(process.env.SKIP_ZAP || "").toLowerCase() === "true";
    let zapReachable = await isZapReachable();
    let autoStartedZap = false;
    if (!skipZapEnv && !zapReachable) {
      console.log(
        "[ScanController] ZAP not reachable. Attempting auto-start...",
      );
      emitScanEvent(scanJobId, "scan:stage", {
        stage: "init",
        message: "ZAP not reachable, starting daemon...",
      });
      const startResult = await ensureZapRunning();
      zapReachable = startResult.reachable;
      autoStartedZap = startResult.started && startResult.reachable;
      if (autoStartedZap) {
        console.log("[ScanController] ZAP auto-started and is now reachable.");
        emitScanEvent(scanJobId, "scan:stage", {
          stage: "init",
          message: "ZAP daemon started successfully.",
        });
      }
    }
    const skipZap = skipZapEnv || !zapReachable;

    let extractedReport = [];
    if (skipZap) {
      console.log(
        skipZapEnv
          ? "[ScanController] SKIP_ZAP=true — skipping ZAP scan and running OpenAPI-only flow."
          : "[ScanController] ZAP not reachable on 127.0.0.1:8080 — running OpenAPI-only flow.",
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

    let report;
    try {
      const zapResult = await runZapScanService(
        url,
        scanJobId,
        userId,
        authConfig,
      );
      report = zapResult.report;
    } catch (zapErr) {
      const msg = String(zapErr?.message || zapErr || "");
      const isZapUnavailable =
        msg.includes("ECONNREFUSED") && msg.includes("127.0.0.1:8080");

      if (isZapUnavailable) {
        console.warn(
          "[ScanController] ZAP is unavailable (127.0.0.1:8080). Falling back to OpenAPI-only completion.",
        );
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
          message: "OpenAPI/Schemathesis complete (ZAP unavailable)",
        });
        return;
      }

      throw zapErr;
    }

    extractedReport = await extractZapReport(report, scanJobId);
    console.log(extractedReport);

    console.log(
      "===================================================================\n",
    );

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
        const aiDecisionMaker = DecisionMaker.getInstance();

        // 🎯 Detect Project Language Once
        const projectLanguage =
          await DetectorService.detectLanguage(localRepoPath);
        console.log(
          `[ScanController] Detected Project Language: ${projectLanguage}`,
        );

        // Clear originals from any previous scan so only current-scan files are merged.
        const originalStorageDirEarly = path.join(
          process.cwd(),
          "storage",
          "original",
        );
        if (fs.existsSync(originalStorageDirEarly)) {
          for (const old of fs.readdirSync(originalStorageDirEarly)) {
            if (old !== ".gitignore" && old !== ".gitkeep") {
              try {
                fs.unlinkSync(path.join(originalStorageDirEarly, old));
              } catch {
                /* best effort */
              }
            }
          }
        }

        let savedFilesCount = 0;
        const MAX_SAVED_FILES = 5;

        // 🎯 Sort findings by Severity to ensure the most important 5 files are saved first
        const severityRank = { High: 3, Medium: 2, Low: 1, Informational: 0 };
        const sortedReport = [...extractedReport].sort(
          (a, b) =>
            (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0),
        );

        for (let finding of sortedReport) {
          const isHighOrMedium =
            finding.severity === "High" || finding.severity === "Medium";

          if (!isHighOrMedium) {
            console.log(
              `[Mapping] Skipping low-impact alert: ${finding.alertName} (${finding.severity})`,
            );
            continue;
          }

          console.log(
            `[Mapping] Processing High/Medium Alert: ${finding.alertName}`,
          );

          // Cache mappings for this specific alert to avoid redundant AI calls for identical routes
          const findingCache = new Map();

          for (let instance of finding.instances) {
            const routePattern = UrlMapper.getRoutePattern(instance.uri);
            let finalMapping = null;

            if (routePattern && findingCache.has(routePattern)) {
              finalMapping = findingCache.get(routePattern);
              console.log(
                `   [Mapping Cache] Hit for ${routePattern} -> Reusing: ${finalMapping}`,
              );
            } else {
              // 1. Structural Candidate Discovery (URL-based)
              let candidates = [];
              if (routePattern) {
                console.log(
                  `   [Discovery] Finding structural candidates for pattern: ${routePattern}`,
                );
                candidates = UrlMapper.findFilesWithSemgrep(
                  localRepoPath,
                  routePattern,
                );
              }

              // 2. Semantic Candidate Discovery (Pattern-based)
              console.log(
                `   [Discovery] Finding semantic candidates for type: ${finding.alertName}`,
              );
              const semanticCandidates = await SemgrepService.findCandidates(
                localRepoPath,
                { parameter: instance.param || "N/A", type: finding.alertName },
                projectLanguage,
              );

              // 3. Combine & Deduplicate
              const combinedSet = new Set([
                ...candidates,
                ...semanticCandidates,
              ]);
              const finalCandidates = Array.from(combinedSet);
              console.log(
                `   [Candidates] Total unique candidates discovered: ${finalCandidates.length}`,
              );

              if (finalCandidates.length === 1) {
                finalMapping = finalCandidates[0];
                console.log(
                  `   [Mapped] EXACT: Found singular candidate -> ${finalMapping}`,
                );
              } else if (finalCandidates.length > 0) {
                const aiResult = await aiDecisionMaker.identifyInfectedFile(
                  {
                    url: instance.uri,
                    type: finding.alertName,
                    parameter: instance.param || "N/A",
                  },
                  finalCandidates,
                  projectStructure,
                );

                if (aiResult && aiResult.selected_file) {
                  finalMapping = aiResult.selected_file;
                  console.log(`✅ Success: AI identified the file!`);
                  console.log(`🎯 Targeted File: ${finalMapping}`);
                  console.log(`📝 Reason: ${aiResult.reasoning}`);
                  console.log(
                    `📊 Confidence: ${(aiResult.confidence_score || 0) * 100}%`,
                  );
                } else {
                  console.error(
                    `❌ Failed: AI could not make a clear decision for ${instance.uri}`,
                  );
                  if (aiResult)
                    console.error(
                      "Full AI Result:",
                      JSON.stringify(aiResult, null, 2),
                    );
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
                console.log(
                  `   [Storage] Limit reached (${MAX_SAVED_FILES}). Skipping file copy for: ${path.basename(finalMapping)}`,
                );
                continue;
              }

              try {
                const storageDir = path.join(
                  process.cwd(),
                  "storage",
                  "original",
                );
                if (!fs.existsSync(storageDir))
                  fs.mkdirSync(storageDir, { recursive: true });

                const alertClean = finding.alertName.replace(
                  /[^a-z0-9]/gi,
                  "_",
                );
                const fileName = path.basename(finalMapping);
                const destPath = path.join(
                  storageDir,
                  `${alertClean}-${fileName}`,
                );

                if (!fs.existsSync(destPath)) {
                  fs.copyFileSync(finalMapping, destPath);
                  savedFilesCount++;
                  console.log(
                    `   [Storage] Saved copy in: ${destPath} (${savedFilesCount}/${MAX_SAVED_FILES})`,
                  );
                }
              } catch (copyErr) {
                console.error(
                  `   [Storage] Failed to save copy: ${copyErr.message}`,
                );
              }
            }
          }
        }

        await ScanReport.findOneAndUpdate(
          { scanJob: scanJobId },
          { $set: { findings: extractedReport } },
        );
        // --- START: Merged Full-File Patching Pipeline ---
        // Groups stored originals by base filename, then chain-patches each group
        // through the LLM sequentially so that ONE final merged file is produced
        // per unique target — preventing any later patch from silently overwriting
        // an earlier fix applied to the same file.
        try {
          const originalStorageDir = path.join(
            process.cwd(),
            "storage",
            "original",
          );
          const patchedStorageDir = path.join(
            process.cwd(),
            "storage",
            "patched",
          );

          if (fs.existsSync(originalStorageDir)) {
            const allFiles = fs
              .readdirSync(originalStorageDir)
              .filter(
                (f) =>
                  f !== ".gitignore" &&
                  f !== ".gitkeep" &&
                  fs.statSync(path.join(originalStorageDir, f)).isFile(),
              );

            if (allFiles.length > 0) {
              if (!fs.existsSync(patchedStorageDir))
                fs.mkdirSync(patchedStorageDir, { recursive: true });

              // Clear stale patches from previous scans before writing new ones.
              for (const stale of fs.readdirSync(patchedStorageDir)) {
                if (stale !== ".gitignore" && stale !== ".gitkeep") {
                  try {
                    fs.unlinkSync(path.join(patchedStorageDir, stale));
                  } catch {
                    /* best effort */
                  }
                }
              }

              // Group stored files by their base filename (strip alert prefix).
              // e.g. "CSP_Header_Not_Set-app.js" and "Anti_clickjacking-app.js"
              // both belong to the group keyed by "app.js".
              const fileGroups = new Map(); // baseName → [fileName, ...]
              for (const fileName of allFiles) {
                const dashIndex = fileName.indexOf("-");
                if (dashIndex === -1) continue;
                const baseName = fileName.slice(dashIndex + 1);
                if (!fileGroups.has(baseName)) fileGroups.set(baseName, []);
                fileGroups.get(baseName).push(fileName);
              }

              console.log(
                `\n[PatchPlanner] Current scan findings loaded: ${allFiles.length}`,
              );
              console.log(`[PatchPlanner] Current scan ID: ${scanJobId}`);
              console.log(
                `[PatchPlanner] Target files identified: ${fileGroups.size}`,
              );
              console.log(
                `[ScanController] Initiating patching for ${fileGroups.size} unique target files...`,
              );

              for (const [baseName, files] of fileGroups) {
                if (files.length > 1) {
                  console.log(
                    `[PatchPlanner] Multiple findings target ${baseName}:`,
                  );
                  files.forEach((f) => console.log(`   - ${f}`));
                  console.log(
                    `[PatchPlanner] Generating one merged patch for ${baseName}`,
                  );
                }

                try {
                  // All files in a group are copies of the same source — use the first.
                  const firstFilePath = path.join(originalStorageDir, files[0]);
                  let currentContent = fs.readFileSync(firstFilePath, "utf-8");

                  // Chain: each LLM call receives the output of the previous call,
                  // so every finding's fix is layered on top of all prior fixes.
                  for (const fileName of files) {
                    currentContent = await patchFileContent(
                      fileName,
                      currentContent,
                    );
                    if (files.length > 1) {
                      await new Promise((r) => setTimeout(r, 2000));
                    }
                  }

                  // Save ONE merged patched file per unique target.
                  // The "merged-" prefix gives it highest priority in patchApplicatorService.
                  const ext = path.extname(baseName);
                  const base = path.basename(baseName, ext);
                  const mergedFileName = `merged-${base}Patched${ext}`;
                  const outputPath = path.join(
                    patchedStorageDir,
                    mergedFileName,
                  );
                  fs.writeFileSync(outputPath, currentContent);
                  console.log(
                    `✅ [Patching] Successfully saved remediated file: ${outputPath}`,
                  );
                } catch (filePatchErr) {
                  console.error(
                    `❌ [Patching] Failed to patch ${baseName}:`,
                    filePatchErr.message,
                  );
                }
              }
            }
          }
        } catch (patchPipelineErr) {
          console.error(
            "[ScanController] Patching pipeline failed:",
            patchPipelineErr.message,
          );
        }
        // --- END: Merged Full-File Patching Pipeline ---
      } catch (mappingError) {
        console.error(
          "[ScanController] Mapping process failed:",
          mappingError.message,
        );
      }
    }
    // --- END: Source Code Mapping Logic ---

    console.log(
      "===================================================================\n",
    );

    console.log("[ScanController] Scan complete. Starting patch generation...");

    // Collect paths needed by validation cycle
    const openapiFilePath =
      (await ScanJob.findById(scanJobId).lean())?.openapiFilePath || null;
    const beforeHarPath =
      (await ScanJob.findById(scanJobId).lean())?.schemathesis?.reportPath ||
      null;

    generatePatchesInBackground(
      extractedReport,
      scanJobId,
      userId,
      localRepoPath,
      openapiFilePath,
      beforeHarPath,
      url,
    );
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

async function generatePatchesInBackground(
  findings,
  scanJobId,
  userId,
  repoPath = null,
  openapiPath = null,
  beforeHarPath = null,
  targetUrl = null,
) {
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

      // ── VALIDATION CYCLE ──────────────────────────────────────────
      // After patching, run the full validation cycle if we have a repo
      let validationResult = null;
      if (repoPath) {
        try {
          await ScanJob.findByIdAndUpdate(scanJobId, {
            $set: {
              status: "validating",
              validation: { status: "running", startedAt: new Date() },
            },
          });
          broadcastToUser(userId, "scan:status", {
            scanJobId: scanJobId.toString(),
            status: "validating",
          });
          emitScanEvent(scanJobId, "scan:stage", {
            stage: "validating",
            message: "Running validation cycle on patched application…",
          });

          // Retrieve the latest findings with source_file_path populated
          const scanReport = await ScanReport.findOne({
            scanJob: scanJobId,
          }).lean();
          const enrichedFindings = scanReport?.findings || findings;

          validationResult = await runValidationCycle({
            repoPath,
            scanJobId,
            userId,
            targetUrl:
              targetUrl ||
              (await ScanJob.findById(scanJobId).lean())?.targetUrl,
            findings: enrichedFindings,
            openapiPath,
            beforeHarPath,
          });

          await ScanJob.findByIdAndUpdate(scanJobId, {
            $set: {
              validation: {
                status: "completed",
                report: validationResult,
                startedAt: validationResult.timestamp,
                finishedAt: new Date(),
              },
            },
          });

          console.log(
            `[ScanController] Validation cycle completed: ${validationResult.verdict}`,
          );
        } catch (validationErr) {
          console.error(
            `[ScanController] Validation cycle failed: ${validationErr.message}`,
          );
          await ScanJob.findByIdAndUpdate(scanJobId, {
            $set: {
              validation: {
                status: "failed",
                report: { error: validationErr.message },
                finishedAt: new Date(),
              },
            },
          });
        }
      }
      // ── END VALIDATION CYCLE ──────────────────────────────────────

      await ScanJob.findByIdAndUpdate(scanJobId, {
        $set: { status: "completed", finishedAt: Date.now() },
      });
      broadcastToUser(userId, "scan:status", {
        scanJobId: scanJobId.toString(),
        status: "completed",
      });

      const validationVerdict = validationResult
        ? ` | Validation: ${validationResult.verdict}`
        : "";
      emitScanEvent(scanJobId, "scan:complete", {
        stage: "done",
        successCount,
        total,
        validationVerdict: validationResult?.verdict || null,
        message: `Scan complete — ${successCount}/${total} patches generated${validationVerdict}`,
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
