<template>
  <div class="editor-root">
    <TopBar />
    <div class="editor-main">
      <SideBar />
      <div class="editor-content">
        <PhysicsPanel v-if="state.currentPage === 'physics'" />
        <RendererPanel v-if="state.currentPage === 'renderer'" />
      </div>
    </div>
    <StatusBar />
  </div>
</template>

<script setup lang="ts">
import TopBar from "./TopBar.vue";
import SideBar from "./SideBar.vue";
import StatusBar from "./StatusBar.vue";
import PhysicsPanel from "../panels/PhysicsPanel.vue";
import RendererPanel from "../panels/RendererPanel.vue";
import { editorState as state } from "../store/editor";
</script>

<style scoped>
.editor-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1e1e1e;
  color: #ddd;
}

.editor-main {
  flex: 1;
  display: flex;
}

.editor-content {
  flex: 1;
  padding: 16px;
  background: #2a2a2a;
}
</style>
