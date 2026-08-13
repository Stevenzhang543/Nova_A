<template>
  <main class="player-root">
    <WorldCanvas v-if="ready" />
    <section v-else class="player-status" :class="{ error: errorMessage }">
      <span class="player-mark">N</span>
      <strong>Nova Player</strong>
      <p>{{ errorMessage ? t('playerLoadFailed', { message: errorMessage }) : t('playerLoading') }}</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import WorldCanvas from './components/WorldCanvas.vue'
import { t } from './i18n'
import { gameplayRuntime } from './runtime/GameplayRuntime'
import { projectJsonFromNovaPak } from './runtime/novaPak'
import { editorState } from './store/editor'
import { loadProject, physicsState, toggleSimulation } from './store/physics'

const ready = ref(false), errorMessage = ref('')

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

async function loadPackageBytes(): Promise<Uint8Array> {
  if ('__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core')
    const encoded = await invoke<string | null>('runtime_package')
    if (!encoded) throw new Error('game.nova-pak was not found beside or inside Nova Player')
    return decodeBase64(encoded)
  }
  const response = await fetch('./game.nova-pak', { cache: 'no-store' })
  if (!response.ok) throw new Error(`game.nova-pak returned HTTP ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

onMounted(async () => {
  try {
    const project = await projectJsonFromNovaPak(await loadPackageBytes())
    if (!loadProject(project)) throw new Error(editorState.statusText)
    editorState.currentPage = 'game'
    await physicsState.world.wasmReady
    if (physicsState.world.wasmError) throw physicsState.world.wasmError
    toggleSimulation(true)
    gameplayRuntime.beginSession()
    document.title = 'Nova Player'
    ready.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
})
</script>

<style scoped>
.player-root { width: 100vw; height: 100vh; overflow: hidden; background: var(--bg-canvas); }.player-status { width: 100%; height: 100%; display: grid; place-content: center; justify-items: center; gap: 10px; color: var(--text-primary); }.player-status p { max-width: 520px; margin: 0; color: var(--text-muted); text-align: center; }.player-status.error p { color: var(--danger); }.player-mark { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 14px; color: var(--accent-contrast); background: linear-gradient(145deg, var(--accent), var(--accent-strong)); font-size: 20px; font-weight: 800; box-shadow: var(--shadow-lg); }
</style>
