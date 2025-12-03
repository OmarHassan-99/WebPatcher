import ScanJob from "../models/scanJobModel.js";
import Finding from "../models/FindingModel.js";
//import queue from "../services/queue.js";
import { validateUrl } from "../utils/validator.js";
import { isHostReachable } from "../utils/network.js";
import { runZapScanService } from "../services/zapService.js";
import { extractZapReport } from "../services/extractor.js";

export async function validateTargetURL(req, res) {
  try {
    const { targetURL } = req.body;
    if (!targetURL || !validateUrl(String(targetURL).trim())) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid URL. Must be a valid public absolute URL (e.g. https://example.com or http://localhost)",
      });
    }

    const check = await isHostReachable(targetURL);
    if (!check.ok) {
      return res.status(400).json({
        success: false,
        message:
          check.reason ||
          "Target is not reachable (timeout or connection refused)",
      });
    }

    return res.json({ success: true, valid: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to validate target URL",
    });
  }
}

export async function startZapScan(req, res) {
  const { url, targetName } = req.body;

  try {
    console.log(`[ScanController] Received request to scan URL: ${url}`);
    const scan = await ScanJob.create({
      user: req.session.user._id,
      targetUrl: url,
      targetName,
    });

    const { report } = await runZapScanService(url, scan._id);

    // Uncomment lama n3mel el queue
    // if (queue && typeof queue.add === "function") {
    //   await queue.add("scan", { scanId: scan._id });
    // }

    const extractedReport = await extractZapReport(report, scan._id);

    console.log("[ScanController] Scan complete. Sending report to user");
    res.status(200).json(extractedReport);
  } catch (error) {
    console.error("[ScanController] An error occurred:", error);
    res.status(500).json({ message: "Failed to complete the scan" });
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

export async function getScan(req, res) {
  try {
    const { scanId } = req.params;
    const scan = await ScanJob.findById(scanId).lean();
    if (!scan)
      return res
        .status(404)
        .json({ success: false, message: "Scan not found" });
    if (String(scan.user) !== String(req.session.user._id))
      return res.status(403).json({ success: false, message: "Forbidden" });

    const findingsCount = Array.isArray(scan.findings)
      ? scan.findings.length
      : 0;

    return res.json({
      scanId: scan._id,
      targetUrl: scan.targetUrl,
      status: scan.status,
      zapScanId: scan.zapScanId || null,
      startedAt: scan.startedAt,
      finishedAt: scan.finishedAt,
      findingsCount,
      success: true,
    });
  } catch (err) {
    console.error("getScan error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get scan" });
  }
}

export async function getFindings(req, res) {
  try {
    const { scanId } = req.params;
    const scan = await ScanJob.findById(scanId).lean();
    if (!scan)
      return res
        .status(404)
        .json({ success: false, message: "Scan not found" });
    if (String(scan.user) !== String(req.session.user._id))
      return res.status(403).json({ success: false, message: "Forbidden" });
    const findings = await Finding.find({ scanJob: scanId })
      .select(
        "alertName severity cweId description probableFilePaths createdAt"
      )
      .sort({ severity: -1, createdAt: -1 })
      .lean();

    return res.json({ scanId, findings });
  } catch (err) {
    console.error("getFindings error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch findings" });
  }
}
