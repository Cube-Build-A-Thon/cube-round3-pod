# Pack Manager Evaluation Report

## Scope

This report evaluates the Pack Manager vision and reconciliation workflow on the
50 held-out fixtures defined in `agent/evals/data/test_fixtures.json`. The fixtures
cover perfect packs, missing items, variant swaps, quantity errors, unexpected
items, stacked/overlapping products, reflective packaging, small products, and
severe occlusion across nine image batches.

The operational classes are:

- `PASS`: the package can be sealed.
- `STOP_AND_FIX`: the package contents do not match the order.
- `UNCERTAIN`: the image does not support a reliable decision.

The implementation internally uses `SEAL`; the evaluation harness normalizes
`SEAL` to `PASS` before comparison.

## Evaluation Sources

### Run 1: local headless attempt

Stored in `agent/evals/results/run_1.json`.

- Total fixtures: 50
- Evaluated: 17
- Errors: 33
- Error cause: Groq rate limiting and incomplete external inference execution
- This run is retained as the first attempt and is not used as the primary accuracy claim.

### Run 2: successful vision-model run

Stored in `agent/evals/results/run_2.json`.

- Run ID: `eval-run-2026-10-01-01`
- Model: `meta-llama/llama-3.2-90b-vision-instruct`
- Total fixtures: 50
- Source-reported accuracy: 95.45%
- Source-reported Cohen's kappa: 0.88
- Source-reported average latency: 1845 ms

The second run contains per-fixture detected items, AI verdicts, ground-truth
verdicts, latency, and discrepancies. Its summary reports 7 true positives, 35
true negatives, 1 false positive, 1 false negative, and 6 uncertain cases.

## Human Labelling

Each fixture in `agent/evals/data/test_fixtures.json` contains:

- `labeler_a`
- `labeler_b`
- `ground_truth.consensus_label`
- `ground_truth.all_items_present`
- `ground_truth.quantities_correct`
- `ground_truth.occlusion_state`

There are 50 paired human labels and no missing pairs. The three labeler
verdict disagreements are:

| Fixture | Labeler A | Labeler B | Consensus |
|---|---|---|---|
| `1.d` | `STOP_AND_FIX` | `UNCERTAIN` | `UNCERTAIN` |
| `2.b` | `STOP_AND_FIX` | `PASS` | `STOP_AND_FIX` |
| `8.f` | `UNCERTAIN` | `STOP_AND_FIX` | `UNCERTAIN` |

Using the standard nominal Cohen's kappa formula over the 50 final verdict
pairs, the recomputed value is **0.8738** (approximately **0.87**). The imported
run summary reports **0.88**. The small difference is recorded rather than
silently overwritten.

## Detailed-Record Recalculation

The imported run summary and detailed records contain two discrepancies:

- Summary average latency: `1845 ms`; arithmetic mean of the 50 detailed
  `latency_ms` values: `1724.6 ms`.
- Summary uncertain count: `6`; detailed records contain 8 `UNCERTAIN`
  verdicts: `1.d`, `3.f`, `4.f`, `5.f`, `6.f`, `7.f`, `8.f`, and `9.f`.

The report preserves both source-reported and recomputed values because the
engineering rules require transparent methodology.

## Failure Modes

The detailed second run contains one incorrect final verdict:

| Fixture | Expected | AI | Failure mode |
|---|---|---|---|
| `2.b` | `STOP_AND_FIX` | `PASS` | Two towels were stacked and the model failed to detect the concealed third towel described by the fixture result. |

Other named cases include:

- Severe occlusion correctly routed to `UNCERTAIN` in the detailed results.
- Variant swaps such as navy versus light-blue towels and red versus black mugs.
- Extra unlisted objects such as tape dispensers, keys, apples, belts, earphones,
  makeup sponges, screws, and scissors.
- Quantity errors involving stacked, overlapping, rounded, reflective, and small
  objects.

## Per-Check Reporting Limitation

The imported `run_2.json` artifact exposes detected items and final verdicts, but
it does not include the model's independent `all_items_present` and
`quantities_correct` boolean outputs for each fixture. Therefore, defensible
false-positive/false-negative counts for those two checks cannot be reconstructed
without inventing model outputs.

The dataset does contain the two human ground-truth booleans, and the
reconciliation engine exposes both checks for future runs. A complete per-check
report requires the vision runner to persist, for every fixture:

```json
{
  "all_items_present": true,
  "quantities_correct": false,
  "verdict": "STOP_AND_FIX"
}
```

This is an explicit evaluation gap, not an omitted result.

## Reproduction

From `submissions/nikhilagarwal03/agent`:

```powershell
node --env-file=.env.local node_modules/tsx/dist/cli.mjs evals/scripts/run_eval.ts
```

The harness reads the 50 fixtures, signs private S3 fixture URLs, sends one
batched image request per fixture to the configured Groq-compatible vision
client, runs deterministic reconciliation, computes confusion metrics, reports
Cohen's kappa when paired labels exist, and writes `evals/results/run_1.json`.

The imported successful external run is preserved separately as
`evals/results/run_2.json` and is the basis of the reported 95.45% result.

## Residual Risk

- The successful second-run artifact was produced by an external vision-model
  execution and is not reproducible from the current Groq quota in one quick run.
- Groq rate limiting caused 33 errors in the first local attempt.
- Per-check model outputs need to be persisted for complete presence/quantity FP/FN
  reporting.
- The current UI intentionally keeps captured images as base64 data in the
  verification flow, per the demo requirement; S3 upload is not part of the
  evaluation claim.
