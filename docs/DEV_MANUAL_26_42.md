# Nova_A 26.42 开发手册

- 版本：产品 26.42（机器版本 26.42.0）；基线为 26.41 工作区（未提交，基于 `ec6a626`）。项目格式 2 / schema 29，本轮原则上不变。
- 读者：接下来按本手册直接动手开发的工程师。
- 依据：`plan/01-engineering-review.md`（下称【评估】）、`plan/02-levels.md` 与 `plan/levels/`（【关卡】）、`plan/03-gui-design.md` 与 `plan/gui/`（【GUI】）、`docs/latency-results.md`（【实测】），以及 `AGENTS.md`、`docs/RELEASE_NOTES_26_41.md`、`docs/EDIT_LEDGER_26_41.md`。
- 标注：**[实测]** 指【实测】中的数字；**[代码]** 指已在源码中核对过的事实；**[推测]** 指报告中的推断；**待测** 指本轮必须测量、目前没有数据的项；**目标** 指本手册设定的验收门槛，不是测量结果。
- 编写说明：上一轮 Prompt `Nova_A_Apple_UI_LowLatency_NoCommit_Prompt.md` 不在仓库副本中，本手册的流程约束一律以 `AGENTS.md` 为准。

---

## 0. 一页摘要

26.42 有三条主线：**光照进 WebGL2**、**Player 解耦并补测导出延迟**、**编辑器 GUI P0**。另有三组快赢：Play 时关闭视口玻璃模糊并跳过空叠加层、新模板默认 120 Hz、合入 3 个已验证的试玩模板。整轮由测量驱动：先补测物理驱动角色的插值延迟，再决定是否改默认插值。

**本轮必做**（详见各 WP，标记为【必做】）：

| # | 项 | WP |
|---|---|---|
| 1 | 版本号、AGENTS.md、构建/打包脚本切到 26.42 | WP-0 |
| 2 | Play 时关闭视口玻璃模糊，叠加层无内容时跳过 | WP-P / P-A |
| 3 | 新模板默认 120 Hz，最小子步数 8→4 | WP-P / P-B |
| 4 | 补测物理角色的 Interpolate/None 差值，达到阈值再做逐物体插值模式 | WP-P / P-C |
| 5 | 2D 光照迁入 WebGL2，Canvas2D 只保留为显式回退 | WP-P / P-D |
| 6 | 修复导出阻断并实测导出 Player；做无 Vue 的 Player 宿主 | WP-P / P-E |
| 7 | 合入 platformer-trilogy、pendulum-post、reflex-lab，修好两个原本失败的校验脚本 | WP-L |
| 8 | GUI P0：token 合并、双层材质、Play 降级、接通降低透明度设置、inset 分组卡片、基础控件 | WP-G / G0 |
| 9 | 快速入门文档；把时钟、事件派发时机和脚本写入延迟写进文档并补测试 | WP-S |
| 10 | 扩展延迟 harness，新增 verify-2642-*，跑完所有门禁 | WP-M |
| 11 | 产出 releases/v26.42 十一文件发布集和证据包 | §5 |

---

## 1. 版本目标与范围

### 1.1 目标

1. **延迟与画质**：在 26.41 的同一测量条件下，把带光照场景的“提交 → 桌面截图”延迟压到接近无光照水平，同时得到正确的乘性光照（【评估】§0-3、§2.2 #1）。
2. **测量补全**：26.41 只测了无刚体的 marker 和编辑器内 Play。本轮补测物理驱动角色和导出 Player（【评估】§0-4，【实测】Not measured 一节）。
3. **新手可玩**：启动器里新增 3 个开箱即玩的模板，并配一篇 30 分钟快速入门（【关卡】§2，【评估】§4）。
4. **编辑器观感**：按【GUI】P0 落地 iOS 风格的双层材质与基础控件，同时保证玻璃效果不吃掉 Play 时的帧预算（【GUI】§3.4）。

### 1.2 不做（明确排除）

- Engine Worker + OffscreenCanvas（【评估】§2.2 #11 已注明不放进 26.42）。
- 用推测接触 + TOI 重写 CCD，以及调整 `POSITION_SLOP`/休眠阈值等求解器参数。本轮只测量（见 WP-S）。
- Rhai 的属性访问语法、`tween()`、协程或 `after()` 语法糖（【评估】§4 建议，留到后续）。
- 关卡 L3–L5 的模板工厂（Rhai 草稿已验证，作为 26.43 候选）。
- GUI P2：ProjectManager、SettingsPanel、Sheet 化、真实透镜折射、背景延伸快照、运动模糊过渡。
- 把 docs/ 下的台账整体搬到 docs/history/：打包脚本等按路径引用 `docs/RELEASE_NOTES_*`，搬迁风险大于收益，本轮不动。
- 新平台、新渲染后端、新脚本语言、全面升级依赖。

### 1.3 必须保留的架构边界（摘自 AGENTS.md §3、§4）

- 保留自研 WebGL2 渲染器作为生产基线。Canvas2D 只能作**显式**回退，不能冒充正常的高性能路径。这一条直接约束 P-D。
- Runtime、Renderer、Player 不得导入 Editor、Vue、Pinia 或编辑器 store。现状是 54 个文件违反这一条，其中 39 个直接导入 vue [代码]。P-E 的目标是让 Player 的依赖图率先变干净，其余违规本轮不做全面清理。
- 一个世界一个时钟；游戏速度不随显示帧率改变；运行时热数据不进入 Vue 深层响应式（26.41 的 `withPlainAccess` 必须保留）。
- 编辑器效果不得污染游戏渲染链。【GUI】的所有改动不触碰 `WorldCanvas` 的渲染路径、Player 和 Runtime（【GUI】§4 P2 末尾）。
- 只报告实测指标。没有测量条件就写“未测”，不填零，也不编造提升比例。

### 1.4 Git 规则（沿用 AGENTS.md §8）

**本轮不做任何 Git 写操作**：不 commit、不 `git add`、不 tag、不 push，也不 stash、reset、clean、restore 或切换分支。子代理、构建钩子和发布脚本同样不得间接提交。只读命令（`git status`、`git diff`、`git log`、`git ls-files`、`git ls-tree`、`git rev-parse`）可以用。源码包按工作区打包，不用 `git archive HEAD`。

### 1.5 素材与许可

- 不打包任何 Apple 专有素材：不带 SF Pro/SF Mono 字体，不带 SF Symbols，不用 Apple 图标或截图。`tokens-ios.css` 的字体栈只**引用**系统字体名，`-apple-system`/`BlinkMacSystemFont` 在 Windows 上落到 Segoe UI Variable，可移植的回退仍是已随包分发、OFL 许可的 Nunito Sans 和 Noto Sans SC（【GUI】§3.2）。
- 图标继续用仓库自绘的 SVG。HIG 只作为设计参考，链接写在文档里，不复制其中的图片。
- 发布前检查：Web 包的 `FONT_LICENSES/` 不新增条目，`dist/` 里没有 `SF-*`、`.sfsymbols` 之类的文件（见 §5）。

---

## 2. 现状基线（26.41）

### 2.1 实测数字（【实测】，单机：Windows 11 / Ryzen 9 8945HX / RTX 5060 Laptop / 2560×1600 @240 Hz / WebView2 143 / WebGL2 / 编辑器最大化 / 主线程模拟 + 渲染）

场景为 `LatencyTest.nova`：Platformer 模板，带 2D 点光与软阴影，外加一块白色 marker，固定步 60 Hz。表中每格为 P50（括号内为 P95），单位 ms，n=100。

| 阶段（按键按下边沿） | 26.40 bprobe | 26.41 rel | new-nolight（诊断） | new-240hz（诊断） |
|---|---|---|---|---|
| SendInput → handler | 6.9 (15.0) | 5.6 (8.5) | 5.1 | 5.4 |
| OS 时间戳 → handler | 4.2 | 2.4 (4.9) | 1.9 | 3.3 |
| handler → 固定步消费 | 4.5 | 5.6 (11.7) | 6.0 | 0.5 |
| 消费 → WebGL2 提交 | 10.6 | 3.6 (6.1) | 3.4 | 4.2 |
| handler → 提交（inputToSubmit） | 14.9 | 9.8 (16.4) | 9.5 | 4.7 |
| 提交 → 桌面截图 | 17.7 | 6.7 (9.2) | 2.6 | 7.7 |
| **端到端 SendInput → 截图** | 41.4 | **23.1 (31.0)** | 18.5 | 18.6 |

