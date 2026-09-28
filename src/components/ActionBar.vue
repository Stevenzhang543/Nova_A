<!-- 仿真操作栏：管理物理加载、场景预检和播放会话。 -->
<template>
  <div class="actionbar" role="toolbar" :aria-label="t('play')">
    <UiButton :class="{ active: state.playMode === 'playing' }" :aria-label="t('play')" :aria-pressed="state.playMode === 'playing'" :label="t('play')" @click="playSimulation" icon="play" />
    <UiButton :class="{ active: state.playMode === 'paused' }" :disabled="state.playMode === 'editing'" :label="t('pause')" :aria-label="t('pause')" :aria-pressed="state.playMode === 'paused'" @click="pauseSimulation" icon="pause" />
    <UiButton class="step-button" :label="t('step')" :aria-label="t('step')" @click="stepSimulation" icon="step" />
    <UiButton :disabled="state.playMode === 'editing'" :aria-label="t('stop')" :label="t('stop')" @click="restoreSimulation" icon="stop" />
    <span class="mode-label" role="status">{{ t(state.playMode === 'playing' ? 'playMode' : state.playMode === 'paused' ? 'runtimePaused' : 'editingMode') }}</span>
  </div>
</template>

<script setup lang="ts">
import { t } from '../i18n'
import UiButton from '../ui/components/UiButton.vue'
import { addEditorLog, editorState } from '../store/editor'
import { physicsState as state, stopPlayMode, toggleSimulation } from '../store/physics'
import { gameplayRuntime } from '../runtime/GameplayRuntime'
import { simulationPreflight as inspectSimulationPreflight } from '../runtime/simulationAuthoring26'

/** 等待物理 WASM 初始化并显示状态；失败时报告原因并阻止启动。 */ async function ensurePhysics(): Promise<boolean> {
  editorState.statusText = t('physicsLoading')
  await state.world.wasmReady
  if (!state.world.wasmError) return true
  editorState.statusText = t('physicsUnavailable', { message: state.world.wasmError.message })
  return false
}

/** 检查仿真就绪情况，阻断问题禁止启动，需复核问题写入日志。 */ function simulationPreflight(): boolean {
  const { blocked, reviews } = inspectSimulationPreflight(state.world.entities, state.world.connections, state.globalSettings)
  if (blocked.length) {
    const summary = `${t('simulationReadiness')}: ${t('blocked')} (${blocked.length}) · ${blocked.map(/* 返回 issue.code 的当前值。 */ issue => issue.code).join(', ')}`
    editorState.statusText = summary
    addEditorLog(summary, 'Physics')
    return false
  }
  if (reviews.length) addEditorLog(`${t('simulationReadiness')}: ${t('mediaStatus_review')} (${reviews.length}) · ${reviews.map(/* 返回 issue.code 的当前值。 */ issue => issue.code).join(', ')}`, 'Physics')
  return true
}

/** 加载与预检通过后启动仿真和游戏会话，并更新状态日志。 */ async function playSimulation() {
  if (!await ensurePhysics()) return
  if (!simulationPreflight()) return
  if (!toggleSimulation(true)) return
  gameplayRuntime.beginSession()
  editorState.statusText = t('physicsRunning')
  addEditorLog(t('physicsRunning'), 'Physics')
}

/** 暂停仿真并记录状态。 */ function pauseSimulation() {
  toggleSimulation(false)
  editorState.statusText = t('physicsPaused')
  addEditorLog(t('runtimePaused'), 'Physics')
}

/** 加载与预检通过后创建必要的暂停会话并执行一次游戏单步。 */ async function stepSimulation() {
  if (!await ensurePhysics()) return
  if (!simulationPreflight()) return
  if (state.playMode === 'editing') { if (!toggleSimulation(true)) return; toggleSimulation(false) }
  gameplayRuntime.stepOnce()
  editorState.statusText = t('physicsStepped')
  addEditorLog(t('physicsStepped'), 'Physics')
}

/** 停止会话、退出播放模式并记录场景恢复状态。 */ function restoreSimulation() {
  gameplayRuntime.stopSession()
  stopPlayMode()
  editorState.statusText = t('simulationRestored')
  addEditorLog(t('simulationRestored'), 'Physics')
}
</script>

<style scoped>
.actionbar { flex: 0 0 auto; min-width: max-content; display:flex; align-items:center; gap:var(--ui-space-micro); padding-inline:var(--ui-space-xs); border-left:1px solid var(--border-subtle); }
.mode-label { max-width:12ch; margin-inline-start:var(--ui-space-xs); color:var(--text-muted); font-size:var(--type-caption); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
@media(max-width:1100px){.mode-label{position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip-path:inset(50%)}}
</style>
