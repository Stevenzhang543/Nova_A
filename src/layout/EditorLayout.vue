<!-- 编辑器主布局：按需加载工作区，保留画布与检查器，并管理面板停靠和空闲预热。 -->
<template>
  <div class="editor-root" data-control-scope="editor-shell" :data-play-mode="physicsState.playMode" :data-chrome-idle="chromeIdle || undefined" :data-layout="layoutMode" :data-compact-docks="compactDocks || undefined" :class="{ 'read-only': recoveryState.readOnly }" @contextmenu.prevent @click="closeContextMenu">
    <div v-if="recoveryState.readOnly" class="read-only-banner" role="status">{{ t('readOnlyRecoveryBanner') }}</div>
    <TopBar />

    <div ref="editorMain" class="editor-main" :data-maximized-panel="workspaceState.maximizedPanel">
      <SideBar v-if="!contextInHierarchy" v-show="!state.distractionFree" :inert="Boolean(workspaceState.maximizedPanel)" />
      <div v-show="!state.distractionFree" class="dock-group left-dock" :class="{ split: workspaceState.splitDocking }" :data-drop-target="dragTarget === 'left'" @dragover="previewPanelDrop($event, 'left')" @dragleave="leavePanelDrop" @drop="dropPanel($event, 'left')">
        <template v-for="panel in workspaceState.panelOrder" :key="panel">
<UiMotionTransition>
          <SceneSideBar :context-tools="contextInHierarchy" :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'hierarchy')" v-if="panel === 'hierarchy' && state.hierarchyDock === 'left' && !isFloating('hierarchy')" v-show="showHierarchy" dock="left" draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'hierarchy')" @dragend="endPanelDrag" />
          <ConfigPanel :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'inspector')" v-else-if="panel === 'inspector' && inspectorLoaded && state.inspectorDock === 'left' && !isFloating('inspector')" v-show="showInspector" dock="left" draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'inspector')" @dragend="endPanelDrag" />
        </UiMotionTransition>
</template>
      </div>
      <div class="editor-workspace" :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'bottom')" :data-drop-target="dragTarget === 'floating'" @dragover="previewPanelDrop($event, 'floating')" @dragleave="leavePanelDrop" @drop="dropPanel($event, 'floating')">
        <div class="editor-content" :class="{ 'with-rulers': authoringState.rulersVisible && state.currentPage === 'scene' }" :inert="workspaceState.maximizedPanel === 'bottom'">
          <div :class="['persistent-viewport', `${state.currentPage}-view`, { inactive: displayedWorkspace !== 'canvas' }]">
            <WorldCanvas />
          </div>
          <!-- The scene is the content; its controls float above it on glass instead of taking a row. -->
          <div v-show="state.currentPage === 'scene' && state.activeWorkspace !== 'ui' && displayedWorkspace === 'canvas'" class="viewport-chrome">
            <div class="viewport-chrome-start">
              <UiButton v-if="hierarchyOverlay && !state.distractionFree" class="panel-toggle nv-glass nv-glass--capsule" :class="{ checked: overlayHierarchy }" icon="hierarchy" :label="t('toggleHierarchy')" :aria-pressed="overlayHierarchy" data-testid="toggle-hierarchy-overlay" @click="overlayHierarchy = !overlayHierarchy" />
              <SceneTabs v-show="state.activeWorkspace === 'design' && !state.distractionFree" class="nv-glass nv-glass--capsule" />
            </div>
            <ToolBar class="viewport-chrome-tools nv-glass nv-glass--capsule" />
            <div class="viewport-chrome-end"><LayerBar class="nv-glass nv-glass--capsule" />
              <UiButton v-if="inspectorOverlay && !state.distractionFree" class="panel-toggle nv-glass nv-glass--capsule" :class="{ checked: overlayInspector, 'has-selection': physicsState.selectedEntityIds.length > 0 }" icon="inspector" :label="t('toggleInspector')" :aria-pressed="overlayInspector" data-testid="toggle-inspector-overlay" @click="overlayInspector = !overlayInspector" />
            </div>
          </div>
          <UiAsyncWorkspace :view="requestedWorkspace" :loaders="workspaceLoaders" @display="displayedWorkspace = $event" />
        </div>
        <UiMotionTransition><KeepAlive><EditorBottomPanel v-if="state.currentPage !== 'settings' && state.currentPage !== 'manage' && state.currentPage !== 'script' && state.bottomPanelVisible && !state.distractionFree" /></KeepAlive></UiMotionTransition>
      </div>
      <div v-show="!state.distractionFree" class="dock-group right-dock" :class="{ split: workspaceState.splitDocking }" :data-drop-target="dragTarget === 'right'" @dragover="previewPanelDrop($event, 'right')" @dragleave="leavePanelDrop" @drop="dropPanel($event, 'right')">
        <template v-for="panel in workspaceState.panelOrder" :key="panel">
