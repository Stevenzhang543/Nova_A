<!-- 设计工具栏：选择变换工具、添加参考线并管理键盘快捷键。 -->
<template>
  <div class="toolbar" role="toolbar" :aria-label="t('sceneView')">
    <div class="toolbar-content">
      <UiButton icon="add" :label="t('createObject')" @click="estate.createObjectPaletteOpen = true" />
      <i class="divider"></i>
      <UiButton v-for="tool in transformTools" :key="tool.id" :icon="tool.id" :label="`${t(tool.title)} (${tool.key.toUpperCase()})`" :aria-pressed="state.activeTool === tool.id" :class="{active:state.activeTool===tool.id}" @click="state.activeTool=tool.id" />

    <details class="tool-menu authoring-menu">
      <summary :title="t('authoringTools')" :aria-label="t('authoringTools')"><EditorIcon name="tools" /></summary>
      <div class="menu-popover authoring-popover">
        <section>
          <h3>{{ t('editTools') }}</h3>
          <div class="tool-grid">
            <button v-for="tool in authoringTools" :key="tool.id" :class="{ active: state.activeTool === tool.id }" :title="t(tool.title)" @click="state.activeTool = tool.id">
              <EditorIcon :name="tool.id" /><span>{{ t(tool.title) }}</span>
            </button>
          </div>
        </section>
        <section>
          <h3>{{ t('drawTools') }}</h3>
          <div class="tool-grid shape-grid">
            <button v-for="tool in shapeTools" :key="tool.id" :class="{ active: state.activeTool === tool.id }" :title="t(tool.title)" @click="state.activeTool = tool.id">
              <EditorIcon :name="tool.id" />
              <span>{{ t(tool.title) }}</span>
            </button>
          </div>
        </section>
      </div>
    </details>
    <details class="tool-menu">
      <summary :title="t('transformActions')" :aria-label="t('transformActions')"><EditorIcon name="align" /></summary>
      <div class="menu-popover action-grid">
        <button @click="alignSelection('left')">{{ t('alignLeft') }}</button><button @click="alignSelection('center-x')">{{ t('alignCenterX') }}</button><button @click="alignSelection('right')">{{ t('alignRight') }}</button>
        <button @click="alignSelection('top')">{{ t('alignTop') }}</button><button @click="alignSelection('center-y')">{{ t('alignCenterY') }}</button><button @click="alignSelection('bottom')">{{ t('alignBottom') }}</button>
        <button @click="distributeSelection('x')">{{ t('distributeHorizontal') }}</button><button @click="distributeSelection('y')">{{ t('distributeVertical') }}</button>
        <button @click="mirrorSelection('x')">{{ t('mirrorHorizontal') }}</button><button @click="mirrorSelection('y')">{{ t('mirrorVertical') }}</button>
        <button @click="rotateSelection90(false)"><EditorIcon name="undo" /> 90°</button><button @click="rotateSelection90(true)"><EditorIcon name="redo" /> 90°</button>
        <button @click="requestViewport('frame')">{{ t('frameSelection') }}</button><button @click="toggleIsolateSelection">{{ authoringState.isolateActive ? t('exitIsolation') : t('isolateSelection') }}</button>
        <button @click="requestViewport('focus-camera')">{{ t('focusCamera') }}</button><button @click="groupSelection">{{ t('groupSelection') }}</button>
      </div>
    </details>
    <details class="tool-menu snap-menu">
      <summary :title="t('snapping')" :aria-label="t('snapping')"><EditorIcon name="snap" /></summary>
      <div class="menu-popover checks">
        <label v-for="snap in snapOptions" :key="snap.key"><input v-model="authoringState.snap[snap.key]" type="checkbox">{{ t(snap.label) }}</label>
        <p class="snap-explanation">{{ t('snappingExplanation') }}</p>
      </div>
    </details>
    <details class="tool-menu guide-menu">
      <summary :title="t('viewportSettings')" :aria-label="t('viewportSettings')"><EditorIcon name="settings" /></summary>
      <div class="menu-popover viewport-popover">
        <section><h3>{{ t('transformReference') }}</h3>
          <div class="segmented" :aria-label="t('worldSpace')"><button :class="{ active: estate.transformSpace === 'local' }" @click="estate.transformSpace = 'local'">{{ t('localSpace') }}</button><button :class="{ active: estate.transformSpace === 'world' }" @click="estate.transformSpace = 'world'">{{ t('worldSpace') }}</button></div>
          <div class="segmented" :aria-label="t('pivotMode')"><button :class="{ active: estate.pivotMode === 'pivot' }" @click="estate.pivotMode = 'pivot'">{{ t('pivotMode') }}</button><button :class="{ active: estate.pivotMode === 'center' }" @click="estate.pivotMode = 'center'">{{ t('centerMode') }}</button></div>
        </section>
        <section class="quick-settings"><h3>{{ t('snapping') }}</h3>
          <button class="snap" :class="{ active: prefs.snapToGrid }" :title="t('snapToGrid')" @click="prefs.snapToGrid = !prefs.snapToGrid"><EditorIcon name="grid" /> {{ t('snapToGrid') }}</button>
          <button class="snap" :class="{ active: estate.angleSnapEnabled }" :title="t('angleSnap')" @click="estate.angleSnapEnabled = !estate.angleSnapEnabled"><EditorIcon name="rotate" /> {{ estate.angleSnapDegrees }}°</button>
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
import UiButton from '../ui/components/UiButton.vue'
import EditorIcon from './EditorIcon.vue'
import { isEditableKeyboardTarget } from '../editor/panelAuthoringGuards'
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
/** 按输入坐标添加指定方向参考线，成功后重置坐标输入。 */ function addGuide(axis: 'horizontal' | 'vertical') { if (addViewportGuide(axis, Number(guideValue.value))) guideValue.value = '0' }

