import Finding from "../models/FindingModel.js";
import ScanJob from "../models/scanJobModel.js";

export async function extractZapReport(zapReport, scanJobId) {
  if (!zapReport || !zapReport.alerts) {
    throw new Error("Invalid ZAP report format: Missing 'alerts' property");
  }

  const findings = [];

  for (const alert of zapReport.alerts) {
    const instances = {
      uri: alert.url || "",
      method: alert.method || "",
      param: alert.param || "",
      attack: alert.attack || "",
      evidence: alert.evidence || "",
    };

    findings.push({
      scanJob: scanJobId,
      pluginId: alert.pluginId || "0",
      alertName: alert.name || "Unknown Alert",
      severity: alert.risk || "Informational",
      description: alert.description || "",
      solution: alert.solution || "",
      instances,
      cweId: alert.cweid || null,
    });
  }

  const createdFindings = await Finding.insertMany(findings);

  await ScanJob.findByIdAndUpdate(scanJobId, {
    $set: {
      status: "completed",
      finishedAt: Date.now(),
    },
    $push: { findings: { $each: createdFindings.map((f) => f._id) } },
  });

  return createdFindings;
}
