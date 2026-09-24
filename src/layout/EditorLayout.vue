<!-- 编辑器主布局：按需加载工作区，保留画布与检查器，并管理面板停靠和空闲预热。 -->
<template>
  <div class="editor-root" data-control-scope="editor-shell" :class="{ 'read-only': recoveryState.readOnly }" @contextmenu.prevent @click="closeContextMenu">
    <div v-if="recoveryState.readOnly" class="read-only-banner" role="status">{{ t('readOnlyRecoveryBanner') }}</div>
    <TopBar />
    <div class="workspace-control-row">
      <WorkspaceBar />
      <ActionBar />
    </div>
    <ToolBar v-if="state.currentPage === 'scene' && state.activeWorkspace !== 'ui'" class="scene-toolbar-row" />

    <div class="editor-main" :data-maximized-panel="workspaceState.maximizedPanel">
      <SideBar v-if="!state.distractionFree" :inert="Boolean(workspaceState.maximizedPanel)" />
      <div v-if="!state.distractionFree" class="dock-group left-dock" :class="{ split: workspaceState.splitDocking }" :data-drop-target="dragTarget === 'left'" @dragover.prevent="dragTarget = 'left'" @dragleave="dragTarget = ''" @drop="dropPanel('left')">
        <template v-for="panel in workspaceState.panelOrder" :key="panel">
          <SceneSideBar :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'hierarchy')" v-if="panel === 'hierarchy' && showHierarchy && state.hierarchyDock === 'left' && !isFloating('hierarchy')" dock="left" draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'hierarchy')" @dragend="endPanelDrag" />
          <ConfigPanel :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'inspector')" v-else-if="panel === 'inspector' && inspectorLoaded && state.inspectorDock === 'left' && !isFloating('inspector')" v-show="showInspector" dock="left" draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'inspector')" @dragend="endPanelDrag" />
        </template>
      </div>
      <div class="editor-workspace" :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'bottom')" :data-drop-target="dragTarget === 'floating'" @dragover.prevent="dragTarget = 'floating'" @dragleave="dragTarget = ''" @drop="dropPanel('floating')">
        <SceneTabs :inert="workspaceState.maximizedPanel === 'bottom'" v-if="state.currentPage === 'scene' && state.activeWorkspace === 'design' && !state.distractionFree" />
        <div class="editor-content" :inert="workspaceState.maximizedPanel === 'bottom'">
          <div :class="['persistent-viewport', `${state.currentPage}-view`, { inactive: state.currentPage === 'settings' || state.currentPage === 'manage' || state.currentPage === 'script' || state.activeWorkspace === 'ui' }]">
            <LayerBar v-if="state.currentPage === 'scene'" />
            <WorldCanvas />
          </div>
          <Transition name="page" mode="out-in">
            <ManageWorkspace v-if="state.currentPage === 'manage' || state.currentPage === 'settings'" key="manage" />
            <ScriptWorkspace v-else-if="state.currentPage === 'script'" key="script" />
            <PresentationPanel v-else-if="state.activeWorkspace === 'ui'" key="ui" class="ui-workspace" />
          </Transition>
        </div>
        <EditorBottomPanel v-if="state.currentPage !== 'settings' && state.currentPage !== 'manage' && state.currentPage !== 'script' && state.bottomPanelVisible && !state.distractionFree" />
      </div>
      <div v-if="!state.distractionFree" class="dock-group right-dock" :class="{ split: workspaceState.splitDocking }" :data-drop-target="dragTarget === 'right'" @dragover.prevent="dragTarget = 'right'" @dragleave="dragTarget = ''" @drop="dropPanel('right')">
        <template v-for="panel in workspaceState.panelOrder" :key="panel">
          <SceneSideBar :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'hierarchy')" v-if="panel === 'hierarchy' && showHierarchy && state.hierarchyDock === 'right' && !isFloating('hierarchy')" dock="right" draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'hierarchy')" @dragend="endPanelDrag" />
          <ConfigPanel :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'inspector')" v-else-if="panel === 'inspector' && inspectorLoaded && state.inspectorDock === 'right' && !isFloating('inspector')" v-show="showInspector" dock="right" draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'inspector')" @dragend="endPanelDrag" />
        </template>
      </div>
      <section v-if="isFloating('hierarchy') && showHierarchy && !state.distractionFree" class="floating-dock hierarchy-float" :class="{ 'floating-maximized': workspaceState.maximizedPanel === 'hierarchy' }" :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'hierarchy')"><header draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'hierarchy')" @dragend="endPanelDrag"><strong>{{ t('hierarchy') }}</strong><button :title="t('dockPanel')" @click="dockEditorPanel('hierarchy','left')">↙</button></header><SceneSideBar dock="left" /></section>
      <section v-if="isFloating('inspector') && inspectorLoaded && !state.distractionFree" v-show="showInspector" class="floating-dock inspector-float" :class="{ 'floating-maximized': workspaceState.maximizedPanel === 'inspector' }" :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'inspector')"><header draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'inspector')" @dragend="endPanelDrag"><strong>{{ t('inspector') }}</strong><button :title="t('dockPanel')" @click="dockEditorPanel('inspector','right')">↘</button></header><ConfigPanel dock="right" /></section>
      <Transition name="physics-panel">
        <PhysicsRuntimePanel :inert="Boolean(workspaceState.maximizedPanel)" v-if="state.physicsMonitorOpen && state.activeWorkspace === 'debug' && physicsState.playMode !== 'editing' && !state.distractionFree" />
      </Transition>
    </div>
    
    <ContextMenu />
    <CommandPalette />
    <CreateObjectPalette />
    <CreatorOnboarding />

    <StatusBar />
  </div>
