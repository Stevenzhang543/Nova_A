<template>
  <div class="scene-sidebar">
    <div class="tools">
      <button 
        :class="{ active: state.activeTool === 'triangle' }"
        @click="state.activeTool = 'triangle'"
        title="Draw Triangle"
      >
        ▲
      </button>
      <button 
        :class="{ active: state.activeTool === 'circle' }"
        @click="state.activeTool = 'circle'"
        title="Draw Circle"
      >
        ●
      </button>
      <button 
        :class="{ active: state.activeTool === 'rectangle' }"
        @click="state.activeTool = 'rectangle'"
        title="Draw Rectangle"
      >
        ■
      </button>
    </div>

    <div class="entity-list">
      <div class="list-header">Entities</div>
      <div 
        v-for="entity in state.world.entities" 
        :key="entity.id"
        class="entity-item"
        :class="{ selected: state.selectedEntityId === entity.id }"
        @click="selectEntity(entity.id)"
      >
        <span class="icon">{{ getIcon(entity.name) }}</span>
        <span class="name">{{ entity.name }}_{{ entity.id }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { physicsState as state, selectEntity } from '../store/physics'

function getIcon(type: string) {
  if (type === 'Box') return '■'
  if (type === 'Circle') return '●'
  if (type === 'Triangle') return '▲'
  return '?'
}
</script>

<style scoped>
.scene-sidebar {
  width: 200px;
  background: #252526;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tools {
  display: flex;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid #333;
}

.tools button {
  flex: 1;
  background: #333;
  border: 1px solid #444;
  color: #ccc;
  padding: 6px;
  cursor: pointer;
}

.tools button.active {
  background: #0078d4;
  border-color: #0078d4;
  color: white;
}

.entity-list {
  flex: 1;
  overflow-y: auto;
}

.list-header {
  padding: 8px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  color: #888;
}

.entity-item {
  padding: 6px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #ccc;
}

.entity-item:hover {
  background: #2a2d2e;
}

.entity-item.selected {
  background: #37373d;
  color: white;
}

.icon {
  font-size: 10px;
  color: #0078d4;
}
</style>