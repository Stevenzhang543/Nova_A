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
| 4 | 用该 commit 建立本轮独立基线并记录未解决问题 | **SATISFIED（已补齐）** | 交接 commit **`5917d0defc059ff19fa4aceffa282a2d32e4e714`**（`handoff: verified v26.38 release state for the 26.39 component/workflow round`），558 个文件，工作区提交后 clean。`.dsh/`（第三方工作区技能）已加入 `.gitignore` 且未进入该提交。本文件即该 commit 上的基线记录。 |
| 5 | 在做的 Worker/ABI/调度/后端部分有 Owner 与冲突清单 | **SATISFIED（本轮声明）** | 见 §10 冻结面 Owner 与冲突清单。由集成者在本轮显式声明冻结边界与唯一变更集，而非假定存在既有分配文档。 |

### 交接结论

**已满足（门槛 4、5 于本轮补齐）。** 门槛 1 仍为 PARTIAL：Player 依赖边界未闭合，列为 N2/N7 的明确工作项，但不阻塞只读审计与契约层（N1）的建立。

冻结面（§10）之外的改动方可进入本轮的实现范围；冻结面内部的任何改动必须由集成者显式解除冻结后才可进行。

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

1. **类型注册表已存在；缺的是属性（字段）schema 与信号声明层。**（N0 初稿曾误判为“注册表缺失”，此处更正——原始判断把“未检查”写成了 MISSING，违反了主指令“不得把未检查标为 MISSING”。）

   **已存在（应复用，不重造）**：`src/world/componentRegistry.ts` 提供 `STABLE_COMPONENT_API_VERSION = '2.0'`、`ComponentDescriptor { kind, category, unique, summary }`、**63 条 `STABLE_COMPONENTS`**、`STABLE_COMPONENT_KINDS` 与 `componentDescriptor(kind)`。消费方包括 `src/projects/projectData.ts`、`src/runtime/objectBlueprints.ts`、`objectComposition.ts`、`dynamicObjectsOwner.ts`（Runtime，**冻结面**）、`src/editor/sceneAuthoring.ts`、`componentPalette.ts`。

   **确实缺失**：描述符**只有类目与摘要**，没有字段 ID、值类型、默认值、范围/步进、单位、编辑控件、校验规则、i18n 标签键，也没有按 kind 的信号声明与序列化键映射。

   **证据（Inspector 现状）**：`src/components/ConfigPanel.vue`（1208 行 / 153 KB）中含 **114 处 `kind === '…'` 分支**，覆盖 **53 个互不相同的 kind**，另有 `GameplayComponentsInspector.vue`、`RuntimeComponentsInspector.vue`、`WorldComponentsInspector.vue`、`ContentAssetInspector.vue` 四个专用检查器。也就是说**属性表单是逐 kind 手写的模板**，而非由 schema 驱动——这正是 §6 所指的连接层缺口。

   **N1 首要交付物**（加法式，不替换既有注册表）：为既有 `ComponentDescriptor` 增加可选的字段 schema 与信号声明，并提供 schema 驱动的渲染路径，使 ConfigPanel 的分支可以**逐项**迁移而非一次性重写。
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
2. **生产实现的前置条件**：门槛 2、3 满足；门槛 4（交接 commit `5917d0d`）与门槛 5（冻结面 Owner/冲突清单，§10）**已于本轮补齐**；**仅门槛 1（Player 依赖边界）仍为 PARTIAL**，已列为 N2/N7 工作项。冻结面（§10.1）内的改动仍标 `BLOCKED_UPSTREAM`，须先显式解冻。
3. **本轮 N1 起手点**（不依赖被阻塞区域，可立即进行）：
   - 建立统一 TypeDescriptor / 属性 schema / 信号契约源（§6），先覆盖 Sprite2D、Camera2D、CharacterBody2D、Area2D、Control、Timer；
   - 补齐 C02 与 C10 的测试地基（当前为零覆盖）；
   - 为 §7 可复用场景闭环建立逐项验证；
   - 记录 Owner/冲突清单，解除门槛 5。
4. **明确未做**：本文件**不**声称任何组件已实现或已验证；所有条目状态为"上游矩阵 + 本仓库静态实测"，尚未执行本轮专项测试。深度四路审计（组件内核 / 脚本事件输入 / 编辑器 UI 工作流 / 资源导出与上游文档）仍在进行，其结果将在下一轮并入本文件。

---

## 9. 交接 commit（§0.2 门槛 4）

| 项 | 值 |
|---|---|
| commit | `5917d0defc059ff19fa4aceffa282a2d32e4e714` |
| 信息 | `handoff: verified v26.38 release state for the 26.39 component/workflow round` |
| 文件数 | 558 |
| 提交后工作区 | clean（0 项） |
| 来源 | 即 26.38 已发布源码（冻结快照 digest `163874df1be91e24…`，4090 个共享文件逐字节一致） |
| 排除 | `.dsh/`（第三方工作区技能，已加入 `.gitignore`，未提交）；`releases/`、`release-audits/`、`.cache/`、`dist`、`target` 仍在忽略列表 |
| 回退方式 | `git reset --soft HEAD~1`（不改工作区内容），或 `git revert 5917d0d` |
| 未做 | **未 push**；未创建 tag；未修改任何已发布产物 |

本轮所有实现与验证以该 commit 为起点。任何后续提交都应与本 commit 比较，不接受"未提交即声称完成"。

---

## 10. 冻结面 Owner 与冲突清单（§0.2 门槛 5）

本轮为单变更集执行，不存在并行的第二个代理；因此"Owner"以**冻结声明**形式给出：冻结面内的文件由上一轮已验证的 26.38 变更集持有，本轮**只读**，任何改动须由集成者先显式解除冻结。

### 10.1 冻结面（本轮禁止重写）

| 区域 | 代表路径 | 冻结依据 | 允许的接触方式 |
|---|---|---|---|
| Runtime 世界与宿主 | `src/runtime/**`（worldStreaming、worldGameplay、GameplayRuntime*、runtimeWorldHost、presentation、timeline、uiTheme 等） | 26.38 十四门禁全通过 | 只读；新增门面在其**之上**适配 |
| Worker 与任务调度 | `src/runtime/jobScheduler.ts`、`jobScheduler.worker.ts`、`scriptLanguage.worker.ts`、`import.worker.ts`、`contentInteroperability.worker.ts`、`graphLayout.worker.ts` | 同上 | 只读 |
| 全局性能协调 | `src/runtime/performanceCoordinator.ts` 及 `PerformanceCoordinator` 相关 | 同上 | 只读 |
| ABI / WASM 边界 | `crates/nova_wasm/**`、`crates/nova_format/**` 的既有布局、`nova_core/pkg/**`、帧协议常量 | 同上 | 只读；新契约不得改变既有 offset/stride/单位 |
| 渲染器 | `src/renderer/**` | 同上 | 只读；只通过稳定渲染抽取交互 |
| 物理内核 | `crates/nova_physics/**`、`crates/nova_math/**` | 同上 | 只读 |
| 锁文件 | `Cargo.lock`、`src-tauri/Cargo.lock`、`pnpm-lock.yaml` | 同上 | **禁止修改**（不新增依赖） |

### 10.2 本轮可变更面（不触及上述区域的加法式工作）

| 区域 | 说明 |
|---|---|
| 新增类型/属性/信号契约层 | 新模块（拟 `src/contracts/` 或 `src/world/schema/`），只**新增**，并适配既有组件定义与序列化 |
| Node 门面语义层 | 新模块，映射到既有 Entity/Component 与 Owner 端口，不建立第二份 TS 权威世界 |
| 编辑器 UI | `src/components/**`、`src/layout/**`、`src/ui/**`、`src/panels/**`（§21–§25 授权的信息架构重构） |
| 编辑器命令与事务 | `src/editor/**`、`src/store/editor.ts` 的命令注册与 Undo 事务接线（不改 Runtime 语义） |
| 测试与文档 | `scripts/verify-*.mjs` 新增、`docs/engine/**` 跟踪文档、C01–C25 与 W1–W3 证据 |

### 10.3 冲突规则

1. 冻结面内的文件在本轮**不得产生内容变更**；如实现确需改动，先由集成者在本文件追加解除冻结记录（范围、理由、验证计划）后再执行。
2. 冻结面与非冻结面之间只允许**单向**依赖：新门面依赖既有 Owner 端口，既有 Owner 不反向依赖新门面。
3. 一切新抽象必须证明不延长关键输入路径，且不引入全世界 JSON、深层响应式运行数据或逐实体 RPC（主指令 §0.1、§8、§26.2）。
4. 验证必须区分 `IMPLEMENTED` / `VERIFIED` / `NOT_TESTED` / `BLOCKED_UPSTREAM` / `DEFERRED_WITH_REASON`，不得以节点数量、界面截图、构建成功或内部空跑 FPS 代替真实制作能力与输入延迟证据。

---

## 11. N1 的实测目标范围：现有组件清单

`src/world/components.ts` 实测：**50 个导出组件类**，其中 **48 个**声明了 `kind` 字面量（`Joint2D`、`Collider2D` 为无 kind 的基类/多态类型）。

这 48 个 kind 就是 N1 统一类型/属性/信号契约层必须覆盖的**实际存量**，不需要新造组件：

```text
渲染/表现  ShapeRenderer2D, SpriteRenderer2D, TextRenderer2D, Camera2D, Light2D, ShadowCaster2D, ParticleEmitter2D
脚本/逻辑  Script2D, Animator, Skeleton2D, TimelinePlayer, BehaviorTree2D, StateMachine2D
音频        AudioSource, AudioListener
游戏 UI     Canvas, RectTransform, Panel, Image, Text, Button, Slider, ProgressBar, Checkbox, TextInput
物理/世界   CharacterBody2D, Area2D, AreaEffector2D, RigidBody2D, TileMap2D, Joint2D(基类), Collider2D(基类)
导航        NavigationRegion2D, NavigationObstacle2D, NavigationAgent2D
控制器      GridMover2D, PlatformController2D, TopDownController2D, MouseFollower2D, CameraFollow2D
玩法件      Health2D, DamageHitbox2D, Collectible2D, Projectile2D, Spawner2D, Cooldown2D, Lifetime2D, Portal2D, ObjectPool2D
流式/性能   WorldChunk2D
```

**对照主指令 §4 的语义图，缺口是"语义与命名层"而非能力内核：**

| 主指令要求的概念 | 现有等效物 | 缺口 |
|---|---|---|
| `Node`（非空间组织/生命周期/组/信号） | 无独立节点概念；Entity + 组件 | 需新增门面与 `_enter_tree`/`_ready`/`_exit_tree` 语义 |
| `Node2D` | Entity 的 Transform（`src/world/hierarchy.ts`） | 需命名与生命周期对齐 |
| `Control`（非 Node2D 子类） | Canvas/RectTransform/Panel/… 组件族 | 需与 Node2D 显式分离的语义表达 |
| `Resource`（可共享数据，不在树里跑） | `src/assets/AssetDatabase`、派生资源 | 需稳定 typeId 与租约语义对齐 |
| `Timer` | `Cooldown2D` / `Lifetime2D` | 需明确模拟时间 vs 真实时间与暂停模式 |
| `Shape2D` 资源 vs `RayCast2D` 查询 | 物理查询 API（Rust） | 需按 §15 明确分类，不得混入 Shape 资源 |

### 11.1 契约层实测（更正 N0 初稿）

初稿称"仓库中未找到统一的类型/schema 源"，经实测**不成立**。现有契约层有两块，**都应复用而非重造**：

| 层 | 文件 | 规模 | 性质 |
|---|---|---|---|
| 类型登记表 | `src/world/componentRegistry.ts` | `STABLE_COMPONENT_API_VERSION='2.0'`；**63** 条 `STABLE_COMPONENTS`；字段 `kind/category/unique/summary` | 手写、稳定 API |
| 字段原始类型契约 | `src/world/componentPrimitiveTypes.ts` | **1954 行；59 个 kind；595 条字段条目；332 个不同字段名** | **生成物**（`scripts/generate-v26.22-component-primitives.mjs`，支持 `--check`） |

`componentPrimitiveTypes` 的形状是 `kind → { fieldName → 允许的基本类型数组 }`，由 `src/world/componentValidation.ts` 在写入前消费。

**因此 N1 的真正缺口是"描述性 schema"而非"契约存在性"**：

| 已有 | 缺失 |
|---|---|
| 稳定 kind 与类目/唯一性/摘要 | 字段的**默认值** |
| 字段名与允许的原始类型 | **范围 / 步进 / 单位** |
| 生成 + `--check` 校验机制 | **编辑控件选择**（number/slider/color/asset/enum/…） |
| | **i18n 标签键**（现由 `componentTitle` + i18n 分散承担） |
| | **序列化键显式映射** |
| | **按 kind 的信号声明**（§5.3、§23.4） |
| | **Inspector 分组**（§23.3 要求保持分组与草稿） |

**消费侧实测（为何需要 schema 驱动）**：`src/components/ConfigPanel.vue` 1208 行 / 153 KB，含 **114 处 `kind === '…'` 分支**，覆盖 **53 个不同 kind**；另有 4 个专用检查器组件。属性表单是逐 kind 手写模板，**不是** schema 驱动。

### 11.2 N1 交付物（据此定义）

1. **扩展现有生成器**，而不是手写第二张表：由 `generate-v26.22-component-primitives.mjs` 同一来源同时产出「原始类型契约」与「描述性 schema」（默认值、范围、单位、控件、i18n 键、分组、信号）。
2. **保持 `componentRegistry.ts` 为唯一类型身份来源**，只加法式追加可选的 `fields`/`signals` 视图，不替换既有 `ComponentDescriptor`，不破坏 6 个既有消费方（其中 `dynamicObjectsOwner.ts`、`objectBlueprints.ts`、`objectComposition.ts` 在**冻结面**内）。
3. **提供 schema 驱动渲染路径**，使 ConfigPanel 的 114 处分支可**逐项**迁移，禁止一次性重写。
4. **证明与 Rust 侧 `nova_format` 既有 schema 一致而非重复权威**（字段名/类型/可选性对齐；冲突必须报错而不是静默二选一）。
5. **补齐主指令要求但完全缺失的 2 项**：`Timer`（模拟时间 vs 真实时间、暂停模式；现仅 `Cooldown2D`/`Lifetime2D`）与 `Control` 相对 `Node2D` 的显式语义分离。
6. **为 C02（变换/reparent）与 C10（Y-Sort）建立测试地基**——两者现有测试文件数为 **0**。

---

## 12. 附录：D 范围（资源 / VFS / 导出 / Player / 上游文档）审计结论

