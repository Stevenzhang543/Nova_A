<template>
  <section class="build-panel">
    <div class="build-form">
      <header><div><strong>{{ t('buildPanel') }}</strong><p>{{ targetNote }}</p></div><span class="target-badge">{{ targetLabel }}</span></header>
      <div class="fields">
        <label><span>{{ t('buildGameName') }}</span><input v-model="buildSettings.gameName" maxlength="80"></label>
        <label><span>{{ t('buildTarget') }}</span><select v-model="buildSettings.target"><option value="windows">{{ t('windows') }}</option><option value="linux">{{ t('linux') }}</option><option value="macos">{{ t('macos') }}</option><option value="web">{{ t('web') }}</option></select></label>
        <label><span>{{ t('architecture') }}</span><select v-model="buildSettings.architecture"><option value="x86_64">x86_64</option></select></label>
        <label class="wide"><span>{{ t('outputDirectory') }}</span><input v-model="buildSettings.outputDirectory" :placeholder="t('defaultOutput')"></label>
        <label class="check"><input v-model="buildSettings.developmentBuild" type="checkbox"><span>{{ t('developmentBuild') }}</span></label>
        <label class="check"><input v-model="buildSettings.packageIntoExecutable" type="checkbox" :disabled="buildSettings.target === 'web' || buildSettings.target === 'macos'"><span>{{ t('packageExecutable') }}</span></label>
      </div>
      <section class="scenes-card">
        <header><strong>{{ t('sceneOrder') }}</strong><span>{{ t('startupScene') }}</span></header>
        <article v-for="(uuid, index) in buildSettings.sceneOrder" :key="uuid">
          <span class="index">{{ index + 1 }}</span><strong>{{ sceneName(uuid) }}</strong>
          <label><input v-model="buildSettings.startupSceneUuid" type="radio" :value="uuid"><span>{{ t('startupScene') }}</span></label>
          <button :disabled="index === 0" :title="t('moveUp')" @click="move(index, -1)">↑</button><button :disabled="index === buildSettings.sceneOrder.length - 1" :title="t('moveDown')" @click="move(index, 1)">↓</button>
        </article>
      </section>
    </div>
    <aside class="build-actions">
      <strong>{{ progressTitle }}</strong><p>{{ buildProgress.message || t('buildIdle') }}</p>
      <div class="progress"><i :style="{ width: `${buildProgress.percent}%` }"></i></div>
      <code v-if="buildProgress.outputPath">{{ buildProgress.outputPath }}</code>
      <button class="primary" :disabled="busy" @click="runBuild(false)">{{ t('build') }}</button>
      <button :disabled="busy || buildSettings.target === 'web'" @click="runBuild(true)">{{ t('buildAndRun') }}</button>
      <p class="note">{{ buildSettings.target === 'web' ? t('webExportNote') : t('hostTargetNote') }}</p>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { t } from '../i18n'
import { buildProgress, buildSettings, synchronizeBuildScenes } from '../runtime/buildSettings'
import { buildGame, failBuild } from '../runtime/gameExporter'
import { sceneManager } from '../store/physics'

const busy = computed(() => ['validating', 'packing', 'exporting'].includes(buildProgress.phase))
const targetLabel = computed(() => buildSettings.target === 'windows' ? t('windows') : buildSettings.target === 'linux' ? t('linux') : buildSettings.target === 'macos' ? t('macos') : t('web'))
const targetNote = computed(() => buildSettings.target === 'web' ? t('webExportNote') : t('hostTargetNote'))
const progressTitle = computed(() => t(buildProgress.phase === 'idle' ? 'buildIdle' : buildProgress.phase === 'validating' ? 'buildValidating' : buildProgress.phase === 'packing' ? 'buildPacking' : buildProgress.phase === 'exporting' ? 'buildExporting' : buildProgress.phase === 'complete' ? 'buildComplete' : 'buildFailed'))
function sceneName(uuid: string) { return sceneManager.scenes.find(scene => scene.uuid === uuid)?.name ?? uuid }
function move(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= buildSettings.sceneOrder.length) return; const [uuid] = buildSettings.sceneOrder.splice(index, 1); buildSettings.sceneOrder.splice(target, 0, uuid) }
async function runBuild(run: boolean) { try { await buildGame(run) } catch (error) { failBuild(error) } }
onMounted(() => synchronizeBuildScenes(sceneManager.scenes.map(scene => scene.uuid)))
watch(() => buildSettings.target, target => {
  if (target === 'web' || target === 'macos') buildSettings.packageIntoExecutable = false
})
</script>

