<template>
  <section class="profiler-panel">
    <header>
      <strong>{{ t('profiler') }}</strong>
      <span>{{ t('visibleMessages', { count: profilerState.samples.length }) }}</span>
      <button @click="profilerState.frozen = !profilerState.frozen">{{ t(profilerState.frozen ? 'resumeProfiler' : 'freezeProfiler') }}</button>
      <button @click="clearProfiler">{{ t('clearSamples') }}</button>
    </header>
    <div class="profiler-content">
      <div class="metrics">
        <article v-for="metric in timingMetrics" :key="metric.label"><span>{{ t(metric.label) }}</span><strong>{{ metric.value.toFixed(2) }} ms</strong></article>
        <article><span>{{ t('fps') }}</span><strong>{{ current.fps.toFixed(0) }}</strong></article>
        <article><span>{{ t('memory') }}</span><strong>{{ current.memoryMb === null ? '—' : `${current.memoryMb.toFixed(1)} MB` }}</strong></article>
        <article><span>{{ t('drawCalls') }}</span><strong>{{ editorState.rendererStats.drawCalls }}</strong></article>
        <article><span>{{ t('sprites') }}</span><strong>{{ editorState.rendererStats.sprites }}</strong></article>
        <article><span>{{ t('runtimeBodies') }}</span><strong>{{ physicsState.engineDiagnostics.bodyCount }}</strong></article>
        <article><span>{{ t('activeContacts') }}</span><strong>{{ activeContacts }}</strong></article>
        <article><span>{{ t('scriptInstances') }}</span><strong>{{ gameplayRuntime.diagnostics.scripts }}</strong></article>
      </div>
      <section class="chart-card">
        <strong>{{ t('frameHistory') }}</strong>
        <svg viewBox="0 0 600 110" preserveAspectRatio="none" aria-label="Frame-time history"><line x1="0" y1="93.3" x2="600" y2="93.3"/><line x1="0" y1="76.7" x2="600" y2="76.7"/><polyline :points="chartPoints" /></svg>
        <small>16.7 ms / 33.3 ms</small>
      </section>
      <section class="debug-card">
        <header><strong>{{ t('physicsDebugger') }}</strong><input v-model="physicsDebugState.enabled" type="checkbox"></header>
        <label v-for="option in debugOptions" :key="option.key"><input v-model="physicsDebugState[option.key]" type="checkbox" :disabled="!physicsDebugState.enabled"><span>{{ t(option.label) }}</span></label>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../i18n'
import { gameplayRuntime } from '../runtime/GameplayRuntime'
import { physicsDebugState } from '../runtime/physicsDebug'
import { clearProfiler, profilerState } from '../runtime/profiler'
import { editorState } from '../store/editor'
import { physicsState } from '../store/physics'

const current = computed(() => profilerState.current)
const timingMetrics = computed(() => [
  { label: 'frameTime' as const, value: current.value.frameMs }, { label: 'physicsTime' as const, value: current.value.physicsMs },
  { label: 'renderingTime' as const, value: current.value.renderingMs }, { label: 'scriptsTime' as const, value: current.value.scriptsMs },
  { label: 'animationTime' as const, value: current.value.animationMs }, { label: 'audioTime' as const, value: current.value.audioMs },
  { label: 'assetsTime' as const, value: current.value.assetsMs }, { label: 'otherTime' as const, value: current.value.otherMs }
])
const activeContacts = computed(() => Math.round(physicsState.world.entities.reduce((total, entity) => total + entity.contactCount, 0) / 2))
const chartPoints = computed(() => profilerState.samples.map((sample, index, all) => `${all.length <= 1 ? 0 : index / (all.length - 1) * 600},${110 - Math.min(100, sample.frameMs * 3)}`).join(' '))
const debugOptions = [
  { key: 'showColliders', label: 'showColliders' }, { key: 'showContactPoints', label: 'showContactPoints' }, { key: 'showNormals', label: 'showNormals' },
  { key: 'showSleepingBodies', label: 'showSleepingBodies' }, { key: 'showAabbs', label: 'showAabbs' }, { key: 'showJointConstraints', label: 'showJointConstraints' }, { key: 'showRopeNodes', label: 'showRopeNodes' }
] as const
</script>

<style scoped>
.profiler-panel { height: 100%; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }.profiler-panel > header { min-height: 40px; padding: 5px 9px; display: flex; align-items: center; flex-wrap: wrap; gap: 7px; border-bottom: 1px solid var(--border-subtle); }.profiler-panel > header span { margin-left: auto; color: var(--text-muted); font-size: 11px; }.profiler-panel button { min-height: 30px; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--text-secondary); background: var(--surface-2); font-size: 11px; }
.profiler-content { min-height: 0; padding: 9px; display: grid; grid-template-columns: repeat(3, minmax(220px, 1fr)); gap: 8px; overflow: auto; }.metrics { display: grid; grid-template-columns: repeat(2, minmax(120px, 1fr)); gap: 6px; }.metrics article { min-height: 36px; padding: 7px 9px; display: flex; align-items: center; justify-content: space-between; gap: 8px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-2); font-size: 11px; }.metrics span { color: var(--text-muted); }.metrics strong { color: var(--accent); }
.chart-card, .debug-card { min-width: 0; padding: 9px; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-2); }.chart-card > strong, .debug-card strong { font-size: 12px; }.chart-card svg { width: 100%; height: 105px; margin-top: 5px; overflow: visible; }.chart-card line { stroke: var(--border-strong); stroke-width: 1; stroke-dasharray: 4 4; }.chart-card polyline { fill: none; stroke: var(--accent); stroke-width: 2; vector-effect: non-scaling-stroke; }.chart-card small { color: var(--text-muted); font-size: 10px; }.debug-card header { display: flex; align-items: center; justify-content: space-between; }.debug-card label { min-height: 28px; display: flex; align-items: center; gap: 7px; color: var(--text-muted); font-size: 11px; }
@media (max-width: 900px) { .profiler-content { grid-template-columns: minmax(250px, 1fr) minmax(230px, 1fr); }.debug-card { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, 1fr); }.debug-card header { grid-column: 1 / -1; } }
</style>
