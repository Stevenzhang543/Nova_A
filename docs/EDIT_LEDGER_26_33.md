# Nova_A 26.33 Phase II edit ledger

## Investigation setup

- scripts/audit-engine-source.mjs: reproducible owned-source hashes/imports/symbol discovery and existing test-entrypoint references; no runtime behavior change.
- docs/engine/SOURCE_INVENTORY.json and CATEGORY_MAP.json: current source discovery evidence and category ownership.
- ENGINE_CAPABILITY_AUDIT.md: repository boundaries, initial traced contracts and unverified risks.
- FEATURE_MATRIX.md: initial category discovery, explicit pending competitor/behavior validation; no unsupported completeness claims.
- IMPLEMENTATION_ROADMAP.md: engine-first gates, acceptance and full 26.33 eleven-file release requirement.
- TEST_MATRIX.md: fresh baseline results and outstanding integration/game/release checks.
- docs/ux/UX_AUDIT.md and UX_ROADMAP.md: required later UX scope and sequencing; no interface redesign.

Existing release archives remain unchanged. Full baseline build regenerated ignored WASM/dist outputs.

## P0-HIERARCHY-01 implementation

- src/world/hierarchy.ts: index entries now retain entity identity and array index; cached hits validate current membership, stale/missing identities rebuild the lookup. Signed TRS math, cycle rules and reparent semantics are unchanged. Healthy repeated lookups remain O(1); malformed/missing parent lookups may require a rebuild.
- src/world/World.ts: invalidateRuntime clears the hierarchy index as well as solver/runtime state.
- scripts/verify-engine-foundations.mjs: seven production-module regression checks, including actual prefab reset, undo/redo, serialization, replacement/removal, mirrored conversion and reuse of the unchanged index. Baseline reproduces four failing cases; corrected source passes all seven. Browser integration remains a separate gate.
- docs/engine/COMPETITOR_RESEARCH.md: current official-source research register for all five requested engines, with deliberately bounded claims.

## Test evidence isolation

- scripts/lib/propertyAudit22.mjs: optional NOVA_AUDIT_REPORT_DIRECTORY redirects exploratory reports while preserving the original default, version gates, development flag, checks and qualification rules. This allows retained assertions to run against the current source without replacing historical report files. No game/editor behavior changes.

## Retained baseline follow-up

- scripts/verify-phase2-retained.mjs: runs 16 applicable retained module suites with current-source fingerprint, explicit development scope, separate logs/reports and failure-preserving summary. No assertions are skipped on failure.
- scripts/generate-v26.22-component-primitives.mjs: retain the existing Chinese source header in generated output and normalize Windows line endings for exact comparison. The failed baseline was header-only drift: all 59 component kinds / 595 primitive-field contract bodies were byte-identical after newline normalization. Full generated contract equality and runtime rejection tests remain required.
## Runtime integration evidence and P0-SAVE-01

- scripts/verify-v26.28-game-ui.mjs: optional report-directory override preserves historical reports; six current-module input/focus/localization checks pass.
- scripts/verify-v26.23-runtime-regressions.mjs: optional report-directory override and actual-version qualification guard; three hot-reload/debug/profiler checks pass without claiming legacy release qualification.
- scripts/verify-v26.23-language.mjs: same report isolation and actual-version qualification guard; fourteen native/WASM language checks pass.
- scripts/verify-engine-save.mjs: real-module regression suite with failure-injected storage, covering structured data, cleanup refusal, selected slots, custom serializers, interrupted writes, backup recovery, stale recovery, migrations and cancellation. Original failures remain in reports/phase2/baseline.
- src/runtime/saveGame.ts: preserve the selected slot within the same project; new projects still default to slot1. Use the already-persisted `_custom.` namespace consistently so custom data restores without changing stored files. Optional cleanup failures no longer invalidate verified primary data. Clear obsolete recovery candidates after load/commit so recovery cannot overwrite a newer successful save. Required write/checksum failures still fail and retain recovery data; storage schema and public function signatures remain compatible.

## Browser integration / P0-INPUT-01

- scripts/lib/browserUserAudit.mjs: allow the requested 26.33 qualification target, optionally isolate reports with NOVA_AUDIT_REPORT_DIRECTORY, and never mark a failed browser run as qualified. Existing assertions and defaults remain.
- scripts/verify-engine-workflows.mjs: real browser creation, downloaded save/reopen, asset and scene comparison, rendered playback, top-down keyboard movement and stop restoration for three representative starters. Embedded JSON assets are compared structurally because import canonicalizes object key order; every field remains checked. Optional single-template selection is diagnostic only.
- src/components/ToolBar.vue: authoring keyboard shortcuts apply only in Edit mode. Previously W selected the Move tool and prevented gameplay input in the Design viewport while playing; runtime and paused sessions now retain their game controls. Mouse toolbar behavior is unchanged. Actual failed movement evidence is preserved before rerunning.
- docs/engine/CATEGORY_MAP.json: correct the workspace owner to editor/workspaces.ts and remove its resolved-path warning.
- docs/engine/TEST_MATRIX.md and IMPLEMENTATION_ROADMAP.md: record completed baseline and focused integration checks; remaining game/UX/release gates remain explicit.

