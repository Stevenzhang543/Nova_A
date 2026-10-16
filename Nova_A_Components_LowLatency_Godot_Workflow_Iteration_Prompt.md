# Nova_A 下一轮工程主 Prompt
# 组件与场景工作流完善 · 低延迟优先 · Godot 式编辑体验

**文档用途：** 将用户收集的五层能力清单转化为可执行的下一轮工程任务。它是上一轮架构与性能工程的后继任务，不是替代技术栈、另起运行时或重写所有组件的许可。

**依据：** 用户本轮要求；仓库当前真实代码；既有 `AGENTS.md`；`Nova_A_Engine_Runtime_Player_Overhaul_Prompt_Expanded.md`。本文件中的 Nova_A API/类型名若尚不存在，均为目标契约或示意名称，实施时优先适配已有等效接口。

**最高产品目标：** 用户能用直观的场景、节点、组件、资源与信号工作流制作并导出完整二维游戏；运行时输入路径尽可能短，新增易用性不能重新制造跨层复制、等待链、响应式世界或无界后台工作。

---

## 0. 先处理上一轮还在运行的事实

上一轮正在执行 Editor / Runtime / Player 拆分、自研 WebGL2/WebGPU 优化、WASM 数据边界及调度增强。不要同时在同一可写工作区启动第二轮核心改造。

### 0.1 现在允许进行的工作

- 读取并记录当前 commit、工作区状态、上一轮里程碑与活动变更。
- 在已提交、可定位的快照上进行只读组件审计、源代码定位、工作流分析。
- 为本轮建立候选测试、接口缺口和 UI 工作流方案。
- 已有明确文件所有权分配时，可以在隔离 worktree/分支准备不会污染共享构建目录的界面原型或测试夹具。
- 原型、mock、未集成组件必须明确标注，不作为生产完成证据。

### 0.2 生产实现的交接门槛

由集成者固定一份上一轮可运行的交接 commit，至少确认：

1. Editor / Runtime / Player 的入口和依赖方向已确定。
2. 世界所有权、事务接口、输入与渲染数据边界有版本且可用。
3. 最小真实 Player 能启动、加载项目、处理输入、渲染及播放音频。
4. 使用该 commit 建立本轮独立基线，记录当前未解决问题。
5. 当前仍在开发的 Worker/ABI/调度/后端部分有 Owner 与冲突清单。

不必要求所有高级图形特性全部结束才能开始无冲突的编辑工作，但依赖未交接契约的生产代码不能越过门槛。共享协议、锁文件、核心世界和全局调度不能被两组代理同时重写。

没有交接信息时先完成 N0 审计；把依赖项标为 `BLOCKED_UPSTREAM`，不要假设旧对话中“已完成”意味着当前实际通过。

---

## 1. 本轮已经确定的选择与授权边界

### 1.1 保留的路线

- Vue 3 + TypeScript 继续负责 Editor。
- Rust/WASM 继续作为目标架构中运行世界、物理及其驱动变换的唯一权威。
- TypeScript Runtime host、Renderer、Player 不依赖 Vue/Pinia/编辑器 store。
- 保留自研渲染器及上一轮 WebGL2 基线、经验证的 WebGPU 增强路线。
- 复用上一轮线程拓扑、PerformanceCoordinator、ABI、资源队列和兼容回退。
- 普通 WASM + Transferable 路径继续独立可用；SharedArrayBuffer、SIMD、threaded WASM 仍是已验证条件下的增强，不新增启动前提。
- 保留当前可用脚本语言，不为了效仿 Godot 自动更换为 TS、GDScript 或另一种语言。
- 继续支持 Windows x64、Linux x64、Web；不新增 macOS、32 位 x86 承诺。
- 保留最小 Tauri Player 和 Web Player，不在本轮新建原生 GPU Player。

### 1.2 本轮明确允许的 UI 变化

用户最新要求已授权：重做不清楚的编辑器信息架构、面板职责、操作入口和按钮表达，学习 Godot 的场景/资源/Inspector/信号/运行工作流。

因此，旧文档中“完全冻结当前界面层级，不得改信息架构”的限制，在本轮相关 UI 范围内不再适用。旧“所有常用动作尽量只显示图标”的规则，也不应压倒当前的可发现性与直观性。

但本授权不意味着：

- 放弃当前舒适字号、四向留白、圆角和可访问性；
- 重写 Vue 框架或 Runtime；
- 复制 Godot 源码、Logo、整套皮肤或承诺 Godot 格式/API 兼容；
- 删除已有游戏能力；
- 改写上一轮冻结的工程主指令以降低验收。

本文件仅是后继任务及上述有限 UI 授权。旧 `AGENTS.md` 和工程主指令不应被全量覆盖；如需记录新 UI 决策，只在现有跟踪文档追加明确、窄范围的 ADR。

### 1.3 本轮总体架构选择

**Godot 式面向用户的场景/节点工作流 + 现有组件化、数据导向、Rust/WASM 权威 Runtime。**

Node 是可理解的创作和脚本语义，不代表必须为每个节点创建昂贵的深层 JS 对象，更不代表把整个 Rust 世界复制一遍成为 TS SceneTree。

---

## 2. 用户原清单的处理结论

以下优先级是本轮工程选择，不是对当前实现状态的判断。已经正确实现的部分复用并回归，不重做。

| 原清单 | 结论 | 本轮做法 |
|---|---|---|
| 1.1 WebGL2 驱动器 | 必需，主要承接上一轮 | 接入既有自研后端，不再套一层重复状态缓存；保留 WebGPU 共用前端。 |
| 1.2 平台窗口与输入抽象 | 必需，收紧权限 | Browser/Tauri 通过平台服务提供能力；不把 native handle 暴露给普通节点和脚本。 |
| 1.3 VFS、资源路由 | 高价值 | 稳定资源 ID + `res://`/`user://`/受控 cache mount；场景不保存宿主绝对路径。 |
| 1.3 Promise/Worker 加载 | 高价值但表述需纠正 | Promise 不是 CPU 并行；解析/解码/转码进入已有有界任务系统。 |
| 2.1 双时间步 | 必需，复用 | 一个世界时钟、固定物理与显示采样分开；不能把 fixed dt 叫作天然确定性。 |
| 2.2 树状场景与生命周期 | 高价值 | Node 门面映射稳定句柄与现有组件，明确生命周期及可复用场景实例。 |
| 2.2 万物 Node2D | 不采用 | 非空间 Node、Node2D、Control、Resource 分工；不要让资源和 UI 都继承世界二维变换。 |
| 2.3 引用计数与 GC | 高价值但需显式资源所有权 | Scene/voice/in-flight frame 持有资源租约；GC/finalizer 不作为及时 GPU 释放保障。 |
| 2.4 动态批处理/裁剪 | 必需，复用上一轮 | 优先现有 instancing 与脏更新；正确透明顺序先于纹理合批。 |
| 2.4 Y-Sort | 对俯视游戏高价值 | 作用域明确的排序组、脚底锚点、稳定 tie-break；不是完整 2.5D 引擎。 |
| 3.1 Sprite/AnimatedSprite/TileMap | 基础必需 | 通过同一类型注册表和资源系统完整接入创建、属性、保存、运行与导出。 |
| 3.2 Area/RigidBody/CharacterBody | 基础必需 | 三者职责分开；不把角色控制器当自动受力刚体。 |
| 3.2 CollisionShape 中混入 Raycast | 分类错误 | Shape2D 资源与 RayCast2D/ShapeCast2D 查询独立；AABB 是重要加速边界，不是所有旋转形状的真实碰撞模型。 |
| 3.3 2D 空间音频 | 有用 | 显式 Listener；默认可跟随活动 Camera，但音乐/HUD 音效不受相机移动影响。 |
| 3.3 Control 与游戏 UI | 必需 | 场景里的独立布局与焦点分支，不是 Vue Editor DOM，也不是强制第二套世界。 |
| 4.1 Rust 离线导入、元数据 | 高价值 | 桌面 Editor 原生 Rust 导入；Web 使用能力受限的等效适配；生产 Player 不运行 watcher。 |
| 4.1 PNG 统一转 WebP/自定义 .tex | 不按原说法执行 | 文件压缩与 GPU 显存压缩分开；按素材用途、目标能力和质量选择变体。 |
| 4.1 glTF/FBX 自动抽取 2D 骨骼 | 当前延后 | 没有明确源格式、骨骼语义和真实项目需求不做通用转换器；保留已存在且可用的功能。 |
| 4.2 文本场景序列化 | 高价值 | 版本化 Nova_A 格式，优先扩展现有 JSON/资源包，稳定 ID、依赖、覆盖与迁移。 |
| 4.2 完整 TSCN 解释器 | 当前不做 | 工作流学习不等于 Godot 兼容层；没有互操作需求不实现完整 TSCN/GDScript 生态。 |
| 4.3 新增 TS/JS 脚本语言 | 条件保留 | 已有则完善；没有则不在本轮自动增建第二脚本宿主。 |
| 4.3 @export 自动反射 | 需求有价值，机制需替换 | 显式类型/属性/信号 schema；已有构建期提取或 decorator 可作为输入，不假设 TS 类型运行时还存在。 |
| 5.1 Scene/Files/Inspector | 核心重点 | 分别展示场景结构、资源结构和所选对象；SceneTree 不是 DOM 树，Inspector 不直改 Runtime 对象。 |
| 5.2 Tool Mode/Gizmos | 高价值 | 明确 Edit/Preview/Play 状态、独立 overlay、立即本地预览 + 可撤销事务。 |
| 5.3 Web 导出 | 必需 | 输出含 HTML、JS、WASM、Worker、资源和 manifest 的可部署包；单 HTML 非默认约束。 |
| 5.3 混淆提高性能 | 不接受该目标 | 可用标准 minify/bundle；不把混淆当优化、加密或安全隔离。 |
| 5.3 每次重编 Tauri | 调整 | 优先复用版本匹配的 Player 模板，仅模板/依赖/配置改变时重新构建。 |
| 5.3 Tauri EXE 等同原生游戏渲染 | 不接受该表述 | EXE 是桌面宿主，当前游戏仍在 WebView/WASM/自研 Web 图形后端中运行。 |

