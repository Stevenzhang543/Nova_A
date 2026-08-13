# Nova_A 2.3 Complete Manual

Nova_A is an open-source 2D game engine and editor. This manual describes the complete editor-to-player workflow in Nova_A 2.4.0. One world unit is one configured grid unit; physics values use SI-style units where shown.

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

Use `use "Movement.rhai";` or an `Assets/...` path for read-only project modules. Missing or circular dependencies are diagnosed before execution. Script asset metadata persists breakpoints, discovered `test_*` functions, and read-only package declarations in schema 17.

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

Nova_A 2.0 declares **Nova_A Project Format 2**; Nova_A 2.4 uses schema 17 with minimum supported legacy schema 5. Every saved project includes format name/major, schema, engine version, compatibility record and project metadata UUID. Schema 17 adds validated `Skeleton2D` rig/skin and `TimelinePlayer` references and preserves unknown asset fields.

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
