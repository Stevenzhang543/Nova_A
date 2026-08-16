# Nova_A 3.2.0 Complete Manual

Nova_A is an open-source 2D game engine and editor. This manual describes the complete editor-to-player workflow in Nova_A 3.2.0. One world unit is one configured grid unit; physics values use SI-style units where shown.

## Contents

1. Getting started
2. Project Manager and templates
3. Editor layout and every top-level control
4. Scene editing, hierarchy and layers
5. Inspector and component workflow
6. Stable component reference
7. Physics manual
8. Connections, joints and rigid binding
9. Renderer and camera
10. Assets and project folders
11. Input and scripting reference
12. Animation, audio, UI, tilemaps and particles
13. Scenes, prefabs and play mode
14. Console, profiler and debugger
15. Save-game API
16. Plugins
17. Build and export
18. Migration and compatibility
19. Tutorials
20. Shortcuts and troubleshooting
21. Asset pipeline, packages, Plugin API 2 and Physics Monitor
22. Worlds, navigation and gameplay tools
23. Responsive UI, themes, localization, audio and accessibility

## 1. Getting started

1. Start Nova_A. The Project Manager appears before the editor.
2. Choose a template, enter a project name and press **Create Project**, or use **Open Project** for an existing `.nova`/JSON project.
3. Use the Scene page to create and position entities. Add components in the Object Inspector.
4. Configure named actions under Settings > Input Map instead of hard-coding keys in scripts.
5. Press **Play**. Test gameplay in the Game page; use Pause and Step for diagnosis.
6. Save the editable project with File > Save Project.
7. Open Build Settings, order the scenes, choose the startup scene and target, then Build.

Editing and runtime are isolated. Changes made during Play are discarded when Stop restores the edit-time snapshot.

## 2. Project Manager and templates

The startup Project Manager contains:

- **Open Project**: validate and open a `.nova` or JSON project without changing its identity.
- **Import Project**: open the selected document as a new copy with a new project UUID.
- **Continue Project**: return to the project that was open before the manager.
- **Project name**: the display/build name, sanitized to 80 characters.
- **Create Project**: creates and validates the selected template.
- **Recent Projects**: locally cached recent snapshots. If a project is too large for the cache, select its file again.
- **× beside a recent project**: removes only the recent entry, never the project file.
- **Language**: switches English, German and Chinese immediately.
- **Manual** and **GitHub**: open this documentation and the source repository.

Templates:

- **Empty 2D**: clean scene, Camera2D, input map and build settings.
- **Platformer**: sprite, animation, input, script, rigid body, colliders, tilemap, audio and HUD.
- **Top-down**: two scenes, prefab spawning, trigger transition, enemy patrol, particles and save data.
- **Physics Sandbox**: bodies, materials, distance joint, collision and a physical breakable rope.

## 3. Editor layout and controls

### Top bar

**File**

- **Project Manager** returns to the startup manager after caching the current project.
- **Save Project / Ctrl+S** downloads or saves the complete editable project.
- **Import Project** validates and opens a project through the same compatibility path as the manager.
- **Clear Scene** removes scene entities/connections after the Nova confirmation dialog. It is undoable.

**Edit**

- **Undo / Ctrl+Z**, **Redo / Ctrl+Y or Ctrl+Shift+Z**.
- **Copy / Ctrl+C**, **Paste / Ctrl+V**, **Duplicate / Ctrl+D** preserve component and hierarchy data with new UUIDs.
- **Rename / F2** edits the selected entity name.
- **Delete / Delete or Backspace** uses the in-app confirmation UI.
- **Deselect / Escape** clears selection.

**View**

- **Grid** toggles parallel grid lines only.
- **X Axis**, **Y Axis**, **All Axes** affect axes without hiding the grid.
- **Reset Camera** restores editor pan/zoom.
- **Console**, **Profiler**, **Project**, **Build Settings** open the corresponding bottom panel.

**Help** opens this Manual or the Nova_A GitHub page. The release pill shows the running engine version.

### Page switcher

- **Scene**: editable world, selection outlines, hierarchy tools and gizmos.
- **Game**: active Camera2D output and runtime UI; native text fields work here.
- **Settings**: theme, language, accessibility, physics defaults, input, audio, plugins, save data and safety.

### Workspaces, panels and command palette

The strip below the top bar contains five task layouts. **Design** keeps Hierarchy and Inspector visible with the bottom drawer folded. **Script** opens the dedicated full-width Script Studio. **Animation** opens the Animation tool. **Interface** keeps scene hierarchy and Inspector available for UI construction. **Debug** switches to Game and opens Console. Workspace switches rearrange existing tools; they never remove project data or editor features.

The **H**, **I**, and **B** controls independently show or hide Hierarchy, Inspector, and the bottom drawer. **Focus Mode** temporarily hides all three without erasing the saved layout. Layout choices are local to this computer and do not modify the project. View > Reset Layout restores Design defaults. The minimum supported editor window is 900 x 600.

Press **Ctrl/Cmd+K** or **Ctrl/Cmd+Shift+P** to open the Command Palette. Type to find a workspace, Scene/Game/Settings page, bottom tool, panel toggle, Focus Mode, or Reset Layout. Use Up/Down, Enter, and Escape for keyboard-only operation.

The Inspector header stays visible while scrolling. Its search matches section/component names; category chips show All, General, Transform, Rendering, Physics, Gameplay, or UI. **Add Component** opens the searchable categorized picker at the top, so adding a component no longer requires reaching the bottom. Search and categories only change presentation; they do not disable or remove components.

### Mouse/shape toolbar

- **Select**: click an entity; Shift toggles selection. Drag empty space for marquee selection.
- **Move, Rotate, Scale**: transform selected entities with gizmos and snapping.
- **Rectangle, Ellipse, Triangle**: drag from press to release to create a shape. Very short exit clicks are suppressed to prevent accidental shapes.
- Mouse wheel zooms; middle/right-drag pans according to editor context.
- **Play** starts the isolated runtime. **Pause** freezes it. **Step** advances exactly one fixed physics tick. **Stop/Reset** restores edit state.

## 4. Scene, hierarchy and layers

The Hierarchy lists every entity in the active scene. Search filters by name. Click arrows to expand children. Dragging/reparenting uses Transform2D parent UUIDs and rejects cycles. Locked entities cannot be edited; hidden entities remain in the scene but are omitted from editor drawing.

Layer controls create, rename, duplicate, reorder, isolate and delete layers. Rendering/sorting layers and physics layers are separate concepts. Physics bodies on different physics layers do not interact unless their layer/mask combination allows it; Nova_A connections additionally require the same editor layer.

The scene list creates, renames, loads/unloads, duplicates, deletes and selects scenes. Runtime scene switching accepts either scene UUID or exact scene name. Entities marked persistent survive runtime scene changes.

## 5. Inspector workflow

Select an entity to open the Object Inspector. Common controls are name, enabled/visible/locked state, tags, layer, prefab state and components. Each component has enable, copy, paste, reset and remove controls where legal. Transform2D cannot be removed. **Add Component** shows compatible components; components marked unique cannot be added twice.

Numeric fields reject non-finite values and clamp only where the property has a physical or format limit. Grid snapping uses world units: entering or moving 10 means exactly 10 world/grid units.

