# 26.28 媒体实现与针对性验证

## 修改前影响检查

时间轴预览和导出播放器共用 `TimelineRuntime`。本次修复必须同时作用于两者，不能另建预览时钟。检查发现：嵌套片段的淡入淡出原来没有传给子动画/音频；非循环结束帧只允许直接动画保持姿态；倒放从嵌套片段外侧进入结束边界会漏派发边界命令。修复保留事件与姿态的独立遍历、显式定位不派发事件、整数媒体时钟和既有工作量上限。

试听音频本来使用独立 AudioRuntime，但面板的 M/S 修改项目设置。保留这些作者开关，新增明确标记的试听覆盖，覆盖仅交给独立试听运行时。设置归一化返回副本，项目序列化与撤销历史不接触试听覆盖；选中音频切换/面板释放时覆盖清除。默认无覆盖，原有混音与导出不变。

## 每个修改文件

- `src/runtime/timeline.ts`：父级淡入淡出权重逐层乘到子动画和音频；非循环时间轴末端继续评估嵌套最终动画姿态；倒放进入子片段末端时包含该起始边界，后续半开区间不重复；定位继续保持命令静默。
- `src/editor/audioAudition.ts`：新增试听专属 mute/solo 覆盖和纯配置复制函数；configure/tick 使用副本；dispose 清除覆盖并返回释放 Promise，供调用者等候资源真正关闭。
- `src/editor/audioAuthoringCopy.ts`：新增 EN/DE/ZH 试听/作者区别、说明和重置文案。
- `src/components/PresentationPanel.vue`：保留保存/导出的作者 M/S，新增每总线试听静音、独奏与全局重置；pressed 状态和可访问名称；总线长名称独占一行、可换行；混音标题保持可见。试听切换不调用 commitAudio。
- `src/components/AnimationPanel.vue`：当前资源、轨道绑定和选中时间轴片段可展开查看完整路径并选择复制；传输工具在工作区滚动时固定于顶端，保持专用标尺和编辑器。
- `scripts/verify-v26.28-media.mjs`：六项真实产品模块语义检查；媒体宿主桩仅提供可观察播放状态，所有时间轴、动画采样、增益和释放逻辑使用产品代码。支持正式版本身份与独立报告路径。
- `docs/MEDIA_26_28.md`：记录影响、文件清单、验证命令、结果与能力边界。

## 本地 Godot 参考与边界

针对性阅读 `godot-master/editor/animation/animation_player_editor_plugin.cpp` 的 `_update_playback_tooltips` 和临时播放器维护，以及 `godot-master/editor/audio/editor_audio_buses.cpp` 的 `_solo_toggled`、总线名称同步和峰值提示。其明确的播放状态提示、独立预览生命周期和通过 undo/redo 提交作者总线设置值得保留。Nova_A 采用明确的作者/试听两组控制与可展开绑定信息；没有复制 Godot 源码，也不声称完全具有 Godot AnimationTree、任意音频插件、全平台音频驱动或硬件采样精度。

## 实际检查结果

- `node scripts/verify-v26.28-media.mjs --development --report=release-audits/v26.28-media-development.json`：六项通过（2026-09-26）。验证嵌套父级淡入淡出与无漂移往返定位、结束姿态、两级权重相乘、倒放边界与定位事件、嵌套音频增益与采样、试听隔离/重置/暂停定位/资源释放。
- `node scripts/verify-v26.16-animation-audio.mjs --qualification-release=26.28 --report=release-audits/v26.28-media-retained-development.json`：49 项通过；真实26.28源码执行已有关键动画/音频合约，不把旧版本结果当成本版结果。
- 冻结后正式命令：`node scripts/verify-v26.28-media.mjs --qualification-release=26.28`，默认报告 `release-audits/v26.28-media.json`。正式资格由父任务统一执行并记录，以上开发结果不替代冻结资格。

没有重复无关模板、渲染性能或旧版完整布局矩阵。本次只修改共享时间轴、独立试听和对应面板。实际扬声器音质、声卡 underrun、辅助设备以及实体移动端播放仍须设备观察，宿主桩和浏览器操作都不构成设备认证。

## 浏览器集成后的布局修正
实际720×800、200%字号检查发现创建按钮过度换行、工作区被挤成细条和固定36px传输网格行溢出。最终CSS保留完整单行创建动作（可横向访问），工作区最小360px并允许工作室滚动；窄屏传输不固定，时间轴传输行采用max-content，轨道及属性显式分行。开发六面板样本的控件可达与传输不覆盖时间轴断言通过；最终门禁仍执行完整54个关联表面，不把此前仅可点击的旧构建结果当作视觉通过。