---

## 3. 审计必须回答“一个功能能不能真的被用户使用”

对所有当前组件、节点、资源类型与编辑工具建立一张总清单。优先复用已有审计/迁移文档，不为每个条目新建文档。

每项记录：

- 稳定 typeId、对外名称、源文件、真实实现路径。
- 内核所有者与字段所有权；是否存在 TS/Rust 重复逻辑。
- 当前状态：`COMPLETE_VERIFIED` / `PARTIAL` / `MISSING` / `BROKEN` / `NOT_TESTED`。
- 创建入口、Inspector、预览/运行、序列化、Undo、资源引用、导出是否贯通。
- 依赖、生命周期、输入/事件关系、错误表现。
- 更新频率、活跃条件、每实例分配、跨语言/跨线程调用频率。
- 单元、集成、图像、真实 Player 测试与性能证据。
- 本轮动作：`REUSE` / `REPAIR` / `INTEGRATE` / `IMPLEMENT` / `DEFER_WITH_REASON`。

不得按类名判断完整，不得把未检查标为 MISSING。一个节点只出现在“添加节点”列表而不能正确保存、运行、导出，不算实现完成。

不盲目扩展几十个次要组件。先闭合角色、关卡、音频、UI、脚本、场景切换与发布这一整条实际工作流。

---

## 4. 对象模型：节点工作流与组件内核兼容

面向用户提供以下概念，名称可映射已有等效类型，避免破坏既有 API：

```text
Node                         非空间组织、生命周期、组、信号
├── Node2D                   世界空间二维变换
│   ├── Sprite2D / AnimatedSprite2D
│   ├── Camera2D
│   ├── TileMapLayer2D
│   ├── Area2D
│   ├── StaticBody2D / RigidBody2D / CharacterBody2D
│   ├── CollisionShape2D      挂接 Shape2D 资源，不是另一个物理世界
│   ├── RayCast2D / ShapeCast2D
│   └── AudioStreamPlayer2D
├── CanvasLayer              屏幕/画布分层语义
├── Control                  游戏 UI 布局与焦点；不是 Node2D 子类
│   ├── Container 类
│   └── Label / Button / Image / Progress 等
├── AudioStreamPlayer        非空间音乐与界面声音
└── Timer                    明确模拟/真实时间与暂停模式

Resource                     可共享数据，不在场景树里每帧运行
├── Texture / SpriteFrames / AnimationClip
├── Shape2D / PhysicsMaterial
├── TileSet / Material / Font / AudioStream
└── PackedScene 等可复用内容
```

这是一张语义图，不要求重写为同样的深继承类体系。内核仍可使用实体句柄和稠密组件存储。节点类型可以由一组合法组件及行为适配组成。

规则：

1. 一个节点实例只能对应一个明确的运行身份；不得 Node、Entity、DOM 各维护一份可独立写的 Transform。
2. 新门面使用上一轮 UUID、index/generation、worldEpoch 体系。
3. 不为每个节点创建 rAF、Worker、响应式 watcher 或默认空 update 回调。
4. 显式活跃列表驱动需要 tick 的脚本/动画/查询；静态节点不付无意义每帧调用成本。
5. Node API 查询不得暗中每次遍历全场景或每个 getter 发送 Worker RPC。
6. Node 类型提供合理默认值、必需子资源提示和错误解释，但不强制每添加一个普通 Sprite 都建立庞大模板。
7. 原有 Entity/Component 项目平滑呈现到节点工作流；不能强迫用户手工重建所有场景。

---

## 5. 生命周期、变换与信号

### 5.1 生命周期

复用现有正确生命周期，并建立有文档的 Godot 式外部语义适配：

- 构建实例 → 反序列化字段 → 解析引用 → 挂入树 → 初始化就绪。
- `_enter_tree`：父先、子后。
- `_ready`：子先、父后；每实例默认一次，重新入树是否重跑通过明确 API/契约控制。
- `_exit_tree`：子先、父后。
- 帧/固定步更新只对已就绪、启用且订阅该阶段的节点执行。
- 树外的预加载资源和节点不会因为 Inspector 展示而执行游戏生命周期。
- 删除、重挂、场景切换在既定安全点提交；遍历中修改不破坏迭代器。
- 延迟回调验证句柄与 epoch；重新利用的槽位不得收到旧节点事件。

这些名称是兼容意图而非完整 Godot API 承诺；行为若与现有项目不同，提供迁移与测试，不能静默更改。

### 5.2 Transform

- 复用现有轴向、角度、世界单位和物理比例，不擅自转换旧项目。
- 二维仿射变换存储布局明确；支持父子级联、负 scale、pivot 和正确矩阵乘法。
- 只传播 dirty 子树；不每帧重新计算所有静态节点。
- reparent 明确 Keep Local / Keep World；奇异矩阵给出可理解错误。
- Physics body 的 transform 权威与普通节点不同，禁止每帧动画、编辑门面、物理互相覆盖。
- 非均匀缩放的父节点对 collider 的限制必须检查；不要画着一种形状、碰撞用另一种而不提示。
- 瞬移、重生和重挂父级重置显示插值历史。

### 5.3 信号与组

加入或完善 typed signal 注册与连接：signalId、参数 schema、发出者、接收者方法、连接模式、持久化标识。

- 同一 Runtime 内的普通信号可立即在定义阶段派发；会改变结构的动作延迟到安全点。
- 不为了“全异步”把每个信号改成 Promise，并强制增加一帧。
- 防重入和循环派发使用明确深度/工作预算，不能吞掉关键事件。
- 跨线程只桥接 Editor 真正订阅的事件，并使用现有有界批处理。
- 解除连接、场景卸载、接收者删除必须可靠；不要用悬挂强引用阻止回收。
- Editor 支持查看已有连接、跳转目标、连接/断开、无效方法提示和 Undo。
- Groups/Tags 用于显式查询或广播，不在每帧用字符串扫描全世界。

---

## 6. 类型注册表与属性 schema：本轮最关键的连接层

完善一个不依赖 Vue 的 Runtime/Editor 共用类型契约来源。

目标不是在 Inspector 中遍历任意运行对象的全部字段。每类组件/节点至少有：

```text
TypeDescriptor
  typeId、schemaVersion、baseType/能力类别
  displayNameKey、descriptionKey、category、iconId
  requiredComponents / parent-child constraints
  fields[]
    fieldId、serializationKey、valueType、defaultValue
    unit、range、step、enumValues、nullable
    resourceType / nodeReferenceType
    group、order、tooltipKey
    editorWidgetId（纯 ID，不导入 Vue 组件）
    runtimeAccess、mutationPhase、animatable
    readOnly / derived / secret / transient
  signals[]
  actions[]
  validators[] 或受控验证器 ID
  migrationVersion
```

字段 schema 服务于 Inspector、序列化、资源选择、脚本提示、文档、校验和导出。运行时校验不能只依赖 Inspector 的输入限制。

实现要求：

- 优先扩展既有 registry；不额外建立彼此冲突的“节点表”“反射表”“序列化表”。
- 类型 ID 和字段 ID 稳定，与本地化名称、按钮文字和源码类名分开。
- Rust 与 TS 的共享枚举/字段常量通过生成或严格契约测试保持一致。
- EditorWidgetRegistry 位于 Editor，仅按 ID 选择 Vue 控件；Player 不打包这些实现。
- Inspector 渲染属性 schema 的快照/draft，不持有运行世界的深层响应式代理。
- 不执行任意用户脚本的顶层代码来获得默认值或字段列表。
- TypeScript 类型通常在编译后被擦除；decorator 不是自动完备反射。
- `@export` 是 Godot/GDScript 的用法，不当作 TS 自带属性系统。
- 若已有 TS 脚本，允许构建期 schema 提取或显式 `defineProperties`；可选 `@property` 等语法只作为元数据输入，固定其 decorator 模式，不混用旧/新语义。
- 没有 TS 用户脚本时，先为当前脚本语言建立同一 schema 适配，不因此新增第二个脚本引擎。

---

## 7. 可复用场景、实例覆盖与序列化

首先审计现有 Prefab/PackedScene 功能，复用其正确部分。

本轮必要闭环：