The right-side UI Add area creates Canvas, Panel, Image, Text, Button, Slider, Progress Bar, Checkbox and Text Input. Non-Canvas UI automatically receives an existing root Canvas or creates one. New controls receive readable sizes and staggered positions. UI appears and is selectable in both Scene and Game views. Image import accepts project image assets; missing images display a diagnostic placeholder. Text Input uses native IME, selection, paste and password input in Game view.

## 6. Stable Component API 2.0

Every component owns a persistent UUID plus `enabled` and `removed` state.

| Component | Purpose and main properties |
|---|---|
| Transform2D | Mandatory local position, radians rotation, scale and parent UUID. World transform is derived through hierarchy. |
| Camera2D | Active flag, orthographic size, zoom, background, pixel-perfect mode, normalized viewport and sorting range. |
| SpriteRenderer2D | Image asset, tint, opacity, size, pivot, flips, sorting layer/order, material and filtering. |
| ShapeRenderer2D | Rectangle/ellipse/polygon geometry, fill/stroke/texture, opacity, material and sorting. |
| TextRenderer2D | World text, font asset, size, weight, alignment, color and sorting. |
| RigidBody2D | Dynamic/kinematic/static type, density/manual mass, inertia, velocity, damping, gravity scale, constraints, sleep and CCD. |
| BoxCollider2D | Box size/offset, material, sensor, one-way, physics layer and mask. |
| EllipseCollider2D | Ellipse radii; equal radii form a circle. Same material/sensor/layer controls. |
| PolygonCollider2D | Valid convex vertices plus collider material/filter controls. |
| FixedJoint2D | Locks relative position and rotation to a target body. |
| DistanceJoint2D | Keeps a target distance using stiffness/damping and optional connected collision. |
| RevoluteJoint2D | Shared anchor with free/limited rotation. |
| PrismaticJoint2D | Motion along one configured axis with optional limits. |
| SpringJoint2D | Damped Hooke spring between anchors. |
| Rope2D | Breakable segmented connection with anchors, stretch/bend/collision properties. Connection objects expose this behavior in the editor. |
| Script2D | Rhai asset, exported inspector properties, enabled state and last error. |
| Animator | Controller asset, speed, autoplay/current state and typed parameters. |
| AudioSource | Audio clip, volume, pitch, loop/autoplay, bus and spatial attenuation. |
| AudioListener | Active game listener used for spatial audio. |
| ParticleEmitter2D | Rate/burst, lifetime, maximum count, velocity range, colors, opacity and optional texture. |
| Canvas | Root reference resolution, scale-with-screen and sorting order. |
| RectTransform | UI parent, anchor preset, position and pixel size. |
| Panel | Screen-space fill, opacity and corner radius. |
| Image | Image asset, tint, opacity and fitting mode. |
| Text | UI text, font, size, weight, alignment, color and opacity. |
| Button | Normal/hover/pressed/disabled colors, interactable state and runtime click state. |
| Slider | Minimum, maximum, value, step, direction and interactable state. |
| ProgressBar | Minimum, maximum, value and fill color; display-only. |
| Checkbox | Boolean value, label, colors and interactable state. |
| TextInput | Value, placeholder, maximum length, multiline/password/interactable flags and colors. |
| TileMap2D | TileSet asset, dimensions, tile size, chunk size, cell data and collision mode. |

`Panel`, `ProgressBar`, `Checkbox` and `TextInput` are stable Nova_A extensions to the minimum 2.0 component list. `EllipseCollider2D` is the stable generalized circle collider.

## 7. Physics manual

Nova_A runs a persistent Rust PhysicsWorld on a fixed timestep. Rendering refresh rate does not change the result. Tick rate and maximum catch-up steps are configured in scene settings.

- **Dynamic** bodies integrate force, impulse, gravity and collision response.
- **Kinematic** bodies follow configured velocity without forces but transfer motion to dynamic bodies.
- **Static** bodies never integrate movement.
- Automatic mass is density × area; manual mass uses the entered positive value. Automatic inertia uses analytic shape geometry.
- Force is continuous Newtons; impulse is instantaneous N·s. Torque and angular impulse use the selected application point and inertia.
- Linear/angular damping are time-step-independent exponential damping. Friction accepts values above one. Restitution threshold suppresses low-speed bounce.
- Sensors report enter/stay/exit without collision impulses. One-way platforms block from the configured side.
- Discrete is cheaper; Continuous enables adaptive substeps for fast bodies.
- Sleeping reduces stationary work and wakes on relevant force, impulse, transform or contact.
- Raycast, raycast-all, overlap point/shape and shape-cast APIs honor masks and return sorted precise hits.

Physics and rendering layers are independent. A SpriteRenderer never creates a collider, and a collider never guarantees visible artwork.

## 8. Connections, ropes, joints and binding

Open Connections from an entity. Choose exactly two objects on the same layer.

1. Choose **Straight** or **Manual**. Manual paths are smoothed.
2. Drag from a center anchor or exact surface/side/vertex point on the first object to the second.
3. Center anchors are blue rings with white centers. Disable **Display center** to hide them while drawing.
4. Configure stretch, bend, stiffness, damping, maximum stretch, bend/stretch tolerances, thickness, density and collision.

A straight connection always redraws between moving/resized anchors. A manual path deforms as a sampled physical string. The string never collides with its two attached bodies, but physical collision can be enabled against other same-layer objects. Collision impulses travel through rope nodes to anchors and apply force/torque to bodies. Excess bending or tension breaks the correct link; remaining fragments continue simulating.

When objects overlap, **Bind** creates a compound rigid body. Internal overlapping outlines are omitted, both shapes drag together, and combined mass/inertia/collision response acts as one body. **Separate** restores independent bodies.

## 9. Renderer and camera

The production renderer is WebGL2 with Canvas2D-safe editor overlays. It batches render commands, honors sorting layer then order, supports texture atlases/filtering, world text, tile chunks and particles. Grid and gizmos are editor-only and never appear in Nova Player.

Camera2D determines Game view. Orthographic size controls visible world height; zoom multiplies it. Viewport uses normalized 0–1 coordinates. Pixel-perfect favors crisp pixel art. Background is rendered before scene content.

Different editor layers receive distinct default colors. Gridlines render behind objects. Missing assets use visible placeholders and Console diagnostics rather than crashing.

Open the bottom **Rendering** tool for the v2.3 render graph. World, Lighting, Post Process, Editor Overlay and UI rows report pass cost. Diagnostics also report draw calls, triangles, textures, render targets, overdraw and GPU milliseconds when timer queries are available. **Capture frame** creates a downloadable PNG. Overdraw, Lighting and Normals debug views never modify artwork.

Add **Light2D** for Point, Spot, Directional or Area lighting. Color, intensity, range, spot angles, area size and a 32-bit light mask affect rendering. Ambient color/intensity is project-wide. **ShadowCaster2D** plus Off/Hard/Soft/Ultra quality controls shadows. Assign a SpriteRenderer2D normal map for directional light response.

Material assets contain safe GLSL ES `nova_material(vec4 baseColor, vec2 uv)`, up to eight textures, 32 finite uniforms, Alpha/Additive/Multiply/Screen blending, Nearest/Linear sampling, sRGB/Linear output and color-write state. Runtime loops and unsafe operations are rejected, source is capped at 32 KB, and live compile diagnostics plus the default fallback prevent broken frames. A material can optionally run as the full-frame **Post material**.

