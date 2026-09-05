# 26.13 staged projection, navigation and wire persistence audit

Integration notice: this journal preserves the original staged findings, failure results and pending-at-the-time entries. The reviewed files are now integrated for the26.13 candidate after26.12 was finalized. Final scope/status is in [26.13 release notes](RELEASE_NOTES_26_13.md) and its executed-gate evidence. Historical measurements are not relabeled as production qualification.

This is isolated development evidence. Active 26.12 source, release metadata and release outputs were not changed by this subtask. The verifier builds two separate source bundles and runs both against the current production WASM engine; staging success is not release qualification.

## Before-edit analysis and reproduced correction

The staged projection replaces per-node full-token scans with indexed operator/comment lookups. Conversion assessment replaces repeated source-range scans with exact-range lookup. Neither optimization is intended to change graph source, comment ownership, editable field spans or program behavior.

The independent test reproduced a navigation defect in `fn value(){42}`: the `ExpressionStatement` and its `Literal` child share an identical source span. Looking up only start/end maps both regions to the literal node. The staged correction adds syntax kind to the exact-range key. Each region now selects the corresponding wrapper or value node while preserving generated code and diagnostics' existing smallest-range behavior.

The wire persistence extension adds optional ordered `reroutes` to Graph Format 1. It validates finite numeric coordinates within ±1,000,000 graph units, at most 64 points per edge and 100,000 points across the graph and routines. Graph endpoints still undergo normal compiler validation. Reroutes are presentation data and cannot change emitted Rhai.

## Reproduction

From the repository root, while 26.12 remains active:

```powershell
node .cache/development-v26.13/scripts/verify-v26.13-projection.mjs --source-root=.cache/development-v26.13
```

The test supports `--baseline-root=<source directory>` for a preserved previous-version source tree. Its default baseline is the active repository. After integration, provide the preserved baseline explicitly when making cross-version performance comparisons; two default active-root profiles are only a same-source verification. Reported source roots and runtime version make the context explicit.

The overlay resolves relative imports to staged files when present and otherwise to active source, normalizing Windows paths to avoid duplicate module identities. Baseline and candidate are built separately; a shared overlay build would incorrectly replace baseline dependencies with staged modules. Actual WASM execution compares commands, logs and properties, and checks expected runtime failure categories.

## Executed coverage

The staged run passes **44 checks**:

- All 34 shared Rhai fixtures compare original source, unchanged baseline/candidate projection and independent complete structural regeneration in the actual WASM runtime. Projection comparisons include field spans, comment ownership, source slices, scopes and binding IDs.
- Equal-span expression wrappers, nested blocks and interpolation select their matching node kind.
- Indexed operator edits and forced regeneration retain each original comment exactly once.
- Length-changing edits and linked-source prefixes produce current source locations; malformed edits remain invalid.
- Ordered wire points survive graph serialize/parse and do not change compiler output or runtime channels. The retained baseline graph parser can read the extended document and execute its unchanged source while ignoring its unknown presentation property.
- Malformed, nonfinite, out-of-range and over-64-point lists fail instead of being truncated. Empty/absent lists retain their distinction.
- Aggregate route/node/edge limits are checked before unrelated node configuration is normalized; a poison getter verifies that ordering. Exactly 100,000 route points are accepted by normalization. This boundary fixture intentionally tests persistence limits, not a semantically connected execution graph.
- Stale node and pin endpoints remain compiler errors even when their waypoint lists are valid.
- Exact 100-, 1,000- and 10,000-node projections and assessments stay within 64,000 source characters and 128 pins per node. Large arrays are spread across declarations to respect actual per-node pin limits; no limit is bypassed for benchmarking.

## Measured local timings

A successful isolated run used 26.12.0 production WASM and measured the following representative single local samples. Later runs naturally vary. These measure projection/assessment CPU work, not browser frame rates or interaction latency guarantees.

| Nodes | Source characters | Baseline projection | Staged projection | Baseline assessment | Staged assessment |
|---:|---:|---:|---:|---:|---:|
| 100 | 207 | 1.66 ms | 1.47 ms | 1.62 ms | 1.00 ms |
| 1,000 | 1,935 | 29.37 ms | 11.87 ms | 17.28 ms | 9.59 ms |
| 10,000 | 19,277 | 1,307.81 ms | 120.46 ms | 677.03 ms | 91.12 ms |

Latest raw check results, exact source roots/hashes, production WASM hash and unrounded measurements are in `reports/projection-verification.json` under this staging directory. Browser layout, measured card sizes, worker cancellation, route obstacle avoidance, visual interaction and release packaging are separate owners' checks.

## Exact edit ledger

1. **Added `scripts/verify-v26.13-projection.mjs` in staging:** independent source overlays/bundles, actual-WASM differential corpus, precise navigation/field/comment tests, waypoint persistence and hostile-boundary checks, plus bounded-size timing/report output.
2. **Changed staged `src/visual/graphSyntax.ts`:** adds syntax kind to the optimized exact-range index so equal-span wrappers navigate to their own nodes. It changes no emitted game behavior or source text.
3. **Added this document:** consequences, reproduced defect, exact test context, benchmark observations and complete subtask file ledger.
4. **Updated staged `docs/VERSION_26_13_WORKSPACES.md`:** records the corrected exact-span/kind navigation consequence in its existing projection row.

The broader staged operator/comment indexing and wire-type/aggregate-preflight implementation belongs to the coordinating task. This verifier found no further semantic or persistence failures in the exercised corpus and boundaries; it is not an exhaustive proof that all graph workflows are defect-free.
