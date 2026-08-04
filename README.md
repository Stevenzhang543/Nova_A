**Languages:** [中文](./README.zh-CN.md) | English

# Nova_A Physics & Rendering Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)
[![Platforms](https://img.shields.io/badge/platform-Windows11-lightgrey)]()
[![Release](https://img.shields.io/badge/release-0.12.0-6ea8fe)]()


> **Nova_A is a fully open-source 2D physics engine, renderer, and GUI editor project built from scratch using Rust + Vue 3.**  
> Version: **0.12.0** — modern editor, localized workflow, and physical connections.

# What’s new in v0.12.0

* New adaptive dark and light palettes, modern layered controls, responsive animation, compact/high-contrast/reduced-motion options, and renderer quality controls.
* Complete editor localization in English, German, and Simplified Chinese.
* Multi-object physical strings/links with surface, vertex, side, or center anchors; straight, curved, and manually drawn routes; elastic/rigid behavior; damping; and deterministic bend/stretch overload failure.
* Local autosave, grid snapping, zoom sensitivity, configurable new-object defaults, and safer destructive actions.
* Project format v2 persists connection data while remaining compatible with older entity-only scene files.


## Build Requirements

  To build and run this project, ensure you have the following environments installed:
* **Node.js**: `v18.0.0` or higher (`22.22.2` is recorded in `.node-version`)
* **pnpm**: `v9.0.0` or higher (`10.30.0` is recorded in `package.json`)
* **Rust/Cargo**: current stable toolchain with the `wasm32-unknown-unknown` target (recorded in `rust-toolchain.toml`)
* **wasm-pack**: `0.14.0` or higher (installed separately; it is not bundled with Cargo)
* **Windows desktop builds**: Microsoft C++ Build Tools and WebView2

## Build Guide

### 1. Initialization (Install Dependencies)
  Before running the engine for the first time, you need to install all required node modules. Navigate to the `Nova_A` root directory and run:

```powershell
corepack enable
corepack prepare pnpm@10.30.0 --activate
pnpm install --frozen-lockfile
cargo install wasm-pack --version 0.14.0 --locked
```

If `wasm-pack` is already installed, skip its installation command.

### 2. Development Build (Local Server)
  to start a local development server with Hot-Module Replacement (HMR) for fast iterative testing:

```powershell
pnpm tauri dev
```

The development command regenerates `nova_core/pkg` from the Rust source before Vite starts, so the browser cannot silently use a stale WASM build.
(This will typically host the editor at http://localhost:1420 if using Vite).

### 3. Production Release (Build)
  To compile, bundle, and minify the application for production deployment:

```powershell
pnpm tauri build
```

The production command rebuilds release WASM, type-checks Vue/TypeScript, then bundles the frontend and Tauri application.
(This will generate a dist/ folder containing your static HTML, CSS, and optimized JS assets).

### 4. Validation

```powershell
pnpm test:core
pnpm check
pnpm build
```


## physical properties

### TRANSFORM

  **Position**
    Where the object is on the screen. Imagine placing a toy on a table — you choose how far left/right (x) and up/down (y) it sits. Range: finite values up to the numeric limits below.
  **Rotation**
    How much the object is turned. Like rotating a book on a desk. 0° means normal, 90° means sideways. Range: -180 to 180 degrees.

### MOTION

  **Linear Velocity**
    How fast and in what direction the object moves. Like throwing a ball — it travels forward and maybe upward. Range: finite values up to the numeric limits below.
  **Angular Velocity**
    How fast the object spins. Like a spinning coin. Positive spins one way, negative the other. Range: finite values up to the numeric limits below.
  **Linear Damping**
    Slows down movement exponentially over time, like air resistance. Higher values make objects stop faster. Range: 0 or greater.
  **Angular Damping**
    Slows down spinning exponentially over time, like friction in a wheel. Range: 0 or greater.

### MASS & PHYSICAL BEHAVIOR

  **Mass**
    How heavy the object is. Heavier objects are harder to push. Like comparing a feather to a rock. Range: positive finite values.
  **Moment of Inertia**
    How hard it is to spin the object. A long stick is harder to rotate than a small ball. Automatically calculated from the exact ellipse or convex-polygon geometry by default, with an optional manual value.
  **Gravity Scale**
    Controls how much gravity affects the object. 1 means normal gravity, 0 means floating, 2 means falling faster, and negative values reverse it. Range: finite values.

### FORCES

  **Force**
    A push applied to the object. Like pushing a box — stronger pushes make it move faster. Range: finite values up to the numeric limits below (x and y).
  **Torque**
    A twisting force that makes the object spin. Like pushing a door at its edge. Range: finite values up to the numeric limits below.

### SHAPE & SIZE

  **Size / Radius**
    How big the object is. Bigger objects collide sooner and take up more space. Range: positive finite values within the numeric limits below.

### MATERIAL

  **Restitution**
    How bouncy the object is. 0 means no bounce (like clay), 1 means very bouncy (like a rubber ball). Range: 0 to 1.
  **Static Friction**
    How hard it is to start moving when touching another surface. Like trying to push a heavy box that doesn’t want to move. Range: 0 or greater.
  **Dynamic Friction**
    How much the object resists sliding once it is already moving. Like sliding on ice versus sandpaper. Range: 0 or greater.

### CONNECTIONS

  **Strings and links**
    Two or more objects can be connected at their center, surface, polygon vertex, or a point along a polygon side. A connection is solved at the actual rotating anchor points, so its linear and angular impulses affect both bodies.
  **Stretch and bend behavior**
    A non-stretching bendable string is a unilateral distance constraint: it resists separation but can go slack. A non-bendable link behaves as a rod and also resists compression. Stretchable links use damped Hooke tension. Bend and stretch overload thresholds use the maximum attached body mass and persist a snapped/torn state in the project.

### COLLISION STATE

  **Is Static**
    If turned on, the object cannot move at all. Like a wall or the ground.
  **Is Kinematic**
    The object moves only when you control it, not by physics. Like a moving platform in a game.

## RENDERING

  **Color (RGB)**
    The color of the object using red, green, and blue values. Like mixing paints. Each value controls how much of that color is shown. Range: 0 to 255 for each (R, G, B).
  **Transparency (Alpha)**
    How see-through the object is. 0 means completely invisible, 100 means fully solid. Range: 0 to 100.

**Numeric limits:** Nova_A uses 64-bit floating-point values through the full Vue → WASM → Rust → Vue path. Non-finite input is rejected or normalized. Physics magnitudes are bounded to ±`1e50`, and positive geometry/mass/density values have a minimum of `1e-6`; these limits prevent overflow in higher-order collision and inertia calculations.

**Simulation domain:** Polygon collision geometry must be convex (the editor preserves convexity automatically). The solver uses 8–128 adaptive substeps and 20 sequential impulse iterations per substep. The cap protects the UI from unbounded work; motion that exceeds the adaptive travel budget can still tunnel, so “finite and accepted” does not mean that arbitrarily extreme velocity/timestep/size combinations are numerically resolvable. Like every discrete real-time engine, Nova_A approximates continuous motion—it does not claim symbolic or infinite-precision physics.