| 帧统计（Play，60 s） | 26.41 rel | new-nolight |
|---|---|---|
| 每秒提交数 | 233.4 | 239.1 |
| 被 fence credit 推迟 | 207 (1 %) | 12 (0 %) |
| CPU 帧开始 → 提交（均值 / P50） | 2.3 / 1.9 | 2.2 / 1.8 |
| Runtime 帧（模拟）（均值 / P50） | 1.2 / 0.7 | 1.2 / 0.7 |
| GPU 计时（只含 world pass），P50 | 0.006 | 0.007 |
| 提交间隔 > 8.3 / 16.7 / 33.3 ms 的次数 | 197 / 1 / 0 | 51 / 4 / 0 |

编辑器拖拽的端到端 P50 为 15.1 ms（P95 18.7）。

**读法**
- 光照叠加层仍占显示侧约 4 ms：6.7 − 2.6，这是 P-D 的收益上限 [实测]。
- 60 Hz 固定步平均要等半步，约 5.6 ms；改成 240 Hz 后降到 0.5 ms，端到端为 18.6 ms [实测]。120 Hz 没有测过，属于**待测**。
- GPU 计时只覆盖 world pass，Canvas2D 光照不在里面 [实测]。

### 2.2 未测量（26.41 原样保留，本轮至少补前三项）

1. 物理驱动角色：测试 marker 没有 RigidBody（`scripts/latency/make_test_project.py` 只保留了 Transform2D 和 ShapeRenderer2D）[代码]，所以没有经过插值。真实角色走全局 `Interpolate`（`World.ts` 的 `readRuntimeState`）。【评估】推测 60 Hz 下平均多出约 8 ms，**待测**。
2. 导出 Player：生成的测试工程在 Windows 导出时，被“音频资源在 Play 期间无法获取”的校验错误阻断，原因未查。
3. 120 Hz 固定步的延迟与物理 CPU 开销。
4. PresentMon（需要提权）、光子延迟（需要光电二极管或高速相机）、其他机器和刷新率、Linux、Web 构建。本轮如果仍没有条件，照实写“未测”。

### 2.3 代码与测试基线

- Rust：`cargo test --workspace` 共 198 个测试通过；`cargo clippy -D warnings` 通过；遗留告警是 `src-tauri/src/runtime_pak_preflight.rs` 中未使用的 `declared_decoded_bytes`。
- 浏览器回归：`verify-2640-editor-workflow` 7/7，`verify-2641-editor-ui` 6/6。另有 4 个旧引擎校验脚本在 26.40 上就已失败，属于既有问题。
- 模板：目录共 40 项。`verify-v26.11-templates.mjs` 在未改动的基线上报 `PARTICLE_LEGACY_PORT_REQUIRED`；`verify-v26.15-library-metadata.mjs` 把版本断言写死为 26.15.0，同样失败（【关卡】§1.3）。
- GUI：编辑态有 9 个元素的计算样式 `backdropFilter≠none`；视口上的 3 个 `.nv-glass` 在 Play 时仍然实时模糊（【GUI】§2 #10）。`data-reduce-transparency` 只有 `WorldCanvas.vue` 在读、`tokens.css:374` 有对应规则，`preferences.ts` 从不写它 [代码]。
- 在容器里完整跑一次 `vue-tsc --noEmit` 约需 608 s（【关卡】），排期时要算进去。

---

## 3. 工作包

工作量按单人人日估算，属于规划值，不是测量结果。

### WP-0 版本与工程规则【必做】

- **改动**：
  - 版本改为 26.42.0，涉及 26.41 台账中列出的同一组文件：`package.json`、`Cargo.toml`/`Cargo.lock`、`src-tauri/Cargo.toml`/`Cargo.lock`、`src-tauri/tauri.conf.json`、`crates/nova_format/src/lib.rs`、`src/projects/projectFormat.ts`、`tests/fixtures/migrations/public-schema-expected.json`。schema 保持 29。
  - `AGENTS.md`：§1 改为“当前 26.41，本轮交付 26.42，主任务见 docs/DEV_MANUAL_26_42.md”；§8 的发布目录目前误写为 `v26.40`，统一改成 `v26.42`；保留“无 Git 写操作”一节。
  - 复制 `scripts/build-release-26.41.cmd`、`package-release-26.41.cmd`/`.ps1`，得到 26.42 版本，只改标签。
  - 新建空骨架 `docs/RELEASE_NOTES_26_42.md`、`docs/EDIT_LEDGER_26_42.md`、`docs/WEB_HOSTING_26_42.md`，改一处记一处。
- **验收**：`pnpm check` 通过；`node -e` 读出 `package.json` 的版本为 26.42.0；启动器显示 26.42。
- **工作量**：0.5 天。**依赖**：无，最先做。

---

### WP-P 性能与延迟

【评估】§2.3 给出适合 26.42 的 5 项。下面按“收益 / 风险”排序。排序理由：P-A 和 P-B 改动小、可单独回退；P-D 的收益有实测上限支撑；P-C 的收益只是推测，必须先测；P-E 改动面最大。

| 序 | 项 | 收益依据 | 风险 | 本轮 |
|---|---|---|---|---|
| P-A | Play 时关闭视口玻璃模糊，跳过空叠加层 | 合成侧 0.5–2 ms [推测] | 低 | 必做 |
| P-B | 新模板 120 Hz，子步 8→4 | handler→消费约减半，−2.5~3 ms [推测]；240 Hz 实测端到端 18.6 ms | 低-中 | 必做 |
| P-D | 光照迁入 WebGL2（含后处理 shader） | 提交→截图最多 −4 ms [实测上限] | 中 | 必做（主线） |
| P-C | 补测后加逐物体插值模式 | 60 Hz 下约 −8 ms [推测] | 中 | 测量必做，实现视阈值而定 |
| P-E | Player 解耦，实测导出延迟 | 待测 | 高 | 必做（主线，带回退开关） |
| P-F | 物理同步改脏标记 | 大场景 CPU 明显下降；本场景 1.2 ms 的帧里收益小 | 中 | 可延后 |
| P-G | Rhai Engine 复用、命令改类型化缓冲 | 多脚本场景 CPU 下降，倍数待 profile | 中 | 可延后 |

#### P-A Play 时去玻璃、跳过空叠加层【必做】

- **目标**：Play 和暂停期间画布上不再有任何实时 backdrop-filter；没有光照、后处理和编辑器叠加内容时，不再每帧整屏清空和重绘叠加 canvas（【评估】§2.2 #4，【GUI】§3.4 第 3 条）。
- **改动**：
  - `src/layout/EditorLayout.vue`：在 `.editor-root` 上绑定 `:data-play-mode="physicsState.playMode"`（取值为 `editing`/`playing`/`paused`，已有状态 [代码]）。
  - `src/ui/tokens.css`：加规则 `.editor-root[data-play-mode='playing'|'paused'] { --glass-filter: none }`，只保留着色。【GUI】的 token 草稿第 538–541 行已经写好，随 G0 一起合入。这一项由 G0 负责实现，P-A 负责测量。
  - `src/components/WorldCanvas.vue` 的叠加层绘制函数（约 1395–1415 行，`ctx.clearRect` 加 `renderLighting2D` 加 `renderPostProcessOverlay`）：
    - 预先判断本帧是否有可见光源、后处理开启或编辑器叠加内容（网格、选框、gizmo、调试视图）；
    - 都没有时，只在上一帧画过东西的情况下清一次，之后直接跳过，并把 Lighting/PostProcess pass 记为 skipped；
    - DPR 或尺寸变化时强制清一次，保留现有防残影的注释和语义。
