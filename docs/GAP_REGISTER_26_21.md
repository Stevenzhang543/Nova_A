# Durable capability and qualification gaps — 26.21

Source-freeze status: 26.21 implementation and focused checks are recorded below; final qualification and packaging status are determined by the source-bound release evidence. The 26.20 evidence is retained historical evidence, not evidence for modified source. See the [implementation manual](ROADMAP_26_21_TO_26_30.md) for acceptance criteria.

| ID | Gap / boundary | Status | Owner release |
|---|---|---|---|
| UI-01 | Every panel readable at 100/150/200% text scale, narrow docks, three locales and five palettes; containment alone is insufficient | Partial; inspector/Settings user checks passed, broader capacity findings and full qualification remain open | 26.21 |
| EDIT-01 | Delayed controls can outlive their project; fallback keys can merge independent fields | Fixed for the tested control/session lifetime cases; twelve focused foundation regressions passed | 26.21 |
| EDIT-02 | Every authored field traced through validation, undo/redo, save/load and preview/export | Route inventory available; exhaustive behavioral qualification open | 26.21 baseline / 26.22 completion |
| SCRIPT-01 | Full module invalidation, dynamic-value introspection and safe reload state contract | Partial; existing Rhai functionality retained | 26.23 |
| GRAPH-01 | All supported source constructs structurally editable with equivalent bidirectional semantics | Partial; raw source preservation is not typed-node support | 26.24 |
| DEBUG-01 | Actual VM pause/step, stack/watch and task lifetime capability proof | Partial; declarations/settings not sufficient | 26.25 |
| ASSET-01 | Complete dependency invalidation and transactional resource lifecycle | Partial; deeper rename/reimport/delete/export scenarios required | 26.26 |
| RENDER-01 | End-to-end frame-time evidence at equal resolution/AA/effects on representative hardware | Partial; 26.20 CPU batching benchmark is not total FPS | 26.27 |
| RENDER-02 | Directional-shadow and backend capability boundaries | Retained limitation | 26.27 |
| MEDIA-01 | Deep animation/audio/IME/accessibility exported behavior | Partial; real device observations pending | 26.28 |
| NET-01 | Full deterministic simulation rollback and truly windowless native authority | Not provided by existing partial replay/renderer-disabled mode | 26.29 |
| PLATFORM-01 | Matching Linux/macOS/Android builds and device qualification | External environment unavailable; Windows only | 26.29–30 |
| QUAL-01 | Production signing, disposable installer lifecycle, independent humans/assistive technology/security review | External qualification pending | 26.30 |
| QUAL-02 | True-duration 72-hour soak, low-end/mobile/public hostile-network evidence | Pending; accelerated tests cannot substitute | 26.30 |

Retained features outside the operation catalog include five semantic palettes, remembered light/dark selections, high contrast and reduced motion; configurable resolution/MSAA with actual sample/backing counters; retained upload buffers and linear batching; lazy editor/player loading; optimized Rust/WASM/native build profiles; recovery and offline/moved-source release checks; forty starters and localized manuals. See [26.20's detailed feature boundaries](QUALIFICATION_FEATURE_GAPS_26_20.md) and [26.20's template inventory](TEMPLATE_LIBRARY_26_20.md). No feature or animation is intentionally removed by 26.21.

Do not close a row using a catalog declaration, source-path existence check or a renamed historical report. Attach the actual modified-source test or external observation. Broader outcomes can remain partial even after a bounded defect is fixed.

SCRIPT-02 (26.23, open): project dependencies currently use bounded, literal, module-scope `use` directives. Native Rhai import/namespace syntax and aliases are explicitly rejected by `scriptModules.ts`. Namespaced isolation/dynamic loading must not be inferred from the generic “modules” feature label. Close only with a compatibility contract, VM execution and code/graph/module round-trip evidence.

IMPORT-01 (26.21): reproduced historical partial-production migration failure fixed with absent-leaf defaults and 48 passing Rust format tests. Existing authored values and explicit invalid-value rejection are retained.

PERF-LOAD-01 (26.22/26.27): the 5,001-entity browser import exceeded the default 30-second command deadline after the migration repair. Diagnose separately from virtual-row correctness; a longer diagnostic timeout cannot close the performance finding.

UI-SELECT-01 (26.21/26.22): the corrected-font preflight has no short text/numeric fields in its visited states, but 74 states flag selected-option text clipping in native selects. Preserve these findings until full-value discoverability and the relevant interactions are verified. See PANEL_FINDINGS_26_21.md.

REFERENCE-01 (26.21): all 213 historical references now pass actual rebuilt-WASM migration and idempotence after missing-default, input-device, API-version, legacy script-reference and three exact duplicate-component-ID repairs. Gameplay and full editor loading are separate evidence.

PERF-LOAD-01 update: profiled unbound-group scans and stable-control ID collision searches are repaired with focused regressions. A subsequent browser open completed in 47,388 ms. Keep the performance gap open: one software-rendered development run does not establish acceptable responsiveness or frame rates.

UI-HIERARCHY-01 (26.21, focused repair verified): moved virtual spacing into an inner rows wrapper so the scroll container no longer expands to the entire scene height. Actual browser input reaches/selects entity 5,001 at 200% scale with 15 rendered rows and correct 58px spacing. Full docking/conditional-state acceptance remains separate.
