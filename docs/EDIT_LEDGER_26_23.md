# Nova_A 26.23 edit ledger

This ledger records26.23 changes against the preserved26.22 source. Release acceptance is established by the final frozen-source gate evidence and independent package verification.

| Path | Change and consequence |
| --- | --- |
| src/runtime/profiler.ts | Replace expensive reactive front-splices with bounded raw-array slices, retaining ordered records and reactive updates. Respect frozen/disabled counter capture; ignore duplicate or stale marker completion after clear. No renderer quality or animation changes. |
| src/runtime/scriptHotReload.ts | Unique request identities, metadata-only copied history, preserve newer active plan, retain valid empty rollback, clear rollback source on session end. History stays bounded to 200 entries. |
| src/runtime/GameplayRuntime.ts | Supersede queued source/graph requests before validation so a rejected newer edit cannot apply an older queued draft; dispose rollback source with runtime session. Existing atomic candidate validation remains. |
| src/components/ScriptStudio.vue | Enable rollback for a valid empty old script by testing property presence. |
| docs/EDIT_LEDGER_26_23.md | Track every authored edit, behavior consequence and verification limits. |
| src/runtime/externalLinks.ts | Add exact-address HTTPS validation, recoverable native link errors and a document-level guard ahead of the native opener interceptor. Normal browser anchors retain browser behavior. |
| src/main.ts | Install the external-link guard once during editor startup. |
| src/layout/TopBar.vue | Route About through the guarded external-link helper; avoid interpreting an isolated browser window return value as failed navigation. |
| src-tauri/capabilities/default.json | Add only the exact brand website URL to the native opener permissions; no wildcard or arbitrary-host permission. |
| src/editor/transientPopover.ts | Add shared delayed pointer dismissal with padded travel regions, keyboard focus retention, Escape/focus return and outside touch/click dismissal; listener/timer disposal is explicit. Intended only for transient controls. |
| src/layout/TopBar.vue (menu coordination) | Use one out-in transition for six menus, disable outgoing commands immediately, position the actual entering element and share transient dismissal. Preserve all commands and transition animations. |
| src/components/ProjectManager.vue | Make project creation an explicit New dialog with focused keyboard navigation, retained drafts/filters, visible errors and one primary scroll area. Keep all 40 templates; move secondary project actions into a localized More disclosure. Keep Open/Continue/recent access. |
| src/runtime/gameExporter.ts | Read a public player manifest with compatibility fallback; add explicit ZIP delivery while preserving folder/native exports. Ask for a browser folder before asynchronous packing so the activating gesture is retained. |
| src/components/BuildSettingsPanel.vue | Add localized Download Web ZIP action for Web targets; route it through the existing validation/build history path. Existing Build and Build-and-run actions remain. |
| vite.config.ts | Copy the generated player dependency manifest to player-manifest.json for hosts that disallow hidden folders; retain the existing manifest. |
| src/runtime/dynamicInspection.ts | Add bounded own-data snapshot paths, array/quoted map keys, dynamic type labels, cycle-safe bounded previews and quote-aware comparison splitting. Accessor/prototype execution is unavailable. |
| src/runtime/scriptDebug.ts | Use bounded snapshot inspection for watches/details; retain comparison behavior while allowing quoted map keys containing operators. Report explicit types and overlong expression errors. |
| src/components/ScriptStudio.vue (inspection) | Render bounded locals and show each watch value type, preventing unbounded stringify before text truncation. |
| crates/nova_script/src/lib.rs | Share immutable compiled programs with Rc in a cloneable runtime cache; add native tests proving replacement/removal/failure/drop isolation and preserved execution. |
| crates/nova_wasm/src/lib.rs | Expose an isolated candidate-cache fork across the existing WASM boundary. No mutable scope or host-output sharing. |
| src/runtime/GameplayRuntime.ts (reload compilation) | Fork the live cache and compile only affected candidates before the existing atomic state-transfer commit. Preserve full compile fallback when no VM exists. |
| scripts/verify-v26.14-runtime-stage.mjs | Retain existing actual native/WASM tests and explicitly model candidate cache forks in the controlled adapters. Native AST ownership is independently tested in Rust. |
| scripts/verify-v26.23-runtime-regressions.mjs | Add actual owner regressions for concurrent reload history, empty rollback, bounded snapshot inspection and profiler capture lifetime. |
| scripts/verify-v26.23-shell-user.mjs | Add actual browser launcher/menu/link regression flows; native transport is controlled while the installed opener interception code is real. |
| scripts/lib/deliveryExportAudit20.mjs | Add an opt-in explicit-ZIP control selector while preserving retained tests’ default Build flow and independent archive checks. |
| scripts/verify-v26.23-static-host-user.mjs | Exercise nested-path static hosting with hidden paths blocked, explicit ZIP download despite an available folder picker, archive checks and startup of the downloaded player. |
| src/editor/transientPopover.ts (details directive) | Reuse delayed pointer/keyboard dismissal on explicitly marked native details popovers, with disposal on unmount. Semantic documentation disclosures and draft dialogs are unaffected. |
| src/components/WorkspaceBar.vue | Apply shared dismissal to Layout and Commands popovers while preserving their controls. |
| src/components/ScriptStudio.vue (layout) | Apply shared dismissal to More commands, widen the detail pane minimum/reset and tab cells, and wrap long diagnostics/value/path text. Existing narrow-window drawer and focused code layout remain. |
| src/editor/scriptStudioState.ts | Start Script Studio detail panes at 400 px instead of 328 px; resizable layout remains an editor preference. |
| scripts/verify-v26.23-language.mjs | Compare native/WASM dynamic-value, capture/scope, function/method, export-state, exception and sandbox semantics using actual engines. |
| crates/nova_script/src/lib.rs (dynamic export values) | Canonicalize serialized export defaults into recursive Rhai literals, including nested maps/arrays and null. Map Rhai unit back to JSON null so nested state is preserved; keep non-serializable function values rejected. Add native round-trip/state regression. |
| src/components/ScriptStudio.vue (diagnostics) | Add localized truthful reload outcome/source summaries and a bounded snapshot-inspection explanation with supported path examples. |
| docs/WEB_HOSTING_26_23.md | Explain complete static/nested-path deployment, public manifest caching, explicit game ZIP export, backend boundaries and unqualified browser/mobile cases in English with German/Chinese guidance. |
| docs/SCRIPTING_CONTRACT_26_23.md | Publish precise dynamic language, module, VM budget, handle, reload, task and snapshot boundaries and required user scenario. |
| docs/ROADMAP_26_23_TO_26_30_ADDENDUM.md | Preserve the updated user issue roadmap in authored source archives rather than only the excluded instructions.txt. |
| scripts/package-release.ps1 | Include HOSTING.md inside the Web archive and reference it in README; retain the exact eleven root release files. |
| scripts/lib/browserUserAudit.mjs | Support explicit later-release regression execution with source-version validation and retained origin metadata; every browser assertion still reruns against the matching build. No old report is relabelled. |
| scripts/lib/propertyAudit22.mjs | Permit explicit later-release targets for retained property suites with exact engine checks and fresh target reports, preserving 26.22 as the default and regression origin. |
| scripts/verify-v26.23-template-library.mjs | Retain all forty runtime starters and locale/readability checks while opening and closing the New dialog through real controls. |
| package.json (version authority) | Align the staged release identity to 26.23 / 26.23.0; preserve Project Format 2 and schema 29. Generated binaries must be rebuilt before qualification. |
| Cargo.toml (version authority) | Align the staged release identity to 26.23 / 26.23.0; preserve Project Format 2 and schema 29. Generated binaries must be rebuilt before qualification. |
| Cargo.lock (version authority) | Align the staged release identity to 26.23 / 26.23.0; preserve Project Format 2 and schema 29. Generated binaries must be rebuilt before qualification. |
| src-tauri/tauri.conf.json (version authority) | Align the staged release identity to 26.23 / 26.23.0; preserve Project Format 2 and schema 29. Generated binaries must be rebuilt before qualification. |
| src-tauri/Cargo.toml (version authority) | Align the staged release identity to 26.23 / 26.23.0; preserve Project Format 2 and schema 29. Generated binaries must be rebuilt before qualification. |
| src-tauri/Cargo.lock (version authority) | Align the staged release identity to 26.23 / 26.23.0; preserve Project Format 2 and schema 29. Generated binaries must be rebuilt before qualification. |
| src/projects/projectFormat.ts (version authority) | Align the staged release identity to 26.23 / 26.23.0; preserve Project Format 2 and schema 29. Generated binaries must be rebuilt before qualification. |
| crates/nova_format/src/lib.rs (version authority) | Align the staged release identity to 26.23 / 26.23.0; preserve Project Format 2 and schema 29. Generated binaries must be rebuilt before qualification. |
| tests/fixtures/migrations/public-schema-expected.json (version authority) | Align the staged release identity to 26.23 / 26.23.0; preserve Project Format 2 and schema 29. Generated binaries must be rebuilt before qualification. |
| src/i18n.ts (version authority) | Align the staged release identity to 26.23 / 26.23.0; preserve Project Format 2 and schema 29. Generated binaries must be rebuilt before qualification. |
| nova_core/pkg/package.json (version authority) | Align the staged release identity to 26.23 / 26.23.0; preserve Project Format 2 and schema 29. Generated binaries must be rebuilt before qualification. |

