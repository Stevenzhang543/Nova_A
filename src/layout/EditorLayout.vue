<!-- 编辑器主布局：按需加载工作区，保留画布与检查器，并管理面板停靠和空闲预热。 -->
<template>
  <div class="editor-root" data-control-scope="editor-shell" :class="{ 'read-only': recoveryState.readOnly }" @contextmenu.prevent @click="closeContextMenu">
    <div v-if="recoveryState.readOnly" class="read-only-banner" role="status">{{ t('readOnlyRecoveryBanner') }}</div>
    <TopBar />
    <div class="workspace-control-row">
      <WorkspaceBar />
      <ActionBar />
    </div>
    <ToolBar v-show="state.currentPage === 'scene' && state.activeWorkspace !== 'ui'" class="scene-toolbar-row" />

    <div class="editor-main" :data-maximized-panel="workspaceState.maximizedPanel">
      <SideBar v-show="!state.distractionFree" :inert="Boolean(workspaceState.maximizedPanel)" />
      <div v-show="!state.distractionFree" class="dock-group left-dock" :class="{ split: workspaceState.splitDocking }" :data-drop-target="dragTarget === 'left'" @dragover="previewPanelDrop($event, 'left')" @dragleave="leavePanelDrop" @drop="dropPanel($event, 'left')">
        <template v-for="panel in workspaceState.panelOrder" :key="panel">
          <SceneSideBar :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'hierarchy')" v-if="panel === 'hierarchy' && state.hierarchyDock === 'left' && !isFloating('hierarchy')" v-show="showHierarchy" dock="left" draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'hierarchy')" @dragend="endPanelDrag" />
          <ConfigPanel :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'inspector')" v-else-if="panel === 'inspector' && inspectorLoaded && state.inspectorDock === 'left' && !isFloating('inspector')" v-show="showInspector" dock="left" draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'inspector')" @dragend="endPanelDrag" />
        </template>
      </div>
      <div class="editor-workspace" :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'bottom')" :data-drop-target="dragTarget === 'floating'" @dragover="previewPanelDrop($event, 'floating')" @dragleave="leavePanelDrop" @drop="dropPanel($event, 'floating')">
        <SceneTabs :inert="workspaceState.maximizedPanel === 'bottom'" v-show="state.currentPage === 'scene' && state.activeWorkspace === 'design' && !state.distractionFree" />
        <div class="editor-content" :inert="workspaceState.maximizedPanel === 'bottom'">
          <div :class="['persistent-viewport', `${state.currentPage}-view`, { inactive: displayedWorkspace !== 'canvas' }]">
            <LayerBar v-if="state.currentPage === 'scene'" />
            <WorldCanvas />
          </div>
          <UiAsyncWorkspace :view="requestedWorkspace" :loaders="workspaceLoaders" @display="displayedWorkspace = $event" />
        </div>
        <KeepAlive><EditorBottomPanel v-if="state.currentPage !== 'settings' && state.currentPage !== 'manage' && state.currentPage !== 'script' && state.bottomPanelVisible && !state.distractionFree" /></KeepAlive>
      </div>
      <div v-show="!state.distractionFree" class="dock-group right-dock" :class="{ split: workspaceState.splitDocking }" :data-drop-target="dragTarget === 'right'" @dragover="previewPanelDrop($event, 'right')" @dragleave="leavePanelDrop" @drop="dropPanel($event, 'right')">
        <template v-for="panel in workspaceState.panelOrder" :key="panel">
          <SceneSideBar :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'hierarchy')" v-if="panel === 'hierarchy' && state.hierarchyDock === 'right' && !isFloating('hierarchy')" v-show="showHierarchy" dock="right" draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'hierarchy')" @dragend="endPanelDrag" />
          <ConfigPanel :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'inspector')" v-else-if="panel === 'inspector' && inspectorLoaded && state.inspectorDock === 'right' && !isFloating('inspector')" v-show="showInspector" dock="right" draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'inspector')" @dragend="endPanelDrag" />
        </template>
      </div>
      <section v-if="isFloating('hierarchy') && showHierarchy && !state.distractionFree" class="floating-dock hierarchy-float" :class="{ 'floating-maximized': workspaceState.maximizedPanel === 'hierarchy' }" :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'hierarchy')"><header draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'hierarchy')" @dragend="endPanelDrag"><strong>{{ t('hierarchy') }}</strong><UiButton icon="back" :label="t('dockPanel')" @click="dockEditorPanel('hierarchy','left')" /></header><SceneSideBar dock="left" /></section>
      <section v-if="isFloating('inspector') && inspectorLoaded && !state.distractionFree" v-show="showInspector" class="floating-dock inspector-float" :class="{ 'floating-maximized': workspaceState.maximizedPanel === 'inspector' }" :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'inspector')"><header draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'inspector')" @dragend="endPanelDrag"><strong>{{ t('inspector') }}</strong><UiButton icon="forward" :label="t('dockPanel')" @click="dockEditorPanel('inspector','right')" /></header><ConfigPanel dock="right" /></section>
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
import UiAsyncWorkspace from '../ui/components/UiAsyncWorkspace.vue'
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { animatePresence, beginNativeDrag, cancelMotion, endNativeDrag } from '../ui/motion'
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
const PhysicsRuntimePanel = defineAsyncComponent(loadPhysicsRuntimePanel)
const workspaceLoaders = { manage: loadManageWorkspace, script: loadScriptWorkspace, ui: loadPresentationPanel }
const requestedWorkspace = computed(() => state.currentPage === 'manage' || state.currentPage === 'settings' ? 'manage' : state.currentPage === 'script' ? 'script' : state.activeWorkspace === 'ui' ? 'ui' : 'canvas')
const displayedWorkspace = ref('canvas')

