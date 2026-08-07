<template>
  <div class="actionbar" role="toolbar">
    <button :class="{ active: state.simulationRunning }" :title="t('playPhysics')" @click="playSimulation">
      <img src="../assets/icons/play.svg" :alt="t('playPhysics')">
    </button>
    <button :class="{ active: !state.simulationRunning }" :title="t('pausePhysics')" @click="pauseSimulation">
      <img src="../assets/icons/stop.svg" :alt="t('pausePhysics')">
    </button>
    <button class="step-button" :title="t('singlePhysicsStep')" @click="stepSimulation">
      <span aria-hidden="true">›|</span><span class="sr-only">{{ t('singlePhysicsStep') }}</span>
    </button>
    <i></i>
    <button :title="t('resetSimulation')" @click="restoreSimulation">
      <img src="../assets/icons/reset.svg" :alt="t('resetSimulation')">
    </button>
  </div>
</template>

<script setup lang="ts">
import { t } from '../i18n'
import { editorState } from '../store/editor'
import { physicsState as state, resetSimulation, singleStepSimulation, toggleSimulation } from '../store/physics'

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
  editorState.statusText = t('physicsRunning')
}

function pauseSimulation() {
  toggleSimulation(false)
  editorState.statusText = t('physicsPaused')
}

async function stepSimulation() {
  if (!await ensurePhysics()) return
  singleStepSimulation()
  editorState.statusText = t('physicsStepped')
}

function restoreSimulation() {
  resetSimulation()
  editorState.statusText = t('simulationRestored')
}
</script>

<style scoped>
.actionbar { position: absolute; top: 54px; left: calc(50% + 34px); z-index: 170; transform: translateX(-50%); padding: 5px; display: flex; align-items: center; gap: 4px; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-1); backdrop-filter: var(--glass-blur); box-shadow: var(--shadow-sm); }
button { width: 39px; height: 32px; display: grid; place-items: center; border: 1px solid transparent; border-radius: 9px; background: transparent; }
button:hover { background: var(--surface-hover); }
button.active { border-color: color-mix(in srgb, var(--accent) 24%, transparent); background: var(--accent-soft); }
button img { width: 15px; height: 15px; opacity: .7; filter: var(--icon-filter); }
button.active img { opacity: 1; filter: var(--icon-filter) drop-shadow(0 0 5px var(--accent)); }
.step-button span[aria-hidden='true'] { color: var(--text-secondary); font-size: 17px; font-weight: 700; letter-spacing: -3px; transform: translateX(-1px); }
.actionbar > i { width: 1px; height: 21px; margin: 0 2px; background: var(--border-subtle); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>