1. 将对象子树保存为可复用场景资源。
2. 在另一场景中多次实例化。
3. 区分源资源字段与实例覆盖。
4. 支持覆盖标记、恢复源值和显式编辑源场景。
5. 源场景修改后，未覆盖字段更新，实例自己的合法覆盖保留。
6. 复制实例生成新实例身份，内部稳定本地 ID 用于正确重映射引用。
7. 嵌套实例禁止循环依赖；处理源资源删除、改名和缺失类型。

不要把所有实例展开成重复内容后还声称支持可复用场景。

存储选择：沿用并版本化 Nova_A 已有场景格式，优先可 diff 的 JSON/当前文本格式。导入后的运行表示可以是现有二进制资源，不要求运行时每帧读 JSON。

不实现完整 TSCN/GDScript 兼容，不仅为了“像 Godot”发明一套新解析语言。

存储必须区分：节点身份、资源身份、脚本身份、父子关系、信号连接、实例覆盖、游戏配置、Editor-only metadata。

引用使用稳定 ID；路径是可读定位和诊断，不作为唯一永久身份。两阶段加载先构建身份图，再解析引用和运行生命周期。

保留未知字段/类型的安全占位或给出明确迁移失败，不静默丢弃用户内容。序列化不得运行 getter、脚本或执行任意代码。大文件解析受现有任务预算控制。

---

## 8. 低延迟：一个循环，不新建两个互相等待的引擎

复用上一轮 fixed step、Worker 与帧提交机制，禁止新组件系统另建主循环。

`_process(dt)` 和 `_physics_process(fixedDt)` 是生命周期阶段，不是要求所有节点分别调用 rAF 或 setInterval。

- `_physics_process` 及权威玩法修改在 Runtime Owner 的固定步中执行。
- `_process` 处理允许的显示/非物理阶段；不得绕过命令与字段所有权直接写受物理控制位置。
- render extraction 读取同一套已完成状态，不能再往返 Editor 获取坐标。
- 一帧补跑多个 tick 时，按键边缘只消费一次；每个 tick 开始尽可能读取当时已收到的最新输入。
- 接触/触发结果在明确的同 tick 阶段派发，不平白再等待下一帧 UI 批处理。
- 音频和独立 UI 反馈不等待 GPU 完成确认。
- 同一游戏在 60/120/144/240Hz 显示下，玩法时间和定时器语义正确。

fixed dt 有助于稳定更新，但本身不保证跨平台逐位确定性。回放需要另外冻结初值、输入、随机种子、顺序、库版本、浮点行为和异步结果的生效顺序；本轮不新建网络锁步/回滚架构。

### 8.1 延迟目标的正确含义

用户报告旧版约 30–40 FPS 与约 100–200ms 体感延迟，这是待复现实况，不是已校准仪器测量。

本轮不承诺所有硬件固定 240FPS 或零延迟。正式区分：

- 输入接收 → 投递 → Runtime 消费；
- 首次受影响的模拟 tick / render packet；
- 输入接收 → GPU 命令提交；
- CPU 关键路径、GPU 时间、提交帧间隔；
- 真正 input-to-visible：需要端到端测量，不用 CPU 数字代替。

沿用上一轮指标，禁止重新引入错误的 inputToPixel 命名或按空回调计 FPS。

### 8.2 物理频率与跟手取舍

旧项目保留原 fixedHz；新项目的 Responsive 预设可在已有预算和测试通过后选择 120Hz。240Hz fixed simulation 只作为显式配置/实验，不因渲染目标是 240FPS 就强制全局启用。

仅从相位等待推算：60/120/240Hz fixed step 的间隔约为 16.67/8.33/4.17ms。输入刚错过 tick 时可能等待接近一个间隔；这还没包含计算、GPU、合成和扫描。

Balanced 的传统插值可能带来约一 tick 级的额外显示陈旧程度。Responsive 对本地受控对象与相机使用一致的最新状态策略，不能双方再各自叠加 spring。

参数选择必须比较输入延迟、抖动、CPU/GPU 帧时间和碰撞正确性；不能只挑 FPS 更高的一组。

不需要物理的准星、菜单反馈立即更新；不得用虚假的角色移动动画掩盖尚未发生的真实碰撞结果。


## 9. 输入路由、动作映射与焦点

输入分为 Editor Commands、Game UI、Gameplay、Text/IME 等明确作用域。

- 主线程接收输入后立即记录序号与统一时间标记；关键边缘立即投递，不先等 Vue nextTick 或下一次 rAF。
- Editor 文本框、文件对话框、模态窗口拥有焦点时，相应输入不得再驱动游戏角色。
- Game UI 的命中、模态与焦点在其 Runtime 作用域处理；消费后的事件不能再次触发 Gameplay。
- 连续 pointer/axis 可合并为最新状态；press/release、选择确认、拖拽开始/结束是可靠边缘。
- pointer capture、pointercancel、失焦、断开手柄、隐藏/恢复必须正确清理。
- ActionMap 提供可视化配置、按键录入、冲突解释、键盘布局与手柄 deadzone；保留已有配置迁移。
- 游戏物理键位与文本输入分开；不能把中文输入法组合过程当作快捷键。
- 支持移动、跳跃、交互、暂停等模板动作，但不把固定键值写死进组件。
- 坐标处理统一经页面 → Canvas CSS rect → viewport/letterbox → 相机逆矩阵；DPR 和 renderScale 各在正确层应用一次。
- 不以“事件发布订阅”名义将一次按键绕过 Editor store、全局 UI 总线、IPC、Worker 再往返数次。

所有新的交互反馈都要标注是即时本地反馈还是权威结果。前者允许立即呈现按压/选框，后者必须真实提交成功。

---

## 10. Platform/VFS：虚拟路径，而不是泄露宿主路径

完善统一资源访问接口，使用当前项目已存在的等效命名。

- `res://`：项目源/发布资源命名空间。生产 Runtime 只读，经 manifest/资源 ID 解析。
- `user://`：按 gameId 隔离的用户存档与配置。
- `cache://`：如需要，仅供适当宿主和内部资源缓存；不作为永久游戏内容引用。
- 稳定 assetId/UUID 是资源身份；人类路径便于导航与诊断。

`res://` 是引擎虚拟路由，不要求浏览器原生认识该 URL scheme，也不要求把它注册成暴露整个磁盘的 Tauri 协议。

Desktop Editor 可以经过受控 capability 访问用户明确打开的项目目录。Player 只能访问游戏资源与受控存档位置，普通脚本不获得任意绝对文件路径和进程能力。

Web 通过 URL、Blob、用户授权文件或包索引等适配访问；不能宣称网页能自动监听任意本地磁盘目录。

要求：

- 规范化路径、大小写冲突、Unicode、分隔符和 URL 转义。
- 防止 `..`、符号链接逃逸、恶意压缩包路径与超长/异常长度。
- 缺失资源、网络超时、取消、权限拒绝可理解且可恢复。
- 网络资源来源遵循项目/宿主策略，任意脚本不默默引入远程执行或外传数据。
- 文件多选、外部拖入、原生菜单通过 PlatformAdapter 与 EditorCommandRegistry；不另写一套与 UI 菜单行为不同的实现。
- 窗口句柄仅在确有需要的宿主层内部使用，不成为 Node API 或自研 Web renderer 的旁路。

---

## 11. Resource Cache：显式租约、预算和迟到结果处理

复用上一轮资源状态机与有界调度，不创建第二个资源管理器。

资源可能同时被场景实例、编辑预览、播放中的声音、缓存和已提交 GPU 工作持有。不能因为一个场景关闭，就立即销毁仍被其他持有者使用的资源。

实现：

- 请求去重、稳定句柄、generation、内容版本、失败状态和依赖图。
- Scene/Audio/RenderFrame 等明确持有与释放租约。
- 可淘汰缓存与活跃资源分开，LRU 不淘汰正在使用的内容。
- 资源池预算按 CPU decoded、GPU、in-flight upload、临时转码分别计量。
- 卸载场景、取消导入后，迟到结果验证 epoch/revision，不复活已卸载内容。
- 热重载生成新版本，切换成功后按安全生命周期回收旧版本。
- GPU 对象销毁遵守既有提交与使用语义，不用每帧全队列同步等待。
- JS GC/FinalizationRegistry 可作泄漏诊断或最后保险，但不能依赖其时机管理关键资源。
- 资源依赖循环明确拒绝、打断或按可支持语义处理；引用计数不是解决所有环的魔法。

Promise 适合表达异步完成，不会让同步图像转换、JSON 解析或碰撞烘焙自动多核。高成本工作仍进入现有 Asset/Compute/Native 任务预算。

---

## 12. 渲染组件的成本与正确性

承接上一轮自研渲染前端和后端，不因新增 Node2D 再建“Godot 风格渲染器”。

节点暴露表现属性，Renderer 只读稳定渲染抽取；Node 本身不随意调用 draw/gl API。

### 12.1 批处理

- 优先复用共享 quad、instance buffer、稳定资源索引。
- 相同纹理不保证可以合批：材质、混合、裁剪、目标和视觉顺序同样重要。
- 不为每个 Sprite 每帧重新创建 JS 顶点数组。
- CPU 合并几何只在对应工作负载优于现有 instancing 时采用。
- 透明对象不能为了降低 draw call 被全局按纹理重排。
- 在 Profiler 显示断批原因，用户能理解是材质、atlas、clip 还是层级造成开销。