| # | 项 | 状态 | 关键证据 | 本轮动作 |
|---|---|---|---|---|
| 1 | 图片/音频导入器 | PARTIAL | `src/assets/importPipeline.ts:169`；缓存键 :82、原子写 :121、取消 :249 齐全；**产物为原始字节 :202/218，无变体**；watcher 为 1s 轮询 :278 | INTEGRATE |
| 2 | 资源数据库 | PARTIAL | `src/assets/AssetDatabase.ts:65,698,721`；generation :40、事务回滚 :379；**无租约表** | REUSE |
| 3 | 侧车元数据契约 | PARTIAL | `src/assets/projectFolder.ts:55,56`；**只写无读回路径** | DEFER_WITH_REASON |
| 4 | 图集 / 精灵稳定 ID | PARTIAL | `src/runtime/runtimeAtlas.ts:38`；**图集不序列化、导出不烘焙，无端到端证据** | INTEGRATE |
| 5 | **VFS `res:// user:// cache://`** | **MISSING** | `src/` 内三种 scheme 匹配 **0**；等效面为 `asset://`(AssetDatabase.ts:698) 与 PAK | IMPLEMENT（限 assetId + PAK 索引路由） |
| 6 | 资源缓存与租约 | PARTIAL | `runtimeMediaOwner.ts:58,44,205`、`requiredResourceUpload.ts:106`；**缺 Scene 级租约与统一迟到结果 epoch 门** | INTEGRATE |
| 7 | nova-pak 包格式 | **COMPLETE_VERIFIED** | `novaPak.ts:58`、`runtime_pak_preflight.rs:88`；TS/Rust 双实现 + 黄金语料 | REUSE |
| 8 | Web 导出 | PARTIAL | `gameExporter.ts:197`；依赖 `store/editor`、`store/physics` :7-8；**无单 HTML 产物** | REUSE |
| 9 | 原生导出 / Player 模板 | PARTIAL | `src-tauri/src/lib.rs:2685,2709`；EXE 仍为 WebView2 宿主 | REUSE |
| 10 | **独立 Player（门槛 1）** | **BROKEN（边界）** | `PlayerApp.vue:73,45,50,62` import 编辑器 store / WorldCanvas / adapter / AssetDatabase；`player.ts:25` 自述 M1 gap；Editor 与 Player 共用 Tauri 标识 | REPAIR |
| 11 | 构建设置 | PARTIAL | `buildSettings.ts:74-125`；`FEATURE_MATRIX.md:27` 记 U=PARTIAL | REUSE |

**本轮新增执行脚本**：`scripts/verify-engine-component-schema.mjs`（8 项检查，全部通过；报告 `reports/phase2/component-schema-baseline.json`），机械固定登记表 / 生成式字段契约 / 世界声明 / Inspector 分支四者不漂移，并**记录**而非隐藏登记表缺口（`CanvasLayer`、`ParallaxLayer`、`Path` 被 Inspector 支持但未登记进 `STABLE_COMPONENTS`）。

**更正：此前记录的"登记表缺口"不成立。** `CanvasLayer`、`ParallaxLayer`、`Path` 是 **`AuthoringObjectKind`**（`src/world/Entity.ts:32-35` 的实体/创作种类联合），ConfigPanel 的分支实际写作 `selectedEntity.authoring.kind === '…'`（`ConfigPanel.vue:45,49,55`），**不是组件 `kind`**。我的正则 `kind === '…'` 匹配到了带点号的访问器，属**误报**。

已修正校验脚本只统计组件 kind 分支，实测：**组件 kind 分支 109 处 + authoring.kind 分支 3 处**（原报 114 处是两类混合），**Inspector 覆盖的不同组件 kind 为 50 个**。

这条更正很重要：若照原判断去"修"，会往稳定登记表里塞进 3 个并非组件的条目，反而制造第二套权威。

**仍待细化的 1 项**：记录中残留 `WorldBoundary`。它是碰撞体**形状模型**（`entityBuilder.ts:607`、`World.ts:172`），不是组件种类；校验脚本尚未区分"形状 kind"与"组件 kind"，本轮不掩盖该不精确。

> 见上条更正。

**上游明示未完成（本轮不得假设已完成）**：WebGPU NOT PRESENT；compiled Worker 生产入口未完成；原生与 Web Player 隔离未完成；QualityLocked / AdaptiveExperience 分别 NOT_TESTED；Linux、签名、clean-machine NOT_TESTED；`FEATURE_MATRIX` 停 26.34。

---

## 13. 附录：A 范围（组件与节点内核）审计结论

### 13.1 契约层的真实形态：不是 1 张表，是 5 张并行表 + 5 个手写 Inspector

| # | 位置 | 内容 | 性质 |
|---|---|---|---|
| 1 | `componentRegistry.ts:13` | kind / 类目 / 唯一性 / 摘要 | 手写 |
| 2 | `componentPrimitiveTypes.ts:4` | 59 类字段 → 允许的原始类型 | **生成** |
| 3 | `componentEnums.ts:4` | 枚举取值 | **生成** |
| 4 | `propertyMetadata.ts:13` | **仅 25 条路径** | 手写 |
| 5 | `componentValidation.ts:6` | 写入校验 | 手写 |

消费侧另有 **5 个手写 Inspector**：`ConfigPanel.vue`（主，1168 行）+ `Runtime`/`World`/`Gameplay` ComponentsInspector。**新增一个组件目前需要改 6 处**——这是本轮最大的结构性阻塞，也精确定义了 N1 的目标：以 `componentRegistry.ts` 为**唯一入口**落地字段级 TypeDescriptor（`fieldId` / 序列化键 / 单位 / 范围 / 枚举 / `editorWidgetId` / `mutationPhase`），把 2、3 降为**派生物**，并合并 4、5 两张并行表。

**已验证为完整的上游能力（应复用，不重做）**：组件登记↔原始类型闭合（`verify-engine-component-registry.mjs`）、实体序列化、**Prefab 七项闭环全通过**、Area2D enter/exit 差分与删除补发、Sprite 字段↔Inspector↔序列化对齐、Camera2D 全套、Timer（start/pause/repeat/代次/容量上限）、nova-pak。

### 13.2 A 范围实测缺口（8 项，按严重度）

| # | 缺口 | 证据 | 违反条款 |
|---|---|---|---|
| 1 | **无字段级契约**：缺 `fieldId`/`serializationKey`/`editorWidgetId`/`signals[]`；5 表 + 5 Inspector 并行 | 见 §13.1 | §6、§31 |
| 2 | **Transform 无 dirty/版本**：`hierarchy.ts` 每帧递归重算全祖先；Y-Sort 排序键、相机、渲染各自再调 `worldTransform` | `hierarchy.ts:43-74`；`sceneRenderer.ts:77,156,179,216,245,316,322,353` | §5.2、§12.3（O(n·depth) 全场景排序） |
| 3 | **生命周期缺 `_enter_tree`/`_ready`/`_exit_tree`**；`awake`/`start` 按 `entities` 数组序而非父先/子先；树外与重新入树契约缺失 | `GameplayRuntimeCore.ts:1232-1251`；全仓仅 i18n 文案含这三个名字 | §5.1 |
| 4 | **信号无参数 schema / 无持久连接标识**；队列 >1024 **静默丢最旧**；实体删除仅按 target 过滤 | `GameplayRuntimeCore.ts:1049,1924-1945,1752` | §5.3、C04 |
| 5 | **Control 无脏更新**：每次调用重建整棵布局树，`gameUiOwner` 每帧 `this.resolve` 全树重算；游戏内无障碍**无 DOM/aria 桥**（grep=0） | `uiLayout.ts:27,77`；`gameUiOwner.ts:80,239` | §17.2 |
| 6 | **CharacterBody2D 两套 API 语义不一致**：脚本 `move_character(x,y)`（固定步）与 TS `moveAndSlide(velocity,dt)`（内部再乘 dt）→ **dt 双重相乘风险** | `scriptApiCatalog.ts:142,226`；`physics2d.ts:82` | §15.4、C12 |
| 7 | **场景实例与 Prefab 不对等**：`sceneInstances.ts` 仅创建/实例化/解包，缺覆盖差异集与源刷新（5、6 项） | `sceneInstances.ts:22-44` vs `prefabs.ts:330-402` | §7、C03 |
| 8 | **组件无独立导出映射**：`gameExporter.ts` 不遍历组件，仅随项目文档 | `gameExporter.ts` | §20、C22 |

补充：非均匀父缩放对 collider 的限制**无检查**；`Transform` 奇异矩阵靠 `MIN_SIZE` 下限兜底（不 NaN 但会放大 1/MIN_SIZE 且无显式错误）；RayCast/ShapeCast 只有查询 API，**无节点式持久 RayCast**（无 update 时机 / debug / 排除属性）。

### 13.3 修正后的 N1 起手顺序

1. **以 `componentRegistry.ts` 为唯一入口落地字段级 TypeDescriptor**，把 `componentPrimitiveTypes`/`componentEnums` 降为派生物，合并 `propertyMetadata` 与 `componentPalette` 两张并行表，并加契约测试（§6）。这同时消解 §13.1 的"改 6 处"问题。
2. **为 Transform/hierarchy 加 dirty 版本与世界矩阵缓存**，消除排序键与相机路径的重复 `worldTransform` 调用（§5.2/§12.3）。
3. **补齐 typed signal 注册**（`signalId` + 参数 schema + 连接持久化），超限丢弃改为**有界背压**，并定义 `_enter_tree`/`_ready`/`_exit_tree` 对 `awake`/`start` 的映射与测试（§5.1/§5.3）。

> 注：第 2、3 项触及 `src/world/hierarchy.ts` 与 `src/runtime/GameplayRuntimeCore.ts`——后者在**冻结面**内（§10.1）。因此第 3 项必须先由集成者显式解除冻结后方可执行；本轮不越界。

---

## 14. 附录：B 范围（脚本 / 事件 / 输入 / 低延迟）审计结论

### 14.1 已验证可复用（不得重做）

| 项 | 状态 | 依据 |
|---|---|---|
| Rhai 脚本内核 | **COMPLETE_VERIFIED** | `crates/nova_script/src/lib.rs` **37 个 `#[test]`**：AST 缓存原子性、Scope/实例隔离、epoch+generation 陈旧拒绝、顶层初始化仅一次、操作预算、候选实例仅同 revision 转移、宿主输出预算；权威**全在 Rust**，TS 仅为调用方，无重复逻辑 |
| 性能协调与调度 | **COMPLETE_VERIFIED** | `verify-engine-scheduler.mjs` **28 项真实断言**（租约恰好一次释放、等待期不占租约、软截止期、wall-cost 含准备与合并、hidden 暂停可选工作、压力迟滞不改写 VisualQualityFloor） |
| Play/Pause/Step/Stop 共用同一 Runtime | **成立** | Player 直接 `new GameplayRuntimeCore`（`PlayerApp.vue:276`），Editor 为 `GameplayRuntime extends GameplayRuntimeCore`——**语义共用已达成**，仅边界未分离 |

### 14.2 B 范围缺口（G1–G9，按优先级）

| # | 缺口 | 证据 | 违反 |
|---|---|---|---|
| **G1** | **§26.4 追踪身份完全缺失**：`inputSequence` / 消费 tick / 首次受影响 packet **全库 0 命中**；`inputToPixelMs` 恒 `null` | `observability.ts:95`、`profiler.ts:48,201` | §26.4 —— **没有它就无法证明任何低延迟改动有效** |
| **G2** | **脚本世界投影每帧多次全实体 JSON**：`invalidateScriptWorld` 在 `dispatchSignals`(:1925)、`ensureLifecycle`(:1233)、每 `runPhase`(:1276) 都被调用 → 每固定步失效，**每帧 4+ 次全实体 JSON 重建**；再叠加每回调 `JSON.stringify(context)` 跨 WASM | `GameplayRuntimeCore.ts:1188-1230`；基线可测 `scriptContextDiagnostics.publications`(:434) | §5、§0.1 |
| **G3** | **Inspector 以属性名字符串为键**（`Script.${name}`、`propertyMetadata[name]`），无稳定字段 ID → **脚本重命名即丢失作者值**，且阻碍 §6 schema 驱动 | `ConfigPanel.vue:222,564` | §6、§19 |
| **G4** | 信号**无循环/深度预算**，仅 1024 队列丢弃最旧；**C04 零专项测试** | `GameplayRuntimeCore.ts:1049-1052` | §5.3、C04 |
| **G5** | 输入四分作用域**无单一优先级仲裁源**，靠分散 DOM 守卫；`pointercancel`/`lostpointercapture` **仅对 pen 处理** | `input.ts:356,905`；`ToolBar.vue:114`；`input.ts:423,444` | §9 |
| **G6** | 插值只有 `Interpolate`/`None`，**缺 §8 的 Balanced/Responsive 表现策略语义** | `physicsProduction.ts:5` | §8.2 |
| **G7** | **无真实时间（wall-clock/process）计时器通道**，无法表达 `process_callback=process` | `time.ts` 为唯一实现 | §14 |
| **G8** | Player 依赖 Editor 模块（与 §13 门槛 1 同一结论） | `PlayerApp.vue:45,50,62,73` | §0.2 门槛 1 |
| **G9** | `World.activeBodies` **每帧全量 `entities.filter` 重建**，无持久活动集/脏标记 | `World.ts:783` | §5.2；**优化被冻结面阻塞** |

### 14.3 B 范围给出的 N1/N2 排序（与 A 范围合并后）

1. **G3 稳定字段 ID** 与 A 范围第 1 项是同一件事的两面（组件字段 + 脚本导出属性），应在 N1 的同一契约层内解决。
2. **G1 可观测身份透传**：在既有 `FrameObservability`/`InputReceiptTokenMap` 上追加 `inputSequence` → 消费 tick → 提交 → 首次受影响 packet，**不改变既有 packet 布局与 offset**（避免触犯 ABI 冻结面）。这是 N8 性能验收的前置条件。
3. **G2 投影失效收敛**、**G4 信号预算与 C04**、**G5 输入仲裁源**、**G9 active list** 均落在**冻结面**内，须先解冻。

> 交叉印证：A、B 两路审计**独立**得出同一条结论——"Player 依赖边界未闭合"是唯一的硬门槛缺口；且都指出活动集/脏标记缺失（A 的 Transform dirty、B 的 active list），二者在缓存与失效策略上应一并设计，而不是各修一处。

---

## 15. 附录：C 范围（编辑器信息架构与工作流）审计结论

> 记录说明：C 组结论在上一轮已收到，但当时未写入本文件；此处补录，并更正上一轮"四路已全部归档"的失实表述。

**判定口径**：静态阅读源码 + 主指令 §21–§25/§30；**运行期结论一律 NOT_TESTED**。

### 15.1 结构性阻塞（按严重度）

| # | 缺口 | 证据 | 违反 |
|---|---|---|---|
| **G1** | **Command Registry 完全缺失**：`src/editor/commands.ts` 实为 Undo 历史（execute/undo/redo/merge），非 §22.2 注册表；`commandId`/`enabledWhen`/`visibleWhen` 全仓仅两处无关命中；**同一动作重复实现于 TopBar / CommandPalette / ContextMenu / ActionBar / ProfilerPanel 五处** | `commands.ts:20-81`；播放逻辑 `ActionBar.vue:40-47`、`CommandPalette.vue:110-121`、`ProfilerPanel.vue:378` | §22.2 |
| **G5** | **Play 未建独立世界**：物理直接跑在 `physicsState.world` 上，**Stop 依赖 `loadProject` 整份快照字符串复原**；**无 "Apply Runtime Changes"（全库 0 命中）**；Preview 无独立模式 | `store/physics.ts:83,846-855,857-863` | §24、§5.3 —— **架构性违背** |
| **G6** | **事务成本与取消不安全**：事务粒度 = **整份 `getSceneJSON` 字符串**，提交时前后各驻留一份；**编辑态 Escape 只置 `gizmoDrag=null`，不还原基准快照、不 pushHistory** → 已写入位移成为**不可撤销的残留** | `physics.ts:1120-1138`；`WorldCanvas.vue:622,720,938-943` | §24 —— **唯一会静默损坏用户数据的缺陷** |
| **G7** | **Signals 层完全缺失**：全仓无 Godot 式信号注册/连接/签名校验（`"signal"` 仅出现在 AreaEffector 参数、组件摘要、i18n 标签）；`ConnectionBuilder.vue` 实为**物理路径连接**对话框（anchors/restLengths），语义不同。Groups 仅 `entity.groups` 字段，无组管理面板 | `componentRegistry.ts:53-68`；`simulationAuthoring26.ts:113-119` | §5.3、§23.4 |
| **G3** | **关键动作图标化**：61 个纯图标 `UiButton`，含**添加/导入/新建脚本/新建文件夹/建场景资源**等 §22.1 明令需文字的动作 | `EditorBottomPanel.vue:41-46`；`ToolBar.vue:113-123` | §22.1 |
| **G4** | 运行项目 / 运行当前场景 / 导出**无顶层文字入口、无快捷键**；可改快捷键仅 10 条，保存/撤销/删除/工具/运行全部硬编码 | `shortcuts.ts:7-18`；`TopBar.vue:223-246` | §22 |
| **G2** | **顶层 IA 语义重叠**：菜单"调试"（`i18n.ts:146`）与工作区"调试"（`i18n.ts:267`）同名不同层；命令面板标 `Ctrl K`（`TopBar.vue:78`）而实际绑定为 `Ctrl+Shift+P`（`shortcuts.ts:8`），`WorkspaceBar.vue:37` 又写第三种 | 同上 | §21 |
| **G8** | Inspector 无 Local/Remote 标注与远程只读语义（0 命中；Play 时仅整面板 inert，显示的仍是同一文档对象）；**无滚动位置保持**（0 命中） | `ConfigPanel.vue:7-19,369` | §23.3 |

