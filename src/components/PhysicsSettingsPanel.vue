<!-- 物理项目设置：配置世界求解、单位、边界及材料。 -->
<template>
  <section class="physics-workspace" @focusin="form17.focus" @change="form17.change">
    <UiPanelHeader :title="t('physicsSettings')" :description="t('physicsProductionDescription')"></UiPanelHeader>
    <UiTabs :aria-label="t('physicsSettings')" :model-value="tab" :items="tabs.map(item => ({...item,label:t(item.label)}))" @update:model-value="tab = tabs.find(item => item.id === $event)?.id ?? tab" />

    <p v-if="form17.error.value" role="alert" class="form-error17">{{ form17.error.value }}</p>
    <SimulationStatusPanel17 />
    <div v-if="tab === 'simulation'" class="ui-section-list">
      <UiPropertySection :title="t('physicsQualityProfile')" class="profile-card">

        <UiPropertyRow :label="t('qualityProfile')"><select v-model="physics.globalSettings.profile.id" @change="applyQualityProfile"><option value="Accurate">{{ t('accurateProfile') }}</option><option value="Balanced">{{ t('balancedProfile') }}</option><option value="Fast">{{ t('fastProfile') }}</option><option value="Custom">{{ t('customProfile') }}</option></select></UiPropertyRow>
        <UiPropertyRow :label="t('droppedTimePolicy')"><select v-model="physics.globalSettings.profile.droppedTimePolicy"><option value="Drop">{{ t('dropTime') }}</option><option value="PreserveBacklog">{{ t('preserveBacklog') }}</option><option value="SlowMotion">{{ t('slowMotionPolicy') }}</option></select></UiPropertyRow>
        <UiPropertyRow :label="t('minimumSubsteps')"><NumericExpressionInput v-model="physics.globalSettings.profile.minimumSubsteps" :minimum="1" :maximum="128" resource-key="project:physics.globalSettings.profile.minimumSubsteps" /></UiPropertyRow>
        <UiPropertyRow :label="t('velocityIterations')"><NumericExpressionInput v-model="physics.globalSettings.profile.velocityIterations" :minimum="1" :maximum="128" resource-key="project:physics.globalSettings.profile.velocityIterations" /></UiPropertyRow>
        <UiPropertyRow :label="t('positionIterations')"><NumericExpressionInput v-model="physics.globalSettings.profile.positionIterations" :minimum="1" :maximum="128" resource-key="project:physics.globalSettings.profile.positionIterations" /></UiPropertyRow>
        <p class="stability-label"><strong>{{ t('stable') }}</strong> {{ t('physicsDeterminismBoundary') }}</p>
      </UiPropertySection>
      <UiPropertySection :title="t('simulationSettings')" >

        <UiPropertyRow :label="t('globalGravity')"><div><NumericExpressionInput v-model="physics.globalSettings.gravity" :step="0.01" resource-key="project:physics.globalSettings.gravity" /><em>m/s²</em></div></UiPropertyRow>
        <UiPropertyRow :label="t('globalAirDamping')"><div><NumericExpressionInput v-model="physics.globalSettings.airFriction" :minimum="0" :step="0.01" resource-key="project:physics.globalSettings.airFriction" /><em>s⁻¹</em></div></UiPropertyRow>
        <UiPropertyRow :label="t('timeScale')"><NumericExpressionInput v-model="physics.globalSettings.timeScale" :minimum="0" :step="0.1" resource-key="project:physics.globalSettings.timeScale" /></UiPropertyRow>
        <UiPropertyRow :label="t('physicsTickRate')"><div><NumericExpressionInput v-model="physics.globalSettings.profile.tickRate" :minimum="1" :maximum="1000" :step="1" resource-key="project:physics.globalSettings.profile.tickRate" /><em>Hz</em></div></UiPropertyRow>
        <UiPropertyRow :label="t('maxCatchUpSteps')"><NumericExpressionInput v-model="physics.globalSettings.profile.maxCatchUpSteps" :minimum="1" :maximum="240" :step="1" resource-key="project:physics.globalSettings.profile.maxCatchUpSteps" /></UiPropertyRow>
        <UiPropertyRow :label="t('physicsInterpolation')"><select v-model="physics.globalSettings.profile.interpolation"><option value="Interpolate">{{ t('interpolate') }}</option><option value="None">{{ t('noInterpolation') }}</option></select></UiPropertyRow>
        <UiPropertyRow :label="t('sleepLinearThreshold')"><div><NumericExpressionInput v-model="physics.globalSettings.profile.sleepLinearThreshold" :minimum="0" :step="0.0001" resource-key="project:physics.globalSettings.profile.sleepLinearThreshold" /><em>m/s</em></div></UiPropertyRow>
        <UiPropertyRow :label="t('sleepAngularThreshold')"><div><NumericExpressionInput v-model="physics.globalSettings.profile.sleepAngularThreshold" :minimum="0" :step="0.0001" resource-key="project:physics.globalSettings.profile.sleepAngularThreshold" /><em>rad/s</em></div></UiPropertyRow>
        <UiPropertyRow :label="t('timeToSleep')"><div><NumericExpressionInput v-model="physics.globalSettings.profile.timeToSleep" :minimum="0" :step="0.05" resource-key="project:physics.globalSettings.profile.timeToSleep" /><em>s</em></div></UiPropertyRow>
        <UiPropertyRow :label="t('physicsBudget')"><div><NumericExpressionInput v-model="physics.globalSettings.profile.physicsBudgetMs" :minimum="0.1" :maximum="1000" :step="0.1" resource-key="project:physics.globalSettings.profile.physicsBudgetMs" /><em>ms</em></div></UiPropertyRow>
      </UiPropertySection>
      <UiPropertySection :title="t('fixedStepDiagnostics')" class="diagnostics-card">

        <dl>
          <div><dt>{{ t('runtimeBodies') }}</dt><dd>{{ physics.engineDiagnostics.bodyCount }}</dd></div>
          <div><dt>{{ t('stepsLastFrame') }}</dt><dd>{{ physics.engineDiagnostics.stepsLastFrame }}</dd></div>
          <div><dt>{{ t('interpolationAlpha') }}</dt><dd>{{ physics.engineDiagnostics.interpolationAlpha.toFixed(3) }}</dd></div>
          <div><dt>{{ t('droppedTime') }}</dt><dd>{{ physics.engineDiagnostics.droppedSeconds.toFixed(4) }} s</dd></div>
          <div><dt>{{ t('pendingEvents') }}</dt><dd>{{ physics.engineDiagnostics.eventCount }}</dd></div>
          <div><dt>{{ t('configurationRebuilds') }}</dt><dd>{{ physics.engineDiagnostics.configurationRebuilds }}</dd></div>
        </dl>
        <div class="notice"><strong>CCD</strong><span>{{ t('ccdCostDescription') }}</span></div>
        <div class="notice"><strong>{{ t('sleeping') }}</strong><span>{{ t('sleepDiagnosticsDescription') }}</span></div>
        <button @click="openPhysicsDebugger">{{ t('openPhysicsDebugger') }}</button>
      </UiPropertySection>
      <UiPropertySection :title="t('physicsUnits')" class="units-card">

        <dl><div v-for="(unit, name) in PHYSICS_UNITS" :key="name"><dt>{{ name }}</dt><dd>{{ unit }}</dd></div></dl>
        <p>{{ t('transformOwnershipDescription') }}</p>
      </UiPropertySection>
    </div>

    <div v-else-if="tab === 'layers'" class="layer-workspace">
      <div class="layer-toolbar"><input v-model="layerSearch" type="search" :placeholder="t('searchPhysicsLayers')"><select v-model="preset" :aria-label="t('layerPreset')"><option value="">{{ t('layerPreset') }}</option><option value="platformer">Platformer</option><option value="topdown">Top-down</option><option value="puzzle">Puzzle</option></select><button :disabled="!preset" @click="applyLayerPreset">{{ t('applyPreset') }}</button></div>
      <div class="layer-list">
        <article v-for="layer in visibleLayers" :key="layer.id">
          <b>{{ layer.id + 1 }}</b><input v-model="layer.color" type="color"><input v-model.trim="layer.name" maxlength="48" :aria-label="t('physicsLayer') + ' ' + (layer.id+1) + ' — ' + t('name')"><input v-model.trim="layer.description" maxlength="240" :placeholder="t('layerDescription')">
        </article>
      </div>
      <section class="pair-editor">
        <h3>{{ t('collisionPairs') }}</h3>
        <select v-model.lazy.number="pairA" :aria-label="t('collisionPairs') + ' A'"><option v-for="layer in physics.globalSettings.layers" :key="layer.id" :value="layer.id">{{ layer.name }}</option></select><span>↔</span><select v-model.lazy.number="pairB" :aria-label="t('collisionPairs') + ' B'"><option v-for="layer in physics.globalSettings.layers" :key="layer.id" :value="layer.id">{{ layer.name }}</option></select>
        <button :class="{ active: layersCollide(pairA, pairB) }" @click="toggleLayerCollision(pairA, pairB)">{{ layersCollide(pairA, pairB) ? t('collides') : t('doesNotCollide') }}</button>
      </section>
      <details data-ui-motion-disclosure class="advanced-matrix"><summary>{{ t('advancedCollisionMatrix') }}</summary><div class="matrix-scroll"><div class="matrix-header"><span></span><b v-for="column in layerIds" :key="column" :title="layerLabel(column)">{{ column + 1 }}</b></div><div v-for="row in layerIds" :key="row" class="matrix-row"><b :title="layerLabel(row)">{{ row + 1 }}</b><button v-for="column in layerIds" :key="column" :class="{ active: layersCollide(row, column) }" :aria-label="`${layerLabel(row)} / ${layerLabel(column)}`" @click="toggleLayerCollision(row, column)"></button></div></div></details>
    </div>

    <div v-else-if="tab === 'materials'" class="material-workspace">
      <aside><UiButton icon="add" class="primary" @click="newMaterial">{{ t('physicsMaterial') }}</UiButton><button v-for="asset in materialAssets" :key="asset.uuid" :class="{ active: asset.uuid === selectedMaterial }" @click="selectMaterial(asset.uuid)"><strong>{{ materialName(asset.uuid) }}</strong><span>{{ asset.path }}</span></button></aside>
      <article v-if="draft" class="material-editor">
        <UiPropertyRow :label="t('name')"><input v-model.trim="draft.name" maxlength="80"></UiPropertyRow>
        <UiPropertyRow :label="t('density')"><div><input v-model.lazy.number="draft.density" type="number" min="0.000000001" step="0.1"><em>kg/m²</em></div></UiPropertyRow>
        <UiPropertyRow :label="t('staticFriction')"><input v-model.lazy.number="draft.staticFriction" type="number" min="0" step="0.05"></UiPropertyRow>
        <UiPropertyRow :label="t('dynamicFriction')"><input v-model.lazy.number="draft.dynamicFriction" type="number" min="0" step="0.05"></UiPropertyRow>
        <UiPropertyRow :label="t('restitution')"><input v-model.lazy.number="draft.restitution" type="number" min="0" max="1" step="0.05"></UiPropertyRow>
        <UiPropertyRow :label="t('restitutionThreshold')"><div><input v-model.lazy.number="draft.restitutionThreshold" type="number" min="0" step="0.1"><em>m/s</em></div></UiPropertyRow>
        <UiPropertyRow :label="t('frictionCombine')"><select v-model="draft.frictionCombine"><option v-for="mode in combineModes" :key="mode">{{ mode }}</option></select></UiPropertyRow>
        <UiPropertyRow :label="t('restitutionCombine')"><select v-model="draft.restitutionCombine"><option v-for="mode in combineModes" :key="mode">{{ mode }}</option></select></UiPropertyRow>
        <button class="primary" @click="saveMaterial">{{ t('saveAsset') }}</button>
      </article><p v-else>{{ t('selectPhysicsMaterial') }}</p>
    </div>

    <div v-else class="conformance-workspace">
      <article><header><h3>{{ t('shapeSupport') }}</h3><span>{{ Object.keys(PHYSICS_SHAPE_SUPPORT).length }}</span></header><div v-for="(support, kind) in PHYSICS_SHAPE_SUPPORT" :key="kind" class="support-row"><strong>{{ kind }}</strong><b :class="support.simulation">{{ support.simulation }}</b><span>{{ support.note }}</span></div></article>
      <article><header><h3>{{ t('physicsConformanceSuite') }}</h3><span>{{ PHYSICS_CONFORMANCE_CASES.length }}</span></header><div class="case-grid"><span v-for="test in PHYSICS_CONFORMANCE_CASES" :key="test">✓ {{ test }}</span></div><button class="primary" @click="openTestRunner">{{ t('openTestRunner') }}</button></article>
    </div>
  </section>
