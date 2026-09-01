<template>
  <header class="top-bar">
    <a class="brand" href="https://whitelists.top" target="_blank" rel="noreferrer" aria-label="Nova_A by Whitelist">
      <span class="brand-mark">N</span><span>Nova_A</span>
    </a>
    <nav class="menu-container" @mouseleave="onMenuLeave" @mouseenter="onMenuEnter">
      <div class="menu-item">
        <button @click="toggleMenu('file')" :class="{ active: activeMenu === 'file' }">{{ t('file') }}</button>
        <Transition name="menu"><div v-if="activeMenu === 'file'" class="dropdown">
          <button :disabled="!isEditing" @click="handleProjectManager"><span>{{ t('projectManager') }}</span></button>
          <hr>
          <button :disabled="!isEditing" @click="handleSave"><span>{{ t('saveProject') }}</span><kbd>Ctrl S</kbd></button>
          <button :disabled="!isEditing" @click="triggerLoad"><span>{{ t('loadProject') }}</span></button>
          <hr><button class="danger" :disabled="!isEditing" @click="handleClearScene"><span>{{ t('clearScene') }}</span></button>
        </div></Transition>
      </div>
      <div class="menu-item">
        <button @click="toggleMenu('edit')" :class="{ active: activeMenu === 'edit' }">{{ t('edit') }}</button>
        <Transition name="menu"><div v-if="activeMenu === 'edit'" class="dropdown">
          <button :disabled="!isEditing || !historyState.canUndo" @click="handleUndo"><span>{{ historyState.undoLabel ? `${t('undo')} · ${historyState.undoLabel}` : t('undo') }}</span><kbd>Ctrl Z</kbd></button>
          <button :disabled="!isEditing || !historyState.canRedo" @click="handleRedo"><span>{{ historyState.redoLabel ? `${t('redo')} · ${historyState.redoLabel}` : t('redo') }}</span><kbd>Ctrl Y</kbd></button>
          <button @click="handleUndoHistory"><span>{{ t('undoHistory') }}</span><kbd>Ctrl Alt H</kbd></button>
          <hr><button :disabled="!isEditing || !physicsState.selectedEntityIds.length" @click="handleCopy"><span>{{ t('copy') }}</span><kbd>Ctrl C</kbd></button>
          <button :disabled="!isEditing" @click="handlePaste"><span>{{ t('paste') }}</span><kbd>Ctrl V</kbd></button>
          <button :disabled="!isEditing || !physicsState.selectedEntityIds.length" @click="handleDuplicate"><span>{{ t('duplicate') }}</span><kbd>Ctrl D</kbd></button>
          <button :disabled="!isEditing || physicsState.selectedEntityId === null" @click="handleRename"><span>{{ t('rename') }}</span><kbd>F2</kbd></button>
          <hr><button :disabled="!isEditing || !physicsState.selectedEntityIds.length" @click="handleDelete"><span>{{ t('deleteSelected') }}</span><kbd>Del</kbd></button>
          <button class="danger" :disabled="!isEditing" @click="handleDeleteAll"><span>{{ t('deleteAll') }}</span></button>
          <hr><button @click="handleDeselect"><span>{{ t('deselectAll') }}</span><kbd>Esc</kbd></button>
        </div></Transition>
      </div>
      <div class="menu-item">
        <button @click="toggleMenu('project')" :class="{ active: activeMenu === 'project' }">{{ t('project') }}</button>
        <Transition name="menu"><div v-if="activeMenu === 'project'" class="dropdown">
          <button @click="openBottomPanel('project')"><span>{{ t('projectHealth') }}</span></button>
          <button @click="openBottomPanel('build')"><span>{{ t('buildPanel') }}</span></button>
        </div></Transition>
      </div>
      <div class="menu-item">
        <button @click="toggleMenu('debug')" :class="{ active: activeMenu === 'debug' }">{{ t('debug') }}</button>
        <Transition name="menu"><div v-if="activeMenu === 'debug'" class="dropdown">
          <button @click="openBottomPanel('console')"><span>{{ t('console') }}</span></button>
          <button @click="openBottomPanel('profiler')"><span>{{ t('profiler') }}</span></button>
          <button @click="handleStatusCenter"><span>{{ t('statusCenter') }}</span></button>
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
          <hr>
          <button @click="handleTogglePanel('hierarchy')"><span>{{ t('toggleHierarchy') }}</span><span class="check">{{ editorState.hierarchyVisible ? '✓' : '' }}</span></button>
          <button @click="handleTogglePanel('inspector')"><span>{{ t('toggleInspector') }}</span><span class="check">{{ editorState.inspectorVisible ? '✓' : '' }}</span></button>
          <button @click="handleTogglePanel('bottom')"><span>{{ t('toggleBottomPanel') }}</span><span class="check">{{ editorState.bottomPanelVisible ? '✓' : '' }}</span></button>
          <button @click="handleFocusMode"><span>{{ t('focusMode') }}</span><span class="check">{{ editorState.distractionFree ? '✓' : '' }}</span></button>
          <button @click="handleResetLayout"><span>{{ t('resetLayout') }}</span></button>
          <button @click="handleWorkspaceManager"><span>{{ t('manageWorkspaces') }}</span><kbd>Ctrl Alt W</kbd></button>
          <hr>
          <button @click="handleFullscreen"><span>{{ t('toggleFullscreen') }}</span><kbd>F11</kbd></button>
          <button @click="handleCommandPalette"><span>{{ t('commandPalette') }}</span><kbd>Ctrl K</kbd></button>
          <button @click="handleShortcutEditor"><span>{{ t('shortcutEditor') }}</span><kbd>Ctrl Alt K</kbd></button>
        </div></Transition>
      </div>
      <div class="menu-item">
        <button @click="toggleMenu('help')" :class="{ active: activeMenu === 'help' }">{{ t('help') }}</button>
        <Transition name="menu"><div v-if="activeMenu === 'help'" class="dropdown dropdown-right">
          <button @click="handleManual"><span>{{ t('manual') }}</span><kbd>5.0 · {{ t('offline') }}</kbd></button>
          <button @click="handleManualSection('first-game')"><span>{{ t('firstGameTutorial') }}</span></button>
          <button @click="handleManualSection('package-sdk')"><span>{{ t('packageSdk') }}</span></button>
          <button @click="handleManualSection('release-engineering')"><span>{{ t('releaseEngineeringGuide') }}</span></button>
          <button @click="handleStudioStatus"><span>{{ t('studioStatus') }}</span></button>
          <button @click="handleAbout"><span>{{ t('about') }}</span></button>
        </div></Transition>
      </div>
    </nav>
    <div class="top-spacer"></div>
    <span v-if="recoveryState.safeMode" class="safe-pill">{{ t('safeMode') }}</span>
    <span v-if="historyState.dirty" class="dirty-pill" :title="projectTransactionState.unsavedScopes.join(', ')">● {{ t('unsavedChanges') }}</span>
    <span class="release-pill">6.8.0 · {{ t('releaseCandidate') }}</span>
    <input ref="fileInput" type="file" hidden accept="application/json,.nova,.json" @change="handleFileSelected">
  </header>
