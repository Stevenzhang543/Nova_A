<template>
  <div class="editor-root" data-control-scope="editor-shell" :class="{ 'read-only': recoveryState.readOnly }" @contextmenu.prevent @click="closeContextMenu">
    <div v-if="recoveryState.readOnly" class="read-only-banner" role="status">{{ t('readOnlyRecoveryBanner') }}</div>
    <TopBar />
    <div class="workspace-control-row">
      <WorkspaceBar />
      <ActionBar />
    </div>
    <ToolBar v-if="state.currentPage === 'scene' && state.activeWorkspace !== 'ui'" class="scene-toolbar-row" />

    <div class="editor-main">
      <SideBar v-if="!state.distractionFree" />
      <div v-if="!state.distractionFree" class="dock-group left-dock" :class="{ split: workspaceState.splitDocking }" :data-drop-target="dragTarget === 'left'" @dragover.prevent="dragTarget = 'left'" @dragleave="dragTarget = ''" @drop="dropPanel('left')">
        <template v-for="panel in workspaceState.panelOrder" :key="panel">
          <SceneSideBar v-if="panel === 'hierarchy' && showHierarchy && state.hierarchyDock === 'left' && !isFloating('hierarchy')" dock="left" draggable="true" @dragstart="startPanelDrag('hierarchy')" />
          <ConfigPanel v-else-if="panel === 'inspector' && inspectorLoaded && state.inspectorDock === 'left' && !isFloating('inspector')" v-show="showInspector" dock="left" draggable="true" @dragstart="startPanelDrag('inspector')" />
        </template>
      </div>
      <div class="editor-workspace" :data-drop-target="dragTarget === 'floating'" @dragover.prevent="dragTarget = 'floating'" @dragleave="dragTarget = ''" @drop="dropPanel('floating')">
        <SceneTabs v-if="state.currentPage === 'scene' && state.activeWorkspace === 'design' && !state.distractionFree" />
        <div class="editor-content">
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
          <SceneSideBar v-if="panel === 'hierarchy' && showHierarchy && state.hierarchyDock === 'right' && !isFloating('hierarchy')" dock="right" draggable="true" @dragstart="startPanelDrag('hierarchy')" />
          <ConfigPanel v-else-if="panel === 'inspector' && inspectorLoaded && state.inspectorDock === 'right' && !isFloating('inspector')" v-show="showInspector" dock="right" draggable="true" @dragstart="startPanelDrag('inspector')" />
        </template>
      </div>
      <section v-if="isFloating('hierarchy') && showHierarchy && !state.distractionFree" class="floating-dock hierarchy-float"><header draggable="true" @dragstart="startPanelDrag('hierarchy')"><strong>{{ t('hierarchy') }}</strong><button :title="t('dockPanel')" @click="dockEditorPanel('hierarchy','left')">↙</button></header><SceneSideBar dock="left" /></section>
      <section v-if="isFloating('inspector') && inspectorLoaded && !state.distractionFree" v-show="showInspector" class="floating-dock inspector-float"><header draggable="true" @dragstart="startPanelDrag('inspector')"><strong>{{ t('inspector') }}</strong><button :title="t('dockPanel')" @click="dockEditorPanel('inspector','right')">↘</button></header><ConfigPanel dock="right" /></section>
      <Transition name="physics-panel">
        <PhysicsRuntimePanel v-if="state.physicsMonitorOpen && state.activeWorkspace === 'debug' && physicsState.playMode !== 'editing' && !state.distractionFree" />
      </Transition>
    </div>
    
    <ContextMenu />
    <ConfirmDialog />
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
import ConfirmDialog from "../components/ConfirmDialog.vue"
import CommandPalette from "../components/CommandPalette.vue"
import CreateObjectPalette from "../components/CreateObjectPalette.vue"
import CreatorOnboarding from "../components/CreatorOnboarding.vue"
import WorldCanvas from "../components/WorldCanvas.vue"
import LayerBar from "../components/LayerBar.vue"
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { editorState as state, closeContextMenu } from "../store/editor"
import { physicsState } from '../store/physics'
import { dockEditorPanel, initializeEditorWorkspaces, workspaceState } from '../editor/workspaces'
import { recoveryState } from '../runtime/recovery'
import { t } from '../i18n'

const loadConfigPanel = () => import('../components/ConfigPanel.vue')
const loadEditorBottomPanel = () => import('../components/EditorBottomPanel.vue')
const loadScriptWorkspace = () => import('../components/ScriptWorkspace.vue')
const loadPresentationPanel = () => import('../components/PresentationPanel.vue')
const loadManageWorkspace = () => import('../components/ManageWorkspace.vue')
const loadPhysicsRuntimePanel = () => import('../components/PhysicsRuntimePanel.vue')
const ConfigPanel = defineAsyncComponent(loadConfigPanel)
const EditorBottomPanel = defineAsyncComponent(loadEditorBottomPanel)
const ScriptWorkspace = defineAsyncComponent(loadScriptWorkspace)
const PresentationPanel = defineAsyncComponent(loadPresentationPanel)
const ManageWorkspace = defineAsyncComponent(loadManageWorkspace)
const PhysicsRuntimePanel = defineAsyncComponent(loadPhysicsRuntimePanel)