</template>

<script setup lang="ts">
import TopBar from "./TopBar.vue"
import WorkspaceBar from "../components/WorkspaceBar.vue"
import SideBar from "./SideBar.vue"
import StatusBar from "./StatusBar.vue"
import ToolBar from "../components/ToolBar.vue" 
import SceneSideBar from "../components/SceneSideBar.vue"
import SceneTabs from "../components/SceneTabs.vue"
import ActionBar from "../components/ActionBar.vue"
import ContextMenu from "../components/ContextMenu.vue" // NEW
import CommandPalette from "../components/CommandPalette.vue"
import CreateObjectPalette from "../components/CreateObjectPalette.vue"
import CreatorOnboarding from "../components/CreatorOnboarding.vue"
import WorldCanvas from "../components/WorldCanvas.vue"
import LayerBar from "../components/LayerBar.vue"
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { editorState as state, closeContextMenu } from "../store/editor"
import { physicsState } from '../store/physics'
import { dockEditorPanel, initializeEditorWorkspaces, restorePanelLayout, workspaceState } from '../editor/workspaces'
import { recoveryState } from '../runtime/recovery'
import { recordWarmStartup } from '../runtime/largeWorldPerformance'
import { t } from '../i18n'

const loadConfigPanel = /** 按需加载对象检查器。 */ () => import('../components/ConfigPanel.vue')
const loadEditorBottomPanel = /** 按需加载底部工作面板。 */ () => import('../components/EditorBottomPanel.vue')
const loadScriptWorkspace = /** 按需加载脚本工作区。 */ () => import('../components/ScriptWorkspace.vue')
const loadPresentationPanel = /** 按需加载界面呈现工作室。 */ () => import('../components/PresentationPanel.vue')
const loadManageWorkspace = /** 按需加载管理工作区。 */ () => import('../components/ManageWorkspace.vue')
const loadPhysicsRuntimePanel = /** 按需加载物理监视器。 */ () => import('../components/PhysicsRuntimePanel.vue')
const ConfigPanel = defineAsyncComponent(loadConfigPanel)
const EditorBottomPanel = defineAsyncComponent(loadEditorBottomPanel)
const ScriptWorkspace = defineAsyncComponent(loadScriptWorkspace)
const PresentationPanel = defineAsyncComponent(loadPresentationPanel)
const ManageWorkspace = defineAsyncComponent(loadManageWorkspace)
const PhysicsRuntimePanel = defineAsyncComponent(loadPhysicsRuntimePanel)

