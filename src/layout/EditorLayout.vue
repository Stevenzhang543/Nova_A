<template>
  <div class="editor-root" :class="{ 'read-only': recoveryState.readOnly }" @contextmenu.prevent @click="closeContextMenu">
    <div v-if="recoveryState.readOnly" class="read-only-banner" role="status">{{ t('readOnlyRecoveryBanner') }}</div>
    <TopBar />
    <div class="workspace-control-row">
      <WorkspaceBar />
      <ActionBar />
    </div>
    <ToolBar v-if="state.currentPage === 'scene' && state.activeWorkspace !== 'ui'" class="scene-toolbar-row" />

    <div class="editor-main">
      <SideBar v-if="!state.distractionFree" />
      <div v-if="!state.distractionFree" class="dock-group left-dock">
        <SceneSideBar v-if="showHierarchy && state.hierarchyDock === 'left'" dock="left" />
        <ConfigPanel v-if="showInspector && state.inspectorDock === 'left'" dock="left" />
      </div>
      <div class="editor-workspace">
        <div class="editor-content">
          <div :class="['persistent-viewport', `${state.currentPage}-view`, { inactive: state.currentPage === 'settings' || state.currentPage === 'script' || state.activeWorkspace === 'ui' }]">
            <LayerBar v-if="state.currentPage === 'scene'" />
            <WorldCanvas />
          </div>
          <Transition name="page" mode="out-in">
            <SettingsPanel v-if="state.currentPage === 'settings'" key="settings" class="settings-host" />
            <ScriptStudio v-else-if="state.currentPage === 'script'" key="script" />
            <PresentationPanel v-else-if="state.activeWorkspace === 'ui'" key="ui" class="ui-workspace" />
          </Transition>
        </div>
        <EditorBottomPanel v-if="state.currentPage !== 'settings' && state.currentPage !== 'script' && state.bottomPanelVisible && !state.distractionFree" />
      </div>
      <div v-if="!state.distractionFree" class="dock-group right-dock">
        <SceneSideBar v-if="showHierarchy && state.hierarchyDock === 'right'" dock="right" />
        <ConfigPanel v-if="showInspector && state.inspectorDock === 'right'" dock="right" />
      </div>
      <Transition name="physics-panel">
        <PhysicsRuntimePanel v-if="physicsState.playMode !== 'editing' && state.currentPage !== 'settings' && state.currentPage !== 'script' && !state.distractionFree" />
      </Transition>
    </div>
    
    <ContextMenu />
    <ConfirmDialog />
    <CommandPalette />

    <StatusBar />
  </div>
</template>

<script setup lang="ts">
import TopBar from "./TopBar.vue"
import WorkspaceBar from "../components/WorkspaceBar.vue"
import SideBar from "./SideBar.vue"
import StatusBar from "./StatusBar.vue"
import ToolBar from "../components/ToolBar.vue" 
import ConfigPanel from "../components/ConfigPanel.vue" 
import SceneSideBar from "../components/SceneSideBar.vue"
import EditorBottomPanel from "../components/EditorBottomPanel.vue"
import ActionBar from "../components/ActionBar.vue"
import ContextMenu from "../components/ContextMenu.vue" // NEW
import ConfirmDialog from "../components/ConfirmDialog.vue"
import CommandPalette from "../components/CommandPalette.vue"
import ScriptStudio from "../components/ScriptStudio.vue"

import SettingsPanel from "../panels/SettingsPanel.vue"
import WorldCanvas from "../components/WorldCanvas.vue"
import LayerBar from "../components/LayerBar.vue"
import PhysicsRuntimePanel from "../components/PhysicsRuntimePanel.vue"
import PresentationPanel from "../components/PresentationPanel.vue"

import { computed } from 'vue'
import { editorState as state, closeContextMenu } from "../store/editor"
import { physicsState } from '../store/physics'
import { initializeEditorWorkspaces } from '../editor/workspaces'
import { recoveryState } from '../runtime/recovery'
import { t } from '../i18n'

initializeEditorWorkspaces()
const showHierarchy = computed(() => (state.currentPage === 'scene' || state.currentPage === 'game') && state.hierarchyVisible)
const showInspector = computed(() => state.currentPage === 'scene' && state.inspectorVisible && state.activeWorkspace !== 'ui')
</script>

<style scoped>
.editor-root { display: flex; flex-direction: column; height: 100vh; min-height: 0; background: var(--bg-base); color: var(--text-primary); }
.read-only-banner{min-height:28px;flex:0 0 28px;display:grid;place-items:center;color:var(--warning);background:color-mix(in srgb,var(--warning) 12%,var(--surface-1));border-bottom:1px solid var(--warning);font-size:12px}.read-only :deep(.config-wrapper),.read-only .persistent-viewport{pointer-events:none;filter:saturate(.72)}
.workspace-control-row { min-width: 0; flex: 0 0 42px; display: flex; align-items: stretch; border-bottom: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface-1) 94%, var(--bg-base)); isolation: isolate; }
.workspace-control-row :deep(.workspace-bar) { min-width: 0; flex: 1; border-bottom: 0; }
.workspace-control-row :deep(.actionbar) { flex: 0 0 auto; }
.editor-main { position: relative; flex: 1; display: flex; min-height: 0; }
.dock-group { min-width: 0; display: flex; flex: 0 0 auto; }
.scene-toolbar-row { flex: 0 0 auto; }
.editor-workspace { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.editor-content { min-height: 0; flex: 1; position: relative; overflow: hidden; background: var(--bg-canvas); }
.persistent-viewport { position: absolute; inset: 0; contain: layout paint; isolation: isolate; }
.persistent-viewport.scene-view { animation: viewport-scene-reveal 170ms cubic-bezier(.2,.8,.2,1); }
.persistent-viewport.game-view { animation: viewport-game-reveal 170ms cubic-bezier(.2,.8,.2,1); }
.persistent-viewport.inactive { visibility: hidden; pointer-events: none; }
.settings-host { position: absolute; inset: 0; z-index: 2; }
.ui-workspace { position: absolute; inset: 0; z-index: 2; background: var(--surface-1); }
@keyframes viewport-scene-reveal { from { opacity: .88; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
@keyframes viewport-game-reveal { from { opacity: .88; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
.page-enter-active, .page-leave-active { transition: opacity 150ms ease, transform 180ms cubic-bezier(.2,.8,.2,1); }
.page-enter-from { opacity: 0; transform: translateY(5px); }
.page-leave-to { opacity: 0; transform: translateY(-3px); }
.physics-panel-enter-active, .physics-panel-leave-active { transition: width 190ms ease, opacity 150ms ease, transform 190ms cubic-bezier(.2,.8,.2,1); }
.physics-panel-enter-from, .physics-panel-leave-to { width: 0; opacity: 0; transform: translateX(24px); }
@media (max-width: 720px) { .workspace-control-row :deep(.mode-label) { display: none; } }
</style>
