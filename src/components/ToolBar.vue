<template>
  <div class="toolbar" role="toolbar" :aria-label="t('sceneView')">
    <button
      v-for="tool in transformTools"
      :key="tool.id"
      :class="{ active: state.activeTool === tool.id }"
      :title="`${t(tool.title)} (${tool.key.toUpperCase()})`"
      @click="state.activeTool = tool.id"
    >
      <span class="tool-key">{{ tool.key.toUpperCase() }}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path v-if="tool.id === 'select'" d="M5 3.5 18.2 13l-6.1 1.1-3.2 5.4Z" />
        <path v-else-if="tool.id === 'move'" d="M12 2v20M2 12h20m-10-10-3 3m3-3 3 3M22 12l-3-3m3 3-3 3M12 22l-3-3m3 3 3-3M2 12l3-3m-3 3 3 3" />
        <path v-else-if="tool.id === 'rotate'" d="M19 7V3m0 0h-4m4 0-3.1 3.1A8 8 0 1 0 20 13" />
        <path v-else d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5M8 8l8 8M16 8l-8 8" />
      </svg>
    </button>

    <i class="divider"></i>

    <button
      v-for="tool in shapeTools"
      :key="tool.id"
      :class="{ active: state.activeTool === tool.id }"
      :title="t(tool.title)"
      @click="state.activeTool = tool.id"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle v-if="tool.id === 'circle'" cx="12" cy="12" r="8" />
        <path v-else-if="tool.id === 'triangle'" d="M12 3.75 21 20H3Z" />
        <rect v-else x="3.5" y="4.5" width="17" height="15" rx="1" />
      </svg>
    </button>

    <i class="divider"></i>

    <div class="segmented" :aria-label="t('worldSpace')">
      <button :class="{ active: estate.transformSpace === 'local' }" @click="estate.transformSpace = 'local'">{{ t('localSpace') }}</button>
      <button :class="{ active: estate.transformSpace === 'world' }" @click="estate.transformSpace = 'world'">{{ t('worldSpace') }}</button>
    </div>
    <div class="segmented" :aria-label="t('pivotMode')">
      <button :class="{ active: estate.pivotMode === 'pivot' }" @click="estate.pivotMode = 'pivot'">{{ t('pivotMode') }}</button>
      <button :class="{ active: estate.pivotMode === 'center' }" @click="estate.pivotMode = 'center'">{{ t('centerMode') }}</button>
    </div>
    <button class="snap" :class="{ active: prefs.snapToGrid }" :title="t('snapToGrid')" @click="prefs.snapToGrid = !prefs.snapToGrid">
      # {{ t('gridSize') }}
    </button>
    <button class="snap" :class="{ active: estate.angleSnapEnabled }" :title="t('angleSnap')" @click="estate.angleSnapEnabled = !estate.angleSnapEnabled">
      ∠ {{ estate.angleSnapDegrees }}°
    </button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { t } from '../i18n'
import { editorState as estate } from '../store/editor'
import { physicsState as state } from '../store/physics'
import { preferencesState as prefs } from '../store/preferences'

const transformTools = [
  { id: 'select' as const, title: 'selectTool' as const, key: 'q' },
  { id: 'move' as const, title: 'moveTool' as const, key: 'w' },
  { id: 'rotate' as const, title: 'rotateTool' as const, key: 'e' },
  { id: 'scale' as const, title: 'scaleTool' as const, key: 'r' }
]
const shapeTools = [
  { id: 'triangle' as const, title: 'drawTriangle' as const },
  { id: 'circle' as const, title: 'drawCircle' as const },
  { id: 'rectangle' as const, title: 'drawRectangle' as const }
]

function handleShortcut(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  const tag = (event.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  const tool = transformTools.find(candidate => candidate.key === event.key.toLowerCase())
  if (!tool) return
  state.activeTool = tool.id
  event.preventDefault()
}

onMounted(() => window.addEventListener('keydown', handleShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', handleShortcut))
</script>

<style scoped>
.toolbar { min-height: 43px; width: 100%; padding: 5px max(8px, calc((100vw - 760px) / 2)); display: flex; align-items: center; justify-content: center; gap: 4px; overflow-x: auto; overflow-y: hidden; border-bottom: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface-1) 96%, var(--bg-base)); scrollbar-width: thin; }
button { position: relative; min-width: 36px; height: 34px; padding: 0 8px; display: grid; place-items: center; border: 1px solid transparent; border-radius: 8px; color: var(--text-muted); background: transparent; font-size:11px; }
button svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
button:hover { color: var(--text-primary); background: var(--surface-hover); }
button.active { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 34%, transparent); background: var(--accent-soft); }
.tool-key { position: absolute; right: 3px; bottom: 1px; color: var(--text-muted); font-size:11px; font-weight: 700; }
.divider { width: 1px; height: 23px; margin: 0 2px; background: var(--border-subtle); }
.segmented { padding: 2px; display: flex; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-2); }
.segmented button { min-width: auto; height: 25px; padding: 0 7px; }
.snap { white-space: nowrap; }
@media (max-width: 1120px) { .segmented { display: none; } .toolbar { justify-content: flex-start; padding-inline: 8px; } }
@media (max-width: 760px) { .snap { display: none; } }
</style>