补充：`SceneSideBar.vue` 无 **Keep World/Local** 重挂选择（0 命中）；`createAuthoringObject(kind, position)` **无 parent 参数**，只能建根节点，无"添加到选中节点下"。

### 15.2 已验证可复用

- **动效与 Comfortable token 逐值核对一致**（主字号 14/16/18、控件 44、树行 40、图标 22、圆角 8–24、间距 4–32；Snappy/Smooth/Elastic 700/34、360/28、480/22 与 120/180/240/320ms；Reduced Motion 双通道）→ REUSE
- ToolBar 变换工具全set（Q/W/E/R、吸附、Local/World、pivot、frame、对齐分布、参考线）→ REUSE
- 工具模式工具栏、工作区持久化与导航历史、Inspector 分组/草稿/预制体覆盖、Undo 事务的 mergeKey/嵌套回滚/上限 → 均 PARTIAL 但基础可用

### 15.3 §30 可用性走查（工程师走查，非新手研究）

| 检查 | 判定 |
|---|---|
| 不懂类名能否搜到 | 部分（添加节点按用途/摘要/依赖搜；但列表仍用 `kind` 而非用途名） |
| 能否区分项目/场景/资源/运行实例 | **一般**（有项目名与场景脏点/P 标记，**无 Local/Remote 与运行实例视图**） |
| 不靠 tooltip 看懂关键按钮 | **否**（61 个纯图标，含添加/导入/新建） |
| 能否找到六个关键动作 | 部分（添加节点 4 入口；实例化在资源详情；附加脚本未文字化；**连接信号 MISSING**；**运行当前场景 MISSING**；导出藏在溢出菜单） |
| Inspector 保持分组/草稿/滚动 | 分组与草稿可；**滚动无实现**（未验证） |
| 缺失项能否定位并给出修复路径 | 部分（`issue.fix` 文案已存在但**入口只显示 code**） |
| 键盘可达性 | 部分（焦点环 + 4 处焦点陷阱；**运行/停止无快捷键**） |
| 后台任务时即时反馈 | 部分（状态栏计数 + 任务中心；**重负载拖拽 NOT_TESTED**） |

### 15.4 四路审计的合并结论

C 组与 B 组**独立**判定"信号层缺失/无预算"；C 组的 G5（Play 未隔离世界）与 A/B 的 Player 边界问题是**同一根源**的两个表现（Runtime 与 Editor 世界未分离）。**唯一会静默损坏用户数据的是 G6（Escape 取消不还原）**，故列为下一轮最高优先级。

---

## 16. 修复记录

### 16.1 G6 已修复：拖动取消会静默损坏用户数据

**问题**（§15.1 G6）：`WorldCanvas.vue` 的 Escape 分支只做 `gizmoDrag = null; canvasDragMode = 'none'`。三个 `apply*` 函数**直接写入实体**（无独立预览层），因此取消后位移留在文档里，且**没有 pushHistory** → 位移永久且 Undo 无法触及。同一条路径也未处理 `pointercancel`。

**修复**：
1. `src/editor/gizmo.ts` 新增 `restoreTransforms(snapshots, entities)`，与三个 `apply*` 使用**同一条 `setWorldTransform` 写入路径**，精确还原位置、旋转与缩放。
2. `src/components/WorldCanvas.vue` 的 Escape 分支改为：若存在 `gizmoDrag` 且 `hasMovedEntity`，先 `restoreTransforms` 并刷新属性显示，再 `finishCanvasDrag()`。**不写历史**——因为已回到基准，文档未变（符合 §24「撤销预览，恢复基准」）。

**未触及冻结面**：改动仅在 `src/editor/**` 与 `src/components/**`。

**证据**：新增 `scripts/verify-engine-gizmo-cancel.mjs`，**5 项检查全部通过**（报告 `reports/phase2/gizmo-cancel.json`）：

| 检查 | 内容 |
|---|---|
| 1 | 每个选中层级根各得一个快照 |
| 2 | 平移 / 旋转 / 缩放**三种工具**各自 apply 后 restore，世界变换与基准**精确相等** |
| 3 | 重复取消 5 次**幂等无漂移** |
| 4 | **负向对照**：只清状态不还原会把位移遗留（固化修复前的缺陷） |
| 5 | 源码级守护：Escape 分支确实先 `restoreTransforms` 再 `finishCanvasDrag`，且顺序正确 |

`pnpm check`（vue-tsc + tsc）退出码 0。

**状态**：`IMPLEMENTED` + 有行为证据；因尚未在真实 GUI 中做一次人工 Escape 走查，**本轮标为 IMPLEMENTED 而非 VERIFIED**（主指令 §33 禁止把内部空跑当作体验通过）。

### 16.2 G6 剩余面已补齐：pointercancel / lostpointercapture 接入同一还原路径

**问题**：画布已绑定 `@pointercancel="onUiPointerCancel"` 与 `@lostpointercapture="onUiPointerCancel"`，但该处理器（`WorldCanvas.vue:322`）**只处理触屏游戏输入**（`touchPointer`），对编辑态的变换拖动**不做任何处理**。因此浏览器触发 pointercancel（系统手势、窗口失活、笔离开范围等）时，位移同样被遗留且不入历史——与 Escape 是同一个缺陷的第二条入口。

**修复**：把取消语义抽成单一助手 `cancelActiveCanvasDrag()`（有位移则 `restoreTransforms` + 刷新属性，然后 `finishCanvasDrag()`，不写历史），并让**两个入口共用**：
- Escape 分支：`if (gizmoDrag) { cancelActiveCanvasDrag(); return }`
- `onUiPointerCancel`：保留原触屏处理，追加 `if (gizmoDrag) cancelActiveCanvasDrag()`

**证据**：`scripts/verify-engine-gizmo-cancel.mjs` 扩展为 **6 项检查全部通过**。新增项断言两个入口**共用同一助手**、助手内部 `restoreTransforms` 确实先于 `finishCanvasDrag`、且 `onUiPointerCancel` 确实路由到助手。`pnpm check` 退出码 0。

**状态**：`IMPLEMENTED`（有行为证据），仍**未**在真实 GUI 中人工触发一次 pointercancel 走查，故不标 VERIFIED。

### 16.3 G6 最后一面已闭合：顶点拖动取消还原

**问题**：顶点拖动在移动中**直接改写** `entity.vertices` / `entity.renderer.vertices` / `entity.collider.vertices` / `authoring.path.points` 与 transform scale，而 `dragMeta` 只保存了右键缩放模式需要的 `initialScaleX/Y` 与 `initialDist`。取消时 `finishCanvasDrag()` 仅把 `isVertexDragging` 复位 → 几何改动同样被遗留且不入历史。**与 G6 是同一缺陷的第三面。**

**修复**：
1. 新增 `src/editor/vertexDrag.ts`（**独立模块以便行为验证**，不再内联在 SFC 中）：`captureVertexBaseline(entity)` 复制 scale 与四个几何数组；`restoreVertexBaseline(entity, baseline)` 整体写回。
2. `beginVertexDrag` 在开始拖动时捕获基准，存入 `dragMeta.vertexBaseline`。
3. `cancelActiveCanvasDrag` 在变换还原之外增加顶点还原；两个入口（Escape / pointercancel）的条件放宽为 `gizmoDrag || isVertexDragging`。

**类型正确性（由 `pnpm check` 捕获）**：初版把 `vertices` 当作 `Entity` 的固有字段，`vue-tsc` 报 **TS2339 `Property 'vertices' does not exist on type 'Entity'`**——`vertices` 只存在于形状实体。已改为显式结构化访问（`readShapeVertices` + `Array.isArray` 守卫），**不是用 `as any` 掩盖**，因此非形状实体不会被误写。

**证据**：`scripts/verify-engine-gizmo-cancel.mjs` 扩展到 **9 项全部通过**，其中顶点相关 3 项：
- 拖动写入 commit 后 restore，**五个几何维度与 scale 全部精确还原**；
- **基准是副本**：破坏当前几何后仍能正确还原（证明捕获不是引用别名）；
- 源码级守护：`beginVertexDrag` 确实捕获、`cancelActiveCanvasDrag` 确实先还原后 teardown、两个入口都覆盖顶点拖动。

`pnpm check` 退出码 0。

### 16.4 C 组 G2 的第一步：按键文案统一为单一绑定源

**问题**（§15.1 G2）：`TopBar.vue:78` 把「命令面板」标为 `Ctrl K`，而 `shortcuts.ts:8` 的实际默认绑定是 **`Ctrl+Shift+P`**；`WorkspaceBar.vue:37` 又写成第三种格式 `Ctrl Shift P`。三处硬编码、一处错误。

**根因**：两个外壳都**没有**导入 `src/editor/shortcuts`，而是各自硬编码 `<kbd>` 文本。因此用户改键后，界面显示的仍是旧按键——显示与实际绑定会**静默不一致**。

**修复**：
1. `shortcuts.ts` 新增唯一展示入口 `shortcutLabel(command, style = 'kbd')`：`kbd` 输出 `Ctrl Shift P` 形式，`inline` 输出 `Ctrl+Shift+P` 形式供 `title` 使用；未知命令返回空串而非抛错。
2. `TopBar.vue`：4 处 `<kbd>` 改为 `{{ shortcutLabel(...) }}`（含修复错误的 `Ctrl K`）。
3. `WorkspaceBar.vue`：`title` 与两个 `data-shortcut` 属性、两个 `<kbd>` 全部改为派生。

**证据**：新增 `scripts/verify-editor-shortcut-labels.mjs`，**5 项全部通过**（报告 `reports/phase2/shortcut-labels.json`）：

| 检查 | 内容 |
|---|---|
| 1 | 5 个命令的 `kbd`/inline 文案与其**当前绑定**逐一相符 |
| 2 | 命令面板默认确为 `Ctrl+Shift+P`，且其标签**不含 K**（固化此前的错误） |
| 3 | **行为验证**：`setShortcut` 改键后标签随之变化，`resetShortcuts` 后恢复默认 |
| 4 | 未知命令返回空串，不抛错 |
| 5 | 两个外壳都导入唯一源，且不再残留硬编码绑定 |

**由检查工具捕获的真实缺陷**：`vue-tsc` 报 **TS2550 `Property 'replaceAll' does not exist on type 'string'`**（本项目 lib 目标低于 ES2021）。已改用 `split('+').join(' ')`，未放宽编译配置。

`pnpm check` 退出码 0。

**状态**：这一步只闭合了 C 组 **G2 的按键文案一致性问题**，**没有**建立 §22.2 的 Command Registry 本体。`TopBar.vue` 仍有 **10 处硬编码 `<kbd>`**（保存/撤销/重做/复制/粘贴/复制副本/F2/Del/Esc/Ctrl Alt H），它们对应的动作**根本不在 `shortcuts.ts` 的 10 条命令内**，因此不可改键、也无单一源可派生——这正是 C 组 **G4**。Command Registry 本体与这 10 项的接入留待后续轮次。

### 16.5 更正 N0 的纯图标按钮度量，并修复关键动作可读性（C 组 G3）

**度量更正（第二次同类型纠错）**：N0 报告 §7 统计「349 处 `UiButton` 中 145 处无 `label`」并称之为纯图标按钮。读 `src/ui/components/UiButton.vue` 后确认该统计**测错了属性**：

```html
<button :title="label || …" :aria-label="icon && !$slots.default ? label || … : …"
        :class="[…, { 'ui-icon-button': icon && !$slots.default }]">
  <EditorIcon v-if="icon" :name="icon" /><slot />
</button>
```

- `label` **只**用于 `title` 与 `aria-label`，**从不渲染为可见文字**；
- 可见文字**只**来自默认插槽；
- 真正的纯图标判定是 **`icon && !$slots.default`**（即 `.ui-icon-button`）。

**按正确口径重测（全部 101 个 `.vue`）**：

| 口径 | 数量 |
|---|---|
| 有图标且**无可见文字**（自闭合 215 + 空插槽 3） | **218** |
| 有图标且**有可见文字** | 99 |
| 无图标 | 32 |

即 **317 个图标按钮中约 69% 没有可见文字**——问题比 N0 报告的更严重，而不是更轻。（这也印证了 C 组审计的判断：`EditorBottomPanel.vue:41-46` 那几个按钮**写了 `label` 却仍是纯图标**。）

**已修复**：资产面板的 5 个主要创作入口加上可见文字，并保留 `:label` 以维持 tooltip 与可访问名称：**导入资源、新建脚本、可视化图、从选中创建场景资源、新建文件夹**。纯图标数 **218 → 213**，有文字数 **99 → 104**。

**证据**：新增 `scripts/verify-editor-action-labels.mjs`，**4 项全部通过**（报告 `reports/phase2/action-labels.json`）：
1. 5 个动作确实渲染可见文字；
2. 5 个动作仍保留 `:label`（tooltip/aria 未牺牲）；
3. 度量按 `icon && !slot` 口径执行并输出完整清单；
4. **回归上限**：纯图标数不得超过 **213**——该上限只能下调；上调必须在代码里写明理由。

`pnpm check` 退出码 0。

**边界**：只处理了 5 个**主要创作入口**。剩余 **213** 个纯图标按钮多为面板内的次要工具（工具栏、动画/图集/动画时间轴等），是否补文字取决于 §21/§22.1 的分层判断，**不做无差别铺开**——AGENTS §12 同时要求保护舒适密度与既有布局。未在真实 GUI 中确认新增文字后工具栏不溢出，故标 `IMPLEMENTED`。

### 16.6 C 组 G4（第一步）：核心编辑命令纳入可改键源

**问题**（§15.1 G4）：`TopBar.vue` 的 10 个核心编辑动作（保存/撤销/重做/撤销历史/复制/粘贴/复制副本/重命名/删除/取消选择）按键**硬编码在 `handleKeyDown` 里**，对应的命令**根本不在 `shortcuts.ts` 中**——因此既不出现在快捷键编辑器里，也无法由用户更改。

**本轮完成**：
1. `shortcuts.ts` 登记 10 个核心命令及其默认绑定（保存 Ctrl+S、撤销 Ctrl+Z、重做 Ctrl+Y、撤销历史 Ctrl+Alt+H、复制 Ctrl+C、粘贴 Ctrl+V、复制副本 Ctrl+D、重命名 F2、删除 Delete、取消选择 Escape）。这使它们**自动出现在既有 ShortcutEditor 中并参与冲突检测**。
2. `保存` 完成端到端迁移：`handleKeyDown` 改用 `shortcutMatches(event, 'saveProject')` 取代字面量 `event.key === 's'`，其 `<kbd>` 改为 `{{ shortcutLabel('saveProject') }}`。

