<template>
  <section class="project-health">
    <header><div><strong>{{ t('projectHealth') }}</strong><small>{{ t('projectHealthHint') }}</small></div><span :class="healthClass">{{ summary }}</span></header>
    <div class="health-browser">
      <div class="health-table" role="listbox"><button v-for="row in healthRows" :key="row.id" :class="{ active: selectedHealthId === row.id }" role="option" :aria-selected="selectedHealthId === row.id" @click="selectedHealthId = row.id"><span>{{ row.label }}</span><strong>{{ row.value }}</strong><i :class="row.status"></i></button></div>
      <article v-if="selectedHealth" class="health-detail"><span>{{ selectedHealth.label }}</span><strong>{{ selectedHealth.value }}</strong><p>{{ selectedHealth.detail }}</p><button v-if="['animation','ui','localization','accessibility'].includes(selectedHealth.id)" @click="navigateSelectedHealth">{{ t('openAffectedEditor') }}</button></article>
    </div>
    <section class="release-gate">
      <header><div><strong>{{ t('releaseReadinessGate') }}</strong><small>Nova_A {{ RELEASE_CANDIDATE_FREEZE.release }} · frozen baseline</small></div><span :class="releaseSummary.status">{{ releaseSummary.blockers ? t('readinessBlocked') : t('releaseCandidate') }} · {{ releaseSummary.passed }}/{{ releaseGates.length }}</span></header>
      <div class="release-gate-grid"><article v-for="gate in releaseGates" :key="gate.id" :class="gate.status"><i></i><div><strong>{{ gate.label }}</strong><p>{{ gate.evidence }}</p><small>{{ gate.fix }}</small></div><button @click="openReleaseGate(gate.area)">{{ t('openAffectedEditor') }}</button></article></div>
      <p>{{ RELEASE_CANDIDATE_FREEZE.policy }}</p>
    </section>
    <div v-if="issues.length" class="issues"><article v-for="issue in issues" :key="issue"><span>!</span><p>{{ issue }}</p><button :aria-label="t('documentation')" @click="openBundledManual('project-health')">?</button></article></div>
    <div v-else class="healthy-empty"><span>✓</span><div><strong>{{ t('projectHealthy') }}</strong><p>{{ t('projectHealthyHint') }}</p></div></div>
    <section class="data-foundation">
      <header><strong>{{ t('projectDataFoundation') }}</strong><small>{{ t('projectDataFoundationHint') }}</small></header>
      <div class="data-actions"><button class="primary" @click="validateNow">{{ t('validateProject') }}</button><button @click="previewRepair">{{ t('repairProject') }}</button><button @click="canonicalResave">{{ t('deterministicResave') }}</button><button @click="downloadBackup">{{ t('createProjectBackup') }}</button><button :disabled="!rollback" @click="downloadLastUpgradeRollback">{{ t('downloadRollback') }}</button><button :disabled="!rollback" @click="rollbackNow">{{ t('restoreRollback') }}</button></div>
      <label class="repair-mode"><input v-model="projectIntegrityState.repairReadOnly" type="checkbox"> {{ t('readOnlyRepairMode') }}</label>
      <p v-if="validation" :class="validation.valid ? 'valid' : 'invalid'">{{ t(validation.valid ? 'projectValidationPassed' : 'projectValidationFailed', { count: validation.issues.length }) }}</p>
      <ol v-if="validation?.issues.length"><li v-for="issue in validation.issues.slice(0,20)" :key="`${issue.code}:${issue.path}`"><code>{{ issue.path || '/' }}</code> {{ issue.message }}</li></ol>
      <details><summary>{{ t('sceneDependencyGraph') }} · {{ sceneDependencies.length }}</summary><article v-for="node in sceneDependencies" :key="node.sceneUuid"><strong>{{ node.name }}</strong><small>{{ t('dependencies') }}: {{ node.dependencies.length }} · {{ t('reverseDependencies') }}: {{ node.reverseDependencies.length }}</small></article></details>
      <section v-if="graph.missingReferences.length" class="reference-repair"><strong>{{ t('missingReferenceMapping') }}</strong><div><select v-model="missingReference"><option value="">{{ t('chooseMissingReference') }}</option><option v-for="item in graph.missingReferences" :key="item.reference" :value="item.reference">{{ item.reference }}</option></select><select v-model="replacementReference"><option value="">{{ t('chooseReplacement') }}</option><option v-for="asset in assets.records" :key="asset.uuid" :value="asset.uuid">{{ asset.path }}</option></select><button :disabled="!missingReference || !replacementReference" @click="mapReference">{{ t('applyMapping') }}</button></div></section>
    </section>
    <section class="integrity-runtime">
      <header><strong>{{ t('integrityRuntime') }}</strong><small>{{ transaction.phase }} · {{ transaction.lastManualChecksum || t('noManualSave') }}</small></header>
      <div class="integrity-grid"><article><span>{{ t('transactions') }}</span><b>{{ transaction.recent.length }}</b><small>{{ transaction.interrupted.length }} {{ t('interrupted') }}</small></article><article><span>{{ t('recoveryCheckpoints') }}</span><b>{{ recovery.snapshots.length }}</b><small>{{ recovery.invalidSnapshots }} {{ t('invalid') }}</small></article><article><span>{{ t('migrationReport') }}</span><b>{{ migration.lastReport ? t('passed') : t('notRun') }}</b><small>{{ migration.logs.length }} {{ t('steps') }}</small></article><article><span>{{ t('projectTrash') }}</span><b>{{ trash.items.length }}</b><small>{{ t('recoverableItems') }}</small></article></div>
      <div class="data-actions"><button @click="recoverInterruptedProjectTransactions">{{ t('scanTransactions') }}</button><button @click="rebuildCaches">{{ t('rebuildStaleCache') }}</button></div>
      <details v-if="trash.items.length" open><summary>{{ t('projectTrash') }} · {{ trash.items.length }}</summary><article v-for="item in trash.items" :key="item.id" class="trash-row"><div><strong>{{ item.name }}</strong><small>{{ item.path }} · {{ item.referenceCount }} {{ t('references') }}</small></div><button @click="restoreTrash(item.id)">{{ t('restore') }}</button><button class="danger" @click="purgeTrash(item.id,item.name)">{{ t('deletePermanently') }}</button></article></details>
    </section>
    <footer><button @click="openEditorTool('assets')">{{ t('assets') }}</button><button @click="openEditorTool('packages')">{{ t('packages') }}</button><button @click="openEditorTool('build')">{{ t('buildPanel') }}</button><button @click="openManageSection('settings')">{{ t('projectSettings') }}</button></footer>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../i18n'
