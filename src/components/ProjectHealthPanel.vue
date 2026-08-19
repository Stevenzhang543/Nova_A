<template>
  <section class="project-health">
    <header><div><strong>{{ t('projectHealth') }}</strong><small>{{ t('projectHealthHint') }}</small></div><span :class="healthClass">{{ summary }}</span></header>
    <div class="health-grid">
      <article><span>{{ t('formatVersion') }}</span><strong>{{ compatibility.format }}</strong><small>schema {{ compatibility.schemaVersion }}</small></article>
      <article><span>{{ t('engineVersion') }}</span><strong>{{ engineVersion }}</strong><small>{{ t('supportedSchemas', { first: compatibility.minimumSchemaVersion, last: compatibility.schemaVersion }) }}</small></article>
      <article><span>{{ t('projectManifest') }}</span><strong>{{ manifest.name }}</strong><small>{{ manifest.projectUuid.slice(0, 13) }}…</small></article>
      <article><span>{{ t('scenes') }}</span><strong>{{ sceneManager.scenes.length }}</strong><small>{{ sceneManager.scenes.filter(scene => scene.loaded).length }} {{ t('loaded') }}</small></article>
      <article><span>{{ t('assets') }}</span><strong>{{ assets.records.length }}</strong><small>{{ graph.missingReferences.length }} {{ t('missingReferences') }}</small></article>
      <article><span>{{ t('packages') }}</span><strong>{{ packages.installed.filter(item => item.project).length }}</strong><small>{{ packageProblems.length }} {{ t('problems') }}</small></article>
      <article><span>{{ t('buildPanel') }}</span><strong>{{ buildIssues.length ? t('attentionRequired') : t('ready') }}</strong><small>{{ buildIssues.length }} {{ t('problems') }}</small></article>
      <article><span>{{ t('rendererBackend') }}</span><strong>{{ rendererCapability.backend }} · {{ rendererCapability.tier }}</strong><small>{{ rendererCapability.maximumTextureSize || 'n/a' }} px · {{ rendererCapability.target }}</small></article>
      <article><span>{{ t('worldSize') }}</span><strong>{{ worldMetrics.width.toFixed(1) }} × {{ worldMetrics.height.toFixed(1) }}</strong><small>{{ worldMetrics.tilemaps }} {{ t('tilemap') }}</small></article>
      <article><span>{{ t('tileCount') }}</span><strong>{{ worldMetrics.tiles.toLocaleString() }}</strong><small>{{ worldMetrics.chunks.toLocaleString() }} {{ t('chunks') }}</small></article>
      <article><span>{{ t('navigationRegions') }}</span><strong>{{ worldMetrics.navigationRegions }}</strong><small>{{ worldMetrics.navigationAgents }} {{ t('agents') }}</small></article>
      <article><span>{{ t('streamingMemory') }}</span><strong>{{ streaming.memoryMb.toFixed(1) }} MB</strong><small>{{ streaming.active }}/{{ streaming.cells.length }} {{ t('active') }} · {{ streaming.pending }} {{ t('pending') }}</small></article>
    </div>
    <div v-if="issues.length" class="issues"><article v-for="issue in issues" :key="issue"><span>!</span><p>{{ issue }}</p></article></div>
    <div v-else class="healthy-empty"><span>✓</span><div><strong>{{ t('projectHealthy') }}</strong><p>{{ t('projectHealthyHint') }}</p></div></div>
    <section class="data-foundation">
      <header><strong>{{ t('projectDataFoundation') }}</strong><small>{{ t('projectDataFoundationHint') }}</small></header>
      <div class="data-actions"><button class="primary" @click="validateNow">{{ t('validateProject') }}</button><button @click="previewRepair">{{ t('repairProject') }}</button><button @click="downloadBackup">{{ t('createProjectBackup') }}</button><button :disabled="!rollback" @click="downloadLastUpgradeRollback">{{ t('downloadRollback') }}</button></div>
      <p v-if="validation" :class="validation.valid ? 'valid' : 'invalid'">{{ t(validation.valid ? 'projectValidationPassed' : 'projectValidationFailed', { count: validation.issues.length }) }}</p>
      <ol v-if="validation?.issues.length"><li v-for="issue in validation.issues.slice(0,20)" :key="`${issue.code}:${issue.path}`"><code>{{ issue.path || '/' }}</code> {{ issue.message }}</li></ol>
      <details><summary>{{ t('sceneDependencyGraph') }} · {{ sceneDependencies.length }}</summary><article v-for="node in sceneDependencies" :key="node.sceneUuid"><strong>{{ node.name }}</strong><small>{{ t('dependencies') }}: {{ node.dependencies.length }} · {{ t('reverseDependencies') }}: {{ node.reverseDependencies.length }}</small></article></details>
    </section>
    <footer><button @click="openEditorTool('assets')">{{ t('assets') }}</button><button @click="openEditorTool('packages')">{{ t('packages') }}</button><button @click="openEditorTool('build')">{{ t('buildPanel') }}</button><button @click="state.currentPage = 'settings'">{{ t('projectSettings') }}</button></footer>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../i18n'