- **实现要点**：判断条件要放在 `clearRect` 之前。“上一帧是否画过”用一个布尔值记，不要逐像素检查。P-D 完成后，光照不再画在这个 canvas 上，跳过的命中率会更高。
- **风险与回退**：跳过判断漏掉某类叠加内容时会留下残影或丢失 gizmo。回退开关为 `?overlaySkip=0` 或开发设置，恢复每帧清空。
- **验收**：
  - `verify-2642-glass-budget`（见 WP-M）：Play 中计算样式 `backdropFilter≠none` 的元素数为 0；
  - 无光场景 Play 60 s，叠加层清空次数不超过 2 次（DPR 或尺寸变化时除外），由 probe 计数；
  - 用 harness 的 frames 模式对比“玻璃开 / 关”：开时每秒提交数下降不超过 2 %（≥228/s），帧时间 P95 增加不超过 0.3 ms（【GUI】§3.4 第 7 条，**目标**）；
  - key 模式端到端 P50 不高于 26.41 的 23.1 ms 加时钟映射误差。
- **零代码预测**：开工前可以先在 DevTools 里执行 `document.documentElement.dataset.reduceTransparency='true'`，触发 `tokens.css:374` 的规则做 A/B。【评估】说的“打开已有设置”其实没有 UI 开关，就用这个办法代替。
- **工作量**：1–1.5 天。**依赖**：G0 的 token（可以先单独合入那一条规则）。

#### P-B 新模板默认 120 Hz【必做】

- **目标**：缩短等待固定步的相位时间；每秒子步总数不变（60×8 = 120×4 = 480）（【评估】§2.2 #2）。
- **改动**：
  - `src/projects/templates.ts` 的 `project()` 默认 `globalSettings.tickRate: 60`（第 203 行 [代码]）：新建项目改为 120；
  - 同时给模板写入 `minimumSubsteps: 4`，可以新增一个 profile，也可以在模板里覆盖 Balanced（`src/runtime/physicsProduction.ts:190`，Balanced 为 tickRate 60 / minimumSubsteps 8 [代码]）；
  - 项目设置的 tick 字段旁加一行说明，讲清 tick 与延迟的关系（中/英/德三语进 `src/i18n.ts`）。
- **实现要点**：
  - 已有项目不改，打开 26.41 的工程后 tick 仍为 60。
  - 逐个检查模板脚本中按“tick 计数”而不是按 `dt` 写的逻辑，`fixed_update` 里的常量尤其要看。频率翻倍后，这类逻辑会快一倍。
  - 3 个新模板（WP-L）也要按 120 Hz 复查手感。
- **风险与回退**：手感变化；确定性回放的基准文件需要按模板重新生成。回退方法：把模板默认值改回 60，只此一处。
- **验收**：
  - harness 在 Platformer 场景下跑 60/120/240 三档的 key 模式，报告 handler→消费和端到端的 P50/P95。120 Hz 的数值**待测**，验收条件是“120 Hz 的 handler→消费 P50 低于同机 60 Hz 实测值”；
  - frames 模式下 Runtime 帧均值的增幅不超过 0.5 ms（**目标**，基线 1.2 ms）；
  - `cargo test` 中子步相关测试通过；
  - 所有模板 `createTemplateProject` 后审计无失败（`verify-v26.11-templates` 和 `verify-2642-levels`）。
- **工作量**：1 天。**依赖**：WP-M 的 M-1。

#### P-C 物理角色的插值策略【测量必做，实现按阈值决定】

- **目标**：先量清楚插值给物理驱动的角色增加了多少显示延迟，再决定是否给角色关掉插值（【评估】§0-4、§2.2 #3）。
- **第一步：测量（零代码）**。全局 `interpolation: 'Interpolate' | 'None'` 已经存在（`physicsProduction.ts:5` [代码]），所以 A/B 只需改项目设置。用 M-1 新增的 CharacterBody marker 跑 4 组：60 Hz 和 120 Hz 各配 Interpolate/None。
- **决策规则**：60 Hz 下 Interpolate 与 None 的端到端 P50 差值 ≥3 ms 时（大于约 1–2 ms 的时钟映射误差），实施第二步；否则只在文档里写明结果，第二步延后。
- **第二步：逐物体插值模式**。
  - `RigidBody2D` 新增 `interpolation: 'Inherit' | 'Interpolate' | 'None'`，缺省为 `Inherit`；
  - 在 `src/world/World.ts` 的 `readRuntimeState`（约 962 行的 `settings.interpolation === 'Interpolate'` 分支）里改为按实体解析有效模式；
  - 组件 schema 和 Inspector 加字段；
  - 玩家用的 CharacterBody 模板（Platformer、platformer-trilogy）默认设为 `None`。
  - 外推模式（Extrapolate）本轮不做。
- **实现要点**：缺省值兼容读取，不升 schema。如果序列化校验要求必须迁移，就走 `nova_format` 迁移链，并在发布说明里写明。关掉插值后，低 tick 下会有抖动，所以要和 P-B 的 120 Hz 一起评估。
- **风险与回退**：模板角色出现抖动；回退方法是把模板改回 `Inherit`。
- **验收**：
  - 4 组数据写进 `docs/latency-results.md` 的 26.42 版；
  - 若实施了第二步：同场景下 None 的端到端 P50 低于 Interpolate；在 120 Hz 下目视无明显抖动，并录屏放进证据包；
  - 回放校验和测试通过（插值只影响显示，不影响模拟状态）。
- **工作量**：测量 0.5 天，实现 2–3 天。**依赖**：M-1。

#### P-D 2D 光照迁入 WebGL2【必做，主线】

- **目标**：去掉 Canvas2D 光照叠加层带来的约 4 ms 显示侧延迟，同时把“挖亮暗幕”的近似改为正确的乘性光照，让 GPU 计时覆盖光照（【评估】§0-3、§1 光照行 P0、§2.2 #1 和 #8）。
- **现状** [代码]：
  - `src/renderer/lighting2d.ts`：`renderLighting2D` → `punchLight`（destination-out 挖亮）、`drawShadows`（每个投射体一条路径，Soft/Ultra 档位用 `context.filter = blur(4|8px)`）、`drawNormalMappedLight`（CPU 端 `getImageData` 计算法线响应，结果有缓存）；
  - 后处理分两处：`renderPostProcessOverlay` 画暗角，`worldPostProcessFilter` 生成 CSS filter 字符串，挂在 `WorldCanvas.vue` 的 `.render-canvas` 上（约 1734 行），bloom 用 `drop-shadow` 冒充。
- **改动**：
  1. 新建 `src/renderer/lighting2dGpu.ts`，由 `WebGL2Renderer.ts` 持有，遵守“一个图形上下文一个 Owner”：
     - 半分辨率光照 RT（优先 R11G11B10F，不支持时用 RGBA8），每帧先清为环境光颜色乘强度；
     - 每盏灯画一个 additive 四边形，片元里按 range、softness 计算衰减，Spot 光再乘锥角；
     - 阴影：CPU 端把投射体边界（复用 `entityBoundaryPoints`）挤出成远离光源的四边形，写入 stencil，再用 stencil 测试画灯；软阴影先做半分辨率下的一次可分离模糊，或用 PCF 风格多采样，二选一，按画质档位决定；
     - 最后把光照 RT 以 multiply 方式合成到场景颜色上；
     - 法线贴图迁到 shader，替换 `normalResponse` 的 CPU 路径。
  2. `src/renderer/sceneRenderer.ts` 和 `WebGL2Renderer.ts`：在 world pass 之后、post 之前插入 Lighting pass；`EXT_disjoint_timer_query_webgl2` 的计时范围扩展到 Lighting 和 Post。
  3. 后处理（【评估】#8，同批完成）：exposure/contrast/saturation/blur/bloom 改到渲染器已有的 post 材质通道（`WebGL2Renderer.ts` 约 607 行）；`WorldCanvas.vue` 移除 `:style="{ filter: worldPostProcessFilter(...) }"`。
  4. `WorldCanvas.vue` 约 1410 行：WebGL2 光照可用时不再调用 `renderLighting2D`。
  5. 回退：WebGL2 光照初始化失败（缺扩展、shader 编译失败、设备丢失后重建失败）时，显式切回 Canvas2D 路径，在 Profiler 和渲染诊断里标出“Lighting: Canvas2D fallback”，并在日志里提示一次。
