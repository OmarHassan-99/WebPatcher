#!/usr/bin/env node
import fs from "fs";
import path from "path";

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function pathOnly(url) {
  if (!url) return "/";
  try {
    const u = new URL(url);
    return u.pathname || "/";
  } catch {
    return url.split("?")[0] || "/";
  }
}

function classifyInput(entry) {
  const method = entry.request?.method || "GET";
  if (!["POST", "PUT", "PATCH"].includes(method)) return "no_body";
  const raw = entry.request?.postData?.text ?? "";
  if (!raw) return "empty_body";
  const parsed = safeParseJson(raw);
  if (parsed === null) return "unparseable_body";
  if (parsed === null) return "null_body";
  if (Array.isArray(parsed)) return "array_body";
  if (typeof parsed !== "object") return "scalar_body";

  const name = parsed.name;
  const message = parsed.message;
  const hasName = Object.prototype.hasOwnProperty.call(parsed, "name");
  const hasMessage = Object.prototype.hasOwnProperty.call(parsed, "message");

  const nameMissing = !hasName || name === null || (typeof name === "string" && name.trim() === "");
  const msgMissing = !hasMessage || message === null || (typeof message === "string" && message.trim() === "");
  if (nameMissing && msgMissing) return "both_fields_missing";
  if (nameMissing) return "name_missing";
  if (msgMissing) return "message_missing";

  if (typeof name !== "string") return "name_wrong_type";
  if (typeof message !== "string") return "message_wrong_type";
  if (name.length > 100) return "name_too_long";
  if (message.length > 1000) return "message_too_long";
  return "valid_object";
}

function classifyResponse(entry) {
  const status = entry.response?.status ?? 0;
  const txt = String(entry.response?.content?.text ?? "").toLowerCase();
  if (status >= 200 && status < 300) return "success";
  if (status === 405) return "method_not_allowed";
  if (status === 400) {
    if (/invalid\s*json|unexpected token|malformed json|json parse/.test(txt)) return "validation:invalid_json";
    if (/both.*required|name.*required.*message.*required|message.*required.*name.*required/.test(txt)) return "validation:both_required";
    if (/name.*required/.test(txt)) return "validation:name_required";
    if (/message.*required/.test(txt)) return "validation:message_required";
    if (/name.*too\s*long|maxlength.*name|name.*length/.test(txt)) return "validation:name_too_long";
    if (/message.*too\s*long|maxlength.*message|message.*length/.test(txt)) return "validation:message_too_long";
    return "validation:invalid_request_body";
  }
  return "other";
}

function normalizeHar(har) {
  return (har.log?.entries || []).map((e) => ({
    method: e.request?.method || "GET",
    path: pathOnly(e.request?.url || ""),
    inputCategory: classifyInput(e),
    responseStatus: e.response?.status ?? 0,
    responseCategory: classifyResponse(e),
  }));
}

function countBy(arr, keyFn) {
  const out = {};
  for (const x of arr) {
    const k = keyFn(x);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function summarize(records) {
  const map = new Map();
  for (const r of records) {
    const ep = `${r.method}:${r.path}`;
    if (!map.has(ep)) map.set(ep, []);
    map.get(ep).push(r);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([endpoint, rows]) => ({
    endpoint,
    total: rows.length,
    byStatus: countBy(rows, (r) => String(r.responseStatus)),
    byInputCategory: countBy(rows, (r) => r.inputCategory),
    byResponseCategory: countBy(rows, (r) => r.responseCategory),
    inputToResponse: (() => {
      const x = {};
      for (const r of rows) {
        x[r.inputCategory] ||= {};
        x[r.inputCategory][r.responseCategory] = (x[r.inputCategory][r.responseCategory] || 0) + 1;
      }
      return x;
    })(),
  }));
}

function rates(counts, total) {
  if (!total) return {};
  const out = {};
  for (const [k, v] of Object.entries(counts || {})) out[k] = v / total;
  return out;
}

function unionKeys(a = {}, b = {}) {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])];
}

