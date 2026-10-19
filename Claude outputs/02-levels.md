# Nova_A 试玩关卡设计（基于 26.41 工作区）

> 目标：让新用户在启动器里一键打开就能玩，同时每个关卡都在展示、并顺带回归测试一项引擎能力。
> 范围：只读研究 `/home/claude/nova`；所有产出在 `/home/claude/plan/`。坐标约定：世界 y 向上，单位为世界单位；UI 以 1920×1080 画布中心为原点、y 向下。

**交付物**

| 文件 | 内容 |
|---|---|
| `02-levels.md` | 本文 |
| `levels/00-shared.fragment.ts` | 新关卡共享的辅助函数（补组件字段、挂脚本、HUD、标牌、输入绑定） |
| `levels/10-platformer-trilogy.fragment.ts` | L1 完整模板实现 |
| `levels/20-pendulum-post.fragment.ts` | L2 完整模板实现 |
| `levels/30-reflex-lab.fragment.ts` | L6 完整模板实现 |
| `levels/90-registration.fragment.ts` | 目录登记、工厂登记、审计契约、三语指南、i18n，以及其它需要同步改的文件清单 |
| `levels/rhai/L3-*.rhai`、`L4-*.rhai`、`L5-*.rhai` | L3–L5 的 Rhai 脚本草稿 |
| `levels/apply-to-copy.mjs`、`verify-levels.mjs`、`verify-rhai-drafts.mjs` | 把草稿注入仓库副本，然后做编译和行为验证 |

**验证结果**（在 `/tmp/levelcheck-patched` 副本里跑，原仓库没动）：
- 完整 `npx vue-tsc --noEmit` 通过（EXIT=0，耗时约 608 s）；未注入草稿的基线副本同样是 EXIT=0。
- `verify-levels.mjs` 17/17 通过：目录与发现、三语指南、`createTemplateProject` 及新增审计契约、`validateProjectDocument`、UUID 与引用完整性，以及用仓库自带 WASM 运行时真实编译和执行每个 Rhai 回调。
- `verify-rhai-drafts.mjs` 9/9 通过：L3–L5 的 10 个脚本全部编译，关键回调已执行。
- **没有做过**：带渲染和物理求解的实际游玩、导出。手感和物理参数要按每关的“验收”在编辑器里调。

---

## 1. 现有模板怎么写，新增模板要改哪些文件

### 1.1 研读结论

| 模板 | 实体与组件 | 物理与材质 | 脚本模式 | UI 与胜负 |
|---|---|---|---|---|
| mouse-knockout | `shape()` 生成运动学玩家，带 `MouseFollower2D`（maximumSpeed 40）；目标是预制体 | 重力 0，restitution .86 / friction .08 | 管理器用 `spawn_at` 生成 8 个目标，`timer_start` 每 50 ms 用 `query_group` 检查出界并 `entity_destroy` | 用 `ui_set_text_on` 改分数；胜利面板默认 `enabled=false`，满分后再启用 |
| snake | 头、8 节身体、食物都是运动学或静态传感器 | 重力 0 | 计时器驱动步进；身体之间靠 `signal_emit` 链式传位置；`on_trigger_enter` 判断自撞 | 后 5 节身体默认禁用，吃到食物逐节启用 |
| pong / breakout | 球拍运动学，用 `fixed_update` + `input_axis` 移动；球用 Continuous（CCD） | restitution 1、friction 0 | 砖块各自 `on_collision_enter` → `destroy()` + 信号；管理器负责计分 | 达到 7 分或清空 24 块砖时显示胜利面板 |
| platformer | Kinematic 刚体 + `CharacterBody2D`；带 TileMap2D、Light2D、ShadowCaster2D | — | `move_character` 移动，`can_coyote_jump()` 判断土狼时间 | — |

