# Nova_A 26.26 — 全 Vue 面板与条件状态源码清单

覆盖 85 个 src/**/*.vue；直接解析完整模板及各 scoped/global style 块。所有条件分支都保留；空/加载/错误/有数据标签只是源码索引，不能证明分支运行过。

本清单不声称逐一点击了所有面板，不将未出现显式 loading/error 分支解释为该能力已通过。浏览器证据仅来自独立的26.26定向用户报告。原生文件选择、设备输入、权限拒绝、远端服务和各操作系统外观仍需对应真实环境。

## 责任与发现

- P26-01（已修复；PhysicsSettingsPanel）：材料/符合性表格只按 viewport 折叠，窄宿主仍保留双栏；现按640px容器宽度折叠，材料名称和结果可换行。碰撞矩阵保留二维滚动。
- P26-02（已修复；WorldToolsPanel）：根滚动内再套35%高度状态滚动和左右表单滚动；状态与表单改为整页滚动，保留世界专用字段。窄宽度不再隐藏工具说明。
- P26-03（已修复；editorReadability.css）：面板说明及错误消息允许长路径换行，保持控件焦点滚动边距，不覆盖轨道和画布。
- P26-04（已修复；SceneSideBar、SceneTabs、TeamWorkflowPanel）：名称选择、非活动场景关闭、变更记录选择原先依赖非原生点击；现为兄弟或独立原生按钮，Enter/Space由浏览器提供，停止冒泡避免重复选择。定向键盘用户检查另有证据。剩余3个候选已分类：ContextMenu仅阻止冒泡、EditorLayout为空白区关闭菜单、SceneSideBar整行点击是名称按钮的冗余鼠标入口；不要求把容器本身另设为按钮。
- P26-05（负责人：26.26 资源/库实施分工）：Assets/Library/import/package 的修改与运行证据由对应资源模块报告覆盖；本清单同时枚举这些组件，避免把专门模块排除。

## Godot 对照（本地源码）

`godot-master/editor/docks/dock_tab_container.cpp:375–394` 在不同拖放方向设置170×EDSCALE最小尺寸，并分别给另一轴 EXPAND_FILL；`editor_dock_manager.cpp:982–1017` 让位置标签/浮动和关闭按钮参与容器分配。采用的原则是按宿主容器尺寸布局、让文字和控制共同扩展，不把图形画布改成通用表单。没有复制第三方实现。

## src/App.vue

- 责任/宿主：application entry / runtime mounting; src/App.vue
- 扩展：Local maximize/expand source exists; inspect host policy.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 无；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 3 | template v-if | mode === 'editor' |
| 5 | ProjectManager v-if | projectManager.visible |
| 6 | EditorLayout v-else | (fallback) |
| 7 | ManualViewer v-if | manualViewerState.visible |
| 8 | StudioStatusDialog v-if | studioStatusState.visible |
| 9 | ErrorRecovery v-if | faultCenterState.activeFatal |
| 10 | RecoveryCenter v-if | recoveryState.visible |
| 11 | WorkspaceManager v-if | editorState.workspaceManagerOpen |
| 12 | ShortcutEditor v-if | editorState.shortcutEditorOpen |
| 13 | UndoHistoryPanel v-if | editorState.undoHistoryOpen |
| 14 | ExternalChangeDialog v-if | externalChangeState.visible |
| 18 | PlayerApp v-else-if | mode === 'player' |
| 19 | div v-else | (fallback) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| 宿主共享样式 | 无本地相关声明 |

## src/PlayerApp.vue

- 责任/宿主：src/App.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=2；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 2；有数据循环 1。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | WorldCanvas v-if | ready && !headless |
| 5 | section v-else | (fallback) |
| 10 | button v-if | runtimeInstance |
| 12 | aside v-if | runtimeInstance && networkInspectorOpen |
| 25 | div v-if | runtimeInstance.logScope |
| 27 | p v-if | networkState?.lastError |
| 28 | p v-else-if | networkInspectorError |
| 31 | p v-if | !instanceLogs.length |
| 32 | ol v-else | (fallback) |
| 33 | li v-for | entry in instanceLogs |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .player-root (base) | overflow:hidden |
| .player-status p (base) | max-width:520px |
| .network-inspector-toggle (base) | min-height:34px; max-width:min(280px, calc(100vw - 24px)) |
| .runtime-network-inspector (base) | max-height:min(70vh, 520px); overflow:auto |
| .runtime-network-inspector header span (base) | min-width:0 |
| .runtime-network-inspector header button (base) | min-width:30px |
| .runtime-network-inspector dl div (base) | min-width:0; min-height:30px; grid-template-columns:minmax(90px, .8fr) minmax(0, 1.2fr) |
| .runtime-network-inspector dd (base) | min-width:0 |
| .runtime-network-inspector code (base) | white-space:normal |
| .runtime-log (base) | min-width:0 |
| .runtime-log ol (base) | max-height:156px; overflow:auto |
| .runtime-log li (base) | min-width:0; grid-template-columns:auto auto minmax(0, 1fr) |
| .runtime-log span (base) | min-width:0 |
| .runtime-network-inspector (@media (max-width: 520px)) | max-height:calc(100vh - 68px - env(safe-area-inset-bottom)) |

## src/components/AccessibilityEvidencePanel.vue

- 责任/宿主：src/components/PresentationPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=2；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 1；加载/等待 0；错误/诊断 2；有数据循环 2。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 21 | p v-if | !snapshot.nodes.length |
| 22 | li v-for | note in nativeAccessibilityState.capabilities.notes |
| 23 | article v-for | issue in snapshot.issues.slice(0,20) |
| 25 | p v-if | nativeAccessibilityState.error |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .semantic-card header div (base) | min-width:0 |
| .semantic-card header>span (base) | white-space:nowrap |
| dl (base) | grid-template-columns:repeat(auto-fit,minmax(110px,1fr)) |
| .semantic-card article (base) | grid-template-columns:minmax(150px,.4fr) 1fr |
| .actions button (base) | min-height:31px |

## src/components/ActionBar.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=4；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| — | 静态模板 | 无条件分支；检查宿主挂载条件 |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .actionbar (base) | min-width:0 |
| button (base) | overflow:hidden |
| .mode-label (base) | min-width:66px; max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |

## src/components/AndroidDeliveryPanel.vue

- 责任/宿主：src/components/BuildSettingsPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=5, input=4, select=2, summary=4；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 2；有数据循环 4。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 37 | button v-if | !packageReady |
| 38 | span v-for | [name,ready] in gates |
| 39 | p v-if | androidDeliveryState.status.missing.length |
| 40 | article v-for | permission in ANDROID_PERMISSIONS |
| 40 | input v-if | permission.purposeRequired&&hasPermission(permission.id) |
| 40 | p v-for | issue in permissionIssues |
| 42 | option v-for | device in androidDeliveryState.devices |
| 43 | details v-if | androidDeliveryState.output |
| 44 | p v-if | androidDeliveryState.error |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .android-delivery>header div (base) | min-width:0 |
| .package-row>span (base) | min-width:150px |
| .android-delivery button (base) | min-height:30px |
| .permissions (base) | grid-template-columns:repeat(auto-fit,minmax(230px,1fr)) |
| .permissions article (base) | min-width:0 |
| .permissions label span (base) | min-width:0 |
| .android-delivery pre (base) | max-height:210px; overflow:auto; white-space:pre-wrap |
| .device-row select (base) | min-width:180px |
| .signing (base) | grid-template-columns:1fr 1fr |
| .permissions,.signing (@media (max-width:560px)) | grid-template-columns:1fr |
| .device-row select (@media (max-width:560px)) | min-width:100% |

## src/components/AnimationPanel.vue

