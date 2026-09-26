# Nova_A 26.28 / 26.28.0

Baseline: immutable26.27 source752c8bb666d0a500cb273e45e2ee7dd732ccddbbd8662ca3964b53fd6d4678df. Existing uncommitted26.27 changes and releases preserved. Project Format2/schema29 unchanged.

## Requirements and consequences
- Shared timeline nested blend/seek/reverse correctness; preserve animation, rig and sample clocks.
- Timeline/mixer readable long paths and stable selection/transport; distinguish preview presentation from authored state.
- Game UI focus/modal/controller/IME/touch and localized accessible text remain effective in preview/export.
- Review EN/DE/ZH key/help/diagnostic coverage and reactive locale changes; retain user-authored identifiers.
- Author localized menu/cutscene/music/captions, curves and gain; scrub/undo/save/reopen/export.
- Add Chinese comments, per-path change ledger, three-language lesson and independent11file releases.

## Risk-based checks
Current native/WASM/Web build and package integrity remain required. Execute affected media clocks/PCM/serialization and game UI focus/input tests, changed media panel locale/palette checks, actual cutscene export/playback. Do not repeat unrelated renderer benchmarks,40template walkthrough, extended network matrices, full dependency audit or five-minute idle measurements where ownership is unchanged. Any newly discovered affected owner adds a focused regression.

## External limits
Only this Windows host available. Real device audio quality, physical controllers/mobile/IME candidate windows, assistive technology, other OS builds and clean installation remain separately unqualified. Automated DOM/WebAudio checks do not certify human perception or screen-reader usability.

## Requirement-to-evidence map
| Requirement | Owning implementation / execution |
| --- | --- |
| Nested sequence/fade/reverse/seek; blend/rig/curve boundaries | MEDIA_26_28.md; new media module tests plus49 retained animation/audio cases and PCM tests |
| Authored vs audition mix, long bindings, readable transport/mixer | AnimationPanel, PresentationPanel, audioAudition; real media-layout user controls and current-source serialization |
| Text/IME/focus/controller/touch/RTL and event actions | GAME_UI_26_28.md; real runtime tests and downloaded animated-menu Web player input |
| Locale fallback and graph/help/diagnostic text | LOCALIZATION_26_28.md; central direct-key inventory, placeholder/explicit translation coverage, actual Vue locale recomputation and game UI fallback |
| Cutscene/menu/music/captions; scrub/undo/reopen/export | verify-v26.28-menu-user + verify-v26.28-animation-authoring-user; actual saved artifacts and replay |
| Three locales/five palettes/large text | verify-v26.28-media-layout (54 affected panel surfaces), preserved localized manuals and current lesson |
| Rename/reimport/undo media bindings and no dropped serialized fields | verify-v26.28-media-bindings: actual rename/reimport transactions, exact-byte Undo/Redo, save/reopen and target sampling; media-roundtrip corpus and downloaded project |
| Clean delivery | current Windows/WASM/Web builds, versioned runtime/export smoke, source snapshot, independent11artifact verification |

The exact original Godot families remain explicitly narrower: browser text shaping/fonts/native IME instead of independent TextServer; existing normalized rig/controller semantics rather than arbitrary Godot AnimationTree/plugins; browser media streaming instead of all device drivers. Invalid unsupported documents are rejected by retained tests instead of silently accepted. See subsystem notes for source references. No claim that a structural document inventory is a human translation or assistive-device acceptance review.

Development failures retained: initial public launch label remained26.27 despite engine26.28.0 and was corrected; the new binding details required the old authoring test to select validation details explicitly. Optional same-version reopening no longer assumes a migration dialog. These fixes do not weaken the authored-value assertions.

The populated200% media layout check found genuine header/transport overlap: creation labels wrapped into excessive height and the timeline workspace collapsed. AnimationPanel now keeps all creation actions single-line in a scrollable strip, guarantees360px workspaces and disables narrow sticky transport. The same reachability assertions are retained; full geometry/failure captures remain in development evidence.

Final footer inspection found hardcoded26.24 labels in allthree editor dictionaries. The labels now share the publicrelease constant, with currentversion assertions. Candidate1 is retained as invalidated evidence; candidate2 is the final source candidate.
