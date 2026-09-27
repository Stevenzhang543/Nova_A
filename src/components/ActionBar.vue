<!-- 仿真操作栏：管理物理加载、场景预检和播放会话。 -->
<template>
  <div class="actionbar" role="toolbar" :aria-label="t('play')">
    <button :class="{ active: state.playMode === 'playing' }" :aria-label="t('play')" :aria-pressed="state.playMode === 'playing'" :title="t('play')" @click="playSimulation">
      <EditorIcon name="play" />
    </button>
    <button :class="{ active: state.playMode === 'paused' }" :disabled="state.playMode === 'editing'" :title="t('pause')" :aria-label="t('pause')" :aria-pressed="state.playMode === 'paused'" @click="pauseSimulation">
      <EditorIcon name="pause" />
    </button>
    <button class="step-button" :title="t('step')" :aria-label="t('step')" @click="stepSimulation">
      <EditorIcon name="step" />
    </button>
    <button :disabled="state.playMode === 'editing'" :aria-label="t('stop')" :title="t('stop')" @click="restoreSimulation">
      <EditorIcon name="stop" />
    </button>
    <span class="mode-label" role="status">{{ t(state.playMode === 'playing' ? 'playMode' : state.playMode === 'paused' ? 'runtimePaused' : 'editingMode') }}</span>
  </div>
</template>

<script setup lang="ts">
import { t } from '../i18n'
import EditorIcon from './EditorIcon.vue'
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
.actionbar { min-width: 0; min-height: 42px; padding: 3px 8px; display: flex; align-items: center; justify-content: center; gap: 2px; border-left: 1px solid var(--border-subtle); background: var(--surface-1); }
button { flex: 0 0 auto; width: 34px; min-height: 34px; padding: 0; display: grid; place-items: center; border: 1px solid transparent; border-radius: 4px; color: var(--text-secondary); background: transparent; line-height: 1; }
button:hover { color: var(--text-primary); background: var(--surface-hover); }
button.active { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 35%, transparent); background: var(--accent-soft); }
button:disabled { opacity: .4; }
.step-button { margin-right: 3px; }
.mode-label { min-width: 0; max-width: 110px; margin-left: 4px; padding-left: 9px; border-left: 1px solid var(--border-subtle); overflow: hidden; color: var(--text-muted); font-size: var(--type-caption); text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 1100px) { .mode-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); } }
</style>
