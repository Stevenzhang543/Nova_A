# Nova_A 26.01 competitive review

Reviewed 2026-09-02 against current official documentation.

## Product boundary

Nova_A is a lightweight, local-first 2D engine/editor. It should beat larger engines in startup, directness, deterministic recovery, explainable physics evidence, safe extension boundaries, and code/visual parity. It does not pursue 3D, XR, ray tracing, console SDKs, or AAA film/world tooling in this cycle.

## Current strengths

- A focused 2D scene/component workflow with exact grid-to-world units, WebGL2/Canvas fallbacks, authoring and runtime Inspectors, and portable/Web exports.
- Rust/WASM physics and Rhai execution with bounded commands, deterministic tests, collision evidence, replay, validation, and explicit failure containment.
- Local-first project storage, atomic transactions, autosave/checkpoints, migration preview/rollback, project trash, external-change handling, and offline package workflows.
- One learnable editor shell with six workspaces, searchable commands, configurable shortcuts, EN/DE/ZH localization, accessibility evidence, and low-end profiles.
- A typed Visual Graph and Rhai API intended to represent one behavior, plus packages, automation, networking, AI/navigation, animation, audio, UI, profiling, and deterministic release tooling.

## Godot comparison

Godot remains ahead in mature scene/node/resource scale, optional static GDScript typing, C# and native GDExtension, editor scripts/plugins, live scene/script editing, remote inspection, simultaneous play instances, broad desktop/mobile/Web delivery, 3D, visual shaders, navigation, and its ecosystem. Nova_A is intentionally smaller and currently stronger only where it provides more explicit local recovery, bounded scripting permissions, deterministic release evidence, and focused 2D physics diagnostics.

Gaps to close: statement-level debugging, stronger typed Rhai analysis, remote/runtime inspection parity, multiple embedded play instances, mature native extension ABI evidence, larger asset/package ecosystem, matching-host delivery, native accessibility adapters, and deeper content interchange.

Official references: https://docs.godotengine.org/en/stable/about/list_of_features.html, https://docs.godotengine.org/en/stable/tutorials/editor/script_editor.html, https://docs.godotengine.org/en/stable/tutorials/export/exporting_projects.html

## GameMaker comparison

GameMaker remains easier for a beginner to understand because Sprite → Object → Event → Room is short, its Asset Browser is mature, GML Code has a large gameplay-oriented function surface, and GML Visual chains parameterized actions directly inside object events. Its documentation presents visual actions and generated code as two views of game logic.

Nova_A already has a more explicit component model, deterministic physics evidence, recovery, permissions, build provenance, and broader production panels. It remains behind in immediate object-event authoring, visual-action polish, template variety, asset-browser discoverability, and proven code/visual conversion.

Official references: https://manual.gamemaker.io/lts/en/GameMaker_Language.htm, https://manual.gamemaker.io/monthly/en/Drag_And_Drop/Drag_And_Drop_Overview/DnD_Overview.htm, https://manual.gamemaker.io/monthly/en/The_Asset_Editors/Object_Properties/Object_Events.htm

## Scratch comparison

Scratch is not a production game engine, but it is the clearest reference for block literacy: semantic color families; recognizable hat, command, reporter, Boolean, and control shapes; drag-to-stack sequencing; direct inputs; Events, Control, Sensing, Operators, Variables, and My Blocks; immediate feedback; and no invisible wiring requirement for ordinary sequences.

Nova_A 26.01 adopts those learnability principles without copying Scratch assets or limiting advanced users. Block mode uses Scratch-like semantic families and stack order while Node mode retains typed data wires, advanced routines, interfaces, package nodes, debugging, and production metadata. Lossless bounded Rhai blocks remain the honest fallback for syntax that cannot be normalized safely.

Official references: https://scratchfoundation.org/learn/learning-library, https://resources.scratch.mit.edu/www/guides/en/scratch-getting-started-guide.pdf

## Capability verdict

Nova_A can produce complete 2D games with keyboard, mouse, touch/gamepad mappings, physics, UI, animation, audio, saving, networking, AI/navigation, scripts/graphs, and portable Windows or hosted Web output. It is not yet a drop-in replacement for Godot or GameMaker: platform evidence, ecosystem size, language/compiler depth, remote debugging, visual-authoring conversion coverage, and independent production use remain the largest gaps. The 26.01–26.10 roadmap closes those gaps in that order while keeping the lightweight 2D boundary.
