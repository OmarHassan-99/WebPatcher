import "dotenv/config.js";
import axios from "axios";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = path.resolve(__dirname, "../../storage");
const ORIGINAL_DIR = path.join(STORAGE_ROOT, "original");
const PATCHED_DIR = path.join(STORAGE_ROOT, "patched");
const LANGCHAIN_API_URL = process.env.LANGCHAIN_API_URL || "http://localhost:3001";

/**
 * Service for local file patching using LLM
 */
export const localPatchService = {
  /**
   * Patch all files in the storage folder or a specific list of files
   * @param {string[]} targetFiles - Optional array of specific filenames to patch
   */
  async patchLocalFiles(targetFiles = null) {
    try {
      // Ensure directories exist
      fs.ensureDirSync(ORIGINAL_DIR);
      fs.ensureDirSync(PATCHED_DIR);

      // Get files to process from ORIGINAL_DIR
      let filesToProcess = [];
      if (targetFiles && Array.isArray(targetFiles)) {
        filesToProcess = targetFiles;
      } else {
        filesToProcess = await fs.readdir(ORIGINAL_DIR);
        // Filter out non-files and .gitkeep
        filesToProcess = filesToProcess.filter(file => 
          fs.statSync(path.join(ORIGINAL_DIR, file)).isFile() &&
          file !== ".gitkeep"
        );
      }

      const results = {
        mode: "local-storage",
        patchedFiles: [],
        summary: {
          totalFiles: filesToProcess.length,
          modified: 0,
          unchanged: 0
        }
      };

      for (const fileName of filesToProcess) {
        const filePath = path.join(ORIGINAL_DIR, fileName);
        if (!fs.existsSync(filePath)) {
          console.error(`[ERROR] File not found in original folder: ${fileName}`);
          continue;
        }

        const stats = await this.processFile(fileName, filePath);
        results.patchedFiles.push(stats);
        
        if (stats.status === "modified") {
          results.summary.modified++;
        } else {
          results.summary.unchanged++;
        }
      }

      return results;
    } catch (error) {
      console.error("[LocalPatchService] Error in pipeline:", error.message);
      throw error;
    }
  },

  /**
   * Process a single file
   */
  async processFile(fileName, filePath) {
    console.log(`\nProcessing file: ${fileName}`);

    const originalContent = await fs.readFile(filePath, "utf-8");
    const originalLines = originalContent.split("\n");

    try {
      // 1. Send to LangChain for patching
      const response = await axios.post(`${LANGCHAIN_API_URL}/patch-file`, {
        fileName,
        content: originalContent
      }, { timeout: 300000 }); // 5 minutes timeout

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || "Failed to get response from LangChain");
      }

      const patchedContent = response.data.patchedContent;
      const patchedLines = patchedContent.split("\n");

      // 2. Compare and calculate changes
      const isIdentical = originalContent.trim() === patchedContent.trim();
      const changesCount = this.calculateChanges(originalLines, patchedLines);

      let status = "unchanged";
      let outputFile = null;

      if (isIdentical || changesCount === 0) {
        // No changes needed
      } else {
        status = "modified";
        // 3. Save patched version in PATCHED_DIR
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        outputFile = `${base}Patched${ext}`;
        const outputPath = path.join(PATCHED_DIR, outputFile);
        
        await fs.writeFile(outputPath, patchedContent);

        console.log(`[STATUS] SUCCESS for ${fileName} -> ${outputFile} (${changesCount} changes)`);
      }

      return {
        fileName,
        status,
        changes: changesCount,
        outputFile
      };

    } catch (error) {
      console.error(`[STATUS] FAILED for ${fileName}: ${error.message}`);
      return {
        fileName,
        status: "error",
        error: error.message
      };
    }
  },

  /**
   * Basic line-by-line diff counter
   */
  calculateChanges(originalLines, patchedLines) {
    let changes = 0;
    const maxLines = Math.max(originalLines.length, patchedLines.length);
    for (let i = 0; i < maxLines; i++) {
        if (originalLines[i] !== patchedLines[i]) {
            changes++;
        }
    }
    return changes;
  }
};
