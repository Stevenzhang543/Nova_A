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

**仍待处理**：`pointercancel` / `lostpointercapture` 在编辑态仍未接入同一条还原路径（当前仅触屏游戏输入处理），列为下一轮项。
