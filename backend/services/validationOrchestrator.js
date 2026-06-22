import fs from 'fs-extra';
import path from 'path';
import { spawnSync } from 'child_process';

import { applyPatchesToRepo, rollbackPatches } from './patchApplicatorService.js';
import {
  detectProjectRuntime,
  installDependencies,
  startServer,
  waitForServerReady,
  stopServer,
  killProcessOnPort,
  getRandomFreePort,
} from './serverManagerService.js';
import { runTargetedZapScan, compareZapFindings } from './zapService.js';
import { validateOpenapiWithSwaggerCli } from './openapiValidationService.js';
import { runSchemathesisHarReport } from './schemathesisService.js';
import { normalizeHarReport, loadCustomConfig } from './jqNormalizerService.js';
import { emitScanEvent, broadcastToUser } from './socketService.js';

// ─── Semantic Comparator ──────────────────────────────────────────────────────

/**
 * Compare two normalized HAR JSON files and classify each difference.
 *
 * Returns:
 *   expectedChanges    — security improvements (better status codes, added headers)
 *   harmlessChanges    — formatting, ordering, empty↔null
 *   suspiciousRegressions — new errors, missing fields, changed shapes
 */
function semanticCompare(beforePath, afterPath) {
  const result = {
    expectedChanges: 0,
    harmlessChanges: 0,
    suspiciousRegressions: 0,
    details: [],
    error: null,
  };

  try {
    const beforeHar = JSON.parse(fs.readFileSync(beforePath, 'utf-8'));
    const afterHar = JSON.parse(fs.readFileSync(afterPath, 'utf-8'));

    const beforeEntries = beforeHar.log?.entries || [];
    const afterEntries = afterHar.log?.entries || [];

    // Build maps keyed by method:url for comparison
    const beforeMap = buildEntryMap(beforeEntries);
    const afterMap = buildEntryMap(afterEntries);

    const allKeys = new Set([...beforeMap.keys(), ...afterMap.keys()]);

    for (const key of allKeys) {
      const before = beforeMap.get(key);
      const after = afterMap.get(key);

      if (!before && after) {
        // New endpoint in after — likely new route or changed path
        result.details.push({
          endpoint: key,
          type: 'new_endpoint',
          classification: 'harmless',
          description: 'Endpoint appeared in post-patch results',
        });
        result.harmlessChanges++;
        continue;
      }

      if (before && !after) {
        // Endpoint disappeared — possibly suspicious
        result.details.push({
          endpoint: key,
          type: 'missing_endpoint',
          classification: 'regression',
          description: 'Endpoint missing in post-patch results',
        });
        result.suspiciousRegressions++;
        continue;
      }

      // Both exist — compare
      const beforeStatus = before.response?.status;
      const afterStatus = after.response?.status;

      if (beforeStatus !== afterStatus) {
        const classification = classifyStatusChange(beforeStatus, afterStatus);
        result.details.push({
          endpoint: key,
          type: 'status_change',
          classification,
          description: `Status: ${beforeStatus} → ${afterStatus}`,
          before: beforeStatus,
          after: afterStatus,
        });

        if (classification === 'expected') result.expectedChanges++;
        else if (classification === 'harmless') result.harmlessChanges++;
        else result.suspiciousRegressions++;
        continue;
      }

      // Compare response bodies
      const beforeBody = safeParseBody(before.response?.content?.text);
      const afterBody = safeParseBody(after.response?.content?.text);

      if (beforeBody !== null && afterBody !== null) {
        const bodyDiff = compareObjects(beforeBody, afterBody);

        if (bodyDiff.added.length > 0 || bodyDiff.removed.length > 0 || bodyDiff.changed.length > 0) {
          // Check if changes are security-related
          const securityFields = new Set([
            'csrf', 'csrfToken', 'x-csrf-token', 'authorization',
            'access-control-allow-origin', 'content-security-policy',
            'x-content-type-options', 'x-frame-options', 'strict-transport-security',
          ]);

          let isSecurityImprovement = false;
          const allChangedFields = [...bodyDiff.added, ...bodyDiff.removed, ...bodyDiff.changed.map(c => c.path)];

          for (const fieldPath of allChangedFields) {
            const lastSegment = fieldPath.split('.').pop().toLowerCase();
            if (securityFields.has(lastSegment)) {
              isSecurityImprovement = true;
              break;
            }
          }

          // Check for response shape changes
          if (bodyDiff.removed.length > 0 && !isSecurityImprovement) {
            result.details.push({
              endpoint: key,
              type: 'body_fields_removed',
              classification: 'regression',
              description: `Response fields removed: ${bodyDiff.removed.join(', ')}`,
              removedFields: bodyDiff.removed,
            });
            result.suspiciousRegressions++;
          } else if (isSecurityImprovement) {
            result.details.push({
              endpoint: key,
              type: 'security_improvement',
              classification: 'expected',
              description: `Security-related body changes detected`,
              added: bodyDiff.added,
              changed: bodyDiff.changed,
            });
            result.expectedChanges++;
          } else if (bodyDiff.added.length > 0 || bodyDiff.changed.length > 0) {
            result.details.push({
              endpoint: key,
              type: 'body_changes',
              classification: 'harmless',
              description: `Minor body changes: +${bodyDiff.added.length} fields, ~${bodyDiff.changed.length} changed`,
              added: bodyDiff.added,
              changed: bodyDiff.changed,
            });
            result.harmlessChanges++;
          }
        }
      }

      // Compare response headers for security improvements
      const beforeHeaders = headersToMap(before.response?.headers);
      const afterHeaders = headersToMap(after.response?.headers);
      const headerDiff = compareHeaderMaps(beforeHeaders, afterHeaders);

      if (headerDiff.securityAdded.length > 0) {
        result.details.push({
          endpoint: key,
          type: 'security_headers_added',
          classification: 'expected',
          description: `Security headers added: ${headerDiff.securityAdded.join(', ')}`,
        });
        result.expectedChanges++;
      }
    }

  } catch (err) {
    result.error = err.message;
    console.error('[SemanticCompare] Error:', err.message);
  }

  return result;
}

