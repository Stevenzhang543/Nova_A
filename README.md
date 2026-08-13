**Languages:** [中文](./README.zh-CN.md) | English

# Nova_A 2D Game Engine & Editor

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)
[![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://v2.tauri.app/start/prerequisites/)
[![Release](https://img.shields.io/badge/release-2.4.0-63c6ff)]()

Nova_A is an open-source 2D game engine and desktop editor built with Rust, WebAssembly, Vue 3, and Tauri.

Version **2.4.0** makes animation a complete production workflow: dope sheet and curve editing, exact tangents, multi-track/target animation, box selection, snapping, copy/paste, signal events, layered animator controllers, masks, blend trees, transition interruption, rigs, weighted skins, IK, constraints, recording, deterministic reimport, and a general Timeline. Project Format 2 schema 17 validates the new references. Unreferenced rig, skin, and Timeline resources are excluded from player packs.

**Manual:** [interactive English/German/Chinese webpage](./manual/index.html) · [English Markdown](./manual/MANUAL.en.md) · [Deutsch](./manual/MANUAL.de.md) · [中文](./manual/MANUAL.zh-CN.md)

## What is new in v2.4.0

- The dedicated **Animation Studio** opens clips, controllers, animation masks, rigs, skins, and Timelines in contextual editors rather than a single long form.
- Clips support dope-sheet and sampled curve views, Auto/Linear/Constant/Free tangents, box and multi-selection, snapping, key drag, copy/paste, sprite frames, event signals, and tracks that target the owner or another entity.
- Animator controllers support typed parameter defaults, transition conditions/exit time/duration/interruption, layers, weights, additive evaluation, masks, subgraphs, 1D blend trees, and live play-mode preview.
- `Skeleton2D` and rig/skin resources add hierarchical bones, pose overrides, inverse-bind weighted sprite deformation, IK chains, rotation/copy/position constraints, and WebGL2/Canvas2D rendering.
- `TimelinePlayer` sequences animation, audio, camera, event, visibility, and script-call tracks at fixed simulation ticks. Animation events use the bounded signal system.
- Explicit Record mode captures Inspector and gizmo transforms as snapped keyframes. Animation import metadata preserves a stable target GUID and deterministically resamples mapped source tracks.
- New TextInput controls use a balanced 300 x 96 default instead of the previous wide 360 x 88 rectangle.
- Schema 17 migrates schema 16 clips/controllers without visual changes, validates rig/skin/Timeline asset types, and preserves unknown asset fields.

### Retained v2.3 rendering foundation

- The **Rendering** bottom tool edits ambient light, shadow quality, color space, debug views, post effects, user post materials, safe material shaders and live previews.
- Point, spot, directional and area lights honor rendering layers/masks; ShadowCaster2D supports hard/soft/ultra quality and SpriteRenderer2D normal maps affect light response.
- Materials carry validated shader source, textures, finite uniforms, blend mode, sampling, color space and color-write state. Invalid shaders use the default material without breaking the frame.
- Multiple Camera2D components support priority/stack ordering, normalized viewports, culling masks, pixel-perfect placement and named render-texture captures.
- Optional color adjustment, vignette, bloom, blur and custom material passes are isolated from UI/editor overlays. World and UI images support nine-slice rendering.
- Image imports expose sRGB/linear metadata and platform compression variants. Atlases, nearest/linear sampling and existing sprite-region settings remain supported.
- Rendering diagnostics show pass timing, draw calls, triangles, textures, overdraw, render targets and GPU time where timer queries are supported; captures download as PNG.
- The Scene toolbar now participates in document flow, preventing overlap with the workspace strip and Canvas labels. Overlay clearing and selection reset remove retained white handle dots on axis/scene changes.

### Retained v2.2 scripting foundation

- Script is now a dedicated full-width workspace instead of a tiny textarea inside the Asset importer.
- Explicit `use "…"` project modules support dependency diagnostics and reject missing or circular dependencies. Package declarations are read-only metadata.
- Typed Entity/Component/Animator/AudioSource handles report `valid`, `kind`, `id`, and `error` consistently.
- Signals connect custom editor events, scripts, physics contacts, UI callbacks, animation events, and scene lifecycle at safe runtime boundaries.
- Entity-owned `task_wait`/`on_task` scheduling is cancelled automatically when the entity or scene ends.
- Development sessions support persisted breakpoints, Continue/Step, call stack, locals and safe property-path watches; release packages strip debugger metadata unless Development Build is enabled.
- Templates retain physical metre-scale values but now open at 40 editor pixels per world unit, so default characters and platforms are immediately visible.
- Bottom tools use larger default text and responsive proportional panes; script editing no longer competes with the folder tree and asset importer.

### Retained v2.1 editor workspace foundation

- Five one-click workspaces provide focused layouts without removing any editor panel or capability.
- Hierarchy, Inspector and bottom drawer visibility are independently controllable; Focus Mode temporarily hides chrome without erasing the saved layout.
- The default Design workspace keeps the bottom drawer folded, and local layout persistence validates malformed or stale stored data before use.
- `Ctrl/Cmd+K` or `Ctrl/Cmd+Shift+P` opens a keyboard-navigable command palette covering workspaces, views, settings, all bottom tools, panel toggles and layout reset.
- Inspector search and General/Transform/Rendering/Physics/Gameplay/UI categories eliminate long-scroll hunting.
- Add Component is now an always-visible, searchable, categorized picker that uses the original component creation and undo paths.
- View menu layout commands and responsive 900 x 600 behavior keep the new shell discoverable in English, German and Chinese.

### Retained v2.0 engine foundation

- Nova_A starts in a Project Manager with New, Open, Import, Continue and local recent-project workflows.
- Four self-auditing templates are included: Empty 2D, Platformer, Top-down and Physics Sandbox. They refuse to open if a subsystem required by their tutorial is missing.
- **Nova_A Project Format 2** (schema 17) records compatibility/project identity and migrates every supported legacy schema from 5 through 16.
- Stable Component API 2.0 documents every built-in component and keeps rendering, collision, editor and runtime responsibilities separate.
- Rhai scripts can persist finite booleans, numbers, strings, arrays and maps through isolated named save slots.
- WASM Plugin API 1 validates manifests/modules, exposes only log/event capabilities, and provides no filesystem, network or process access.
- The bundled manual documents every editor command, component, physics property, runtime API, asset workflow, build option, migration step and three complete tutorials in English, German and Chinese.
- CI now validates all three desktop operating systems and audits documentation completeness in addition to code, WASM and frontend builds.

### Retained v1.9 distribution and debugging foundation

- Nova Player is a runtime-only application mode containing the runtime, physics, renderer, audio, scripts, input, and packaged assets. It does not mount the Inspector, Hierarchy, Asset Browser, editor grid, menus, or gizmos.
- Build Settings configures game name, Windows/Linux/macOS/Web target, x86_64 architecture, ordered scenes, startup scene, development metadata, output directory, and optional executable-embedded game data.
- `game.nova-pak` is a versioned indexed archive with per-entry paths, offsets, MIME/type metadata, original sizes, optional gzip blocks, and SHA-256 verification. Project JSON and imported assets are packaged once rather than emitted as hundreds of loose content files.
- Host-native Windows and Linux builds produce Nova Player plus `game.nova-pak`, or one executable with the package appended and read from a verified footer. macOS builds preserve the `.app` bundle and place the package beside its internal player. Web builds produce `index.html`, the production Nova Player modules, and `game.nova-pak`.
- Console messages now support Trace, Debug, Info, Warning, Error, and Fatal levels, category/search filters, source data, a 2,000-message bounded history, and script-asset navigation.
- Profiler samples real frame, physics, rendering, script, animation, and audio times, plus FPS, memory when exposed by the browser, draw calls, sprites, bodies, contacts, and script instances. A bounded history chart can be frozen or cleared.
- Physics debugging can overlay colliders, contact points, normals, sleeping bodies, AABBs, joint constraints, and rope nodes.
- Frontend failures and Rust panics write versioned diagnostic logs under the user's Nova_A application-data `Logs` directory. CI validates Rust tests and clippy, TypeScript, WASM, frontend production output, and the Tauri backend.
- Game UI now renders and can be selected in Scene view, automatically receives a Canvas when needed, has component-specific visible defaults, shows missing-image placeholders, imports images directly from the Inspector, and uses a native Game-view TextInput overlay for selection, paste, passwords, IME, German, and Chinese input.
- Bottom tabs always wrap instead of falling into a native horizontal tab scroller. Assets, Console, Animation, Profiler, Tilemap, Project Settings, and Build Settings own their scrolling; Animation timestamps and frame controls remain bounded and readable.
- Project format 13 persists Build Settings. Format 12 and every previously supported project format migrate automatically.

### Editor shortcuts

| Shortcut | Action |
| --- | --- |
| `Q` / `W` / `E` / `R` | Select / Move / Rotate / Scale |
| `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` | Undo / Redo |
| `Ctrl/Cmd+C`, `Ctrl/Cmd+V`, `Ctrl/Cmd+D` | Copy / Paste / Duplicate selected subtree |
| `Delete`, `F2` | Delete selection / Rename primary selection |
| `Ctrl/Cmd+S` | Save project |

## Engine workspace

```text
Vue editor
  └─ nova_wasm        WebAssembly boundary only
       ├─ nova_runtime  fixed time, events, diagnostics, runtime skeleton
       │    └─ nova_physics  bodies, collision, solver, ropes, retained world
       │         └─ nova_math  vectors, transforms, AABB, rays, rectangles
       ├─ nova_script   sandboxed Rhai gameplay execution
       └─ nova_format   versioned schemas, validation, and migrations
```

Physics, math, runtime, script, and format crates contain no Vue, DOM, JavaScript, or Tauri imports. Internal crates are statically linked, so the desktop release remains one application and does not require Nova_A DLL plug-ins.

## Supported build targets

- Browser preview: current Chromium, Firefox, and Safari releases with WebAssembly support.
- Desktop: Windows, macOS, and Linux systems supported by Tauri 2 and their native webview.
- Build native release bundles on the target operating system whenever possible. Windows produces NSIS/MSI, macOS produces app/DMG bundles, and Linux produces the formats supported by the installed Tauri toolchain.

Nova_A is currently a desktop/web editor. Android and iOS application targets are not configured in this repository.

## Common prerequisites

- Node.js 18 or newer (`.node-version` records the tested Node release).
- pnpm 9 or newer (`package.json` pins the project package-manager release).
- Stable Rust with Cargo.
- The `wasm32-unknown-unknown` Rust target.
- `wasm-pack` 0.14.0 or newer.
- Git and the native prerequisites for your operating system.

Install the common toolchain components:

```sh
corepack enable
corepack prepare pnpm@10.30.0 --activate
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --version 0.14.0 --locked
pnpm install --frozen-lockfile
```

If `wasm-pack` 0.14.0 or newer is already installed, omit its installation command. Rust documents the WebAssembly target and installation command in the [`wasm32-unknown-unknown` target guide](https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-unknown-unknown.html).

### Operating-system prerequisites

Follow the current [official Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your host system.

- Windows: install Microsoft C++ Build Tools with Desktop development with C++. Tauri uses WebView2; it is already present on current Windows 10 and Windows 11 installations. MSI generation may require the Windows VBSCRIPT optional feature.
- macOS 10.15 or newer: install Xcode, or Xcode Command Line Tools for desktop-only development, then launch/initialize the selected toolchain.
- Debian/Ubuntu Linux:

```sh
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

For Arch, Fedora, openSUSE, Alpine, NixOS, and other distributions, use the package list on the official Tauri prerequisites page instead of substituting Debian package names.

## Build and run

All commands run from the repository root.

### Browser development

```sh
pnpm dev
```

This rebuilds development WASM before Vite starts, preventing a stale Rust module from being served. Vite normally listens on `http://localhost:1420`.

### Native desktop development

```sh
pnpm tauri dev
```

### Validation

```sh
pnpm test:core
cargo clippy --workspace --all-targets -- -D warnings
pnpm check
pnpm audit:manual
pnpm build
```

These commands run all workspace tests (including the complete physics suite), warnings-as-errors linting, Vue/TypeScript checking, a release Rust-to-WASM build, and the optimized Vite build.

### Browser production preview

```sh
pnpm build
pnpm preview
```

### Native release bundle

```sh
pnpm tauri build
```

The Tauri build invokes `pnpm build` automatically before packaging. Result locations vary by operating system under `src-tauri/target/release/bundle/`.

### Export a game with Nova Player

1. Open **Project → Build Settings**.
2. Set the game name and select the target that matches the current desktop host, or select **Web**.
3. Order the included scenes and choose the startup scene.
4. Leave the output field blank for `Documents/Nova_A Builds/<GameName>`, or enter an explicit directory.
5. Choose **Build** or **Build & Run**. Build & Run is available for desktop targets.

The default desktop development export is intentionally two files:

```text
MyGame/
├─ MyGame.exe       # MyGame on Linux; MyGame.app on macOS
└─ game.nova-pak
```

On Windows and Linux, **Package game data into executable** creates a single player executable. macOS keeps the package inside the application bundle so app structure and signing are not corrupted. Desktop targets are host-native: create a Windows export on Windows, Linux export on Linux, and macOS export on macOS. Web export produces a deployable folder containing `index.html`, Nova Player modules/styles, and `game.nova-pak`; serve that folder over HTTP rather than opening `index.html` through `file://`.

## Physics property binding

Configuration changes cross Vue → `nova_wasm` as explicit retained-world commands. Fixed physics ticks remain inside Rust; reusable Float64 state buffers return runtime transforms and rope state to the renderer without unit conversion or per-body JavaScript object results. One configured world unit equals one meter; camera scale only converts world coordinates to pixels.

## Project compatibility

- New saves use **Nova_A Project Format 2**, schema 17, and engine version `2.4.0`.
- Persisted scenes, entities, components, and connections use UUIDs; runtime handles are never written to disk.
- Format migration and validation are centralized in `nova_format`, not scattered through editor components.
- v1.9 format-13 files, v1.8 format-12 files, v1.7 format-11 files, v1.6 format-10 files, v1.5 format-9 files, v1.4 format-8 files, v1.3 format-7 files, v1.2 format-6 files, v1.1.2 format-5 files, older object roots, and legacy top-level entity arrays continue to load. A migrated project is only written in Format 2 when the user saves it.

| Property | Solver/render behavior |
| --- | --- |
| Position, rotation, size | Used directly for world transforms, collision geometry, anchors, and rendering. |
| Linear/angular velocity | Integrated every substep and returned to the renderer. |
| Acceleration | Added directly to dynamic-body linear acceleration. |
| Density and mass | Density × exact shape area determines mass; editing mass updates density. |
| Automatic/manual inertia | Exact ellipse or convex-polygon inertia by default; manual inertia is respected when automatic calculation is disabled. |
| Global/local gravity and gravity scale | Combined and scaled for every dynamic-body substep. |
| Force and torque | Follow `F = ma` and `τ = Iα`; off-center impulses also create angular impulse. |
| Linear/angular/air damping | Applied as exponential decay at each stability substep. |
| Static/kinematic body type | Static bodies remain fixed; kinematic bodies integrate configured velocity without dynamic forces. |
| Restitution and threshold | Restitution applies only when closing speed exceeds the configured threshold. |
| Static/dynamic friction | Sequential impulses use static friction before clamped dynamic friction. |
| Sensor | Body-body contacts report overlap diagnostics without applying collision impulses; physical strings pass through sensor-only bodies. |
| Render sorting layer/order | Controls draw order only and never changes collision behavior. |
| Physics layer/mask/matrix | A contact is solved only when both collider masks and the project collision matrix allow the layer pair. A zero mask intentionally disables every contact. |
| Collider offset/rotation/shape | Collision geometry is independent from renderer geometry and uses its own local transform, material, sensor state, and shape. |
| Continuous collision, sleeping, freeze rotation | Continuous bodies request adaptive anti-tunneling substeps; eligible resting bodies sleep and wake on forces, impulses, contacts, connected motion, or transform edits; frozen bodies reject torque and angular impulse. |
| TileMap rendering/collision | Visible changed chunks submit atlas-backed sprites; merged static box, convex polygon, and one-way geometry uses the TileMap physics layer and mask. |
| Physics queries | Ray, overlap, and shape-cast queries use world units, precise collider geometry, physics-layer masks, sorted hits, and entity UUID results. |
| Joint components | Fixed, distance, revolute, prismatic, and spring constraints apply at configured anchors; connected-body collision and slider limits are explicit. |
| ParticleEmitter2D | Rate, burst, lifetime, velocity, gravity, rotation, scale, color, opacity, blend, and coordinate space feed the batched renderer during Play mode. |
| String route and anchors | Straight and normalized manual routes repatch after edit-mode transforms; center/surface/vertex/side anchors follow current geometry. Legacy automatic-curve records remain readable. |
| String stretch/bend/stiffness/damping | Applied by endpoint constraints or every physical-rope segment. Per-link constants are scaled so changing node count does not change the configured whole-string stiffness or damping. |
| String radius/density/collision | Radius controls continuous segment collision and rendered diameter. Linear density controls exact total rope mass. Source bodies are excluded; same-layer third bodies receive equal-and-opposite impulse and friction. |
| String failure tolerances | Configured equivalent masses are compared with calculated stretch/bend force using standard gravity. The selected link breaks and both remaining fragments continue simulating. |
| Bind / FixedJoint2D | Produces one compound motion state with combined mass and parallel-axis inertia. Internal overlap borders and contacts are removed; external impulses move the assembly as one body. |
| Color, texture, opacity | Renderer-only properties; they do not alter mass or collision geometry. |

## Numerical domain

Nova_A uses 64-bit floating-point values across the full frontend/WASM/backend path. Non-finite input is normalized. General physics magnitudes are bounded to ±`1e50`; positive geometry, mass, and density values have a minimum of `1e-6`.

Polygon collision geometry must be convex. The solver uses at least 8 adaptive substeps, up to 128 for fast motion, and 20 sequential impulse iterations per substep. These safeguards reduce tunneling and instability, but Nova_A remains a discrete real-time solver rather than symbolic or infinite-precision physics.