通用写法：
- 所有 UUID 都由 `stableUuid(seed)` 生成，重复创建项目时引用不会变。
- `project()` 统一写好构建设置（game/exe/startup）和默认输入，模板再覆盖 `projectSettings.inputMap`。
- `createTemplateProject()` 会把三语指南拼进 `Getting Started.md`，并重算哈希，然后执行 `auditTemplateProject()`。审计不通过就直接抛错。

### 1.2 新增模板的步骤

1. 在 `src/projects/templates.ts` 里改五处：
   - 把新 id 加进 `ProjectTemplateId`；
   - 在 `PROJECT_TEMPLATES` 末尾追加描述条目，并写 `localized.de/zh`。追加在末尾是为了不打乱现有目录顺序；
   - 写工厂函数，放在 `authoredAddition()` 之前；
   - 在 `TEMPLATE_FACTORIES` 里登记；
   - 在 `auditTemplateProject()` 里加这个模板的结构契约。
2. 在 `src/projects/templateGuides.ts` 里：给 `controls` 加三语操作说明，给 `guides` 加记录。缺这条记录时 `templateGuide()` 会抛错。`manualSection` 必须是 `manual/index.html` 里已有的锚点。
3. 同步以下文件：
   - `manual/index.html`：en/de/zh-CN 各加 `<section id="…-v2615-template-<id>">`；
   - `src/assets/template-previews/<id>.png`；
   - `scripts/fixtures/v26.15-template-library.json` 追加 id；
   - `scripts/verify-v26.11-templates.mjs` 里的 40 改成 43；
   - 可选：在 `src/i18n.ts` 加 `template_<id>_features`。
4. 验证：先用 `apply-to-copy.mjs` 注入副本，再跑 `vue-tsc` 和两个 verify 脚本。

具体插入文本和锚点都在 `90-registration.fragment.ts` 里。

### 1.3 研读中发现、设计时必须避开的点

- **重建代价**：`entity_set_position` / `entity_set_rotation` / `entity_set_enabled` / `component_set_enabled_on`，以及每一批 `spawn_at`，都会触发 `World.invalidateRuntime()`，也就是清空并重建整个求解器（见 `dynamicObjectsOwner.applyTargetMutation`、`flushDynamicCommands`）。脚本移动自己用的 `set_position` 是 teleport，代价低。所以本设计里移动平台和危险物都由**自身脚本**用 `set_velocity` / `set_position` 驱动，组件开关只在事件时做。另外，现有 orbit-dodge / hazard-crossing 每帧对障碍调用 `entity_set_position`，即每帧重建一次，建议另行修正。
- **Rhai 作用域**：辅助 `fn` 看不到导出状态，所以重置逻辑必须内联到回调里。`authoredAddition` 的注释已经说明这一点，L6 也用 TS 字符串插值复用了同一段重置代码。
- **关节显示**：关节只在调试叠加层里画虚线，游戏里看不见。所以 L2 的“绳子”是可见的刚体链节。
- **CharacterBody2D 行为**：角色会穿过传感器；`oneWay` 平台可用。脚本里的 `rigid_body().velocity` 对角色返回的是 `motionVelocity`。
- **上限**：`query_*` 最多返回 256 个；单次回调最多 10 万次运算、4096 条命令。
- **两个旧校验脚本在未改动的基线上也会失败**：`verify-v26.11-templates.mjs` 报 `PARTICLE_LEGACY_PORT_REQUIRED`，`verify-v26.15-library-metadata.mjs` 的版本断言写死为 26.15.0。登记新模板时需要顺带修好。
- **音频**：26.41 交接文档记录过“测试工程导出因音频获取校验失败”，原因未核实。为保险起见，草稿关卡没有挂 AudioSource。

---

## 2. 关卡总览