**发现并记录的契约限制（未掩盖）**：`shortcuts.ts` **每个命令只支持一个绑定**，而 `TopBar` 历史上同时接受 **Ctrl+Shift+Z 与 Ctrl+Y** 作为重做、**Delete 与 Backspace** 作为删除。因此**其余 9 个命令本轮不迁移**——若强行迁移会**丢失别名绑定**，属于行为回归。已在代码注释中写明该限制，并确定后续需先扩展为多绑定/别名契约再统一迁移。

**证据**：`scripts/verify-editor-shortcut-labels.mjs` 扩展到 **7 项全部通过**。新增两项：
- 10 个核心命令均已登记且其显示文案由当前绑定派生；
- 保存确实经 `shortcutMatches` 派发，且字面量 `key === 's'` 已消失。

`pnpm check` 退出码 0。

**状态**：`IMPLEMENTED`（1/10 迁移完成，9/10 因契约限制明确延后并给出理由）。

**过程中的一次自伤与修复**：编辑 `ShortcutCommand` 联合类型时我用了**被截断的 `old_string`**，导致行尾残留 `ter'`，构建立即报 `Expected ";" but found "ter"`。已修复。教训：`old_string` 必须是完整且唯一的最小片段，不能是前缀。

### 16.7 C 组 G4 完成：10 个核心编辑命令全部迁移到可改键源

**前置契约扩展**（上一轮识别出的阻塞）：`ShortcutDefinition` 增加 `defaultAliases`，并新增 `shortcutAliases(command)`；`shortcutMatches` 先比主绑定、再比别名。这样**别名不会因为迁移而丢失**：

| 命令 | 主绑定（可改） | 别名（保留） |
|---|---|---|
| `redo` | `Ctrl+Y` | `Ctrl+Shift+Z` |
| `deleteSelection` | `Delete` | `Backspace` |

**紧凑显示映射**：新增 `DISPLAY_ALIASES`（`Escape→Esc`、`Delete→Del`、`ArrowLeft→←` …），只影响文案、不改变绑定语义，因此既有的紧凑按键胶囊样式得以保留（`Esc`/`Del` 仍是旧写法）。

**迁移结果**：`TopBar.handleKeyDown` 中 **9 处字面量按键判断全部替换为 `shortcutMatches(event, id)`**；`TopBar` 的 **10 处 `<kbd>` 全部改为 `{{ shortcutLabel(id) }}`**。实测 **TopBar 中仅剩 1 处硬编码 `<kbd>`**，且那是手册版本号（`5.0 · 离线`），**不是快捷键**。

**证据**：`scripts/verify-editor-shortcut-labels.mjs` 扩展到 **10 项全部通过**，新增三项：
- **别名存活**：`Ctrl+Y` 与 `Ctrl+Shift+Z` 均可重做、`Delete` 与 `Backspace` 均可删除、且 `Backspace` **不会**误触发撤销（别名不跨命令泄漏）；
- 紧凑显示名 `Esc`/`Del`/`F2`/`Ctrl S` 保持；
- 10 个命令全部经 `shortcutMatches` 派发，且 `TopBar` 中**不再存在任何字面量字母键或特殊键判断**。

四个校验脚本合计 **32 项全部通过**；`pnpm check` 退出码 0。

**由检查工具捕获的真实缺陷**：迁移后 `commandKey` 变为未使用，`vue-tsc` 报 **TS6133 `'commandKey' is declared but its value is never read`**，已删除该变量。

**状态**：`IMPLEMENTED`（行为由模块级测试覆盖，但**未在真实 GUI 中逐键走查**，故不标 VERIFIED）。

### 16.8 快捷键显示文案收敛完成：编辑器中不再有硬编码按键提示

上一轮完成后仍有两处例外，本轮收尾：

**导航键**：`WorkspaceBar.vue` 的**两对**前进/后退按钮（主栏 :18-19 与弹出菜单 :39-40）各自硬编码 `(Alt+←)` / `(Alt+→)` 标题与 `<kbd>Alt ←</kbd>` 胶囊。现全部改为 `shortcutLabel('navigateBack'|'navigateForward', 'kbd'|'inline')`。

因为上一轮加入了 `DISPLAY_ALIASES`（`ArrowLeft→←`），派生结果 `Alt ←` 与既有胶囊**逐字相同**——即这次统一**没有改变任何界面文案**，只是把它接到了唯一源上。

**实测结果**：编辑器内快捷键提示现已全部派生。`TopBar` 仅剩 1 处硬编码 `<kbd>`，且为手册版本号 `5.0 · 离线`（非快捷键）。

**证据**：`scripts/verify-editor-shortcut-labels.mjs` 扩展到 **11 项全部通过**，新增项断言导航键的三种形态（kbd/inline）与绑定一致，且文件中**不再残留任何 `Alt ←`/`Alt →` 字面量**。

`pnpm check` 退出码 0。

**一次操作失误（已修复）**：第一次尝试用单一 `old_string` 替换标题时命中 **2 处**（主栏与弹出菜单各一份），编辑被拒。我改用 `replace_all` 并先核实两处确实是同一语义。教训：**看到"匹配 2 次"应当先确认两处是否真的同义，再决定是否批量替换**——本次确认同义（同一命令的两个入口），故批量替换是正确的。### 16.9 消除测试与实现之间的映射重复

`DISPLAY_ALIASES` 原先只存在于产品代码中，校验脚本**复制了一份**用于推导期望值 —— 这会让断言与实际映射**各自漂移**。现改为导出 `SHORTCUT_DISPLAY_ALIASES`，脚本直接引用，并新增一项断言确认该映射确实由产品代码导出。

**证据**：11 项检查全部通过；`pnpm check` 退出码 0。

---

## 17. 阶段状态小结（截至 round 14）

### 17.1 已完成并有证据

| 项 | 状态 | 证据 |
|---|---|---|
| N0 只读审计（四路） | **完成** | 本文件 §1–§15；四路深度审计归档，含 4 次自我更正 |
| 交接 commit | **完成** | `5917d0d`（558 文件）+ `9828a9a`；门槛 4、5 满足 |
| 冻结面 Owner/冲突清单 | **完成** | §10 |
| N1 契约层第一步 | **IMPLEMENTED** | `componentFieldSchema.ts`（派生非并行）+ 9 项校验 |
| **G6 拖动取消数据损坏** | **IMPLEMENTED** | Escape/pointercancel × 变换/顶点共 4 条路径；9 项校验 |
| **G2 按键文案单一源** | **IMPLEMENTED** | TopBar/WorkspaceBar 全部派生；11 项校验 |
| **G4 核心命令可改键** | **IMPLEMENTED** | 10 个命令登记并迁移，别名保留；11 项校验 |
| **G3 关键动作可见文字** | **IMPLEMENTED** | 5 个主要创作入口；纯图标 218→213 且设回归上限；4 项校验 |

四个校验脚本合计 **34 项**，`pnpm check` 持续为 0。**至今没有任何项标 `VERIFIED`** —— 全部缺少真实 GUI 人工走查，按主指令 §33 不以内部测试冒充体验验证。

### 17.2 未开始 / 阻塞

- **N1 剩余**：描述性 schema（默认值/范围/单位/控件/i18n 键/信号声明）需扩展生成器。
- **N2–N8**：全部未开始。W1–W3 三条制作工作流未验证。
- **C01–C25**：除本轮新增的 5 个脚本外，其余专项测试未建立；**C10（Y-Sort）仍为零覆盖**（C02 已补齐，见 §17.4）。
- **需授权解冻（至今未越界）**：G1 追踪身份（**N8 性能验收的前置条件**）、G2 脚本投影失效收敛、G4 信号循环预算与 C04、G5 Play 独立世界、G9 active list。
- **26.39 发布**：未开始。需要 26.38 的发布流水线（`prepare-release-26.38.mjs` → 14 门禁 → evidence → package → verify）按 26.39 重建。

### 17.3 本轮明确不做的事及理由

- **未做 §22.2 Command Registry 本体**：要满足"同一命令、同一处理器"必须同时迁移 TopBar / CommandPalette / ContextMenu / ActionBar / ProfilerPanel 五处调用点；预算内只能交出**未集成空壳**，而主指令明确禁止把未集成组件当作完成证据。选择先做能端到端落地并验证的事。
- **未对剩余 213 个纯图标按钮无差别补文字**：AGENTS §12 要求"常用工具动作优先图标与 tooltip"，与 §22.1"关键动作需文字"是**分层判断**，不是一刀切。

### 17.4 C02 零覆盖已补齐（仅测试，未改产品代码）

主指令 §28 将 **C02**（局部/世界变换、Keep World 重挂、负缩放、奇异矩阵、插值历史重置）列为必须验证项，而审计确认仓库对此的**专项覆盖为 0**。本轮新增 `scripts/verify-engine-transform-hierarchy.mjs`，**8 项全部通过**（报告 `reports/phase2/transform-hierarchy.json`）：

| # | 验证内容 | 断言要点 |
|---|---|---|
| 1 | 局部/世界复合 | 父 (10,0) + 子局部 (5,0) → 世界 **(15,0)** |
| 2 | 父移动传播 | 父移到 (-4,7) → 子世界跟随到 **(1,7)** |
| 3 | **Keep World 重挂** | 换父后世界位置**不变**（不移动对象） |
| 4 | Keep Local 重挂 | 换到 (-100,-100) 的父后世界变 **(-95,0)**（保留局部值） |
| 5 | **负缩放** | 父 scale.x = -1 → 子世界 x 变为 **5**（镜像） |
| 6 | **奇异矩阵** | 父 scale = (0,0) → 世界位置/旋转/缩放**全部有限**，无 NaN |
| 7 | **环检测** | 把父挂到自己的后代下被报告为环；正常父子关系不误报 |
| 8 | 子树枚举 | 孙节点也被 `descendantsOf` 正确列出 |

**未覆盖并如实标注**：`interpolation history reset on reparent` 属运行期插入历史语义，本脚本**未覆盖**，已写入报告的 `notCovered` 字段，**不以通过冒充已验**。

**本轮未改任何产品代码** —— 这是纯测试补齐，因此**不可能引入回归**，但也因此**不构成功能完成**：它证明的是"现有变换语义符合预期"，不是"新增能力已实现"。

### 17.5 C10 / Y-Sort 性能缺陷：已完成调用链核实（只读，未改代码）

A 组审计曾判定 Y-Sort「排序键内再算 `worldTransform` → 每帧 O(n·depth) 全场景排序」。本轮**独立核实**该判定，取得精确调用链：

```text
sceneRenderer.ts:316  .sort((first, second) =>
                        sortingLayer(first) - sortingLayer(second)
                        || authoredOrder(first, …) - authoredOrder(second, …))
sceneRenderer.ts:156  function authoredOrder(entity, base, entities) {
                        return base + entity.authoring.zOrder
                          + (entity.authoring.sortMode === 'YSort'
                             ? -worldTransform(entity, entities).position.y * .000001
                             : 0)
                      }
```

**结论（比原判定更严重）**：比较器对**每一次比较**调用两次 `authoredOrder`，而后者对 YSort 实体调用一次 `worldTransform`。`Array.prototype.sort` 的比较次数为 O(n log n)，因此每帧的 `worldTransform` 调用数为 **O(n log n)**；若 `worldTransform` 为 O(depth)，总复杂度是 **O(n log n · depth)** —— 原判定的 "O(n·depth)" 是**低估**。

**尚未确定的部分（不冒充已知）**：`hierarchy.ts:25/30` 提供 `prepareHierarchyIndex` / `invalidateHierarchyIndex`，说明可能存在层级索引缓存。**`worldTransform` 的实际单次复杂度取决于该索引是否被命中，本轮未测量**，因此不宣称具体数量级。要做的是先测、再改。

**同为证据的旁证**：`sceneRenderer.ts` 另有 6 处逐实体 `worldTransform` 调用（:77/:179/:216/:245/:322/:353）。这些是**每实体一次**（O(n)），与比较器内的调用不是同一量级问题，**不应混为一谈**。

### 17.6 已测量：`worldTransform` 是 O(depth)，排序键代价由此定量

上一轮明确标注"未测量"的问题，本轮已用实测解决。`scripts/measure-world-transform-cost.mjs`（**只读测量，未改产品代码**）在 200 层父子链的最深节点上调用 `worldTransform`，并先执行 `prepareHierarchyIndex`：

| 深度 | 单次耗时 |
|---|---|
| 1 | **498.9 ns** |
| 200 | **64,759.2 ns** |
| 比值 | **129.8×** |

**判定：`worldTransform` 随深度线性增长（O(depth)），层级索引并未把它变成常数时间。** 最小二乘斜率约 **(64759 − 499) / 199 ≈ 323 ns / 每层祖先**。

**由此定量 Y-Sort 代价**（`sceneRenderer.ts:316` 比较器 × `:156` 排序键）：

- 每帧 `worldTransform` 调用数 = **O(n log n)**
- 单次成本 ≈ **323 ns × depth**
- 合计 ≈ **O(n log n × depth × 323ns)**

**外推（标注为外推，非实测）**：1,000 个 YSort 实体（约 10⁴ 次比较、2×10⁴ 次调用），若平均深度 10（≈3.4 µs/次）→ **约 68 ms/帧**；深度 50（≈16 µs/次）→ **约 326 ms/帧**。这足以单独解释用户报告的 30–40 FPS 体感。

**注意**：上述外推基于本次线性实测与合成场景，**不是对用户真实项目的测量**，也未包含缓存与 JIT 的实际差异，故不以它宣称具体 FPS。

**结论**：A 组审计的 "O(n·depth)" 是**低估**，正确形式为 **O(n log n · depth)**；本轮已从"定位"推进到"定量"。

### 17.7 冻结面解冻记录与修复：Y-Sort 排序键

**解冻记录（按 §10.1 规则，由集成者追加）**

| 项 | 内容 |
|---|---|
| 范围 | 仅 `src/renderer/sceneRenderer.ts` 中**一个**排序调用点（原 :315-316）。**未触碰**其余渲染器逻辑、World、ABI、Worker、调度器或锁文件。 |
| 理由 | 该排序键对每个 YSort 实体调用 `worldTransform`，而实测 `worldTransform` 为 O(depth)（323ns/层）。比较器把它重复 O(n log n) 次，是**已定量**的严重缺陷，且与用户最初报告的 30–40 FPS 直接相关。 |
| 用户约束核对 | 用户约束为"**不允许并发重写** Runtime/Worker/ABI/Renderer/全局调度器/锁文件"。当前工作区**无并发写入者**，本次为单点修复而非重写，符合约束。 |
| 验证计划 | `pnpm check` + 全部 5 个校验脚本 + 记录算法级调用数变化；**未做**前后帧时间对比测量（见下）。 |

**修复内容**（装饰-排序-去装饰）：把排序键从比较器内移出，改为**每个实体预计算一次**：

```ts
const positioned = candidates.filter(…)
const orderKeys = new Map<number, number>()
for (const entity of positioned) orderKeys.set(entity.id, authoredOrder(entity, entity.renderer.orderInLayer, entities))
const visible = positioned.sort((first, second) =>
  sortingLayer(first) - sortingLayer(second)
  || (orderKeys.get(first.id) ?? 0) - (orderKeys.get(second.id) ?? 0)
  || first.id - second.id)
```

**算法级效果（可推导，非实测帧时间）**：每帧 `worldTransform` 调用数由 **O(n log n)** 降为 **O(n)**。n=1000 时比较次数约 n·log₂n ≈ 10⁴，原路径约 **2×10⁴ 次**调用，现为 **10³ 次** —— 约 **20×** 减少。**排序结果不变**（键值与比较顺序均未改变，仅求值时机改变）。