import { assetState as assets } from '../assets/AssetDatabase'
import { buildAssetDependencyGraph } from '../assets/assetGraph'
import { buildSettings, validateBuildSettings } from '../runtime/buildSettings'
import { packageCompatibility, packageState as packages } from '../runtime/packages'
import { NOVA_ENGINE_VERSION, projectCompatibility } from '../projects/projectFormat'
import { getSceneJSON, physicsState, sceneManager } from '../store/physics'
import { buildSceneDependencyGraph } from '../projects/projectData'
import { projectManifestState as manifest } from '../projects/projectManifest'
import { downloadLastUpgradeRollback, readUpgradeRollback } from '../runtime/projectUpgrade'
import { requestConfirmation } from '../store/dialog'
import { addEditorLog } from '../store/editor'
import { applyCurrentProjectRepair, backupCurrentProject, previewCurrentProjectRepair, projectIntegrityState, validateCurrentProject } from '../runtime/projectIntegrity'
import { editorState as state } from '../store/editor'
import { openEditorTool } from '../editor/workspaces'
import { queryRendererCapabilities, rendererCapabilityState } from '../renderer/capabilities'
import { advancedRenderingActive } from '../renderer/renderSettings'
import type { TileMap2D } from '../world/components'
import { worldTransform } from '../world/hierarchy'
import { worldStreamingState as streaming } from '../runtime/worldStreaming'
const compatibility = projectCompatibility()
const engineVersion = NOVA_ENGINE_VERSION
const project = computed(() => { try { return JSON.parse(getSceneJSON()) as unknown } catch { return null } })
const graph = computed(() => buildAssetDependencyGraph(assets.records, project.value))
const buildIssues = computed(() => validateBuildSettings(buildSettings))
const packageProblems = computed(() => packages.installed.filter(item => item.project).flatMap(item => packageCompatibility(item).map(problem => `${item.manifest.name}: ${problem}`)))
const validation = computed(() => projectIntegrityState.validation)
const rollback = computed(() => readUpgradeRollback() !== null)
const sceneDependencies = computed(() => project.value ? buildSceneDependencyGraph(project.value) : [])
const rendererCapability = computed(() => rendererCapabilityState.report ?? queryRendererCapabilities())
const rendererIssues = computed(() => rendererCapability.value.backend === 'Canvas2D' && advancedRenderingActive() ? [t('fallbackRendererProjectWarning')] : [])
const worldMetrics = computed(() => {
  const tilemaps = physicsEntities().flatMap(entity => { const map = entity.getComponent<TileMap2D>('TileMap2D'); return map ? [{ entity, map }] : [] })
  const bounds = tilemaps.map(({ entity, map }) => { const transform = worldTransform(entity, physicsEntities()); const width = map.width * map.tileSize.x * Math.abs(transform.scale.x), height = map.height * map.tileSize.y * Math.abs(transform.scale.y); return { minX: transform.position.x - width / 2, maxX: transform.position.x + width / 2, minY: transform.position.y - height / 2, maxY: transform.position.y + height / 2 } })
  return { tilemaps: tilemaps.length, tiles: tilemaps.reduce((sum, { map }) => sum + map.layers.reduce((layerSum, layer) => layerSum + layer.tiles.filter(tile => tile >= 0).length, 0), 0), chunks: tilemaps.reduce((sum, { map }) => sum + Math.ceil(map.width / map.chunkSize) * Math.ceil(map.height / map.chunkSize) * map.layers.length, 0), navigationRegions: physicsEntities().filter(entity => entity.hasComponent('NavigationRegion2D')).length, navigationAgents: physicsEntities().filter(entity => entity.hasComponent('NavigationAgent2D')).length, width: bounds.length ? Math.max(...bounds.map(item => item.maxX)) - Math.min(...bounds.map(item => item.minX)) : 0, height: bounds.length ? Math.max(...bounds.map(item => item.maxY)) - Math.min(...bounds.map(item => item.minY)) : 0 }
})
function physicsEntities() { return physicsState.world.entities }
const issues = computed(() => [...graph.value.missingReferences.slice(0, 8).map(item => `${t('missingReferences')}: ${item.reference}`), ...(validation.value?.issues.filter(item => item.severity === 'error').map(item => `${item.path}: ${item.message}`) ?? []), ...packageProblems.value, ...buildIssues.value.map(item => item.message), ...rendererIssues.value].slice(0, 16))
const summary = computed(() => issues.value.length ? t('issuesFound', { count: issues.value.length }) : t('healthy'))
const healthClass = computed(() => issues.value.length ? 'attention' : 'healthy')
function validateNow() { const report = validateCurrentProject(); addEditorLog(t(report.valid ? 'projectValidationPassed' : 'projectValidationFailed', { count: report.issues.length }), 'Project', report.valid ? 'info' : 'error') }
function downloadBackup() { backupCurrentProject() }
async function previewRepair() {
  const repair = previewCurrentProjectRepair()
  const approved = await requestConfirmation({ title: t('repairProject'), message: `${repair.changes.join('\n')}\n\n${t('repairRemainingIssues', { count: repair.remaining.length })}`, confirmLabel: t('repairProject'), cancelLabel: t('cancel'), destructive: false })
  if (!approved) return
  if (!applyCurrentProjectRepair(repair)) { addEditorLog(t('projectRepairFailed'), 'Project', 'error'); return }
  validateNow(); addEditorLog(t('projectRepairComplete'), 'Project')
}
</script>
<style scoped>
.project-health{height:100%;padding:10px;overflow:auto;background:var(--surface-1)}header{min-height:42px;display:flex;align-items:center;justify-content:space-between;gap:10px}header>div{display:grid}header small{color:var(--text-muted)}header>span{padding:4px 8px;border-radius:999px}.healthy{color:var(--success);background:color-mix(in srgb,var(--success) 12%,transparent)}.attention{color:var(--warning);background:color-mix(in srgb,var(--warning) 12%,transparent)}.health-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:7px}.health-grid article{padding:9px;display:grid;gap:3px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-2)}.health-grid span,.health-grid small{color:var(--text-muted)}.health-grid strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.issues{margin-top:9px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.issues article{min-width:0;padding:7px;display:flex;gap:7px;border-left:3px solid var(--warning);border-radius:7px;background:var(--surface-2)}.issues p{margin:0;overflow-wrap:anywhere}.healthy-empty{margin-top:10px;padding:12px;display:flex;align-items:center;gap:10px;border:1px solid color-mix(in srgb,var(--success) 40%,transparent);border-radius:10px;background:color-mix(in srgb,var(--success) 7%,transparent)}.healthy-empty>span{font-size:20px;color:var(--success)}.healthy-empty p{margin:2px 0 0;color:var(--text-muted)}.data-foundation{margin-top:10px;padding:10px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.data-foundation>header{min-height:34px;display:grid;justify-content:stretch}.data-foundation>header small{color:var(--text-muted)}.data-foundation details>summary{min-height:22px;display:flex;align-items:center;line-height:1.45}.data-actions{display:flex;gap:6px;flex-wrap:wrap}.data-actions button,footer button{min-height:34px;padding:0 10px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-3)}.data-actions .primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}.data-foundation p.valid{color:var(--success)}.data-foundation p.invalid{color:var(--danger)}.data-foundation ol{max-height:130px;overflow:auto}.data-foundation li{margin:4px 0;color:var(--text-muted)}.data-foundation details article{padding:6px;display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--border-subtle)}footer{margin-top:9px;display:flex;gap:6px;flex-wrap:wrap}@media(max-width:900px){.health-grid{grid-template-columns:repeat(3,minmax(120px,1fr))}}@media(max-width:560px){.health-grid,.issues{grid-template-columns:1fr 1fr}}
</style>