- `src/runtime/externalLinks.ts`: reject non-HTTP external schemes before the native opener interceptor; same-origin application links remain local.
- `scripts/verify-v26.23-shell-user.mjs`: exercise real keyboard activation, six denied URL/scheme cases and exit/re-entry timing for both brand locations and menus.

- `.gitignore`, `scripts/release-source-snapshot.mjs`, `scripts/package-release.ps1`: explicitly exclude the user-provided Godot reference directory even if copied as a normal directory; keep reference files intact.

- `docs/QUALIFICATION_LESSON_26_23.en.md`, `.de.md`, `.zh.md`, `scripts/generate-v26.23-teaching.mjs`, `manual/MANUAL.en.md`, `manual/MANUAL.de.md`, `manual/MANUAL.zh-CN.md`, `manual/index.html`: localized scripting, launcher, hosting and audit lessons; previous chapters preserved.
- `scripts/verify-v26.23-idle-resume.mjs`: five real foreground minutes plus explicitly labelled controlled lifecycle pause/resume, bounded DOM/listener checks.

- `scripts/generate-v26.23-references.mjs` and the six `creator-v2623-*`/`server-v2623-*` reference directories: preserve earlier demonstrations with distinct26.23 identities and current launch/export checks.
- `scripts/generate-v26.23-inventory-reference.mjs`, `reference-projects/projects/scripting-v2623-inventory-callback/{project.nova,README.md,expected-output.json,test-controls.json}`: add mutable inventory, helper module, function-pointer callback and runtime prefab example; explicitly pass state to ordinary helper functions.
- `scripts/verify-v26.23-inventory-user.mjs`: test runtime spawn and rejected/repaired module edits with actual browser input.