function tvDistance(p = {}, q = {}) {
  let sum = 0;
  for (const k of unionKeys(p, q)) sum += Math.abs((p[k] || 0) - (q[k] || 0));
  return sum / 2;
}

function compareSummaries(beforeSummary, afterSummary) {
  const bMap = new Map(beforeSummary.map((x) => [x.endpoint, x]));
  const aMap = new Map(afterSummary.map((x) => [x.endpoint, x]));
  const endpoints = [...new Set([...bMap.keys(), ...aMap.keys()])].sort();

  return endpoints.map((ep) => {
    const b = bMap.get(ep);
    const a = aMap.get(ep);
    if (!b) return { endpoint: ep, verdict: "NEW_ENDPOINT", note: "Endpoint only in after run" };
    if (!a) return { endpoint: ep, verdict: "MISSING_ENDPOINT", note: "Endpoint only in before run" };

    const bn = b.total;
    const an = a.total;
    const sampleRatio = bn > 0 ? an / bn : 0;
    const sampleMismatch = sampleRatio < 0.6 || sampleRatio > 1.67;
    const inputMixShift = tvDistance(rates(b.byInputCategory, bn), rates(a.byInputCategory, an));

    const inputs = unionKeys(b.byInputCategory, a.byInputCategory);
    const perInput = [];
    for (const input of inputs) {
      const bCounts = b.inputToResponse[input] || {};
      const aCounts = a.inputToResponse[input] || {};
      const bIn = Object.values(bCounts).reduce((s, n) => s + n, 0);
      const aIn = Object.values(aCounts).reduce((s, n) => s + n, 0);
      if (bIn < 5 || aIn < 5) continue;
      perInput.push({
        inputCategory: input,
        beforeN: bIn,
        afterN: aIn,
        outcomeShiftTV: tvDistance(rates(bCounts, bIn), rates(aCounts, aIn)),
      });
    }
    const majorPerInputShifts = perInput.filter((x) => x.outcomeShiftTV >= 0.3).length;

    const newRespCats = Object.keys(a.byResponseCategory).filter((k) => !(k in b.byResponseCategory));
    const invalidJsonOnlyNew =
      newRespCats.length > 0 && newRespCats.every((k) => k === "validation:invalid_json");

    let verdict = "INCONCLUSIVE";
    if (bn < 30 || an < 30) verdict = "INCONCLUSIVE";
    else if (majorPerInputShifts > 0) verdict = "LIKELY_REAL_BEHAVIOR_CHANGE";
    else if (sampleMismatch && inputMixShift >= 0.2) verdict = "LIKELY_SAMPLE_MIX_CHANGE";
    else if (invalidJsonOnlyNew && majorPerInputShifts === 0) verdict = "LIKELY_CLASSIFICATION_CHANGE";
    else if (!sampleMismatch && inputMixShift < 0.1 && majorPerInputShifts === 0) verdict = "NO_MEANINGFUL_BEHAVIOR_CHANGE";

    return {
      endpoint: ep,
      beforeTotal: bn,
      afterTotal: an,
      sampleRatio,
      sampleMismatchWarning: sampleMismatch,
      inputMixShiftTV: inputMixShift,
      statusBefore: b.byStatus,
      statusAfter: a.byStatus,
      responseBucketsBefore: b.byResponseCategory,
      responseBucketsAfter: a.byResponseCategory,
      perInputOutcomeComparison: perInput,
      majorPerInputShifts,
      newResponseBuckets: newRespCats,
      verdict,
      note: sampleMismatch
        ? "Sample sizes differ significantly; raw count deltas are noisy."
        : "Sample sizes are comparable.",
    };
  });
}