initializeEditorWorkspaces()
const showHierarchy = computed(/** 仅在场景或游戏视图且开关启用时显示层级。 */ () => (state.currentPage === 'scene' || state.currentPage === 'game') && state.hierarchyVisible)
const showInspector = computed(/** The inspector's empty state reserves its dock; selection must not resize the viewport. */ () => state.currentPage === 'scene' && state.inspectorVisible && state.activeWorkspace !== 'ui')
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
  endPanelDrag()
  for (const element of document.querySelectorAll<HTMLElement>('.floating-dock')) cancelMotion(element)
})
const draggedPanel = ref<'hierarchy' | 'inspector' | ''>(''), dragTarget = ref('')
/** 检查指定面板是否为浮动面板。 */ function isFloating(panel: 'hierarchy' | 'inspector'): boolean { return workspaceState.floatingPanels.includes(panel) }
let panelDragFromControl = false
/** 记录拖拽起点是否为交互控件，避免控件操作误触面板拖动。 */ function preparePanelDrag(event: PointerEvent): void {
  panelDragFromControl = event.target instanceof Element && Boolean(event.target.closest('input,textarea,select,button,a,[role="slider"],[contenteditable="true"]'))
}
/** Only a panel's own drag may be blocked by its control guard; nested hierarchy drags keep their payload. */ function startPanelDrag(event: DragEvent, panel: 'hierarchy' | 'inspector'): void { if (event.target !== event.currentTarget) return; if (panelDragFromControl) { event.preventDefault(); return } draggedPanel.value = panel; event.dataTransfer?.setData('application/x-nova-panel', panel); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'; beginNativeDrag(event, t(panel)) }
/** Other payloads keep their own resource/hierarchy targets, without false docking previews. */
function previewPanelDrop(event: DragEvent, destination: 'left' | 'right' | 'floating') { if (!draggedPanel.value || !event.dataTransfer?.types.includes('application/x-nova-panel')) return; event.preventDefault(); dragTarget.value = destination; event.dataTransfer.dropEffect = 'move' }
function leavePanelDrop(event: DragEvent) { if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) dragTarget.value = '' }
/** 清除面板拖动及目标状态。 */ function endPanelDrag(): void { draggedPanel.value = ''; dragTarget.value = ''; endNativeDrag() }
/** Commit docking first, then settle only a newly floating surface. */ function dropPanel(event: DragEvent, destination: 'left' | 'right' | 'floating'): void { if (!draggedPanel.value || !event.dataTransfer?.types.includes('application/x-nova-panel')) return; event.preventDefault(); const panel = draggedPanel.value; dockEditorPanel(panel, destination); endPanelDrag(); if (destination === 'floating') void nextTick(() => { const element = document.querySelector<HTMLElement>(panel === 'hierarchy' ? '.hierarchy-float' : '.inspector-float'); if (element) animatePresence(element, 'enter', undefined, { preset: 'elastic', duration: 'standard', distance: 4, scale: 1 }) }) }
</script>

<style scoped>
.editor-root { position: fixed; inset: 0; width: auto; max-width: none; display: flex; flex-direction: column; height: auto; min-width: 0; min-height: 0; overflow: hidden; background: var(--bg-base); color: var(--text-primary); }
.read-only-banner{min-height:var(--ui-control-height);flex:0 0 var(--ui-control-height);display:grid;place-items:center;color:var(--warning);background:color-mix(in srgb,var(--warning) 12%,var(--surface-1));border-bottom:1px solid var(--warning);font-size:var(--type-dense)}.read-only :deep(.config-wrapper),.read-only .persistent-viewport{pointer-events:none;filter:saturate(.72)}
.workspace-control-row { position:relative; z-index:600; min-width: 0; flex: 0 0 auto; min-height: var(--ui-toolbar-height); display: flex; align-items: stretch; overflow:visible; border-bottom: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface-1) 94%, var(--bg-base)); isolation: isolate; }
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
.persistent-viewport.inactive { visibility: hidden; pointer-events: none; }
.floating-dock{position:absolute;z-index:520;width:min(360px,35vw);height:min(620px,72vh);max-height:calc(100% - 60px);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border-strong);border-radius:var(--radius-dialog);background:var(--surface-1);box-shadow:var(--shadow-lg)}.floating-dock>header{min-height:var(--ui-toolbar-height);padding:0 var(--space-2);display:flex;align-items:center;justify-content:space-between;cursor:grab;border-bottom:1px solid var(--border-subtle)}.floating-dock>:deep(.sidebar-container),.floating-dock>:deep(.config-wrapper){width:100%!important;max-width:none;height:auto;min-height:0;flex:1}.hierarchy-float{left:var(--ui-rail-width);top:var(--space-3)}.inspector-float{right:var(--space-3);top:var(--space-3)}
@media (max-width: 720px) { .workspace-control-row :deep(.mode-label) { display: none; } }
</style>