</template>

<script setup lang="ts">
import NumericExpressionInput from './NumericExpressionInput.vue'
import SimulationStatusPanel17 from './SimulationStatusPanel17.vue'
import { useSimulationFormGuard17 } from '../editor/simulationForm17'

import { computed, ref } from 'vue'
import { assetState, createTextAsset, readTextAsset, updateTextAsset } from '../assets/AssetDatabase'
import { openEditorTool } from '../editor/workspaces'
import { t } from '../i18n'
import { normalizeGlobalSettings, physicsState as physics, pushHistory } from '../store/physics'
import { PHYSICS_CONFORMANCE_CASES, PHYSICS_SHAPE_SUPPORT, PHYSICS_UNITS, applyPhysicsProfile, defaultPhysicsMaterial, normalizePhysicsMaterial, type PhysicsCombineMode, type PhysicsMaterialAsset2D } from '../runtime/physicsProduction'

const form17 = useSimulationFormGuard17(commit)
const tab = ref<'simulation' | 'layers' | 'materials' | 'conformance'>('simulation')
const tabs = [{ id: 'simulation' as const, label: 'simulationSettings' as const }, { id: 'layers' as const, label: 'collisionLayers' as const }, { id: 'materials' as const, label: 'physicsMaterials' as const }, { id: 'conformance' as const, label: 'conformance' as const }]
const layerSearch = ref('')
const pairA = ref(0)
const pairB = ref(0)
const preset = ref('')
const layerIds = Array.from({ length: 32 }, /* 返回 index 的当前值。 */ (_, index) => index)
const combineModes: PhysicsCombineMode[] = ['Average', 'Minimum', 'Maximum', 'Multiply']
const selectedMaterial = ref('')
const draft = ref<PhysicsMaterialAsset2D | null>(null)
const materialAssets = computed(/* 调用 assetState.records.filter(asset => asset.assetType === 'material' && parseMaterial(asset.uuid)) 并返回调用结果。 */ () => assetState.records.filter(/* 先计算 asset.assetType === 'material'；仅当其为真值时求右侧 parseMaterial(asset.uuid)，返回短路求值结果。 */ asset => asset.assetType === 'material' && parseMaterial(asset.uuid)))
const visibleLayers = computed(/** 按规范化搜索词过滤物理图层名称和说明。 */ () => { const needle = layerSearch.value.trim().toLocaleLowerCase(); return physics.globalSettings.layers.filter(/* 先计算 !needle；仅当其为假值时求右侧 `${layer.name} ${layer.description}`.toLocaleLowerCase().includes(needle)，返回短路求值结果。 */ layer => !needle || `${layer.name} ${layer.description}`.toLocaleLowerCase().includes(needle)) })