- Idle/resume audit refinement: use actual foreground/background tab activation and verify visibility/frame resumption; Chromium lifecycle freeze did not restore visibility and those failed diagnostic reports are preserved.

- `docs/RELEASE_NOTES_26_23.md`, `docs/MIGRATION_26_23.md`, `docs/IMPLEMENTATION_TRACKER_26_23.md`, `docs/GAP_REGISTER_26_23.md`: describe implemented changes, unchanged schema, audit obligations and explicit remaining platform/language boundaries.
- `scripts/verify-v26.23-focus.mjs`, `scripts/verify-v26.23-authoring.mjs`, `scripts/verify-v26.23-property-authoring.mjs`, delivery/LSP/save-recovery/reproducibility wrappers: execute current-source audits with fresh26.23 evidence while retaining original regressions.
- `scripts/qualify-layout-v26.23.mjs`, `scripts/qualify-panels-v26.23.mjs`, `scripts/qualify-panels-v26.21.mjs`, `scripts/release-milestone-gates.mjs`: retain full panel matrix, enable26.23 authority, open New before creation on current launcher.

- `README.md`, `README.zh-CN.md`: current26.23 source links and qualification boundary; historical sections retained.
- `scripts/verify-v26.23-renderer.mjs`, `scripts/verify-v26.23-template-output.mjs`: retain actual renderer/template output checks with current source identity.
- `scripts/lib/deliveryExportAudit20.mjs`, `scripts/verify-v26.23-static-host-user.mjs`: return independently hash-verified package contents and execute downloaded inventory root/helper in native/WASM; source is correctly read from package entries rather than metadata.

