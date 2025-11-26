# Nova_A 物理与渲染引擎

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)
[![Platforms](https://img.shields.io/badge/platform-Windows11-lightgrey)]()
[![Status](https://img.shields.io/badge/status-pre--alpha-red)]()
[![C++](https://img.shields.io/badge/C++-20-blue?logo=c%2B%2B)]()
[![Renderer](https://img.shields.io/badge/Render-DirectX%20%7C%20Vulkan-lightblue)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

> [!IMPORTANT]  
> **Nova_A 完全开源，并将永久免费。**  
> 项目致力于从零开始构建一个完整的 2D 物理引擎、渲染器和图形化编辑器。

---

## 🌌 项目简介

**Nova_A** 是一个原生 Windows 的 2D 物理引擎与实时渲染器，并包含未来的图形化编辑器。  
其长期目标是构建：

- 图形化可视化编辑器  
- 高性能 2D 物理仿真系统  
- 可扩展 2D 渲染器  
- 自定义资源文件格式（NovaAsset）  
- 完整的底层运行库（C++20）

---

## 🔧 当前版本 — *0.0.0.1 (Nova_A)*

> **预览版（Pre-Alpha） | 基础阶段**

已完成：

- 项目结构与规划  
- C++20 工程初始化  
- 基本模块设计（Core / Math / Platform / Renderer / Physics / Editor）  
- 本 README 文件  

未来将实现：

- 窗口系统  
- 输入管理  
- DX11/12 或 Vulkan 渲染器  
- 基础物理系统  
- GUI 编辑器  
- NovaAsset 管线

---

## 🛠 核心目标

### Physics Engine  
- 刚体  
- AABB/Circle/Polygon 碰撞  
- 碰撞响应  
- 力/力矩系统  

### Rendering Engine  
- 硬件加速绘制  
- 光影  
- 贴图与材质  
- 粒子系统  
- 视频导出  

### GUI Editor  
- 物体编辑、拖拽、旋转、缩放  
- 场景预览  
- 属性面板  
- 粒子/动画编辑  

---

## 📁 目录结构（规划中）

Nova_A/
Core/
Math/
Physics/
Renderer/
Editor/
Assets/
Scripts/
Docs/
README.md

---

## 🚀 Roadmap

### **0.x：基础建设阶段**
- 0.0.x — 工程基础、窗口系统  
- 0.1.x — 数学库、输入系统  
- 0.2.x — 基础渲染  
- 0.3.x — 基础物理  
- 0.4.x — 碰撞系统  
- 0.5.x — GUI 初版  
- 0.9.x — Demo 成品  

### **1.x：完善阶段**
- 粒子、贴图、光影  
- 视频导出  
- 资源系统  

### **2.x+：专业级功能**
- Lua 脚本  
- 编辑器插件  

---

## 📖 文档

所有文档将放在 `/Docs/`。

---

## 🤝 贡献指南

欢迎任何 PR！

---

## 📜 License

Nova_A 使用 **MIT License**。