| # | id / 名称 | 类别 / 难度 | 主要展示的能力 | 状态 |
|---|---|---|---|---|
| L1 | platformer-trilogy 星跃三部曲 | game / 中 | CharacterBody2D、单向平台、移动平台、CameraFollow2D、Collectible2D、跨场景会话、存档 | **TS 草稿，已验证** |
| L2 | pendulum-post 钟摆邮差 | game / 中 | RevoluteJoint2D 链、关节马达、零摩擦材质、CCD、鼠标世界查询、组件开关 | **TS 草稿，已验证** |
| L3 | relic-vault 遗迹密室 | game / 中 | 俯视角、动态推箱、压力板触发器、定时陷阱、拉杆、顺序谜题、跟随光源 | Rhai 已验证 |
| L4 | lantern-night 灯塔夜航 | game / 入门 | 2D 光照与阴影、粒子、Area2D + 风场、低环境光氛围 | Rhai 已验证 |
| L5 | avalanche-bench 雪崩基准 | test / 高 | 批量预制体刚体、粒子风暴、阴影灯压力、帧预算判定 | Rhai 已验证 |
| L6 | reflex-lab 反应实验室 | test / 入门 | 反应计时、指针跟随对比、脚本帧统计、外部延迟测量标记 | **TS 草稿，已验证** |

---

## 3. L1 星跃三部曲（platformer-trilogy）

**玩法**：三个场景依次加载，Tutorial → Challenge → Collection，计全程用时和掉落次数，最好成绩会存档。
**操作**：A/D、方向键或左摇杆移动；Space/W/↑/手柄 A 跳跃，按住跳得更高；R 重开当前关。

**布局**：完整数据在 `TRILOGY_STAGES`。
- 玩家：0.9×1.6 的 Kinematic 刚体 + `CharacterBody2D`（coyote .1、floorSnap .2），tag 为 `player`。
- 相机：`CameraFollow2D`，smoothing 6，deadZone (.4, .7)。

| 场景 | 主要元素（中心 / 尺寸） |
|---|---|
| S1 教学 | 地面 A (2,-4)/(20,1)，B (24,-4)/(18,1)，C (45,-4)/(20,1)，中间两个坑宽 3 和 2；台阶 (6,-2.75)/(2,1.5)；高墙 (30,-2.3)/(1,2.4)，必须按住跳；单向平台 (20,-1.5)、(24.5,.8)；旗 (26.5,-2.5)、(37,-2.5)；尖刺 (41,-3.25)；终点 (53,-2)；7 块教学标牌 |
| S2 挑战 | 横向滑台 (8,-3.2)，行程 6、速度 2.5；竖向升降台 (24,-3)，行程 4.5、速度 2；高台 (31,1)/(6,.6)；3 块相位平台 (36.5,1.6)、(40,2.2)、(43.5,1.4)，实 1.6 s / 空 1.0 s，第二块错相 .9 s，原位留 22% 透明轮廓提示；4 根尖刺；终点 (55,1) |
| S3 收集 | 竞技场宽 31；8 块单向平台，左右交错，层高 2.2；中央升降台行程 7.5；顶部单向平台 (0,5.4)；10 枚 `Collectible2D` 金币，分组 `coin`；终点 (0,6.9)；限时 75 s |

材质：实体地面 friction .8；尖刺、旗、终点、金币都是静态传感器；尖刺是三角形旋转 π 后的朝上形状。

**脚本**：7 个资源被三个场景共用，`Script2D.properties` 为每个实例提供参数。
- `TrilogyPlayer`：
  - 竖直速度 = `rigid_body().velocity_y + gravity*dt`；
  - 跳跃缓冲 .12 s；起跳后锁 .2 s，防止土狼时间内二段跳；
  - `input_released("Jump")` 时把上升速度乘以 .45（松键截断）；
  - 低于 kill_y 时 `set_position` 回到出生点，并发出 `run.respawned`；
  - 收到 `run.hurt` / `run.checkpoint` 信号时处理受伤和换出生点。
- `TrilogyDirector`：
  - 实例属性：stage / next_scene / coin_target / time_limit / hint；
  - HUD 由 10 Hz 计时器刷新，金币数 = 目标数 − `query_group("coin")` 剩余数；
  - 到达终点时用 `session_set` 累计用时和掉落，再 `scene_load` 下一关；
  - 第三关结束时，若破纪录就 `save_set` + `save_commit("trilogy")`。
