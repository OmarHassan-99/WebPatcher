# Schemathesis Comparison Strategy: Focusing on Behavior

When comparing raw Schemathesis runs, direct JSON diffing is extremely noisy. Schemathesis generates randomized inputs (UUIDs, random string lengths, boundary numbers) which means the exact request and response bytes will almost never match between two runs, even if the API's behavior hasn't changed.

## The Idea: Behavioral Bucketing

Instead of comparing *values*, we compare **categories of behavior**.

1.  **Input Bucketing**: We look at the generated request body and classify it into a behavior bucket. For example, instead of tracking that the `name` field was `"a" x 1000`, we classify the input as `name_too_long`. If it's `{"name": 123}`, we classify it as `name_wrong_type`.
2.  **Response Bucketing**: We look at the response status and error messages. Instead of tracking the exact `400 Bad Request` JSON, we classify it as `validation:name_required` or `validation:too_long`.
3.  **Cross-Tabulation comparison**: By grouping the data, we can see distributions. "In the before run, 47 `valid_object` inputs resulted in `success`. In the after run, 20 `valid_object` inputs resulted in `success`." If these distributions shift significantly or new buckets appear, we know the API's actual logic changed. If the counts just fluctuate slightly, it's just fuzzing noise.

## Proposed Normalized JSON Shape

The normalization process takes the massive HAR file and turns each request/response pair into a tiny record:

```json
{
  "method": "POST",
  "path": "/api/contact",
  "inputCategory": "name_missing",
  "responseStatus": 400,
  "responseCategory": "validation:name_required"
}
```

## The Scripts

We have created three tools to handle this, located in `backend/scripts/`:

### 1. Beginner Level: `normalize.jq`
A simple `jq` script that extracts just the method, path, status, and a broad status category.
**File:** `backend/scripts/normalize.jq`

### 2. Beginner Level: `summarize.jq`
Takes the output of `normalize.jq` and aggregates it to show counts per endpoint.
**File:** `backend/scripts/summarize.jq`

### 3. Advanced Level: `schemathesis-compare.js`
A robust Node.js script that parses the HAR files, performs deep behavioral bucketing of inputs and responses, and mathematically compares the before/after distributions to determine if differences are real or just noise.
**File:** `backend/scripts/schemathesis-compare.js`

---

## Example Commands

### Using the Beginner `jq` Scripts
To see a clean, noise-free summary of a single run:
```bash
jq -f backend/scripts/normalize.jq report.har | jq -f backend/scripts/summarize.jq
```

### Using the Advanced Comparison CLI
To compare a before and after run:
```bash
# Compare runs and output a human-readable table with a final verdict
node backend/scripts/schemathesis-compare.js before.har after.har

# Output the comparison as raw JSON for CI/CD pipelines
node backend/scripts/schemathesis-compare.js before.har after.har --json

# Just summarize a single run
node backend/scripts/schemathesis-compare.js --summarize before.har
```

---

## How to Read the Results

When you run `schemathesis-compare.js before.har after.har`, you will see an output like this:

```text
══════════════════════════════════════════════════════════════════════
 COMPARISON: BEFORE vs AFTER
══════════════════════════════════════════════════════════════════════

  🔴 POST:/api/contact  → BEHAVIORAL_CHANGE
     status 400: 100 → 33  (↓67, -67%)
     status 200: 28 → 8  (↓20, -71%)
     validation:both_required: 47 → 6  (↓41)
     [array_body] → [validation:both_required]: 20 → 2  (Δ-18)
     [valid_object] → [success]: 28 → 8  (Δ-20)
```

**Understanding the reading:**
- **`status 400: 100 → 33`**: The server returned status `400` 100 times before, and 33 times after. This is a massive shift.
- **`validation:both_required: 47 → 6`**: The response bucket categorized as complaining about both fields being required dropped significantly.
- **`[valid_object] → [success]: 28 → 8`**: (Input → Response cross-tabulation). When Schemathesis sent a perfectly valid object, it succeeded 28 times before, but only 8 times after.

**The Verdicts:**
The tool calculates absolute counts and percentages to assign a verdict per endpoint:
- 🟢 **`NEW_ENDPOINT`** / 🔴 **`MISSING_ENDPOINT`**: A route appeared or disappeared.
- 🔴 **`BEHAVIORAL_CHANGE`**: The distributions shifted heavily (e.g., > 5% shift or completely new error categories appeared). This means your app code changed.
- 🟡 **`MINOR_SHIFT`**: Borderline changes. Worth a glance.
- ⚪ **`FUZZING_NOISE`**: Minor fluctuations (e.g., 50 -> 48 successes). The tool ignores this.
- ✅ **`IDENTICAL`**: No differences found.
