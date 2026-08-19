<template>
  <div class="toolbar" role="toolbar" :aria-label="t('sceneView')">
    <div class="toolbar-content">
      <button class="create-object" :title="t('createObject')" @click="estate.createObjectPaletteOpen = true">＋ <span>{{ t('createObject') }}</span></button>
      <i class="divider"></i>
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

    <button v-for="tool in authoringTools" :key="tool.id" :class="{ active: state.activeTool === tool.id }" :title="t(tool.title)" @click="state.activeTool = tool.id">
      <span class="authoring-icon">{{ tool.icon }}</span>
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
    <details class="tool-menu">
      <summary>{{ t('transformActions') }}</summary>
      <div class="menu-popover action-grid">
        <button @click="alignSelection('left')">{{ t('alignLeft') }}</button><button @click="alignSelection('center-x')">{{ t('alignCenterX') }}</button><button @click="alignSelection('right')">{{ t('alignRight') }}</button>
        <button @click="alignSelection('top')">{{ t('alignTop') }}</button><button @click="alignSelection('center-y')">{{ t('alignCenterY') }}</button><button @click="alignSelection('bottom')">{{ t('alignBottom') }}</button>
        <button @click="distributeSelection('x')">{{ t('distributeHorizontal') }}</button><button @click="distributeSelection('y')">{{ t('distributeVertical') }}</button>
        <button @click="mirrorSelection('x')">{{ t('mirrorHorizontal') }}</button><button @click="mirrorSelection('y')">{{ t('mirrorVertical') }}</button>
        <button @click="rotateSelection90(false)">↶ 90°</button><button @click="rotateSelection90(true)">↷ 90°</button>
        <button @click="requestViewport('frame')">{{ t('frameSelection') }}</button><button @click="toggleIsolateSelection">{{ authoringState.isolateActive ? t('exitIsolation') : t('isolateSelection') }}</button>
        <button @click="requestViewport('focus-camera')">{{ t('focusCamera') }}</button><button @click="groupSelection">{{ t('groupSelection') }}</button>
      </div>
    </details>
    <details class="tool-menu snap-menu">
      <summary>{{ t('snapping') }}</summary>
      <div class="menu-popover checks">
        <label v-for="snap in snapOptions" :key="snap.key"><input v-model="authoringState.snap[snap.key]" type="checkbox">{{ t(snap.label) }}</label>
      </div>
    </details>
      <label class="camera-overlay"><span>{{ t('cameraOverlay') }}</span><select v-model="authoringState.cameraOverlay"><option v-for="ratio in overlayOptions" :key="ratio" :value="ratio">{{ ratio }}</option></select></label><div v-if="authoringState.cameraOverlay === 'Custom'" class="custom-resolution"><input v-model.number="authoringState.cameraResolution.width" type="number" min="1"><span>×</span><input v-model.number="authoringState.cameraResolution.height" type="number" min="1"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { t } from '../i18n'
import { editorState as estate } from '../store/editor'
import { physicsState as state } from '../store/physics'
import { preferencesState as prefs } from '../store/preferences'
import { alignSelection, authoringState, distributeSelection, groupSelection, mirrorSelection, requestViewport, rotateSelection90, toggleIsolateSelection } from '../editor/authoring2d'

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
const authoringTools = [
  { id: 'pivot' as const, title: 'pivotTool', icon: '⊙' }, { id: 'rect' as const, title: 'rectTool', icon: '⌗' },
  { id: 'path' as const, title: 'pathPointTool', icon: '⌁' }, { id: 'polygon' as const, title: 'polygonPointTool', icon: '⬡' },
  { id: 'collider' as const, title: 'colliderTool', icon: '◎' }, { id: 'measure' as const, title: 'measureTool', icon: '⌇' }
]
const snapOptions = [
  { key: 'grid' as const, label: 'gridSnap' }, { key: 'pixel' as const, label: 'pixelSnap' }, { key: 'vertex' as const, label: 'vertexSnap' },
  { key: 'edge' as const, label: 'edgeSnap' }, { key: 'center' as const, label: 'centerSnap' }, { key: 'object' as const, label: 'objectSnap' }, { key: 'angle' as const, label: 'angleSnap' }
]
const overlayOptions = ['Off', '16:9', '16:10', '4:3', '9:16', 'Custom'] as const

function handleShortcut(event: KeyboardEvent) {
  if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'a') { estate.createObjectPaletteOpen = true; event.preventDefault(); return }
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
.toolbar { min-height: 43px; width: 100%; padding: 5px 8px; display: block; overflow-x: auto; overflow-y: hidden; border-bottom: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface-1) 96%, var(--bg-base)); scrollbar-width: thin; }
.toolbar-content { width: max-content; min-width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px; }
button { position: relative; min-width: 36px; height: 34px; padding: 0 8px; display: grid; place-items: center; flex: 0 0 auto; border: 1px solid transparent; border-radius: 8px; color: var(--text-muted); background: transparent; font-size:11px; }
button svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
button:hover { color: var(--text-primary); background: var(--surface-hover); }
button.active { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 34%, transparent); background: var(--accent-soft); }
.tool-key { position: absolute; right: 3px; bottom: 1px; color: var(--text-muted); font-size:11px; font-weight: 700; }
.divider { width: 1px; height: 23px; margin: 0 2px; flex: 0 0 auto; background: var(--border-subtle); }
.segmented { padding: 2px; display: flex; flex: 0 0 auto; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-2); }
.segmented button { min-width: max-content; height: 25px; padding: 0 8px; white-space: nowrap; writing-mode: horizontal-tb; }
.snap { white-space: nowrap; }
.create-object{display:flex;gap:4px;white-space:nowrap;writing-mode:horizontal-tb;color:var(--accent);border-color:color-mix(in srgb,var(--accent) 34%,transparent);background:var(--accent-soft)}.authoring-icon{font-size:16px}.tool-menu{position:relative;flex:0 0 auto}.tool-menu summary{height:31px;padding:0 9px;display:flex;align-items:center;list-style:none;white-space:nowrap;writing-mode:horizontal-tb;cursor:pointer;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-muted);font-size:11px;background:var(--surface-2)}.tool-menu summary::-webkit-details-marker{display:none}.menu-popover{position:fixed;z-index:1200;margin-top:5px;padding:7px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-1);box-shadow:0 14px 34px rgba(0,0,0,.3)}.action-grid{width:280px;display:grid;grid-template-columns:1fr 1fr;gap:4px}.action-grid button{min-width:0;height:29px;display:block;text-align:left}.checks{width:180px;display:grid;gap:2px}.checks label{min-height:28px;padding:0 7px;display:flex;align-items:center;gap:8px;border-radius:6px;color:var(--text-secondary);font-size:11px}.checks label:hover{background:var(--surface-hover)}.camera-overlay{height:31px;padding:0 5px 0 9px;display:flex;align-items:center;gap:5px;flex:0 0 auto;white-space:nowrap;writing-mode:horizontal-tb;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-muted);font-size:11px;background:var(--surface-2)}.camera-overlay select{height:24px;min-height:24px;padding:0 4px;border:0;background:transparent}
.custom-resolution{height:31px;display:flex;align-items:center;gap:2px;flex:0 0 auto}.custom-resolution input{width:55px;min-height:27px;padding:0 4px}.custom-resolution span{color:var(--text-muted);font-size:11px}
@media (max-width: 1120px) { .segmented { display: none; } .toolbar-content { justify-content: flex-start; } }
@media (max-width: 900px) { .camera-overlay,.create-object span { display:none } }
@media (max-width: 760px) { .snap { display: none; } }
</style>