- **实现要点**：
  - 遵守 AGENTS §4：透明顺序和颜色正确优先；不同步读回；resize 和设备丢失时重建光照 RT。
  - Editor 场景视图中，`activeLayer`、`editorVisible` 的过滤语义与现有 `compatibleTargets`、`drawShadows` 保持一致。
  - 画面会与 26.41 不同（乘性光照本来就和挖亮不同），差异要有截图说明，不能当成回归去“对齐”旧画面。
- **风险与回退**：
  - 画面差异可能引起用户不适：发布说明附对比图，渲染设置里保留“Canvas2D 光照（兼容）”选项，默认关闭；
  - 部分 GPU 不支持 R11G11B10F 渲染目标：回退到 RGBA8；
  - 阴影数量多时 stencil 遍数增加：用 L4（lantern-night，6 光源、8 投射体）作压力场景，**待测**。
- **验收**：
  - `LatencyTest.nova`（带光照），60 Hz，key 模式：提交 → 截图 P50 ≤3.6 ms（**目标**，即 new-nolight 的 2.6 ms 加 1.0 ms），端到端 P50 ≤20.0 ms（**目标**；参考 nolight 实测 18.5）；
  - frames 模式：每秒提交数 ≥235，推迟比例 ≤1 %（**目标**）；
  - GPU 计时同时报告 world 和 lighting 两段（新增数值**待测**，如实记录）；
  - 新增 `verify-2642-lighting`：Platformer、lighting-starter 两个场景的浅色和深色截图 diff，人工确认差异清单，并做三项检查：无接缝、阴影方向正确、Spot 锥角正确；
  - 强制回退开关下 Canvas2D 路径仍然可用，诊断中能看到 fallback 标记；
  - 后处理改成 shader 后，编辑器与导出 Player 的截图一致（像素 diff 在合理阈值内，阈值由实现者定并写进脚本）。
- **工作量**：光照 6–8 天，后处理 1–2 天。**依赖**：WP-0；M-2 需要用它的结果测 Player。

#### P-E Player 解耦与导出延迟【必做，主线，带回退开关】

- **目标**：让导出 Player 不再依赖编辑器模块，并第一次测出导出 Player 的延迟（【评估】§0-8、§1 导出行 P0、§2.2 #5）。
- **现状** [代码]：
  - `src/PlayerApp.vue` 导入了 `./components/WorldCanvas.vue`、`./store/editor`、`./store/physics` 以及 `editor/` 下的适配器；
  - `src/player.ts` 用 `reactive` 包装多个 state adapter；它自己的注释写着“未来的无框架 Player 由 Runtime 自带 plain-state 默认”。
- **改动**：
  1. **E1 导出阻断（先做）**：复现“测试工程导出时音频资源在 Play 期间无法获取”的校验错误。代码位置待查，从导出校验和 `prepareRuntimeProjectResources` 入手。修复根因，不要绕开校验。修好后才能做 M-2。
  2. **E2 无 Vue 的 Player 宿主**：
     - 新建 `src/runtime/player/playerHost.ts`，只依赖 runtime、renderer、world、platform：
       - 自建单个 WebGL2 canvas；
       - 直接调用 `bootstrapRuntimeWorld` 和 `GameplayRuntimeCore`；
       - 输入从 `src/runtime/input.ts` 进；
       - 游戏 UI、无障碍节点用最少量 DOM，且不压在 canvas 之上（为 E3 做准备）；
       - 加载 novaPak（`runtimeProjectLoader`、`novaPakReader`）。
     - `src/player.ts` 默认走新宿主；`?legacyPlayer=1` 或导出设置可以切回 `PlayerApp.vue`，旧实现本轮保留，作为回退。
  3. **E3 desynchronized 实验（可延后，只做开关）**：`WebGL2Renderer.ts:367` 的 `getContext` 选项在 Player 中可选加上 `desynchronized: true`，然后读取 `getContextAttributes().desynchronized` 记进 probe。默认关闭。
- **实现要点**：
  - 编辑器需要的 `toRaw`、reactive 包装只在 Editor 入口安装；Player 保持 Runtime 的 plain 默认（26.41 的 `plainView.ts` 已经这样设计）；
  - 延迟 probe 继续通过 `activateLatencyProbe('web-player')` 激活，只接受回环地址。
- **风险与回退**：新宿主遗漏的功能可能包括游戏 UI、虚拟摇杆、无障碍树、音频解锁、全屏、错误恢复，要逐项对照 `PlayerApp.vue` 的功能清单。回退方法是用开关切回旧 Player。
- **验收**：
  - 新增 `verify-2642-player-boundary`：从生产构建的模块图（复用 `audit-engine-boundaries.mjs` 读 `engine-module-graph.json` 的方式）断言，Player 入口可达的模块中没有 `vue`、`pinia`、`src/store/*`、`src/components/*`、`src/editor/*`；
  - Windows 导出和 Web 导出各运行一次 Platformer 与 reflex-lab，检查键盘、指针、游戏 UI、音频（人耳）、存档；
  - harness 对导出 Player 跑 key 和 frames 模式，报告数值（**待测**）。附加目标：同场景下导出 Player 的端到端 P50 不高于编辑器 Play；
  - 用 `?legacyPlayer=1` 切回旧 Player 后，同样的 smoke 通过。
- **工作量**：E1 1–2 天，E2 6–10 天，E3 1 天。**依赖**：E1 → M-2；E2 最好在 P-D 之后，避免两边同时改渲染入口。

#### P-F 物理同步改脏标记【可延后】

- 位置 [代码]：
  - 每个固定步都调用 `synchronizeRuntime`（`World.ts:514`，定义在 789 行）；
  - `prepareQuery` 让每次 raycast 都做全量同步（768 行）；
  - 窄相不跳过静态对静态、双方都休眠的配对（`crates/nova_physics/src/world/legacy.rs` 约 265–345 行）。
- 本轮可以只做低风险子项：raycast 时，若自上次同步后没有编辑或脚本写入，就跳过同步。完整的脏标记方案延到 26.43。
- 验收方法：cargo 基准测 1k/5k 物体的 TileMap 场景，回放校验和不变。

#### P-G Rhai Engine 复用【可延后】

- 位置 [代码]：每次回调都执行 `engine_with_host` → `base_engine()`，新建 Engine 并注册约 172 个 `register_fn`（`crates/nova_script/src/lib.rs` 约 1093、1183 行）；结果经 JSON 往返（`GameplayRuntimeCore.ts:63`）。
- 方案：只建一次 Engine，宿主函数从 thread-local 或 `Rc` 上下文读取数据，命令改用类型化缓冲。
- 验收方法：`nova_script_test` 跑 100/1000 个脚本实体的基准，同时保持实例隔离。
- 优先级理由：多脚本场景下这是首要的 CPU 风险，但当前测量场景的 Runtime 帧只有 1.2 ms，收益要先 profile。

---

### WP-L 试玩关卡

#### L-1 合入 3 个已验证模板【必做】