- `TrilogyMover`：Kinematic 平台用 `set_velocity` 往返移动，这样角色能继承平台速度。
- `TrilogyPhasePlatform`：用计时器切换 `component_set_enabled_on`（碰撞体和渲染器）。
- `TrilogyHazard` / `TrilogyFlag` / `TrilogyGoal`：都写在 `on_trigger_enter` 里。

**HUD**：左上标题；右上“时间 / 掉落 / 限时 / 金币”；底部提示；中央结果面板，默认隐藏。

**胜负**：S1、S2 进终点就进入下一关。S3 必须收齐 10 枚金币才能过；不足时提示后需要重新进入终点；超时判负，按 R 重来。

**展示的能力**：角色控制、单向平台、平台速度继承、相机跟随、收集组件、场景流、会话、存档、脚本资源复用。

**性能风险**：低，约 60 个实体。相位平台每 1–1.6 s 切一次组件，就重建一次求解器，属于可接受的低频操作。

**验收**：
- 每关都能从出生点到达终点；
- 高墙必须按住跳才能过；
- 站在滑台和升降台上不会滑落；
- 掉坑或碰尖刺后回到最近一面旗；
- S3 收齐金币前进终点会被拒并提示；
- 通关面板显示总用时和掉落，重开后最好成绩仍在。

## 4. L2 钟摆邮差（pendulum-post）

**玩法**：两颗球各挂在一条链子上摆动，剪断链子让球落进中央杯子；剪得越少评级越高。
**操作**：鼠标左键点链节就把那一节剪断（销毁）；1/2 键或 LB/RB 直接松开 A/B 球；R 重开。

**布局**：相机 orthographic 7，重力默认。

| 实体 | 位置 / 尺寸 | 组件与材质 |
|---|---|---|
| 锚点 A / B | (-7,6.2) / (6.5,6.2)，圆 .5 | 静态 |
| 链节 A1–A5 / B1–B7 | 每节 .2×.7，竖直相接 | Dynamic，density .8，`RevoluteJoint2D` 连上一节，锚点在上下端 |
| 球 A / 球 B | 圆 .9，挂在链尾 | density 2，restitution .45，**CCD**；初速度 +5.5 / −5 |
| 风车 | 轮毂 (0,1) 静态；转子 4.4×.28 | `RevoluteJoint2D` 马达，速度 1.2，最大力 6000；gravityScale 0 |
| 冰坡 | (-7.7,-1.9)、(7.7,-1.9)，9.8×.35，旋转 ∓.351 | **friction 0**，末端距杯沿留约 0.9 的缺口 |
| 杯子 | 底 (0,-6.15)/(3.9,.3)，杯壁 ±1.95、高 1.8 | 静态；`Cup Goal` 是传感器 |
| 坑底 | (0,-6.75)/(25,.5) | 碰撞后判负 |

**脚本**：
- `PendulumDirector`：
  - 剪链：`query_radius(mouse_world_x/y, .6)`，按名称前缀 `Link ` 选中链节，`entity_destroy`；
  - 松球：`component_set_enabled_on(球,"RevoluteJoint2D",false)`；
  - 记录剪断次数，判定胜负，用 `save_commit` 存档。
- `PendulumCup`（`on_trigger_enter`）和 `PendulumFloor`（`on_collision_enter`）：只认这两颗球。

**估算**：A 球在最低点向右剪断后，飞行轨迹会越过风车扫过的区域，约 1.3 s 落进杯中；B 球对称。剪早或剪晚会落到冰坡上，大概率滑进杯子，也可能掉进缺口。

**HUD**：右上“A/B 状态、剪断次数、用时”；底部操作提示；结果面板。

**胜负**：两球都进杯即胜，评级规则为 ≤2 次三星、≤4 次两星；任一球碰到坑底即失败。

