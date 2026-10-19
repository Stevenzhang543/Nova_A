# Nova_A 26.41 工程评估与成熟引擎组件对照

- 评估对象：/home/claude/nova（E:\Nova_A 26.41 副本），只读审阅，未运行 GUI、未重测。
- 标注约定：**[实测]** 出自 docs/latency-results.md（单机 Windows，240 Hz，WebView2）；**[代码]** 由源码直接确认；**[推测]** 是根据代码推断的结论，需要测量验证。

## 0. 执行摘要

1. 功能面很广，名单上接近 Godot 2D：TileMap、Animator、Timeline、骨骼、粒子、音频总线、游戏 UI、导航、存档、联网回滚、事件表/可视化图、Rhai 热重载与断点都有实现。差距主要在三处：深度不足（光照、碰撞形状、脚本表达力）、分层不干净、新手能找到的入口太少。
2. **[实测]** 26.41 的按键到桌面截图 P50 为 23.1 ms，可拆成四段：OS 到 handler 5.6 ms，等固定步 5.6 ms，帧内到提交 3.6 ms，提交到合成 6.7 ms。后两段里 2D 光照叠加层约占 4 ms（关灯后为 2.6 ms）。
3. **[代码]** 2D 光照不是真正的光照。它在 Canvas2D 叠加层上用 destination-out 把暗幕"挖亮"，阴影用全分辨率 `context.filter = blur()` 绘制（lighting2d.ts:131-160）。后处理靠 CSS `filter` 作用在 WebGL canvas 上（WorldCanvas.vue:1734）。这条路径既慢，又不在 GPU 计时范围内，画面效果也偏差。把它移进 WebGL2 是延迟和画质两方面收益最大的一项。
4. **[代码/推测]** 实测用的 marker 没有 RigidBody（make_test_project.py:42-54），因此绕开了物理插值。真实玩家角色走的是默认的 `Interpolate`（World.ts:962），显示要比最新物理态再晚 0~1 个 tick，60 Hz 下平均约 8 ms。这段**尚未测量**，真实游戏的延迟大概率高于 23.1 ms。
5. **[代码]** 物理性能有几处明显浪费：每个固定步都对全部实体执行 `synchronizeRuntime`（World.ts:514,789-881）；每次 raycast 都触发全量同步（World.ts:768）；窄相不跳过静态对静态、休眠对休眠的配对（legacy.rs:265-345）；CCD 靠全局子步，一颗快速物体就能把整个世界的子步数推到 128（legacy.rs:3-27）。
6. **[代码]** 每次脚本回调都会新建一个注册了 170 多个闭包的 Rhai `Engine`（nova_script/lib.rs:1093,1183），结果再经 JSON 往返（GameplayRuntimeCore.ts:63）。脚本实体一多，这是首要的 CPU 风险。
7. **[代码]** "一个世界一个时钟"没有完全落实：计时器按可变帧时长推进（time.ts:38-44），固定步用的是 Rust 累加器（nova_runtime/lib.rs:693-740）；物理事件要等一帧的全部固定步结束后才统一派发（GameplayRuntimeCore.ts:785）。这对回放、联网确定性和碰撞回调语义都有风险。
8. **[代码]** 分层违规：runtime/renderer/world 下有 54 个文件导入了 editor/store/components 或 vue，其中 39 个直接导入 vue。PlayerApp.vue 依赖 WorldCanvas.vue、store/editor 和 store/physics（第 45、74-75 行）。这是导出 Player 延迟无法单独测量、单独优化的根因。
9. **上手难度**：已有 22 个模板，其中 6 个是完整小游戏，这是优势。但手册在前 1400 行都是版本流水账，目录直到第 1403 行才出现；docs/ 下有 447 个文件，大多是台账；docs/FIRST_GAME_5_0.md 还在讲 5.0 时期的认证门槛。新手找不到一条清楚的路径。
10. 建议 26.42 只做五件事：光照进 WebGL2、默认 tick 与插值策略、Play 期间去掉玻璃与空叠加层、物理同步走脏标记、Player 解耦并补测导出延迟（见 §2.3）。

## 1. 功能对比与缺陷

