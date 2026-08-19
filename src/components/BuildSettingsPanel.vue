<template>
  <section class="build-panel" data-doc="manual/build-automation">
    <header class="build-header">
      <div><strong>{{ t('buildPanel') }}</strong><p>{{ t('shippingWorkspaceHint') }}</p></div>
      <nav role="tablist"><button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ t(tab.label) }}</button></nav>
    </header>
    <div class="build-body">
      <main class="build-workspace">
        <section v-if="activeTab === 'overview'" class="tab-page overview-page">
          <div class="section-heading"><div><strong>{{ t('buildOverview') }}</strong><p>{{ targetNote }}</p></div><span :class="['target-badge', currentSupport.tier]">{{ supportTier }} · {{ targetLabel }} · {{ buildSettings.architecture }}</span></div>
          <div class="field-grid">
            <label><span>{{ t('buildPreset') }}</span><select :value="buildSettings.presetName" @change="applyBuildPreset(($event.target as HTMLSelectElement).value)"><option value="custom">{{ t('custom') }}</option><option v-for="preset in BUILTIN_BUILD_PRESETS" :key="preset.id" :value="preset.id">{{ preset.name }}</option></select></label>
            <label><span>{{ t('buildGameName') }}</span><input v-model="buildSettings.gameName" maxlength="80"></label>
            <label><span>{{ t('buildTarget') }}</span><select v-model="buildSettings.target"><option v-for="platform in selectablePlatforms" :key="platform.id" :value="platform.id">{{ platform.label }} · {{ platformTierLabel(platform.tier) }}</option></select></label>
            <label><span>{{ t('architecture') }}</span><select v-model="buildSettings.architecture"><option value="x86_64">x86_64</option><option value="aarch64">aarch64</option></select></label>
            <label><span>{{ t('buildProfile') }}</span><select :value="buildSettings.profile" @change="setBuildProfile(($event.target as HTMLSelectElement).value as BuildProfile)"><option value="debug">{{ t('debugProfile') }}</option><option value="release">{{ t('releaseProfile') }}</option></select></label>
            <label><span>{{ t('runtimeMode') }}</span><select v-model="buildSettings.runtimeMode"><option value="game">{{ t('gameRuntime') }}</option><option value="headless-server">{{ t('headlessServer') }}</option></select></label>
            <label class="wide"><span>{{ t('outputDirectory') }}</span><input v-model="buildSettings.outputDirectory" :placeholder="t('defaultOutput')"></label>
            <label class="check"><input v-model="buildSettings.packageIntoExecutable" type="checkbox" :disabled="!singleFileAvailable"><span>{{ t('packageExecutable') }}</span></label>
          </div>
          <section class="scenes-card">
            <header><strong>{{ t('sceneOrder') }}</strong><span>{{ t('startupScene') }}</span></header>
            <article v-for="(uuid, index) in buildSettings.sceneOrder" :key="uuid"><span class="index">{{ index + 1 }}</span><strong>{{ sceneName(uuid) }}</strong><label><input v-model="buildSettings.startupSceneUuid" type="radio" :value="uuid"><span>{{ t('startupScene') }}</span></label><button :disabled="index === 0" :title="t('moveUp')" @click="move(index, -1)">↑</button><button :disabled="index === buildSettings.sceneOrder.length - 1" :title="t('moveDown')" @click="move(index, 1)">↓</button></article>
          </section>
        </section>

        <section v-else-if="activeTab === 'platform'" class="tab-page">
          <div class="section-heading"><div><strong>{{ t('platformPreset') }}</strong><p>{{ t('platformPresetHint') }}</p></div><button @click="applyPreset">{{ t('applyRecommendedPreset') }}</button></div>
          <div class="field-grid">
            <label><span>{{ t('applicationIdentifier') }}</span><input v-model="buildSettings.platform.identifier" maxlength="160"></label>
            <label><span>{{ t('applicationVersion') }}</span><input v-model="buildSettings.platform.version" maxlength="40"></label>
            <label><span>{{ t('orientation') }}</span><select v-model="buildSettings.platform.orientation"><option value="auto">{{ t('automatic') }}</option><option value="landscape">{{ t('landscape') }}</option><option value="portrait">{{ t('portrait') }}</option></select></label>
            <label><span>{{ t('iconAsset') }}</span><input v-model="iconAsset" placeholder="asset://GUID"></label>
            <label><span>{{ t('splashAsset') }}</span><input v-model="splashAsset" placeholder="asset://GUID"></label>
            <label><span>{{ t('platformManifest') }}</span><input v-model="manifestAsset" placeholder="asset://GUID"></label>
            <label class="wide"><span>{{ t('permissions') }}</span><input v-model="permissionText" :placeholder="t('permissionsPlaceholder')"></label>
            <label><span>{{ t('signingMode') }}</span><select v-model="buildSettings.platform.signingMode"><option value="none">{{ t('unsigned') }}</option><option value="manual">{{ t('manualSigning') }}</option></select></label>
            <label v-if="buildSettings.platform.signingMode === 'manual'"><span>{{ t('signingIdentity') }}</span><input v-model="buildSettings.platform.signingIdentity"></label>
            <label v-if="buildSettings.target === 'macos'"><span>{{ t('notarizationProfile') }}</span><input v-model="buildSettings.platform.notarizationProfile"></label>
          </div>
          <div class="guidance"><strong>{{ t('platformGuidance') }}</strong><p>{{ platformGuidance }}</p><p v-if="buildSettings.target === 'android'">{{ exportCapabilities.androidReason }}</p></div>
        </section>

        <section v-else-if="activeTab === 'delivery'" class="tab-page">
          <div class="section-heading"><div><strong>{{ t('deliveryPipeline') }}</strong><p>{{ t('deliveryPipelineHint') }}</p></div></div>
          <div class="option-grid">
            <label><input v-model="buildSettings.delivery.deterministic" type="checkbox"><span><strong>{{ t('reproducibleBuild') }}</strong><small>{{ t('reproducibleBuildHint') }}</small></span></label>
            <label><input v-model="buildSettings.delivery.incremental" type="checkbox"><span><strong>{{ t('incrementalBuild') }}</strong><small>{{ t('incrementalBuildHint') }}</small></span></label>
            <label><input v-model="buildSettings.delivery.patchManifest" type="checkbox"><span><strong>{{ t('patchManifest') }}</strong><small>{{ t('patchManifestHint') }}</small></span></label>
            <label><input v-model="buildSettings.delivery.structuredLogs" type="checkbox"><span><strong>{{ t('structuredLogs') }}</strong><small>{{ t('structuredLogsHint') }}</small></span></label>
            <label><input v-model="buildSettings.delivery.crashReports" type="checkbox"><span><strong>{{ t('crashCapture') }}</strong><small>{{ t('crashCaptureHint') }}</small></span></label>
            <label><input v-model="buildSettings.delivery.stripUnusedAssets" type="checkbox"><span><strong>{{ t('stripUnusedAssets') }}</strong><small>{{ t('stripUnusedAssetsHint') }}</small></span></label>
            <label><input v-model="buildSettings.delivery.sizeReport" type="checkbox"><span><strong>{{ t('buildSizeReport') }}</strong><small>{{ t('buildSizeReportHint') }}</small></span></label>
            <label><input v-model="buildSettings.delivery.dependencyReport" type="checkbox"><span><strong>{{ t('dependencyReport') }}</strong><small>{{ t('dependencyReportHint') }}</small></span></label>
            <label><input v-model="buildSettings.delivery.debugSymbols" type="checkbox"><span><strong>{{ t('debugSymbols') }}</strong><small>{{ t('debugSymbolsHint') }}</small></span></label>
            <label><input v-model="buildSettings.delivery.crashSymbols" type="checkbox"><span><strong>{{ t('crashSymbols') }}</strong><small>{{ t('crashSymbolsHint') }}</small></span></label>
          </div>
          <div class="field-grid delivery-fields"><label><span>{{ t('cacheMode') }}</span><select v-model="buildSettings.delivery.cacheMode"><option value="clean">{{ t('cleanBuild') }}</option><option value="incremental">{{ t('incrementalBuild') }}</option><option value="validate">{{ t('validateCache') }}</option></select></label><label><span>{{ t('compression') }}</span><select v-model="buildSettings.delivery.compression"><option value="store">{{ t('storeCompression') }}</option><option value="balanced">{{ t('balancedCompression') }}</option><option value="maximum">{{ t('maximumCompression') }}</option></select></label><label><span>{{ t('includeRules') }}</span><input v-model="includeRules" placeholder="Assets/**"></label><label><span>{{ t('excludeRules') }}</span><input v-model="excludeRules" placeholder="**/*.psd, .nova/**"></label></div>
          <section class="privacy-card">
            <header><div><strong>{{ t('optInTelemetry') }}</strong><small>{{ t('telemetryDisabledDefault') }}</small></div><input v-model="buildSettings.delivery.telemetryEnabled" type="checkbox"></header>
            <div v-if="buildSettings.delivery.telemetryEnabled" class="field-grid"><label><span>{{ t('telemetryEndpoint') }}</span><input v-model="buildSettings.delivery.telemetryEndpoint" placeholder="https://"></label><label><span>{{ t('privacyPolicy') }}</span><input v-model="buildSettings.delivery.privacyPolicyUrl" placeholder="https://"></label></div>
            <ul><li v-for="line in privacySummary" :key="line">{{ line }}</li></ul>
          </section>
          <section class="cli-card"><strong>{{ t('commandLineExport') }}</strong><code>pnpm nova export --project project.nova --target {{ buildSettings.target }} --profile {{ buildSettings.profile }} --cache {{ buildSettings.delivery.cacheMode }} --jsonl</code><p>{{ t('commandLineExportHint') }}</p></section>
        </section>

        <section v-else-if="activeTab === 'diagnostics'" class="tab-page diagnostics-page">
          <div class="section-heading"><div><strong>{{ t('buildDiagnostics') }}</strong><p>{{ t('buildDiagnosticsHint') }}</p></div></div>
          <section class="support-matrix"><article v-for="platform in PLATFORM_SUPPORT_MATRIX" :key="platform.id"><span :class="['support-badge', platform.tier]">{{ platformTierLabel(platform.tier) }}</span><div><strong>{{ platform.label }} · {{ platform.architectures.join(', ') }}</strong><p>{{ platform.reason }}</p></div></article></section>
          <section class="history-card"><header><strong>{{ t('buildHistory') }}</strong><span>{{ buildHistory.length }}</span></header><article v-for="entry in buildHistory" :key="entry.id"><span :class="entry.status">{{ entry.status }}</span><div><strong>{{ entry.target }} · {{ entry.profile }} · {{ entry.buildId.slice(0, 12) }}</strong><small>{{ new Date(entry.finishedAt).toLocaleString() }} · {{ entry.outputPath }}</small></div><b>{{ Math.round(entry.sizeBytes / 1024) }} KB</b></article><p v-if="!buildHistory.length">{{ t('noBuildHistory') }}</p></section>
        </section>

        <TeamWorkflowPanel v-else />
      </main>

      <aside class="build-actions">
        <header><strong>{{ progressTitle }}</strong><span :class="['validation-dot', hasErrors ? 'error' : 'ready']"></span></header>
        <p>{{ buildProgress.message || t('buildIdle') }}</p><div class="progress"><i :style="{ width: `${buildProgress.percent}%` }"></i></div>
        <code v-if="buildProgress.outputPath">{{ buildProgress.outputPath }}</code>
        <section class="validation-list"><article v-for="issue in issues" :key="issue.code" :class="issue.severity"><strong>{{ issue.severity }}</strong><span>{{ issue.message }}</span></article><p v-if="!issues.length">{{ t('buildValidationPassed') }}</p></section>
        <dl><div><dt>{{ t('buildCacheHits') }}</dt><dd>{{ buildProgress.cacheHits }}</dd></div><div><dt>{{ t('changedFiles') }}</dt><dd>{{ buildProgress.changedFiles }}</dd></div><div><dt>{{ t('host') }}</dt><dd>{{ exportCapabilities.host }}</dd></div></dl>
        <button class="primary" :disabled="busy || hasErrors" @click="runBuild(false)">{{ t('build') }}</button><button :disabled="busy || hasErrors || buildSettings.target === 'web' || buildSettings.target === 'android'" @click="runBuild(true)">{{ t('buildAndRun') }}</button>
        <p v-if="buildSettings.runtimeMode === 'headless-server'" class="note">{{ t('headlessServerHint') }}</p>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { t } from '../i18n'