<UiMotionTransition>
          <SceneSideBar :context-tools="contextInHierarchy" :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'hierarchy')" v-if="panel === 'hierarchy' && state.hierarchyDock === 'right' && !isFloating('hierarchy')" v-show="showHierarchy" dock="right" draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'hierarchy')" @dragend="endPanelDrag" />
          <ConfigPanel :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'inspector')" v-else-if="panel === 'inspector' && inspectorLoaded && state.inspectorDock === 'right' && !isFloating('inspector')" v-show="showInspector" dock="right" draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'inspector')" @dragend="endPanelDrag" />
        </UiMotionTransition>
</template>
      </div>
      <UiMotionTransition preset="elastic"><section v-if="isFloating('hierarchy') && showHierarchy && !state.distractionFree" class="floating-dock hierarchy-float" :class="{ 'floating-maximized': workspaceState.maximizedPanel === 'hierarchy' }" :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'hierarchy')"><header draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'hierarchy')" @dragend="endPanelDrag"><strong>{{ t('hierarchy') }}</strong><UiButton icon="back" :label="t('dockPanel')" @click="dockEditorPanel('hierarchy','left')" /></header><SceneSideBar dock="left" /></section></UiMotionTransition>
      <UiMotionTransition preset="elastic"><section v-if="isFloating('inspector') && inspectorLoaded && !state.distractionFree" v-show="showInspector" class="floating-dock inspector-float" :class="{ 'floating-maximized': workspaceState.maximizedPanel === 'inspector' }" :inert="Boolean(workspaceState.maximizedPanel && workspaceState.maximizedPanel !== 'inspector')"><header draggable="true" @pointerdown.capture="preparePanelDrag" @dragstart="startPanelDrag($event, 'inspector')" @dragend="endPanelDrag"><strong>{{ t('inspector') }}</strong><UiButton icon="forward" :label="t('dockPanel')" @click="dockEditorPanel('inspector','right')" /></header><ConfigPanel dock="right" /></section></UiMotionTransition>
      <UiMotionTransition>
        <PhysicsRuntimePanel :inert="Boolean(workspaceState.maximizedPanel)" v-if="state.physicsMonitorOpen && state.activeWorkspace === 'debug' && physicsState.playMode !== 'editing' && !state.distractionFree" />
      </UiMotionTransition>
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
import SideBar from "./SideBar.vue"
import StatusBar from "./StatusBar.vue"
import ToolBar from "../components/ToolBar.vue" 
import SceneSideBar from "../components/SceneSideBar.vue"
import SceneTabs from "../components/SceneTabs.vue"
import ContextMenu from "../components/ContextMenu.vue" // NEW
import CommandPalette from "../components/CommandPalette.vue"
import CreateObjectPalette from "../components/CreateObjectPalette.vue"
import CreatorOnboarding from "../components/CreatorOnboarding.vue"
import WorldCanvas from "../components/WorldCanvas.vue"
import LayerBar from "../components/LayerBar.vue"
import UiButton from '../ui/components/UiButton.vue'
import UiMotionTransition from '../ui/components/UiMotionTransition.vue'
import UiAsyncWorkspace from '../ui/components/UiAsyncWorkspace.vue'
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { animatePresence, beginNativeDrag, cancelMotion, endNativeDrag } from '../ui/motion'
import { editorState as state, closeContextMenu } from "../store/editor"
import { physicsState } from '../store/physics'
import { dockEditorPanel, initializeEditorWorkspaces, restorePanelLayout, workspaceState } from '../editor/workspaces'
import { recoveryState } from '../runtime/recovery'
import { authoringState } from '../editor/authoring2d'
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
/* 26.43 G1/web: three widths of the editor body (container measured, so window size, split view on
 * iPad and the UI scale all count). Wide: both panels docked. Medium (iPad landscape, small laptop
 * windows): the hierarchy stays docked but narrower and the inspector floats over the canvas. Narrow
 * (iPad portrait, split view): both float. Floating panels open from toggles in the viewport and do not
 * change the docked visibility saved for wide windows. */
