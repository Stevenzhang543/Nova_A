<template>
  <section class="bottom-panel" :class="{ collapsed: !estate.bottomPanelOpen }" :style="panelStyle">
    <div v-if="estate.bottomPanelOpen" class="resize-handle" @mousedown="startResize"></div>
    <header class="panel-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="{ active: estate.bottomPanelTab === tab.id }"
        @click="openTab(tab.id)"
      >{{ t(tab.label) }}</button>
      <span></span>
      <button v-if="estate.bottomPanelTab === 'console' && estate.bottomPanelOpen" :title="t('clearConsole')" @click="estate.logs.splice(0)">⌫</button>
      <button :title="t(estate.bottomPanelOpen ? 'collapsePanel' : 'expandPanel')" @click="estate.bottomPanelOpen = !estate.bottomPanelOpen">{{ estate.bottomPanelOpen ? '⌄' : '⌃' }}</button>
    </header>

    <div v-if="estate.bottomPanelOpen" class="panel-content">
      <div v-if="estate.bottomPanelTab === 'assets'" class="asset-grid">
        <article v-for="asset in textureAssets" :key="asset.uuid">
          <span class="asset-preview" :style="{ backgroundImage: `url(${asset.texture})` }"></span>
          <strong>{{ asset.name }}</strong><small>{{ asset.uuid.slice(0, 8) }}</small>
        </article>
        <p v-if="!textureAssets.length" class="empty">{{ t('noAssets') }}</p>
      </div>

      <div v-else-if="estate.bottomPanelTab === 'console'" class="console-list">
        <p v-if="!estate.logs.length" class="empty">{{ t('noConsoleMessages') }}</p>
        <div v-for="entry in estate.logs" :key="entry.id" :class="['log-entry', entry.level]">
          <time>{{ entry.timestamp }}</time><strong>{{ entry.category }}</strong><span>{{ entry.message }}</span>
        </div>
      </div>

      <div v-else-if="estate.bottomPanelTab === 'profiler'" class="metric-grid">
        <article><span>{{ t('runtimeState') }}</span><strong>{{ t(state.playMode === 'playing' ? 'playMode' : state.playMode === 'paused' ? 'runtimePaused' : 'editingMode') }}</strong></article>
        <article><span>{{ t('runtimeBodies') }}</span><strong>{{ state.engineDiagnostics.bodyCount }}</strong></article>
        <article><span>{{ t('runtimeConnections') }}</span><strong>{{ state.engineDiagnostics.connectionCount }}</strong></article>
        <article><span>{{ t('drawCalls') }}</span><strong>{{ visibleEntityCount }}</strong></article>
        <article><span>{{ t('totalPhysicsSteps') }}</span><strong>{{ state.engineDiagnostics.totalPhysicsSteps }}</strong></article>
        <article><span>{{ t('commandHistory') }}</span><strong>{{ historyState.length }}</strong></article>
      </div>

      <div v-else-if="estate.bottomPanelTab === 'project'" class="project-summary">
        <article><span>{{ t('engineVersion') }}</span><strong>1.4.0</strong></article>
        <article><span>{{ t('formatVersion') }}</span><strong>v8</strong></article>
        <article><span>{{ t('scenes') }}</span><strong>{{ sceneManager.scenes.length }}</strong></article>
        <p>{{ t('runtimeIsolation') }}</p>
      </div>

      <div v-else class="future-panel">
        <strong>{{ t(estate.bottomPanelTab === 'animation' ? 'animation' : 'buildPanel') }}</strong>
        <p>{{ t(estate.bottomPanelTab === 'animation' ? 'animationPlanned' : 'buildPlanned') }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { t } from '../i18n'
import { editorState as estate } from '../store/editor'
import { historyState, physicsState as state, sceneManager } from '../store/physics'

const tabs = [
  { id: 'assets' as const, label: 'assets' as const },
  { id: 'console' as const, label: 'console' as const },
  { id: 'animation' as const, label: 'animation' as const },
  { id: 'profiler' as const, label: 'profiler' as const },
  { id: 'project' as const, label: 'projectPanel' as const },
  { id: 'build' as const, label: 'buildPanel' as const }
]
const panelStyle = computed(() => ({ height: estate.bottomPanelOpen ? `${estate.bottomPanelHeight}px` : '34px' }))
const textureAssets = computed(() => state.world.entities.flatMap(entity => entity.texture
  ? [{ uuid: entity.uuid, name: entity.name, texture: entity.texture }]
  : []))
const visibleEntityCount = computed(() => state.world.entities.filter(entity => entity.enabled && entity.editorVisible && entity.renderer.enabled).length)

function openTab(id: typeof tabs[number]['id']) {
  estate.bottomPanelTab = id
  estate.bottomPanelOpen = true
}

let startY = 0
let startHeight = 0
function startResize(event: MouseEvent) {
  startY = event.clientY
  startHeight = estate.bottomPanelHeight
  document.addEventListener('mousemove', resizePanel)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'ns-resize'
}
function resizePanel(event: MouseEvent) {
  estate.bottomPanelHeight = Math.min(420, Math.max(90, startHeight + startY - event.clientY))
}
function stopResize() {
  document.removeEventListener('mousemove', resizePanel)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = 'default'
}
onBeforeUnmount(stopResize)
</script>

<style scoped>
.bottom-panel { position: relative; flex: 0 0 auto; min-height: 34px; display: flex; flex-direction: column; border-top: 1px solid var(--border-subtle); background: var(--surface-1); }
.resize-handle { position: absolute; inset: -4px 0 auto; height: 8px; cursor: ns-resize; z-index: 5; }
.panel-tabs { height: 34px; flex: 0 0 34px; padding: 0 5px; display: flex; align-items: center; gap: 2px; border-bottom: 1px solid var(--border-subtle); }
.panel-tabs span { flex: 1; }
.panel-tabs button { height: 27px; padding: 0 10px; border: 0; border-radius: 7px; color: var(--text-muted); background: transparent; font-size: 10px; }
.panel-tabs button:hover, .panel-tabs button.active { color: var(--text-primary); background: var(--surface-hover); }
.panel-tabs button.active { color: var(--accent); }
.panel-content { flex: 1; min-height: 0; overflow: auto; }
.asset-grid { padding: 10px; display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
.asset-grid article { min-width: 0; padding: 8px; display: grid; grid-template-columns: 38px 1fr; grid-template-rows: 1fr 1fr; column-gap: 8px; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-2); }
.asset-preview { grid-row: 1 / 3; width: 38px; height: 38px; border-radius: 7px; background-position: center; background-size: cover; }
.asset-grid strong, .asset-grid small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.asset-grid strong { font-size: 10px; }.asset-grid small { color: var(--text-muted); font-size: 8px; }
.console-list { min-width: 600px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; }
.log-entry { min-height: 25px; padding: 4px 10px; display: grid; grid-template-columns: 72px 70px 1fr; gap: 8px; align-items: center; border-bottom: 1px solid var(--border-subtle); }.log-entry time { color: var(--text-muted); }.log-entry strong { color: var(--accent); }.log-entry.warning strong { color: var(--warning); }.log-entry.error strong { color: var(--danger); }
.metric-grid { padding: 10px; display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 8px; }.metric-grid article, .project-summary article { padding: 9px; display: flex; justify-content: space-between; gap: 10px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-2); font-size: 10px; }.metric-grid span, .project-summary span { color: var(--text-muted); }.metric-grid strong, .project-summary strong { color: var(--accent); }
.project-summary { padding: 10px; display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 8px; }.project-summary p { grid-column: 1 / -1; margin: 2px; color: var(--text-muted); font-size: 10px; }
.future-panel, .empty { padding: 18px; color: var(--text-muted); font-size: 11px; }.future-panel strong { color: var(--text-primary); }.future-panel p { margin: 5px 0 0; }
</style>