import { BUILTIN_BUILD_PRESETS, applyBuildPreset, buildHistory, buildProgress, buildSettings, detectExportCapabilities, exportCapabilities, persistBuildLocalSettings, setBuildProfile, synchronizeBuildScenes, validateBuildSettings, type BuildProfile } from '../runtime/buildSettings'
import { PLATFORM_SUPPORT_MATRIX, platformSupport, platformTierLabel, selectableBuildPlatforms } from '../runtime/platformSupport'
import { buildGame, failBuild } from '../runtime/gameExporter'
import { sceneManager } from '../store/physics'
import { telemetryPrivacySummary } from '../runtime/shipping'
import TeamWorkflowPanel from './TeamWorkflowPanel.vue'
import { completeTask, failTask, startTask, updateTask } from '../runtime/editorFeedback'

type BuildTab = 'overview' | 'platform' | 'delivery' | 'diagnostics' | 'team'
const tabs: Array<{ id: BuildTab; label: string }> = [{ id: 'overview', label: 'buildOverview' }, { id: 'platform', label: 'platformPreset' }, { id: 'delivery', label: 'deliveryPipeline' }, { id: 'diagnostics', label: 'buildDiagnostics' }, { id: 'team', label: 'teamWorkflow' }]
const activeTab = ref<BuildTab>('overview')
const busy = computed(() => ['validating', 'packing', 'exporting'].includes(buildProgress.phase))
const issues = computed(() => validateBuildSettings(buildSettings))
const hasErrors = computed(() => issues.value.some(issue => issue.severity === 'error'))
const singleFileAvailable = computed(() => buildSettings.target === 'windows' || buildSettings.target === 'linux')
const selectablePlatforms = selectableBuildPlatforms()
const currentSupport = computed(() => platformSupport(buildSettings.target))
const supportTier = computed(() => platformTierLabel(currentSupport.value.tier))
const targetLabel = computed(() => buildSettings.target === 'windows' ? t('windows') : buildSettings.target === 'linux' ? t('linux') : buildSettings.target === 'macos' ? t('macos') : buildSettings.target === 'web' ? t('web') : 'Android')
const targetNote = computed(() => buildSettings.target === 'web' ? t('webExportNote') : buildSettings.target === 'android' ? t('androidExportNote') : t('hostTargetNote'))
const progressTitle = computed(() => t(buildProgress.phase === 'idle' ? 'buildIdle' : buildProgress.phase === 'validating' ? 'buildValidating' : buildProgress.phase === 'packing' ? 'buildPacking' : buildProgress.phase === 'exporting' ? 'buildExporting' : buildProgress.phase === 'complete' ? 'buildComplete' : 'buildFailed'))
const privacySummary = computed(() => telemetryPrivacySummary().map(key => t(key)))
const permissionText = computed({ get: () => buildSettings.platform.permissions.join(', '), set: value => { buildSettings.platform.permissions = [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))].slice(0, 64) } })
const iconAsset = computed({ get: () => buildSettings.platform.iconAsset ?? '', set: value => { buildSettings.platform.iconAsset = value.trim() || null } })
const splashAsset = computed({ get: () => buildSettings.platform.splashAsset ?? '', set: value => { buildSettings.platform.splashAsset = value.trim() || null } })
const manifestAsset = computed({ get: () => buildSettings.platform.manifestAsset ?? '', set: value => { buildSettings.platform.manifestAsset = value.trim() || null } })
const includeRules = computed({ get: () => buildSettings.delivery.include.join(', '), set: value => { buildSettings.delivery.include = value.split(',').map(item => item.trim()).filter(Boolean).slice(0, 128) } })
const excludeRules = computed({ get: () => buildSettings.delivery.exclude.join(', '), set: value => { buildSettings.delivery.exclude = value.split(',').map(item => item.trim()).filter(Boolean).slice(0, 128) } })
const platformGuidance = computed(() => buildSettings.target === 'windows' ? t('windowsSigningGuide') : buildSettings.target === 'macos' ? t('macSigningGuide') : buildSettings.target === 'linux' ? t('linuxPackagingGuide') : buildSettings.target === 'android' ? t('androidSigningGuide') : t('webHostingGuide'))
function sceneName(uuid: string) { return sceneManager.scenes.find(scene => scene.uuid === uuid)?.name ?? uuid }
function move(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= buildSettings.sceneOrder.length) return; const [uuid] = buildSettings.sceneOrder.splice(index, 1); buildSettings.sceneOrder.splice(target, 0, uuid) }
function applyPreset(): void { buildSettings.platform.orientation = buildSettings.target === 'android' ? 'landscape' : 'auto'; buildSettings.packageIntoExecutable = buildSettings.target === 'windows' || buildSettings.target === 'linux'; buildSettings.delivery.deterministic = true; buildSettings.delivery.incremental = true; buildSettings.delivery.patchManifest = true }
async function runBuild(run: boolean) { const task = startTask(t('build'), { detail: `${buildSettings.target} · ${buildSettings.profile}`, progress: 0 }); try { const result = await buildGame(run); updateTask(task, { progress: 1 }); completeTask(task, result.outputPath) } catch (error) { failBuild(error); failTask(task, error) } }
onMounted(() => { synchronizeBuildScenes(sceneManager.scenes.map(scene => scene.uuid)); void detectExportCapabilities() })
watch(() => buildSettings.target, target => { buildSettings.presetName = 'custom'; if (target === 'web' || target === 'macos' || target === 'android') buildSettings.packageIntoExecutable = false })
watch(() => buildSettings.delivery.cacheMode, mode => { buildSettings.delivery.incremental = mode !== 'clean' })
watch(() => [buildSettings.outputDirectory, buildSettings.platform.signingIdentity, buildSettings.platform.notarizationProfile], persistBuildLocalSettings)
</script>