/** 把图层编号转换为无符号三十二位掩码位。 */ function layerBit(layer: number) { return (2 ** layer) >>> 0 }
/* 当 physics.globalSettings.layers[layer]?.name 为 null 或 undefined 时返回 `Layer ${layer + 1}`，否则保留左侧值。 */ function layerLabel(layer: number) { return physics.globalSettings.layers[layer]?.name ?? `Layer ${layer + 1}` }
/** 仅当碰撞矩阵双方都允许时认为图层对可碰撞。 */ function layersCollide(first: number, second: number) { return (physics.globalSettings.collisionMatrix[first] & layerBit(second)) !== 0 && (physics.globalSettings.collisionMatrix[second] & layerBit(first)) !== 0 }
/** 对称切换两个图层的碰撞位并记录历史。 */ function toggleLayerCollision(first: number, second: number) { const enabled = !layersCollide(first, second); const firstBit = layerBit(second), secondBit = layerBit(first); physics.globalSettings.collisionMatrix[first] = enabled ? (physics.globalSettings.collisionMatrix[first] | firstBit) >>> 0 : (physics.globalSettings.collisionMatrix[first] & ~firstBit) >>> 0; physics.globalSettings.collisionMatrix[second] = enabled ? (physics.globalSettings.collisionMatrix[second] | secondBit) >>> 0 : (physics.globalSettings.collisionMatrix[second] & ~secondBit) >>> 0; pushHistory('Edit collision pair') }
/** 将当前质量配置中的 tick、补步上限和插值同步至全局设置。 */ function syncProfile() { physics.globalSettings.tickRate = physics.globalSettings.profile.tickRate; physics.globalSettings.maxCatchUpSteps = physics.globalSettings.profile.maxCatchUpSteps; physics.globalSettings.interpolation = physics.globalSettings.profile.interpolation }
/** 同步配置并归一化全局物理设置，然后记录历史。 */ function commit() { syncProfile(); normalizeGlobalSettings(); pushHistory('Edit physics settings') }
/** 选择非自定义质量档时应用预设，再同步并提交。 */ function applyQualityProfile() { const id = physics.globalSettings.profile.id; if (id !== 'Custom') physics.globalSettings.profile = applyPhysicsProfile(id); syncProfile(); commit() }
/** 打开性能分析工具作为物理调试入口。 */ function openPhysicsDebugger() { openEditorTool('profiler') }
/** 打开性能分析工具中的测试入口。 */ function openTestRunner() { openEditorTool('profiler') }

