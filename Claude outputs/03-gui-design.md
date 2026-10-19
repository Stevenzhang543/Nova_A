# Nova_A 编辑器 GUI 重设计：iOS 26 / Liquid Glass 风格（26.42 提案）

> 适用代码：`/home/claude/nova`（26.41，只读审视）。配套文件：`plan/gui/tokens-ios.css`（token 草稿，可直接替换 `src/ui/tokens.css`）、`plan/gui/mockup.html`（单文件高保真样稿，含浅/深色、Play 降级、降低透明度、减少动态、增加对比度和窄窗口演示）。

## 0. 结论

两层结构：画布、层级、检查器是内容层；工具栏、视口工具、菜单、提示是浮在其上的玻璃层。玻璃只用于小面积控件，大面板用不透明静态材质；Play 时关闭视口玻璃的实时模糊，保住 26.41 的 233 次/秒提交。

## 1. Apple 资料要点（可落地原则）

| 原则 | 落到 Nova_A | 来源 |
|---|---|---|
| Liquid Glass 只用于浮在内容上的控件与导航；内容层不用玻璃；少量使用；不要玻璃叠玻璃 | 画布上的工具胶囊、工具栏分组、菜单、Toast 用玻璃；层级/检查器/资源用不透明面板 | [Materials](https://developer.apple.com/design/human-interface-guidelines/materials)、[Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219) |
| Regular 与 Clear 两种变体不可混用；Clear 只在画面丰富时使用，并在亮内容下加 35% 暗化层 | 默认 Regular；只有全屏 Game 视图的悬浮控件用 Clear + 暗化 | Materials |
| 小控件随背景明暗翻转；大面积玻璃（菜单、侧栏）更不透明、不翻转 | 胶囊用 `--glass-regular`(58%)，菜单用 `--glass-regular-large`(80%) | Meet Liquid Glass、[Color](https://developer.apple.com/design/human-interface-guidelines/color) |
| 同心几何：固定圆角、胶囊、同心（内 = 外 − 间距），并给出回退半径 | `--radius-pane 20 → group 12 → row 8`，菜单 16 → 项 10 | [Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356) |
| 工具栏分三区（前/中/后），按功能分组，最多约 3 组；同一组内不混用图标和文字；只有一个着色主操作且放在后端 | 前：侧栏、标题、撤销；中：工作区；后：运行、命令、检查器 | [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)、[Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass) |
| 侧栏浮在玻璃层上，可隐藏，层级不超过两层，图标用强调色；macOS 关键操作不放在侧栏底部；窗口变窄时自动收起 | 侧栏 = 上下文入口 + 场景 + 层级；“创建”移到侧栏顶部；宽度 <1240 自动变为浮层 | [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)、[Split views](https://developer.apple.com/design/human-interface-guidelines/split-views) |
| 列表与表单加大行高和留白，分组圆角更大；分组标题用标题式大小写，不再全大写 | 检查器改为 inset-grouped 卡片，行高 36 | Adopting Liquid Glass、[Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) |
| 用滚动边缘效果代替分隔线；默认 Soft，固定的表头用 Hard；每个视图只用一种 | 检查器和层级的吸顶头部用遮罩渐隐（Soft）；控制台表头用 Hard | Get to know… |
| 菜单：常用操作配图标，一组要么全有图标要么全无；用分隔线分组；子菜单只用一层 | 菜单全部重排并配图标 | [Menus](https://developer.apple.com/design/human-interface-guidelines/menus) |
| 分段控件约 5–7 段，等宽，只用文字或只用图标 | 工作区 6 段，窄窗口改为弹出菜单 | [Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls) |
| Sheet：Cancel 在前、Done 在后，可调整大小时显示 grabber；macOS sheet 有合理的默认尺寸 | 新建项目、创建对象、确认框统一采用 | [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) |
| 动效要有目的、简短、可中断；不要给高频操作加动效；动效必须可以关闭 | 弹簧只用在状态变化和位置变化上；减少动态时去掉位移和过冲 | [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) |
| 按尺寸类别（紧凑/常规）而不是设备类型来调整布局；空间变化时功能不能变，只改变露出多少 | 三个断点，面板改为浮层，但功能不减 | [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) |
| macOS 字号：Body 13/16，Title3 15/20，Title1 22/26，Large Title 26/32；最小 10pt | 采用这套字号，最小提到 11px（中文 12px） | [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) |
| 自定义颜色要提供浅色、深色和增强对比三套；状态色不能只靠颜色表达 | 系统色取 HIG 2025 值，并做文字安全变体 | Color |

## 2. 现状审视（26.41，截图见 `gui/shots/`）

| # | 问题 | 证据 | 影响 |
|---|---|---|---|
| 1 | 标题栏塞了 6 个以上的组：品牌、6 个菜单、工作区、项目名、运行、模式文字、命令、布局 | `TopBar.vue`；1180px 以下项目名被隐藏 | 层级扁平，看不出重点 |
| 2 | 左侧有三列：44px 上下文栏、场景、层级。上下文栏只有图标，“+”在底部 | `SideBar.vue` | 难以发现，也不符合 HIG 的侧栏规则 |
| 3 | 当前场景出现三次：场景面板、画布胶囊、层级底部的面包屑 | 截图 | 信息冗余 |
| 4 | 底部有三条：状态栏、底栏标签条、层级页脚。底栏标签只有图标，橙点含义不明 | `StatusBar.vue`、`EditorBottomPanel.vue` | 占用纵向空间，含义模糊 |
| 5 | 检查器头部占三行，类别 chip 被截断（“Physics (”）。每个组件有一行 7 个无文字图标；“Physics and world status”用原生 ▶；刚体类型下拉框没有标签；标签换行；数值步进器只有 14px 宽 | `ConfigPanel.vue` 截图 | 密度高但难以扫读，点击目标太小 |
| 6 | 分组只靠细线区分，没有卡片；深色下面板 `#171E27` 和窗口 `#0F141A` 几乎分不开 | tokens | 层级弱 |
| 7 | 菜单项高 26、圆角 5，菜单本体圆角 12，不同心；没有图标；悬停时整行填满强调色 | `.dropdown` | 不像 iOS |
| 8 | 焦点环用 2px outline，在胶囊和圆角按钮上显得方 | 浅色 File 按钮 | 视觉生硬 |
| 9 | 1100px 宽时画布只剩约 360px：面板宽度固定，视口胶囊折成三行，盖住场景 | `08-narrow` 截图 | 没有自适应 |
| 10 | 视口上的 3 个 `.nv-glass` 在 Play 时仍每帧做实时模糊；菜单 93% 不透明却仍开模糊，成本没有换来效果 | `editor.css`/`motion.css` 无 Play 降级；实测编辑态 `backdropFilter≠none` 的元素 9 个 | 白白增加合成开销 |
| 11 | `data-reduce-transparency` 只被 `WorldCanvas` 读取，`preferences.ts` 从不写入，没有用户开关 | grep 结果 | 无障碍设置缺口 |
| 12 | 字号 12/13/13.5/14 混用，13.5px 在 Windows 上会出现半像素基线 | tokens | 字号节奏乱 |

## 3. 新设计

### 3.1 信息架构与窗口结构

```
┌ 工具栏 52（透明，无底色带；各组是玻璃胶囊）──────────────────────────────┐
│ [N][◧] Level 01 ▾ / My Game·已编辑 [↶↷] │ [设计|脚本|动画|界面|调试|管理] │ [▶ ⏭ ■] [⌕ 命令] [◨] │
├─────────┬────────────────────────────────────────────┬───────────┤
│侧栏 264 │ 画布（圆角 20）                              │ 检查器 320│
│浮动面板 │ ┌[Level01|Level02 +]          [● World ▾ +]┐│ 浮动面板  │
│·上下文入口│ │竖排工具胶囊                                ││ 对象头    │
│·场景    │ │                [运行中 0:12]（仅 Play）     ││ 搜索/筛选/+│
│·层级树  │ │                    [− 100% + ⤢]            ││ inset 分组│
│         │ └────────────────────────────────────────────┘│           │
│         │ 底栏（资源/控制台/动画/性能，可停在 3 个高度） │           │
└─────────┴────────────────────────────────────────────┴───────────┘
```

- 菜单：File…Help 收进最前面的“N”应用菜单（每项一个子菜单）。按 Alt 显示完整菜单栏（Windows 习惯，对应 iPadOS 26 的菜单栏）。菜单命令全部保留，快捷键不变。
- 标题：显示场景名，副标题显示“项目 · 保存/运行状态”。下拉箭头打开文档菜单（保存、导出、重命名、场景设置、项目管理器）。状态栏取消，原内容去向：保存/运行状态进标题副标题，后台任务和告警进底栏胶囊，瞬时消息用 Toast。保留一个视觉隐藏的 `aria-live` 区域。
- 侧栏：原 `SideBar` 上下文栏变成侧栏顶部的“导航”分组（各工作区的条目带文字和角标），下面是场景分组和层级分组。“创建对象”是侧栏头部的着色圆按钮。Manage 工作区下，侧栏就是设置分区列表（iOS 设置的模式）。
- 画布：工具胶囊竖排放在画布左侧，不再和场景标签、图层争顶部空间。只打开一个场景时不显示场景标签。缩放胶囊放在右下角。
- 底栏：分段控件切换资源/控制台/动画/性能，不再用纯图标标签。顶部 grabber 支持三个停靠高度：收起为画布底部胶囊（显示“资源 ⚠2”）、中（约 32%）、大（约 60%）。
- 检查器：头部两行，对象标题和启用开关一行，搜索、筛选、添加组件一行。类别、仅已修改、仅固定合并到筛选菜单，菜单按钮上显示角标。

自适应断点（`.editor-root` 上的容器查询）：

| 宽度 | 侧栏 | 检查器 | 工作区 | 其他 |
|---|---|---|---|---|
| ≥1240 常规 | 停靠 | 停靠 | 分段控件 | 完整命令胶囊 |
| 980–1239 | 浮层（点画布关闭） | 停靠 | 分段控件 | 命令只显示图标 |
| <980 紧凑 | 浮层 | 右侧浮层 | 弹出菜单 | 底栏默认收起，资源文件夹列隐藏 |

德语标签较长，不设固定宽度，空间不足时触发同一套降级。

### 3.2 Token（详见 tokens-ios.css）

- **颜色**：继续由 6 个调色板角色派生。新增 `neutral-light/neutral-dark` 并设为默认值（`#F2F2F7/#FFF/#0088FF` 与 `#000/#1C1C1E/#0A84FF`）。
  - 层次：窗口 → 面板 → 卡片，对应 grouped 背景的三级。
  - 标签、填充、分隔线用半透明值（label、secondary、tertiary，fill 1–4，separator），放在任何底色上都成立。
  - secondary 标签从 iOS 的 60% 提高到 72%，保证 11–13px 文字的对比度 ≥4.5:1。
  - 系统色、系统灰阶按 HIG 2025 取值；浅色下的橙/绿/红另给文字安全值。
  - 增强对比度时全部变为不透明、加边框。
- **字体**：`-apple-system, BlinkMacSystemFont, Segoe UI Variable, Nunito Sans/Noto Sans SC`，不打包 SF。

  | 样式 | 字号/行高 | 字重 | 用途 |
  |---|---|---|---|
  | Large Title | 28/34 | 700 | 启动页标题 |
  | Title1 | 22/28 | 600 | 页面标题 |
  | Title2 | 17/22 | 600 | 对象名、Sheet 标题 |
  | Title3 | 15/20 | 600 | 面板标题 |
  | Headline | 13/18 | 600 | 分组标题 |
  | Body | 13/18 | 400 | 正文、行 |
  | Callout | 12/16 | 400 | 次要文字 |
  | Footnote | 11/14 | 400 | 注释（中文 12） |

  17px 以上加 −0.012em 字距。数值一律用 `tabular-nums`。
- **间距**：4pt 网格（4/8/12/16/20/24/32/40）。窗口外边距 8，面板内边距 8–16，分组之间 20。
- **尺寸**：控件 28，行 36，树行 30，工具栏 52，开关 42×24。紧凑模式整体缩一档（24/30/24）。
- **圆角（同心规则）**：内圆角 = max(回退值, 外圆角 − 间距)。Win11 窗口 8 → 面板 20 → 卡片 12 → 行高亮 8；胶囊组 → 内按钮胶囊（内缩 2–4）；菜单 16 → 菜单项 10；Sheet 26，回退值 8。
- **阴影**：分柔和接触影和远影两层。浮动面板用 `--shadow-pane`，菜单和浮层用 `--shadow-md`。浅色阴影更轻，深色阴影另加 0.5px 白色描边。
- **材质层级**：

  | 层级 | 背景 | backdrop-filter | 用途 |
  |---|---|---|---|
  | ultraThin | surface 36% | blur 12 sat 160% | 画布上的提示标签 |
  | thin | 54% | blur 16 sat 170% | 视口 HUD |
  | regular | 70% | blur 22 sat 180% | Sheet 背后 |
  | thick | 84% | blur 28 sat 180%（上限 30） | 大浮层 |
  | glass regular | 58% | blur 18 sat 180% brightness 1.06 | 画布上的胶囊 |
  | glass regular-large | 80% | blur 28 | 菜单、弹出 |
  | pane-static | 不透明 | 无 | 侧栏、检查器、底栏 |

### 3.3 组件规范

| 组件 | 规范 |
|---|---|
| 按钮 | 五种样式。Filled：强调色底、白字。Tinted：强调色 20% 底、强调色字。Gray：fill-tertiary 底。Plain：只有强调色文字。Glass：放在工具栏里。<br>尺寸：小 24/r6，常规 28/r8，大 36 胶囊，XL 44 玻璃胶囊。<br>按下时 scale .97，用 spring-press 回弹；禁用时透明度 .4；破坏性操作用红字或红色着色。 |
| 分段控件 | 轨道 fill-tertiary（r9，高 30，密集模式 26）；滑块用 raised 底色（r7）加阴影。<br>每段要么全是文字要么全是图标，不超过 6 段。滑块用 bouncy 弹簧移动 550ms，移动时放大到 1.06×1.1（拾起成玻璃）。<br>←/→ 键切换；role 为 tablist 或 radiogroup。 |
| 开关 | 轨道 42×24，旋钮是 26×20 的胶囊，打开时位移 12。打开色用 `--switch-on`：中性调色板是绿色，用户调色板跟随强调色。<br>按住时旋钮变宽到 30、变半透明（玻璃化）。多选列表仍用复选框。 |
| 滑块 | 轨道 4px，用强调色显示进度；旋钮是 26×16 的胶囊，拖动时放大 1.35 并变半透明；右侧配数值框。 |
| 步进器/数值框 | 高 26，r7，fill-tertiary 底，数字右对齐。框内有 X/Y 轴字母，颜色同画布坐标轴。<br>悬停或聚焦时在框内末端显示 −/+（各 20px），替换现在 14px 宽的步进列。↑↓ 键 ±1，Shift ×10。在标签上拖动可以调值。表达式输入保留。 |
| 列表行（inset grouped） | 卡片：r12，左右外边距 8。行：最小高 36，内边距 12，标签在前（主色），控件在后。<br>分隔线是发丝线，左侧内缩 12（行带图标时 40）。<br>组头在卡片外：折叠箭头、图标、13/600 标题，后面是启用开关和 ⋯ 菜单（替换原来 7 个图标的工具行）。<br>组脚：11px 次要色。带 › 的行可以下钻到子页，顶部有返回按钮。 |
| 树/侧栏行 | 高 30，r8，图标 16px 用强调色。窗口聚焦时选中行填满强调色、白字；失焦时用 fill-2。悬停时末端显示 👁/🔒。展开/折叠用箭头。 |
| 搜索框 | 胶囊，高 30，fill-tertiary 底，放大镜在前；有内容时显示清除按钮。Ctrl+F 聚焦。按范围筛选放到筛选菜单里。 |
| 菜单/弹出 | glass regular-large，r16，内边距 6；菜单项高 30、r10，图标 16（同组要么都有要么都没有），快捷键在末端用次要色。<br>悬停用 fill-secondary，不再整行填强调色。<br>从锚点按钮出现（`transform-origin` 设为锚点），410ms 弹簧；关闭用 120ms 淡出。 |
| Sheet | r26，宽 600/860，居中；遮罩浅色 22%、深色 48%。头部：取消在前、标题居中、完成在后（Filled）。<br>进入：translateY 24 + scale .98 + 透明度，spring-sheet 450ms。“创建对象”带 grabber 和停靠高度。 |
| Toast | 玻璃胶囊，高 40，位于工具栏下方居中；图标放在彩色圆里。2.4s 后消失，最多叠 2 条，`aria-live=polite`。 |
| 工具栏/标签胶囊 | 组高 36，内按钮高 32 的胶囊（同心），图标 16–18。“运行”是唯一的着色主按钮，运行中变绿并切换为暂停图标；“停止”只在运行时可用。 |
| 检查器分组 | 顺序：Transform → 物理 → 渲染 → 连接（有连接时才展开）→ “对象设置”（标签、图层，默认折叠）。刚体类型改用分段控件（静态/运动学/动态）。 |

### 3.4 视觉效果、动效与性能

**液态玻璃（`.nv-glass`）的组成**：

- 着色底：Regular 或 Clear。
- `backdrop-filter`：只在 live 状态下开启。
- `box-shadow` 边缘光：顶部亮线、底部弱亮线、0.5px 描边。
- `::before` 折射环：1px 渐变，用 `mask-composite: exclude` 只画在边缘上，左上和右下更亮，模拟透镜边缘。
- `::after` 镜面高光：sheen 渐变，加一个跟随指针的径向高光（`--gx/--gy`，用 rAF 节流，只在悬停时更新，模拟“从内部被点亮”）。
- 按压形变：`scale: 1.035 .965`，用 spring-press 弹回。
- 自适应阴影：放在文字或画布上时用 `--glass-shadow-over-text`。

P2 可选的真实折射：Chromium 支持 `backdrop-filter: url(#lens)`（feDisplacementMap），只用在工具栏分段控件的拖动瞬间，只在 quality 档开启，不能出现在画布上。

**动态模糊**：

- 滚动边缘：`mask-image` 渐变，配合 `animation-timeline: scroll(self)`，用 `@property --edge` 从 0 过渡到 22px。只有内容滚动后头部下方才出现渐隐，不需要任何 backdrop-filter。
- 物化（materialize）：弹出层自身做 `filter: blur(8px)→0` + scale .86→1 + 透明度，只作用在小元素上，动画结束后移除。
- 运动模糊过渡（P2）：Sheet 移动的前 60% 套一个 SVG `feGaussianBlur stdDeviation="0 4"`（纵向模糊），减少动态效果或 Play 时关闭。

**弹簧**（阻尼振子采样成 CSS `linear()`，旧引擎回退到 cubic-bezier）：

| 名称 | 响应 / 回弹 | 稳定时间 | 用途 |
|---|---|---|---|
| press | 0.24 / 0.18 | 260ms | 按下回弹 |
| control | 0.30 / 0.10 | 260ms | 状态切换 |
| panel | 0.36 / 0 | 410ms | 面板、菜单 |
| sheet | 0.46 / 0.06 | 450ms | Sheet |
| bouncy | 0.50 / 0.30（过冲 4.6%） | 550ms | 开关旋钮、分段滑块、Toast |

所有动画都可以中途打断；退出比进入快（120ms）。

**性能预算**（Chromium 中每个 backdrop-filter 都是一个独立渲染面，背后内容一变就要重新读回像素并模糊；画布每帧都变）：

1. 常驻 live 玻璃层 ≤5 个，只放在画布上的小控件上，总面积 ≤ 视口的 8%。控件 blur ≤24px，菜单 ≤30px。
2. 侧栏、检查器、底栏用 pane-static（无滤镜）。画布不延伸到面板下方，所以面板背后只有静态窗口背景。“背景延伸”效果（P2）在编辑器空闲时用画布 1/16 的降采样快照模拟，Play 时不做。
3. Play/暂停时 `.editor-root[data-play-mode]` 把 `--glass-filter` 设为 none（只保留着色）。视口浮层在 1.5s 无指针移动后淡出，指针一动就回来。运行中打开的菜单用不透明底。
4. 不对 backdrop-filter 本身做动画，也不叠玻璃；`will-change` 只在过渡期间加。
5. 新增 `data-glass=live|static|off`：low-end 档或窗口失焦时为 static，降低透明度时为 off。
6. 编辑器空闲时没有无限循环的动画，保持“空闲每帧不重渲染”。
7. 验收：
   - 新增 `verify-2642-glass-budget`：Play 时计算样式 `backdropFilter≠none` 的元素数为 0，编辑时 ≤5。
   - 用 latency probe 在 240Hz 下对比玻璃开和关：提交数下降 ≤2%（≥228/s），p95 帧时间增加 ≤0.3ms。
   - 用 DevTools 的 Paint flashing 确认 Play 时面板不发生重绘。

**无障碍回退**：

- 减少透明度：所有材质变为不透明，次要标签提到 76%。
- 增加对比度：不透明、加 1.5px 对比边框，字段带边框。
- 减少动态效果：时长 ≤150ms、线性曲线，无过冲、无形变、无指针高光。
- 键盘：
  - F6 在工具栏 → 侧栏 → 画布 → 检查器 → 底栏之间循环。
  - 树用 roving tabindex。
  - 菜单支持 ↑↓、Esc，关闭后焦点回到锚点。
  - 焦点环改为 3px `box-shadow`，跟随圆角。
- 中、英、德三语的所有新文案进 i18n。

## 4. 逐文件改造清单（分批交付）

**P0 · 批次 1：Token 与基础件（不改布局，可单独发布）**

- `src/ui/tokens.css`：用 tokens-ios.css 替换；变量名全部兼容。
- `src/store/preferences.ts`：
  - 登记 neutral 两个调色板；
  - 新增“降低透明度”设置，写 `data-reduce-transparency`；
  - 写 `data-glass`；
  - 新增 `--switch-on` 规则。
- `src/i18n.ts`：新增文案（中/英/德）。
- `src/ui/editor.css`：
  - 按钮四种样式与尺寸；
  - 字段去掉边框，改用 fill；
  - 焦点环改为 box-shadow；
  - `.nv-glass` 加折射环、高光、按压形变和 live/static 两态；
  - 菜单 r16/项 r10，悬停改为 fill；
  - `.ui-property-section` 改为 inset 卡片；
  - 滚动边缘遮罩。
- `src/ui/forms.css`：数值框、轴字母、内嵌 ± 按钮。
- `src/ui/motion.css`：开关、滑块胶囊旋钮，分段滑块的弹簧，materialize 动画；Play 时去掉滤镜。
- `src/ui/motion.ts`：WAAPI 的时长和曲线读新的弹簧 token；读到 reduced 时去掉 blur 关键帧。
- `src/ui/components/UiToggle/UiSlider/UiTabs/UiMenu/UiDialog/UiButton.vue`：
  - UiTabs 增加 segmented 变体（滑块）；
  - UiDialog 改为 sheet 头部（取消/完成）；
  - UiButton 增加 variant 和 size 两个属性。
- `src/layout/EditorLayout.vue`：Play 时视口浮层空闲 1.5s 后淡出；新增 `verify-2642-glass-budget` 脚本（放在 `scripts/`）。

**P1 · 批次 2：窗口结构**

- `TopBar.vue`：
  - 改为三区工具栏；
  - 菜单收进应用菜单，按 Alt 显示菜单栏；
  - 标题和副标题，文档菜单；
  - 撤销/重做分组；
  - 工具栏透明。
- `WorkspaceBar.vue`：分段控件，窄宽度时改为弹出菜单；命令改为搜索胶囊。
- `ActionBar.vue`：运行/单步/停止三合一，运行为着色主按钮。
- `SideBar.vue`：并入 `SceneSideBar` 顶部的导航分组（不再是独立栏）。
- `SceneSideBar.vue`：
  - 浮动面板；
  - 侧栏标题和创建按钮；
  - 场景和层级两个分组（标题可折叠）；
  - 去掉页脚面包屑；
  - 新的行样式和选中态。
- `StatusBar.vue`：删除可见部分，只保留 live region；状态改到标题副标题和底栏胶囊。
- `EditorLayout.vue`：
  - 三列网格；
  - 面板停靠/浮层两态，容器查询断点；
  - F6 区域循环；
  - 视口浮层重排（竖排工具胶囊，只有一个场景时隐藏场景标签）。
- `ToolBar.vue`：改为竖排胶囊。
- `SceneTabs.vue`、`LayerBar.vue`：胶囊尺寸统一为 36/32。
- `EditorBottomPanel.vue`：分段标签、grabber 停靠高度、收起为胶囊、资源网格的新瓦片样式。
- `ConfigPanel.vue`：
  - 头部改为两行，新增筛选菜单；
  - 组件工具行改为 ⋯ 菜单加启用开关；
  - 刚体类型改用分段控件；
  - 原生 ▶ 改为下钻行；
  - 标签不换行（缩写放到 tooltip）。

**P2 · 批次 3：外围与润色**

- `ProjectManager.vue`：Large Title，最近项目改为 inset 列表，XL 玻璃按钮；新建项目改为 Sheet（模板列表、右侧预览）。
- `SettingsPanel.vue`：采用 iOS 设置的“侧栏分区 + inset 组”结构（26.41 的分组行可以直接沿用）。
- `CommandPalette.vue`、`ContextMenu.vue`、`EditorFeedback.vue`（Toast）、`CreateObjectPalette.vue`（带停靠高度的 Sheet）、`ConfirmDialog.vue`。
- 可选增强：真实透镜折射、背景延伸快照、运动模糊过渡、按画布亮度翻转胶囊明暗（渲染器空闲时给出顶部区域的平均亮度）。
- 不改动：`WorldCanvas` 渲染、Player 和 Runtime 的代码路径，以及 `src/assets/main.css`（它只给 Player 用）。

每批验收：`vue-tsc`、`verify-2641-editor-ui`，三语 × 浅/深色 × 高对比/减少动态截图，宽度 1100/1280/1600。

## 5. 风险

- 透明标签在用户自定义调色板上的对比度可能不足。对策：调色板注册时自动校验，低于 4.5:1 时回退为不透明混色。
- `linear()` 需要 Chromium 113 以上，WebView2 常青版满足；回退到 cubic-bezier 时不影响功能。
