import ScanReport from "../models/ScanReportModel.js";
import ScanJob from "../models/scanJobModel.js";

export async function extractZapReport(zapReport, scanJobId) {
  if (!zapReport || !zapReport.alerts) {
    throw new Error("Invalid ZAP report format: Missing 'alerts' property");
  }

  // Group alerts by pluginId so we create ONE finding per alert type,
  // with all affected URLs collected into its instances array.
  const alertMap = new Map();

  for (const alert of zapReport.alerts) {
    const pluginId = alert.pluginId || "0";

    const instance = {
      uri: alert.url || "",
      method: alert.method || "",
      param: alert.param || "",
      attack: alert.attack || "",
      evidence: alert.evidence || "",
    };

    if (alertMap.has(pluginId)) {
      alertMap.get(pluginId).instances.push(instance);
    } else {
      alertMap.set(pluginId, {
        pluginId,
        alertName: alert.name || "Unknown Alert",
        severity: alert.risk || "Informational",
        description: alert.description || "",
        solution: alert.solution || "",
        instances: [instance],
        cweId: alert.cweid || null,
      });
    }
  }

  const findings = Array.from(alertMap.values());

  const scanReport = await ScanReport.create({
    scanJob: scanJobId,
    findings,
  });

  await ScanJob.findByIdAndUpdate(scanJobId, {
    $set: { findingsCount: findings.length },
  });

  return scanReport.findings;
}