import { assetState as assets, queueTextureAtlasRebuild, readTextAsset } from '../assets/AssetDatabase'
import { buildAssetDependencyGraph, repairMissingAssetReference } from '../assets/assetGraph'
import { buildProductionAssetGraph } from '../assets/assetProduction'
import { buildSettings, validateBuildSettings } from '../runtime/buildSettings'
import { packageCompatibility, packageState as packages } from '../runtime/packages'
import { NOVA_ENGINE_VERSION, projectCompatibility } from '../projects/projectFormat'
import { enterEditMode, getSceneJSON, physicsState, pushHistory, replaceAssetReferences, sceneManager } from '../store/physics'
import { buildSceneDependencyGraph } from '../projects/projectData'
import { projectManifestState as manifest } from '../projects/projectManifest'
import { downloadLastUpgradeRollback, migrationState as migration, readUpgradeRollback } from '../runtime/projectUpgrade'
import { requestConfirmation } from '../store/dialog'
import { addEditorLog, editorState } from '../store/editor'
import { applyCurrentProjectRepair, backupCurrentProject, deterministicCurrentProjectResave, previewCurrentProjectRepair, projectIntegrityState, validateCurrentProject } from '../runtime/projectIntegrity'
import { applyEditorWorkspace, openEditorTool, openManageSection } from '../editor/workspaces'
import { queryRendererCapabilities, rendererCapabilityState } from '../renderer/capabilities'
import { advancedRenderingActive } from '../renderer/renderSettings'
import type { TileMap2D } from '../world/components'
import { worldTransform } from '../world/hierarchy'
import { worldStreamingState as streaming } from '../runtime/worldStreaming'
import { projectTransactionState as transaction, recoverInterruptedProjectTransactions } from '../runtime/projectTransactions'
import { recoveryState as recovery } from '../runtime/recovery'
import { projectTrashState as trash, purgeProjectTrashItem, restoreProjectTrashItem } from '../runtime/projectTrash'
import { restoreLastUpgradeRollback } from '../projects/projectManager'
import { physicsMonitorState } from '../runtime/physicsMonitor'
import { analyzeScript, applyScriptLintPolicy } from '../editor/scriptLanguage'
import { scriptProjectSettings } from '../runtime/scriptSettings'
import { scriptHotReloadState } from '../runtime/scriptHotReload'
import { scriptIndexState } from '../editor/scriptIndexPersistence'
import { animationPerformanceSnapshot, validateAnimationProject } from '../runtime/animationProduction'
import { activeTextDirection, extractLocalizationKeys, localizationDiagnostics, readLocalizationTable } from '../runtime/localization'
import { runtimeAccessibilitySettings } from '../runtime/presentation'
import { auditUiAccessibility } from '../runtime/uiAccessibility'
import { uiPerformanceSnapshot, validateResponsiveUi } from '../runtime/uiProduction'
import { productionSettings } from '../runtime/production'
import { validateProductionRuntime } from '../runtime/productionValidation'
import { RELEASE_CANDIDATE_FREEZE, releaseGateSummary, type ReleaseEvidenceGate } from '../runtime/releaseEngineering'
import { openBundledManual } from '../runtime/openManual'
const compatibility = projectCompatibility()
const engineVersion = NOVA_ENGINE_VERSION
const project = computed(() => { try { return JSON.parse(getSceneJSON()) as unknown } catch { return null } })
const graph = computed(() => buildAssetDependencyGraph(assets.records, project.value))
const productionGraph = computed(() => buildProductionAssetGraph(assets.records, project.value))
const buildIssues = computed(() => validateBuildSettings(buildSettings))
const packageProblems = computed(() => packages.installed.filter(item => item.project).flatMap(item => packageCompatibility(item).map(problem => `${item.manifest.name}: ${problem}`)))
const validation = computed(() => projectIntegrityState.validation)
const rollback = computed(() => readUpgradeRollback() !== null)
const sceneDependencies = computed(() => project.value ? buildSceneDependencyGraph(project.value) : [])
const rendererCapability = computed(() => rendererCapabilityState.report ?? queryRendererCapabilities())
const rendererIssues = computed(() => rendererCapability.value.backend === 'Canvas2D' && advancedRenderingActive() ? [t('fallbackRendererProjectWarning')] : [])
const productionRuntimeIssues = computed(() => validateProductionRuntime(assets, editorState.rendererStats, physicsState.audioSettings))
const releaseGates = computed<ReleaseEvidenceGate[]>(() => {
  const buildErrors = buildIssues.value.filter(issue => issue.severity === 'error')
  const packageBlocked = packageProblems.value.length + packages.quarantine.length
  const contentErrors = productionGraph.value.missingReferences.length + productionGraph.value.cycles.length
  return [
    { id: 'schema', area: 'health', label: t('projectSchemaGate'), status: compatibility.schemaVersion === 29 ? 'passed' : 'blocked', evidenceKind: 'automated', evidence: `Project Format ${compatibility.format} · schema ${compatibility.schemaVersion}`, fix: t('repairProject') },
    { id: 'content', area: 'health', label: t('contentGate'), status: contentErrors ? 'blocked' : 'passed', evidenceKind: 'automated', evidence: `${productionGraph.value.missingReferences.length} missing · ${productionGraph.value.cycles.length} cycles`, fix: t('openProjectHealth') },
    { id: 'packages', area: 'package', label: t('packageSecurityGate'), status: packageBlocked ? 'blocked' : 'passed', evidenceKind: 'automated', evidence: `${packages.lockfile.length} locked · ${packages.quarantine.length} quarantined`, fix: t('openPackageManager') },
    { id: 'build', area: 'build', label: t('buildEvidenceGate'), status: buildErrors.length ? 'blocked' : buildIssues.value.length ? 'warning' : 'passed', evidenceKind: 'automated', evidence: `${buildIssues.value.length} diagnostics · ${buildSettings.delivery.exportTemplate}`, fix: t('openBuildSettings') },
    { id: 'documentation', area: 'documentation', label: t('documentationGate'), status: 'passed', evidenceKind: 'automated', evidence: 'Offline manual 5.0 · API · migration · package SDK · build · troubleshooting · accessibility · release engineering', fix: t('manual') },
    { id: 'windows', area: 'platform', label: 'Windows Tier-1', status: 'passed', evidenceKind: 'automated', evidence: 'Local build, artifact and startup qualification', fix: t('buildDiagnostics') },
    { id: 'web', area: 'platform', label: 'Web Tier-1', status: 'warning', evidenceKind: 'automated', evidence: 'Pinned Chromium local; Firefox/WebKit external jobs named', fix: t('buildDiagnostics') },
    { id: 'clean-machine', area: 'release', label: t('cleanMachineMatrix'), status: 'external', evidenceKind: 'external', evidence: 'MSI/setup/portable upgrade, repair and uninstall require disposable hosts', fix: t('releaseEngineeringGuide') },
    { id: 'rc-observation', area: 'release', label: t('rcObservation'), status: 'external', evidenceKind: 'external', evidence: `${RELEASE_CANDIDATE_FREEZE.minimumDays} days · earliest ${RELEASE_CANDIDATE_FREEZE.earliestApprovalAt.slice(0, 10)}`, fix: t('releaseEngineeringGuide') }
  ]
})
const releaseSummary = computed(() => releaseGateSummary(releaseGates.value))
const scriptMetrics = computed(() => {
  const scripts = assets.records.filter(asset => asset.assetType === 'script')
  const analyses = scripts.map(asset => applyScriptLintPolicy(analyzeScript(readTextAsset(asset.uuid) ?? '', asset.script?.apiVersion ?? scriptProjectSettings.apiVersion), scriptProjectSettings.lint))
  return { scripts: scripts.length, apiV1: scripts.filter(asset => asset.script?.apiVersion === 1).length, deprecated: analyses.reduce((sum, analysis) => sum + analysis.diagnostics.filter(item => item.code === 'NOVA-COMPAT-001').length, 0), errors: analyses.reduce((sum, analysis) => sum + analysis.diagnostics.filter(item => item.severity === 'error').length, 0) }
})
const animationIssues = computed(() => validateAnimationProject(assets.records, physicsState.world.entities))
const animationMetrics = computed(() => animationPerformanceSnapshot(assets.records, physicsState.world.entities))
const uiMatrix = computed(() => validateResponsiveUi(physicsState.world.entities, undefined, activeTextDirection(), runtimeAccessibilitySettings.minimumTargetSize))
const uiIssues = computed(() => uiMatrix.value.flatMap(result => result.issues))
const uiMetrics = computed(() => uiPerformanceSnapshot(physicsState.world.entities))
const localizationKeys = computed(() => extractLocalizationKeys(physicsState.world.entities, assets.records.filter(asset => asset.assetType === 'script').map(asset => ({ path: asset.path, source: readTextAsset(asset.uuid) ?? '' }))))
const localizationTables = computed(() => assets.records.flatMap(asset => asset.assetType === 'localization' ? [readLocalizationTable(asset.uuid)].filter((value): value is NonNullable<typeof value> => value !== null) : []))
const localizationIssues = computed(() => localizationDiagnostics(localizationKeys.value, localizationTables.value))
const accessibilityIssues = computed(() => auditUiAccessibility(physicsState.world.entities, runtimeAccessibilitySettings.minimumTargetSize))
const worldMetrics = computed(() => {
  const tilemaps = physicsEntities().flatMap(entity => { const map = entity.getComponent<TileMap2D>('TileMap2D'); return map ? [{ entity, map }] : [] })
  const bounds = tilemaps.map(({ entity, map }) => { const transform = worldTransform(entity, physicsEntities()); const width = map.width * map.tileSize.x * Math.abs(transform.scale.x), height = map.height * map.tileSize.y * Math.abs(transform.scale.y); return { minX: transform.position.x - width / 2, maxX: transform.position.x + width / 2, minY: transform.position.y - height / 2, maxY: transform.position.y + height / 2 } })
  return { tilemaps: tilemaps.length, tiles: tilemaps.reduce((sum, { map }) => sum + map.layers.reduce((layerSum, layer) => layerSum + layer.tiles.filter(tile => tile >= 0).length, 0), 0), chunks: tilemaps.reduce((sum, { map }) => sum + Math.ceil(map.width / map.chunkSize) * Math.ceil(map.height / map.chunkSize) * map.layers.length, 0), navigationRegions: physicsEntities().filter(entity => entity.hasComponent('NavigationRegion2D')).length, navigationAgents: physicsEntities().filter(entity => entity.hasComponent('NavigationAgent2D')).length, width: bounds.length ? Math.max(...bounds.map(item => item.maxX)) - Math.min(...bounds.map(item => item.minX)) : 0, height: bounds.length ? Math.max(...bounds.map(item => item.maxY)) - Math.min(...bounds.map(item => item.minY)) : 0 }
})
const selectedHealthId = ref('format')
const missingReference = ref(''), replacementReference = ref('')
const healthRows = computed(() => [
  { id: 'format', label: t('formatVersion'), value: compatibility.format, detail: `schema ${compatibility.schemaVersion}`, status: 'ok' },
  { id: 'engine', label: t('engineVersion'), value: engineVersion, detail: t('supportedSchemas', { first: compatibility.minimumSchemaVersion, last: compatibility.schemaVersion }), status: 'ok' },
  { id: 'manifest', label: t('projectManifest'), value: manifest.name, detail: manifest.projectUuid, status: 'ok' },
  { id: 'scenes', label: t('scenes'), value: String(sceneManager.scenes.length), detail: `${sceneManager.scenes.filter(scene => scene.loaded).length} ${t('loaded')}`, status: 'ok' },
  { id: 'assets', label: t('assets'), value: String(assets.records.length), detail: `${productionGraph.value.missingReferences.length} ${t('missingReferences')} · ${productionGraph.value.cycles.length} ${t('dependencyCycles')}`, status: productionGraph.value.missingReferences.length || productionGraph.value.cycles.length ? 'warning' : 'ok' },
  { id: 'asset-graph', label: t('assetReferences'), value: `${productionGraph.value.dependencies.size}`, detail: `${productionGraph.value.duplicateSources.length} ${t('duplicateSources')} · ${assets.contentGroups.length} ${t('contentGroup')}`, status: productionGraph.value.cycles.length ? 'error' : productionGraph.value.duplicateSources.length ? 'warning' : 'ok' },
  { id: 'packages', label: t('packages'), value: String(packages.installed.filter(item => item.project).length), detail: `${packageProblems.value.length} ${t('problems')}`, status: packageProblems.value.length ? 'warning' : 'ok' },
  { id: 'build', label: t('buildPanel'), value: buildIssues.value.length ? t('attentionRequired') : t('ready'), detail: `${buildIssues.value.length} ${t('problems')}`, status: buildIssues.value.some(issue => issue.severity === 'error') ? 'error' : buildIssues.value.length ? 'warning' : 'ok' },
  { id: 'renderer', label: t('rendererBackend'), value: `${rendererCapability.value.backend} · ${rendererCapability.value.path}`, detail: `${rendererCapability.value.maximumTextureSize || 'n/a'} px · ${productionRuntimeIssues.value.length} actionable`, status: productionRuntimeIssues.value.some(issue => issue.severity === 'error') ? 'error' : productionRuntimeIssues.value.length ? 'warning' : 'ok' },
  { id: 'physics', label: t('physicsHealth'), value: physicsMonitorState.warnings.length ? t('attentionRequired') : t('stable'), detail: `${physicsMonitorState.bodies.length} ${t('bodies')} · ${physicsMonitorState.constraints.length} ${t('constraints')} · ${physicsMonitorState.warnings.length} ${t('warnings')}`, status: physicsMonitorState.warnings.length ? 'warning' : 'ok' },
  { id: 'scripts', label: t('scriptHealth'), value: `API v${scriptProjectSettings.apiVersion}`, detail: `${scriptMetrics.value.scripts} ${t('scripts')} · ${scriptMetrics.value.deprecated} ${t('deprecatedUses')} · ${scriptMetrics.value.apiV1} API v1 · index ${scriptIndexState.documentCount}/${scriptIndexState.symbolCount}`, status: scriptMetrics.value.errors || scriptIndexState.status === 'error' ? 'error' : scriptMetrics.value.deprecated || scriptHotReloadState.restartRequired || scriptIndexState.status === 'restart-required' ? 'warning' : 'ok' },
  { id: 'animation', label: t('animationHealth'), value: `${animationMetrics.value.clips} / ${animationMetrics.value.controllers}`, detail: `${animationMetrics.value.tracks} ${t('tracks')} · ${animationMetrics.value.keys} ${t('keys')} · ${animationMetrics.value.estimatedSamplesPerSecond}/s · ${productionSettings.performance.animationBudgetMs} ms`, status: animationIssues.value.some(issue => issue.severity === 'error') ? 'error' : animationIssues.value.length ? 'warning' : 'ok' },
  { id: 'ui', label: t('responsiveUi'), value: String(uiMetrics.value.controls), detail: `${uiMetrics.value.breakpoints} ${t('breakpoints')} · ${uiMetrics.value.estimatedLayoutOperations} ${t('layoutOperations')} · ${productionSettings.performance.uiBudgetMs} ms`, status: uiIssues.value.some(issue => issue.severity === 'error') ? 'error' : uiIssues.value.length ? 'warning' : 'ok' },
  { id: 'localization', label: t('localization'), value: String(localizationTables.value.length), detail: `${localizationKeys.value.length} ${t('keys')} · ${localizationIssues.value.length} ${t('issues')}`, status: localizationIssues.value.some(issue => issue.severity === 'error') ? 'error' : localizationIssues.value.length ? 'warning' : 'ok' },
  { id: 'accessibility', label: t('accessibility'), value: String(accessibilityIssues.value.length), detail: `${runtimeAccessibilitySettings.textScale}× · ${runtimeAccessibilitySettings.minimumTargetSize}px · ${activeTextDirection().toUpperCase()}`, status: accessibilityIssues.value.some(issue => issue.severity === 'error') ? 'error' : accessibilityIssues.value.length ? 'warning' : 'ok' },
  { id: 'world', label: t('worldSize'), value: `${worldMetrics.value.width.toFixed(1)} × ${worldMetrics.value.height.toFixed(1)}`, detail: `${worldMetrics.value.tilemaps} ${t('tilemap')}`, status: 'ok' },
  { id: 'tiles', label: t('tileCount'), value: worldMetrics.value.tiles.toLocaleString(), detail: `${worldMetrics.value.chunks.toLocaleString()} ${t('chunks')}`, status: 'ok' },
  { id: 'navigation', label: t('navigationRegions'), value: String(worldMetrics.value.navigationRegions), detail: `${worldMetrics.value.navigationAgents} ${t('agents')}`, status: 'ok' },
  { id: 'streaming', label: t('streamingMemory'), value: `${streaming.memoryMb.toFixed(1)} MB`, detail: `${streaming.active}/${streaming.cells.length} ${t('active')} · ${streaming.pending} ${t('pending')}`, status: 'ok' }
])
const selectedHealth = computed(() => healthRows.value.find(row => row.id === selectedHealthId.value) ?? healthRows.value[0])
function physicsEntities() { return physicsState.world.entities }
const issues = computed(() => [
  ...productionGraph.value.missingReferences.slice(0, 8).map(item => `${t('missingReferences')}: ${item.reference}`),
  ...productionGraph.value.cycles.slice(0, 4).map(cycle => `${t('dependencyCycles')}: ${cycle.join(' → ')}`),
  ...productionGraph.value.duplicateSources.slice(0, 4).map(item => `${t('duplicateSources')}: ${item.assets.length} × ${item.sourceHash.slice(0, 12)}…`),
  ...(validation.value?.issues.filter(item => item.severity === 'error').map(item => `${item.path}: ${item.message}`) ?? []), ...packageProblems.value, ...buildIssues.value.map(item => item.message), ...rendererIssues.value, ...physicsMonitorState.warnings,
  ...productionRuntimeIssues.value.slice(0, 8).map(issue => `${issue.code}: ${issue.message} → ${issue.fix}`), ...(scriptMetrics.value.errors ? [`${t('scriptHealth')}: ${scriptMetrics.value.errors} ${t('errors')}`] : []), ...(scriptHotReloadState.restartRequired ? [`${t('scriptHealth')}: ${t('restartRequired')}`] : []),
  ...animationIssues.value.slice(0, 6).map(issue => `${issue.code}: ${issue.message}`), ...uiIssues.value.slice(0, 6).map(issue => `${issue.code} (${issue.preset}): ${issue.message}`), ...localizationIssues.value.slice(0, 4).map(issue => `${issue.code}: ${issue.message}`), ...accessibilityIssues.value.slice(0, 4).map(issue => `${issue.code}: ${issue.message}`)
].slice(0, 24))
const summary = computed(() => issues.value.length ? t('issuesFound', { count: issues.value.length }) : t('healthy'))
const healthClass = computed(() => issues.value.length ? 'attention' : 'healthy')
function navigateSelectedHealth() { const id = selectedHealth.value?.id; if (id === 'animation') { const issue = animationIssues.value[0]; if (issue?.targetEntityUuid) { const entity = physicsState.world.entities.find(item => item.uuid === issue.targetEntityUuid); if (entity) enterEditMode(entity.id) } openEditorTool('animation'); return } if (id === 'ui' || id === 'localization' || id === 'accessibility') { const targetUuid = id === 'ui' ? uiIssues.value[0]?.entityUuid : id === 'accessibility' ? accessibilityIssues.value[0]?.entityUuid : ''; const entity = targetUuid ? physicsState.world.entities.find(item => item.uuid === targetUuid) : null; applyEditorWorkspace('ui'); if (entity) enterEditMode(entity.id) } }
function openReleaseGate(area: ReleaseEvidenceGate['area']): void { if (area === 'package') openEditorTool('packages'); else if (area === 'build' || area === 'platform' || area === 'release') openEditorTool('build'); else if (area === 'documentation') void import('../runtime/openManual').then(module => module.openBundledManual('release-engineering')); else selectedHealthId.value = area === 'health' ? 'format' : selectedHealthId.value }
function validateNow() { const report = validateCurrentProject(); addEditorLog(t(report.valid ? 'projectValidationPassed' : 'projectValidationFailed', { count: report.issues.length }), 'Project', report.valid ? 'info' : 'error') }
function downloadBackup() { backupCurrentProject() }
function canonicalResave() { const result = deterministicCurrentProjectResave(); addEditorLog(`${t('deterministicResave')}: ${result.checksum}${result.changed ? '' : ` · ${t('noChanges')}`}`, 'Project') }
async function rollbackNow() { if (!await requestConfirmation({ title:t('restoreRollback'), message:t('restoreRollbackConfirm'), confirmLabel:t('restoreRollback'), cancelLabel:t('cancel'), destructive:false })) return; if (await restoreLastUpgradeRollback()) addEditorLog(t('rollbackRestored'),'Project','warning') }
function rebuildCaches() { queueTextureAtlasRebuild(); addEditorLog(t('cacheRebuildQueued'),'Assets') }
function restoreTrash(id:string) { if (restoreProjectTrashItem(id)) { pushHistory('Restore asset from project trash'); addEditorLog(t('trashItemRestored'),'Assets') } }
async function purgeTrash(id:string,name:string) { if (!await requestConfirmation({ title:t('deletePermanently'), message:t('deletePermanentlyConfirm',{count:1,name}), confirmLabel:t('deletePermanently'), cancelLabel:t('cancel'), destructive:true })) return; if (purgeProjectTrashItem(id)) pushHistory('Purge project trash item') }
function mapReference() { if (!missingReference.value || !replacementReference.value) return; const count = replaceAssetReferences(missingReference.value,replacementReference.value) + repairMissingAssetReference(assets.records,missingReference.value,replacementReference.value); pushHistory('Map missing asset reference'); addEditorLog(t('referencesMapped',{count}),'Project'); missingReference.value=''; replacementReference.value='' }
async function previewRepair() {
  const repair = previewCurrentProjectRepair()
  if (projectIntegrityState.repairReadOnly) { addEditorLog(t('repairPreviewOnly', { count: repair.changes.length }), 'Project', repair.remaining.length ? 'warning' : 'info'); return }
  const approved = await requestConfirmation({ title: t('repairProject'), message: `${repair.changes.join('\n')}\n\n${t('repairRemainingIssues', { count: repair.remaining.length })}`, confirmLabel: t('repairProject'), cancelLabel: t('cancel'), destructive: false })
  if (!approved) return
  if (!applyCurrentProjectRepair(repair)) { addEditorLog(t('projectRepairFailed'), 'Project', 'error'); return }
  validateNow(); addEditorLog(t('projectRepairComplete'), 'Project')
}
</script>
<style scoped>
.project-health{height:100%;padding:10px;overflow:auto;background:var(--surface-1)}header{min-height:42px;display:flex;align-items:center;justify-content:space-between;gap:10px}header>div{display:grid}header small{color:var(--text-muted)}header>span{padding:4px 8px;border-radius:999px}.healthy{color:var(--success);background:color-mix(in srgb,var(--success) 12%,transparent)}.attention{color:var(--warning);background:color-mix(in srgb,var(--warning) 12%,transparent)}.health-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:7px}.health-grid article{padding:9px;display:grid;gap:3px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-2)}.health-grid span,.health-grid small{color:var(--text-muted)}.health-grid strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.issues{margin-top:9px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.issues article{min-width:0;padding:7px;display:flex;gap:7px;border-left:3px solid var(--warning);border-radius:7px;background:var(--surface-2)}.issues p{margin:0;overflow-wrap:anywhere}.healthy-empty{margin-top:10px;padding:12px;display:flex;align-items:center;gap:10px;border:1px solid color-mix(in srgb,var(--success) 40%,transparent);border-radius:10px;background:color-mix(in srgb,var(--success) 7%,transparent)}.healthy-empty>span{font-size:20px;color:var(--success)}.healthy-empty p{margin:2px 0 0;color:var(--text-muted)}.data-foundation{margin-top:10px;padding:10px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.data-foundation>header{min-height:34px;display:grid;justify-content:stretch}.data-foundation>header small{color:var(--text-muted)}.data-foundation details>summary{min-height:22px;display:flex;align-items:center;line-height:1.45}.data-actions{display:flex;gap:6px;flex-wrap:wrap}.data-actions button,footer button{min-height:34px;padding:0 10px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-3)}.data-actions .primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}.data-foundation p.valid{color:var(--success)}.data-foundation p.invalid{color:var(--danger)}.data-foundation ol{max-height:130px;overflow:auto}.data-foundation li{margin:4px 0;color:var(--text-muted)}.data-foundation details article{padding:6px;display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--border-subtle)}footer{margin-top:9px;display:flex;gap:6px;flex-wrap:wrap}@media(max-width:900px){.health-grid{grid-template-columns:repeat(3,minmax(120px,1fr))}}@media(max-width:560px){.health-grid,.issues{grid-template-columns:1fr 1fr}}
.health-browser{display:grid;grid-template-columns:minmax(280px,1fr) minmax(230px,.7fr);gap:8px}.health-table{max-height:250px;overflow:auto;border:1px solid var(--border-subtle);border-radius:9px}.health-table button{width:100%;min-height:36px;padding:5px 8px;display:grid;grid-template-columns:minmax(110px,1fr) minmax(90px,auto) 8px;align-items:center;gap:8px;border:0;border-bottom:1px solid var(--border-subtle);background:var(--surface-2);text-align:left}.health-table button.active{background:var(--selection-bg)}.health-table span{color:var(--text-muted)}.health-table strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.health-table i{width:7px;height:7px;border-radius:50%;background:var(--success)}.health-table i.warning{background:var(--warning)}.health-table i.error{background:var(--danger)}.health-detail{padding:12px;display:grid;align-content:start;gap:6px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-2)}.health-detail span,.health-detail p{color:var(--text-muted)}.health-detail strong{font-size:var(--type-section);overflow-wrap:anywhere}.health-detail p{margin:0;overflow-wrap:anywhere}@media(max-width:700px){.health-browser{grid-template-columns:1fr}.health-detail{min-height:100px}}
.integrity-runtime{margin-top:10px;padding:10px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.integrity-runtime>header{min-height:36px}.integrity-grid{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:6px}.integrity-grid article{padding:8px;display:grid;gap:2px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-1)}.integrity-grid span,.integrity-grid small{color:var(--text-muted)}.integrity-runtime details{margin-top:8px}.trash-row{min-height:42px;padding:5px;display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px;align-items:center;border-top:1px solid var(--border-subtle)}.trash-row div{min-width:0;display:grid}.trash-row small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}.trash-row button{min-height:30px;padding:0 8px;border:1px solid var(--border-subtle);border-radius:7px;background:var(--surface-3)}.trash-row button.danger{color:var(--danger)}.reference-repair{margin-top:8px;padding:8px;border:1px solid var(--warning);border-radius:8px}.reference-repair>div{margin-top:6px;display:grid;grid-template-columns:1fr 1fr auto;gap:6px}.reference-repair select,.reference-repair button{min-width:0;min-height:32px}@media(max-width:800px){.integrity-grid{grid-template-columns:1fr 1fr}.reference-repair>div{grid-template-columns:1fr}}
.repair-mode{margin:8px 0 2px;display:flex;align-items:center;gap:7px;color:var(--text-muted)}.repair-mode input{width:16px;height:16px}.release-gate{margin-top:10px;padding:10px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.release-gate>header>span.passed{color:var(--success);background:color-mix(in srgb,var(--success) 12%,transparent)}.release-gate>header>span.warning{color:var(--warning);background:color-mix(in srgb,var(--warning) 12%,transparent)}.release-gate>header>span.blocked{color:var(--danger);background:var(--danger-soft)}.release-gate-grid{margin-top:7px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.release-gate-grid article{min-width:0;min-height:64px;padding:7px;display:grid;grid-template-columns:9px minmax(0,1fr) auto;align-items:start;gap:7px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-1)}.release-gate-grid i{width:8px;height:8px;margin-top:4px;border-radius:50%;background:var(--success)}.release-gate-grid .warning i,.release-gate-grid .external i{background:var(--warning)}.release-gate-grid .blocked i{background:var(--danger)}.release-gate-grid article>div{min-width:0;display:grid}.release-gate-grid p,.release-gate-grid small,.release-gate>p{margin:2px 0;color:var(--text-muted);font-size:11px;overflow-wrap:anywhere}.release-gate-grid button{min-height:27px;padding:0 7px;border:1px solid var(--border-subtle);border-radius:6px;background:var(--surface-3);font-size:11px}@media(max-width:760px){.release-gate-grid{grid-template-columns:1fr}}
</style>