Camera2D supports priority/stack order, normalized viewports, culling masks, sorting ranges, pixel-perfect placement and named render textures. Post processing includes exposure, contrast, saturation, vignette, bloom, blur and a user material. Only the user-material pass allocates the optional WebGL framebuffer; ordinary scenes use the direct compact path. SpriteRenderer2D and UI Image support nine-slice. Imports preserve atlas/filter, explicit sRGB/Linear metadata and platform compression variants. Canvas2D remains the fallback.

## 10. Asset pipeline

Asset folders include Scenes, Sprites, Audio, Scripts, Fonts, Prefabs, Plugins, Tiles, TileSets, Materials, Animations and Controllers. The `.nova/cache` and `.nova/imported` folders are engine-managed.

- **Import Assets** copies supported files into the project database and assigns persistent GUIDs.
- **Scripts**, **Animation Clip**, **Animator Controller**, **TileSet**, and similar buttons create typed text assets.
- Selecting an asset opens import settings: filter mode, compression, pixels per unit, region, pivot and atlas participation where applicable.
- Rename, move, duplicate and delete update the database; references use `asset://UUID`, not fragile filenames.
- Missing references remain explicit so they can be repaired.
- Project Folder access uses the browser File System Access API when available; otherwise Save/Import uses files.

## 11. Input and scripting reference

Input Map actions are Button, Axis or Vector2. Bindings support keyboard, mouse buttons/wheel and gamepad buttons/axes with scale, vector contribution, gamepad index and deadzone.

Rhai lifecycle functions are `awake()`, `start()`, `fixed_update(dt)`, `update(dt)`, `late_update(dt)`, `on_destroy()`, `on_timer(name)`, collision enter/stay/exit and trigger enter/exit. Export inspector values with `@export let speed = 5.0;`.

Read APIs:

- `entity()`, `entity_name()`, `find_entity(name)`, `has_component(kind)`, `get_component(kind)`.
- `transform()`, `rigid_body()`, `animator()`, `audio_source()` return safe snapshots/handles.
- `time()`, `time_delta()`, `time_fixed_delta()`, `time_elapsed()`, `time_scale()`, `time_frame()`.
- `input_down/pressed/released`, aliases `is_down/was_pressed/was_released`, `input_axis/axis`, `input_vector/vector`, vector X/Y, mouse and wheel values.

Command APIs:

- `apply_force`, `apply_impulse`, `set_velocity`, `set_position`, `set_rotation`, `set_scale`, `set_angular_velocity`.
- `animator_set_bool/float/integer`, `animator_trigger`, `animator_play`.
- `audio_play`, `audio_pause`, `audio_stop`.
- `instantiate(assetReference)`, `destroy()`, `scene_load(nameOrUuid)`, `scene_reload()`, `scene_quit()`.
- `timer_start(name, seconds, repeat)`, pause/resume/cancel.
- Save functions listed below.

Scripts cannot access filesystem, network, process, DOM or dynamic imports. Operation/call/depth limits stop runaway code. A broken script is logged with its asset source while the editor and other scripts continue. Valid saves compile into a per-asset cache and swap only at a safe frame boundary; an invalid edit never replaces the previous valid program.

### Script Studio (2.2)

Choose **Script** in the workspace strip or double-click a script in Assets. The left pane lists project scripts and searches file names, paths, and source matches. Tabs retain open files. The center editor includes line numbers, gutter breakpoints, Ctrl/Cmd+S, find/replace, line/column status, completion, signature/context help, and generated engine API documentation. Problems are produced by a cancellable Web Worker and confirmed by the Rust/Rhai compiler on save. Symbols provide function/export/test navigation, F12 goes to definitions, and F2 performs an app-confirmed project-wide rename only after every affected module compiles.

Use `use "Movement.rhai";` or an `Assets/...` path for read-only project modules. Missing or circular dependencies are diagnosed before execution. Script asset metadata persists breakpoints, discovered `test_*` functions, and read-only package declarations in schema 23.

In a development play session, a breakpoint pauses at the containing callback and exposes Continue, Step, call stack, bounded locals, and safe dot-path watches. Release packages remove breakpoint/test/package metadata and disable debugger settings unless **Development Build** is checked. Functions named `test_*` run in isolated runtimes; use `expect(condition, message)` to report failures without affecting another script.

Typed APIs `entity_handle`, `find_entity_handle`, `component_handle`, `animator_handle`, and `audio_source_handle` return maps with `valid`, `kind`, `id`, and `error`. `task_wait(name, seconds)` resumes through `on_task(name)` and is cancelled automatically with its entity/scene. `signal_emit` and `signal_emit_to` feed `on_signal(name, payload, source)` through the same bounded safe queue used by collision/trigger, UI callback, animation-event, and scene-lifecycle signals. Animation clips add event time, signal name, and JSON-or-text payload controls.

## 12. Animation, audio, UI, tilemaps and particles

Animation Studio opens typed clip, controller, animation-mask, rig, skin, and Timeline assets. A clip provides a multi-track dope sheet and sampled curve view. Select or box-select keys, drag with optional frame snapping, copy/paste with `Ctrl/Cmd+C/V`, and set Auto, Linear, Constant, or Free tangents. Tracks may target the Animator owner or a specific entity; sprite frames and event signal/payload keys share the same exact clock. Explicit **Record** mode turns Inspector and move/rotate/scale gizmo edits into snapped transform keyframes.

Animator Controller provides typed parameters and defaults, states, subgraphs, transition conditions, optional exit time, duration, interruption strategy, weighted/additive layers, property masks, and 1D blend trees. **Live runtime preview** starts the selected state on an entity using that controller. Animation sampling occurs on fixed simulation ticks, so render FPS cannot change key values or event order. Animation events enter the bounded signal queue and arrive at `on_signal`.

Rig assets contain ordered parent bones, local position/rotation/scale and length, IK chains, rotation/copy/position constraints, and pose tools. Skin assets contain mesh vertices, UVs, triangles, and normalized bone weights. Add `Skeleton2D`, assign matching rig and skin assets, and enable Preview Pose; inverse bind poses deform the sprite through WebGL2 or Canvas2D. `Skeleton2D.pose` holds optional per-bone local overrides.

Timeline assets sequence **Animation, Audio, Camera, Event, Visibility, and ScriptCall** tracks. Add `TimelinePlayer`, assign the asset, then choose autoplay, loop, speed, and current time. Muted tracks do nothing; one-shot tracks fire when their start is crossed, including a fixed-tick step that skips over the exact timestamp. Timeline animation selects Animator states; event and script-call clips use the signal/script runtime.

For reimport, select an Animation asset in Assets, choose a different source clip, set 1–240 Hz sample rate, and optionally map source properties to target properties. **Reimport animation** deterministically resamples curves while preserving the target GUID. The source asset remains untouched.

Audio assets play through AudioSource. Mixer settings contain Master, Music, SFX and UI buses plus sample rate. AudioListener supplies spatial position; spatial blend and min/max distances control attenuation and pan.

Runtime UI is Canvas/RectTransform based. Game view dispatches hover, press, click, slider drag, checkbox toggle and text entry. ProgressBar is display-only. UI rendering follows hierarchy and Canvas sorting.

TileMap uses TileSet regions and chunked rendering. Palette tools paint, erase, pick and fill cells. Collision can be None, Box, Polygon or OneWay and is generated per configured tile.

ParticleEmitter uses a bounded pool, deterministic seed, rate/burst, lifetime, velocity, color/opacity interpolation and optional texture.

## 13. Scenes, prefabs and play mode

