# Official competitor research — Phase II / 26.33

Retrieved 2026-09-28. Research is in progress. Use documentation to identify categories and practical workflows, not to duplicate APIs or assume equivalent implementations. Current manual channels may change independently of an installed editor; release labels are not inferred from search-result dates.

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