/** 处理创建对象和变换工具按键；普通工具选择跳过文本输入及其他修饰键事件。 */ function handleShortcut(event: KeyboardEvent) {
  if (isEditableKeyboardTarget(event.target) || document.querySelector('[aria-modal="true"]') || estate.currentPage !== 'scene' || estate.activeWorkspace === 'ui') return
  if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'a') { estate.createObjectPaletteOpen = true; event.preventDefault(); return }
  if (event.ctrlKey || event.metaKey || event.altKey) return
  const tag = (event.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  const tool = transformTools.find(/* 比较 candidate.key 与 event.key.toLowerCase()，返回严格相等的判断结果。 */ candidate => candidate.key === event.key.toLowerCase())
  if (!tool) return
  state.activeTool = tool.id
  event.preventDefault()
}

onMounted(/** 挂载时注册工具键盘监听。 */ () => window.addEventListener('keydown', handleShortcut))
onBeforeUnmount(/** 卸载时移除工具键盘监听。 */ () => window.removeEventListener('keydown', handleShortcut))
</script>

<style scoped>
.toolbar{flex:none;min-width:0;border-bottom:1px solid var(--border-subtle);background:var(--surface-1)}.toolbar-content{display:flex;align-items:center;gap:var(--ui-space-xs);padding:var(--ui-space-xs) var(--ui-space-sm)}.divider{height:var(--ui-icon-size);width:1px;background:var(--border-subtle);margin-inline:var(--ui-space-xs)}.tool-menu{position:relative}.tool-menu>summary{width:var(--ui-control-height);height:var(--ui-control-height);display:grid;place-items:center;list-style:none;cursor:pointer;border:1px solid transparent}.tool-menu>summary::-webkit-details-marker{display:none}.tool-menu[open]>summary{background:var(--accent-soft);color:var(--accent)}.menu-popover{position:absolute;top:100%;left:0;z-index:1200;max-width:calc(100vw - var(--ui-space-xl));padding:var(--ui-space-sm);border:1px solid var(--border-subtle);background:var(--surface-2);box-shadow:var(--shadow-float)}.menu-popover h3{font:inherit;font-weight:600;margin:0 0 var(--ui-space-xs);color:var(--text-muted)}.tool-grid,.action-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--ui-space-micro);min-width:30ch}.tool-grid button,.action-grid button{display:flex;align-items:center;justify-content:flex-start;gap:var(--ui-space-xs);text-align:start;white-space:nowrap}.authoring-popover{display:grid;gap:var(--ui-space-sm)}.checks{min-width:24ch}.checks label,.guide-controls label{display:flex;align-items:center;gap:var(--ui-space-xs);min-height:var(--ui-control-height)}.snap-explanation{max-width:32ch;color:var(--text-muted);font-size:var(--type-caption)}.viewport-popover{min-width:36ch;display:grid;gap:var(--ui-space-sm)}.segmented,.quick-settings,.custom-resolution,.guide-controls>div{display:flex;align-items:center;gap:var(--ui-space-xs)}.quick-settings{flex-wrap:wrap}.quick-settings h3{width:100%}.guide-controls{display:grid;gap:var(--ui-space-xs)}.guide-controls input,.custom-resolution input{min-width:0;width:10ch}.custom-resolution{flex-wrap:nowrap}
</style>
