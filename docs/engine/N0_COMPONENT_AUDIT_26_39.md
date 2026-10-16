# N0 组件与编辑工作流审计 — 26.39 轮次

**依据：** `Nova_A_Components_LowLatency_Godot_Workflow_Iteration_Prompt.md`（1180 行，已完整读取）§0、§3、§26.1、§32 N0。
**性质：** 只读审计。本文件是本轮唯一新增的状态报告；未修改任何业务代码、配置、锁文件或上一轮冻结产物。
**审计日期：** 2026-10-16。

---

## 1. 基线与可定位快照

| 项 | 实际值 |
|---|---|
| 最后提交 commit | `82c9c03118848df1c07af323c38a3abade7dd21b`（`update v26.37`，分支 `main`） |
| 工作区状态 | 189 modified + 342 untracked = **532** 项未提交 |
| 冻结源码快照 | `.cache/release-snapshots/v26.38`，`sourceInputDigest = 163874df1be91e24…`，**4093** 文件 |
| 结构化证据 | `release-audits/evidence-v26.38`，同一 digest，`localReportAuthorities.status = passed`，48 项 |
| 已发布发行包 | `releases/v26.38`，**11** 个文件，独立校验 `Status: passed`（RootFiles 11 / PayloadChecksums 10 / WebFiles 277 / ReferenceProjects 272 / EvidenceFiles 63 / PortableProductVersion 26.38.0） |

**工作区与冻结快照的逐文件差异（`releaseSourceInventory` 实测，非推断）：**

- **新增 1**：`Nova_A_Components_LowLatency_Godot_Workflow_Iteration_Prompt.md`（本轮主指令，用户新增）
- **移除 2**：`Nova_A_Engine_Runtime_Player_Overhaul_Prompt_Expanded.md`、`new.py`（用户移除；已确认磁盘上不存在）
- **内容变更 0**：其余 **4090 个共享源文件逐字节未变**

结论：当前工作区**就是**已发布 26.38 的源码，仅被用户替换了主指令文件。这是一份干净、可定位、可复核的起点；`release-source-snapshot.mjs --verify` 因上述 3 处文件增删而按设计判为 "Source changed"（该检查的对象是 26.38 那次冻结，不应在本轮被修改或重新冻结）。

---

## 2. 上游交接门槛核查（主指令 §0.2 五条）

| # | 门槛 | 判定 | 证据 / 缺口 |
|---|---|---|---|
| 1 | Editor / Runtime / Player 入口与依赖方向已确定 | **PARTIAL** | 入口存在：`index.html`→`src/main.ts`→`App.vue`→`EditorLayout.vue`；`player.html`→`src/player.ts`→`PlayerApp.vue`；Runtime 核心 `src/runtime/GameplayRuntimeCore.ts`；Renderer 独立入口 `src/renderer/core.ts`。仓库自带边界门禁 `scripts/audit-engine-boundaries.mjs` 与 `audit-engine-source-boundaries.mjs`。**缺口：** `src/player.ts` 仍为 Vue 安装状态适配器并自注 "remains an M1 migration gap"；`PlayerApp.vue` 仍 import `components/WorldCanvas.vue`、`store/editor`、`store/physics`、`editor/runtimeWorldHostPlatformAdapter`、`assets/AssetDatabase`。依赖方向**未真正分离**。 |
| 2 | 世界所有权、事务接口、输入与渲染数据边界有版本且可用 | **PARTIAL** | 存在：`runtimeWorldHost.ts`、`runtimeWorldHostContracts.ts`、`worldGameplayOwner.ts`（Owner 端口）、`sceneInstances`/`prefabs`、`nova-pak` 版本化包、帧协议常量。26.38 十四门禁全通过（wasm/web/typescript/focus/windows/headless 等）证明当前契约可运行。**缺口：** 未找到单一的公开"事务接口版本表"；Type Registry / 属性 schema 层尚不存在（见 §5）。 |
| 3 | 最小真实 Player 能启动、加载项目、处理输入、渲染及播放音频 | **VERIFIED** | 26.38 门禁实测：`windows-smoke`（编辑器与导出游戏保持存活）、`build/headless-authority.json`（导出无头服务器 + UDP 回环 首次连接/错误会话拒绝/重连 `traffic.status=passed`）、`static-host-user`（根/子目录真实部署、下载游戏启动、Unicode+空格路径迁移后重开）、`reference-game`（真实完成 6 检查点与 R 重开）。音频为受控宿主证据，非物理声学验收。 |
| 4 | 用该 commit 建立本轮独立基线并记录未解决问题 | **PARTIAL** | 本文件即基线记录。**缺口：** §0.2 要求由集成者固定一份**交接 commit**，而当前可运行状态**尚未提交**；HEAD 落后于实际运行源码 532 项。**这是本轮唯一的硬性未满足项。** |
| 5 | 在做的 Worker/ABI/调度/后端部分有 Owner 与冲突清单 | **NOT_FOUND** | 未在仓库中找到针对 Worker / ABI / 全局调度器 / 渲染后端的当前 Owner 与冲突清单文档。26.38 的 `qualification plan` 只记录门禁与省略项，不含 Owner 分配。**缺口：** 需在 N1 前补齐，否则无法执行主指令 §0 的"不并发重写"约束。 |

