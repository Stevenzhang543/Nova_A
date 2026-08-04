<template>
  <header class="top-bar">
    <a class="brand" href="https://whitelists.top" target="_blank" rel="noreferrer" aria-label="Nova_A by Whitelist">
      <span class="brand-mark">N</span><span>Nova_A</span>
    </a>
    <nav class="menu-container" @mouseleave="onMenuLeave" @mouseenter="onMenuEnter">
      <div class="menu-item">
        <button @click="toggleMenu('file')" :class="{ active: activeMenu === 'file' }">{{ t('file') }}</button>
        <Transition name="menu"><div v-if="activeMenu === 'file'" class="dropdown">
          <button @click="handleSave"><span>{{ t('saveProject') }}</span><kbd>Ctrl S</kbd></button>
          <button @click="triggerLoad"><span>{{ t('loadProject') }}</span></button>
          <hr><button class="danger" @click="handleClearScene"><span>{{ t('clearScene') }}</span></button>
        </div></Transition>
      </div>
      <div class="menu-item">
        <button @click="toggleMenu('edit')" :class="{ active: activeMenu === 'edit' }">{{ t('edit') }}</button>
        <Transition name="menu"><div v-if="activeMenu === 'edit'" class="dropdown">
          <button @click="handleUndo"><span>{{ t('undo') }}</span><kbd>Ctrl Z</kbd></button>
          <button @click="handleRedo"><span>{{ t('redo') }}</span><kbd>Ctrl Y</kbd></button>
          <hr><button @click="handleDelete"><span>{{ t('deleteSelected') }}</span><kbd>Del</kbd></button>
          <button class="danger" @click="handleDeleteAll"><span>{{ t('deleteAll') }}</span></button>
          <hr><button @click="handleDeselect"><span>{{ t('deselectAll') }}</span><kbd>Esc</kbd></button>
        </div></Transition>
      </div>
      <div class="menu-item">
        <button @click="toggleMenu('view')" :class="{ active: activeMenu === 'view' }">{{ t('view') }}</button>
        <Transition name="menu"><div v-if="activeMenu === 'view'" class="dropdown">
          <button @click="handleToggleGrid"><span>{{ t(editorState.showGrid ? 'hideGrid' : 'showGrid') }}</span><span class="check">{{ editorState.showGrid ? '✓' : '' }}</span></button>
          <hr>
          <button @click="toggleAxis('x')"><span>{{ t(editorState.showXAxis ? 'hideXAxis' : 'showXAxis') }}</span><span class="check">{{ editorState.showXAxis ? '✓' : '' }}</span></button>
          <button @click="toggleAxis('y')"><span>{{ t(editorState.showYAxis ? 'hideYAxis' : 'showYAxis') }}</span><span class="check">{{ editorState.showYAxis ? '✓' : '' }}</span></button>
          <button @click="handleToggleAllAxes"><span>{{ t((editorState.showXAxis || editorState.showYAxis) ? 'hideAllAxes' : 'showAllAxes') }}</span></button>
          <hr><button @click="handleResetCamera"><span>{{ t('resetCamera') }}</span></button>
        </div></Transition>
      </div>
    </nav>
    <div class="top-spacer"></div>
    <span class="release-pill">0.12.0</span>
    <input ref="fileInput" type="file" hidden accept="application/json,.json" @change="handleFileSelected">
  </header>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { t } from '../i18n'
import { editorState } from '../store/editor'
import { clearScene, deleteSelected, enterEditMode, loadProject, pushHistory, redo, resetCamera, saveProject, undo } from '../store/physics'
import { preferencesState } from '../store/preferences'

const activeMenu = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
let menuTimeout: number | null = null

function confirmDestructive(message: string): boolean {
  return !preferencesState.confirmDestructiveActions || window.confirm(message)
}

async function handleSave() {
  const saved = await saveProject()
  editorState.statusText = t(saved ? 'saved' : 'saveCancelled')
  activeMenu.value = null
}
function triggerLoad() { fileInput.value?.click(); activeMenu.value = null }
function handleClearScene() {
  if (!confirmDestructive(t('confirmClear'))) return
  clearScene(); pushHistory(); activeMenu.value = null
}
function handleDelete() { deleteSelected(); pushHistory(); activeMenu.value = null }
function handleDeleteAll() { handleClearScene() }
function handleDeselect() { enterEditMode(null); activeMenu.value = null }
function handleToggleGrid() { editorState.showGrid = !editorState.showGrid; activeMenu.value = null }
function toggleAxis(axis: 'x' | 'y') {
  if (axis === 'x') editorState.showXAxis = !editorState.showXAxis
  else editorState.showYAxis = !editorState.showYAxis
}
function handleToggleAllAxes() {
  const visible = !(editorState.showXAxis || editorState.showYAxis)
  editorState.showXAxis = visible; editorState.showYAxis = visible; activeMenu.value = null
}
function handleResetCamera() { resetCamera(); activeMenu.value = null }
function handleUndo() { undo(); activeMenu.value = null }
function handleRedo() { redo(); activeMenu.value = null }
function toggleMenu(menu: string) { activeMenu.value = activeMenu.value === menu ? null : menu }
function onMenuEnter() { if (menuTimeout !== null) window.clearTimeout(menuTimeout) }
function onMenuLeave() {
  if (menuTimeout !== null) window.clearTimeout(menuTimeout)
  menuTimeout = window.setTimeout(() => { activeMenu.value = null }, 300)
}

function handleFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = event => {
    if (typeof event.target?.result === 'string' && loadProject(event.target.result)) {
      pushHistory()
      editorState.statusText = t('loaded')
    }
  }
  reader.onerror = () => { editorState.statusText = t('loadFailed', { message: reader.error?.message ?? t('fileReadFailed') }) }
  reader.readAsText(file)
  target.value = ''
}

function handleKeyDown(event: KeyboardEvent) {
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (event.ctrlKey && event.key.toLowerCase() === 's') { event.preventDefault(); void handleSave() }
  else if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'z') { event.preventDefault(); handleRedo() }
  else if (event.ctrlKey && event.key.toLowerCase() === 'z') { event.preventDefault(); handleUndo() }
  else if (event.ctrlKey && event.key.toLowerCase() === 'y') { event.preventDefault(); handleRedo() }
  else if (event.key === 'Delete' || event.key === 'Backspace') { handleDelete() }
  else if (event.key === 'Escape') { enterEditMode(null); activeMenu.value = null }
}

onMounted(() => { window.addEventListener('keydown', handleKeyDown); pushHistory() })
onUnmounted(() => { window.removeEventListener('keydown', handleKeyDown); if (menuTimeout !== null) window.clearTimeout(menuTimeout) })
</script>

<style scoped>
.top-bar { height: 42px; flex: 0 0 42px; display: flex; align-items: center; gap: 12px; padding: 0 12px; color: var(--text-secondary); background: var(--surface-1); border-bottom: 1px solid var(--border-subtle); backdrop-filter: var(--glass-blur); position: relative; z-index: 300; }
.brand { display: flex; align-items: center; gap: 8px; color: var(--text-primary); text-decoration: none; font-size: 12px; font-weight: 670; letter-spacing: -.01em; }
.brand-mark { display: grid; place-items: center; width: 23px; height: 23px; border-radius: 7px; color: var(--accent-contrast); background: linear-gradient(145deg, var(--accent), var(--accent-strong)); font-size: 11px; box-shadow: 0 4px 12px var(--accent-soft); }
.menu-container { height: 100%; display: flex; align-items: center; gap: 2px; }
.menu-item { height: 100%; position: relative; display: flex; align-items: center; }
.menu-item > button { height: 28px; padding: 0 10px; border: 0; border-radius: 8px; color: var(--text-secondary); background: transparent; font-size: 12px; }
.menu-item > button:hover, .menu-item > button.active { color: var(--text-primary); background: var(--surface-hover); }
.dropdown { position: absolute; top: 36px; left: 0; min-width: 230px; padding: 6px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--surface-1); backdrop-filter: var(--glass-blur); box-shadow: var(--shadow-lg); }
.dropdown button { min-height: 34px; padding: 0 9px; display: flex; align-items: center; justify-content: space-between; gap: 18px; border: 0; border-radius: 7px; background: transparent; color: var(--text-secondary); text-align: left; font-size: 12px; }
.dropdown button:hover { color: var(--text-primary); background: var(--accent-soft); }
.dropdown button.danger { color: var(--danger); }
.dropdown button.danger:hover { background: var(--danger-soft); }
.dropdown hr { width: 100%; margin: 5px 0; border: 0; border-top: 1px solid var(--border-subtle); }
kbd { color: var(--text-muted); font-family: inherit; font-size: 10px; }
.check { color: var(--accent); }
.top-spacer { flex: 1; }
.release-pill { padding: 3px 8px; border: 1px solid var(--border-subtle); border-radius: 999px; color: var(--text-muted); font-size: 10px; }
.menu-enter-active, .menu-leave-active { transition: opacity 130ms ease, transform 130ms ease; transform-origin: top left; }
.menu-enter-from, .menu-leave-to { opacity: 0; transform: translateY(-4px) scale(.98); }
</style>
