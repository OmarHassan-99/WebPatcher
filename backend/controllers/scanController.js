import ScanJob from "../models/scanJobModel.js";
import Finding from "../models/FindingModel.js";
//import queue from "../services/queue.js";
import { validateUrl } from "../utils/validator.js";


export async function startScan(req, res) {
  try {
    const { targetUrl, context = {} } = req.body;
    if (!targetUrl || !validateUrl(targetUrl)) {
      return res.status(400).json({ success:false , message: "Invalid targetUrl" });
    }
    
    const scan = await ScanJob.create({
      user: req.session.user._id,
      targetUrl,
      context,
    });

    // enqueue the job (worker will pick it up)
    await queue.add("scan", { scanId: scan._id });

    return res.status(201).json({ scanId: scan._id, status: scan.status , success:true });
  } catch (err) {
    console.error("startScan error:", err);
    return res.status(500).json({  success:false , message: "Failed to start scan" });
  }
}

export async function listScans(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const size = Math.min(50, parseInt(req.query.size) || 20);
    const filter = { user:req.session.user._id};

    if (req.query.status) filter.status = req.query.status;

    const scans = await ScanJob.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * size)
      .limit(size)
      .lean();

    const total = await ScanJob.countDocuments(filter);
    return res.json({ total, page, size, scans,success:true });
  } catch (err) {
    console.error("listScans error:", err);
    return res.status(500).json({  success:false ,message: "Failed to list scans" });
  }
}

export async function getScan(req, res) {
  try {
    const { scanId } = req.params;
    const scan = await ScanJob.findById(scanId).lean();
    if (!scan) return res.status(404).json({  success:false , message: "Scan not found" });
    if (String(scan.user) !== String(req.user._id))
      return res.status(403).json({  success:false , message: "Forbidden" });

    // compute findingsCount quickly
    const findingsCount = Array.isArray(scan.findings) ? scan.findings.length : 0;

    return res.json({
      scanId: scan._id,
      targetUrl: scan.targetUrl,
      status: scan.status,
      zapScanId: scan.zapScanId || null,
      startedAt: scan.startedAt,
      finishedAt: scan.finishedAt,
      findingsCount,
      success:true
    });
  } catch (err) {
    console.error("getScan error:", err);
    return res.status(500).json({  success:false , message: "Failed to get scan" });
  }
}

export async function getFindings(req, res) {
  try {
    const { scanId } = req.params;
    // ensure user owns scan
    const scan = await ScanJob.findById(scanId).lean();
    if (!scan) return res.status(404).json({ error: "Scan not found" });
    if (String(scan.user) !== String(req.user._id))
      return res.status(403).json({  success:false , message: "Forbidden" });

    // fetch findings in a lightweight form (not raw)
    const findings = await Finding.find({ scanJob: scanId })
      .select("alertName severity cweId description probableFilePaths createdAt")
      .sort({ severity: -1, createdAt: -1 })
      .lean();

    return res.json({ scanId, findings });
  } catch (err) {
    console.error("getFindings error:", err);
    return res.status(500).json({  success:false , message: "Failed to fetch findings" });
  }
}

