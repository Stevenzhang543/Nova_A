**语言:** [English](./README.md) | 中文

# Nova_A 物理与渲染引擎

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)
[![Platforms](https://img.shields.io/badge/platform-Windows11-lightgrey)]()
[![Status](https://img.shields.io/badge/status-pre--alpha-orange)]()
[![C++](https://img.shields.io/badge/C++-20-blue?logo=c%2B%2B)]()

> **Nova_A 是一个完全开源的 2D 物理引擎、渲染器与图形化编辑器项目，使用 C++20 从零构建。**  
> 版本：**0.0.2.4** — 已集成 OpenGL、GLFW、ImGui；实现基础编辑器GUI。

## v0.0.1.2 新增内容

- 使用 GLAD 初始化 OpenGL 上下文。  
- 使用 GLFW 创建窗口并实现主循环。  
- 集成 ImGui（GLFW + OpenGL3 后端）用于编辑器 GUI。  
- 添加基础渲染抽象 `Renderer`（清屏、混合等）。  
## 快速构建

前置条件：
- Windows 11
- Visual Studio 2026（或 MSVC 工具链）
- CMake 3.20+
- （可选）Ninja

构建命令：

mkdir build
cd build
cmake ..
cmake --build . --config Release
运行：

./Editor/Release/Editor.exe（或在 Visual Studio 中直接运行）

项目目录概览

Nova_A/
Engine/
Editor/
CMakeLists.txt
README.md

后续计划
Shader 管线与三角形渲染（v0.0.2.x）

Sprite 批处理与纹理加载

物理核心（v0.1.x）

编辑器变换控件、场景图、资源系统

欢迎贡献 — 参见 CONTRIBUTING.md。

---

## 最后：如何立即运行（步骤汇总）

1. 把上面的文件放到对应路径（注意大小写、路径准确）  
2. 确保 `Engine/External/glad/include` 和 `Engine/External/glad/src/glad.c` 存在（你之前已经配置）。  
3. 在仓库根目录运行：

```bash
mkdir build
cd build
cmake ..            # 如果你想用 Ninja: cmake -G Ninja ..
cmake --build . --config Debug
或在 Visual Studio 打开根目录（CMakeTargets）并选择 Editor 运行目标。

运行 Editor.exe，你应该会看到：

一个窗口弹出

ImGui demo/示例窗口（以及主 UI 窗口 “Nova_A - v0.0.1.2”）

顶部显示 OpenGL 版本（Console 输出）