| 领域 | Nova_A 现状（依据） | 主流参考 | 主要缺口 | 优先级 |
|---|---|---|---|---|
| 场景/对象模型 | 实体 + 组件 + 父子层级、预制体、场景实例（src/world、runtime/prefabs.ts） | Godot 用节点树、场景嵌套/继承、信号；Unity 用 GameObject + Prefab Variant | 没有场景继承；信号连接是组件化的，但脚本里没有 `await` 或协程（nova_script 中 `await/yield` 出现 0 次） | P1 |
| 2D 渲染 | 自研 WebGL2，支持排序、合批、实例化、MSAA、材质图 | Godot 的 CanvasItem 批处理、着色器语言 | 每帧对全部 packet 排序（WebGL2Renderer.ts:569）；TileChunk 每帧展开成逐精灵命令（:560），没有保留式 chunk VBO | P1 |
| 2D 光照/后处理 | Canvas2D 叠加近似 + CSS filter | Godot 的 PointLight2D、DirectionalLight2D、LightOccluder2D、CanvasModulate、法线/高光贴图都在 GPU 上 | 缺乏乘性光照、GPU 阴影、正确的 bloom（现在用 drop-shadow 冒充） | **P0** |
| 物理 | 自研 SI 求解器，含热启动、复合子形状、绳索、关节、单向平台、CharacterBody | Box2D v3：Soft Step、推测接触 + TOI、持久岛、多线程 | 没有动态 BVH；凹形/链形只能用于查询（KNOWN_LIMITATIONS）；没有真正的 TOI CCD | P1 |
| 动画 | Animator 状态机、Timeline、帧动画、骨骼 rigging | Godot AnimationTree/Tween、Unity Animator | 脚本层没有 Tween API；状态机缺少混合树（推测，需核对） | P2 |
| TileMap | 稀疏 chunk、多层、地形、动画瓦片、碰撞贪心合并、导航/遮挡烘焙 | Godot TileMapLayer（4.3） | 渲染没有缓存；碰撞矩形以静态体身份参与 O(n²) 邻接窄相 | P1 |
| 音频 | Web Audio、总线、混音效果、计量（audioRuntime.ts:39-41） | Godot AudioBus、2D 定位 | 26.41 没有人耳实测（RELEASE_NOTES） | P2 |
| 游戏 UI | Canvas、RectTransform、主题、本地化、焦点、无障碍 | Godot Control + Container | uiLayout.ts 只有 110 行，容器与布局约束很薄 | P2 |
| 脚本 | Rhai，@export、热重载、断点、覆盖率，命令延迟应用 | GDScript/C#，即时调用 | 写操作排队到回调结束后才生效，同一回调内读到的是旧值（推测）；每次调用新建 Engine；没有协程 | P1 |
| 调试/分析 | 性能分析器、物理调试器、延迟探针、GPU timer | Godot 远程场景树 + 监视器、Unity Profiler/Frame Debugger | GPU 计时只覆盖 world pass；没有帧捕获，也没有 draw 级调试 | P2 |
| 资源管线 | AssetDatabase、导入 Worker、内容哈希、Tiled 互通、novaPak | Godot import + .import、Unity Addressables | 基本齐全 | P3 |
| 导出 | Windows、Web 为 Tier1，Linux 实验性，Android 可选 | Godot 覆盖桌面、Web、移动、主机（第三方） | Player 依赖编辑器模块，体积和冷启动都受影响；导出 Player 延迟未测 | **P0** |
| 插件/生态 | 包管理、权限与签名门控 | Godot AssetLib、Unity Asset Store | 没有社区仓库；可以接受，暂缓 | P3 |
| 测试 | cargo test 共 198 个；606 个 verify-*.mjs | 单元测试框架 + CI | TS 侧没有单元测试运行器，部分旧校验本来就是失败状态 | P1 |

## 2. 性能与延迟

### 2.1 延迟预算（rel，按键按下边沿 P50，**[实测]**）

| 段 | ms | 主要成因 |
|---|---|---|
| SendInput → handler | 5.6（OS 时间戳 → handler 2.4） | OS 与浏览器派发，主线程空闲度 |
| handler → 固定步消费 | 5.6 | 60 Hz 固定步的相位等待；240 Hz 时为 0.5 |
| 消费 → WebGL 提交 | 3.6 | 剩余模拟 + 渲染，CPU 帧 1.9 |
| 提交 → 截图 | 6.7（无光 2.6） | Canvas2D 光照叠加、DOM 合成、DWM |

### 2.2 优化清单（按"收益 / 风险"排序）

