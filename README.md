**Languages:** [中文](./README.zh-CN.md) | English

# Nova_A Physics & Rendering Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)
[![Platforms](https://img.shields.io/badge/platform-Windows11-lightgrey)]()
[![Status](https://img.shields.io/badge/status-alpha-orange)]()


> **Nova_A is a fully open-source 2D physics engine, renderer, and GUI editor project built from scratch using Rust + Vue 3.**  
> Version: **0.9.6** — TRUE **physics**.

# What’s new in v0.9.6

Huge update!
In this version, physical properties have been finally added. For more information, scroll down and find the "physical properties" section.
Meanwhile, fully functioning top bar with "save and import" functions has been introduced.
The renderer panel has been officially put into use. Users could freely check and preview animations.


## Build Requirements

  To build and run this project, ensure you have the following environments installed:
* **Node.js**: `v18.0.0` or higher (Required for modern Vite/Vue 3 setups)
* **npm**: `v9.0.0` or higher (Alternatively, `yarn v1.22+` or `pnpm v8+`)
* **Vue**: `^3.3.0` (Resolved automatically via package.json)
* **TypeScript**: `~5.0.0` or higher (Resolved automatically via package.json)
* **Cargo**: `1.71.0` or higher. Cargo edition 2021.
* **WASM-pack**: `1.71.0` or higher (automatically installed with cargo)

## Build Guide

### 1. Initialization (Install Dependencies)
  Before running the engine for the first time, you need to install all required node modules. Navigate to the `Nova_A` root directory and run:

* **npm install pnpm**
* **pnpm install**
* **pnpm install tauri**

### 2. Initialization (build backend engine)
  Navigate to the Nova_A\nova_core directory and run:

* **wasm-pack build --target web**

### 3. Development Build (Local Server)
  to start a local development server with Hot-Module Replacement (HMR) for fast iterative testing:

* **pnpm tauri dev**
(This will typically host the editor at http://localhost:1420 if using Vite).

### 4. Production Release (Build)
  To compile, bundle, and minify the application for production deployment:

* **pnpm tauri build**
(This will generate a dist/ folder containing your static HTML, CSS, and optimized JS assets).


## physical properties

### TRANSFORM

  **Position**
    Where the object is on the screen. Imagine placing a toy on a table — you choose how far left/right (x) and up/down (y) it sits. Range: infinite*.
  **Rotation**
    How much the object is turned. Like rotating a book on a desk. 0° means normal, 90° means sideways. Range: -180 to 180 degrees.

### MOTION

  **Linear Velocity**
    How fast and in what direction the object moves. Like throwing a ball — it travels forward and maybe upward. Range: infinite*.
  **Angular Velocity**
    How fast the object spins. Like a spinning coin. Positive spins one way, negative the other. Range: infinite*.
  **Linear Damping**
    Slows down movement over time, like air resistance. Higher values make objects stop faster. Range: 0 to 1.
  **Angular Damping**
    Slows down spinning over time, like friction in a wheel. Range: 0 to 1.

### MASS & PHYSICAL BEHAVIOR

  **Mass**
    How heavy the object is. Heavier objects are harder to push. Like comparing a feather to a rock. Range: 0.1 to 100.
  **Moment of Inertia**
    How hard it is to spin the object. A long stick is harder to rotate than a small ball. Automatically calculated.
  **Gravity Scale**
    Controls how much gravity affects the object. 1 means normal gravity, 0 means floating, 2 means falling faster. Range: 0 to 5.

### FORCES

  **Force**
    A push applied to the object. Like pushing a box — stronger pushes make it move faster. Range: infinite* (x and y).
  **Torque**
    A twisting force that makes the object spin. Like pushing a door at its edge. Range: infinite*.

### SHAPE & SIZE

  **Size / Radius**
    How big the object is. Bigger objects collide sooner and take up more space. Range: infinite*.

### MATERIAL

  **Restitution**
    How bouncy the object is. 0 means no bounce (like clay), 1 means very bouncy (like a rubber ball). Range: 0 to 1.
  **Static Friction**
    How hard it is to start moving when touching another surface. Like trying to push a heavy box that doesn’t want to move. Range: 0 to 1.
  **Dynamic Friction**
    How much the object resists sliding once it is already moving. Like sliding on ice versus sandpaper. Range: 0 to 1.

### COLLISION STATE

  **Is Static**
    If turned on, the object cannot move at all. Like a wall or the ground.
  **Is Kinematic**
    The object moves only when you control it, not by physics. Like a moving platform in a game.

## RENDERING

  **Color (RGB)**
    The color of the object using red, green, and blue values. Like mixing paints. Each value controls how much of that color is shown. Range: 0 to 255 for each (R, G, B).
  **Transparency (Alpha)**
    How see-through the object is. 0 means completely invisible, 1 means fully solid. Range: 0 to 100.

**Note: for "infinite" mentioned in this file, it stands for the largest float number vue3 could handle. Numbers excluded in the followings will be ignored. -179769313486231570814527423731704356798070567525844996598917476803157260780028538760589558632766878171540458953514382464234321326889464182768467546703537516986049910576551282076245490090389328944075868508455133942304583236903222948165808559332123348274797826204144723168738177180919299881250404026184124858368
to
179769313486231570814527423731704356798070567525844996598917476803157260780028538760589558632766878171540458953514382464234321326889464182768467546703537516986049910576551282076245490090389328944075868508455133942304583236903222948165808559332123348274797826204144723168738177180919299881250404026184124858368