// ─── Comparison Helpers ───────────────────────────────────────────────────────

function buildEntryMap(entries) {
  const map = new Map();
  for (const entry of entries) {
    const method = entry.request?.method || 'GET';
    const url = entry.request?.url || '';
    // Normalize URL: strip host portion, keep path + query only
    let pathname = url;
    try {
      const parsed = new URL(url);
      pathname = parsed.pathname + parsed.search;
    } catch { /* use raw */ }
    const key = `${method}:${pathname}`;
    // Keep last occurrence (most relevant)
    map.set(key, entry);
  }
  return map;
}

/**
 * Classify a status code change.
 * Returns 'expected', 'harmless', or 'regression'.
 */
function classifyStatusChange(before, after) {
  const b = parseInt(before, 10) || 0;
  const a = parseInt(after, 10) || 0;

  // Server error → success/client error = expected improvement
  if (b >= 500 && a < 500) return 'expected';

  // Error → proper auth response = expected
  if (b >= 400 && a === 401) return 'expected';
  if (b >= 400 && a === 403) return 'expected';

  // Success → same success range = harmless
  if (Math.floor(b / 100) === Math.floor(a / 100)) return 'harmless';

  // Success → error = regression
  if (b < 400 && a >= 400) return 'regression';

  // Client error → server error = regression
  if (b < 500 && a >= 500) return 'regression';

  return 'harmless';
}

function safeParseBody(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

/**
 * Shallow-deep compare two objects, returning added/removed/changed field paths.
 */
function compareObjects(a, b, prefix = '') {
  const result = { added: [], removed: [], changed: [] };

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    if (a !== b) {
      result.changed.push({ path: prefix || '<root>', before: a, after: b });
    }
    return result;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    // Compare arrays by length and sample
    if (a.length !== b.length) {
      result.changed.push({ path: `${prefix}[length]`, before: a.length, after: b.length });
    }
    return result; // Don't deep-diff array elements to keep it manageable
  }

  const aKeys = new Set(Object.keys(a));
  const bKeys = new Set(Object.keys(b));

  for (const key of bKeys) {
    if (!aKeys.has(key)) {
      result.added.push(prefix ? `${prefix}.${key}` : key);
    }
  }

  for (const key of aKeys) {
    if (!bKeys.has(key)) {
      result.removed.push(prefix ? `${prefix}.${key}` : key);
    } else {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const sub = compareObjects(a[key], b[key], fieldPath);
      result.added.push(...sub.added);
      result.removed.push(...sub.removed);
      result.changed.push(...sub.changed);
    }
  }

  return result;
}