**未做的验证（不掩盖）**：
- **未做前后帧时间对比**：无真实项目与 GUI 会话，不宣称具体 FPS 改善。
- **C10 测试仍为零覆盖**——本轮修的是已量化的缺陷，不是补齐 C10 验收。

**验证证据**：`pnpm check` 退出码 0；**5 个校验脚本 41 项全部通过，0 失败**。

**状态**：`IMPLEMENTED`（含算法级证据），**不标 VERIFIED**——真正的性能结论需要在真实项目中按 §26.1 固定条件测量，本轮未做。

### 17.8 修复已 A/B 实测：11–14× 提速，但**不足以解决问题**

上一轮只给出推导值（约 20×）。本轮用 `scripts/benchmark-ysort-sort-key.mjs` **重建两种策略并实测**（合成场景，每策略 5 次取中位数，纯 CPU 排序，不含 GPU 与帧管线）：

| 场景 | 修复前 | 修复后 | 提速 | 顺序一致 |
|---|---|---|---|---|
| n=1000, depth=10 | **31.96 ms** | **2.91 ms** | **11.0×** | ✅ |
| n=1000, depth=50 | **157.97 ms** | **11.28 ms** | **14.0×** | ✅ |

**实测低于推导值**（推导约 20×，实测 11–14×）。我采信实测，并更正上一轮的推导表述。

**关键结论：修复是必要的，但不充分。**

- 修复前 depth=50 时**单次排序 158 ms** —— 这已足以单独把帧率压到个位数，与用户报告的 30–40 FPS 量级吻合。
- 修复后仍是 **11.28 ms**。在 240Hz 的 4.17ms 帧预算下，**仅这一项排序就超预算 2.7 倍**。原因是 `worldTransform` 本身仍是 O(depth)：1000 次调用 × 约 16 µs ≈ 16 ms，与实测 11 ms 一致。

**因此仍需后续工作**（均未做，且属冻结面）：
1. 让 `worldTransform` 真正 O(1)（修复层级索引，或缓存世界矩阵并在脏标记时失效）—— 这也正是 A 组审计第 2 项缺口「Transform 无 dirty/版本」；
2. 或把 Y-Sort 限制在显式排序组内，避免全场景参与。

**状态**：`IMPLEMENTED`（含**实测** A/B 证据）；**不标 VERIFIED** —— 本轮测的是重建算法的 CPU 排序，**不是**真实项目中的帧时间，也未在真实 GUI 中观察。

### 17.9 让 `worldTransform` 变 O(1)：设计、风险与**被否决的方案**

**实测到的成本来源**（`hierarchy.ts:43-74`）：`worldTransform` 递归到父级（`:57`），且**每一层都新建对象**（`:44-51` 的 local、`:59-62` 的 offset、`:63-73` 的返回值）。因此 323ns/层不只是遍历成本，还包含 O(depth) 次分配。父级查找本身已是 O(1)（`:34-41` 的 uuid 索引）。

**被否决的方案：给 `worldTransform` 加全局记忆化缓存。**

看似直接，但有一个**会导致静默数据错误**的致命问题：`hierarchy.ts` **无法观测** `entity.transform.*` 与 `entity.parentUuid` 的写入。现有 `invalidateHierarchyIndex()`（`:30`）只清 uuid 索引，`prepareHierarchyIndex`（`:25-28`）仅按**数组身份/长度/首尾对象**判断是否重建——**这些条件对"某个实体的 transform 被改写"完全不敏感**。

因此全局缓存会在以下任一写入后返回**过期变换**，且没有任何编译期或运行期信号：

| 写入者 | 位置 | 后果 |
|---|---|---|
| 编辑器 gizmo 拖动 | `WorldCanvas.vue`、`gizmo.ts`（本轮刚修过取消路径） | 拖完对象回到旧位置 |
| 物理位姿回写（Rust） | `World.ts:504` | 物理与渲染分离，画面冻结 |
| 脚本/动画写入 | 运行期各 Owner | 动画不生效 |
| 父级变更 | `setParent`（`:128`） | 子树错位 |

**"渲染错位但无报错"比"慢"严重得多**，因此**不在无法穷举写入者的情况下采用全局缓存**。

**建议方案：每帧、按调用点的批量求解，而不是全局缓存。**

提供一个**拓扑序**批量接口，例如 `worldTransformsFor(entities, subset)`：按父子依赖顺序自顶向下一次算完，把结果放进**调用方持有的局部 Map**。

- 生命周期由调用方掌握（一次渲染抽取 / 一次 Y-Sort 排序），因此**不存在过期问题**——不需要任何全局失效信号；
- 复杂度降为 **O(n + depth)** 而非 O(n × depth)，因为每个祖先只算一次；
- 不改变 `worldTransform` 的现有语义，物理与脚本路径**零风险**。

**适用调用点**（渲染抽取中逐实体调用 `worldTransform` 的 6 处：`sceneRenderer.ts:77/179/216/245/322/353`，以及本次修好的排序键）。

**为什么本轮不实施**：该改动会触及渲染抽取的多个调用点与渲染顺序，而我**没有 GUI 会话可以验证画面**。本轮预算不足以在"改完但只能做静态检查"的条件下安全交付。已按三步走策略完成第一步（**基准已建立**，见 §17.6/§17.8），下一步应先写该批量接口的**独立正确性测试**（对同一场景断言批量结果与逐次 `worldTransform` **逐个相等**），再替换调用点，再 A/B 实测。

**状态**：`DEFERRED_WITH_REASON`（设计已完成，风险已登记，未实施）。

### 17.10 优化前的判定基准（oracle）已建立

任何批量/缓存变换路径都必须与现有语义**逐个相等**。为避免"用产品代码验证产品代码"的循环论证，`scripts/verify-engine-world-transform-oracle.mjs` **在测试内独立重写了一遍组合公式**（父子位移按父旋转旋转、旋转按父缩放符号取反、缩放逐轴相乘），再与 `worldTransform` 交叉比对。**4 项全部通过**：

| 检查 | 意义 |
|---|---|
| 产品组合 == 独立实现 | 三层链（含 root 旋转 0.7、mid 负缩放 (-1,2)、leaf π 级旋转）上**逐字段相等**，独立实现与产品实现没有共享代码 |
| 重复调用稳定 | 证明"帧内缓存"可与之比对 |
| **父级编辑下一次调用即生效** | **这正是全局缓存会破坏的性质**——把它固化为测试，使未来的错误缓存无法悄悄通过 |
| 重挂后结果随父级改变且匹配 oracle | 覆盖 reparent 到祖先与脱离父级两种情形 |

**为什么这一步重要**：它把 §17.9 里"先写正确性测试"的要求落地了。没有它，任何 O(1) 优化都只能靠肉眼比对画面——而我没有 GUI 会话。

**状态**：测试基准就绪（`IMPLEMENTED`）。批量接口本身仍为 `DEFERRED_WITH_REASON`。

### 17.11 批量变换求解器已实现并验证（未替换调用点）

**单一组合实现**：把组合公式抽成 `composeWorldTransform(parentWorld, local)`，并把局部归一化抽成 `localTransform(entity)`。递归版 `worldTransform` 与批量版**共用同一份公式**，因此**不存在两份实现各自漂移**的风险（这正是我上一轮担心的点）。

**新增 `worldTransformsFor(entities, subset)`**：按需解析父级并缓存，**每个祖先只计算一次**；缓存由调用方持有，生命周期为一次渲染抽取或一次排序，因此**不需要任何全局失效信号**——绕开了 §17.9 里那个会导致静默过期的问题。缺失父级与环的语义与 `worldTransform` 一致。

**验证（6 项全部通过）**：在原有 4 项 oracle 之上新增 2 项：

| 检查 | 内容 |
|---|---|
| 三层链批量等于逐次 | 每个实体 `worldTransformsFor` 结果与 `worldTransform` **逐字段相等** |
| **60 层长链 + 子集** | 含负缩放 (−1.5, 0.5) 与任意旋转，全链每个实体相等；**且只请求 1 个实体时其全部祖先也被正确解析** |

**重构是行为保持的**：改动 `worldTransform` 结构后，oracle 的 4 项（含与**独立实现**的交叉比对）与 C02 的 8 项**全部原样通过**，未做任何断言调整。

**验证总量**：六个脚本 **47 项通过，0 失败**；`pnpm check` 退出码 0。

**未做**：**未替换任何调用点**。渲染抽取的 6 处 `worldTransform`（`sceneRenderer.ts:77/179/216/245/322/353`）与排序键仍走原路径，因此**本轮没有产生任何性能收益**——交付的是**已验证可用的求解器**与替换所需的判定基准。替换属冻结面，需按 §17.9 的三步走继续，并需要 GUI 会话验证画面。

### 17.12 排序键已切换到批量求解：实测 **23.6× / 98.4×**，并回到帧预算内

**改动**（仅在已解冻的那一个排序调用点）：`sceneRenderer.ts` 的排序键改为经 `worldTransformsFor` 批量求解世界 Y；`authoredOrder` 增加可选的 `worldY` 参数，省略时退回单次查询以保持既有行为；**无 YSort 实体时完全跳过批量求解**，不付出任何额外成本。

**实测（合成场景，每策略 5 次取中位数，纯 CPU 排序）**：

| 场景 | ① 原路径（比较器内求键） | ② 每实体预计算 | ③ **批量求解（本轮）** | ①→③ |
|---|---|---|---|---|
| n=1000, depth=10 | 29.16 ms | 2.33 ms | **1.24 ms** | **23.6×** |
| n=1000, depth=50 | 143.97 ms | 8.98 ms | **1.46 ms** | **98.4×** |

**三种策略排序结果完全一致**（`order identical: true`）。

**关键观察**：批量路径的耗时**几乎与深度无关**（depth 10 → 50 仅从 1.24 升到 1.46 ms），而原路径从 29 升到 144 ms、每实体预计算从 2.33 升到 8.98 ms。这正是 `O(n + depth)` 与 `O(n × depth)` 的差别 —— **每个祖先只计算一次**。

**回到帧预算内**：depth=50 时排序耗时 **1.46 ms < 240Hz 的 4.17 ms 预算**。对比该缺陷被发现时的 **143.97 ms**，这是从"单项就足以压垮帧"到"留有约 2.8× 余量"的改变。

**我的推导两次高于实测**（上一轮推导 20× 实测 11–14×；本轮未再推导，直接实测）。采信实测。

**验证**：`pnpm check` 退出码 0；**六个校验脚本 47 项全部通过**（oracle 含批量相等性、C02、G6 拖动取消、契约层、快捷键、图标标签）。

**未做（不掩盖）**：
- 本轮测的是**合成场景的 CPU 排序**，**不是真实项目帧时间**，因此**不宣称任何 FPS 数字**。
- 渲染抽取的其余 5 处 `worldTransform`（`:77/179/216/245/322/353`）**未替换**。
- 未在真实 GUI 中观察画面，故仍**不标 VERIFIED**。

**状态**：`IMPLEMENTED` + **实测性能证据**。

### 17.13 批量求解器的边界行为：环状数据下两路径**不一致**（已记录，未掩盖）

为批量求解器补边界测试时发现一个**真实差异**，如实记录：

**构造**：`a.parentUuid = b.uuid` 且 `b.parentUuid = a.uuid`（`setParent` 会拒绝这种环，但已加载或手工编辑的文档仍可能含有）。

**行为**：
- **两路径都终止**，不挂死（批量路径实测毫秒级，远低于 2s 断言上限）；
- **两路径都返回有限值**（无 NaN/Infinity）；
- **但两者结果不同**：批量给 b 的 y=2，逐次调用给 b 的 y=4。

**原因（已定位）**：环没有合法的世界变换，而"断环点"依赖**起始顺序**——递归版从**被查询的实体**断环，批量版从**遍历中首次重入正在解析的节点**处断环。

**更关键的一点**：递归版在环上**自身也不自洽**——a 的世界位置为 (2,2) 而 b 的为 (1,4)，两者对彼此的相对位置并不一致。**因此这不是"批量版错了"，而是"环状输入本身无定义"。**

**我如何界定测试**：把该用例的断言限定为**终止性 + 有限性**，而**不是**两路径相等——并**另加一项测试**明确要求**合法层级仍逐字段精确相等**（三层链全实体）。这样既记录了差异，又确保**差异被限定在非法输入**内，不会掩盖合法场景的回归。

我特意没有把断言删掉或放宽成空断言：**差异本身被写进了报告与代码注释**。

**测试总量**：oracle 现有 **9 项全部通过**。

### 17.14 环状层级：检测能力已落地，策略仍未接线

**新增 `hierarchyHasCycle(entities)`**（仅检测，不修改数据）：沿 `parentUuid` 上溯，当前路径上重复出现同一实体即为环；先用 Map 建索引以保证**线性成本**，不做 O(n) 的 `find`。

**测试（5 种形态，全部通过）**：

| 形态 | 期望 | 结果 |
|---|---|---|
| 合法三层链 | 非环 | ✅ |
| 父级 UUID 不存在 | 非环（是缺失，不是环） | ✅ |
| **实体以自身为父** | **环** | ✅ |
| **两节点互指** | **环** | ✅ |
| 两个独立根 | 非环 | ✅ |

`pnpm check` 退出码 0；oracle 现有 **10 项全部通过**。

**未接线（明确说明，不冒充完成）**：本函数**尚未被任何加载或保存路径调用**。因此**当前行为与上一轮相同**——环状文档既不拒绝也不修复，只是不崩溃，且两条变换路径会给出不同结果。

**下一步需要的决定**（仍待您指定）：在 `projectData` 加载时**拒绝并报告**、在保存时**阻止写出**、还是**自动断开**并告知用户。检测能力已就绪，接线位置属于产品决策。

**状态**：检测 `IMPLEMENTED` + 已测；**策略接线 `DEFERRED_WITH_REASON`**（需产品决策）。

---

## 18. 交接：精确锚点与下一步

> 本节为交接而写。以下锚点均经本轮实际读取确认，可直接开工，无需重新搜索。

### 18.1 复现全部验证（无 GUI 依赖）

```powershell
cd E:\Nova_A
node scripts/verify-engine-world-transform-oracle.mjs      # 10 项
node scripts/verify-engine-transform-hierarchy.mjs         # 8 项  (C02)
node scripts/verify-engine-gizmo-cancel.mjs                # 9 项  (G6)
node scripts/verify-engine-component-schema.mjs            # 9 项  (N1 契约层)
node scripts/verify-editor-shortcut-labels.mjs             # 11 项 (G2/G4)
node scripts/verify-editor-action-labels.mjs               # 4 项  (G3)
node scripts/benchmark-ysort-sort-key.mjs                  # Y-Sort A/B 实测
node scripts/measure-world-transform-cost.mjs              # worldTransform 复杂度
pnpm check                                                  # vue-tsc + tsc
```

合计 **51 项断言**，报告写入 `reports/phase2/*.json`。

## 19. 批次进展日志（N1–N8）

### 19.1 批次 A：N1 类型与文档契约（A1–A3 完成）

- **A1**：生成器重写为可读形式并扩展，产出 `src/world/componentFieldDescriptions.ts`（59 kind / 595 字段 / **515 带静态默认值**）。既有 `componentPrimitiveTypes.ts` **逐字节不变**（`--check` + `git diff` 双重证明）。
- **A2**：`componentFieldSchema.ts` 改为派生自新生成物，暴露 `optional` 与 `defaultValue`；校验器断言这两者**必须来自生成物**。
- **A3**：`componentFieldPresentation.ts` 由类型与命名推导控件、由登记表推导分组；**数值范围/步进/单位一律留空**并写明需要源码证据。