</template>

<script setup lang="ts">
import { openUrl } from '@tauri-apps/plugin-opener'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { t } from '../i18n'
import { addEditorLog, editorState } from '../store/editor'
import { clearScene, copySelectedEntities, deleteSelected, duplicateSelectedEntities, historyState, pasteEntities, physicsState, pushHistory, redo, resetCamera, saveProject, selectEntities, undo } from '../store/physics'
import { preferencesState } from '../store/preferences'
import { confirmDialogState, requestConfirmation } from '../store/dialog'
import { openProjectDocument, rememberCurrentProject, showProjectManager } from '../projects/projectManager'
import { resetEditorLayout, toggleEditorPanel, toggleFocusMode } from '../editor/workspaces'
import { openBundledManual } from '../runtime/openManual'
import { reportRecoverableError } from '../runtime/faultCenter'
import { openStudioStatus } from '../runtime/stableContracts'
import { recoveryState } from '../runtime/recovery'
import { completeTask, failTask, startTask } from '../runtime/editorFeedback'
import { toggleEditorFullscreen } from '../runtime/editorWindow'
import { projectTransactionState } from '../runtime/projectTransactions'

const activeMenu = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
let menuTimeout: number | null = null
const projectUrl = 'https://github.com/Stevenzhang543/Nova_A/'
const isEditing = computed(() => physicsState.playMode === 'editing' && !recoveryState.readOnly)

function confirmDestructive(title: string, message: string): Promise<boolean> {
  if (!preferencesState.confirmDestructiveActions) return Promise.resolve(true)
  return requestConfirmation({ title, message, confirmLabel: t('confirmAction'), cancelLabel: t('cancel'), destructive: true })
}