- **来源**：`plan/levels/00-shared.fragment.ts`、`10-platformer-trilogy.fragment.ts`、`20-pendulum-post.fragment.ts`、`30-reflex-lab.fragment.ts`、`90-registration.fragment.ts`。草稿已在副本中通过完整的 `vue-tsc --noEmit`，`verify-levels.mjs` 17/17 通过（【关卡】“验证结果”）。
- **改动**（插入锚点与 `apply-to-copy.mjs` 一致，手工合入时照抄）：
  1. `src/projects/templates.ts`：
     - 联合类型 `ProjectTemplateId` 在 `'grid-chase'` 后追加 3 个 id；
     - `PROJECT_TEMPLATES` 末尾（`...TEMPLATE_ADDITIONS_26_11` 展开项之后、`] as const` 之前）追加 `REGISTRATION_DESCRIPTORS` 中的 3 条，`introduced: '26.42'`；
     - 4 个片段正文插入到 `function authoredAddition(` 的文档注释之前；
     - `TEMPLATE_FACTORIES` 在 `'grid-chase'` 之后登记 `platformerTrilogyTemplate`、`pendulumPostTemplate`、`reflexLabTemplate`；
     - `auditTemplateProject()` 在通用分支 `if (descriptor?.category === 'game')` 之前加入 `REGISTRATION_AUDIT` 中的 3 段契约。
  2. `src/projects/templateGuides.ts`：`controls` 追加 `trilogy`、`pendulum`、`reflex` 的三语说明；`guides` 追加 3 条记录。`manualSection` 只能用 `manual/index.html` 中已有的锚点，缺记录时 `templateGuide()` 会抛错。
  3. `src/i18n.ts`：在 en/de/zh 三处分别加 `template_<id>_features`（文本见 90 片段 [G]）。
  4. `src/assets/template-previews/<id>.png` ×3：用实际运行画面截取，≤1920×1080。
  5. `manual/index.html`：en、de、zh-CN 各加 3 个 `<section id="<lang>-v2615-template-<id>">`，共 9 节。
  6. `scripts/fixtures/v26.15-template-library.json`：ids 末尾追加 3 个 id。
- **实现要点**（【关卡】§1.3）：
  - 移动平台和危险物由自身脚本用 `set_velocity`/`set_position` 驱动。不要每帧调用 `entity_set_position`，它会触发 `invalidateRuntime()`，重建整个求解器；
  - Rhai 的辅助 `fn` 看不到导出状态，重置逻辑要内联到回调里；
  - 草稿刻意没有挂 AudioSource，P-E1 查清导出音频问题之前保持不加；
  - 按 120 Hz（P-B）复查 trilogy 的跳跃手感和 pendulum 的链条刚度。
- **验收**：
  - `pnpm check` 通过；
  - `verify-2642-levels` 17/17（见 L-3）；
  - 启动器中搜索“星跃”只返回 platformer-trilogy；搜索 rope、latency 分别能找到 pendulum-post、reflex-lab；
  - 三语 Getting Started 指南都包含操作说明。
- **工作量**：1–1.5 天，预览图和手册章节另加 1–1.5 天。**依赖**：WP-0。

#### L-2 修好两个原本失败的校验脚本【必做】

- `scripts/verify-v26.11-templates.mjs`：
  - `catalog.length` 和 `discoverTemplates(...).length` 的断言从 40 改为 43。该脚本按 `introduced === '26.11'` 过滤，其 20 项断言不受影响；
  - 查明 `PARTICLE_LEGACY_PORT_REQUIRED` 的来源（某个模板使用了旧粒子字段）并修正那个模板或迁移逻辑。不要删除断言。
- `scripts/verify-v26.15-library-metadata.mjs`：写死的 26.15.0 改为从 `package.json` 读取当前版本，或改成“≥26.15”的语义断言；同时要求每个 id 都有真实的 PNG 预览。
- **验收**：两个脚本在 26.42 工作区退出码为 0，输出记入证据包 `checks/`。**工作量**：0.5–1 天。

#### L-3 把验证脚本搬进仓库【必做】

- 以 `plan/levels/verify-levels.mjs` 为基础，新建 `scripts/verify-2642-levels.mjs`：
  - 去掉“拒绝在原仓库运行”的保护和注入步骤（合入后已不需要）；
  - 保留 Vite SSR 打包、审计、`validateProjectDocument`、UUID 与引用完整性检查，以及用 `nova_core` WASM 真实执行 Rhai 回调。
- `verify-rhai-drafts.mjs` 留在 plan/，供 L3–L5 后续使用。
- **验收**：17/17 通过。**工作量**：0.5 天。

#### L-4 编辑器内调参与试玩【必做】

- 按【关卡】各关的“验收”逐条在编辑器里实际游玩，每关录屏或截图放进证据包：
  - **L1**：三关都能通关；高墙必须按住跳；站在移动平台上不滑落；掉坑后回到最近的旗；S3 金币不足时进终点被拒；最好成绩在重开后保留。
  - **L2**：链条稳定，不断、不爆；风车匀速转动；点中链节必定剪断；至少存在一个“两次剪断即过关”且可复现的时机；球触底立即判负。链条明显拉长时先调 stiffness/damping。
  - **L6**：抢跑会被判定；5 轮后显示汇总；在 Marker 场景中按住 Space，白块出现，松开后消失。
- 只有草稿做过 WASM 脚本执行，带渲染和物理求解的实际游玩与导出都没做过（【关卡】§9）。本项就是第一次实测，如实记录发现的问题。
- **工作量**：2 天。**依赖**：L-1、P-B。

#### L-5 L3–L5【后续，26.43】

- relic-vault、lantern-night、avalanche-bench：Rhai 草稿已在 `verify-rhai-drafts` 中 9/9 通过，工厂函数尚未编写。lantern-night 可以作为 P-D 的光照压力场景，avalanche-bench 可以作为 P-F 的物理压力场景。所以如果本轮有余力，可以先做这两关的工厂，作为测试场景而不作为目录条目。

---

### WP-G 编辑器 GUI

总原则：

- 内容层（画布、侧栏、检查器、底栏）使用不透明材质；浮在内容上的控件（工具栏组、视口胶囊、菜单、Toast）使用玻璃，且不叠玻璃。
- 常驻实时玻璃 ≤5 个，总面积 ≤视口的 8 %。
- AGENTS §6 规定由工程师在实际使用后自主统一设计。【GUI】中的数值（字号、圆角、弹簧参数）是起点，可以按实际效果调整，但 tokens 的变量名必须兼容。

#### G0 = 【GUI】P0 批次 1：Token 与基础控件【必做，不改布局，可单独发布】

| 文件 | 改动（【GUI】§4 P0） |
|---|---|
| `src/ui/tokens.css` | 用 `plan/gui/tokens-ios.css` 替换，变量名全部兼容（该文件头部有新旧名对照）；新增 neutral-light 和 neutral-dark 并设为默认；新增 `--glass-*`、`--material-*`、弹簧 token；第 533–555 行定义 `data-glass`、`data-play-mode`、`data-reduce-transparency` 三态 |
| `src/store/preferences.ts` | 登记 neutral 两个调色板；新增“降低透明度”偏好，在 `applyPreferences` 中写 `root.dataset.reduceTransparency`（现在只写了 reduceMotion/highContrast 等，见第 156–170 行 [代码]）；写 `root.dataset.glass`（low-end 档或窗口失焦时为 `static`，降低透明度时为 `off`，其余为 `live`）；新增 `--switch-on` 规则 |
| `src/i18n.ts` | 所有新文案提供中、英、德三语 |
| `src/ui/editor.css` | 按钮 Filled/Tinted/Gray/Plain/Glass 五种样式和三种尺寸；字段去掉边框改用 fill；焦点环改为 3px `box-shadow`；`.nv-glass`（约 143 行）加折射环、高光、按压形变和 live/static 两态；菜单圆角 16、菜单项圆角 10，悬停改为 fill；`.ui-property-section` 改为 inset 分组卡片（圆角 12，行高 36）；滚动边缘遮罩 |
| `src/ui/forms.css` | 数值框（高 26），带轴字母，悬停或聚焦时显示内嵌 ±，替换现有 14px 宽的步进列 |
| `src/ui/motion.css`、`src/ui/motion.ts` | 开关、滑块的胶囊旋钮；分段滑块的弹簧；materialize 动画；Play 时去掉滤镜；WAAPI 读取弹簧 token，`reduced` 时去掉 blur 关键帧 |
| `src/ui/components/UiTabs/UiToggle/UiSlider/UiMenu/UiDialog/UiButton.vue` | UiTabs 增加 segmented 变体；UiDialog 改为 Sheet 头部（取消在前、完成在后）；UiButton 增加 `variant`、`size` 两个属性 |
| `src/layout/EditorLayout.vue` | 写 `data-play-mode`（与 P-A 共用）；Play 时视口浮层在 1.5 s 无指针移动后淡出，指针一动就恢复 |