function headersToMap(headers) {
  const map = new Map();
  for (const h of (headers || [])) {
    map.set(h.name.toLowerCase(), h.value);
  }
  return map;
}

function compareHeaderMaps(before, after) {
  const securityHeaders = new Set([
    'content-security-policy', 'x-content-type-options',
    'x-frame-options', 'strict-transport-security',
    'x-xss-protection', 'referrer-policy',
    'permissions-policy', 'cross-origin-opener-policy',
  ]);

  const securityAdded = [];
  for (const [key] of after) {
    if (!before.has(key) && securityHeaders.has(key)) {
      securityAdded.push(key);
    }
  }

  return { securityAdded };
}

// ─── Verdict Logic ────────────────────────────────────────────────────────────

function computeVerdict(comparison, zapComparison = null) {
  if (comparison.error) {
    return { verdict: 'error', reason: `Comparison failed: ${comparison.error}` };
  }

  // Build ZAP summary
  const zapParts = [];
  if (zapComparison) {
    if (zapComparison.mitigatedCount > 0) {
      zapParts.push(`${zapComparison.mitigatedCount} vuln(s) mitigated`);
    }
    if (zapComparison.remainingCount > 0) {
      zapParts.push(`${zapComparison.remainingCount} vuln(s) still present`);
    }
    if (zapComparison.newCount > 0) {
      zapParts.push(`${zapComparison.newCount} new alert(s) introduced`);
    }
  }
  const zapSuffix = zapParts.length > 0 ? `. ZAP: ${zapParts.join(', ')}` : '';

  if (comparison.suspiciousRegressions === 0) {
    const remainingHighMed = zapComparison?.remaining?.filter(
      r => r.severity === 'High' || r.severity === 'Medium'
    ) || [];
    // Patches must not introduce new High/Medium alerts (e.g. a weak CSP header)
    const newHighMed = zapComparison?.newAlerts?.filter(
      a => a.severity === 'High' || a.severity === 'Medium'
    ) || [];

    if (newHighMed.length > 0) {
      return {
        verdict: 'warning',
        reason: `Patch introduced ${newHighMed.length} new High/Medium ZAP alert(s) — review the security header configuration (e.g. CSP wildcards or unsafe-inline)${zapSuffix}`,
      };
    }

    if (remainingHighMed.length > 0) {
      return {
        verdict: 'warning',
        reason: `API behavior is stable (0 regressions), but ${remainingHighMed.length} High/Medium vulnerability type(s) still detected by ZAP${zapSuffix}`,
      };
    }

    return {
      verdict: 'valid',
      reason: `All changes are expected or harmless (${comparison.expectedChanges} expected, ${comparison.harmlessChanges} harmless, 0 regressions)${zapSuffix}`,
    };
  }

  if (comparison.suspiciousRegressions <= 2) {
    return {
      verdict: 'warning',
      reason: `Minor regressions detected (${comparison.suspiciousRegressions} suspicious). Manual review recommended${zapSuffix}`,
    };
  }

  return {
    verdict: 'invalid',
    reason: `Significant regressions detected (${comparison.suspiciousRegressions} suspicious changes). Patch may have broken API behavior${zapSuffix}`,
  };
}

// ─── Schemathesis runner (synchronous variant for validation) ──────────────────

/**
 * Run Schemathesis synchronously and wait for completion.
 * Returns { success, exitCode, reportPath }
 */