Scenes serialize independently with their own entities, connections, layers and global physics settings. Loaded scenes appear in project/build tools; the active scene is edited. Runtime scene commands preserve only entities marked persistent.

Create a prefab from an entity subtree in Assets. Instances retain `prefabAsset`, source UUIDs and an override map. Applying prefab changes updates non-overridden values; reverting removes overrides. Missing prefabs remain diagnosable. Instantiation from scripts is queued until a safe structural phase.

Play mode snapshots the editor document, starts input/scripts/audio/animation/plugins, then runs fixed physics plus render updates. Pause halts normal progression; Step advances one fixed tick; Stop runs destruction lifecycle and restores the editor snapshot.

## 14. Console, profiler and physics debugger

Console levels: Trace, Debug, Info, Warning, Error and Fatal. Filter by level/category, search text, clear output and click source references. Categories separate Engine, Runtime, Physics, Script, Asset, Build, Save and Plugin messages. Logs are bounded.

Profiler displays frame, physics, scripts, render, animation, audio, assets, FPS, bodies, draw calls and memory with a bounded 180-sample history. **Freeze** preserves the view; **Clear** resets samples.

Physics Debugger can overlay colliders, AABBs, contacts, normals, joints, rope nodes and sleeping bodies. It changes visualization only, never simulation state.

Fatal frontend/native failures create crash records where the platform permits. One malformed asset/script/plugin is reported without taking down the entire editor.

## 15. Save-game API

Save data is separate from project/scene serialization and is isolated by project UUID and slot. Supported values are finite numbers, booleans, strings, null, nested arrays and maps. Arbitrary engine objects/binary data are rejected.

- `save_has(key)` and `save_get(key, fallback)` read the current working map.
- `save_set(key, value)`, `save_delete(key)`, `save_clear()` modify working data.
- `save_load(slot)` replaces working data from a slot.
- `save_commit(slot)` validates size/depth and persists atomically to local application storage.

Settings > Save Data lets developers choose a slot, load, commit, clear and inspect the working JSON. Limits: 1 MB serialized data, depth 8 and 2,000 entries per collection.

## 16. WASM plugin foundation

Nova_A 2.0 accepts conservative WebAssembly plugins, not native DLLs. Import a manifest JSON and matching `.wasm` file together in Settings > Plugins.

Manifest fields: reverse-domain `id`, display `name`, semantic `version`, `apiVersion: 1`, engine range, safe relative `.wasm` entry, permissions (`log`, `events`) and enabled state. The module must export `nova_plugin_api_version()` returning 1 and `nova_plugin_init()`. Optional exports are `nova_plugin_update(delta)` and `nova_plugin_shutdown()`.

Plugins receive only numeric/log/event host imports. No filesystem, process or network access is provided. Files over 16 MB, unsafe paths, unknown permissions or incompatible APIs are rejected. A plugin that traps is disabled for that play session.

## 17. Build and export

Build Settings fields:

- **Game name**, **Target** (Windows, Linux, macOS, Web), fixed **x86_64** desktop architecture.
- Ordered scene list; move scenes up/down. Startup scene must be in the list.
- **Development build** includes extra diagnostics.
- **Package into executable** is available for Windows/Linux; default export is Player plus `game.nova-pak`.
- **Output directory** selects destination where supported.
- **Build** packages; **Build & Run** also starts a native result.

`.nova-pak` has a magic/versioned header, indexed path/type/GUID table, relative offsets, original/stored lengths, optional gzip blocks and SHA-256 checksums. Loading rejects unsafe paths, invalid bounds and checksum mismatch.

Desktop targets are built on their matching host OS. Web produces static files. The exported Player contains no editor panels, menus, grid or gizmos. CI validates Rust tests/lints, TypeScript, manual completeness, WASM/frontend production output and the Tauri backend on Windows, Linux and macOS.

## 18. Migration and compatibility

Nova_A 2.0 declares **Nova_A Project Format 2**; Nova_A 2.9 uses schema 22 with minimum supported legacy schema 5. Every saved project includes format name/major, schema, engine version, compatibility record and project metadata UUID. Schema 22 adds validated platform and delivery settings while retaining production, presentation, audio, world, rig/skin, Timeline and unknown asset data.

Opening an older supported project runs ordered migrations for legacy numeric IDs, components, hierarchy, scenes, assets, prefabs, input, audio, tilemaps, particles, joints, build settings and 2.0 metadata. Existing data is preserved where valid. A project with a newer major/schema is rejected with a useful message instead of guessed conversion.

Before migration, keep a source-control commit or backup. After opening, verify missing-asset diagnostics, scripts, layers, scenes and build order, then save as Format 2. Format 2 compatibility is a public promise: future schema changes require migrations.

## 19. Complete tutorials

### Tutorial A: physics playground

Create the Physics Sandbox template. Inspect both bodies' RigidBody2D and colliders. Change restitution/friction and press Play. Inspect DistanceJoint2D. Open the connection, enable physical collision and alter stiffness/damping. Turn on collider, joint and rope-node debug overlays. Increase load until the rope breaks and observe both fragments.

### Tutorial B: platformer

Create Platformer. Inspect PlayerController and exported speed/jump force. Inspect the sprite, Animator Controller/clip and jump AudioSource. Review MoveHorizontal/Jump bindings. Paint the TileMap, add colliders/platforms, place Camera2D and HUD. Play with A/D and Space, then add a second scene and include it in Build Settings. Build the Player and verify no editor UI appears.

### Tutorial C: top-down

Create Top-down. Play with WASD; E instantiates the enemy prefab. Inspect enemy patrol Script2D and player particles. Enter Exit Trigger: the script saves checkpoint data and switches to Main Menu. Return to Settings > Save Data and load `slot1`. Edit the prefab, apply changes while preserving instance overrides, then build both scenes in the correct order.

## 20. Shortcuts and troubleshooting

| Shortcut | Action |
|---|---|
| Ctrl/Cmd+S | Save project |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y | Redo |
| Ctrl/Cmd+C / V / D | Copy / paste / duplicate |
| Delete or Backspace | Delete selection |
| F2 | Rename |
| Escape | Cancel/deselect |

If a component is invisible, confirm entity/component enabled state, active scene/layer, Camera2D range, renderer sorting and asset reference. If physics does not interact, confirm both colliders, body types, physics layer/mask and sensor state. If a script fails, open Console and click its source; validate action names and exported property types. If build fails, ensure every ordered scene exists and the startup scene is selected; build desktop targets on the corresponding host OS. If an old project fails, do not hand-edit its schema—keep the original and report the exact migration error.

Release audit: create/import each template, save/reopen, play/pause/step/stop, switch scenes, instantiate a prefab, trigger physics events, persist/load save data, build Player + pack, launch it, and confirm editor-only UI is absent.


## 21. Nova_A 2.5 asset pipeline, packages, Plugin API 2, and physics monitor

### Asset importing and cache

Open the bottom panel and choose **Assets**. **Import assets** accepts images, audio, fonts, scenes, prefabs, Rhai scripts, materials, animations/controllers/masks, rigs/skins/Timelines, tile sets, atlases, shaders, and localization files. Each job shows Queued, Reading, Processing, Writing cache, Complete, Cancelled, or Failed; Cancel aborts queued, stream-reading, and hashing work. Imports are keyed by the SHA-256 of source bytes plus importer version, target platform, and normalized import settings. A repeated input shows **Reused cached artifact**. Reimport preserves the asset GUID; on failure Nova_A reports the error and continues using the last valid artifact.

