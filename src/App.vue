<template>
  <template v-if="mode === 'editor'">
    <ProjectManager v-if="projectManager.visible" />
    <EditorLayout v-else />
    <ManualViewer v-if="manualViewerState.visible" />
    <StudioStatusDialog v-if="studioStatusState.visible" />
    <ErrorRecovery v-if="faultCenterState.activeFatal" />
    <RecoveryCenter v-if="recoveryState.visible" />
    <WorkspaceManager v-if="editorState.workspaceManagerOpen" />
    <ShortcutEditor v-if="editorState.shortcutEditorOpen" />
    <UndoHistoryPanel v-if="editorState.undoHistoryOpen" />
    <ExternalChangeDialog v-if="externalChangeState.visible" />
    <EditorFeedback />
  </template>
  <PlayerApp v-else-if="mode === 'player'" />
  <div v-else class="app-loading">Nova_A</div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import ProjectManager from './components/ProjectManager.vue'
import EditorFeedback from './components/EditorFeedback.vue'
import { projectManagerState as projectManager } from './projects/projectManager'
import { editorState } from './store/editor'
import { applySafeModeRestrictions, initializeRecoverySession } from './runtime/recovery'
import { disposeEditorWindow, initializeEditorWindow, toggleEditorFullscreen } from './runtime/editorWindow'
import { navigateHistory } from './editor/workspaces'
import { shortcutMatches } from './editor/shortcuts'
import { installStableControlRegistry } from './runtime/controlRegistry'
import { installProjectMutationRouter } from './runtime/projectMutationRouter'
import { manualViewerState } from './runtime/openManual'
import { studioStatusState } from './runtime/stableContracts'
import { faultCenterState } from './runtime/faultCenter'
import { recoveryState } from './runtime/recovery'
import { externalChangeState } from './runtime/projectExternalChanges'

// The launcher and exported player no longer parse the complete editor workspace
// up front. Each mode retains the same UI and animations after its chunk loads.
const EditorLayout = defineAsyncComponent(() => import('./layout/EditorLayout.vue'))
const PlayerApp = defineAsyncComponent(() => import('./PlayerApp.vue'))
const ManualViewer = defineAsyncComponent(() => import('./components/ManualViewer.vue'))
const StudioStatusDialog = defineAsyncComponent(() => import('./components/StudioStatusDialog.vue'))
const ErrorRecovery = defineAsyncComponent(() => import('./components/ErrorRecovery.vue'))
const RecoveryCenter = defineAsyncComponent(() => import('./components/RecoveryCenter.vue'))
const WorkspaceManager = defineAsyncComponent(() => import('./components/WorkspaceManager.vue'))
const ShortcutEditor = defineAsyncComponent(() => import('./components/ShortcutEditor.vue'))
const UndoHistoryPanel = defineAsyncComponent(() => import('./components/UndoHistoryPanel.vue'))
const ExternalChangeDialog = defineAsyncComponent(() => import('./components/ExternalChangeDialog.vue'))
const mode = ref<'loading' | 'editor' | 'player'>('loading')
let editorShortcutsInstalled = false
function handleGlobalShortcut(event: KeyboardEvent) {
  if (event.defaultPrevented) return
  if (shortcutMatches(event, 'fullscreen')) { event.preventDefault(); void toggleEditorFullscreen() }
  else if (shortcutMatches(event, 'navigateBack')) { event.preventDefault(); navigateHistory('back') }
  else if (shortcutMatches(event, 'navigateForward')) { event.preventDefault(); navigateHistory('forward') }
  else if (shortcutMatches(event, 'shortcutEditor')) { event.preventDefault(); editorState.shortcutEditorOpen = !editorState.shortcutEditorOpen }
  else if (shortcutMatches(event, 'workspaceManager')) { event.preventDefault(); editorState.workspaceManagerOpen = !editorState.workspaceManagerOpen }
  else if (shortcutMatches(event, 'statusCenter')) { event.preventDefault(); editorState.statusCenterOpen = !editorState.statusCenterOpen }
}
onMounted(async () => {
  if (new URLSearchParams(location.search).get('player') === '1') { mode.value = 'player'; return }
  if ('__TAURI_INTERNALS__' in window) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      mode.value = await invoke<boolean>('runtime_mode') ? 'player' : 'editor'
      if (mode.value === 'editor') await prepareEditor()
      return
    } catch { /* The editor remains available if runtime detection fails. */ }
  }
  mode.value = 'editor'
  await prepareEditor()
})
async function prepareEditor() {
  installStableControlRegistry()
  installProjectMutationRouter()
  // Native window placement is intentionally first: recovery scanning and
  // workspace initialization must not leave the launcher visibly unmaximized.
  await initializeEditorWindow()
  if (!editorShortcutsInstalled) {
    window.addEventListener('keydown', handleGlobalShortcut)
    editorShortcutsInstalled = true
  }
  initializeRecoverySession()
  try {
    const source = sessionStorage.getItem('nova-a-safe-recovery-source')
    if (source) {
      const { loadProject, synchronizeHistoryBaseline } = await import('./store/physics')
      if (loadProject(source)) { sessionStorage.removeItem('nova-a-safe-recovery-source'); projectManager.visible = false; synchronizeHistoryBaseline() }
    }
  } catch { /* Recovery Center can still restore persisted snapshots. */ }
  await applySafeModeRestrictions()
}
onBeforeUnmount(() => { if (editorShortcutsInstalled) window.removeEventListener('keydown', handleGlobalShortcut); disposeEditorWindow() })
</script>

<style>.app-loading { height: 100vh; display: grid; place-items: center; color: var(--text-muted); background: var(--bg-base); font-weight: 700; }</style>