| # | 手段 | 预期收益 | 风险 | 改动文件 | 验证 |
|---|---|---|---|---|---|
| 1 | **光照进 WebGL2**：半分辨率光照 RT（R11G11B10 或 RGBA8），每盏灯一个 additive 四边形加衰减；阴影用遮挡体挤出几何写入 stencil 或光照 RT，最后 multiply 合成；Canvas2D 只作为显式回退 | [实测上限] 提交→截图约 −4 ms（6.7→2.6），同时得到正确的乘性光照；GPU 计时也能覆盖光照 | 画面与旧版有差异，需要回归截图；法线贴图要迁到 shader | renderer/lighting2d.ts、WebGL2Renderer.ts、sceneRenderer.ts、WorldCanvas.vue:1410 | 用 latency harness 的 key/frames 对比 new/nolight；lighting-starter 截图做 diff |
| 2 | **tick 相位等待**：新模板默认 120 Hz，同时 minimumSubsteps 8→4，保持每秒子步数不变；项目设置里标明 tick 与延迟的关系 | [实测] 240 Hz 时端到端 18.6 ms。[推测] 120 Hz 时 handler→consumed 约减半（−2.5~3 ms），物理 CPU 基本持平 | 改变手感和确定性回放；老项目不改 | projects/templates.ts、runtime/physicsProduction.ts:190 | harness 跑 60/120/240 三档；用 cargo 基准看子步 CPU |
| 3 | **受控角色的插值策略**：给每个物体加插值模式（Godot 4.3 起 2D 有同类开关），玩家控制的 CharacterBody 默认 Off 或外推；**先测量** | [推测] 60 Hz 下平均约 −8 ms，对物理驱动的角色有效 | 关掉插值后低 tick 会有抖动，需配合 #2 | world/World.ts:950-988、components 的 schema、Inspector | 在 harness 增加 CharacterBody marker，比较 Interpolate 与 Off |
| 4 | **Play 期间不在画布上做模糊**：Play 或 Game 视图里玻璃胶囊改成不透明（editor.css:143 的 backdrop-filter）；叠加 canvas 在没有内容时跳过整屏 clearRect 和绘制 | [推测] 合成侧 0.5~2 ms，帧尾抖动更小 | 视觉上有小变化 | ui/editor.css、layout/EditorLayout.vue:25-28、WorldCanvas.vue:1401-1408 | 先打开已有的 Reduce Transparency 设置做 A/B，零代码即可测 |
| 5 | **Player 解耦 + desynchronized 实验**：做一个无 Vue 的 Player 宿主，单个 WebGL canvas，上方不叠任何 DOM，再试 `getContext('webgl2',{desynchronized:true})` | [推测] Player 的提交→显示可能接近无光值以下；desynchronized 能否生效取决于平台（Chrome 文档说明其上方不得有 DOM） | 可能出现撕裂，Windows 上的支持需实测；需加开关 | player.ts、PlayerApp.vue、新建 runtime player host、WebGL2Renderer.ts:367 | 读 `getContextAttributes().desynchronized`；导出 Player 跑 harness |
| 6 | 物理同步改脏标记：固定步内只 upsert 有变化的实体；raycast 不再触发全量 sync；窄相跳过静态对静态、双方都休眠的配对 | 大场景下 CPU 明显下降（本场景 1.2 ms 帧中收益小） | 漏同步会导致状态错误 | World.ts:509-525,768,789；legacy.rs:279-300 | cargo 基准，固定 1k/5k 物体的 TileMap 场景；回放校验和不变 |
| 7 | Rhai Engine 复用：只建一次 Engine，宿主函数从 thread-local 或 `Rc` 上下文读数据；命令改用类型化缓冲，不走 JSON | 多脚本场景 CPU 下降（推测数倍，需 profile） | 实例隔离必须保持 | nova_script/lib.rs:1093,1183；GameplayRuntimeCore.ts:63 | nova_script_test，100/1000 个脚本实体做基准 |
| 8 | 后处理从 CSS filter 移入 post shader（渲染器已有 post 材质通道） | 少一次合成 filter，导出画面一致 | 颜色需要对齐 | lighting2d.ts:266-272、WebGL2Renderer.ts:607 | 截图 diff |
| 9 | 帧内晚采样：渲染前只为指针或相机跟随重读一次 pointer（late-latch） | ≤1~2 ms，只对指针类有效 | 可能和固定步看到的输入不一致 | WorldCanvas.vue:376-401 | drag 模式 harness |
| 10 | fence credit 加"低延迟模式"（1 帧） | 只在 GPU 受限时有效（当前仅 1% 帧被延后） | 会掉吞吐 | WebGL2Renderer.ts:500-509 | frames 模式看 deferred 比例 |
| 11 | Engine Worker + OffscreenCanvas | 主要是隔离编辑器 UI 卡顿，对延迟本身的直接收益小 | 改动大 | runtime/、renderer/ | 不放进 26.42 |