<style scoped>
.build-panel{height:100%;min-width:0;display:flex;flex-direction:column;overflow:hidden;container-type:inline-size}.build-header{min-height:48px;padding:5px 8px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border-subtle);background:var(--surface-1)}.build-header>div{min-width:160px;display:grid}.build-header>div strong{font-size:12px}.build-header>div p{margin:2px 0 0;overflow:hidden;color:var(--text-muted);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.build-header nav{min-width:0;display:flex;gap:3px;overflow-x:auto;scrollbar-width:none}.build-header nav::-webkit-scrollbar{display:none}.build-header nav button{min-width:max-content;min-height:32px;padding:0 10px;border:0;border-radius:8px;color:var(--text-muted);background:transparent;font-size:11px}.build-header nav button.active{color:var(--accent);background:var(--accent-soft)}.build-body{min-height:0;flex:1;display:grid;grid-template-columns:minmax(420px,1fr) minmax(220px,285px)}.build-workspace{min-width:0;min-height:0;overflow:hidden}.tab-page{height:100%;padding:11px;overflow:auto;scrollbar-gutter:stable}.section-heading{min-height:44px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.section-heading>div{min-width:0}.section-heading strong{font-size:13px}.section-heading p{margin:3px 0 9px;color:var(--text-muted);font-size:11px;line-height:1.45}.section-heading>button{min-height:30px;padding:0 9px;border:1px solid var(--border-subtle);border-radius:7px;background:var(--surface-2)}.target-badge{padding:4px 8px;border:1px solid var(--accent);border-radius:999px;color:var(--accent);background:var(--accent-soft);font-size:11px;white-space:nowrap}.field-grid{display:grid;grid-template-columns:repeat(2,minmax(150px,1fr));gap:8px}.field-grid label{min-width:0;display:flex;flex-direction:column;gap:4px;color:var(--text-muted);font-size:11px}.field-grid input,.field-grid select{width:100%;min-width:0}.field-grid .wide{grid-column:1/-1}.field-grid .check{min-height:32px;flex-direction:row;align-items:center}.field-grid .check input{width:auto}.scenes-card{margin-top:10px;border:1px solid var(--border-subtle);border-radius:10px;overflow:hidden}.scenes-card>header,.scenes-card article{min-height:34px;padding:4px 8px;display:grid;grid-template-columns:28px minmax(100px,1fr) 115px 28px 28px;gap:5px;align-items:center;border-bottom:1px solid var(--border-subtle)}.scenes-card>header{display:flex;justify-content:space-between;color:var(--text-muted);background:var(--surface-2);font-size:11px}.scenes-card article:last-child{border-bottom:0}.scenes-card .index{color:var(--text-muted);text-align:center}.scenes-card article>strong{overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.scenes-card article label{display:flex;align-items:center;gap:4px;color:var(--text-muted);font-size:11px}.scenes-card button{width:27px;height:26px;border:1px solid var(--border-subtle);border-radius:6px;background:var(--surface-2)}.guidance,.privacy-card,.cli-card{margin-top:12px;padding:10px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.guidance p,.privacy-card li,.cli-card p{color:var(--text-muted);font-size:11px;line-height:1.5}.option-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:7px}.option-grid label{min-height:56px;padding:8px;display:flex;align-items:flex-start;gap:8px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-2)}.option-grid label span{display:grid}.option-grid strong{font-size:11px}.option-grid small{margin-top:2px;color:var(--text-muted);font-size:11px;line-height:1.4}.compact-fields{margin-top:10px;max-width:360px}.privacy-card header{display:flex;align-items:center;justify-content:space-between}.privacy-card header>div{display:grid}.privacy-card header small{color:var(--text-muted);font-size:11px}.privacy-card .field-grid{margin-top:9px}.privacy-card ul{padding-left:17px}.cli-card code{padding:8px;display:block;overflow:auto;border-radius:7px;color:var(--accent);background:var(--input-bg);font:11px/1.5 ui-monospace,Consolas,monospace;white-space:nowrap}.build-actions{min-width:0;padding:11px;overflow:auto;border-left:1px solid var(--border-subtle);background:var(--surface-2)}.build-actions>header{display:flex;align-items:center;justify-content:space-between}.validation-dot{width:8px;height:8px;border-radius:50%}.validation-dot.ready{background:var(--success)}.validation-dot.error{background:var(--danger)}.build-actions>p{color:var(--text-muted);font-size:11px;line-height:1.45}.progress{height:6px;margin:9px 0;overflow:hidden;border-radius:999px;background:var(--surface-3)}.progress i{height:100%;display:block;border-radius:inherit;background:var(--accent);transition:width 180ms ease}.build-actions>code{margin-bottom:8px;display:block;overflow-wrap:anywhere;color:var(--accent);font-size:11px}.validation-list{max-height:150px;overflow:auto}.validation-list article{margin:4px 0;padding:6px;display:grid;grid-template-columns:48px 1fr;gap:5px;border-radius:7px;background:var(--surface-3);font-size:11px}.validation-list article.error strong{color:var(--danger)}.validation-list article.warning strong{color:var(--warning)}.validation-list>p{color:var(--success);font-size:11px}.build-actions dl{margin:9px 0}.build-actions dl div{padding:5px 0;display:flex;justify-content:space-between;border-bottom:1px solid var(--border-subtle);font-size:11px}.build-actions dt{color:var(--text-muted)}.build-actions dd{margin:0;color:var(--accent)}.build-actions>button{width:100%;min-height:32px;margin-top:6px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-3)}.build-actions>button.primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}.note{margin-top:10px}@container(max-width:720px){.build-header>div{display:none}.build-body{grid-template-columns:1fr;overflow:auto}.build-workspace{min-height:280px;overflow:visible}.tab-page{height:auto;min-height:280px;overflow:visible}.build-actions{border-top:1px solid var(--border-subtle);border-left:0}.field-grid{grid-template-columns:1fr 1fr}}@container(max-width:480px){.field-grid{grid-template-columns:1fr}.field-grid .wide{grid-column:auto}.scenes-card article{grid-template-columns:24px minmax(80px,1fr) 28px 28px}.scenes-card article label{display:none}}
</style>
<style scoped>
.target-badge.experimental,.support-badge.experimental{color:var(--warning);border-color:var(--warning);background:color-mix(in srgb,var(--warning) 10%,transparent)}
.target-badge.unsupported,.support-badge.unsupported{color:var(--danger);border-color:var(--danger);background:var(--danger-soft)}
.delivery-fields{margin-top:10px}
.support-matrix,.history-card{border:1px solid var(--border-subtle);border-radius:10px;overflow:hidden;background:var(--surface-2)}
.support-matrix article,.history-card article{min-width:0;min-height:50px;padding:7px 9px;display:grid;grid-template-columns:88px minmax(0,1fr);align-items:center;gap:9px;border-bottom:1px solid var(--border-subtle)}
.support-matrix article:last-child,.history-card article:last-child{border-bottom:0}.support-matrix article div,.history-card article div{min-width:0;display:grid}.support-matrix p{margin:2px 0;color:var(--text-muted);font-size:11px;line-height:1.4}.support-badge{padding:4px 6px;border:1px solid var(--accent);border-radius:999px;color:var(--accent);font-size:11px;text-align:center;white-space:nowrap}
.history-card{margin-top:10px}.history-card header{min-height:36px;padding:6px 9px;display:flex;align-items:center;justify-content:space-between;background:var(--surface-3)}.history-card article{grid-template-columns:62px minmax(0,1fr) auto}.history-card article>span{font-size:11px;text-transform:uppercase}.history-card article>span.complete{color:var(--success)}.history-card article>span.failed{color:var(--danger)}.history-card small{overflow:hidden;color:var(--text-muted);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.history-card b{color:var(--accent);font-size:11px}.history-card>p{padding:14px;color:var(--text-muted);text-align:center}
</style>