async function handleSave() {
  if (!isEditing.value) { editorState.statusText = t('runtimeIsolation'); return }
  const task = startTask(t('saveProject'), { detail: t('atomicSaveInProgress'), progress: null })
  let saved = false
  try { saved = await saveProject(); if (saved) completeTask(task, t('atomicSaveComplete')); else completeTask(task, t('saveCancelled')) }
  catch (error) { failTask(task, error) }
  editorState.statusText = t(saved ? 'saved' : 'saveCancelled')
  if (saved) { void rememberCurrentProject(); addEditorLog(t('saved'), 'Project') }
  activeMenu.value = null
}
function triggerLoad() { fileInput.value?.click(); activeMenu.value = null }
async function handleClearScene() {
  if (!isEditing.value) return
  if (!await confirmDestructive(t('clearSceneTitle'), t('confirmClearCount', { objects: physicsState.world.entities.length, connections: physicsState.world.connections.length }))) return
  clearScene(); pushHistory(); activeMenu.value = null
}
async function handleDelete() { if (!isEditing.value || !physicsState.selectedEntityIds.length) return; if (!await confirmDestructive(t('deleteObjectTitle'), t('confirmDeleteObjectCount', { count: physicsState.selectedEntityIds.length }))) return; deleteSelected(); pushHistory('Delete entities'); activeMenu.value = null }
function handleDeleteAll() { void handleClearScene() }
function handleDeselect() { selectEntities([], 'replace'); activeMenu.value = null }
function handleCopy() { const count = copySelectedEntities(); if (count) addEditorLog(`Copied ${count} ${count === 1 ? 'entity' : 'entities'}`); activeMenu.value = null }
function handlePaste() { if (!isEditing.value) return; const pasted = pasteEntities(); if (pasted.length) addEditorLog(`Pasted ${pasted.length} ${pasted.length === 1 ? 'entity' : 'entities'}`); activeMenu.value = null }
function handleDuplicate() { if (!isEditing.value) return; const duplicated = duplicateSelectedEntities(); if (duplicated.length) addEditorLog(`Duplicated ${duplicated.length} ${duplicated.length === 1 ? 'entity' : 'entities'}`); activeMenu.value = null }
function handleRename() { if (physicsState.selectedEntityId !== null) editorState.renameRequestId = physicsState.selectedEntityId; activeMenu.value = null }
function openBottomPanel(tab: 'console' | 'profiler' | 'project' | 'build') {
  if (editorState.currentPage === 'settings') editorState.currentPage = 'scene'
  editorState.bottomPanelTab = tab
  editorState.bottomPanelOpen = true
  activeMenu.value = null
}
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
function handleTogglePanel(panel: 'hierarchy' | 'inspector' | 'bottom') { toggleEditorPanel(panel); activeMenu.value = null }
function handleFocusMode() { toggleFocusMode(); activeMenu.value = null }
function handleResetLayout() { resetEditorLayout(); activeMenu.value = null }
function handleWorkspaceManager() { editorState.workspaceManagerOpen = true; activeMenu.value = null }
function handleShortcutEditor() { editorState.shortcutEditorOpen = true; activeMenu.value = null }
function handleStatusCenter() { editorState.statusCenterOpen = true; activeMenu.value = null }
function handleUndoHistory() { editorState.undoHistoryOpen = true; activeMenu.value = null }
function handleCommandPalette() { editorState.commandPaletteOpen = true; activeMenu.value = null }
function handleFullscreen() { activeMenu.value = null; void toggleEditorFullscreen() }
async function handleAbout() {
  activeMenu.value = null
  try {
    if ('__TAURI_INTERNALS__' in window) await openUrl(projectUrl)
    else if (!window.open(projectUrl, '_blank', 'noopener,noreferrer')) throw new Error(t('popupBlocked'))
  } catch (error) { reportRecoverableError(error, t('openProjectWebsite'), 'Editor'); editorState.statusText = t('openWebsiteFailed') }
}
function handleManual() { activeMenu.value = null; void openBundledManual() }
function handleManualSection(section: string) { activeMenu.value = null; void openBundledManual(section) }
function handleStudioStatus() { activeMenu.value = null; openStudioStatus() }
// Keep the menu mounted through the activating click. The entire TopBar unmounts when
// the manager appears; clearing it first can expose the workspace strip to pointer-up.
function handleProjectManager() { showProjectManager() }
function handleUndo() { if (isEditing.value) undo(); activeMenu.value = null }
function handleRedo() { if (isEditing.value) redo(); activeMenu.value = null }
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
  reader.onload = async event => {
    if (typeof event.target?.result === 'string' && await openProjectDocument(event.target.result, file.name)) {
      pushHistory()
      editorState.statusText = t('loaded')
      addEditorLog(t('loaded'), 'Project')
    }
  }
  reader.onerror = () => { editorState.statusText = t('loadFailed', { message: reader.error?.message ?? t('fileReadFailed') }) }
  reader.readAsText(file)
  target.value = ''
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented) return
  if (confirmDialogState.visible) return
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  const commandKey = event.ctrlKey || event.metaKey
  if (commandKey && event.key.toLowerCase() === 's') { event.preventDefault(); void handleSave() }
  else if (commandKey && event.shiftKey && event.key.toLowerCase() === 'z') { event.preventDefault(); handleRedo() }
  else if (commandKey && event.key.toLowerCase() === 'z') { event.preventDefault(); handleUndo() }
  else if (commandKey && event.key.toLowerCase() === 'y') { event.preventDefault(); handleRedo() }
  else if (commandKey && event.altKey && event.key.toLowerCase() === 'h') { event.preventDefault(); handleUndoHistory() }
  else if (commandKey && event.key.toLowerCase() === 'c') { event.preventDefault(); handleCopy() }
  else if (commandKey && event.key.toLowerCase() === 'v') { event.preventDefault(); handlePaste() }
  else if (commandKey && event.key.toLowerCase() === 'd') { event.preventDefault(); handleDuplicate() }
  else if (event.key === 'Delete' || event.key === 'Backspace') { void handleDelete() }
  else if (event.key === 'F2') { event.preventDefault(); handleRename() }
  else if (event.key === 'Escape') { selectEntities([], 'replace'); activeMenu.value = null }
}