- `src/visual/rhaiApiSignatures.generated.json`: regenerate988 signatures from the current locked native runtime and Rust source; API contract unchanged.
- `scripts/verify-v26.23-launcher-advanced-user.mjs`: exercise migration cancel/accept, original rollback bytes and actual ZIP import via More.
- `scripts/verify-v26.23-delivery-user.mjs`: current-source wrapper for retained real merge/save/reopen/export gameplay checks.
- `docs/PERFORMANCE_OBSERVATIONS_26_23.md`: publish measured idle CPU/DOM/listener/resume data with hardware and coverage limits.

- `src/components/ScriptStudio.vue`: pre-save module validation rejection now explicitly states in EN/DE/ZH that no running program was replaced; source/state behavior is unchanged.
- `scripts/verify-v26.23-inventory-user.mjs`: add missing-import rejection and repair while the live program continues.

- `scripts/release-qualification.mjs`: accept HOSTING.md only when it exactly matches the frozen source guide; additional arbitrary Web files remain rejected.

- `scripts/qualify-panels-v26.21.mjs`: retain failing resource URLs in layout diagnostics; errors still fail qualification.

## Complete changed-file index

Every promoted authored path is listed below. The behavior and audit consequences are described above; generated reference files preserve the prior version directories.

- .gitignore
- Cargo.lock
- Cargo.toml
- README.md
- README.zh-CN.md
- crates/nova_format/src/lib.rs
- crates/nova_script/src/lib.rs
- crates/nova_wasm/src/lib.rs
- docs/EDIT_LEDGER_26_23.md
- docs/GAP_REGISTER_26_23.md
- docs/IMPLEMENTATION_TRACKER_26_23.md
- docs/MIGRATION_26_23.md
- docs/PERFORMANCE_OBSERVATIONS_26_23.md
- docs/QUALIFICATION_LESSON_26_23.de.md
- docs/QUALIFICATION_LESSON_26_23.en.md
- docs/QUALIFICATION_LESSON_26_23.zh.md
- docs/RELEASE_NOTES_26_23.md
- docs/ROADMAP_26_23_TO_26_30_ADDENDUM.md
- docs/SCRIPTING_CONTRACT_26_23.md
- docs/WEB_HOSTING_26_23.md
- manual/MANUAL.de.md
- manual/MANUAL.en.md
- manual/MANUAL.zh-CN.md
- manual/index.html
- package.json
- reference-projects/projects/creator-v2623-animated-menu/README.md
- reference-projects/projects/creator-v2623-animated-menu/expected-output.json
- reference-projects/projects/creator-v2623-animated-menu/project.nova
- reference-projects/projects/creator-v2623-animated-menu/test-controls.json
- reference-projects/projects/creator-v2623-blocks-game/README.md
- reference-projects/projects/creator-v2623-blocks-game/expected-output.json
- reference-projects/projects/creator-v2623-blocks-game/project.nova
- reference-projects/projects/creator-v2623-blocks-game/test-controls.json
- reference-projects/projects/creator-v2623-code-game/README.md
- reference-projects/projects/creator-v2623-code-game/expected-output.json
- reference-projects/projects/creator-v2623-code-game/project.nova
- reference-projects/projects/creator-v2623-code-game/test-controls.json
- reference-projects/projects/creator-v2623-mixed-game/README.md
- reference-projects/projects/creator-v2623-mixed-game/expected-output.json
- reference-projects/projects/creator-v2623-mixed-game/project.nova
- reference-projects/projects/creator-v2623-mixed-game/test-controls.json
- reference-projects/projects/creator-v2623-output-quality/README.md
- reference-projects/projects/creator-v2623-output-quality/expected-output.json
- reference-projects/projects/creator-v2623-output-quality/project.nova
- reference-projects/projects/creator-v2623-output-quality/test-controls.json
- reference-projects/projects/scripting-v2623-inventory-callback/README.md
- reference-projects/projects/scripting-v2623-inventory-callback/expected-output.json
- reference-projects/projects/scripting-v2623-inventory-callback/project.nova
- reference-projects/projects/scripting-v2623-inventory-callback/test-controls.json
- reference-projects/projects/server-v2623-headless-authority/README.md
- reference-projects/projects/server-v2623-headless-authority/expected-output.json
- reference-projects/projects/server-v2623-headless-authority/project.nova
- reference-projects/projects/server-v2623-headless-authority/test-controls.json
- scripts/generate-v26.23-inventory-reference.mjs
- scripts/generate-v26.23-references.mjs
- scripts/generate-v26.23-teaching.mjs
- scripts/lib/browserUserAudit.mjs
- scripts/lib/deliveryExportAudit20.mjs
- scripts/lib/propertyAudit22.mjs
- scripts/package-release.ps1
- scripts/qualify-layout-v26.23.mjs
- scripts/qualify-panels-v26.21.mjs
- scripts/qualify-panels-v26.23.mjs
- scripts/release-milestone-gates.mjs
- scripts/release-qualification.mjs
- scripts/release-source-snapshot.mjs
- scripts/verify-v26.14-runtime-stage.mjs
- scripts/verify-v26.23-authoring.mjs
- scripts/verify-v26.23-delivery-user.mjs
- scripts/verify-v26.23-delivery.mjs
- scripts/verify-v26.23-focus.mjs
- scripts/verify-v26.23-idle-resume.mjs
- scripts/verify-v26.23-inventory-user.mjs
- scripts/verify-v26.23-language.mjs
- scripts/verify-v26.23-launcher-advanced-user.mjs
- scripts/verify-v26.23-lsp.mjs
- scripts/verify-v26.23-property-authoring.mjs
- scripts/verify-v26.23-renderer.mjs
- scripts/verify-v26.23-reproducibility.mjs
- scripts/verify-v26.23-runtime-regressions.mjs
- scripts/verify-v26.23-save-recovery.mjs
- scripts/verify-v26.23-shell-user.mjs
- scripts/verify-v26.23-static-host-user.mjs
- scripts/verify-v26.23-template-library.mjs
- scripts/verify-v26.23-template-output.mjs
- src-tauri/Cargo.lock
- src-tauri/Cargo.toml
- src-tauri/capabilities/default.json
- src-tauri/tauri.conf.json
- src/components/BuildSettingsPanel.vue
- src/components/ProjectManager.vue
- src/components/ScriptStudio.vue
- src/components/WorkspaceBar.vue
- src/editor/scriptStudioState.ts
- src/editor/transientPopover.ts
- src/i18n.ts
- src/layout/TopBar.vue
- src/main.ts
- src/projects/projectFormat.ts
- src/runtime/GameplayRuntime.ts
- src/runtime/dynamicInspection.ts
- src/runtime/externalLinks.ts
- src/runtime/gameExporter.ts
- src/runtime/profiler.ts
- src/runtime/scriptDebug.ts
- src/runtime/scriptHotReload.ts
- src/visual/rhaiApiSignatures.generated.json
- tests/fixtures/migrations/public-schema-expected.json
- vite.config.ts