<style scoped>
.build-panel { height: 100%; min-width: 0; display: grid; grid-template-columns: minmax(400px, 1fr) minmax(220px, 300px); overflow: hidden; }.build-form { min-width: 0; padding: 11px; overflow: auto; }.build-form > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }.build-form > header strong { font-size: 13px; }.build-form > header p { margin: 3px 0 8px; max-width: 620px; color: var(--text-muted); font-size: 9px; line-height: 1.45; }.target-badge { padding: 4px 8px; border: 1px solid var(--accent); border-radius: 999px; color: var(--accent); background: var(--accent-soft); font-size: 9px; }
.fields { display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 7px; }.fields label { min-width: 0; display: flex; flex-direction: column; gap: 4px; color: var(--text-muted); font-size: 9px; }.fields input, .fields select { width: 100%; min-width: 0; min-height: 28px; }.fields .wide { grid-column: 1 / -1; }.fields .check { min-height: 28px; flex-direction: row; align-items: center; }.fields .check input { width: auto; }
.scenes-card { margin-top: 10px; border: 1px solid var(--border-subtle); border-radius: 9px; overflow: hidden; }.scenes-card > header, .scenes-card article { min-height: 32px; padding: 4px 8px; display: grid; grid-template-columns: 28px minmax(120px, 1fr) 120px 28px 28px; gap: 5px; align-items: center; border-bottom: 1px solid var(--border-subtle); }.scenes-card > header { display: flex; justify-content: space-between; color: var(--text-muted); background: var(--surface-2); font-size: 9px; }.scenes-card article:last-child { border-bottom: 0; }.scenes-card .index { color: var(--text-muted); text-align: center; }.scenes-card article > strong { overflow: hidden; font-size: 9.5px; text-overflow: ellipsis; white-space: nowrap; }.scenes-card article label { display: flex; align-items: center; gap: 5px; color: var(--text-muted); font-size: 8.5px; }.scenes-card button { width: 27px; height: 25px; border: 1px solid var(--border-subtle); border-radius: 6px; color: var(--text-secondary); background: var(--surface-2); }
.build-actions { min-width: 0; padding: 12px; overflow: auto; border-left: 1px solid var(--border-subtle); background: var(--surface-2); }.build-actions > strong { font-size: 12px; }.build-actions > p { color: var(--text-muted); font-size: 9px; line-height: 1.45; }.progress { height: 6px; margin: 10px 0; overflow: hidden; border-radius: 999px; background: var(--surface-3); }.progress i { height: 100%; display: block; border-radius: inherit; background: var(--accent); transition: width 180ms ease; }.build-actions code { margin-bottom: 9px; display: block; overflow-wrap: anywhere; color: var(--accent); font-size: 8px; }.build-actions button { width: 100%; min-height: 31px; margin-top: 6px; border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-secondary); background: var(--surface-3); font-size: 9px; }.build-actions button.primary { color: var(--accent-contrast); border-color: var(--accent); background: var(--accent); }.build-actions .note { margin-top: 10px; }
@media (max-width: 760px) { .build-panel { grid-template-columns: 1fr; overflow: auto; }.build-form, .build-actions { overflow: visible; }.build-actions { border-top: 1px solid var(--border-subtle); border-left: 0; }.fields { grid-template-columns: 1fr 1fr; }.scenes-card article { grid-template-columns: 24px minmax(90px, 1fr) 95px 27px 27px; } }
</style>