const editorMain = ref<HTMLElement | null>(null)
const layoutMode = ref<'wide' | 'medium' | 'narrow'>('wide')
// Wide windows under 1480 px keep both panels docked but narrower, so the canvas stays at least ~640 px.
const compactDocks = ref(false)
const hierarchyOverlay = computed(() => layoutMode.value === 'narrow')
const inspectorOverlay = computed(() => layoutMode.value !== 'wide')
const overlayHierarchy = ref(false), overlayInspector = ref(false)
let layoutObserver: ResizeObserver | null = null
function measureLayout(width: number): void {
  const next = width >= 1240 ? 'wide' : width >= 900 ? 'medium' : 'narrow'
  compactDocks.value = next === 'wide' && width < 1480
  if (next === layoutMode.value) return
  layoutMode.value = next
  // Entering a narrower layout starts with the canvas uncovered.
  overlayHierarchy.value = false; overlayInspector.value = false
}
onMounted(() => {
  const element = editorMain.value
  if (!element) return
  measureLayout(element.getBoundingClientRect().width)
  layoutObserver = new ResizeObserver(entries => { for (const entry of entries) measureLayout(entry.contentRect.width) })
  layoutObserver.observe(element)
})
onBeforeUnmount(() => { layoutObserver?.disconnect(); layoutObserver = null })
/* 26.43 G1: F6 / Shift+F6 move the keyboard between the title bar, hierarchy, viewport, inspector and
 * bottom panel (whichever are shown), in reading order; the reached region shows a brief outline. */
