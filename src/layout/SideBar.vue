<template>
  <div class="sidebar">
    <!-- Top icons -->
    <div class="top">
      <button
        :class="{ active: state.currentPage === 'scene' }"
        @click="switchPage('scene')"
        title="Scene"
      >
        <img :src="sceneIcon" alt="Scene" />
      </button>

      <button
        :class="{ active: state.currentPage === 'render' }"
        @click="switchPage('render')"
        title="Render"
      >
        <img :src="renderIcon" alt="Render" />
      </button>
    </div>

    <!-- Bottom icon -->
    <div class="bottom">
      <button
        :class="{ active: state.currentPage === 'settings' }"
        @click="switchPage('settings')"
        title="Settings"
      >
        <img :src="settingsIcon" alt="Settings" />
      </button>
    </div>
  </div>
</template>

// Replace your entire script setup with this:
<script setup lang="ts">
import { editorState as state } from "../store/editor"
import { resetSimulation } from "../store/physics" // NEW: Import reset function

import sceneIcon from "../assets/icons/scene.svg"
import renderIcon from "../assets/icons/render.svg"
import settingsIcon from "../assets/icons/settings.svg"

function switchPage(page: "scene" | "render" | "settings") {
  // FIX: Automatically reset simulation when leaving the Renderer Panel
  if (state.currentPage === 'render' && page === 'scene') {
    resetSimulation()
  }
  
  state.currentPage = page
  state.statusText = `Switched to ${page}`
}
</script>

<style scoped>
.sidebar {
  width: 60px;
  background: #151515;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-right: 1px solid #2a2a2a;
  min-height: 0;
}


.top,
.bottom {
  display: flex;
  flex-direction: column;
}

button {
  height: 60px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

button img {
  width: 24px;
  height: 24px;
  opacity: 0.7;
  transition: opacity 0.2s, filter 0.2s; /* Smooth visual transition */
}

button.active {
  background: #e0e0e0;
}

button.active img {
  opacity: 1;
  filter: invert(1); /* NEW: Inverts white SVG to black so it shows on white bg */
}

button:hover img {
  opacity: 1;
}
</style>