## P0-REGISTRY-01 and deeper verification

- src/world/componentRegistry.ts: register existing WeldJoint2D, RopeJoint2D and MotorJoint2D. This repairs blueprint composition, project validation descriptions and runtime component toggles without changing solver implementations or serialized kinds. Stable catalog count becomes 61 (including the separate Rope2D scene-connection descriptor); primitive contract remains 59 component kinds and does not include Transform2D/scene connections.
- scripts/verify-engine-component-registry.mjs: reproduce all three composition failures and missing metadata, then verify actual composition, runtime disable/enable, serialization and project diagnostics. No new joint physics is claimed.
- scripts/verify-engine-workflows.mjs: extend real browser checks to platformer movement/jump, multilingual UI text and checkbox interaction, and a Rhai save scenario authored through Script Studio. Short fixed key durations were unreliable under software rendering; movement waits are bounded by observable simulation progress, without changing engine timing or reducing movement assertions.
- docs/engine/FEATURE_MATRIX.md, COMPETITOR_RESEARCH.md and ENGINE_CAPABILITY_AUDIT.md: add specific official comparisons, executed contracts and reproduced-fix details. Pending scopes remain explicit.
- reports/phase2: retain current-source export, navigation, streaming and binding evidence; their reported scope distinguishes module fixtures, browser input and untested physical/native behavior.

## Capability inventory and release preparation

- scripts/catalog-engine-capabilities.mjs and docs/engine/CAPABILITY_CATALOG.md: derive the current 402 operations, 61 registered kinds, 169 Rhai APIs and 208 graph definitions with ownership/primitive fields; no catalog entry is misrepresented as a passing test.
- docs/ui/UI_V2_PLAN.md and docs/ux/UX_AUDIT.md: scoped integration plan and concrete workflow findings; preserve the completed UI rebuild. Engine roadmap/test matrix updated with measured and browser evidence.
- package.json, Cargo.toml, Cargo.lock, src-tauri/Cargo.toml, src-tauri/Cargo.lock, src-tauri/tauri.conf.json, src/projects/projectFormat.ts, crates/nova_format/src/lib.rs, tests/fixtures/migrations/public-schema-expected.json and generated nova_core/pkg/package.json: transactional version-authority update to 26.33 / 26.33.0. No format/schema bump; dynamic i18n labels already derive the authority and need no edit.
- scripts/package-release.ps1: output releases/26.33 without a directory v-prefix as requested. scripts/verify-release-package.ps1 accepts this layout and historical v-prefixed directories, retaining confinement and checksum checks.
- docs/RELEASE_NOTES_26_33.md: changes and qualification limits. docs/WEB_HOSTING_26_33.md and NATIVE_HEADLESS_26_33.md: retain existing platform instructions with current release/reference identity.

- README.md and README.zh-CN.md: link the current 26.33 investigation and distinguish the previous release.
- reference-projects/projects/creator-v2633-mixed-game and server-v2633-headless-authority: retain the working reference content with consistent 26.33 metadata and export names; previous references remain available.
- scripts/prepare-release-26.33.mjs, qualify-v26.33-scoped.mjs and verify-v26.33-native-headless.mjs: current release plan, focused regressions, browser workflow/layout/export checks and native CLI identity checks. Existing package evidence and freshness contracts remain enforced.
- scripts/lib/browserUserAudit.mjs: an explicit qualification-release argument enables qualification for the actual current build; ordinary exploratory runs remain unqualified.

- scripts/verify-v26.33-reference-game.mjs: real code edit/undo/redo, graph round-trip, save/reopen, exact exported script verification, screenshot-guided six-checkpoint completion and restart.
- scripts/verify-engine-foundations.mjs, verify-engine-save.mjs and verify-engine-component-registry.mjs: timestamp and isolated release report outputs allow their actual results to be embedded with freshness checks.
- scripts/verify-ui-rebuild-navigation-user.mjs: copied evidence uses the explicit qualification target rather than a hard-coded historical report.
- docs/engine/ENGINE_CAPABILITY_AUDIT.md, FEATURE_MATRIX.md and docs/ux/UX_ROADMAP.md: distinguish initial discovery, executed closures and outstanding broader validation.

- docs/ui/MIGRATION.md and DECISIONS.md: record current 197-route visual checks and the decision to repair owning systems while preserving the shared editor.
- docs/engine/TEST_MATRIX.md: replace stale pending labels with precise executed subsets.
- docs/EDIT_LEDGER_26_33.md: release-facing copy of this detailed ledger with an exhaustive deterministic path-level manifest.

