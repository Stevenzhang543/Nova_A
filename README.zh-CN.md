**语言:** [English](./README.md) | 中文

# Nova_A 物理与渲染引擎

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)
[![Platforms](https://img.shields.io/badge/platform-Windows11-lightgrey)]()
[![Status](https://img.shields.io/badge/status-pre--alpha-orange)]()

> **Nova_A 是一个完全开源的 2D 物理引擎、渲染器与图形化编辑器项目，使用 Vue + Rust 从零构建。**  
> 版本：**0.7.3** — 美化编辑器基本框架。

## v0.7.3 新增内容

重大更新 0.7.3！
在这个版本中，用户可自由更改面板大小或隐藏，同时加入了动画效果。

## 构建要求

* 要构建和运行此项目，请确保您已安装以下环境：

* **Node.js**: `v18.0.0` 或更高版本（现代 Vite/Vue 3 项目必备）
* **npm**: `v9.0.0` 或更高版本（或使用替代方案如 `yarn v1.22+` 或 `pnpm v8+`）
* **Vue**: `^3.3.0`（将通过 package.json 自动安装）
* **TypeScript**: `~5.0.0` 或更高版本（将通过 package.json 自动安装）
* **Rust 工具链 (`rustup`, `cargo`, `wasm-pack`)**: *（可选/未来规划）* 仅在后续将 TypeScript 物理核心逻辑移植为 WebAssembly 时需要。

## 构建指南

### 1. 初始化（安装依赖）

* 在首次运行引擎之前，您需要安装所有必需的 node 模块。导航到 `Nova_A` 根目录并运行：

* **npm install pnpm**
* **pnpm install**
* **pnpm install tauri**

### 2. 开发环境构建（本地服务器）
* 启动带有热模块替换 (HMR) 功能的本地开发服务器，以便进行快速迭代测试：

* **pnpm tauri dev**
（如果使用 Vite，通常会在 http://localhost:1420 托管编辑器）。

### 3. 生产环境发布（构建）
* 编译、打包并压缩应用程序，以供生产环境部署使用：

* **pnpm tauri build**
（此命令将生成一个 dist/ 文件夹，其中包含您的静态 HTML、CSS 和经过优化的 JS 资源）。