const REGION_SELECTORS = ['.top-bar', '.left-dock', '.hierarchy-float', '.editor-content', '.right-dock', '.inspector-float', '.bottom-dock, .editor-bottom-panel, .bottom-panel']
const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), canvas[tabindex], [tabindex]:not([tabindex="-1"])'
function visibleRegion(element: Element | null): element is HTMLElement { return element instanceof HTMLElement && element.getClientRects().length > 0 && !element.closest('[inert]') && element.offsetWidth > 0 && element.offsetHeight > 0 && Boolean(element.querySelector(FOCUSABLE) || element.matches('.editor-content')) }
function editorRegions(): HTMLElement[] {
  const root = editorMain.value?.closest('.editor-root')
  if (!root) return []
  return REGION_SELECTORS.map(selector => root.querySelector(selector)).filter(visibleRegion).filter((element, index, list) => list.findIndex(other => other.contains(element) || element.contains(other)) === index)
}
let regionCueTimer = 0
function cycleRegion(event: KeyboardEvent): void {
  if (event.key !== 'F6' || event.ctrlKey || event.altKey || event.metaKey || event.defaultPrevented) return
  const regions = editorRegions()
  if (!regions.length) return
  event.preventDefault()
  const current = regions.findIndex(region => region.contains(document.activeElement))
  const next = regions[current < 0 ? (event.shiftKey ? regions.length - 1 : 0) : (current + (event.shiftKey ? regions.length - 1 : 1)) % regions.length]
  const target = next.matches('.editor-content') ? next.querySelector<HTMLElement>('canvas[tabindex], canvas') : [...next.querySelectorAll<HTMLElement>(FOCUSABLE)].find(element => element.getClientRects().length > 0)
  if (target && target.tabIndex < 0 && target instanceof HTMLCanvasElement) target.tabIndex = 0
  ;(target ?? next).focus({ preventScroll: true })
  for (const region of regions) region.classList.remove('region-cue')
  next.classList.add('region-cue')
  window.clearTimeout(regionCueTimer)
  regionCueTimer = window.setTimeout(() => next.classList.remove('region-cue'), 900)
}
onMounted(() => window.addEventListener('keydown', cycleRegion))
onBeforeUnmount(() => { window.removeEventListener('keydown', cycleRegion); window.clearTimeout(regionCueTimer) })
/** 26.44 G1: the context rail is merged into the docked Hierarchy; it stays a rail only when the
 * Hierarchy is hidden, floating or an overlay (narrow layout), and in Manage, which has its own list. */
const contextInHierarchy = computed(() => layoutMode.value !== 'narrow' && showHierarchy.value && !isFloating('hierarchy') && state.activeWorkspace !== 'manage')
const showHierarchy = computed(/** 仅在场景或游戏视图且开关启用时显示层级。 */ () => (state.currentPage === 'scene' || state.currentPage === 'game') && (hierarchyOverlay.value ? overlayHierarchy.value : state.hierarchyVisible))
const showInspector = computed(/** The inspector's empty state reserves its dock; selection must not resize the viewport. */ () => state.currentPage === 'scene' && (inspectorOverlay.value ? overlayInspector.value : state.inspectorVisible) && state.activeWorkspace !== 'ui')
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
// 26.42 G0：Play 中视口浮层 1.5 s 无指针移动后淡出；移动指针立即恢复。只在 Play 时监听。
const chromeIdle = ref(false)
let chromeIdleTimer = 0, chromeWokeAt = 0
function wakeViewportChrome(): void {
  const now = performance.now()
  if (!chromeIdle.value && now - chromeWokeAt < 120) return
  chromeWokeAt = now; chromeIdle.value = false
  window.clearTimeout(chromeIdleTimer)
  chromeIdleTimer = window.setTimeout(() => { chromeIdle.value = true }, 1_500)
}
watch(() => physicsState.playMode, mode => {
  window.removeEventListener('pointermove', wakeViewportChrome, true)
  window.clearTimeout(chromeIdleTimer); chromeIdle.value = false
  // Capture phase: the game canvas may stop pointer events from bubbling while it owns the pointer.
  if (mode === 'playing') { window.addEventListener('pointermove', wakeViewportChrome, { passive: true, capture: true }); chromeWokeAt = 0; wakeViewportChrome() }
}, { immediate: true })
onBeforeUnmount(() => { window.removeEventListener('pointermove', wakeViewportChrome, true); window.clearTimeout(chromeIdleTimer) })
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
.read-only-banner { min-height: var(--ui-control-height); flex: 0 0 auto; display: grid; place-items: center; color: var(--warning); background: var(--warning-soft); border-bottom: var(--ui-border-width) solid color-mix(in srgb, var(--warning) 40%, transparent); font-size: var(--type-dense); }
.read-only :deep(.config-wrapper), .read-only .persistent-viewport { pointer-events: none; filter: saturate(.72); }
.editor-main { position: relative; width: 100%; max-width: 100%; flex: 1; display: flex; min-width: 0; min-height: 0; overflow: hidden; gap: var(--ui-panel-gutter); padding: var(--ui-panel-gutter); }
.dock-group { min-width: 0; display: flex; flex: 0 0 auto; }
.dock-group[data-drop-target='true'], .editor-workspace[data-drop-target='true'] { outline: 2px solid var(--drag-target); outline-offset: -2px; border-radius: var(--radius-panel); background: var(--creation-soft); }
.dock-group.split { flex-direction: column; overflow: hidden; gap: var(--ui-panel-gutter); }
.dock-group.split > :deep(*) { min-height: 0; max-height: none; height: auto; flex: 1 1 0; }
.editor-workspace { min-width: 0; flex: 1; display: flex; flex-direction: column; min-height: 0; gap: var(--ui-panel-gutter); }
/* Floating viewport controls: scene tabs at the leading edge, tools centred, layers at the trailing
 * edge. The row itself ignores the pointer so the canvas stays directly manipulable around them. */
