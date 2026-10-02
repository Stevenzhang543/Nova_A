# Nova_A26.34 edit ledger

Engine26.34.0. Clean baseline:da2182569b7dddb227e7623ce38bf92485d88807. Requested destination:`releases/v26.34`. Project Format2/schema29 and public save envelopev2 stay compatible. Historical releases are preserved.

## Consequences checked before implementation

Save fixes address reproduced key loss, early cancellation mutation and duplicate serializer effects. Detached transactions are also guarded against project/session switching. Internal prototype-looking keys remain own data; public root key/slot normalization is retained. Arbitrary custom callback side effects remain outside rollback scope.

Particle preview stops changing authored autoplay. Camera follow uses actual zoomed/rotated viewport geometry. Physics sync separates native and display poses to prevent controller velocity edits from rewinding motion, while honoring deliberate transform/teleport/character/origin changes. Tests exercise current compiled WASM and serialized data.

UI changes retain existing shared geometry/SVGs/shell: every game surface owns unhandled wheel input, game UI consumes handled scroll, profiler separates measured/unavailable/estimated data, and font controls explain advanced metadata-only modes. No major feature/dependency is removed or introduced. Capturev2 and legacy fields remain compatible.

Current modules/tests pass their documented development scopes. Final qualification executes against frozen source and packaging independently checks exact versions, source/evidence/assets/native identity and hashes. No zero-bug, all-branch, universal hardware or clean-install claim.

## Files changed/added

This deterministic path-level manifest records every repository file changed or added for26.34. Diagnostic before/after reports are listed individually; generated build/cache/release outputs are described separately below.

