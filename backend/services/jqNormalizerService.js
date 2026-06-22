import fs from 'fs-extra';
import path from 'path';
import { spawnSync } from 'child_process';

// ─── Default normalization config ─────────────────────────────────────────────

/**
 * Fields to strip from HAR entries to remove time-based / non-deterministic noise.
 * Each category is a set of field names or header names that get removed.
 */
const DEFAULT_STRIP_CONFIG = {
  // Top-level HAR entry fields to delete entirely
  entryFields: [
    'startedDateTime', 'time', 'timings', 'cache',
    'pageref', 'connection', '_priority', '_resourceType',
  ],
  // Response headers to remove (matched case-insensitively)
  responseHeaders: [
    'Date', 'Set-Cookie', 'X-Request-Id', 'X-Runtime',
    'ETag', 'X-Powered-By', 'X-RateLimit-Remaining',
    'X-RateLimit-Reset', 'Expires', 'Last-Modified',
    'Age', 'CF-RAY', 'CF-Cache-Status', 'Server-Timing',
  ],
  // Request headers to remove
  requestHeaders: [
    'Date', 'Cookie', 'X-Request-Id', 'User-Agent',
    'Authorization', 'X-CSRF-Token',
  ],
  // JSON body fields to remove from parsed response content
  bodyFields: [
    'created_at', 'createdAt', 'updated_at', 'updatedAt',
    'timestamp', 'date', 'time', 'id', '_id', 'token',
    'session', 'csrf', 'csrfToken', 'sessionId',
    '__v', 'lastModified', 'expiresAt',
  ],
  // Regex patterns for string values to replace with placeholders
  stringPatterns: [
    { pattern: /^\d{4}-\d{2}-\d{2}T/, replacement: '<<TIMESTAMP>>' },
    { pattern: /^[0-9a-f]{24}$/, replacement: '<<OBJECT_ID>>' },
    { pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-/, replacement: '<<UUID>>' },
    { pattern: /^eyJ[A-Za-z0-9_-]+\./, replacement: '<<JWT>>' },
  ],
};

// ─── jq-based normalizer ──────────────────────────────────────────────────────

/**
 * Build a jq filter string from the strip config.
 */
function buildJqFilter(config) {
  const respHeaders = config.responseHeaders.map(h => `"${h}"`).join(', ');
  const reqHeaders = config.requestHeaders.map(h => `"${h}"`).join(', ');
  const bodyFields = config.bodyFields.map(f => `.${f}`).join(', ');

  // Note: jq doesn't easily support all our features (like regex replacement
  // inside parsed JSON bodies). We use a simplified version for jq and
  // handle the rest in JS post-processing.
  return `.log.entries |= map(
  del(.startedDateTime, .time, .timings, .cache, .pageref, .connection)
  | .response.headers |= map(select(.name as $n | [${respHeaders}] | map(ascii_downcase) | index($n | ascii_downcase) | not))
  | .request.headers |= map(select(.name as $n | [${reqHeaders}] | map(ascii_downcase) | index($n | ascii_downcase) | not))
)
| del(.log.pages, .log.creator, .log.version, .log.comment)`;
}

/**
 * Check if jq is available on the system.
 */
