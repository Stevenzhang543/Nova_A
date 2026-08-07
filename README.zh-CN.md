**语言：** 中文 | [English](./README.md)

# Nova_A 物理与渲染引擎

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)
[![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://v2.tauri.app/start/prerequisites/)
[![Release](https://img.shields.io/badge/release-1.3.0-63c6ff)]()

Nova_A 是一款开源 2D 物理引擎、渲染器和桌面 GUI 编辑器，使用 Rust、WebAssembly、Vue 3 与 Tauri 构建。

版本 **1.3.0**（Scene & Component System）在 v1.2 持久化运行时上建立了第一套可用的游戏引擎对象模型。现有绘制、渲染、连接、物理属性、主题、翻译、菜单、动画与编辑手势全部保留。

## v1.3.0 更新内容

- 对象不再由单一巨型类保存全部数据，而是由 UUID 组件组成。每个对象必须拥有 `Transform2D`；`ShapeRenderer2D`、`RigidBody2D` 与对应的 Collider2D 均可在检查器中启用、重置、移除、复制、粘贴和恢复。
- 父子变换会保持世界位置、旋转与缩放；编辑器和 Rust 存档验证都会拒绝循环父级，场景侧栏会显示层级结构。
- 渲染排序层与物理层完全分离。碰撞器拥有独立偏移、旋转、传感器、材质、32 位碰撞掩码，以及项目级对称 32×32 碰撞矩阵。
- `RigidBody2D` 提供动态/运动学/静态、自动/手动质量、自动/手动转动惯量、连续/离散碰撞、休眠、锁定旋转、阻尼、重力、力与诊断；每项配置都会通过 Float64 ABI 进入 Rust 求解器。
- 项目现在可以包含多个命名场景；场景管理器可以创建、激活、加载、卸载和重新加载场景，并分别保存对象、组件、连接、渲染层与物理设置。
- 项目格式 7 保存标准场景与组件记录。Rust 中央迁移器会把格式 6 及更早的单体对象、数字 ID 和旧 `Connection` 自动迁移为 UUID `Rope2D` 或 `FixedJoint2D`。
- 绑定重叠对象会生成刚性组合体：编辑拖动会移动整个连接组；物理会排除所有内部接触并通过固定关节分配外部碰撞冲量；渲染只绘制并集外轮廓，不再显示内部重叠边线。
- 回归测试覆盖组件身份、场景生命周期、项目迁移、碰撞掩码、连续碰撞、休眠/唤醒、锁定旋转、组合体质量与变换、物理绳、单位比例和持久化运行时。

## 引擎工作区

```text
Vue 编辑器
  └─ nova_wasm        唯一 WebAssembly 边界
       ├─ nova_runtime  固定时间、事件、诊断、运行时骨架
       │    └─ nova_physics  刚体、碰撞、求解器、绳、持久化世界
       │         └─ nova_math  向量、变换、AABB、射线、矩形
       └─ nova_format   版本化格式、验证与迁移
```

物理、数学、运行时和格式 crate 不导入 Vue、DOM、JavaScript 或 Tauri。内部 crate 采用静态链接，因此桌面发布仍是一个完整应用，不需要 Nova_A DLL 插件。

## 支持的构建目标

- 浏览器预览：支持 WebAssembly 的当前 Chromium、Firefox 和 Safari。
- 桌面端：Tauri 2 及其系统 WebView 支持的 Windows、macOS 与 Linux。
- 建议在目标操作系统上构建对应安装包：Windows 生成 NSIS/MSI，macOS 生成 app/DMG，Linux 生成当前 Tauri 工具链支持的包格式。

Nova_A 当前是桌面/网页编辑器；仓库尚未配置 Android 与 iOS 应用目标。

## 通用环境要求

- Node.js 18 或更高版本（`.node-version` 记录了测试版本）。
- pnpm 9 或更高版本（`package.json` 固定了项目使用的包管理器版本）。
- 稳定版 Rust 与 Cargo。
- Rust 的 `wasm32-unknown-unknown` 目标。
- `wasm-pack` 0.14.0 或更高版本。
- Git 以及当前系统需要的原生开发依赖。

安装通用工具与项目依赖：

```sh
corepack enable
corepack prepare pnpm@10.30.0 --activate
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --version 0.14.0 --locked
pnpm install --frozen-lockfile
```

如已安装 `wasm-pack` 0.14.0 或更高版本，可跳过对应命令。Rust 官方的 [`wasm32-unknown-unknown` 说明](https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-unknown-unknown.html)包含目标安装方法。

### 操作系统依赖

请以最新的 [Tauri 官方环境要求](https://v2.tauri.app/start/prerequisites/)为准。

- Windows：安装 Microsoft C++ Build Tools，并选择“使用 C++ 的桌面开发”。Tauri 使用 WebView2；当前 Windows 10/11 通常已自带。生成 MSI 时可能还需要启用 Windows 的 VBSCRIPT 可选功能。
- macOS 10.15 或更高版本：安装 Xcode；仅开发桌面应用时也可安装 Xcode Command Line Tools，并完成首次初始化。
- Debian/Ubuntu Linux：

```sh
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Arch、Fedora、openSUSE、Alpine、NixOS 等系统请直接使用 Tauri 官方页面中的对应包名，不要套用 Debian 包名。

## 构建与运行

以下命令均在仓库根目录执行。

### 浏览器开发模式

```sh
pnpm dev
```

该命令会先重新构建开发版 WASM，再启动 Vite，避免浏览器加载过期的 Rust 模块。默认地址通常为 `http://localhost:1420`。

### 原生桌面开发模式

```sh
pnpm tauri dev
```

### 完整验证

```sh
pnpm test:core
cargo clippy --workspace --all-targets -- -D warnings
pnpm check
pnpm build
```

这些命令依次运行全部 workspace 测试（包括原有 40 项物理测试）、将警告视为错误的代码检查、Vue/TypeScript 类型检查、Release WASM 和优化后的 Vite 前端构建。

### 浏览器生产预览

```sh
pnpm build
pnpm preview
```

### 原生发布包

```sh
pnpm tauri build
```

Tauri 打包前会自动执行 `pnpm build`。不同系统的结果通常位于 `src-tauri/target/release/bundle/` 下。

## 物理属性绑定情况

配置变化会通过 Vue → `nova_wasm` 以明确的持久化世界命令传入。固定物理步保留在 Rust 内；复用的 Float64 状态缓冲区把运行时变换和绳状态返回渲染器，不进行隐藏单位换算，也不会为每个刚体创建 JavaScript 返回对象。一个配置世界单位严格等于一米；相机缩放只负责将世界坐标转换为像素。

## 项目兼容性

- 新存档使用项目格式 7 与引擎版本 `1.3.0`。
- 持久化场景、对象、组件和连接使用 UUID；运行时句柄绝不会写入磁盘。
- 格式迁移与验证集中在 `nova_format`，不会散落在各个编辑器组件中。
- v1.2 格式 6、v1.1.2 格式 5、更早的对象根节点和旧顶层实体数组仍能加载；只有用户再次保存时才会写成新格式。

| 属性 | 求解器/渲染行为 |
| --- | --- |
| 位置、旋转、尺寸 | 直接用于世界变换、碰撞几何、锚点和渲染。 |
| 线速度、角速度 | 每个子步积分并回传渲染器。 |
| 加速度 | 直接加入动态刚体的线加速度。 |
| 密度与质量 | 密度 × 精确形状面积得到质量；编辑质量会同步更新密度。 |
| 自动/手动转动惯量 | 默认使用精确椭圆或凸多边形公式；关闭自动计算后严格使用手动值。 |
| 全局/局部重力与重力倍率 | 每个动态刚体子步都会组合并应用。 |
| 力与扭矩 | 遵循 `F = ma` 与 `τ = Iα`；偏心冲量也会产生角冲量。 |
| 线性/角/空气阻尼 | 每个稳定子步执行指数衰减。 |
| 静态/运动学刚体 | 静态刚体保持固定；运动学刚体只积分配置速度，不受动态力影响。 |
| 恢复系数与阈值 | 只有闭合速度超过阈值时才产生反弹。 |
| 静摩擦/动摩擦 | 顺序冲量先尝试静摩擦，再限制为动摩擦。 |
| 传感器 | 刚体之间会报告重叠诊断但不施加碰撞冲量；物理绳会穿过仅传感器对象。 |
| 渲染排序层/顺序 | 只控制绘制顺序，绝不会改变碰撞行为。 |
| 物理层/掩码/矩阵 | 仅当双方碰撞掩码与项目碰撞矩阵都允许该层组合时才求解接触；零掩码会明确禁用全部接触。 |
| 碰撞器偏移/旋转/形状 | 碰撞几何与渲染几何独立，使用自己的局部变换、材质、传感器状态和形状。 |
| 连续碰撞、休眠、锁定旋转 | 连续刚体会请求自适应防穿透子步；静止刚体可休眠并在冲量到达时唤醒；锁定刚体拒绝扭矩和角冲量。 |
| 绳路径与锚点 | 直线和归一化手绘路径会在编辑变换后重新拼接；中心/表面/顶点/边上点锚点跟随当前几何。旧版自动曲线记录仍可读取。 |
| 绳的伸长、弯曲、刚度、阻尼 | 作用于两端约束或每个物理绳分段；每段常数按节点数缩放，因此改变采样数不会改变整条绳的配置刚度或阻尼。 |
| 绳半径、线密度、碰撞 | 半径控制连续线段碰撞和渲染直径；线密度控制精确总质量；排除源对象，并向同图层第三方对象传递大小相等、方向相反的冲量与摩擦。 |
| 绳断裂承重 | 配置的等效质量会使用标准重力与实际伸长/弯曲力比较；过载线段断开后，两段残绳继续模拟。 |
| 绑定 / FixedJoint2D | 使用合并质量和平行轴转动惯量生成同一个组合体运动状态；移除内部重叠边线与接触，外部冲量会带动整个组合体。 |
| 颜色、纹理、透明度 | 仅影响渲染，不改变质量或碰撞几何。 |

## 数值范围

Nova_A 在前端、WASM 和后端完整路径中使用 64 位浮点数。非有限输入会被规范化。一般物理量限制为 ±`1e50`；正的几何尺寸、质量与密度下限为 `1e-6`。

多边形碰撞几何必须保持凸形。求解器至少使用 8 个自适应子步，高速运动时最多 128 个，并在每个子步进行 20 次顺序冲量迭代。这些措施可减少穿透和不稳定，但 Nova_A 仍是离散实时求解器，不是符号或无限精度物理系统。
