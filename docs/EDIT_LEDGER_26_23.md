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


## Files changed/added — deterministic path-level manifest

Release26.23, machine26.23.0. This generated release supplement compares every authored path in the preserved26.22 snapshot (9f099e376d041e1a7cda8b13b3a10c95c61b010f45b7f53077a857ef17625fd7) with the qualified26.23 snapshot (085ede29af171db548940b563bdccd44ab3ab11d3813ead2c7280758adb95c82). The full before/after hashes and sizes are retained in documentation/release-audits/v26.23-file-change-manifest.json inside release evidence. The behavioral explanations above are preserved verbatim from qualified source. Generated binaries and temporary audit files are excluded from this source manifest.

- `.gitignore` — changed; 98dd9946a6dd1c6c00cd51cc101d66975a674a0f85a26a656bd276c3c2c6068e → f0505f7b7f93cce354ace20031cdba63f44590c539eca537d8f0b72ae769d984.
- `Cargo.lock` — changed; e560d0ebb34faa65080cc835b35aa64ac1f7d66d7595797e624a6e8e1de392be → 5f7ad2cd44ef4300d188d777ebfea1380d422cf7cc5d288166df8bfeb1e7d131.
- `Cargo.toml` — changed; d6319146d856e7c11a79fd76070f3f94165b9234b7b247b68ae6851b00f731da → 8789ac80a0e22b30614911bdcb56eeccd3d0ec8a08228b80945df112e033e410.
- `README.md` — changed; b38db25d27e8de998723384ad6117ba612628c26403c7d1454c8c00c4c962acf → d2c82027d31850f5c3fa1a148f782468d596c5d119fd1fde8cbd09e0ac1ea8a3.
- `README.zh-CN.md` — changed; a912e94622bb7bf877a27f5aa9398d96a8490814a4df31022ced3fbad1179615 → c70489ef852ba5f30228650b13aaea3b4f2bf061724fffba2f4dc71f293353fb.
- `crates/nova_format/src/lib.rs` — changed; 7b4fb6c85a3aa7a28cb21de10e3ac76ba8506ee0f4de194167b4535faca859cd → 2a3b8775c92ce3f8a7ea8635cae038ba960a2fe69bf4776314e2ad63fe3f0843.
- `crates/nova_script/src/lib.rs` — changed; e7e92ef96b6d1fb5825898ac53ebfa6cba6f69d3502963950d1b7a0b5637a35a → d80a1a64d45ec14ced5a37bfb15de70ed78b3a353b6fc179a4733fb89537a124.
- `crates/nova_wasm/src/lib.rs` — changed; 5d2c1dd0e685a66cf7a7bfb687642ab4e2acfde20ef3cb315097890171e28744 → 80a9f30d93f00b0609586680be15ef8cbc1ff234ee52a85543404d8f4dd3c508.
- `docs/EDIT_LEDGER_26_23.md` — added; absent → 4190dc54683204de51eea7e32ab5360238b4f545d3548dc81590a2cc918c1a6f.
- `docs/GAP_REGISTER_26_23.md` — added; absent → 8d2039444469cdc6b8e0a183f518efdad454b6ee980356a6b378f46ee5234427.
- `docs/IMPLEMENTATION_TRACKER_26_23.md` — added; absent → 480153d1453c568c0795db83ebe642b6ef8434e8f319b1aa3ad519c65e3c21a3.
- `docs/MIGRATION_26_23.md` — added; absent → c595981acee9c91d0f8deda1a112789df7de7d59e8eaa709e6d1d063eeda1a83.
- `docs/PERFORMANCE_OBSERVATIONS_26_23.md` — added; absent → 556a40c56b3b07dd7a2ebed852e5f75e780616e3dd63be87750fe4be87dba742.
- `docs/QUALIFICATION_LESSON_26_23.de.md` — added; absent → f223e4912339f73a53e55c14b71eac93ce72669fbb24819e096739989c856b4e.
- `docs/QUALIFICATION_LESSON_26_23.en.md` — added; absent → a1768460264bd2f0b5a97046aff1189a8d9a33a877739c346367f3ab747e45ed.
- `docs/QUALIFICATION_LESSON_26_23.zh.md` — added; absent → 5eb0a11d41a7bc810f329c99c65bebaa1f85b4d2f7ce954b8670767c587e3259.
- `docs/RELEASE_NOTES_26_23.md` — added; absent → fa8d41fb3f6951f67a946d52118fc7605f2c45388b3d857266ebbe797644ffed.
- `docs/ROADMAP_26_23_TO_26_30_ADDENDUM.md` — added; absent → 1d9efbe9e534d6deeb4c62b1581b19a287a79f37b432ca394fcd3bfb5e350088.
- `docs/SCRIPTING_CONTRACT_26_23.md` — added; absent → 985e3f5738cf80e9e3099d3a2eed8c59ec60b5c78c76c442de67b4f944cbcd20.
- `docs/WEB_HOSTING_26_23.md` — added; absent → 6cedfc72517b58b856ba06ca16f31468afa77f065bbccdf8864cba25a1e85271.
- `manual/MANUAL.de.md` — changed; 805b028d8bac8bf8fce170eeba9d27194ad837867cb2dd63538d92498a90404d → 2231f34c7d98271c4a1ec143e358e879c274af080bbf6d8c4f67d0fb3f405976.
- `manual/MANUAL.en.md` — changed; cc2aa871fb25905a30a43f4998a91288b4fc0a8e8925adb8ca48d0a16ad50d17 → 3c57fcaf7c892244babf3cb0cd64d6be74c29a4490f0f668fbe8f3c8d2d5384b.
- `manual/MANUAL.zh-CN.md` — changed; 3067df3757d7ebe17510c8e510b42a186aa348dd4fd1e118fe4e14e0ba4cb3b1 → d313dd8c0044c551d60c0a4c395be9e3a526872cf47af5387fede98b60811c93.
- `manual/index.html` — changed; 3f1409b6d5eacd00e6bd0338bc4764652383b1e75b10647eb6f4f7b11c7d5d90 → ccd9fb3e58756861c4254bbee45f44f2c5f865171dee6dab1afdabb7664e0a95.
- `package.json` — changed; 3b01a8d08b82036b205df98d3b38e52674c44d670b4656cad8c9ec6160ef906f → 4cfb480bf2252005a0c811da7db4f7d9418e3ce24d2fc46cce7aaca6ec0cd1db.
- `reference-projects/projects/creator-v2623-animated-menu/README.md` — added; absent → 7f8cb441857b09ebcce2411847899a0394e6df3c360c0937ecf0d9b23f6983e4.
- `reference-projects/projects/creator-v2623-animated-menu/expected-output.json` — added; absent → 7292cb7b5ce570e30eb99049207abeb924aefc78a44baf4e025ce810ae6a42f0.
- `reference-projects/projects/creator-v2623-animated-menu/project.nova` — added; absent → 0b56b1549052ff1a1c4db80dec459fe119178d5a5e16a2d47508aa9c948677ed.
- `reference-projects/projects/creator-v2623-animated-menu/test-controls.json` — added; absent → 2669ad325fb613274144f83b520922b9045b1ef1ee38fb98fd31dd0500f8d5df.
- `reference-projects/projects/creator-v2623-blocks-game/README.md` — added; absent → aa6bca2c315520fe6167a1021bce1f03f091d89503995d7a5b984415d48e1242.
- `reference-projects/projects/creator-v2623-blocks-game/expected-output.json` — added; absent → 17fdcc0cff965ee54afaa5f33bd1c9cf57087f916e49242535052baea198891f.
- `reference-projects/projects/creator-v2623-blocks-game/project.nova` — added; absent → 1dd37eb37f21f7b3d1dd85b9b4ca368fb61b2b6a98b73d486b59e63997e0201b.
- `reference-projects/projects/creator-v2623-blocks-game/test-controls.json` — added; absent → a8223fb4b24504dc203754ef63ef7cbf4a06a20c7b221375d63a704a2932549b.
- `reference-projects/projects/creator-v2623-code-game/README.md` — added; absent → d9243c2c6159c5875dec087098297f982a1466b0a5524fb0a058292f05059718.
- `reference-projects/projects/creator-v2623-code-game/expected-output.json` — added; absent → 879582bade2d87668eec4efa42e583027544616d399d4c7e799d76fa7838295b.
- `reference-projects/projects/creator-v2623-code-game/project.nova` — added; absent → 47e844e446e87a9062a08c3b93881fe5d87656f6786c6b1f9877ad5fc35477d3.
- `reference-projects/projects/creator-v2623-code-game/test-controls.json` — added; absent → b286d09c4ad9db1e27b0e9df12dc10f848b41847f8f8acf6d02c4f110b942a64.
- `reference-projects/projects/creator-v2623-mixed-game/README.md` — added; absent → 9c842bcbd1ff999673ede6a2eeab6f6334dbb449caab6e1be9482597fee7d9cb.
- `reference-projects/projects/creator-v2623-mixed-game/expected-output.json` — added; absent → 6f39a6b48c9275926c20c12baff480790f03f9888182eae01ded00e7bd27fbc0.
- `reference-projects/projects/creator-v2623-mixed-game/project.nova` — added; absent → c3d5b2e680dcc7fe56e1c918e908d78abaf6c9842237a501c695c82466eba4d0.
- `reference-projects/projects/creator-v2623-mixed-game/test-controls.json` — added; absent → 5db9fbbb1fe165848cb489e6dcd4463fdac865ec8de6d225ed0d06383aa6cbc1.
- `reference-projects/projects/creator-v2623-output-quality/README.md` — added; absent → 31dfc9deadbde24d188901226ccb4eae5e56c155f85ffbc634276af128ea4f45.
- `reference-projects/projects/creator-v2623-output-quality/expected-output.json` — added; absent → 7c4a287c05735ee4ce86850295bdf98a11c78630d1b72a26ba9856940b4e9440.
- `reference-projects/projects/creator-v2623-output-quality/project.nova` — added; absent → 73016eff644f675d0fa764036a1e1ee0bda7cc6ddf156cedd065fd9126a98743.
- `reference-projects/projects/creator-v2623-output-quality/test-controls.json` — added; absent → 974a69745460de5ab8653ebea9ae3d815e61a49f9e4f4fe9122a36d2365455c5.
- `reference-projects/projects/scripting-v2623-inventory-callback/README.md` — added; absent → 0d3ab27068596b37cf2fae92f0d105992d6537828e4ebc50982ac252d89511fd.
- `reference-projects/projects/scripting-v2623-inventory-callback/expected-output.json` — added; absent → 1232755fad828cfecd781e5f19d6d22ff4424b2204ef6aa9140a2956a3624ef3.
- `reference-projects/projects/scripting-v2623-inventory-callback/project.nova` — added; absent → d06dba138fceb8bc7ee14fe6aed76e287bc36e733da0e730b8402d27221dcc3a.
- `reference-projects/projects/scripting-v2623-inventory-callback/test-controls.json` — added; absent → b35da5b4f16ea4f2473e8abc1b301be523c93a7c50608a6e2f32bbe6af8fe12c.
- `reference-projects/projects/server-v2623-headless-authority/README.md` — added; absent → c80fa8649aac6b59d2dbc39b7025023a215fa5b130ad3fd6ad421f4d7ac378e5.
- `reference-projects/projects/server-v2623-headless-authority/expected-output.json` — added; absent → ec8a1fb255ecc215018aab6b534cd15e3f9994493451249dcfb2bf585e9df309.
- `reference-projects/projects/server-v2623-headless-authority/project.nova` — added; absent → fca2798ae6a7869e6961feb79a102c957508ba3e9114ed83aa8f817708e45be0.
- `reference-projects/projects/server-v2623-headless-authority/test-controls.json` — added; absent → 719437fbcd1485b69da97b8b1597bc0f44606370897d7ec9e5ff93295c9bad1a.
- `scripts/benchmark-v3.mjs` — changed; 2677d909953f72fb2b2f66af323d71804b733fa0c717c66b5ccdfedf46e23b87 → b9065939f7d81927a51b53f64c9952ab9bbc11318e6f6abae0e8342ddb1c1b16.
- `scripts/generate-v26.23-inventory-reference.mjs` — added; absent → abf8bf2f759ee45e91999cebf833c8a56d078466ff28b7a3c8587150407267a9.
- `scripts/generate-v26.23-references.mjs` — added; absent → 53531c17722ed7c45c1931b6f67cb8ac13e7345909688cfac74d01162de135db.
- `scripts/generate-v26.23-teaching.mjs` — added; absent → 87264c91c978cc5f2c089521d993da22e7fd0340e80f05083b4bd09d56fe65de.
- `scripts/lib/browserUserAudit.mjs` — changed; 8f48859328186abcd1486eeef5d5918839e757f45d85fc80d97c6d17286e6fce → 5f772f0aebd6b294e8ff32f0fbb1ffad08bb408ed2cac2149d5641842fcb2c8c.
- `scripts/lib/deliveryExportAudit20.mjs` — changed; edd749cea9f6aef678241f06683d924f585dcf7838d75f59d73d8603d4ab2336 → 5bd1b48e40a40c71371fffe47815c4783c557f98b8e73af0d75cc6b7bd8eb088.
- `scripts/lib/propertyAudit22.mjs` — changed; 8d223c085a7d5381aacbfa46ade7c587b0f6d7641af9bbde37340a7fdba8c897 → 0ceea412e7acb4d7f62097ba208d59c3944581d76a7657b54db62950e04c632a.
- `scripts/package-release.ps1` — changed; ddbda613edf10639757cadd133d89de6f2a4da066a89bc5eadb14c945129fd9b → b5c5471d0337c67e68ad0788c3f7ca04a5168c9049f008a217c99f368ae1234a.
- `scripts/qualify-layout-v26.23.mjs` — added; absent → 240f29bb5f9d1727e1a677ae542292bb98c7d82e51fca46a5b0917d53225c90d.
- `scripts/qualify-panels-v26.21.mjs` — changed; 47c24747d530ecfdbf7d73a295de0041791dc92e2e76282376df5f0b60bd7219 → a12e1bdbd8d2b7f40ddec11647f7ab007e10f701a3d6f942d8fa64ceb961a07f.
- `scripts/qualify-panels-v26.23.mjs` — added; absent → 70e24409287df7dfbda80d1b0a6480017f503fdf26401504f445b8a453386714.
- `scripts/release-milestone-gates.mjs` — changed; 21a439e71718c8a483aa5e0e4422c244d4a5550c861e8f8fa5ba4ad685319198 → 21c36c24f1af12441abcd70e6a0a1779896e1bde59a29b4eca3a8cfcbdc668ce.
- `scripts/release-qualification.mjs` — changed; 358d216ac46390984a552f1d89c8da0b7c363f003def65b77f3d6f025c0301fb → 96fe349721d0e5e722f05e61bb8ad9d3d6ba9a6f449154d0afb70952b332e154.
- `scripts/release-source-snapshot.mjs` — changed; 49ec87889a4e42b19321e0a4e525d8e2a779f91456c41af2b3f7527e2b9f677a → 843cf0a7c168aa7a1905d6f505874b1b82d75a75647ef370cd59692b05955c31.
- `scripts/verify-v26.14-runtime-stage.mjs` — changed; e4d7d72b01b2a0b18631f753590d519dc94c7438a365365d8d3c1f4b3f47d116 → 0068f4c3cca1bc2ab40eede46b29a207aadbbf46dfe6e4fdc88c90e70205da8b.
- `scripts/verify-v26.22-palettes-user.mjs` — changed; 3fe4caf0870e383e803191cb63a050669afed644148ff9ad3ffce87c561241e5 → 466f290de41fc30b8d9cb54a50800acae15ea1200ce620df4b8ef623bd8c1751.
- `scripts/verify-v26.23-authoring.mjs` — added; absent → 40396db1a298555dfd23cc4f82f559d2392c91d772a711e930e75df63aeb7b27.
- `scripts/verify-v26.23-delivery-user.mjs` — added; absent → 299694ef4137b5668f97922761d882c5647bfc619df8ff8b214ab93eaadca99b.
- `scripts/verify-v26.23-delivery.mjs` — added; absent → e9a614f4a981406ca17e982cacf366fd40e1b7cd58b4c6839c2301c7921ce1cd.
- `scripts/verify-v26.23-focus.mjs` — added; absent → c50a73bc960b32fbcb168651f15193935fab728d5c8996993d8eaea68d59c758.
- `scripts/verify-v26.23-idle-resume.mjs` — added; absent → 2e64309495521ac06d21cb11fe4ba5ae3e116b08d8e98822f38dc330fa953d1b.
- `scripts/verify-v26.23-inventory-user.mjs` — added; absent → eb5e132f0bd3b166f18c2fffc6ea922f36e63a62bc2f131670141f396f2b1dc9.
- `scripts/verify-v26.23-language.mjs` — added; absent → f403a01b99e213d6ab1c08df85680e34a890927400df2dc6a113b1cb7e873250.
- `scripts/verify-v26.23-launcher-advanced-user.mjs` — added; absent → a6c2fbe6a9b73f4c52a19ae8c77b15a77522aa50a56cd1336313be022f9cb5cf.
- `scripts/verify-v26.23-lsp.mjs` — added; absent → a15bc41d1eadb629c7d3c084985479a5a63d343bf255c2876304e53223c607b8.
- `scripts/verify-v26.23-property-authoring.mjs` — added; absent → 1cfe36d718ca7d8adf2a5fd72db843ddb4769152348abc60940011af7a6d23a7.
- `scripts/verify-v26.23-renderer.mjs` — added; absent → c9b522290fc6b3d06677c0e285eddc0f850f97862af5fd0e743b36785835f054.
- `scripts/verify-v26.23-reproducibility.mjs` — added; absent → f3566f5685a21d95a7f120e546373e7b552bf5079994ebc3e9f4bcb3e78628f6.
- `scripts/verify-v26.23-runtime-regressions.mjs` — added; absent → cea976782e05122b07a546654b2acc3c984e7bd8c744b612d9ea5cd6cdcac402.
- `scripts/verify-v26.23-save-recovery.mjs` — added; absent → 3b4955e56f05e2024d63bca857b8877b1dba67d0d3675eb0fa6c5b20028704a3.
- `scripts/verify-v26.23-shell-user.mjs` — added; absent → e40bc82a9ca0f9af2cd51095abc004b9efb3eee1a80ca549ee6b709c3a97544e.
- `scripts/verify-v26.23-static-host-user.mjs` — added; absent → 7a76a73dda0df77434058c511e62d2e0e740d65c57c0ee8480ff82508422d8bf.
- `scripts/verify-v26.23-template-library.mjs` — added; absent → 4ad619b32bfba4dcbdbe8607134623d206c3a04e3d2a6bb6b5a205042d9e4cae.
- `scripts/verify-v26.23-template-output.mjs` — added; absent → bb5f5f6a9fd746cbebab70b41b35bfe3000d2c51d5036b1fafe76b69229d4e5d.
- `scripts/verify-v6.0.2-interactions.mjs` — changed; e1607660cfe123e17e4c1fff85414ed6363c94f750520abf2f8aea7fe05cf33b → 9fb8dfe2b1dad56ebf16b126b475b311654816c7eb66d79cb68a6ddb3ce699d0.
- `src-tauri/Cargo.lock` — changed; 5a0180316fca767ed4ccf32ace37038d30455da649136f13a504c5ed2220fade → 810db770725f33333de03a02bcb47fcdbff4cbe1dacf94bbb70c3be7d30b5f31.
- `src-tauri/Cargo.toml` — changed; 6515bb16ac19a4e48b4e45666f0dcdf0a8c367d2eb73fa1171c707b7806246cd → 326a552ebe4072849a040e822354f91ff76c874199e48fc684110fd1fc7c16de.
- `src-tauri/capabilities/default.json` — changed; dc0708f8af18db010c3aa0d88b3aa494d0bb85a62a22775cc069ff74b7d6f097 → f6bdf618ba1a77ddfb655d15b766ccd4af0d6c4fbf151fb84bdd2772405ef7d8.
- `src-tauri/tauri.conf.json` — changed; a14698340691abde2a5ec0aa25da7145770c9d39d12d5849e10694dbbbfc488a → 3c4c220d7a03f87a6bc01e5de2dfe71b0ee543d8e214401002ff90f98aead4e1.
- `src/components/BuildSettingsPanel.vue` — changed; 09bfb44bd45d493297251cfbac79077bd4d88e88952fa86ec795cf2729f2dbeb → 631d3a1347a9edadd187ecb20f37589608504ebd85802227beffbf958a2826a5.
- `src/components/ProjectManager.vue` — changed; 2260c28fe8bc4f6bb82cc1d964b344fb3ccf3223a853e1cc799864699f8e5925 → 730e34359195c88fdc5e07f2b5dcbe67b45226985a2eafeb7acb57a88ab12894.
- `src/components/ScriptStudio.vue` — changed; 9da943ad47b6f7ebaadedd8f01d5402ca4de664e53d4a0b6f6a17ee93e422283 → e48b36bf1a2c52a9e14841df99851866a0cf629256a0834e861bb42eb370fb87.
- `src/components/WorkspaceBar.vue` — changed; 66e2ef296a74c44fd1ecf33ae900f8047344c4da7ff87c7625ad8aefb7258c5d → 8cf6abb5b5aa47aae17909e37052c32b2f12ed9119cac9ace3a28b26aa53af6e.
- `src/editor/scriptStudioState.ts` — changed; 56613041577d73e86c3c23094f01e94ede145bd79c93ee09489857caeff3334d → fbf4008dd8ee55325223cafe683dec66122933f1723e1c22358c33f1b47547c6.
- `src/editor/transientPopover.ts` — added; absent → 45e4992c4242d5803b856bf8904bcc83cf5b247145b6653ff2ad472c9eccd782.
- `src/i18n.ts` — changed; 2554102983c40ced3b712778cbb314cf95379cbac0a613b3d6e112f5ef865901 → 5306b9233a0c2b2a3a5f7ef3b07cb75764b0f88c45e0fc954199944a0f0052fb.
- `src/layout/TopBar.vue` — changed; b62a8270e4997c9722ba9c0f1caa86043f5f6101318af6ab7d3c92a3f835e475 → 06f47df22202e699481dd279913469d9247de548636074e822f70004fa5a2910.
- `src/main.ts` — changed; 676ecc73dd82daa916668fc6eedbcb44567b3a6b76ab7755159d018ab2d6035e → ea2bc9f3912c314301a5e5de5a8d77cfe0874640f00a12ab6ef7fe43c2c591da.
- `src/projects/projectFormat.ts` — changed; 2db13cddaa8b313e82df3ff36e7653bd62e5bb919bc4f88b4c568fb2b752e681 → 3e34cba84e0e4abe1c8fb49fcdf536a4f80bbcc2006897cdf7bf82e6a28b8af9.
- `src/runtime/GameplayRuntime.ts` — changed; b248e2ad8cdcd3280299660c0851a4b5704a0af91c96f7f78934a05b74ca1ee6 → c23333e14518e7c55327a1aec73bb9ade2581ce2034cd2edb0ab081e9b4cfa8c.
- `src/runtime/dynamicInspection.ts` — added; absent → 38ba65cfe0d9d055144ddef244eeb2c7be3248ff509e319ab9227e0a45a2fb09.
- `src/runtime/externalLinks.ts` — added; absent → 26d695a08771892fefeeb8af8503e16cede0cdec2cff389733865d5d2c084cfe.
- `src/runtime/gameExporter.ts` — changed; a2d0d21b42b742bbfb0d9bba29e2b947dda11ac94b8ea3a764deb7de0b92316a → e5e1fb6c35d0ff1d0bc770dd0f206357bb3d9f18930e902ff4d3d6350851fff9.
- `src/runtime/profiler.ts` — changed; 82392d5a9009def5cdef40f1c666b96b9258843ed5293abc09b042b887d4ac42 → 73e073bc8b070f6c758254184929d669d6d88e22b2f312de10e4040929c1289d.
- `src/runtime/scriptDebug.ts` — changed; 8637d6738b44aa4970f3342a58abc9cd66ec36448dc18204fdf141af3e28d8ff → 764217744c222c995fd6e48cdceab7950e230ed5ab22b7322fd389458638fb94.
- `src/runtime/scriptHotReload.ts` — changed; 18f6d8072cd52f2b1858ef5c1ec35cb19241e1a6e6ad23ab71bc35410ae60a5b → 0209af1b21b1829e2515903151f74efd7e324bc53507bb1c45edba0b34deb84e.
- `src/visual/rhaiApiSignatures.generated.json` — changed; 6e950a7a5e8ee7db113c80175215aaafed6846ff56526361f27069992ba08b0c → 61e3f352a2b2bf6e1d709bc79d6ff8982191cd27be0269e454a15c30b268cda8.
- `tests/fixtures/migrations/public-schema-expected.json` — changed; 4597f9dd3661357ad48cc5ec8e088f24846d7df235f4d4d6476b2405131be5d0 → d79b136ce077b44f7cd10484168bfa2dd1e84448800ab532f0ea6b2a8bda9b91.
- `vite.config.ts` — changed; 9898a60f86a120f7e81dab4de0aa2c3241c0cff4fb22919244655c2f3bb315cf → 2fc044379916cb81ab6536b173d4c00d78520c1113aaa12315340723f03adb26.

## Release-report generation

The product-report adapter and its formatting explanation are retained in documentation/.cache/. It changes only JSON whitespace to avoid Node single-string capacity; all checks and embedded report values remain present. The original failed and interrupted qualification runs remain on disk. This release ledger adds the deterministic snapshot manifest during packaging without changing the qualified application source.