**展示的能力**：铰链链条、关节马达、零摩擦材质、CCD、传感器、鼠标世界坐标查询、运行时组件开关和销毁。

**性能风险**：约 20 个刚体，开销低。每次剪断会重建一次求解器。默认关节 stiffness 1200 时链条可能被拉长，需要观察。

**验收**：
- 开局两条链稳定摆动，不断、不爆；
- 风车匀速转动；
- 点中链节必定剪断，点中球不计数；
- 至少存在一个“两次剪断就过关”的时机，且可复现；
- 球碰到坑底立即出现失败面板。
- 若链条明显拉长，先调 stiffness/damping 或减少链节数。

## 5. L3 遗迹密室（relic-vault）

**玩法**：俯视角三间房。A 房把箱子推上压力板打开门 A；B 房穿过定时陷阱、拉下拉杆打开门 B；C 房按壁画顺序 III→I→II 踩符文，祭坛升起圣物，拿到即胜利。
**操作**：WASD 或左摇杆移动；E 互动；R 重开。

**布局**：重力 0；`projectSettings.rendering.lightingEnabled=true`，ambientIntensity .35。

| 实体 | 位置 / 尺寸 | 组件 |
|---|---|---|
| 外墙 | 上下 (2,±6.5)/(37,1)，左右 (-16.5,0)、(20.5,0)/(1,14) | 静态 |
| 隔墙 | x=-4 和 x=8，各两段 (1,5.5)，上下各留一段，中间留宽 2 的门洞 | 静态 |
| 门 A / 门 B | (-4,0)、(8,0)，尺寸 (1,2) | 静态，由脚本开关 |
| Player | (-13,-3)，圆 .8 | Dynamic，freezeRotation；Light2D（range 4.5，带阴影）；`CameraFollow2D` 跟随它 |
| Crate 1 | (-10,0)，1.2 方块 | Dynamic，density 2，linearDamping 4，ShadowCaster2D |
| Plate A | (-7,-4)，1.6 方块 | 静态传感器，`PressurePlate`（door 属性 = "Door A"） |
| Trap 1–6 | x ∈ {0,2,4} × y ∈ {1.2,-1.2}，尺寸 1.8×2.2 | 静态传感器，`TrapTile`，offset 0 和 .6 交替 |
| Lever B | (6,4.5)，.6×1 | 静态 |
| 火把 ×2 | (-2,5.2)、(6,-5.2) | Light2D（暖色 range 5）+ ParticleEmitter2D（additive） |
| Rune 1/2/3 | (11,3.5)、(14,-3.5)、(17,3.5)，1.6 方块 | 静态传感器，`RunePlate`（rune = 1/2/3） |
| Altar / Relic | (14,0) 1.5 方块 / (14,1.6) 圆 .7 | Relic 是传感器，初始禁用 |

**脚本**（`rhai/L3-*.rhai`）：
- `VaultPlayer`：`input_vector` 读输入，`set_velocity` 移动，所以能物理推动箱子；E 键在 1.4 范围内 `query_radius` 找拉杆。
- `PressurePlate`：用 enter/exit 计数，板上有物体就开门、没有就关门。
- `TrapTile`：陷阱激活时若玩家正站在上面，立刻判伤。
- `VaultDirector`：用 `order.sub_string()` 校验符文顺序，踩错就清零；管理检查点、HUD 和存档。

**展示的能力**：俯视角动态推箱、触发器进出、计时器、组件和实体开关、跟随光源与阴影、粒子火把。

**性能风险**：中低。光源 3 个、阴影投射体 2 个。门开关会触发重建，频率很低。

**验收**：
- 箱子能稳定压在板上，门保持开启；箱子推走后门关上（门洞里有人时会被挤出，需要实测）；
- 陷阱踩中后回到检查点；
- 符文踩错会清零；
- 圣物出现后拾取即胜利。

## 6. L4 灯塔夜航（lantern-night）

