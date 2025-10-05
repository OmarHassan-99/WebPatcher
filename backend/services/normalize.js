// backend/services/normalizationService.js
const Finding = require('../models/FindingModel').default;
const ScanJob = require('../models/scanJobModel').default;

/**
 * Normalizes a ZAP JSON report into structured Finding documents
 * @param {Object} zapReport - The raw JSON report from ZAP
 * @param {String} scanJobId - The ID of the scan job this report belongs to
 * @returns {Array} Array of created Finding documents
 */
async function normalizeZapReport(zapReport, scanJobId) {
    if (!zapReport || !zapReport.site) {
        throw new Error('Invalid ZAP report format');
    }

    const findings = [];

    for (const site of zapReport.site) {
        for (const alert of site.alerts) {
            const instances = alert.instances?.map(inst => ({
                uri: inst.uri || '',
                method: inst.method || '',
                param: inst.param || '',
                evidence: inst.evidence || ''
            })) || [];

            findings.push({
                scanJob: scanJobId,
                alertName: alert.name || 'Unknown Alert',
                description: alert.desc || '',
                risk: alert.riskdesc || 'Info',
                solution: alert.solution || '',
                cweId: alert.cweid || null,
                instances,
                url: site.name || ''
            });
        }
    }

    // Save all findings in bulk
    const createdFindings = await Finding.insertMany(findings);

    // Update scan job with references
    await ScanJob.findByIdAndUpdate(scanJobId, {
        $set: { status: 'completed' },
        $push: { findings: { $each: createdFindings.map(f => f._id) } }
    });

    return createdFindings;
}

module.exports = { normalizeZapReport };