/** 按平台、俯视或其他预设命名图层，并重建预设范围内互通的碰撞矩阵及历史。 */ function applyLayerPreset() {
  const names = preset.value === 'platformer' ? ['World', 'Player', 'Enemy', 'Pickup', 'Trigger', 'Projectile'] : preset.value === 'topdown' ? ['World', 'Player', 'Enemy', 'Interactable', 'Trigger', 'Projectile'] : ['World', 'Pieces', 'Goals', 'Trigger', 'Decoration']
  names.forEach(/** 给存在的图层写入预设名称与说明。 */ (name, id) => { const layer = physics.globalSettings.layers[id]; if (layer) { layer.name = name; layer.description = `${preset.value} preset · ${name}` } })
  physics.globalSettings.collisionMatrix = layerIds.map(/** 为单行计算预设已使用图层的碰撞位掩码。 */ row => layerIds.reduce(/* 根据 row < names.length && column < names.length 的真假，分别返回 (mask | layerBit(column)) >>> 0 或 mask。 */ (mask, column) => row < names.length && column < names.length ? (mask | layerBit(column)) >>> 0 : mask, 0))
  pushHistory('Apply physics layer preset')
}

/** 读取并解析物理材料，仅接受对应格式，解析失败返回空值。 */ function parseMaterial(uuid: string): PhysicsMaterialAsset2D | null { const source = readTextAsset(uuid); if (!source) return null; try { const parsed = JSON.parse(source) as Record<string, unknown>; return parsed.format === 'nova-physics-material' ? normalizePhysicsMaterial(parsed) : null } catch { return null } }
/* 当 parseMaterial(uuid)?.name 为 null 或 undefined 时返回 t('physicsMaterial')，否则保留左侧值。 */ function materialName(uuid: string) { return parseMaterial(uuid)?.name ?? t('physicsMaterial') }
/** 选中材料资源并载入其编辑草稿。 */ function selectMaterial(uuid: string) { selectedMaterial.value = uuid; draft.value = parseMaterial(uuid) }
/** 创建默认命名物理材料资源，选中它并记录创建历史。 */ function newMaterial() { const material = defaultPhysicsMaterial(`Physics Material ${materialAssets.value.length + 1}`); const asset = createTextAsset(material.name, 'material', JSON.stringify(material, null, 2), 'Assets/Materials/Physics'); selectMaterial(asset.uuid); pushHistory('Create physics material') }
/** 存在草稿与选择时归一化材料并保存源内容，记录保存历史。 */ function saveMaterial() { if (!draft.value || !selectedMaterial.value) return; draft.value = normalizePhysicsMaterial(draft.value); updateTextAsset(selectedMaterial.value, JSON.stringify(draft.value, null, 2)); pushHistory('Save physics material') }
</script>