- Inventory expected-output and test-controls manifests include explicit Format2/schema29, authoring mode and behavior classifications; focus qualification checks the same package contract before expensive suites. Candidate1 is superseded by this metadata correction.

- `scripts/verify-v26.23-language.mjs`: explicitly build the native runtime bridge from locked current source before native/WASM comparison; cargo all-target tests can leave an older standalone example executable present. Candidate2 failure remains recorded; no stale native output is accepted.

- `scripts/verify-v6.0.2-interactions.mjs`: update the retained common browser audit to open the progressive New dialog before selecting templates, initially and after locale reload. Older launchers remain supported when the New control is absent. Candidate3 layout passed all five palettes; its following interaction failure remains recorded. Application behavior is unchanged by this audit correction.

- `scripts/verify-v26.22-palettes-user.mjs`: retained context-help regression now expects the actual qualification target lesson instead of hard-coding26.22 outside development mode. Candidate4 correctly stopped on this stale assertion; application help already opens26.23.

- `scripts/benchmark-v3.mjs`: use a one-shot SSR loader with file watching, HMR and dependency discovery disabled, matching the language-server audit setup. A Vite module transport timeout and its successful unchanged retry are retained; benchmark workloads and reported metrics are unchanged, and unrelated repository/reference files no longer need watching.