## Files changed/added

Release 26.33, engine 26.33.0. This deterministic path-level manifest lists every modified or added authored file relative to the clean starting commit. Generated binaries and caches are excluded; diagnostic evidence is identified separately.
- `Cargo.lock` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `Cargo.toml` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `README.md` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `README.zh-CN.md` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `crates/nova_format/src/lib.rs` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/EDIT_LEDGER_26_33.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/NATIVE_HEADLESS_26_33.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/RELEASE_NOTES_26_33.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/WEB_HOSTING_26_33.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/engine/CAPABILITY_CATALOG.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/engine/CATEGORY_MAP.json` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/engine/COMPETITOR_RESEARCH.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/engine/EDIT_LEDGER_26_33.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/engine/ENGINE_CAPABILITY_AUDIT.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/engine/FEATURE_MATRIX.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/engine/IMPLEMENTATION_ROADMAP.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/engine/SOURCE_INVENTORY.json` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/engine/TEST_MATRIX.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/ui/DECISIONS.md` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/ui/MIGRATION.md` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/ui/UI_V2_PLAN.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/ux/UX_AUDIT.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `docs/ux/UX_ROADMAP.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `package.json` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `reference-projects/projects/creator-v2633-mixed-game/README.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `reference-projects/projects/creator-v2633-mixed-game/expected-output.json` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `reference-projects/projects/creator-v2633-mixed-game/project.nova` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `reference-projects/projects/creator-v2633-mixed-game/test-controls.json` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `reference-projects/projects/server-v2633-headless-authority/README.md` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `reference-projects/projects/server-v2633-headless-authority/expected-output.json` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `reference-projects/projects/server-v2633-headless-authority/project.nova` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `reference-projects/projects/server-v2633-headless-authority/test-controls.json` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/audit-engine-source.mjs` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/catalog-engine-capabilities.mjs` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/generate-v26.22-component-primitives.mjs` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/lib/browserUserAudit.mjs` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/lib/propertyAudit22.mjs` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/package-release.ps1` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/prepare-release-26.33.mjs` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/qualify-v26.33-scoped.mjs` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/verify-engine-component-registry.mjs` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/verify-engine-foundations.mjs` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/verify-engine-save.mjs` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/verify-engine-workflows.mjs` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/verify-phase2-retained.mjs` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/verify-release-package.ps1` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/verify-ui-rebuild-navigation-user.mjs` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/verify-v26.23-language.mjs` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/verify-v26.23-runtime-regressions.mjs` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/verify-v26.28-game-ui.mjs` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/verify-v26.33-native-headless.mjs` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `scripts/verify-v26.33-reference-game.mjs` — Added. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `src-tauri/Cargo.lock` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `src-tauri/Cargo.toml` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `src-tauri/tauri.conf.json` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `src/components/ToolBar.vue` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `src/projects/projectFormat.ts` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `src/runtime/saveGame.ts` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `src/world/World.ts` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `src/world/componentRegistry.ts` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `src/world/hierarchy.ts` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.
- `tests/fixtures/migrations/public-schema-expected.json` — Modified. Purpose and consequences are recorded in the entries above; audit documents distinguish measured scope and limits.

Diagnostic evidence under reports/phase2 retains original failures, current test results, screenshots and measured workloads; it is not relabeled as frozen-release qualification.

- `scripts/verify-v26.33-static-host-user.mjs` — Added. Current-version hosting/export entry point retains all original assertions. The first qualification run passed gameplay but correctly rejected the retained 26.32 test's development metadata; no report is relabeled and no assertion is weakened.

## Bundled manual correction

The candidate-2 manual gate caught stale current-release labels; all gameplay/native gates had passed. Update the current manual identity and add localized 26.33 save/input/prefab/joint/export guidance, retaining historical lessons.
- `manual/MANUAL.en.md` — Modified. Current 26.33 / 26.33.0 identity and localized reliability workflow guidance; existing teaching content retained.
- `manual/MANUAL.de.md` — Modified. Current 26.33 / 26.33.0 identity and localized reliability workflow guidance; existing teaching content retained.
- `manual/MANUAL.zh-CN.md` — Modified. Current 26.33 / 26.33.0 identity and localized reliability workflow guidance; existing teaching content retained.
- `manual/index.html` — Modified. Current 26.33 / 26.33.0 identity and localized reliability workflow guidance; existing teaching content retained.

## Final publication guard correction

The candidate-3 archive verifier passed, but the final publication guard still required the historical v-prefixed leaf. scripts/package-release.ps1 now validates the same releaseFolderName used to construct the destination, retaining exact parent confinement and immutable publication. No release was published by the failed attempt.
- `scripts/verify-v26.12-release-tooling.mjs` — Modified. Execute the actual publication guard for current and historical folder names so the mismatch cannot recur unnoticed.