.viewport-chrome { position: absolute; inset: var(--space-2) var(--space-2) auto var(--space-2); z-index: 300; display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--space-2); pointer-events: none; }
.editor-content.with-rulers .viewport-chrome { inset-block-start: calc(20px + var(--space-2)); inset-inline-start: calc(20px + var(--space-2)); }
.viewport-chrome-start, .viewport-chrome-end { flex: 1 1 0; min-width: max-content; display: flex; pointer-events: none; }
.viewport-chrome-end { justify-content: flex-end; }
.viewport-chrome-start > *, .viewport-chrome-end > *, .viewport-chrome-tools { pointer-events: auto; }
.viewport-chrome-tools { flex: none; padding: var(--radius-capsule-inset); }
/* 26.42 G0: while the game runs the floating controls use static glass and fade out after 1.5 s without pointer movement; any movement or keyboard focus brings them back. */
.editor-root[data-play-mode='playing'] .viewport-chrome { transition: opacity var(--motion-fast) var(--ease-smooth); }
.editor-root[data-play-mode='playing'][data-chrome-idle] .viewport-chrome:not(:focus-within) { opacity: 0; transition-duration: var(--motion-panel); }
@media (prefers-reduced-motion: reduce) { .editor-root[data-play-mode='playing'] .viewport-chrome { transition: none; } }
.editor-content { min-height: 0; flex: 1; position: relative; overflow: hidden; container: viewport / inline-size; background: var(--bg-canvas); border-radius: var(--radius-panel); box-shadow: inset 0 0 0 var(--ui-border-width) var(--border-separator); }
/* Running the game is visible at a glance: the viewport frame takes the run state's color. */
.editor-content::after { content: ''; position: absolute; inset: 0; z-index: 400; border-radius: inherit; pointer-events: none; box-shadow: inset 0 0 0 0 transparent; transition: box-shadow var(--motion-standard) var(--ease-standard); }
.editor-root[data-play-mode='playing'] .editor-content::after { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--success) 70%, transparent); }
.editor-root[data-play-mode='paused'] .editor-content::after { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--warning) 70%, transparent); }
.persistent-viewport { position: absolute; inset: 0; contain: layout paint; isolation: isolate; }
/* F6 region cue: a short outline on the region the keyboard just moved to. */
.editor-root :deep(.region-cue) { outline: 2px solid var(--focus-ring, var(--accent)); outline-offset: -2px; }
@media (prefers-reduced-motion: no-preference) { .editor-root :deep(.region-cue) { transition: outline-color var(--motion-fast) var(--ease-standard); } }
.persistent-viewport.inactive { visibility: hidden; pointer-events: none; }
.floating-dock { position: absolute; z-index: 520; width: min(360px, 35vw); height: min(620px, 72vh); max-height: calc(100% - 60px); display: flex; flex-direction: column; overflow: hidden; border: var(--ui-border-width) solid var(--border-subtle); border-radius: var(--radius-dialog); background: var(--surface-1); box-shadow: var(--shadow-lg); }
.floating-dock > header { min-height: var(--ui-panel-header-height); padding: 0 var(--space-1) 0 var(--space-3); display: flex; align-items: center; justify-content: space-between; cursor: grab; border-bottom: var(--ui-border-width) solid var(--border-separator); }
.floating-dock > :deep(.sidebar-container), .floating-dock > :deep(.config-wrapper) { width: 100% !important; max-width: none; height: auto; min-height: 0; flex: 1; }
.hierarchy-float { left: var(--ui-rail-width); top: var(--space-3); }
.inspector-float { right: var(--space-3); top: var(--space-3); }
/* 26.43 G1/web layouts. Docked panels keep their saved widths when wide; medium narrows the hierarchy
 * and floats the inspector; narrow floats both above the canvas, each at most half the body. */
