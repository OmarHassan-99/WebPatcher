import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = path.resolve(__dirname, '../storage');
const ORIGINAL_DIR = path.join(STORAGE_ROOT, 'original');
const PATCHED_DIR = path.join(STORAGE_ROOT, 'patched');
const BACKUP_DIR = path.join(STORAGE_ROOT, 'backup');

/**
 * Maps a patched filename (e.g. "Cross_Site_Scripting__Reflected_-app.js")
 * back to the original file path in the cloned repo using the findings metadata.
 *
 * The scan controller stores `instance.source_file_path` when mapping succeeds.
 * The stored file in storage/original is named: `{AlertClean}-{basename}`.
 * The patched file in storage/patched is named: `{AlertClean}-{basename}Patched{ext}`
 * or sometimes just         `{AlertClean}-{basename}`.
 *
 * @param {string}  patchedFileName - The filename inside storage/patched
 * @param {Array}   findings        - extractedReport with source_file_path on instances
 * @returns {string|null} Absolute path inside the cloned repo, or null
 */
function resolveRepoPath(patchedFileName, findings) {
  // Normalise the patched file name:
  //   "Cross_Site_Scripting__Reflected_-app.js"
  //   or "Cross_Site_Scripting__Reflected_-appPatched.js"
  // Strip the "Patched" suffix that localPatchService appends:
  const unpatched = patchedFileName.replace(/Patched(\.[^.]+)$/, '$1');

  // Look through findings for a matching stored file / source_file_path
  for (const finding of findings || []) {
    const alertClean = (finding.alertName || '').replace(/[^a-z0-9]/gi, '_');

    for (const instance of finding.instances || []) {
      if (!instance.source_file_path) continue;

      const basename = path.basename(instance.source_file_path);
      const expectedStorageName = `${alertClean}-${basename}`;

      if (unpatched === expectedStorageName) {
        return instance.source_file_path; // absolute path inside cloned repo
      }
    }
  }

  return null;
}

/**
 * Try to resolve the repo-relative target by scanning the repo for a file
 * that matches the base name extracted from the patched filename.
 * This is a fallback when findings metadata is incomplete.
 */
function resolveByFileScan(patchedFileName, repoPath) {
  // Extract the original filename after the alert prefix:
  //   "Alert_Name-filename.ext"  →  "filename.ext"
  const dashIndex = patchedFileName.indexOf('-');
  if (dashIndex === -1) return null;

  let baseName = patchedFileName.slice(dashIndex + 1);
  // Strip Patched suffix
  baseName = baseName.replace(/Patched(\.[^.]+)$/, '$1');

  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'vendor', '.venv', 'coverage']);

  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP.has(entry.name)) continue;
        const found = walk(path.join(dir, entry.name));
        if (found) return found;
      } else if (entry.isFile() && entry.name === baseName) {
        return path.join(dir, entry.name);
      }
    }
    return null;
  }

  return walk(repoPath);
}

function normalizePatchedBaseName(patchedFileName) {
  return patchedFileName.replace(/Patched(\.[^.]+)$/, '$1');
}

function preferPatchedVariant(files) {
  const grouped = new Map();

  for (const file of files) {
    const key = normalizePatchedBaseName(file);
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, file);
      continue;
    }

    const currentIsPreferred = /Patched(\.[^.]+)$/.test(file);
    const existingIsPreferred = /Patched(\.[^.]+)$/.test(existing);

    if (currentIsPreferred && !existingIsPreferred) {
      grouped.set(key, file);
    }
  }

  return Array.from(grouped.values());
}

/**
 * Priority score for a patched filename.
 * Higher value = preferred when multiple patches resolve to the same target.
 *   3 — merged- prefix (explicitly merged multi-finding patch)
 *   2 — Patched suffix (LLM-generated variant)
 *   1 — plain copy (early-pipeline output without suffix)
 */
function patchPriority(fileName) {
  if (fileName.startsWith('merged-')) return 3;
  if (/Patched(\.[^.]+)$/.test(fileName)) return 2;
  return 1;
}

/**
 * Apply all patched files back into the cloned repository.
 *
 * @param {Object} opts
 * @param {string} opts.repoPath   - Absolute path to the cloned repo
 * @param {string} [opts.patchedDir] - Directory containing patched files (defaults to storage/patched)
 * @param {string} [opts.originalDir] - Directory containing originals (defaults to storage/original)
 * @param {Array}  [opts.findings]   - Extracted report with source_file_path on instances
 * @returns {Promise<Object>} Result summary
 */