Select an asset for its preview and type-specific settings. Images expose filtering, regions, atlasing, color space, pixels-per-unit, pivot, compression, and platform variants. Audio exposes preview, normalization, streaming, and sample rate. Fonts preview the imported family. Scripts show UTF-8/module metadata and open in Script Studio. Atlas, tile, shader, animation, and localization resources expose their dedicated settings and source preview.

**Unused report** scans project and asset references. **Missing references** reports unknown `asset://` GUIDs. The inspector's References and build section lists owners and why the selected asset enters a player build. Moving or renaming repairs project-path references; deleting still uses Nova_A's in-app confirmation and clears known scene/document references.

### Packages and Plugin API 2

Choose **Packages** in the bottom panel or Command Palette. Views separate Installed, Project, Updates, Incompatible, and Disabled packages. Import a JSON manifest from a local, Git, or registry source. Nova_A validates reverse-domain IDs, semantic versions, engine ranges, dependencies, source kind, hashes, and the project lockfile. Importing a newer manifest caches it as an update; inspect the compatibility report before **Apply update**. Uninstall is blocked while another project package depends on it.

Plugin API 2 manifests declare editor commands, menus, panels, importers, asset editors, components, inspectors, gizmos, settings, build hooks, runtime systems, and events. Every contribution needs the matching capability. Standard plugins are sandboxed WebAssembly with a 16 MB binary/memory ceiling and bounded calls; SHA-256 and optional Ed25519 signatures are checked. Native extensions are displayed as requiring explicit external installation and are never downloaded or run. Disable a package per project, or enable Plugin Safe Mode to skip all third-party code. `?safe-mode=1` performs one safe startup. Existing Plugin API 1 projects remain compatible with their log/events permissions.

### Physics Monitor and collision timeline

Press Play or Pause. A right-side Physics Monitor slides out without replacing the Scene/Game view. Object Properties displays each enabled rigid body's world position (m), direction, speed, velocity, acceleration, force, angular velocity, kinetic energy, contact count, and awake/sleeping state. Values come from the authoritative Rust runtime; renderer interpolation never writes them back.

Collision Timeline records collision/trigger start, stay, and end events with both object names, fixed step and session time, collision point, incoming/resulting relative velocity, direction change, normal/tangent impulse, and normal/friction force. Freeze preserves the current snapshot, Clear resets only the timeline, the search filters both views, and Collapse returns viewport width. History and rendered rows are bounded; active `collisionStayed` rows are replaced instead of growing every fixed step.

### 2.5 release audit

Before release, create/open each template; import and reimport every asset type; cancel a large import; verify cache hit and failure fallback; move/rename/delete assets; run unused/missing/reference reports; install compatible/incompatible/API 1/API 2/native package manifests; preview/apply an update; test uninstall impact and Safe Mode; Play/Pause/Step/Stop; inspect moving bodies and a collision; switch views/workspaces/themes/languages; save/reopen; build and launch the Player. Required gates are Rust format, strict Clippy, all Rust tests, Vue type-check, production build, all audit scripts, and browser smoke tests at 900 x 600 and a normal desktop size.

## 22. Nova_A 2.6 worlds, navigation, and gameplay tools

Open **World Tools** from the bottom drawer or Command Palette. Its tabs keep world-authoring controls out of the Object Inspector; selecting **Add** creates the tab's real component through the normal undo history.

- **CharacterBody2D:** attach it to a Kinematic body with a collider. Maximum slope angle, step height, floor snap, safe margin and maximum slides are world-unit solver inputs. Inherit platform velocity transfers support-body motion. Runtime badges show floor/wall/ceiling. Rhai uses `move_character(dx,dy)`, `can_coyote_jump()`, contact-state functions, floor normal and platform velocity. One configured metre moves exactly one world metre.
- **Area2D / Area Effector:** choose Box/Circle and mask, then add Gravity, Wind, Drag, Buoyancy, Damage or Signal entries. Force effectors accumulate for exactly one Rust fixed step; damage emits `area.damage`, custom effects emit the selected signal, and enter/exit emit `area.entered` / `area.exited`.
- **Navigation:** enable the optional Nova Navigation package, then author a polygon/grid region, static/dynamic obstacles and agents. Choose A* or FlowField, diagonal travel, cell size, layer, repath/rebake intervals, speed, acceleration, avoidance and smoothing. Debug overlay shows the bounded computed path. Physics-only projects leave this package disabled and do not load its module.
- **AI:** enable Nova Gameplay AI only when required. Create Behavior Tree or hierarchical State Machine assets, assign them to their component and connect Action/enter/exit names to runtime signals.
- **Streaming:** WorldChunk2D has bounds, load/unload distances, priority, estimated memory and optional scene. Project memory budget limits loaded chunks; streaming work is queued asynchronously. Origin shifting keeps large coordinates numerically stable. Portal2D sends `portal.entered` and queues its target scene once a player/CharacterBody enters its radius.
- **Pooling:** ObjectPool2D chooses a prefab, prewarm count, bounded capacity and expansion policy. `instantiate` acquires a prepared instance when possible; `despawn()` returns it. `pool.spawned` and `pool.despawned` follow normal lifecycle boundaries.

The **Tilemap** panel creates Tile Palette, Brush Preset and Terrain Rules assets. It supports multiple visible/locked/opacity layers; add, duplicate, switch or remove a layer using the layer controls. Tile definitions store terrain, navigation cost, occluder state and None/Box/Polygon/OneWay collision. **Bake tile map** reports merged collision shapes, navigation cells, occluders and bounded chunks. Streaming culls chunks by visible bounds; collision uses every visible layer.

Schema 19 saves world budgets/debug flags and every new component/asset while preserving unknown fields. The Platformer template uses CharacterBody2D exact motion and coyote jumping. Release validation must exercise every World Tools tab, both optional-package states, tile layers/bakes, portals, pool reuse, save/reopen, undo/redo, all languages/themes, Play/Step/Stop, and the complete build gates.

## 23. Nova_A 2.7 responsive UI, Audio, localization, and Accessibility

Open **Presentation** from the bottom drawer, the Interface workspace, or Command Palette. Its four tabs separate presentation work from object-level editing.

### Responsive UI and themes

- Add Canvas, Panel, Image, Text, Button, Slider, ProgressBar, Checkbox or TextInput from the Inspector. Scene view shows the same UI rectangles as Game view and still allows selection.
- RectTransform anchors against its parent. Fixed uses the entered size, Fill uses parent space minus margins, and Content measures supported text. Minimum/maximum size and Width Controls Height, Height Controls Width or Fit aspect constraints are applied before drawing.
- Canvas can scale from its reference size and inset children into a safe area. Add up to 32 width breakpoints with alternate position, size and visibility.
- Panel layout can be None, Horizontal, Vertical or Grid with gap, columns, padding and wrapping. Clip cuts children to the panel; rounded mask uses its corner radius. Enable horizontal/vertical scrolling, set optional content size and wheel speed, and choose whether to show scrollbars.
- **Save reusable UI scene** stores the selected UI subtree as a normal prefab in `Assets/Prefabs/UI`; prefab instance and override rules remain unchanged.
- **New theme** creates a `.nova-theme` asset. A theme has variables, style classes and normal/hovered/pressed/disabled/focused states. Set `parentTheme` in the document to inherit, edit variables in Presentation, assign the theme to Canvas and choose a style class on each control. A non-empty control background override wins over the inherited state.

