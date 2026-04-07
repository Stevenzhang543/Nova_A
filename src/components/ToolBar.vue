<template>
  <div 
    class="toolbar-wrapper" 
    @mouseenter="isHovered = true" 
    @mouseleave="isHovered = false"
  >
    <div class="hover-zone"></div>
    
    <div class="toolbar" :class="{ 'is-visible': isHovered }">
      <div class="tools">
        <button 
          :class="{ active: state.activeTool === 'triangle' }"
          @click="state.activeTool = 'triangle'"
          title="Draw Triangle"
        >▲</button>
        <button 
          :class="{ active: state.activeTool === 'circle' }"
          @click="state.activeTool = 'circle'"
          title="Draw Circle"
        >●</button>
        <button 
          :class="{ active: state.activeTool === 'rectangle' }"
          @click="state.activeTool = 'rectangle'"
          title="Draw Rectangle"
        >■</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { physicsState as state } from '../store/physics'

const isHovered = ref(false)
</script>

<style scoped>
.toolbar-wrapper {
  position: absolute;
  top: 32px; /* Exactly below TopBar */
  left: 60px; /* Offset by the main SideBar */
  right: 0;
  height: 50px;
  z-index: 100;
  pointer-events: none; /* Let clicks pass through the wrapper */
}

.hover-zone {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  pointer-events: auto; /* Catch mouse entering */
}

.toolbar {
  position: absolute;
  top: -20px; /* NEW: Shifts the starting position up behind the TopBar */
  left: 50%;
  transform: translate(-50%, -100%);
  background: #252526;
  border: 1px solid #333;
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 26px 12px 6px 12px; /* NEW: Added 20px to top padding to fill the bounce gap */
  display: flex;
  pointer-events: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); /* Jelly Slide */
}

.toolbar.is-visible {
  transform: translate(-50%, 0);
}

.tools {
  display: flex;
  gap: 8px;
}

.tools button {
  background: #333;
  border: 1px solid #444;
  color: #ccc;
  padding: 6px 16px;
  cursor: pointer;
  border-radius: 4px;
}

.tools button.active {
  background: #0078d4;
  border-color: #0078d4;
  color: white;
}
</style>