### 12.2 可见性与动态边界

- 二维可视区域与 AABB 是候选剔除，不是将离屏对象从游戏模拟中消失。
- 精灵 pivot、旋转、负 scale、shader 位移和粒子最大边界进入 bounds 计算。
- TileMap 以 chunk 管理；节点可有语义子树，不等于每个瓦片成为实体。
- 只更新脏边界，不每帧递归重算所有静态节点。
- 游戏逻辑不可见时是否暂停，必须由明确 process mode 决定，不能靠 renderer 偷偷关闭。

### 12.3 Y-Sort

- 仅在启用的组内按指定坐标空间和 sortOrigin 排序。
- 角色/道具可以使用脚底锚点；树冠、阴影等复合内容有明确组内/组外规则。
- canvas layer、z-index、局部 sibling order 与 y-sort 的优先关系文档化。
- 相同 Y 使用稳定 tie-break，避免帧间闪烁。
- 父子偏移、负 scale、层切换与实例化有测试。
- 不改变物理空间，不将二维遮挡排序宣传为已实现完整 2.5D。
- 高频移动组使用有界且经测量的更新策略；不能每帧全场景无差别排序。

---

## 13. Sprite、帧动画与通用属性动画

### Sprite2D

具备纹理/region、flip、pivot、tint、opacity、layer、visibility、filter 等当前支持语义。

- 拖入图片可直接创建合理 Sprite；尺寸和 pivot 可见且可改。
- source rectangle、裁剪、atlas extrusion 与纹理采样一致。
- 缺图在 Editor 有明确诊断；发布前校验，不把错误静默当成功。
- UV animation 更新实例数据，不持续创建新纹理。

### AnimatedSprite2D / SpriteFrames

- 帧列表、每帧时长、播放速率、循环、暂停/恢复、seek、方向与完成信号。
- 共享帧资源与每实例播放状态分开。
- 资源变更后帧索引校验，保持或安全恢复播放状态。
- 长帧跨越多帧时，外观可以直接显示新帧，但重要 gameplay event 的派发语义不能随意丢失。
- 纯视觉粒子/装饰事件允许在明确策略下合并；游戏事件不能伪装成可丢弃装饰。

### 通用 AnimationPlayer/轨道

若已存在，复用并补齐：稳定字段 ID 轨道、时间轴、插值、播放控制和保存加载。

- 同一字段受动画、脚本、物理驱动时，按 Owner 和阶段解决冲突。
- Timeline 预览在隔离预览状态中进行，不修改源场景直到显式记录关键帧/编辑事务。
- 拖关键帧即时跟手，释放提交一个 Undo；不把弹簧放入关键帧真实时间位置。
- 不为帧动画和属性动画各自建立时间基准不兼容的重复播放系统。
- 不把本轮组件完善扩展为通用 3D 骨骼/IK/动作捕捉工程。

---

## 14. Camera、CanvasLayer 与基础工作流节点

Camera2D 是本清单虽未完整展开但必须闭合的依赖：

- 激活/切换、position/zoom/rotation、viewport、屏幕世界转换。
- follow、限制区域、可选 smoothing 和 pixel snap 具有明确叠加顺序。
- Responsive 模式不对本地角色和相机重复增加延迟。
- 多相机/分屏仅复用已实现能力；不凭 2D 声音需要 camera 就默认新增完整多视口架构。
- 相机切换、场景切换和重生正确重置显示历史。

CanvasLayer/HUD 能脱离世界相机运动，正确处理窗口变化与输入坐标。

Timer、InputAction、SceneLoader/SceneTransition、Group 等作为基础工作流服务或节点，使用已有系统，不额外散布 setTimeout 和全局单例。

Timer 区分模拟时间与真实时间；暂停、timeScale、重复触发和回调删除有契约。场景切换准备资源、切换世界、释放旧世界的阶段可取消且可追踪。

---

## 15. 物理组件：明确职责，不制造“万能刚体”

继续使用已有 Rust 物理后端。先修复接口与工作流，未经单独批准不替换整个 solver。

### 15.1 Area2D

- 只做重叠检测/触发，不产生普通刚体推挤。
- 层/掩码、监测启用、enter/exit、目标类型过滤、删除时事件语义明确。
- 如提供 stay，默认按需要订阅；不每 tick 为全部重叠对生成字符串事件。
- Editor 形状预览与实际 trigger 形状一致。

### 15.2 StaticBody2D

- 静态障碍、TileMap 静态碰撞与复用形状。
- 编辑模式移动会更新预览；运行时“移动静态体”的成本与行为明确。
- 若需要移动平台，使用现有合适的受控/运动学机制，不依赖随意 teleport 静态物体。

### 15.3 RigidBody2D

- 由 solver 推进，提供受控 force/impulse/velocity API。
- mass、gravityScale、friction、restitution、damping、sleep、CCD 等只暴露后端实际支持项。
- 不在每个 `_process` 中重新写全量位置对抗物理结果。
- Inspector 清楚区分编辑初值与 Remote 运行值。

### 15.4 CharacterBody2D

- 由明确角色控制逻辑和碰撞移动算法驱动；不自动拥有刚体的全部受力语义。
- gravity、加速度、地面摩擦、跳跃属于控制器/模板策略，不能与 solver 重复应用。
- `move_and_slide` 风格 API 的输入是速度还是位移、dt 是否由内部应用，必须固定并测试。
- 若采用与 Godot 相近的速度 API，避免调用者再把速度乘 dt 后内部又乘一次。
- 角色移动位于固定阶段；碰撞查询和结果读取不能每次跨 Worker 请求再等待下一个 tick。

以现有 broadphase/narrowphase 查询实现扫掠、移动与滑行：

1. 获得期望位移及安全边界。
2. 对候选形状进行 sweep/接触判断。
3. 移动到合法位置，取得法线与剩余运动。
4. 对接触平面调整剩余速度/位移。
5. 在有限 slide iteration 内继续，极端重叠给出安全退化。
6. 返回 floor/wall/ceiling、命中信息和最终速度。

不是只把 AABB 推出去几次就声称所有斜坡和平台都支持。

必须覆盖：窄缝、斜坡、角落、天花板、持续贴墙、不同 dt、初始穿插、one-way 平台、移动平台和高速运动的已有/新增受支持范围。

Coyote time、jump buffering、可变跳高等是可选角色模板体验参数，不是修改全局输入延迟的替代品。已有符合设计的反馈保留。

### 15.5 Shape 与查询

- Shape2D 资源至少涵盖后端实际支持的 rectangle、circle、convex polygon；capsule/segment 按既有能力和角色需求完善。
- 校验退化尺寸、自交、多边形 winding 与凸性；复杂分解属于离线/后台，不在普通输入帧内运行。
- CollisionShape2D 表示形状挂接与局部位置，不独立推进第二个刚体。
- RayCast2D/ShapeCast2D 是查询工具：层过滤、排除自身、命中结果、更新时机、debug display。
- 查询显示其结果对应的 tick；即时查询仅在合法 Runtime 阶段执行。
- Raycast 不是 AABB、Circle 一样的实体碰撞形状。

---

## 16. TileMap/TileSet：能真正做关卡

本轮选择面向图层的 TileMapLayer2D 语义。已有 TileMap2D 名称可保留为兼容聚合/别名，不为追随外部命名而破坏旧项目。

- TileSet 作为共享资源，图层保存 cell/实例数据。
- atlas 与 tile 定义稳定 ID，重排导入不破坏已铺设关卡。
- 多图层、画笔、橡皮、框选、填充、吸管、翻转、必要旋转和 animated tile 接入同一工具框架。
- 填充、大范围替换、碰撞烘焙进入可取消的有界任务。
- 一次笔划一个 Undo；长操作有预览与进度，不产生几千条独立撤销记录。
- dirty chunk 局部更新 render/collision 数据，不修改一个 tile 就重建整张地图。
- render、collision、navigation（已支持时）分别版本化；启用可进入的区域前确保必要碰撞就绪。
- 不能出现画面已经画出地面，但物理尚未准备，角色直接掉下去。
- 地图超大时按 viewport/需求加载，保存和迁移不能截断坐标而不提示。
- Terrain/autotile 可复用现有实现；没有时先完成手动 tile 编辑闭环，再按具体需求扩展，不阻塞整个编辑器迭代。

---

## 17. Audio 与游戏 UI

### 17.1 AudioStreamPlayer / AudioStreamPlayer2D

- 非空间声音用于音乐、菜单和 HUD；空间声音用于世界发声源。
- 明确 AudioListener2D 或等效 listener 服务；默认绑定活动 Camera 是可更改策略，不是永久硬依赖。
- panning 使用 listener-relative 坐标和明确世界距离单位；镜头 zoom 不应无意改变音量，除非项目显式选择。
- 音量衰减、最大距离、bus、pitch、loop、priority、voice limit 可配置。
- 多 listener 行为仅声明已支持模式；不假装已有完整分屏空间混音。
- 所需音效预解码/预备；输入点击与已发生的接触音不等待慢资源或渲染 ACK。
- 按已定义音频时钟安排，使用参数平滑避免爆音，但不以数百毫秒缓动延迟普通提示音。
- 浏览器 user gesture、暂停恢复和音频失败有 UI 反馈；测量数据可用则报告，不可用不填零。