### Focus, input remapping and screen readers

Enable **Focusable** on a RectTransform and set Tab index. Tab/Shift+Tab use tab order; arrows and D-pad use an explicit Up/Down/Left/Right UUID when supplied, otherwise the closest control in that direction. Enter, Space and gamepad button 0 activate. Focus uses the runtime focus-ring color/width.

Set accessibility role, label and description on RectTransform. In Game view, enabled metadata is mirrored into a bounded off-screen DOM tree for platform screen readers; Hide from screen readers excludes a control. Set **Input remap action / slot** on a Button: activating it captures the next keyboard key or gamepad button and updates that named Input Map binding. Keyboard navigation, gamepad navigation, screen-reader export, focus events and reduced motion are runtime project settings; editor font/contrast/reduced-motion preferences remain separate.

### Localization

Create/select a Localization asset. Each entry contains per-locale values; values may be strings, plural maps (`one`, `few`, `many`, `other`) or select maps. Use `{variable}`, `{variable, number}` and `{variable, date}`. Text and Checkbox use Localization key and fall back to their authored text.

Project localization selects source and live preview locale, a bounded fallback chain and build locales. Pseudolocalization expands/accents text to reveal clipping. Locale metadata can select left-to-right or right-to-left and font fallback asset GUIDs; RTL reverses horizontal/grid flow and text alignment. Player packages include only source plus selected build locales.

### Audio mixer and asset tools

The Audio tab edits a bounded mixer graph: up to 32 buses, 8 effects and 16 sends per bus, 32 snapshots and ducking rules, 1–512 voices per bus and 1–1024 total. Every bus has parent, gain, mute, solo and voice limit. Sends route a gain-controlled copy without cycles. Low/High Pass, Compressor, Delay and Reverb apply enabled state and wet/dry; Delay also applies feedback. Snapshots store master/bus gains; ducking attenuates its target while the trigger bus has voices. Meters display live analyzer levels.

AudioSource selects any mixer bus, volume, pitch, loop/autoplay, priority, streaming override, spatial blend, min/max distance and Linear/Inverse/Exponential/Custom attenuation. The selected audio asset shows a decoded waveform, loop start/end markers, streaming choice, target peak and calculated normalization gain. Profiler values report active, streaming, buffered and voice-limited counts. Loop marker edits affect a currently owned audio element without recreating it.

### Manual and release audit

**Help > Manual** opens the bundled `manual/index.html` in Nova_A's same-origin overlay; Reload refreshes it and Close returns to the untouched editor. It never sends an internal `tauri.localhost` URL through the external URL opener.

Audit at 900 × 600 and desktop size: create every UI control; test anchors/policies/breakpoints/safe area/layout/clipping/mask/scroll; save/instantiate UI prefab; theme states/inheritance/override; keyboard/gamepad focus and remap; screen-reader labels; English/German/Chinese plus pseudo/RTL/fallback; locale-stripped build; all mixer routing/effects/snapshot/ducking/meter/voice cases; waveform/loop/normalize/streaming/spatial audio; manual open/reload/close; save/reopen/migrate; undo/redo; Play/Pause/Step/Stop; web and native release artifacts.

## 24. Nova_A 2.8 Profiler, deterministic testing, data, jobs, and networking

Open **Profiler** (named Production Lab before 3.1) from the bottom panel or Command Palette. Its tabs stay separate from the Object Inspector so diagnostics do not compete with component fields.

### Trace and Memory

- **Trace** records a bounded per-frame breakdown for input, scripts, animation, physics, audio, rendering, asset work, JavaScript allocations and enabled GPU passes. Capacity changes retained history. **Capture** freezes a named snapshot; the chart and cards read those same frames.
- Physics debug controls remain here. Shape/contact/force/joint/string overlays and selected-body values read authoritative runtime state and never write to the solver.
- **Memory** edits warning budgets for total, assets, textures, audio and scripts. Current/peak bytes, retained objects and warning state are live. Lifetime events record bounded entity and asset-job changes. **Detect leaks** reports objects surviving past the observation window; it never deletes them.
- **Capture memory** stores current categories/lifetimes. Choose two captures and **Compare** for signed byte/object deltas. Clear removes diagnostics only.

### Replay and deterministic random values

- Set **Seed** and **Capacity**, then **Record**. Each fixed step stores normalized actions/buttons/vectors and an authoritative physics checksum. **Stop recording** creates a Replay asset for export or playback.
- **Play replay** restores the captured initial project, resets the seed and substitutes recorded input for live input. Mismatches identify fixed frame, expected hash and actual hash. **Stop playback** returns input; top-bar Stop restores the edit snapshot.
- Rhai `random()` returns a seeded value in `[0,1)`; `random_range(min,max)` consumes the same stream. Supported replays are reproducible, but Nova_A does not claim arbitrary floating-point scripts are bit-identical on every CPU/browser.

### Tests and CI reports

- **Add test** creates Unit, Scene, Integration or Headless definitions with name, optional scene, timeout, fixed-step limit and screenshot choice.
- Assertions cover minimum entity count, named/UUID entity existence, finite physics state, physics checksum equality and absence of runtime errors. **Run selected** isolates one definition; **Run all** runs every definition and reports pass/fail/error/timeout.
- Screenshot-enabled non-headless tests attach the game image. **Export JSON** and **Export JUnit** download CI-readable reports. Headless tests omit rendering/screenshots.

### Data resources and save migrations

- **Data** creates Data Schema and Data Table assets. Schema fields have safe unique key, String/Number/Integer/Boolean/JSON type, required flag and default. Save validates definitions and rows.
- A table selects its schema. **Import JSON** accepts an array or `{ rows: [...] }`; **Import CSV** supports headers and quoted cells; **Import database result** accepts a JSON row array produced externally. Nova_A stores no database credentials.
- Validation reports row, field, severity and message. **Generate accessor** downloads a typed TypeScript interface and safe lookups.
- Saves use a versioned `nova-save` envelope. Ordered project migrations rename/remove/default top-level keys. Missing steps and future versions are rejected rather than guessed.

### Jobs

- **Jobs** shows worker availability, worker limit and maximum queue. Parse/hash/sample jobs show queued/running/complete/failed/cancelled state; Cancel removes queued work or rejects a pending result.
- Without Worker support, one serialized main-thread fallback yields between jobs. Queue and retained history are bounded, so repeated Sample clicks cannot create unlimited work.

### Optional networking and headless server

- Networking starts uninstalled, disabled and excluded from player data. **Install official networking package** first, then enable it. Projects that never reference networking retain no networking settings in their pack.
- Choose WebSocket or native UDP, endpoint, Client/Server/Host, a shared send/receive bandwidth ceiling, snapshot rate, interpolation delay, prediction and rollback history. **Connect** starts; **Disconnect** closes transport, reconnect timer and queues. UDP is Tauri-only; WebSocket is the browser transport.
- **Replicate selected** adds the selected entity. Choose authority and properties; snapshots are bounded, sequence checked and interpolated. RPC names/payloads are bounded. Diagnostics show connection state, peers, latency, traffic, dropped data, corrections and recent events.
- Build Settings **Authoritative headless server** removes the canvas and advances fixed simulation on a bounded timer. Validation requires a native target and installed/enabled networking. It supports server-authoritative patterns without promising universal cross-hardware determinism.

