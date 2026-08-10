**Languages:** [中文](./README.zh-CN.md) | English

# Nova_A Physics & Rendering Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)
[![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://v2.tauri.app/start/prerequisites/)
[![Release](https://img.shields.io/badge/release-1.6.0-63c6ff)]()

Nova_A is an open-source 2D physics engine, renderer, and desktop GUI editor built with Rust, WebAssembly, Vue 3, and Tauri.

Version **1.6.0**, Gameplay Runtime, turns authored scenes into playable projects with deterministic lifecycle hooks, sandboxed Rhai scripts, input actions, timers, collision callbacks, reusable prefabs, and runtime scene transitions.

## What is new in v1.6.0

- A stable gameplay loop calls `awake` and `start` once, `fixed_update` immediately before each physics tick, `update` once per rendered frame, `late_update` afterward, and `on_destroy` before removal. Scaled delta time, fixed delta, elapsed time, frame count, and named pause/resume/repeat timers are available to scripts.
- `Script2D` runs Rhai through the new `nova_script` Rust crate. Scripts can export typed Inspector properties and use a deliberately small entity, transform, rigid-body, input, prefab, timer, and scene API. File, process, network, Tauri, import, and dynamic-evaluation access are not exposed; operation and recursion limits isolate failures to the affected component.
- The project Input Map supports named button, axis, and 2D-vector actions with keyboard, mouse button, wheel, gamepad button, and gamepad axis bindings. Scripts query held, pressed, released, scalar, and vector states without depending on a specific device.
- Collision enter/stay/exit and trigger enter/exit callbacks identify the other entity and provide contact point, normal, and relative velocity. Sensor contacts remain non-physical while still generating trigger events.
- Prefab assets preserve entity hierarchies and internal connections. Drag a prefab into the Scene view to instantiate it; apply base changes, revert an instance, unpack it, or keep per-property overrides while another base instance is updated. Nested prefab inheritance is intentionally not used in v1.6.0.
- Runtime scripts can load or reload scenes by UUID or name and request quit. Entities marked persistent keep their UUID, hierarchy, live component state, and internal connections across scene transitions; stopping Play mode restores the authored project.
- Grid geometry is now rendered behind scene objects instead of through them. Scene and Game share one persistent render surface, preventing dotted transition artifacts, resize flashes, and disappearing output. The Assets toolbar also remains horizontal and scrollable in Chinese and other longer translations.
- Project format 10 persists input actions, `Script2D`, prefab instance metadata, and persistent-entity flags. Rust migration and validation preserve older projects while rejecting invalid input bindings and missing or incorrectly typed asset references.

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

## Physics property binding

Configuration changes cross Vue → `nova_wasm` as explicit retained-world commands. Fixed physics ticks remain inside Rust; reusable Float64 state buffers return runtime transforms and rope state to the renderer without unit conversion or per-body JavaScript object results. One configured world unit equals one meter; camera scale only converts world coordinates to pixels.

## Project compatibility

- New saves use project format 10 and engine version `1.6.0`.
- Persisted scenes, entities, components, and connections use UUIDs; runtime handles are never written to disk.
- Format migration and validation are centralized in `nova_format`, not scattered through editor components.
- v1.5 format-9 files, v1.4 format-8 files, v1.3 format-7 files, v1.2 format-6 files, v1.1.2 format-5 files, older object roots, and legacy top-level entity arrays continue to load. A migrated project is only written in the new format when the user saves it.

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
| Continuous collision, sleeping, freeze rotation | Continuous bodies request adaptive anti-tunneling substeps; eligible resting bodies sleep and wake on impulse; frozen bodies reject torque and angular impulse. |
| String route and anchors | Straight and normalized manual routes repatch after edit-mode transforms; center/surface/vertex/side anchors follow current geometry. Legacy automatic-curve records remain readable. |
| String stretch/bend/stiffness/damping | Applied by endpoint constraints or every physical-rope segment. Per-link constants are scaled so changing node count does not change the configured whole-string stiffness or damping. |
| String radius/density/collision | Radius controls continuous segment collision and rendered diameter. Linear density controls exact total rope mass. Source bodies are excluded; same-layer third bodies receive equal-and-opposite impulse and friction. |
| String failure tolerances | Configured equivalent masses are compared with calculated stretch/bend force using standard gravity. The selected link breaks and both remaining fragments continue simulating. |
| Bind / FixedJoint2D | Produces one compound motion state with combined mass and parallel-axis inertia. Internal overlap borders and contacts are removed; external impulses move the assembly as one body. |
| Color, texture, opacity | Renderer-only properties; they do not alter mass or collision geometry. |

## Numerical domain

Nova_A uses 64-bit floating-point values across the full frontend/WASM/backend path. Non-finite input is normalized. General physics magnitudes are bounded to ±`1e50`; positive geometry, mass, and density values have a minimum of `1e-6`.

Polygon collision geometry must be convex. The solver uses at least 8 adaptive substeps, up to 128 for fast motion, and 20 sequential impulse iterations per substep. These safeguards reduce tunneling and instability, but Nova_A remains a discrete real-time solver rather than symbolic or infinite-precision physics.