### 2.3 适合 26.42 的前 5 项

#1 光照进 WebGL2；#2 新模板改 120 Hz 并调整子步；#3 先补测再加每物体插值模式；#4 Play 期间去玻璃、跳过空叠加层；#5 Player 解耦，补测导出 Player 延迟。其中 #4 和 #2 改动小、可以先做；#1 和 #5 是本版主线。

## 3. 算法稳定性风险

| 风险 | 位置 | 说明 | 建议 |
|---|---|---|---|
| 双时钟 | time.ts:38-44；nova_runtime/lib.rs:693-740 | 计时器、`elapsed` 走可变帧时长，物理走累加器，计时器到期的帧号随刷新率变化 | 计时器改到固定步里推进 |
| 事件派发时机 | GameplayRuntimeCore.ts:785；World.ts:529 | 一帧多步时事件攒到最后一起派发，碰撞回调晚于对应的 tick | 每步 drain，在 fixed 阶段派发 |
| CCD | legacy.rs:3-27 | 用全局子步代替 TOI；超过 128 子步仍会穿透，还会拖慢全世界 | 改成逐物体推测接触 + TOI（参考 Box2D v3） |
| 穿透修正 | lib.rs `POSITION_SLOP=1e-12`、`POSITION_CORRECTION=0.75`；contact_solver.rs | 几乎没有 slop，接触容易反复开合，导致抖动、事件闪烁、难以休眠 | slop 取约 0.005 m，加速度阈值做成可配置 |
| 休眠 | physicsProduction.ts:190 阈值 0.001 | 阈值过严，叠加上一条，物体很少进入休眠 | 测堆叠场景的休眠比例 |
| 确定性 | JS 侧 Math.sin/cos 参与碰撞变换（World.ts:923、路径跟随）；原生 headless 与 wasm 的 libm 不同 | ECMAScript 不保证三角函数的跨引擎结果一致，headless 服务器和 Web 客户端可能分叉 | 几何变换全部放到 Rust；跨端回放校验和测试 |
| 全量同步开销 | World.ts:514,768 | 每步、每次查询都 O(N)，并分配 Map 与临时对象 | 脏标记（§2.2 #6） |
| 脚本沙箱 | nova_script/lib.rs:1152-1161 | 已有操作数、深度、尺寸限制，禁用了 eval/import；但没有墙钟预算，10 万次操作乘以实体数仍可能卡帧 | 每帧总预算 + 超时实体降级 |
| 脚本语义 | ScriptCommand 队列 | 写操作延迟应用，同一回调内"写后读"拿到旧值（推测） | 文档写明，或对 transform 提供即时写回 |
| 序列化 | nova_format:13-14 与 projectFormat.ts:8-9 | 版本常量在 Rust 和 TS 各存一份；迁移有测试，Rust 侧是权威 | 构建时从 wasm 读版本，去掉 TS 常量 |
| WASM 视图 | World.ts:990-998 | 已校验 buffer 一致与长度，做法正确 | 保持 |

## 4. 上手难度

当前的上手路径是：启动器 → 选模板（22 个，其中 Snake、Pong 等 6 个完整游戏）→ Design → 脚本 → Play → Build。模板加 `@export` 加 `move_character`、`can_coyote_jump` 这类高层 API，起点比 Godot 空项目更快。

主要问题：
1. 手册（MANUAL.zh-CN.md，约 2 万行）前 1400 行都是版本记录；docs/ 有 447 个文件，大多是台账、Prompt 产物；FIRST_GAME 停留在 5.0 时期，还写着认证、SBOM 等对新手无关的步骤。
2. 脚本 API 平铺了约 170 个函数（如 `input_axis`、`entity_position_x_on(handle)`），没有对象或方法风格，也没有协程；Godot 的 `$Node.position`、`await get_tree().create_timer(1).timeout` 表达力强得多。
3. 写操作延迟应用、`fixed_update` 和 `update` 的分工、tick 与延迟的关系，这些都没有面向新手讲清楚。