### Anti-aliasing and retained v2.8 release audit

WebGL scene/material contexts request multisampling. Canvas paths use high-quality smoothing plus round caps/joins; UI text enables kerning, ligatures and optical sizing. Explicit Nearest pixel-art assets remain crisp.

Release audit: exercise every Production Lab tab/button; trace/capture/compare; exceed budgets; create/destroy entities; record/play/export and force a mismatch; run all four test kinds/reports; create/import/validate schemas/tables; migrate legacy/future saves; saturate/cancel jobs with/without workers; verify networking uninstalled, installed-disabled, WebSocket, UDP and disconnect-during-load; build game/headless; test all languages/themes/reduced motion at 900 × 600 and desktop sizes; then run format, strict Clippy, Rust tests, TypeScript, production build, static audits, browser smoke, Tauri installers, release packaging and SHA-256 checks.

## 25. Nova_A 2.9 shipping, collaboration, packages, and upgrades

### Focused Build Settings layout

Open **Project → Build Settings** or the Build bottom tool. The panel is divided into **Overview**, **Platform**, **Delivery**, and **Team**, so related controls stay visible without a long mixed form. Overview chooses the game name, target, architecture, debug/release profile, runtime mode, scene order, startup scene, output and Build/Build & Run. The validation card is authoritative: errors block export; warnings explain conditional behavior. Build & Run is limited to host-native desktop targets.

Platform exposes identifier, application version, icon/splash asset references, orientation, permission declarations, signing mode/identity and notarization profile. Windows, Linux, macOS and Web templates are reproducible. Android additionally requires the explicitly installed official Android package, `ANDROID_HOME` or `ANDROID_SDK_ROOT`, `JAVA_HOME`, and `NOVA_A_ANDROID_TEMPLATE`; missing tools disable the target instead of producing a partial build. Console SDKs are not bundled.

### Delivery, reports, CLI, and operations

Delivery controls deterministic metadata, incremental writes, store/balanced/maximum package compression, patch manifests, structured logs, crash capture, and telemetry. A build emits content SHA-256 records, a deterministic build ID, `nova-build-report.json`, `.nova-build-cache/manifest.json`, and an optional `nova-patch-manifest.json` containing added/changed/removed paths. A symbol map accompanies native outputs. Stable input plus the same target/profile produces stable package/report data; non-deterministic mode records wall-clock creation time.

Run `pnpm export -- --project ./project.nova --target web --profile release --output ./Builds/MyGame`. `--architecture`, `--runtime`, `--compression`, `--no-incremental`, and `--no-patch` refine it; `--help` lists the bounded syntax. Web output includes Nova Player production assets. Desktop CLI output needs a matching host player and refuses unsafe output paths.

Crash capture writes a bounded structured record rather than failing the editor. Symbol files let maintainers map release addresses. Telemetry is off by default, accepts scalar event properties only, keeps a bounded queue, and sends only to a configured HTTPS endpoint when explicitly enabled. Configure and publish an HTTPS privacy policy; disabling telemetry stops collection and clears the queue.

### Team page and source-control workflow

Source status compares the saved baseline with scenes, prefabs, assets, packages and project settings by stable UUID fingerprint. **Generate .gitignore** downloads rules for caches/imports/builds/locks while retaining sources and package lockfiles. **Open diff** invokes only the executable and arguments selected by the user; without native integration it downloads saved/current snapshots. Choose an incoming `.nova` file to run three-way conflict detection. **Open merge** passes bounded `{base}`, `{ours}`, `{theirs}` and `{output}` files without a shell. Import the merged output after reviewing it. Temporary tool folders older than 24 hours are cleaned on later use.

Project locks expire, are owner-labelled and cannot overwrite another unexpired local editor lock. Download `.nova-lock` only if the team deliberately commits file locks. Saving writes recursively key-sorted, indented JSON; array order remains semantic, so scene/entity order is never silently rearranged.

### Registry, upgrades, and templates

Registry Browse shows search/source, verified publisher, rating, requested permissions, documentation and security links. Browsing is data-only: no package code runs. **Install** is the explicit transition to package resolution and lockfile update. Offline mode uses cached manifests; a local mirror can be imported deliberately. Permission review remains visible after installation.

Opening an older project first shows source/target schema, engine, scene/entity/asset counts, migration warnings and a package compatibility audit. Keep **Download complete pre-upgrade backup** enabled. Migration occurs in memory and the canonical validator must accept the complete result before the editor session changes. A bounded machine-local rollback copy is retained when possible and Project Manager exposes **Download rollback copy**.

Templates: **Empty 2D** is minimal; **Platformer** exercises characters/physics/tilemap/animation/audio/UI; **Top-down** exercises prefabs/scenes/triggers/particles/save data; **Physics Sandbox** exercises rigid bodies/materials/joints/ropes; **UI Showcase** exercises responsive controls/theme/localization/focus/scroll/audio; **Networked Optional** explicitly installs the official networking package and demonstrates authority, replication, prediction, diagnostics and a headless test. Every template is audited before it replaces the current project.

### v2.9 permanent release audit

Check every workspace, menu, button, selection and inspector field; all languages, light/dark/high contrast, reduced motion and narrow/desktop layouts; save/reopen/migrate/backup/rollback; every template; Play/Pause/Step/Stop; physics monitor; assets/packages/plugins; registry browse/install/offline; source changes/conflicts/diff/merge/locks; each platform/profile/architecture validation branch; deterministic repeat, incremental cache hit, changed/removed delta, compression modes, CLI/Web/native/headless; crash/log/symbol/privacy behavior. Then require Rust format, warnings-as-errors Clippy, all Rust and Tauri tests, Vue type-check, every static audit, optimized Web build, browser interaction/console smoke, Tauri installers, source/web archives, portable executable smoke, and SHA-256 verification.

## 26. Nova_A 3.0 stable contracts, recovery, and evidence

Open **Help → Studio Status** to view Project Format 2/schema 23, Runtime API 1, Plugin API 2, Package Manifest 1, and Build CLI 1. **Copy diagnostics** copies those versions and the platform; **Manual** returns here. Projects from schemas 5–23 use the migration preview, complete source backup, package audit, in-memory validation, atomic session replacement, and rollback copy described in section 18. A future schema opens only in the non-mutating compatibility viewer.

If Nova_A contains an unexpected editor/runtime exception, its in-app recovery dialog shows a bounded message, context, timestamp, and optional stack. **Copy diagnostics** and **Download diagnostics** preserve evidence; **Continue safely** dismisses the failed operation; **Restart in safe mode** reloads with third-party plugins skipped. Cancellation and harmless ResizeObserver delivery notices are not fatal. A failed texture-atlas rebuild keeps the last valid atlas.

The generated projects under `reference-projects/projects` are editable source examples. Platformer includes lighting/shadows, tilemap, animation, audio, script, UI, and build settings; Top-down includes scenes, prefab, particles and Save API; the other templates cover physics/rope/joints, responsive UI/localization/audio, empty setup, and optional networking. `reference-projects/plugins/hello-plugin` is the minimal permission-free Plugin API 2 example.

Release evidence is deliberately honest. `pnpm benchmark:v3` publishes headless measurements and marks native/GPU-only values pending. `pnpm stability:v3` is only a smoke; a report is a 24-hour pass only when `qualified24Hours` is true. Clean Linux/macOS and Android artifacts stay pending until their documented CI jobs actually upload them. See `docs/` for contracts, compatibility, benchmarks, stability, platform evidence, and limitations.

