<template>
  <div class="editor-root" :key="state.layoutVersion">
    <TopBar />

    <div class="editor-main">
      <SideBar />

      <div class="editor-content">
        <ScenePanel v-if="state.currentPage === 'scene'" />
        <RendererPanel v-if="state.currentPage === 'render'" />
        <SettingsPanel v-if="state.currentPage === 'settings'" />
      </div>
    </div>

    <StatusBar />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue"
import TopBar from "./TopBar.vue"
import SideBar from "./SideBar.vue"
import StatusBar from "./StatusBar.vue"

// EDITED: Import Panel instead of Component
import ScenePanel from "../panels/ScenePanel.vue"
import RendererPanel from "../panels/RendererPanel.vue"
import SettingsPanel from "../panels/SettingsPanel.vue"

import { editorState as state, reconfigureLayout } from "../store/editor"

function handleLayoutChange() {
  reconfigureLayout()
}

onMounted(() => {
  handleLayoutChange()
  window.addEventListener("resize", handleLayoutChange)
  document.addEventListener("fullscreenchange", handleLayoutChange)
  document.addEventListener("visibilitychange", handleLayoutChange)
})

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleLayoutChange)
  document.removeEventListener("fullscreenchange", handleLayoutChange)
  document.removeEventListener("visibilitychange", handleLayoutChange)
})
</script>

<style scoped>
.editor-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 0;
  background: #1e1e1e;
  color: #ddd;
}

.editor-main {
  flex: 1;
  display: flex;
  min-height: 0;
}

.editor-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #2a2a2a;
}
</style>