**玩法**：夜色中开一艘带灯笼的小船，靠近四座灯标各停留 1.5 s 点亮它们，四座全亮后灯塔光束亮起。这一关不会失败，以计时为成绩。
**操作**：WASD 或左摇杆推进；T 开关雨；R 重开。

**布局**：重力 0；lightingEnabled，ambientIntensity .08；相机 orthographic 8，跟随船。

| 实体 | 位置 / 尺寸 | 组件 |
|---|---|---|
| 水面背景 | (0,0)/(60,36) | 仅形状，orderInLayer -20 |
| 海岸边界 | 四边，(60,1) / (1,34) | 静态 |
| Boat | (-24,-12)，圆 1 | Dynamic，linearDamping 1.5；Light2D 点光（range 6，暖色，softness .6） |
| 礁石 ×8 | 如 (-16,-6)/(3,2.4)、(0,-8)/(3,3)、(12,-3)/(3,2) 等 | 静态 + ShadowCaster2D |
| 洋流 1 / 2 | (-4,-12)/(12,4)；(14,2)/(4,14) | Area2D + AreaEffector2D（Wind，方向 (1,0) / (0,-1)，强度 3 / 4），配稀疏流线粒子 |
| Beacon 1–4 | (-18,12)、(2,12)、(24,4)、(10,-13)，圆 1.2 | 静态；Light2D 和火焰粒子**初始禁用**；`Beacon`（label 指向自己的标签实体） |
| Beacon N Label | 各灯标上方 1.4 | TextRenderer2D，显示充能百分比 |
| Lighthouse | (26,14)，1.5×3 | Light2D Spot（range 30），开场禁用 |
| Rain 1–3 | x = -20/0/20，y = 18 | ParticleEmitter2D，Box 发射，速度约 (-1,-9)，每个 600 粒子 |

**脚本**（`rhai/L4-*.rhai`）：
- `Boat`：速度未超上限时 `apply_force` 推进；船头朝向用 `atan(y,x)` 算，再 `set_rotation`。
- `Beacon`：每个定步用 `query_radius` 检测船，在范围内就充能，离开则缓慢回落；充满后开启自身的 Light2D 和粒子。
- `NightDirector`：计数灯标、点亮灯塔、切换雨、存档。

**展示的能力**：多光源、阴影、粒子分层、风场推力、低环境光构图、按需开启组件。

**性能风险**：中。总共 6 个光源、8 个阴影投射体，粒子约 1800。26.41 已修好“每条阴影边单独模糊”的问题，这一关正好可以作为回归场景。

**验收**：
- 洋流把船推偏的效果肉眼可见；
- 灯标充能百分比随停留时间上升，离开后回落；
- 四座都亮后灯塔亮起并出现结果面板；
- T 键关雨后粒子消失。
- 在目标设备上记录 Profiler 中的帧时间，不要估算数值。

## 7. L5 雪崩基准（avalanche-bench）

**玩法**：漏斗分批倾倒刚体，直到平均帧时间超出预算，记录维持住的刚体数量。
**操作**：Space 暂停或继续投放；P 开关粒子风暴；L 开关 4 盏阴影灯；R 重开。

**布局**：重力默认；相机 orthographic 10。

| 实体 | 位置 / 尺寸 | 组件 |
|---|---|---|
| 漏斗左 / 右 | (∓5.25,5)，9.6×.5，旋转 ∓.675，颈口宽 3 | 静态 |
| 钉阵 15 个 | x 从 -6 到 6、步长 3，y = -1 / -3 交错，圆 .5 | 静态 + ShadowCaster2D |
| 料仓 | 底 (0,-9.5)/(30,1)，壁 (±15,-5)/(1,9) | 静态 |
| 预制体 Bench Ball / Bench Crate | 圆 .5 / 方块 .6 | Dynamic，**不挂脚本**，允许休眠 |
| Storm 1–4 | 顶部 | ParticleEmitter2D，emissionRate 400，maxParticles 2000，初始禁用 |
| Bench Light 1–4 | 四角 | Light2D，带阴影，初始禁用 |