### 17.2 游戏 Control 系统

Control 属于游戏场景里的 UI 分支。它拥有自己的布局、焦点、输入命中与画布规则，但不需要创建另一份游戏世界，也不是 Node2D 的简单派生。

闭合：

- anchors、offsets、minimum size、alignment、pivot；
- 行/列/网格等必要 Container 的布局与脏更新；
- Label、Image、Button、Panel、Progress、Slider 和现有文本输入；
- focus、keyboard navigation、modal、clipping、hit order、input consumption；
- 文字换行、字体资源、回退、中文/Unicode、DPI 和窗口适配；
- HUD 跟随屏幕而不是世界相机。

游戏 UI 采用 Runtime 自研渲染语义；必要文本编辑/IME/可访问性 DOM bridge 可以保留最小平台实现，但不导入 Editor/Vue 应用与编辑器样式。

布局失效只更新受影响内容，不每帧递归 measure 整棵 Control 树。表现动画不得让 hit target 与视觉位置不一致；动画不等待输入完成才执行逻辑动作。


## 18. 资产流水线：有价值的封装，不是统一换后缀

复用上一轮 Importer、缓存键、资源版本与调度器。

### 18.1 导入环境

- Desktop Editor：原生 Rust watcher/Importer 处理用户已授权目录。
- 监听事件需 debounce、去重、原子保存识别、版本检查；忽略生成目录，防止导入循环。
- Web Editor 若无持久文件权限，使用用户显式文件选择、拖入或已支持的文件接口；显示能力差异。
- Player 不运行项目 watcher、源码编译器、编辑器插件扫描或导入 GUI。
- 网络和磁盘 I/O 与 CPU 解码、转码、压缩是不同任务类别，共用总预算但采用合适执行器。

### 18.2 图片

源图保留，不破坏用户原始 PNG。

按用途输出：

- 像素画、UI、精细 Alpha：优先保真与正确采样。
- 普通美术/背景：在可接受画质下考虑 WebP 等文件压缩。
- GPU 压缩：若上一轮已有 KTX2/Basis/目标压缩变体，按实际 API 能力使用并验证质量。
- 纹理图集按采样、材质、加载域、资源生命周期和尺寸约束分组。

WebP 的文件体积与上传后的 GPU 内存不是同一指标；不能以 `.tex` 后缀声称已经 GPU 最优。

atlas 必须记录 stable sprite ID、原图逻辑尺寸、trim rect、pivot、UV、旋转标志和边缘扩展；mipmap/filter/alpha/color space 与自研渲染器一致。

不把全项目塞进一个巨型 atlas，避免单个小资源请求牵连大量无关内容。改一张小图尽量只重建受影响 atlas 页；重建后稳定引用不变化。

### 18.3 元数据

`.import` 或当前等效 sidecar 可以采用，但不得生成重复权威元数据。

元数据至少包括 sourceId、importerVersion、sourceHash、settingsHash、targetProfile、outputs、dependencies、warnings。

音频 loop 是播放策略还是导入变换、纹理 filter 是默认导入设置还是实例采样覆盖，需要明确层级，避免同名参数在三处互相覆盖。

缓存可以重建，源资产与用户配置必须保存；所有失败有资源定位、原因与重试动作。

### 18.4 当前明确延后的内容

- 通用 glTF/FBX → 2D 骨骼自动转换。
- 为兼容所有二维骨骼工具引入多个复杂运行库。
- 与当前需求无关的模型、光照烘焙、材质 PBR 工作流。

原因是源数据、投影/关节/蒙皮语义、作者工作流和兼容要求尚未定义，而不是声称永远不可做。已存在并被用户项目使用的功能不删除；新增支持在有真实样例与明确范围后另立小目标。

---

## 19. 脚本：完善现有语言的创作体验

先读取当前脚本实现，不根据用户清单推断一定使用 TS。

本轮默认：维持现有可用语言，完善挂接、元数据、诊断、模板和信号连接；不新增未经明确需求确认的第二套完整脚本引擎。

- 脚本资源与实例状态分离。
- 新建脚本/挂接脚本/打开脚本/解除挂接入口清楚。
- 暴露属性经 schema 与稳定字段 ID 驱动 Inspector。
- 运行错误定位到节点、脚本、函数和源码行；重复错误限流但不吞掉。
- 脚本 API 围绕 Node/Component/Resource/Signal façade，不暴露编辑器 store。
- 调用/查询尽量在 Runtime Owner 或批量契约内完成；不恢复每回调全场景 JSON。
- 如果使用 Rhai，延续已实现 AST/宿主模块缓存、Scope 隔离、操作预算和顶层初始化规则。
- 已有 TS/JS 脚本则在构建期编译/校验；普通脚本不得任意访问 Tauri、DOM 或编辑器模块。
- Hot reload 按脚本版本校验/迁移实例状态，失败保留可用旧版本并报告，不丢失用户数据。
- Inspector 读取元数据不执行用户脚本。
- Tool script 默认不自动执行；只对显式受信任项目/工具模式开放，并分离权限、错误和可撤销编辑事务。
- Worker 不是任意恶意代码的完整安全沙箱；不要因为用了 Worker 就取消项目信任边界。

---

## 20. 导出与运行：闭合工作流，但不重复搭建器

复用独立 Player、资源包及 manifest。

导出流水线应当：

1. 校验项目、入口场景、节点类型、脚本和资源引用。
2. 完成所需导入与运行格式生成，使用确定的 buildId。
3. 收集入口可达资源，以及明确声明的动态加载内容。
4. 校验目标图形后端、纹理变体、WASM/glue/Worker 与协议版本匹配。
5. 生成运行包与目标平台 Player，保存构建日志和诊断。
6. 在真实产物中做启动/输入/场景/音频 smoke test。

Web 默认产物是一份可部署目录或压缩包，包括 `index.html` 及其 JS、WASM、Worker、资源、manifest 和必要部署说明。没有必要把一切 base64 塞入单 HTML；不要用 file:// 双击失败否定正常 HTTP 部署。

Desktop 使用对应 Windows/Linux 版本的最小 Tauri Player 模板。模板、原生依赖或权限变更时再编译模板；只是游戏内容变更时优先复用匹配模板与既有打包机制。

保留单 EXE 与 Player + PAK 形式，但不把两者变成行为不同的引擎。

标准 minify/bundle 是构建工具选择，不等于通过混淆提高 FPS。避免激进属性名改写破坏 schema/反射/信号目标；需要 sourcemap 的调试产物与公开发布策略分开。

Tauri 桌面 EXE 是原生宿主 + WebView 内容的发布形式，不意味着 TS/JS 游戏逻辑自动 AOT 成原生 GPU 引擎。

---

## 21. Editor 信息架构：本轮允许实质性重构

设计目标不是照抄 Godot 的配色或密度，而是学习它让用户容易理解“我在编辑什么、操作作用于哪里、下一步在哪里”的工作流。

