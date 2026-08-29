# Nova_A 5.0.1 Complete Manual

<!-- NOVA_V601_MOUSE_KNOCKOUT_START -->

## Nova_A 6.0.1 — Build Mouse Knockout from project to portable game

This is an exact, playable workflow—not a list of panel names. The supplied template already implements the complete game, and the manual also explains how to inspect, change, rebuild, test, and export it.

### What Nova_A can produce now

Yes. Nova_A can author this game, run it with deterministic fixed-step 2D physics, accept mouse/keyboard/gamepad input, spawn prefab instances, execute Rhai or Visual Graph logic, update UI, and export a standalone player.

On Windows, the Nova_A desktop editor can package the project into a portable x86-64 .exe when the matching Windows player template is installed and Project Health passes. The browser editor can build a web folder, but a browser cannot compile a native .exe. Code signing and clean-machine certification remain separate release-owner steps.

### 1. Create the ready-to-play project

1. Launch the Nova_A desktop editor and choose **New Project**.
2. Enter a project name such as **Mouse Knockout**, choose a writable empty folder, and select **Mouse Knockout** from Templates.
3. Choose **Create Project**. The project opens **Mouse Knockout Arena** as its startup scene and shows `Assets/Tutorials/Getting Started.md`.
4. Save once. This establishes the project document before you edit or build it.

### 2. Prove the game works before editing

1. Choose **Play** in the runtime toolbar.
2. Move the pointer inside the Game view. The blue square follows the pointer in camera/world coordinates; zoom, DPI, and aspect ratio do not change its physical scale.
3. Hit the eight orange targets. A target counts only after its center and safety margin leave the active camera bounds.
4. Confirm **Score  1 / 8** through **Score  8 / 8** and the **Congratulations! All targets cleared.** bar.
5. Choose **Stop**. Play-mode mutations are discarded; authored scene and assets remain unchanged.

### 3. Understand every supplied object and setting

- **Main Camera** — active Camera2D, orthographic size 10, dark background.
- **Mouse Player** — visible Rectangle, Kinematic RigidBody2D, BoxCollider2D, restitution 0.7, low friction, and native **MouseFollower2D**. Maximum speed 40 keeps the response immediate while bounding collision impulses; 0 is the optional unrestricted mode.
- **Game Manager** — Script2D with `KnockoutGameManager.rhai`; resets score, spawns eight targets, checks their camera bounds on a timer, and updates UI.
- **Game HUD** — screen-space Canvas at reference size 1920 × 1080.
- **Score Text / Instruction Text** — runtime score and player instruction.
- **Congratulations Bar / Congratulations Text** — disabled at start and enabled only at 8 / 8.
- **Knockout Target.nova-prefab** — Dynamic RigidBody2D with zero scene gravity, restitution 0.86, low friction, BoxCollider2D, and group `knockout-target`.
- **Scene physics** — gravity 0, 60 Hz fixed tick, interpolation enabled. Collision layer 0 interacts with layer 0.

### 4. Draw or replace an object yourself

1. Stop Play, open **Design**, choose the **Rectangle** drawing tool, then drag in the Scene view. The drag defines actual world width and height.
2. Select the new object in Hierarchy. In Inspector rename it, set Transform2D position/scale, and verify ShapeRenderer2D plus BoxCollider2D.
3. For a replacement player, set RigidBody2D → **Body type: Kinematic**, Gravity scale 0, low friction, then add **MouseFollower2D**. Keep Offset at 0, 0 and Maximum speed at 40 for responsive, bounded collisions. Use 0 only when you intentionally want unrestricted velocity. Disable or delete the original player only after the replacement passes Play.
4. For a replacement target, use **Body type: Dynamic**, Gravity scale 0, restitution about 0.86, low friction, and add it to group `knockout-target`; it needs no per-target script.
5. With the target selected, choose **Create Prefab** in Inspector. Copy its `asset://GUID` from Assets and replace `TARGET_PREFAB_GUID` in the manager script.
6. Keep target size near 1.25 × 1.25 and spawn centers within the Camera2D view so they are visible before play begins.

### 5. Understand the automatic pointer component and edit the manager script

`MouseFollower2D` reads the active Game-view pointer in world units and supplies the kinematic velocity inside the native fixed-step loop. This preserves collision response without running a script every frame.

`KnockoutGameManager.rhai` owns spawning, score, camera-bound checks, destruction, and UI. It checks the grouped targets on a repeating 50 ms timer, so identical per-target scripts are unnecessary. The shipped template contains all eight explicit `spawn_at` calls; the shortened excerpt below shows the contract.

```rhai
@export(type="int", min=1, max=64, step=1, group="Game") let remaining = 8;
fn start() {
  score_set(0.0);
  entity_set_enabled(find_entity_handle("Congratulations Bar"), false);
  entity_set_enabled(find_entity_handle("Congratulations Text"), false);
  ui_set_text_on(find_entity_handle("Score Text"), "Score  0 / 8");
  spawn_at("asset://TARGET_PREFAB_GUID", -6.0, -3.8, 0.0, 1.0, 1.0);
  // Repeat spawn_at at the seven other authored positions.
  timer_start("bounds", 0.05, true);
}
fn on_timer(name) {
  if name != "bounds" || remaining <= 0 { return; }
  let margin = 0.8;
  for target in query_group("knockout-target", 16) {
    let x = entity_position_x_on(target);
    let y = entity_position_y_on(target);
    if x < view_min_x() - margin || x > view_max_x() + margin
      || y < view_min_y() - margin || y > view_max_y() + margin {
      entity_destroy(target); score_add(1.0); remaining = remaining - 1;
    }
  }
  ui_set_text_on(find_entity_handle("Score Text"), `Score  ${8 - remaining} / 8`);
  if remaining == 0 {
    timer_cancel("bounds");
    entity_set_enabled(find_entity_handle("Congratulations Bar"), true);
    entity_set_enabled(find_entity_handle("Congratulations Text"), true);
  }
}
```

### 6. Configuration checklist before release

- Project Settings → Physics: fixed tick 60 Hz, finite gravity 0 for this scene, interpolation enabled.
- Collision Matrix: player and target share an enabled collision pair; UI objects have no physics collider.
- Input: no custom action is required for pointer position. `mouse_world_x/y` are read from the active Game view. Keyboard/gamepad actions remain available through Input Map.
- Camera: exactly one active gameplay Camera2D; orthographic size and viewport determine `view_min/max_x/y`.
- Build Settings: Runtime **Game**, startup scene **Mouse Knockout Arena**, Target **Windows**, Architecture **x86_64**, **Package into executable** on, identifier such as `top.whitelists.mouseknockout`, version `1.0.0`.
- Project Health: resolve every Error before Build; warnings for signing or external clean-machine evidence do not change the game logic.

### 7. Build the portable Windows game

1. Save the project, then open **Manage → Project Health** and run validation.
2. Open **Manage → Build Settings → Overview**.
3. Choose **Windows**, **x86_64**, runtime **Game**, and **Portable application / Package into executable**.
4. In Scenes, include **Mouse Knockout Arena**, put it first, and select it as Startup.
5. Use a Development build for testing or Release for distribution. Keep deterministic packaging enabled.
6. Choose an output directory outside the source project, then press **Build & Run**.
7. Nova_A creates the game data, invokes the matching local player template, writes the portable `.exe`, and launches it. Copy the resulting executable to another Windows x86-64 machine for the required clean-machine test.
8. For Web instead, select Web and **Web player folder**, build, and serve the whole output folder over HTTP(S); do not open `index.html` through `file://`.

### 8. Expected failures and exact fixes

- Player does not move: pointer must be over the Game view; verify MouseFollower2D is enabled, the body is Kinematic, and there is one active camera.
- Targets do not move: verify Dynamic body, BoxCollider2D, gravity 0, and that the collision matrix enables layer 0 ↔ 0.
- Target leaves view but score stays: verify the prefab group is exactly `knockout-target`, the manager timer is running, and API v2 provides `view_min/max`.
- Score changes twice: targets must have the group only once; do not add a second scoring script.
- Banner never appears: names must be exactly `Congratulations Bar`, `Congratulations Text`, and `Score Text`; remaining must start at the number of spawned targets.
- Build is unavailable: use the desktop editor on the target host, install/validate the Windows x86-64 export template, select a startup scene, and clear Project Health errors.

<!-- NOVA_V601_MOUSE_KNOCKOUT_END -->

## Nova_A 5.0.1 editor organization

The 5.0.1 patch keeps every 5.0 command, shortcut, workflow, animation, and data contract while reorganizing the editor around frequency and context. Workspaces, transform tools, navigation history, and simulation stay direct. **Layout** contains panel visibility and focus-mode controls. **Commands** contains Quick Open and the Command Palette. **Authoring tools** contains pivot, rectangle-transform, path, polygon, collider, measure, and shape drawing. **View settings** contains transform reference, pivot reference, grid/angle snapping, guides/rulers, and camera framing. Every item remains keyboard accessible and searchable.

The editor uses a 12 px caption minimum, 13 px dense-control minimum, rounded multilingual UI fonts, stronger panel separation, role-colored creation actions, and responsive named popovers instead of a horizontally scrolling scene toolbar. English, German, and Chinese are qualified at compact, default, and comfortable scales in both themes; reduced motion removes nonessential transitions without hiding state changes.

## Nova_A 5.0 production baseline and certification status

Nova_A 5.0 freezes Project Format 2 schema 29, Rhai API v2, Plugin API 2, Package Manifest 1, Build CLI 1, workspace document 3, and the eleven-file artifact contract for the 5.x line. New projects and scripts use Rhai v2; imported v1 scripts remain read-only compatibility records until migrated. Default release authoring shows only evidence-backed Tier-1 targets, Windows x86-64 and Web. Linux/macOS stay Experimental matching-host records and Android is unavailable.

Warnings in Launcher migration, Project Health, Package Manager, Script Studio, and Build Settings now have stable bundled help targets. Four.x workspace layouts are normalized and migrated without dropping custom profiles. The final policies, API index, migration, package SDK, build/export, troubleshooting, accessibility, performance, security, support, deprecation, known-issues, first-game, and release-engineering guides live under `docs/`.

The local 5.0 package remains a candidate until its 72-hour soak, 14-day observation, two-machine reproducibility, disposable install lifecycle, external browser/hardware matrix, signing, exact tagged source, and independent verifier evidence are attached. Nova_A never converts an unexecuted external gate into a passing result.

## Nova_A 4.9 build, packages, collaboration and release candidate

Nova_A 4.9 freezes Project Format 2/schema 29, Rhai API v2, Plugin API 2, package manifest 1, Build CLI 1, platform tiers and the eleven-file release format for the 5.0 release candidate. Feature development is closed; only release-blocking corrections, documentation and evidence fixes are accepted during the minimum 14-day observation.

Build Settings now presents presets, actual target availability, platform identity, content rules, symbols, signing/notarization hooks, local or explicit remote delivery, history, cache/input/output hashes, provenance, CycloneDX SBOM and evidence. Windows and web are Tier 1. Linux/macOS are matching-host Experimental CI targets. Android is visible but unavailable until its complete matrix passes. Unsupported actions fail before output mutation.

Packages are verified before execution: trusted registry policy, publisher, license, provenance, archive/dependency hashes, signature, engine/API range, certification and permissions are shown before approval. Stable uses the exact lock and verified offline cache. Tampering, conflicts, permission denial, malicious paths and missing trust quarantine the package; updates retain rollback and Safe Mode bypasses third-party startup.

The Team tab is optional and local-first. It provides semantic project comparison, generated ignore/hooks/CI, explicit external diff/merge, CODEOWNERS, task links, change notes, shared build presets and advisory binary locks. No Nova_A cloud service is required and network actions are disabled by default.

Use **Help → Build your first game** for launcher-to-Windows/web export, **Package & Plugin SDK** for extension contracts, and **Release engineering guide** for the unified eleven-artifact pipeline, privacy-reviewed diagnostics, clean-machine/browser/migration/security/license matrices and RC sign-off.

## Nova_A 4.8 renderer, materials, particles, audio, and profiler

Open **Manage → Rendering** to choose Auto, Native, or Compatibility, inspect the actual device/driver/API/extensions/limits, review every supported/limited/unsupported feature, and apply its direct fix. Quality settings include pixel density, color space and draw-call/texture/overdraw/GPU/particle budgets. Diagnostics show texture memory, frame capture, context state, and each batch-break reason. Canvas2D is an explicit diagnostic fallback and cannot silently stand in for shaders, normal lighting, GPU timing, or post-processing.

The Material view edits reusable assets, parent inheritance, textures/blend, typed uniforms, include declarations and shader source. Compiler or platform failure records an actionable fallback event and blocks production validation. The Particle view can create a `.nova-particle` asset from an emitter and reapply it. Emitter controls include rates, bursts, shape, velocity/gravity, lifetime curves, gradients, sorting, material, preview, collision mode/layer/restitution, subemitters and bounded budgets.

Open **Manage → Presentation → Audio** for buses, effects, sends, snapshots, ducking, automation, limiter/ceiling and semantic peak/RMS/dB/clipping meters. AudioSource supports routing, polyphony/priority, voice stealing/virtualization, streaming/preload, seek, fades, loop, playlists/randomization and positional attenuation/pan. Choose an output device where supported; hot-plug, suspension and playback failures appear in diagnostics with **Recover audio**. Doppler is marked limited on the stereo Web Audio path.

The **Profiler** captures frames, renderer/audio/particle state, markers, counters, annotations, remote-player identity and overhead mode. Compare baselines and export a versioned capture plus CI result. Project Health and Build Diagnostics enforce project-owned frame/render/audio/GPU/draw/texture/particle/overhead budgets. See `docs/RENDERER_CAPABILITY_PATHS.md`, `MATERIAL_SHADER_WORKFLOW.md`, `PARTICLE_SYSTEMS.md`, `AUDIO_PRODUCTION.md`, and `PERFORMANCE_CAPTURES.md` for exact platform boundaries.

## Nova_A 4.4 production assets, sprites, TileMap, paths, and fonts

Open **Assets** in the bottom dock. Import, New Script, Create Scene Asset, and New Folder are daily actions; **•••** contains Export Folder and validated batch reimport. Use grid/list view, search, type, tag, favorites, saved filters, and collections. Asset windows load incrementally when a project contains thousands of files.

Select an asset and use the five Asset Importer tabs. **Source** owns path, source-control state, tags, collections, content group, and editor-only status. **Import** owns format-specific settings and versioned presets. **Dependencies** shows inbound/outbound references, build closure, cycles, duplicate sources, and missing references. **Provenance** shows full copyable hashes, importer/preset/version/settings/cache decisions, Compare, diagnostics, and Revert. **Platform Overrides** explicitly controls target compression, maximum size, and format. Reimport rejects invalid bytes and retains the last verified artifact; it never silently substitutes content.

Image Import controls filtering, mipmaps, color space, transparency, compression, PPU, pivot, trim, manual/grid/automatic slicing, animation extraction, nine-slice, polygon/collision, atlas group/rotation/trim, SVG rasterization, and target overrides. TileMap adds searchable TileSet palettes, complete paint/selection tools, per-layer collision/navigation/occlusion, world-coordinate readout, streaming boundaries, baking, bounded history, diagnostics, and copyable deterministic storage. Camera composition retains bounds, smoothing, drag margins, safe frames, previews, priorities, stacks, viewports, textures, and culling. Parallax adds repeat/mirror/depth. Paths add points, tangents, closed smoothing, `.nova-path` assets, and runtime followers.

Font Import controls scalable/bitmap output, fallbacks, shaping, OpenType, hinting, oversampling, outline, SDF/MSDF, distance range, declared languages, editor/game ownership, and glyph reports for CJK, RTL, combining marks, and emoji. Missing coverage always has an action. See `docs/ASSET_PIPELINE_4_4.md`, `docs/SPRITE_TILEMAP_FONT_4_4.md`, and `docs/KNOWN_ISSUES_4_4.md`.

## Nova_A 4.3 scene, hierarchy, Inspector, component, and prefab authoring

Use the loaded-scene tabs above Design to inspect dirty, external-change, validation, and prefab state. Back/Forward revisits scene history. **+** creates Empty 2D, Gameplay 2D, UI Overlay, or Camera Stage templates. The gear edits runtime loading policy, inheritance, tags, named layers, visibility/lock, and dependencies. Inheritance and hierarchy cycles are rejected.

The Hierarchy virtualizes 10,000-object scenes. Search matches names, IDs, tags, and component types; type and dedicated tag filters, saved searches, pins, selection Back/Forward, breadcrumbs, isolate, visibility, lock, enabled state, range selection, reparenting, and sibling reorder remain available. The Inspector supports multi-edit mixed values, tags/groups/layers, ownership, owner, editor-only and persistence policy, safe numeric expressions, property pins/modified-only, presets, component enable/reset/copy/paste/reorder/remove, and inline dependency/conflict validation.

Prefab workflows provide Create, Instantiate, Apply, Revert, per-property Reset, Compare, Unpack, Variant, source navigation, conflict status, nesting, circular-dependency prevention, and safe selection replacement. Viewport Arrange, measure, camera frame, rulers, guides, and seven documented snap targets share exact world units. See [scene/prefab schema](../docs/SCENE_PREFAB_SCHEMA_4_3.md), [component authoring](../docs/COMPONENT_AUTHORING_4_3.md), and [Hierarchy/Inspector](../docs/HIERARCHY_INSPECTOR_4_3.md).

## Nova_A 4.2 project-integrity workflow

All authored changes enter the central undo model and dirty scope. **Edit → Undo History** shows operation, affected resource, scope, timestamp, applied/redo state, and memory use; groups and nested operations remain one named action. Save validates and deterministically serializes before a journaled transaction stages, verifies, and commits project, scene, asset/script/animation/UI metadata, settings, build data, and `Packages.lock`. Failed writes preserve the last manual save.

Project Manager guides **Open**, **Add existing**, **Migrate older project**, and traversal-safe bounded **Import archive**. Older schemas 5–29 receive dry-run compatibility and impact reports, a backup, Task Center log, deterministic rerun, complete validation, and rollback. A lock conflict offers a clear read-only route. **Manage → Project Health** covers validation, deterministic re-save, read-only repair preview, missing-reference mapping, stale-cache rebuild, transaction journals, recovery checkpoints, migration status, rollback, and recoverable project trash.

After abnormal exit, Recovery Browser previews valid checkpoints against the manual baseline and requires Restore, Discard, or Open as copy; it never silently overwrites a manual file. External file/branch changes likewise require Compare, Reload/Keep disk, or Keep editor. See [serialization](../docs/SERIALIZATION_SPECIFICATION_4_2.md), [transactions](../docs/PROJECT_TRANSACTIONS_4_2.md), [recovery](../docs/RECOVERY_4_2.md), and [migration/rollback](../docs/MIGRATION_AND_ROLLBACK_4_2.md).

## Nova_A 4.1 editor modernization

Nova_A now has six top-level workspaces: **Design**, **Script**, **Animation**, **UI**, **Debug**, and **Manage**. The left rail is contextual. Manage contains Settings, Packages, Project Health, global Rendering policy, and Build; the bottom dock keeps contextual Assets, Console, Animation, Audio, and Profiler tools. Use Ctrl/Cmd+Shift+P for every stable command, Ctrl/Cmd+P for assets, Ctrl/Cmd+Shift+F for global search, and Ctrl/Cmd+K for context search. Workspace Manager provides six role profiles, named layouts, drag/split/floating docks, panel pinning, auto-hide, tab rearrangement, import/export, reset, and safe recovery.

The editor bundles Nunito Sans Variable, Noto Sans SC Variable, and JetBrains Mono. Density never shrinks text below the readable role floor. Project Manager requires one visibly selected template, validates project name/path, exposes details, and stores guidance as a dismissible tutorial asset. Debug owns the virtualized Physics Monitor; Manage owns the summary/table/detail Project Health view and four-state build readiness. Task Center unifies long-running progress, cancellation, retry, details, logs, and resource links. See [navigation](../docs/NAVIGATION_4_1.md), [design tokens](../docs/UI_DESIGN_TOKENS_4_1.md), and [keyboard accessibility](../docs/KEYBOARD_ACCESSIBILITY_4_1.md).

## Nova_A 4.0 production baseline

Nova_A 4.0 is the stable Project Format 2/schema 29 baseline. Opening any external project first shows engine/schema, content counts, package compatibility, migration plan, and a preflight report. Supported 3.x upgrades require a complete source download, retain a local rollback record, migrate in memory, validate the complete document, canonicalize it, and only then replace the editor session. Newer schemas remain read-only. See [Migration](../docs/MIGRATION_4_0.md) and [Archived engines](../docs/ARCHIVED_ENGINE_GUIDANCE_4_0.md).

Studio Status declares Stable, Beta, and Development channels, the offline known-issues feed, frozen public contracts, and privacy-reviewed diagnostics. Crash packages require explicit opt-in and remain local until the user sends them. The default templates are Empty, Platformer, Top-down, Physics Sandbox, and UI Showcase; Experimental networking remains available through Packages and references but is not presented as a Stable starter.

Start with [Create and export a small game](../docs/CREATE_EXPORT_SMALL_GAME_4_0.md). The supported API index, build/CI, performance, security, accessibility, troubleshooting, support, and package guides are under `docs/`. Version 4.0 preserves every retained rendering, animation, scripting, physics, UI, audio, world, build, and extension workflow while locking schema 29, Runtime API 1, Plugin API 2, Package Manifest 1, and Build CLI 1 for compatible 4.0.x patches.

Nova_A is an open-source 2D game engine and editor. This manual describes the complete editor-to-player workflow in Nova_A 3.8.0. One world unit is one configured grid unit and one metre by default; physics values use the documented SI-style units.