- 责任/宿主：src/components/EditorBottomPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=78, input=82, select=39, textarea=1, summary=13；直接键盘绑定 3；非原生点击候选 0。
- 状态索引：空/选择条件 22；加载/等待 0；错误/诊断 8；有数据循环 79。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 15 | option v-for | asset in studioAssets |
| 21 | div v-if | document |
| 23 | span v-if | draftConflict |
| 24 | button v-if | draftDirty |
| 25 | template v-if | clip \|\| controller \|\| timeline |
| 25 | button v-if | previewActive |
| 25 | label v-if | previewActive && !controller |
| 26 | template v-if | previewActive && timeline |
| 26 | button v-if | previewActive |
| 26 | p v-if | runtimeRecording.limited |
| 27 | p v-if | status |
| 27 | p v-if | studio.recordMode |
| 27 | p v-if | studio.recordIssue |
| 28 | details v-if | draftInspection.issues.length |
| 28 | p v-for | issue in draftInspection.issues.slice(0,100) |
| 30 | nav v-if | document |
| 31 | button v-for | mode in visibleModes |
| 34 | div v-if | clip && (studio.view === 'dope' \|\| studio.view === 'curve') |
| 44 | option v-for | mode in tangentModes |
| 51 | button v-for | (track, index) in clip.tracks |
| 65 | main v-if | studio.view === 'dope' |
| 67 | i v-for | tick in rulerTicks |
| 71 | article v-for | (track, trackIndex) in clip.tracks |
| 72 | button v-for | (keyframe, keyIndex) in track.keyframes |
| 74 | button v-for | (event, index) in clip.events |
| 76 | div v-if | selectionBox |
| 79 | main v-else | (fallback) |
| 80 | svg v-if | activeTrack |
| 81 | line v-for | x in 11 |
| 81 | line v-for | y in 9 |
| 82 | g v-if | clip.onionSkin |
| 82 | circle v-for | sample in onionSamples |
| 82 | line v-for | sample in onionSamples |
| 84 | circle v-for | (keyframe, index) in activeTrack.keyframes |
| 86 | aside v-if | selectedKeys[0] |
| 90 | option v-for | mode in tangentModes |
| 91 | option v-for | mode in interpolationModes |
| 92 | option v-for | mode in easingModes |
| 93 | label v-if | selectedKeys[0].keyframe.tangentMode === 'Free' |
| 97 | PanelResizeHandle v-if | !propertiesStacked |
| 97 | PanelResizeHandle v-else | (fallback) |
| 98 | details v-if | editingToolsOpen |
| 99 | template v-if | activeTrack |
| 101 | option v-for | property in properties |
| 102 | option v-for | entity in entities |
| 106 | label v-for | (event, index) in clip.events |
| 107 | label v-for | (marker, index) in clip.markers |
| 108 | article v-for | (track, trackIndex) in clip.commandTracks |
| 108 | option v-for | entity in entities |
| 108 | label v-for | (command,index) in track.commands |
| 109 | label v-for | (frame, index) in clip.spriteFrames |
| 109 | option v-for | asset in imageAssets |
| 111 | article v-for | issue in selectedAnimationIssues |
| 111 | p v-if | !selectedAnimationIssues.length |
| 115 | div v-else-if | controller |
| 118 | article v-for | (layer, index) in controller.layers |
| 119 | option v-for | asset in maskAssets |
| 119 | option v-for | candidate in controller.layers.filter(candidate=>candidate.id!==layer.id) |
| 119 | button v-if | index |
| 122 | label v-for | (parameter,index) in controller.parameters |
| 122 | input v-if | parameter.type === 'Float' \|\| parameter.type === 'Integer' |
| 122 | input v-else | (fallback) |
| 125 | line v-for | transition in controller.transitions |
| 126 | button v-for | state in controller.states |
| 126 | small v-if | state.blendTree |
| 129 | PanelResizeHandle v-if | !propertiesStacked |
| 129 | PanelResizeHandle v-else | (fallback) |
| 130 | template v-if | selectedState |
| 133 | option v-for | asset in clipAssets |
| 135 | option v-for | parameter in numericParameters |
| 140 | template v-if | selectedState.blendTree |
| 140 | option v-for | parameter in numericParameters |
| 140 | label v-if | selectedState.blendTree.type==='2D' |
| 140 | option v-for | parameter in numericParameters |
| 140 | label v-for | (child,index) in selectedState.blendTree.children |
| 140 | option v-for | asset in clipAssets |
| 140 | input v-if | selectedState.blendTree.type==='1D' |
| 140 | template v-else | (fallback) |
| 143 | article v-for | item in runtimeInspection |
| 143 | span v-for | layer in item.layers |
| 143 | p v-if | !runtimeInspection.length |
| 146 | article v-for | (transition,index) in controller.transitions |
| 146 | option v-for | state in controller.states |
| 146 | option v-for | state in controller.states |
| 146 | option v-for | value in interruptions |
| 146 | input v-if | transition.hasExitTime |
| 146 | option v-for | value in transitionSyncModes |
| 146 | label v-if | transition.syncMode==='Marker' |
| 146 | label v-for | (condition,conditionIndex) in transition.conditions |
| 146 | option v-for | parameter in controller.parameters |
| 146 | option v-for | operator in conditionOperators |
| 146 | input v-if | condition.operator !== 'trigger' |
| 152 | div v-else-if | rig |
| 153 | button v-for | bone in rig.bones |
| 153 | button v-for | chain in rig.ikChains |
| 153 | button v-for | constraint in rig.constraints |
| 153 | button v-for | attachment in rig.attachments |
| 154 | g v-for | bone in rig.bones |
| 154 | g v-for | chain in rig.ikChains |
| 155 | PanelResizeHandle v-if | !propertiesStacked |
| 155 | PanelResizeHandle v-else | (fallback) |
| 155 | template v-if | selectedBone |
| 155 | option v-for | bone in parentBoneOptions |
| 155 | template v-if | selectedIk |
| 155 | option v-for | asset in rigAssets.filter(asset=>asset.uuid!==selectedGuid) |
| 155 | article v-if | retargetSummary |
| 155 | small v-if | retargetSummary.missing.length |
| 155 | details v-if | rig.attachments.length |
| 155 | label v-for | attachment in rig.attachments |
| 155 | option v-for | bone in rig.bones |
| 158 | div v-else-if | skin |
| 158 | option v-for | asset in rigAssets |
| 158 | option v-for | bone in linkedRig?.bones \|\| [] |
| 158 | p v-if | autoWeightMessage |
| 158 | polygon v-for | (triangle,index) in skinTriangles |
| 158 | circle v-for | (point,index) in weightHeat |
| 158 | article v-for | (vertex,index) in skin.vertices |
| 158 | option v-for | bone in linkedRig?.bones \|\| [] |
| 160 | div v-else-if | timeline |
| 161 | option v-for | type in timelineTypes |
| 162 | div v-for | (track,index) in timeline.tracks |
| 163 | i v-for | tick in timelineRulerTicks |
| 163 | button v-for | marker in timeline.markers |
| 163 | article v-for | (track,trackIndex) in timeline.tracks |
| 163 | button v-for | (item,index) in track.clips |
| 164 | PanelResizeHandle v-if | !propertiesStacked |
| 164 | PanelResizeHandle v-else | (fallback) |
| 164 | template v-if | activeTimelineTrack |
| 164 | label v-for | (marker,index) in timeline.markers |
| 164 | option v-for | marker in timeline.markers |
| 164 | option v-for | marker in timeline.markers |
| 164 | template v-if | activeTimelineClip |
| 164 | label v-if | activeTimelineTrack?.type==='Camera' |
| 164 | option v-for | entity in entities |
| 164 | select v-if | activeTimelineTrack?.type==='Visibility' |
| 164 | input v-else | (fallback) |
| 164 | label v-if | timelineCompatibleAssets.length \|\| activeTimelineClip.asset |
| 164 | option v-for | asset in timelineCompatibleAssets |
| 164 | label v-if | activeTimelineTrack?.type==='Subtitle' |
| 164 | label v-if | activeTimelineTrack?.type==='Subtitle' |
| 164 | p v-for | issue in timelinePresentationState.diagnostics |
| 164 | strong v-if | timelinePresentationState.longTimelineWarning |
| 164 | article v-for | item in cinematicIssues |
| 167 | div v-else-if | mask |
| 167 | label v-for | property in properties |
| 168 | div v-else | (fallback) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .animation-studio (base) | min-width:0; min-height:180px; overflow:hidden |
| button,select,input,textarea (base) | min-width:0 |
| .studio-toolbar,.transport (base) | min-height:43px |
| .studio-toolbar button,.transport button,.studio-modes button,.animation-studio select (base) | min-height:30px |
| .studio-modes (base) | min-height:34px |
| .studio-modes button (base) | min-height:27px |
| .clip-workspace (base) | min-height:0; grid-template-columns:210px minmax(360px,1fr) 220px; overflow:hidden |
| .track-list,.clip-inspector,.controller-sidebar,.state-inspector,.rig-list,.rig-inspector,.timeline-inspector (base) | min-width:0; overflow:auto |
| .track-list header,.controller-sidebar header,.rig-list header (base) | min-height:30px |
| .track-list>button,.rig-list>button (base) | min-height:45px |
| .special-track (base) | min-height:31px |
| .dope-sheet,.curve-editor (base) | min-width:0; min-height:0; overflow:auto |
| .curve-editor svg (base) | min-width:620px |
| .clip-inspector button,.state-inspector button,.rig-inspector button,.timeline-inspector button (base) | min-height:29px |
| .event-edit (base) | grid-template-columns:60px 1fr 1fr 24px |
| .frame-edit (base) | grid-template-columns:1fr 60px 24px |
| .controller-workspace,.rig-workspace,.skin-workspace,.sequencer (base) | min-height:0; grid-template-columns:220px minmax(340px,1fr) 250px; overflow:hidden |
| .layer-card (base) | grid-template-columns:1fr auto |
| .parameter-row (base) | grid-template-columns:1fr 72px 25px |
| .state-machine (base) | min-height:0; overflow:auto |
| .state-node (base) | min-height:42px |
| .transition-card (base) | grid-template-columns:1fr auto 1fr |
| .rig-canvas (base) | min-height:0 |
| .skin-workspace (base) | grid-template-columns:220px 1fr |
| .skin-workspace main (base) | overflow:auto |
| .skin-workspace article (base) | min-height:38px; grid-template-columns:36px 70px 70px 1fr 70px |
| .sequencer>aside:not(.timeline-inspector) (base) | overflow:auto |
| .sequencer>aside>button (base) | min-height:42px |
| .sequencer main (base) | min-width:0; overflow:auto |
| .sequence-lane button (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .timeline-inspector textarea (base) | min-height:60px; resize:vertical |
| .mask-workspace (base) | overflow:auto |
| .mask-workspace label (base) | min-height:36px |
| .parameter-row (base) | grid-template-columns:1fr 72px 60px 25px |
| .condition-row (base) | grid-template-columns:1fr 52px 58px 24px |
| .command-track>header select (base) | min-width:0 |
| .empty p (base) | max-width:420px |
| .skin-workspace aside>button (base) | min-height:32px |
| .blend-child (base) | grid-template-columns:minmax(70px,1fr) repeat(3,minmax(42px,58px)) 24px |
| .timeline-marker (base) | min-width:22px |
| .timeline-marker-row (base) | grid-template-columns:96px minmax(96px,1fr) 34px 24px |
| .timeline-marker-row input (base) | min-width:0 |
| .clip-workspace (@container nova-animation (max-width:900px)) | grid-template-columns:170px minmax(300px,1fr) |
| .controller-workspace,.rig-workspace,.sequencer (@container nova-animation (max-width:900px)) | grid-template-columns:180px minmax(320px,1fr) |
| .animation-studio (base) | container:nova-animation/inline-size |
| .studio-toolbar>* (base) | max-width:100% |
| .asset-select (base) | min-width:min(180px,100%) |
| .studio-modes button,.create-menu button,.transport button (base) | white-space:normal |
| .clip-inspector,.key-inspector,.state-inspector,.rig-inspector,.timeline-inspector,.controller-sidebar (base) | container:nova-animation-fields/inline-size |
| .animation-studio input,.animation-studio select (base) | max-width:100% |
| .clip-workspace (@container nova-animation (max-width:1000px)) | grid-template-columns:170px minmax(0,1fr); overflow:auto |
| .clip-inspector (@container nova-animation (max-width:1000px)) | max-height:340px |
| .controller-workspace,.rig-workspace,.sequencer (@container nova-animation (max-width:1000px)) | grid-template-columns:180px minmax(0,1fr); overflow:auto |
| .state-inspector,.rig-inspector,.timeline-inspector (@container nova-animation (max-width:1000px)) | max-height:360px |
| .state-machine,.rig-canvas,.sequencer main (@container nova-animation (max-width:1000px)) | min-height:280px |
| .skin-workspace (@container nova-animation (max-width:1000px)) | grid-template-columns:180px minmax(0,1fr); overflow:auto |
| .clip-workspace,.controller-workspace,.rig-workspace,.skin-workspace,.sequencer (@container nova-animation (max-width:560px)) | grid-template-columns:minmax(0,1fr) |
| .track-list,.controller-sidebar,.rig-list,.sequencer>aside:not(.timeline-inspector) (@container nova-animation (max-width:560px)) | max-height:200px |
| .dope-sheet,.curve-editor (@container nova-animation (max-width:560px)) | min-height:280px |
| .skin-workspace article (@container nova-animation (max-width:560px)) | grid-template-columns:32px minmax(0,1fr) minmax(0,1fr) |
| .event-edit,.frame-edit,.parameter-row,.condition-row,.blend-child,.timeline-marker-row (@container nova-animation-fields (max-width:280px)) | grid-template-columns:minmax(0,1fr) 32px |
| .transition-card (@container nova-animation-fields (max-width:280px)) | grid-template-columns:minmax(0,1fr) |
| .layer-card (@container nova-animation-fields (max-width:280px)) | grid-template-columns:minmax(0,1fr) |
| .timeline-track-choice (base) | min-width:0; grid-template-columns:minmax(0,1fr) 24px |
| .timeline-track-choice>button (base) | min-width:0; min-height:42px; white-space:normal |
| .authoring-status (base) | max-height:min(260px,35%); overflow:auto |
| .authoring-status button (base) | min-height:32px; white-space:normal |
| .animation-studio :is(.track-list,.controller-sidebar,.rig-list,.clip-inspector,.state-inspector,.rig-inspector,.timeline-inspector,.timeline-structure) (base) | min-height:0 |
| .clip-workspace (base) | grid-template-columns:var(--animation-structure-width) minmax(350px,1fr) var(--animation-properties-width) |
| .controller-workspace,.rig-workspace,.sequencer (base) | grid-template-columns:var(--animation-structure-width) minmax(350px,1fr) var(--animation-properties-width) |
| .track-list>header (base) | min-height:31px |
| .track-list>.numeric-track (base) | min-height:64px |
| .track-list>.numeric-track strong (base) | white-space:normal |
| .track-list (base) | overflow:hidden |
| .track-list-scroll (base) | overflow:auto |
| .track-list-scroll>header (base) | min-height:31px |
| .track-list-scroll>button (base) | min-height:64px |
| .track-list-scroll strong (base) | white-space:normal |
| .clip-workspace (@container nova-animation (max-width:1100px)) | grid-template-columns:var(--animation-structure-width) minmax(350px,1fr); overflow:auto |
| .controller-workspace,.rig-workspace,.sequencer (@container nova-animation (max-width:1100px)) | grid-template-columns:var(--animation-structure-width) minmax(350px,1fr); overflow:auto |
| .clip-inspector,.state-inspector,.rig-inspector,.timeline-inspector (@container nova-animation (max-width:1100px)) | max-height:none |
| .state-machine,.rig-canvas,.sequencer main (@container nova-animation (max-width:1100px)) | min-height:280px |
| .clip-workspace,.controller-workspace,.rig-workspace,.sequencer (@container nova-animation (max-width:650px)) | grid-template-columns:minmax(0,1fr) |
| .track-list,.controller-sidebar,.rig-list,.timeline-structure (@container nova-animation (max-width:650px)) | max-height:200px |
| .curve-editor svg (@container nova-animation (max-width:650px)) | min-height:260px |
| .animation-studio .transport input[type=number] (base) | min-width:96px |

- 键盘 3: keydown → onKeyDown
- 键盘 84: keydown → selectKey(selectedTrack,index,$event)
- 键盘 84: keydown → selectKey(selectedTrack,index,$event)

## src/components/AssetImagePreview.vue

- 责任/宿主：src/components/EditorBottomPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 无；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 1；加载/等待 0；错误/诊断 1；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 5 | span v-if | !ready |
| 6 | span v-if | showError && problem |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .image-preview (base) | min-width:0; overflow:hidden |
| .preview-problem (base) | max-height:100%; overflow:auto |

## src/components/AudioSystemPanel.vue

- 责任/宿主：src/components/EditorBottomPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 无；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| — | 静态模板 | 无条件分支；检查宿主挂载条件 |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .audio-system-panel (base) | min-height:0; overflow:hidden |
| .audio-system-panel (base) | min-width:0 |
| .audio-system-panel :deep(.presentation-panel) (base) | min-width:0 |

## src/components/AutomationStudio.vue

- 责任/宿主：src/components/ManageWorkspace.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=4, input=2, select=1, textarea=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 1；有数据循环 4。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 7 | option v-for | item in templates |
| 10 | label v-for | permission in permissions |
| 12 | p v-if | state.error |
| 12 | p v-else | (fallback) |
| 12 | template v-if | state.lastRunAt |
| 16 | p v-if | !state.diff.length |
| 17 | article v-for | entry in state.diff |
| 21 | p v-if | !state.trace.length |
| 22 | article v-for | (entry,index) in state.trace |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .automation-studio (base) | min-width:0; min-height:0; overflow:auto |
| .studio-header (base) | min-height:86px |
| .studio-header>div (base) | min-width:0 |
| .studio-header .sandbox (base) | max-width:260px |
| .studio-grid (base) | grid-template-columns:minmax(360px,1.2fr) minmax(320px,1fr) |
| .card (base) | min-width:0 |
| .card>header (base) | min-height:31px |
| .authoring textarea (base) | min-height:330px; resize:vertical |
| .authoring input,.authoring select (base) | min-width:0 |
| .permissions label (base) | min-height:28px |
| .actions button (base) | min-height:34px |
| .preview>article (base) | min-width:0; grid-template-columns:26px minmax(90px,.8fr) minmax(90px,1fr) 14px minmax(90px,1fr) |
| .preview>article>div (base) | min-width:0 |
| .preview strong,.preview small,.preview code (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .trace>article (base) | min-width:0; grid-template-columns:68px minmax(0,1fr) auto |
| .trace>article strong (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .studio-grid (@media (max-width:980px)) | grid-template-columns:1fr |
| .authoring textarea (@media (max-width:980px)) | min-height:260px |
| .preview>article (@media (max-width:640px)) | grid-template-columns:26px minmax(0,1fr) 14px minmax(0,1fr) |

## src/components/BuildSettingsPanel.vue

- 责任/宿主：src/components/ManageWorkspace.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=8, input=37, select=12；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 4；加载/等待 1；错误/诊断 3；有数据循环 12。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 6 | button v-for | tab in tabs |
| 10 | section v-if | activeTab === 'overview' |
| 13 | option v-for | preset in BUILTIN_BUILD_PRESETS |
| 15 | option v-for | platform in selectablePlatforms |
| 29 | article v-for | (uuid, index) in buildSettings.sceneOrder |
| 33 | section v-else-if | activeTab === 'platform' |
| 44 | label v-if | buildSettings.platform.signingMode === 'manual' |
| 45 | label v-if | buildSettings.target === 'macos' |
| 47 | p v-if | buildSettings.target === 'android' |
| 48 | AndroidDeliveryPanel v-if | buildSettings.target === 'android' |
| 51 | section v-else-if | activeTab === 'delivery' |
| 67 | option v-if | !compatibleTemplates.some(template => template.id === buildSettings.delivery.exportTemplate) |
| 67 | option v-for | template in compatibleTemplates |
| 67 | label v-if | buildSettings.delivery.deploymentMode === 'remote-hook' |
| 68 | label v-if | buildSettings.delivery.deploymentMode === 'remote-hook' |
| 71 | div v-if | buildSettings.delivery.telemetryEnabled |
| 72 | li v-for | line in privacySummary |
| 77 | section v-else-if | activeTab === 'diagnostics' |
| 79 | article v-for | platform in PLATFORM_SUPPORT_MATRIX |
| 80 | span v-for | contract in RELEASE_CANDIDATE_FREEZE.frozenContracts |
| 81 | article v-for | stage in NOVA_RELEASE_PIPELINE |
| 82 | article v-for | entry in buildHistory |
| 82 | small v-if | entry.cacheKey |
| 82 | p v-if | !buildHistory.length |
| 83 | section v-if | releaseEngineeringState.lastComparison |
| 86 | TeamWorkflowPanel v-else | (fallback) |
| 92 | code v-if | buildProgress.outputPath |
| 93 | article v-for | issue in issues |
| 93 | p v-if | !issues.length |
| 95 | section v-if | pluginBuildContributions.length |
| 95 | span v-for | item in pluginBuildContributions |
| 96 | button v-if | buildSettings.target === 'web' |
| 97 | p v-if | buildSettings.runtimeMode === 'headless-server' |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .build-panel (base) | min-width:0; overflow:hidden; container-type:inline-size |
| .build-header (base) | min-height:48px |
| .build-header>div (base) | min-width:160px |
| .build-header>div p (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .build-header nav (base) | min-width:0; overflow-x:auto |
| .build-header nav button (base) | min-width:max-content; min-height:32px |
| .build-body (base) | min-height:0; grid-template-columns:minmax(420px,1fr) minmax(220px,285px) |
| .build-workspace (base) | min-width:0; min-height:0; overflow:hidden |
| .tab-page (base) | overflow:auto |
| .section-heading (base) | min-height:44px |
| .section-heading>div (base) | min-width:0 |
| .section-heading>button (base) | min-height:30px |
| .target-badge (base) | white-space:nowrap |
| .field-grid (base) | grid-template-columns:repeat(2,minmax(150px,1fr)) |
| .field-grid label (base) | min-width:0 |
| .field-grid input,.field-grid select (base) | min-width:0 |
| .field-grid .check (base) | min-height:32px |
| .scenes-card (base) | overflow:hidden |
| .scenes-card>header,.scenes-card article (base) | min-height:34px; grid-template-columns:28px minmax(100px,1fr) 115px 28px 28px |
| .scenes-card article>strong (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .option-grid (base) | grid-template-columns:repeat(auto-fit,minmax(210px,1fr)) |
| .option-grid label (base) | min-height:56px |
| .compact-fields (base) | max-width:360px |
| .cli-card code (base) | overflow:auto; white-space:nowrap |
| .build-actions (base) | min-width:0; overflow:auto |
| .progress (base) | overflow:hidden |
| .validation-list (base) | max-height:150px; overflow:auto |
| .validation-list article (base) | grid-template-columns:48px 1fr |
| .build-actions>button (base) | min-height:32px |
| .build-body (@container (max-width:720px)) | grid-template-columns:1fr; overflow:auto |
| .build-workspace (@container (max-width:720px)) | min-height:280px; overflow:visible |
| .tab-page (@container (max-width:720px)) | min-height:280px; overflow:visible |
| .field-grid (@container (max-width:720px)) | grid-template-columns:1fr 1fr |
| .field-grid (@container (max-width:480px)) | grid-template-columns:1fr |
| .scenes-card article (@container (max-width:480px)) | grid-template-columns:24px minmax(80px,1fr) 28px 28px |
| .scenes-card article (@container (max-width: 480px)) | grid-template-columns:24px minmax(0, 1fr) 28px 28px |
| .scenes-card article label (@container (max-width: 480px)) | min-height:30px; white-space:normal |
| .scenes-card article > strong (@container (max-width: 480px)) | white-space:normal |
| .readiness-badge (base) | white-space:nowrap |
| .artifact-card (base) | min-height:72px; grid-template-columns:34px minmax(0,1fr) auto |
| .artifact-card div (base) | min-width:0 |
| .artifact-card code (base) | max-width:190px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .artifact-card (@media (max-width:1180px)) | grid-template-columns:34px minmax(0,1fr) |
| .artifact-card code (@media (max-width:1180px)) | max-width:100% |
| .validation-list article (base) | grid-template-columns:48px minmax(0,1fr) 24px |
| .support-matrix,.history-card (base) | overflow:hidden |
| .support-matrix article,.history-card article (base) | min-width:0; min-height:50px; grid-template-columns:88px minmax(0,1fr) |
| .support-matrix article div,.history-card article div (base) | min-width:0 |
| .support-badge (base) | white-space:nowrap |
| .history-card header (base) | min-height:36px |
| .history-card article (base) | grid-template-columns:62px minmax(0,1fr) auto |
| .history-card small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .pipeline-card article (base) | min-height:39px; grid-template-columns:22px minmax(0,1fr) auto |
| .pipeline-card article>div (base) | min-width:0 |
| .pipeline-card code (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .comparison-card dl (base) | grid-template-columns:repeat(3,1fr) |
| .plugin-build-steps>span (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .build-header nav (base) | overflow:visible |
| .build-header nav button (base) | max-width:100%; white-space:normal |

## src/components/CommandPalette.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=1, input=1；直接键盘绑定 1；非原生点击候选 0。
- 状态索引：空/选择条件 1；加载/等待 0；错误/诊断 0；有数据循环 1。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 5 | div v-if | state.commandPaletteOpen |
| 13 | button v-for | (command, index) in filteredCommands |
| 21 | kbd v-if | command.shortcut |
| 22 | p v-if | !filteredCommands.length |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .command-palette (base) | max-height:min(620px, calc(100vh - 130px)); overflow:hidden |
| header (base) | min-height:52px |
| header input (base) | min-width:0 |
| .command-results (base) | min-height:80px; overflow:auto |
| .command-results button (base) | min-height:46px; grid-template-columns:30px 1fr auto |
| .command-results button > span:nth-child(2) (base) | min-width:0 |
| .command-results strong (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| footer (base) | min-height:30px |

- 键盘 9: keydown → onKeyDown

## src/components/ConfigPanel.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Local maximize/expand source exists; inspect host policy.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=44, input=22, select=41, textarea=3, summary=3；直接键盘绑定 1；非原生点击候选 0。
- 状态索引：空/选择条件 56；加载/等待 0；错误/诊断 6；有数据循环 41。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 7 | div v-if | selectedEntities.length |
| 14 | button v-if | selectedEntity && addableComponents.length |
| 17 | button v-for | category in inspectorCategories |
| 21 | div v-if | selectedEntities.length > 1 |
| 26 | option v-for | layer in estate.layers |
| 35 | div v-else-if | selectedEntity |
| 42 | option v-for | layer in estate.layers |
| 44 | PropertyRow v-if | !selectedEntity.spriteRenderer |
| 45 | template v-if | selectedEntity.authoring.kind === 'CanvasLayer' |
| 49 | template v-if | selectedEntity.authoring.kind === 'ParallaxLayer' |
| 55 | template v-if | selectedEntity.authoring.kind === 'Path' |
| 56 | option v-for | asset in pathAssets |
| 61 | option v-for | entity in state.world.entities.filter(entity => entity !== selectedEntity) |
| 70 | option v-for | layer in sceneManager.activeScene.settings.namedLayers |
| 72 | option v-for | entity in state.world.entities.filter(entity => entity !== selectedEntity) |
| 75 | div v-if | selectedValidation.length |
| 75 | button v-for | issue in selectedValidation |
| 77 | template v-if | selectedEntity.prefabAsset |
| 80 | details v-if | prefabComparison.length |
| 82 | article v-for | override in prefabComparison |
| 84 | details v-if | prefabConflicts.length |
| 86 | article v-for | conflict in prefabConflicts |
| 96 | button v-else | (fallback) |
| 97 | template v-if | selectedEntity.sceneLayers.length |
| 103 | InspectorSection v-if | selectedEntity.hasComponent('RigidBody2D') |
| 115 | div v-if | selectedConnections.length |
| 116 | article v-for | connection in selectedConnections |
| 123 | template v-if | connection.breakState !== 'intact' && connection.breakLink >= 0 |
| 128 | button v-if | !connection.binding && connection.breakState !== 'intact' |
| 129 | button v-if | connection.binding |
| 133 | p v-else | (fallback) |
| 137 | InspectorSection v-if | selectedEntity.hasComponent('ShapeRenderer2D') && !selectedEntity.hasComponent('RectTransform') |
| 139 | option v-for | layer in estate.layers |
| 146 | option v-for | asset in materialAssets |
| 148 | option v-for | asset in imageAssets |
| 150 | button v-if | selectedEntity.renderer.textureAsset \|\| selectedEntity.texture |
| 153 | InspectorSection v-if | selectedEntity.spriteRenderer |
| 155 | option v-for | asset in imageAssets |
| 162 | option v-for | layer in estate.layers |
| 164 | option v-for | asset in materialAssets |
| 166 | option v-for | asset in imageAssets |
| 169 | PropertyRow v-if | selectedEntity.spriteRenderer.nineSlice.enabled |
| 172 | InspectorSection v-if | selectedEntity.textRenderer |
| 175 | option v-for | asset in fontAssets |
| 183 | option v-for | layer in estate.layers |
| 187 | InspectorSection v-if | selectedEntity.camera2D |
| 195 | option v-for | entity in state.world.entities.filter(entity => entity !== selectedEntity) |
| 197 | PropertyRow v-if | selectedEntity.camera2D.smoothing.enabled |
| 199 | PropertyRow v-if | selectedEntity.camera2D.limits.enabled |
| 200 | PropertyRow v-if | selectedEntity.camera2D.limits.enabled |
| 202 | PropertyRow v-if | selectedEntity.camera2D.dragMargins.enabled |
| 203 | PropertyRow v-if | selectedEntity.camera2D.dragMargins.enabled |
| 212 | InspectorSection v-if | selectedEntity.script2D |
| 214 | option v-for | asset in scriptAssets |
| 215 | option v-for | asset in eventSheetAssets |
| 216 | option v-for | asset in objectBlueprintAssets |
| 217 | button v-if | selectedEntity.script2D.eventSheetAsset |
| 219 | div v-for | group in scriptPropertyGroups |
| 221 | div v-for | property in group.properties |
| 223 | ToggleSwitch v-if | typeof property.value === 'boolean' |
| 224 | select v-else-if | property.metadata?.enumValues.length |
| 224 | option v-for | option in property.metadata.enumValues |
| 225 | select v-else-if | property.metadata?.resourceType |
| 225 | option v-for | asset in compatibleScriptResources(property.metadata.resourceType) |
| 226 | select v-else-if | property.metadata?.valueType === 'entity' |
| 226 | option v-for | entity in state.world.entities |
| 227 | NumericExpressionInput v-else-if | typeof property.value === 'number' |
| 228 | div v-else-if | isScriptVec2(property.value) |
| 229 | textarea v-else-if | property.value === null \|\| typeof property.value === 'object' |
| 230 | input v-else | (fallback) |
| 232 | small v-if | property.metadata?.tooltip |
| 235 | p v-if | selectedEntity.script2D.lastError |
| 238 | InspectorSection v-if | selectedEntity.hasComponent('ShapeRenderer2D') && !selectedEntity.hasComponent('RectTransform') |
| 244 | option v-for | entity in parentCandidates |
| 250 | InspectorSection v-if | selectedEntity.hasComponent('RigidBody2D') |
| 256 | InspectorSection v-if | selectedEntity.hasComponent('RigidBody2D') |
| 261 | InspectorSection v-if | selectedEntity.hasComponent('RigidBody2D') |
| 268 | PropertyRow v-if | !selectedEntity.autoInertia |
| 273 | InspectorSection v-if | selectedEntity.hasComponent('RigidBody2D') |
| 278 | InspectorSection v-if | selectedEntity.hasComponent('RigidBody2D') |
| 286 | InspectorSection v-if | selectedEntity.getCollider() |
| 288 | option v-for | kind in colliderShapeKinds |
| 292 | article v-for | (shape, index) in selectedEntity.collider.shapes |
| 293 | option v-for | kind in colliderShapeKinds |
| 298 | option v-for | layer in state.globalSettings.layers |
| 301 | label v-if | shape.oneWay |
| 302 | label v-if | shape.kind==='Chain'\|\|shape.kind==='ConcavePolygon'\|\|shape.kind==='ConvexPolygon' |
| 309 | option v-for | layer in state.globalSettings.layers |
| 313 | PropertyRow v-if | selectedEntity.collider.oneWay |
| 314 | option v-for | asset in physicsMaterialAssets |
| 319 | option v-for | mode in materialCombineModes |
| 320 | option v-for | mode in materialCombineModes |
| 323 | InspectorSection v-if | prefs.showDiagnostics && selectedEntity.hasComponent('RigidBody2D') |
| 325 | DiagnosticRow v-if | selectedEntity.contactCount > 0 |
| 326 | DiagnosticRow v-if | selectedEntity.contactCount > 0 |
| 333 | InspectorSection v-if | pluginInspectorContributions.length |
| 335 | button v-for | item in pluginInspectorContributions |
| 338 | p v-if | !inspectorHasMatches |
| 340 | div v-else | (fallback) |
| 343 | div v-if | showColorPicker |
| 344 | ObjectBlueprintEditor v-if | blueprintEditorUuid |
| 346 | div v-if | estate.componentPickerOpen && selectedEntity |
| 351 | section v-for | group in componentGroups |
| 351 | article v-for | kind in group.kinds |
| 351 | template v-if | componentAuthoringRule(kind).required.length |
| 351 | template v-if | componentAuthoringRule(kind).conflicts.length |
| 352 | p v-if | !componentGroups.length |
| 356 | div v-if | propertyMenu.visible |
| 356 | p v-if | currentPropertyMetadata |
| 356 | template v-if | currentPropertyMetadata.unit |
| 356 | template v-if | currentPropertyMetadata.minimum !== undefined |
| 358 | ConnectionBuilder v-if | selectedEntity && builderOpen |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| :deep(.property-details) (base) | min-width:0 |
| :deep(.property-details summary) (base) | white-space:normal |
| :deep(.property-details small) (base) | white-space:normal |
| .config-wrapper (base) | min-width:252px; max-width:38vw |
| .config-panel (base) | overflow:auto |
| .settings-content (base) | min-height:100% |
| .inspector-sticky (base) | max-height:min(230px, 40%); overflow:auto |
| .inspector-search-row input (base) | min-width:0; min-height:30px |
| .add-component-trigger (base) | min-width:96px; min-height:30px; white-space:nowrap |
| .inspector-categories (base) | overflow-x:auto |
| .inspector-categories button (base) | white-space:nowrap |
| .inspector-view-controls button (base) | min-height:25px |
| .empty-ui-actions (base) | grid-template-columns:1fr 1fr |
| .empty-ui-actions button (base) | min-height:28px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .authoring-validation button (base) | min-height:26px |
| .batch-toggle (base) | min-width:76px |
| h3 (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| :deep(.inspector-section) (base) | overflow:hidden |
| :deep(.inspector-section summary) (base) | min-height:37px |
| :deep(.component-tools) (base) | min-height:31px |
| :deep(.component-tools button) (base) | min-width:30px |
| :deep(.property-row) (base) | min-height:37px |
| :deep(.property-control > input), :deep(.property-control > select) (base) | min-width:0 |
| .pair input (base) | min-width:0 |
| .compound-shapes>summary (base) | min-height:31px |
| .compound-shapes>summary button,.compound-shapes article header button (base) | min-width:25px |
| .compound-shapes article header (base) | grid-template-columns:minmax(0,1fr) auto 25px |
| .compound-shapes article header label (base) | white-space:nowrap |
| .compound-shapes article>label (base) | grid-template-columns:minmax(70px,.8fr) minmax(0,1.2fr) |
| .compound-shapes article input (base) | min-width:0 |
| :deep(.number-range input[type='range']) (base) | min-width:0 |
| :deep(.number-range input[type='number']) (base) | min-width:86px |
| :deep(.diagnostic-row) (base) | min-height:30px |
| .stacked-field textarea (base) | min-height:58px; resize:vertical |
| .primary-action, .secondary-action (base) | min-height:33px |
| .prefab-actions (base) | grid-template-columns:repeat(3, minmax(0, 1fr)) |
| .prefab-actions button (base) | min-width:0; min-height:30px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .prefab-compare article (base) | min-width:0 |
| .prefab-compare code (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .prefab-compare button (base) | min-height:24px |
| .plugin-inspector-actions button (base) | min-width:0 |
| .plugin-inspector-actions span, .plugin-inspector-actions small (base) | max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .connection-main (base) | min-width:0 |
| .connection-main > span:last-child (base) | min-width:0 |
| .connection-main strong, .connection-main small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .color-modal button (base) | min-height:34px |
| .component-picker (base) | max-height:min(700px, calc(100vh - 60px)); overflow:hidden |
| .component-picker-list (base) | min-height:60px; overflow:auto |
| .component-picker-list>section (base) | grid-template-columns:1fr 1fr |
| .component-picker-list article (base) | min-width:0 |
| .component-main (base) | min-width:0; min-height:52px; grid-template-columns:29px 1fr 18px |
| .component-main>span:nth-child(2) (base) | min-width:0 |
| .component-main strong (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .property-menu>button (base) | min-height:28px |
| .config-wrapper (@media (max-width: 760px)) | max-width:46vw |
| .component-picker-list>section (@media (max-width: 560px)) | grid-template-columns:1fr |
| .config-wrapper (base) | container:nova-inspector / inline-size |
| :deep(.property-control > input), :deep(.property-control > select) (@container nova-inspector (max-width: 360px)) | min-height:32px |
| .prefab-actions, .empty-ui-actions (@container nova-inspector (max-width: 360px)) | grid-template-columns:1fr |
| .prefab-actions button, .empty-ui-actions button (@container nova-inspector (max-width: 360px)) | white-space:normal; overflow:visible; min-height:32px |
| .compound-shapes article > label (@container nova-inspector (max-width: 360px)) | grid-template-columns:1fr |
| .compound-shapes (base) | container-type:inline-size |
| .compound-shapes article (base) | min-width:0 |
| .compound-shapes label>span (base) | white-space:normal |
| .compound-shapes input,.compound-shapes select (base) | min-height:34px; min-width:0; max-width:100% |
| .compound-shapes article header (base) | grid-template-columns:minmax(0,1fr) 30px |
| :deep(.numeric-draft) (base) | max-width:100% |

- 键盘 347: keydown → closeComponentPicker

## src/components/ConfirmDialog.vue

- 责任/宿主：src/App.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=2；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 5 | div v-if | state.visible |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .confirm-card (base) | grid-template-columns:42px 1fr |
| .confirm-actions button (base) | min-width:100px; min-height:36px |

## src/components/ConnectionBuilder.vue

- 责任/宿主：src/components/ConfigPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=9, input=5, summary=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 1；有数据循环 1。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 22 | p v-if | form17.error.value |
| 24 | section v-if | stage === 'objects' |
| 35 | button v-for | entity in availableEntities |
| 41 | p v-if | availableEntities.length === 0 |
| 44 | section v-else-if | stage === 'path' |
| 52 | div v-if | overlapping |
| 56 | button v-if | overlapping |
| 60 | section v-else | (fallback) |
| 68 | div v-if | !drawingComplete && !isDrawing |
| 69 | div v-if | drawingComplete |
| 73 | button v-if | drawingComplete |
| 75 | details v-if | drawingComplete |
| 80 | label v-if | collisionEnabled |
| 81 | label v-if | collisionEnabled |
| 92 | p v-if | segmentCount >= 28 \|\| (collisionEnabled && segmentCount >= 20) |
| 100 | button v-if | stage !== 'objects' |
| 101 | button v-if | stage === 'simulation' |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .builder (base) | overflow:hidden |
| header, footer (base) | min-height:64px |
| footer (base) | min-height:60px |
| .builder-body (base) | min-height:0; overflow:auto |
| .wizard-step (base) | min-height:100% |
| .compact-copy > div (base) | min-width:0 |
| .chosen-object, .object-picker button (base) | min-height:54px |
| .chosen-object > span:nth-child(2), .object-picker button > span:nth-child(2) (base) | min-width:0 |
| .chosen-object strong, .object-picker strong (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .object-picker (base) | grid-template-columns:repeat(2, minmax(0, 1fr)) |
| .path-picker (base) | grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)) |
| .path-picker button (base) | min-height:142px |
| .path-picker small (base) | min-height:30px |
| .preview-shell (base) | min-height:320px; overflow:hidden |
| .preview-shell canvas (base) | min-height:320px |
| .preview-instruction, .preview-success (base) | white-space:nowrap |
| .preview-footer (base) | min-height:30px |
| .advanced-physics (base) | overflow:hidden |
| .physics-grid (base) | grid-template-columns:repeat(2, minmax(0, 1fr)) |
| .physics-grid label (base) | min-width:0 |
| .collision-toggle small (base) | max-width:470px |
| .physics-grid input[type='number'] (base) | min-width:0 |
| footer button (base) | min-height:35px |
| footer button.primary (base) | min-width:140px |
| .path-picker, .object-picker (@media (max-width: 680px)) | grid-template-columns:1fr |
| .path-picker button (@media (max-width: 680px)) | min-height:108px |
| .preview-shell, .preview-shell canvas (@media (max-width: 680px)) | min-height:280px |
| .builder (base) | container-type:inline-size |
| .physics-grid (base) | grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr)) |
| .physics-grid input[type=number] (base) | min-width:86px; min-height:34px |
| .builder h2,.builder h3,.builder strong,.builder p,.builder summary (base) | white-space:normal |
| footer button (base) | white-space:normal |
| .preview-instruction,.preview-success (base) | max-width:95%; white-space:normal |

## src/components/ConsolePanel.vue

- 责任/宿主：src/components/EditorBottomPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=2, input=1, select=2；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 1；加载/等待 0；错误/诊断 0；有数据循环 3。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 6 | option v-for | item in levels |
| 7 | option v-for | item in categories |
| 12 | p v-if | !visible.length |
| 13 | button v-for | entry in visible |
| 14 | code v-if | entry.source |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .console-panel (base) | min-width:0; overflow:hidden |
| header (base) | min-height:38px |
| header input (base) | min-width:140px |
| header select (base) | min-width:105px |
| header button, header input, header select (base) | min-height:30px |
| .console-list (base) | min-height:0; overflow:auto |
| .log-entry (base) | min-width:0; min-height:31px; grid-template-columns:76px 62px 78px minmax(0, 1fr) minmax(0, auto); overflow:hidden |
| .log-entry time, .log-entry code, .log-entry b, .log-entry strong, .log-entry span (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .log-entry (@media (max-width: 760px)) | grid-template-columns:58px 48px 58px minmax(120px, 1fr) |

## src/components/ContentAssetInspector.vue

- 责任/宿主：src/components/EditorBottomPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=13, input=2, select=3, textarea=2, summary=1；直接键盘绑定 1；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 5；有数据循环 10。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 3 | section v-if | visible |
| 4 | button v-if | animationAsset |
| 5 | button v-for | tab in tabs |
| 6 | section v-if | activeTab==='overview' |
| 7 | ImportedAssetBindings v-if | asset.interchange |
| 8 | section v-if | isTiledMapAsset(asset) |
| 8 | p v-if | frameError |
| 9 | section v-if | asset.derivedSprite |
| 11 | label v-if | asset.interchange |
| 12 | label v-if | asset.interchange?.texturePath |
| 14 | article v-for | diagnostic in contentDiagnostics |
| 16 | section v-else-if | activeTab==='dependencies' |
| 19 | p v-if | dependencyView.truncated |
| 20 | article v-for | cycle in dependencyView.cycles |
| 22 | button v-for | node in dependentNodes |
| 22 | p v-if | !dependentNodes.length |
| 24 | button v-for | node in dependencyNodes |
| 24 | p v-if | !dependencyNodes.length |
| 27 | section v-else-if | activeTab==='pipeline' |
| 29 | article v-for | feature in productionProfile |
| 32 | section v-else-if | activeTab==='slices' |
| 35 | button v-if | asset.assetType==='atlas' |
| 36 | button v-if | asset.assetType==='atlas' |
| 37 | details v-if | frameError |
| 38 | article v-for | slice in visibleSlices |
| 40 | section v-else-if | activeTab==='resource' && resourceDocument |
| 41 | StudioDraftConflict v-if | resourceConflict |
| 42 | option v-for | kind in resourceKinds |
| 43 | option v-for | candidate in compatibleParents |
| 45 | option v-for | variant in resourceVariants |
| 46 | label v-if | resourceVariant!=='Default' |
| 48 | p v-if | resourceError |
| 50 | section v-if | resolvedResource |
| 52 | section v-else | (fallback) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .content-studio (base) | min-width:0; overflow:hidden |
| .content-studio>header (base) | min-height:46px |
| .content-studio>header span (base) | min-width:0 |
| .content-studio button,.content-studio select,.content-studio input,.content-studio textarea (base) | min-width:0 |
| .content-studio>nav (base) | grid-template-columns:repeat(auto-fit,minmax(74px,1fr)) |
| .content-studio>nav button (base) | min-height:30px |
| .content-pane (base) | min-width:0; overflow:visible |
| .content-pane label (base) | grid-template-columns:minmax(82px,.7fr) minmax(0,1.3fr) |
| .content-pane code (base) | white-space:pre-wrap |
| .slice-pane article>span:first-child (base) | min-width:150px |
| .resource-pane textarea (base) | min-height:130px; resize:vertical |
| .resource-pane button,.animation-pane button (base) | min-height:32px |
| .resolved-resource code (base) | white-space:pre-wrap |
| .graph-summary (base) | grid-template-columns:repeat(3,minmax(0,1fr)) |
| .dependency-lanes (base) | grid-template-columns:repeat(3,minmax(0,1fr)) |
| .dependency-lanes>section (base) | min-width:0 |
| .dependency-node (base) | min-width:0 |
| .dependency-node span,.dependency-node small (base) | white-space:normal |
| .production-feature>span (base) | min-width:0 |
| .variant-creator (base) | grid-template-columns:minmax(0,1fr) auto |
| .variant-creator button (base) | white-space:nowrap |
| .dependency-lanes (@media (max-width:760px)) | grid-template-columns:1fr |
| .graph-summary (@media (max-width:760px)) | grid-template-columns:1fr |
| .content-pane label (@media (max-width:760px)) | grid-template-columns:1fr |
| .content-studio (base) | container:nova-content/inline-size |
| .content-studio>nav button (base) | white-space:normal |
| .dependency-lanes,.graph-summary (@container nova-content (max-width:500px)) | grid-template-columns:minmax(0,1fr) |
| .content-pane label (@container nova-content (max-width:500px)) | grid-template-columns:minmax(0,1fr) |
| .variant-creator (@container nova-content (max-width:500px)) | grid-template-columns:minmax(0,1fr) |
| .variant-creator button (@container nova-content (max-width:500px)) | white-space:normal |
| .dependency-node span,.dependency-node small (@container nova-content (max-width:500px)) | white-space:normal; overflow:visible |
| .linked-sprite button,.slice-pane>button (base) | min-height:32px; white-space:normal |

- 键盘 47: keydown → createVariant

## src/components/ContextMenu.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=18；直接键盘绑定 0；非原生点击候选 1。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | div v-if | state.contextMenu.visible |
| 5 | template v-if | state.contextMenu.type === 'sidebar-entity' \|\| state.contextMenu.type === 'grid-entity' |
| 22 | template v-else-if | state.contextMenu.type === 'layer' |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .context-menu (base) | min-width:205px |
| .context-menu button (base) | min-height:33px |

- 已分类 P26-04（本组件负责）：div:4。该项已按 P26-04 分类为容器鼠标行为或原生子按钮的冗余鼠标入口；不是额外未修复操作。

## src/components/CreateObjectPalette.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=5, input=1；直接键盘绑定 2；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 0；有数据循环 3。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | div v-if | estate.createObjectPaletteOpen |
| 14 | button v-for | category in categories |
| 17 | section v-for | group in groups |
| 19 | article v-for | item in group.items |
| 24 | template v-if | item.required.length |
| 29 | p v-if | !groups.length |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .authoring-palette (base) | overflow:hidden |
| header (base) | min-height:68px |
| .palette-search input (base) | min-width:0 |
| nav (base) | overflow:auto |
| nav button (base) | min-height:29px; white-space:nowrap |
| .palette-body (base) | min-height:0; overflow:auto |
| .type-group (base) | grid-template-columns:1fr 1fr |
| .type-card (base) | min-width:0; min-height:83px |
| .type-copy (base) | min-width:0 |
| footer (base) | min-height:62px |
| footer button (base) | min-height:33px |
| .type-group (@media (max-width:660px)) | grid-template-columns:1fr |

- 键盘 5: keydown → close
- 键盘 19: keydown → choose(item.kind)

## src/components/CreatorLearningCenter.vue

- 责任/宿主：src/components/ManageWorkspace.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=8, input=4, select=2；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 3；加载/等待 0；错误/诊断 0；有数据循环 15。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 12 | button v-for | item in tabs |
| 15 | div v-if | activeTab === 'guides' |
| 18 | option v-for | panel in panels |
| 20 | button v-for | guide in guides |
| 23 | p v-if | !guides.length |
| 27 | article v-if | activeGuide && localized |
| 29 | span v-for | classification in activeGuide.classifications |
| 31 | li v-for | item in localized.prerequisites |
| 32 | li v-for | step in localized.steps |
| 34 | li v-for | mistake in localized.mistakes |
| 37 | code v-if | localized.relatedRhai.length |
| 37 | span v-else | (fallback) |
| 37 | code v-if | localized.relatedGraph.length |
| 37 | span v-else | (fallback) |
| 38 | button v-if | activeGuide.taskProject |
| 42 | div v-else-if | activeTab === 'contracts' |
| 44 | article v-for | contract in contracts |
| 45 | p v-for | check in matrix |
| 48 | div v-else-if | activeTab === 'readiness' |
| 51 | li v-for | reason in contractReview.reasons |
| 53 | option v-for | panel in panels |
| 54 | article v-for | item in filteredReadiness |
| 54 | span v-for | dimension in readinessDimensions |
| 56 | article v-for | target in supportMatrix |
| 59 | div v-else | (fallback) |
| 61 | button v-for | profile in profiles |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .learning-center (base) | min-height:0; overflow:hidden |
| .learning-header (base) | min-height:88px |
| .learning-header>div:first-child (base) | min-width:220px |
| .learning-progress (base) | grid-template-columns:auto 1fr auto |
| .learning-header>button (base) | min-height:34px |
| .learning-tabs (base) | min-height:42px |
| .guide-layout (base) | min-height:0; grid-template-columns:minmax(250px,320px) minmax(0,1fr) |
| .guide-catalog (base) | min-height:0 |
| .guide-catalog>input,.catalog-filters select (base) | min-height:34px |
| .guide-list (base) | min-height:0; overflow:auto |
| .guide-list button (base) | min-height:48px; grid-template-columns:20px minmax(0,1fr) |
| .guide-list button span:last-child (base) | min-width:0 |
| .guide-list strong,.guide-list small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .guide-detail (base) | min-height:0; overflow:auto |
| .two-column,.api-links (base) | grid-template-columns:repeat(2,minmax(0,1fr)) |
| .api-links code (base) | overflow:auto; white-space:normal |
| .contract-view,.profile-view (base) | min-height:0; overflow:auto |
| .contract-view>article (base) | grid-template-columns:120px minmax(240px,1fr) minmax(280px,1.2fr) auto |
| .migration-matrix p (base) | grid-template-columns:20px 90px 1fr |
| .readiness-view (base) | min-height:0; overflow:auto |
| .readiness-view>header>div (base) | min-width:0 |
| .readiness-view button (base) | min-height:34px |
| .readiness-summary (base) | grid-template-columns:repeat(4,minmax(120px,1fr)) |
| .readiness-catalog>header (base) | grid-template-columns:minmax(200px,1fr) minmax(150px,240px) auto |
| .readiness-catalog input,.readiness-catalog select (base) | min-width:0; min-height:34px |
| .readiness-catalog>header span (base) | white-space:nowrap |
| .readiness-table (base) | max-height:420px; overflow:auto |
| .readiness-table article (base) | min-width:900px; min-height:48px; grid-template-columns:minmax(220px,1fr) repeat(7,minmax(82px,.42fr)) |
| .readiness-table article>div (base) | min-width:0 |
| .readiness-table article>div strong,.readiness-table article>div small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .readiness-table article>span (base) | min-width:0 |
| .support-matrix (base) | grid-template-columns:repeat(auto-fit,minmax(220px,1fr)) |
| .profile-grid (base) | grid-template-columns:repeat(3,minmax(0,1fr)) |
| .profile-grid button (base) | min-height:160px |
| .qualification-targets (base) | grid-template-columns:repeat(4,minmax(0,1fr)) |
| .guide-layout (@media (max-width:900px)) | grid-template-columns:minmax(220px,36%) minmax(0,1fr) |
| .contract-view>article (@media (max-width:900px)) | grid-template-columns:90px 1fr |
| .profile-grid (@media (max-width:900px)) | grid-template-columns:1fr |
| .qualification-targets (@media (max-width:900px)) | grid-template-columns:repeat(2,minmax(0,1fr)) |
| .readiness-summary (@media (max-width:900px)) | grid-template-columns:1fr 1fr |
| .guide-catalog (@media (max-width:650px)) | max-height:38% |
| .two-column,.api-links (@media (max-width:650px)) | grid-template-columns:1fr |
| .contract-view>article (@media (max-width:650px)) | grid-template-columns:1fr |
| .readiness-catalog>header (@media (max-width:650px)) | grid-template-columns:1fr |
| .readiness-summary (@media (max-width:650px)) | grid-template-columns:1fr 1fr |

## src/components/CreatorOnboarding.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=4；直接键盘绑定 1；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 2。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | div v-if | learning.onboardingVisible |
| 7 | i v-for | (_, index) in steps |
| 12 | li v-for | item in current.points |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .onboarding-card (base) | max-height:min(760px,calc(100vh - 40px)); overflow:auto |
| .onboarding-card>header (base) | min-height:52px |
| .step-visual (base) | min-height:140px; grid-template-columns:repeat(5,1fr) |
| .onboarding-card>footer (base) | min-height:62px |
| .onboarding-card>footer button (base) | min-height:38px |
| .step-visual (@media (max-width:560px)) | min-height:115px |

- 键盘 4: keydown → onKeyDown

## src/components/DeviceInputPanel.vue

- 责任/宿主：src/panels/SettingsPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=17, input=6, select=8；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 1；有数据循环 9。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 112 | button v-for | tab in tabs |
| 113 | div v-if | activeTab==='preview' |
| 114 | option v-for | (item,index) in UI_DEVICE_PRESETS |
| 121 | div v-else-if | activeTab==='virtual' |
| 124 | article v-for | (control,index) in deviceInputSettings.virtualControls |
| 126 | option v-for | action in physicsState.inputMap |
| 126 | option v-for | kind in controlKinds |
| 126 | option v-for | anchor in anchors |
| 128 | p v-if | !deviceInputSettings.virtualControls.length |
| 130 | div v-else-if | activeTab==='gamepad' |
| 131 | li v-for | pad in connectedGamepads |
| 131 | p v-if | !connectedGamepads.length |
| 132 | option v-for | action in physicsState.inputMap |
| 134 | article v-for | (item,index) in deviceInputSettings.gamepadCalibrations |
| 136 | div v-else | (fallback) |
| 141 | p v-if | deviceRuntimeState.lastError |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .device-studio (base) | min-width:0; overflow:hidden |
| .device-studio>header (base) | min-height:58px |
| .device-studio>header div (base) | min-width:0 |
| .device-studio>header>span (base) | white-space:nowrap |
| .device-studio>nav (base) | overflow-x:auto |
| .device-studio>nav button (base) | min-width:max-content; min-height:32px |
| .setting-line>span (base) | min-width:170px |
| .setting-line select (base) | min-width:150px |
| .page button (base) | min-height:34px |
| .preview-page>.toolbar>select (base) | min-width:min(240px,100%) |
| .device-frame (base) | max-height:390px; overflow:hidden |
| .page dl (base) | grid-template-columns:repeat(auto-fit,minmax(130px,1fr)) |
| .fields,.calibration (base) | grid-template-columns:repeat(auto-fit,minmax(125px,1fr)) |
| .fields label,.calibration label,.capture label (base) | min-width:0 |
| .fields input,.fields select,.calibration input,.capture select (base) | min-width:0 |
| .pair (base) | grid-template-columns:1fr 1fr |
| .devices strong (base) | max-width:72%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .capture label (base) | min-width:180px |
| .setting-line>span (@media (max-width:680px)) | min-width:100% |
| .fields,.calibration (@media (max-width:680px)) | grid-template-columns:1fr 1fr |
| .fields,.calibration (base) | grid-template-columns:repeat(auto-fit,minmax(140px,1fr)) |
| .frequency (base) | min-width:0 |
| .fields input,.fields select,.calibration input,.capture select,.frequency input (base) | min-width:0 |
| .capture label (base) | min-width:min(180px,100%) |
| .pen-bindings (base) | grid-template-columns:repeat(auto-fit,minmax(116px,1fr)) |
| .pen-bindings button (base) | min-width:0; white-space:normal |
| .fields,.calibration (@media (max-width:680px)) | grid-template-columns:1fr |
| .capture label (@media (max-width:680px)) | min-width:100% |
| .fields,.calibration (base) | grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr)) |

## src/components/EcosystemStudioPanel.vue

- 责任/宿主：src/components/EditorBottomPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=20, input=19, select=3, textarea=3；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 3；加载/等待 0；错误/诊断 0；有数据循环 13。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 6 | button v-for | tab in tabs |
| 10 | main v-if | activeTab === 'extensions' |
| 13 | article v-for | item in PLUGIN_API_MATRIX |
| 23 | article v-for | manifest in pluginState.manifests |
| 23 | p v-if | !pluginState.manifests.length |
| 32 | article v-for | item in pluginState.contributions |
| 32 | p v-if | !pluginState.contributions.length |
| 36 | main v-else-if | activeTab === 'package' |
| 49 | div v-if | certification |
| 49 | article v-for | check in certification.checks |
| 49 | p v-else | (fallback) |
| 54 | output v-if | registryResult |
| 58 | main v-else-if | activeTab === 'templates' |
| 60 | article v-for | template in exportTemplateState.templates |
| 61 | article v-for | item in qualifications |
| 61 | span v-for | gate in item.gates |
| 64 | main v-else-if | activeTab === 'delivery' |
| 65 | article v-for | job in deliveryPipelineState.jobs |
| 68 | article v-for | connector in deliveryPipelineState.connectors |
| 68 | button v-if | connector.kind !== 'local-folder' && !connector.permissionGranted |
| 68 | pre v-if | deliveryPipelineState.lastPlan |
| 71 | main v-else-if | activeTab === 'shipping' |
| 73 | li v-for | step in solver.steps.slice(-6) |
| 75 | dl v-if | ecosystemShippingState.stagedUpdate |
| 76 | article v-for | job in hostPipelines |
| 80 | main v-else | (fallback) |
| 81 | article v-for | audit in audits |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .ecosystem-studio (base) | min-height:0; overflow:hidden; container-type:inline-size |
| .studio-header (base) | min-height:54px; grid-template-columns:minmax(200px,.7fr) minmax(480px,1.4fr) auto |
| .studio-header>div (base) | min-width:0 |
| .studio-header nav (base) | grid-template-columns:repeat(5,minmax(80px,1fr)) |
| .studio-header button,.card button (base) | min-height:30px |
| .studio-header output (base) | white-space:nowrap |
| .studio-grid (base) | min-height:0; grid-template-columns:repeat(3,minmax(250px,1fr)); overflow:auto |
| .card (base) | min-width:0 |
| .card>header (base) | min-height:32px |
| .card>header>div (base) | min-width:0 |
| .toggle (base) | min-height:34px |
| .field-grid (base) | grid-template-columns:repeat(2,minmax(140px,1fr)) |
| .field-grid label,.signing-card label,.connector-editor label (base) | min-width:0 |
| .field-grid input,.field-grid select,.signing-card textarea,.connector-editor input,.connector-editor select (base) | min-width:0 |
| .api-table article,.ci-table article (base) | min-width:640px; min-height:31px; grid-template-columns:130px 150px 70px minmax(180px,1fr) |
| .api-table,.ci-table (base) | overflow:auto |
| .lifecycle-card dl div,.template-card dl div (base) | min-height:28px |
| .extension-list article,.connector-list article (base) | min-height:44px; grid-template-columns:minmax(150px,1fr) auto auto auto |
| .extension-list article>div,.connector-list article>div (base) | min-width:0 |
| .extension-list code,.connector-list code (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .contribution-grid,.audit-cards (base) | grid-template-columns:repeat(auto-fit,minmax(210px,1fr)) |
| .contribution-grid article (base) | min-width:0; grid-template-columns:auto minmax(0,1fr) auto |
| .contribution-grid article small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .check-list article (base) | min-height:34px; grid-template-columns:20px 120px minmax(0,1fr) |
| .template-card header strong,.template-card header small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .qualification-card>article (base) | min-height:38px; overflow:auto |
| .qualification-card>article>span (base) | white-space:nowrap |
| .ci-table article (base) | grid-template-columns:125px minmax(170px,1fr) minmax(170px,1fr) 110px |
| .cache-key (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .connector-list article (base) | grid-template-columns:minmax(190px,1fr) auto auto auto |
| .connector-list+pre (base) | max-height:180px; overflow:auto |
| .audit-cards article (base) | min-height:92px; grid-template-columns:26px minmax(0,1fr) |
| .studio-header nav (base) | grid-template-columns:repeat(6,minmax(78px,1fr)) |
| .publisher-card>code (base) | overflow:auto; white-space:nowrap |
| .security-card textarea,.updater-card select (base) | min-width:0 |
| .security-card dl div,.updater-card dl div,.shipping-grid>.card:nth-child(2) dl div (base) | min-height:26px |
| .shipping-evidence (base) | grid-template-columns:repeat(3,minmax(200px,1fr)) |
| .shipping-evidence article (base) | min-width:0 |
| .studio-header (@container (max-width:920px)) | grid-template-columns:1fr auto |
| .studio-grid (@container (max-width:920px)) | grid-template-columns:repeat(2,minmax(240px,1fr)) |
| .shipping-evidence (@container (max-width:920px)) | grid-template-columns:1fr |
| .studio-header (@container (max-width:620px)) | grid-template-columns:1fr |
| .studio-header nav (@container (max-width:620px)) | overflow:auto |
| .studio-grid (@container (max-width:620px)) | grid-template-columns:1fr |
| .field-grid (@container (max-width:620px)) | grid-template-columns:1fr |
| .connector-list article,.extension-list article (@container (max-width:620px)) | grid-template-columns:minmax(0,1fr) auto |

## src/components/EditorBottomPanel.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Local maximize/expand source exists; inspect host policy.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=67, input=34, select=32, textarea=7, summary=11；直接键盘绑定 8；非原生点击候选 0。
- 状态索引：空/选择条件 58；加载/等待 0；错误/诊断 10；有数据循环 32。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | PanelResizeHandle v-if | estate.bottomPanelOpen |
| 7 | option v-for | tab in tabs |
| 9 | button v-for | tab in tabs |
| 9 | i v-if | tabDirty(tab.id) |
| 12 | PanelMaximizeButton v-if | estate.bottomPanelOpen |
| 14 | button v-if | estate.bottomPanelTab === 'console' && estate.bottomPanelOpen |
| 19 | div v-if | estate.bottomPanelOpen |
| 20 | div v-if | estate.bottomPanelTab === 'assets' |
| 23 | button v-for | folder in visibleFolders |
| 38 | button v-if | selectedAsset |
| 43 | button v-for | kind in resourceKinds |
| 43 | button v-for | item in pluginAssetContributions |
| 44 | input v-if | creatingFolder |
| 51 | section v-if | filterMenuOpen |
| 53 | button v-for | filter in filteredTypeFilters |
| 56 | option v-for | collection in assets.collections |
| 57 | option v-for | filter in assets.savedFilters |
| 64 | span v-if | assets.atlasError |
| 69 | section v-if | externalChanges.length |
| 70 | article v-for | change in externalChanges |
| 73 | details v-if | importJobs.length |
| 75 | article v-for | job in importJobs |
| 78 | button v-if | !['complete','cancelled','failed'].includes(job.status) |
| 79 | button v-else-if | job.retryable |
| 80 | p v-if | job.status==='failed' |
| 80 | details v-if | job.logs.length |
| 80 | code v-for | (line,index) in job.logs |
| 84 | section v-if | repairMode && missingReferenceIds.length |
| 87 | option v-for | reference in missingReferenceIds |
| 92 | option v-for | asset in assets.records |
| 98 | section v-if | assetBatch.total |
| 99 | button v-if | assetBatch.active |
| 102 | details v-if | assetBatch.failed |
| 102 | section v-for | (item,index) in assetBatch.results.filter(v=>v.status==='failed') |
| 107 | article v-for | asset in displayedAssets |
| 121 | AssetImagePreview v-if | asset.assetType === 'image' |
| 121 | span v-else | (fallback) |
| 122 | span v-if | assetSourceStatus(asset.uuid) |
| 124 | input v-if | renamingGuid === asset.uuid |
| 125 | strong v-else | (fallback) |
| 128 | p v-if | !displayedAssets.length |
| 129 | p v-else-if | displayedAssets.length < filteredAssetCount |
| 134 | aside v-if | selectedAsset |
| 136 | button v-for | tab in importerTabs |
| 137 | AssetImagePreview v-if | selectedAsset.assetType === 'image' |
| 138 | audio v-else-if | selectedAsset.assetType === 'audio' |
| 139 | div v-else-if | selectedAsset.assetType === 'font' |
| 141 | details v-if | assetOperationError |
| 142 | section v-show | inspectorTab === 'source' |
| 145 | label v-if | selectedAsset.path.startsWith('.nova/') |
| 148 | option v-for | group in assets.contentGroups |
| 150 | button v-for | collection in assets.collections |
| 153 | section v-show | inspectorTab === 'provenance' |
| 154 | p v-if | !selectedAsset.pipeline |
| 155 | template v-else | (fallback) |
| 160 | div v-if | selectedAsset.pipeline |
| 161 | div v-if | selectedAsset.pipeline |
| 163 | article v-for | diagnostic in selectedProvenanceDiagnostics |
| 165 | pre v-if | importComparisonText |
| 167 | p v-if | selectedAsset.pipeline?.status === 'failed' |
| 168 | section v-show | inspectorTab === 'import' |
| 169 | template v-if | selectedAsset.assetType === 'image' |
| 180 | option v-for | preset in pivotPresets |
| 182 | label v-if | selectedAsset.settings.spriteRegion |
| 184 | label v-if | !selectedAsset.derivedSprite |
| 185 | template v-if | !selectedAsset.derivedSprite && selectedAsset.settings.spriteSheet.enabled |
| 186 | button v-if | !selectedAsset.derivedSprite |
| 189 | label v-if | selectedAsset.settings.collisionGeneration.mode === 'Polygon' |
| 191 | label v-if | !selectedAsset.derivedSprite |
| 195 | template v-if | selectedAsset.mimeType === 'image/svg+xml' |
| 196 | label v-for | platform in compressionPlatforms |
| 198 | template v-else-if | selectedAsset.assetType === 'audio' |
| 208 | template v-else-if | selectedAsset.assetType === 'font' |
| 211 | label v-if | selectedAsset.settings.fontSettings.renderMode === 'Bitmap' |
| 217 | label v-if | selectedAsset.settings.fontSettings.distanceField !== 'None' |
| 222 | article v-for | row in selectedGlyphReport |
| 224 | template v-else-if | selectedAsset.assetType === 'script' |
| 230 | template v-else-if | selectedAsset.assetType === 'visualScript' |
| 235 | template v-else-if | selectedAsset.assetType === 'eventSheet' |
| 240 | template v-else-if | selectedAsset.assetType === 'objectBlueprint' |
| 244 | template v-else-if | selectedAsset.assetType === 'atlas' |
| 248 | section v-if | selectedAtlasReport |
| 248 | small v-for | message in selectedAtlasReport.diagnostics |
| 251 | template v-else-if | selectedAsset.assetType === 'tileset' |
| 256 | template v-else-if | selectedAsset.assetType === 'shader' |
| 261 | template v-else-if | selectedAsset.assetType === 'localization' |
| 266 | template v-else-if | selectedAsset.assetType === 'uiTheme' |
| 270 | template v-else-if | selectedAsset.assetType === 'other' && selectedAsset.path.startsWith('Assets/Tutorials/') |
| 273 | template v-else-if | selectedAsset.assetType === 'animation' && selectedAsset.animationImport |
| 275 | option v-for | asset in animationSources |
| 278 | label v-for | (mapping,index) in selectedAsset.animationImport.trackMappings |
| 281 | template v-else-if | selectedAsset.assetType === 'prefab' |
| 281 | button v-if | state.selectedEntityIds.length |
| 282 | button v-else-if | selectedAsset.assetType === 'scene' |
| 284 | section v-show | inspectorTab === 'import' |
| 286 | option v-for | preset in compatibleImportPresets |
| 289 | section v-show | inspectorTab === 'dependencies' |
| 292 | ul v-if | selectedReferences.length |
| 292 | li v-for | owner in selectedReferences.slice(0, 8) |
| 292 | button v-if | owner !== 'project' |
| 292 | span v-else | (fallback) |
| 294 | ul v-if | selectedAsset.pipeline?.dependencies.length |
| 294 | li v-for | dependency in selectedAsset.pipeline.dependencies.slice(0,8) |
| 295 | ul v-if | selectedAsset.pipeline?.reverseDependencies.length |
| 295 | li v-for | dependency in selectedAsset.pipeline.reverseDependencies.slice(0,8) |
| 296 | p v-if | selectedInclusion.length |
| 297 | p v-else | (fallback) |
| 299 | details v-if | selectedContentClosure.length |
| 299 | article v-for | entry in selectedContentClosure.slice(0,32) |
| 299 | p v-for | issue in selectedClosureIssues |
| 301 | section v-show | inspectorTab === 'platform' |
| 301 | article v-for | platform in compressionPlatforms |
| 301 | template v-if | selectedAsset.settings.platformOverrides[platform]?.enabled |
| 308 | ConsolePanel v-else-if | estate.bottomPanelTab === 'console' |
| 309 | ProfilerPanel v-else-if | estate.bottomPanelTab === 'profiler' |
| 311 | AnimationPanel v-else-if | estate.bottomPanelTab === 'animation' |
| 312 | AudioSystemPanel v-else-if | estate.bottomPanelTab === 'audio' |
| 313 | WorldToolsPanel v-else-if | estate.bottomPanelTab === 'worldProduction' |
| 314 | NetworkStudioPanel v-else-if | estate.bottomPanelTab === 'networkStudio' |
| 315 | EcosystemStudioPanel v-else-if | estate.bottomPanelTab === 'ecosystem' |
| 316 | TilemapPanel v-else-if | estate.bottomPanelTab === 'tilemap' |
| 317 | div v-else | (fallback) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .asset-workspace>.import-queue (base) | max-height:220px; overflow:auto |
| .asset-workspace>.import-queue>summary (base) | min-height:30px |
| .asset-inspector label.region-field > div (base) | max-width:none |
| .asset-inspector label.region-field input (base) | min-width:0 |
| .bottom-panel (base) | min-height:34px; container-type:inline-size |
| .panel-tabs (base) | min-height:34px; overflow:hidden |
| .panel-tabs span (base) | min-width:4px |
| .panel-tabs button (base) | white-space:nowrap |
| .panel-tabs (base) | overflow:visible |
| .panel-tab-strip (base) | min-width:0; overflow-x:auto |
| .panel-tab-strip .panel-tab (base) | min-height:var(--control-default) |
| .panel-controls > button (base) | min-width:var(--control-default); min-height:var(--control-default) |
| .compact-tab-select (base) | min-width:0; min-height:var(--control-default) |
| .panel-content (base) | min-width:0; min-height:0; overflow:hidden |
| .asset-browser (base) | min-height:120px; grid-template-columns:minmax(145px,18%) minmax(180px,1fr); overflow:hidden |
| .asset-browser.inspecting (base) | grid-template-columns:minmax(145px,18%) minmax(160px,1fr) minmax(205px,25%) |
| .folder-tree, .asset-inspector (base) | min-height:0; overflow:auto |
| .folder-tree button (base) | min-width:0; min-height:29px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .asset-workspace (base) | min-width:0; overflow:hidden |
| .asset-toolbar (base) | min-height:86px; grid-template-columns:minmax(0,1fr) auto; overflow:visible |
| .asset-actions-row, .asset-filters (base) | min-width:0 |
| .asset-toolbar button (base) | white-space:nowrap |
| .asset-toolbar .path (base) | min-width:45px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .asset-toolbar input (base) | min-width:100px; min-height:31px |
| .asset-diagnostics .atlas-error (base) | max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .import-queue article (base) | min-width:0; grid-template-columns:minmax(80px,1fr) 90px auto |
| .import-queue article>span (base) | min-width:0 |
| .import-queue strong,.import-queue small,.import-queue em (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .import-queue button (base) | min-height:25px |
| .missing-repair select (base) | min-width:0; min-height:28px |
| .missing-repair button (base) | min-height:28px; white-space:nowrap |
| .asset-grid (base) | min-height:0; grid-template-columns:repeat(auto-fill, minmax(118px, 1fr)); overflow:auto |
| .asset-grid article (base) | min-width:0; grid-template-columns:42px 1fr |
| .asset-grid strong, .asset-grid small, .asset-grid input (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .asset-grid input (base) | min-height:22px |
| .asset-inspector header strong (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .font-preview (base) | min-height:60px |
| .asset-inspector label (base) | min-height:29px |
| .asset-inspector label > *:last-child (base) | max-width:58% |
| .asset-inspector label code (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .asset-inspector label input:not([type='checkbox']), .asset-inspector label select (base) | min-height:24px |
| .asset-actions button (base) | min-width:0; min-height:32px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .text-preview (base) | min-height:82px; resize:vertical |
| .asset-technical>div (base) | grid-template-columns:minmax(70px,auto) minmax(0,1fr) 26px |
| .asset-technical code (base) | max-width:none; overflow:auto; white-space:nowrap; text-overflow:clip |
| .asset-technical button (base) | min-height:24px |
| .asset-overflow-menu (base) | max-height:min(260px,calc(42vh - 48px)); grid-template-columns:minmax(0,1fr); overflow-x:hidden; overflow-y:auto |
| .asset-overflow-menu>button (base) | min-width:0; min-height:31px; white-space:normal |
| .asset-grid (base) | grid-template-columns:repeat(auto-fill,minmax(var(--asset-size,112px),1fr)) |
| .asset-grid.asset-list article (base) | min-height:52px; grid-template-columns:38px minmax(0,1fr) minmax(80px,auto) |
| .importer-tabs (base) | grid-template-columns:repeat(5,minmax(0,1fr)) |
| .importer-tabs button (base) | min-width:0; min-height:28px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .collection-membership>button (base) | min-height:28px |
| .collection-membership>div (base) | grid-template-columns:1fr 30px |
| .collection-membership input (base) | max-width:none |
| .provenance-actions (base) | grid-template-columns:1fr 1fr |
| .provenance-actions button (base) | min-height:30px |
| .provenance-pane pre (base) | max-height:150px; overflow:auto; white-space:pre-wrap |
| .glyph-report article (base) | grid-template-columns:auto 1fr |
| .script-source textarea (base) | min-height:130px; resize:vertical; white-space:pre |
| .save-script (base) | min-height:32px |
| .mapping-editor label (base) | grid-template-columns:1fr 1fr 24px |
| .mapping-editor button (base) | min-height:26px |
| .console-list (base) | min-width:600px |
| .log-entry (base) | min-height:29px; grid-template-columns:72px 70px 1fr |
| .metric-grid (base) | grid-template-columns:repeat(auto-fit, minmax(145px, 1fr)) |
| .project-summary (base) | grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); overflow:auto |
| .asset-browser (@media (max-width: 1050px)) | grid-template-columns:105px minmax(140px, 1fr) |
| .asset-browser.inspecting (@media (max-width: 1050px)) | grid-template-columns:105px minmax(140px, 1fr) 195px |
| .folder-tree button (@media (max-width: 1050px)) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .asset-toolbar (@media (max-width: 1050px)) | grid-template-columns:1fr |
| .asset-filters (@media (max-width: 1050px)) | max-height:58px; overflow:auto |
| .asset-inspector label>span:first-child (@media (max-width: 1050px)) | max-width:46%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .asset-browser (@media (max-width: 760px)) | grid-template-columns:92px minmax(130px, 1fr) |
| .asset-browser.inspecting (@media (max-width: 760px)) | grid-template-columns:92px minmax(130px, 1fr) |
| .filter-popover (base) | max-height:290px; grid-template-columns:1fr 1fr; overflow:auto |
| .filter-popover>input,.filter-popover>select,.filter-popover>div (base) | min-height:29px |
| .filter-popover>div input (base) | min-width:0 |
| .external-changes article>span (base) | min-width:0 |
| .external-changes small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .external-changes button (base) | min-height:27px |
| .import-queue details (base) | max-height:90px; overflow:auto |
| .import-queue details code (base) | white-space:normal |
| .import-presets input,.import-presets select (base) | min-width:0; min-height:28px |
| .reference-summary button (base) | max-width:100% |
| .atlas-report code (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .content-closure article (base) | grid-template-columns:minmax(0,1fr) auto |
| .content-closure article button (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .atlas-report code (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .content-closure article (base) | grid-template-columns:minmax(0,1fr) auto |
| .content-closure article button (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .atlas-report code (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .content-closure article (base) | grid-template-columns:minmax(0,1fr) auto |
| .content-closure article button (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .asset-inspector (base) | container:nova-asset-inspector / inline-size |
| .asset-actions button (base) | white-space:normal |
| .asset-inspector label > span:first-child (@container nova-asset-inspector (max-width: 330px)) | max-width:100%; white-space:normal; overflow:visible |
| .asset-inspector label > *:last-child (@container nova-asset-inspector (max-width: 330px)) | max-width:100% |
| .asset-inspector label input:not([type='checkbox']), .asset-inspector label select (@container nova-asset-inspector (max-width: 330px)) | min-height:30px |
| .asset-inspector>nav button,.asset-inspector .asset-actions button (base) | white-space:normal |
| .asset-inspector>.importer-tabs (base) | grid-template-columns:repeat(auto-fit,minmax(min(100px,100%),1fr)) |
| .panel-content (base) | container:nova-assets-dock/inline-size |
| .asset-batch (base) | max-height:160px; overflow:auto |
| .asset-batch button (base) | min-height:30px; white-space:normal |
| .asset-browser.inspecting (base) | grid-template-columns:minmax(110px,16%) minmax(180px,1fr) minmax(280px,34%) |
| .asset-browser,.asset-browser.inspecting (@container nova-assets-dock (max-width:800px)) | grid-template-columns:minmax(90px,22%) minmax(0,1fr) |
| .asset-detail-toggle,.asset-detail-back (@container nova-assets-dock (max-width:800px)) | min-height:32px; white-space:normal |
| .asset-browser.details-visible (@container nova-assets-dock (max-width:800px)) | grid-template-columns:minmax(0,1fr) |
| .asset-inspector header strong (@container nova-assets-dock (max-width:800px)) | white-space:normal |
| .asset-inspector label > div:has(.numeric-draft) (base) | max-width:100% |
| .asset-inspector label > .numeric-draft (base) | max-width:100% |
| .asset-inspector .numeric-draft :deep(input) (base) | min-width:0 |
| .asset-workspace (base) | overflow:auto |
| .asset-workspace > .asset-grid (base) | min-height:160px |
| .asset-grid-window (base) | min-width:0 |
| .asset-detail-toggle (base) | min-height:32px; white-space:normal |
| .asset-browser.full-page-details (base) | grid-template-columns:minmax(0,1fr) |
| .asset-browser.full-page-details>.asset-inspector (base) | max-width:none |
| .asset-browser.full-page-details .asset-detail-back (base) | min-height:32px |
| .asset-browser.full-page-details .asset-inspector header strong (base) | white-space:normal |

- 键盘 44: keydown → createFolder
- 键盘 44: keydown → creatingFolder = false
- 键盘 58: keydown → saveFilter
- 键盘 107: keydown → assets.selectedGuid = asset.uuid; assetDetailMode = true
- 键盘 107: keydown → assets.selectedGuid = asset.uuid
- 键盘 124: keydown → commitRename
- 键盘 124: keydown → renamingGuid = null
- 键盘 287: keydown → saveSelectedPreset

## src/components/EditorFeedback.vue

- 责任/宿主：src/App.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=10, summary=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 4；加载/等待 2；错误/诊断 5；有数据循环 4。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | div v-if | feedback.banner |
| 5 | article v-for | toast in feedback.toasts |
| 5 | button v-if | toast.action |
| 6 | section v-if | state.statusCenterOpen |
| 9 | article v-if | build.phase !== 'idle' |
| 10 | article v-for | job in imports.jobs |
| 10 | button v-if | !['complete','failed','cancelled'].includes(job.status) |
| 10 | code v-else-if | job.error |
| 11 | article v-for | task in feedback.tasks |
| 11 | progress v-if | task.progress !== null |
| 11 | span v-else | (fallback) |
| 11 | button v-if | task.cancel && ['queued','running'].includes(task.status) |
| 11 | button v-if | task.retry && task.status === 'failed' |
| 11 | details v-if | task.error \|\| task.logs.length \|\| task.resources.length |
| 11 | code v-if | task.error |
| 11 | pre v-if | task.logs.length |
| 11 | nav v-if | task.resources.length |
| 11 | button v-for | resource in task.resources |
| 12 | p v-if | !hasTasks |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .feedback-banner (base) | min-height:40px |
| .feedback-banner span (base) | min-width:0 |
| .feedback-banner button (base) | min-width:32px; min-height:32px |
| .toast-stack article (base) | min-height:45px |
| .toast-stack span (base) | min-width:0 |
| .toast-stack button,.status-center button (base) | min-height:32px |
| .status-center (base) | max-height:min(680px,calc(100vh - 70px)) |
| .status-center>header (base) | min-height:55px |
| .task-list (base) | min-height:100px; overflow:auto |
| .task-list>article (base) | grid-template-columns:minmax(0,1fr) 125px auto |
| .task-list>article>div:first-child (base) | min-width:0 |
| .task-list small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .task-list details pre (base) | max-height:180px; overflow:auto; white-space:pre-wrap |

## src/components/ErrorRecovery.vue

- 责任/宿主：src/App.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=4, summary=1；直接键盘绑定 1；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | section v-if | fault |
| 8 | details v-if | fault.stack |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| article (base) | max-height:min(680px,92vh); overflow:auto |
| pre (base) | max-height:220px; overflow:auto; white-space:pre-wrap |
| button (base) | min-height:34px |

- 键盘 4: keydown → dismissActiveFault

## src/components/EventSheetEditor.vue

- 责任/宿主：src/components/ScriptWorkspace.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=15, input=7, select=4, summary=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 7；加载/等待 0；错误/诊断 4；有数据循环 10。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | ObjectBlueprintEditor v-if | blueprintEditorUuid |
| 5 | StudioDraftConflict v-if | eventDraftConflict |
| 10 | button v-for | asset in filteredAssets |
| 11 | p v-if | !filteredAssets.length |
| 28 | option v-for | component in selectedEntity?.components ?? [] |
| 29 | option v-for | asset in logicAssets |
| 30 | option v-for | asset in sheetAssets.filter(item => item.uuid !== activeAsset?.uuid) |
| 35 | li v-for | handler in effectiveHandlers |
| 37 | template v-if | handler.selector |
| 39 | button v-if | !handler.inherited |
| 40 | p v-if | !effectiveHandlers.length |
| 44 | article v-for | handler in visibleHandlers |
| 46 | option v-for | kind in eventKinds |
| 48 | label v-if | needsSelector(handler.kind) |
| 54 | p v-if | !visibleHandlers.length |
| 55 | option v-for | name in callbacks |
| 63 | button v-if | activeAsset |
| 67 | p v-for | issue in diagnostics |
| 67 | button v-if | issue.handlerUuid |
| 68 | p v-if | !diagnostics.length |
| 72 | article v-for | asset in blueprintAssets |
| 73 | p v-if | !blueprintAssets.length |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .event-studio (base) | min-width:0; min-height:0; grid-template-columns:238px minmax(420px,1fr) 284px; overflow:hidden |
| .sheet-browser,.event-details (base) | min-width:0; min-height:0; overflow:auto |
| .sheet-browser>header,.event-details section>header (base) | min-height:38px |
| .sheet-browser button span,.event-details button span (base) | min-width:0 |
| .sheet-browser button strong,.sheet-browser button small,.event-details button strong,.event-details button small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .quick-flow button (base) | min-height:30px |
| .sheet-main (base) | min-width:0; min-height:0 |
| .sheet-toolbar (base) | min-height:51px |
| .sheet-toolbar>div (base) | min-width:0 |
| .sheet-toolbar span (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .sheet-toolbar button (base) | min-height:32px |
| .object-context (base) | grid-template-columns:minmax(150px,1fr) repeat(3,minmax(135px,1fr)) |
| .object-context>div,.object-context label (base) | min-width:0 |
| .object-context strong,.object-context small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .event-list (base) | min-height:0; overflow:auto |
| .event-list>header (base) | min-height:46px |
| .event-list>header>div (base) | min-width:120px |
| .event-list>header input (base) | min-width:120px |
| .event-list>header button (base) | min-height:32px |
| .event-list article (base) | grid-template-columns:22px minmax(125px,.8fr) minmax(145px,1.2fr) minmax(115px,1fr) minmax(110px,1fr) 78px 115px 28px |
| .event-list article label,.event-copy (base) | min-width:0 |
| .event-copy small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .event-list input,.event-list select (base) | min-width:0 |
| .event-studio (@container nova-events (max-width:1180px)) | grid-template-columns:210px minmax(360px,1fr) |
| .event-list article (@container nova-events (max-width:1180px)) | grid-template-columns:22px minmax(120px,1fr) minmax(140px,1.2fr) minmax(120px,1fr) minmax(110px,1fr) 28px |
| .object-context (@container nova-events (max-width:1180px)) | grid-template-columns:repeat(2,minmax(150px,1fr)) |
| .event-list article (@container nova-events (max-width:760px)) | grid-template-columns:22px minmax(120px,1fr) minmax(140px,1fr) 28px |
| .object-context (@container nova-events (max-width:760px)) | grid-template-columns:1fr |
| .event-studio (base) | container:nova-events/inline-size |
| .event-layout (base) | min-width:0; min-height:0; grid-template-columns:238px minmax(0,1fr) 284px; overflow:auto |
| .sheet-main (base) | container:nova-event-main/inline-size |
| .sheet-toolbar>div,.event-list>header>div,.event-list>header input (base) | min-width:0 |
| .event-copy small,.object-context strong,.object-context small (base) | white-space:normal; overflow:visible |
| .sheet-toolbar button (base) | white-space:normal |
| .object-context (base) | grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr)) |
| .event-layout (@container nova-events (max-width:1180px)) | grid-template-columns:210px minmax(0,1fr) |
| .event-details (@container nova-events (max-width:1180px)) | grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr)) |
| .event-layout (@container nova-events (max-width:760px)) | grid-template-columns:minmax(0,1fr) |
| .sheet-browser (@container nova-events (max-width:760px)) | max-height:180px |
| .event-list article (@container nova-event-main (max-width:1000px)) | grid-template-columns:22px minmax(0,1fr) minmax(0,1fr) 30px |
| .blueprint-entry (base) | min-width:0 |
| .blueprint-entry>strong,.blueprint-entry>small (base) | white-space:normal |
| .blueprint-entry button (base) | min-width:0; min-height:32px; white-space:normal |
| .sheet-main (base) | overflow:auto |
| .event-list (base) | overflow:visible |
| .event-provenance (base) | min-width:0 |
| .event-provenance ol (base) | grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr)) |
| .event-provenance button (base) | min-height:32px |

## src/components/ExternalChangeDialog.vue

- 责任/宿主：src/App.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=4, summary=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 1。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 3 | div v-if | state.visible |
| 3 | li v-for | change in compared.slice(0,100) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .external-scrim>section (base) | max-height:min(720px,calc(100vh - 36px)); overflow:hidden |
| .summary (base) | grid-template-columns:auto auto minmax(0,1fr) |
| .summary code (base) | overflow:hidden; text-overflow:ellipsis |
| details (base) | min-height:0; overflow:auto |
| li (base) | grid-template-columns:70px 70px minmax(0,1fr) |
| li code (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| footer button (base) | min-height:34px |

## src/components/GameplayComponentsInspector.vue

- 责任/宿主：src/components/ConfigPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 input=14, select=6；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 6。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 3 | section v-if | grid |
| 3 | option v-for | action in vectorActions |
| 4 | section v-if | platform |
| 4 | option v-for | action in scalarActions |
| 4 | option v-for | action in buttonActions |
| 5 | section v-if | topDown |
| 5 | option v-for | action in vectorActions |
| 6 | section v-if | health |
| 7 | section v-if | hitbox |
| 8 | section v-if | collectible |
| 9 | section v-if | projectile |
| 10 | section v-if | spawner |
| 10 | option v-for | asset in prefabAssets |
| 11 | section v-if | cooldown |
| 12 | section v-if | lifetime |
| 13 | section v-if | mouseFollower |
| 14 | section v-if | follow |
| 14 | option v-for | candidate in targets |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| label (base) | min-height:34px |
| label>input,label>select,label>div (base) | min-width:0 |
| label>div (base) | grid-template-columns:minmax(0,1fr) minmax(0,1fr) |
| .numeric-draft (base) | max-width:100% |

## src/components/GraphProductionPanel.vue

- 责任/宿主：src/components/VisualGraphEditor.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=47, input=18, select=7, textarea=3；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 3；加载/等待 0；错误/诊断 3；有数据循环 27。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 5 | button v-for | item in tabs |
| 8 | div v-if | tab === 'structure' |
| 11 | article v-for | routine in graph.routines |
| 15 | option v-for | contract in graph.interfaces |
| 16 | template v-if | scopeUuid === routine.uuid |
| 19 | div v-for | parameter in [...routine.inputs,...routine.outputs] |
| 19 | option v-for | type in valueTypes |
| 20 | div v-for | local in routine.locals |
| 20 | option v-for | type in valueTypes |
| 23 | p v-if | !graph.routines.length |
| 26 | article v-for | event in graph.customEvents |
| 26 | div v-for | parameter in event.parameters |
| 26 | option v-for | type in valueTypes |
| 29 | article v-for | contract in graph.interfaces |
| 29 | div v-for | method in contract.methods |
| 29 | div v-for | parameter in [...method.inputs,...method.outputs] |
| 29 | option v-for | type in valueTypes |
| 32 | option v-for | item in availableLibraries |
| 34 | div v-for | library in graph.libraries |
| 37 | div v-else-if | tab === 'debug' |
| 43 | div v-for | (watch,index) in graph.debug.watches |
| 45 | article v-for | point in graph.debug.breakpoints |
| 47 | button v-for | frame in graphDebugState.callStack |
| 49 | button v-for | timing in graphTimings |
| 51 | button v-for | error in graphErrors |
| 54 | div v-else-if | tab === 'refactor' |
| 56 | option v-for | symbol in symbols |
| 58 | button v-for | reference in references |
| 58 | p v-if | symbolUuid && !references.length |
| 64 | li v-for | migration in graph.migrations.slice().reverse().slice(0,20) |
| 67 | div v-else-if | tab === 'merge' |
| 73 | p v-if | mergeError |
| 74 | button v-for | change in diff.slice(0,100) |
| 75 | article v-for | conflict in mergeResult?.conflicts |
| 76 | button v-if | mergeResult |
| 79 | div v-else | (fallback) |
| 84 | article v-for | item in conversionCoverage.escapeBlocks |
| 85 | p v-if | linkedScripts.length |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .production-panel (base) | container:production-panel/inline-size; min-width:0; overflow:visible |
| .production-tabs (base) | grid-template-columns:repeat(auto-fit,minmax(88px,1fr)) |
| .production-tabs button (base) | min-width:0; min-height:36px; overflow:hidden |
| .production-content (base) | min-width:0 |
| .production-content>header,.subhead (base) | min-width:0; min-height:30px |
| .production-content>header strong,.subhead strong (base) | min-width:0 |
| .production-content button,.production-content input,.production-content select,.production-content textarea (base) | max-width:100%; min-width:0 |
| .production-content>button,.action-grid button,.inline-action button,.symbol-row button,.conflict-card button (base) | min-height:36px; overflow:hidden |
| .production-content input,.production-content select (base) | min-height:36px |
| .production-content textarea (base) | min-height:64px; resize:vertical |
| .action-grid (base) | min-width:0; grid-template-columns:repeat(auto-fit,minmax(106px,1fr)) |
| .action-grid.three,.action-grid.four (base) | grid-template-columns:repeat(auto-fit,minmax(88px,1fr)) |
| .production-card,.breakpoint-card,.conflict-card (base) | min-width:0 |
| .card-title,.checks,.breakpoint-card>div,.conflict-card>div (base) | min-width:0 |
| .card-title .name (base) | min-width:96px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .card-title small,.conflict-card small (base) | min-width:0 |
| .danger (base) | min-width:32px |
| .checks label (base) | min-width:0 |
| .symbol-row (base) | min-width:0; min-height:36px |
| .symbol-row input:not([type=checkbox]) (base) | min-width:96px |
| .symbol-row select (base) | min-width:86px |
| .symbol-row small (base) | min-width:0; max-width:100% |
| .grow (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .interface-method (base) | min-width:0 |
| .hint,.debug-reason (base) | min-width:0 |
| .metric-grid (base) | min-width:0; grid-template-columns:repeat(auto-fit,minmax(82px,1fr)) |
| .metric-grid span (base) | min-width:0 |
| .watch-row (base) | min-width:0; grid-template-columns:minmax(90px,1fr) minmax(70px,1fr) 32px |
| .watch-row code (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .breakpoint-card>div button (base) | min-width:90px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .trace-row,.error-row,.reference-list button (base) | min-width:0; grid-template-columns:auto minmax(0,1fr) |
| .trace-row strong,.error-row strong,.reference-list strong (base) | min-width:0 |
| .trace-row small,.error-row small,.reference-list small (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .inline-action (base) | min-width:0; grid-template-columns:minmax(0,1fr) |
| .reference-list (base) | max-width:100%; max-height:150px; overflow:auto |
| .migration-list (base) | max-width:100%; max-height:150px; overflow:auto |
| .code-view pre (base) | max-width:100%; max-height:480px; overflow:auto; white-space:pre |
| .conversion-coverage (base) | min-width:0; grid-template-columns:auto minmax(0,1fr) |
| .conversion-coverage span (base) | min-width:0 |
| .conversion-coverage small,.escape-block small (base) | min-width:0 |
| .escape-block (base) | min-width:0 |
| .escape-block code (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .link-status (base) | min-width:0 |
| .action-grid,.action-grid.three,.action-grid.four,.metric-grid (@container production-panel (max-width:300px)) | grid-template-columns:minmax(0,1fr) |
| .symbol-row select (@container production-panel (max-width:300px)) | max-width:none |
| .watch-row (@container production-panel (max-width:300px)) | grid-template-columns:minmax(0,1fr) 32px |
| .conversion-coverage (@container production-panel (max-width:300px)) | grid-template-columns:minmax(0,1fr) |
| .production-panel :is(input,select,textarea,button) (base) | max-width:100% |
| .trace-row small,.error-row small,.reference-list small,.grow (base) | white-space:normal; overflow:visible |
| .watch-row code (base) | white-space:pre-wrap |
| .code-view pre (base) | white-space:pre-wrap |
| .symbol-row input:not([type=checkbox]),.card-title .name (@container production-panel (max-width:300px)) | min-width:0 |
| .production-tabs (@container production-panel (max-width:300px)) | grid-template-columns:minmax(0,1fr) |
| .trace-row,.error-row,.reference-list button (@container production-panel (max-width:300px)) | grid-template-columns:minmax(0,1fr) |

## src/components/ImportedAssetBindings.vue

- 责任/宿主：src/components/ContentAssetInspector.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=1, select=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 1；有数据循环 2。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 5 | label v-for | slot in slots |
| 5 | option v-for | candidate in candidates(slot.kind) |
| 5 | button v-if | resolveAsset(slot.reference) |
| 6 | p v-if | error \|\| slotResult.error |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .imported-bindings label (base) | grid-template-columns:minmax(0,1fr) |
| .imported-bindings label>span (base) | white-space:normal |
| .imported-bindings select,.imported-bindings button (base) | max-width:100%; min-width:0; min-height:32px; white-space:normal |

## src/components/LayerBar.vue

- 责任/宿主：src/layout/EditorLayout.vue；src/panels/ScenePanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=2；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 1。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 2 | button v-for | layer in state.layers |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .layer-bar (base) | max-height:calc(100% - 24px) |
| .layer-header (base) | overflow:hidden |
| .layer-list (base) | overflow:auto |
| button (base) | min-height:34px; min-width:0 |
| button span (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |

## src/components/LimitNumberInput.vue

- 责任/宿主：src/components/RuntimeComponentsInspector.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 1；加载/等待 0；错误/诊断 0；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | span v-if | unlimited |
| 5 | NumericExpressionInput v-if | !unlimited |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .limit-number-control (base) | min-width:0 |
| .limit-number-control button (base) | white-space:normal; min-height:30px |

## src/components/ManageWorkspace.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 1。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 10 | button v-for | item in sections |
| 10 | i v-if | sectionDirty(item.id) |
| 13 | CreatorLearningCenter v-if | state.manageSection === 'learn' |
| 14 | SettingsPanel v-else-if | state.manageSection === 'settings' |
| 15 | AutomationStudio v-else-if | state.manageSection === 'automation' |
| 16 | PackageManagerPanel v-else-if | state.manageSection === 'packages' |
| 17 | ProjectHealthPanel v-else-if | state.manageSection === 'project' |
| 18 | RenderingPanel v-else-if | state.manageSection === 'rendering' |
| 19 | BuildSettingsPanel v-else | (fallback) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .manage-workspace (base) | min-width:0; min-height:0 |
| .manage-header (base) | min-height:76px |
| .manage-header>div (base) | min-width:0 |
| .lifecycle (base) | max-width:330px |
| .manage-body (base) | min-height:0; grid-template-columns:220px minmax(0,1fr) |
| .manage-body>nav (base) | overflow:auto |
| .manage-body>nav button (base) | min-width:0; min-height:52px; grid-template-columns:28px minmax(0,1fr) |
| .manage-body>nav button>span:last-child (base) | min-width:0 |
| .manage-body>nav strong,.manage-body>nav small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .manage-body>main (base) | min-width:0; min-height:0; overflow:hidden |
| .manage-body>main>:deep(*) (base) | max-width:100% |
| .manage-header (@media (max-width:760px)) | min-height:64px |
| .manage-body (@media (max-width:760px)) | grid-template-columns:54px minmax(0,1fr) |
| .manage-body>nav button (@media (max-width:760px)) | grid-template-columns:1fr |
| .manage-body>nav button>span:last-child (@media (max-width:760px)) | overflow:hidden |
| .manage-body > nav strong, .manage-body > nav small (base) | white-space:normal |

## src/components/ManualViewer.vue

- 责任/宿主：src/App.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=2；直接键盘绑定 1；非原生点击候选 0。
- 状态索引：空/选择条件 1；加载/等待 1；错误/诊断 0；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | section v-if | state.visible |
| 7 | div v-if | !loaded |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .manual-viewer (base) | overflow:hidden |
| .manual-viewer>header (base) | min-height:46px |
| .manual-viewer button (base) | min-height:30px |
| .manual-viewer iframe (base) | min-width:0; min-height:0 |

- 键盘 4: keydown → closeBundledManual

## src/components/MaterialGraphEditor.vue

- 责任/宿主：src/components/RenderingPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=4, input=7, select=3, summary=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 10；加载/等待 0；错误/诊断 0；有数据循环 5。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 11 | button v-for | kind in filteredKinds |
| 14 | path v-for | edge in lines |
| 15 | button v-for | node in document.nodes |
| 20 | template v-if | selectedNode |
| 25 | label v-if | hasAmount |
| 26 | label v-if | hasStrength |
| 27 | label v-if | selectedNode.kind === 'Number' |
| 28 | label v-if | selectedNode.kind === 'Color' \|\| selectedNode.kind === 'Outline' |
| 29 | label v-if | selectedNode.kind === 'Gradient' |
| 30 | label v-if | selectedNode.kind === 'Gradient' |
| 31 | label v-if | selectedNode.kind === 'Palette' |
| 32 | label v-if | selectedNode.kind === 'Dissolve' |
| 33 | label v-if | selectedNode.kind === 'Dissolve' |
| 34 | label v-for | pin in selectedInputPins |
| 35 | option v-for | node in inputCandidates |
| 37 | button v-if | selectedNode.kind !== 'Output' |
| 39 | p v-else | (fallback) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .material-graph-editor (base) | min-height:360px; overflow:hidden |
| header,footer (base) | min-height:42px |
| .graph-workspace (base) | min-height:0; grid-template-columns:minmax(150px,190px) minmax(460px,1fr) minmax(190px,240px) |
| .graph-workspace>aside (base) | min-width:0; overflow:auto |
| aside>button (base) | min-height:30px |
| .graph-canvas (base) | min-width:0; overflow:auto |
| .graph-canvas svg (base) | min-width:100%; min-height:100% |
| .graph-node small (base) | overflow:hidden; text-overflow:ellipsis |
| .generated-source (base) | max-height:130px; overflow:auto |
| .generated-source pre (base) | white-space:pre-wrap |
| footer span (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .graph-workspace (@container nova-material (max-width:1100px)) | grid-template-columns:150px minmax(430px,1fr) |
| .details (@container nova-material (max-width:1100px)) | max-height:180px |
| .graph-workspace (@container nova-material (max-width:760px)) | grid-template-columns:1fr |
| .graph-workspace>aside (@container nova-material (max-width:760px)) | max-height:120px |
| .graph-canvas (@container nova-material (max-width:760px)) | min-height:420px |
| .details (@container nova-material (max-width:760px)) | max-height:220px |
| .graph-workspace>aside>button (base) | white-space:normal |
| .material-graph-editor (base) | container:nova-material/inline-size; min-width:0 |
| .material-graph-editor>header>* (base) | min-width:0; max-width:100% |
| .graph-workspace (base) | overflow:auto |
| .graph-workspace input,.graph-workspace select (base) | min-width:0; max-width:100% |
| .graph-node strong (base) | white-space:normal |
| footer span (base) | white-space:normal; overflow:visible |
| .graph-workspace (@container nova-material (max-width:1100px)) | grid-template-columns:minmax(130px,170px) minmax(0,1fr) |
| .details (@container nova-material (max-width:1100px)) | max-height:260px |
| .graph-workspace (@container nova-material (max-width:680px)) | grid-template-columns:minmax(0,1fr) |
| .graph-workspace>aside (@container nova-material (max-width:680px)) | max-height:180px |
| .graph-canvas (@container nova-material (max-width:680px)) | min-height:320px |
| .details (@container nova-material (max-width:680px)) | max-height:260px |

## src/components/MobileShell.vue

- 责任/宿主：src/App.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 无；直接键盘绑定 1；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 55 | section v-if | portrait |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .mobile-rotate (base) | overflow:auto |
| .mobile-rotate p (base) | max-width:38em |
| :root[data-mobile-editor='true'] button,:root[data-mobile-editor='true'] select,:root[data-mobile-editor='true'] input:not([type='checkbox']):not([type='radio']) (@media (pointer:coarse)) | min-height:44px |

- 键盘 55: keydown → (fallback)

## src/components/NetworkStudioPanel.vue

- 责任/宿主：src/components/EditorBottomPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=33, input=58, select=21, summary=1；直接键盘绑定 1；非原生点击候选 0。
- 状态索引：空/选择条件 6；加载/等待 0；错误/诊断 3；有数据循环 28。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 6 | button v-for | tab in tabs |
| 9 | p v-if | networkFormError18 |
| 11 | main v-if | !networkPackageEnabled |
| 15 | main v-else-if | activeTab === 'session' |
| 20 | button v-if | !settings.networking.permissionGranted |
| 20 | button v-else | (fallback) |
| 32 | template v-if | settings.networking.sessionMode === 'direct' |
| 34 | option v-for | adapter in reviewedAdapters |
| 42 | p v-if | connectionEdited18 |
| 44 | div v-if | settings.networking.sessionMode === 'local' |
| 46 | div v-if | networkState?.lastError |
| 50 | article v-for | peer in networkState?.peerDetails ?? [] |
| 51 | p v-if | !networkState?.peerDetails.length |
| 57 | option v-for | service in identityServices |
| 58 | option v-for | service in lobbyServices |
| 59 | option v-for | service in relayServices |
| 62 | section v-if | settings.networking.sessionMode === 'local' |
| 65 | article v-for | lobby in localLobbyDirectoryState.lobbies |
| 69 | main v-else-if | activeTab === 'protocol' |
| 72 | article v-for | channel in settings.networking.channels |
| 92 | article v-for | rpc in settings.networking.rpcContracts |
| 94 | option v-for | channel in settings.networking.channels |
| 97 | option v-for | schema in payloadSchemas |
| 105 | main v-else-if | activeTab === 'replication' |
| 117 | article v-for | definition in settings.networking.replicatedEntities |
| 120 | label v-if | definition.authority === 'owner' |
| 131 | main v-else-if | activeTab === 'orchestration' |
| 135 | label v-if | settings.networking.authentication.mode === 'hook' |
| 135 | option v-for | provider in authenticationProviders |
| 153 | option v-for | owner in networkState?.ownership ?? [] |
| 154 | option v-for | peer in networkState?.peerDetails ?? [] |
| 156 | code v-for | owner in networkState?.ownership ?? [] |
| 161 | option v-for | scene in sceneManager.scenes |
| 162 | option v-for | peer in networkState?.peerDetails ?? [] |
| 170 | button v-for | count in peerCountPresets |
| 174 | p v-if | multiInstancePrerequisiteReason |
| 175 | div v-if | launchedInstances.length |
| 176 | article v-for | instance in launchedInstances |
| 183 | span v-if | instance.exitCode != null |
| 192 | section v-if | selectedInstance |
| 194 | template v-if | instanceDetailMode === 'logs' |
| 196 | div v-if | filteredInstanceEvents.length |
| 196 | article v-for | event in filteredInstanceEvents |
| 197 | p v-else | (fallback) |
| 199 | template v-else | (fallback) |
| 204 | p v-else | (fallback) |
| 205 | p v-if | multiInstanceNotice |
| 206 | p v-if | multiInstanceError |
| 210 | main v-else-if | activeTab === 'simulation' |
| 224 | option v-for | asset in multiplayerReplayAssets |
| 225 | option v-for | asset in multiplayerReplayAssets |
| 227 | p v-if | multiplayerReplayState.lastComparison |
| 232 | option v-for | asset in multiplayerSaveAssets |
| 238 | main v-else | (fallback) |
| 242 | dl v-if | networkState |
| 245 | article v-for | event in networkState?.events.slice(-200).reverse() ?? [] |
| 248 | article v-for | packet in networkState?.packetSummaries.slice(-300).reverse() ?? [] |
| 250 | article v-for | entry in networkState?.rollbackTimeline.slice(-200).reverse() ?? [] |
| 251 | article v-for | diff in networkState?.replicationDiffs.slice(-200).reverse() ?? [] |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .network-studio (base) | min-height:0; overflow:hidden; container-type:inline-size |
| .studio-header (base) | min-height:52px; grid-template-columns:minmax(170px, .5fr) minmax(500px, 1.65fr) auto |
| .studio-header > div (base) | min-width:0 |
| .studio-header nav (base) | min-width:0; grid-template-columns:repeat(6, minmax(76px, 1fr)); overflow-x:auto |
| .studio-header button, .card button, .empty-state button (base) | min-height:30px; max-width:100%; white-space:normal |
| .studio-header > output (base) | max-width:150px |
| .studio-grid (base) | min-height:0; grid-template-columns:repeat(3, minmax(220px, 1fr)); overflow:auto |
| .network-wide-grid (base) | grid-template-columns:repeat(3, minmax(240px, 1fr)) |
| .card (base) | min-width:0; max-width:100%; overflow:hidden |
| .card > header (base) | min-height:32px |
| .card > header > * (base) | min-width:0 |
| .card > label, .limits-card label (base) | min-height:35px |
| .card > label > span (base) | min-width:0 |
| .card > label input:not([type="checkbox"]), .card > label select (base) | min-width:0; max-width:100% |
| .card input, .card select (base) | max-width:100% |
| .table-scroll, .event-list, .packet-list, .timeline-list (base) | max-width:100%; max-height:310px; overflow:auto |
| .channel-row, .rpc-row, .replication-row (base) | min-width:720px |
| .channel-row (base) | grid-template-columns:120px 160px 1fr 1fr 1fr 28px |
| .rpc-row (base) | grid-template-columns:120px 105px 145px 90px 85px 90px 75px 28px |
| .replication-row (base) | min-width:880px; grid-template-columns:minmax(120px, 1fr) 90px minmax(210px, 1.4fr) 88px 72px 105px 86px 28px |
| .channel-row label, .replication-row label (base) | min-height:28px |
| .peers-card article span, .lobby-list article span (base) | min-width:0 |
| .peers-card code (base) | max-width:55%; white-space:normal |
| .metrics-card dl (base) | grid-template-columns:1fr 1fr |
| .metrics-card dl div (base) | min-width:0 |
| .metrics-card dt (base) | min-width:0 |
| .event-list article, .packet-list article, .timeline-list article (base) | min-height:29px |
| .event-list article (base) | grid-template-columns:72px 58px minmax(0, 1fr) |
| .packet-list article (base) | grid-template-columns:80px 90px minmax(0, 1fr) 70px 24px |
| .timeline-list article (base) | grid-template-columns:64px minmax(0, .8fr) minmax(0, 1.5fr) |
| .coordinate-row (base) | grid-template-columns:repeat(2, minmax(0, 1fr)) |
| .ownership-list (base) | max-height:130px; overflow:auto |
| .ownership-list code (base) | white-space:normal |
| .peer-count-picker (base) | grid-template-columns:repeat(3, minmax(48px, 1fr)) |
| .peer-count-picker button (base) | min-height:34px |
| .service-selector-grid (base) | grid-template-columns:repeat(3, minmax(0, 1fr)) |
| .service-selector-grid label (base) | min-width:0 |
| .service-selector-grid select (base) | min-width:0 |
| .instance-grid (base) | grid-template-columns:repeat(auto-fit, minmax(min(100%, 180px), 1fr)) |
| .instance-grid article (base) | min-width:0 |
| .instance-grid span, .instance-grid code (base) | min-width:0; white-space:normal |
| .instance-card-title strong (base) | min-width:0 |
| .instance-card-actions (base) | grid-template-columns:repeat(3, minmax(0, 1fr)) |
| .instance-card-actions button (base) | min-width:0 |
| .instance-detail > header span (base) | min-width:0 |
| .instance-detail dl (base) | grid-template-columns:repeat(2, minmax(0, 1fr)) |
| .instance-detail dl div (base) | min-width:0 |
| .instance-event-list (base) | max-height:150px; overflow:auto |
| .instance-event-list article (base) | grid-template-columns:78px minmax(0, 1fr) |
| .empty-state (base) | max-width:520px |
| .studio-header (@container (max-width: 1000px)) | grid-template-columns:minmax(0, 1fr) auto |
| .studio-grid (@container (max-width: 1000px)) | grid-template-columns:repeat(2, minmax(0, 1fr)) |
| .service-selector-grid (@container (max-width: 880px)) | grid-template-columns:1fr |
| .channel-row,   .rpc-row,   .replication-row (@container (max-width: 880px)) | min-width:0; grid-template-columns:repeat(2, minmax(0, 1fr)) |
| .channel-row > *,   .rpc-row > *,   .replication-row > * (@container (max-width: 880px)) | min-width:0 |
| .metrics-card dl (@container (max-width: 620px)) | grid-template-columns:1fr |
| .instance-detail dl (@container (max-width: 620px)) | grid-template-columns:1fr |
| .table-scroll (@container (max-width: 620px)) | max-height:360px |
| .event-list article,   .timeline-list article (@container (max-width: 620px)) | grid-template-columns:62px minmax(0, 1fr) |
| .packet-list article (@container (max-width: 620px)) | grid-template-columns:72px minmax(0, 1fr) 44px 22px |
| .coordinate-row (@container (max-width: 620px)) | grid-template-columns:1fr 1fr |
| .peer-count-picker (@container (max-width: 420px)) | grid-template-columns:repeat(3, 1fr) |
| .network-draft-error (base) | max-height:25%; overflow:auto |
| .studio-header nav (base) | grid-template-columns:repeat(6, minmax(max-content, 1fr)) |
| .studio-header nav button (base) | white-space:nowrap |
| .card > label input:not([type="checkbox"]), .card > label select (base) | min-width:min(100%, 96px) |
| .table-scroll (base) | max-height:none; overflow:visible |
| .channel-row, .rpc-row, .replication-row (base) | min-width:0; grid-template-columns:repeat(auto-fit, minmax(min(100%, 12rem), 1fr)) |
| .channel-row > label, .rpc-row > label, .replication-row > label (base) | min-width:0 |
| .channel-row input, .channel-row select, .rpc-row input, .rpc-row select, .replication-row input:not([type="checkbox"]), .replication-row select (base) | min-width:0 |
| .replication-row > strong, .replication-row > fieldset (base) | min-width:0 |
| .card pre (base) | white-space:pre-wrap |
| .card details (base) | max-width:100% |

- 键盘 6: keydown → handleTabKeydown

## src/components/NumericExpressionInput.vue

- 责任/宿主：src/components/ConfigPanel.vue；src/components/ConnectionBuilder.vue；src/components/DeviceInputPanel.vue；src/components/EditorBottomPanel.vue；src/components/EventSheetEditor.vue；src/components/GameplayComponentsInspector.vue；src/components/LimitNumberInput.vue；src/components/MaterialGraphEditor.vue；src/components/ParticleGraphEditor.vue；src/components/PhysicsSettingsPanel.vue；src/components/PresentationPanel.vue；src/components/RenderingPanel.vue；src/components/RuntimeComponentsInspector.vue；src/components/WorldComponentsInspector.vue；src/panels/SettingsPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=2, input=1；直接键盘绑定 4；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 1；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | span v-if | step |
| 5 | small v-if | error |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .numeric-draft (base) | min-width:min(100%,10ch); max-width:100% |
| .numeric-draft:has(.numeric-steppers) (base) | min-width:min(100%,calc(10ch + 64px)) |
| .numeric-value-row (base) | min-width:0 |
| .numeric-draft input (base) | min-width:0 |
| .numeric-steppers button (base) | min-width:28px |
| .numeric-draft small (base) | white-space:normal |

- 键盘 4: keydown → stepBy(1,$event)
- 键盘 4: keydown → stepBy(-1,$event)
- 键盘 4: keydown → commit
- 键盘 4: keydown → reset

## src/components/ObjectBlueprintEditor.vue

- 责任/宿主：src/components/ConfigPanel.vue；src/components/EventSheetEditor.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=6, input=3, select=3, textarea=2, summary=2；直接键盘绑定 1；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 3；有数据循环 7。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 6 | template v-if | dirty |
| 7 | StudioDraftConflict v-if | conflict |
| 8 | p v-if | status |
| 9 | p v-if | !canEdit |
| 10 | div v-if | document |
| 14 | option v-for | asset in assetsOf('objectBlueprint').filter(asset=>asset.uuid!==assetUuid) |
| 15 | option v-for | asset in assetsOf('prefab') |
| 16 | option v-for | asset in assetsOf('eventSheet') |
| 20 | label v-for | kind in componentKinds |
| 20 | label v-for | kind in componentKinds |
| 23 | li v-for | source in provenance |
| 25 | ul v-if | diagnostics.length |
| 25 | li v-for | (issue,index) in diagnostics |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .blueprint-editor (base) | max-height:calc(100dvh - 32px); min-width:0; overflow:hidden |
| header>div (base) | min-width:0 |
| header>button (base) | min-width:32px; min-height:32px |
| .blueprint-form (base) | min-height:0; overflow:auto |
| fieldset (base) | min-width:0 |
| .blueprint-fields (base) | grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr)) |
| .blueprint-fields label (base) | min-width:0 |
| input:not([type=checkbox]),select,textarea (base) | min-width:0; max-width:100%; min-height:34px |
| textarea (base) | resize:vertical |
| .component-columns (base) | grid-template-columns:repeat(2,minmax(0,1fr)) |
| .component-columns label (base) | min-height:30px |
| .component-columns span (base) | min-width:0 |
| footer button (base) | min-height:34px; white-space:normal |
| .blueprint-editor (@media (max-width:600px)) | max-height:calc(100dvh - 16px) |
| .component-columns (@media (max-width:600px)) | grid-template-columns:1fr |
| .blueprint-diagnostics button (base) | min-height:32px |

- 键盘 4: keydown → requestClose

## src/components/ObjectOwnershipPanel.vue

- 责任/宿主：src/components/ConfigPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=10, input=1, summary=6；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 2；有数据循环 8。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 5 | div v-if | expanded |
| 6 | template v-if | view.runtime.generation !== null |
| 7 | p v-if | view.runtime.active |
| 10 | p v-if | error |
| 11 | p v-for | issue in view.diagnostics |
| 12 | article v-for | source in matchingSources |
| 13 | details v-if | view.composition.length |
| 13 | article v-for | (item,index) in view.composition |
| 14 | p v-if | !matchingProperties.length |
| 14 | article v-for | row in matchingProperties |
| 14 | template v-if | row.hasBaseline |
| 14 | template v-if | row.hasRuntime |
| 14 | small v-if | row.runtimeChanged |
| 14 | button v-if | row.owner |
| 14 | button v-if | canLocate(row.path) |
| 15 | article v-for | event in matchingEvents |
| 15 | button v-if | event.sheet |
| 15 | button v-if | event.logic |
| 16 | details v-if | view.runtime.active |
| 16 | article v-for | behavior in view.runtime.behaviors |
| 16 | article v-for | (item,index) in view.runtime.subscriptions |
| 16 | article v-for | (timer,index) in view.runtime.timers |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .object-ownership (base) | container-type:inline-size; min-width:0 |
| summary (base) | white-space:normal |
| .ownership-body (base) | min-width:0 |
| .ownership-body input,.ownership-body button (base) | min-width:0; max-width:100%; min-height:32px; white-space:normal |
| .ownership-body details (base) | min-width:0 |
| .ownership-source,.ownership-property (base) | min-width:0 |
| dl (base) | grid-template-columns:minmax(0,1fr) |
| dd (base) | white-space:pre-wrap; max-height:220px; overflow:auto |
| dl (@container (min-width:420px)) | grid-template-columns:minmax(110px,.6fr) minmax(0,1fr) |

## src/components/PackageManagerPanel.vue

- 责任/宿主：src/components/ManageWorkspace.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=12, input=5, select=1；直接键盘绑定 4；非原生点击候选 0。
- 状态索引：空/选择条件 20；加载/等待 0；错误/诊断 0；有数据循环 8。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 12 | PluginSettings v-if | pluginToolsOpen |
| 13 | nav v-if | !registryOpen && !pluginToolsOpen |
| 14 | button v-for | tab in statuses |
| 18 | div v-if | registryOpen && !pluginToolsOpen |
| 20 | option v-for | registry in packages.registries |
| 21 | article v-for | manifest in catalog |
| 22 | span v-if | manifest.publisherVerified |
| 24 | p v-if | !catalog.length |
| 26 | aside v-if | selectedRegistry |
| 29 | b v-if | selectedRegistry.publisherVerified |
| 30 | template v-if | reviewRegistry.blocking.length |
| 30 | template v-if | reviewRegistry.warnings.length |
| 30 | button v-if | reviewRegistry.blocking.length \|\| reviewRegistry.warnings.length |
| 31 | span v-for | permission in selectedRegistry.permissions |
| 31 | p v-if | !selectedRegistry.permissions.length |
| 34 | p v-if | !installReviewRegistry.executionAllowed |
| 38 | div v-else-if | !pluginToolsOpen |
| 40 | article v-for | item in visiblePackages |
| 46 | p v-if | !visiblePackages.length |
| 48 | aside v-if | selected |
| 64 | ul v-if | compatibility.length |
| 64 | li v-for | problem in compatibility |
| 65 | p v-else | (fallback) |
| 69 | ul v-if | Object.keys(selected.manifest.dependencies).length |
| 69 | li v-for | (range,id) in selected.manifest.dependencies |
| 70 | p v-else | (fallback) |
| 72 | section v-if | selected.manifest.pluginApi === 2 |
| 74 | span v-for | permission in pluginManifest?.permissions ?? [] |
| 75 | p v-if | pluginManifest?.entryType === 'native' |
| 77 | section v-if | update |
| 77 | p v-if | updatePermissions.length |
| 78 | section v-if | rollbackAvailable |
| 81 | aside v-else | (fallback) |
| 85 | p v-if | plugins.safeModeRecommended |
| 87 | p v-if | cacheProblems.length |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .plugin-manager-tools (base) | min-height:0; overflow:auto |
| .package-manager (base) | min-width:0; overflow:hidden |
| .package-header (base) | min-height:48px |
| .package-header>div (base) | min-width:0 |
| .package-header small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .offline (base) | white-space:nowrap |
| .package-tabs (base) | min-height:36px; overflow-x:auto |
| .package-tabs button (base) | min-width:max-content |
| .package-layout (base) | min-height:0; grid-template-columns:minmax(300px,1fr) minmax(260px,32%) |
| .package-list,.package-inspector (base) | min-height:0; overflow:auto |
| .package-list article (base) | min-width:0; min-height:53px; grid-template-columns:38px minmax(0,1fr) auto auto |
| .package-name (base) | min-width:0 |
| .package-name strong,.package-name small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .package-list label (base) | white-space:nowrap |
| .package-inspector dl div (base) | min-width:0; grid-template-columns:95px minmax(0,1fr) |
| .package-inspector dd (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .danger (base) | min-height:32px |
| .package-layout (@media (max-width:800px)) | grid-template-columns:1fr |
| .primary-action (base) | min-height:30px |
| .registry-layout (base) | min-height:0; grid-template-columns:minmax(300px,1fr) minmax(260px,34%); overflow:hidden |
| .registry-list,.registry-inspector (base) | min-height:0; overflow:auto |
| .registry-list>header (base) | grid-template-columns:minmax(130px,220px) minmax(140px,1fr) |
| .registry-list>header>* (base) | min-width:0 |
| .registry-list>article (base) | min-width:0; grid-template-columns:38px minmax(0,1fr) auto |
| .registry-list>article>div:nth-child(2) (base) | min-width:0 |
| .registry-list strong,.registry-list small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .verified (base) | white-space:nowrap |
| .registry-inspector>header>div (base) | min-width:0 |
| .registry-inspector>header small (base) | overflow:hidden; text-overflow:ellipsis |
| .registry-inspector dl div (base) | grid-template-columns:90px minmax(0,1fr) |
| .registry-inspector dd (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .registry-links (base) | grid-template-columns:1fr 1fr |
| .registry-links button,.registry-inspector>.install (base) | min-height:30px |
| .package-tabs (@media (max-width:800px)) | overflow:visible |
| .package-list article (@media (max-width:800px)) | grid-template-columns:38px minmax(0,1fr) auto |
| .registry-layout (@media (max-width:800px)) | grid-template-columns:1fr |
| .package-manager (base) | container-type:inline-size |
| .package-header button,.package-tabs button (base) | white-space:normal |
| .registry-inspector dd,.package-inspector dd,.registry-inspector p,.package-inspector p (base) | white-space:normal; overflow:visible; text-overflow:clip |
| .package-layout,.registry-layout (@container (max-width:850px)) | grid-template-columns:minmax(0,1fr); overflow:auto |
| .package-inspector,.registry-inspector (@container (max-width:850px)) | min-width:0; max-width:100%; overflow:visible |
| .package-list,.registry-list (@container (max-width:850px)) | overflow:visible |
| .registry-list>header (@container (max-width:850px)) | grid-template-columns:minmax(0,1fr) |
| .registry-list strong,.registry-list small,.package-name strong,.package-name small (base) | white-space:normal; overflow:visible |
| .registry-inspector dt,.package-inspector dt (base) | white-space:normal |
| .registry-links (base) | grid-template-columns:repeat(2,minmax(0,1fr)) |
| .registry-links button (base) | min-width:0; white-space:normal |

- 键盘 21: keydown → selectedRegistryId = manifest.id
- 键盘 21: keydown → selectedRegistryId = manifest.id
- 键盘 40: keydown → selectedId = item.manifest.id
- 键盘 40: keydown → selectedId = item.manifest.id

## src/components/PanelMaximizeButton.vue

- 责任/宿主：src/components/ConfigPanel.vue；src/components/EditorBottomPanel.vue；src/components/SceneSideBar.vue
- 扩展：Local maximize/expand source exists; inspect host policy.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| — | 静态模板 | 无条件分支；检查宿主挂载条件 |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .panel-maximize (base) | min-width:calc(30px * var(--ui-scale)); min-height:calc(30px * var(--ui-scale)) |

## src/components/PanelResizeHandle.vue

- 责任/宿主：src/components/AnimationPanel.vue；src/components/ConfigPanel.vue；src/components/EditorBottomPanel.vue；src/components/PresentationPanel.vue；src/components/SceneSideBar.vue；src/components/ScriptStudio.vue；src/components/VisualGraphEditor.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 无；直接键盘绑定 1；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| — | 静态模板 | 无条件分支；检查宿主挂载条件 |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| 宿主共享样式 | 无本地相关声明 |

- 键盘 3: keydown → keyboard

## src/components/ParticleGraphEditor.vue

- 责任/宿主：src/components/RenderingPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=1, input=3, select=4；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 18；加载/等待 0；错误/诊断 0；有数据循环 4。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 6 | div v-for | item in document.modules |
| 7 | main v-if | selected |
| 9 | label v-if | selected.kind === 'Spawn' |
| 10 | label v-if | selected.kind === 'Spawn' |
| 11 | label v-if | selected.kind === 'Spawn' |
| 12 | label v-if | selected.kind === 'Spawn' |
| 13 | label v-if | selected.kind === 'Shape' |
| 14 | label v-if | selected.kind === 'Velocity' |
| 14 | NumericExpressionInput v-for | index in [0,1] |
| 15 | label v-if | selected.kind === 'Velocity' |
| 15 | NumericExpressionInput v-for | index in [0,1] |
| 16 | label v-if | selected.kind === 'Force' |
| 16 | NumericExpressionInput v-for | index in [0,1] |
| 17 | label v-if | selected.kind === 'Size' |
| 18 | label v-if | selected.kind === 'Size' |
| 19 | label v-if | selected.kind === 'Collision' |
| 20 | label v-if | selected.kind === 'Events' |
| 21 | label v-if | selected.kind === 'SubEmitter' |
| 22 | label v-if | selected.kind === 'Trail' |
| 23 | label v-if | selected.kind === 'Trail' |
| 24 | label v-if | selected.kind === 'Renderer' |
| 25 | p v-if | !editableSelected |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .particle-vector (base) | min-width:0 |
| .particle-graph-editor (base) | min-height:350px; overflow:hidden |
| .particle-graph-editor>header (base) | min-height:42px |
| .particle-layout (base) | min-height:0; grid-template-columns:minmax(170px,220px) minmax(290px,1fr) minmax(210px,280px) |
| .particle-layout>aside,.particle-layout>main (base) | min-width:0; overflow:auto |
| .particle-layout>aside:first-child button (base) | min-height:32px; grid-template-columns:20px 1fr auto |
| main>label (base) | min-height:34px |
| .particle-layout (@container nova-particle (max-width:1000px)) | grid-template-columns:180px 1fr |
| .particle-preview (@container nova-particle (max-width:1000px)) | max-height:150px |
| .particle-layout (@container nova-particle (max-width:680px)) | grid-template-columns:1fr |
| .particle-layout>aside:first-child (@container nova-particle (max-width:680px)) | max-height:135px |
| .particle-graph-editor (base) | container:nova-particle/inline-size; min-width:0 |
| .particle-graph-editor>header>* (base) | min-width:0; max-width:100% |
| .particle-layout (base) | overflow:auto |
| .particle-layout>main (base) | container:nova-particle-fields/inline-size |
| .module-row (base) | min-width:0; grid-template-columns:20px minmax(0,1fr) |
| .module-row>button (base) | grid-template-columns:minmax(0,1fr) auto; min-width:0; white-space:normal |
| .particle-layout (@container nova-particle (max-width:1000px)) | grid-template-columns:180px minmax(0,1fr) |
| .particle-layout (@container nova-particle (max-width:680px)) | grid-template-columns:minmax(0,1fr) |
| .particle-layout>aside:first-child (@container nova-particle (max-width:680px)) | max-height:180px |
| .particle-preview (@container nova-particle (max-width:680px)) | max-height:none |
| main input,main select (@container nova-particle-fields (max-width:380px)) | max-width:100%; min-width:0 |

## src/components/PathTextInput.vue

- 责任/宿主：src/components/ConfigPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 textarea=1；直接键盘绑定 1；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 1；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 5 | small v-if | error |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .path-text-draft (base) | min-width:0 |
| .path-text-draft textarea (base) | min-width:0; resize:vertical |
| .path-text-draft small (base) | white-space:normal |

- 键盘 4: keydown → reset

## src/components/PhysicsRuntimePanel.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Local maximize/expand source exists; inspect host policy.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=16, input=1, select=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 10；加载/等待 0；错误/诊断 0；有数据循环 6。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 14 | template v-if | !monitor.collapsed |
| 29 | div v-if | monitor.warnings.length |
| 30 | span v-for | warning in monitor.warnings |
| 35 | button v-if | monitor.activeTab === 'collisions' |
| 36 | button v-else-if | monitor.activeTab === 'captures' |
| 39 | section v-if | monitor.activeTab === 'bodies' |
| 46 | button v-for | body in visibleBodies |
| 49 | article v-if | selectedBody |
| 56 | p v-if | !bodies.length |
| 59 | section v-else-if | monitor.activeTab === 'collisions' |
| 62 | button v-for | collision in visibleCollisions |
| 65 | article v-if | selectedCollision |
| 70 | p v-if | !collisions.length |
| 73 | section v-else-if | monitor.activeTab === 'constraints' |
| 75 | button v-for | constraint in constraints |
| 77 | article v-if | selectedConstraint |
| 81 | p v-if | !constraints.length |
| 84 | section v-else | (fallback) |
| 86 | article v-for | capture in captures |
| 87 | article v-if | snapshotComparison.length |
| 87 | div v-for | row in snapshotComparison.slice(0, 100) |
| 88 | p v-if | !captures.length |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .physics-runtime-panel (base) | min-width:0; overflow:hidden |
| header (base) | min-height:54px |
| .heading (base) | min-width:0 |
| .heading div (base) | min-width:0 |
| .heading strong, .heading small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .tabs (base) | min-height:40px; grid-template-columns:repeat(4, minmax(0, 1fr)) |
| .tabs button (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .runtime-tools (base) | grid-template-columns:minmax(90px, 1fr) auto auto |
| .runtime-tools input (base) | min-width:0 |
| .runtime-tools button (base) | min-width:0; white-space:nowrap |
| .runtime-warnings (base) | max-height:84px; overflow:auto |
| .table-controls label (base) | min-width:0 |
| .table-controls select (base) | min-width:0 |
| .telemetry-browser (base) | min-height:0; overflow:hidden |
| .virtual-list (base) | overflow:auto |
| .virtual-list button>span (base) | min-width:0 |
| .virtual-list strong,.virtual-list small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .telemetry-detail (base) | min-height:0; overflow:auto |
| .constraint-list,.capture-list (base) | min-height:0; overflow:auto |
| .constraint-list span (base) | min-width:0 |
| .constraint-list small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .capture-list article (base) | grid-template-columns:minmax(0,1fr) 32px |
| .capture-list button (base) | min-width:0 |
| .capture-list small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .comparison-table (base) | min-height:0; overflow:auto |
| .comparison-table span (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .comparison-table code (base) | white-space:nowrap |
| .telemetry-card, .event-body (base) | min-width:0 |
| .card-title (base) | min-width:0 |
| .card-title strong, .card-title span (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .metric-grid (base) | grid-template-columns:1fr 1fr |
| .metric (base) | min-width:0 |
| .metric :deep(strong) (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .timeline-event (base) | min-width:0; grid-template-columns:12px minmax(0, 1fr) |
| .metric-grid (@media (max-width: 520px)) | grid-template-columns:1fr |
| .runtime-tools (@media (max-width: 520px)) | grid-template-columns:1fr 1fr |
| .tabs (@media (max-width: 520px)) | grid-template-columns:1fr 1fr |

## src/components/PhysicsSettingsPanel.vue

- 责任/宿主：src/panels/SettingsPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=9, input=10, select=8, summary=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 1；有数据循环 13。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 6 | button v-for | item in tabs |
| 9 | p v-if | form17.error.value |
| 11 | div v-if | tab === 'simulation' |
| 50 | div v-for | (unit, name) in PHYSICS_UNITS |
| 55 | div v-else-if | tab === 'layers' |
| 58 | article v-for | layer in visibleLayers |
| 64 | option v-for | layer in physics.globalSettings.layers |
| 64 | option v-for | layer in physics.globalSettings.layers |
| 67 | b v-for | column in layerIds |
| 67 | div v-for | row in layerIds |
| 67 | button v-for | column in layerIds |
| 70 | div v-else-if | tab === 'materials' |
| 71 | button v-for | asset in materialAssets |
| 72 | article v-if | draft |
| 79 | option v-for | mode in combineModes |
| 80 | option v-for | mode in combineModes |
| 82 | p v-else | (fallback) |
| 85 | div v-else | (fallback) |
| 86 | div v-for | (support, kind) in PHYSICS_SHAPE_SUPPORT |
| 87 | span v-for | test in PHYSICS_CONFORMANCE_CASES |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .physics-workspace (base) | min-width:0 |
| .physics-heading>div (base) | min-width:0 |
| .physics-heading button,.layer-toolbar button,.pair-editor button,.material-workspace button,.conformance-workspace button,.diagnostics-card>button (base) | min-height:32px |
| .physics-grid (base) | grid-template-columns:repeat(auto-fit,minmax(min(430px,100%),1fr)) |
| .physics-card (base) | min-width:0 |
| .physics-card>label,.material-editor>label (base) | min-height:38px |
| .physics-card>label>span,.material-editor>label>span (base) | min-width:0 |
| .physics-card label>input,.physics-card label>div,.material-editor label>input,.material-editor label>div (base) | min-width:0 |
| .physics-card label>select,.material-editor label>select (base) | min-width:min(210px,100%); max-width:230px |
| .physics-card label>div input,.material-editor label>div input (base) | min-width:0 |
| .physics-card em,.material-editor em (base) | white-space:nowrap |
| .diagnostics-card dl,.units-card dl (base) | grid-template-columns:repeat(2,minmax(0,1fr)) |
| .notice (base) | grid-template-columns:70px 1fr |
| .units-card dl (base) | grid-template-columns:repeat(5,minmax(0,1fr)) |
| .layer-toolbar (base) | grid-template-columns:minmax(180px,1fr) 180px auto |
| .layer-list (base) | max-height:310px; overflow:auto |
| .layer-list article (base) | min-width:650px; grid-template-columns:24px 34px minmax(130px,.7fr) minmax(250px,1.3fr) |
| .layer-list input (base) | min-width:0 |
| .pair-editor (base) | grid-template-columns:auto minmax(130px,1fr) auto minmax(130px,1fr) auto |
| .advanced-matrix summary (base) | min-height:18px |
| .matrix-scroll (base) | max-width:100%; overflow:auto |
| .matrix-header,.matrix-row (base) | grid-template-columns:30px repeat(32,18px) |
| .material-workspace (base) | min-height:330px; grid-template-columns:minmax(190px,.7fr) minmax(280px,1.3fr) |
| .material-workspace aside button strong,.material-workspace aside button span (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .conformance-workspace (base) | grid-template-columns:1fr 1fr |
| .support-row (base) | grid-template-columns:110px 130px 1fr |
| .case-grid (base) | grid-template-columns:1fr 1fr |
| .case-grid span (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .physics-grid (@media (max-width:1200px)) | grid-template-columns:1fr |
| .conformance-workspace,.material-workspace (@media (max-width:800px)) | grid-template-columns:1fr |
| .units-card dl (@media (max-width:800px)) | grid-template-columns:repeat(2,minmax(0,1fr)) |
| .layer-toolbar,.pair-editor (@media (max-width:800px)) | grid-template-columns:1fr |
| .physics-workspace (base) | container-type:inline-size |
| .physics-card label>span (base) | white-space:normal |
| .physics-card label input,.physics-card label select (base) | min-height:34px; min-width:0; max-width:100% |
| .physics-grid (@container (max-width:640px)) | grid-template-columns:minmax(0,1fr) |
| .physics-card label (@container (max-width:640px)) | grid-template-columns:minmax(0,1fr) |
| .numeric-draft (base) | max-width:100% |
| .material-workspace,.conformance-workspace,.layer-toolbar,.pair-editor (@container (max-width:640px)) | grid-template-columns:minmax(0,1fr) |
| .material-workspace>* (@container (max-width:640px)) | min-width:0 |
| .material-workspace aside button strong,.material-workspace aside button span (@container (max-width:640px)) | white-space:normal; text-overflow:clip |
| .layer-list (@container (max-width:640px)) | max-height:none; overflow:visible |
| .layer-list article (@container (max-width:640px)) | min-width:0; grid-template-columns:24px 34px minmax(0,1fr) |
| .support-row (@container (max-width:640px)) | grid-template-columns:minmax(0,1fr) |
| .case-grid (@container (max-width:640px)) | grid-template-columns:minmax(0,1fr) |
| .case-grid span (@container (max-width:640px)) | white-space:normal |
| .units-card dl (@container (max-width:640px)) | grid-template-columns:repeat(2,minmax(0,1fr)) |

## src/components/PluginSettings.vue

- 责任/宿主：src/components/PackageManagerPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=3, input=3；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 0；有数据循环 2。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 6 | div v-if | pluginState.manifests.length |
| 7 | article v-for | manifest in pluginState.manifests |
| 11 | label v-for | permission in manifest.permissions |
| 11 | small v-if | !manifest.permissions.length |
| 14 | p v-else | (fallback) |
| 16 | p v-if | message |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .plugin-summary (base) | grid-template-columns:1fr auto |
| .plugin-list article (base) | min-height:42px; grid-template-columns:minmax(0, 1fr) auto 25px |
| .plugin-list article > div (base) | min-width:0 |
| .plugin-list strong, .plugin-list small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .import-button (base) | min-height:31px |
| .plugin-list article (base) | min-height:46px |
| .import-button (base) | min-height:34px |
| .plugin-list article (base) | grid-template-columns:minmax(0, 1fr) auto 25px 25px |
| .plugin-identity (base) | min-width:0 |
| .permission-review label (base) | min-height:24px |
| .plugin-list article (@media (max-width: 520px)) | grid-template-columns:minmax(0, 1fr) 25px 25px |

## src/components/PresentationPanel.vue

- 责任/宿主：src/components/AudioSystemPanel.vue；src/layout/EditorLayout.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=39, input=49, select=22, textarea=1, summary=8；直接键盘绑定 3；非原生点击候选 0。
- 状态索引：空/选择条件 11；加载/等待 0；错误/诊断 9；有数据循环 35。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 5 | button v-for | tab in tabs |
| 8 | p v-if | draftError |
| 9 | div v-if | activeTab === 'ui' |
| 15 | button v-for | entity in uiEntities |
| 19 | option v-for | (preset,index) in previewPresets |
| 22 | button v-for | issue in currentUiValidation.issues.slice(0,8) |
| 22 | p v-if | !currentUiValidation.issues.length |
| 26 | option v-for | asset in themeAssets |
| 27 | template v-if | themeDraft |
| 29 | p v-if | themeConflict |
| 31 | option v-for | asset in themeAssets.filter(item => assetReference(item.uuid) !== selectedThemeReference) |
| 39 | option v-for | asset in themeAssets.filter(item => assetReference(item.uuid) !== selectedThemeReference) |
| 41 | label v-for | group in themeTokenGroups |
| 48 | div v-else-if | activeTab === 'localization' |
| 52 | option v-for | locale in knownLocales |
| 58 | label v-if | localizationSettings.numberStyle === 'currency' |
| 62 | label v-for | locale in knownLocales |
| 65 | option v-for | asset in localeAssets |
| 66 | div v-if | localeDraft |
| 67 | div v-if | localeDraft |
| 67 | article v-for | (value,key) in localeDraft.entries |
| 68 | footer v-if | localeDraft |
| 68 | code v-for | item in localizationAudit.slice(0,12) |
| 69 | p v-else | (fallback) |
| 73 | div v-else-if | activeTab === 'audio' |
| 76 | p v-if | audioStatus |
| 76 | option v-for | device in audioDiagnostics.outputDevices |
| 76 | option v-for | snapshot in audioSettings.mixer.snapshots |
| 77 | label v-for | snapshot in audioSettings.mixer.snapshots |
| 78 | article v-for | bus in audioSettings.mixer.buses |
| 79 | button v-if | bus.id !== 'Master' && !defaultBuses.includes(bus.id) |
| 80 | label v-if | bus.id!=='Master' |
| 80 | option v-for | target in audioRouteOptions(bus) |
| 82 | div v-for | effect in bus.effects |
| 82 | label v-if | effect.kind==='LowPass'\|\|effect.kind==='HighPass' |
| 82 | label v-if | effect.kind==='LowPass'\|\|effect.kind==='HighPass' |
| 82 | label v-if | effect.kind==='Compressor' |
| 82 | label v-if | effect.kind==='Compressor' |
| 82 | label v-if | effect.kind==='Delay'\|\|effect.kind==='Reverb' |
| 82 | label v-if | effect.kind==='Delay' |
| 83 | div v-for | send in bus.sends |
| 83 | option v-for | target in audioRouteOptions(bus) |
| 84 | div v-for | (point,index) in bus.automation |
| 88 | option v-for | asset in audioAssets |
| 89 | rect v-if | waveformSelection |
| 89 | line v-if | selectedAudio |
| 89 | line v-if | selectedAudio && activeLoopEnd > 0 |
| 90 | template v-if | selectedAudio |
| 90 | option v-for | bus in audioSettings.mixer.buses |
| 90 | p v-if | selectedAudio.settings.audioSettings.streaming |
| 90 | option v-for | region in selectedAudio.settings.audioSettings.loopRegions |
| 90 | article v-for | region in selectedAudio.settings.audioSettings.loopRegions |
| 91 | article v-for | (clock,key) in audioDiagnostics.voiceClocks |
| 92 | article v-for | failure in audioDiagnostics.failures.slice(0,4) |
| 93 | article v-for | rule in audioSettings.mixer.ducking |
| 93 | option v-for | bus in audioSettings.mixer.buses |
| 93 | option v-for | bus in audioSettings.mixer.buses |
| 97 | div v-else | (fallback) |
| 98 | option v-for | action in physicsState.inputMap |
| 98 | button v-for | modality in inputModalities |
| 99 | button v-for | item in focusTraversal |
| 99 | article v-for | issue in accessibilityIssues |
| 99 | p v-if | !accessibilityIssues.length |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .presentation-panel (base) | min-height:0; overflow:hidden |
| .presentation-header (base) | min-height:44px |
| .presentation-header>div (base) | min-width:0 |
| .presentation-header button,.studio-card button (base) | min-height:28px |
| .studio-grid,.accessibility-grid (base) | min-height:0; grid-template-columns:repeat(2,minmax(260px,1fr)); overflow:auto |
| .studio-card (base) | min-width:0; overflow:auto |
| .studio-card>header (base) | min-height:30px |
| .studio-card label (base) | min-height:31px |
| .studio-card label input:not([type=checkbox]):not([type=color]),.studio-card label select (base) | min-width:0; min-height:26px |
| .studio-card label>div input (base) | min-width:0 |
| .theme-preview input (base) | min-width:0 |
| .localization-workspace,.audio-workspace (base) | min-height:0; grid-template-columns:minmax(220px,28%) minmax(360px,1fr); overflow:hidden |
| .table-editor (base) | overflow:hidden |
| .table-editor>header select (base) | min-width:120px |
| .locale-meta (base) | grid-template-columns:1fr 1fr 1fr |
| .locale-rows (base) | min-height:0; overflow:auto |
| .locale-rows article (base) | min-height:44px; grid-template-columns:minmax(120px,30%) 1fr 26px |
| .locale-rows code (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .locale-rows textarea (base) | min-width:0; resize:vertical |
| .audio-workspace (base) | grid-template-columns:minmax(400px,1fr) minmax(240px,34%) |
| .mixer (base) | overflow:hidden |
| .bus-list (base) | min-height:0; overflow:auto |
| .bus-list article>header (base) | grid-template-columns:minmax(70px,1fr) 80px 26px 26px 26px |
| .effect-row (base) | grid-template-columns:minmax(70px,1fr) 24px 1fr 25px |
| .effect-row>* (base) | min-width:0 |
| .voice-report (base) | grid-template-columns:1fr 1fr |
| .duck-rule (base) | grid-template-columns:1fr auto 1fr 60px |
| .duck-rule>* (base) | min-width:0 |
| .studio-grid,.accessibility-grid,.localization-workspace,.audio-workspace (@container nova-presentation (max-width:900px)) | grid-template-columns:1fr; overflow:auto |
| .studio-card,.mixer,.table-editor (@container nova-presentation (max-width:900px)) | overflow:visible |
| .locale-rows (@container nova-presentation (max-width:900px)) | max-height:360px; overflow:auto |
| .create-locale input (base) | min-width:0; min-height:27px |
| .locale-rows article (base) | grid-template-columns:minmax(105px,20%) minmax(105px,22%) minmax(160px,1fr) 26px |
| .device-preview (base) | max-height:230px; overflow:hidden |
| .ui-audio-card select (base) | max-width:230px |
| .localization-report code (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .bus-list summary (base) | min-height:20px |
| .ui-hierarchy>button,.audit-card details>button (base) | min-height:34px |
| .validation-list>button (base) | min-height:38px; grid-template-columns:auto minmax(0,1fr) |
| .validation-list span (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .prompt-preview (base) | grid-template-columns:repeat(4,1fr) |
| .locale-rows article (@container nova-presentation (max-width:700px)) | grid-template-columns:minmax(100px,1fr) 26px |
| .bus-list article>header (base) | grid-template-columns:minmax(70px,1fr) minmax(70px,1fr) 62px 26px 26px 26px |
| .automation-row (base) | grid-template-columns:1fr 1fr 26px |
| .automation-row>* (base) | min-width:0 |
| .loop-region-row (base) | grid-template-columns:minmax(80px,1fr) 62px 62px 26px |
| .loop-region-row>* (base) | min-width:0 |
| .snapshot-list (base) | overflow:auto |
| .snapshot-list label (base) | min-width:220px; grid-template-columns:minmax(80px,1fr) 58px 26px |
| .duck-rule (base) | grid-template-columns:24px minmax(70px,1fr) auto minmax(70px,1fr) 56px 56px 56px 26px |
| .duck-rule (@container nova-presentation (max-width:700px)) | grid-template-columns:24px minmax(80px,1fr) auto minmax(80px,1fr); overflow:auto |
| .loop-region-row (@container nova-presentation (max-width:700px)) | grid-template-columns:minmax(90px,1fr) 58px 58px 26px |
| .presentation-panel (base) | container:nova-presentation/inline-size; min-width:0 |
| .studio-card (base) | container:nova-presentation-card/inline-size |
| .studio-card button (base) | white-space:normal |
| .validation-list span,.localization-report code (base) | white-space:normal; overflow:visible |
| .table-editor>header select (base) | max-width:100% |
| .studio-grid,.accessibility-grid (base) | grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr)) |
| .localization-workspace,.audio-workspace (@container nova-presentation (max-width:900px)) | grid-template-columns:minmax(0,1fr); overflow:auto |
| .studio-card,.mixer,.table-editor (@container nova-presentation (max-width:900px)) | overflow:visible |
| .locale-rows (@container nova-presentation (max-width:900px)) | max-height:420px; overflow:auto |
| .bus-list article>header (@container nova-presentation-card (max-width:500px)) | grid-template-columns:minmax(0,1fr) 30px 30px 30px |
| .locale-meta (@container nova-presentation-card (max-width:500px)) | grid-template-columns:minmax(0,1fr) |
| .locale-rows article (@container nova-presentation-card (max-width:500px)) | grid-template-columns:minmax(0,1fr) 30px |
| .locale-rows code (@container nova-presentation-card (max-width:500px)) | white-space:normal; overflow:visible |
| .duck-rule (@container nova-presentation-card (max-width:500px)) | grid-template-columns:24px minmax(0,1fr) 24px minmax(0,1fr) |
| .loop-region-row (@container nova-presentation-card (max-width:500px)) | grid-template-columns:minmax(0,1fr) 30px |
| .voice-report (@container nova-presentation-card (max-width:500px)) | grid-template-columns:minmax(0,1fr) |
| .studio-card label input:not([type=checkbox]):not([type=color]),.studio-card label select,.studio-card label>div (@container nova-presentation-card (max-width:360px)) | max-width:100% |
| .effect-row (@container nova-presentation-card (max-width:360px)) | grid-template-columns:minmax(0,1fr) 26px |
| .snapshot-list (@container nova-presentation-card (max-width:360px)) | overflow:visible |
| .snapshot-list label (@container nova-presentation-card (max-width:360px)) | min-width:0; grid-template-columns:minmax(0,1fr) 30px |
| .prompt-preview (@container nova-presentation-card (max-width:360px)) | grid-template-columns:repeat(2,minmax(0,1fr)) |
| .responsive-tools label>input[type=number] (base) | max-width:none |
| .snapshot-list label (base) | grid-template-columns:minmax(100px,1fr) minmax(calc(96px * var(--ui-scale)),.5fr) 30px |
| .studio-card .snapshot-list label input:not([type=checkbox]):not([type=color]) (base) | max-width:100% |
| .snapshot-list (@container nova-presentation-card (max-width:500px)) | overflow:visible |
| .snapshot-list label (@container nova-presentation-card (max-width:500px)) | min-width:0; grid-template-columns:minmax(0,1fr) 30px |
| .audio-workspace (base) | grid-template-columns:minmax(400px,1fr) var(--audio-properties-width,380px) |
| .audio-clock dd (base) | min-width:0 |
| .audio-workspace (@container nova-presentation (max-width:900px)) | grid-template-columns:minmax(0,1fr) |
| .master-controls label:has(select) (base) | min-width:0 |
| .master-controls label>select (base) | min-width:min(180px,100%) |
| .responsive-tools label (base) | min-width:0 |
| .responsive-tools input[type=number] (base) | min-width:96px |
| .studio-grid,.accessibility-grid,.localization-workspace,.audio-workspace (@container nova-presentation (max-width:900px)) | grid-template-columns:minmax(0,1fr); overflow:auto |
| .studio-grid>.studio-card,.accessibility-grid>.studio-card,.localization-workspace>.studio-card,.audio-workspace>.studio-card (@container nova-presentation (max-width:900px)) | min-height:auto |
| .master-controls label:has(input[type=number]) (base) | min-width:0 |
| .master-controls label>input[type=number] (base) | min-width:96px |
| .studio-card label>.numeric-draft (base) | min-width:min(100%,calc(10ch + 82px)); max-width:100% |
| .snapshot-list label:has(.numeric-draft) (base) | max-width:100%; min-width:0 |
| .loop-region-row>.numeric-draft (base) | min-width:min(100%,calc(10ch + 82px)) |

- 键盘 89: keydown → nudgeWaveform(-1)
- 键盘 89: keydown → nudgeWaveform(1)
- 键盘 99: keydown → selectUiUuid(issue.entityUuid)

## src/components/ProfilerPanel.vue

- 责任/宿主：src/components/EditorBottomPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=44, input=53, select=17, textarea=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 9；加载/等待 1；错误/诊断 3；有数据循环 27。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 7 | button v-for | tab in tabs |
| 11 | div v-if | activeTab === 'trace' |
| 15 | article v-for | metric in timingMetrics |
| 38 | article v-for | metric in timingMetrics.filter(item => item.value > 0) |
| 72 | label v-for | option in debugOptions |
| 76 | div v-else-if | activeTab === 'memory' |
| 90 | option v-for | capture in tools.captures |
| 91 | option v-for | capture in tools.captures |
| 94 | dl v-if | tools.comparison |
| 95 | div v-if | selectedPerformanceCapture |
| 95 | article v-for | check in selectedPerformanceCapture.budget.checks |
| 100 | article v-for | event in recentLifetimeEvents |
| 105 | div v-else-if | activeTab === 'replay' |
| 118 | option v-for | asset in replayAssets |
| 120 | article v-for | mismatch in replayState.mismatches.slice(-32) |
| 124 | div v-else-if | activeTab === 'tests' |
| 127 | button v-for | test in settings.testing.tests |
| 128 | p v-if | !settings.testing.tests.length |
| 131 | template v-if | selectedTest |
| 133 | option v-for | scene in sceneManager.scenes |
| 135 | article v-for | (assertion, index) in selectedTest.assertions |
| 138 | p v-else | (fallback) |
| 142 | p v-if | testRunnerState.running |
| 143 | article v-for | result in testRunnerState.results |
| 143 | small v-if | result.error |
| 143 | small v-for | assertion in result.assertions.filter(item => !item.passed) |
| 143 | img v-if | result.screenshot |
| 147 | div v-else-if | activeTab === 'data' |
| 151 | option v-for | asset in schemaAssets |
| 152 | option v-for | asset in tableAssets |
| 156 | template v-if | schemaDraft |
| 158 | option v-for | field in schemaDraft.fields |
| 159 | article v-for | (field, index) in schemaDraft.fields |
| 168 | article v-for | issue in dataIssues.slice(0, 100) |
| 172 | div v-else-if | activeTab === 'jobs' |
| 188 | div v-else-if | activeTab === 'scripts' |
| 193 | article v-for | entry in profilerState.scriptFunctions |
| 194 | p v-if | !profilerState.scriptFunctions.length |
| 198 | option v-for | (capture, index) in profilerState.scriptCaptures |
| 199 | option v-for | (capture, index) in profilerState.scriptCaptures |
| 201 | article v-for | entry in scriptComparison |
| 205 | div v-else-if | activeTab === 'runtime' |
| 214 | article v-for | fault in faultCenterState.recent.slice(-20).reverse() |
| 219 | div v-else | (fallback) |
| 223 | button v-if | !networkPackageEnabled |
| 224 | template v-else | (fallback) |
| 227 | button v-if | !settings.networking.permissionGranted |
| 242 | dl v-if | networkState |
| 243 | p v-if | networkState?.lastError |
| 244 | article v-for | event in networkState?.events.slice(-30) ?? [] |
| 248 | article v-for | definition in settings.networking.replicatedEntities |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .runtime-layout (base) | grid-template-columns:minmax(240px,.8fr) minmax(320px,1.3fr) minmax(260px,1fr) |
| .runtime-layout (@media (max-width:1050px)) | grid-template-columns:1fr 1fr |
| .production-panel (base) | min-height:0; overflow:hidden |
| .production-header (base) | min-height:46px |
| .production-header>div (base) | min-width:170px |
| .production-header button,.card button (base) | min-height:29px |
| .panel-scroll (base) | min-height:0; overflow:auto |
| .trace-layout,.studio-grid,.network-layout (base) | grid-template-columns:minmax(360px,1.5fr) minmax(240px,.8fr) minmax(240px,.8fr) |
| .studio-grid (base) | grid-template-columns:repeat(3,minmax(250px,1fr)) |
| .network-layout (base) | grid-template-columns:repeat(3,minmax(270px,1fr)) |
| .card (base) | min-width:0; overflow:auto |
| .card>header (base) | min-height:31px |
| .card label (base) | min-height:33px |
| .card label input:not([type=checkbox]),.card label select (base) | min-width:0 |
| .metrics (base) | grid-template-columns:repeat(3,minmax(105px,1fr)) |
| .metrics article,.card dl div (base) | min-width:0 |
| .event-list,.field-list,.assertion-list (base) | min-height:0; max-height:250px; overflow:auto |
| .event-list article (base) | min-height:27px; grid-template-columns:55px 70px 70px minmax(80px,1fr) |
| .event-list em (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .tests-layout,.data-layout (base) | min-height:0; grid-template-columns:minmax(180px,22%) minmax(390px,1fr) minmax(230px,28%); overflow:hidden |
| .test-list>button (base) | min-height:40px |
| .test-editor,.data-editor,.results-card,.import-card (base) | min-height:0; overflow:auto |
| .form-grid (base) | grid-template-columns:repeat(3,minmax(120px,1fr)) |
| .assertion-list article (base) | grid-template-columns:minmax(125px,1fr) 1fr 1fr 27px |
| .assertion-list>* (base) | min-width:0 |
| .results-card img (base) | max-width:100% |
| .field-list article (base) | grid-template-columns:1fr 100px 85px 1fr 28px |
| .import-card textarea (base) | min-height:145px; resize:vertical |
| .issue-list (base) | max-height:170px; overflow:auto |
| .issue-list article (base) | grid-template-columns:35px 70px 1fr |
| .replication-row (base) | grid-template-columns:minmax(80px,1fr) 75px 90px 75px 27px |
| .replication-row label (base) | min-height:25px |
| .trace-layout,.studio-grid,.network-layout (@media (max-width:1050px)) | grid-template-columns:repeat(2,minmax(250px,1fr)) |
| .tests-layout,.data-layout (@media (max-width:1050px)) | grid-template-columns:190px minmax(360px,1fr) |
| .results-card,.import-card (@media (max-width:1050px)) | max-height:260px |
| .trace-layout,.studio-grid,.network-layout,.tests-layout,.data-layout (@media (max-width:720px)) | overflow:auto |
| .card (@media (max-width:720px)) | overflow:visible |
| .form-grid (@media (max-width:720px)) | grid-template-columns:1fr 1fr |
| .metrics (@media (max-width:720px)) | grid-template-columns:1fr 1fr |
| .field-list article,.assertion-list article (@media (max-width:720px)) | grid-template-columns:1fr 1fr |
| .production-header nav (@media (max-width:720px)) | overflow-x:auto |
| .replication-row (base) | grid-template-columns:minmax(80px,1fr) 75px minmax(160px,1.25fr) 85px 70px 27px |
| .replication-row (@media (max-width:1050px)) | grid-template-columns:1fr 75px 1fr 27px |
| .production-panel (base) | container-type:inline-size |
| .trace-layout,.studio-grid,.network-layout (@container (max-width:900px)) | grid-template-columns:repeat(2,minmax(240px,1fr)) |
| .tests-layout,.data-layout (@container (max-width:900px)) | grid-template-columns:180px minmax(320px,1fr) |
| .results-card,.import-card (@container (max-width:900px)) | max-height:260px |
| .trace-layout,.studio-grid,.network-layout,.tests-layout,.data-layout (@container (max-width:620px)) | overflow:auto |
| .card (@container (max-width:620px)) | overflow:visible |
| .production-header nav (@container (max-width:620px)) | overflow-x:auto |
| .form-grid (@container (max-width:620px)) | grid-template-columns:1fr 1fr |
| .metrics (@container (max-width:620px)) | grid-template-columns:1fr 1fr |
| .field-list article,.assertion-list article (@container (max-width:620px)) | grid-template-columns:1fr 1fr |
| .script-profile-layout (base) | grid-template-columns:minmax(480px,1.6fr) minmax(260px,.7fr) |
| .profile-heading,.profile-row (base) | grid-template-columns:minmax(160px,1.6fr) 62px 92px 92px 110px |
| .profile-row (base) | min-height:39px |
| .profile-row>span (base) | min-width:0 |
| .profile-row strong,.profile-row small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .script-profile-layout (@media (max-width:900px)) | grid-template-columns:1fr |
| .profile-heading,.profile-row (@media (max-width:900px)) | grid-template-columns:minmax(130px,1fr) 48px 78px 78px 90px |
| .profile-row (@media (max-width:620px)) | grid-template-columns:1fr 1fr |
| .flame-view article (base) | min-width:120px |

## src/components/ProjectHealthPanel.vue

- 责任/宿主：src/components/ManageWorkspace.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=19, input=1, select=2, summary=2；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 6；加载/等待 0；错误/诊断 4；有数据循环 8。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 6 | button v-for | row in healthRows |
| 7 | article v-if | selectedHealth |
| 7 | button v-if | ['animation','ui','localization','accessibility'].includes(selectedHealth.id) |
| 11 | article v-for | gate in releaseGates |
| 14 | div v-if | issues.length |
| 14 | article v-for | issue in issues |
| 15 | div v-else | (fallback) |
| 20 | p v-if | validation |
| 21 | ol v-if | validation?.issues.length |
| 21 | li v-for | issue in validation.issues.slice(0,20) |
| 22 | article v-for | node in sceneDependencies |
| 23 | section v-if | graph.missingReferences.length |
| 23 | option v-for | item in graph.missingReferences |
| 23 | option v-for | asset in assets.records |
| 29 | details v-if | trash.items.length |
| 29 | article v-for | item in trash.items |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .project-health (base) | overflow:auto |
| header (base) | min-height:42px |
| .health-grid (base) | grid-template-columns:repeat(auto-fit,minmax(140px,1fr)) |
| .health-grid strong (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .issues (base) | grid-template-columns:repeat(2,minmax(0,1fr)) |
| .issues article (base) | min-width:0 |
| .data-foundation>header (base) | min-height:34px |
| .data-foundation details>summary (base) | min-height:22px |
| .data-actions button,footer button (base) | min-height:34px |
| .data-foundation ol (base) | max-height:130px; overflow:auto |
| .health-grid (@media (max-width:900px)) | grid-template-columns:repeat(3,minmax(120px,1fr)) |
| .health-grid,.issues (@media (max-width:560px)) | grid-template-columns:1fr 1fr |
| .health-browser (base) | grid-template-columns:minmax(280px,1fr) minmax(230px,.7fr) |
| .health-table (base) | max-height:250px; overflow:auto |
| .health-table button (base) | min-height:36px; grid-template-columns:minmax(110px,1fr) minmax(90px,auto) 8px |
| .health-table strong (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .health-browser (@media (max-width:700px)) | grid-template-columns:1fr |
| .health-detail (@media (max-width:700px)) | min-height:100px |
| .integrity-runtime>header (base) | min-height:36px |
| .integrity-grid (base) | grid-template-columns:repeat(4,minmax(120px,1fr)) |
| .trash-row (base) | min-height:42px; grid-template-columns:minmax(0,1fr) auto auto |
| .trash-row div (base) | min-width:0 |
| .trash-row small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .trash-row button (base) | min-height:30px |
| .reference-repair>div (base) | grid-template-columns:1fr 1fr auto |
| .reference-repair select,.reference-repair button (base) | min-width:0; min-height:32px |
| .integrity-grid (@media (max-width:800px)) | grid-template-columns:1fr 1fr |
| .reference-repair>div (@media (max-width:800px)) | grid-template-columns:1fr |
| .release-gate-grid (base) | grid-template-columns:repeat(2,minmax(0,1fr)) |
| .release-gate-grid article (base) | min-width:0; min-height:64px; grid-template-columns:9px minmax(0,1fr) auto |
| .release-gate-grid article>div (base) | min-width:0 |
| .release-gate-grid button (base) | min-height:27px |
| .release-gate-grid (@media (max-width:760px)) | grid-template-columns:1fr |

## src/components/ProjectManager.vue

- 责任/宿主：src/App.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=25, input=8, select=3, textarea=1, a=2, summary=2；直接键盘绑定 2；非原生点击候选 0。
- 状态索引：空/选择条件 7；加载/等待 9；错误/诊断 4；有数据循环 8。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 24 | button v-if | state.currentSnapshot |
| 30 | button v-if | state.rollbackAvailable |
| 31 | p v-if | state.error |
| 34 | div v-if | creationOpen |
| 37 | p v-if | state.error |
| 41 | button v-for | category in categories |
| 53 | button v-for | template in visibleTemplates |
| 57 | span v-for | requirement in templateGuide(template.id, prefs.locale).requirements |
| 61 | p v-if | !visibleTemplates.length |
| 63 | section v-if | selectedTemplateRecord && selectedGuide |
| 65 | p v-if | selectedGuide.foundation |
| 78 | div v-if | state.recents.length |
| 79 | article v-for | recent in state.recents |
| 88 | p v-else | (fallback) |
| 93 | div v-if | state.pendingUpgrade |
| 99 | div v-for | check in state.pendingUpgrade.preview.preflight |
| 100 | section v-if | state.pendingUpgrade.preview.warnings.length |
| 100 | li v-for | warning in state.pendingUpgrade.preview.warnings |
| 101 | section v-if | state.pendingUpgrade.preview.packageProblems.length |
| 101 | p v-for | problem in state.pendingUpgrade.preview.packageProblems |
| 102 | details v-if | state.pendingUpgrade.preview.migrationSteps.length |
| 102 | li v-for | step in state.pendingUpgrade.preview.migrationSteps |
| 103 | label v-if | state.pendingUpgrade.preview.requiresMigration |
| 105 | p v-if | state.lockConflict |
| 106 | button v-if | state.lockConflict |
| 109 | div v-if | state.readOnlyDocument |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .project-manager (base) | min-height:0; overflow-x:hidden; overflow-y:auto |
| .manager-header (base) | min-height:56px |
| .manager-header select, .manager-header a, .manager-header .manual-link, .version (base) | min-height:30px |
| .manager-shell (base) | grid-template-columns:minmax(250px, .72fr) minmax(520px, 1.55fr) |
| .welcome h1 (base) | max-width:480px |
| .welcome > p (base) | max-width:470px |
| .quick-actions button, .create-button (base) | min-height:38px |
| .creation-card, .recents-card (base) | overflow:hidden |
| .creation-card input (base) | min-height:32px |
| .project-location small (base) | min-height:18px |
| .template-categories (base) | grid-template-columns:repeat(3,minmax(0,1fr)) |
| .template-categories button (base) | min-width:0; min-height:43px; grid-template-columns:22px minmax(0,1fr) auto |
| .template-categories button strong (base) | min-width:0; overflow:hidden; text-overflow:ellipsis |
| .template-categories button small (base) | min-width:22px |
| .category-description (base) | min-height:34px |
| .template-library-tools (base) | grid-template-columns:minmax(0,1.6fr) minmax(150px,.7fr) |
| .template-library-tools label (base) | min-width:0 |
| .template-library-tools input,.template-library-tools select (base) | min-width:0 |
| .template-grid (base) | max-height:min(430px,42vh); overflow:auto; grid-template-columns:1fr 1fr |
| .template-grid button (base) | min-width:0; min-height:166px |
| .template-empty (base) | min-height:120px |
| .recents-card header small (base) | max-width:190px |
| .recent-list article (base) | grid-template-columns:1fr 28px |
| .recent-main (base) | min-width:0; min-height:48px; grid-template-columns:32px minmax(0, 1fr) auto |
| .recent-main > span:nth-child(2) (base) | min-width:0 |
| .recent-main strong, .recent-main small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .project-manager footer (base) | min-height:42px |
| .manager-shell (@media (max-width: 900px)) | grid-template-columns:1fr |
| .template-categories button (@media (max-width: 580px)) | grid-template-columns:1fr |
| .template-categories button strong (@media (max-width: 580px)) | white-space:normal |
| .template-library-tools (@media (max-width: 580px)) | grid-template-columns:1fr |
| .template-grid (@media (max-width: 580px)) | grid-template-columns:1fr; max-height:min(480px,48vh) |
| .template-grid button (@media (max-width: 580px)) | min-height:142px |
| .manager-header select, .manager-header a, .manager-header .manual-link, .version (base) | min-height:32px |
| .quick-actions button, .create-button (base) | min-height:40px |
| .creation-card input (base) | min-height:34px |
| .recent-main (base) | min-height:52px |
| .upgrade-dialog (base) | max-height:min(720px,calc(100vh - 40px)); overflow:auto |
| .upgrade-stats (base) | grid-template-columns:repeat(3,1fr) |
| .backup-choice (base) | min-height:42px |
| .upgrade-dialog>footer button (base) | min-height:36px |
| .read-only-dialog textarea (base) | min-height:340px; resize:vertical |
| .preflight>div (base) | min-height:36px; grid-template-columns:22px minmax(0,1fr) |
| .creation-card (base) | container:nova-template-library / inline-size |
| .template-categories (base) | grid-template-columns:repeat(4, minmax(0, 1fr)) |
| .template-categories button (base) | grid-template-columns:minmax(0, 1fr) auto |
| .template-categories button strong (base) | white-space:normal; overflow:visible |
| .template-library-tools (base) | grid-template-columns:minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr) |
| .template-results button (base) | min-height:30px |
| .template-grid (base) | grid-template-columns:repeat(auto-fit, minmax(min(100%, 230px), 1fr)); max-height:min(510px, 48vh) |
| .template-grid button (base) | min-height:190px |
| .template-library-tools (@container nova-template-library (max-width: 540px)) | grid-template-columns:repeat(2, minmax(0, 1fr)) |
| .template-categories (@container nova-template-library (max-width: 540px)) | grid-template-columns:repeat(2, minmax(0, 1fr)) |
| .template-library-tools (@container nova-template-library (max-width: 320px)) | grid-template-columns:minmax(0, 1fr) |
| .template-instructions (base) | grid-template-columns:repeat(2, minmax(0, 1fr)) |
| .template-instructions section (base) | min-width:0 |
| .template-help button (base) | min-height:34px |
| .template-instructions (@container nova-template-library (max-width: 540px)) | grid-template-columns:minmax(0, 1fr) |
| .manager-shell (base) | grid-template-columns:minmax(0, 1fr) minmax(0, 1fr) |
| .creation-scrim (base) | overflow:auto |
| .creation-scrim .creation-card (base) | overflow:visible |
| .creation-scrim .template-grid (base) | max-height:none; overflow:visible; grid-template-columns:repeat(auto-fit, minmax(min(260px, 100%), 1fr)) |
| .manager-shell (@media (max-width: 800px)) | grid-template-columns:minmax(0, 1fr) |

- 键盘 34: keydown → closeCreation
- 键盘 38: keydown → create

## src/components/RecoveryCenter.vue

- 责任/宿主：src/App.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=7, input=1, textarea=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 1；有数据循环 2。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | section v-if | recovery.visible |
| 7 | p v-if | recovery.invalidSnapshots |
| 10 | button v-for | snapshot in recovery.snapshots |
| 12 | main v-if | selected |
| 14 | p v-if | preview |
| 14 | ol v-if | preview?.semanticChanges.length |
| 14 | li v-for | change in preview.semanticChanges.slice(0,30) |
| 14 | textarea v-else | (fallback) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| article (base) | max-height:94vh; overflow:hidden |
| .recovery-layout (base) | min-height:360px; grid-template-columns:minmax(240px,34%) minmax(0,1fr) |
| nav (base) | overflow:auto |
| nav button (base) | min-height:68px |
| main (base) | overflow:auto |
| dl div (base) | grid-template-columns:120px minmax(0,1fr) |
| footer button (base) | min-height:36px |
| .recovery-layout nav (@media (max-width:640px)) | max-height:210px |
| .recovery-preview header (base) | min-height:30px |
| .recovery-preview header button (base) | min-height:28px |
| .recovery-preview ol (base) | max-height:150px; overflow:auto |
| .recovery-preview li span (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .recovery-preview textarea (base) | min-height:120px; resize:vertical |

## src/components/RenderingPanel.vue

- 责任/宿主：src/components/ManageWorkspace.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=36, input=30, select=23, textarea=3, a=2, summary=2；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 19；加载/等待 0；错误/诊断 7；有数据循环 35。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 6 | button v-for | section in sections |
| 8 | aside v-if | materialSourceConflict |
| 9 | aside v-if | particleSourceConflict |
| 11 | div v-if | activeSection === 'lighting' |
| 25 | div v-else-if | activeSection === 'materials' |
| 26 | button v-for | asset in materialAssets |
| 26 | p v-if | !materialAssets.length |
| 30 | option v-for | asset in parentMaterialAssets |
| 34 | option v-for | (_,name) in material.variants |
| 38 | p v-if | !material.uniformSchema.length |
| 39 | label v-for | field in material.uniformSchema |
| 40 | input v-if | field.type === 'toggle' |
| 41 | select v-else-if | field.type === 'texture' |
| 41 | option v-for | asset in imageAssets |
| 42 | select v-else-if | field.type === 'enum' |
| 42 | option v-for | (option,index) in field.options ?? [] |
| 43 | input v-else-if | field.type === 'color' |
| 44 | div v-else-if | field.type.startsWith('vector') |
| 44 | NumericExpressionInput v-for | index in vectorLength(field.type) |
| 45 | input v-else-if | field.type === 'range' |
| 46 | NumericExpressionInput v-else | (fallback) |
| 53 | div v-else-if | activeSection === 'shaders' |
| 54 | label v-for | (_,name) in includeLibrary |
| 55 | p v-if | !diagnostics.length |
| 55 | button v-for | item in diagnostics |
| 55 | details v-if | advancedMode |
| 55 | span v-if | !parseObject(uniformsJson) |
| 55 | span v-if | !parseObject(texturesJson) |
| 58 | div v-else-if | activeSection === 'graph' |
| 59 | option v-for | asset in materialAssets |
| 59 | button v-if | !material.graph |
| 60 | MaterialGraphEditor v-if | material.graph |
| 61 | button v-for | kind in layerKinds |
| 61 | div v-for | (layer,index) in material.layers |
| 61 | div v-if | selectedLayer |
| 61 | label v-if | selectedLayer.kind !== 'Mask' |
| 61 | label v-if | selectedLayer.kind === 'Gradient' |
| 61 | label v-if | selectedLayer.kind === 'Mask' |
| 61 | option v-for | asset in imageAssets |
| 61 | label v-if | ['Palette','Outline','Distortion'].includes(selectedLayer.kind) |
| 61 | label v-if | selectedLayer.kind === 'Dissolve' |
| 61 | label v-if | selectedLayer.kind === 'Dissolve' |
| 61 | p v-if | !material.layers.length |
| 64 | div v-else-if | activeSection === 'particles' |
| 66 | option v-for | asset in particleAssets |
| 68 | p v-if | !particles.events.length |
| 68 | span v-for | event in particles.events.slice(0,12) |
| 71 | div v-else-if | activeSection === 'post' |
| 72 | option v-for | preset in settings.postProcessing.presets |
| 73 | div v-for | volume in settings.postProcessing.volumes |
| 73 | option v-for | preset in settings.postProcessing.presets |
| 73 | p v-if | !settings.postProcessing.volumes.length |
| 76 | div v-else-if | activeSection === 'production' |
| 78 | button v-for | item in mediaReport.checks |
| 94 | p v-if | stats.backend !== 'WebGL2' |
| 96 | button v-if | !captureSequence.active |
| 96 | button v-else | (fallback) |
| 96 | a v-for | frame in captureSequence.frames.slice(-12) |
| 97 | p v-if | !mediaReport.issues.length |
| 97 | button v-for | item in mediaReport.issues |
| 100 | div v-else-if | activeSection === 'diagnostics' |
| 101 | div v-for | (count,reason) in stats.batchBreakReasons |
| 101 | div v-for | pass in graph.passes |
| 103 | p v-if | capability.fallbackReason |
| 103 | li v-for | feature in capability.matrix |
| 103 | button v-if | feature.support !== 'supported' |
| 104 | option v-for | capture in graph.captures |
| 104 | option v-for | capture in graph.captures |
| 104 | p v-if | lastDifference !== null |
| 104 | a v-for | capture in graph.captures |
| 105 | div v-for | item in recommendations |
| 106 | div v-for | page in atlasPages |
| 106 | img v-if | page.thumbnail |
| 106 | small v-if | page.warning |
| 106 | span v-for | asset in importPreview.slice(0,16) |
| 106 | img v-if | asset.thumbnail |
| 109 | div v-else | (fallback) |
| 110 | button v-for | preset in qualityPresets |
| 111 | div v-for | volume in settings.qualityVolumes |
| 111 | option v-for | preset in qualityPresets |
| 111 | p v-if | !settings.qualityVolumes.length |
| 113 | article v-if | capability.backend === 'WebGL2' |
| 113 | option v-for | asset in materialAssets |
| 114 | article v-else | (fallback) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .material-source-conflict (base) | max-height:35%; overflow:auto |
| .material-source-conflict p,.material-source-conflict button (base) | white-space:normal |
| .rendering-studio (base) | min-height:170px; overflow:hidden |
| .studio-header (base) | min-height:46px |
| .studio-header>div (base) | min-width:175px |
| .studio-header small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .studio-header nav (base) | min-width:0; overflow-x:auto |
| .studio-header button,.card button (base) | min-height:30px; white-space:nowrap |
| .section-scroll (base) | min-height:0; overflow:auto |
| .studio-grid (base) | grid-template-columns:repeat(auto-fit,minmax(260px,1fr)) |
| .card (base) | min-width:0 |
| .card>header (base) | min-height:32px |
| .card>label,.property-grid label,.typed-uniforms>label (base) | min-height:32px |
| .card label input:not([type=checkbox]):not([type=color]),.card label select (base) | min-width:0 |
| .material-layout (base) | grid-template-columns:minmax(145px,18%) minmax(360px,1fr) minmax(220px,28%) |
| .material-list>button (base) | overflow:hidden; text-overflow:ellipsis |
| .property-grid (base) | grid-template-columns:1fr 1fr |
| .typed-uniforms>header (base) | min-height:30px |
| .typed-uniforms>label>span:first-child (base) | min-width:100px; overflow:hidden; text-overflow:ellipsis |
| .vector-inputs (base) | min-width:0 |
| .shader-layout (base) | grid-template-columns:minmax(380px,1fr) minmax(260px,35%) |
| .shader-editor (base) | min-height:0 |
| .shader-editor>textarea (base) | min-height:150px; resize:none |
| .shader-side (base) | overflow:auto |
| .diagnostics button (base) | white-space:normal |
| .shader-side textarea (base) | resize:vertical |
| .diagnostics-layout (base) | grid-template-columns:repeat(3,minmax(240px,1fr)) |
| .metric-grid (base) | grid-template-columns:repeat(2,1fr) |
| .card ul (base) | max-height:145px; overflow:auto |
| .capture-compare select (base) | min-width:0 |
| .capture-list a (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .preset-grid (base) | grid-template-columns:repeat(3,1fr) |
| .material-layout (@container nova-rendering (max-width:980px)) | grid-template-columns:125px minmax(340px,1fr) |
| .diagnostics-layout (@container nova-rendering (max-width:980px)) | grid-template-columns:1fr 1fr |
| .material-layout,.shader-layout,.diagnostics-layout (@container nova-rendering (max-width:680px)) | grid-template-columns:1fr |
| .material-list (@container nova-rendering (max-width:680px)) | max-height:100px; overflow:auto |
| .property-grid (@container nova-rendering (max-width:680px)) | grid-template-columns:1fr |
| .graph-toolbar label (base) | min-width:220px |
| .layer-row (base) | min-height:36px; grid-template-columns:22px minmax(90px,1fr) 105px minmax(80px,160px) 30px 30px 30px |
| .layer-row>* (base) | min-width:0 |
| .layer-name (base) | overflow:hidden; text-overflow:ellipsis |
| .layer-details (base) | grid-template-columns:repeat(auto-fit,minmax(180px,1fr)) |
| .layer-details input:not([type=color]),.layer-details select (base) | min-width:0; max-width:130px |
| .particle-section>.particle-graph-editor (base) | min-height:390px |
| .post-layout (base) | grid-template-columns:minmax(340px,1fr) minmax(320px,1fr) |
| .volume-card input:not([type=checkbox]),.volume-card select (base) | min-width:0 |
| .preview-entry (base) | grid-template-columns:42px 1fr |
| .preview-entry>span (base) | min-width:0 |
| .preview-entry>span>* (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .post-layout (@container nova-rendering (max-width:980px)) | grid-template-columns:1fr |
| .layer-row (@container nova-rendering (max-width:680px)) | grid-template-columns:22px 1fr 90px |
| .graph-toolbar label (@container nova-rendering (max-width:680px)) | min-width:0 |
| .studio-header nav (base) | overflow:visible |
| .capture-compare>button (base) | min-width:0; white-space:normal |
| .studio-header>div (@container nova-rendering (max-width:980px)) | min-width:145px |
| .quality-volumes .volume-card>header (base) | grid-template-columns:auto minmax(0,1fr) 30px |
| .quality-volumes .volume-card>header input[type=text] (base) | min-width:0 |
| .quality-volumes .pair (base) | grid-template-columns:1fr 1fr; min-width:0 |
| .quality-volumes .pair input (base) | min-width:0 |
| .production-layout (base) | grid-template-columns:repeat(2,minmax(280px,1fr)) |
| .production-summary>header>div (base) | min-width:0 |
| .production-summary small (base) | white-space:normal |
| .readiness-row,.issue-card>button (base) | min-width:0; white-space:normal |
| .readiness-row>span,.issue-card>button (base) | min-width:0 |
| .capture-settings (base) | grid-template-columns:1fr 1fr |
| .capture-settings label (base) | min-width:0 |
| .capture-frame-links (base) | max-height:150px; overflow:auto |
| .issue-card (base) | max-height:420px; overflow:auto |
| .production-layout (@container nova-rendering (max-width:860px)) | grid-template-columns:1fr |
| .capture-settings (@container nova-rendering (max-width:860px)) | grid-template-columns:1fr |
| .rendering-studio (base) | container:nova-rendering/inline-size; min-width:0 |
| .card (base) | container:nova-render-card/inline-size |
| .studio-header>div (base) | min-width:0 |
| .studio-header small (base) | white-space:normal; overflow:visible |
| .card button (base) | white-space:normal |
| .studio-grid (base) | grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr)) |
| .graph-toolbar label (base) | min-width:min(220px,100%) |
| .material-layout (@container nova-rendering (max-width:980px)) | grid-template-columns:minmax(120px,180px) minmax(0,1fr) |
| .shader-layout,.post-layout (@container nova-rendering (max-width:980px)) | grid-template-columns:minmax(0,1fr) |
| .material-layout,.diagnostics-layout,.production-layout (@container nova-rendering (max-width:680px)) | grid-template-columns:minmax(0,1fr) |
| .property-grid,.capture-settings,.layer-details,.metric-grid (@container nova-render-card (max-width:380px)) | grid-template-columns:minmax(0,1fr) |
| .card label input:not([type=checkbox]):not([type=color]),.card label select,.quality-volumes .pair,.vector-inputs (@container nova-render-card (max-width:380px)) | max-width:100% |
| .typed-uniforms>label>span:first-child (@container nova-render-card (max-width:380px)) | min-width:0; overflow:visible |
| .layer-row (@container nova-render-card (max-width:380px)) | grid-template-columns:22px minmax(0,1fr) 32px |
| .preset-grid (@container nova-render-card (max-width:380px)) | grid-template-columns:repeat(auto-fit,minmax(min(100%,90px),1fr)) |
| .card label:has(.numeric-draft) (base) | min-width:0 |
| .rendering-studio>.studio-header (base) | max-height:50%; overflow:auto |

## src/components/RuntimeComponentsInspector.vue

- 责任/宿主：src/components/ConfigPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=28, input=94, select=38, textarea=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 1；错误/诊断 0；有数据循环 22。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 3 | section v-if | animator && componentVisible('Animator', t('animator')) |
| 5 | option v-for | asset in controllerAssets |
| 9 | label v-for | (value, name) in animator.parameters |
| 9 | input v-if | typeof value === 'boolean' |
| 9 | NumericExpressionInput v-else | (fallback) |
| 12 | section v-if | skeleton && componentVisible('Skeleton2D', t('skeleton2D')) |
| 14 | option v-for | asset in rigAssets |
| 15 | option v-for | asset in skinAssets |
| 19 | section v-if | timelinePlayer && componentVisible('TimelinePlayer', t('timelinePlayer')) |
| 21 | option v-for | asset in timelineAssets |
| 30 | section v-if | audioSource && componentVisible('AudioSource', t('audioSource')) |
| 32 | option v-for | asset in audioAssets |
| 37 | option v-for | bus in physicsState.audioSettings.mixer.buses |
| 51 | label v-if | audioSource.playlistMode !== 'Single' |
| 51 | option v-for | asset in audioAssets |
| 52 | div v-if | audioSource.playlistMode !== 'Single' |
| 52 | button v-for | (reference,index) in audioSource.playlist |
| 55 | section v-if | audioListener && componentVisible('AudioListener', t('audioListener')) |
| 60 | section v-if | tileMap && componentVisible('TileMap2D', t('tileMap2D')) |
| 62 | option v-for | asset in tileSetAssets |
| 75 | section v-if | particleEmitter && componentVisible('ParticleEmitter2D', t('particleEmitter2D')) |
| 77 | option v-for | asset in imageAssets |
| 80 | label v-if | particleEmitter.emissionShape === 'Box' \|\| particleEmitter.emissionShape === 'Edge' |
| 81 | label v-if | particleEmitter.emissionShape === 'Circle' |
| 97 | label v-if | particleEmitter.collisionMode === 'Bounce' |
| 98 | label v-if | particleEmitter.collisionMode !== 'None' |
| 105 | section v-if | light && componentVisible('Light2D', t('light2D')) |
| 110 | label v-if | light.lightType !== 'Directional' |
| 111 | label v-if | light.lightType === 'Spot' |
| 112 | label v-if | light.lightType === 'Area' |
| 116 | p v-if | light.lightType === 'Directional' |
| 119 | section v-if | shadowCaster && componentVisible('ShadowCaster2D', t('shadowCaster2D')) |
| 126 | section v-for | joint in visibleJoints |
| 128 | option v-for | entity in jointTargets |
| 132 | label v-if | joint.kind === 'DistanceJoint2D' \|\| joint.kind === 'RopeJoint2D' \|\| joint.kind === 'SpringJoint2D' |
| 133 | label v-if | joint.kind === 'SpringJoint2D' |
| 134 | label v-if | joint.kind === 'SpringJoint2D' |
| 135 | label v-if | joint.kind === 'PrismaticJoint2D' |
| 136 | label v-if | joint.kind === 'PrismaticJoint2D' |
| 137 | label v-if | joint.kind === 'PrismaticJoint2D' && joint.limitsEnabled |
| 138 | label v-if | joint.kind === 'RevoluteJoint2D' \|\| joint.kind === 'MotorJoint2D' |
| 139 | label v-if | joint.motorEnabled |
| 140 | label v-if | joint.motorEnabled |
| 145 | section v-if | rectTransform && componentVisible('RectTransform', t('rectTransform')) |
| 148 | option v-for | preset in anchorPresets |
| 155 | label v-if | rectTransform.anchorPreset === 'stretch' |
| 176 | article v-for | (point,index) in rectTransform.breakpoints |
| 179 | section v-if | canvas && componentVisible('Canvas', t('uiCanvas')) |
| 187 | label v-if | canvas.safeArea |
| 188 | option v-for | asset in themeAssets |
| 192 | section v-if | panel && componentVisible('Panel', t('uiPanel')) |
| 198 | label v-if | panel.layout !== 'None' |
| 199 | label v-if | panel.layout !== 'None' |
| 204 | label v-if | panel.scrollHorizontal \|\| panel.scrollVertical |
| 205 | label v-if | panel.scrollHorizontal \|\| panel.scrollVertical |
| 206 | label v-if | panel.scrollHorizontal \|\| panel.scrollVertical |
| 207 | label v-if | panel.scrollHorizontal \|\| panel.scrollVertical |
| 210 | label v-if | panel.behavior === 'Modal' \|\| panel.behavior === 'Popup' |
| 212 | label v-if | panel.behavior === 'Tooltip' |
| 216 | section v-if | image && componentVisible('Image', t('uiImage')) |
| 218 | option v-for | asset in imageAssets |
| 222 | label v-if | image.nineSlice.enabled |
| 224 | section v-if | text && componentVisible('Text', t('uiText')) |
| 224 | option v-for | asset in fontAssets |
| 225 | section v-if | button && componentVisible('Button', t('uiButton')) |
| 225 | option v-for | asset in audioAssets |
| 225 | option v-for | asset in audioAssets |
| 225 | option v-for | asset in audioAssets |
| 226 | section v-if | slider && componentVisible('Slider', t('uiSlider')) |
| 227 | section v-if | progress && componentVisible('ProgressBar', t('uiProgressBar')) |
| 228 | section v-if | checkbox && componentVisible('Checkbox', t('uiCheckbox')) |
| 229 | section v-if | textInput && componentVisible('TextInput', t('uiTextInput')) |
| 231 | section v-if | componentVisible('Canvas', t('createGameUi')) |
| 234 | button v-for | kind in uiKinds |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .runtime-component (base) | overflow:hidden |
| .runtime-component header (base) | min-height:34px |
| .runtime-component label, .range-values label (base) | min-height:34px |
| .runtime-component label > span (base) | min-width:0 |
| .runtime-component label > input:not([type='checkbox']):not([type='color']), .runtime-component label > select (base) | min-width:0; min-height:27px |
| .runtime-component label > div input (base) | min-width:0; min-height:27px |
| .runtime-component label > .quad (base) | grid-template-columns:1fr 1fr |
| .runtime-component textarea (base) | min-height:58px; resize:vertical |
| .component-import (base) | min-height:28px |
| .ui-palette > div (base) | grid-template-columns:1fr 1fr |
| .ui-palette button (base) | min-width:0; min-height:31px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .open-editor (base) | min-height:28px |
| .playlist-list button (base) | min-height:27px; overflow:hidden |
| .playlist-list span (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .breakpoint-editor article (base) | grid-template-columns:1fr 1fr 24px 24px |
| .breakpoint-editor input (base) | min-width:0 |
| .breakpoint-editor button (base) | min-height:26px |
| .runtime-component label > .numeric-draft (base) | min-width:min(100%,calc(10ch + 64px)) |
| .runtime-component label > div (base) | max-width:100% |
| .runtime-component label > .quad (base) | grid-template-columns:repeat(auto-fit,minmax(min(100%,calc(10ch + 64px)),1fr)) |
| .runtime-component :deep(.numeric-draft input) (base) | min-height:28px |
| .breakpoint-editor article (base) | grid-template-columns:minmax(0,1fr) 24px 24px |

## src/components/SaveDataSettings.vue

- 责任/宿主：src/components/ProfilerPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=6, input=1, summary=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 3；错误/诊断 1；有数据循环 1。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 6 | button v-if | saveGameState.busy |
| 7 | progress v-if | saveGameState.busy |
| 7 | small v-if | saveGameState.progressMessage |
| 8 | button v-if | saveGameState.recoveryAvailable |
| 9 | p v-if | saveGameState.recoveryMessage |
| 12 | button v-for | item in slots |
| 13 | p v-if | message \|\| saveGameState.error |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .save-settings > label (base) | min-height:32px |
| .save-settings input (base) | min-height:27px |
| .actions button (base) | min-height:28px |
| .summary (base) | grid-template-columns:1fr auto |
| .save-settings pre (base) | max-height:130px; overflow:auto; white-space:pre-wrap |
| .save-settings > label (base) | min-height:34px |
| .save-settings input (base) | min-height:29px |
| .actions button (base) | min-height:31px |
| .save-settings pre (base) | max-height:150px |
| .recovery (base) | min-height:32px |
| .save-settings details>summary (base) | min-height:24px |
| .save-settings details>button (base) | grid-template-columns:minmax(0,1fr) auto |
| .save-settings details>button span,.save-settings details>button strong (base) | min-width:0 |

## src/components/SceneSideBar.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Local maximize/expand source exists; inspect host policy.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=17, input=3, select=3；直接键盘绑定 4；非原生点击候选 1。
- 状态索引：空/选择条件 7；加载/等待 0；错误/诊断 0；有数据循环 6。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | button v-if | isCollapsed |
| 5 | div v-show | !isCollapsed |
| 16 | div v-for | scene in sceneManager.scenes |
| 18 | span v-if | editingSceneUuid !== scene.uuid |
| 19 | input v-else | (fallback) |
| 21 | button v-if | scene.uuid !== sceneManager.activeSceneUuid |
| 29 | option v-for | filter in selectionFilters |
| 29 | option v-for | tag in availableTags |
| 29 | option v-for | filter in authoringState.savedFilters |
| 32 | nav v-if | breadcrumbs.length |
| 32 | button v-for | (entity, index) in breadcrumbs |
| 36 | div v-for | row in virtualHierarchyRows |
| 63 | button v-if | editingId !== row.entity.id |
| 63 | mark v-if | searchQuery && row.entity.name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) |
| 63 | template v-else | (fallback) |
| 64 | input v-else | (fallback) |
| 65 | span v-if | row.entity.prefabAsset |
| 65 | span v-if | row.entity.sceneLayers.length |
| 65 | span v-if | Object.keys(row.entity.prefabOverrides).length |
| 72 | p v-if | !hierarchyRows.length |
| 73 | button v-if | draggingIds.length |
| 76 | PanelResizeHandle v-show | !isCollapsed |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .scene-sidebar (base) | min-width:0; overflow:hidden |
| .scene-list (base) | max-height:110px; overflow:auto |
| .scene-main (base) | min-width:0 |
| .scene-main span (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .scene-main input (base) | min-height:24px |
| .search input (base) | min-width:0; min-height:25px |
| .hierarchy-header>.hierarchy-filters (base) | grid-template-columns:minmax(0,1fr) 29px 29px |
| .hierarchy-filters select (base) | min-width:0; min-height:27px |
| .breadcrumbs (base) | min-height:30px; overflow:auto |
| .breadcrumbs button (base) | white-space:nowrap |
| .entity-list (base) | min-height:0; overflow:auto |
| .name (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .edit-input (base) | min-width:0; min-height:23px |
| .root-drop (base) | min-height:31px |

- 键盘 17: keyup → activateScene(scene.uuid, scene.loaded)
- 键盘 19: keyup → finishSceneEdit(scene.uuid)
- 键盘 64: keyup → finishEdit(row.entity)
- 键盘 64: keyup → editingId = null

- 已分类 P26-04（本组件负责）：div:36。该项已按 P26-04 分类为容器鼠标行为或原生子按钮的冗余鼠标入口；不是额外未修复操作。

## src/components/SceneTabs.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=10, input=2, select=3, summary=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 1；加载/等待 1；错误/诊断 0；有数据循环 6。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 9 | span v-for | scene in loadedScenes |
| 10 | b v-if | scene.dirty |
| 10 | em v-if | scene.externalState !== 'clean' |
| 10 | small v-if | scene.prefabState !== 'none' |
| 11 | button v-if | scene.uuid !== sceneManager.activeSceneUuid |
| 13 | button v-for | template in templates |
| 15 | aside v-if | settingsOpen |
| 17 | option v-for | template in templates |
| 19 | option v-for | scene in sceneManager.scenes.filter(scene => scene.uuid !== active.uuid) |
| 21 | div v-for | layer in active.settings.namedLayers |
| 22 | code v-for | dependency in dependencies |
| 22 | p v-if | !dependencies.length |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .scene-tabs (base) | min-width:0; min-height:34px |
| .tab-strip (base) | min-width:0; overflow-x:auto |
| .scene-tab (base) | min-width:96px; max-width:210px |
| .scene-tab span (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .scene-settings (base) | max-height:min(650px,75vh); overflow:auto |
| .scene-settings label (base) | grid-template-columns:112px minmax(0,1fr) |
| .named-layers>div (base) | grid-template-columns:10px minmax(0,1fr) 25px 25px |
| .dependencies code (base) | overflow:hidden; text-overflow:ellipsis |
| .scene-tab-entry (base) | max-width:250px; min-width:0 |
| .scene-tab-close (base) | min-height:27px |

## src/components/ScriptConversionPanel.vue

- 责任/宿主：src/components/ScriptStudio.vue；src/components/ScriptWorkspace.vue；src/components/VisualGraphEditor.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=5, summary=2；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 3；有数据循环 2。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 12 | article v-for | (diagnostic, index) in assessment.diagnostics |
| 13 | details v-if | graphDiagnosticMessage(diagnostic,preferencesState.locale)!==diagnostic.message |
| 15 | button v-if | graphNavigationEnabled && (diagnostic.nodeUuid \|\| regionAt(assessment,diagnostic.span)?.nodeUuid) |
| 19 | article v-for | region in regions.slice(0, limit) |
| 21 | p v-if | region.reason |
| 22 | button v-if | graphNavigationEnabled && region.nodeUuid |
| 24 | button v-if | regions.length > limit |
| 25 | p v-if | !regions.length |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .conversion-panel (base) | min-width:0 |
| .conversion-counts (base) | grid-template-columns:repeat(auto-fit,minmax(100px,1fr)) |
| .conversion-region (base) | min-width:0 |
| .conversion-region pre (base) | white-space:pre-wrap; max-height:130px; overflow:auto |
| .conversion-panel button (base) | min-height:28px; white-space:normal |

## src/components/ScriptStudio.vue

- 责任/宿主：src/components/ScriptWorkspace.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=61, input=20, select=5, textarea=1, summary=2；直接键盘绑定 10；非原生点击候选 0。
- 状态索引：空/选择条件 17；加载/等待 1；错误/诊断 8；有数据循环 30。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 7 | option v-for | template in SCRIPT_TEMPLATES |
| 30 | StudioDraftConflict v-if | sourceDraftConflict |
| 33 | aside v-show | paneLayout.primaryVisible |
| 34 | PanelResizeHandle v-if | !paneLayout.drawer |
| 38 | button v-for | asset in filteredScripts |
| 42 | div v-if | projectQuery |
| 43 | button v-for | result in projectMatches |
| 46 | p v-if | !projectMatches.length |
| 52 | div v-for | asset in openAssets |
| 57 | div v-if | findOpen |
| 64 | div v-if | activeAsset |
| 66 | button v-for | line in lineCount |
| 69 | div v-if | completionOpen |
| 70 | button v-for | item in completions |
| 71 | p v-if | !completions.length |
| 73 | div v-if | contextApi |
| 75 | div v-else | (fallback) |
| 79 | span v-if | linkedGraphUuid |
| 86 | aside v-show | detailVisible |
| 87 | PanelResizeHandle v-if | !paneLayout.drawer |
| 87 | PanelResizeHandle v-show | !detailBottom |
| 88 | PanelResizeHandle v-if | !paneLayout.drawer |
| 88 | PanelResizeHandle v-show | detailBottom |
| 92 | button v-for | tab in inspectorTabs |
| 95 | ScriptConversionPanel v-if | inspectorTab === 'conversion' |
| 96 | div v-else-if | inspectorTab === 'problems' |
| 98 | p v-if | validationError |
| 99 | button v-for | item in analysis.diagnostics |
| 100 | button v-for | action in codeActions |
| 101 | p v-if | !analysis.diagnostics.length |
| 104 | div v-else-if | inspectorTab === 'symbols' |
| 106 | button v-for | symbol in analysis.symbols |
| 107 | h3 v-if | referenceResults.length |
| 107 | button v-for | reference in referenceResults |
| 110 | div v-else-if | inspectorTab === 'types' |
| 114 | button v-for | item in analysis.types |
| 115 | p v-if | !analysis.types.length |
| 117 | article v-for | structure in analysis.structures |
| 119 | article v-for | helper in analysis.genericHelpers |
| 121 | button v-for | statement in analysis.statements.slice(0, 500) |
| 124 | div v-else-if | inspectorTab === 'modules' |
| 127 | button v-for | item in projectModuleDiagnostics |
| 128 | option v-if | activeAsset?.script?.apiVersion === 1 |
| 132 | small v-if | reloadSourcePath |
| 132 | p v-if | debug.hotReload.message |
| 134 | details v-if | reloadHistory.length |
| 134 | article v-for | entry in reloadHistory.slice(0,12) |
| 135 | code v-for | dependency in analysis.dependencies |
| 137 | label v-for | dependency in packageDependencies |
| 141 | div v-else-if | inspectorTab === 'contract' |
| 149 | article v-for | requirement in contractReport.contract.requirements |
| 150 | p v-if | !contractReport.contract.requirements.length |
| 152 | article v-for | entry in contractReport.apiUsage |
| 152 | template v-if | entry.permissions.length |
| 153 | p v-if | !contractReport.apiUsage.length |
| 154 | h3 v-if | contractReport.diagnostics.length |
| 155 | button v-for | item in contractReport.diagnostics |
| 158 | div v-else-if | inspectorTab === 'debug' |
| 160 | p v-if | debugLocationError |
| 161 | button v-for | (frame,index) in debug.callStack |
| 162 | article v-for | point in breakpointDetails |
| 165 | label v-for | task in debug.tasks |
| 165 | button v-if | ['queued','running','waiting'].includes(task.state) |
| 165 | p v-if | !debug.tasks.length |
| 169 | label v-for | watch in debug.watches |
| 172 | div v-else-if | inspectorTab === 'tests' |
| 176 | article v-for | result in debug.testResults |
| 176 | small v-if | result.tags.length |
| 177 | p v-if | !debug.testResults.length |
| 180 | div v-else-if | inspectorTab === 'signals' |
| 183 | label v-for | signal in signals |
| 185 | label v-for | (connection,index) in signalConnections |
| 189 | div v-else | (fallback) |
| 192 | article v-for | entry in filteredApi |
| 192 | b v-if | entry.deprecated |
| 196 | div v-if | renameOpen |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .source-save-error (base) | white-space:pre-wrap |
| .script-studio (base) | min-width:0; min-height:0 |
| .studio-toolbar (base) | min-height:58px |
| .studio-title (base) | min-width:220px |
| .toolbar-actions (base) | min-width:min(100%,620px); overflow:visible |
| .toolbar-actions button,.find-bar button,.pane-heading button,.dependency-editor button (base) | min-height:32px; white-space:nowrap |
| .split-action (base) | min-width:0 |
| .split-action select (base) | min-height:32px; max-width:132px |
| .studio-grid (base) | min-height:0; grid-template-columns:clamp(176px,17vw,224px) minmax(340px,1fr) clamp(248px,22vw,328px) |
| .project-scripts,.studio-inspector (base) | min-width:0; min-height:0; overflow:hidden |
| .project-scripts>input,.api-reference>input,.dependency-editor input,.find-bar input,.inspector-pane input,.inspector-pane select (base) | min-width:0; min-height:33px |
| .studio-grid.explorer-hidden (base) | grid-template-columns:minmax(340px,1fr) clamp(248px,22vw,328px) |
| .studio-grid.detail-hidden (base) | grid-template-columns:clamp(176px,17vw,224px) minmax(340px,1fr) |
| .studio-grid.explorer-hidden.detail-hidden (base) | grid-template-columns:1fr |
| .studio-grid.detail-bottom (base) | grid-template-columns:clamp(176px,17vw,224px) minmax(340px,1fr) |
| .studio-grid.detail-bottom.explorer-hidden (base) | grid-template-columns:1fr |
| .pane-heading (base) | min-height:30px |
| .script-list,.search-results (base) | overflow:auto |
| .script-list (base) | max-height:42% |
| .script-list button,.search-results button (base) | min-width:0 |
| .script-list button>span:last-child,.search-results button (base) | min-width:0 |
| .script-list strong,.script-list small,.search-results strong,.search-results small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .code-workspace (base) | min-width:0; min-height:0 |
| .file-tabs (base) | min-height:38px; overflow-x:auto |
| .file-tabs button (base) | white-space:nowrap |
| .editor-shell (base) | min-height:0; grid-template-columns:54px 1fr; overflow:hidden |
| .gutter (base) | overflow:hidden |
| .editor-shell textarea (base) | resize:none; white-space:pre; overflow:auto |
| .completion-popover (base) | max-height:260px; overflow:auto |
| .signature-help (base) | max-width:calc(100% - 100px) |
| .editor-status (base) | min-height:28px |
| .inspector-tabs (base) | grid-template-columns:repeat(auto-fit,minmax(76px,1fr)) |
| .inspector-tabs button (base) | min-width:0; min-height:31px |
| .inspector-pane (base) | min-height:0; overflow:auto |
| .problem>span,.test-result>span (base) | min-width:0 |
| .symbol span (base) | min-width:0 |
| .inspector-pane>code (base) | overflow:hidden; text-overflow:ellipsis |
| .dependency-editor input (base) | min-width:110px |
| .inspector-pane>label (base) | min-height:34px |
| .inspector-pane>label span (base) | min-width:0 |
| .debug-pane pre (base) | max-height:160px; overflow:auto |
| .api-reference article pre (base) | overflow:auto |
| .api-reference article button,.code-action (base) | min-height:30px |
| .breakpoint-detail (base) | grid-template-columns:auto minmax(0,1fr) auto |
| .coverage-summary (base) | grid-template-columns:repeat(3,1fr) |
| .contract-action (base) | min-height:32px |
| .contract-metrics (base) | grid-template-columns:repeat(2,minmax(0,1fr)) |
| .contract-row (base) | grid-template-columns:auto minmax(0,1fr) |
| .contract-row code (base) | min-width:0 |
| .rename-card button (base) | min-height:32px |
| .toolbar-actions select (base) | min-height:32px; max-width:150px |
| .type-symbol>span small (base) | max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .statement>span (base) | overflow:hidden |
| .statement>span small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .script-studio (base) | container:source-studio/inline-size; min-width:0; min-height:0; overflow:hidden |
| .studio-title (base) | min-width:0 |
| .studio-title small (base) | white-space:normal |
| .toolbar-actions (base) | min-width:0; overflow:visible |
| .toolbar-actions>button,.toolbar-actions>select (base) | min-height:32px; white-space:normal |
| .toolbar-actions>select (base) | max-width:136px |
| .studio-more>summary (base) | min-height:32px |
| .studio-commands (base) | max-height:min(470px,65vh); grid-template-columns:repeat(2,minmax(0,1fr)); overflow:auto |
| .studio-commands button (base) | min-height:36px; min-width:0; white-space:normal |
| .studio-commands .split-action>* (base) | min-width:0; max-width:none |
| .studio-grid (base) | min-width:0; min-height:0; overflow:hidden |
| .project-scripts,.studio-inspector (base) | max-width:100% |
| .project-scripts .pane-heading button (base) | min-width:28px; min-height:28px |
| .script-list (base) | max-height:none; min-height:0 |
| .search-results (base) | max-height:45%; min-height:0 |
| .script-list strong,.script-list small,.search-results strong,.search-results small (base) | white-space:normal |
| .studio-inspector (base) | overflow:hidden |
| .inspector-tabs (base) | grid-template-columns:repeat(auto-fit,minmax(136px,1fr)) |
| .inspector-tabs button (base) | min-height:34px; white-space:normal |
| .inspector-pane (base) | min-height:0; overflow:auto |
| .close-inspector (base) | min-width:26px; min-height:26px |
| .code-workspace (base) | min-height:0 |
| .file-tabs (base) | min-height:34px; max-height:72px |
| .file-tab (base) | max-width:260px |
| .file-tab>button:first-child (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .find-bar (base) | min-width:0 |
| .find-bar button (base) | min-height:30px; white-space:normal |
| .editor-shell (base) | min-height:0 |
| .editor-shell textarea (base) | min-height:0 |
| .editor-status (base) | max-height:78px; overflow:auto |
| .editor-status span (base) | white-space:normal |
| .editor-status .linked-graph-status (base) | white-space:normal |
| .toolbar-actions>select (@container source-studio (max-width:640px)) | max-width:110px |
| .studio-commands (@container source-studio (max-width:640px)) | grid-template-columns:1fr |
| .editor-shell (@container source-studio (max-width:640px)) | grid-template-columns:42px minmax(0,1fr) |
| .editor-status (@container source-studio (max-width:640px)) | max-height:60px |
| .inspector-pane pre,.reload-entry small,.inspector-pane code (base) | max-width:100%; white-space:pre-wrap |
| .inspector-pane label>span (base) | min-width:0 |
| .reload-state p (base) | white-space:pre-wrap |

- 键盘 3: keydown → saveActive
- 键盘 3: keydown → saveActive
- 键盘 58: keydown → findNext
- 键盘 68: keyup → cursorChanged
- 键盘 68: keydown → insertTab
- 键盘 68: keydown → requestCompletions
- 键盘 68: keydown → requestCompletions
- 键盘 136: keydown → addPackage
- 键盘 168: keydown → addWatch
- 键盘 182: keydown → addSignal

## src/components/ScriptWorkspace.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=5, summary=1；直接键盘绑定 1；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 1；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 11 | section v-if | preview |
| 12 | button v-if | conversionGate(preview.assessment) === 'review' |
| 15 | p v-if | switchError |
| 16 | ScriptStudio v-if | studio.mode === 'code' |
| 17 | VisualGraphEditor v-else-if | studio.mode === 'graph' |
| 18 | EventSheetEditor v-else | (fallback) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .script-workspace (base) | min-width:0; min-height:0 |
| .conversion-review (base) | max-height:48%; overflow:auto |
| .conversion-review-actions button (base) | min-height:30px; white-space:normal |
| .logic-mode (base) | min-height:38px; overflow:visible |
| .logic-mode button (base) | min-height:30px |
| .logic-tabs (base) | min-width:0 |
| .logic-help summary (base) | min-height:30px |
| .logic-help p (base) | max-height:min(300px,50vh); overflow:auto; white-space:normal |
| .script-workspace>.logic-editor (base) | min-height:0 |
| .logic-mode button (base) | min-width:max-content; white-space:normal |
| .script-workspace (base) | container:script-modes/inline-size |

- 键盘 4: keydown → modeNavigation

## src/components/ShortcutEditor.vue

- 责任/宿主：src/App.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=7, input=2；直接键盘绑定 2；非原生点击候选 0。
- 状态索引：空/选择条件 1；加载/等待 0；错误/诊断 1；有数据循环 1。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | section v-if | state.shortcutEditorOpen |
| 9 | section v-for | item in visible |
| 14 | p v-if | !visible.length |
| 16 | p v-if | conflict |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| article (base) | max-height:90vh; overflow:hidden |
| header (base) | min-height:58px |
| button (base) | min-height:34px |
| .search input (base) | min-width:0 |
| .shortcut-list (base) | min-height:0; overflow:auto |
| .shortcut-list section (base) | min-height:55px; grid-template-columns:minmax(0,1fr) 145px 36px |
| .shortcut-list section>span (base) | min-width:0 |

- 键盘 4: keydown → close
- 键盘 11: keydown → capture($event, item.id)

## src/components/SimulationStatusPanel17.vue

- 责任/宿主：src/components/ConfigPanel.vue；src/components/PhysicsSettingsPanel.vue；src/components/WorldComponentsInspector.vue；src/components/WorldToolsPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=6, summary=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 3；有数据循环 1。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 20 | progress v-if | bake.active |
| 25 | p v-if | error \|\| world.lastError |
| 26 | ul v-if | streams.cells.length |
| 26 | li v-for | cell in streams.cells.slice(0, 64) |
| 26 | p v-if | cell.error |
| 26 | button v-if | cell.error |
| 27 | p v-if | streams.cells.length > 64 |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .simulation-status17 (base) | min-width:0; container-type:inline-size |
| dl (base) | min-width:0 |
| .observations (base) | grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr)) |
| .observations>div (base) | min-width:0 |
| button (base) | min-height:36px; max-width:100%; white-space:normal |
| .cells li (base) | min-width:0 |

## src/components/StudioDraftConflict.vue

- 责任/宿主：src/components/ContentAssetInspector.vue；src/components/EventSheetEditor.vue；src/components/ObjectBlueprintEditor.vue；src/components/ScriptStudio.vue；src/components/VisualGraphEditor.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=2, summary=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| — | 静态模板 | 无条件分支；检查宿主挂载条件 |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .studio-draft-conflict (base) | max-height:45%; overflow:hidden |
| details (base) | min-height:0; overflow:auto |
| .versions (base) | grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr)) |
| .versions label (base) | min-width:0 |
| pre (base) | min-width:0; max-height:180px; overflow:auto; white-space:pre |
| button (base) | min-height:32px; white-space:normal |

## src/components/StudioStatusDialog.vue

- 责任/宿主：src/App.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=6, input=4, select=1；直接键盘绑定 1；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 1；有数据循环 4。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | section v-if | state.visible |
| 7 | section v-for | contract in NOVA_STABLE_CONTRACTS |
| 9 | p v-for | issue in KNOWN_ISSUES |
| 10 | option v-for | channel in RELEASE_CHANNELS |
| 10 | article v-for | channel in RELEASE_CHANNELS |
| 11 | small v-if | support.lastExport |
| 11 | small v-if | support.lastCrashExport |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| article (base) | max-height:92vh; overflow:auto |
| .contracts (base) | grid-template-columns:repeat(2,minmax(0,1fr)) |
| .contracts section (base) | min-width:0; grid-template-columns:1fr auto |
| footer button (base) | min-height:34px |
| .contracts (@media (max-width:600px)) | grid-template-columns:1fr |
| .support-grid (base) | grid-template-columns:1fr 1fr |
| .privacy-review button (base) | min-height:30px |
| .support-grid (@media (max-width:600px)) | grid-template-columns:1fr |
| .release-channels (base) | grid-template-columns:repeat(3,minmax(0,1fr)) |
| .release-channels article (base) | min-width:0 |
| .release-channels (@media (max-width:600px)) | grid-template-columns:1fr |

- 键盘 4: keydown → closeStudioStatus

## src/components/TeamWorkflowPanel.vue

- 责任/宿主：src/components/BuildSettingsPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=22, input=19, summary=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 3；加载/等待 0；错误/诊断 2；有数据循环 5。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 5 | div v-if | team.enabled |
| 9 | button v-for | change in changes |
| 10 | p v-if | !changes.length |
| 14 | div v-if | team.incomingSource |
| 15 | section v-if | team.semanticMerge |
| 18 | article v-for | conflict in team.semanticMerge.conflicts |
| 19 | span v-if | conflict.orderOnly |
| 28 | article v-for | list in team.changeLists.slice(0, 4) |
| 29 | div v-if | selectedDiff |
| 45 | button v-if | !team.lockToken |
| 45 | template v-else | (fallback) |
| 52 | li v-for | rule in team.ownership |
| 58 | li v-for | lock in team.binaryLocks |
| 60 | div v-else | (fallback) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .team-workflow (base) | min-width:0; container-type:inline-size |
| .team-workflow>header (base) | min-height:45px |
| .team-workflow>header>div (base) | min-width:0 |
| .status-pill (base) | white-space:nowrap |
| .team-grid (base) | min-height:0; grid-template-columns:minmax(280px,1.2fr) minmax(240px,1fr); overflow:auto |
| .team-grid>section (base) | min-width:0 |
| .card-title button (base) | min-height:27px |
| .change-list (base) | overflow:auto |
| .change-list .change-select (base) | min-width:0; min-height:38px; grid-template-columns:25px minmax(0,1fr) |
| .change-list .change-select .change-description (base) | min-width:0 |
| .change-list .change-select strong,.change-list .change-select small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .team-grid button (base) | min-height:29px |
| .team-grid label (base) | min-height:30px |
| .team-grid label input (base) | min-width:0 |
| .incoming-picker button (base) | max-width:62%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .conflict-summary (base) | min-height:34px |
| .team-grid (@container (max-width:620px)) | grid-template-columns:1fr |
| .change-list .change-select strong,.change-list .change-select small (base) | white-space:normal; text-overflow:clip |
| .inline-diff (base) | overflow:hidden |
| .inline-diff header (base) | min-height:30px |
| .inline-diff>div (base) | grid-template-columns:1fr 1fr |
| .inline-diff pre (base) | max-height:160px; overflow:auto; white-space:pre-wrap |
| .metadata-row (base) | grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto |
| .metadata-row>* (base) | min-width:0 |
| .metadata-card ul,.binary-card ul (base) | max-height:100px; overflow:auto |
| .network-card dl div (base) | grid-template-columns:80px minmax(0,1fr) |
| .semantic-merge>header,.change-list-editor>header (base) | min-height:28px |
| .semantic-merge>article (base) | min-width:0; min-height:34px; grid-template-columns:minmax(0,1fr) auto auto |
| .semantic-merge>article>div,.change-list-editor>article>div (base) | min-width:0 |
| .semantic-merge code,.change-list-editor small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .change-list-editor>article (base) | min-height:34px; grid-template-columns:minmax(0,1fr) auto |
| .change-list .change-select strong,.change-list .change-select small (base) | white-space:normal; text-overflow:clip |
| .semantic-merge .merge-conflict19 (base) | min-width:0 |
| .conflict-heading19 (base) | min-width:0 |
| .conflict-heading19 code (base) | white-space:pre-wrap |
| .conflict-values19 (base) | grid-template-columns:repeat(2,minmax(0,1fr)) |
| .conflict-values19>section (base) | min-width:0 |
| .merge-conflict19 pre (base) | white-space:pre-wrap; max-height:280px; overflow:auto; min-width:0 |
| .semantic-merge p (base) | white-space:normal |
| .conflict-values19 button (base) | white-space:normal; min-height:32px |
| .conflict-values19 (@container (max-width:700px)) | grid-template-columns:minmax(0,1fr) |
| .change-list .change-select strong,.change-list .change-select small (base) | white-space:normal; text-overflow:clip |
| .team-workflow>header small (base) | white-space:normal |
| .team-grid button (base) | white-space:normal |
| .team-grid (@container (max-width:620px)) | grid-template-columns:minmax(0,1fr) |
| .metadata-row (@container (max-width:620px)) | grid-template-columns:minmax(0,1fr) |
| .incoming-picker button (@container (max-width:620px)) | max-width:100% |
| .change-list .change-select strong,.change-list .change-select small (base) | white-space:normal; text-overflow:clip |

## src/components/TilemapPanel.vue

- 责任/宿主：src/components/EditorBottomPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=24, input=30, select=13, textarea=5；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 14；加载/等待 0；错误/诊断 2；有数据循环 15。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 6 | select v-if | tileMap |
| 8 | option v-for | asset in tileSets |
| 12 | option v-for | asset in images |
| 20 | button v-for | tool in tools |
| 28 | div v-if | !tileMap |
| 29 | div v-else-if | !tileSet |
| 30 | div v-else | (fallback) |
| 34 | option v-for | asset in palettes |
| 35 | option v-for | asset in brushes |
| 36 | option v-for | asset in terrains |
| 40 | button v-for | tile in visibleTiles |
| 46 | div v-if | importedMap |
| 47 | p v-if | tileSetError |
| 50 | input v-if | selectedDefinition |
| 51 | select v-if | selectedDefinition |
| 52 | input v-if | selectedDefinition |
| 53 | input v-if | selectedDefinition |
| 54 | input v-if | selectedDefinition |
| 55 | select v-if | selectedDefinition |
| 55 | option v-for | source in tileSet.sources |
| 56 | option v-for | source in tileSet.sources |
| 56 | template v-if | activeSource |
| 56 | option v-for | asset in images |
| 58 | select v-if | selectedDefinition |
| 58 | option v-for | asset in sceneAssets |
| 59 | select v-if | selectedDefinition |
| 59 | option v-for | asset in prefabAssets |
| 61 | input v-if | selectedDefinition?.animation |
| 61 | select v-if | selectedDefinition?.animation |
| 63 | label v-if | selectedDefinition?.collision === 'Polygon' |
| 69 | p v-if | tilemapEditorState.selection |
| 69 | template v-if | selectionWorld |
| 70 | button v-for | (layer, index) in tileMap.layers |
| 70 | template v-if | activeLayer |
| 71 | p v-if | bakeResult |
| 71 | code v-if | tileBakeState.artifactHash |
| 72 | p v-if | !tilemapEditorState.history.length |
| 72 | ol v-else | (fallback) |
| 72 | li v-for | change in tilemapEditorState.history.slice(-8).reverse() |
| 73 | article v-for | (issue,index) in diagnostics |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .tile-definition-fields (base) | min-width:0 |
| .imported-map-ownership button (base) | min-height:32px; white-space:normal |
| .asset-selects select,.asset-selects input (base) | min-width:0 |
| .layers > button (base) | min-height:28px; grid-template-columns:auto minmax(0, 1fr) auto |
| .layers > button input:not([type=checkbox]) (base) | min-width:0 |
| .baking > button,.diagnostics>button (base) | min-height:30px |
| .tile-history li (base) | grid-template-columns:minmax(70px,1fr) auto |
| .bake-actions (base) | grid-template-columns:1fr auto |
| .baking code (base) | overflow:hidden; text-overflow:ellipsis |
| .tilemap-panel (base) | min-width:0 |
| .tilemap-toolbar (base) | min-height:42px |
| .tilemap-toolbar button, .tilemap-toolbar select, .tilemap-toolbar input (base) | min-height:30px |
| .tilemap-workspace (base) | min-height:0; grid-template-columns:minmax(180px, 1fr) 260px |
| .tilemap-workspace aside (base) | min-width:0; overflow:auto |
| .tile-properties (base) | overflow:auto |
| .tile-properties label (base) | min-height:34px |
| .tile-properties input, .tile-properties select, .tile-properties textarea (base) | min-width:0 |
| .tile-properties textarea (base) | resize:vertical |
| .tilemap-toolbar .compact-toggle input (base) | min-height:16px |
| .tilemap-workspace (@media (max-width: 700px)) | grid-template-columns:minmax(150px, 1fr) minmax(180px, 220px) |
| .tilemap-panel (@media (max-width: 520px)) | overflow:auto |
| .tilemap-workspace (@media (max-width: 520px)) | grid-template-columns:1fr |
| .tilemap-workspace aside (@media (max-width: 520px)) | min-height:110px |
| .tile-properties (@media (max-width: 520px)) | min-height:120px |

## src/components/TimelineButtonAction.vue

- 责任/宿主：src/components/RuntimeComponentsInspector.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 select=1, summary=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 1。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | option v-for | kind in timelineUiActions |
| 5 | p v-if | action |
| 5 | p v-else | (fallback) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .timeline-button-action (base) | min-width:0 |
| .timeline-button-action p (base) | white-space:normal |
| .timeline-button-action select (base) | min-width:0 |

## src/components/ToolBar.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=29, input=7, select=1, summary=4；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 5。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 7 | button v-for | tool in transformTools |
| 16 | path v-if | tool.id === 'select' |
| 17 | path v-else-if | tool.id === 'move' |
| 18 | path v-else-if | tool.id === 'rotate' |
| 19 | path v-else | (fallback) |
| 29 | button v-for | tool in authoringTools |
| 37 | button v-for | tool in shapeTools |
| 38 | circle v-if | tool.id === 'circle' |
| 38 | path v-else-if | tool.id === 'triangle' |
| 38 | rect v-else | (fallback) |
| 60 | label v-for | snap in snapOptions |
| 83 | option v-for | ratio in overlayOptions |
| 84 | div v-if | authoringState.cameraOverlay === 'Custom' |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .toolbar (base) | min-height:46px; max-width:100%; min-width:0; overflow:visible |
| .toolbar-content (base) | min-width:0 |
| button (base) | min-width:36px |
| .segmented button (base) | min-width:max-content; white-space:nowrap |
| .snap (base) | white-space:nowrap |
| .create-object (base) | white-space:nowrap |
| .tool-menu summary (base) | white-space:nowrap |
| .action-grid (base) | grid-template-columns:1fr 1fr |
| .action-grid button (base) | min-width:0 |
| .checks label,.guide-controls label (base) | min-height:31px |
| .tool-grid (base) | grid-template-columns:1fr 1fr |
| .tool-grid button (base) | min-width:0 |
| .tool-grid button span:last-child (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .shape-grid (base) | grid-template-columns:repeat(3,1fr) |
| .viewport-popover (base) | grid-template-columns:1fr 1fr |
| .viewport-popover section (base) | min-width:0 |
| .guide-controls>div (base) | grid-template-columns:minmax(0,1fr) 34px 34px |
| .guide-controls input[type=number] (base) | min-width:0 |
| .guide-controls button (base) | min-width:0 |
| .camera-overlay (base) | white-space:nowrap |
| .camera-overlay select (base) | min-height:27px |
| .custom-resolution input (base) | min-height:27px |
| .create-object span (@media (max-width: 760px)) | overflow:hidden |

## src/components/UiScenePreview.vue

- 责任/宿主：src/components/PresentationPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 无；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 1；加载/等待 0；错误/诊断 1；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 33 | p v-if | !hasControls |
| 34 | p v-if | failure |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .ui-scene-preview (base) | min-width:0 |
| .ui-scene-preview canvas (base) | max-height:380px |

## src/components/UndoHistoryPanel.vue

- 责任/宿主：src/App.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=4；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 1；加载/等待 0；错误/诊断 0；有数据循环 1。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | aside v-if | state.undoHistoryOpen |
| 7 | ol v-if | history.entries.length |
| 8 | li v-for | entry in reversed |
| 12 | div v-else | (fallback) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .history-panel (base) | max-height:calc(100vh - 70px); overflow:hidden |
| header (base) | min-height:54px |
| .history-actions button (base) | min-height:32px |
| ol (base) | min-height:0; overflow:auto |
| li (base) | min-height:54px; grid-template-columns:18px minmax(0,1fr) |
| li>div (base) | min-width:0 |
| li strong,li small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .empty (base) | min-height:180px |

## src/components/VirtualControlsOverlay.vue

- 责任/宿主：src/components/WorldCanvas.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=1；直接键盘绑定 2；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 1。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 90 | div v-if | visible |
| 92 | button v-for | control in deviceInputSettings.virtualControls |
| 109 | span v-if | control.kind === 'button' |
| 110 | template v-else | (fallback) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .virtual-control (base) | overflow:hidden |
| .button-label (base) | max-width:82%; overflow:hidden; text-overflow:ellipsis |

- 键盘 92: keydown → keyboard(control, $event, true)
- 键盘 92: keyup → keyboard(control, $event, false)

## src/components/VisualGraphEditor.vue

- 责任/宿主：src/components/ScriptWorkspace.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=56, input=29, select=6, textarea=1, summary=4；直接键盘绑定 4；非原生点击候选 0。
- 状态索引：空/选择条件 24；加载/等待 3；错误/诊断 7；有数据循环 27。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 13 | option v-for | routine in graph.routines |
| 27 | button v-if | layoutRunning |
| 34 | p v-if | graphSaveError |
| 35 | StudioDraftConflict v-if | graphDraftConflict |
| 36 | div v-if | layoutMessage |
| 36 | button v-for | item in layoutDiagnostics |
| 39 | aside v-if | paneLayout.primaryVisible |
| 41 | PanelResizeHandle v-if | !paneLayout.drawer |
| 42 | nav v-if | studio.authoringMode === 'blocks' |
| 42 | button v-for | family in scratchFamilies |
| 45 | button v-for | asset in graphAssets |
| 48 | section v-for | group in paletteGroups |
| 48 | button v-for | definition in group.items |
| 49 | p v-if | !paletteResults.length |
| 56 | g v-for | edge in visibleEdges |
| 57 | path v-if | pendingWire && pointerGraph |
| 59 | div v-if | selectedEdge |
| 59 | button v-for | (point,index) in selectedEdge.reroutes |
| 61 | article v-for | comment in activeScope.comments |
| 64 | article v-for | node in visibleNodes |
| 65 | span v-if | node.config.layoutPinned === true |
| 66 | div v-if | !node.collapsed |
| 67 | div v-for | pin in node.pins |
| 70 | template v-if | pin.kind === 'data' && pin.direction === 'input' && !pinConnected(pin) |
| 71 | span v-if | node.type.startsWith('rhai.') |
| 72 | template v-else | (fallback) |
| 72 | input v-if | pin.valueType === 'Number' |
| 73 | input v-else-if | pin.valueType === 'Boolean' |
| 74 | div v-else-if | pin.valueType === 'Vec2' |
| 75 | input v-else | (fallback) |
| 77 | template v-if | node.type.startsWith('literal.') && pin.direction === 'output' |
| 78 | input v-if | pin.valueType === 'Number' |
| 79 | input v-else-if | pin.valueType === 'Boolean' |
| 80 | div v-else-if | pin.valueType === 'Vec2' |
| 81 | input v-else | (fallback) |
| 85 | select v-if | node.type.startsWith('variable.') && !node.collapsed |
| 85 | option v-for | variable in graph.variables |
| 86 | select v-if | node.type.startsWith('local.') && activeRoutine && !node.collapsed |
| 86 | option v-for | local in activeRoutine.locals |
| 87 | section v-if | !node.collapsed && (node.type.startsWith('code.') \|\| typeof node.config.rhaiSourceOverride === 'string') |
| 90 | button v-if | node.config.rhaiSourceOverride |
| 92 | div v-if | !node.collapsed && nodeLiveValues(node).length |
| 92 | span v-for | item in nodeLiveValues(node) |
| 95 | div v-if | selectionBox |
| 98 | aside v-if | studio.minimapOpen |
| 98 | rect v-for | node in activeScope.nodes |
| 99 | button v-if | !paneLayout.primaryVisible |
| 102 | aside v-if | paneLayout.secondaryVisible |
| 104 | PanelResizeHandle v-if | !paneLayout.drawer |
| 106 | button v-for | node in searchedNodes |
| 107 | p v-if | routingBusy |
| 109 | option v-for | edge in listedEdges |
| 111 | template v-if | selectedEdge |
| 112 | div v-for | (point,index) in selectedEdge.reroutes |
| 113 | p v-if | wireMessage |
| 116 | section v-if | selectedSyntaxNode |
| 118 | label v-for | field in syntaxNodeEditableFields(selectedSyntaxNode) |
| 119 | input v-if | field.kind === 'boolean' |
| 120 | select v-else-if | field.kind === 'choice' |
| 120 | option v-for | option in field.options |
| 121 | input v-else | (fallback) |
| 123 | label v-for | option in syntaxNodeOptionalChildren(selectedSyntaxNode) |
| 124 | section v-for | list in syntaxNodeChildLists(selectedSyntaxNode) |
| 126 | article v-for | (slot,index) in list.slots |
| 131 | p v-if | syntaxFieldError |
| 132 | button v-if | selectedSyntaxRegion |
| 135 | section v-if | graph.language |
| 137 | button v-for | declaration in syntaxDeclarations |
| 140 | GraphProductionPanel v-else | (fallback) |
| 141 | section v-if | !graph.language |
| 141 | article v-for | variable in graph.variables |
| 141 | option v-for | type in valueTypes |
| 141 | div v-if | variable.valueType === 'Number' |
| 141 | p v-if | !graph.variables.length |
| 142 | template v-if | !showCompiled |
| 142 | article v-for | (diagnostic,index) in validation.diagnostics |
| 142 | details v-if | graphDiagnosticMessage(diagnostic,preferencesState.locale)!==diagnostic.message |
| 142 | p v-if | !validation.diagnostics.length |
| 142 | pre v-else | (fallback) |
| 145 | button v-if | !paneLayout.secondaryVisible |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .syntax-pin-fallback (base) | min-width:0; max-width:130px; white-space:normal |
| .syntax-fields .syntax-optional (base) | grid-template-columns:auto minmax(0,1fr) |
| .syntax-child-list (base) | min-width:0 |
| .syntax-child-list article (base) | min-width:0 |
| .syntax-child-list article button (base) | min-width:28px |
| .syntax-fields label (base) | grid-template-columns:minmax(0,1fr); min-width:0 |
| .syntax-fields input,.syntax-fields select (base) | min-width:0 |
| .syntax-fields button (base) | white-space:normal; min-height:28px |
| .graph-editor (base) | min-width:0; min-height:0; overflow:hidden |
| .graph-toolbar (base) | min-height:48px |
| .primary-actions,.editing-actions,.authoring-switch (base) | min-width:0 |
| .editing-actions (base) | overflow-x:auto |
| .scope-picker (base) | min-width:128px; max-width:210px |
| .graph-toolbar button (base) | min-width:32px; min-height:33px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis |
| .authoring-switch button (base) | min-height:27px |
| .graph-status (base) | white-space:nowrap |
| .graph-body (base) | min-width:0; min-height:0; grid-template-columns:minmax(224px,264px) minmax(320px,1fr) minmax(312px,344px); overflow:hidden |
| .graph-body.no-palette (base) | grid-template-columns:minmax(320px,1fr) minmax(312px,344px) |
| .graph-body.no-details (base) | grid-template-columns:minmax(224px,264px) minmax(320px,1fr) |
| .graph-body.no-palette.no-details (base) | grid-template-columns:minmax(0,1fr) |
| .graph-palette,.graph-details (base) | min-width:0; min-height:0; overflow:hidden |
| .graph-palette>header,.graph-details>header (base) | min-height:40px |
| .graph-palette>header strong,.graph-details>header strong (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .graph-palette>input (base) | min-height:33px |
| .block-categories (base) | grid-template-columns:repeat(2,minmax(0,1fr)) |
| .block-categories button (base) | min-width:0; min-height:30px; overflow:hidden |
| .block-categories button span (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .asset-list (base) | max-height:152px; overflow:auto |
| .asset-list button,.palette-list button (base) | min-width:0 |
| .asset-list span,.palette-list span (base) | min-width:0 |
| .asset-list strong,.palette-list strong (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .asset-list small,.palette-list small (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .palette-list (base) | min-height:0; overflow:auto |
| .graph-canvas (base) | min-width:0; min-height:0; overflow:hidden |
| .wires (base) | overflow:visible |
| .comments,.nodes-layer (base) | overflow:visible |
| .graph-comment input (base) | min-width:0; min-height:28px |
| .graph-comment.collapsed (base) | overflow:hidden |
| .graph-node (base) | overflow:visible |
| .graph-node>header strong (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .graph-node>header small (base) | max-width:38%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .node-pin (base) | min-height:27px |
| .node-pin>span (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .node-pin input[type=text],.node-pin input[type=number],.graph-node>select (base) | min-width:0 |
| .canvas-controls (base) | max-width:calc(100% - 24px); overflow:hidden |
| .minimap (base) | overflow:hidden |
| .open-palette,.open-details (base) | min-height:32px; max-width:min(220px,calc(100% - 24px)); overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .graph-details (base) | container:graph-details/inline-size; overflow:auto |
| .graph-summary,.variables,.diagnostics (base) | min-width:0 |
| .graph-summary input (base) | min-width:0; min-height:36px |
| .variables>header,.diagnostics>header (base) | min-height:34px |
| .variables>header button,.diagnostics>header button (base) | min-width:32px; min-height:32px; overflow:hidden; text-overflow:ellipsis |
| .variables article (base) | min-width:0 |
| .variables article>div:first-child (base) | min-width:0; grid-template-columns:minmax(92px,1fr) minmax(86px,.55fr) 32px |
| .variables article label (base) | min-width:0 |
| .variables article label span (base) | min-width:0 |
| .variables article input,.variables article select (base) | min-width:0 |
| .variables article button.danger (base) | min-width:32px |
| .number-metadata (base) | min-width:0; grid-template-columns:repeat(auto-fit,minmax(72px,1fr)) |
| .diagnostics (base) | min-height:0; overflow:auto |
| .graph-diagnostic>button (base) | min-width:0 |
| .graph-diagnostic>button span (base) | min-width:0 |
| .diagnostics pre (base) | max-width:100%; max-height:360px; overflow:auto; white-space:pre |
| .variables article>div:first-child (@container graph-details (max-width:300px)) | grid-template-columns:minmax(0,1fr) 32px |
| .number-metadata (@container graph-details (max-width:300px)) | grid-template-columns:1fr |
| .editing-actions (@media (min-width:1181px) and (max-width:1500px)) | overflow:visible |
| .editing-actions (@media (min-width:761px) and (max-width:1180px)) | overflow:visible |
| .node-source textarea (base) | min-height:78px; resize:vertical |
| .node-source button (base) | min-height:25px |
| .blocks-mode .graph-node (base) | overflow:visible |
| .canvas-controls input (base) | min-width:54px |
| .graph-hint (base) | max-width:calc(100% - 450px); overflow:hidden; white-space:nowrap |
| .node-live-values span (base) | min-width:0; grid-template-columns:minmax(42px,.7fr) minmax(0,1fr) |
| .node-live-values b (base) | overflow:hidden; text-overflow:ellipsis |
| .node-live-values code (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .graph-editor (base) | container:graph-studio/inline-size |
| .graph-toolbar button (base) | white-space:normal; text-overflow:clip |
| .scope-picker (base) | min-width:100px; max-width:190px |
| .graph-status (base) | white-space:normal |
| .graph-more>summary (base) | min-height:33px |
| .graph-more .editing-actions (base) | max-height:min(440px,65vh); grid-template-columns:repeat(2,minmax(0,1fr)); overflow:auto |
| .graph-more .editing-actions button (base) | min-width:0; min-height:36px |
| .graph-layout-status (base) | max-height:72px; overflow:auto |
| .graph-palette,.graph-details (base) | max-width:100% |
| .graph-details (base) | overflow:hidden |
| .graph-details-content (base) | min-height:0; min-width:0; overflow:auto |
| .block-categories (base) | max-height:140px; overflow:auto |
| .palette-list strong,.palette-list small,.asset-list strong,.asset-list small,.block-categories button span,.graph-palette>header strong,.graph-details>header strong (base) | white-space:normal; overflow:visible; text-overflow:clip |
| .graph-symbol-search button (base) | min-width:0; white-space:normal |
| .wire-inspector input,.wire-inspector select,.graph-symbol-search input (base) | min-width:0; min-height:32px |
| .wire-inspector button (base) | min-width:0; min-height:32px; white-space:normal |
| .reroute-row (base) | min-width:0; grid-template-columns:minmax(0,1fr) minmax(0,1fr) 28px |
| .reroute-row label (base) | min-width:0 |
| .graph-node.syntax-card>header (base) | min-height:48px; grid-template-columns:17px minmax(0,1fr) 24px |
| .syntax-card>header strong (base) | white-space:normal; overflow:visible |
| .syntax-card>header small (base) | max-width:none; white-space:normal |
| .syntax-card .node-pin>span (base) | white-space:normal; overflow:visible |
| .syntax-card .node-pin (base) | min-height:31px |
| .compact-nodes .syntax-card>header (base) | min-height:38px |
| .compact-nodes .syntax-card .node-pin (base) | min-height:25px |
| .wire-points (base) | overflow:visible |
| .canvas-controls (base) | overflow-x:auto |
| .graph-more .editing-actions (@container graph-studio (max-width:760px)) | grid-template-columns:1fr |
| .open-palette,.open-details (@container graph-studio (max-width:760px)) | max-width:calc(50% - 18px) |
| .syntax-fields button (base) | min-height:var(--control-default) |
| .graph-diagnostic (base) | min-width:0 |
| .graph-diagnostic summary (base) | min-height:28px |
| .graph-diagnostic pre (base) | white-space:pre-wrap; max-width:100% |

- 键盘 3: keydown → cancelInitialLayout
- 键盘 3: keydown → onKeydown
- 键盘 43: keydown → addFirstPaletteNode
- 键盘 59: keydown → rerouteKeydown($event,selectedEdge!,index)

## src/components/WorkspaceBar.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=10, summary=2；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 1。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 5 | button v-for | preset in visiblePresets |
| 13 | i v-if | workspaceDirty(preset.id) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .workspace-bar (base) | min-height:48px; overflow:visible |
| .workspace-list, .history-controls (base) | min-width:0 |
| .workspace-list (base) | overflow-x:auto |
| .context-title (base) | min-width:140px; max-width:min(290px,23vw) |
| .context-title small,.context-title strong (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| button,summary (base) | min-height:34px; white-space:nowrap |
| .workspace-list button span:first-child (base) | min-width:15px |
| .workspace-list button i.dirty (base) | min-width:6px |
| .workspace-menu summary (base) | min-width:82px |
| .workspace-popover button span:nth-child(2) (base) | min-width:0; overflow:hidden; text-overflow:ellipsis |
| .control-label (@media (max-width: 1280px)) | overflow:hidden |
| .context-title (@media (max-width: 1280px)) | max-width:180px |
| .workspace-menu summary (@media (max-width: 1280px)) | min-width:44px |
| .workspace-menu summary span:last-child (@media (max-width: 1280px)) | overflow:hidden |
| .workspace-list button (@media (max-width:680px)) | min-height:31px |

## src/components/WorkspaceManager.vue

- 责任/宿主：src/App.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=21, input=6；直接键盘绑定 1；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 0；有数据循环 3。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | section v-if | state.workspaceManagerOpen |
| 8 | button v-for | profile in WORKSPACE_PROFILE_PRESETS |
| 11 | button v-for | preset in WORKSPACE_PRESETS.filter(item => item.id !== 'custom') |
| 12 | button v-for | workspace in workspaceState.custom |
| 13 | p v-if | !workspaceState.custom.length |
| 23 | button v-if | selectedCustom |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| article (base) | max-height:92vh; overflow:hidden |
| header (base) | min-height:58px |
| .scope,.profiles (base) | min-height:45px |
| .profiles (base) | overflow:auto |
| .profiles button (base) | white-space:nowrap |
| button (base) | min-height:34px |
| .manager-grid (base) | min-height:400px; grid-template-columns:240px minmax(0,1fr) |
| nav (base) | overflow:auto |
| nav button (base) | min-height:48px |
| main (base) | overflow:auto |
| .dock-grid (base) | grid-template-columns:1fr 1fr |
| .dock-grid .toggle (base) | grid-template-columns:auto 1fr |
| .manager-grid (@media (max-width:620px)) | grid-template-columns:1fr |
| nav (@media (max-width:620px)) | max-height:180px |
| .dock-grid (@media (max-width:620px)) | grid-template-columns:1fr |

- 键盘 4: keydown → close

## src/components/WorldCanvas.vue

- 责任/宿主：src/PlayerApp.vue；src/layout/EditorLayout.vue；src/panels/RendererPanel.vue；src/panels/ScenePanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 input=1；直接键盘绑定 1；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 0；有数据循环 3。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 1507 | VirtualControlsOverlay v-if | editorState.currentPage === 'game' |
| 1508 | div v-if | editorState.currentPage === 'game' && accessibilityNodes.length |
| 1509 | div v-for | node in accessibilityNodes |
| 1530 | div v-if | editorState.currentPage === 'game' && (runtimeAccessibilitySettings.subtitles && timelinePresentationState.subtitles.length \|\| visibleCaptions.length) |
| 1531 | p v-for | subtitle in (runtimeAccessibilitySettings.subtitles ? timelinePresentationState.subtitles : []) |
| 1532 | p v-for | caption in visibleCaptions |
| 1534 | input v-if | focusedUiInput && editorState.currentPage === 'game' |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .canvas-container (base) | overflow:hidden |
| .native-ui-input (base) | min-width:0; min-height:0 |
| .game-ui-a11y-node (base) | overflow:hidden |
| .timeline-subtitles p (base) | max-width:min(80%, 860px) |
| .timeline-subtitles p.safe-TitleSafe (base) | max-width:min(80%, 860px) |
| .timeline-subtitles p.safe-ActionSafe (base) | max-width:90% |
| .timeline-subtitles p.safe-FullFrame (base) | max-width:96% |

- 键盘 1534: keydown → onNativeKey

## src/components/WorldComponentsInspector.vue

- 责任/宿主：src/components/ConfigPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=7, input=12, select=7, textarea=1, summary=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 2；加载/等待 0；错误/诊断 1；有数据循环 1。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 3 | SimulationStatusPanel17 v-if | region \|\| chunk |
| 4 | p v-if | form17.error.value |
| 5 | section v-if | region |
| 9 | label v-if | region.source === 'TileMap' |
| 15 | button v-if | navigationBakeState.active |
| 17 | article v-for | (link,index) in region.links |
| 20 | section v-if | agent |
| 22 | section v-if | obstacle |
| 24 | section v-if | chunk |
| 26 | section v-if | behavior |
| 26 | button v-if | !aiEnabled |
| 28 | section v-if | pool |
| 28 | button v-if | !poolEnabled |
| 28 | small v-if | poolStats |
| 30 | section v-if | emitter |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| label (base) | min-height:32px |
| label>input,label>select,label>div,label>textarea,label>.inline (base) | min-width:0 |
| label>div (base) | grid-template-columns:1fr 1fr |
| .inline input[type=number] (base) | min-width:0 |
| .stacked textarea (base) | min-height:58px |
| .actions button,.package,details>button (base) | min-height:30px |
| details article (base) | grid-template-columns:auto repeat(2,1fr) auto repeat(2,1fr) auto |
| details article input (base) | min-width:0 |
| .world-component (base) | container-type:inline-size |
| header strong,header span,label>span,small (base) | min-width:0 |
| label (base) | grid-template-columns:minmax(0,1fr) |
| label>input,label>select,label>div,label>textarea,label>.inline (base) | min-height:34px |
| label>input[type=checkbox] (base) | min-height:22px |
| .actions button (base) | white-space:normal; max-width:100% |
| details article (base) | grid-template-columns:minmax(0,1fr) |
| details article input (base) | min-height:32px |
| label (@container (min-width:520px)) | grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) |
| details article .inline input[type=number] (base) | min-width:86px |
| label>div input[type=number] (base) | min-width:86px |
| .numeric-draft (base) | max-width:100% |

## src/components/WorldToolsPanel.vue

- 责任/宿主：src/components/EditorBottomPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=19, input=93, select=15, textarea=2, summary=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 7；加载/等待 1；错误/诊断 3；有数据循环 15。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 6 | button v-for | tab in tabs |
| 8 | p v-if | form17.error.value |
| 12 | button v-if | activeTab !== 'simulation' |
| 13 | div v-if | activeTab === 'navigation' |
| 14 | div v-if | activeTab === 'streaming' |
| 15 | template v-if | activeTab === 'navigation' \|\| activeTab === 'ai' |
| 19 | button v-if | !activePackageEnabled |
| 22 | label v-if | activeTab === 'navigation' |
| 23 | template v-if | activeTab === 'navigation' |
| 28 | dl v-if | activeTab === 'ai' |
| 29 | template v-if | activeTab === 'simulation' |
| 40 | label v-if | activeTab === 'areas' |
| 41 | label v-if | activeTab === 'streaming' |
| 42 | label v-if | activeTab === 'streaming' |
| 43 | label v-if | activeTab === 'streaming' |
| 44 | dl v-if | activeTab === 'streaming' |
| 45 | button v-if | activeTab === 'streaming' && worldStreamingState.pending |
| 48 | section v-if | activeTab === 'simulation' |
| 51 | article v-for | check in simulationReport.checks |
| 51 | details v-if | check.status !== 'ready' |
| 52 | section v-if | simulationReport.issues.length |
| 52 | article v-for | issue in simulationReport.issues |
| 55 | div v-else-if | !selectedEntity |
| 57 | template v-else-if | activeTab === 'character' && character |
| 63 | template v-else-if | activeTab === 'areas' && area |
| 65 | label v-if | area.shape === 'Circle' |
| 65 | label v-else | (fallback) |
| 66 | section v-if | effector |
| 66 | article v-for | effect in effector.effectors |
| 66 | label v-if | effect.kind === 'Gravity' \|\| effect.kind === 'Wind' |
| 66 | label v-if | effect.kind === 'Gravity' \|\| effect.kind === 'Wind' |
| 66 | label v-if | effect.kind === 'Drag' |
| 66 | label v-if | effect.kind === 'Buoyancy' |
| 66 | label v-if | effect.kind === 'Damage' |
| 66 | label v-if | effect.kind === 'Signal' |
| 69 | template v-else-if | activeTab === 'navigation' |
| 70 | div v-if | region |
| 70 | label v-if | region.source === 'TileMap' |
| 70 | option v-for | entity in physicsState.world.entities |
| 70 | label v-if | region.algorithm === 'HierarchicalAStar' |
| 71 | article v-for | link in region.links |
| 72 | article v-for | area in region.costAreas |
| 72 | label v-if | area.shape === 'Box' |
| 72 | label v-else | (fallback) |
| 74 | div v-else-if | agent |
| 74 | option v-for | entity in physicsState.world.entities.filter(value => value !== selectedEntity) |
| 75 | div v-else-if | obstacle |
| 75 | label v-if | obstacle.shape === 'Circle' |
| 75 | label v-else | (fallback) |
| 78 | template v-else-if | activeTab === 'ai' |
| 80 | div v-if | behavior |
| 80 | option v-for | asset in behaviorAssets |
| 80 | section v-if | selectedAiDebug |
| 80 | template v-for | (value,key) in selectedAiDebug.blackboard |
| 80 | p v-if | Object.keys(selectedAiDebug.utility).length |
| 81 | div v-if | machine |
| 81 | option v-for | asset in stateAssets |
| 84 | template v-else-if | activeTab === 'streaming' && chunk |
| 97 | option v-for | scene in sceneManager.scenes |
| 100 | article v-for | cell in worldStreamingState.cells |
| 103 | template v-else-if | activeTab === 'streaming' && portal |
| 104 | option v-for | scene in sceneManager.scenes |
| 107 | template v-else-if | activeTab === 'pooling' && pool |
| 108 | option v-for | asset in prefabAssets |
| 111 | div v-else | (fallback) |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .world-tools (base) | min-width:0; container-type:inline-size |
| .world-tools>header (base) | min-height:46px; grid-template-columns:minmax(160px,auto) minmax(0,1fr) |
| .world-tools>header>div (base) | min-width:160px |
| .world-tools nav (base) | min-width:0; overflow:visible |
| .world-tools nav button (base) | min-width:0 |
| .world-tools button,.world-tools input,.world-tools select,.world-tools textarea (base) | min-height:29px |
| .world-tools button (base) | white-space:nowrap |
| .workspace (base) | min-height:0; grid-template-columns:230px minmax(0,1fr) |
| aside,main (base) | min-height:0; overflow:auto |
| aside>label,.form-grid label,.effect-list label (base) | min-height:34px |
| dl (base) | grid-template-columns:1fr auto |
| .form-grid (base) | grid-template-columns:repeat(auto-fit,minmax(220px,1fr)) |
| .form-grid label>div input (base) | min-width:0 |
| .effect-list article (base) | grid-template-columns:120px repeat(auto-fit,minmax(140px,1fr)) 30px |
| .effect-list input (base) | min-width:0 |
| .stacked textarea,.stacked select (base) | min-height:64px |
| .stacked select (base) | min-height:30px |
| .empty p (base) | max-width:360px |
| .world-tools>header (@container (max-width:850px)) | grid-template-columns:1fr |
| .world-tools>header>div (@container (max-width:850px)) | min-width:0; grid-template-columns:auto minmax(0,1fr) |
| .world-tools>header small (@container (max-width:850px)) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .world-tools nav (@container (max-width:850px)) | grid-template-columns:repeat(6,minmax(0,1fr)) |
| .world-tools nav button (@container (max-width:850px)) | overflow:hidden; text-overflow:ellipsis |
| .workspace (@container (max-width:600px)) | grid-template-columns:180px minmax(0,1fr) |
| .world-tools nav (@container (max-width:600px)) | grid-template-columns:repeat(3,minmax(0,1fr)) |
| .effect-list article (@container (max-width:600px)) | grid-template-columns:1fr 1fr |
| .quick-adds button (base) | overflow:hidden; text-overflow:ellipsis |
| .operation-row (base) | grid-template-columns:1fr auto |
| .production-list article (base) | min-width:0; grid-template-columns:auto minmax(150px,1fr) auto auto auto |
| .production-list article.cost-row (base) | grid-template-columns:auto minmax(100px,1fr) 90px repeat(4,minmax(130px,auto)) auto; overflow-x:auto |
| .production-list article input:not([type=checkbox]),.production-list article select (base) | min-width:0 |
| .point-editor (base) | min-width:0; grid-template-columns:1fr 1fr |
| .point-editor label,.coordinate-field (base) | grid-template-columns:auto minmax(48px,1fr) minmax(48px,1fr) |
| .debug-card dl (base) | max-height:130px; overflow:auto |
| .stream-cells (base) | grid-template-columns:repeat(auto-fit,minmax(170px,1fr)) |
| .stream-cells article (base) | grid-template-columns:1fr auto |
| .simulation-overview (base) | min-width:0 |
| .simulation-metrics (base) | grid-template-columns:repeat(auto-fit,minmax(120px,1fr)) |
| .simulation-metrics article (base) | min-width:0 |
| .simulation-checks (base) | grid-template-columns:repeat(auto-fit,minmax(230px,1fr)) |
| .simulation-checks>article,.simulation-issues>article (base) | min-width:0 |
| .simulation-issues>article (base) | grid-template-columns:minmax(120px,auto) minmax(0,1fr) |
| .world-tools nav (@container (max-width:850px)) | grid-template-columns:repeat(4,minmax(0,1fr)) |
| .simulation-checks (@container (max-width:850px)) | grid-template-columns:1fr |
| .simulation-issues>article (@container (max-width:850px)) | grid-template-columns:1fr |
| .world-tools (base) | container-type:inline-size |
| .form-grid label (base) | min-width:0 |
| .form-grid label>span (base) | white-space:normal |
| .form-grid input,.form-grid select,.form-grid textarea (base) | min-width:0; max-width:100%; min-height:34px |
| .stream-cells article (base) | min-width:0 |
| .form-grid (@container (max-width:620px)) | grid-template-columns:minmax(0,1fr) |
| .workspace (@container (max-width:620px)) | grid-template-columns:minmax(0,1fr) |
| .form-grid label (@container (max-width:620px)) | grid-template-columns:minmax(0,1fr) |
| .form-grid (base) | grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr)) |
| .form-grid label>div input,.effect-list label>div input (base) | min-width:86px |
| .effect-list article (base) | grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)) |
| .effect-list input,.effect-list select (base) | min-height:34px |
| .production-list article,.production-list article.cost-row (base) | grid-template-columns:1fr; overflow:visible |
| .point-editor (base) | grid-template-columns:1fr |
| .point-editor label,.coordinate-field (base) | grid-template-columns:1fr 1fr |
| .production-list article>label input:not([type=checkbox]) (base) | min-width:86px |
| .world-tools (base) | overflow:auto |
| .world-tools>.simulation-status17 (base) | max-height:35%; overflow:auto |
| .workspace (base) | min-height:240px |
| .world-tools nav button (base) | min-width:max-content; max-width:100%; white-space:nowrap; overflow:visible; min-height:36px |
| aside>label input[type=number] (base) | min-width:86px; min-height:34px |
| .world-tools aside button (base) | min-height:36px; white-space:normal; overflow:visible; text-overflow:clip |
| .world-tools>.simulation-status17 (@container (max-width:850px)) | max-height:25% |
| .world-tools>.simulation-status17 (base) | max-height:none; overflow:visible |
| .workspace (base) | min-height:240px |
| .workspace>aside,.workspace>main (base) | overflow:visible; min-width:0 |
| .world-tools nav button (base) | min-width:0; white-space:normal |
| .simulation-checks (base) | grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr)) |
| .world-tools>header small (@container (max-width:620px)) | white-space:normal; overflow:visible; text-overflow:clip |
| .simulation-issues>article (@container (max-width:620px)) | grid-template-columns:minmax(0,1fr) |

## src/layout/EditorLayout.vue

- 责任/宿主：src/App.vue
- 扩展：Local maximize/expand source exists; inspect host policy.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=2；直接键盘绑定 0；非原生点击候选 1。
- 状态索引：空/选择条件 12；加载/等待 3；错误/诊断 0；有数据循环 2。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 4 | div v-if | recoveryState.readOnly |
| 10 | ToolBar v-if | state.currentPage === 'scene' && state.activeWorkspace !== 'ui' |
| 13 | SideBar v-if | !state.distractionFree |
| 14 | div v-if | !state.distractionFree |
| 15 | template v-for | panel in workspaceState.panelOrder |
| 16 | SceneSideBar v-if | panel === 'hierarchy' && showHierarchy && state.hierarchyDock === 'left' && !isFloating('hierarchy') |
| 17 | ConfigPanel v-else-if | panel === 'inspector' && inspectorLoaded && state.inspectorDock === 'left' && !isFloating('inspector') |
| 17 | ConfigPanel v-show | showInspector |
| 21 | SceneTabs v-if | state.currentPage === 'scene' && state.activeWorkspace === 'design' && !state.distractionFree |
| 24 | LayerBar v-if | state.currentPage === 'scene' |
| 28 | ManageWorkspace v-if | state.currentPage === 'manage' \|\| state.currentPage === 'settings' |
| 29 | ScriptWorkspace v-else-if | state.currentPage === 'script' |
| 30 | PresentationPanel v-else-if | state.activeWorkspace === 'ui' |
| 33 | EditorBottomPanel v-if | state.currentPage !== 'settings' && state.currentPage !== 'manage' && state.currentPage !== 'script' && state.bottomPanelVisible && !state.distractionFree |
| 35 | div v-if | !state.distractionFree |
| 36 | template v-for | panel in workspaceState.panelOrder |
| 37 | SceneSideBar v-if | panel === 'hierarchy' && showHierarchy && state.hierarchyDock === 'right' && !isFloating('hierarchy') |
| 38 | ConfigPanel v-else-if | panel === 'inspector' && inspectorLoaded && state.inspectorDock === 'right' && !isFloating('inspector') |
| 38 | ConfigPanel v-show | showInspector |
| 41 | section v-if | isFloating('hierarchy') && showHierarchy && !state.distractionFree |
| 42 | section v-if | isFloating('inspector') && inspectorLoaded && !state.distractionFree |
| 42 | section v-show | showInspector |
| 44 | PhysicsRuntimePanel v-if | state.physicsMonitorOpen && state.activeWorkspace === 'debug' && physicsState.playMode !== 'editing' && !state.distractionFree |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .editor-root (base) | max-width:none; min-width:0; min-height:0; overflow:hidden |
| .read-only-banner (base) | min-height:28px |
| .workspace-control-row (base) | min-width:0; overflow:visible |
| .workspace-control-row :deep(.workspace-bar) (base) | min-width:0 |
| .editor-main (base) | max-width:100%; min-width:0; min-height:0; overflow:hidden |
| .dock-group (base) | min-width:0 |
| .dock-group.split (base) | overflow:hidden |
| .dock-group.split>:deep(*) (base) | min-height:0; max-height:none |
| .editor-workspace (base) | min-width:0 |
| .editor-content (base) | min-height:0; overflow:hidden |
| .floating-dock (base) | max-height:calc(100% - 60px); overflow:hidden |
| .floating-dock>header (base) | min-height:32px |
| .floating-dock>:deep(.sidebar-container),.floating-dock>:deep(.config-wrapper) (base) | max-width:none; min-height:0 |

- 已分类 P26-04（本组件负责）：div:3。该项已按 P26-04 分类为容器鼠标行为或原生子按钮的冗余鼠标入口；不是额外未修复操作。

## src/layout/SideBar.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=2；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 1。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 6 | button v-for | item in actions |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .sidebar>header (base) | min-height:46px |
| nav (base) | min-height:0; overflow-y:auto |
| button (base) | min-width:0; min-height:56px; overflow:hidden |
| button strong (base) | max-width:100%; overflow:visible; text-overflow:ellipsis; white-space:normal |
| .sidebar>header small,button strong (@media (max-width:720px)) | overflow:hidden |
| button (@media (max-width:720px)) | min-height:44px |

## src/layout/StatusBar.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 1；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 2 | b v-if | failedTasks |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .status (base) | min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .task-status (base) | min-height:24px |
| .task-status b (base) | min-width:17px |

## src/layout/TopBar.vue

- 责任/宿主：src/layout/EditorLayout.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=45, input=1, a=1；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 34 | div v-if | activeMenu === 'file' |
| 41 | div v-else-if | activeMenu === 'edit' |
| 53 | div v-else-if | activeMenu === 'project' |
| 57 | div v-else-if | activeMenu === 'debug' |
| 62 | div v-else-if | activeMenu === 'view' |
| 81 | div v-else-if | activeMenu === 'help' |
| 93 | span v-if | recoveryState.safeMode |
| 94 | span v-if | historyState.dirty |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .dropdown (base) | min-width:250px |
| .dropdown button (base) | min-height:36px |
| .release-pill (base) | white-space:nowrap |
| .dirty-pill (base) | white-space:nowrap |
| .brand>span:last-child (@media (max-width:720px)) | overflow:hidden |
| .menu-container (@media (max-width:720px)) | min-width:0; overflow-x:auto |
| .menu-container (base) | min-width:0; overflow-x:auto; overflow-y:hidden |
| .menu-item > button (base) | white-space:nowrap |
| .dropdown, .dropdown-right (base) | min-width:min(250px, calc(100vw - 16px)); max-width:calc(100vw - 16px); max-height:calc(100vh - 74px); overflow:auto |
| .dropdown > button (base) | white-space:normal |

## src/panels/RendererPanel.vue

- 责任/宿主：application entry / runtime mounting; src/panels/RendererPanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 无；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| — | 静态模板 | 无条件分支；检查宿主挂载条件 |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .viewport-wrapper (base) | overflow:hidden |

## src/panels/ScenePanel.vue

- 责任/宿主：application entry / runtime mounting; src/panels/ScenePanel.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 无；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 0；加载/等待 0；错误/诊断 0；有数据循环 0。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| — | 静态模板 | 无条件分支；检查宿主挂载条件 |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| 宿主共享样式 | 无本地相关声明 |

## src/panels/SettingsPanel.vue

- 责任/宿主：src/components/ManageWorkspace.vue
- 扩展：Host workspace/modal supplies available area; no separate local maximize control.
- 最小宽度/滚动/裁切：下面列出文件全部相关声明；无本地声明时由宿主及 main.css/editorReadability.css 决定，不能据此推断像素值。
- 键盘：原生控件 button=17, input=28, select=16, summary=2；直接键盘绑定 0；非原生点击候选 0。
- 状态索引：空/选择条件 3；加载/等待 0；错误/诊断 3；有数据循环 8。未命中标签不等于不存在状态，请以完整分支表为准。

| 行 | 元素/分支 | 原始条件或集合 |
|---|---|---|
| 17 | button v-for | scope in settingScopes |
| 21 | section v-show | showCard('appearanceSettings formLabelLayout theme color palette language interfaceScale compactMode reduceMotion highContrast launchMaximized workspaceLayoutScope shortcutEditor', 'editor') |
| 32 | option v-for | (palette, index) in COLOR_PALETTES |
| 55 | PhysicsSettingsPanel v-show | showCard('physicsSettings globalGravity collisionLayers physicsMaterials conformance', 'project') |
| 57 | section v-show | showCard('scriptingSettings scriptApiVersion debugger hotReload formatting lint indexing testing remoteDebugging', 'project') |
| 77 | section v-show | showCard('audioSettings masterVolume musicVolume sfxVolume uiVolume sampleRate', 'project') |
| 86 | DeviceInputPanel v-show | showCard('deviceInput virtualControls touch gesture gamepad calibration safeArea orientation sensors haptics mobile', 'project') |
| 87 | section v-show | showCard('inputMap inputDevice bindingCode gamepad keyboard', 'project') |
| 90 | option v-for | device in inputDevices |
| 91 | span v-for | device in connectedInputDevices |
| 92 | div v-if | inputConflicts.length |
| 92 | span v-for | conflict in inputConflicts |
| 94 | article v-for | ({ action, actionIndex }) in visibleInputActions |
| 105 | details v-if | !compactInputMap |
| 113 | label v-if | action.interaction === 'hold' |
| 114 | label v-if | action.interaction === 'tap' \|\| action.interaction === 'multiTap' |
| 115 | label v-if | action.interaction === 'multiTap' |
| 121 | div v-for | (binding, bindingIndex) in action.bindings |
| 123 | option v-for | device in inputDevices |
| 126 | template v-if | action.kind === 'vector2' |
| 130 | label v-else | (fallback) |
| 131 | label v-if | binding.device.startsWith('gamepad') |
| 132 | label v-if | binding.device === 'gamepad-axis' |
| 134 | details v-if | !compactInputMap |
| 142 | section v-show | showCard('canvasSettings gridSize snapToGrid zoomSensitivity showConnections renderQuality', 'editor') |
| 159 | section v-show | showCard('packages plugins saveData engineDiagnostics projectHealth', 'all') |
| 167 | section v-show | showCard('projectSettings autosave autosaveInterval confirmDestructive restoreAutosave', 'project') |
| 175 | section v-show | showCard('defaultsSettings defaultDensity defaultRestitution defaultFriction', 'editor') |

| 选择器及条件 | 尺寸、滚动、裁切声明 |
|---|---|
| .settings-page (base) | overflow:auto |
| .settings-search>label (base) | min-width:220px |
| .settings-search input (base) | min-width:0 |
| .settings-search button (base) | min-height:34px |
| .settings-grid (base) | grid-template-columns:repeat(2, minmax(0, 1fr)) |
| .input-action-heading, .input-binding (base) | grid-template-columns:minmax(120px, 1.3fr) minmax(110px, 1fr) repeat(4, minmax(64px, .6fr)) 28px |
| .input-binding input, .input-binding select, .input-action-heading input, .input-action-heading select (base) | min-width:0 |
| .compact-action (base) | min-height:29px |
| .matrix-scroll (base) | max-width:100%; overflow:auto |
| .matrix-header, .matrix-row (base) | grid-template-columns:28px repeat(32, 18px) |
| :deep(.setting-row) (base) | min-height:47px |
| :deep(.setting-row > span:first-child) (base) | min-width:0 |
| :deep(.setting-control) (base) | max-width:55%; min-width:0 |
| :deep(.setting-control > input[type='number']) (base) | max-width:100% |
| .value-control (base) | min-width:0 |
| .value-control input (base) | min-width:0 |
| .value-control output (base) | min-width:46px |
| .metric-grid (base) | grid-template-columns:repeat(2, minmax(0, 1fr)) |
| .metric-grid > div (base) | min-width:0 |
| .metric-grid span (base) | overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| .secondary-action, .danger-action (base) | min-height:34px |
| .input-map-toolbar>input (base) | min-width:160px |
| .input-action-heading (base) | grid-template-columns:minmax(120px,3fr) minmax(100px,2fr) 28px 28px |
| .input-binding (base) | grid-template-columns:minmax(150px,1.25fr) minmax(100px,1fr) repeat(4,minmax(64px,.6fr)) 28px |
| .binding-advanced>label (base) | grid-template-columns:100px minmax(100px,1fr) |
| .binding-advanced summary (base) | min-height:20px |
| .action-advanced>summary (base) | min-height:24px |
| .action-advanced-grid (base) | grid-template-columns:repeat(3,minmax(150px,1fr)) |
| .action-advanced-grid label (base) | min-width:0; grid-template-columns:minmax(88px,.8fr) minmax(0,1fr) |
| .action-advanced-grid input:not([type='checkbox']),.action-advanced-grid select (base) | min-width:0 |
| .settings-grid (@media (max-width: 1400px)) | grid-template-columns:1fr |
| .input-action-heading, .input-binding (@media (max-width: 800px)) | grid-template-columns:repeat(2, minmax(0, 1fr)) 28px |
| .action-advanced-grid (@media (max-width: 800px)) | grid-template-columns:1fr |
| .input-binding (base) | grid-template-columns:repeat(auto-fit,minmax(min(160px,100%),1fr)) |
| .input-binding>.binding-field (base) | grid-template-columns:minmax(0,1fr); min-width:0 |
| .binding-field>input,.binding-field>select (base) | max-width:100% |
| .input-action-heading (@container nova-form (max-width:600px)) | grid-template-columns:minmax(0,1fr) 30px 30px |
| .action-advanced-grid (@container nova-form (max-width:600px)) | grid-template-columns:minmax(0,1fr) |
| .binding-advanced>label (@container nova-form (max-width:600px)) | grid-template-columns:minmax(0,1fr) |
| .input-binding,.action-advanced-grid (base) | grid-template-columns:repeat(auto-fit,minmax(min(100%,calc(14em + 64px)),1fr)) |
