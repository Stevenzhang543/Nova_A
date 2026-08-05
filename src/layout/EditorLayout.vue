<template>
  <div class="editor-root" @contextmenu.prevent @click="closeContextMenu">
    <TopBar />
    <ToolBar v-if="state.currentPage === 'scene'" /> 
    <ConfigPanel v-if="state.currentPage === 'scene'" /> 
    <ActionBar v-if="state.currentPage === 'render'" />

    <div class="editor-main">
      <SideBar />
      <div class="editor-content">
        <Transition name="page" mode="out-in">
          <ScenePanel v-if="state.currentPage === 'scene'" key="scene" />
          <RendererPanel v-else-if="state.currentPage === 'render'" key="render" />
          <SettingsPanel v-else key="settings" />
        </Transition>
      </div>
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
import ActionBar from "../components/ActionBar.vue"
import ContextMenu from "../components/ContextMenu.vue" // NEW
import ConfirmDialog from "../components/ConfirmDialog.vue"

import ScenePanel from "../panels/ScenePanel.vue"
import RendererPanel from "../panels/RendererPanel.vue"
import SettingsPanel from "../panels/SettingsPanel.vue"

import { editorState as state, closeContextMenu } from "../store/editor"
</script>

<style scoped>
.editor-root { display: flex; flex-direction: column; height: 100vh; min-height: 0; background: var(--bg-base); color: var(--text-primary); }
.editor-main { flex: 1; display: flex; min-height: 0; }
.editor-content { flex: 1; position: relative; overflow: hidden; background: var(--bg-canvas); }
.page-enter-active, .page-leave-active { transition: opacity 150ms ease, transform 180ms cubic-bezier(.2,.8,.2,1); }
.page-enter-from { opacity: 0; transform: translateY(5px); }
.page-leave-to { opacity: 0; transform: translateY(-3px); }
</style>
