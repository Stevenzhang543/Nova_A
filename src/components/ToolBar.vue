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

    <details class="tool-menu authoring-menu">
      <summary><span aria-hidden="true">✦</span>{{ t('authoringTools') }}</summary>
      <div class="menu-popover authoring-popover">
        <section>
          <h3>{{ t('editTools') }}</h3>
          <div class="tool-grid">
            <button v-for="tool in authoringTools" :key="tool.id" :class="{ active: state.activeTool === tool.id }" :title="t(tool.title)" @click="state.activeTool = tool.id">
              <span class="authoring-icon" aria-hidden="true">{{ tool.icon }}</span><span>{{ t(tool.title) }}</span>
            </button>
          </div>
        </section>
        <section>
          <h3>{{ t('drawTools') }}</h3>
          <div class="tool-grid shape-grid">
            <button v-for="tool in shapeTools" :key="tool.id" :class="{ active: state.activeTool === tool.id }" :title="t(tool.title)" @click="state.activeTool = tool.id">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle v-if="tool.id === 'circle'" cx="12" cy="12" r="8" /><path v-else-if="tool.id === 'triangle'" d="M12 3.75 21 20H3Z" /><rect v-else x="3.5" y="4.5" width="17" height="15" rx="1" /></svg>
              <span>{{ t(tool.title) }}</span>
            </button>
          </div>
        </section>
      </div>
    </details>
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
        <p class="snap-explanation">{{ t('snappingExplanation') }}</p>
      </div>
    </details>
    <details class="tool-menu guide-menu">
      <summary><span aria-hidden="true">#</span>{{ t('viewportSettings') }}</summary>
      <div class="menu-popover viewport-popover">
        <section><h3>{{ t('transformReference') }}</h3>
          <div class="segmented" :aria-label="t('worldSpace')"><button :class="{ active: estate.transformSpace === 'local' }" @click="estate.transformSpace = 'local'">{{ t('localSpace') }}</button><button :class="{ active: estate.transformSpace === 'world' }" @click="estate.transformSpace = 'world'">{{ t('worldSpace') }}</button></div>
          <div class="segmented" :aria-label="t('pivotMode')"><button :class="{ active: estate.pivotMode === 'pivot' }" @click="estate.pivotMode = 'pivot'">{{ t('pivotMode') }}</button><button :class="{ active: estate.pivotMode === 'center' }" @click="estate.pivotMode = 'center'">{{ t('centerMode') }}</button></div>
        </section>
        <section class="quick-settings"><h3>{{ t('snapping') }}</h3>
          <button class="snap" :class="{ active: prefs.snapToGrid }" :title="t('snapToGrid')" @click="prefs.snapToGrid = !prefs.snapToGrid"># {{ t('snapToGrid') }}</button>
          <button class="snap" :class="{ active: estate.angleSnapEnabled }" :title="t('angleSnap')" @click="estate.angleSnapEnabled = !estate.angleSnapEnabled">∠ {{ estate.angleSnapDegrees }}°</button>
        </section>
        <section class="guide-controls"><h3>{{ t('guidesAndRulers') }}</h3>
        <label><input v-model="authoringState.rulersVisible" type="checkbox">{{ t('showRulers') }}</label>
        <label><input v-model="authoringState.guidesVisible" type="checkbox">{{ t('showGuides') }}</label>
        <label><input v-model="authoringState.guidesLocked" type="checkbox">{{ t('lockGuides') }}</label>
        <div><input v-model="guideValue" type="number" step="0.1" :placeholder="t('guidePosition')"><button @click="addGuide('horizontal')">H</button><button @click="addGuide('vertical')">V</button></div>
        <button class="clear-guides" :disabled="authoringState.guidesLocked" @click="clearViewportGuides">{{ t('clearGuides') }}</button>
        </section>
        <section><h3>{{ t('cameraOverlay') }}</h3>
          <label class="camera-overlay"><select v-model="authoringState.cameraOverlay"><option v-for="ratio in overlayOptions" :key="ratio" :value="ratio">{{ ratio }}</option></select></label>
          <div v-if="authoringState.cameraOverlay === 'Custom'" class="custom-resolution"><input v-model.number="authoringState.cameraResolution.width" type="number" min="1"><span>×</span><input v-model.number="authoringState.cameraResolution.height" type="number" min="1"></div>
        </section>
      </div>
    </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { t } from '../i18n'
