# Official competitor research — Phase II / 26.34

Initial retrieval2026-09-28; specific workflow contracts revisited2026-10-01. Research for the listed2D workflow scope is complete; unsupported comparator details remain explicit. Use documentation to identify categories and practical workflows, not to duplicate APIs or assume equivalent implementations. Current manual channels may change independently of an installed editor; release labels are not inferred from search-result dates.

| Source | Evidence read | Implication for Nova_A |
|---|---|---|
| [Godot stable 2D index](https://docs.godotengine.org/en/stable/tutorials/2d/index.html) | Dedicated rendering/physics; tilemap, animation, particles, lighting, custom drawing, parallax and navigation topics | Preserve coherent coverage and test cross-system behavior rather than counting components |
| [Godot canvas transforms](https://docs.godotengine.org/en/stable/tutorials/2d/2d_transforms.html) | Explicit viewport/canvas transform relationships | Coordinate conversion and hierarchy deserve foundational regression cases |
| [Unity 2D manual](https://docs.unity3d.com/Manual/Unity2D.html) and [Unity 6.3 workflow](https://docs.unity3d.com/6000.3/Documentation/Manual/2d-game-creation-wokflow.html) | 2D sprites/tilemaps/physics are grouped with the game-creation workflow | Validate an authored game across assets, scene, runtime and export; do not port Unity architecture |
| [GameMaker Room Editor](https://manual.gamemaker.io/monthly/en/The_Asset_Editors/Rooms.htm) | Layered instances, sprites, tiles, paths, sequences, text, particles and contextual room tooling | Reusable levels and contextual editing matter more than one large inspector |
| [GameMaker Tile Set Editor](https://manual.gamemaker.io/monthly/en/The_Asset_Editors/Tile_Sets.htm) | Dedicated tileset authoring | Audit usable paint/terrain/animated-tile workflows, not merely a TileMap class |
| [GameMaker GML reference](https://manual.gamemaker.io/monthly/en/GameMaker_Language/GML_Reference/GML_Reference.htm) | Assets, movement/collision, cameras, input, physics, time, files and debugging are explicit API categories | Trace Nova_A host bindings and failure paths for equivalent game tasks |
| [Defold manuals](https://defold.com/manuals/) | Collections/factories, resources, animation, GUI, physics, audio, input, scripts, files, rendering and profiling | Core workflows can be composed from small systems; advanced features can use extensions |
| [Defold building blocks](https://defold.com/manuals/building-blocks/) and [animation](https://defold.com/manuals/animation/) | Object/component/collection model and animation families | Evaluate Nova_A's existing abstractions before adding parallel systems |
| [Construct manual](https://www.construct.net/en/make-games/manuals/construct-3) | Project primitives, plugins, behaviors and event-driven authoring | Audit no-code workflows as real runtime paths |
| [Construct pathfinding](https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/pathfinding) | Grid A*, asynchronous completion and explicit failure conditions | Navigation needs failure/lifecycle tests and measurable cost, not a checkbox |
| [Construct runtime save conditions](https://www.construct.net/en/make-games/manuals/construct-3/system-reference/system-conditions) | Save/load completion and failure, including storage quota | Runtime save failure must be actionable and distinct from editor project save |
| [Construct Tilemap](https://www.construct.net/en/make-games/manuals/construct-3/plugin-reference/tilemap) | Tile authoring and runtime tile data | Check editor-to-runtime persistence and tile collision integration |

No competitor-wide COMPLETE judgement follows from these index pages. Granular matrix entries need their corresponding manual section and a precise capability scope. Full GPU particle simulation, enterprise services, 3D and untested platform certification are not automatic Nova_A requirements.

## Additional specific contracts

- [Godot nodes and scenes](https://docs.godotengine.org/en/stable/getting_started/step_by_step/nodes_and_scenes.html): reusable saved node trees, editable properties, callbacks and startup scene selection. Nova_A should prove its existing prefab/scene transactions rather than replace ECS with a node tree.
- [Godot save-game tutorial](https://docs.godotengine.org/en/stable/tutorials/io/saving_games.html): select persistent data and serialize it explicitly. Nova_A's custom serializers and slots serve this workflow; a scene file is not a runtime save.
- [Godot physics introduction](https://docs.godotengine.org/en/stable/tutorials/physics/physics_introduction.html): distinct body/area roles, layers and fixed-step motion. Cross-platform deterministic replay is not assumed from fixed timestep alone.
- [Defold physics](https://defold.com/manuals/physics/): physics-world/component integration. Nova_A retains its own Rust solver; this reference informs capability checks, not a solver replacement.
- [Defold GUI](https://defold.com/manuals/gui/): authored GUI scenes and runtime nodes are a distinct game-facing system. Nova_A's Game UI tests remain separate from editor layout tests.
- [GameMaker physics](https://manual.gamemaker.io/monthly/en/GameMaker_Language/GML_Reference/Physics/Physics.htm): dedicated physics API family. API existence is not evidence of identical collision semantics.

The Construct physics page repeatedly failed retrieval; no detailed claim is derived from that failure. Its successfully read navigation, tilemap and save/load documents remain valid comparison evidence. Unity's unversioned manual identifies 6000.6 on this retrieval; the separately cited 6000.3 workflow is explicitly versioned and is not labeled the latest stable release.

## 26.34 workflow review — retrieved 2026-10-01

| Official manual | Practical contract and decision |
|---|---|
| [Godot input events](https://docs.godotengine.org/en/stable/tutorials/inputs/inputevent.html) | InputMap and UI accept_event precede unhandled gameplay. Repair wheel consumption rather than global suppression. |
| [Defold input](https://defold.com/manuals/input/) | Project bindings, focus stack and consumption are distinct; editor/native widgets must not emit game actions. |
| [Unity6000.6 Runtime UI event system](https://docs.unity3d.com/6000.6/Documentation/Manual/UIE-Runtime-Event-System.html) | Pointer focus and propagation/default actions are distinct. Explicit versioned manual; no latest-release claim. |
| [Godot containers](https://docs.godotengine.org/en/stable/tutorials/ui/gui_containers.html) | Parent containers own child layout; retain bounded shared editor controls. |
| [Defold GUI layouts](https://defold.com/manuals/gui-layouts/) | Authored layout behavior needs runtime tests at varied viewport sizes. |
| [Construct text input](https://www.construct.net/en/make-games/manuals/construct-3/plugin-reference/text-input) | Native text is a separate input/control path; gameplay must not consume its scrolling/typing. |
| [Godot project settings](https://docs.godotengine.org/en/stable/tutorials/editor/project_settings.html) | Startup/settings discovery and persistence are separate from runtime state. |
| [Defold project settings](https://defold.com/manuals/project-settings/) | Trace settings through project save and build rather than count inspector fields. |
| [GameMaker debugger](https://manual.gamemaker.io/monthly/en/IDE_Tools/The_Debugger.htm) | Live debugging needs actual runtime ownership and actionable errors. |
| [Construct debugger](https://www.construct.net/en/make-games/manuals/construct-3/interface/debugger) | Runtime inspection is distinct from designer output. |
| [Godot profiler](https://docs.godotengine.org/en/stable/tutorials/scripting/debug/the_profiler.html) | Measurements are scoped to recorded work; no substitute for GPU/physical latency. |
| [Unity6000.6 Profiler](https://docs.unity3d.com/6000.6/Documentation/Manual/Profiler.html) | Module/device measurements differ; unsupported telemetry must remain unavailable. |
| [GameMaker profiler](https://manual.gamemaker.io/monthly/en/IDE_Tools/The_Debugger/The_Profiler.htm) | Expose measured cost and clear capture status. |
| [Defold profiling](https://defold.com/manuals/profiling/) | Local sampling and runtime diagnostics do not imply all-hardware budgets. |
| [GameMaker shortcuts](https://manual.gamemaker.io/monthly/en/IDE_Navigation/Keyboard_Shortcuts.htm) | Context matters; preserve editor shortcuts outside Play. |
| [Defold editor](https://defold.com/manuals/editor/) | Contextual tools, reusable resources and practical navigation are useful patterns. |
| [Defold editor scripting](https://defold.com/manuals/editor-scripts/) | Batch undoable actions; use existing project mutation/history owners. |
| [Godot script editor](https://docs.godotengine.org/en/stable/tutorials/editor/script_editor.html) | Diagnostics and source navigation should preserve drafts and valid runtime state. |

These are workflow inferences applied to Nova_A, not claims of copied implementations. This release adds no copied third-party code or dependency.