onMounted(() => { window.addEventListener('keydown', handleKeyDown); pushHistory() })
onUnmounted(() => { window.removeEventListener('keydown', handleKeyDown); if (menuTimeout !== null) window.clearTimeout(menuTimeout) })
</script>

<style scoped>
.top-bar { height: 44px; flex: 0 0 44px; display: flex; align-items: center; gap: 12px; padding: 0 12px; color: var(--text-secondary); background: color-mix(in srgb,var(--surface-1) 96%,var(--bg-base)); border-bottom: 1px solid var(--border-subtle); box-shadow:inset 0 -1px color-mix(in srgb,var(--accent) 4%,transparent); backdrop-filter: var(--glass-blur); position: relative; z-index: 500; }
.brand { display: flex; align-items: center; gap: 8px; color: var(--text-primary); text-decoration: none; font-size: var(--type-dense); font-weight: 700; letter-spacing: -.01em; }
.brand-mark { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 8px; color: var(--accent-contrast); background: linear-gradient(145deg, var(--accent), var(--accent-secondary)); font-size: var(--type-caption); box-shadow: 0 5px 16px var(--accent-soft); }
.menu-container { height: 100%; display: flex; align-items: center; gap: 2px; }
.menu-item { height: 100%; position: relative; display: flex; align-items: center; }
.menu-item > button { height: 30px; padding: 0 10px; border: 0; border-radius: 8px; color: var(--text-secondary); background: transparent; font-size: var(--type-caption); }
.menu-item > button:hover, .menu-item > button.active { color: var(--text-primary); background: var(--surface-hover); }
.dropdown { position: absolute; top: 38px; left: 0; min-width: 250px; padding: 7px; display: flex; flex-direction: column; border: 1px solid var(--border-strong); border-radius: var(--radius-panel); background: var(--surface-1); backdrop-filter: var(--glass-blur); box-shadow: var(--shadow-float); }
.dropdown-right { right: 0; left: auto; }
.dropdown button { min-height: 36px; padding: 0 10px; display: flex; align-items: center; justify-content: space-between; gap: 18px; border: 0; border-radius: 8px; background: transparent; color: var(--text-secondary); text-align: left; font-size: var(--type-caption); }
.dropdown button:hover { color: var(--text-primary); background: var(--accent-soft); }
.dropdown button.danger { color: var(--danger); }
.dropdown button.danger:hover { background: var(--danger-soft); }
.dropdown hr { width: 100%; margin: 5px 0; border: 0; border-top: 1px solid var(--border-subtle); }
kbd { color: var(--text-muted); font-family: inherit; font-size:var(--type-caption); }
.check { color: var(--accent); }
.top-spacer { flex: 1; }
.release-pill { padding: 3px 8px; border: 1px solid var(--border-subtle); border-radius: 999px; color: var(--text-muted); font-size:var(--type-caption); white-space:nowrap }
.safe-pill{padding:3px 8px;border:1px solid var(--warning);border-radius:999px;color:var(--warning);font-size:var(--type-caption)}
.dirty-pill{padding:3px 8px;border:1px solid color-mix(in srgb,var(--warning) 60%,var(--border-subtle));border-radius:999px;color:var(--warning);font-size:var(--type-caption);white-space:nowrap}
@media(max-width:980px){.release-pill{display:none}.top-bar{gap:7px}.menu-item>button{padding-inline:7px}}
@media(max-width:720px){.brand>span:last-child{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.brand{gap:0}.top-bar{padding-inline:7px}.menu-container{min-width:0;overflow-x:auto;scrollbar-width:none}.menu-container::-webkit-scrollbar{display:none}}
.menu-enter-active, .menu-leave-active { transition: opacity 130ms ease, transform 130ms ease; transform-origin: top left; }
.menu-enter-from, .menu-leave-to { opacity: 0; transform: translateY(-4px) scale(.98); }
</style>
