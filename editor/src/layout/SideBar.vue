<template>
  <div class="sidebar">
    <button
      :class="{ active: state.currentPage === 'physics' }"
      @click="switchPage('physics')"
    >
      PHYSICS
    </button>

    <button
      :class="{ active: state.currentPage === 'renderer' }"
      @click="switchPage('renderer')"
    >
      RENDERER
    </button>
  </div>
</template>

<script setup lang="ts">
import { editorState as state, EditorPage } from "../store/editor";

function switchPage(page: EditorPage) {
  state.currentPage = page;
  state.statusText = `Switched to ${page.toUpperCase()}`;
}
</script>

<style scoped>
.sidebar {
  width: 160px;
  background: #151515;
  display: flex;
  flex-direction: column;
}

button {
  background: none;
  border: none;
  color: #ccc;
  padding: 16px;
  text-align: left;
  cursor: pointer;
}

button.active {
  background: #0078d4;
  color: white;
}
</style>