**确认的事实**：`Transform2D` **不是已登记的组件 kind**（在 `hierarchy.ts` 中），因此 `Core` 分组为空。Node 门面设计必须尊重这一点，不能把它硬塞成组件。

契约层校验器现有 **13 项**全部通过。

### 19.3 批次 B2：生命周期派发改为树序

**解冻记录（按 §10.1 规则，由集成者追加）**

| 项 | 内容 |
|---|---|
| 范围 | `src/world/hierarchy.ts` 新增 `hierarchyOrder`；`src/runtime/GameplayRuntimeCore.ts` 的 `ensureLifecycle` 改为消费它。**未触碰** Worker、ABI、渲染器、调度器、锁文件。 |
| 理由 | A 组审计指出 `awake`/`start` 按 `entities` **数组存储顺序**派发，而非树结构顺序（§5.1 要求明确的父子序）。数组顺序是存储细节，不应决定生命周期语义。 |
| 用户约束核对 | 约束为"不允许**并发重写** Runtime"，本次是单点语义修复，当前无并发写入者。 |
| 验证计划 | 顺序性质单测 + 源码级接线守护 + `pnpm check` + 现有 runtime 校验脚本回归。 |

**实现**：新增 `hierarchyOrder(entities)` —— 父级先于子级的拓扑序，**同级保持输入相对次序**；缺失父级/自引用按根处理；**环中的实体也保证被收录**（输出必为输入的一个排列，顺序问题不能让实体消失）。

`ensureLifecycle` 中：

- `awake` 近似"进入树" → **父先子先**（`parentFirst`）
- `start` 近似"就绪" → **子先父先**（`[...parentFirst].reverse()`）

**验证**：oracle 增至 **15 项全部通过**，新增 5 项：

| 检查 | 内容 |
|---|---|
| 父先子先 + 同级稳定 + 不丢实体 | 故意乱序输入（孙在父前、同级逆序），断言输出是输入的排列且父必在子前 |
| 逆序即子先父先 | 三层链逆序后最深实体最先 |
| 环中实体仍被收录 | 两节点互指时输出长度仍为 2 |
| **运行时确实消费该顺序** | 源码级断言：`ensureLifecycle` 中 awake 用 `parentFirst`、start 用其逆序，且 awake 先于 start |
| 覆盖范围显式化 | 报告 `lifecycleCoverage`，并**显式记录未覆盖项** |

**未覆盖并如实记录**：报告 `notCovered` 明确写出 `awake and start are not yet exercised end to end against a real Rhai script asset` —— 顺序性质与接线已验，**端到端脚本执行未验**。

**发现并确认的既有失败**：`scripts/verify-engine-runtime-script-services.mjs` 报 `WORLD_GAMEPLAY_WORLD_ALREADY_BOUND`（在 `new GameplayRuntime` **构造期**抛出，早于任何生命周期派发）。为排除本次改动的影响，我用 `git stash` **临时移除改动后重跑，同样失败**，确认属**既有问题**，已单独记录，不计入本次回归。

### 19.4 批次 B3：信号队列 —— 丢弃不再静默

**问题**（B 组审计 G4）：`emitSignal` 在超过 1024 时 `splice` 掉最旧条目，**只记一条 warning**：既不计数、也无法定位丢了什么；每条信号也**没有序号**，顺序与消费无法关联。

**实现**：新增 `src/runtime/signalQueue.ts`（**不依赖 Runtime 或 Vue，可在 Node 独立验证**）：

- 每条信号分配**单调序号**（从 1 起），入队顺序与 `drain` 输出顺序一致；
- 超限时丢弃最旧条目，并记录**丢弃数量、丢弃序号区间、溢出批次次数**；
- `dropTarget(target)` 取代原先的数组 `filter`；`clear()` 只清队列、**保留累计计数**（序号不回退，保证后续顺序仍可比较）；
- 非正整数上限**直接报错**，而不是静默变成无界队列。

**Runtime 接线**：`pendingSignals: RuntimeSignal[]` 整个移除，改为 `SignalQueue`；`emitSignal` 经队列入队并报出**本次与累计**丢弃数；`dispatchSignals` 用 `drain()`；实体移除用 `dropTarget()`；新增公开 `signalQueueStats()` 供诊断读取。未使用的 `RuntimeSignal` 接口由 `vue-tsc` 报 **TS6196** 后删除（检查工具再次发挥作用）。

**验证**：新增 `scripts/verify-engine-signal-queue.mjs`，**7 项全部通过**：

| 检查 | 内容 |
|---|---|
| 顺序与序号 | 序号 1,2,3,4 递增；drain 保持入队顺序 |
| **溢出可观测** | 上限 4 入队 7 条 → 丢弃 3 条，**记录区间 {from:1,to:3}**，保留最新 4 条 |
| 溢出批次独立计数 | 两次溢出 → `dropped=2`、`overflowEpisodes=2` |
| 按目标移除 | 只移除该目标；**不计入丢弃**，`emitted` 不变 |
| `clear()` 语义 | 清空队列但 `emitted`/`dispatched`/`lastSequence` 保留 |
| 非法上限 | 0 与 1.5 均抛错，不会静默无界 |
| **运行时确实改用它** | 源码级断言：队列已接入，且 `this.pendingSignals` **已不存在** |

**未覆盖并如实记录**（报告 `notCovered`）：**信号参数 schema**、**连接持久化标识**、**同阶段派发顺序对真实脚本的验证** —— 这三项是 typed signal 的其余部分，尚未实现。

### 19.5 批次 B4：输入消费台账 —— 以及一次**被我拦下的重复实现**

**先记录一次自我纠正（本程序第 6 次）**：我按 B 组审计的措辞（"inputSequence / 消费 tick / 首次受影响 packet 全库 0 命中"）先写了一个 `InputTrace` 模块，包含 receipt → submit 的延迟测量、保留上限、null 不填 0。

写完后读 `src/runtime/performance/observability.ts` 才发现：**那部分早已存在且设计正确**——

- `FrameObservability.receipt(now)` 分配序号 token；`submission(now, consumedInputSequence)` 计算 `inputToSubmitMs`；
- 源码注释明确写着 *"A timestamp alone cannot prove that this submission contains a particular input"*，即**只有提供被消费的输入身份才给出延迟**，否则为 null；
- 已有 256 条保留上限与分位数统计；
- `InputReceiptTokenMap` 已按 `(inputEpoch, sequence)` 建立身份。

**我的草稿会造出第二套权威**——正是我一路在防范的事。因此**删除草稿**，改为只实现**真正缺失**的部分：**消费 tick** 与**首次受影响 packet** 的身份绑定，且**不计算任何延迟**、**不重复编号**。

**实现**：`src/runtime/inputConsumption.ts` 的 `InputConsumptionLedger`，键为既有身份对 `(inputEpoch, sequence)`：

- `markConsumed` —— **只有第一个 tick 生效**（多步补算不得改写消费时点）；
- `markFirstAffectedPacket` —— 必须先消费，且**只有第一次调用生效**（后续提交不算"已响应"，§26.4 核心要求）；
- 非法身份/负数/小数**一律忽略**，不产生幽灵记录；
- 有界保留 512，累积计数不受淘汰影响；`pending()` 暴露"已消费但从未到达 packet"的积压。

**验证**：`scripts/verify-engine-input-consumption.mjs` **9 项全部通过**，其中第 9 项是**边界守护**：

> 去掉注释后断言模块代码中**不出现** `Ms`/`latency`/`percentile`/`hrtime`/`performance.now`，也不重述 `inputToSubmitMs`；同时断言 `observability.ts` **仍然**持有该指标与那句证明性注释。

**关于该检查的一次修正**：初版守护直接扫描全文，结果把**注释里用于说明边界的那句话**判成了违规。改为先剥离注释再检查代码 —— 这是**修正过宽的断言**，不是放宽容差：真正的边界（代码中不得计算延迟）仍被强制。

**未覆盖并如实记录**：运行时与渲染器接线、真实端到端显示延迟、与固定步补算路径的交互。

### 19.6 批次 B5：G1 追踪身份**全链路接通**

**先读后写（上一批教训）**：动手前先确认了消费面与提交点的真实形状，由此发现两个必须澄清的事实：

1. **`time.value.frame` 不是固定步 tick**。`time.beginFrame` 每**渲染帧**调用一次（`GameplayRuntimeCore.ts:715`），一次帧内的多次补算**共用同一个 `value.frame`**。若拿它当"消费 tick"，正是 §26.4 禁止的混淆（渲染帧 vs 模拟步）。因此**单独维护 `fixedStepSequence`**。
2. **提交点没有稳定身份**。`markPerformanceSubmission` 原来返回 `void`，无法标识"首次受影响的 packet"。因此让 `FrameObservability` 记录**提交序号**（仅在提交被接受时递增），并由 `markPerformanceSubmission` 返回。

**接线（三处，全链路）**：

| 阶段 | 位置 | 动作 |
|---|---|---|
| 接收 | `receipt` 回调 | `inputConsumption.track(inputEpoch, sequence)` |
| 消费 | 固定步回调的 `firstFixedStep` 分支 | `markConsumed(…, this.fixedStepSequence)` —— 用**真实固定步编号** |
| 提交 | `WorldCanvas.vue:1327` 真实提交点 | `const packet = markPerformanceSubmission(…); gameplayRuntime.bindConsumedInputToPacket(packet)` |

`bindConsumedInputToPacket` 内部经 `pending()` 取"已消费但未关联"的输入，由 `markFirstAffectedPacket` **保证只有第一次绑定生效** —— 因此后续提交不会被误当作该输入的响应。

**验证**：消费台账测试增至 **11 项全部通过**，新增两项守护：

- **运行时确实使用真实固定步编号**：断言 `markConsumed` 传入的是 `fixedStepSequence`，并**显式断言没有把 `time.value.frame` 当消费 tick**；
- **链路在真实提交点闭合**：断言捕获提交序号、在提交之后绑定、且序号来自 observability owner。

**两次断言修正（均属"断言写错"而非放宽容差）**：
1. 非重复守护初版扫描全文，把**说明边界的注释**判成违规 → 改为先剥离注释再查代码；
2. 提交点守护的正则用 `[^)]*`，无法跨越 `performance.now()` 的括号 → 改为匹配返回类型与来源。

**未覆盖并如实记录**：真实端到端显示延迟（**任何 CPU 时间戳都无法确立**）、首次消费步之后的多步归因、以及"该次提交是否确实包含受影响像素"（需真实渲染器运行）。

### 19.7 批次 C 起步：W1 现状实测（找到既有失败并**证明不是我引入**）

进入 N3/W1 前先跑既有验证脚本摸清现状，而不是先假设缺什么。

**运行 `scripts/verify-engine-workflows.mjs`（逐模板串行）**：

| 模板 | 结果 |
|---|---|
| **platformer** | **PASS** —— `create from launcher, save, reload, run and stop` 全通过（含真实保存/重开/运行/停止） |
| **top-down** | **FAIL** —— 超时于 `.actionbar button` 的 `active` 状态，即**点击播放后按钮未进入 active** |

**责任归属已用对照实验确定**：把批次 B 改过的运行时/渲染/层级文件**精确回退到 B1 之前的提交**（`03b5100`）后重跑同一用例，**同样超时**。因此是**既有失败**，不是 B1–B5 引入的回归。（实验后已完整恢复；核实源码全部完好，仅 `reports/*.json` 被重新生成。）

**该用例不在 26.38 的 14 个发布门禁内**（native-build / wasm / web / typescript / focus / motion-logic / user-interactions / browser-layout / windows / headless / hygiene / manual / performance / product）。也就是说：**这是一个未被发布验证覆盖的失败**，本身即为重要事实。

**已排除的假设**：测试追加的 `save_set` / `save_commit` **是真实脚本 API**（`scriptApiCatalog.ts:203,207`；`crates/nova_script/src/lib.rs:2212,2275`），不是"测试调用了不存在的函数"。

**尚未确定的原因**：`pendingReloads` 只被 `flushHotReloads` 消费、会话重置时清空，**未发现它直接阻塞播放**；脚本保存之前的步骤均已通过。播放未激活的确切原因**仍需定位**，本轮**没有修**，也不臆测结论。

**W1 判定范围**：platformer 模板的创建→保存→重开→运行→停止**已由脚本验证通过**；top-down 模板在同一链路失败，故 **W1 整体不能标为通过**，当前为 **`PARTIAL`**。

### 19.8 批次 C：W1 阻塞已定位并修复 —— **三个模板全部通过**

**定位过程（先取证、不猜）**：写 `scripts/diagnose-topdown-play.mjs`，在真实浏览器里抓取播放前后按钮状态、预检文本与控制台错误。结果：

- **播放其实成功**：点击后 Pause 按钮进入 `active`、Stop/Step 可用；工作流测试断言的是**索引 0（Play）**，与实际高亮位置不同；
- **发现真正的问题**：控制台报
  `Error Script Enemy: Function not found: set_velocity (i64, f64) (line 8)`
  —— 出厂 **top-down 模板的 Enemy 脚本**在播放时抛运行期错误。

**根因（已证到代码行）**：

1. `@export(type="float", …) let patrol_speed = 2.0;` 的默认值在项目文档里是 `2`——**JSON 不区分整数与浮点**；
2. `crates/nova_script/src/lib.rs:3425` 的 `json_to_dynamic` 对整数值返回 `Dynamic::from_int`（**i64**）；
3. 注入后 `patrol_speed` 是整数，`set_velocity(patrol_speed, …)` 因物理绑定只接受 `f64` 而**找不到重载**。

**修复（类型感知注入）**：新增 `json_to_export_dynamic(&ExportedProperty, &Value)`，当声明类型为 `float` 且值为整数时提升为浮点；注入点 `:877-884` 改用它。JSON 写法不再决定脚本变量的数值类型。

**回归测试**：`integral_json_value_for_float_export_is_injected_as_float` —— 构造整数形式的 `patrol_speed`，断言**无 `Function not found`** 且 `SetVelocity { x: 2.0 }`。`nova_script` 测试 **38 项全通过**。

**端到端验证（关键）**：仅改 Rust 不够——审计 harness 服务的是 `dist`。依次执行 `pnpm build:wasm:dev` → `vite build` → 重跑诊断：**`consoleErrors: []`**，错误消失。

**最终结果**：`verify-engine-workflows.mjs` **三个模板全部 PASS**：

```text
PASS platformer: create from launcher, save, reload, run and stop
PASS top-down: create from launcher, save, reload, run and stop
PASS responsive-ui: create from launcher, save, reload, run and stop
EXIT=0
```

其中 **top-down 与 responsive-ui 此前从未通过**（后者此前根本跑不到）。这同时解释了 §19.7 记录的"播放未激活"：脚本运行期错误使播放流程异常，而不是按钮逻辑本身有问题。

**全量回归**：`cargo test --workspace` **196 项全部通过**；`pnpm check` 退出码 0。

**状态**：该修复为 **`VERIFIED`** —— 有 Rust 单测、真实浏览器端到端证据、以及完整工作流脚本通过。**W1 从 `PARTIAL` 推进为三个模板的创建→保存→重开→运行→停止链路通过**；W1 其余要求（Area 信号触发交互、保存为可复用场景并在关卡实例化）仍需单独验证。

### 19.9 批次 C：W1 的运行时与编辑器证据（三套验证全部通过）

在修复浮点导出后，把仓库里与 W1 相关、此前未跑或跑不通的验证逐一执行，得到**跨三层**的证据：

**① `verify-engine-workflows.mjs` —— 3/3 模板通过**（§19.8 已记录）：launcher 创建 → 保存 → 重开 → 运行 → 停止。

**② `verify-v26.34-game-scenarios.mjs` —— 7/7 通过**（真实模块 + bundled WASM）：