<style scoped>
.physics-workspace{grid-column:1/-1;min-width:0;padding:var(--space-4);border:1px solid var(--border-subtle);background:var(--surface-1)}.physics-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);margin-bottom:var(--space-3)}.physics-heading>div{min-width:0;display:flex;gap:var(--space-2)}.physics-heading h2,.conformance-workspace h3,.pair-editor h3{margin:0}.physics-heading p,.units-card p{margin:var(--space-1) 0 0;color:var(--text-muted);line-height:1.45}.physics-heading nav{display:flex;gap:var(--space-1);flex-wrap:wrap;justify-content:flex-end}.physics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(430px,100%),1fr));gap:var(--space-2)}.material-editor em{color:var(--text-muted);font-style:normal;white-space:nowrap}.diagnostics-card dl,.units-card dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-1)}.diagnostics-card dl div,.units-card dl div{padding:var(--space-2);border:1px solid var(--border-subtle);background:var(--surface-3)}dt{color:var(--text-muted)}dd{margin:var(--space-0) 0 0}.notice{margin-top:var(--space-2);padding:var(--space-2);display:grid;grid-template-columns:70px 1fr;gap:var(--space-2);background:var(--surface-3)}.notice span{color:var(--text-muted);line-height:1.4}.units-card{grid-column:1/-1}.units-card dl{grid-template-columns:repeat(5,minmax(0,1fr))}.layer-toolbar{display:grid;grid-template-columns:minmax(180px,1fr) 180px auto;gap:var(--space-2)}.layer-list{max-height:310px;margin-top:var(--space-2);overflow:auto;border:1px solid var(--border-subtle)}.layer-list article{min-width:650px;padding:var(--space-1) var(--space-2);display:grid;grid-template-columns:24px 34px minmax(130px,.7fr) minmax(250px,1.3fr);gap:var(--space-2);align-items:center;border-bottom:1px solid var(--border-subtle)}.layer-list article:last-child{border-bottom:0}.pair-editor{margin-top:var(--space-2);padding:var(--space-2);display:grid;grid-template-columns:auto minmax(130px,1fr) auto minmax(130px,1fr) auto;gap:var(--space-2);align-items:center;border:1px solid var(--border-subtle);background:var(--surface-2)}.advanced-matrix{margin-top:var(--space-2)}.advanced-matrix summary{display:block;min-height:18px;cursor:pointer;color:var(--text-secondary);line-height:1.5}.matrix-scroll{max-width:100%;margin-top:var(--space-2);padding:var(--space-2);overflow:auto;border:1px solid var(--border-subtle);background:var(--surface-2)}.matrix-header,.matrix-row{width:max-content;display:grid;grid-template-columns:30px repeat(32,18px);gap:var(--ui-control-gap);align-items:center}.matrix-header b,.matrix-row>b{text-align:center}.matrix-row button{width:18px;height:var(--ui-control-height);padding:0;border:1px solid var(--border-subtle);background:var(--surface-3)}.matrix-row button.active{background:var(--accent);border-color:var(--accent)}.material-workspace{min-height:330px;display:grid;grid-template-columns:minmax(190px,.7fr) minmax(280px,1.3fr);gap:var(--space-2)}.material-workspace aside{display:flex;flex-direction:column;gap:var(--space-1)}.material-editor{padding:var(--space-3);border:1px solid var(--border-subtle);background:var(--surface-2)}.primary{color:var(--accent)!important;border-color:var(--accent)!important}.conformance-workspace{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)}.conformance-workspace>article{padding:var(--space-3);border:1px solid var(--border-subtle);background:var(--surface-2)}.conformance-workspace header{display:flex;justify-content:space-between}.support-row{padding:var(--space-1) 0;display:grid;grid-template-columns:110px 130px 1fr;gap:var(--space-2);border-bottom:1px solid var(--border-subtle)}.support-row b{color:var(--accent)}.support-row span{color:var(--text-muted)}.case-grid{margin:var(--space-2) 0;display:grid;grid-template-columns:1fr 1fr;gap:var(--space-1)}.case-grid span{overflow:hidden;color:var(--text-secondary);text-overflow:ellipsis;white-space:nowrap}@media(max-width:1200px){.physics-grid{grid-template-columns:1fr}}@media(max-width:800px){.physics-heading{flex-direction:column}.conformance-workspace,.material-workspace{grid-template-columns:1fr}.units-card dl{grid-template-columns:repeat(2,minmax(0,1fr))}.layer-toolbar,.pair-editor{grid-template-columns:1fr}.pair-editor span{display:none}}
.physics-workspace{container-type:inline-size}.form-error17{color:var(--danger,#d95065);overflow-wrap:anywhere}
@container(max-width:640px){.physics-grid{grid-template-columns:minmax(0,1fr)!important}}
/* 26.26：按实际面板宽度折叠表单，而不是只依赖浏览器宽度；碰撞矩阵保留独立二维滚动。 */
@container(max-width:640px){
 .physics-heading{flex-direction:column}.physics-heading nav{justify-content:flex-start}
 .material-workspace,.conformance-workspace,.layer-toolbar,.pair-editor{grid-template-columns:minmax(0,1fr)}
 .material-workspace>*{min-width:0}
 .layer-list{max-height:none;overflow:visible}.layer-list article{min-width:0;grid-template-columns:24px 34px minmax(0,1fr)}
 .support-row{grid-template-columns:minmax(0,1fr)}.case-grid{grid-template-columns:minmax(0,1fr)}.case-grid span{white-space:normal;overflow-wrap:anywhere}
 .units-card dl{grid-template-columns:repeat(2,minmax(0,1fr))}
}
</style>