function printSummary(summary, title) {
  console.log(`\n${"═".repeat(76)}\n ${title}\n${"═".repeat(76)}`);
  for (const e of summary) {
    console.log(`\n${e.endpoint} (n=${e.total})`);
    console.log(`  status: ${Object.entries(e.byStatus).map(([k, v]) => `${k}×${v}`).join("  ")}`);
    console.log(`  input : ${Object.entries(e.byInputCategory).map(([k, v]) => `${k}×${v}`).join("  ")}`);
    console.log(`  resp  : ${Object.entries(e.byResponseCategory).map(([k, v]) => `${k}×${v}`).join("  ")}`);
  }
}

function printComparison(comp) {
  console.log(`\n${"═".repeat(76)}\n COMPARISON (behavioral)\n${"═".repeat(76)}`);
  const compacted = {
    lowSampleUnchanged: 0,
  };

  for (const r of comp) {
    if (
      r.verdict === "INCONCLUSIVE" &&
      (r.beforeTotal ?? 0) < 5 &&
      (r.afterTotal ?? 0) < 5 &&
      (r.inputMixShiftTV ?? 0) === 0
    ) {
      compacted.lowSampleUnchanged++;
      continue;
    }

    console.log(`\n${r.endpoint} -> ${r.verdict}`);
    if (r.beforeTotal != null) {
      console.log(`  samples: before=${r.beforeTotal}, after=${r.afterTotal}, ratio=${r.sampleRatio.toFixed(2)}`);
      if (r.sampleMismatchWarning) console.log(`  ⚠ ${r.note}`);
      console.log(`  input-mix shift (TV): ${r.inputMixShiftTV.toFixed(3)}`);
      if ((r.newResponseBuckets || []).length) {
        console.log(`  new response bucket(s): ${r.newResponseBuckets.join(", ")}`);
      }
      if ((r.perInputOutcomeComparison || []).length) {
        for (const x of r.perInputOutcomeComparison.slice(0, 8)) {
          console.log(`  [${x.inputCategory}] shiftTV=${x.outcomeShiftTV.toFixed(3)} (before=${x.beforeN}, after=${x.afterN})`);
        }
      }
    } else if (r.note) {
      console.log(`  ${r.note}`);
    }
  }

  if (compacted.lowSampleUnchanged > 0) {
    console.log(
      `\n(omitted ${compacted.lowSampleUnchanged} low-sample endpoints with no observable shift)`,
    );
  }
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  if (!args.length || args.includes("--help")) {
    console.log(
      "Usage:\n" +
        "  node schemathesis-compare.js before.har after.har [--json]\n" +
        "  node schemathesis-compare.js --summarize report.har [--json]\n" +
        "  node schemathesis-compare.js --normalize report.har [--json]\n",
    );
    process.exit(0);
  }

  if (args[0] === "--normalize") {
    const har = JSON.parse(fs.readFileSync(args[1], "utf-8"));
    const n = normalizeHar(har);
    console.log(JSON.stringify(n, null, 2));
    return;
  }

  if (args[0] === "--summarize") {
    const har = JSON.parse(fs.readFileSync(args[1], "utf-8"));
    const s = summarize(normalizeHar(har));
    if (jsonMode) console.log(JSON.stringify(s, null, 2));
    else printSummary(s, `SUMMARY: ${path.basename(args[1])}`);
    return;
  }

  const beforePath = args[0];
  const afterPath = args[1];
  if (!beforePath || !afterPath) {
    console.error("Need before.har and after.har");
    process.exit(1);
  }

  const beforeHar = JSON.parse(fs.readFileSync(beforePath, "utf-8"));
  const afterHar = JSON.parse(fs.readFileSync(afterPath, "utf-8"));
  const beforeSummary = summarize(normalizeHar(beforeHar));
  const afterSummary = summarize(normalizeHar(afterHar));
  const comparison = compareSummaries(beforeSummary, afterSummary);

  if (jsonMode) {
    console.log(JSON.stringify({ before: beforeSummary, after: afterSummary, comparison }, null, 2));
  } else {
    printSummary(beforeSummary, `BEFORE: ${path.basename(beforePath)}`);
    printSummary(afterSummary, `AFTER: ${path.basename(afterPath)}`);
    printComparison(comparison);
  }
}

main();
