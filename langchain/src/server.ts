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
        logger.info(`[LangChain API] Generated ${successCount} patches successfully`);



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


const server = app.listen(PORT, () => {
    logger.info(`[LangChain API] Server running on http://localhost:${PORT}`);
    console.log(`\nLangChain Patch Generator API`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Generate Patches: POST http://localhost:${PORT}/generate-patches`);
    console.log(`   Generate Single: POST http://localhost:${PORT}/generate-patch\n`);
});

server.setTimeout(1800000); // 30 minutes timeout