- **实现要点**：
  - 不对 backdrop-filter 本身做动画；`will-change` 只在过渡期间加；编辑器空闲时不能有无限循环动画（【GUI】§3.4 第 4、6 条）；
  - 字号统一为 11/12/13/15/17/22/28 的阶梯，去掉 13.5px（【GUI】§2 #12）；
  - 用户自定义调色板下，半透明标签的对比度可能不足：调色板注册时自动校验，低于 4.5:1 时回退为不透明混色（【GUI】§5）；
  - `linear()` 弹簧需要 Chromium 113 以上，同时提供 cubic-bezier 回退。
- **风险与回退**：tokens 是全局替换，300 多处调用点依赖 `--text-muted` 等别名。万一出问题，可以保留 `tokens.css` 的 26.41 副本作为 `tokens-legacy.css`，用一行 import 切回（只在开发期保留，发布前删除，避免两套设计来源并存，见 AGENTS §6）。
- **验收**：
  - `pnpm check`；`verify-2641-editor-ui` 6/6 与 `verify-2640-editor-workflow` 7/7 不退化；
  - 新增 `verify-2642-glass-budget`：编辑态 `backdropFilter≠none` 的元素 ≤5（现为 9），Play/暂停时为 0；勾选“降低透明度”后 `data-reduce-transparency='true'`，所有材质不透明，次要标签不透明度为 76 %；
  - 截图矩阵：中/英/德 × 浅色/深色 × 高对比/减少动态，宽度 1100/1280/1600，人工检查以下几项：
    - 菜单圆角是否同心；
    - 检查器是否为 inset 卡片，类别 chip 是否不再被截断；
    - 焦点环是否随圆角；
    - 深色下面板与窗口是否可区分（26.41 为 `#171E27` 对 `#0F141A`）；
  - 用 DevTools Paint flashing 确认 Play 时面板不发生重绘；
  - 次要标签在浅色、深色默认调色板上的对比度 ≥4.5:1（用脚本计算，结果写进证据）。
- **工作量**：5–7 天。**依赖**：WP-0。P-A 的测量依赖本项。

#### G1 = 【GUI】P1 批次 2：窗口结构【应做，可整批延后到 26.43】

- **范围**：
  - `TopBar.vue` 改为三区工具栏，菜单收进应用菜单，按 Alt 显示菜单栏；
  - `WorkspaceBar.vue` 改为分段控件，窄宽度时变为弹出菜单；
  - `ActionBar.vue` 把运行、单步、停止合为一组，运行为唯一的着色主按钮；
  - `SideBar.vue` 并入 `SceneSideBar.vue`；
  - `StatusBar.vue` 只保留 `aria-live`；
  - `EditorLayout.vue` 改为三列网格，加入 ≥1240、980–1239、<980 三个容器查询断点和 F6 区域循环；
  - `ToolBar.vue` 改为竖排胶囊；
  - `EditorBottomPanel.vue` 增加分段标签和三档停靠高度；
  - `ConfigPanel.vue` 头部改为两行，加筛选菜单，组件工具行改为 ⋯ 菜单加启用开关，刚体类型改用分段控件。
- **必须同步修改的依赖** [代码]：
  - `verify-2641-editor-ui.mjs` 第 54 行点击 `.status-bar .status`，第 68 行测“通知历史从状态栏打开”。状态栏移除后，这两处要改为新的入口（底栏胶囊或 Toast 历史），断言的语义保持不变；
  - 第 22 行测“视口控件是一行胶囊”，竖排工具后要更新断言；
  - `docs/latency-results.md` 的复现步骤写着 “Play, click the status bar once”，harness 的操作说明要同步改为点击画布或标题。
- **验收**：
  - 更新后的 `verify-2641-editor-ui` 和新增的 `verify-2642-editor-shell`（F6 循环、Alt 菜单栏、三个断点下面板为停靠或浮层）通过；
  - 1100px 宽时画布可用宽度明显大于 26.41 的约 360px（**目标** ≥640px，**待测**）；
  - 菜单命令和快捷键全部保留，抽查 20 条命令。
- **工作量**：8–12 天。**依赖**：G0。

#### G2 = 【GUI】P2【后续】

ProjectManager、SettingsPanel、CommandPalette、ContextMenu、Toast、CreateObjectPalette、ConfirmDialog，以及透镜折射、背景延伸、运动模糊过渡、按画布亮度翻转胶囊明暗。本轮不做。

---

### WP-S 稳定性与上手

| 项 | 内容 | 本轮 |
|---|---|---|
| S-1 快速入门 | 新建 `docs/QUICKSTART_26_42.zh.md`/`.en.md`（德语尽量同批），内容是从 Platformer 模板出发的 30 分钟主线：打开模板 → 用 `@export` 改速度 → Play → 导出 Web。附 4 个概念：`fixed_update` 与 `update` 的分工、tick 与延迟、写操作延迟应用、计时器时钟。`manual/index.html` 顶部和两份 README 加入口；`docs/FIRST_GAME_5_0.md` 顶部加一行指向新文档（不删原文）（【评估】§4） | 必做 |
| S-2 计时器时钟 | `src/runtime/time.ts` 的 `beginFrame` 按可变帧时长推进计时器（38–44 行 [代码]），而物理走 Rust 累加器（`crates/nova_runtime/src/lib.rs` 约 693–740 行）。方案：新增 `advanceFixed(fixedDelta)`，在固定步回调中推进计时器；项目设置 `timerClock: 'frame' \| 'fixed'`，缺字段按 `frame` 读，新模板写 `fixed`，老项目行为不变（【评估】§3 双时钟） | 应做 |
| S-3 事件派发时机 | 物理事件在所有固定步结束后统一派发（`GameplayRuntimeCore.ts` 约 785 行 `dispatchPhysicsEvents` [代码]）。本轮只写进 S-1 和 `docs/SCRIPTING_CONTRACT_26_23.md` 的补充说明：一帧多步时，碰撞回调晚于对应 tick；需要逐步语义时，在 `fixed_update` 里查询。“每步 drain”需要配合回放和联网确定性测试，延到 26.43 | 文档必做，修复延后 |
| S-4 脚本写后读 | 【评估】推测同一回调内写后再读会拿到旧值。在 `nova_script_test` 或 `verify-engine-script-state` 中补一个测试，确认实际行为，再写进 S-1 | 必做 |
| S-5 模板每帧重建 | orbit-dodge、hazard-crossing 每帧对障碍调用 `entity_set_position`，每帧重建求解器（【关卡】§1.3）。改为障碍自身的脚本用 `set_position`/`set_velocity` 驱动 | 应做 |
| S-6 求解器参数 | `POSITION_SLOP=1e-12`、休眠阈值 0.001、子步式 CCD 最多 128 子步（【评估】§3）。本轮只用堆叠场景测休眠比例和抖动，参数修改延后 | 后续 |

- **S-2 验收**：headless 测试在模拟 60/144/240 Hz 显示帧率下运行同一 `fixed` 项目，计时器到期时所在的固定步序号完全一致；`frame` 项目的回放校验和与 26.41 相同。**工作量**：S-1 2–3 天，S-2 2 天，S-3 0.5 天，S-4 0.5 天，S-5 0.5 天。

---

### WP-M 测量与验证

#### M-1 harness：物理驱动角色【必做】

- `scripts/latency/make_test_project.py` 新增参数 `--marker character`：
  - 生成 `CharacterMarker`：Kinematic RigidBody2D 加 CharacterBody2D，脚本在 `fixed_update` 中根据 `input_down("Jump")` 用 `move_character` 移动；
  - 原白块保留，两者不能同时出现在测量 ROI 内；
  - 另加 `--tick 60|120|240` 和 `--interpolation Interpolate|None`。
