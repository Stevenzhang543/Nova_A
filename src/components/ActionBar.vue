<template>
  <div class="actionbar" role="toolbar">
    <button :class="{ active: state.playMode === 'playing' }" :title="t('play')" @click="playSimulation">
      <img src="../assets/icons/play.svg" :alt="t('play')">
    </button>
    <button :class="{ active: state.playMode === 'paused' }" :disabled="state.playMode === 'editing'" :title="t('pause')" @click="pauseSimulation">
      <span aria-hidden="true">Ⅱ</span><span class="sr-only">{{ t('pause') }}</span>
    </button>
    <button class="step-button" :title="t('step')" @click="stepSimulation">
      <span aria-hidden="true">›|</span><span class="sr-only">{{ t('step') }}</span>
    </button>
    <button :disabled="state.playMode === 'editing'" :title="t('stop')" @click="restoreSimulation">
      <img src="../assets/icons/stop.svg" :alt="t('stop')">
    </button>
    <span class="mode-label">{{ t(state.playMode === 'playing' ? 'playMode' : state.playMode === 'paused' ? 'runtimePaused' : 'editingMode') }}</span>
  </div>
</template>

<script setup lang="ts">
import { t } from '../i18n'
import { addEditorLog, editorState } from '../store/editor'
import { physicsState as state, stopPlayMode, toggleSimulation } from '../store/physics'
import { gameplayRuntime } from '../runtime/GameplayRuntime'

async function ensurePhysics(): Promise<boolean> {
  editorState.statusText = t('physicsLoading')
  await state.world.wasmReady
  if (!state.world.wasmError) return true
  editorState.statusText = t('physicsUnavailable', { message: state.world.wasmError.message })
  return false
}

async function playSimulation() {
  if (!await ensurePhysics()) return
  toggleSimulation(true)
  gameplayRuntime.beginSession()
  editorState.statusText = t('physicsRunning')
  addEditorLog(t('physicsRunning'), 'Physics')
}

function pauseSimulation() {
  toggleSimulation(false)
  editorState.statusText = t('physicsPaused')
  addEditorLog(t('runtimePaused'), 'Physics')
}

async function stepSimulation() {
  if (!await ensurePhysics()) return
  if (state.playMode === 'editing') { toggleSimulation(true); toggleSimulation(false) }
  gameplayRuntime.stepOnce()
  editorState.statusText = t('physicsStepped')
  addEditorLog(t('physicsStepped'), 'Physics')
}

function restoreSimulation() {
  gameplayRuntime.stopSession()
  stopPlayMode()
  editorState.statusText = t('simulationRestored')
  addEditorLog(t('simulationRestored'), 'Physics')
}
</script>

<style scoped>
.actionbar { position: absolute; top: 4px; left: 50%; z-index: 320; transform: translateX(-50%); height: 34px; padding: 3px; display: flex; align-items: center; gap: 3px; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-2); box-shadow: var(--shadow-sm); }
button { width: 32px; height: 26px; display: grid; place-items: center; border: 1px solid transparent; border-radius: 7px; background: transparent; }
button:hover { background: var(--surface-hover); }
button.active { border-color: color-mix(in srgb, var(--accent) 24%, transparent); background: var(--accent-soft); }
button img { width: 15px; height: 15px; opacity: .7; filter: var(--icon-filter); }
button.active img { opacity: 1; filter: var(--icon-filter) drop-shadow(0 0 5px var(--accent)); }
.step-button span[aria-hidden='true'] { color: var(--text-secondary); font-size: 17px; font-weight: 700; letter-spacing: -3px; transform: translateX(-1px); }
.mode-label { min-width: 62px; padding: 0 7px 0 5px; color: var(--text-muted); font-size: 9px; white-space: nowrap; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>
