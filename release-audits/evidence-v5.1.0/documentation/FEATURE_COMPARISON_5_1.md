# Nova_A 5.1 feature and engine comparison

This document records the product audit that produced the 5.1.0–6.0.0 roadmap in `instructions.txt`. It compares workflows rather than marketing labels: a feature counts only when it can be authored, saved, run, diagnosed, documented and built into a player.

## What Nova_A already provides

Nova_A is a local-first, 2D-focused editor and runtime. Its current surface includes:

- projects, templates, canonical `.nova` data, JSON import/export, migration, recovery, autosave and transactional Undo/Redo;
- scenes, hierarchy editing, stable IDs, dependencies, prefabs, variants, overrides and pooling;
- shape, sprite, text, TileMap, camera, light, particle, UI, audio, navigation, script and physics authoring;
- Canvas2D/WebGL2 rendering, materials, lights/shadows, post-processing, atlases, font shaping and performance diagnostics;
- Rust/WebAssembly rigid-body, character, trigger, joint, rope, query, layer/mask and deterministic fixed-step physics;
- sandboxed Rhai lifecycle scripts, exported properties, signals/tasks/timers, tests, debugger, coverage and hot reload;
- action input for keyboard, mouse, gamepad, touch and gestures, including rebinding, recording and replay;
- animation/state-machine/timeline, audio mixer/spatial playback and responsive/localized UI;
- build presets, web players, desktop sidecar players and matching-host portable desktop players;
- packages/plugins, source-control helpers, project health, profiling, crash recovery and exact release evidence.

The exhaustive inventory and per-version definition of done are in `instructions.txt`.

## Comparison with mature engines

| Area | Godot | GameMaker | Unity | Unreal | Nova_A 5.1 assessment |
| --- | --- | --- | --- | --- | --- |
| Code | GDScript, C#, C/C++ via GDExtension | GML Code | C# | C++ and Blueprint | Rhai is safe and broad for 2D gameplay, but its dynamic entity/component API still needs richer returned handles and queries. |
| Visual logic | No supported built-in gameplay visual scripting in current stable releases | GML Visual actions compile into the same object/event model | Visual Scripting graphs | Blueprint graphs integrated with C++ | Missing in 5.1. A shared-contract graph system is scheduled for 5.2 foundation and 5.3 production tooling. |
| Input | Input Map/actions and events | Object events plus keyboard/mouse/gamepad functions | Input System actions/maps/devices | Enhanced Input and framework events | Strong device/action baseline. Contexts, interaction phases, priority and consumption are scheduled for 5.4. |
| Extension | Editor plugins and GDExtension | Extensions/marketplace packages | Package Manager/editor packages/native plugins | Plugins/modules | Nova_A has signed/hash-checked packages and Plugin API 2, but not yet mature extension points for every dock, graph node, renderer pass and build target. |
| Builds | Export presets/templates; Windows executable plus optional PCK | VM/YYC Windows packaging | Build Profiles/CLI standalone players | Cook, stage, package and deploy pipeline | Nova_A can already emit web, sidecar desktop and embedded single-file players. 5.1 makes portable desktop the new-project default and verifies embedded integrity/player isolation. |
| 2D workflow | General-purpose node engine | Highly approachable 2D object/event workflow | Broad engine with 2D packages | Primarily high-end 3D | Nova_A's opportunity is a smaller, faster, coherent 2D workflow—not feature-count imitation of 3D-first systems. |

## Important missing depth

The primary gaps are visual programming; richer dynamic gameplay APIs; input contexts and phases; reusable gameplay framework components; graph-based shaders/effects; deeper animation/audio/cinematics; production AI/world streaming; optional networking/rollback; broader plugin extension points; qualified Linux/macOS/mobile delivery; and task-teaching documentation.

These are assigned to versions 5.2.0 through 6.0.0 in `instructions.txt`. General 3D, XR, console SDKs and mandatory cloud services are intentionally excluded until a demonstrated product need justifies their weight.

## Official references used

- [Godot scripting languages](https://docs.godotengine.org/en/stable/tutorials/scripting/index.html), [InputMap](https://docs.godotengine.org/en/stable/classes/class_inputmap.html), [editor plugins](https://docs.godotengine.org/en/stable/tutorials/plugins/editor/making_plugins.html) and [Windows export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_windows.html)
- [GameMaker GML overview](https://manual.gamemaker.io/lts/en/GameMaker_Language/GML_Overview/GML_Overview.htm), [GML Visual overview](https://manual.gamemaker.io/monthly/en/Drag_And_Drop/Drag_And_Drop_Overview/DnD_Overview.htm), [object events](https://manual.gamemaker.io/monthly/en/The_Asset_Editors/Object_Properties/Object_Events.htm) and [Windows preferences](https://manual.gamemaker.io/monthly/en/Setting_Up_And_Version_Information/Platform_Preferences/Windows.htm)
- [Unity Visual Scripting](https://docs.unity3d.com/ja/current/Manual/com.unity.visualscripting.html), [Input System](https://docs.unity3d.com/ja/current/Manual/com.unity.inputsystem.html), [Package Manager](https://docs.unity3d.com/Manual/upm-ui.html) and [Windows standalone binaries](https://docs.unity3d.com/cn/6000.0/Manual/WindowsStandaloneBinaries.html)
- [Unreal Blueprint versus C++](https://dev.epicgames.com/documentation/en-us/unreal-engine/coding-in-unreal-engine-blueprint-vs-cplusplus), [plugins](https://dev.epicgames.com/documentation/en-us/unreal-engine/plugins-in-unreal-engine) and [packaging](https://dev.epicgames.com/documentation/en-us/unreal-engine/packaging-your-project)

