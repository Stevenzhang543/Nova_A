<template>
  <div 
    class="sidebar-container" 
    :style="{ width: isCollapsed ? '0px' : panelWidth + 'px' }"
    :class="{ 'jelly-slide': !isDragging, 'no-transition': isDragging }"
  >
    <button v-if="isCollapsed" class="expand-btn" @click="expandPanel" title="Expand Entities">
      <img src="../assets/icons/arrow.svg" alt="Expand" />
    </button>

    <div class="scene-sidebar" v-show="!isCollapsed">
      <div class="entity-list">
        <div class="list-header">Entities</div>
        <div 
          v-for="entity in state.world.entities" 
          :key="entity.id"
          class="entity-item"
          :class="{ selected: state.selectedEntityId === entity.id }"
          @click="selectEntity(entity.id)"
        >
          <span class="icon">{{ getIcon(entity.shapeType) }}</span>
          
          <span 
            v-if="editingId !== entity.id" 
            class="name" 
            @dblclick="startEdit(entity)"
            title="Double-click to rename"
          >{{ entity.name }}_{{ entity.id }}</span>
          
          <input 
            v-else 
            v-model="editName" 
            @blur="finishEdit(entity)" 
            @keyup.enter="finishEdit(entity)" 
            class="edit-input" 
            v-focus
          />
        </div>
      </div>
    </div>

    <div class="resize-handle" @mousedown="startDrag" v-show="!isCollapsed"></div>
  </div>
</template>

<script setup lang="ts">
//import { ref, onMounted, onUnmounted } from 'vue'
import { ref, onUnmounted } from 'vue'
import { physicsState as state, selectEntity } from '../store/physics'

// Drag & Collapse State
const panelWidth = ref(120)
const isCollapsed = ref(false)
const isDragging = ref(false)

// NEW: Rename State
const editingId = ref<number | null>(null)
const editName = ref("")

// NEW: Custom Directive to auto-focus the input box
const vFocus = {
  mounted: (el: HTMLInputElement) => el.focus()
}

function startEdit(entity: any) {
  editingId.value = entity.id
  // Strip the "_{id}" part when editing so the user just types the actual name
  editName.value = entity.name 
}

function finishEdit(entity: any) {
  if (editingId.value === entity.id) {
    if (editName.value.trim() !== "") {
      entity.name = editName.value.trim()
    }
    editingId.value = null
  }
}
const collapseThreshold = 80 // If width goes below 80px, it snaps shut
let startX = 0
let startWidth = 0

function getIcon(type: string) {
  if (type === 'Box') return '■'
  if (type === 'Circle') return '●'
  if (type === 'Triangle') return '▲'
  return '?'
}

// Dragging Logic
function startDrag(e: MouseEvent) {
  isDragging.value = true
  startX = e.clientX
  startWidth = panelWidth.value
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.body.style.cursor = 'ew-resize' // Lock cursor while dragging
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return
  const deltaX = e.clientX - startX
  let newWidth = startWidth + deltaX
  
  if (newWidth < collapseThreshold) {
    // Show visual preview of snapping shut
    panelWidth.value = 0
  } else {
    // Max width safeguard
    panelWidth.value = Math.min(Math.max(newWidth, collapseThreshold), 500)
  }
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.cursor = 'default'

  // Finalize collapse
  if (panelWidth.value < collapseThreshold) {
    isCollapsed.value = true
  }
}

function expandPanel() {
  isCollapsed.value = false
  panelWidth.value = 120 // Default restore width
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.sidebar-container {
  position: relative;
  height: 100%;
  background: #252526;
  border-right: 1px solid #333;
  display: flex;
  flex-shrink: 0;
}

.scene-sidebar {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent text spilling when shrinking */
  white-space: nowrap;
}

.resize-handle {
  width: 5px;
  cursor: ew-resize;
  background: transparent;
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  z-index: 10;
  transition: background 0.2s ease;
}

.resize-handle:hover, .sidebar-container.no-transition .resize-handle {
  background: #0078d4;
}

.expand-btn {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #333;
  border: 1px solid #444;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
}

.expand-btn img {
  width: 16px;
  height: 16px;
}

.entity-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
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

.entity-item:hover { background: #2a2d2e; }
.entity-item.selected { background: #37373d; color: white; }
.icon { font-size: 10px; color: #0078d4; }

/* NEW: Rename Input Styling */
.edit-input {
  flex: 1;
  background: #1e1e1e;
  border: 1px solid #0078d4;
  color: white;
  font-size: 13px;
  padding: 2px 4px;
  outline: none;
  width: 100%;
}
</style>