initializeEditorWorkspaces()
const showHierarchy = computed(/** 仅在场景或游戏视图且开关启用时显示层级。 */ () => (state.currentPage === 'scene' || state.currentPage === 'game') && state.hierarchyVisible)
const showInspector = computed(/** 场景视图非界面工作区且有选择或组件选择器时显示启用的检查器。 */ () => state.currentPage === 'scene' && state.inspectorVisible && state.activeWorkspace !== 'ui' && (physicsState.selectedEntityIds.length > 0 || state.componentPickerOpen))
watch(/** 收集面板可见性及页面作为最大化恢复依赖。 */ () => [showHierarchy.value,showInspector.value,state.bottomPanelVisible,state.bottomPanelOpen,state.currentPage], /** 当前最大化面板已不可用时恢复普通布局。 */ () => {
  const panel=workspaceState.maximizedPanel
  if(panel==='hierarchy'&&!showHierarchy.value || panel==='inspector'&&!showInspector.value || panel==='bottom'&&(!state.bottomPanelVisible||!state.bottomPanelOpen||['settings','manage','script'].includes(state.currentPage)))restorePanelLayout()
})
const inspectorLoaded = ref(showInspector.value)
watch(showInspector, /** 检查器首次可见后保留其已加载状态。 */ visible => { if (visible) inspectorLoaded.value = true })
let idleWarmup = 0
let warmupCancelled = false
const cancelWarmupForInput = /** 取消空闲预热并取消已排队空闲回调。 */ () => {
  warmupCancelled = true
  if (idleWarmup) window.cancelIdleCallback(idleWarmup)
}
onMounted(/** 仅在较高内存和核心数设备逐个空闲预载模块，真实指针或键盘输入会取消预热。 */ () => {
  const memory = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8)
  const cores = navigator.hardwareConcurrency || 8
  // Low-end devices load only the requested workspace. Faster devices warm one
  // chunk per idle period, immediately yielding to real pointer/keyboard work.
  if (memory <= 4 || cores <= 4) return
  const queue = [loadConfigPanel, loadScriptWorkspace, loadPresentationPanel, loadManageWorkspace, loadPhysicsRuntimePanel]
  const started = performance.now()
  const warmNext = /** 检查取消和队列状态；空闲预算不足则重排，否则加载一个模块后安排后续。 */ (deadline: IdleDeadline) => {
    if (warmupCancelled || !queue.length) { if (!queue.length) recordWarmStartup(started); return }
    if (!deadline.didTimeout && deadline.timeRemaining() < 6) { idleWarmup = window.requestIdleCallback(warmNext, { timeout: 3_000 }); return }
    const load = queue.shift()!
    void load().finally(/** 模块加载结束且未取消时安排下一次空闲预热。 */ () => { if (!warmupCancelled) idleWarmup = window.requestIdleCallback(warmNext, { timeout: 3_000 }) })
  }
  window.addEventListener('pointerdown', cancelWarmupForInput, { once: true, passive: true })
  window.addEventListener('keydown', cancelWarmupForInput, { once: true })
  idleWarmup = window.requestIdleCallback(warmNext, { timeout: 3_000 })
})
onBeforeUnmount(/** 卸载时取消预热并移除一次性输入监听。 */ () => {
  cancelWarmupForInput()
  window.removeEventListener('pointerdown', cancelWarmupForInput)
  window.removeEventListener('keydown', cancelWarmupForInput)
})
const draggedPanel = ref<'hierarchy' | 'inspector' | ''>(''), dragTarget = ref('')
/** 检查指定面板是否为浮动面板。 */ function isFloating(panel: 'hierarchy' | 'inspector'): boolean { return workspaceState.floatingPanels.includes(panel) }
let panelDragFromControl = false
/** 记录拖拽起点是否为交互控件，避免控件操作误触面板拖动。 */ function preparePanelDrag(event: PointerEvent): void {
  panelDragFromControl = event.target instanceof Element && Boolean(event.target.closest('input,textarea,select,button,a,[role="slider"],[contenteditable="true"]'))
}
/** 只允许面板本体且非交互控件开始拖动，并设置面板拖拽数据。 */ function startPanelDrag(event: DragEvent, panel: 'hierarchy' | 'inspector'): void { if (panelDragFromControl) { event.preventDefault(); return } if (event.target !== event.currentTarget) return; draggedPanel.value = panel; event.dataTransfer?.setData('application/x-nova-panel', panel) }
/** 清除面板拖动及目标状态。 */ function endPanelDrag(): void { draggedPanel.value = ''; dragTarget.value = '' }
/** 有拖动面板时停靠到目标区域，然后清除拖动状态。 */ function dropPanel(destination: 'left' | 'right' | 'floating'): void { if (draggedPanel.value) dockEditorPanel(draggedPanel.value, destination); draggedPanel.value = ''; dragTarget.value = '' }
</script>