建议：
- 把手册拆成"入门 30 分钟教程（从 Platformer 模板出发）+ 参考 + 版本记录"，版本记录移到附录。docs/ 的台账移到 docs/history/。
- 在 Rhai 里提供 `self.position.x` 一类属性访问（注册 getter 和 setter），增加 `tween()` 和计时器 `await` 的语法糖（可以用回调式 `after(1.0, || ...)` 实现）。
- 编辑器加一个"第一次运行"清单：打开模板、改速度、Play、导出 Web。
- 以 Godot 的 "Your first 2D game" 为标杆，写一篇完整的从零教程。

## 5. 成熟引擎组件清单与现状

| 组件（来源见 §6） | 说明 | Nova_A |
|---|---|---|
| 运行时分层（平台层 → 核心 → 资源 → 子系统 → 玩法） | GEA 的运行时架构 | 部分：Rust 核心清晰，TS 层与编辑器混合 |
| 游戏循环、固定步与插值 | Fix Your Timestep、Godot 物理插值 | 有，但双时钟、插值不可逐物体配置 |
| 场景树/对象模型、预制体 | Godot 场景与节点、Unity Prefab | 有：实体 + 组件 + 层级 + 预制体；缺场景继承 |
| 资源系统（导入、引用、缓存、卸载） | GEA 资源管理、Unity Addressables | 有 |
| 渲染管线（批处理、排序、RT、后处理、2D 光照） | Godot 2D lights | 部分：光照与后处理不在 GPU |
| 物理（broadphase、CCD、休眠、关节、查询） | Box2D v3 | 部分：SAP x 轴、子步式 CCD |
| 输入（动作映射、上下文、手柄、触摸） | Unity Input System、Godot InputMap | 有 |
| 音频（总线、效果、空间化） | Godot AudioBus | 有（未经人耳验证） |
| UI（布局容器、主题、焦点、本地化） | Godot Control | 部分：布局较薄 |
| 动画（状态机、混合、时间线、补间、骨骼） | Godot AnimationTree/Tween | 部分：缺 Tween API |
| 脚本与热重载、调试器 | GDScript、Unity C# | 有：Rhai，缺协程，调用开销高 |
| 编辑器工具（Inspector、Undo、gizmo、TileMap 编辑） | Godot 编辑器 | 有 |
| 序列化与版本迁移 | GEA 工具链 | 有：schema 5→29 迁移链 |
| 构建/导出 | Godot export templates | 部分：Player 未解耦 |
| 性能分析（CPU/GPU/帧捕获/延迟） | Unity Profiler、Frame Debugger | 部分：GPU 计时不全，没有帧捕获 |
| 自动化测试与 CI | 业界惯例 | 部分：Rust 有测试，TS 没有单元测试框架 |
| 插件生态 | Godot AssetLib | 部分：有机制，没有社区 |
| 文档与示例 | Godot 入门教程 | 部分：量大，但缺入门主线 |
| 多线程/Job 系统 | Box2D v3 多线程、GEA 并行章节 | 部分：只有资产 Worker，主线程跑模拟 |

## 6. 参考来源

- Jason Gregory, *Game Engine Architecture*（第 4 版）：https://gameenginebook.com
- Glenn Fiedler, "Fix Your Timestep!"：https://gafferongames.com/post/fix_your_timestep/
- Godot 4.3 发布说明（2D 物理插值、TileMapLayer、单线程 Web 导出）：https://godotengine.org/releases/4.3/
- Godot 物理插值介绍：https://docs.godotengine.org/en/4.4/tutorials/physics/interpolation/physics_interpolation_introduction.html
- Godot 2D 光照与阴影：https://docs.godotengine.org/en/stable/tutorials/2d/2d_lights_and_shadows.html
- Godot 设计哲学（场景/节点、内置工具）：https://docs.godotengine.org/en/4.5/getting_started/introduction/godot_design_philosophy.html
- Godot Input 类（use_accumulated_input 等输入缓冲选项）：https://docs.godotengine.org/en/4.2/classes/class_input.html
- Chrome 博客，Low-latency rendering with the desynchronized hint：https://developer.chrome.com/blog/desynchronized
- Box2D 3.0 发布（Soft Step、推测接触 + TOI、多线程、SIMD）：https://box2d.org/posts/2024/08/releasing-box2d-3.0
- Unity 事件函数执行顺序（FixedUpdate/Update）：https://docs.unity3d.com/2019.1/Documentation/Manual/ExecutionOrder.html
- Unity Addressables Profiler 模块：https://docs.unity3d.com/Packages/com.unity.addressables@2.0/manual/ProfilerModule.html
- Defold 手册（游戏对象、组件、集合）：https://defold.com/manuals/building-blocks
