<template>
  <ProjectManager v-if="mode === 'editor' && projectManager.visible" />
  <EditorLayout v-else-if="mode === 'editor'" />
  <PlayerApp v-else-if="mode === 'player'" />
  <div v-else class="app-loading">Nova_A</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import EditorLayout from './layout/EditorLayout.vue'
import PlayerApp from './PlayerApp.vue'
import ProjectManager from './components/ProjectManager.vue'
import { projectManagerState as projectManager } from './projects/projectManager'

const mode = ref<'loading' | 'editor' | 'player'>('loading')
onMounted(async () => {
  if (new URLSearchParams(location.search).get('player') === '1') { mode.value = 'player'; return }
  if ('__TAURI_INTERNALS__' in window) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      mode.value = await invoke<boolean>('runtime_mode') ? 'player' : 'editor'
      return
    } catch { /* The editor remains available if runtime detection fails. */ }
  }
  mode.value = 'editor'
})
</script>

<style>.app-loading { height: 100vh; display: grid; place-items: center; color: var(--text-muted); background: var(--bg-base); font-weight: 700; }</style>