<style scoped>
.editor-root { position: fixed; inset: 0; width: auto; max-width: none; display: flex; flex-direction: column; height: auto; min-width: 0; min-height: 0; overflow: hidden; background: var(--bg-base); color: var(--text-primary); }
.read-only-banner{min-height:28px;flex:0 0 28px;display:grid;place-items:center;color:var(--warning);background:color-mix(in srgb,var(--warning) 12%,var(--surface-1));border-bottom:1px solid var(--warning);font-size:12px}.read-only :deep(.config-wrapper),.read-only .persistent-viewport{pointer-events:none;filter:saturate(.72)}
.workspace-control-row { position:relative; z-index:600; min-width: 0; flex: 0 0 48px; display: flex; align-items: stretch; overflow:visible; border-bottom: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface-1) 94%, var(--bg-base)); isolation: isolate; }
.workspace-control-row :deep(.workspace-bar) { min-width: 0; flex: 1; border-bottom: 0; }
.workspace-control-row :deep(.actionbar) { flex: 0 0 auto; }
.editor-main { position: relative; width: 100%; max-width: 100%; flex: 1; display: flex; min-width: 0; min-height: 0; overflow: hidden; }
.dock-group { min-width: 0; display: flex; flex: 0 0 auto; }
.dock-group[data-drop-target='true'], .editor-workspace[data-drop-target='true'] { outline: 2px solid var(--drag-target); outline-offset: -3px; background: color-mix(in srgb, var(--drag-target) 7%, transparent); }
.dock-group.split{flex-direction:column;overflow:hidden}.dock-group.split>:deep(*){min-height:0;max-height:none;height:auto;flex:1 1 0}
.scene-toolbar-row { flex: 0 0 auto; }
.editor-workspace { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.editor-content { min-height: 0; flex: 1; position: relative; overflow: hidden; background: var(--bg-canvas); }
.persistent-viewport { position: absolute; inset: 0; contain: layout paint; isolation: isolate; }
.persistent-viewport.scene-view { animation: viewport-scene-reveal 170ms cubic-bezier(.2,.8,.2,1); }
.persistent-viewport.game-view { animation: viewport-game-reveal 170ms cubic-bezier(.2,.8,.2,1); }
.persistent-viewport.inactive { visibility: hidden; pointer-events: none; }
.settings-host { position: absolute; inset: 0; z-index: 2; }
.ui-workspace { position: absolute; inset: 0; z-index: 2; background: var(--surface-1); }
.floating-dock{position:absolute;z-index:520;width:min(360px,35vw);height:min(620px,72vh);max-height:calc(100% - 60px);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border-strong);border-radius:var(--radius-dialog);background:var(--surface-1);box-shadow:var(--shadow-lg)}.floating-dock>header{min-height:32px;padding:0 6px 0 10px;display:flex;align-items:center;justify-content:space-between;cursor:grab;border-bottom:1px solid var(--border-subtle)}.floating-dock>header button{width:26px;height:26px;border:0;border-radius:var(--radius-control-small);background:var(--surface-3)}.floating-dock>:deep(.sidebar-container),.floating-dock>:deep(.config-wrapper){width:100%!important;max-width:none;height:auto;min-height:0;flex:1}.hierarchy-float{left:var(--context-rail-width,82px);top:48px}.inspector-float{right:12px;top:48px}
@keyframes viewport-scene-reveal { from { opacity: .88; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
@keyframes viewport-game-reveal { from { opacity: .88; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
.page-enter-active, .page-leave-active { transition: opacity 150ms ease, transform 180ms cubic-bezier(.2,.8,.2,1); }
.page-enter-from { opacity: 0; transform: translateY(5px); }
.page-leave-to { opacity: 0; transform: translateY(-3px); }
.physics-panel-enter-active, .physics-panel-leave-active { transition: opacity 150ms ease, transform 190ms cubic-bezier(.2,.8,.2,1); }
.physics-panel-enter-from, .physics-panel-leave-to { opacity: 0; transform: translateX(24px); }
@media (max-width: 720px) { .workspace-control-row :deep(.mode-label) { display: none; } }
</style>