## Nova_A 3.8 world-data workflow

Select a TileMap2D to open the contextual **Tilemap** panel. Assign or create a TileSet, choose one of its atlas sources, configure margin/spacing or an explicit tile region, then paint with Brush, Stamp, Pattern, Line, Rectangle, Fill, Replace or Eraser. Selection supports copy, rotate and mirror. Each layer independently controls visibility, lock, opacity, blend, parallax, z order and collision/navigation/occlusion participation. A tile can define animation, weighted variants, terrain, collision/navigation/occlusion polygons, cost, metadata and a scene/prefab reference. **Validate** reports missing tiles, terrain gaps, overdraw and bake coverage; **Bake** refreshes collision, navigation, occlusion and runtime chunks.

Add NavigationRegion2D, NavigationObstacle2D or NavigationAgent2D from the searchable Inspector. Regions choose Grid or Polygon, source, layer mask, cost, agent radius and explicit links. Use Bake/Rebake/Clear/Profile in the selected component and enable the viewport debug overlay to inspect actual paths. Grid clearance, polygon visibility A*, dynamic obstacles and local avoidance all use the same runtime data.

WorldChunk2D defines a cell's bounds, owner, optional scene, dependencies, memory estimate, load/prefetch/unload distances, cache policy and save key. During Play, streaming loads and activates cells asynchronously within the project memory budget. The viewport overlay shows unloaded, pending and active cells; Profiler records event timing, memory peak and failures. Serialized state is handed off before unload. Streaming Tools is optional; core cell execution does not depend on it.

**Debug → Save Inspector** lists save slots, checksum/schema/time/size/location, progress and recovery. Save envelope version 2 carries the project's independently versioned save schema; a commit uses deterministic migration, a verified temporary value, journal, backup and checksum. Cancel is safe before the atomic commit boundary. If a primary copy is damaged, choose Recover to promote the validated backup or interrupted transaction. Custom serializers must return bounded scalar/array/object save values. Object Pool and AI authoring are optional packages: enabling them reveals their components; disabling them hides creation controls but keeps serialized data intact.

## Nova_A 3.7 visual and audio workflow

Open the bottom **Rendering** tool. Its header switches between **Lighting**, **Materials**, **Shaders**, **Particles**, **Diagnostics**, and **Quality**. Lighting owns ambient color/intensity, shadow quality and capability status; add Light2D or ShadowCaster2D from the Object Inspector and use layer masks to choose interactions. Materials generates typed controls for numbers, integers, ranges, enums, toggles, vectors, colors and textures, plus parent material, blend, sampling, color space, variant and color-write. Shaders shows the bounded GLSL ES source, includes, live preview and clickable source-line errors; raw uniform/texture JSON is available only after enabling Advanced. Particles reports project budget, active particles, emitters, update time and subemissions; select a ParticleEmitter2D to edit shape, burst/rate, lifetime motion, scale curve, color/opacity gradient, blend/material and optional subemitter.

Diagnostics shows GPU time when supported, draw calls, batches, batch breaks, triangles, overdraw, atlas pages, render targets and each render pass. **Capture frame** saves the rendered surface; choose A and B and press **Compare** for normalized pixel difference. The capability card identifies WebGL2 Tier 1 or Canvas2D Fallback, every supported/unsupported feature and context-loss state; **Reset renderer** rebuilds it. Quality presets change shadow, maximum pixel density, particle budget, pixel snapping and post processing. Canvas2D hides custom shader/post-target controls it cannot execute and Project Health explains the fallback.

In **Assets**, choose an image profile: General, Pixel Art, UI or Normal Map. The profile fills filtering, compression, atlas, pixels-per-unit and sRGB/Linear defaults; individual settings remain editable. Font assets choose Scalable or Bitmap cache behavior, bitmap size, fallback-family order, glyph outline and shaping. These settings reach Scene/Game world text and runtime UI. New shapes use a crisp 0.04-world-unit joined outline, so corners no longer protrude.

Audio assets expose preview, Sound Effect/Music/Voice/Streaming profile, Original/PCM/Vorbis/MP3 storage metadata, quality, normalize gain, trim, loop points and streaming. AudioSource owns volume/pitch/loop/autoplay, 2D spatial blend, min/max range, linear/inverse/exponential/custom attenuation, bus, priority, polyphony, deterministic pitch/volume variation, virtualization and stream override. AudioListener defines the listener. Project Audio provides buses, parents, sends, mute/solo, effects, snapshots, ducking and voice caps; UI/animation sounds share the graph. Profiler → Audio shows active/streaming/buffered/virtual/limited voices, bus meters, context, base/output latency, underruns and device changes. Use PCM and zero-crossing loop points for timing-critical short loops; compressed/streaming delay must be qualified on the target device.

## Nova_A 3.6 presentation workflow

The **UI** workspace now owns responsive game UI, themes, localization, UI sound references, and game accessibility. Project-wide buses and mixing remain under the bottom **Audio** system. Select a Canvas to set DPI, locale preview, safe-area behavior, and a theme variant. RectTransform supports anchor ranges, offsets, minimum/preferred/maximum size, aspect ratio, layout flags, reading order, skip navigation, and accessible name, description, role, state, value, and live-region metadata. Panel supports Row, Column, Grid, Flow, Overlay, Center, Margin, Aspect, and Split layout plus scroll, modal, popup, tooltip, drag, and drop behavior. Use the phone, tablet, desktop, and ultrawide preview buttons to check resolution, DPI, safe areas, and RTL without changing the game window.

The **Input Map** accepts logical or physical keys, mouse buttons, wheel and motion, gamepad buttons and axes, touch, and gestures. Search or filter by device, duplicate an action, record input, and resolve the visible conflict list. Each binding can store controller identity, dead zone, threshold, inversion, response curve, modifiers, and a chord. Runtime rebinding persists through normal project saves; record/replay snapshots include pointer movement, touches, and connected device identities.

The localization editor imports or exports CSV, stores keys with context and plural forms, configures fallback locales and font fallbacks, extracts keys from UI and `localize(...)`/`tr(...)` Rhai calls, and generates a missing-string report. Accented, expanded, and bidirectional pseudolocalization plus RTL preview reveal clipping and direction errors before export. The accessibility page applies high contrast, reduced motion, text scale, and minimum target size to the game runtime and reports missing labels, unreachable controls, insufficient contrast, and invalid focus/read order with object/component/property locations.

Animation retains the dope sheet, curve view, inspector key insertion, snapping, tangents, looping, Animator conditions/transitions/blending/live debug, sprite frames/onion skin, and skeleton/skin/IK/constraint tools. v3.6 also persists playback speed, easing, markers, and property, method, event, audio, and nested-animation tracks. Runtime command tracks fire only when their time boundary is crossed, while reusable clip libraries remain asset-backed.

## New in 3.5: Rhai API v1 and the professional Script workspace

Open **Script** in the workspace row. The left pane lists project `.rhai` files and full-text search results; the center has persistent file tabs, line numbers, breakpoint gutter, Find/Replace, semantic completion, parameter help, source editor, and unsaved indicator; the right pane separates **Problems**, **Outline**, **Debug**, **Tests**, **API**, **Modules**, and **Signals**. **Save** validates the complete module graph before changing the active runtime. **Format** applies the deterministic Rhai formatter. **Definition**, **References**, and **Rename** use the project symbol index. Diagnostic cards show parser, semantic, compatibility, runtime, or test phase, a stable `NOVA-*` code, exact range, documentation link, and any safe code action. Recovery retains the last unsaved source independently from the last saved hash.

Use the **Script template** menu before creating a script: Component contains supported lifecycle/physics callbacks; UI contains pressed/hover/signal behavior; Physics contains fixed-step force and contact callbacks; Animation Event contains Animator control; Test contains deterministic setup, parameterized cases, tags, timeout, assertions, and teardown. Unsupported callbacks are not advertised. Project modules use `use "Module.rhai"`; resolution is restricted to project script assets, rejects path escape and cycles, and records dependencies in the Modules pane. The optional package name groups modules without granting filesystem, network, process, DOM, dynamic evaluation, or raw host-import access.

### API, exports, signals, and deferred work

API v1 has stable lifecycle, scene, object, component, transform, input, physics, UI, audio, animation, navigation, save, timing, logging, resources, signals, tasks, and testing domains. Callable names remain flat `snake_case` for Rhai; their domain is used by completion, docs, auditing, and compatibility. Object/component/resource handles contain `valid`, `kind`, stable `id`, `error`, `api_version`, and deterministic `generation`. Validate `valid` instead of storing editor internals. See `docs/RHAI_API_V1.md` for all 108 symbols and an example for every one.

An export may declare `type`, inferred/default value, `min`, `max`, `step`, `enum`, resource type, `group`, `tooltip`, and `serialize`; the Object Inspector derives its control, grouping, range, choices, asset filter, help, and save behavior from that metadata. Old `@export let` remains compatible. The Signals pane adds serializable signal-to-callback connections with source/target metadata. `timer_start/pause/resume/cancel` drives `on_timer`; `task_wait/task_cancel` provides a cancellable deferred continuation through `on_task`. Invalid durations and task/timer names become visible script errors. Signals, timer completions, task completions, and runtime mutations are queued for safe engine boundaries.

### Debugger, hot reload, tests, and profiler

Click a gutter line for a persistent line breakpoint; **Function breakpoint** adds a callback-scoped breakpoint. Each detailed breakpoint can be enabled, conditioned, delayed until a hit count, or converted into a non-pausing logpoint with `{property.path}` interpolation. **Pause/Continue**, **Step into**, **Step over**, **Step out**, and **Restart** operate at safe Rhai callback boundaries. Debug shows the mapped script/path/function/line, bounded call stack, current context locals, watches, expression comparison, and nested object inspection. Update, fixed update, input-driven updates, collision/trigger, UI, signal, timer, task, late-update, and destroy paths are covered. Limitation: API v1 does not pause at arbitrary statements inside one Rhai callback; stepping advances between safe callback boundaries.

Each script chooses **Preserve compatible state**, **Recreate instances**, or **Disabled** hot reload. Preserve retains only values compatible with the new export type; Recreate uses new defaults and lifecycle; Disabled leaves the active source alone. Nova_A compiles and validates the complete module graph first, then swaps atomically. A compile/module failure reports **Rejected** and keeps the previous AST, state, and running instances.

Tests are functions named `test_*`, optionally preceded by `// @test tags=unit timeout=1000 seed=42 cases=a|b` or `skip=true`. `before_all`, `before_each`, `after_each`, and `after_all` are the setup/teardown callbacks; `expect(condition, message)` records a failure without corrupting another test. Run the active script or project from **Tests**. For CI use `pnpm test:scripts:headless -- path --format json|junit --output report`; exit `0` means all runnable tests passed, `1` means a test failed/timed out, and `2` means runner/configuration failure. **Debug → Profiler → Scripts** shows per-script/function calls, total/last/maximum time and allocation estimate; Capture stores a bounded snapshot, Export writes JSON, and A/B compare reports deltas.

For external editors run `pnpm script:lsp`. It is a documented JSON-lines stdio process for analyze, completion, hover, definition, references, workspace symbols, formatting, and shutdown; see `docs/RHAI_LANGUAGE_PROTOCOL.md`. Deprecated aliases remain operational through API v1 but Problems and runtime logs show their API-v2 replacement. Use the API browser’s **Documentation** button or generated manual links for migration.

## New in 3.4: production 2D physics

Open **Project Settings → Physics** for Simulation, Collision Layers, Materials, and Conformance. Simulation controls gravity (`m/s²`), air damping (`s⁻¹`), time scale, tick rate, catch-up limit, and transform interpolation; the page shows the resulting fixed step and explains CCD, sleep, units, and transform ownership. Collision Layers provides 32 stable bits with editable unique names, descriptions, colors, presets, search, a compact pair editor, and the retained Advanced matrix. Renaming never changes a bit. Materials creates `.nova-material` assets containing density, friction, restitution, threshold, and Average/Minimum/Maximum/Multiply combine rules; selecting a material in Collider2D applies it to the native solver.

Collider2D selects Box, Circle, Capsule, Segment, Chain, Convex Polygon, or Concave Polygon and states the exact support level. Capsules use a deterministic 12-point convex approximation; finite segments have collision thickness. Chain and concave bodies remain query-only until deterministic decomposition is stable. **Additional local shapes** adds up to seven enabled shapes with independent kind, offset, rotation, and size; they move as one body and use the displayed deterministic convex collision envelope. Offset and rotation are in body-local coordinates.

RigidBody2D selects Static, Kinematic/Animation-owned, or Dynamic/Physics-owned behavior. Dynamic transforms are written by physics while Play runs; use `Physics2D.teleport` for discontinuous placement and force/impulse for motion. `Physics2D` also provides raycast/all, shape cast, point/circle/box overlap, contact query, `moveAndSlide`, and character state. CharacterBody2D reports floor, wall, ceiling, normals and platform velocity and applies slope limit, step height, floor snap, safe margin, slide count, and moving-platform transfer.

Area/sensor contacts deliver trigger enter, stay, and exit. Solid contacts deliver collision enter, stay, and exit with contact data. Same-build event ordering is stable by body pair and phase. One-way colliders reject contacts from their pass-through side. Distance, revolute, prismatic, weld, spring, rope, and motor joints expose anchors, axes, limits, motor speed/torque, collide-connected, break force/torque, tension, strain, and break state.

In **Debug → Profiler**, enable collider, contact, normal, AABB, sleeping, joint, rope-node, character-contact, and named-layer-color overlays. Trace includes physics time, bodies, contacts, sleeping bodies, CCD bodies, joint constraints, steps, dropped time, and rebuilds. Replay records fixed input and checksums; Tests runs scene/headless assertions. The Platformer Character, Top-down Character, Joint Showcase, Trigger Showcase, CCD Test, Stacking Test, and Physics Sandbox references are included with the release. The complete units/API/support contract is in `docs/PHYSICS_2D.md`.

## New in 3.3: complete 2D authoring

Press **Shift+A**, the **Create Object** toolbar button, the Hierarchy **+**, or the empty Inspector action to open the same transactional palette. Search by type, component, or category. Categories are Core, 2D, Physics, UI, Audio, Camera, Navigation, Script, and Packages. A card reports required components and whether it is Stable, Experimental, or package-provided. Use the star to favorite a type; successful choices enter Recently Used. Creating Empty, Sprite, Animated Sprite, Text, Polygon, Line, Path, Rectangle, Circle, Triangle, Collider, Canvas Layer, Parallax Layer, Camera, Audio Emitter, Light, Navigation Region, or Script Object selects it and creates exactly one Undo entry.

The Scene toolbar now exposes **Select, Move, Rotate, Scale, Pivot, Rectangle, Path points, Polygon points, Collider, and Measure**. Measure drags a ruler that reports distance and X/Y delta in world units. Arrange offers left/center/right/top/middle/bottom alignment, horizontal/vertical distribution, X/Y mirror, clockwise/counter-clockwise 90-degree rotation, grouping, frame selection, isolate/exit isolation, and focus camera. Snapping independently enables Grid, Pixel, Vertex, Edge, Center, Angle, and Object. Camera Overlay selects Off, 16:9, 16:10, 4:3, 9:16, or a custom width/height. Box selection, Ctrl/Cmd toggling, Shift ranges, lock, hide, layer filtering, and the large-scene lightning button remain non-destructive editor state.

The Inspector search and category tabs work for single and multi-selection. Mixed shared values display **Mixed** and only the edited field is written. Right-click a metadata-backed property for **Reset to Default, Revert Override, Copy Value, Paste Value, Copy Property Path, Keyframe Property, Pin/Unpin**, range/unit documentation, and inline help. **Modified only** and **Pinned only** filter rows. Every component header can enable/disable, copy, paste, move up/down, reset, or remove the component; removal uses the application confirmation dialog. Invalid or non-finite numeric input is normalized to the documented range before persistence.

Sprite Inspector fields cover asset, tint/modulation, opacity, world size, normalized pivot, X/Y flip, sorting/render layer, order, material, filtering, and nine-slice borders. The Asset Importer previews filter, compression, color space, pixel-art mode, atlas region, pivot presets, transparent trim, sprite-sheet columns/rows/margin/spacing, and borders. **Create slices** creates stable region records without duplicating source bytes. Drag an image or prefab onto Scene to create the corresponding object at the snapped pointer position in one undo step.

Camera2D covers active state, orthographic size, zoom, background, pixel-perfect placement, editor preview, follow target, exponential smoothing speed, world limits, drag margins, viewport, sorting range, priority/stack order, culling mask, and render texture. The viewport displays each enabled preview camera plus the chosen common-resolution frame. Canvas Layer can follow the camera in screen space; Parallax Layer applies per-axis motion scale and repeat metadata.

Hierarchy search includes names, IDs, tags, and component names. Breadcrumb buttons select an ancestor. Status badges show prefab, scene instance, and overrides. Dragging reparents while preserving world transform; **Alt-drag** preserves local transform; **Shift-drag** reorders. Rename, duplicate, reparent, reorder, group, and delete are Undo/Redo transactions. The selection filter chooses All, Visible, Unlocked, Sprites, Cameras, or Physics and keeps matching descendants reachable through their ancestors. The performance button bounds editor traversal for the supplied 5,000-object scene.

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

Open **Help → Studio Status** to view Project Format 2/schema 28, Runtime API 1, Plugin API 2, Package Manifest 1, and Build CLI 1. **Copy diagnostics** copies those versions and the platform; **Manual** returns here. Projects from schemas 5–27 use the migration preview, complete source backup, package audit, in-memory validation, atomic session replacement, and rollback copy described in section 18. A future schema opens only in the non-mutating compatibility viewer.

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

## Nova_A 3.9 — build, packages, collaboration, and 4.0 release candidate

This edition documents engine 3.9.0 and Project Format 2 schema 29.

Build Settings is organized around presets, platform profiles, output/signing, Delivery, Diagnostics & History, and Team. Windows x86-64 and Web runtime are Tier 1; Linux and macOS remain Experimental; mobile and console are Unsupported until after 4.0. Use the seven-command headless CLI (validate, import, test, build, export, package, version), JSONL logs, clean/incremental/validated caches, inclusion/exclusion rules, stripping, compression, size/dependency reports, symbols, icons, manifests, version metadata and CI templates.

Stable package installation requires SemVer, engine/API ranges, permissions, one package type, dependency hashes, archive SHA-256 and a verified signature. The Inspector shows permissions before install and on changes. Failures are quarantined; offline cache verification, deterministic lock resolution, verified rollback and Safe Mode are available. Package types are editor, build, importer, runtime and template.

Team shows project/settings/package/scene/prefab/resource diffs, operation and lockfile changes, reload/compare choices, canonical no-op output, shared versus local settings, Git initialization, optional locks, and pre-commit/CI templates. Studio Status contains migration/known-issue views and a privacy-reviewed local diagnostic bundle. Nothing uploads automatically. Networking remains an optional Experimental package and is not a 4.0 core blocker. Project Format 2 schema 29 and Runtime API 1, Plugin API 2, Package Manifest 1 and Build CLI 1 are frozen for the 4.0 stabilization cycle.

## Nova_A 4.5 — production physics and character workflow

Project Settings → Physics starts with Accurate, Balanced, Fast, or Custom. A profile controls fixed rate, catch-up, interpolation, dropped-time policy, minimum substeps, solver iterations, sleeping, and the diagnostic time budget. Settings, named collision layers, and the advanced matrix are project data and enter build manifests. The Advanced section contains the raw 32×32 matrix; everyday work uses named layers and pair controls.

RigidBody2D explicitly identifies Static, Dynamic, or Kinematic ownership. CharacterBody2D and Area2D make Character and Trigger roles visible. Collider shape offers rectangle, circle, capsule, segment, polygon, chain, world boundary, and compound children; the Inspector states any dynamic-solver limitation. World Boundary always becomes static. Mass, density, inertia, local centre, friction, restitution, gravity scale, damping, sleep, fixed rotation, and CCD are shown with units.

Use `Physics2D.rayQuery`, `pointQuery`, `overlapQuery`, `sweep`, `nearest`, and `contactQuery` for structured filtered results. Collision/trigger enter, stay, and exit have stable pair/phase order; body sleep/wake and joint/Rope break events resolve to stable UUIDs. Character controllers keep frame input separate from fixed-step movement. Platformer uses floor/slope/step/snap/platform/jump state; top-down normalizes two-axis input and submits velocity once per fixed step.

Distance, revolute, prismatic, weld, spring, motor, and Rope2D show anchors, limits, damping, connected collision, break thresholds, and telemetry. Rope2D also exposes 3–32 segments, compliance/stretch, bend behavior, density, radius, collision, endpoints, and break link. Endpoint owners are excluded from Rope node collision; compatible third bodies still collide.

The Physics Monitor is a virtual list plus detail pane. Sort bodies, reverse ordering, pin a body, inspect a 60-step speed sparkline/delta, review collision forces, inspect joints/Rope, capture, compare, and export JSON. Profiler overlays colliders, contacts, normals, AABBs, sleep, centre of mass, velocity, force, character contacts, joints, and Rope nodes. Project Health reports physics-budget, dropped-time, and scale warnings. See `docs/PHYSICS_2D_4_5.md`, `docs/CHARACTER_CONTROLLERS_4_5.md`, and `docs/PHYSICS_DIAGNOSTICS_4_5.md`.

## Nova_A 4.6 — complete programming workflow

The **Script** workspace is divided into Explorer, multi-file Editor, and a dockable Problems/Tests/Debug detail region. Create a supported template, edit with semantic completion, signature help and hover, inspect parser/semantic/API diagnostics, format with project rules, and use Outline, Definition, References, Rename and code actions. Modules shows dependencies, per-asset API v1/v2 selection and transactional hot-reload history. The checksum-validated workspace index restores after a crash and rebuilds after API changes.

