import zapService from '../services/zapService.js';
import extractor from '../services/extractor.js';
import mappingService from '../services/mappingService.js';
import path from 'path';

async function runMasterFlowTest() {
    console.log("🚀 Starting Master End-to-End Test...");

    const repoUrl = "https://github.com/Abdelrahman/vulnerable-node-app"; // ريبو تجريبي
    const zapReportPath = path.resolve('./reports/sample_zap_report.json');

    try {

        const { report } = await zapService.runZapScanService(url, "dummyScanJobId");

        // الخطوة 2: تحليل ريبورت ZAP
        console.log("\nStep 2: Parsing ZAP Report...");
        const alerts = await extractor.extractZapReport(report, "dummyScanJobId");
        const targetAlert = alerts.find(a => a.type === 'SQL Injection');
        console.log(`✅ Target Alert Found: ${targetAlert.parameter} on ${targetAlert.url}`);

        // الخطوة 3: عملية الـ Mapping (الربط الذكي)
        console.log("\nStep 3: Mapping URL to Source Code...");
        const location = await mappingService.mapAlertToCode(projectPath, targetAlert);

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
}

runMasterFlowTest();