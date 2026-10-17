# Nova_A26.20 release notes (machine26.20.0)

Nova_A26.20 improves renderer throughput and output quality, integrates the five supplied editor palettes, and refreshes the teaching and qualification material. Every existing feature, animation system, starter and previous reference remains in the source. Public Project Format2/schema29 and scripting/package APIs stay unchanged.

## Rendering and performance

WebGL packet batching now counts vertices and indices incrementally instead of repeatedly scanning the current batch. Steady frames retain CPU upload arrays and GPU storage; uploads contain only used values. Index-heavy batches split at the memory boundary while preserving every packet and painter order. Renderer disposal releases retained memory.

Rendering → Quality adds Auto, Off, MSAA2/4/8 and resolution scale0.5–2. These are project settings shared by the editor and exported player, including save/reopen and Undo/Redo. Supported multisampling resolves before post-processing; an exact texel-copy presentation handles disabled or failed post effects. Actual backing dimensions and sample counts are visible. Device/allocation bounds can reduce samples; see the performance budgets. Canvas2D retains its compatibility path. Resolution changes preserve the logical camera and input coordinates. The existing Profiler adaptive-presentation option can lower effective density under sustained load; turn it off when a fixed resolution is required.

Optimized Rust builds use optimization level3, thin link-time optimization and one code-generation unit for both workspace and desktop crates. Debug symbols are stripped; panic unwind/recovery remains available. No animation, effect, simulation system or render command was deleted for a benchmark.

## Palettes and teaching

Settings offers Cloud Blue, Meadow Cream, Blush Berry, Midnight Blue and Night Garden using all six supplied semantic roles. Light and dark choices are remembered separately. Existing high-contrast, reduced-motion and scale controls remain available. Shared editor surfaces inherit the palette; authored game content keeps its own colors.

Panel layout repairs make enlarged controls grow with their text, keep Automation grid areas consistent at narrow widths, give hierarchy filters a full row, and prevent data actions, help icons and teleported favorite stars from clipping. Existing transitions and actions are retained.

Complete English, German and Chinese qualification lessons are integrated into the cumulative manuals, with visible context-help links. The refreshed inventory lists402 registered operations, including the repaired object-family readiness policy; the source index is a navigation aid, not proof of exhaustive semantic correctness. All40 starter walkthroughs are provided in three languages. Six new references cover Code, Blocks, Mixed, output quality, an animated menu and the retained renderer-disabled server workflow.

See [every edit](EDIT_LEDGER_26_20.md), [feature inventory](FEATURE_INVENTORY_26_20.md), [retained gaps](QUALIFICATION_FEATURE_GAPS_26_20.md), [all starters](TEMPLATE_LIBRARY_26_20.md), [performance budgets](PERFORMANCE_BUDGETS_26_20.md) and [audit tracker](IMPLEMENTATION_TRACKER_26_20.md).

## Qualification boundaries

Only fresh executed reports tied to the frozen source certify this release. The plan requires21 common gates plus the expanded palette/panel, rendering, retained subsystem, authoring and clean/moved-build audits. Checks include actual browser input, exported game playback, animated-menu authoring, exact saved/exported data, migration/recovery, deterministic packages and dependency audits. Failed preflight evidence remains available; later passing evidence must cover each repaired defect.

Only the current Windows host is available. Linux/macOS, Android, production signing and disposable installer lifecycle, independent beginner/expert observation, assistive technology, real low-end/mobile performance, independent security review, public multiplayer infrastructure and an actual72-hour soak remain external. The headless authority remains a renderer-disabled WebView, not a windowless server. Software-rendered browser timings do not establish universal hardware FPS. No zero-defect or Godot/GameMaker-parity claim is made.

Release delivery requires exactly11 files under releases/v26.20 with independently verified source/artifact/evidence hashes. Earlier release folders were absent when rechecked during26.20; their original archived source/evidence is retained, but absent release binaries cannot be reverified.
