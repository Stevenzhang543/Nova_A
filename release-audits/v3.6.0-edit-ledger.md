# Nova_A 3.6.0 exhaustive edit ledger

This ledger records every v3.6 source category and every user-visible behavior changed for the release. No existing feature or animation was intentionally removed.

## Runtime and persisted data

- `src/runtime/input.ts`: added physical-key, mouse-motion, touch, and gesture devices; controller identity; dead zone, threshold, inversion, response curves, modifiers/chords; conflicts; hot-plug; runtime rebinding; input recording/replay; pointer/touch/device snapshots.
- `src/runtime/localization.ts`: added structured v2 tables, metadata, contexts, plurals, fallbacks, font fallbacks, CSV round-trip, UI/Rhai extraction, missing reports, accented/expanded/BiDi pseudo modes, and RTL state.
- `src/runtime/uiAccessibility.ts`: added source-linked label, reachability, target-size, contrast, and focus/read-order audits plus deterministic focus ordering.
- `src/runtime/presentation.ts`, `audio.ts`, `uiTheme.ts`: connected game high contrast/text scale/minimum target size, UI sound playback, inherited spacing/font/color tokens, and named theme variants.
- `src/runtime/gameUi.ts`: applied DPI, safe-area anchor ranges, offsets, nine container algorithms, RTL, visibility, reading/focus order, ARIA state/value/live metadata, gamepad navigation, UI sounds, modal/popup outside close, tooltip, drag/drop, high contrast, and text scaling.
- `src/runtime/animation.ts`: advanced clip documents to v4; added speed, onion skin, easing, markers, and Method/Audio/NestedAnimation commands while retaining property/event tracks and state-machine runtime.
- `src/world/components.ts`: persisted expanded Canvas, RectTransform, Panel, and Button presentation properties.
- `src/store/physics.ts`: normalized and serialized every new UI, input, localization, accessibility, audio, theme, and animation-facing field without deleting unknown compatible data.

## Editor surfaces and layout

- `src/components/PresentationPanel.vue`: unified responsive UI preview, UI themes/variants/tokens, UI audio references, localization CSV/extraction/pseudo/RTL, and source-linked game accessibility. Removed only the obsolete exposed Presentation/Audio tab ownership; project mixing remains available in Audio.
- `src/components/AudioSystemPanel.vue`, `EditorBottomPanel.vue`, `src/store/editor.ts`, `src/editor/workspaces.ts`: added the dedicated Audio bottom system and moved the existing project mixer there.
- `src/components/RuntimeComponentsInspector.vue`: added anchors, offsets, preferred sizes, Canvas DPI/locale/theme variant, every layout container, alignment/justification, modal/popup/tooltip/drag/drop, complete accessibility metadata, and per-button UI audio.
- `src/components/AnimationPanel.vue`: added playback speed, onion skin, easing, markers, and method/audio/nested tracks while retaining dope, curve, Animator, rig/skin, and timeline surfaces.
- `src/panels/SettingsPanel.vue`: redesigned Input Map with search, device filters, compact rows, duplicate/conflict status, connected-device chips, recording/replay, and all advanced binding fields.
- `src/components/WorldCanvas.vue`: exposed runtime accessible state/value/live metadata on the rendered UI overlay.
- `src/i18n.ts`: added English, German, and Chinese strings for every v3.6 presentation control and synchronized the release label.
- Shared component CSS: added bounded grids, wrapping controls, minimum widths, overflow ownership, responsive breakpoints, and readable labels for the new UI/Audio/Input/Animation panels; existing transitions and animations remain.
- `PresentationPanel.vue`, `SettingsPanel.vue`: after measured browser qualification, gave Chinese Audio Effects/Sends and Input Advanced summaries an explicit 20px aligned row so their 18px rendered glyph height cannot overflow a 16px default disclosure box.

## Format, version, references, tests, docs, and release

- `src/projects/projectFormat.ts`, `crates/nova_format/src/lib.rs`, migration fixtures: advanced to engine 3.6.0/schema 26; added a schema-25 presentation migration, validation, and schema 5–26 public coverage.
- `package.json`, Cargo/Tauri manifests and locks, export/package/runtime version authorities: synchronized 3.6.0 and added verify/audit/layout/evidence commands.
- `scripts/export-reference-projects.mjs`, `reference-projects/README.md`: upgraded retained references and added responsive menu, accessible HUD, controller navigation, runtime rebinding, localization, pseudolocalization, RTL, Animator state machine, and sprite animation projects.
- `scripts/verify-v3.6.mjs`, `audit-v3.6.mjs`, `qualify-layout-v3.6.mjs`, `generate-v3.6-release-evidence.mjs`: added executable input/localization/animation/accessibility/layout tests, static requirement audit, multilingual responsive browser qualification, build/SBOM/platform evidence, and S0/S1 gate.
- Retained audit scripts: changed only current engine/schema expectations so all earlier editor, renderer, script, physics, animation, typography, project-data, authoring, and safety coverage still runs against v3.6.
- `README.md`, `README.zh-CN.md`, three Markdown manuals, interactive three-language HTML manual, compatibility/stable-contract/presentation/schema documentation: documented every new surface, migration rule, ownership boundary, test, and support limit.
- `scripts/package-release.ps1`: packages schema-26 web metadata, portable/MSI/NSIS binaries, Web/source/reference/evidence archives, notes, ledger, migration, deprecations, known issues, notices, SBOM, license, and SHA-256 checksums.
- Release-integration corrections: fixed the v3.6 evidence entity constructor arguments, advanced the headless exporter’s future-schema guard from 25 to 26, expanded the public-schema audit to 5–26, marked responsive-preview mock buttons disabled/non-focusable, and updated retained manual/API audits to validate current 3.6 metadata while preserving their original feature coverage.