function runSchemathesisSync({ openapiPath, baseUrl, reportPath, timeoutMs = 120000 }) {
  const cmd = process.platform === 'win32' ? 'st.exe' : 'st';
  const args = [
    'run', openapiPath,
    '--url', baseUrl,
    '--report', 'har',
    '--report-har-path', reportPath,
  ];

  console.log(`[ValidationOrchestrator] Running Schemathesis: ${cmd} ${args.join(' ')}`);

  const result = spawnSync(cmd, args, {
    stdio: 'pipe',
    shell: false,
    windowsHide: true,
    timeout: timeoutMs,
    env: {
      ...process.env,
      PYTHONUTF8: '1',
      PYTHONIOENCODING: 'utf-8',
    },
  });

  const success = result.status === 0;
  if (!success) {
    console.warn(`[ValidationOrchestrator] Schemathesis exited with code ${result.status}`);
    if (result.stderr) console.warn(`  stderr: ${result.stderr.toString().slice(0, 500)}`);
  }

  return {
    success,
    exitCode: result.status ?? 1,
    reportPath,
    error: result.error?.message || null,
  };
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

/**
 * Run the full validation cycle after patch generation completes.
 *
 * @param {Object} opts
 * @param {string}  opts.repoPath       - Absolute path to the cloned repository
 * @param {string}  opts.scanJobId      - MongoDB scan job ID
 * @param {string}  opts.userId         - User ID for socket events
 * @param {string}  opts.targetUrl      - Original target URL
 * @param {Array}   opts.findings       - Extracted ZAP report findings (with source_file_path)
 * @param {string}  [opts.openapiPath]  - Path to existing OpenAPI YAML
 * @param {string}  [opts.beforeHarPath]- Path to the Schemathesis HAR from before patching
 * @returns {Promise<Object>} ValidationReport
 */
export async function runValidationCycle({
  repoPath,
  scanJobId,
  userId,
  targetUrl,
  findings,
  openapiPath,
  beforeHarPath,
}) {
  const report = {
    patchApplication: null,
    serverRestart: null,
    zapRescan: null,
    zapComparison: null,
    openapiReuse: null,
    openapiValidation: null,
    schemathesisBefore: null,
    schemathesisAfter: null,
    normalization: null,
    semanticComparison: null,
    verdict: 'pending',
    verdictReason: null,
    timestamp: new Date().toISOString(),
  };

  let serverHandle = null;
  let patchBackups = [];

  const emitProgress = (stage, data = {}) => {
    emitScanEvent(scanJobId, 'validation:stage', { stage, ...data });
    broadcastToUser(userId, 'scan:status', {
      scanJobId: scanJobId.toString(),
      status: 'validating',
      validationStage: stage,
    });
  };

  try {
    console.log('\n' + '='.repeat(80));
    console.log(' VALIDATION CYCLE STARTED');
    console.log('='.repeat(80));

    // ── Step 1: Apply Patches ──────────────────────────────────────────────
    emitProgress('applying_patches');
    console.log('\n[Validation] Step 1: Applying patches to cloned repo...');

    report.patchApplication = await applyPatchesToRepo({
      repoPath,
      findings,
    });
    patchBackups = report.patchApplication.backedUp || [];

    if (report.patchApplication.applied.length === 0 && report.patchApplication.failed.length > 0) {
      report.verdict = 'failed';
      report.verdictReason = 'All patch applications failed';
      emitProgress('failed', { reason: report.verdictReason });
      return report;
    }

    console.log(`[Validation] Patches applied: ${report.patchApplication.applied.length}, failed: ${report.patchApplication.failed.length}`);

    // ── Step 2: Detect Runtime ─────────────────────────────────────────────
    emitProgress('detecting_runtime');
    console.log('\n[Validation] Step 2: Detecting project runtime...');

    const runtime = await detectProjectRuntime(repoPath);

    if (runtime.type === 'unknown' || !runtime.startCommand) {
      console.warn('[Validation] Could not detect project runtime. Skipping server restart.');
      report.serverRestart = { success: false, error: 'Could not detect project runtime', skipped: true };
      // Continue without server restart — we can still try OpenAPI + comparison
    } else {

      // ── Step 3: Install Dependencies ───────────────────────────────────────
      emitProgress('installing_dependencies');
      console.log('\n[Validation] Step 3: Installing dependencies...');

      const installResult = await installDependencies(runtime);
      if (!installResult.success && !installResult.skipped) {
        console.warn('[Validation] Dependency install failed — trying to start anyway.');
      }

      // ── Step 4: Start Patched Server ───────────────────────────────────────
      emitProgress('starting_server');
      console.log('\n[Validation] Step 4: Starting patched server...');

      // Use a random free port for the patched server.
      // semanticCompare normalizes the URLs so the port difference won't matter.
      const assignedPort = await getRandomFreePort();

      await new Promise(r => setTimeout(r, 1000));

      serverHandle = await startServer({
        repoPath,
        runtime,
        port: assignedPort,
      });

      report.serverRestart = {
        success: serverHandle.success,
        port: serverHandle.port || assignedPort,
        pid: serverHandle.pid,
        error: serverHandle.error,
      };

      if (!serverHandle.success) {
        console.error('[Validation] Patched server failed to start. Attempting rollback...');
        await rollbackPatches(patchBackups);
        report.verdict = 'failed';
        report.verdictReason = `Patched server failed to start: ${serverHandle.error}`;
        emitProgress('failed', { reason: report.verdictReason });
        return report;
      }

      // ── Step 5: Wait for Server Readiness ──────────────────────────────────
      emitProgress('waiting_for_server');
      console.log('\n[Validation] Step 5: Waiting for server readiness...');

      const readiness = await waitForServerReady({
        port: serverHandle.port,
        timeoutMs: 30000,
      });

      if (!readiness.ready) {
        console.error('[Validation] Server did not become ready. Attempting rollback...');
        await stopServer(serverHandle);
        await rollbackPatches(patchBackups);
        report.verdict = 'failed';
        report.verdictReason = 'Patched server did not become ready within timeout';
        emitProgress('failed', { reason: report.verdictReason });
        return report;
      }
    }

    // ── Construct the patched base URL ─────────────────────────────────────
    // Determine the port: prefer the server handle's port, then fall back to
    // extracting the port from the original target URL.
    const resolvedPort = serverHandle?.port
      || (() => { try { return new URL(targetUrl).port; } catch { return '3000'; } })();

    let patchedBaseUrl;
    try {
      const parsedTarget = new URL(targetUrl);
      parsedTarget.port = resolvedPort;
      patchedBaseUrl = parsedTarget.toString().replace(/\/$/, "");
    } catch {
      patchedBaseUrl = `http://localhost:${resolvedPort}`;
    }

    // ── Step 6: Targeted ZAP Re-scan ─────────────────────────────────────────
    emitProgress('zap_rescan');
    console.log('\n[Validation] Step 6: Running targeted ZAP re-scan on patched application...');

    if (serverHandle?.success && findings && findings.length > 0) {
      const zapResult = await runTargetedZapScan({
        targetUrl: patchedBaseUrl,
        findings,
        scanJobId,
        userId,
      });

      report.zapRescan = {
        success: zapResult.success,
        alertCount: zapResult.alerts?.length || 0,
        error: zapResult.error || null,
      };

      // Compare before vs after ZAP findings
      const zapComp = compareZapFindings(findings, zapResult.alerts || []);
      report.zapComparison = {
        mitigated: zapComp.mitigated,
        remaining: zapComp.remaining,
        newAlerts: zapComp.newAlerts,
        mitigatedCount: zapComp.mitigated.length,
        remainingCount: zapComp.remaining.length,
        newCount: zapComp.newAlerts.length,
      };

      console.log(`[Validation] ZAP Comparison:`);
      console.log(`   ✅ Mitigated: ${zapComp.mitigated.length} vulnerability type(s)`);
      for (const m of zapComp.mitigated) {
        console.log(`      → ${m.alertName} (${m.severity})`);
      }
      console.log(`   ⚠️  Remaining: ${zapComp.remaining.length} vulnerability type(s)`);
      for (const r of zapComp.remaining) {
        console.log(`      → ${r.alertName} (${r.severity}): ${r.beforeInstances} → ${r.afterInstances} instances`);
      }
      if (zapComp.newAlerts.length > 0) {
        console.log(`   🆕 New: ${zapComp.newAlerts.length} alert type(s)`);
        for (const n of zapComp.newAlerts) {
          console.log(`      → ${n.alertName} (${n.severity})`);
        }
      }
    } else {
      report.zapRescan = {
        success: false,
        note: 'Skipped: server not running or no original findings',
      };
      report.zapComparison = null;
      console.warn('[Validation] Skipping ZAP re-scan (no server or no findings).');
    }

    // ── Step 7: Reuse existing OpenAPI spec ──────────────────────────────────
    console.log('\n[Validation] Step 7: Reusing baseline OpenAPI spec (no regeneration)...');

    // Resolve the OpenAPI path — use provided path or fallback to repo default
    let activeOpenapiPath = openapiPath || path.join(repoPath, 'Openapi.yaml');

    if (fs.existsSync(activeOpenapiPath)) {
      // Update the servers URL in the spec to point at the patched server port
      try {
        let yamlContent = fs.readFileSync(activeOpenapiPath, 'utf8');
        // Replace any servers URL with the patched base URL
        // Handles both formats: "url: http://..." and "- url: http://..."
        yamlContent = yamlContent.replace(
          /(servers:\s*\n\s*-\s*url:\s*).+/,
          `$1${patchedBaseUrl}`,
        );
        fs.writeFileSync(activeOpenapiPath, yamlContent, 'utf8');
        console.log(`[Validation] Updated servers URL → ${patchedBaseUrl}`);
      } catch (urlErr) {
        console.warn(`[Validation] Could not update servers URL: ${urlErr.message}`);
      }

      // Validate the (reused) spec
      const validation = validateOpenapiWithSwaggerCli(activeOpenapiPath);
      report.openapiReuse = { path: activeOpenapiPath, reused: true };
      report.openapiValidation = {
        status: validation.ok ? 'valid' : 'invalid',
        error: validation.ok ? undefined : validation.error,
      };

      if (!validation.ok) {
        console.error(`[Validation] Reused OpenAPI spec is invalid: ${validation.error}`);
        report.verdict = 'failed';
        report.verdictReason = `Baseline OpenAPI spec validation failed: ${validation.error || 'unknown error'}`;
        emitProgress('failed', { reason: report.verdictReason });
        return report;
      }
      console.log('[Validation] Baseline OpenAPI spec is valid.');
    } else {
      console.warn(`[Validation] No OpenAPI spec found at ${activeOpenapiPath}`);
      activeOpenapiPath = null;
      report.openapiReuse = { path: null, reused: false, note: 'No baseline spec found' };
      report.openapiValidation = { status: 'skipped' };
    }

    // ── Step 8: Handle Before-Patch Schemathesis ─────────────────────────────
    console.log('\n[Validation] Step 8: Resolving before-patch Schemathesis report...');

    if (beforeHarPath) {
      // Schemathesis runs asynchronously alongside the ZAP scan and patch pipeline.
      // The HAR file may not exist on disk yet even though the path is recorded in the DB.
      // Wait up to 90 seconds for it to appear before giving up.
      if (!fs.existsSync(beforeHarPath)) {
        console.log('[Validation] Before-patch HAR not yet on disk — waiting up to 90 s for Schemathesis to finish...');
        const deadline = Date.now() + 90_000;
        while (Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 3000));
          if (fs.existsSync(beforeHarPath)) {
            console.log('[Validation] Before-patch HAR appeared on disk.');
            break;
          }
        }
      }

      if (fs.existsSync(beforeHarPath)) {
        report.schemathesisBefore = { harPath: beforeHarPath, exitCode: 0, exists: true };
        console.log(`[Validation] Before-patch HAR found: ${beforeHarPath}`);
      } else {
        report.schemathesisBefore = {
          harPath: null,
          exists: false,
          note: 'Before-patch HAR not produced within 90 s timeout — falling back to ZAP results',
        };
        console.warn('[Validation] Before-patch HAR not available after 90 s. Semantic diff will be skipped; verdict derived from ZAP comparison.');
      }
    } else {
      report.schemathesisBefore = {
        harPath: null,
        exists: false,
        note: 'No pre-patch Schemathesis report path recorded in scan job',
      };
      console.warn('[Validation] No before-patch HAR path in scan record. Semantic diff will be skipped; verdict derived from ZAP comparison.');
    }

    // ── Step 9: Run Schemathesis on Patched App ──────────────────────────────
    if (activeOpenapiPath && serverHandle?.success) {
      emitProgress('running_schemathesis');
      console.log('\n[Validation] Step 9: Running Schemathesis on patched application...');

      const afterReportPath = path.join(repoPath, 'schemathesis-report-after.har');

      const schemathesisResult = runSchemathesisSync({
        openapiPath: activeOpenapiPath,
        baseUrl: patchedBaseUrl,
        reportPath: afterReportPath,
      });

      report.schemathesisAfter = {
        harPath: schemathesisResult.reportPath,
        exitCode: schemathesisResult.exitCode,
        success: schemathesisResult.success,
        error: schemathesisResult.error,
      };
    } else {
      report.schemathesisAfter = {
        harPath: null,
        success: false,
        note: 'Skipped: server not running or no OpenAPI spec',
      };
      console.warn('[Validation] Skipping post-patch Schemathesis (no server or no OpenAPI).');
    }

    // ── Step 10: Normalize Before & After HAR Reports ────────────────────────
    emitProgress('normalizing');
    console.log('\n[Validation] Step 10: Normalizing HAR reports...');

    const customConfig = loadCustomConfig(repoPath);
    const normalizationResults = { before: null, after: null };

    if (report.schemathesisBefore?.exists && report.schemathesisBefore.harPath) {
      const beforeNormPath = path.join(repoPath, 'schemathesis-before-normalized.json');
      normalizationResults.before = await normalizeHarReport({
        harPath: report.schemathesisBefore.harPath,
        outputPath: beforeNormPath,
        customConfig,
      });
    }

    if (report.schemathesisAfter?.harPath && fs.existsSync(report.schemathesisAfter.harPath)) {
      const afterNormPath = path.join(repoPath, 'schemathesis-after-normalized.json');
      normalizationResults.after = await normalizeHarReport({
        harPath: report.schemathesisAfter.harPath,
        outputPath: afterNormPath,
        customConfig,
      });
    }

    report.normalization = {
      beforePath: normalizationResults.before?.outputPath || null,
      afterPath: normalizationResults.after?.outputPath || null,
      beforeSuccess: normalizationResults.before?.success || false,
      afterSuccess: normalizationResults.after?.success || false,
      method: normalizationResults.after?.method || normalizationResults.before?.method || null,
    };

    // ── Step 11: Semantic Comparison ─────────────────────────────────────────
    emitProgress('comparing');
    console.log('\n[Validation] Step 11: Performing semantic comparison...');

    if (normalizationResults.before?.success && normalizationResults.after?.success) {
      report.semanticComparison = semanticCompare(
        normalizationResults.before.outputPath,
        normalizationResults.after.outputPath,
      );

      const { verdict, reason } = computeVerdict(report.semanticComparison, report.zapComparison);
      report.verdict = verdict;
      report.verdictReason = reason;

      const { expectedChanges, harmlessChanges, suspiciousRegressions } = report.semanticComparison;
      const zapSummary = report.zapComparison
        ? ` | ZAP: ${report.zapComparison.mitigatedCount} mitigated, ${report.zapComparison.remainingCount} remaining`
        : '';
      emitProgress('comparison_complete', {
        message: `Comparing pre and post-patch APIs: ${expectedChanges} fixes, ${harmlessChanges} benign changes, ${suspiciousRegressions} regressions.${zapSummary}`
      });
    } else if (normalizationResults.after?.success) {
      // After-HAR normalized but no before-baseline for semantic diff.
      // Schemathesis exit code is NOT used here — it exits non-zero for unsupported
      // HTTP methods (QUERY) which are out of scope and must not drive the verdict.
      // Use ZAP comparison as the authoritative signal instead.
      const zapRemHighMed2 = report.zapComparison?.remaining?.filter(
        r => r.severity === 'High' || r.severity === 'Medium'
      ) || [];
      const newHighMed2 = report.zapComparison?.newAlerts?.filter(
        a => a.severity === 'High' || a.severity === 'Medium'
      ) || [];
      const zapSuffix2 = report.zapComparison
        ? ` ZAP: ${report.zapComparison.mitigatedCount || 0} mitigated, ` +
          `${report.zapComparison.remainingCount || 0} remaining, ` +
          `${report.zapComparison.newCount || 0} new.`
        : '';

      if (newHighMed2.length > 0) {
        report.verdict = 'warning';
        report.verdictReason =
          `Patch introduced ${newHighMed2.length} new High/Medium ZAP alert(s) — ` +
          `review security header configuration (e.g. CSP wildcards or unsafe-inline).${zapSuffix2}`;
      } else if (zapRemHighMed2.length > 0) {
        report.verdict = 'warning';
        report.verdictReason =
          `${zapRemHighMed2.length} High/Medium ZAP finding(s) remain unmitigated ` +
          `(no before-patch baseline for behavior diff).${zapSuffix2}`;
      } else {
        report.verdict = 'valid';
        report.verdictReason =
          `All High/Medium ZAP findings addressed; API behavior verified post-patch ` +
          `(no before-patch Schemathesis baseline for semantic diff).${zapSuffix2}`;
      }
      report.semanticComparison = { note: 'No before-patch Schemathesis data available for semantic comparison' };
      const zapSumMsg2 = report.zapComparison
        ? ` | ZAP: ${report.zapComparison.mitigatedCount} mitigated, ${report.zapComparison.remainingCount} remaining`
        : '';
      emitProgress('comparison_complete', { message: `ZAP-based verdict (no before-baseline).${zapSumMsg2}` });
    } else {
      // Neither before nor after normalization succeeded.
      // Fall back entirely to ZAP comparison so the verdict is still meaningful.
      const zapRemHighMed3 = report.zapComparison?.remaining?.filter(
        r => r.severity === 'High' || r.severity === 'Medium'
      ) || [];
      const newHighMed3 = report.zapComparison?.newAlerts?.filter(
        a => a.severity === 'High' || a.severity === 'Medium'
      ) || [];
      const zapSuffix3 = report.zapComparison
        ? ` ZAP: ${report.zapComparison.mitigatedCount || 0} mitigated, ` +
          `${report.zapComparison.remainingCount || 0} remaining, ` +
          `${report.zapComparison.newCount || 0} new.`
        : '';

      if (report.patchApplication.applied.length === 0) {
        report.verdict = 'failed';
        report.verdictReason = 'No patches were successfully applied.';
      } else if (newHighMed3.length > 0) {
        report.verdict = 'warning';
        report.verdictReason =
          `Patch introduced ${newHighMed3.length} new High/Medium ZAP alert(s); ` +
          `semantic comparison unavailable (Schemathesis normalization failed).${zapSuffix3}`;
      } else if (zapRemHighMed3.length > 0) {
        report.verdict = 'warning';
        report.verdictReason =
          `${zapRemHighMed3.length} High/Medium ZAP finding(s) remain; ` +
          `semantic comparison unavailable.${zapSuffix3}`;
      } else if ((report.zapComparison?.mitigatedCount || 0) > 0) {
        report.verdict = 'valid';
        report.verdictReason =
          `ZAP findings mitigated; semantic comparison unavailable ` +
          `(Schemathesis normalization failed).${zapSuffix3}`;
      } else {
        report.verdict = 'warning';
        report.verdictReason =
          `Patches applied but semantic comparison unavailable. Manual review recommended.${zapSuffix3}`;
      }
      report.semanticComparison = { note: 'Normalization failed or no Schemathesis data' };
    }

    // ── Step 12: Stop Server ─────────────────────────────────────────────────
    if (serverHandle) {
      console.log('\n[Validation] Step 12: Stopping validation server...');
      await stopServer(serverHandle);
    }

    // ── Done ─────────────────────────────────────────────────────────────────
    emitProgress('completed', {
      verdict: report.verdict,
      reason: report.verdictReason,
    });

    console.log('\n' + '='.repeat(80));
    console.log(` VALIDATION VERDICT: ${report.verdict.toUpperCase()}`);
    console.log(` Reason: ${report.verdictReason}`);
    console.log('='.repeat(80) + '\n');

  } catch (err) {
    console.error('[ValidationOrchestrator] Critical error:', err);
    report.verdict = 'error';
    report.verdictReason = `Validation cycle crashed: ${err.message}`;

    // Cleanup
    if (serverHandle) {
      try { await stopServer(serverHandle); } catch { /* best effort */ }
    }

    emitProgress('failed', { reason: report.verdictReason });
  }

  report.timestamp = new Date().toISOString();
  return report;
}
