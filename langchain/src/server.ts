import express from "express";
import cors from "cors";
import { PatchGenerator } from "./services/PatchGenerator";
import { ZapFindingAdapter } from "./adapters/ZapFindingAdapter";
import { logger } from "../logging/logger";
import type { ZapFinding } from "./types";

const app = express();
const PORT = 3001;


app.use(cors());
app.use(express.json({ limit: "10mb" }));


const generator = new PatchGenerator();
logger.info("PatchGenerator initialized");


app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "langchain-patch-generator" });
});


app.post("/generate-patches", async (req, res) => {
    try {
        const { findings, minRiskLevel = "Medium", context = null } = req.body;

        if (!findings || !Array.isArray(findings) || findings.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Invalid request: findings must be a non-empty array",
            });
        }

        logger.info(`[LangChain API] Received ${findings.length} finding(s)`);


        const vulnerabilities = ZapFindingAdapter.convertAndFilter(
            findings as ZapFinding[],
            minRiskLevel as "High" | "Medium" | "Low"
        );

        logger.info(`[LangChain API] Processing ${vulnerabilities.length} vulnerability(ies) after filtering`);

        if (vulnerabilities.length === 0) {
            return res.json({
                success: true,
                patches: [],
                message: `No vulnerabilities found with risk level >= ${minRiskLevel}`,
            });
        }

        const startTime = Date.now();
        console.log(`\nStarting patch generation for ${vulnerabilities.length} vulnerabilities...`);
        console.log(`   Estimated time: ${vulnerabilities.length} - ${vulnerabilities.length * 2} minutes\n`);


        const results = await generator.generatePatches(vulnerabilities, context, (current, total, name) => {
            console.log(`[LangChain API] Processing ${current}/${total}: ${name}`);
        });


        const patches = results.map((result, index) => {
            const vulnerability = vulnerabilities[index];

            if (result.success) {
                return {
                    vulnerability,
                    success: true as const,
                    patch: result.data
                };
            }


            const errorResult = result as { success: false; error: string };
            return {
                vulnerability,
                success: false as const,
                error: errorResult.error
            };
        });

        const successCount = patches.filter(p => p.success).length;
        const endTime = Date.now();
        const totalTimeSeconds = ((endTime - startTime) / 1000).toFixed(1);
        logger.info(`[LangChain API] Generated ${successCount} patches successfully in ${totalTimeSeconds} seconds`);


        console.log("\n" + "=".repeat(80));
        console.log("AI-GENERATED PATCHES (LangChain Server)");
        console.log("=".repeat(80));

        let patchNum = 0;
        for (const patchData of patches) {
            if (patchData.success && 'patch' in patchData) {
                patchNum++;
                console.log(`\n[${patchNum}] ${patchData.vulnerability.alert_name}`);
                console.log(`   Risk: ${patchData.vulnerability.risk_level}`);
                console.log("-".repeat(60));
                console.log(`   REASONING:\n   ${patchData.patch.reasoning}`);
                console.log(`\n   VULNERABLE CODE EXAMPLE:\n   ${patchData.patch.vulnerable_code_example}`);
                console.log(`\n   ANALYSIS:\n   ${patchData.patch.analysis}`);
                console.log(`\n   ROOT CAUSE:\n   ${patchData.patch.root_cause}`);
                console.log(`\n   FILE TYPE: ${patchData.patch.file_type}`);
                console.log(`\n   SUGGESTED FIX:\n   ${patchData.patch.suggested_fix}`);
                console.log("-".repeat(60));
            } else if (!patchData.success) {
                console.log(`\nFAILED: ${patchData.vulnerability.alert_name}`);
                console.log(`   Error: ${patchData.error}`);
            }
        }

        console.log("\n" + "=".repeat(80));
        console.log(`${successCount}/${patches.length} patches generated`);
        console.log("=".repeat(80) + "\n");

        res.json({
            success: true,
            patches,
            totalFindings: findings.length,
            processedCount: vulnerabilities.length,
        });

    } catch (error) {
        logger.error("[LangChain API] Error generating patches", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});


app.post("/generate-patch", async (req, res) => {
    try {
        const finding = req.body;

        if (!finding || !finding.alertName) {
            return res.status(400).json({
                success: false,
                error: "Invalid request: must provide a valid ZAP finding",
            });
        }

        logger.info(`[LangChain API] Processing single finding: ${finding.alertName}`);


        const vulnerability = ZapFindingAdapter.convert(finding as ZapFinding);


        const patch = await generator.generatePatch(vulnerability);

        logger.info(`[LangChain API] Patch generated for: ${finding.alertName}`);

        res.json({
            success: true,
            vulnerability,
            patch,
        });

    } catch (error) {
        logger.error("[LangChain API] Error generating patch", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});


app.listen(PORT, () => {
    logger.info(`[LangChain API] Server running on http://localhost:${PORT}`);
    console.log(`\nLangChain Patch Generator API`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Generate Patches: POST http://localhost:${PORT}/generate-patches`);
    console.log(`   Generate Single: POST http://localhost:${PORT}/generate-patch\n`);
});
