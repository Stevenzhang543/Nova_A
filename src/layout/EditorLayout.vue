<template>
  <div class="editor-root" @contextmenu.prevent @click="closeContextMenu">
    <TopBar />
    <ToolBar v-if="state.currentPage === 'scene'" />
    <ActionBar />

    <div class="editor-main">
      <SideBar />
      <SceneSideBar v-if="state.currentPage !== 'settings'" />
      <div class="editor-workspace">
        <div class="editor-content">
          <div :class="['persistent-viewport', `${state.currentPage}-view`, { inactive: state.currentPage === 'settings' }]">
            <LayerBar v-if="state.currentPage === 'scene'" />
            <WorldCanvas />
          </div>
          <Transition name="page" mode="out-in">
            <SettingsPanel v-if="state.currentPage === 'settings'" key="settings" class="settings-host" />
          </Transition>
        </div>
        <EditorBottomPanel v-if="state.currentPage !== 'settings'" />
      </div>
      <ConfigPanel v-if="state.currentPage === 'scene'" />
    </div>
    
    <ContextMenu />
    <ConfirmDialog />

    <StatusBar />
  </div>
</template>

<script setup lang="ts">
import TopBar from "./TopBar.vue"
import SideBar from "./SideBar.vue"
import StatusBar from "./StatusBar.vue"
import ToolBar from "../components/ToolBar.vue" 
import ConfigPanel from "../components/ConfigPanel.vue" 
import SceneSideBar from "../components/SceneSideBar.vue"
import EditorBottomPanel from "../components/EditorBottomPanel.vue"
import ActionBar from "../components/ActionBar.vue"
import ContextMenu from "../components/ContextMenu.vue" // NEW
import ConfirmDialog from "../components/ConfirmDialog.vue"

import SettingsPanel from "../panels/SettingsPanel.vue"
import WorldCanvas from "../components/WorldCanvas.vue"
import LayerBar from "../components/LayerBar.vue"

import { editorState as state, closeContextMenu } from "../store/editor"
</script>

<style scoped>
.editor-root { display: flex; flex-direction: column; height: 100vh; min-height: 0; background: var(--bg-base); color: var(--text-primary); }
.editor-main { flex: 1; display: flex; min-height: 0; }
.editor-workspace { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.editor-content { min-height: 0; flex: 1; position: relative; overflow: hidden; background: var(--bg-canvas); }
.persistent-viewport { position: absolute; inset: 0; }
.persistent-viewport.scene-view { animation: viewport-scene-reveal 170ms cubic-bezier(.2,.8,.2,1); }
.persistent-viewport.game-view { animation: viewport-game-reveal 170ms cubic-bezier(.2,.8,.2,1); }
.persistent-viewport.inactive { visibility: hidden; pointer-events: none; }
.settings-host { position: absolute; inset: 0; z-index: 2; }
@keyframes viewport-scene-reveal { from { opacity: .88; filter: saturate(.9); } to { opacity: 1; filter: saturate(1); } }
@keyframes viewport-game-reveal { from { opacity: .88; filter: saturate(.9); } to { opacity: 1; filter: saturate(1); } }
.page-enter-active, .page-leave-active { transition: opacity 150ms ease, transform 180ms cubic-bezier(.2,.8,.2,1); }
.page-enter-from { opacity: 0; transform: translateY(5px); }
.page-leave-to { opacity: 0; transform: translateY(-3px); }
</style>