| 检查 | 覆盖的 W1 要素 |
|---|---|
| Platformer executes authored Rhai against native collision, named inputs, animation, **jump audio** and Stop restoration | 脚本、原生碰撞、**命名输入**、动画、**音效**、Stop 还原 |
| Top-down authored input moves the player and **instantiates its reusable enemy prefab** | **可复用预制体实例化** |
| **Top-down trigger** executes save commands and a **real runtime scene transition**; Stop restores authored world | **sensor/Area → 信号 → 脚本 → 存档 + 场景切换** |
| Responsive UI resolves rectangles, localized text, Unicode input, checkbox and button events | 游戏内 UI |

其中触发器在模板里是 `shape('top-trigger', …, { body: 'Static', sensor: true })` —— **sensor 即 Area**，进入后经信号运行脚本并切换场景，正对应 W1 的"通过 Area 的 signal 触发一个简单交互"。

**③ `verify-v26.34-authoring-user.mjs` —— 5/5 通过**（此前跑不通，原因见下）：
- Fresh project 与真实导入 SVG 资产经 **Save Project 下载**后存活；
- **可见对象创建 + 父级选择**构建嵌套预制体，局部变换与资源引用保持；
- 嵌套预制体 revert / source apply / 独立位移支持**真实 Undo/Redo**；
- 资源导入器实例化独立嵌套可复用层级并修复 UUID 关系；
- **关闭并重开真实下载的项目**后身份、层级、覆盖与导入源保持。

这对应 W1 的"保存角色为可复用场景，在关卡中实例化"。

**该脚本此前失败的原因（测试维护缺陷，非产品缺陷）**：第 8 行把发布号硬编码为 `'26.34'`，第 10 行断言 `package.json` 版本等于它，而当前版本是 `26.38.0`。已改为**从 package.json 推导**发布号（与其他脚本一致），并把版本范围补上 `36`。修复后 5 项全部通过。

**顺带排查**：扫描全部 `scripts/**/*.mjs` 中残留的 `26.3x` 版本固定，共 8 处，**全部是刻意为之**（发布专用脚本、26.34 基线证据、motion 基线必须停留在 pre-polish 版本），无需改动。

**W1 状态更新**：运行时语义、launcher 全流程、编辑器作者流程**三层均有通过证据**。但**仍缺一项**：现有验证都不覆盖"**在编辑器里从零组装一个角色**"（手动添加 CharacterBody2D + 形状 + Sprite/帧动画 + Camera + 脚本、在 InputMap 里配置移动/跳跃、连接 Area 信号）—— 这正是 N3 纵向切片要交付的编辑工作流。故 **W1 仍为 `PARTIAL`**，但证据面已大幅收窄。

### 19.10 批次 C：N3 编辑器纵向切片（新增验收脚本，**已通过**）

新增 `scripts/verify-w1-character-authoring.mjs`：**全部经可见编辑器控件**从空场景组装角色，不使用私有 API。

**流程**（每步均真实 UI 操作）：

1. 新建项目 → 选 **`empty`「Clear Scene」** 模板；
2. 工具栏创建对象 → 调色板搜索 **Rectangle** → 创建 → 双击层级行**重命名**为 `Hero` → Inspector 设位置 (0,4)；
3. 经 Inspector 的 **Add Component** 按钮 + 选择器依次添加：
   `CharacterBody2D`、`SpriteRenderer2D`、`Camera2D`、`Script2D`、`Area2D`；
4. `Save Project` → 在**保存后的文档**中断言 `Hero` 含
   `ShapeRenderer2D`、`CharacterBody2D`、`SpriteRenderer2D`、`Camera2D`、`Script2D`、`Area2D`。

**结果：PASS**（`EXIT=0`）。

**过程中确认的两个产品事实（不是缺陷，但决定了正确用法）**：

1. **collider 不能通过「添加组件」添加** —— `addableComponents` 只来自 `ConfigPanel.vue:576` 的 `optionalComponents` 白名单，其中**不含** `BoxCollider2D`/`EllipseCollider2D`。碰撞体必须由**对象种类**（Rectangle/Circle/Polygon/Collider）创建。我最初的测试按"添加组件"写，因此失败；改为创建 Rectangle 后通过。
2. 可加白名单**包含** `CharacterBody2D`、`Area2D`、`SpriteRenderer2D`、`Camera2D`、`Script2D`，因此第 3 步成立。

**W1 状态**：现有三套既有验证 + 本脚本，已覆盖运行时语义、launcher 全流程、编辑器作者流程、以及**从零组装角色**。**仍缺**（下一批）：经 UI 配置 **InputMap** 动作、连接 **Area 信号**、把角色**保存为可复用场景并在另一场景实例化**、以及组装后**运行验证行为**。故 W1 仍为 `PARTIAL`。

### 19.11 批次 C：InputMap 编辑器**已存在**，并再修复一处过期版本断言

**先纠正一个可能的误判**：我原以为 §9 要求的"ActionMap 可视化配置"缺失。**逐文件查证后确认它存在且相当完整** —— `src/panels/SettingsPanel.vue:104-153`：

| 能力 | 位置 |
|---|---|
| 新增 / 删除 / 复制动作 | `:153`、`:116`、`:117` |
| 动作名、类型（button/axis/vector2） | `:110-111` |
| 上下文、动作映射、控制方案、交互方式（press/hold/tap/multiTap）、优先级、回调函数 | `:122-132` |
| 多设备绑定（device/code/轴/缩放/手柄索引/死区/阈值） | `:135-148` |
| **冲突提示**（`inputConflicts` role=alert） | `:106` |
| 按名称/设备筛选 | `:104` |

**打开路径**：命令面板的 `setting-inputMap` 命令 → `openManageSection('settings')` + 把 `state.settingsSearch` 设为该栏目名（`CommandPalette.vue:169`）。

因此 W1 缺的不是 **InputMap 编辑能力**，而是**尚未有验证脚本覆盖"经该 UI 配置动作"这一步**。这一点必须如实区分。

**顺带修复：`verify-v26.34-input-user.mjs` 的过期版本断言。**
该脚本第 41 行 `release:'26.34'` 硬编码，而同处的 `expectedRelease` 从 `package.json` 推导（`26.38`）；`browserUserAudit.mjs:51` 断言二者相等，因此**该脚本一直无法运行**。已改为两者同源派生。

**修复后该脚本 8 项全部通过**：
- Authored project starts real Rhai input counters through normal Play
- Scrollable game Panel moves its child without activating gameplay wheel
- Bare Game canvas wheel reaches the named action exactly once
- Native game TextInput owns wheel and typed keys
- Inspector and Design canvas wheel remain excluded while Play continues
- Returning to Game restores bare wheel and leaves keyboard gameplay unchanged
- Profiler evidence visibly separates estimates from measured budgets
- Imported font availability note is visible beside supported and metadata controls

**同一类测试维护缺陷已连续出现两次**（authoring 与 input 各一处）：都是把发布号写成字面量。已排查全库其余 8 处版本字面量，均为刻意保留。

### 19.12 批次 C：新增"过期版本固定"守卫，并修复 **19 个** 失效脚本

**守卫 `scripts/verify-script-release-pins.mjs`**：同一类测试维护缺陷此前已出现三次（authoring、input、studio-playback），表现为**脚本静默失去可运行性而无人报警**。守卫只针对确切模式：`withBrowserAudit` 调用里 **字面量 `release:'26.xx'` 与从 `package.json` 派生的 `expectedRelease` 同时存在**，此时 harness（`browserUserAudit.mjs:51`）会断言二者相等，脚本必然失败。

**两次收窄（都是"守卫写错"而非放宽容差）**：
1. 初版扫描全库 `release:'26.xx'` → 命中 **数百** 处。绝大多数是**逐版本脚本固定自己的版本**（`verify-v26.XX-*.mjs` 本就该如此），完全合法。该版本**无意义**，已放弃。
2. 改为"字面量 + 派生 expectedRelease"后仍误报 `verify-v26.26-template-library.mjs` —— 其 `expectedRelease: process.env… || '26.26'` 与 release **一致**。再收窄为"expectedRelease 且调用内出现 `package.json`"。

**发现并修复 19 个真实失效脚本**，全部为 `verify-v26.22-*-user.mjs`：`release:'26.22'` 写死、`expectedRelease` 派生自 package.json，**默认运行必然失败**（仅带 `--development` 才跳过断言）。已统一改为同源派生。守卫现已通过。

**抽查（诚实记录，不夸大）**：修复后运行 `verify-v26.22-scene-prefab-user.mjs`，**第 1 项通过**，第 2 项超时于 `document.querySelectorAll('.scene-tab').length===2`。已确认 **`.scene-tab` 选择器在当前源码中仍存在**（`SceneTabs.vue:9`），因此**不是选择器过期**；但"创建场景后应出现 2 个标签"未成立，**具体原因未确定**。

**结论边界**：守卫只消除**版本固定**这一类失效，**不能保证**这 19 个 26.22 时代脚本在当前 UI 上通过 —— 它们可能另有 UI 漂移。已记为独立的 E2E 维护项，不并入 W1 结论。

### 19.13 批次 C：W1 的 InputMap 步骤已通过 UI 验证

`verify-w1-character-authoring.mjs` 增加第二项检查，**全部经可见 UI**：

1. `Ctrl+Shift+P` 打开命令面板 → 搜索 `Input map` → 执行 `setting-inputMap`（等价于 Manage → Settings 并把搜索词设为该栏目）；
2. 进入 **Input Map** 卡片，记录当前动作数（模板默认 5 个）；
3. **新增一个动作**，命名为 `Move`；
4. 为新动作**录入绑定** `KeyD`；
5. `Save Project` → 断言 `document.projectSettings.inputMap` 中存在 `Move`，且其 `bindings` 含 `code === 'KeyD'`。

**结果：两项检查全部 PASS**（`EXIT=0`）。

**过程中发现的一个交互事实（已记录，原因未下定论）**：用**坐标点击**「Add action」按钮时动作数不增加，改用**程序化 `.click()` 对照后确认处理器本身正常**（5→6）。因此问题在**点击落点**而非产品逻辑。测试已改为**键盘路径**（聚焦按钮 + Enter），并且这一步顺带验证了该动作**可经键盘完成**（对应 §30 的键盘可达性要求）。

是否属于"按钮被遮挡/滚动未到位"尚无定论，未据此宣称产品缺陷。

**W1 覆盖更新**：
- 从零组装角色 ✅（上一轮）
- **经 UI 配置 InputMap 动作与绑定** ✅（本轮）
- 仍缺：**连接 Area 信号**、**把角色保存为可复用场景并在另一场景实例化**、**组装后运行验证行为**。

### 19.14 批次 C：W1 证据汇总与判定

**先纠正第二处可能的误判（与 InputMap 同类）**：C 组审计判定"Signals 层完全缺失"。**逐文件核实后需要更精确的表述**：

| 层 | 实际状态 |
|---|---|
| 运行期信号派发 | **已实现**：`worldGameplayOwner.ts:229-243` 发射 `area.entered` / `area.exited` / `area.damage` / 自定义 effect 信号，均带目标实体与来源；脚本经 `on_signal` 接收 |
| 项目级信号名声明 | **已实现**：`scripting.customSignals: string[]`（`scriptSettings.ts`） |
| 脚本级信号连接 | **已实现**：`signalConnections`（信号名 + 回调 + target/source 过滤），由 **ScriptStudio** 增删 |
| **Godot 式节点 Signals 面板**（§23.4：按类型列出、参数说明、连接对话框、签名校验、组） | **确实缺失** |

因此准确的结论是：**信号能力存在，缺的是 §23.4 的节点 Signals 编辑面板与参数 schema**。把"缺面板"写成"信号层缺失"会误导后续排期。

**W1 证据映射（逐条对应 §29 W1 的要求）**：

| W1 要求 | 验证脚本 | 具体检查 |
|---|---|---|
| 新建场景、创建 CharacterBody2D、添加形状 | `verify-w1-character-authoring.mjs` | 空场景 → Rectangle → Add Component（CharacterBody2D 等） |
| Sprite / Camera / 脚本挂接 | 同上 | 添加 `SpriteRenderer2D`/`Camera2D`/`Script2D`/`Area2D` 并断言进入保存文档 |
| **InputMap 配置移动** | 同上 | 命令面板 → Input Map → 新增 `Move` → 绑定 `KeyD` → 断言进入 `projectSettings.inputMap` |
| **保存为可复用场景** | 同上 | `Create prefab` → 断言预制体资源含全部角色组件 |
| **在关卡中实例化** | `verify-v26.34-authoring-user.mjs`、`verify-v26.34-game-scenarios.mjs` | 嵌套预制体实例化 + top-down"实例化其可复用敌人预制体" |
| **Area 信号触发交互** | `verify-v26.34-game-scenarios.mjs` | sensor(Area) 触发 → 信号 → 脚本 → 存档 + 真实场景切换 |
| **音效** | 同上 | platformer"jump audio" |
| **运行与停止** | `verify-engine-workflows.mjs` | 三个模板 create → save → reload → run → stop |
| 输入驱动移动/跳跃 | `verify-v26.34-game-scenarios.mjs` | 命名输入 + 原生碰撞下实际位移 |

**判定：W1 = `VERIFIED`（组合证据）** —— 每一条要求都有**真实浏览器或真实运行时**的通过检查。

**必须写明的限制**：这些证据来自**多个独立验证脚本**，不是**一次连续会话**内跑完整个 W1 流程。二者不等价：连续会话还会暴露"步骤之间的状态衔接"问题。因此该 `VERIFIED` 的准确含义是**"W1 的每一项能力都已验证可用"**，而非"已录制一次完整的用户走查"。若需要更强的结论，应补一条连续的端到端会话 —— 列为后续加强项，不影响当前逐项结论。

### 19.15 批次 D（N4 起步）：信号目录 —— §23.4 的可发现性基础

**新增 `src/world/componentSignals.ts`**：按组件种类声明可发出的信号，供 Inspector 的 Signals 区与连接对话框使用（§5.3、§23.4）。

**核心约束：目录不许凭想象登记。** 每条静态信号记录 `emittedAt`（真实发射文件），校验脚本会到源码核对字面量确实存在；反过来，源码中每一个 `emitSignal('…')` 字面量也必须被目录覆盖。**双向核对**，任何一侧漏掉都会失败。

**实测覆盖**：**10 个**源码字面量信号全部入册，分布为

| 作用域 | 信号 |
|---|---|
| entity | `area.entered`、`area.exited`、`area.damage`、`portal.entered`、`entity.spawned` |
| scene | `scene.started`、`scene.loaded`、`scene.unloading` |
| network | `network.input`、`network.scene_handoff` |
| input（动态） | `input.<action>.<phase>` |
| entity（动态默认名） | `area.effect`（可被 `effect.signal` 覆盖） |

**验证**：`scripts/verify-engine-signal-catalog.mjs` **5 项全部通过**：
1. 每条静态信号都有真实发射点，且记录的发射文件确实提到它；
2. **源码中每个字面量信号都被登记**（`missing` 必须为空）；
3. 动态族要么带模板前缀且前缀真实存在于源码，要么其默认名在**记录的发射文件内**紧邻一次 `emitSignal` 调用；
4. 描述符结构合法（作用域、i18n 键前缀、发射路径、参数类型）；
5. 查找助手正确：`signalsForComponent('Area2D')` 命中区域信号、未知组件返回空、**节点只暴露自身组件拥有的信号**（`scene.*` 不会泄漏进节点列表）。