**脚本**：`rhai/L5-AvalancheDirector.rhai`。
- 默认每 1 s 投放一波 40 个，cap 800，均可调；预制体引用由工厂函数替换为实际的 `asset://` 地址；
- 每 0.5 s 用 `update(dt)` 统计一次平均和最差帧时间；
- 平均值连续 2 s 超过 `budget_ms`（33.3）就停止投放，并把维持住的刚体数写入存档；
- 已验证：一次回调生成 200 个也不会超出运算预算。

**展示的能力**：批量生成、休眠、接触堆叠、粒子和阴影的压力。

**性能风险**：这一关的目的就是施压。需要注意：
- 每一波生成都会重建一次求解器，帧时间曲线会出现与波次同步的尖峰，分析时应把它作为“生成代价”单独看待；
- HUD 里的帧时间来自脚本侧 `dt`，不是 GPU 或呈现时间，正式数据以 Profiler 和 latency probe 为准。

**验收**：
- 数量单调增加，到上限或超预算后停止；
- 刚体不穿透料仓；
- 开关粒子和灯后 HUD 状态同步；
- 重开后存档里的“维持刚体数”还在。
- 报告时写明设备、分辨率、后端和刷新率。

## 8. L6 反应实验室（reflex-lab）

**玩法**：
- **Reflex Test 场景**：按 React（Space、Enter、左键或手柄 A）开始一轮，随机等待 1.2–3.5 s 后绿灯亮起，看到就按。共 5 轮有效，统计平均、最佳、最差和抢跑次数，最好的平均值存档。
- 同一画面里有两个指针跟随体做对比：蓝色圆用 `MouseFollower2D`（maximumSpeed 0，原生定步驱动），橙色环用 Rhai 在 `update` 里 `set_position(mouse_world_x/y)`。
- 右上角显示脚本侧的 update 间隔：平均、最差、每秒次数。
- **Latency Marker 场景**（按 M 切换）：白块和 `scripts/latency/make_test_project.py` 注入的 LatencyMarker 使用相同脚本，按住 Space 时出现在 (0,3)，外部的 SendInput 加屏幕采样工具可以直接测它。

**布局**：Wait Lamp 在 (0,1.2)，大小 7×3.4，灰色；Go Lamp 尺寸相同、绿色，平时停在 (0,40)，亮灯时自己 teleport 到 (0,1.2)。两个指针体初始在 (∓6,-3.6)。标记场景只有白块 (0,3)/(3,3)、一个管理脚本和提示文字。

**测量口径**：计时从“把灯移入画面的那一帧”算到“检测到按键的那一帧”，所以结果包含输入和显示延迟，并按帧间隔量化。HUD 和教程里都写明了这只是游戏侧观测值，不能代替外部测量。

**性能风险**：极低。

**验收**：
- 抢跑会被判定，该轮重来；
- 5 轮结束后显示汇总，存档里的纪录保留；
- 在高刷新率屏幕上能看出两个跟随体的跟手差异；
- 在 Marker 场景按住 Space 时白块立即出现、松开即消失，外部工具可以采样到。
- 后续建议：让 latency harness 直接从这个模板生成测试工程。

---

## 9. 落地顺序与剩余风险

1. **先合 L6 和 L1**。L6 改动最小，能直接服务当前的低延迟主线；L1 最贴近新用户。
2. **L2 需要先在编辑器里调物理**，至少确认链条刚度和“最优剪断时机”这两项。
3. **L3–L5 按本文表格和 `rhai/` 脚本，套用 `00-shared` 的辅助函数实现工厂**。审计契约可以照抄 `90-registration` 的写法。
4. **仍需人工完成的**：
   - 三张预览 PNG；
   - `manual/index.html` 中 9 个新章节；
   - 修复两个旧校验脚本；
   - 实际游玩和导出（Web 和 Windows）。

以上各项都**没有实测**，结论只来自源码和 WASM 脚本执行。