function isJqAvailable() {
  try {
    const result = spawnSync('jq', ['--version'], { encoding: 'utf-8', stdio: 'pipe', timeout: 5000 });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Normalize a HAR file using the jq CLI.
 */
function normalizeWithJq(harPath, outputPath, jqFilter) {
  const result = spawnSync('jq', [jqFilter, harPath], {
    encoding: 'utf-8',
    stdio: 'pipe',
    timeout: 30000,
    maxBuffer: 50 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`jq execution failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`jq exited with code ${result.status}: ${(result.stderr || '').slice(0, 500)}`);
  }

  const output = result.stdout;
  fs.writeFileSync(outputPath, output, 'utf-8');
  return output;
}

// ─── Pure-JS normalizer (fallback) ───────────────────────────────────────────

/**
 * Normalize a HAR JSON object in pure JS (used when jq is not available).
 */
function normalizeHarJs(har, config) {
  if (!har || !har.log) return har;

  // Remove top-level noise
  delete har.log.pages;
  delete har.log.creator;
  delete har.log.version;
  delete har.log.comment;

  const respHeaderSet = new Set(config.responseHeaders.map(h => h.toLowerCase()));
  const reqHeaderSet = new Set(config.requestHeaders.map(h => h.toLowerCase()));
  const bodyFieldSet = new Set(config.bodyFields);

  for (const entry of (har.log.entries || [])) {
    // Remove noisy entry fields
    for (const field of config.entryFields) {
      delete entry[field];
    }

    // Filter response headers
    if (entry.response?.headers) {
      entry.response.headers = entry.response.headers.filter(
        h => !respHeaderSet.has(h.name.toLowerCase())
      );
    }

    // Filter request headers
    if (entry.request?.headers) {
      entry.request.headers = entry.request.headers.filter(
        h => !reqHeaderSet.has(h.name.toLowerCase())
      );
    }

    // Normalize response body
    if (entry.response?.content?.text) {
      try {
        let body = JSON.parse(entry.response.content.text);
        body = normalizeValue(body, bodyFieldSet, config.stringPatterns);
        entry.response.content.text = JSON.stringify(body);
      } catch {
        // Not JSON, leave as-is
      }
    }

    // Normalize request postData
    if (entry.request?.postData?.text) {
      try {
        let body = JSON.parse(entry.request.postData.text);
        body = normalizeValue(body, bodyFieldSet, config.stringPatterns);
        entry.request.postData.text = JSON.stringify(body);
      } catch {
        // Not JSON
      }
    }
  }

  // Sort entries by URL + method for deterministic comparison
  if (har.log.entries) {
    har.log.entries.sort((a, b) => {
      const keyA = `${a.request?.method || ''}:${a.request?.url || ''}`;
      const keyB = `${b.request?.method || ''}:${b.request?.url || ''}`;
      return keyA.localeCompare(keyB);
    });
  }

  return har;
}

/**
 * Recursively normalize a value: remove configured fields, replace patterned strings.
 */
function normalizeValue(value, bodyFieldSet, stringPatterns) {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map(item => normalizeValue(item, bodyFieldSet, stringPatterns));
  }

  if (typeof value === 'object') {
    const normalized = {};
    for (const [key, val] of Object.entries(value)) {
      if (bodyFieldSet.has(key)) continue; // strip
      normalized[key] = normalizeValue(val, bodyFieldSet, stringPatterns);
    }
    return normalized;
  }

  if (typeof value === 'string') {
    for (const { pattern, replacement } of stringPatterns) {
      if (pattern.test(value)) return replacement;
    }
  }

  return value;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Normalize a Schemathesis HAR report for semantic comparison.
 *
 * Uses jq if available, otherwise falls back to pure JS.
 *
 * @param {Object} opts
 * @param {string}  opts.harPath      - Path to the HAR file to normalize
 * @param {string}  opts.outputPath   - Path to write the normalized output
 * @param {Object}  [opts.customConfig] - Override default strip config
 * @returns {Promise<Object>} { success, outputPath, entriesCount, strippedFields, method }
 */
export async function normalizeHarReport({ harPath, outputPath, customConfig = null }) {
  const result = {
    success: false,
    outputPath,
    entriesCount: 0,
    strippedFields: [],
    method: null,
    error: null,
  };

  try {
    if (!harPath || !fs.existsSync(harPath)) {
      result.error = `HAR file not found: ${harPath}`;
      return result;
    }

    const config = customConfig
      ? { ...DEFAULT_STRIP_CONFIG, ...customConfig }
      : DEFAULT_STRIP_CONFIG;

    // Ensure output directory exists
    fs.ensureDirSync(path.dirname(outputPath));

    const useJq = isJqAvailable();

    if (useJq) {
      console.log(`[JqNormalizer] Using jq CLI for: ${path.basename(harPath)}`);
      result.method = 'jq';

      const jqFilter = buildJqFilter(config);
      let normalizedJson = normalizeWithJq(harPath, outputPath, jqFilter);

      // Post-process with JS for body-level normalization (jq can't do our full config)
      try {
        let har = JSON.parse(normalizedJson);
        const bodyFieldSet = new Set(config.bodyFields);

        for (const entry of (har.log?.entries || [])) {
          if (entry.response?.content?.text) {
            try {
              let body = JSON.parse(entry.response.content.text);
              body = normalizeValue(body, bodyFieldSet, config.stringPatterns);
              entry.response.content.text = JSON.stringify(body);
            } catch { /* not JSON */ }
          }
        }

        // Sort for deterministic comparison
        if (har.log?.entries) {
          har.log.entries.sort((a, b) => {
            const keyA = `${a.request?.method || ''}:${a.request?.url || ''}`;
            const keyB = `${b.request?.method || ''}:${b.request?.url || ''}`;
            return keyA.localeCompare(keyB);
          });
        }

        fs.writeFileSync(outputPath, JSON.stringify(har, null, 2), 'utf-8');
        result.entriesCount = har.log?.entries?.length || 0;
      } catch {
        // jq output was fine, body post-processing failed — still usable
        result.entriesCount = -1;
      }

    } else {
      console.log(`[JqNormalizer] jq not available — using JS fallback for: ${path.basename(harPath)}`);
      result.method = 'js-fallback';

      const rawContent = fs.readFileSync(harPath, 'utf-8');
      let har;
      try {
        har = JSON.parse(rawContent);
      } catch (parseErr) {
        result.error = `Failed to parse HAR as JSON: ${parseErr.message}`;
        return result;
      }

      har = normalizeHarJs(har, config);
      result.entriesCount = har.log?.entries?.length || 0;

      fs.writeFileSync(outputPath, JSON.stringify(har, null, 2), 'utf-8');
    }

    result.success = true;
    result.strippedFields = [
      ...config.entryFields,
      ...config.responseHeaders.map(h => `response.header:${h}`),
      ...config.requestHeaders.map(h => `request.header:${h}`),
      ...config.bodyFields.map(f => `body.${f}`),
    ];

    console.log(`[JqNormalizer] ✅ Normalized ${result.entriesCount} entries → ${outputPath}`);

  } catch (err) {
    console.error(`[JqNormalizer] Error: ${err.message}`);
    result.error = err.message;
  }

  return result;
}

/**
 * Load a custom normalization config from a file in the repo.
 * Expected path: <repoPath>/.validation-config.json
 */
export function loadCustomConfig(repoPath) {
  const configPath = path.join(repoPath, '.validation-config.json');
  if (!fs.existsSync(configPath)) return null;

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    console.log('[JqNormalizer] Loaded custom config from .validation-config.json');
    return config;
  } catch (err) {
    console.warn(`[JqNormalizer] Failed to parse .validation-config.json: ${err.message}`);
    return null;
  }
}

// Export for testing
export { DEFAULT_STRIP_CONFIG, normalizeHarJs, normalizeValue };