### 交接结论

**部分满足。** 生产实现可以开始（门槛 2、3 具备可运行契约），但必须先把**门槛 4（交接 commit）**与**门槛 5（Owner/冲突清单）**补上。
在补齐之前，任何触及 Runtime / Worker / ABI / Renderer / 全局调度器 / 锁文件的改动一律标为 `BLOCKED_UPSTREAM`，不在本工作区抢写——这与用户本轮明确指令一致。

---

## 3. 本轮不得并发重写的范围（用户指令 + 主指令 §0）

按冻结快照实测，以下路径在上一轮刚被改动且已通过 26.38 门禁，本轮**只读**：

- Runtime 世界与宿主：`src/runtime/**`（含 worldStreaming、worldGameplay、tileSceneRuntime、presentation、timeline、uiTheme、GameplayRuntime*）
- Worker 与调度：`src/runtime/jobScheduler.ts`、`jobScheduler.worker.ts`、其余 4 个 Worker 入口
- ABI / WASM 边界：`crates/nova_wasm/**`、`nova_core/pkg/**`、帧协议布局
- Renderer：`src/renderer/**`
- 全局调度与锁文件：`Cargo.lock`、`src-tauri/Cargo.lock`、`pnpm-lock.yaml`、`PerformanceCoordinator` 相关

**新增 Node/Schema/Signal 门面必须在这些边界之上适配，不得穿透重写。**

---

## 4. 上游能力现状（`docs/engine/FEATURE_MATRIX.md`）

该矩阵是 26.34 的最终能力矩阵，**尚未更新到 26.38**（本身即为缺口，N1 应补齐版本号与 26.35–26.38 增量）。

- **COMPLETE (scoped/bounded)**：A 场景与对象、B 变换、D 相机、E 纹理与精灵、F 动画、G 物理 2D、H TileMap、J 材质、K 粒子(CPU)、L 导航(网格)、M 音频、O 脚本、P 信号与事件、Q 资源、T 运行时存档、V 构建/运行/导出
- **PARTIAL**：C 2D 渲染、I 光照、**N 输入**、**R 游戏 UI**、**S 文本与字体**、**U 项目设置**、**W 调试**、**X 性能分析**、**Y 历史/Undo**、**Z 编辑器工作流**、AA 其他 2D 系统

对 N0 的直接含义：**底层能力大多已存在**（不需要重写物理/渲染/动画/音频内核）。本轮的真正新增面是主指令 §6 的**统一类型/属性/信号契约层**与 §21–§24 的**编辑工作流重构**——这两者目前在上游矩阵中都没有对应条目。

---

## 5. 关键结构性缺口

1. **类型注册表 / 属性 schema 层缺失。** 主指令 §6 称其为本轮最关键的连接层，但仓库中未找到统一的 `TypeDescriptor` / 字段 schema 源；现有的是分散的组件定义（`src/world/components.ts`）、序列化（`projectFormat.ts`、`nova_format`）与 Inspector 直接读 store 的组合。**这是 N1 的首要交付物。**
2. **Node 门面语义层不存在。** 现有面向用户的是 Entity + Component（ECS 式），没有 Node/Node2D/Control/Resource 的对外语义与生命周期命名（`_ready`/`_enter_tree`/`_exit_tree`）。主指令 §4/§5 要求在不建立第二份 TS 权威世界的前提下补上该门面。
3. **Player 依赖边界未闭合**（见 §2 门槛 1）。
4. **能力矩阵与文档滞后于已发布版本**（FEATURE_MATRIX/TEST_MATRIX 停在 26.34）。
5. **无 Owner/冲突清单**（见 §2 门槛 5）。

---

## 6. C01–C25 现有测试覆盖缺口

按 `scripts/**` 与 `crates/**` 实测文件名匹配（粗粒度定位，用于排期，不代表逐条断言质量）：