推荐默认结构：

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 项目 / 场景 / 编辑 / 调试 / 帮助      2D | 脚本 | 游戏       运行项目 ▾  │
├────────────────────────────────────────────────────────────────────────┤
│ 打开的场景标签与保存状态                 暂停 / 单步 / 停止（状态明确）  │
├───────────────┬────────────────────────────────────┬───────────────────┤
│ 场景           │ 当前场景/选中节点相关的上下文工具栏 │ Inspector         │
│ 搜索 / 添加节点│                                    │ 节点名、类型、路径 │
│ 结构树         │           2D 视口                   │ 属性 | 信号 | 组   │
│ Local/Remote   │                                    │                   │
├───────────────┤                                    │ 分组属性与资源选择 │
│ 文件 / 资源    │                                    │                   │
│ 搜索 / 导入状态│                                    │                   │
│ 项目资源树     │                                    │                   │
├───────────────┴────────────────────────────────────┴───────────────────┤
│ 输出 | 调试 | 动画 | 音频 | 性能     ← 折叠的底部工具区，按需展开        │
├────────────────────────────────────────────────────────────────────────┤
│ 当前模式 / 保存与导入状态 / 错误警告 / 必要运行诊断                      │
└────────────────────────────────────────────────────────────────────────┘
```

这是功能区关系，不是强制像素布局。按现有架构整合，不为了相同位置制造多个重复面板。

主导航规则：

- 顶层产品导航、打开文档、局部工具、对象属性四个层级必须视觉和语义分开。
- 2D、脚本、游戏预览是工作区；纹理设置不是工作区，TileMap 画笔是上下文工具。
- 当前项目、当前场景、当前模式、当前选择有稳定可见提示。
- Local 编辑文档与 Remote 运行世界清楚区分，不能点击一个图标后悄悄切换写入目标。
- 面板可调整、收起、恢复布局；屏幕小不以缩小字号作为首选。
- Scene、Files、Inspector 的职责不能混成一张“所有数据”树。
- 底部工具默认不占据无关空间，但错误和运行状态不会因此被隐藏。
- 不为每个引擎组件添加一个永久顶层 toolbar 按钮。

---

## 22. 按钮与命令：可理解性优先于图标数量

### 22.1 操作分三种

**始终优先明确文字/图标+文字：**

创建项目、打开项目、添加节点、实例化场景、附加脚本、连接信号、导入、运行项目、运行当前场景、导出、应用设置，以及第一次接触很难从图形猜出的动作。

**可以紧凑 SVG 图标：**

播放/暂停/停止、搜索、关闭、展开折叠、可见性、锁定、撤销重做等已有稳定含义的局部操作；仍必须具备 tooltip、可访问名称和适当快捷键提示。

**溢出或上下文菜单：**

低频高级动作，且不能成为基本工作流唯一入口。

“加号”必须说明添加什么；三个形似播放三角的按钮必须清楚区分运行项目、运行当前场景和预览资源。

按钮禁用时提供原因，不展示不可用控件却让用户反复点击。危险动作说明对象与影响，可 Undo 的常规编辑优先 Undo 而不是过度确认弹窗。

### 22.2 一个 Command Registry

复用或建立一个 Editor 内的命令注册源：

```text
commandId / label / icon / tooltip / shortcut
scope / visibleWhen / enabledWhen / disabledReason
argumentSchema / execute / undoPolicy / telemetryClass
```

Toolbar、菜单、右键、命令面板、原生菜单、快捷键调用同一命令处理器，不各写一份业务逻辑。

Registry 不进入生产 Runtime 依赖；运行时接收的是受控事务/动作契约，不是编辑器 Vue 对象。

快捷键沿用当前用户设置和平台惯例，新增映射先做冲突检测。菜单与 tooltip 显示实际映射，不把示意快捷键硬编码成无法更改的事实。

操作效果不得等待按钮入场动画完成。按下立即反馈，语义提交在正确的 click/release/键盘确认阶段执行，避免为了“低延迟”误触破坏性动作。

---

## 23. Scene、Files、Inspector、Signals 的实际行为

### 23.1 Scene Panel

- 显示场景文档节点树，不是浏览器 DOM 树。
- 创建、删除、重命名、复制、重挂、可见/锁定、实例标记和脚本标记。
- 不合法父子关系在拖动前提示；重挂支持 Keep World/Local 的可理解选择。
- 选择、键盘导航、搜索过滤与视口同步；大树虚拟化保持展开与选择身份。
- 添加节点对话框按用途分类、可搜索、带短描述、合理默认与收藏/最近使用。
- 显示可复用场景实例与覆盖状态，不暴露不必要的内部 ECS 存储细节。

### 23.2 Files/Resources Panel

- 显示项目资源及类型，不暴露不相关宿主目录。
- 双击按类型打开；图片拖到视口创建 Sprite，拖到字段则赋予资源引用。
- 文件与资源的来源路径、稳定身份和导入状态可查看。
- Move/Rename/删除影响分析与引用维护一致；不让用户靠重启发现引用已损坏。
- 导入失败、排队、就绪有不同状态；缩略图按可见性和后台预算生成。

### 23.3 Inspector

- 顶部固定显示对象名、类型、场景路径/实例关系与当前 Local/Remote 模式。
- schema 分组字段，不把所有字段无差别摊成很长的表单。
- Transform、表现、行为、资源和高级设置层次分明，常用项优先。
- 资源字段是类型安全的 picker/拖入目标，不是让用户手输绝对路径。
- 数字字段有单位、范围、reset/revert、混合多选值提示；精确输入与可选拖动同时存在。
- 用 schema 标记“实例覆盖”“默认值”“运行只读”“不可动画”等状态。
- 编辑草稿立即本地显示，更新 Runtime 通过现有事务；拒绝或冲突有恢复方案。
- 后台 Remote 数值刷新不覆盖正在输入的 draft、选区或 IME。

### 23.4 Signals/Groups

- 信号按类型列出、说明参数与触发条件。
- 连接对话框可选接收节点与方法，检查签名，提供当前脚本模板跳转。
- 已有连接显示目标和失效警告；双击定位，不要求用户记住字符串路径。
- 连接/断开/重命名引用可保存、可撤销、可迁移。
- Groups 用于组织和受控调用；不新增每帧全局事件风暴。

### 23.5 运行与调试

- 明确运行项目与运行当前场景，入口缺失时给设置动作。
- Play、Pause、Step、Stop 状态与实际 Runtime 一致；不能只切按钮样式。
- Remote Scene 与 Remote Inspector 只订阅必要数据，保持上一轮限频。
- 断点/异常/脚本错误若已有能力则接入，不无依据展示空 debugger 壳。
- 输出可定位对象、脚本、资源和构建阶段；日志有界且不过度打断。

---

## 24. Tool Mode、Gizmos 与撤销事务

定义明确状态：

- Edit：编辑文档 + 渲染预览，无普通玩法/物理自动推进。
- Preview：明确选择的动画、音频或资源预览，隔离副作用。
- Play：独立运行世界，使用真实 Runtime。

“只渲染”不是禁止一切更新：布局、资源就绪、编辑变换和用户主动的预览仍须更新。不要通过停止所有 tick 把编辑器变成卡住的静态截图。

Gizmo 首选现有自研 overlay 命令流；少量 SVG/DOM 控件若保留，使用同一坐标和命中规范，不能每帧经 Vue 更新上千个装饰对象。

必须完善：

- Select/Move/Rotate/Scale 模式、Local/World、grid snap、angle snap、frame selected。
- 多选共同操作与明确 pivot；锁定/隐藏对象不误选。
- 碰撞形状控制点、TileMap 笔刷、Control anchors 在对应上下文出现。
- pointer down 保存基准，move 立即局部视觉反馈并合并在途意图，up 提交一个事务。
- pointercancel/Escape/失焦撤销预览，恢复基准，清理 capture 和临时材质。
- Runtime ACK 迟到时按 transaction/revision/epoch 识别，不能让已结束拖动跳回旧位置。
- Play 模式不把对象运行位置持续写回作者文档；Apply Runtime Changes 为显式可撤销动作。

Editor 命令“快”不等于“直接写全局对象”。使用本地可回滚预览消除体感等待，同时保留真实事务一致性。

---

## 25. 视觉与动效：这次先让用户看懂，再让操作更漂亮

保留已经建立的 Comfortable 设计 token 和 VisualQualityFloor；本轮改变层级与控件组合，而不是退回小字号、小间距、无动画界面。

- 主文字和输入值保持当前舒适默认值；上下左右 padding、组间距、面板留白不缩水。
- 用标题、分组、背景层次和动作位置解释信息层级，不只是增加边框与圆角。
- 面板外轮廓圆润，内部字段不变成无数药丸/卡片。
- 关键动作通过可读文案与相邻上下文表达；状态颜色不是唯一信息通道。
- 启动页强调新建/打开/最近项目/模板，不再是零散文字，也不做营销页面。

动效继承已有 Snappy/Smooth/Elastic、可打断状态机和有界活动集合，禁止每个新组件另写 timers。

- 核心 hover/press/focus、Tab、折叠、菜单、弹窗、拖拽反馈完整接入。
- 操作立即获得按压/状态反馈，逻辑不等待视觉收敛。
- 选中对象切换和 Inspector 重组保持上下文，不进行大范围会迷惑位置的飞入动画。
- 布局变化可使用测量后短过渡，不制造每帧 layout thrashing。
- 高刷新率下按时间推进，不按帧数计时；动画总时长不随 FPS 变化。
- 暂停/不可见时停止无必要装饰，Reduced Motion 保留状态可理解性。
- 模糊/阴影按上一轮成本系统处理，游戏世界不继承编辑器玻璃材质。

本轮 UI 完成不靠截图美化判断，还要靠真实工作流：用户能否快速找到正确动作、理解当前作用对象，以及完成操作而不需要读源代码。


## 26. 低延迟与性能验收：新抽象不能消耗掉上一轮成果

沿用上一轮 H1/H2、B0–B8、X01–X15 与原始数据格式，增加本轮功能对照，不重设一个更轻松的基准来宣称成功。

继续区分 `QualityLocked`（相同画质和负载的工程性能）与 `AdaptiveExperience`（有记录的自适应实际体验）；两者独立报告。

### 26.1 先建立交接基线

- 使用固定交接 commit，运行相同旧问题项目和轻量完整游戏。
- 固定硬件、电源模式、宿主版本、图形后端、DPI、分辨率、画质、可见对象、fixedHz 和输入轨迹。
- 记录实际 monitor/宿主刷新条件；不能因为用户目标是 240FPS，就假设用户已经拥有且启用了 240Hz 屏幕。
- 新 UI 的测试使用相同文档规模、窗口尺寸、选择对象与背景工作。

### 26.2 新节点抽象的增量成本

分别比较：

1. 上游运行时原路径与本轮 Node/Schema/Signal 接入路径。
2. Editor Play 与独立 Player。
3. UI 静止、正常操作、背景导入以及大场景选择/拖拽。
4. 100、1,000、10,000 或与原基准一致的节点规模；活跃节点和总节点分别统计。

要求：

- 无订阅的静态节点不增加每节点脚本回调。
- 多一个节点类型不增加新的全局主循环或默认 Worker。
- 一个字段修改不重建全场景 schema、Node 门面或 render packet。
- 只更新需要变更的字段、区域和订阅者。
- 成本曲线和 allocations/队列长度可解释；不能在规模扩大后出现额外 N×M 全世界复制。
- 不为追求“零复制”引入未定义共享缓冲并发访问。

相同工作量下，新 façade/registry 的成本应接近已有路径的测量噪声。可把 p95 关键路径回归超过 `max(0.2ms, 交接值的5%)` 设为初始调查警戒线；这是调查门槛，不是允许长期消耗的额度，也不覆盖原更严格门槛。

稳定存在的回归必须归因、修复或明确未通过；不可为了过测试删除功能/事件或修改样本。

### 26.3 240Hz 目标的地位

在真实可验证的高刷新目标环境中，轻量完整二维样例以 240Hz 的约 4.17ms 帧间隔为目标。它不是所有硬件和所有压力场景的保证。

- CPU 关键路径和 GPU 耗时分别测；不能简单把所有并行阶段相加，或只取一个函数倒数作为 FPS。
- rAF 回调次数、模拟 tick 数、提交帧数与实际呈现不是同一指标。
- 浏览器/Worker 的 rAF 通常受显示刷新节奏影响；不通过 1000Hz setInterval、离屏空跑或重复提交同一画面伪造 240+。
- 固定渲染画质下验收吞吐；AdaptiveExperience 另报，不能混用降画质后的数字。
- 平均值、P95/P99 帧时间、1% Low 的定义、抖动和原始数据均保留。
- 当前设备/宿主不能验证 240Hz 呈现时报告 `NOT_TESTED` 或具体限制，不宣称已达成，也不将 UI/功能工作永久卡死。

### 26.4 输入追踪必须与真正受影响帧关联

为按键/鼠标测试保留 inputSequence、接收/投递/消费时间、worldEpoch、消费 tick、首次受影响 packet、提交时间。

不能把输入后任意一个提交帧都视为“已响应”；需要动作与帧内容/诊断标记关联。时间原点差异和采样精度明确说明。

真正 input-to-visible 只有在合法的端到端测量条件下报告；CPU receipt-to-submit 不是显示器扫描完成。

定期检验多帧积压、输入消息饥饿、重复 debounce、相机叠加 smoothing、旧渲染帧缓存和需要等待编辑 ACK 的错误链路。

---

## 27. 功能完整性的统一验收契约

每个本轮选定为必需的组件/节点，必须闭合以下维度：

| 维度 | 验收 |
|---|---|
| 创建 | 用户能从明确入口创建，默认值合法，不需改引擎源码。 |
| 编辑 | Inspector/专用工具可操作，禁用项有原因，单位/范围正确。 |
| 生命周期 | 初始化、启用、暂停、删除和场景切换语义可测。 |
| 持久化 | 保存、关闭、重开、实例化与引用维护正确。 |
| 撤销 | 适用的编辑操作可 Undo/Redo；预览不污染文档。 |
| 运行 | Editor Play 和独立 Player 使用同一语义。 |
| 导出 | 可达资源、脚本和目标后端验证通过。 |
| 错误 | 非法输入、缺失引用和不支持能力可定位，不崩溃或默默忽略。 |
| 性能 | 活跃成本、队列、分配与传输受控，禁用状态无无谓每帧工作。 |
| 帮助 | 名称、短描述、tooltip/示例能解释普通用途。 |

不适用项必须有具体理由，不能以“只是底层组件”为由免除其真实使用路径。

---

## 28. 本轮专项测试清单

将测试加入现有仓库体系，不为了测试名称另建庞大框架。

| ID | 必须验证的内容 |
|---|---|
| C01 | 树生命周期 parent/child 顺序、重复入树、延迟删除和回调取消。 |
| C02 | local/world 变换、Keep World reparent、负 scale、singular matrix、插值历史重置。 |
| C03 | 实例化场景、内部引用重映射、嵌套覆盖、源修改传播和循环拒绝。 |
| C04 | Signals：同阶段顺序、结构延迟、接收者删除、循环预算、保存重开和 Undo。 |
| C05 | Schema：类型/字段 ID 稳定、Rust/TS 一致、校验、旧字段迁移、未知类型不丢内容。 |
| C06 | 不运行用户脚本即可显示 Inspector；脚本错误和热重载失败安全。 |
| C07 | VFS：路径规范化、权限拒绝、大小写冲突、坏包、缺资源和异步取消。 |
| C08 | 资源复用、并发请求去重、卸载迟到结果、Audio/GPU 持有租约和循环依赖。 |
| C09 | Sprite/atlas/pivot/flip/颜色与透明顺序，跨已支持图形后端图像比较。 |
| C10 | Y-Sort 脚底锚点、同 Y 稳定性、组嵌套、层/父级关系和批次正确性。 |
| C11 | AnimatedSprite 帧时长、暂停/seek、长帧事件语义和多实例状态隔离。 |
| C12 | Character：贴墙/拐角/坡/天花板/平台/重生/高速；fixedHz 改变的受支持范围。 |
| C13 | Area enter/exit、移除/禁用、mask、Ray/Shape 查询和结果 tick。 |
| C14 | TileMap 笔划 Undo、大区域取消、dirty chunk、渲染碰撞就绪一致。 |
| C15 | Listener/camera 分离、音乐不衰减、sound latency tracing、暂停与失焦音频。 |
| C16 | 游戏 Control 布局、中文、DPI、焦点、模态消费、HUD 不随世界 camera。 |
| C17 | Editor 关键命令的 Toolbar/菜单/快捷键/命令面板行为与 Undo 一致。 |
| C18 | Local/Remote、运行项目/当前场景、暂停/单步/停止与文档不污染。 |
| C19 | 拖拽立即预览、慢/乱序 ACK、pointercancel、resize、坐标与 IME。 |
| C20 | 快速打开/关闭、反向动画、大 dt、120/240Hz、Reduced Motion 和幽灵点击。 |
| C21 | 老项目迁移、保存 round-trip、移动资源、重新导出和脚本兼容。 |
| C22 | 真实 Web/Windows/Linux Player，干净环境启动与平台能力差异报告。 |
| C23 | 相同负载下 Node 门面成本、无活跃脚本静态场景、信号与查询扩展曲线。 |
| C24 | 低延迟输入链路：60/120 fixedHz 与多个显示刷新条件，质量锁定与真实时间标记。 |
| C25 | 30 分钟编辑/Play/Stop/导入/重开混合运行，50 次场景/实例循环无持续资源泄漏。 |

测试中的素材使用自有或可合法分发内容；环境缺失如实标注。假时钟用于可重复逻辑测试，真实宿主用于呈现/输入/音频验证，两者不互相冒充。

---

## 29. 三条必须真实完成的制作工作流

### W1：角色与交互

用户在 Editor 中新建场景，创建 CharacterBody2D，添加形状、Sprite/帧动画、Camera 和脚本；通过 InputMap 配置移动/跳跃，通过 Area 的 signal 触发一个简单交互和音效；保存角色为可复用场景，在关卡中实例化。

要求：不修改 Nova_A 引擎源码即可完成；脚本使用当前支持语言；节点模板和错误提示能引导缺失配置。

### W2：关卡与资源

导入自己的 tileset，设置采样与基本 tile 定义，创建多图层地图、刷地面和障碍，Undo/Redo，验证碰撞；添加前后遮挡的 Y-Sort 道具；移动/重命名一个源资源后场景仍能加载；导入更改只更新必要内容。

### W3：菜单、发布与低延迟试玩

创建开始菜单、暂停菜单和 HUD；连接按钮信号，正确处理键盘焦点；运行项目与运行当前场景的行为可区分；导出 Web 和至少一个当前可测试桌面 Player；关闭 Editor 后独立启动游戏、输入、切换场景、播放音频、存档再读回。

上述流程要由实际生产组件完成，不用只在 demo 内部可用的私有 API，不把缺失能力写成硬编码特例。

---

## 30. UI 的可用性验收，而不是只比较截图

对 W1–W3 的关键操作检查：

- 不知道内部类名时，能否通过用途词搜索到所需节点/动作？
- 用户能否区分当前项目、场景、资源和运行实例？
- 不悬停猜 tooltip，能否看懂关键按钮？
- 能否找到“添加节点”“实例化场景”“附加脚本”“连接信号”“运行当前场景”“导出”？
- 多次切换对象时 Inspector 是否保持分组、草稿与滚动关系？
- 缺 collider、缺入口场景、资源导入失败等能否定位并给出有效修复路径？
- 键盘用户能否完成选择、编辑、确认、取消与运行？
- 复杂背景任务运行时，拖拽、输入、菜单和模式切换是否保持即时反馈？

记录任务完成路径、操作次数、遇到的误解和失败。没有独立用户测试时，只报告工程师走查，不能宣称已通过真实新手研究。

为同条件前后截图和交互录屏保留证据，但画面更漂亮不能代替操作闭环。

---

## 31. 迁移、关联改动与防止双系统

本轮允许有期限的兼容适配，不允许无限期双权威。

### 必须一起检查

| 主改动 | 连带改动 |
|---|---|
| Node/type registry | 实例化、序列化、Inspector、搜索、脚本 API、资源包、版本迁移。 |
| 新信号/生命周期 | 事件阶段、脚本调用、删除/解除订阅、场景实例、调试、Undo。 |
| 场景实例覆盖 | 稳定 ID、引用重映射、源编辑、可视状态、导出依赖、循环检测。 |
| 角色控制器 | 输入 tick、相机、动画、碰撞事件、单位、脚本模板、重生、回放测试。 |
| Y-Sort/TileMap | 透明顺序、bounds、批次、gizmo、资源导入、场景保存与图像测试。 |
| 属性 schema | Rust/TS 契约、校验、动画轨道、脚本元数据、多选、旧字段迁移。 |
| UI 信息架构 | 命令、快捷键、原生菜单、权限、焦点、布局保存、无障碍、帮助。 |
| Tool Mode | Preview 时钟、脚本信任、物理暂停、资源更新、Remote/Local、Undo。 |
| 文件/资源操作 | ID、依赖、导入缓存、引用修复、取消、权限、保存与发布。 |
| 导出模板 | JS/WASM/Worker/buildId、manifest、平台能力、资源包、真实 Player 测试。 |

对旧 SceneTree/Entity/组件编辑方式提供版本化迁移。保留备份/可恢复路径，不无提示覆盖用户文件。旧插件或脚本公开 API 不得因界面命名变化而静默失效。

所有临时兼容层需注明 Owner、可移除条件和替代路径。最终不得两套 Inspector schema、两套 InputMap、两套信号派发、两套主循环各自工作。

---

## 32. 本轮实施顺序与阶段门槛

### N0：审计和上游交接

只读核实所有组件与工作流，输出状态矩阵、缺口、依赖和 UI 方案；固定基线与上游契约。上游未交接的核心修改先标阻塞，不在活动工作区抢写。

### N1：类型与文档契约

完善 registry、属性 schema、ID 映射、组件/节点表述、序列化适配及场景实例必要契约。保留旧项目，跑兼容与边界测试。

### N2：低延迟节点与事件闭环

完善生命周期、signal、active lists、InputAction/focus 路由与脚本接口；证明 façade 不恢复高频跨层复制。

### N3：一个角色的纵向切片

用 Character + Shape + Sprite/Animation + Camera + Input + Signal + Audio 完成 W1。先让真实制作/运行闭环成立，再推广到全部次要节点。

### N4：Godot 式编辑工作流

重构 Scene/Files/Inspector/Signals/Command Registry 与 Local/Remote/Play 入口。用 N3 的真实生产节点验证，不只做 mock。

### N5：关卡、资源和游戏 UI

闭合 TileMap/Y-Sort、资源导入依赖、Control/HUD/menu，完成 W2/W3 的主要编辑步骤。

### N6：动效、视觉与大规模编辑验证

统一舒适视觉、直观按钮与完整动效，加入大树/Inspector/导入负载，确认低延迟不被 UI 工作破坏。

### N7：独立导出与兼容清理

验证 Web 与真实桌面 Player，旧项目迁移、资源移动、脚本兼容、单文件/资源包一致性；清理无用适配和旧重复系统。

### N8：性能与最终证据

完成 C01–C25、W1–W3 及相关上游 B/X 基准，分别报告功能、视觉、交互延迟、吞吐、真实平台覆盖与未通过项。

每阶段可运行、可回滚，有明确入口和出口。普通实现决策自主执行；达到冻结技术栈/权限/兼容性边界时，报告具体选择和风险，不静默越界。

---

## 33. 最终交付与状态真实性

除实际代码、测试、样例与构建产物外，尽量只复用现有跟踪文件；确实需要时新增一份本轮总状态报告，不生成几十个互相重复的规范。

最终报告必须包含：

1. 交接 commit、最终 commit、实际变更范围。
2. 用户原清单逐项映射：复用、修复、新增、延后及理由。
3. 节点/组件/资源/信号的实际可用矩阵，而非类名清单。
4. Runtime 唯一权威和 Editor/Player 依赖隔离证据。
5. W1–W3 的真实操作、保存重开与独立 Player 验证。
6. UI 前后结构、关键动作可发现性、舒适度与动态验证。
7. 相同条件下输入追踪、CPU/GPU/帧时间、背景任务、内存和队列数据。
8. 240Hz 目标的实际验证条件、是否呈现受限及不能推断的结果。
9. 旧项目/脚本/格式兼容与迁移路径。
10. `IMPLEMENTED`、`VERIFIED`、`NOT_TESTED`、`BLOCKED_UPSTREAM`、`DEFERRED_WITH_REASON` 的精确区别。

不允许：

- 声称“采用 Godot 架构所以自动高性能”。
- 用移动目录、节点重命名或新增几个按钮冒充闭环。
- 因节点方便而把 Rust 世界整体搬回 TS。
- 把编辑 SceneTree 当成 Vue DOM 或响应式运行世界。
- 把所有按钮隐藏成图标后称为清爽直观。
- 用新 signal/Promise 链让输入再等一帧。
- 完全没启动 GUI 就声称用户体验已经通过。
- 修改基准画质/负载或用未显示的内部帧数宣称 240+。
- 声称 WebP 必然省显存、Tauri 必然变原生图形、fixed dt 必然跨平台确定性。
- 修改正在执行的上游主指令以规避门槛。

---

## 34. 立即执行指令

先完成 N0，确认上游交接与当前真实状态。

之后按本文件与已冻结上游契约实施：

**先建立统一类型/属性/信号契约，再闭合角色与关卡工作流；以 Godot 式清晰编辑体验重构 UI，同时守住自研渲染、Rust/WASM 权威世界、独立 Player 与低延迟输入路径。**

不要先增加数量庞大的空节点，也不要开始一轮纯换皮工程。

本轮结束时，用户应该能在不修改引擎源码的情况下，通过清楚的场景树、资源、属性、信号、脚本与发布工具制作一款小型完整二维游戏；同时实际 Player 的延迟和性能不被新增创作抽象拖回旧水平。

---

## 附录：技术核验资料与解释边界

资料核验日期：2026-10-08。`stable` 是可移动别名；工程师实施时应记录实际采用的稳定版本、工具链版本与访问日期。不为追逐外部最新版无约束升级整个项目。

以下资料用于确认原理和纠正清单中的误解；本 Prompt 的优先级、组件门面、迁移和验收安排是 Nova_A 的工程选择，不是宣称外部引擎采用了完全同样的内部实现。

- R1 — Godot：节点、场景与信号的核心概念。
  https://docs.godotengine.org/en/stable/getting_started/introduction/key_concepts_overview.html
- R2 — Godot：编辑器工作区、Scene/FileSystem/Inspector 与底部工具。
  https://docs.godotengine.org/en/stable/getting_started/introduction/first_look_at_the_editor.html
- R3 — Godot Node：生命周期顺序与 ready 行为。
  https://docs.godotengine.org/en/stable/classes/class_node.html
- R4 — Godot Physics introduction：CharacterBody 与 RigidBody 分工、move_and_slide 的时间步语义。
  https://docs.godotengine.org/en/stable/tutorials/physics/physics_introduction.html
- R5 — Godot RayCast2D：射线查询而非普通碰撞形状。
  https://docs.godotengine.org/en/stable/classes/class_raycast2d.html
- R6 — Godot Control：布局、输入与 Node2D 的关系。
  https://docs.godotengine.org/en/stable/classes/class_control.html
- R7 — Godot TileMapLayer：按图层组织地图。
  https://docs.godotengine.org/en/stable/classes/class_tilemaplayer.html
- R8 — Godot AudioStreamPlayer2D：二维空间声音。
  https://docs.godotengine.org/en/stable/classes/class_audiostreamplayer2d.html
- R9 — Godot 资源路径：res:// 与 user://。
  https://docs.godotengine.org/en/stable/tutorials/io/data_paths.html
- R10 — Godot 图像导入：文件压缩、显存压缩、采样与图集的不同作用。
  https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_images.html
- R11 — TypeScript：类型擦除。
  https://www.typescriptlang.org/docs/handbook/typescript-from-scratch
- R12 — TypeScript 5.0：新旧 decorator 模式与元数据限制。
  https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html
- R13 — MDN FinalizationRegistry：GC/finalizer 时机不能作为关键清理保证。
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
- R14 — MDN dedicated Worker rAF：回调调度与刷新节奏。
  https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorkerGlobalScope/requestAnimationFrame
- R15 — Godot 物理插值：固定物理与显示帧分离及延迟取舍。
  https://docs.godotengine.org/en/stable/tutorials/physics/interpolation/physics_interpolation_introduction.html
- R16 — Rapier 确定性说明：相同初值、操作顺序等附加条件的重要性。
  https://rapier.rs/docs/user_guides/javascript/determinism/
  这里只作为条件说明，不代表 Nova_A 已使用或必须替换成 Rapier。
- R17 — Khronos glTF：三维场景/模型资产交付格式。
  https://www.khronos.org/gltf/
- R18 — Tauri 进程模型：原生 Core 与 WebView 执行职责。
  https://v2.tauri.app/concept/process-model/

- R19 — MDN Promise：异步完成与任务队列，不等于 CPU 多核执行。
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
- R20 — MDN WebGL best practices：批量绘制、资源与同步成本。
  https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

**主 Prompt 结束。**