- `Cargo.lock` — Advance existing machine/public engine authority or migration expectation to26.34.0; no project schema or dependency change.
- `Cargo.toml` — Advance existing machine/public engine authority or migration expectation to26.34.0; no project schema or dependency change.
- `README.md` — Point current version/badge/notes/ledger/audit/release destination to26.34.
- `crates/nova_format/src/lib.rs` — Advance existing machine/public engine authority or migration expectation to26.34.0; no project schema or dependency change.
- `docs/EDIT_LEDGER_26_34.md` — Record every changed/added file, reasons, consequences, verified scopes and deterministic manifest.
- `docs/NATIVE_HEADLESS_26_34.md` — Current versioned native physics-only JSONL protocol/limits/build/replay/evidence guidance; no scripted-server claim.
- `docs/RELEASE_NOTES_26_34.md` — Summarize compatible changes, evidence contracts/limits and all eleven delivery files.
- `docs/WEB_HOSTING_26_34.md` — Current versioned root/subpath/static hosting/manual/online-only/device/export deployment guidance; retainoptionalservice boundaries.
- `docs/engine/CAPABILITY_CATALOG.md` — Regenerate declared402 operations,61 registered kinds,169 Rhai APIs and208 graph definitions with ownership/primitive fields; separate declaration from passing evidence.
- `docs/engine/COMPETITOR_RESEARCH.md` — Add specific authoritative2026-10-01 five-engine workflow contracts and distinguish inferences/licensing/retrieval limitations.
- `docs/engine/ENGINE_CAPABILITY_AUDIT.md` — Update clean baseline, architecture/base/generated file distinctions, reproduced defects, consequences and acceptance boundaries.
- `docs/engine/FEATURE_MATRIX.md` — Classify every A–Z/AA family, granular five-engine workflow comparison, integrated owners, tested subsets and exact residual limits.
- `docs/engine/IMPLEMENTATION_ROADMAP.md` — Recordengine→UX→UIV2 progression, current defect closure, deferred scopes and exactv26.34 qualification/publication requirement.
- `docs/engine/SOURCE_INVENTORY.json` — Regenerate actual owned-source hashes/imports/symbols/tests after discovery parser correction; not all-branch certification.
- `docs/engine/TEST_MATRIX.md` — Map reproduced defects and representative/foundation/browser/native/manual/archive checks to actual evidence boundaries.
- `docs/ui/DECISIONS.md` — RecordUI014 evidence semantics andUI015 each-surface wheel ownership; explain cache/compatibility consequences.
- `docs/ui/MIGRATION.md` — Record26.34 localized tool/input integration and actual candidate visual qualification boundary.
- `docs/ui/UI_V2_PLAN.md` — Retain shared SVG/tokens/persistent shell, expose real font/profiler semantics and require actual functional/visual acceptance.
- `docs/ux/UX_AUDIT.md` — Recordchanged-user-flow findings, practical authoring/save/play/export acceptance and truthful tool/host limits.
- `docs/ux/UX_ROADMAP.md` — Track completed integration decisions and explicit deferred matching-device/architecture work.
- `manual/MANUAL.de.md` — Identify current engine26.34.0 and add localized26.34 save/input/preview/camera/font/profiler/new-user workflow guidance; preserve prior lessons.
- `manual/MANUAL.en.md` — Identify current engine26.34.0 and add localized26.34 save/input/preview/camera/font/profiler/new-user workflow guidance; preserve prior lessons.
- `manual/MANUAL.zh-CN.md` — Identify current engine26.34.0 and add localized26.34 save/input/preview/camera/font/profiler/new-user workflow guidance; preserve prior lessons.
- `manual/index.html` — Identify current engine26.34.0 and add localized26.34 save/input/preview/camera/font/profiler/new-user workflow guidance; preserve prior lessons.
- `package.json` — Advance existing machine/public engine authority or migration expectation to26.34.0; no project schema or dependency change.
- `reference-projects/projects/creator-v2634-mixed-game/README.md` — Add26.34 copy of existing coherent mixed-game or renderer-disabled authority reference with matching project/name/engine/expected/control metadata; preserve old reference.
- `reference-projects/projects/creator-v2634-mixed-game/expected-output.json` — Add26.34 copy of existing coherent mixed-game or renderer-disabled authority reference with matching project/name/engine/expected/control metadata; preserve old reference.
- `reference-projects/projects/creator-v2634-mixed-game/project.nova` — Add26.34 copy of existing coherent mixed-game or renderer-disabled authority reference with matching project/name/engine/expected/control metadata; preserve old reference.
- `reference-projects/projects/creator-v2634-mixed-game/test-controls.json` — Add26.34 copy of existing coherent mixed-game or renderer-disabled authority reference with matching project/name/engine/expected/control metadata; preserve old reference.
- `reference-projects/projects/server-v2634-headless-authority/README.md` — Add26.34 copy of existing coherent mixed-game or renderer-disabled authority reference with matching project/name/engine/expected/control metadata; preserve old reference.
- `reference-projects/projects/server-v2634-headless-authority/expected-output.json` — Add26.34 copy of existing coherent mixed-game or renderer-disabled authority reference with matching project/name/engine/expected/control metadata; preserve old reference.
- `reference-projects/projects/server-v2634-headless-authority/project.nova` — Add26.34 copy of existing coherent mixed-game or renderer-disabled authority reference with matching project/name/engine/expected/control metadata; preserve old reference.
- `reference-projects/projects/server-v2634-headless-authority/test-controls.json` — Add26.34 copy of existing coherent mixed-game or renderer-disabled authority reference with matching project/name/engine/expected/control metadata; preserve old reference.
- `reports/phase2/26.34/input-ownership-before.json` — Preserve actual before/after module failure evidence with source hashes and explicit host scope; not a source-bound final qualification substitute.
- `reports/phase2/26.34/input-ownership.json` — Preserve actual before/after module failure evidence with source hashes and explicit host scope; not a source-bound final qualification substitute.
- `reports/phase2/26.34/input-svg-before.json` — Preserve actual before/after module failure evidence with source hashes and explicit host scope; not a source-bound final qualification substitute.
- `reports/phase2/26.34/native-axis-before.json` — Preserve actual before/after module failure evidence with source hashes and explicit host scope; not a source-bound final qualification substitute.
- `reports/phase2/26.34/native-character-before.json` — Preserve actual before/after module failure evidence with source hashes and explicit host scope; not a source-bound final qualification substitute.
- `reports/phase2/26.34/native-interpolation-before.json` — Preserve actual before/after module failure evidence with source hashes and explicit host scope; not a source-bound final qualification substitute.
- `reports/phase2/26.34/performance-evidence-before.json` — Preserve actual before/after module failure evidence with source hashes and explicit host scope; not a source-bound final qualification substitute.
- `reports/phase2/26.34/performance-evidence.json` — Preserve actual before/after module failure evidence with source hashes and explicit host scope; not a source-bound final qualification substitute.
- `reports/phase2/26.34/render-media-before.json` — Preserve actual before/after module failure evidence with source hashes and explicit host scope; not a source-bound final qualification substitute.
- `reports/phase2/26.34/save-project-race-before.json` — Preserve actual before/after module failure evidence with source hashes and explicit host scope; not a source-bound final qualification substitute.
- `reports/phase2/26.34/save-transactions-before.json` — Preserve actual before/after module failure evidence with source hashes and explicit host scope; not a source-bound final qualification substitute.
- `scripts/audit-engine-source.mjs` — Index variable declarations including exported const/function expressions; declarations remain discovery evidence.
- `scripts/catalog-engine-capabilities.mjs` — Read current package version for generated catalog instead of stale26.33 headline.
- `scripts/lib/browserUserAudit.mjs` — Allow explicit26.34 qualification while retaining version/source/build/development distinctions.
- `scripts/lib/milestoneAuditContext.mjs` — Extend current qualification target through26.34 without relabelling retained regression origins.
- `scripts/package-release.ps1` — Publish26.34+ into v-prefixed folders while preserving31–33 historical naming and exact target/immutability guards.
- `scripts/prepare-release-26.34.mjs` — Derive immutable packaging contracts, validate current reference identities and select13 linked gates with8 reasoned omissions and pinned tools.
- `scripts/preserve-v26.34-regression-evidence.mjs` — Preserve the nine actual earlier failed-regression reports inside final evidence, with original times/versions/source hashes; preservation success does not relabel failed assertions.
- `scripts/qualify-v26.34-scoped.mjs` — Execute fresh relevant module/browser checks, correct report env paths, embed screenshots/downloaded files and aggregate honest source-bound product evidence.
- `scripts/verify-v26.12-release-tooling.mjs` — Execute actual publication guard against current v26.34 and both historical folder layouts.
- `scripts/verify-v26.34-authoring-user.mjs` — Actual fresh project, real SVG chooser/binding, nested prefab creation/reuse, history/revert and downloaded save/reopen acceptance.
- `scripts/verify-v26.34-game-scenarios.mjs` — Production template migration/save/reopen and real compiled-WASM platformer/top-down/UI scenarios; native interpolation/transform authority regression; host limitations explicit.
- `scripts/verify-v26.34-input-ownership.mjs` — Seven InputManager/named-action wheel ownership checks with controlled HTML/SVG targets; browser integration separate.
- `scripts/verify-v26.34-input-user.mjs` — Actual normal authored ScrollPanel/Rhai counter/native TextInput/Inspector/Design/Game/keyboard and actual toolbar SVG browser fixture, screenshots and downloads; validate fixture via real project/Rhai parser; also inspect profiler evidence and actual font availability/containment with screenshots.
- `scripts/verify-v26.34-native-headless.mjs` — Versioned actual native physics JSONL process replay/query/rejection/disposal/window/version/hash acceptance; scope remains physics-only.
- `scripts/verify-v26.34-performance-evidence.mjs` — Eight real profiler/capture checks for empty/invalid/unavailable/estimated/measured/serialized/comparison semantics.
- `scripts/verify-v26.34-reference-game.mjs` — Current copied reference edited through real code/graph/history/save/reopen; exact exported script and real screenshot-guided completion/restart.
- `scripts/verify-v26.34-render-media.mjs` — Nine actual particle preview/serialization/reset and camera zoom/rotation/subviewport/read-only regressions.
- `scripts/verify-v26.34-save-transactions.mjs` — 15 actual-module regressions for exact keys/prototype data/snapshot/cancellation/corruption and stale project load/commit.
- `scripts/verify-v26.34-static-host-user.mjs` — Versioned actual root/subpath editor/PWA/relocated project/downloaded ZIP/player/source-parity acceptance.
- `src-tauri/Cargo.lock` — Advance existing machine/public engine authority or migration expectation to26.34.0; no project schema or dependency change.
- `src-tauri/Cargo.toml` — Advance existing machine/public engine authority or migration expectation to26.34.0; no project schema or dependency change.
- `src-tauri/tauri.conf.json` — Advance existing machine/public engine authority or migration expectation to26.34.0; no project schema or dependency change.
- `src/components/EditorBottomPanel.vue` — Add accessible localized font availability note with existing hint styling; retain all stored font fields.
- `src/components/ProfilerPanel.vue` — Show localized unavailable/estimated/scoped measured capture results and accurate CPU-submission input label using existing shared controls.
- `src/components/WorldCanvas.vue` — Mark game input canvases and forward unhandled wheel once before browser prevention; game UI consumes handled scrolling.
- `src/editor/fontImportCopy.ts` — Provide EN/DE/ZH copy distinguishing browser font rendering from metadata-only advanced modes, using existing locale preference.
- `src/i18n.ts` — Add EN/DE/ZH profiler availability/estimate/measurement-scope/input-boundary labels.
- `src/projects/projectFormat.ts` — Advance existing machine/public engine authority or migration expectation to26.34.0; no project schema or dependency change.
- `src/renderer/cameraMath.ts` — Share viewport half-extents using actual viewport and scale; preserve visible-world bounds.
- `src/renderer/sceneRenderer.ts` — Compute camera follow dead zones in rotated local axes and actual zoom/subviewport extents.
- `src/runtime/input.ts` — Exclude consumed and native/editor/unrelated HTML/SVG DOM wheel events; accept each marked game surface and preserve programmatic host input.
- `src/runtime/particles.ts` — Keep one-shot completion in runtime state and preserve authored autoplay during editor preview.
- `src/runtime/performanceTools.ts` — Reject empty/invalid measured captures, expose unavailable/estimated statuses, certify supported measured checks only and reject comparisons without evidence; preserve capturev2/legacy fields.
- `src/runtime/saveGame.ts` — Preserve exact nested own-data map keys; stage loads/migrations and use one serializer snapshot; check cancellation/session/project before publish; keep v2/public names compatible; clear stale metadata.
- `src/world/World.ts` — Retain current solver pose separately from interpolated display record so velocity/collider/rotation changes cannot rewind movement; keep explicit transform/teleport/character/origin operations; clear cache on destruction/reset.
- `tests/fixtures/migrations/public-schema-expected.json` — Advance existing machine/public engine authority or migration expectation to26.34.0; no project schema or dependency change.

## Generated outputs

Calendar setter also updates generatednova_core/pkg/package.json; real builds regenerateWASM/dist/native products. .cache contains local logs/diagnostics. release-audits contains actual fresh qualification reports/PNG/downloads, immutable source candidates and evidence receipts outside the source inventory. Packaging writes only the eleven validated delivery files to releases/v26.34. These outputs are reproducible and separately hashed; no old release is overwritten.
