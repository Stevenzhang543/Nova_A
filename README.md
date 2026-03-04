**Languages:** [中文](./README.zh-CN.md) | English

# Nova_A Physics & Rendering Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)
[![Platforms](https://img.shields.io/badge/platform-Windows11-lightgrey)]()
[![Status](https://img.shields.io/badge/status-alpha-orange)]()


> **Nova_A is a fully open-source 2D physics engine, renderer, and GUI editor project built from scratch using Rust + Vue 3.**  
> Version: **0.7.0** — Initialize editor panel.

## What’s new in v0.7.0

Huge update 0.7!
In this version, the project structure has been completely revised.
All files have been moved to the root directory. 
At the same time, some vulnerabilities have been fixed.

## Build Requirements

To build and run this project, ensure you have the following environments installed:
* **Node.js**: `v18.0.0` or higher (Required for modern Vite/Vue 3 setups)
* **npm**: `v9.0.0` or higher (Alternatively, `yarn v1.22+` or `pnpm v8+`)
* **Vue**: `^3.3.0` (Resolved automatically via package.json)
* **TypeScript**: `~5.0.0` or higher (Resolved automatically via package.json)
* **Rust Toolchain (`rustup`, `cargo`, `wasm-pack`)**: *(Optional/Planned)* Required only when porting the TypeScript physics engine logic into WebAssembly.

## Build Guide

### 1. Initialization (Install Dependencies)
* Before running the engine for the first time, you need to install all required node modules. Navigate to the `Nova_A` root directory and run:

* **npm install pnpm**
* **pnpm install**
* **pnpm install tauri**

### 2. Development Build (Local Server)
* to start a local development server with Hot-Module Replacement (HMR) for fast iterative testing:

* **pnpm tauri dev**
(This will typically host the editor at http://localhost:1420 if using Vite).

## 3. Production Release (Build)
* To compile, bundle, and minify the application for production deployment:

* **pnpm tauri build**
(This will generate a dist/ folder containing your static HTML, CSS, and optimized JS assets).