export async function applyPatchesToRepo({
  repoPath,
  patchedDir = PATCHED_DIR,
  originalDir = ORIGINAL_DIR,
  findings = [],
}) {
  const result = {
    success: false,
    applied: [],
    failed: [],
    skipped: [],
    backedUp: [],
  };

  try {
    if (!repoPath || !fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    fs.ensureDirSync(BACKUP_DIR);

    if (!fs.existsSync(patchedDir)) {
      console.warn('[PatchApplicator] Patched directory does not exist — nothing to apply.');
      result.success = true;
      return result;
    }

    const rawPatchedFiles = (await fs.readdir(patchedDir)).filter(f => {
      try { return fs.statSync(path.join(patchedDir, f)).isFile() && f !== '.gitkeep'; } catch { return false; }
    });

    if (rawPatchedFiles.length === 0) {
      console.log('[PatchApplicator] No patched files found.');
      result.success = true;
      return result;
    }

    const patchedFiles = preferPatchedVariant(rawPatchedFiles);

    console.log(`[PatchApplicator] Applying current-scan patches only`);
    console.log(
      `[PatchApplicator] Found ${rawPatchedFiles.length} patched file(s); applying ${patchedFiles.length} deduplicated target file(s).`,
    );

    // ── Phase 1: Pre-resolve all target paths, deduplicate by resolved repo path ──
    // When multiple patched files map to the same target (e.g. two vuln-specific
    // patches both targeting app.js), keep only the highest-priority one so that
    // the second application never silently overwrites the first.
    const targetPathMap = new Map(); // resolvedTargetPath → { patchedFile, targetPath, priority }
    const resolvedRepo = path.resolve(repoPath);

    for (const patchedFile of patchedFiles) {
      let targetPath = resolveRepoPath(patchedFile, findings);
      if (!targetPath) targetPath = resolveByFileScan(patchedFile, repoPath);

      if (!targetPath) {
        console.warn(`[PatchApplicator] Could not resolve repo path for: ${patchedFile} — skipping.`);
        result.skipped.push({ file: patchedFile, reason: 'Could not resolve target path in repo' });
        continue;
      }

      const resolvedTarget = path.resolve(targetPath);
      if (!resolvedTarget.startsWith(resolvedRepo)) {
        console.warn(`[PatchApplicator] Path traversal guard: ${resolvedTarget} is outside ${resolvedRepo}`);
        result.skipped.push({ file: patchedFile, reason: 'Path traversal outside repo' });
        continue;
      }

      const priority = patchPriority(patchedFile);
      const existing = targetPathMap.get(resolvedTarget);

      if (existing) {
        if (priority > existing.priority) {
          console.warn(
            `[PatchApplicator] Multiple patches target ${path.basename(resolvedTarget)}: ` +
            `replacing ${existing.patchedFile} (priority ${existing.priority}) with ${patchedFile} (priority ${priority})`,
          );
          result.skipped.push({ file: existing.patchedFile, reason: `Superseded by higher-priority merged patch: ${patchedFile}` });
          targetPathMap.set(resolvedTarget, { patchedFile, targetPath, priority });
        } else {
          console.warn(
            `[PatchApplicator] Multiple patches target ${path.basename(resolvedTarget)}: ` +
            `skipping ${patchedFile} (priority ${priority}) — ${existing.patchedFile} has equal/higher priority`,
          );
          result.skipped.push({ file: patchedFile, reason: `Duplicate target — lower/equal priority than ${existing.patchedFile}` });
        }
      } else {
        targetPathMap.set(resolvedTarget, { patchedFile, targetPath, priority });
      }
    }

    // Log the final target list before applying
    console.log(`[PatchApplicator] Final target files (${targetPathMap.size}) after deduplication:`);
    for (const [, { patchedFile, targetPath }] of targetPathMap) {
      console.log(`   ${patchedFile} -> ${targetPath}`);
    }

    // ── Phase 2: Apply exactly one merged patch per target ─────────────────────
    for (const [, { patchedFile, targetPath }] of targetPathMap) {
      try {
        // Backup original
        if (fs.existsSync(targetPath)) {
          const backupName = `${Date.now()}_${path.basename(targetPath)}`;
          const backupPath = path.join(BACKUP_DIR, backupName);
          await fs.copy(targetPath, backupPath);
          result.backedUp.push({ original: targetPath, backup: backupPath });
          console.log(`[PatchApplicator] Backed up: ${targetPath} → ${backupPath}`);
        }

        await fs.ensureDir(path.dirname(targetPath));

        const patchedContent = await fs.readFile(path.join(patchedDir, patchedFile), 'utf-8');
        await fs.writeFile(targetPath, patchedContent, 'utf-8');

        result.applied.push({ patchedFile, targetPath });
        console.log(`[PatchApplicator] Applying one merged patch:`);
        console.log(`   ${patchedFile} -> ${targetPath}`);
        console.log(`[PatchApplicator] Verified merged fixes for ${targetPath}`);

      } catch (fileErr) {
        console.error(`[PatchApplicator] ❌ Failed to apply ${patchedFile}: ${fileErr.message}`);
        result.failed.push({ file: patchedFile, error: fileErr.message });
      }
    }

    result.success = result.failed.length === 0;
    console.log(`[PatchApplicator] Done. Applied: ${result.applied.length}, Failed: ${result.failed.length}, Skipped: ${result.skipped.length}`);

  } catch (err) {
    console.error('[PatchApplicator] Critical error:', err.message);
    result.success = false;
    result.error = err.message;
  }

  return result;
}

/**
 * Rollback all applied patches by restoring backed-up originals.
 *
 * @param {Array} backedUpEntries - Array of { original, backup } from applyPatchesToRepo
 * @returns {Promise<Object>}
 */
export async function rollbackPatches(backedUpEntries = []) {
  const result = { restored: [], failed: [] };

  for (const entry of backedUpEntries) {
    try {
      if (fs.existsSync(entry.backup)) {
        await fs.copy(entry.backup, entry.original, { overwrite: true });
        result.restored.push(entry.original);
        console.log(`[PatchApplicator] Restored: ${entry.original}`);
      }
    } catch (err) {
      result.failed.push({ file: entry.original, error: err.message });
      console.error(`[PatchApplicator] Failed to restore ${entry.original}: ${err.message}`);
    }
  }

  return result;
}