import { editorState as estate } from '../store/editor'
import { physicsState as state } from '../store/physics'
import { preferencesState as prefs } from '../store/preferences'
import { addViewportGuide, alignSelection, authoringState, clearViewportGuides, distributeSelection, groupSelection, mirrorSelection, requestViewport, rotateSelection90, toggleIsolateSelection } from '../editor/authoring2d'

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
const guideValue = ref('0')
function addGuide(axis: 'horizontal' | 'vertical') { if (addViewportGuide(axis, Number(guideValue.value))) guideValue.value = '0' }

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
.toolbar { min-height: 46px; width: 100%; max-width: 100%; min-width: 0; padding: 6px 9px; display: block; overflow:visible; border-bottom: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface-1) 96%, var(--bg-base)); }
.toolbar-content { width:100%; min-width:0; display: flex; align-items: center; justify-content: center; gap: 5px; }
button { position: relative; min-width: 36px; height: 34px; padding: 0 8px; display: grid; place-items: center; flex: 0 0 auto; border: 1px solid transparent; border-radius: 9px; color: var(--text-muted); background: transparent; font-size:var(--type-caption); }
button svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
button:hover { color: var(--text-primary); background: var(--surface-hover); }
button.active { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 34%, transparent); background: var(--accent-soft); }
.tool-key { position: absolute; right: 3px; bottom: 1px; color: var(--text-muted); font-size:11px; font-weight: 700; }
.divider { width: 1px; height: 23px; margin: 0 2px; flex: 0 0 auto; background: var(--border-subtle); }
.segmented { padding: 2px; display: flex; flex: 0 0 auto; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-2); }
.segmented button { min-width: max-content; height: 28px; padding: 0 8px; white-space: nowrap; writing-mode: horizontal-tb; }
.snap { white-space: nowrap; }
.create-object{display:flex;gap:5px;white-space:nowrap;writing-mode:horizontal-tb;color:var(--creation,var(--accent));border-color:color-mix(in srgb,var(--creation,var(--accent)) 38%,transparent);background:var(--creation-soft,var(--accent-soft));font-weight:700}.authoring-icon{font-size:16px}.tool-menu{position:relative;flex:0 0 auto}.tool-menu summary{height:34px;padding:0 10px;display:flex;align-items:center;gap:6px;list-style:none;white-space:nowrap;writing-mode:horizontal-tb;cursor:pointer;border:1px solid var(--border-subtle);border-radius:9px;color:var(--text-muted);font-size:var(--type-caption);font-weight:650;background:var(--surface-2)}.tool-menu summary::-webkit-details-marker{display:none}.tool-menu[open] summary{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 40%,var(--border-strong));background:var(--accent-soft)}.menu-popover{position:absolute;z-index:1200;top:calc(100% + 6px);left:0;padding:9px;border:1px solid var(--border-strong);border-radius:var(--radius-panel);background:var(--surface-1);box-shadow:var(--shadow-float)}.menu-popover h3{margin:3px 5px 7px;color:var(--text-muted);font-size:var(--type-caption);letter-spacing:.035em;text-transform:uppercase}.action-grid{width:310px;display:grid;grid-template-columns:1fr 1fr;gap:4px}.action-grid button{min-width:0;height:32px;display:block;text-align:left}.checks{width:240px;display:grid;gap:2px}.checks label,.guide-controls label{min-height:31px;padding:0 7px;display:flex;align-items:center;gap:8px;border-radius:7px;color:var(--text-secondary);font-size:var(--type-caption)}.checks label:hover,.guide-controls label:hover{background:var(--surface-hover)}.snap-explanation{margin:5px 7px 2px;color:var(--text-muted);font-size:var(--type-caption);line-height:1.4}.authoring-popover{width:480px;display:grid;gap:10px}.tool-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}.tool-grid button{min-width:0;height:38px;padding:0 9px;display:flex;justify-content:flex-start;gap:9px;text-align:left}.tool-grid button span:last-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.shape-grid{grid-template-columns:repeat(3,1fr)}.shape-grid button{justify-content:center}.viewport-popover{right:0;left:auto;width:360px;display:grid;grid-template-columns:1fr 1fr;gap:10px}.viewport-popover section{min-width:0;padding:3px}.viewport-popover .guide-controls{grid-row:span 2}.quick-settings{display:flex;flex-wrap:wrap;gap:4px}.quick-settings h3{width:100%}.guide-controls{width:auto;display:grid;gap:3px}.guide-controls>div{display:grid;grid-template-columns:minmax(0,1fr) 34px 34px;gap:4px}.guide-controls input[type=number]{min-width:0;height:32px}.guide-controls button{min-width:0;height:32px}.clear-guides{width:100%}.camera-overlay{height:34px;padding:0 5px;display:flex;align-items:center;gap:5px;white-space:nowrap;writing-mode:horizontal-tb;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-muted);font-size:var(--type-caption);background:var(--surface-2)}.camera-overlay select{width:100%;height:27px;min-height:27px;padding:0 4px;border:0;background:transparent}
.custom-resolution{height:31px;display:flex;align-items:center;gap:2px;flex:0 0 auto}.custom-resolution input{width:55px;min-height:27px;padding:0 4px}.custom-resolution span{color:var(--text-muted);font-size:11px}
@media (max-width: 760px) { .toolbar-content{justify-content:flex-start}.create-object span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.create-object{width:36px;padding:0}.tool-menu summary{padding:0 8px}.tool-menu summary span+*{display:none}.authoring-popover{width:min(480px,calc(100vw - 20px))}.viewport-popover{right:auto;left:0;width:min(360px,calc(100vw - 20px))} }
</style>
