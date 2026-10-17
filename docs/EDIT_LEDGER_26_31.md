# Nova_A 26.31 edit ledger

This ledger records source changes. Source-bound executed reports in the release-evidence archive determine completed release qualification.

| File | Change | Consequences checked |
|---|---|---|
| `src/components/EditorIcon.vue` | Add original, theme-colored SVG paths for common dock and view controls. | Decorative SVGs inherit accessible names from their owning buttons; no external assets, runtime authority, persistence, or physics changes. |
| `src/components/PanelMaximizeButton.vue` | Replace font-dependent maximize/restore glyphs with the shared SVG component. | Existing click handler, translated label/title, pressed state and panel identity remain. |
| `src/components/EditorBottomPanel.vue` | Size a collapsed dock from its actual header instead of forcing 34px around taller controls. | Expanded height and saved size remain unchanged; header can accommodate current font/control dimensions without overlapping adjacent UI. |
| `docs/EDIT_LEDGER_26_31.md` | Add this per-file change record. | Documentation only; qualification remains pending. |
| `src/components/ActionBar.vue` | Replace pause and step text glyphs with SVGs. | Play/session handlers, disabled state and existing translated accessible names remain unchanged. |

The bottom panel also uses SVG pin/unpin, clear and expand/collapse controls, with explicit translated accessible names and an expanded state. The shared icon component adds pause and step paths. No business actions were removed.

| File | Change | Consequences checked |
|---|---|---|
| `src/components/ManageWorkspace.vue` | Add translated titles and accessible labels to every section button. | Collapsed icon navigation remains identifiable; existing routing and dirty-state behavior retained. |
| `src/assets/editorReadability.css` | Extend content-width form stacking to studio cards; wrap descriptions, outputs, section labels and card actions; reduce Manage header height on short viewports. | Shared editor-only selectors exclude player UI, canvas, timeline and authored game layouts. The decorative stability banner hides on short screens; section descriptions and all navigation/actions remain. Browser regression required for shared container effects. |
| `scripts/set-calendar-release.mjs` | Fix version preflight rejecting translations already derived from `NOVA_RELEASE_NAME`. | First 26.31 attempt failed before changing any files. Validate the import and all six dynamic version/label entries; retain legacy literal support and atomic preflight/rollback. |
| `scripts/lib/browserUserAudit.mjs` | Allow 26.31 as an explicit current browser qualification target. | Preserve source-version assertion and original regression identity; historical passes are not reused. |