initializeEditorWorkspaces()
const showHierarchy = computed(() => (state.currentPage === 'scene' || state.currentPage === 'game') && state.hierarchyVisible)
const showInspector = computed(() => state.currentPage === 'scene' && state.inspectorVisible && state.activeWorkspace !== 'ui' && (physicsState.selectedEntityIds.length > 0 || state.componentPickerOpen))
const inspectorLoaded = ref(showInspector.value)
watch(showInspector, visible => { if (visible) inspectorLoaded.value = true })
let idleWarmup = 0
onMounted(() => {
  const warm = () => { void Promise.allSettled([loadConfigPanel(), loadScriptWorkspace(), loadPresentationPanel(), loadManageWorkspace(), loadPhysicsRuntimePanel()]) }
  idleWarmup = window.requestIdleCallback(warm, { timeout: 2_000 })
})
onBeforeUnmount(() => {
  if (!idleWarmup) return
  window.cancelIdleCallback(idleWarmup)
})
const draggedPanel = ref<'hierarchy' | 'inspector' | ''>(''), dragTarget = ref('')
function isFloating(panel: 'hierarchy' | 'inspector'): boolean { return workspaceState.floatingPanels.includes(panel) }
function startPanelDrag(panel: 'hierarchy' | 'inspector'): void { draggedPanel.value = panel }
function dropPanel(destination: 'left' | 'right' | 'floating'): void { if (draggedPanel.value) dockEditorPanel(draggedPanel.value, destination); draggedPanel.value = ''; dragTarget.value = '' }
</script>

<style scoped>
.editor-root { width: 100%; max-width: 100vw; display: flex; flex-direction: column; height: 100vh; min-width: 0; min-height: 0; overflow: hidden; background: var(--bg-base); color: var(--text-primary); }
.read-only-banner{min-height:28px;flex:0 0 28px;display:grid;place-items:center;color:var(--warning);background:color-mix(in srgb,var(--warning) 12%,var(--surface-1));border-bottom:1px solid var(--warning);font-size:12px}.read-only :deep(.config-wrapper),.read-only .persistent-viewport{pointer-events:none;filter:saturate(.72)}
.workspace-control-row { position:relative; z-index:600; min-width: 0; flex: 0 0 48px; display: flex; align-items: stretch; overflow:visible; border-bottom: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface-1) 94%, var(--bg-base)); isolation: isolate; }
.workspace-control-row :deep(.workspace-bar) { min-width: 0; flex: 1; border-bottom: 0; }
.workspace-control-row :deep(.actionbar) { flex: 0 0 auto; }
.editor-main { position: relative; width: 100%; max-width: 100%; flex: 1; display: flex; min-width: 0; min-height: 0; overflow: hidden; }
.dock-group { min-width: 0; display: flex; flex: 0 0 auto; }
.dock-group[data-drop-target='true'], .editor-workspace[data-drop-target='true'] { outline: 2px solid var(--drag-target); outline-offset: -3px; background: color-mix(in srgb, var(--drag-target) 7%, transparent); }
.dock-group.split{flex-direction:column;overflow:hidden}.dock-group.split>:deep(*){min-height:0;max-height:50%;flex:1}
.scene-toolbar-row { flex: 0 0 auto; }
.editor-workspace { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.editor-content { min-height: 0; flex: 1; position: relative; overflow: hidden; background: var(--bg-canvas); }
.persistent-viewport { position: absolute; inset: 0; contain: layout paint; isolation: isolate; }
.persistent-viewport.scene-view { animation: viewport-scene-reveal 170ms cubic-bezier(.2,.8,.2,1); }
.persistent-viewport.game-view { animation: viewport-game-reveal 170ms cubic-bezier(.2,.8,.2,1); }
.persistent-viewport.inactive { visibility: hidden; pointer-events: none; }
.settings-host { position: absolute; inset: 0; z-index: 2; }
.ui-workspace { position: absolute; inset: 0; z-index: 2; background: var(--surface-1); }
.floating-dock{position:absolute;z-index:520;width:min(360px,35vw);height:min(620px,72vh);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border-strong);border-radius:var(--radius-dialog);background:var(--surface-1);box-shadow:var(--shadow-lg)}.floating-dock>header{min-height:32px;padding:0 6px 0 10px;display:flex;align-items:center;justify-content:space-between;cursor:grab;border-bottom:1px solid var(--border-subtle)}.floating-dock>header button{width:26px;height:26px;border:0;border-radius:var(--radius-control-small);background:var(--surface-3)}.floating-dock>:deep(.sidebar-container),.floating-dock>:deep(.config-wrapper){width:100%!important;max-width:none;height:auto;min-height:0;flex:1}.hierarchy-float{left:82px;top:48px}.inspector-float{right:12px;top:48px}
@keyframes viewport-scene-reveal { from { opacity: .88; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
@keyframes viewport-game-reveal { from { opacity: .88; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
.page-enter-active, .page-leave-active { transition: opacity 150ms ease, transform 180ms cubic-bezier(.2,.8,.2,1); }
.page-enter-from { opacity: 0; transform: translateY(5px); }
.page-leave-to { opacity: 0; transform: translateY(-3px); }
.physics-panel-enter-active, .physics-panel-leave-active { transition: opacity 150ms ease, transform 190ms cubic-bezier(.2,.8,.2,1); }
.physics-panel-enter-from, .physics-panel-leave-to { opacity: 0; transform: translateX(24px); }
@media (max-width: 720px) { .workspace-control-row :deep(.mode-label) { display: none; } }
</style>