- 标签约定（写入 `builds.txt`）：
  - `rel41`：26.41 发布版，同机复测作为基线；
  - `rel`：26.42 发布版；
  - `rel-nolight`；
  - `t120`、`t240`；
  - `char-i60`、`char-n60`、`char-i120`、`char-n120`；
  - `glass-on`、`glass-off`；
  - `player`、`player-desync`。
- **验收**：每组 5 次预热加 100 次测量，n ≥200 时报告 P99；`report_latency.py` 输出的表格并入 26.42 版 `docs/latency-results.md`。

#### M-2 导出 Player 测试【必做，依赖 P-E1】

- harness 的 `--image` 指向导出的 Player 可执行文件，跑 key 和 frames 两种模式。Web Player 用 `?latencyProbe=http://127.0.0.1:<port>` 激活。Web 的端到端测量需要浏览器全屏和固定 ROI，做不到时写“未测”。

#### M-3 以 reflex-lab 作测试工程来源【应做】

- 【关卡】L6 的 Latency Marker 场景与 harness 的 marker 行为一致（`verify-levels` 中有对应用例）。`make_test_project.py` 增加 `--from-template reflex-lab` 路径，减少手工拼装工程。

#### M-4 回归与门禁【必做，每个里程碑都跑】

| 类别 | 命令或脚本 | 通过标准 |
|---|---|---|
| 类型 | `pnpm check`（vue-tsc 加 node tsc） | 退出码 0 |
| Rust | `cargo fmt --check`；`cargo clippy --workspace --all-targets -- -D warnings`；`cargo test --workspace` | 全部通过，测试数 ≥198；新增测试计入 |
| 脚本 | `pnpm test:scripts:headless`（`nova_script_test`） | 通过 |
| 既有浏览器回归 | `verify-2640-editor-workflow`、`verify-2641-editor-ui` | 7/7、6/6（G1 实施后用更新版） |
| 新增 | `verify-2642-glass-budget`、`verify-2642-levels`、`verify-2642-lighting`、`verify-2642-player-boundary`；做 G1 时加 `verify-2642-editor-shell` | 全部通过 |
| 修复 | `verify-v26.11-templates`、`verify-v26.15-library-metadata` | 退出码 0 |
| 既有失败 | 4 个旧引擎校验 | 与 26.41 结果相同即可，不能新增失败；不改、不删 |
| 延迟 | harness key/drag/frames：`rel41`、`rel` 以及各诊断组 | 达到 WP-P 各项的验收 |

- 浏览器回归需要先 `vite build`；没有 Edge 的系统设置 `NOVA_AUDIT_BROWSER`。Linux headless 的结果只能作为补充，目标平台的结论以 Windows 实机为准（AGENTS §7）。

---

## 4. 执行顺序与里程碑

每个里程碑结束时都要跑 M-4 的全部门禁。未达标的里程碑不阻塞下一批开发，但不能进入发布。

| 里程碑 | 内容 | 独立验证 | 预估 |
|---|---|---|---|
| **M0 基线**（第 1 周初） | WP-0；同机复测 `rel41` 的 key/drag/frames；M-1 的 character marker 与 `char-*` 四组；`t120` | 基线表与 26.41 文档的 P50 偏差在映射误差内；若机器不同，以复测值为准并注明 | 2 天 |
| **M1 快赢**（第 1–2 周） | G0；P-A；P-B；L-1、L-2、L-3；S-4；P-C 决策 | `verify-2642-glass-budget`、`-levels`，两个修好的校验脚本，`glass-on/off` 和 `t120` 数据 | 9–12 天 |
| **M2 光照**（第 2–4 周） | P-D（含后处理 shader）；L-4 试玩；P-C 第二步（如达到阈值） | `verify-2642-lighting`；`rel` 与 `rel-nolight` 对比；截图差异清单 | 8–12 天 |
| **M3 Player**（第 3–5 周，可与 M2 并行） | P-E1 → M-2；P-E2；E3 开关 | `verify-2642-player-boundary`；导出 Player 的 smoke 与延迟数据 | 8–13 天 |
| **M4 上手与结构**（第 5–6 周） | S-1、S-3 文档；S-2、S-5；G1（应做，进度落后则整批延后） | 快速入门按文档实际走通；`verify-2642-editor-shell` | 4–14 天 |
| **M5 发布**（第 6 周末） | §5 清单 | 从 `releases/v26.42` 实际打开检查 | 2 天 |

**依赖关系**：
- WP-0 → 所有工作；
- G0 → P-A 的测量 → G1；
- M-1 → P-B、P-C；
- P-E1 → M-2；
- P-D 最好先于 P-E2 合入渲染入口；
- L-1 → L-4（需要 P-B 的 tick 结果）；
- S-4 → S-1。

**取舍顺序**（时间不够时从后往前砍）：G1 → S-2 → S-5 → P-C 第二步 → E3。P-A、P-B、P-D、P-E1/E2 的最小版本、L-1 至 L-4、G0、S-1、S-3、S-4 和 M 系列不砍。如果 P-E2 到 M3 结束仍未达到验收，发布时默认用旧 Player，新宿主以开关形式随包提供，并在发布说明中写明。

---

## 5. 验收与发布清单

1. **版本**：外显版本统一为 26.42，机器版本为 26.42.0；`Get-CalendarReleaseInfo -Label 26.42` 映射正确；项目格式 2 / schema 29（若 P-C 迫使升级 schema，要单独写明迁移）。产品版本、用户游戏版本和 ABI/schema 版本不能混着改。
2. **构建**：运行 `scripts/build-release-26.42.cmd`（`pnpm build` → `pnpm tauri build` → 打包），日志写到 `.cache/build-26.42.log`。打包前先关闭正在运行的 Nova_A，否则打包会失败（26.41 交接记录）。
3. **发布目录** `releases/v26.42/`，沿用十一文件约定。打包脚本会把实际文件集与下表比对，不一致就失败：

   | 文件 |
   |---|
   | `EDIT_LEDGER.md`、`LICENSE.md`、`RELEASE_NOTES.md`、`SHA256SUMS.txt` |
   | `Nova_A-v26.42-reference-projects.zip`、`Nova_A-v26.42-release-evidence.zip`、`Nova_A-v26.42-source.zip`、`Nova_A-v26.42-web.zip` |
   | `Nova_A-v26.42-windows-x64-portable.exe`、`Nova_A-v26.42-windows-x64-setup.exe`、`Nova_A-v26.42-windows-x64.msi` |

4. **源码包**：按工作区打包。用只读的 `git ls-files --cached` 和 `--others --exclude-standard` 取文件列表，排除仓库外引入的顶层目录和链接，不用 `git archive HEAD`；`sourceCommit` 记为 `<HEAD>+working-tree`。
5. **文档**：
   - `docs/RELEASE_NOTES_26_42.md`：只写实测数字，并标注测量条件、未测项和限制；
   - `docs/EDIT_LEDGER_26_42.md`：逐文件写明改动原因，结构同 26.41；
   - `docs/WEB_HOSTING_26_42.md`：打包时会复制成 Web 包内的 `HOSTING.md`；
   - 更新 `docs/latency-results.md`，或新增 26.42 版本，保留 26.41 的表格作为对照。
6. **证据包** `.cache/evidence-26.42/`：
   - `checks/`：M-4 每条命令的输出；
   - `container/`：Linux headless 运行记录；
   - `screenshots/`：G0 截图矩阵、光照对比、关卡试玩；
   - `latency/`：`results/<label>-<mode>-*.json/.jsonl/.csv`、`sysinfo.txt`（去掉用户路径）、`builds.txt`（含 SHA-256）、`harness-commands/`、`LatencyTest*.nova`。
7. **实机检查**（从 `releases/v26.42` 启动）：
   - 启动器显示 26.42；
   - 命令行传入的工程能打开；
   - 新建 3 个新模板各一次，Play 后能玩；
   - 编辑、Undo、保存后重开；
   - Play/Stop；
   - 导出 Windows 和 Web 并独立运行；
   - 音频人耳确认；
   - Settings 中的“降低透明度”生效。
