<template>
  <ProjectManager v-if="mode === 'editor' && projectManager.visible" />
  <EditorLayout v-else-if="mode === 'editor'" />
  <PlayerApp v-else-if="mode === 'player'" />
  <div v-else class="app-loading">Nova_A</div>
  <ManualViewer />
  <StudioStatusDialog />
  <ErrorRecovery />
  <RecoveryCenter />
  <WorkspaceManager />
  <ShortcutEditor />
  <UndoHistoryPanel />
  <ExternalChangeDialog />
  <EditorFeedback />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import EditorLayout from './layout/EditorLayout.vue'
import PlayerApp from './PlayerApp.vue'
import ProjectManager from './components/ProjectManager.vue'
import ManualViewer from './components/ManualViewer.vue'
import StudioStatusDialog from './components/StudioStatusDialog.vue'
import ErrorRecovery from './components/ErrorRecovery.vue'
import RecoveryCenter from './components/RecoveryCenter.vue'
import WorkspaceManager from './components/WorkspaceManager.vue'
import ShortcutEditor from './components/ShortcutEditor.vue'
import UndoHistoryPanel from './components/UndoHistoryPanel.vue'
import ExternalChangeDialog from './components/ExternalChangeDialog.vue'
import EditorFeedback from './components/EditorFeedback.vue'
import { projectManagerState as projectManager } from './projects/projectManager'
import { editorState } from './store/editor'
import { loadProject, synchronizeHistoryBaseline } from './store/physics'
import { applySafeModeRestrictions, initializeRecoverySession } from './runtime/recovery'
import { disposeEditorWindow, initializeEditorWindow, toggleEditorFullscreen } from './runtime/editorWindow'
import { navigateHistory } from './editor/workspaces'
import { shortcutMatches } from './editor/shortcuts'

const mode = ref<'loading' | 'editor' | 'player'>('loading')
function handleGlobalShortcut(event: KeyboardEvent) {
  if (shortcutMatches(event, 'fullscreen')) { event.preventDefault(); void toggleEditorFullscreen() }
  else if (shortcutMatches(event, 'navigateBack')) { event.preventDefault(); navigateHistory('back') }
  else if (shortcutMatches(event, 'navigateForward')) { event.preventDefault(); navigateHistory('forward') }
  else if (shortcutMatches(event, 'shortcutEditor')) { event.preventDefault(); editorState.shortcutEditorOpen = !editorState.shortcutEditorOpen }
  else if (shortcutMatches(event, 'workspaceManager')) { event.preventDefault(); editorState.workspaceManagerOpen = !editorState.workspaceManagerOpen }
  else if (shortcutMatches(event, 'statusCenter')) { event.preventDefault(); editorState.statusCenterOpen = !editorState.statusCenterOpen }
}
// Register before asynchronous native/recovery initialization so startup cannot
// swallow F11 or another global editor shortcut.
window.addEventListener('keydown', handleGlobalShortcut)
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
  initializeRecoverySession()
  try { const source = sessionStorage.getItem('nova-a-safe-recovery-source'); if (source && loadProject(source)) { sessionStorage.removeItem('nova-a-safe-recovery-source'); projectManager.visible = false; synchronizeHistoryBaseline() } } catch { /* Recovery Center can still restore persisted snapshots. */ }
  await applySafeModeRestrictions()
  await initializeEditorWindow()
}
onBeforeUnmount(() => { window.removeEventListener('keydown', handleGlobalShortcut); disposeEditorWindow() })
</script>

<style>.app-loading { height: 100vh; display: grid; place-items: center; color: var(--text-muted); background: var(--bg-base); font-weight: 700; }</style>