.panel-toggle { width: calc(var(--ui-large-height)); height: calc(var(--ui-large-height)); min-height: 0; padding: 0; border-radius: var(--radius-pill); color: var(--text-secondary); position: relative; }
.panel-toggle.checked { color: var(--accent); }
.panel-toggle.has-selection:not(.checked)::after { content: ''; position: absolute; inset-block-start: 6px; inset-inline-end: 6px; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
.viewport-chrome-start, .viewport-chrome-end { gap: var(--space-2); align-items: flex-start; }
.editor-root[data-layout='medium'] .dock-group > :deep(.sidebar-container:not(.panel-maximized)) { width: min(var(--ui-sidebar-width), 236px) !important; }
.editor-root[data-compact-docks] .dock-group > :deep(.sidebar-container:not(.panel-maximized)) { max-width: 240px !important; }
.editor-root[data-compact-docks] .dock-group > :deep(.config-wrapper:not(.panel-maximized)) { max-width: 296px !important; }
.editor-root:not([data-layout='wide']) .dock-group > :deep(.config-wrapper:not(.panel-maximized)),
.editor-root[data-layout='narrow'] .dock-group > :deep(.sidebar-container:not(.panel-maximized)) {
  /* Floating panels start under the viewport's control row, so their toggles stay reachable. */
  position: absolute; z-index: 560; inset-block: calc(var(--ui-panel-gutter) + var(--ui-large-height) + 2 * var(--space-2) + 24px) var(--ui-panel-gutter);
  width: min(340px, calc(50% - var(--ui-rail-width))) !important;
  box-shadow: var(--shadow-lg), inset 0 0 0 var(--ui-border-width) var(--border-separator);
}
.editor-root:not([data-layout='wide']) .dock-group > :deep(.config-wrapper.right:not(.panel-maximized)),
.editor-root[data-layout='narrow'] .dock-group > :deep(.sidebar-container.right:not(.panel-maximized)) { inset-inline-end: var(--ui-panel-gutter); }
.editor-root:not([data-layout='wide']) .dock-group > :deep(.config-wrapper.left:not(.panel-maximized)),
.editor-root[data-layout='narrow'] .dock-group > :deep(.sidebar-container.left:not(.panel-maximized)) { inset-inline-start: calc(var(--ui-rail-width) + 2 * var(--ui-panel-gutter)); }
.editor-root:not([data-layout='wide']) .dock-group > :deep(.config-wrapper) .panel-resize-handle,
.editor-root[data-layout='narrow'] .dock-group > :deep(.sidebar-container) .panel-resize-handle { display: none; }
/* A narrow viewport (iPad portrait, split view) cannot hold the tools in the top row: they become a
 * vertical capsule on the leading edge, under the scene tabs. */
@container viewport (max-width: 760px) {
  .viewport-chrome { flex-wrap: nowrap; }
  .viewport-chrome-start, .viewport-chrome-end { min-width: 0; flex: 0 1 auto; }
  .viewport-chrome-end { margin-inline-start: auto; }
  .viewport-chrome-tools { position: absolute; inset-inline-start: 0; inset-block-start: calc(var(--ui-large-height) + var(--space-3)); }
}
</style>
