<!-- 应用根组件：选择编辑器或播放器入口，加载全局窗口并初始化恢复与编辑服务。 -->
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
    <ConfirmDialog />
  </template>
  <PlayerApp v-else-if="mode === 'player'" />
  <div v-else class="app-loading">Nova_A</div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import ProjectManager from './components/ProjectManager.vue'
import EditorFeedback from './components/EditorFeedback.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import { projectManagerState as projectManager } from './projects/projectManager'
import { editorState } from './store/editor'
import { applySafeModeRestrictions, initializeRecoverySession } from './runtime/recovery'
import { disposeEditorWindow, initializeEditorWindow, toggleEditorFullscreen } from './runtime/editorWindow'
import { navigateHistory } from './editor/workspaces'
import { shortcutMatches } from './editor/shortcuts'
import { installSelectValueDetails, disposeSelectValueDetails } from './editor/selectValueDetails'
import { installStableControlRegistry } from './runtime/controlRegistry'
import { installProjectMutationRouter, disposeProjectMutationRouter } from './runtime/projectMutationRouter'
import { manualViewerState } from './runtime/openManual'
import { studioStatusState } from './runtime/stableContracts'
import { faultCenterState } from './runtime/faultCenter'
import { recoveryState } from './runtime/recovery'
import { externalChangeState } from './runtime/projectExternalChanges'

// The launcher and exported player no longer parse the complete editor workspace
// up front. Each mode retains the same UI and animations after its chunk loads.
const EditorLayout = defineAsyncComponent(/** 按需加载编辑器布局。 */ () => import('./layout/EditorLayout.vue'))
const PlayerApp = defineAsyncComponent(/** 按需加载播放器入口。 */ () => import('./PlayerApp.vue'))
const ManualViewer = defineAsyncComponent(/** 按需加载手册窗口。 */ () => import('./components/ManualViewer.vue'))
const StudioStatusDialog = defineAsyncComponent(/** 按需加载工作室状态窗口。 */ () => import('./components/StudioStatusDialog.vue'))
const ErrorRecovery = defineAsyncComponent(/** 按需加载错误恢复窗口。 */ () => import('./components/ErrorRecovery.vue'))
const RecoveryCenter = defineAsyncComponent(/** 按需加载项目恢复中心。 */ () => import('./components/RecoveryCenter.vue'))
const WorkspaceManager = defineAsyncComponent(/** 按需加载工作区管理窗口。 */ () => import('./components/WorkspaceManager.vue'))
const ShortcutEditor = defineAsyncComponent(/** 按需加载快捷键窗口。 */ () => import('./components/ShortcutEditor.vue'))
const UndoHistoryPanel = defineAsyncComponent(/** 按需加载历史面板。 */ () => import('./components/UndoHistoryPanel.vue'))
const ExternalChangeDialog = defineAsyncComponent(/** 按需加载外部变更对话框。 */ () => import('./components/ExternalChangeDialog.vue'))
const mode = ref<'loading' | 'editor' | 'player'>('loading')
let editorShortcutsInstalled = false
/** 处理未消费的全屏、历史导航及快捷键、工作区、任务状态窗口命令。 */ function handleGlobalShortcut(event: KeyboardEvent) {
  if (event.defaultPrevented) return
  if (shortcutMatches(event, 'fullscreen')) { event.preventDefault(); void toggleEditorFullscreen() }
  else if (shortcutMatches(event, 'navigateBack')) { event.preventDefault(); navigateHistory('back') }
  else if (shortcutMatches(event, 'navigateForward')) { event.preventDefault(); navigateHistory('forward') }
  else if (shortcutMatches(event, 'shortcutEditor')) { event.preventDefault(); editorState.shortcutEditorOpen = !editorState.shortcutEditorOpen }
  else if (shortcutMatches(event, 'workspaceManager')) { event.preventDefault(); editorState.workspaceManagerOpen = !editorState.workspaceManagerOpen }
  else if (shortcutMatches(event, 'statusCenter')) { event.preventDefault(); editorState.statusCenterOpen = !editorState.statusCenterOpen }
}
onMounted(/** 挂载时依据查询参数或原生运行模式选择入口，原生检测失败回退编辑器并初始化。 */ async () => {
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
/** 安装编辑服务，先初始化窗口，再注册快捷键与恢复会话，尝试安全恢复并应用安全模式限制。 */ async function prepareEditor() {
  installStableControlRegistry()
  installSelectValueDetails()
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
onBeforeUnmount(/** 卸载时释放选择详情、项目变更路由、快捷键及窗口服务。 */ () => { disposeSelectValueDetails(); disposeProjectMutationRouter(); if (editorShortcutsInstalled) window.removeEventListener('keydown', handleGlobalShortcut); disposeEditorWindow() })
</script>

<style>.app-loading { height: 100vh; display: grid; place-items: center; color: var(--text-muted); background: var(--bg-base); font-weight: 700; }</style>
