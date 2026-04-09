<template>
  <div 
    class="toolbar-wrapper" 
    @mouseenter="onMouseEnter" 
    @mouseleave="onMouseLeave"
  >
    <div class="hover-zone"></div>
    
    <div class="toolbar" :class="{ 'is-visible': isHovered }">
      <div class="tools">
        <button 
          @click="toggleSimulation(true)" 
          :class="{ active: state.simulationRunning }"
          title="Play Physics"
        >
          <img src="../assets/icons/play.svg" alt="Play" />
        </button>
        <button 
          @click="toggleSimulation(false)" 
          :class="{ active: !state.simulationRunning }"
          title="Pause Physics"
        >
          <img src="../assets/icons/stop.svg" alt="Stop" />
        </button>
        <div class="divider"></div>
        <button 
          @click="resetSimulation" 
          title="Reset to Original State"
        >
          <img src="../assets/icons/reset.svg" alt="Reset" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { physicsState as state, toggleSimulation, resetSimulation } from '../store/physics'

const isHovered = ref(false)
let hoverTimeout: number | null = null

function onMouseEnter() {
  if (hoverTimeout) clearTimeout(hoverTimeout)
  hoverTimeout = setTimeout(() => { isHovered.value = true }, 100) // Fast open
}

function onMouseLeave() {
  if (hoverTimeout) clearTimeout(hoverTimeout)
  hoverTimeout = setTimeout(() => { isHovered.value = false }, 350) // Forgiving close
}
</script>

<style scoped>
.toolbar-wrapper {
  position: absolute;
  top: 32px; 
  left: 60px; 
  right: 0;
  height: 50px;
  z-index: 100;
  pointer-events: none; 
}

.hover-zone {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  pointer-events: auto; 
}

.toolbar {
  position: absolute;
  top: -20px; 
  left: 50%;
  transform: translate(-50%, -100%);
  background: #252526;
  border: 1px solid #333;
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 26px 12px 6px 12px; 
  display: flex;
  pointer-events: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); 
}

.toolbar.is-visible {
  transform: translate(-50%, 0);
}

.tools {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tools button {
  background: #333;
  border: 1px solid #444;
  border-radius: 4px;
  width: 32px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.tools button:hover { background: #444; }
.tools button.active { background: #e0e0e0; border-color: #e0e0e0; }

.tools button img { width: 14px; height: 14px; opacity: 0.8; transition: filter 0.2s, opacity 0.2s; }
.tools button:hover img { opacity: 1; }
.tools button.active img { filter: invert(1); opacity: 1; } /* Active color reversion */

.divider {
  width: 1px;
  height: 20px;
  background: #444;
  margin: 0 4px;
}
</style>