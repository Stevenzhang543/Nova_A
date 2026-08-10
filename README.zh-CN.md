**语言：** 中文 | [English](./README.md)

# Nova_A 物理与渲染引擎

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)
[![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://v2.tauri.app/start/prerequisites/)
[![Release](https://img.shields.io/badge/release-1.6.0-63c6ff)]()

Nova_A 是一款开源 2D 物理引擎、渲染器和桌面 GUI 编辑器，使用 Rust、WebAssembly、Vue 3 与 Tauri 构建。

版本 **1.6.0**（Gameplay Runtime）加入确定性的生命周期、沙箱化 Rhai 脚本、输入操作、计时器、碰撞回调、可复用预制体和运行时场景切换，让编辑后的场景可以直接成为可玩的项目。

## v1.6.0 更新内容

- 稳定的游戏循环会依次调用一次 `awake` 与 `start`，在每个物理步前调用 `fixed_update`，每个显示帧调用 `update`，随后调用 `late_update`，并在对象销毁前调用 `on_destroy`。脚本可读取缩放后的帧间隔、固定步长、已运行时间和帧数，也可创建支持暂停、恢复和重复的命名计时器。
- `Script2D` 通过新增的 Rust `nova_script` crate 运行 Rhai。脚本可向 Inspector 导出带类型的属性，并使用受控的实体、变换、刚体、输入、预制体、计时器和场景 API。文件、进程、网络、Tauri、导入和动态求值能力均未暴露，并通过操作数与递归深度限制把错误隔离到当前组件。
- 项目输入映射支持命名按钮、轴和二维向量操作，可绑定键盘、鼠标按键、滚轮、手柄按钮和手柄轴。脚本可以查询按住、刚按下、刚松开、标量与向量状态，而无需依赖某个具体设备。
- 碰撞进入、保持、退出与触发器进入、退出回调会提供另一个实体、接触点、法线和相对速度。传感器仍不施加物理冲量，但会产生触发器事件。
- 预制体资源可保存实体层级及其内部连接。把预制体拖入 Scene 视图即可实例化；可以把实例改动应用到基准、还原、解除预制体，或在基准更新时保留每个实例的属性覆盖。v1.6.0 有意不提供嵌套预制体继承。
- 运行时脚本可按 UUID 或名称加载、重载场景并请求退出。标记为跨场景保留的实体会保留 UUID、层级、实时组件状态和内部连接；停止 Play 模式后仍会恢复编辑时的项目。
- 网格现在在场景对象后方渲染，不再切穿对象。Scene 与 Game 共用一个持久渲染表面，消除了白点状切换残影、尺寸闪动和画面消失。Assets 工具栏在中文等较长翻译下保持横排并可水平滚动。
- 项目格式 10 会保存输入操作、`Script2D`、预制体实例元数据和跨场景标记。Rust 中央迁移与验证继续兼容旧项目，同时拒绝无效输入绑定以及缺失或类型错误的资源引用。

### 编辑器快捷键

| 快捷键 | 操作 |
| --- | --- |
| `Q` / `W` / `E` / `R` | 选择 / 移动 / 旋转 / 缩放 |
| `Ctrl/Cmd+Z`、`Ctrl/Cmd+Shift+Z` | 撤销 / 重做 |
| `Ctrl/Cmd+C`、`Ctrl/Cmd+V`、`Ctrl/Cmd+D` | 复制 / 粘贴 / 重复所选子树 |
| `Delete`、`F2` | 删除选择 / 重命名主选择 |
| `Ctrl/Cmd+S` | 保存项目 |

## 引擎工作区

```text
Vue 编辑器
  └─ nova_wasm        唯一 WebAssembly 边界
       ├─ nova_runtime  固定时间、事件、诊断、运行时骨架
       │    └─ nova_physics  刚体、碰撞、求解器、绳、持久化世界
       │         └─ nova_math  向量、变换、AABB、射线、矩形
       ├─ nova_script   沙箱化 Rhai 游戏脚本执行
       └─ nova_format   版本化格式、验证与迁移
```

物理、数学、运行时、脚本和格式 crate 不导入 Vue、DOM、JavaScript 或 Tauri。内部 crate 采用静态链接，因此桌面发布仍是一个完整应用，不需要 Nova_A DLL 插件。

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

这些命令依次运行全部 workspace 测试（包括完整物理测试套件）、将警告视为错误的代码检查、Vue/TypeScript 类型检查、Release WASM 和优化后的 Vite 前端构建。

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

- 新存档使用项目格式 10 与引擎版本 `1.6.0`。
- 持久化场景、对象、组件和连接使用 UUID；运行时句柄绝不会写入磁盘。
- 格式迁移与验证集中在 `nova_format`，不会散落在各个编辑器组件中。
- v1.5 格式 9、v1.4 格式 8、v1.3 格式 7、v1.2 格式 6、v1.1.2 格式 5、更早的对象根节点和旧顶层实体数组仍能加载；只有用户再次保存时才会写成新格式。

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