Version synchronization updates `package.json`, `Cargo.toml`, `Cargo.lock`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src/projects/projectFormat.ts`, `crates/nova_format/src/lib.rs`, and `tests/fixtures/migrations/public-schema-expected.json` to 26.31.0 (public label 26.31). The generated `nova_core/pkg/package.json` is synchronized by the existing script and rebuilt before release. Schema 29 and Project Format 2 are unchanged. Dynamic translation labels need no source edit.

| File(s) | Added, removed or corrected | Consequences checked |
|---|---|---|
| `src/components/WorkspaceBar.vue` | Replace workspace font glyphs with the shared SVGs and remove the unused glyph lookup. | Workspace selection, labels, titles, dirty markers and keyboard semantics remain. |
| `README.md` | Add current 26.31 links/badge, mark 26.30 and 26.10 workflow as historical, correct pinned Node/pnpm and saved engine version. | Documentation only; historical instructions retained under their own version. |
| `manual/MANUAL.en.md`, `manual/MANUAL.de.md`, `manual/MANUAL.zh-CN.md`, `manual/index.html` | Update current release/engine headings. | Existing localized lessons, anchors and behavior descriptions retained; manual audit checks structure. |
| `scripts/inventory-v26.31.mjs` | Add current-version source/feature catalog generation using the existing parser. | Historical outputs untouched; static indexing explicitly not semantic verification. |
| `scripts/generate-panel-inventory-26.31.mjs` | Add current-version full Vue template/CSS/field inventory and frozen-source check. | Includes every current Vue component and conditional branch; does not claim visual execution of every branch. |
| `scripts/verify-v26.31-layout-user.mjs` | Retain actual user navigation/save/localization suite; additionally inspect docked tools, collapsed-header containment and SVG accessible names. | Operates disposable browser projects; expected project mutations are verified by downloaded save. |
| `scripts/verify-v26.31-static-host-user.mjs` | Add current-version root/subpath deployment and downloaded-game regression from the retained suite. | Executes current source and actual downloaded output; older baseline script untouched. |
| `scripts/prepare-release-26.31.mjs` | Add scoped qualification plan derived from reviewed existing artifact contracts, explicit omissions and pinned tools. | Keeps source freeze, actual build/report freshness and artifact hashes; no historical report relabeling. |
| `scripts/qualify-v26.31-scoped.mjs` | Execute workspace/panel/browser checks and collect actual source-bound reports/screenshots; verify product prerequisites. | Fails on missing/stale/failed reports; does not set global defect count to zero. |
| `docs/SOURCE_INVENTORY_26_31.json`, `docs/SOURCE_MAP_26_31.md` | Generate full source/config/fixture hashes, symbols, imports and ownership map. | Static scope only; generated files updated after final edits. |
| `docs/FEATURE_INVENTORY_26_31.md`, `docs/EDIT_ROUTE_INVENTORY_26_31.json` | Generate all registered operations/components/Rhai/graph features and declared edit routes. | Declared routes explicitly distinguished from executed coverage. |
| `docs/PANEL_INVENTORY_26_31.md`, `docs/FIELD_BINDING_INVENTORY_26_31.json` | Generate each Vue panel's branches/styles/hosts/control bindings. | Exact source hashes; no blanket all-state UI claim. |
| `docs/RELEASE_NOTES_26_31.md` | Add release changes, artifact requirements and verification/platform limits. | No unexecuted check predeclared passed. |
| `docs/ISSUE_CLOSURE_26_31.md` | Add architecture, environment, concrete defects, corrections and audit boundaries. | Explicitly states that all-source semantic review and zero-defect guarantees are not achieved. |
| `docs/COMPETITIVE_REVIEW_26_31.md` | Record actual Godot reference reads and design/math decisions. | No third-party code/art copied; no unverified solver or tolerance replacement. |
| `docs/WEB_HOSTING_26_31.md` | Carry forward applicable static-host/online-only instructions under current release identity. | No hosting behavior or offline support changed. |
| `reference-projects/projects/creator-v2631-mixed-game/*`, `reference-projects/projects/server-v2631-headless-authority/*` | Add copies of retained mixed-game and renderer-disabled authority references with current metadata and matching expected controls. | Authored gameplay and numeric values retained; original references unchanged; these are verification fixtures, not new gameplay features. |

Generated build/evidence outputs are `nova_core/pkg`, `dist`, Cargo/Tauri targets, current `release-audits`, immutable candidate snapshots under `.cache/release-snapshots`, and the eleven release files. Their exact file manifests and checksums are carried by release evidence; generated binaries are rebuilt, never renamed from an earlier release. No existing engine feature, authored animation or historical release was removed.

Candidate 1's authority check exposed stale authored names in the new reference copies (the engine version was correct and export succeeded under the retained name). Corrected `projectMetadata.name`, `manifest.name`, `projectSettings.build.gameName`, and `projectName` in both new `project.nova` files; `scripts/prepare-release-26.31.mjs` now validates all five identity fields before starting expensive builds. This is a fixture-preparation correction, not an exporter defect. The failed first qualification is retained; the corrected source requires a new immutable candidate and fresh qualification.

Candidate 2 passed all thirteen declared gates. Final environment review also established broken automatic CI commands, requiring candidate 3:

| File | Correction and consequence |
|---|---|
| `package.json` | Add `audit:environment`; make default `audit` run current type/manual/template/hygiene/environment checks rather than require 26.10 release evidence. Individual historical scripts remain available. |
| `.github/workflows/ci.yml` | Change explicit Rust setup from 1.88.0 to the repository's 1.92.0 pin. |
| `.github/workflows/nova-validation.yml` | Add pinned Rust setup and replace the audit that demands 4.0.0 with current manual/environment checks; preserve type and Rust tests. |
| `.github/workflows/release-matrix.yml` | Pin both Rust setup actions; replace the ignored `--android-contract` argument to a 4.0.0-only audit with the actual export-template verifier and accurately name that job. No Android certification is claimed. |
| `.github/workflows/platform-recipes.yml` | Pin matching-host Rust setup; keep platform targets, manual dispatch and unqualified artifact labeling. |
| `scripts/verify-ci-environment.mjs` | Add current source/lock/toolchain consistency checks and guard automatic workflows/default audit against obsolete release assertions. Does not claim hosted CI execution. |
| `scripts/qualify-v26.31-scoped.mjs` | Include fresh environment checks in the focused evidence bundle. |
| `README.md`, `docs/RELEASE_NOTES_26_31.md`, `docs/ISSUE_CLOSURE_26_31.md` | Document the actual current audit command and the CI repairs and qualification boundary. |

These CI fixes do not alter engine, player or editor behavior. A command-resolution check additionally showed that plain `pnpm audit` invokes pnpm's built-in dependency audit, not the package script. The release matrix and documentation now explicitly use `pnpm run audit`, guarded by the environment verifier. Candidate 3 was superseded before qualification; final packaging uses candidate 4's regenerated inventory and source-bound reports.


Candidate 4 passed all thirteen planned gates, but packaging exposed a missing native-CLI prerequisite in that scoped plan. Candidate 5 restores the existing native process regression in the focus gate and its `runtime/native-headless.json` report. It adds `scripts/verify-v26.31-native-headless.mjs` (fresh build, replay/rejection/query/lifecycle/version/window checks), `docs/NATIVE_HEADLESS_26_31.md` (unchanged protocol and limits under the current identity), and the documentation reference in `scripts/prepare-release-26.31.mjs`. No runtime implementation changes accompany this packaging correction. This ledger now also includes the exact file list required by the standard assembler, removing the need for an artifact-only ledger derivative. Earlier candidate runs/evidence remain retained and superseded.

## Files changed/added

This deterministic path-level manifest lists all authored changes since the initially clean Git baseline. The source snapshot and packaged evidence supply the exact file hashes. Per-file consequences and verification are described above; generated build outputs are separately inventoried in release evidence.

- `.github/workflows/ci.yml` — modified; purpose and consequences described above.
- `.github/workflows/nova-validation.yml` — modified; purpose and consequences described above.
- `.github/workflows/platform-recipes.yml` — modified; purpose and consequences described above.
- `.github/workflows/release-matrix.yml` — modified; purpose and consequences described above.
- `Cargo.lock` — modified; purpose and consequences described above.
- `Cargo.toml` — modified; purpose and consequences described above.
- `README.md` — modified; purpose and consequences described above.
- `crates/nova_format/src/lib.rs` — modified; purpose and consequences described above.
- `docs/COMPETITIVE_REVIEW_26_31.md` — added; purpose and consequences described above.
- `docs/EDIT_LEDGER_26_31.md` — added; purpose and consequences described above.
- `docs/EDIT_ROUTE_INVENTORY_26_31.json` — added; purpose and consequences described above.
- `docs/FEATURE_INVENTORY_26_31.md` — added; purpose and consequences described above.
- `docs/FIELD_BINDING_INVENTORY_26_31.json` — added; purpose and consequences described above.
- `docs/ISSUE_CLOSURE_26_31.md` — added; purpose and consequences described above.
- `docs/NATIVE_HEADLESS_26_31.md` — added; purpose and consequences described above.
- `docs/PANEL_INVENTORY_26_31.md` — added; purpose and consequences described above.
- `docs/RELEASE_NOTES_26_31.md` — added; purpose and consequences described above.
- `docs/SOURCE_INVENTORY_26_31.json` — added; purpose and consequences described above.
- `docs/SOURCE_MAP_26_31.md` — added; purpose and consequences described above.
- `docs/WEB_HOSTING_26_31.md` — added; purpose and consequences described above.
- `manual/MANUAL.de.md` — modified; purpose and consequences described above.
- `manual/MANUAL.en.md` — modified; purpose and consequences described above.
- `manual/MANUAL.zh-CN.md` — modified; purpose and consequences described above.
- `manual/index.html` — modified; purpose and consequences described above.
- `package.json` — modified; purpose and consequences described above.
- `reference-projects/projects/creator-v2631-mixed-game/README.md` — added; purpose and consequences described above.
- `reference-projects/projects/creator-v2631-mixed-game/expected-output.json` — added; purpose and consequences described above.
- `reference-projects/projects/creator-v2631-mixed-game/project.nova` — added; purpose and consequences described above.
- `reference-projects/projects/creator-v2631-mixed-game/test-controls.json` — added; purpose and consequences described above.
- `reference-projects/projects/server-v2631-headless-authority/README.md` — added; purpose and consequences described above.
- `reference-projects/projects/server-v2631-headless-authority/expected-output.json` — added; purpose and consequences described above.
- `reference-projects/projects/server-v2631-headless-authority/project.nova` — added; purpose and consequences described above.
- `reference-projects/projects/server-v2631-headless-authority/test-controls.json` — added; purpose and consequences described above.
- `scripts/generate-panel-inventory-26.31.mjs` — added; purpose and consequences described above.
- `scripts/inventory-v26.31.mjs` — added; purpose and consequences described above.
- `scripts/lib/browserUserAudit.mjs` — modified; purpose and consequences described above.
- `scripts/prepare-release-26.31.mjs` — added; purpose and consequences described above.
- `scripts/qualify-v26.31-scoped.mjs` — added; purpose and consequences described above.
- `scripts/set-calendar-release.mjs` — modified; purpose and consequences described above.
- `scripts/verify-ci-environment.mjs` — added; purpose and consequences described above.
- `scripts/verify-v26.31-layout-user.mjs` — added; purpose and consequences described above.
- `scripts/verify-v26.31-native-headless.mjs` — added; purpose and consequences described above.
- `scripts/verify-v26.31-static-host-user.mjs` — added; purpose and consequences described above.
- `src-tauri/Cargo.lock` — modified; purpose and consequences described above.
- `src-tauri/Cargo.toml` — modified; purpose and consequences described above.
- `src-tauri/tauri.conf.json` — modified; purpose and consequences described above.
- `src/assets/editorReadability.css` — modified; purpose and consequences described above.
- `src/components/ActionBar.vue` — modified; purpose and consequences described above.
- `src/components/EditorBottomPanel.vue` — modified; purpose and consequences described above.
- `src/components/EditorIcon.vue` — added; purpose and consequences described above.
- `src/components/ManageWorkspace.vue` — modified; purpose and consequences described above.
- `src/components/PanelMaximizeButton.vue` — modified; purpose and consequences described above.
- `src/components/WorkspaceBar.vue` — modified; purpose and consequences described above.
- `src/projects/projectFormat.ts` — modified; purpose and consequences described above.
- `tests/fixtures/migrations/public-schema-expected.json` — modified; purpose and consequences described above.