## 27. Nova_A 3.1 editor workspaces, recovery, and navigation

### Window and workspace controls

Nova_A starts borderless and fullscreen on the active monitor. Press **F11** to return to the last valid windowed size and position, and press it again to enter fullscreen. **Settings > Editor > Launch editor in fullscreen** controls the next launch. If the saved monitor is absent, Nova_A centers a safe window on an available monitor instead of opening off-screen.

The top workspace row contains **Back**, **Forward**, **Design**, **Script**, **Animation**, **UI**, **Debug**, **Custom**, **Hierarchy**, **Inspector**, **Bottom panel**, **Manage**, **Command palette**, and **Focus mode**. The three panel buttons collapse or restore their named regions. Side-panel drag handles resize them. In **Manage workspaces**, choose user-wide or per-project storage; save the current layout, duplicate a custom layout, rename it, update it from the current docks and sizes, import/export `.nova-workspaces`, or reset safely. Hierarchy and Inspector can dock left or right. Start with `?safe-layout=1` to ignore saved geometry.

The former **Presentation** bottom tool is now the central **UI** workspace; its UI, themes, localization, accessibility, and audio tools are unchanged. **Production Lab** is now named **Profiler**. Project information is summarized by **Project Health**. Runtime counters and save-data inspection are under **Debug > Profiler > Diagnostics**. Plugin installation and security are under **Packages > Plugin API**. AI, navigation, streaming, pooling, and networking controls remain hidden unless their package, existing project data, or **Experimental project capabilities** setting makes them relevant.

### Commands, search, shortcuts, and settings

Open the command palette with **Ctrl/Cmd+K** or **Ctrl/Cmd+Shift+P**. It searches commands, settings, assets, scenes, objects, components, scripts, and registered plugin commands. Core Save, Undo, Redo, Copy, Paste, Duplicate, Delete, Play, and Stop actions are available from both menus and the palette. Results open the relevant editor surface and select the matching resource when possible.

Open **Keyboard shortcuts** from View or the palette. Select a binding and press the new combination; reserved conflicts are rejected and each binding or the complete map can be reset. Back/Forward keeps a bounded history of visited pages, workspaces, scenes, and bottom tools. Tool buttons expose labels, shortcuts, and documentation identifiers, and every interactive control has a visible keyboard focus ring.

Settings can be searched by name or purpose and filtered by **All**, **Editor**, **Project**, or **Runtime**. Editor scope contains appearance, language, layout, window, motion, and confirmation preferences. Project scope contains physics, audio, input, canvas, collision, and defaults. Related-tool cards link to Packages, Debug, and Project Health rather than duplicating those workflows.

### Undo, autosave, recovery, and Task Center

Editor mutations use named, bounded transactions. Continuous drags and repeated edits can merge into one operation; Undo and Redo retain one hundred committed document changes. Normal project saves use a staged writable document where supported. Autosave snapshots are separately checksummed, bounded by count and total bytes, and never replace the last manual save.

After an unclean shutdown, **Crash recovery** lists valid snapshots with project, timestamp, reason, and size; corrupt entries are skipped. Choose a snapshot, discard it, open it read-only, or open in Safe Mode. Safe Mode disables unverified third-party packages and restores the default layout. Read-only recovery visibly blocks document mutation. Temporary recovery keys are cleaned on startup.

The bottom status button opens **Task Center**. It combines asset imports, builds, package installs/updates/removals, migrations, and saves. Running work shows progress or a spinner and offers Cancel where the operation supports cancellation. Failed tasks retain error details and Retry where safe. **Copy diagnostic details** includes bounded task and fault information for bug reports. Brief success uses a toast, sustained state uses a banner, decisions use an in-app modal, and field validation stays inline; browser alert/confirm/prompt windows are never used.

### v3.1 validation checklist

Verify first and second launch, F11, monitor removal, saved bounds, all six workspaces, both dock sides, every workspace action, safe layout, palette search categories, shortcut editing/conflicts, Back/Forward, Settings scopes, one hundred mixed Undo/Redo operations, interrupted save/import/package/migration, corrupt-latest recovery, Safe Mode/read-only, Task Center cancel/retry/copy details, keyboard-only open/edit/save/play/stop/console, English/German/Chinese text, high contrast, and 1366×768 through 3840×2160 layouts. Release evidence records measured results and clearly labels anything that was not exercised on the current machine.

## v3.2 project data, scenes, prefabs, and assets

Nova_A 3.2 writes Project Format 2 schema 23. The project manifest records the stable project UUID, engine compatibility range, schema, `Packages.lock`, build presets, and ownership of `Assets`, `ProjectSettings`, `.nova/imported`, `.nova/cache`, and `.nova/user`. Generated and cache content is visibly marked and generated text assets cannot be edited directly.

Saves use canonical JSON: lexicographic object keys, two spaces, LF endings, one final newline, finite numbers, normalized negative zero, stable asset ordering, sorted set-like folders/presets/dependencies, preserved authoring arrays, and recursive unknown-field preservation. Persistent asset references use `asset://UUID`; renaming and moving an asset changes its display path without changing references.

### Scene and prefab instances

Select one or more objects and choose **Create scene asset** in Assets. Select a scene asset and choose **Instantiate scene** to place it at the viewport center. Scene-instance layers persist through nested instancing and duplication; **Unpack scene** removes only the outer layer.

Prefab instances retain nested prefab layers. In the Inspector, **Compare overrides** lists changed property paths. **Reset** restores one property, **Apply** writes the selected instance to the prefab and refreshes other instances while preserving their overrides, **Revert** restores the asset state, and **Unpack** removes one prefab layer. UUID remapping prevents duplicated hierarchies and connections from targeting their source objects. CharacterBody2D automatically requires RigidBody2D; Area2D requires a collider; all objects require Transform2D.

### Asset browser and importer

Open **Assets** and use the searchable type menu instead of a long chip strip. It also toggles Favorites and applies saved query/folder/type filters. The folder tree controls the current source location; preview cards show thumbnails and source-control/import status. The Inspector displays source and artifact SHA-256 values, cache result, dependencies, reverse dependencies, build inclusion, import settings, and compatible saved presets.

Imports run in a bounded background queue with progress, Cancel, Retry, and a per-job log. Cache output is staged and verified; a failed reimport keeps the last valid artifact. **Link source** uses the browser file-access API where available. When a linked source changes, choose Reimport, Keep current, or Import as copy. Move, rename, and delete open an in-app preview listing known dependents. Missing References opens the UUID repair tool; Unused Asset Report identifies safe-delete candidates.

### Validate, repair, migration, and compatibility

Use the command palette or Project Health for **Validate project** and **Repair project**. Validation reports identity, schema, manifest, path, import metadata, component dependencies, and missing references. Repair first previews conservative changes; applying it creates a complete backup, validates the replacement, and restores the previous project if anything fails.

Opening schemas 5–22 shows project, engine/package compatibility, counts, warnings, and every migration step. The original is backed up and rollback data is retained before in-memory migration. A future schema is never downgraded: Project Manager opens its original text in a read-only compatibility viewer for inspection or download.

The desktop application starts as a maximized, decorated, resizable window. Restore or drag its normal window controls at any time. F11 alone toggles actual fullscreen and returns to the saved maximized/windowed state.