Rhai API v2 has 110 documented stable entries across lifecycle, scene/entity/component/transform, input, physics, animation, UI, audio, save, navigation, logging, time, tasks, signals, resources and tests. Project Health reports API version, v1 assets and deprecated uses. API v1 remains selectable for imported assets; diagnostics offer v2 replacements and no 4.x save silently rewrites source. The generated reference, manifest, migration map and metadata stubs are in `docs/RHAI_API_V2*`, `docs/RHAI_V1_TO_V2.json`, and `docs/NOVA_RHAI_API_V2_STUBS.rhai`.

The debugger supports persistent grouped line/function breakpoints, conditions, hit counts, logpoints, stack/frame selection, locals, watches/evaluation, exception policy, tasks, source navigation and callback-safe stepping. Exported-player debugging is off by default, loopback-only, explicitly enabled and token-authenticated. A save is compiled and classified before hot reload; incompatible/syntax-failed candidates cannot replace the valid runtime, and each accepted change retains rollback history.

Run tests for the file, project, tags or prior failures. Unit, integration, scene, UI, physics, animation and regression metadata supports fixtures, setup/teardown, cases, timeout, cancellation and captured deterministic seed. The CLI produces JSON, JUnit and JSON/LCOV coverage, supports changed selection and deterministic sharding, and returns 0 pass, 1 test failure or 2 infrastructure/usage failure. Shared-world editor tests remain serial; independent CLI shards are the supported parallel policy. See `docs/RHAI_TESTING_COVERAGE_4_6.md`, `docs/RHAI_DEBUG_PROTOCOL_V2.md`, `docs/RHAI_HOT_RELOAD_4_6.md`, and `docs/RHAI_EXTERNAL_TOOLS_4_6.md`.

## Nova_A 4.7 — animation and runtime UI production

Open **Animation** and select an animation asset before authoring controls become available. Add property, event, method, audio, nested-clip, marker, sprite-frame or custom tracks; set each key to Step, Linear or Cubic; then use Retime, Ripple, Reduce or Slice for structural edits. Track targets are checked against scene properties, Script Studio symbols and audio resources. The state view exposes layers, parameters, conditions, transition duration, blend trees, interruption rules and the current runtime state/time. The rig view stores bones, skins, masks, constraints, IK, attachment points and explicit retarget aliases. Import mapping, event-preserving compression and runtime sampling diagnostics are in the asset pipeline.

Open **UI** for one shared hierarchy, selection and Inspector workflow. RectTransform supports responsive anchors, container/fixed layout, breakpoints, safe area, clipping, scrolling, z-order, reusable component sources and variants. Six preview presets cover desktop 16:9, laptop 16:10, ultrawide, 4:3, mobile portrait and mobile landscape; every issue selects the affected control. Fixed pixel coordinates require explicit Fixed mode. Runtime text wrap/overflow, locale mirroring, input-action prompts, captions and focus order are component data, so preview and exported players use the same contract.

Theme tokens cover colors, typography, spacing, radii, states, icons, sounds and animation. Parent themes merge deterministically; cycles, differences and unused tokens are reported. Localization supports stable keys, script/UI extraction, tables, CSV and PO interchange, plural forms, fallbacks, number/currency/date/time-zone policy, pseudolocalization, missing/replacement-glyph diagnostics, RTL/bidirectional text and locale font fallback. Project Health and Build Settings expose animation/UI budgets, localization status, semantic labels/roles/states, focus order, contrast, text scaling, reduced motion, and subtitle/caption readiness. Keyboard, mouse, gamepad and touch prompts change automatically with the last active input modality.

## Nova_A 5.3 — production visual scripting

Open **Script → Visual Graph**. The scope selector switches between the main graph and reusable functions, macros, or subgraphs. In **Structure**, add typed inputs/outputs, routine locals, custom events, interfaces, and visual-node libraries from installed project packages. Signature edits retain matching stable pins and remove incompatible wires explicitly; validation blocks missing interfaces, packages, pins, types, cycles, or identities before play/build.

Use the node-header circle for a breakpoint. **Debug** provides conditions, hit counts, logpoints, watches, Continue/Step Into/Over/Out, active nodes and wires, stack, timings, errors, and coverage from the actual ordered Rust runtime trace. Reduced motion keeps the active stroke visible without movement. **Refactor** supports UUID-safe rename/find references, main-graph Extract Function, compatible Replace Node, and recorded deprecation migrations. **Diff / Merge** compares semantic identities, performs a three-way merge, and requires an explicit ours/theirs choice for every conflict. **Generated Rhai** displays the exact API-v2 execution source and creates a new one-way `.rhai` copy without overwriting the graph. Compatible saves hot reload at a frame boundary; signature or serialized-lifetime changes clearly require restart. See `docs/VISUAL_SCRIPTING_5_3.md` and `docs/VISUAL_SCRIPT_DEBUGGING_5_3.md`.

Use `docs/ANIMATION_UI_4_7.md`, `docs/ANIMATION_IMPORT_4_7.md`, and `docs/UI_LOCALIZATION_ACCESSIBILITY_4_7.md` for data contracts, validation rules, supported behavior and evidence commands. The five `*-v47-*` reference projects cover state machines, rigs, responsive HUD, multilingual RTL and accessibility.

## Nova_A 5.4 — gameplay framework and dynamic objects

Open **Inspector → Add Component → Gameplay** to add Grid Mover, Platform Controller, Top-down Controller, Health, Damage Hitbox, Collectible, Projectile, Spawner, Cooldown, Lifetime, or Camera Follow. Configure input action/resource selectors and bounded physical values in the same Inspector. Platform and Top-down controllers are mutually exclusive and automatically require CharacterBody/RigidBody. Contacts still obey collision layers and the project matrix.

Open **Manage → Project Settings → Input Map**, expand **Action behavior**, and assign a context, action map, schemes, Press/Hold/Tap/Multi-tap interaction, consumption, priority, and optional Rhai callback. Gameplay/Default start active. Scripts can push/pop contexts, enable/disable non-default maps, and switch schemes; recorded input and deterministic replay retain all phases and state.

Use `spawn_at` to create a prefab at a full transform and receive a pending entity handle. The handle can immediately target position/rotation/scale, enabled state, components, UI text/value, tags, groups, or destruction. `query_tag`, `query_group`, `query_component`, and `query_radius` return at most 256 typed handles. Stale, destroyed, despawned, scene-unloaded, and generation-mismatched handles log an explicit error and do nothing.

Game flow scripts use pause, scene reload/load/quit, 32 named checkpoints, score, and bounded session data. Behavior trees and state machines send their active node/state, transition, coverage, errors, and timings to **Debug → Visual Debugger** and **Profiler**. Follow `docs/GAMEPLAY_FRAMEWORK_5_4.md`, `docs/DYNAMIC_OBJECT_API_5_4.md`, and `docs/INPUT_GAME_FLOW_5_4.md`.

## Nova_A 5.5 — materials, effects and particles

## Nova_A 5.6 — animation, audio and cinematics

### Animation panel — manual and runtime-assisted work

Create an Animator Controller, add numeric parameters, then add a blend tree to a state. Choose **1D** for a single speed/direction axis or **2D** for two axes such as horizontal/vertical movement. Each child selects a clip, position/threshold and speed. **Synchronized timing** maps the same normalized phase across different clip lengths. Animator layers apply in list order; Weight controls influence, Additive adds values, Mask limits properties, and Synchronized layer/timing copies another layer clock. State Cycle offset, Speed parameter, Mirror X/Y and Root motion affect runtime sampling.

For transitions choose exit time, crossfade duration and interruption behavior. **Normalized Time** starts the destination at the source phase; **Marker** requires the same named marker in both clips. Conditions read controller parameters and Trigger is consumed once. Events and Method/Audio/Nested Animation/Timeline/Visual Graph/Custom command tracks execute in deterministic time and authored order.

To record real gameplay, select the controller's object, start Play, press **Record runtime to clip**, perform the motion, then press Stop recording. Nova_A samples Transform and opacity, reduces redundant keys and creates or updates an animation asset. This is assisted and reversible; normal Stop without completing the recording cancels the temporary session.

### Timeline panel — manual cinematic assembly

Add Animation, Audio, Camera, Event, Visibility, Script Call, Nested Timeline, Subtitle or Branch tracks. Clips expose start, duration, offset, playback rate, target and payload. Camera clips additionally use blend-in/out. Subtitle clips use locale and TitleSafe (80%), ActionSafe (90%) or FullFrame (96%). Add markers in the ruler, assign Skip/Resume markers, and use TimelinePlayer's Skip/Resume controls at runtime. A Branch clip's value names a marker; optional payload JSON such as `{"variable":"rescued","equals":true}` reads a TimelinePlayer variable.

Nested timelines are manual references, cycle-protected and bounded to eight levels. Paused playhead movement seeks AudioSource playback without creating another voice. The diagnostic block reports validation, processed clips, nested depth, last update time and long-sequence warnings.

### Audio panel — manual regions and automatic diagnostics

Choose an audio asset, click the waveform to place the cursor, use Left/Right for 10 ms steps, or drag a range. Press **Loop region** to save the selection and choose it from Active loop region. Preview begins at the cursor. Named regions override the retained default loop markers only while selected.

Mixer buses retain parents, effects, sends, automation, voice limits and mute/solo. Capture a snapshot, rename it, edit master gain, choose it, and set Snapshot crossfade. Ducking rows provide enable, trigger/target bus, reduction, attack and release. Diagnostics automatically report estimated momentary/integrated LUFS, true peak, crest factor, clipping, latency, underruns, device changes and recovery. Press Recover audio after permission/output problems; hardware reconnection also invokes recovery automatically.

See [the focused 5.6 guide](../docs/ANIMATION_AUDIO_CINEMATICS_5_6.md) for ordering, compatibility and qualification boundaries.
Open **Rendering → Visual material graph** and choose a material asset. **Classification: Assisted, reversible, asset-wide.** Select Sprite, UI or Light, add nodes, select each named input source, edit colors or numeric values, inspect backend capability, then Validate and Save. One Output and an acyclic graph are required. Saving persists deterministic inputs; generated GLSL remains derived. Canvas2D lists effects it cannot match; WebGL2 evaluates the complete graph. An invalid shader falls back only that material.

Use **Layered 2D effects** for an ordered stack. **Classification: Manual, reversible, asset-wide.** Add Tint, Mask, Gradient, Palette, Outline, Dissolve or Distortion; select its row; edit colors, texture, strength, threshold or softness; choose blend/opacity; reorder; save. A mask needs an imported image. Unsupported Canvas effects retain the safe base color and show a warning.

Open **Rendering → Post processing**. **Classification: Manual plus automatic camera selection, project-wide.** Edit or duplicate a preset, then add a camera volume with center, size, blend distance, priority and preset. The live camera selects the highest-priority containing volume before each frame. Cost is an estimate; verify gameplay with Capture and Profiler.

Add `ParticleEmitter2D`, then open **Rendering → Particles**. **Classification: Assisted asset authoring, per-object application, runtime.** Create an asset from the emitter; order Spawn, Shape, Velocity, Force, Color, Size, Rotation, Collision, Events, Sub-emitter, Trail and Renderer modules; save; press Apply asset to intentionally copy values. Opening an asset never mutates the scene. CPU simulation is deterministic; WebGL2 batches compatible drawing and Canvas2D reports CPU drawing honestly.

**Rendering → Diagnostics** shows actual atlas/import thumbnails, draw calls, batch breaks, overdraw, texture memory and remedies. **Classification: Automatic diagnostics, editor-only.** Capture a representative frame before changing atlas groups or quality. See `docs/MATERIALS_EFFECTS_5_5.md` and `docs/PARTICLES_POST_5_5.md`.

## Nova_A 5.7 — World Studio

Open the bottom panel and choose **World Studio**. **Classification: Manual authoring, automatic runtime diagnostics, per-object/project-wide, reversible.** Select a host object and use Character, Areas, Navigation, AI, Streaming or Pooling. Navigation regions support Grid/Polygon, A*, HierarchicalAStar and FlowField; configure polygon, cell/cluster size, cost, layer, links and cost areas, then press **Bake navigation**. Add agents/obstacles to their objects. Pending means the bounded 256-query scheduler deferred new work; Unreachable means no valid route exists. Cancel stops an in-progress bake without reporting success.

For AI, enable the official package, add BehaviorTree2D and create a v2 asset. The template senses objects tagged `player`, writes `target.count/uuid/distance` to its blackboard, then chooses the highest stable utility score. Play and inspect active node, blackboard, perceptions and scores in the same tab. Version-1 trees still run. Runtime work is bounded to 10,000 objects and 2,048 due ticks per frame.

For a streamed world, add WorldChunk2D to a cell owner and parent its content. Configure load/unload/prefetch distance, dependencies, cache policy, scene, memory estimate and save key. Dependencies must fit the project memory budget as a complete closure. Deactivation automatically captures descendant enabled state, transform and velocity; activation restores them. Use Origin shift for large coordinates and review current/peak memory and events before export.

In the contextual TileMap panel, terrain rules, procedural brushes and weighted variants remain deterministic. A TileSet tile can reference a scene/prefab; during Play it instantiates within streaming radius and caches outside it. **Bake TileMap** validates chunks in the background, can be cancelled, and displays a deterministic artifact hash. See `docs/WORLDS_NAVIGATION_AI_5_7.md`.

## Nova_A 5.8 — Network Studio

Open the bottom panel and choose **Network Studio**. **Classification: optional package; manual project authoring; explicit permission; automatic fixed-step runtime; project-wide.** Install the networking package, review and grant network access, enable the project, then choose Local lobby or Direct connect. No socket opens merely by opening a project or panel. Local lobby stays on the same origin and contacts no Nova_A cloud. Direct connect uses only the WebSocket/UDP endpoint you enter.

In **Protocol**, keep transform/input snapshots on Unreliable sequenced channels and lifecycle/RPC events on Reliable ordered channels. Every channel has byte, rate and priority limits; the project also limits total messages, packet size, reliable queue, retries and bandwidth. Add each RPC manually with direction, caller authority, payload schema, bytes and calls/second. Scripts and visual graphs may call `network_rpc(name, payload)` only through that contract. Received RPCs enter normal scripting as `network.<name>` signals. Raw sockets, credentials and arbitrary services are never exposed to Rhai.

In **Replication**, select an object and add it explicitly, choose Server or Owner authority, and check only transform, rotation or velocity values needed by gameplay. Snapshot Rate controls authority output; Interpolation smooths remote state; Predict extrapolates velocity; Reconciliation threshold decides when recorded local prediction differs enough to correct. The rollback history stores fixed-step input and physics checksums, so Diagnostics can show divergence, rollback and replayed-input counts.

In **Simulation & replay**, enable seeded latency, jitter, loss, duplicate or reorder behavior before testing. Record while connected, save the replay asset, then compare two assets to locate the first mismatching tick. **Multiplayer Save** captures only explicitly replicated state and verifies a checksum on restore. Endpoints, credentials and secret-like fields are excluded.

Use **Diagnostics** to inspect packet/byte/bandwidth totals, invalid/rate-limited/dropped data, reliable retries, late joins, prediction, rollback, events and packet order. Export is a local, sanitized JSON file and never uploads. For a headless authority, choose a desktop Headless Server build, Server/Host role and Native UDP; validation blocks missing package, permission, authority or transport. Follow `docs/NETWORKING_REPLAY_5_8.md` for protocol rules, Rhai calls, limitations and the localhost qualification boundary.

## Nova_A 5.9 — Ecosystem Studio and platform delivery

Open the bottom dock and choose **Ecosystem Studio**. **Classification: assisted/manual, editor-only authoring, project-wide configuration, reversible until install/trust, permission-gated.** Extensions lists the complete API matrix, enabled manifests and contributions. Loading starts only enabled WASM modules; Reload swaps to a new generation; Unload invokes shutdown and removes the instance. Safe Mode skips third-party startup. A failed or over-budget module is isolated without disabling unrelated plugins.

For a plugin, declare only the contribution permissions it needs: docks, Inspectors, importers, components, graph nodes, render passes, build steps, templates, commands or settings. Graph-node `entry` names a stable Rhai API 2 callable so pins are generated safely. Native code uses a separate ABI 1 manifest with platform/architecture hashes, sidecar isolation, heartbeat/restart bounds and individually approved permissions. Nova_A only validates and prepares `implicitExecution:false`; it does not start native binaries automatically.

In **Package Lab**, enter a reverse-domain ID, SemVer, publisher, archive SHA-256, license and HTTPS documentation/security pages. Create the canonical signing request and sign it externally with Ed25519; never paste a private key. Paste the public key and Base64 signature, verify for this session, then run certification. Unsafe paths, hidden executable content, unknown permissions, archive bombs, more than 50,000 files or archives above 512 MB are blocked. Export/Import Registry handles manifest indexes only, stays offline and never downloads package contents.

In **Export templates**, inspect installed target/architecture/runtime templates and their gates. Windows/Web are locally available, while independent clean-machine and signing evidence remain external. Linux/macOS stay matching-host candidates; Android stays blocked until every SDK/template/signing/device/install/input/audio gate passes. An imported file cannot declare itself trusted.

In **Delivery**, refresh deterministic CI cache keys, keep delta builds with patch manifests, and create local, HTTPS or external-command connectors. Remote/external connectors require project permission. Prepare Plan validates destination and checksum but returns a non-executable plan and performs no network operation. Final deployment remains an external, explicit action. See `docs/EXTENSIONS_PLATFORM_DELIVERY_5_9.md`.

<!-- NOVA_V6_TEACHING_START -->
# Nova_A 6.0 task-oriented teaching manual

Learn by completing real work. Every public feature below states ownership, persistence, recovery, accessibility and release behavior.

- Engine: **6.0.0**
- Stable contracts: Project Format 2/schema 29; Rhai API 2; Graph Format 1; Plugin API 2; Package Manifest 1; Build CLI 1; workspace document 3.
- External signing, independent clean-machine evidence, two-machine reproduction, matching-host builds and a real 72-hour soak remain pending until independently captured.

## Complete guided projects