| C-ID | 现有相关脚本数 | 判定 |
|---|---|---|
| C01 生命周期/树 | 15 | 有基础，需按 Node 语义补 `_ready`/`_enter_tree`/`_exit_tree` 顺序 |
| **C02 变换/reparent** | **0** | **缺口**：无 transform/reparent 专项测试；与 §5.2 与 B 家族 "DEFERRED 非均匀缩放剪切" 直接相关 |
| C03 场景实例/覆盖 | 2 | 偏薄；§7 七项闭环需逐条验证 |
| C04 信号 | 7 | 有 gameplay-components 系列，缺"同阶段顺序/结构延迟/循环预算"专项 |
| C05 schema/registry | 2 | **主要缺口**：契约层尚不存在 |
| C06 脚本/Inspector | 16 | 较好 |
| C07 VFS/路径 | 23 | 数量足，需按 §10 的 `res://`/`user://` 语义对齐 |
| C08 资源/租约 | 24 | 较好；租约持有者语义需按 §11 补证 |
| C09 精灵/图集 | 40 | 较好 |
| **C10 Y-Sort** | **0** | **缺口**：Y-Sort 无任何测试；FEATURE_MATRIX 亦未列该项 |
| C11 帧动画 | 8 | 有；多实例状态隔离需补 |
| C12 角色控制 | 6 | 物理侧有，CharacterBody 的 `move_and_slide` 语义需新验证 |
| C13 Area/查询 | 5 | 有；结果 tick 归属需补 |
| C14 TileMap | 3 | 偏薄；笔划 Undo / dirty chunk / 渲染碰撞就绪需专项 |
| C15 音频 | 5 | 有；listener/camera 分离需补 |
| C16 游戏 UI | 88 | 量大但含大量编辑器 UI 审计，需区分"游戏内 Control"与"编辑器 Vue UI" |
| C17 命令 | 24 | 有 interactions 系列；Command Registry 单一来源尚不存在 |
| C18 Local/Remote/Play | 17 | 有 |
| C19 拖拽/ACK | 46 | 有 |
| C20 动效 | 14 | 26.37/26.38 刚加强 |
| C21 迁移 | 16 | 有 |
| C22 Player/平台 | 56 | 有 |
| C23 门面成本 | 17 | 有基准脚本，但**无 Node 门面成本对照** |
| C24 低延迟 | 2 | **偏薄**：需按 §26.4 建立 inputSequence/worldEpoch/消费 tick/首次受影响 packet |
| C25 30 分钟混合运行 | 2 | 有 stability 脚本，需按本轮负载重跑 |

**零覆盖项：C02、C10。薄覆盖且为本轮核心：C05、C03、C14、C24。**

---

## 7. UI 现状量化（§22 / §25 / §30）

对 `src/**` 全部 101 个 `.vue` 文件静态统计：

- `UiButton` 用法 **349** 处，其中带 `label` **204** 处，**无 label 的纯图标按钮 145 处（41.5%）**
- 原始 `<button>` 元素 726 处

这与用户本轮明确要求（"关键动作优先可理解的文字或图标加文字，不再为了图标化牺牲直观性"）直接冲突：**超过四成的按钮没有文字标签**，且缺失统一的 Command Registry 作为"同一命令、同一处理器"的来源。

---

## 8. 结论与本轮起点

1. **可运行基线成立且干净**：工作区 == 已发布 26.38 源码（4090 文件逐字节一致），14 项门禁与 11 文件发行包均已独立验证。
2. **生产实现的前置条件**：门槛 2、3 满足；门槛 1 部分满足；**门槛 4（交接 commit）与门槛 5（Owner/冲突清单）未满足** → 在补齐前，触及 Runtime/Worker/ABI/Renderer/调度/锁文件的改动标 `BLOCKED_UPSTREAM`。
3. **本轮 N1 起手点**（不依赖被阻塞区域，可立即进行）：
   - 建立统一 TypeDescriptor / 属性 schema / 信号契约源（§6），先覆盖 Sprite2D、Camera2D、CharacterBody2D、Area2D、Control、Timer；
   - 补齐 C02 与 C10 的测试地基（当前为零覆盖）；
   - 为 §7 可复用场景闭环建立逐项验证；
   - 记录 Owner/冲突清单，解除门槛 5。
4. **明确未做**：本文件**不**声称任何组件已实现或已验证；所有条目状态为"上游矩阵 + 本仓库静态实测"，尚未执行本轮专项测试。深度四路审计（组件内核 / 脚本事件输入 / 编辑器 UI 工作流 / 资源导出与上游文档）仍在进行，其结果将在下一轮并入本文件。
