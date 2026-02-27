import "dotenv/config.js";
import axios from "axios";

const LANGCHAIN_API_URL = process.env.LANGCHAIN_API_URL;

/**
 * Generate patches for ZAP findings using the LangChain API
 *
 * @param {Array} findings - Array of findings from the extractor
 * @param {string} minRiskLevel - Minimum risk level to process ("High", "Medium", "Low")
 * @param {Object} context - User-provided context (db, lang, fw, os, scm, ws, branch)
 * @returns {Promise<Object>} - Patch generation results
 */
export async function generatePatchesForFindings(
  findings,
  minRiskLevel = "Medium",
  context = null,
) {
  try {
    console.log(
      `[PatchService] Sending ${findings.length} findings to LangChain API`,
    );

    const response = await axios.post(
      `${LANGCHAIN_API_URL}/generate-patches`,
      {
        findings,
        minRiskLevel,
        context,
      },
      {
        timeout: 1800000, // 30 minutes timeout
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    console.log(
      `[PatchService] Received ${response.data.patches?.length || 0} patches`,
    );
    return response.data;
  } catch (error) {
    console.error("[PatchService] Error calling LangChain API:", error.message);

    if (error.code === "ECONNREFUSED") {
      throw new Error(
        "LangChain API is not running. Start it with: cd langchain && npm run server",
      );
    }

    throw error;
  }
}

/**
 * Generate patch for a single finding
 *
 * @param {Object} finding - Single finding from the extractor
 * @returns {Promise<Object>} - Patch generation result
 */
export async function generatePatchForFinding(finding) {
  try {
    console.log(`[PatchService] Generating patch for: ${finding.alertName}`);

    const response = await axios.post(
      `${LANGCHAIN_API_URL}/generate-patch`,
      finding,
      {
        timeout: 900000, // 15 minutes timeout
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error("[PatchService] Error calling LangChain API:", error.message);
    throw error;
  }
}

/**
 * Check if the LangChain API is running
 *
 * @returns {Promise<boolean>}
 */
export async function isLangChainApiHealthy() {
  try {
    const response = await axios.get(`${LANGCHAIN_API_URL}/health`, {
      timeout: 5000,
    });
    return response.data.status === "ok";
  } catch {
    return false;
  }
}