**过程中的两次自我修正（都是规则写错，不是放宽容差）**：
- `area.effect` 初版按静态登记 → 核对失败，因为它由 `emitSignal(effect.signal || 'area.effect')` **动态选择**；已改标 `dynamic` 并为其定义"默认名"核对规则。
- 该规则初版在全库拼接文本里找首次出现，命中了**目录文件自身**；已改为只在**记录的发射文件**内核对。

`pnpm check` 退出码 0。

**状态**：目录 `IMPLEMENTED` + 双向核对证据。**尚未接入 Inspector 的 Signals 区**（下一步），也未实现连接模型与签名校验 —— 那些仍属 §23.4 的未完成部分。

### 19.16 批次 D：Inspector 的 Signals 区已接入（§23.4 第一块）

**实现**：`ConfigPanel.vue` 新增 Signals 分区，`v-if="nodeSignals.length"` —— **只有节点真的拥有可发信号的组件时才出现**，因此不需要"空状态"文案，也不会在无关对象上占版面。

每个信号展示：**信号名**、**作用域**、**参数（名:类型）**。参数用 `id: type` 形式展示，**不依赖翻译**，避免为每条信号在三种语言里硬造文案。

**数据来源**：`signalsForEntity(entity.componentMap.keys())` —— 由节点**实际拥有的组件**决定，不是按类名猜测。

**浏览器验证**（新增第 2 项检查，`verify-w1-character-authoring.mjs` 现为 **4 项**）：

| 断言 | 结果 |
|---|---|
| Hero 拥有 Area2D → 列出 `area.entered` | ✅ |
| 同时列出 `area.exited` | ✅ |
| **未拥有的 `portal.entered` 不得出现** | ✅ |
| 参数显示为 `area: entity` | ✅ |

四项检查全部 PASS（`EXIT=0`）。

**必须重建 `dist`**：审计 harness 服务构建产物而非 dev server —— 这是浮点修复时踩过的同一个坑，本轮已在验证前重建。

**未完成（§23.4 剩余部分，明确不声称已完成）**：
- **信号连接对话框**（选择接收节点与方法、签名校验）；
- **当前连接列表 + 双击定位**；
- **连接持久化、Undo、迁移**；
- **参数 schema 的类型校验**（当前只展示，不校验）。
- 视觉打磨（行样式与既有分区的一致性）留到 N6。

### 19.17 批次 D：节点信号连接模型（复用既有 dispatch，不造第二套）

**先读后写**：确认运行时已在 `GameplayRuntimeCore.dispatchSignals`（:1970 附近）按 `signal/source/target` 过滤并调用 `callback`，连接存放在**接收方脚本资源**的 `signalConnections`。因此节点连接**不需要新模型**：一条连接 = 接收方脚本资源上的一条记录，`source` 限定发出对象，`callback` 是接收方脚本函数名。

**新增 `src/editor/signalConnections.ts`**（纯函数，可在 Node 独立验证）：

- `validateNodeSignalConnection` —— 信号非空且 ≤128、source/target 非空、**callback 必须是合法标识符**（`^[A-Za-z_][A-Za-z0-9_]*$`）；
- `addNodeSignalConnection` —— 校验通过才追加，**重复连接被拒绝**而不是静默叠加；被拒时**完全不变更资源**（连 `script` 结构都不创建）；
- `removeNodeSignalConnection` —— 索引检查；
- `nodeConnectionsFor` / `connectionCountForSignal` —— 按接收对象与信号名查询。

**验证**：`scripts/verify-engine-signal-connections.mjs` **6 项全部通过**，其中最后一项是**架构边界守护**：剥离注释后断言模块**不包含** `emitSignal`/`dispatchSignals`/`on_signal`，并断言运行时**仍是唯一派发所有者**。

**两次断言自我修正（都是规则写错）**：
1. 被拒输入后断言 `asset.script.signalConnections.length === 0` —— 但代码正确地**根本没创建**该结构，断言应改为 `asset.script === undefined`；
2. 边界守护再次扫到**注释里的说明文字**（第三次同类失误），已改为先剥离注释再检查代码。

`pnpm check` 退出码 0。**尚未接入 UI 对话框**（下一步），也未做连接的持久化往返与 Undo 的端到端验证。

### 19.18 批次 D：Signals 连接对话框已接入 UI

**实现**：Signals 区每条信号新增「Add connection」按钮 → 打开 `UiDialog`：
- 显示所选**信号名**（只读回填）；
- **接收方选择**（只列出拥有脚本资源的节点 —— 没有脚本就无法执行回调，因此不作为候选）；
- **回调函数名**输入，确认按钮用标识符正则 `^[A-Za-z_][A-Za-z0-9_]*$` 禁用非法值；
- 确认后写入**接收方脚本资源**的 `signalConnections`（复用 §19.17 的模型）并 `pushHistory('Connect signal')`，因此可撤销。

**浏览器验证**（W1 脚本现为 **5 项**，全部 PASS）：
- 对话框确实打开且**信号名回填为 `area.entered`**；
- 存在接收方选择控件；
- **空场景中尚无挂脚本的节点 → 确认按钮必须保持禁用**（不允许建立一条无法执行的连接）。

**过程中的类型错误**：初版把拒绝信息写入 `state.statusText`，但 `state` 是 `physicsState`，没有该字段（`statusText` 属于 `editorState`）。`vue-tsc` 报 **TS2339** 后已移除 —— 非法输入本就由按钮禁用拦截，剩下的拒绝只有"重复连接"，静默忽略即可。

**仍未完成（§23.4 剩余）**：
- **已建立连接的列表与删除**（当前只创建，不展示已有连接）；
- **连接的持久化往返验证**（保存 → 重开 → 连接仍在）与 Undo 端到端验证；
- **签名校验**（回调是否真的存在于接收方脚本、参数是否匹配）；
- **双击定位**到目标节点/函数。
- 视觉打磨留到 N6。

### 19.19 批次 D：§23.4 连接闭环完成（建立 / 列表 / 告警 / 持久化 / 删除）

**新增能力**：

1. **已建立连接的列表**：新增 "Signal connections" 分区，只列出 `target` 为当前节点的连接（即"指向我"的连接），带原始索引以便删除；
2. **回调签名校验**：解析接收方脚本源中的 `fn\s+名称(` 声明；若连接的 `callback` 在接收方脚本中不存在，显示 `missingCallback` 告警 —— **连接不会静默失效**；
3. **删除**：移除连接并 `pushHistory('Remove signal connection')`，可撤销；
4. 新增 3 个 i18n 键（en/de/zh）：`signalConnections`、`missingCallback`、`removeConnection`。

**端到端验证**：新增 `scripts/verify-w1-signal-connection-user.mjs`，**PASS**。它使用 top-down 模板（节点已挂脚本），流程与断言：

| 步骤 | 断言 |
|---|---|
| 给 Player **添加 Area2D**（模板里只有 sensor collider，没有该组件） | 信号区出现 `area.entered` |
| 打开连接对话框，接收方选 Enemy，回调填 `on_enemy_signal` | 对话框提供的接收方**只包含拥有脚本的节点** |
| 切到 Enemy 视角 | 连接出现在列表中，且**显示回调缺失告警** |
| 保存 | 文档中**恰有 1 个**脚本资源带该连接，且 `source`/`target`/`enabled` 正确 |
| **重开** | 连接**仍在** |
| **删除** | 连接从 DOM 消失，且**保存后的文档中不再存在** |

**过程中的三次定位（都是选择器/交互问题，不是产品缺陷）**：
- 模板触发器只有 `sensor: true` 的碰撞体，**没有 Area2D 组件** → 改为先添加组件；
- 添加组件后 Inspector 重组导致信号按钮**不可见** → 重新展开并滚动到视口；
- `select` 需要选项 **value（uuid）** 而非标签 → 先按标签取 value 再选。

`pnpm check` 退出码 0；`dist` 已在验证前重建。

**§23.4 仍缺**：双击定位到目标节点/函数、连接的**分组/参数 schema 校验**（当前只校验回调存在性）、以及视觉打磨（N6）。

### 19.20 批次 D：§22.2 首个 Command Registry 落地并迁移三处调用点

**问题（C 组 G1 的实证）**：播放动作此前在**三处各自实现**且行为不同——
- `ActionBar.vue:40-64`：完整序列（就绪 → 预检 → 切换 → 开会话 → 状态 + 日志）；
- `CommandPalette.vue:120`：`toggleSimulation(true)` + `beginSession()` + 一条日志，**跳过统一的状态更新**；
- `ProfilerPanel.vue:378`：`toggleSimulation(true)` 后直接开始录制。

同一命令、三套顺序，正是 §22.2 要消除的形态。

**实现**：
1. `src/editor/runCommandSequence.ts` —— **纯函数**，唯一定义 play/pause/step/stop 的**顺序与早退语义**，接受端口注入，因此可在 Node 用假端口验证；
2. `src/editor/runCommands.ts` —— 接线层：把 store 与 `gameplayRuntime` 适配成端口，导出四个命令函数；默认就绪检查为 `await world.wasmReady && !world.wasmError`，三处因此**行为一致**；
3. **迁移三处**：ActionBar 改为委托并注入自己的 `ensurePhysics` 与 `simulationPreflight`；CommandPalette 保留自己的预检日志但把启动交给共享命令，停止改用共享命令；ProfilerPanel 改用共享播放后再开始录制。

**验证**：`scripts/verify-engine-run-commands.mjs` **6 项全部通过**：

| 检查 | 内容 |
|---|---|
| 播放顺序 | `ensurePhysics → preflight → setPlaying(true) → beginSession → report → log` |
| **早退** | 就绪失败 → **零副作用**；预检失败 → 不开启会话；切换被拒 → 不开启会话 |
| 暂停 | 只切换与报告，**不跑预检** |
| 单步 | 编辑态先进入再退出播放；已暂停时**不再切换** |
| 停止 | `stopSession` **先于** `stopPlayMode` |
| **迁移守护** | 三个 UI 文件都必须从 `editor/runCommands` 引入 |

**回归**：重建 `dist` 后重跑 `verify-engine-workflows.mjs` —— **三个模板全部 PASS**（播放路径被我改动，因此必须回归验证，不能只看类型）。

`pnpm check` 退出码 0。期间 `vue-tsc` 连续报出三处**因迁移而失效的导入**（TS6133），逐一清理。

**§22.2 仍缺**：注册表的**元数据层**（commandId / label / icon / tooltip / scope / visibleWhen / enabledWhen / disabledReason / undoPolicy），以及其余重复动作（保存、撤销、删除、复制等）的迁移。本轮交付的是"**一个命令一个处理器**"的骨架与首个真实迁移，不是完整注册表。

### 19.2 批次 B1：渲染抽取全部改用批量世界变换

**改动**（`src/renderer/sceneRenderer.ts`，已解冻范围）：

1. 批量求解不再以"存在 YSort 实体"为条件，**每帧无条件求解一次** `worldTransformsFor(entities, positioned)`，排序键与绘制循环**共用同一张表**。
2. `submitSprite` / `submitText` 增加**可选** `worldTransforms` 参数，缺省时退回单次查询（行为保持）。
3. 绘制循环内 shape 变换与其排序键改用该表。
4. 纹理预加载循环改用该表（candidates 中未进入 positioned 的实体仍走回退）。

**实测（合成基准）**：

| 场景 | 原路径 | 每实体预计算 | 批量（本批次） | 总提速 |
|---|---|---|---|---|
| n=1000, depth=10 | 26.35 ms | 2.65 ms | **1.55 ms** | **17.0×** |
| n=1000, depth=50 | 140.51 ms | 9.14 ms | **0.97 ms** | **144.2×** |

**仍为逐实体调用且判定为可接受的位置**：
- `:77/:80/:89` —— **相机**函数，按相机数量（个位数）调用，不是逐实体；
- `:158` —— `authoredOrder` 的**回退分支**，热路径已全部显式传入 `worldY`；
- `:249` —— **剔除判定本身**，它在 `positioned` 形成**之前**运行，此时批量表尚不存在，无法使用；
- `:183/:220/:337/:368` —— 均已有表查询，回退分支仅在实体确实不在表内时触发（如 :368 遍历的 candidates 含被剔除实体）。

**验证**：27 项变换相关检查全部通过；`pnpm check` 退出码 0。

---

## 20. 历史：交接锚点（round 27 记录）

### 20.1 待替换的渲染抽取调用点（已解冻范围）

`src/renderer/sceneRenderer.ts` 中**逐实体** `worldTransform` 调用，应改用已验证的 `worldTransformsFor`（`src/world/hierarchy.ts`）：

| 行 | 用途 |
|---|---|
| :77 | 主变换（相机/通用） |
| :179 | Camera2D follow |
| :216 | 渲染项 |
| :245 | 渲染项 |
| :322 | ShapeRenderer2D |
| :353 | 位置读取 |

**排序键已替换完毕**（:315 附近），实测 105×。替换其余 6 处的**判定基准已就绪**：`verify-engine-world-transform-oracle.mjs` 会断言批量结果与逐次结果**逐字段相等**。注意其中部分调用点在 `for (const entity of visible)` 循环内，可用同一张表；替换后需重跑全部 51 项。

### 18.3 冻结面待授权项（含精确位置）

| 缺口 | 位置 | 影响 |
|---|---|---|
| **G1 追踪身份** | `src/runtime/performance/observability.ts:47-122`、`profiler.ts:48,201` | `inputSequence`/消费 tick/首次受影响 packet **全库 0 命中**；**N8 性能验收的前置条件** |
| **G2 脚本投影** | `src/runtime/GameplayRuntimeCore.ts:1188-1230,1233,1276,1925` | 每帧 **4+ 次**全实体 JSON 重建（`invalidateScriptWorld` 在 `runPhase`/`ensureLifecycle`/`dispatchSignals` 均被调用）；基线可测 `scriptContextDiagnostics.publications`(:434) |
| **G4 信号预算** | `GameplayRuntimeCore.ts:1049-1052` | 无循环/深度预算，仅 1024 队列丢最旧；C04 零专项 |
| **G5 Play 独立世界** | `src/store/physics.ts:83,846-863` | Play 直接跑在编辑世界上，Stop 靠整份 JSON 复原；**无 Apply Runtime Changes**（全库 0 命中） |
| **G9 active list** | `src/world/World.ts:783` | 每帧全量 `entities.filter` 重建 |

### 18.4 N1 剩余

- **描述性 schema**：扩展现有生成器 `scripts/generate-v26.22-component-primitives.mjs`（11 行，用 TS 编译器 API 解析 `src/world/components.ts`），由**同一来源**再产出默认值/范围/单位/控件/i18n 键/分组/信号声明。**不要新建第二张表**——`src/world/componentFieldSchema.ts` 已确立"派生而非并行"的模式。
- **脚本导出属性稳定 ID**（B 组 G3）：`src/components/ConfigPanel.vue:222,564` 现以属性名作键，重命名即丢作者值；应与组件字段共用同一契约层。

### 18.5 开放产品决策（需您选择）

1. **环状层级策略**：拒绝加载 / 阻止保存 / 自动断开。检测器 `hierarchyHasCycle` 已就绪但**未接线**。
2. **剩余 213 个纯图标按钮**是否补文字：AGENTS §12 要求工具动作优先图标，§22.1 要求关键动作有文字，需按层判断。
3. **§22.2 Command Registry 本体**：需一次性迁移 TopBar / CommandPalette / ContextMenu / ActionBar / ProfilerPanel 五处，否则会退化为未集成空壳。

### 18.6 状态真实性

**本轮无任何项标 `VERIFIED`。** 所有 `IMPLEMENTED` 项均只有**模块级或基准级**证据，**缺少真实 GUI 人工走查**与**真实项目帧时间测量**。按主指令 §33，内部测试不得冒充体验验证。

**本轮未改任何文件（除本记录）**：核实过程为只读。