8. **素材合规**：在 Web 包和 exe 资源中搜索 `SF-Pro`、`SFMono`、`SF Symbols`，应无结果；`FONT_LICENSES/` 与 26.41 一致。
9. **Git**：发布前执行 `git status`（只读），确认没有暂存内容，也没有新 tag。
10. **限制说明**：如果仍未收到发布细则图片，写明“按十一文件约定发布，未核对图片细则”。

---

## 6. 风险登记与回退策略

| ID | 风险 | 可能性 / 影响 | 触发信号 | 缓解 | 回退 |
|---|---|---|---|---|---|
| R1 | WebGL2 光照的画面与旧版差异大，或在某些 GPU 上不可用 | 中 / 高 | 截图 diff 出现大面积变化；shader 编译失败 | 光照 RT 格式回退为 RGBA8；附对比图说明；用 L4 场景压测 | 渲染设置“Canvas2D 光照（兼容）”；初始化失败时自动显式回退 |
| R2 | 新 Player 宿主缺功能（游戏 UI、无障碍、音频解锁） | 中 / 高 | 导出 smoke 失败 | 对照 `PlayerApp.vue` 功能清单逐项检查 | `?legacyPlayer=1`，或发布时默认旧 Player |
| R3 | 导出音频阻断的根因在资源管线深处 | 中 / 中 | 2 天内找不到根因 | 先换成不含音频的测试工程测 Player 延迟，阻断项另开问题 | M-2 改用无音频工程，发布说明注明 |
| R4 | 120 Hz 改变模板手感，或按 tick 计数的脚本变快 | 中 / 中 | L-4 或模板试玩异常 | 检查 `fixed_update` 中的常量；回放基准重录 | 模板默认值改回 60 |
| R5 | 关闭插值后角色抖动 | 中 / 中 | 120 Hz 下仍有可见抖动 | 与 P-B 一起评估；Extrapolate 留到后续 | 模板设回 `Inherit` |
| R6 | 叠加层跳过判断漏掉内容，出现残影 | 低 / 中 | gizmo 或选框丢失 | DPR、尺寸变化时强制清空；`verify-2641` 的用例覆盖 | `overlaySkip=0` |
| R7 | token 全局替换引起大面积样式回归，或自定义调色板对比度不足 | 中 / 中 | 截图矩阵异常 | 别名全部保留；注册时校验对比度 | 开发期 `tokens-legacy.css` 一行切回 |
| R8 | G1 打破既有浏览器回归和 harness 的操作步骤 | 高（若实施）/ 低 | `verify-2641` 第 54、68 行失败 | 同一批次内更新测试与文档 | G1 整批延后到 26.43 |
| R9 | 计时器改时钟导致老项目行为变化 | 低（有开关）/ 高 | 回放校验和变化 | 缺字段按 `frame` 读 | 新模板也写回 `frame` |
| R10 | `vue-tsc` 耗时长（约 608 s），拖慢迭代 | 高 / 低 | — | 合并批次后再跑全量；开发中用增量 | — |
| R11 | 测量机器或条件与 26.41 不同，导致结论失真 | 中 / 高 | `rel41` 复测与文档偏差超出映射误差 | M0 先复测基线，所有对比只在同机同日进行 | 只报告同机对比，不和 26.41 文档的数字跨机比较 |
| R12 | 误执行 Git 写操作，或脚本间接提交 | 低 / 高 | — | 打包脚本只用 `git ls-files`、`ls-tree`、`rev-parse` | 发现后立即停止，告知维护者，不自行 reset |

---

## 7. 附录

### 7.1 报告索引与追溯

| 本手册条目 | 报告出处 |
|---|---|
| 26.42 只做五件事 | 【评估】§0-10、§2.3 |
| P-A | 【评估】§2.2 #4；【GUI】§2 #10、§3.4 第 3、5、7 条 |
| P-B | 【评估】§2.2 #2；【实测】new-240hz |
| P-C | 【评估】§0-4、§2.2 #3 |
| P-D | 【评估】§0-3、§1 光照行、§2.2 #1/#8；【实测】new-nolight |
| P-E | 【评估】§0-8、§1 导出行、§2.2 #5；RELEASE_NOTES_26_41 Limits |
| P-F / P-G | 【评估】§0-5/§0-6、§2.2 #6/#7、§3 全量同步行 |
| WP-L | 【关卡】§1.2、§1.3、§3、§4、§8、§9；`90-registration.fragment.ts` [A]–[H] |
| G0 / G1 / G2 | 【GUI】§4 P0/P1/P2、§3.4、§5 |
| S-1…S-6 | 【评估】§3、§4；【关卡】§1.3 |
| M-1…M-4 | 【评估】§2.2 验证列；【实测】Reproduce；RELEASE_NOTES_26_41 Verification |

### 7.2 关键文件索引

| 路径 | 涉及 |
|---|---|
| `src/renderer/lighting2d.ts`、`WebGL2Renderer.ts`、`sceneRenderer.ts`；新建 `lighting2dGpu.ts` | P-D |
| `src/components/WorldCanvas.vue`（约 1395–1415 行叠加层，约 1734 行 CSS filter） | P-A、P-D |
| `src/layout/EditorLayout.vue`、`src/ui/tokens.css`、`editor.css`、`forms.css`、`motion.css`、`motion.ts`、`src/store/preferences.ts`、`src/ui/components/Ui*.vue` | G0、P-A |
| `src/layout/TopBar.vue`、`StatusBar.vue`、`SideBar.vue`；`src/components/WorkspaceBar.vue`、`ActionBar.vue`、`SceneSideBar.vue`、`ToolBar.vue`、`EditorBottomPanel.vue`、`ConfigPanel.vue` | G1 |
| `src/world/World.ts`（514、768、789、962 行）、`src/runtime/physicsProduction.ts`（5、190 行） | P-B、P-C、P-F |
| `src/projects/templates.ts`、`templateGuides.ts`、`src/i18n.ts`、`manual/index.html`、`src/assets/template-previews/`、`scripts/fixtures/v26.15-template-library.json` | WP-L、P-B |
| `src/player.ts`、`src/PlayerApp.vue`；新建 `src/runtime/player/playerHost.ts` | P-E |
| `src/runtime/time.ts`、`src/runtime/GameplayRuntimeCore.ts`、`crates/nova_runtime/src/lib.rs` | S-2、S-3、P-G |
| `crates/nova_script/src/lib.rs`、`crates/nova_physics/src/world/legacy.rs`、`solver/contact_solver.rs` | P-G、P-F、S-6 |
| `scripts/latency/*.py`、`src/runtime/latencyProbe.ts`、`src/platform/latencyProbeHost.ts` | WP-M |
| `scripts/verify-2640-*`、`verify-2641-editor-ui.mjs`、`verify-v26.11-templates.mjs`、`verify-v26.15-library-metadata.mjs`；新建 `verify-2642-*` | WP-M、WP-L |
| `scripts/build-release-26.41.cmd`、`package-release-26.41.ps1`、`release-policy.ps1` | WP-0、§5 |
| `plan/levels/*`、`plan/gui/tokens-ios.css`、`plan/gui/mockup.html`、`plan/gui/shots/` | WP-L、G0 |

### 7.3 待测清单（发布说明中必须逐项给出“已测数值”或“未测及原因”）

1. 物理角色在 Interpolate 与 None 下的端到端差值（60/120 Hz）。
2. 120 Hz 固定步的端到端延迟、handler→消费时间和 Runtime 帧 CPU。
3. WebGL2 光照后提交 → 截图的时间和 GPU 计时（world + lighting）。
4. 玻璃开 / 关下的每秒提交数和帧时间 P95。
5. 导出 Player（Windows/Web）的 key 和 frames 数据；desynchronized 是否生效。
6. 1100px 宽时画布可用宽度。
7. lantern-night、avalanche-bench 的帧时间（若本轮做了测试场景）。
8. PresentMon、光子延迟、其他机器和刷新率、Linux、Web 端到端：本轮若仍不具备条件，写“未测”。
