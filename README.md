**Languages:** [中文](./README.zh-CN.md) | English

# Nova_A Physics & Rendering Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)
[![Platforms](https://img.shields.io/badge/platform-Windows11-lightgrey)]()
[![Status](https://img.shields.io/badge/status-pre--alpha-orange)]()
[![C++](https://img.shields.io/badge/C++-20-blue?logo=c%2B%2B)]()


> **Nova_A is a fully open-source 2D physics engine, renderer, and GUI editor project built from scratch using C++20.**  
> Version: **0.0.1.4** — OpenGL + GLFW + ImGui integrated; basic editor loop.

## What’s new in v0.0.1.4

- OpenGL (via GLAD) initialization and context creation.
- GLFW window creation and robust main loop.
- ImGui integration (GLFW + OpenGL3 backend) for editor UI.
- Simple rendering abstraction (Renderer) with clear function and GL state.
- Light-weight Input helpers and application lifecycle with `OnInit/OnUpdate/OnRender` hooks.

## Quick Start (build)

Prerequisites:
- Windows 11
- Visual Studio 2026 (or MSVC toolchain)
- CMake 3.20+
- (Optional) Ninja

Build:
```bash
mkdir build
cd build
cmake ..
cmake --build . --config Release
Run:

./Editor/Release/Editor.exe (or use Visual Studio run)

Project layout

Engine/        # Core engine: Window, Application, Renderer, GLAD, ImGui integration
Editor/        # Editor executable (uses Engine)
CMakeLists.txt
README.md

Next steps (planned)
Basic shader pipeline & triangle rendering (v0.0.2.x)

Sprite batching & texture loading

Minimal physics core (v0.1.x)

Editor gizmos, scene graph, asset pipeline

Contributions welcome — see CONTRIBUTING.md