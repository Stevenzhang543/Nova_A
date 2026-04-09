<template>
  <div class="top-bar">
    <div class="menu-container" @mouseleave="onMenuLeave" @mouseenter="onMenuEnter">
      <div class="menu-item">
        <button @click="toggleMenu('file')" :class="{ active: activeMenu === 'file' }">File</button>
        <div class="dropdown" v-if="activeMenu === 'file'">
          <button @click="handleSave">Save Project (Ctrl+S)</button>
          <button @click="triggerLoad">Load Project...</button>
          <hr />
          <button @click="handleClearScene">Clear Scene</button>
        </div>
      </div>

      <div class="menu-item">
        <button @click="toggleMenu('edit')" :class="{ active: activeMenu === 'edit' }">Edit</button>
        <div class="dropdown" v-if="activeMenu === 'edit'">
          <button @click="handleDelete">Delete Selected</button>
          <button @click="handleDeleteAll">Delete All</button>
          <hr />
          <button @click="handleDeselect">Deselect All</button>
        </div>
      </div>

      <div class="menu-item">
        <button @click="toggleMenu('view')" :class="{ active: activeMenu === 'view' }">View</button>
        <div class="dropdown" v-if="activeMenu === 'view'">
          <button @click="handleToggleGrid">{{ editorState.showGrid ? 'Hide Grid' : 'Show Grid' }}</button>
          <button @click="handleResetCamera">Reset Camera</button>
        </div>
      </div>

    </div>

   <input type="file" ref="fileInput" style="display: none" accept=".json" @change="handleFileSelected" />

    <input class="search-bar" placeholder="Search" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { editorState } from '../store/editor'
import { saveProject, loadProject, clearScene, deleteSelected, selectEntity, resetCamera } from '../store/physics'

const activeMenu = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
let menuTimeout: number | null = null

// Actions
const handleSave = () => { saveProject(); activeMenu.value = null }
const triggerLoad = () => { fileInput.value?.click(); activeMenu.value = null }
const handleClearScene = () => { clearScene(); activeMenu.value = null }
const handleDelete = () => { deleteSelected(); activeMenu.value = null }
const handleDeleteAll = () => { clearScene(); activeMenu.value = null } // Reuses safe wipe logic
const handleDeselect = () => { selectEntity(null); activeMenu.value = null }
const handleToggleGrid = () => { editorState.showGrid = !editorState.showGrid; activeMenu.value = null }
const handleResetCamera = () => { resetCamera(); activeMenu.value = null }

function toggleMenu(menu: string) {
  activeMenu.value = activeMenu.value === menu ? null : menu
}

function onMenuEnter() {
  if (menuTimeout) clearTimeout(menuTimeout)
}

function onMenuLeave() {
  if (menuTimeout) clearTimeout(menuTimeout)
  menuTimeout = setTimeout(() => { activeMenu.value = null }, 350) // Forgiving close
}

// File Loading Logic
function handleFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  const reader = new FileReader()
  reader.onload = (e) => {
    if (typeof e.target?.result === 'string') {
      loadProject(e.target.result)
      editorState.statusText = 'Project loaded successfully'
    }
  }
  reader.readAsText(file)
  target.value = '' // Reset input
}

// Keyboard Shortcuts
function handleKeyDown(e: KeyboardEvent) {
  // NEW: Prevent action if user is typing in ANY input or textarea
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    handleSave()
    editorState.statusText = 'Project saved'
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    handleDelete()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.top-bar {
  height: 32px;
  background: #1e1e1e;
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 6px;
  color: #ddd;
  border-bottom: 1px solid #333;
  
  /* NEW: Ensures TopBar renders strictly above the dropdown toolbar */
  position: relative;
  z-index: 200; 
}

.menu-container {
  display: flex;
  gap: 4px;
  height: 100%;
  align-items: center;
}

.menu-item {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
}

.menu-item > button {
  background: transparent;
  border: none;
  color: #ccc;
  padding: 4px 10px;
  height: 100%;
}

.menu-item > button:hover, .menu-item > button.active {
  background: #333;
  color: #fff;
}

.dropdown {
  position: absolute;
  top: 32px;
  left: 0;
  background: #252526;
  border: 1px solid #444;
  display: flex;
  flex-direction: column;
  min-width: 150px;
  z-index: 1000;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}

.dropdown button {
  background: transparent;
  border: none;
  color: #ccc;
  padding: 8px 12px;
  text-align: left;
  width: 100%;
}

.dropdown button:hover {
  background: #007acc;
  color: white;
}

.dropdown hr {
  margin: 2px 0;
  border: none;
  border-top: 1px solid #444;
}

.search-bar { flex: 1; background: #252526; border: 1px solid #444; color: #fff; padding: 2px 6px; margin-left: 10px; }
</style>