- [Complete Snake game](#task-snake-complete-snake-game)
- [Complete platformer](#task-platformer-complete-platformer)
- [Complete top-down game](#task-top-down-complete-top-down-game)
- [Physics puzzle with rope and joints](#task-physics-puzzle-physics-puzzle-with-rope-and-joints)
- [Localized responsive menu](#task-menu-localized-responsive-menu)
- [Animation and cutscene](#task-cutscene-animation-and-cutscene)
- [TileMap streamed world](#task-tilemap-tilemap-streamed-world)
- [Save and checkpoint workflow](#task-save-save-and-checkpoint-workflow)
- [Package and plugin workflow](#task-package-package-and-plugin-workflow)
- [Local network sample](#task-network-local-network-sample)
- [Windows portable export](#task-windows-windows-portable-export)
- [Web deployment](#task-web-web-deployment)

## Project Manager

<a id="project-manager-create-project"></a>

### Create project

**Classification:** Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Create project in Project Manager to complete its supported authoring or runtime job without leaving the Launcher workflow. Use it when the project needs create project; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exact workflow:**

1. Open Launcher, then open Project Manager.
2. Choose Create project; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Create project is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Create project is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Create project on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Create project, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Create project.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="project-manager-open-project"></a>

### Open project

**Classification:** Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Open project in Project Manager to complete its supported authoring or runtime job without leaving the Launcher workflow. Use it when the project needs open project; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exact workflow:**

1. Open Launcher, then open Project Manager.
2. Choose Open project; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Open project is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Open project is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Open project on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Open project, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Open project.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="project-manager-add-existing-project"></a>

### Add existing project

**Classification:** Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Add existing project in Project Manager to complete its supported authoring or runtime job without leaving the Launcher workflow. Use it when the project needs add existing project; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exact workflow:**

1. Open Launcher, then open Project Manager.
2. Choose Add existing project; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Add existing project is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Add existing project is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Add existing project on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Add existing project, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Add existing project.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="project-manager-import-archive"></a>

### Import archive

**Classification:** Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Import archive in Project Manager to complete its supported authoring or runtime job without leaving the Launcher workflow. Use it when the project needs import archive; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exact workflow:**

1. Open Launcher, then open Project Manager.
2. Choose Import archive; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Import archive is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Import archive is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Import archive on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Import archive, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Import archive.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="project-manager-migration-preflight"></a>

### Migration preflight

**Classification:** Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Migration preflight in Project Manager to complete its supported authoring or runtime job without leaving the Launcher workflow. Use it when the project needs migration preflight; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exact workflow:**

1. Open Launcher, then open Project Manager.
2. Choose Migration preflight; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Migration preflight is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Migration preflight is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Migration preflight on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Migration preflight, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Migration preflight.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="project-manager-rollback-download"></a>

### Rollback download

**Classification:** Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Rollback download in Project Manager to complete its supported authoring or runtime job without leaving the Launcher workflow. Use it when the project needs rollback download; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exact workflow:**

1. Open Launcher, then open Project Manager.
2. Choose Rollback download; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Rollback download is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Rollback download is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Rollback download on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Rollback download, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Rollback download.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="project-manager-recent-projects"></a>

### Recent projects

**Classification:** Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Recent projects in Project Manager to complete its supported authoring or runtime job without leaving the Launcher workflow. Use it when the project needs recent projects; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exact workflow:**

1. Open Launcher, then open Project Manager.
2. Choose Recent projects; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Recent projects is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Recent projects is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Recent projects on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Recent projects, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Recent projects.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="project-manager-project-templates"></a>

### Project templates

**Classification:** Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Project templates in Project Manager to complete its supported authoring or runtime job without leaving the Launcher workflow. Use it when the project needs project templates; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exact workflow:**

1. Open Launcher, then open Project Manager.
2. Choose Project templates; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Project templates is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Project templates is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Project templates on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Project templates, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Project templates.

**Rhai API:** N/A

**Visual Graph API:** N/A


## Workspace Bar

<a id="workspaces-design-workspace"></a>

### Design workspace

**Classification:** Manual · Editor-only · Reversible

**Purpose and when to use it:** Use Design workspace in Workspace Bar to complete its supported authoring or runtime job without leaving the All workflow. Use it when the project needs design workspace; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open All, then open Workspace Bar.
2. Choose Design workspace; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Design workspace is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Design workspace is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Design workspace on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Design workspace, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Design workspace.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="workspaces-script-workspace"></a>

### Script workspace

**Classification:** Manual · Editor-only · Reversible

**Purpose and when to use it:** Use Script workspace in Workspace Bar to complete its supported authoring or runtime job without leaving the All workflow. Use it when the project needs script workspace; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open All, then open Workspace Bar.
2. Choose Script workspace; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Script workspace is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Script workspace is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Script workspace on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Script workspace, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Script workspace.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="workspaces-animation-workspace"></a>

### Animation workspace

**Classification:** Manual · Editor-only · Reversible

**Purpose and when to use it:** Use Animation workspace in Workspace Bar to complete its supported authoring or runtime job without leaving the All workflow. Use it when the project needs animation workspace; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open All, then open Workspace Bar.
2. Choose Animation workspace; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Animation workspace is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Animation workspace is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Animation workspace on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Animation workspace, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Animation workspace.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="workspaces-interface-workspace"></a>

### Interface workspace

**Classification:** Manual · Editor-only · Reversible

**Purpose and when to use it:** Use Interface workspace in Workspace Bar to complete its supported authoring or runtime job without leaving the All workflow. Use it when the project needs interface workspace; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open All, then open Workspace Bar.
2. Choose Interface workspace; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Interface workspace is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Interface workspace is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Interface workspace on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Interface workspace, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Interface workspace.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="workspaces-debug-workspace"></a>

### Debug workspace

**Classification:** Manual · Editor-only · Reversible

**Purpose and when to use it:** Use Debug workspace in Workspace Bar to complete its supported authoring or runtime job without leaving the All workflow. Use it when the project needs debug workspace; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open All, then open Workspace Bar.
2. Choose Debug workspace; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Debug workspace is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Debug workspace is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Debug workspace on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Debug workspace, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Debug workspace.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="workspaces-manage-workspace"></a>

### Manage workspace

**Classification:** Manual · Editor-only · Reversible

**Purpose and when to use it:** Use Manage workspace in Workspace Bar to complete its supported authoring or runtime job without leaving the All workflow. Use it when the project needs manage workspace; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open All, then open Workspace Bar.
2. Choose Manage workspace; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Manage workspace is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Manage workspace is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Manage workspace on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Manage workspace, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Manage workspace.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="workspaces-dock-and-float-panels"></a>

### Dock and float panels

**Classification:** Manual · Editor-only · Reversible

**Purpose and when to use it:** Use Dock and float panels in Workspace Bar to complete its supported authoring or runtime job without leaving the All workflow. Use it when the project needs dock and float panels; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open All, then open Workspace Bar.
2. Choose Dock and float panels; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Dock and float panels is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Dock and float panels is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Dock and float panels on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Dock and float panels, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Dock and float panels.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="workspaces-saved-layouts"></a>

### Saved layouts

**Classification:** Manual · Editor-only · Reversible

**Purpose and when to use it:** Use Saved layouts in Workspace Bar to complete its supported authoring or runtime job without leaving the All workflow. Use it when the project needs saved layouts; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open All, then open Workspace Bar.
2. Choose Saved layouts; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Saved layouts is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Saved layouts is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Saved layouts on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Saved layouts, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Saved layouts.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="workspaces-focus-mode"></a>

### Focus mode

**Classification:** Manual · Editor-only · Reversible

**Purpose and when to use it:** Use Focus mode in Workspace Bar to complete its supported authoring or runtime job without leaving the All workflow. Use it when the project needs focus mode; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open All, then open Workspace Bar.
2. Choose Focus mode; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Focus mode is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Focus mode is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Focus mode on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Focus mode, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Focus mode.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="workspaces-navigation-history"></a>

### Navigation history

**Classification:** Manual · Editor-only · Reversible

**Purpose and when to use it:** Use Navigation history in Workspace Bar to complete its supported authoring or runtime job without leaving the All workflow. Use it when the project needs navigation history; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open All, then open Workspace Bar.
2. Choose Navigation history; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Navigation history is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Navigation history is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Navigation history on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Navigation history, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Navigation history.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="workspaces-command-palette"></a>

### Command Palette

**Classification:** Manual · Editor-only · Reversible

**Purpose and when to use it:** Use Command Palette in Workspace Bar to complete its supported authoring or runtime job without leaving the All workflow. Use it when the project needs command palette; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open All, then open Workspace Bar.
2. Choose Command Palette; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Command Palette is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Command Palette is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Command Palette on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Command Palette, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Command Palette.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="workspaces-shortcut-editor"></a>

### Shortcut Editor

**Classification:** Manual · Editor-only · Reversible

**Purpose and when to use it:** Use Shortcut Editor in Workspace Bar to complete its supported authoring or runtime job without leaving the All workflow. Use it when the project needs shortcut editor; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open All, then open Workspace Bar.
2. Choose Shortcut Editor; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Shortcut Editor is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Shortcut Editor is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Shortcut Editor on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Shortcut Editor, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Shortcut Editor.

**Rhai API:** N/A

**Visual Graph API:** N/A


## Hierarchy

<a id="hierarchy-search-and-filters"></a>

### Search and filters

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Search and filters in Hierarchy to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs search and filters; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open scene

**Exact workflow:**

1. Open Design, then open Hierarchy.
2. Choose Search and filters; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Search and filters is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Search and filters is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Search and filters on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Search and filters, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Search and filters.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="hierarchy-virtualized-10-000-object-list"></a>

### Virtualized 10,000-object list

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Virtualized 10,000-object list in Hierarchy to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs virtualized 10,000-object list; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open scene

**Exact workflow:**

1. Open Design, then open Hierarchy.
2. Choose Virtualized 10,000-object list; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Virtualized 10,000-object list is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Virtualized 10,000-object list is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Virtualized 10,000-object list on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Virtualized 10,000-object list, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Virtualized 10,000-object list.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="hierarchy-multi-selection"></a>

### Multi-selection

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Multi-selection in Hierarchy to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs multi-selection; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open scene

**Exact workflow:**

1. Open Design, then open Hierarchy.
2. Choose Multi-selection; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Multi-selection is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Multi-selection is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Multi-selection on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Multi-selection, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Multi-selection.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="hierarchy-rename"></a>

### Rename

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Rename in Hierarchy to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs rename; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open scene

**Exact workflow:**

1. Open Design, then open Hierarchy.
2. Choose Rename; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Rename is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Rename is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Rename on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Rename, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Rename.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="hierarchy-duplicate"></a>

### Duplicate

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Duplicate in Hierarchy to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs duplicate; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open scene

**Exact workflow:**

1. Open Design, then open Hierarchy.
2. Choose Duplicate; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Duplicate is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Duplicate is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Duplicate on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Duplicate, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Duplicate.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="hierarchy-group"></a>

### Group

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Group in Hierarchy to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs group; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open scene

**Exact workflow:**

1. Open Design, then open Hierarchy.
2. Choose Group; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Group is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Group is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Group on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Group, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Group.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="hierarchy-reparent"></a>

### Reparent

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Reparent in Hierarchy to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs reparent; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open scene

**Exact workflow:**

1. Open Design, then open Hierarchy.
2. Choose Reparent; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Reparent is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Reparent is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Reparent on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Reparent, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Reparent.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="hierarchy-reorder"></a>

### Reorder

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Reorder in Hierarchy to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs reorder; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open scene

**Exact workflow:**

1. Open Design, then open Hierarchy.
2. Choose Reorder; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Reorder is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Reorder is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Reorder on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Reorder, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Reorder.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="hierarchy-lock"></a>

### Lock

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Lock in Hierarchy to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs lock; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open scene

**Exact workflow:**

1. Open Design, then open Hierarchy.
2. Choose Lock; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Lock is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Lock is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Lock on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Lock, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Lock.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="hierarchy-hide"></a>

### Hide

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Hide in Hierarchy to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs hide; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open scene

**Exact workflow:**

1. Open Design, then open Hierarchy.
2. Choose Hide; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Hide is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Hide is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Hide on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Hide, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Hide.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="hierarchy-isolate"></a>

### Isolate

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Isolate in Hierarchy to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs isolate; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open scene

**Exact workflow:**

1. Open Design, then open Hierarchy.
2. Choose Isolate; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Isolate is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Isolate is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Isolate on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Isolate, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Isolate.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="hierarchy-breadcrumbs"></a>

### Breadcrumbs

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Breadcrumbs in Hierarchy to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs breadcrumbs; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open scene

**Exact workflow:**

1. Open Design, then open Hierarchy.
2. Choose Breadcrumbs; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Breadcrumbs is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Breadcrumbs is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Breadcrumbs on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Breadcrumbs, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Breadcrumbs.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="hierarchy-scene-tabs"></a>

### Scene tabs

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Scene tabs in Hierarchy to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs scene tabs; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open scene

**Exact workflow:**

1. Open Design, then open Hierarchy.
2. Choose Scene tabs; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Scene tabs is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Scene tabs is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Scene tabs on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Scene tabs, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Scene tabs.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="hierarchy-additive-and-overlay-loading"></a>

### Additive and overlay loading

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Additive and overlay loading in Hierarchy to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs additive and overlay loading; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open scene

**Exact workflow:**

1. Open Design, then open Hierarchy.
2. Choose Additive and overlay loading; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Additive and overlay loading is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Additive and overlay loading is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Additive and overlay loading on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Additive and overlay loading, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Additive and overlay loading.

**Rhai API:** N/A

**Visual Graph API:** N/A


## Scene View

<a id="viewport-select"></a>

### Select

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Select in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs select; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Select; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Select is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Select is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Select on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Select, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Select.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-move"></a>

### Move

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Move in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs move; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Move; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Move is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Move is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Move on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Move, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Move.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-rotate"></a>

### Rotate

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Rotate in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs rotate; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Rotate; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Rotate is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Rotate is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Rotate on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Rotate, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Rotate.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-scale"></a>

### Scale

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Scale in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs scale; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Scale; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Scale is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Scale is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Scale on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Scale, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Scale.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-pivot"></a>

### Pivot

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Pivot in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs pivot; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Pivot; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Pivot is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Pivot is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Pivot on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Pivot, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Pivot.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-rectangle-tool"></a>

### Rectangle tool

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Rectangle tool in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs rectangle tool; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Rectangle tool; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Rectangle tool is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Rectangle tool is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Rectangle tool on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Rectangle tool, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Rectangle tool.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-polygon-tool"></a>

### Polygon tool

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Polygon tool in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs polygon tool; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Polygon tool; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Polygon tool is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Polygon tool is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Polygon tool on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Polygon tool, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Polygon tool.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-path-tool"></a>

### Path tool

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Path tool in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs path tool; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Path tool; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Path tool is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Path tool is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Path tool on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Path tool, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Path tool.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-collider-tool"></a>

### Collider tool

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Collider tool in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs collider tool; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Collider tool; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Collider tool is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Collider tool is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Collider tool on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Collider tool, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Collider tool.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-ruler"></a>

### Ruler

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Ruler in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs ruler; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Ruler; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Ruler is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Ruler is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Ruler on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Ruler, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Ruler.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-grid-snapping"></a>

### Grid snapping

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Grid snapping in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs grid snapping; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Grid snapping; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Grid snapping is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Grid snapping is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Grid snapping on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Grid snapping, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Grid snapping.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-pixel-snapping"></a>

### Pixel snapping

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Pixel snapping in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs pixel snapping; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Pixel snapping; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Pixel snapping is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Pixel snapping is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Pixel snapping on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Pixel snapping, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Pixel snapping.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-vertex-snapping"></a>

### Vertex snapping

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Vertex snapping in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs vertex snapping; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Vertex snapping; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Vertex snapping is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Vertex snapping is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Vertex snapping on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Vertex snapping, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Vertex snapping.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-edge-snapping"></a>

### Edge snapping

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Edge snapping in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs edge snapping; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Edge snapping; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Edge snapping is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Edge snapping is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Edge snapping on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Edge snapping, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Edge snapping.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-center-snapping"></a>

### Center snapping

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Center snapping in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs center snapping; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Center snapping; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Center snapping is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Center snapping is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Center snapping on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Center snapping, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Center snapping.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-angle-snapping"></a>

### Angle snapping

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Angle snapping in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs angle snapping; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Angle snapping; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Angle snapping is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Angle snapping is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Angle snapping on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Angle snapping, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Angle snapping.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-guides-and-rulers"></a>

### Guides and rulers

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Guides and rulers in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs guides and rulers; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Guides and rulers; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Guides and rulers is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Guides and rulers is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Guides and rulers on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Guides and rulers, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Guides and rulers.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-alignment-and-distribution"></a>

### Alignment and distribution

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Alignment and distribution in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs alignment and distribution; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Alignment and distribution; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Alignment and distribution is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Alignment and distribution is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Alignment and distribution on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Alignment and distribution, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Alignment and distribution.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-mirror"></a>

### Mirror

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Mirror in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs mirror; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Mirror; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Mirror is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Mirror is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Mirror on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Mirror, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Mirror.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="viewport-camera-framing"></a>

### Camera framing

**Classification:** Manual · Editor-only · Reversible · Per-object

**Purpose and when to use it:** Use Camera framing in Scene View to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs camera framing; keep unrelated settings in their owning workspace.

**Preconditions:**

- An editable scene
- At least one object for transform tools

**Exact workflow:**

1. Open Design, then open Scene View.
2. Choose Camera framing; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Camera framing is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Camera framing is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Camera framing on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Camera framing, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Camera framing.

**Rhai API:** N/A

**Visual Graph API:** N/A


## Inspector

<a id="inspector-transform2d"></a>

### Transform2D

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use Transform2D in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs transform2d; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose Transform2D; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Transform2D is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Transform2D is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Transform2D on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Transform2D, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Transform2D.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="inspector-renderer-components"></a>

### Renderer components

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use Renderer components in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs renderer components; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose Renderer components; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Renderer components is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Renderer components is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Renderer components on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Renderer components, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Renderer components.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="inspector-physics-components"></a>

### Physics components

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use Physics components in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs physics components; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose Physics components; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Physics components is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Physics components is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Physics components on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Physics components, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Physics components.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="inspector-gameplay-components"></a>

### Gameplay components

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use Gameplay components in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs gameplay components; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose Gameplay components; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Gameplay components is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Gameplay components is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Gameplay components on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Gameplay components, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Gameplay components.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="inspector-ui-components"></a>

### UI components

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use UI components in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs ui components; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose UI components; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** UI components is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** UI components is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing UI components on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure UI components, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for UI components.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="inspector-audio-components"></a>

### Audio components

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use Audio components in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs audio components; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose Audio components; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Audio components is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Audio components is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Audio components on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Audio components, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Audio components.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="inspector-script2d"></a>

### Script2D

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use Script2D in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs script2d; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose Script2D; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Script2D is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Script2D is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Script2D on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Script2D, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Script2D.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="inspector-multi-edit-mixed-values"></a>

### Multi-edit mixed values

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use Multi-edit mixed values in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs multi-edit mixed values; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose Multi-edit mixed values; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Multi-edit mixed values is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Multi-edit mixed values is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Multi-edit mixed values on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Multi-edit mixed values, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Multi-edit mixed values.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="inspector-property-expressions"></a>

### Property expressions

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use Property expressions in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs property expressions; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose Property expressions; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Property expressions is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Property expressions is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Property expressions on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Property expressions, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Property expressions.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="inspector-property-search"></a>

### Property search

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use Property search in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs property search; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose Property search; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Property search is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Property search is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Property search on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Property search, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Property search.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="inspector-changed-only-filter"></a>

### Changed-only filter

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use Changed-only filter in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs changed-only filter; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose Changed-only filter; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Changed-only filter is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Changed-only filter is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Changed-only filter on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Changed-only filter, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Changed-only filter.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="inspector-pinned-properties"></a>

### Pinned properties

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use Pinned properties in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs pinned properties; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose Pinned properties; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Pinned properties is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Pinned properties is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Pinned properties on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Pinned properties, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Pinned properties.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="inspector-reset-and-copy-paste"></a>

### Reset and copy/paste

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use Reset and copy/paste in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs reset and copy/paste; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose Reset and copy/paste; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Reset and copy/paste is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Reset and copy/paste is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Reset and copy/paste on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Reset and copy/paste, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Reset and copy/paste.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="inspector-keyframe-property"></a>

### Keyframe property

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use Keyframe property in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs keyframe property; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose Keyframe property; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Keyframe property is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Keyframe property is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Keyframe property on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Keyframe property, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Keyframe property.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="inspector-component-validation"></a>

### Component validation

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use Component validation in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs component validation; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose Component validation; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Component validation is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Component validation is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Component validation on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Component validation, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Component validation.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="inspector-prefab-overrides"></a>

### Prefab overrides

**Classification:** Manual · Assisted · Reversible · Per-object

**Purpose and when to use it:** Use Prefab overrides in Inspector to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs prefab overrides; keep unrelated settings in their owning workspace.

**Preconditions:**

- One or more selected objects

**Exact workflow:**

1. Open Design, then open Inspector.
2. Choose Prefab overrides; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Prefab overrides is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Prefab overrides is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Prefab overrides on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Prefab overrides, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Prefab overrides.

**Rhai API:** N/A

**Visual Graph API:** N/A


## Assets

<a id="assets-import-assets"></a>

### Import assets

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Import assets in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs import assets; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Import assets; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Import assets is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Import assets is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Import assets on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Import assets, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Import assets.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-create-scripts-and-graphs"></a>

### Create scripts and graphs

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Create scripts and graphs in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs create scripts and graphs; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Create scripts and graphs; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Create scripts and graphs is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Create scripts and graphs is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Create scripts and graphs on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Create scripts and graphs, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Create scripts and graphs.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-folders"></a>

### Folders

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Folders in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs folders; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Folders; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Folders is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Folders is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Folders on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Folders, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Folders.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-grid-and-list-views"></a>

### Grid and list views

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Grid and list views in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs grid and list views; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Grid and list views; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Grid and list views is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Grid and list views is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Grid and list views on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Grid and list views, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Grid and list views.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-search-tags-and-favorites"></a>

### Search, tags and favorites

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Search, tags and favorites in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs search, tags and favorites; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Search, tags and favorites; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Search, tags and favorites is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Search, tags and favorites is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Search, tags and favorites on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Search, tags and favorites, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Search, tags and favorites.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-collections-and-saved-filters"></a>

### Collections and saved filters

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Collections and saved filters in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs collections and saved filters; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Collections and saved filters; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Collections and saved filters is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Collections and saved filters is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Collections and saved filters on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Collections and saved filters, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Collections and saved filters.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-source-provenance"></a>

### Source provenance

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Source provenance in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs source provenance; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Source provenance; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Source provenance is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Source provenance is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Source provenance on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Source provenance, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Source provenance.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-import-presets"></a>

### Import presets

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Import presets in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs import presets; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Import presets; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Import presets is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Import presets is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Import presets on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Import presets, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Import presets.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-platform-overrides"></a>

### Platform overrides

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Platform overrides in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs platform overrides; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Platform overrides; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Platform overrides is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Platform overrides is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Platform overrides on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Platform overrides, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Platform overrides.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-reimport-and-compare"></a>

### Reimport and compare

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Reimport and compare in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs reimport and compare; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Reimport and compare; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Reimport and compare is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Reimport and compare is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Reimport and compare on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Reimport and compare, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Reimport and compare.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-reference-repair"></a>

### Reference repair

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Reference repair in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs reference repair; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Reference repair; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Reference repair is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Reference repair is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Reference repair on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Reference repair, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Reference repair.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-unused-asset-report"></a>

### Unused-asset report

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Unused-asset report in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs unused-asset report; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Unused-asset report; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Unused-asset report is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Unused-asset report is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Unused-asset report on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Unused-asset report, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Unused-asset report.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-sprite-slicing"></a>

### Sprite slicing

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Sprite slicing in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs sprite slicing; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Sprite slicing; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Sprite slicing is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Sprite slicing is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Sprite slicing on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Sprite slicing, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Sprite slicing.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-deterministic-atlases"></a>

### Deterministic atlases

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Deterministic atlases in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs deterministic atlases; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Deterministic atlases; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Deterministic atlases is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Deterministic atlases is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Deterministic atlases on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Deterministic atlases, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Deterministic atlases.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-audio-import"></a>

### Audio import

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Audio import in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs audio import; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Audio import; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Audio import is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Audio import is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Audio import on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Audio import, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Audio import.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-font-shaping-settings"></a>

### Font shaping settings

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Font shaping settings in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs font shaping settings; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Font shaping settings; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Font shaping settings is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Font shaping settings is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Font shaping settings on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Font shaping settings, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Font shaping settings.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-50-000-asset-virtual-window"></a>

### 50,000-asset virtual window

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use 50,000-asset virtual window in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs 50,000-asset virtual window; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose 50,000-asset virtual window; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** 50,000-asset virtual window is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** 50,000-asset virtual window is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing 50,000-asset virtual window on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure 50,000-asset virtual window, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for 50,000-asset virtual window.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="assets-project-trash"></a>

### Project trash

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Project trash in Assets to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs project trash; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project
- Source files for import operations

**Exact workflow:**

1. Open Design, then open Assets.
2. Choose Project trash; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Project trash is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Project trash is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Project trash on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Project trash, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Project trash.

**Rhai API:** N/A

**Visual Graph API:** N/A


## Physics Settings and Monitor

<a id="physics-rigid-bodies"></a>

### Rigid bodies

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Rigid bodies in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs rigid bodies; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Rigid bodies; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Rigid bodies is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Rigid bodies is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Rigid bodies on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Rigid bodies, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Rigid bodies.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-character-bodies"></a>

### Character bodies

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Character bodies in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs character bodies; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Character bodies; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Character bodies is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Character bodies is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Character bodies on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Character bodies, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Character bodies.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-colliders"></a>

### Colliders

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Colliders in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs colliders; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Colliders; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Colliders is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Colliders is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Colliders on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Colliders, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Colliders.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-sensors-and-area2d"></a>

### Sensors and Area2D

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Sensors and Area2D in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs sensors and area2d; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Sensors and Area2D; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Sensors and Area2D is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Sensors and Area2D is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Sensors and Area2D on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Sensors and Area2D, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Sensors and Area2D.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-collision-layers-and-masks"></a>

### Collision layers and masks

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Collision layers and masks in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs collision layers and masks; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Collision layers and masks; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Collision layers and masks is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Collision layers and masks is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Collision layers and masks on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Collision layers and masks, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Collision layers and masks.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-mass-density-and-inertia"></a>

### Mass, density and inertia

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Mass, density and inertia in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs mass, density and inertia; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Mass, density and inertia; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Mass, density and inertia is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Mass, density and inertia is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Mass, density and inertia on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Mass, density and inertia, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Mass, density and inertia.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-forces-and-impulses"></a>

### Forces and impulses

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Forces and impulses in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs forces and impulses; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Forces and impulses; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Forces and impulses is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Forces and impulses is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Forces and impulses on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Forces and impulses, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Forces and impulses.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-friction-and-restitution"></a>

### Friction and restitution

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Friction and restitution in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs friction and restitution; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Friction and restitution; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Friction and restitution is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Friction and restitution is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Friction and restitution on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Friction and restitution, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Friction and restitution.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-damping-and-sleep"></a>

### Damping and sleep

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Damping and sleep in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs damping and sleep; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Damping and sleep; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Damping and sleep is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Damping and sleep is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Damping and sleep on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Damping and sleep, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Damping and sleep.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-continuous-collision"></a>

### Continuous collision

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Continuous collision in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs continuous collision; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Continuous collision; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Continuous collision is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Continuous collision is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Continuous collision on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Continuous collision, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Continuous collision.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-one-way-platforms"></a>

### One-way platforms

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use One-way platforms in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs one-way platforms; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose One-way platforms; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** One-way platforms is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** One-way platforms is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing One-way platforms on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure One-way platforms, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for One-way platforms.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-physics-queries"></a>

### Physics queries

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Physics queries in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs physics queries; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Physics queries; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Physics queries is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Physics queries is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Physics queries on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Physics queries, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Physics queries.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-distance-joint"></a>

### Distance joint

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Distance joint in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs distance joint; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Distance joint; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Distance joint is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Distance joint is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Distance joint on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Distance joint, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Distance joint.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-revolute-joint"></a>

### Revolute joint

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Revolute joint in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs revolute joint; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Revolute joint; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Revolute joint is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Revolute joint is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Revolute joint on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Revolute joint, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Revolute joint.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-prismatic-joint"></a>

### Prismatic joint

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Prismatic joint in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs prismatic joint; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Prismatic joint; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Prismatic joint is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Prismatic joint is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Prismatic joint on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Prismatic joint, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Prismatic joint.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-weld-joint"></a>

### Weld joint

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Weld joint in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs weld joint; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Weld joint; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Weld joint is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Weld joint is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Weld joint on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Weld joint, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Weld joint.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-spring-joint"></a>

### Spring joint

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Spring joint in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs spring joint; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Spring joint; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Spring joint is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Spring joint is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Spring joint on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Spring joint, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Spring joint.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-rope2d"></a>

### Rope2D

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Rope2D in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs rope2d; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Rope2D; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Rope2D is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Rope2D is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Rope2D on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Rope2D, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Rope2D.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-compound-bind-and-separate"></a>

### Compound bind and separate

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Compound bind and separate in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs compound bind and separate; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Compound bind and separate; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Compound bind and separate is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Compound bind and separate is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Compound bind and separate on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Compound bind and separate, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Compound bind and separate.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-collision-timeline"></a>

### Collision timeline

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Collision timeline in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs collision timeline; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Collision timeline; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Collision timeline is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Collision timeline is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Collision timeline on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Collision timeline, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Collision timeline.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-deterministic-replay"></a>

### Deterministic replay

**Classification:** Manual · Runtime · Per-object · Reversible

**Purpose and when to use it:** Use Deterministic replay in Physics Settings and Monitor to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs deterministic replay; keep unrelated settings in their owning workspace.

**Preconditions:**

- Objects with physics components
- Play mode for runtime evidence

**Exact workflow:**

1. Open Design / Debug, then open Physics Settings and Monitor.
2. Choose Deterministic replay; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Deterministic replay is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Deterministic replay is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Deterministic replay on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Deterministic replay, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Deterministic replay.

**Rhai API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual Graph API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`


## Script Studio

<a id="script-rhai-editor"></a>

### Rhai editor

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Rhai editor in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs rhai editor; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose Rhai editor; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Rhai editor is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Rhai editor is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Rhai editor on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Rhai editor, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Rhai editor.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-diagnostics-and-code-actions"></a>

### Diagnostics and code actions

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Diagnostics and code actions in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs diagnostics and code actions; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose Diagnostics and code actions; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Diagnostics and code actions is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Diagnostics and code actions is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Diagnostics and code actions on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Diagnostics and code actions, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Diagnostics and code actions.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-completion-and-api-browser"></a>

### Completion and API browser

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Completion and API browser in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs completion and api browser; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose Completion and API browser; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Completion and API browser is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Completion and API browser is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Completion and API browser on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Completion and API browser, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Completion and API browser.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-definition-and-references"></a>

### Definition and references

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Definition and references in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs definition and references; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose Definition and references; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Definition and references is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Definition and references is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Definition and references on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Definition and references, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Definition and references.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-rename-and-formatting"></a>

### Rename and formatting

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Rename and formatting in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs rename and formatting; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose Rename and formatting; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Rename and formatting is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Rename and formatting is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Rename and formatting on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Rename and formatting, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Rename and formatting.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-lifecycle-callbacks"></a>

### Lifecycle callbacks

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Lifecycle callbacks in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs lifecycle callbacks; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose Lifecycle callbacks; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Lifecycle callbacks is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Lifecycle callbacks is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Lifecycle callbacks on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Lifecycle callbacks, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Lifecycle callbacks.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-exported-inspector-properties"></a>

### Exported Inspector properties

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Exported Inspector properties in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs exported inspector properties; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose Exported Inspector properties; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Exported Inspector properties is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Exported Inspector properties is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Exported Inspector properties on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Exported Inspector properties, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Exported Inspector properties.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-modules"></a>

### Modules

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Modules in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs modules; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose Modules; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Modules is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Modules is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Modules on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Modules, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Modules.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-transactional-hot-reload"></a>

### Transactional hot reload

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Transactional hot reload in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs transactional hot reload; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose Transactional hot reload; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Transactional hot reload is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Transactional hot reload is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Transactional hot reload on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Transactional hot reload, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Transactional hot reload.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-breakpoints-and-logpoints"></a>

### Breakpoints and logpoints

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Breakpoints and logpoints in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs breakpoints and logpoints; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose Breakpoints and logpoints; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Breakpoints and logpoints is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Breakpoints and logpoints is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Breakpoints and logpoints on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Breakpoints and logpoints, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Breakpoints and logpoints.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-step-and-watches"></a>

### Step and watches

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Step and watches in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs step and watches; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose Step and watches; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Step and watches is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Step and watches is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Step and watches on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Step and watches, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Step and watches.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-tasks-and-signals"></a>

### Tasks and signals

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Tasks and signals in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs tasks and signals; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose Tasks and signals; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Tasks and signals is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Tasks and signals is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Tasks and signals on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Tasks and signals, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Tasks and signals.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-project-tests"></a>

### Project tests

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Project tests in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs project tests; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose Project tests; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Project tests is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Project tests is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Project tests on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Project tests, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Project tests.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-coverage"></a>

### Coverage

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Coverage in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs coverage; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose Coverage; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Coverage is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Coverage is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Coverage on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Coverage, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Coverage.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-headless-ci"></a>

### Headless CI

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Headless CI in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs headless ci; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose Headless CI; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Headless CI is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Headless CI is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Headless CI on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Headless CI, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Headless CI.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-external-editor-protocol"></a>

### External editor protocol

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use External editor protocol in Script Studio to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs external editor protocol; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exact workflow:**

1. Open Script, then open Script Studio.
2. Choose External editor protocol; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** External editor protocol is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** External editor protocol is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing External editor protocol on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure External editor protocol, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for External editor protocol.

**Rhai API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual Graph API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`


## Visual Graph Editor

<a id="visual-graph-node-palette"></a>

### Node palette

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use Node palette in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs node palette; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose Node palette; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Node palette is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Node palette is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Node palette on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Node palette, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Node palette.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-typed-pins-and-wires"></a>

### Typed pins and wires

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use Typed pins and wires in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs typed pins and wires; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose Typed pins and wires; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Typed pins and wires is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Typed pins and wires is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Typed pins and wires on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Typed pins and wires, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Typed pins and wires.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-branches-and-bounded-loops"></a>

### Branches and bounded loops

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use Branches and bounded loops in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs branches and bounded loops; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose Branches and bounded loops; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Branches and bounded loops is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Branches and bounded loops is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Branches and bounded loops on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Branches and bounded loops, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Branches and bounded loops.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-functions-and-macros"></a>

### Functions and macros

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use Functions and macros in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs functions and macros; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose Functions and macros; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Functions and macros is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Functions and macros is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Functions and macros on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Functions and macros, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Functions and macros.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-subgraphs-and-interfaces"></a>

### Subgraphs and interfaces

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use Subgraphs and interfaces in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs subgraphs and interfaces; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose Subgraphs and interfaces; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Subgraphs and interfaces is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Subgraphs and interfaces is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Subgraphs and interfaces on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Subgraphs and interfaces, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Subgraphs and interfaces.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-graph-libraries"></a>

### Graph libraries

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use Graph libraries in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs graph libraries; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose Graph libraries; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Graph libraries is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Graph libraries is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Graph libraries on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Graph libraries, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Graph libraries.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-variables-and-exposed-properties"></a>

### Variables and exposed properties

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use Variables and exposed properties in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs variables and exposed properties; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose Variables and exposed properties; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Variables and exposed properties is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Variables and exposed properties is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Variables and exposed properties on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Variables and exposed properties, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Variables and exposed properties.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-breakpoints-and-active-wires"></a>

### Breakpoints and active wires

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use Breakpoints and active wires in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs breakpoints and active wires; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose Breakpoints and active wires; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Breakpoints and active wires is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Breakpoints and active wires is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Breakpoints and active wires on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Breakpoints and active wires, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Breakpoints and active wires.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-watches-and-call-stack"></a>

### Watches and call stack

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use Watches and call stack in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs watches and call stack; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose Watches and call stack; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Watches and call stack is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Watches and call stack is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Watches and call stack on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Watches and call stack, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Watches and call stack.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-per-node-timings-and-coverage"></a>

### Per-node timings and coverage

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use Per-node timings and coverage in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs per-node timings and coverage; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose Per-node timings and coverage; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Per-node timings and coverage is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Per-node timings and coverage is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Per-node timings and coverage on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Per-node timings and coverage, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Per-node timings and coverage.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-graph-to-rhai-view"></a>

### Graph-to-Rhai view

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use Graph-to-Rhai view in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs graph-to-rhai view; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose Graph-to-Rhai view; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Graph-to-Rhai view is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Graph-to-Rhai view is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Graph-to-Rhai view on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Graph-to-Rhai view, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Graph-to-Rhai view.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-refactor-and-find-references"></a>

### Refactor and find references

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use Refactor and find references in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs refactor and find references; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose Refactor and find references; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Refactor and find references is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Refactor and find references is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Refactor and find references on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Refactor and find references, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Refactor and find references.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-semantic-diff-and-merge"></a>

### Semantic diff and merge

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use Semantic diff and merge in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs semantic diff and merge; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose Semantic diff and merge; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Semantic diff and merge is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Semantic diff and merge is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Semantic diff and merge on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Semantic diff and merge, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Semantic diff and merge.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-hot-reload"></a>

### Hot reload

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use Hot reload in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs hot reload; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose Hot reload; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Hot reload is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Hot reload is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Hot reload on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Hot reload, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Hot reload.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-package-graph-nodes"></a>

### Package graph nodes

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use Package graph nodes in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs package graph nodes; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose Package graph nodes; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Package graph nodes is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Package graph nodes is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Package graph nodes on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Package graph nodes, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Package graph nodes.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-1-000-node-authoring-profile"></a>

### 1,000-node authoring profile

**Classification:** Manual · Assisted · Runtime · Reversible

**Purpose and when to use it:** Use 1,000-node authoring profile in Visual Graph Editor to complete its supported authoring or runtime job without leaving the Script workflow. Use it when the project needs 1,000-node authoring profile; keep unrelated settings in their owning workspace.

**Preconditions:**

- A .nova-graph asset

**Exact workflow:**

1. Open Script, then open Visual Graph Editor.
2. Choose 1,000-node authoring profile; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** 1,000-node authoring profile is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** 1,000-node authoring profile is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing 1,000-node authoring profile on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure 1,000-node authoring profile, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for 1,000-node authoring profile.

**Rhai API:** `Generated Rhai API v2 command stream`

**Visual Graph API:** `All Rhai API v2 generated nodes`


## Animation and Timeline

<a id="animation-property-clips"></a>

### Property clips

**Classification:** Manual · Assisted · Runtime · Reversible · Per-object

**Purpose and when to use it:** Use Property clips in Animation and Timeline to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs property clips; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation, controller, rig or timeline assets

**Exact workflow:**

1. Open Animation, then open Animation and Timeline.
2. Choose Property clips; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Property clips is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Property clips is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Property clips on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Property clips, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Property clips.

**Rhai API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-sprite-frames"></a>

### Sprite frames

**Classification:** Manual · Assisted · Runtime · Reversible · Per-object

**Purpose and when to use it:** Use Sprite frames in Animation and Timeline to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs sprite frames; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation, controller, rig or timeline assets

**Exact workflow:**

1. Open Animation, then open Animation and Timeline.
2. Choose Sprite frames; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Sprite frames is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Sprite frames is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Sprite frames on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Sprite frames, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Sprite frames.

**Rhai API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-events-and-method-tracks"></a>

### Events and method tracks

**Classification:** Manual · Assisted · Runtime · Reversible · Per-object

**Purpose and when to use it:** Use Events and method tracks in Animation and Timeline to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs events and method tracks; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation, controller, rig or timeline assets

**Exact workflow:**

1. Open Animation, then open Animation and Timeline.
2. Choose Events and method tracks; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Events and method tracks is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Events and method tracks is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Events and method tracks on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Events and method tracks, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Events and method tracks.

**Rhai API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-audio-and-nested-clips"></a>

### Audio and nested clips

**Classification:** Manual · Assisted · Runtime · Reversible · Per-object

**Purpose and when to use it:** Use Audio and nested clips in Animation and Timeline to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs audio and nested clips; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation, controller, rig or timeline assets

**Exact workflow:**

1. Open Animation, then open Animation and Timeline.
2. Choose Audio and nested clips; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Audio and nested clips is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Audio and nested clips is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Audio and nested clips on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Audio and nested clips, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Audio and nested clips.

**Rhai API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-state-machines"></a>

### State machines

**Classification:** Manual · Assisted · Runtime · Reversible · Per-object

**Purpose and when to use it:** Use State machines in Animation and Timeline to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs state machines; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation, controller, rig or timeline assets

**Exact workflow:**

1. Open Animation, then open Animation and Timeline.
2. Choose State machines; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** State machines is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** State machines is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing State machines on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure State machines, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for State machines.

**Rhai API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-parameters-and-transitions"></a>

### Parameters and transitions

**Classification:** Manual · Assisted · Runtime · Reversible · Per-object

**Purpose and when to use it:** Use Parameters and transitions in Animation and Timeline to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs parameters and transitions; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation, controller, rig or timeline assets

**Exact workflow:**

1. Open Animation, then open Animation and Timeline.
2. Choose Parameters and transitions; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Parameters and transitions is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Parameters and transitions is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Parameters and transitions on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Parameters and transitions, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Parameters and transitions.

**Rhai API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-blend-trees"></a>

### Blend trees

**Classification:** Manual · Assisted · Runtime · Reversible · Per-object

**Purpose and when to use it:** Use Blend trees in Animation and Timeline to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs blend trees; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation, controller, rig or timeline assets

**Exact workflow:**

1. Open Animation, then open Animation and Timeline.
2. Choose Blend trees; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Blend trees is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Blend trees is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Blend trees on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Blend trees, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Blend trees.

**Rhai API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-layers-and-masks"></a>

### Layers and masks

**Classification:** Manual · Assisted · Runtime · Reversible · Per-object

**Purpose and when to use it:** Use Layers and masks in Animation and Timeline to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs layers and masks; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation, controller, rig or timeline assets

**Exact workflow:**

1. Open Animation, then open Animation and Timeline.
2. Choose Layers and masks; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Layers and masks is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Layers and masks is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Layers and masks on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Layers and masks, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Layers and masks.

**Rhai API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-2d-rigs-and-skinning"></a>

### 2D rigs and skinning

**Classification:** Manual · Assisted · Runtime · Reversible · Per-object

**Purpose and when to use it:** Use 2D rigs and skinning in Animation and Timeline to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs 2d rigs and skinning; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation, controller, rig or timeline assets

**Exact workflow:**

1. Open Animation, then open Animation and Timeline.
2. Choose 2D rigs and skinning; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** 2D rigs and skinning is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** 2D rigs and skinning is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing 2D rigs and skinning on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure 2D rigs and skinning, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for 2D rigs and skinning.

**Rhai API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-retarget-aliases"></a>

### Retarget aliases

**Classification:** Manual · Assisted · Runtime · Reversible · Per-object

**Purpose and when to use it:** Use Retarget aliases in Animation and Timeline to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs retarget aliases; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation, controller, rig or timeline assets

**Exact workflow:**

1. Open Animation, then open Animation and Timeline.
2. Choose Retarget aliases; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Retarget aliases is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Retarget aliases is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Retarget aliases on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Retarget aliases, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Retarget aliases.

**Rhai API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-runtime-recording"></a>

### Runtime recording

**Classification:** Manual · Assisted · Runtime · Reversible · Per-object

**Purpose and when to use it:** Use Runtime recording in Animation and Timeline to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs runtime recording; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation, controller, rig or timeline assets

**Exact workflow:**

1. Open Animation, then open Animation and Timeline.
2. Choose Runtime recording; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Runtime recording is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Runtime recording is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Runtime recording on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Runtime recording, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Runtime recording.

**Rhai API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-timeline-cameras"></a>

### Timeline cameras

**Classification:** Manual · Assisted · Runtime · Reversible · Per-object

**Purpose and when to use it:** Use Timeline cameras in Animation and Timeline to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs timeline cameras; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation, controller, rig or timeline assets

**Exact workflow:**

1. Open Animation, then open Animation and Timeline.
2. Choose Timeline cameras; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Timeline cameras is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Timeline cameras is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Timeline cameras on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Timeline cameras, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Timeline cameras.

**Rhai API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-subtitles"></a>

### Subtitles

**Classification:** Manual · Assisted · Runtime · Reversible · Per-object

**Purpose and when to use it:** Use Subtitles in Animation and Timeline to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs subtitles; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation, controller, rig or timeline assets

**Exact workflow:**

1. Open Animation, then open Animation and Timeline.
2. Choose Subtitles; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Subtitles is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Subtitles is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Subtitles on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Subtitles, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Subtitles.

**Rhai API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-branches-and-markers"></a>

### Branches and markers

**Classification:** Manual · Assisted · Runtime · Reversible · Per-object

**Purpose and when to use it:** Use Branches and markers in Animation and Timeline to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs branches and markers; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation, controller, rig or timeline assets

**Exact workflow:**

1. Open Animation, then open Animation and Timeline.
2. Choose Branches and markers; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Branches and markers is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Branches and markers is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Branches and markers on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Branches and markers, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Branches and markers.

**Rhai API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-cinematic-skip-and-resume"></a>

### Cinematic skip and resume

**Classification:** Manual · Assisted · Runtime · Reversible · Per-object

**Purpose and when to use it:** Use Cinematic skip and resume in Animation and Timeline to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs cinematic skip and resume; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation, controller, rig or timeline assets

**Exact workflow:**

1. Open Animation, then open Animation and Timeline.
2. Choose Cinematic skip and resume; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Cinematic skip and resume is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Cinematic skip and resume is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Cinematic skip and resume on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Cinematic skip and resume, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Cinematic skip and resume.

**Rhai API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`


## Interface Studio

<a id="interface-canvas-and-recttransform"></a>

### Canvas and RectTransform

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Canvas and RectTransform in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs canvas and recttransform; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Canvas and RectTransform; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Canvas and RectTransform is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Canvas and RectTransform is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Canvas and RectTransform on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Canvas and RectTransform, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Canvas and RectTransform.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-panels-images-and-text"></a>

### Panels, images and text

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Panels, images and text in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs panels, images and text; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Panels, images and text; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Panels, images and text is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Panels, images and text is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Panels, images and text on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Panels, images and text, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Panels, images and text.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-buttons-and-inputs"></a>

### Buttons and inputs

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Buttons and inputs in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs buttons and inputs; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Buttons and inputs; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Buttons and inputs is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Buttons and inputs is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Buttons and inputs on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Buttons and inputs, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Buttons and inputs.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-checkbox-slider-and-progress"></a>

### Checkbox, slider and progress

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Checkbox, slider and progress in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs checkbox, slider and progress; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Checkbox, slider and progress; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Checkbox, slider and progress is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Checkbox, slider and progress is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Checkbox, slider and progress on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Checkbox, slider and progress, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Checkbox, slider and progress.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-anchors-and-constraints"></a>

### Anchors and constraints

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Anchors and constraints in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs anchors and constraints; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Anchors and constraints; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Anchors and constraints is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Anchors and constraints is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Anchors and constraints on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Anchors and constraints, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Anchors and constraints.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-layout-containers"></a>

### Layout containers

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Layout containers in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs layout containers; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Layout containers; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Layout containers is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Layout containers is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Layout containers on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Layout containers, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Layout containers.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-clipping-and-scrolling"></a>

### Clipping and scrolling

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Clipping and scrolling in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs clipping and scrolling; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Clipping and scrolling; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Clipping and scrolling is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Clipping and scrolling is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Clipping and scrolling on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Clipping and scrolling, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Clipping and scrolling.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-themes-and-variants"></a>

### Themes and variants

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Themes and variants in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs themes and variants; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Themes and variants; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Themes and variants is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Themes and variants is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Themes and variants on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Themes and variants, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Themes and variants.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-reusable-ui-components"></a>

### Reusable UI components

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Reusable UI components in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs reusable ui components; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Reusable UI components; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Reusable UI components is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Reusable UI components is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Reusable UI components on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Reusable UI components, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Reusable UI components.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-localization-tables"></a>

### Localization tables

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Localization tables in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs localization tables; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Localization tables; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Localization tables is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Localization tables is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Localization tables on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Localization tables, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Localization tables.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-fallback-and-pseudolocales"></a>

### Fallback and pseudolocales

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Fallback and pseudolocales in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs fallback and pseudolocales; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Fallback and pseudolocales; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Fallback and pseudolocales is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Fallback and pseudolocales is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Fallback and pseudolocales on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Fallback and pseudolocales, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Fallback and pseudolocales.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-rtl-and-bidirectional-text"></a>

### RTL and bidirectional text

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use RTL and bidirectional text in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs rtl and bidirectional text; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose RTL and bidirectional text; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** RTL and bidirectional text is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** RTL and bidirectional text is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing RTL and bidirectional text on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure RTL and bidirectional text, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for RTL and bidirectional text.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-number-date-currency-formatting"></a>

### Number/date/currency formatting

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Number/date/currency formatting in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs number/date/currency formatting; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Number/date/currency formatting; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Number/date/currency formatting is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Number/date/currency formatting is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Number/date/currency formatting on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Number/date/currency formatting, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Number/date/currency formatting.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-focus-navigation"></a>

### Focus navigation

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Focus navigation in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs focus navigation; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Focus navigation; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Focus navigation is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Focus navigation is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Focus navigation on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Focus navigation, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Focus navigation.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-screen-reader-metadata"></a>

### Screen-reader metadata

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Screen-reader metadata in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs screen-reader metadata; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Screen-reader metadata; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Screen-reader metadata is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Screen-reader metadata is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Screen-reader metadata on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Screen-reader metadata, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Screen-reader metadata.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-contrast-and-target-size-audit"></a>

### Contrast and target-size audit

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Contrast and target-size audit in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs contrast and target-size audit; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Contrast and target-size audit; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Contrast and target-size audit is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Contrast and target-size audit is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Contrast and target-size audit on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Contrast and target-size audit, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Contrast and target-size audit.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-reduced-motion"></a>

### Reduced motion

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Reduced motion in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs reduced motion; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Reduced motion; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Reduced motion is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Reduced motion is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Reduced motion on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Reduced motion, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Reduced motion.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-input-prompts-and-captions"></a>

### Input prompts and captions

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Input prompts and captions in Interface Studio to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs input prompts and captions; keep unrelated settings in their owning workspace.

**Preconditions:**

- A Canvas UI object or UI Showcase template

**Exact workflow:**

1. Open Interface, then open Interface Studio.
2. Choose Input prompts and captions; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Input prompts and captions is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Input prompts and captions is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Input prompts and captions on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Input prompts and captions, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Input prompts and captions.

**Rhai API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual Graph API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`


## Audio Studio

<a id="audio-audio-clips-and-sources"></a>

### Audio clips and sources

**Classification:** Manual · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Audio clips and sources in Audio Studio to complete its supported authoring or runtime job without leaving the Animation / Debug workflow. Use it when the project needs audio clips and sources; keep unrelated settings in their owning workspace.

**Preconditions:**

- An imported audio asset

**Exact workflow:**

1. Open Animation / Debug, then open Audio Studio.
2. Choose Audio clips and sources; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Audio clips and sources is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Audio clips and sources is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Audio clips and sources on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Audio clips and sources, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Audio clips and sources.

**Rhai API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual Graph API:** `Audio/Play`, `Audio/Stop`

<a id="audio-waveform-regions"></a>

### Waveform regions

**Classification:** Manual · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Waveform regions in Audio Studio to complete its supported authoring or runtime job without leaving the Animation / Debug workflow. Use it when the project needs waveform regions; keep unrelated settings in their owning workspace.

**Preconditions:**

- An imported audio asset

**Exact workflow:**

1. Open Animation / Debug, then open Audio Studio.
2. Choose Waveform regions; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Waveform regions is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Waveform regions is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Waveform regions on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Waveform regions, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Waveform regions.

**Rhai API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual Graph API:** `Audio/Play`, `Audio/Stop`

<a id="audio-loop-and-seek"></a>

### Loop and seek

**Classification:** Manual · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Loop and seek in Audio Studio to complete its supported authoring or runtime job without leaving the Animation / Debug workflow. Use it when the project needs loop and seek; keep unrelated settings in their owning workspace.

**Preconditions:**

- An imported audio asset

**Exact workflow:**

1. Open Animation / Debug, then open Audio Studio.
2. Choose Loop and seek; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Loop and seek is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Loop and seek is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Loop and seek on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Loop and seek, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Loop and seek.

**Rhai API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual Graph API:** `Audio/Play`, `Audio/Stop`

<a id="audio-bus-routing"></a>

### Bus routing

**Classification:** Manual · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Bus routing in Audio Studio to complete its supported authoring or runtime job without leaving the Animation / Debug workflow. Use it when the project needs bus routing; keep unrelated settings in their owning workspace.

**Preconditions:**

- An imported audio asset

**Exact workflow:**

1. Open Animation / Debug, then open Audio Studio.
2. Choose Bus routing; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Bus routing is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Bus routing is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Bus routing on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Bus routing, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Bus routing.

**Rhai API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual Graph API:** `Audio/Play`, `Audio/Stop`

<a id="audio-mixer-effects-and-limiter"></a>

### Mixer effects and limiter

**Classification:** Manual · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Mixer effects and limiter in Audio Studio to complete its supported authoring or runtime job without leaving the Animation / Debug workflow. Use it when the project needs mixer effects and limiter; keep unrelated settings in their owning workspace.

**Preconditions:**

- An imported audio asset

**Exact workflow:**

1. Open Animation / Debug, then open Audio Studio.
2. Choose Mixer effects and limiter; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Mixer effects and limiter is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Mixer effects and limiter is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Mixer effects and limiter on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Mixer effects and limiter, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Mixer effects and limiter.

**Rhai API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual Graph API:** `Audio/Play`, `Audio/Stop`

<a id="audio-sends-and-snapshots"></a>

### Sends and snapshots

**Classification:** Manual · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Sends and snapshots in Audio Studio to complete its supported authoring or runtime job without leaving the Animation / Debug workflow. Use it when the project needs sends and snapshots; keep unrelated settings in their owning workspace.

**Preconditions:**

- An imported audio asset

**Exact workflow:**

1. Open Animation / Debug, then open Audio Studio.
2. Choose Sends and snapshots; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Sends and snapshots is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Sends and snapshots is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Sends and snapshots on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Sends and snapshots, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Sends and snapshots.

**Rhai API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual Graph API:** `Audio/Play`, `Audio/Stop`

<a id="audio-automation-and-fades"></a>

### Automation and fades

**Classification:** Manual · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Automation and fades in Audio Studio to complete its supported authoring or runtime job without leaving the Animation / Debug workflow. Use it when the project needs automation and fades; keep unrelated settings in their owning workspace.

**Preconditions:**

- An imported audio asset

**Exact workflow:**

1. Open Animation / Debug, then open Audio Studio.
2. Choose Automation and fades; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Automation and fades is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Automation and fades is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Automation and fades on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Automation and fades, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Automation and fades.

**Rhai API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual Graph API:** `Audio/Play`, `Audio/Stop`

<a id="audio-spatial-audio"></a>

### Spatial audio

**Classification:** Manual · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Spatial audio in Audio Studio to complete its supported authoring or runtime job without leaving the Animation / Debug workflow. Use it when the project needs spatial audio; keep unrelated settings in their owning workspace.

**Preconditions:**

- An imported audio asset

**Exact workflow:**

1. Open Animation / Debug, then open Audio Studio.
2. Choose Spatial audio; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Spatial audio is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Spatial audio is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Spatial audio on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Spatial audio, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Spatial audio.

**Rhai API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual Graph API:** `Audio/Play`, `Audio/Stop`

<a id="audio-playlists"></a>

### Playlists

**Classification:** Manual · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Playlists in Audio Studio to complete its supported authoring or runtime job without leaving the Animation / Debug workflow. Use it when the project needs playlists; keep unrelated settings in their owning workspace.

**Preconditions:**

- An imported audio asset

**Exact workflow:**

1. Open Animation / Debug, then open Audio Studio.
2. Choose Playlists; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Playlists is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Playlists is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Playlists on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Playlists, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Playlists.

**Rhai API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual Graph API:** `Audio/Play`, `Audio/Stop`

<a id="audio-preload-and-streaming"></a>

### Preload and streaming

**Classification:** Manual · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Preload and streaming in Audio Studio to complete its supported authoring or runtime job without leaving the Animation / Debug workflow. Use it when the project needs preload and streaming; keep unrelated settings in their owning workspace.

**Preconditions:**

- An imported audio asset

**Exact workflow:**

1. Open Animation / Debug, then open Audio Studio.
2. Choose Preload and streaming; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Preload and streaming is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Preload and streaming is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Preload and streaming on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Preload and streaming, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Preload and streaming.

**Rhai API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual Graph API:** `Audio/Play`, `Audio/Stop`

<a id="audio-voice-budgets"></a>

### Voice budgets

**Classification:** Manual · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Voice budgets in Audio Studio to complete its supported authoring or runtime job without leaving the Animation / Debug workflow. Use it when the project needs voice budgets; keep unrelated settings in their owning workspace.

**Preconditions:**

- An imported audio asset

**Exact workflow:**

1. Open Animation / Debug, then open Audio Studio.
2. Choose Voice budgets; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Voice budgets is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Voice budgets is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Voice budgets on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Voice budgets, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Voice budgets.

**Rhai API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual Graph API:** `Audio/Play`, `Audio/Stop`

<a id="audio-device-recovery"></a>

### Device recovery

**Classification:** Manual · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Device recovery in Audio Studio to complete its supported authoring or runtime job without leaving the Animation / Debug workflow. Use it when the project needs device recovery; keep unrelated settings in their owning workspace.

**Preconditions:**

- An imported audio asset

**Exact workflow:**

1. Open Animation / Debug, then open Audio Studio.
2. Choose Device recovery; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Device recovery is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Device recovery is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Device recovery on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Device recovery, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Device recovery.

**Rhai API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual Graph API:** `Audio/Play`, `Audio/Stop`


## TileMap and World Studio

<a id="world-tile-palettes-and-paint-tools"></a>

### Tile palettes and paint tools

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Tile palettes and paint tools in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs tile palettes and paint tools; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose Tile palettes and paint tools; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Tile palettes and paint tools is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Tile palettes and paint tools is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Tile palettes and paint tools on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Tile palettes and paint tools, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Tile palettes and paint tools.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-terrain-rules"></a>

### Terrain rules

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Terrain rules in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs terrain rules; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose Terrain rules; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Terrain rules is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Terrain rules is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Terrain rules on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Terrain rules, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Terrain rules.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-animated-tiles"></a>

### Animated tiles

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Animated tiles in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs animated tiles; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose Animated tiles; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Animated tiles is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Animated tiles is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Animated tiles on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Animated tiles, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Animated tiles.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-tile-collision-and-occlusion"></a>

### Tile collision and occlusion

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Tile collision and occlusion in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs tile collision and occlusion; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose Tile collision and occlusion; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Tile collision and occlusion is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Tile collision and occlusion is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Tile collision and occlusion on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Tile collision and occlusion, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Tile collision and occlusion.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-navigation-regions"></a>

### Navigation regions

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Navigation regions in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs navigation regions; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose Navigation regions; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Navigation regions is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Navigation regions is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Navigation regions on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Navigation regions, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Navigation regions.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-navigation-agents-and-obstacles"></a>

### Navigation agents and obstacles

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Navigation agents and obstacles in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs navigation agents and obstacles; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose Navigation agents and obstacles; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Navigation agents and obstacles is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Navigation agents and obstacles is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Navigation agents and obstacles on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Navigation agents and obstacles, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Navigation agents and obstacles.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-links-and-cost-areas"></a>

### Links and cost areas

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Links and cost areas in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs links and cost areas; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose Links and cost areas; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Links and cost areas is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Links and cost areas is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Links and cost areas on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Links and cost areas, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Links and cost areas.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-path-following"></a>

### Path following

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Path following in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs path following; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose Path following; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Path following is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Path following is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Path following on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Path following, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Path following.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-behavior-trees"></a>

### Behavior trees

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Behavior trees in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs behavior trees; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose Behavior trees; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Behavior trees is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Behavior trees is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Behavior trees on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Behavior trees, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Behavior trees.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-state-machines"></a>

### State machines

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use State machines in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs state machines; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose State machines; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** State machines is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** State machines is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing State machines on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure State machines, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for State machines.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-perception-and-utility-ai"></a>

### Perception and utility AI

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Perception and utility AI in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs perception and utility ai; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose Perception and utility AI; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Perception and utility AI is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Perception and utility AI is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Perception and utility AI on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Perception and utility AI, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Perception and utility AI.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-world-chunks"></a>

### World chunks

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use World chunks in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs world chunks; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose World chunks; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** World chunks is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** World chunks is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing World chunks on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure World chunks, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for World chunks.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-streaming-dependencies"></a>

### Streaming dependencies

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Streaming dependencies in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs streaming dependencies; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose Streaming dependencies; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Streaming dependencies is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Streaming dependencies is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Streaming dependencies on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Streaming dependencies, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Streaming dependencies.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-origin-shifting"></a>

### Origin shifting

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Origin shifting in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs origin shifting; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose Origin shifting; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Origin shifting is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Origin shifting is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Origin shifting on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Origin shifting, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Origin shifting.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-object-pooling"></a>

### Object pooling

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Object pooling in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs object pooling; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose Object pooling; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Object pooling is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Object pooling is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Object pooling on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Object pooling, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Object pooling.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-background-baking"></a>

### Background baking

**Classification:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Purpose and when to use it:** Use Background baking in TileMap and World Studio to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs background baking; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet, navigation, AI or world assets as applicable

**Exact workflow:**

1. Open Design, then open TileMap and World Studio.
2. Choose Background baking; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Background baking is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Background baking is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Background baking on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Background baking, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Background baking.

**Rhai API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`


## Rendering Studio

<a id="rendering-canvas2d-and-webgl2-selection"></a>

### Canvas2D and WebGL2 selection

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Canvas2D and WebGL2 selection in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs canvas2d and webgl2 selection; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Canvas2D and WebGL2 selection; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Canvas2D and WebGL2 selection is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Canvas2D and WebGL2 selection is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Canvas2D and WebGL2 selection on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Canvas2D and WebGL2 selection, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Canvas2D and WebGL2 selection.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`

<a id="rendering-material-graph"></a>

### Material graph

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Material graph in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs material graph; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Material graph; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Material graph is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Material graph is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Material graph on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Material graph, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Material graph.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`

<a id="rendering-layered-2d-effects"></a>

### Layered 2D effects

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Layered 2D effects in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs layered 2d effects; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Layered 2D effects; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Layered 2D effects is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Layered 2D effects is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Layered 2D effects on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Layered 2D effects, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Layered 2D effects.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`

<a id="rendering-lights-and-shadows"></a>

### Lights and shadows

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Lights and shadows in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs lights and shadows; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Lights and shadows; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Lights and shadows is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Lights and shadows is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Lights and shadows on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Lights and shadows, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Lights and shadows.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`

<a id="rendering-render-graph-and-textures"></a>

### Render graph and textures

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Render graph and textures in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs render graph and textures; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Render graph and textures; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Render graph and textures is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Render graph and textures is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Render graph and textures on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Render graph and textures, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Render graph and textures.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`

<a id="rendering-post-process-presets"></a>

### Post-process presets

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Post-process presets in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs post-process presets; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Post-process presets; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Post-process presets is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Post-process presets is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Post-process presets on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Post-process presets, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Post-process presets.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`

<a id="rendering-camera-volumes"></a>

### Camera volumes

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Camera volumes in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs camera volumes; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Camera volumes; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Camera volumes is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Camera volumes is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Camera volumes on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Camera volumes, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Camera volumes.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`

<a id="rendering-particles-and-trails"></a>

### Particles and trails

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Particles and trails in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs particles and trails; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Particles and trails; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Particles and trails is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Particles and trails is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Particles and trails on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Particles and trails, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Particles and trails.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`

<a id="rendering-shader-validation-and-fallback"></a>

### Shader validation and fallback

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Shader validation and fallback in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs shader validation and fallback; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Shader validation and fallback; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Shader validation and fallback is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Shader validation and fallback is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Shader validation and fallback on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Shader validation and fallback, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Shader validation and fallback.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`

<a id="rendering-color-space"></a>

### Color space

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Color space in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs color space; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Color space; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Color space is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Color space is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Color space on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Color space, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Color space.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`

<a id="rendering-batching-and-instancing"></a>

### Batching and instancing

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Batching and instancing in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs batching and instancing; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Batching and instancing; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Batching and instancing is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Batching and instancing is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Batching and instancing on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Batching and instancing, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Batching and instancing.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`

<a id="rendering-culling"></a>

### Culling

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Culling in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs culling; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Culling; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Culling is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Culling is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Culling on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Culling, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Culling.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`

<a id="rendering-overdraw-diagnostics"></a>

### Overdraw diagnostics

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Overdraw diagnostics in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs overdraw diagnostics; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Overdraw diagnostics; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Overdraw diagnostics is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Overdraw diagnostics is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Overdraw diagnostics on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Overdraw diagnostics, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Overdraw diagnostics.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`

<a id="rendering-atlas-recommendations"></a>

### Atlas recommendations

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Atlas recommendations in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs atlas recommendations; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Atlas recommendations; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Atlas recommendations is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Atlas recommendations is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Atlas recommendations on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Atlas recommendations, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Atlas recommendations.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`

<a id="rendering-quality-profiles"></a>

### Quality profiles

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Quality profiles in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs quality profiles; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Quality profiles; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Quality profiles is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Quality profiles is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Quality profiles on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Quality profiles, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Quality profiles.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`

<a id="rendering-pixel-perfect-and-high-dpi-rendering"></a>

### Pixel-perfect and high-DPI rendering

**Classification:** Manual · Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Pixel-perfect and high-DPI rendering in Rendering Studio to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs pixel-perfect and high-dpi rendering; keep unrelated settings in their owning workspace.

**Preconditions:**

- Renderer-compatible scene content

**Exact workflow:**

1. Open Manage, then open Rendering Studio.
2. Choose Pixel-perfect and high-DPI rendering; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Pixel-perfect and high-DPI rendering is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Pixel-perfect and high-DPI rendering is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Pixel-perfect and high-DPI rendering on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Pixel-perfect and high-DPI rendering, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Pixel-perfect and high-DPI rendering.

**Rhai API:** N/A

**Visual Graph API:** `Material and particle graph node catalogs`


## Debug, Console and Profiler

<a id="debug-play-pause-and-step"></a>

### Play, pause and step

**Classification:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Purpose and when to use it:** Use Play, pause and step in Debug, Console and Profiler to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs play, pause and step; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene
- Representative runtime input for profiling

**Exact workflow:**

1. Open Debug, then open Debug, Console and Profiler.
2. Choose Play, pause and step; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Play, pause and step is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Play, pause and step is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Play, pause and step on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Play, pause and step, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Play, pause and step.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="debug-runtime-inspector"></a>

### Runtime Inspector

**Classification:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Purpose and when to use it:** Use Runtime Inspector in Debug, Console and Profiler to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs runtime inspector; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene
- Representative runtime input for profiling

**Exact workflow:**

1. Open Debug, then open Debug, Console and Profiler.
2. Choose Runtime Inspector; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Runtime Inspector is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Runtime Inspector is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Runtime Inspector on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Runtime Inspector, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Runtime Inspector.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="debug-console-filters"></a>

### Console filters

**Classification:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Purpose and when to use it:** Use Console filters in Debug, Console and Profiler to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs console filters; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene
- Representative runtime input for profiling

**Exact workflow:**

1. Open Debug, then open Debug, Console and Profiler.
2. Choose Console filters; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Console filters is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Console filters is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Console filters on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Console filters, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Console filters.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="debug-fault-center"></a>

### Fault Center

**Classification:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Purpose and when to use it:** Use Fault Center in Debug, Console and Profiler to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs fault center; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene
- Representative runtime input for profiling

**Exact workflow:**

1. Open Debug, then open Debug, Console and Profiler.
2. Choose Fault Center; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Fault Center is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Fault Center is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Fault Center on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Fault Center, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Fault Center.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="debug-crash-reporter"></a>

### Crash reporter

**Classification:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Purpose and when to use it:** Use Crash reporter in Debug, Console and Profiler to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs crash reporter; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene
- Representative runtime input for profiling

**Exact workflow:**

1. Open Debug, then open Debug, Console and Profiler.
2. Choose Crash reporter; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Crash reporter is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Crash reporter is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Crash reporter on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Crash reporter, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Crash reporter.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="debug-safe-mode"></a>

### Safe Mode

**Classification:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Purpose and when to use it:** Use Safe Mode in Debug, Console and Profiler to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs safe mode; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene
- Representative runtime input for profiling

**Exact workflow:**

1. Open Debug, then open Debug, Console and Profiler.
2. Choose Safe Mode; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Safe Mode is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Safe Mode is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Safe Mode on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Safe Mode, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Safe Mode.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="debug-cpu-and-frame-profiler"></a>

### CPU and frame profiler

**Classification:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Purpose and when to use it:** Use CPU and frame profiler in Debug, Console and Profiler to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs cpu and frame profiler; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene
- Representative runtime input for profiling

**Exact workflow:**

1. Open Debug, then open Debug, Console and Profiler.
2. Choose CPU and frame profiler; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** CPU and frame profiler is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** CPU and frame profiler is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing CPU and frame profiler on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure CPU and frame profiler, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for CPU and frame profiler.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="debug-render-physics-audio-and-script-timing"></a>

### Render, physics, audio and script timing

**Classification:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Purpose and when to use it:** Use Render, physics, audio and script timing in Debug, Console and Profiler to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs render, physics, audio and script timing; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene
- Representative runtime input for profiling

**Exact workflow:**

1. Open Debug, then open Debug, Console and Profiler.
2. Choose Render, physics, audio and script timing; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Render, physics, audio and script timing is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Render, physics, audio and script timing is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Render, physics, audio and script timing on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Render, physics, audio and script timing, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Render, physics, audio and script timing.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="debug-memory-and-lifetime-tracking"></a>

### Memory and lifetime tracking

**Classification:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Purpose and when to use it:** Use Memory and lifetime tracking in Debug, Console and Profiler to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs memory and lifetime tracking; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene
- Representative runtime input for profiling

**Exact workflow:**

1. Open Debug, then open Debug, Console and Profiler.
2. Choose Memory and lifetime tracking; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Memory and lifetime tracking is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Memory and lifetime tracking is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Memory and lifetime tracking on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Memory and lifetime tracking, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Memory and lifetime tracking.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="debug-trace-captures"></a>

### Trace captures

**Classification:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Purpose and when to use it:** Use Trace captures in Debug, Console and Profiler to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs trace captures; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene
- Representative runtime input for profiling

**Exact workflow:**

1. Open Debug, then open Debug, Console and Profiler.
2. Choose Trace captures; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Trace captures is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Trace captures is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Trace captures on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Trace captures, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Trace captures.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="debug-performance-comparisons"></a>

### Performance comparisons

**Classification:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Purpose and when to use it:** Use Performance comparisons in Debug, Console and Profiler to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs performance comparisons; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene
- Representative runtime input for profiling

**Exact workflow:**

1. Open Debug, then open Debug, Console and Profiler.
2. Choose Performance comparisons; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Performance comparisons is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Performance comparisons is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Performance comparisons on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Performance comparisons, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Performance comparisons.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="debug-project-tests"></a>

### Project tests

**Classification:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Purpose and when to use it:** Use Project tests in Debug, Console and Profiler to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs project tests; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene
- Representative runtime input for profiling

**Exact workflow:**

1. Open Debug, then open Debug, Console and Profiler.
2. Choose Project tests; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Project tests is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Project tests is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Project tests on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Project tests, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Project tests.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="debug-replay-and-checksums"></a>

### Replay and checksums

**Classification:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Purpose and when to use it:** Use Replay and checksums in Debug, Console and Profiler to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs replay and checksums; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene
- Representative runtime input for profiling

**Exact workflow:**

1. Open Debug, then open Debug, Console and Profiler.
2. Choose Replay and checksums; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Replay and checksums is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Replay and checksums is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Replay and checksums on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Replay and checksums, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Replay and checksums.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="debug-screenshot-and-headless-assertions"></a>

### Screenshot and headless assertions

**Classification:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Purpose and when to use it:** Use Screenshot and headless assertions in Debug, Console and Profiler to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs screenshot and headless assertions; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene
- Representative runtime input for profiling

**Exact workflow:**

1. Open Debug, then open Debug, Console and Profiler.
2. Choose Screenshot and headless assertions; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Screenshot and headless assertions is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Screenshot and headless assertions is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Screenshot and headless assertions on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Screenshot and headless assertions, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Screenshot and headless assertions.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="debug-physics-monitor"></a>

### Physics Monitor

**Classification:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Purpose and when to use it:** Use Physics Monitor in Debug, Console and Profiler to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs physics monitor; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene
- Representative runtime input for profiling

**Exact workflow:**

1. Open Debug, then open Debug, Console and Profiler.
2. Choose Physics Monitor; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Physics Monitor is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Physics Monitor is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Physics Monitor on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Physics Monitor, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Physics Monitor.

**Rhai API:** N/A

**Visual Graph API:** N/A


## Settings and Project Health

<a id="manage-theme-and-language"></a>

### Theme and language

**Classification:** Manual · Assisted · Automatic · Project-wide · Reversible

**Purpose and when to use it:** Use Theme and language in Settings and Project Health to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs theme and language; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open Manage, then open Settings and Project Health.
2. Choose Theme and language; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Theme and language is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Theme and language is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Theme and language on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Theme and language, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Theme and language.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="manage-ui-scale-and-density"></a>

### UI scale and density

**Classification:** Manual · Assisted · Automatic · Project-wide · Reversible

**Purpose and when to use it:** Use UI scale and density in Settings and Project Health to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs ui scale and density; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open Manage, then open Settings and Project Health.
2. Choose UI scale and density; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** UI scale and density is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** UI scale and density is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing UI scale and density on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure UI scale and density, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for UI scale and density.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="manage-high-contrast-and-reduced-motion"></a>

### High contrast and reduced motion

**Classification:** Manual · Assisted · Automatic · Project-wide · Reversible

**Purpose and when to use it:** Use High contrast and reduced motion in Settings and Project Health to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs high contrast and reduced motion; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open Manage, then open Settings and Project Health.
2. Choose High contrast and reduced motion; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** High contrast and reduced motion is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** High contrast and reduced motion is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing High contrast and reduced motion on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure High contrast and reduced motion, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for High contrast and reduced motion.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="manage-autosave-and-confirmation-policy"></a>

### Autosave and confirmation policy

**Classification:** Manual · Assisted · Automatic · Project-wide · Reversible

**Purpose and when to use it:** Use Autosave and confirmation policy in Settings and Project Health to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs autosave and confirmation policy; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open Manage, then open Settings and Project Health.
2. Choose Autosave and confirmation policy; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Autosave and confirmation policy is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Autosave and confirmation policy is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Autosave and confirmation policy on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Autosave and confirmation policy, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Autosave and confirmation policy.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="manage-input-map"></a>

### Input Map

**Classification:** Manual · Assisted · Automatic · Project-wide · Reversible

**Purpose and when to use it:** Use Input Map in Settings and Project Health to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs input map; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open Manage, then open Settings and Project Health.
2. Choose Input Map; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Input Map is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Input Map is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Input Map on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Input Map, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Input Map.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="manage-physics-settings"></a>

### Physics settings

**Classification:** Manual · Assisted · Automatic · Project-wide · Reversible

**Purpose and when to use it:** Use Physics settings in Settings and Project Health to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs physics settings; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open Manage, then open Settings and Project Health.
2. Choose Physics settings; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Physics settings is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Physics settings is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Physics settings on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Physics settings, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Physics settings.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="manage-audio-settings"></a>

### Audio settings

**Classification:** Manual · Assisted · Automatic · Project-wide · Reversible

**Purpose and when to use it:** Use Audio settings in Settings and Project Health to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs audio settings; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open Manage, then open Settings and Project Health.
2. Choose Audio settings; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Audio settings is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Audio settings is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Audio settings on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Audio settings, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Audio settings.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="manage-collision-matrix"></a>

### Collision matrix

**Classification:** Manual · Assisted · Automatic · Project-wide · Reversible

**Purpose and when to use it:** Use Collision matrix in Settings and Project Health to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs collision matrix; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open Manage, then open Settings and Project Health.
2. Choose Collision matrix; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Collision matrix is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Collision matrix is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Collision matrix on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Collision matrix, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Collision matrix.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="manage-project-validation"></a>

### Project validation

**Classification:** Manual · Assisted · Automatic · Project-wide · Reversible

**Purpose and when to use it:** Use Project validation in Settings and Project Health to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs project validation; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open Manage, then open Settings and Project Health.
2. Choose Project validation; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Project validation is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Project validation is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Project validation on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Project validation, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Project validation.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="manage-deterministic-repair"></a>

### Deterministic repair

**Classification:** Manual · Assisted · Automatic · Project-wide · Reversible

**Purpose and when to use it:** Use Deterministic repair in Settings and Project Health to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs deterministic repair; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open Manage, then open Settings and Project Health.
2. Choose Deterministic repair; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Deterministic repair is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Deterministic repair is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Deterministic repair on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Deterministic repair, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Deterministic repair.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="manage-recovery-browser"></a>

### Recovery browser

**Classification:** Manual · Assisted · Automatic · Project-wide · Reversible

**Purpose and when to use it:** Use Recovery browser in Settings and Project Health to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs recovery browser; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open Manage, then open Settings and Project Health.
2. Choose Recovery browser; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Recovery browser is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Recovery browser is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Recovery browser on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Recovery browser, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Recovery browser.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="manage-migration-status"></a>

### Migration status

**Classification:** Manual · Assisted · Automatic · Project-wide · Reversible

**Purpose and when to use it:** Use Migration status in Settings and Project Health to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs migration status; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open Manage, then open Settings and Project Health.
2. Choose Migration status; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Migration status is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Migration status is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Migration status on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Migration status, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Migration status.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="manage-low-end-performance-profile"></a>

### Low-end performance profile

**Classification:** Manual · Assisted · Automatic · Project-wide · Reversible

**Purpose and when to use it:** Use Low-end performance profile in Settings and Project Health to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs low-end performance profile; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open Manage, then open Settings and Project Health.
2. Choose Low-end performance profile; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Low-end performance profile is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Low-end performance profile is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Low-end performance profile on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Low-end performance profile, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Low-end performance profile.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="manage-studio-status"></a>

### Studio Status

**Classification:** Manual · Assisted · Automatic · Project-wide · Reversible

**Purpose and when to use it:** Use Studio Status in Settings and Project Health to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs studio status; keep unrelated settings in their owning workspace.

**Preconditions:**

- An open project

**Exact workflow:**

1. Open Manage, then open Settings and Project Health.
2. Choose Studio Status; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Studio Status is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Studio Status is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Studio Status on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Studio Status, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Studio Status.

**Rhai API:** N/A

**Visual Graph API:** N/A


## Packages and Ecosystem Studio

<a id="ecosystem-registry-and-lockfile"></a>

### Registry and lockfile

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Registry and lockfile in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs registry and lockfile; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Registry and lockfile; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Registry and lockfile is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Registry and lockfile is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Registry and lockfile on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Registry and lockfile, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Registry and lockfile.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-dependency-resolution"></a>

### Dependency resolution

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Dependency resolution in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs dependency resolution; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Dependency resolution; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Dependency resolution is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Dependency resolution is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Dependency resolution on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Dependency resolution, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Dependency resolution.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-hashes-and-signatures"></a>

### Hashes and signatures

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Hashes and signatures in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs hashes and signatures; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Hashes and signatures; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Hashes and signatures is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Hashes and signatures is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Hashes and signatures on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Hashes and signatures, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Hashes and signatures.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-permissions-and-licenses"></a>

### Permissions and licenses

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Permissions and licenses in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs permissions and licenses; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Permissions and licenses; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Permissions and licenses is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Permissions and licenses is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Permissions and licenses on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Permissions and licenses, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Permissions and licenses.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-quarantine-and-rollback"></a>

### Quarantine and rollback

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Quarantine and rollback in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs quarantine and rollback; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Quarantine and rollback; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Quarantine and rollback is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Quarantine and rollback is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Quarantine and rollback on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Quarantine and rollback, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Quarantine and rollback.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-offline-mirror"></a>

### Offline mirror

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Offline mirror in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs offline mirror; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Offline mirror; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Offline mirror is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Offline mirror is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Offline mirror on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Offline mirror, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Offline mirror.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-plugin-api-contributions"></a>

### Plugin API contributions

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Plugin API contributions in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs plugin api contributions; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Plugin API contributions; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Plugin API contributions is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Plugin API contributions is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Plugin API contributions on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Plugin API contributions, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Plugin API contributions.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-load-unload-and-reload"></a>

### Load, unload and reload

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Load, unload and reload in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs load, unload and reload; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Load, unload and reload; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Load, unload and reload is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Load, unload and reload is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Load, unload and reload on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Load, unload and reload, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Load, unload and reload.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-native-extension-abi"></a>

### Native Extension ABI

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Native Extension ABI in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs native extension abi; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Native Extension ABI; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Native Extension ABI is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Native Extension ABI is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Native Extension ABI on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Native Extension ABI, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Native Extension ABI.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-package-wizard"></a>

### Package wizard

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Package wizard in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs package wizard; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Package wizard; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Package wizard is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Package wizard is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Package wizard on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Package wizard, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Package wizard.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-ed25519-signing-request"></a>

### Ed25519 signing request

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Ed25519 signing request in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs ed25519 signing request; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Ed25519 signing request; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Ed25519 signing request is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Ed25519 signing request is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Ed25519 signing request on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Ed25519 signing request, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Ed25519 signing request.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-certification-scanner"></a>

### Certification scanner

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Certification scanner in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs certification scanner; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Certification scanner; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Certification scanner is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Certification scanner is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Certification scanner on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Certification scanner, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Certification scanner.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-offline-registry-tooling"></a>

### Offline registry tooling

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Offline registry tooling in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs offline registry tooling; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Offline registry tooling; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Offline registry tooling is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Offline registry tooling is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Offline registry tooling on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Offline registry tooling, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Offline registry tooling.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-export-templates"></a>

### Export templates

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Export templates in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs export templates; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Export templates; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Export templates is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Export templates is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Export templates on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Export templates, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Export templates.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-ci-matrix"></a>

### CI matrix

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use CI matrix in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs ci matrix; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose CI matrix; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** CI matrix is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** CI matrix is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing CI matrix on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure CI matrix, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for CI matrix.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-content-cache"></a>

### Content cache

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Content cache in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs content cache; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Content cache; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Content cache is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Content cache is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Content cache on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Content cache, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Content cache.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-delta-builds"></a>

### Delta builds

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Delta builds in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs delta builds; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Delta builds; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Delta builds is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Delta builds is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Delta builds on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Delta builds, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Delta builds.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="ecosystem-deployment-connectors"></a>

### Deployment connectors

**Classification:** Manual · Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Deployment connectors in Packages and Ecosystem Studio to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs deployment connectors; keep unrelated settings in their owning workspace.

**Preconditions:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exact workflow:**

1. Open Manage / Debug, then open Packages and Ecosystem Studio.
2. Choose Deployment connectors; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Deployment connectors is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Deployment connectors is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Deployment connectors on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Deployment connectors, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Deployment connectors.

**Rhai API:** N/A

**Visual Graph API:** N/A


## Network Studio

<a id="network-explicit-network-permission"></a>

### Explicit network permission

**Classification:** Manual · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Explicit network permission in Network Studio to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs explicit network permission; keep unrelated settings in their owning workspace.

**Preconditions:**

- Networking package
- Explicit project permission

**Exact workflow:**

1. Open Debug, then open Network Studio.
2. Choose Explicit network permission; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Explicit network permission is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Explicit network permission is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Explicit network permission on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Explicit network permission, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Explicit network permission.

**Rhai API:** `network_rpc`, `network_role`, `network_tick`

**Visual Graph API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-local-lobby"></a>

### Local lobby

**Classification:** Manual · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Local lobby in Network Studio to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs local lobby; keep unrelated settings in their owning workspace.

**Preconditions:**

- Networking package
- Explicit project permission

**Exact workflow:**

1. Open Debug, then open Network Studio.
2. Choose Local lobby; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Local lobby is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Local lobby is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Local lobby on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Local lobby, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Local lobby.

**Rhai API:** `network_rpc`, `network_role`, `network_tick`

**Visual Graph API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-direct-connect"></a>

### Direct connect

**Classification:** Manual · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Direct connect in Network Studio to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs direct connect; keep unrelated settings in their owning workspace.

**Preconditions:**

- Networking package
- Explicit project permission

**Exact workflow:**

1. Open Debug, then open Network Studio.
2. Choose Direct connect; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Direct connect is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Direct connect is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Direct connect on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Direct connect, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Direct connect.

**Rhai API:** `network_rpc`, `network_role`, `network_tick`

**Visual Graph API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-reliable-and-unreliable-channels"></a>

### Reliable and unreliable channels

**Classification:** Manual · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Reliable and unreliable channels in Network Studio to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs reliable and unreliable channels; keep unrelated settings in their owning workspace.

**Preconditions:**

- Networking package
- Explicit project permission

**Exact workflow:**

1. Open Debug, then open Network Studio.
2. Choose Reliable and unreliable channels; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Reliable and unreliable channels is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Reliable and unreliable channels is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Reliable and unreliable channels on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Reliable and unreliable channels, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Reliable and unreliable channels.

**Rhai API:** `network_rpc`, `network_role`, `network_tick`

**Visual Graph API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-rpc-contracts"></a>

### RPC contracts

**Classification:** Manual · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use RPC contracts in Network Studio to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs rpc contracts; keep unrelated settings in their owning workspace.

**Preconditions:**

- Networking package
- Explicit project permission

**Exact workflow:**

1. Open Debug, then open Network Studio.
2. Choose RPC contracts; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** RPC contracts is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** RPC contracts is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing RPC contracts on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure RPC contracts, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for RPC contracts.

**Rhai API:** `network_rpc`, `network_role`, `network_tick`

**Visual Graph API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-authority-and-replication"></a>

### Authority and replication

**Classification:** Manual · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Authority and replication in Network Studio to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs authority and replication; keep unrelated settings in their owning workspace.

**Preconditions:**

- Networking package
- Explicit project permission

**Exact workflow:**

1. Open Debug, then open Network Studio.
2. Choose Authority and replication; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Authority and replication is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Authority and replication is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Authority and replication on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Authority and replication, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Authority and replication.

**Rhai API:** `network_rpc`, `network_role`, `network_tick`

**Visual Graph API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-interpolation-and-prediction"></a>

### Interpolation and prediction

**Classification:** Manual · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Interpolation and prediction in Network Studio to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs interpolation and prediction; keep unrelated settings in their owning workspace.

**Preconditions:**

- Networking package
- Explicit project permission

**Exact workflow:**

1. Open Debug, then open Network Studio.
2. Choose Interpolation and prediction; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Interpolation and prediction is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Interpolation and prediction is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Interpolation and prediction on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Interpolation and prediction, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Interpolation and prediction.

**Rhai API:** `network_rpc`, `network_role`, `network_tick`

**Visual Graph API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-reconciliation-and-rollback"></a>

### Reconciliation and rollback

**Classification:** Manual · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Reconciliation and rollback in Network Studio to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs reconciliation and rollback; keep unrelated settings in their owning workspace.

**Preconditions:**

- Networking package
- Explicit project permission

**Exact workflow:**

1. Open Debug, then open Network Studio.
2. Choose Reconciliation and rollback; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Reconciliation and rollback is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Reconciliation and rollback is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Reconciliation and rollback on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Reconciliation and rollback, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Reconciliation and rollback.

**Rhai API:** `network_rpc`, `network_role`, `network_tick`

**Visual Graph API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-late-join"></a>

### Late join

**Classification:** Manual · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Late join in Network Studio to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs late join; keep unrelated settings in their owning workspace.

**Preconditions:**

- Networking package
- Explicit project permission

**Exact workflow:**

1. Open Debug, then open Network Studio.
2. Choose Late join; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Late join is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Late join is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Late join on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Late join, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Late join.

**Rhai API:** `network_rpc`, `network_role`, `network_tick`

**Visual Graph API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-latency-loss-simulation"></a>

### Latency/loss simulation

**Classification:** Manual · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Latency/loss simulation in Network Studio to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs latency/loss simulation; keep unrelated settings in their owning workspace.

**Preconditions:**

- Networking package
- Explicit project permission

**Exact workflow:**

1. Open Debug, then open Network Studio.
2. Choose Latency/loss simulation; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Latency/loss simulation is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Latency/loss simulation is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Latency/loss simulation on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Latency/loss simulation, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Latency/loss simulation.

**Rhai API:** `network_rpc`, `network_role`, `network_tick`

**Visual Graph API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-multiplayer-replay"></a>

### Multiplayer replay

**Classification:** Manual · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Multiplayer replay in Network Studio to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs multiplayer replay; keep unrelated settings in their owning workspace.

**Preconditions:**

- Networking package
- Explicit project permission

**Exact workflow:**

1. Open Debug, then open Network Studio.
2. Choose Multiplayer replay; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Multiplayer replay is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Multiplayer replay is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Multiplayer replay on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Multiplayer replay, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Multiplayer replay.

**Rhai API:** `network_rpc`, `network_role`, `network_tick`

**Visual Graph API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-multiplayer-save"></a>

### Multiplayer save

**Classification:** Manual · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Multiplayer save in Network Studio to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs multiplayer save; keep unrelated settings in their owning workspace.

**Preconditions:**

- Networking package
- Explicit project permission

**Exact workflow:**

1. Open Debug, then open Network Studio.
2. Choose Multiplayer save; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Multiplayer save is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Multiplayer save is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Multiplayer save on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Multiplayer save, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Multiplayer save.

**Rhai API:** `network_rpc`, `network_role`, `network_tick`

**Visual Graph API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-packet-diagnostics"></a>

### Packet diagnostics

**Classification:** Manual · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Packet diagnostics in Network Studio to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs packet diagnostics; keep unrelated settings in their owning workspace.

**Preconditions:**

- Networking package
- Explicit project permission

**Exact workflow:**

1. Open Debug, then open Network Studio.
2. Choose Packet diagnostics; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Packet diagnostics is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Packet diagnostics is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Packet diagnostics on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Packet diagnostics, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Packet diagnostics.

**Rhai API:** `network_rpc`, `network_role`, `network_tick`

**Visual Graph API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-headless-authority"></a>

### Headless authority

**Classification:** Manual · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Headless authority in Network Studio to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs headless authority; keep unrelated settings in their owning workspace.

**Preconditions:**

- Networking package
- Explicit project permission

**Exact workflow:**

1. Open Debug, then open Network Studio.
2. Choose Headless authority; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Headless authority is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Headless authority is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Headless authority on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Headless authority, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Headless authority.

**Rhai API:** `network_rpc`, `network_role`, `network_tick`

**Visual Graph API:** `Network/RPC`, `Network/Role`, `Network/Tick`


## Build Settings

<a id="build-target-and-architecture"></a>

### Target and architecture

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Target and architecture in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs target and architecture; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Target and architecture; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Target and architecture is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Target and architecture is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Target and architecture on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Target and architecture, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Target and architecture.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-portable-application"></a>

### Portable application

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Portable application in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs portable application; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Portable application; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Portable application is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Portable application is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Portable application on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Portable application, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Portable application.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-player-plus-data-pack"></a>

### Player plus data pack

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Player plus data pack in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs player plus data pack; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Player plus data pack; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Player plus data pack is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Player plus data pack is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Player plus data pack on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Player plus data pack, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Player plus data pack.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-web-folder"></a>

### Web folder

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Web folder in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs web folder; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Web folder; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Web folder is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Web folder is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Web folder on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Web folder, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Web folder.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-startup-scene"></a>

### Startup scene

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Startup scene in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs startup scene; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Startup scene; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Startup scene is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Startup scene is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Startup scene on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Startup scene, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Startup scene.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-deterministic-build"></a>

### Deterministic build

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Deterministic build in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs deterministic build; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Deterministic build; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Deterministic build is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Deterministic build is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Deterministic build on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Deterministic build, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Deterministic build.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-content-stripping"></a>

### Content stripping

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Content stripping in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs content stripping; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Content stripping; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Content stripping is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Content stripping is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Content stripping on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Content stripping, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Content stripping.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-build-profiles"></a>

### Build profiles

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Build profiles in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs build profiles; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Build profiles; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Build profiles is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Build profiles is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Build profiles on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Build profiles, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Build profiles.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-provenance-and-sbom"></a>

### Provenance and SBOM

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Provenance and SBOM in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs provenance and sbom; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Provenance and SBOM; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Provenance and SBOM is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Provenance and SBOM is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Provenance and SBOM on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Provenance and SBOM, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Provenance and SBOM.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-patch-manifest"></a>

### Patch manifest

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Patch manifest in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs patch manifest; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Patch manifest; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Patch manifest is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Patch manifest is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Patch manifest on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Patch manifest, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Patch manifest.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-symbols"></a>

### Symbols

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Symbols in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs symbols; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Symbols; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Symbols is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Symbols is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Symbols on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Symbols, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Symbols.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-web-headers"></a>

### Web headers

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Web headers in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs web headers; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Web headers; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Web headers is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Web headers is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Web headers on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Web headers, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Web headers.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-export-templates"></a>

### Export templates

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Export templates in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs export templates; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Export templates; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Export templates is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Export templates is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Export templates on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Export templates, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Export templates.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-build-and-run"></a>

### Build and Run

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Build and Run in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs build and run; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Build and Run; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Build and Run is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Build and Run is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Build and Run on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Build and Run, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Build and Run.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-size-report"></a>

### Size report

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Size report in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs size report; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Size report; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Size report is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Size report is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Size report on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Size report, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Size report.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-deployment-plan"></a>

### Deployment plan

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Deployment plan in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs deployment plan; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Deployment plan; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Deployment plan is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Deployment plan is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Deployment plan on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Deployment plan, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Deployment plan.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-signing-warning"></a>

### Signing warning

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Signing warning in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs signing warning; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Signing warning; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Signing warning is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Signing warning is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Signing warning on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Signing warning, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Signing warning.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="build-release-package"></a>

### Release package

**Classification:** Manual · Assisted · Project-wide

**Purpose and when to use it:** Use Release package in Build Settings to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs release package; keep unrelated settings in their owning workspace.

**Preconditions:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exact workflow:**

1. Open Manage, then open Build Settings.
2. Choose Release package; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Release package is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Release package is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Release package on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Release package, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Release package.

**Rhai API:** N/A

**Visual Graph API:** N/A


## Recovery and Team Workflow

<a id="recovery-team-atomic-saves-and-journals"></a>

### Atomic saves and journals

**Classification:** Automatic · Manual · Project-wide · Reversible

**Purpose and when to use it:** Use Atomic saves and journals in Recovery and Team Workflow to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs atomic saves and journals; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project; external Git remains optional

**Exact workflow:**

1. Open Manage, then open Recovery and Team Workflow.
2. Choose Atomic saves and journals; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Atomic saves and journals is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Atomic saves and journals is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Atomic saves and journals on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Atomic saves and journals, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Atomic saves and journals.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="recovery-team-autosaves"></a>

### Autosaves

**Classification:** Automatic · Manual · Project-wide · Reversible

**Purpose and when to use it:** Use Autosaves in Recovery and Team Workflow to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs autosaves; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project; external Git remains optional

**Exact workflow:**

1. Open Manage, then open Recovery and Team Workflow.
2. Choose Autosaves; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Autosaves is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Autosaves is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Autosaves on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Autosaves, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Autosaves.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="recovery-team-manual-checkpoints"></a>

### Manual checkpoints

**Classification:** Automatic · Manual · Project-wide · Reversible

**Purpose and when to use it:** Use Manual checkpoints in Recovery and Team Workflow to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs manual checkpoints; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project; external Git remains optional

**Exact workflow:**

1. Open Manage, then open Recovery and Team Workflow.
2. Choose Manual checkpoints; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Manual checkpoints is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Manual checkpoints is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Manual checkpoints on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Manual checkpoints, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Manual checkpoints.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="recovery-team-recovery-preview"></a>

### Recovery preview

**Classification:** Automatic · Manual · Project-wide · Reversible

**Purpose and when to use it:** Use Recovery preview in Recovery and Team Workflow to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs recovery preview; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project; external Git remains optional

**Exact workflow:**

1. Open Manage, then open Recovery and Team Workflow.
2. Choose Recovery preview; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Recovery preview is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Recovery preview is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Recovery preview on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Recovery preview, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Recovery preview.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="recovery-team-external-change-conflict-handling"></a>

### External-change conflict handling

**Classification:** Automatic · Manual · Project-wide · Reversible

**Purpose and when to use it:** Use External-change conflict handling in Recovery and Team Workflow to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs external-change conflict handling; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project; external Git remains optional

**Exact workflow:**

1. Open Manage, then open Recovery and Team Workflow.
2. Choose External-change conflict handling; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** External-change conflict handling is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** External-change conflict handling is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing External-change conflict handling on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure External-change conflict handling, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for External-change conflict handling.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="recovery-team-project-trash"></a>

### Project trash

**Classification:** Automatic · Manual · Project-wide · Reversible

**Purpose and when to use it:** Use Project trash in Recovery and Team Workflow to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs project trash; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project; external Git remains optional

**Exact workflow:**

1. Open Manage, then open Recovery and Team Workflow.
2. Choose Project trash; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Project trash is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Project trash is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Project trash on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Project trash, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Project trash.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="recovery-team-semantic-diff"></a>

### Semantic diff

**Classification:** Automatic · Manual · Project-wide · Reversible

**Purpose and when to use it:** Use Semantic diff in Recovery and Team Workflow to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs semantic diff; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project; external Git remains optional

**Exact workflow:**

1. Open Manage, then open Recovery and Team Workflow.
2. Choose Semantic diff; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Semantic diff is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Semantic diff is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Semantic diff on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Semantic diff, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Semantic diff.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="recovery-team-git-helpers"></a>

### Git helpers

**Classification:** Automatic · Manual · Project-wide · Reversible

**Purpose and when to use it:** Use Git helpers in Recovery and Team Workflow to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs git helpers; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project; external Git remains optional

**Exact workflow:**

1. Open Manage, then open Recovery and Team Workflow.
2. Choose Git helpers; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Git helpers is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Git helpers is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Git helpers on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Git helpers, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Git helpers.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="recovery-team-ownership-and-codeowners"></a>

### Ownership and CODEOWNERS

**Classification:** Automatic · Manual · Project-wide · Reversible

**Purpose and when to use it:** Use Ownership and CODEOWNERS in Recovery and Team Workflow to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs ownership and codeowners; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project; external Git remains optional

**Exact workflow:**

1. Open Manage, then open Recovery and Team Workflow.
2. Choose Ownership and CODEOWNERS; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Ownership and CODEOWNERS is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Ownership and CODEOWNERS is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Ownership and CODEOWNERS on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Ownership and CODEOWNERS, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Ownership and CODEOWNERS.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="recovery-team-tasks-and-notes"></a>

### Tasks and notes

**Classification:** Automatic · Manual · Project-wide · Reversible

**Purpose and when to use it:** Use Tasks and notes in Recovery and Team Workflow to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs tasks and notes; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project; external Git remains optional

**Exact workflow:**

1. Open Manage, then open Recovery and Team Workflow.
2. Choose Tasks and notes; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Tasks and notes is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Tasks and notes is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Tasks and notes on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Tasks and notes, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Tasks and notes.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="recovery-team-shared-presets"></a>

### Shared presets

**Classification:** Automatic · Manual · Project-wide · Reversible

**Purpose and when to use it:** Use Shared presets in Recovery and Team Workflow to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs shared presets; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project; external Git remains optional

**Exact workflow:**

1. Open Manage, then open Recovery and Team Workflow.
2. Choose Shared presets; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Shared presets is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Shared presets is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Shared presets on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Shared presets, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Shared presets.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="recovery-team-binary-locks"></a>

### Binary locks

**Classification:** Automatic · Manual · Project-wide · Reversible

**Purpose and when to use it:** Use Binary locks in Recovery and Team Workflow to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs binary locks; keep unrelated settings in their owning workspace.

**Preconditions:**

- A writable project; external Git remains optional

**Exact workflow:**

1. Open Manage, then open Recovery and Team Workflow.
2. Choose Binary locks; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Binary locks is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Binary locks is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Binary locks on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Binary locks, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Binary locks.

**Rhai API:** N/A

**Visual Graph API:** N/A


## Guided Project

<a id="task-snake-complete-snake-game"></a>

### Complete Snake game

**Classification:** Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Complete Snake game in Guided Project to complete its supported authoring or runtime job without leaving the Design / Script / Build workflow. Use it when the project needs complete snake game; keep unrelated settings in their owning workspace.

**Preconditions:**

- Snake template

**Exact workflow:**

1. Open Design / Script / Build, then open Guided Project.
2. Choose Complete Snake game; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Complete Snake game is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Complete Snake game is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Complete Snake game on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Complete Snake game, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Complete Snake game.

**Rhai API:** `input_pressed`, `timer_start`, `signal_emit`, `ui_set_text`, `random_range`

**Visual Graph API:** `Input/Pressed`, `Time/Timer`, `Signals/Emit`, `UI/Set Text`

<a id="task-platformer-complete-platformer"></a>

### Complete platformer

**Classification:** Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Complete platformer in Guided Project to complete its supported authoring or runtime job without leaving the Design / Script / Debug workflow. Use it when the project needs complete platformer; keep unrelated settings in their owning workspace.

**Preconditions:**

- Platformer template

**Exact workflow:**

1. Open Design / Script / Debug, then open Guided Project.
2. Choose Complete platformer; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Complete platformer is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Complete platformer is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Complete platformer on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Complete platformer, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Complete platformer.

**Rhai API:** `input_axis`, `character_move`, `checkpoint_set`

**Visual Graph API:** `Input/Axis`, `Character/Move`, `Game Flow/Checkpoint`

<a id="task-top-down-complete-top-down-game"></a>

### Complete top-down game

**Classification:** Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Complete top-down game in Guided Project to complete its supported authoring or runtime job without leaving the Design / Script / Debug workflow. Use it when the project needs complete top-down game; keep unrelated settings in their owning workspace.

**Preconditions:**

- Top-down template

**Exact workflow:**

1. Open Design / Script / Debug, then open Guided Project.
2. Choose Complete top-down game; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Complete top-down game is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Complete top-down game is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Complete top-down game on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Complete top-down game, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Complete top-down game.

**Rhai API:** `input_vector`, `spawn_at`, `query_radius`

**Visual Graph API:** `Input/Vector2`, `Scene/Spawn`, `Scene/Query Radius`

<a id="task-physics-puzzle-physics-puzzle-with-rope-and-joints"></a>

### Physics puzzle with rope and joints

**Classification:** Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Physics puzzle with rope and joints in Guided Project to complete its supported authoring or runtime job without leaving the Design / Debug workflow. Use it when the project needs physics puzzle with rope and joints; keep unrelated settings in their owning workspace.

**Preconditions:**

- Physics Sandbox template

**Exact workflow:**

1. Open Design / Debug, then open Guided Project.
2. Choose Physics puzzle with rope and joints; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Physics puzzle with rope and joints is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Physics puzzle with rope and joints is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Physics puzzle with rope and joints on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Physics puzzle with rope and joints, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Physics puzzle with rope and joints.

**Rhai API:** `apply_force`, `signal_emit`

**Visual Graph API:** `Physics/Apply Force`, `Signals/Emit`

<a id="task-menu-localized-responsive-menu"></a>

### Localized responsive menu

**Classification:** Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Localized responsive menu in Guided Project to complete its supported authoring or runtime job without leaving the Interface workflow. Use it when the project needs localized responsive menu; keep unrelated settings in their owning workspace.

**Preconditions:**

- UI Showcase template

**Exact workflow:**

1. Open Interface, then open Guided Project.
2. Choose Localized responsive menu; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Localized responsive menu is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Localized responsive menu is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Localized responsive menu on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Localized responsive menu, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Localized responsive menu.

**Rhai API:** `ui_set_text`, `scene_load`

**Visual Graph API:** `UI/Set Text`, `Scene/Load`

<a id="task-cutscene-animation-and-cutscene"></a>

### Animation and cutscene

**Classification:** Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Animation and cutscene in Guided Project to complete its supported authoring or runtime job without leaving the Animation workflow. Use it when the project needs animation and cutscene; keep unrelated settings in their owning workspace.

**Preconditions:**

- Animation clips, controller and timeline

**Exact workflow:**

1. Open Animation, then open Guided Project.
2. Choose Animation and cutscene; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Animation and cutscene is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Animation and cutscene is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Animation and cutscene on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Animation and cutscene, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Animation and cutscene.

**Rhai API:** `animation_play`, `signal_emit`

**Visual Graph API:** `Animation/Play`, `Signals/Emit`

<a id="task-tilemap-tilemap-streamed-world"></a>

### TileMap streamed world

**Classification:** Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use TileMap streamed world in Guided Project to complete its supported authoring or runtime job without leaving the Design workflow. Use it when the project needs tilemap streamed world; keep unrelated settings in their owning workspace.

**Preconditions:**

- TileSet and WorldChunk2D

**Exact workflow:**

1. Open Design, then open Guided Project.
2. Choose TileMap streamed world; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** TileMap streamed world is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** TileMap streamed world is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing TileMap streamed world on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure TileMap streamed world, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for TileMap streamed world.

**Rhai API:** `navigation_target`, `query_tag`

**Visual Graph API:** `Navigation/Set Target`, `Scene/Query Tag`

<a id="task-save-save-and-checkpoint-workflow"></a>

### Save and checkpoint workflow

**Classification:** Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Save and checkpoint workflow in Guided Project to complete its supported authoring or runtime job without leaving the Script / Manage workflow. Use it when the project needs save and checkpoint workflow; keep unrelated settings in their owning workspace.

**Preconditions:**

- A playable scene

**Exact workflow:**

1. Open Script / Manage, then open Guided Project.
2. Choose Save and checkpoint workflow; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Save and checkpoint workflow is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Save and checkpoint workflow is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Save and checkpoint workflow on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Save and checkpoint workflow, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Save and checkpoint workflow.

**Rhai API:** `save_set`, `save_commit`, `checkpoint_set`

**Visual Graph API:** `Save/Set`, `Save/Commit`, `Game Flow/Checkpoint`

<a id="task-package-package-and-plugin-workflow"></a>

### Package and plugin workflow

**Classification:** Assisted · Project-wide · Reversible

**Purpose and when to use it:** Use Package and plugin workflow in Guided Project to complete its supported authoring or runtime job without leaving the Manage / Debug workflow. Use it when the project needs package and plugin workflow; keep unrelated settings in their owning workspace.

**Preconditions:**

- A test WASM plugin and manifest

**Exact workflow:**

1. Open Manage / Debug, then open Guided Project.
2. Choose Package and plugin workflow; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Package and plugin workflow is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Package and plugin workflow is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Package and plugin workflow on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Package and plugin workflow, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Package and plugin workflow.

**Rhai API:** N/A

**Visual Graph API:** `Package-defined graph node`

<a id="task-network-local-network-sample"></a>

### Local network sample

**Classification:** Assisted · Runtime · Project-wide · Reversible

**Purpose and when to use it:** Use Local network sample in Guided Project to complete its supported authoring or runtime job without leaving the Debug workflow. Use it when the project needs local network sample; keep unrelated settings in their owning workspace.

**Preconditions:**

- Networking package and explicit permission

**Exact workflow:**

1. Open Debug, then open Guided Project.
2. Choose Local network sample; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Local network sample is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Local network sample is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Local network sample on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Local network sample, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Local network sample.

**Rhai API:** `network_rpc`, `network_role`

**Visual Graph API:** `Network/RPC`, `Network/Role`

<a id="task-windows-windows-portable-export"></a>

### Windows portable export

**Classification:** Assisted · Project-wide

**Purpose and when to use it:** Use Windows portable export in Guided Project to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs windows portable export; keep unrelated settings in their owning workspace.

**Preconditions:**

- Windows host
- Passing Project Health and Windows template

**Exact workflow:**

1. Open Manage, then open Guided Project.
2. Choose Windows portable export; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Windows portable export is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Windows portable export is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Windows portable export on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Windows portable export, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Windows portable export.

**Rhai API:** N/A

**Visual Graph API:** N/A

<a id="task-web-web-deployment"></a>

### Web deployment

**Classification:** Assisted · Project-wide

**Purpose and when to use it:** Use Web deployment in Guided Project to complete its supported authoring or runtime job without leaving the Manage workflow. Use it when the project needs web deployment; keep unrelated settings in their owning workspace.

**Preconditions:**

- Passing Project Health and Web template
- An explicit external HTTP(S) host

**Exact workflow:**

1. Open Manage, then open Guided Project.
2. Choose Web deployment; read its visible validation and permission state before editing.
3. Select the target project, asset or object and enter only finite, supported values.
4. Apply or save the change, then inspect the visible result and Problems/Console output.
5. Run Play or Preview when the feature has runtime behavior; use Pause/Step for deterministic inspection.
6. Save, reload the project and confirm the authored value is unchanged.
7. Run Project Health and the relevant test, then build the standalone player and repeat the observable check.

**Expected result:** Web deployment is visible in the editor, survives reload and reaches Preview/Play and exported players where applicable.

**Persistence and export:** Web deployment is stored in the owning project, scene, component, asset, workspace preference or build manifest. Editor-only state is excluded from players.

**Undo and recovery:** Use Undo/Redo for document edits, Revert/rollback for imports or packages, Recovery Browser for interrupted saves, and source control or the migration backup for project-wide recovery.

**Common mistakes and fixes:**

- Editing Web deployment on the wrong selection or workspace.
- Ignoring a permission, validation, missing-reference or host-template warning.
- Checking only the editor preview and not save/reload plus the standalone player.

**Keyboard and accessibility:** Use Command Palette or keyboard focus instead of pointer-only navigation. Every dialog exposes a named control, visible focus, Escape/cancel path and reduced-motion behavior.

**Minimal example:** Minimal: create one valid target, configure Web deployment, save and verify one visible result in Play.

**Production example:** Production: add validation, localization/accessibility, deterministic tests, budgets, recovery evidence and both development and release builds for Web deployment.

**Rhai API:** N/A

**Visual Graph API:** N/A

<!-- NOVA_V6_TEACHING_END -->
