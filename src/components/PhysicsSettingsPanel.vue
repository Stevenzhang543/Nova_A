<!-- 物理项目设置：配置世界求解、单位、边界及材料。 -->
<template>
  <section class="physics-workspace" @focusin="form17.focus" @change="form17.change">
    <header class="physics-heading">
      <div><span class="card-icon">⌁</span><div><h2>{{ t('physicsSettings') }}</h2><p>{{ t('physicsProductionDescription') }}</p></div></div>
      <nav><button v-for="item in tabs" :key="item.id" :class="{ active: tab === item.id }" @click="tab = item.id">{{ t(item.label) }}</button></nav>
    </header>

    <p v-if="form17.error.value" role="alert" class="form-error17">{{ form17.error.value }}</p>
    <SimulationStatusPanel17 />
    <div v-if="tab === 'simulation'" class="physics-grid">
      <article class="physics-card profile-card">
        <h3>{{ t('physicsQualityProfile') }}</h3>
        <label><span>{{ t('qualityProfile') }}</span><select v-model="physics.globalSettings.profile.id" @change="applyQualityProfile"><option value="Accurate">{{ t('accurateProfile') }}</option><option value="Balanced">{{ t('balancedProfile') }}</option><option value="Fast">{{ t('fastProfile') }}</option><option value="Custom">{{ t('customProfile') }}</option></select></label>
        <label><span>{{ t('droppedTimePolicy') }}</span><select v-model="physics.globalSettings.profile.droppedTimePolicy"><option value="Drop">{{ t('dropTime') }}</option><option value="PreserveBacklog">{{ t('preserveBacklog') }}</option><option value="SlowMotion">{{ t('slowMotionPolicy') }}</option></select></label>
        <label><span>{{ t('minimumSubsteps') }}</span><NumericExpressionInput v-model="physics.globalSettings.profile.minimumSubsteps" :minimum="1" :maximum="128" resource-key="project:physics.globalSettings.profile.minimumSubsteps" /></label>
        <label><span>{{ t('velocityIterations') }}</span><NumericExpressionInput v-model="physics.globalSettings.profile.velocityIterations" :minimum="1" :maximum="128" resource-key="project:physics.globalSettings.profile.velocityIterations" /></label>
        <label><span>{{ t('positionIterations') }}</span><NumericExpressionInput v-model="physics.globalSettings.profile.positionIterations" :minimum="1" :maximum="128" resource-key="project:physics.globalSettings.profile.positionIterations" /></label>
        <p class="stability-label"><strong>{{ t('stable') }}</strong> {{ t('physicsDeterminismBoundary') }}</p>
      </article>
      <article class="physics-card">
        <h3>{{ t('simulationSettings') }}</h3>
        <label><span>{{ t('globalGravity') }}</span><div><NumericExpressionInput v-model="physics.globalSettings.gravity" :step="0.01" resource-key="project:physics.globalSettings.gravity" /><em>m/s²</em></div></label>
        <label><span>{{ t('globalAirDamping') }}</span><div><NumericExpressionInput v-model="physics.globalSettings.airFriction" :minimum="0" :step="0.01" resource-key="project:physics.globalSettings.airFriction" /><em>s⁻¹</em></div></label>
        <label><span>{{ t('timeScale') }}</span><NumericExpressionInput v-model="physics.globalSettings.timeScale" :minimum="0" :step="0.1" resource-key="project:physics.globalSettings.timeScale" /></label>
        <label><span>{{ t('physicsTickRate') }}</span><div><NumericExpressionInput v-model="physics.globalSettings.profile.tickRate" :minimum="1" :maximum="1000" :step="1" resource-key="project:physics.globalSettings.profile.tickRate" /><em>Hz</em></div></label>
        <label><span>{{ t('maxCatchUpSteps') }}</span><NumericExpressionInput v-model="physics.globalSettings.profile.maxCatchUpSteps" :minimum="1" :maximum="240" :step="1" resource-key="project:physics.globalSettings.profile.maxCatchUpSteps" /></label>
        <label><span>{{ t('physicsInterpolation') }}</span><select v-model="physics.globalSettings.profile.interpolation"><option value="Interpolate">{{ t('interpolate') }}</option><option value="None">{{ t('noInterpolation') }}</option></select></label>
        <label><span>{{ t('sleepLinearThreshold') }}</span><div><NumericExpressionInput v-model="physics.globalSettings.profile.sleepLinearThreshold" :minimum="0" :step="0.0001" resource-key="project:physics.globalSettings.profile.sleepLinearThreshold" /><em>m/s</em></div></label>
        <label><span>{{ t('sleepAngularThreshold') }}</span><div><NumericExpressionInput v-model="physics.globalSettings.profile.sleepAngularThreshold" :minimum="0" :step="0.0001" resource-key="project:physics.globalSettings.profile.sleepAngularThreshold" /><em>rad/s</em></div></label>
        <label><span>{{ t('timeToSleep') }}</span><div><NumericExpressionInput v-model="physics.globalSettings.profile.timeToSleep" :minimum="0" :step="0.05" resource-key="project:physics.globalSettings.profile.timeToSleep" /><em>s</em></div></label>
        <label><span>{{ t('physicsBudget') }}</span><div><NumericExpressionInput v-model="physics.globalSettings.profile.physicsBudgetMs" :minimum="0.1" :maximum="1000" :step="0.1" resource-key="project:physics.globalSettings.profile.physicsBudgetMs" /><em>ms</em></div></label>
      </article>
      <article class="physics-card diagnostics-card">
        <h3>{{ t('fixedStepDiagnostics') }}</h3>
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
      </article>
      <article class="physics-card units-card">
        <h3>{{ t('physicsUnits') }}</h3>
        <dl><div v-for="(unit, name) in PHYSICS_UNITS" :key="name"><dt>{{ name }}</dt><dd>{{ unit }}</dd></div></dl>
        <p>{{ t('transformOwnershipDescription') }}</p>
      </article>
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
      <details class="advanced-matrix"><summary>{{ t('advancedCollisionMatrix') }}</summary><div class="matrix-scroll"><div class="matrix-header"><span></span><b v-for="column in layerIds" :key="column" :title="layerLabel(column)">{{ column + 1 }}</b></div><div v-for="row in layerIds" :key="row" class="matrix-row"><b :title="layerLabel(row)">{{ row + 1 }}</b><button v-for="column in layerIds" :key="column" :class="{ active: layersCollide(row, column) }" :aria-label="`${layerLabel(row)} / ${layerLabel(column)}`" @click="toggleLayerCollision(row, column)"></button></div></div></details>
    </div>

    <div v-else-if="tab === 'materials'" class="material-workspace">
      <aside><button class="primary" @click="newMaterial">+ {{ t('physicsMaterial') }}</button><button v-for="asset in materialAssets" :key="asset.uuid" :class="{ active: asset.uuid === selectedMaterial }" @click="selectMaterial(asset.uuid)"><strong>{{ materialName(asset.uuid) }}</strong><span>{{ asset.path }}</span></button></aside>
      <article v-if="draft" class="material-editor">
        <label><span>{{ t('name') }}</span><input v-model.trim="draft.name" maxlength="80"></label>
        <label><span>{{ t('density') }}</span><div><input v-model.lazy.number="draft.density" type="number" min="0.000000001" step="0.1"><em>kg/m²</em></div></label>
        <label><span>{{ t('staticFriction') }}</span><input v-model.lazy.number="draft.staticFriction" type="number" min="0" step="0.05"></label>
        <label><span>{{ t('dynamicFriction') }}</span><input v-model.lazy.number="draft.dynamicFriction" type="number" min="0" step="0.05"></label>
        <label><span>{{ t('restitution') }}</span><input v-model.lazy.number="draft.restitution" type="number" min="0" max="1" step="0.05"></label>
        <label><span>{{ t('restitutionThreshold') }}</span><div><input v-model.lazy.number="draft.restitutionThreshold" type="number" min="0" step="0.1"><em>m/s</em></div></label>
        <label><span>{{ t('frictionCombine') }}</span><select v-model="draft.frictionCombine"><option v-for="mode in combineModes" :key="mode">{{ mode }}</option></select></label>
        <label><span>{{ t('restitutionCombine') }}</span><select v-model="draft.restitutionCombine"><option v-for="mode in combineModes" :key="mode">{{ mode }}</option></select></label>
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
.physics-workspace{grid-column:1/-1;min-width:0;padding:18px;border:1px solid var(--border-subtle);border-radius:var(--radius-lg);background:var(--surface-1);box-shadow:var(--shadow-sm)}.physics-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:14px}.physics-heading>div{min-width:0;display:flex;gap:10px}.card-icon{display:grid;place-items:center;flex:0 0 30px;height:30px;border-radius:9px;color:var(--accent);background:var(--accent-soft);font-size:16px}.physics-heading h2,.physics-card h3,.conformance-workspace h3,.pair-editor h3{margin:0;font-size:14px}.physics-heading p,.units-card p{margin:4px 0 0;color:var(--text-muted);font-size:12px;line-height:1.45}.physics-heading nav{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}.physics-heading button,.layer-toolbar button,.pair-editor button,.material-workspace button,.conformance-workspace button,.diagnostics-card>button{min-height:32px;padding:0 11px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}.physics-heading button.active,.pair-editor button.active,.material-workspace aside button.active{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}.physics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(430px,100%),1fr));gap:10px}.physics-card{min-width:0;padding:12px;border:1px solid var(--border-subtle);border-radius:11px;background:var(--surface-2)}.physics-card>label,.material-editor>label{min-height:38px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;border-top:1px solid var(--border-subtle);font-size:12px}.physics-card>label>span,.material-editor>label>span{min-width:0;flex:1 1 180px;overflow-wrap:anywhere}.physics-card label>input,.physics-card label>div,.material-editor label>input,.material-editor label>div{width:min(190px,55%);min-width:0}.physics-card label>select,.material-editor label>select{width:min(230px,100%);min-width:min(210px,100%);max-width:230px;flex:1 1 210px}.physics-card label>div,.material-editor label>div{display:flex;align-items:center;gap:6px}.physics-card label>div input,.material-editor label>div input{min-width:0;width:100%}.physics-card em,.material-editor em{color:var(--text-muted);font-size:11px;font-style:normal;white-space:nowrap}.diagnostics-card dl,.units-card dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.diagnostics-card dl div,.units-card dl div{padding:8px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-3)}dt{color:var(--text-muted);font-size:11px}dd{margin:3px 0 0;font-size:12px}.notice{margin-top:7px;padding:8px;display:grid;grid-template-columns:70px 1fr;gap:7px;border-radius:8px;background:var(--surface-3);font-size:11px}.notice span{color:var(--text-muted);line-height:1.4}.units-card{grid-column:1/-1}.units-card dl{grid-template-columns:repeat(5,minmax(0,1fr))}.layer-toolbar{display:grid;grid-template-columns:minmax(180px,1fr) 180px auto;gap:7px}.layer-list{max-height:310px;margin-top:10px;overflow:auto;border:1px solid var(--border-subtle);border-radius:10px}.layer-list article{min-width:650px;padding:5px 8px;display:grid;grid-template-columns:24px 34px minmax(130px,.7fr) minmax(250px,1.3fr);gap:7px;align-items:center;border-bottom:1px solid var(--border-subtle)}.layer-list article:last-child{border-bottom:0}.layer-list input{min-width:0;width:100%}.layer-list input[type=color]{height:28px;padding:2px}.pair-editor{margin-top:10px;padding:10px;display:grid;grid-template-columns:auto minmax(130px,1fr) auto minmax(130px,1fr) auto;gap:8px;align-items:center;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.advanced-matrix{margin-top:10px}.advanced-matrix summary{display:block;min-height:18px;cursor:pointer;color:var(--text-secondary);font-size:12px;line-height:1.5}.matrix-scroll{max-width:100%;margin-top:8px;padding:7px;overflow:auto;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.matrix-header,.matrix-row{width:max-content;display:grid;grid-template-columns:30px repeat(32,18px);gap:3px;align-items:center}.matrix-header b,.matrix-row>b{font-size:11px;text-align:center}.matrix-row button{width:18px;height:18px;padding:0;border:1px solid var(--border-subtle);border-radius:4px;background:var(--surface-3)}.matrix-row button.active{background:var(--accent);border-color:var(--accent)}.material-workspace{min-height:330px;display:grid;grid-template-columns:minmax(190px,.7fr) minmax(280px,1.3fr);gap:10px}.material-workspace aside{display:flex;flex-direction:column;gap:6px}.material-workspace aside button{text-align:left}.material-workspace aside button strong,.material-workspace aside button span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.material-workspace aside button span{color:var(--text-muted);font-size:11px}.material-editor{padding:12px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.primary{color:var(--accent)!important;border-color:var(--accent)!important}.conformance-workspace{display:grid;grid-template-columns:1fr 1fr;gap:10px}.conformance-workspace>article{padding:12px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.conformance-workspace header{display:flex;justify-content:space-between}.support-row{padding:6px 0;display:grid;grid-template-columns:110px 130px 1fr;gap:7px;border-bottom:1px solid var(--border-subtle);font-size:11px}.support-row b{color:var(--accent)}.support-row span{color:var(--text-muted)}.case-grid{margin:9px 0;display:grid;grid-template-columns:1fr 1fr;gap:5px}.case-grid span{overflow:hidden;color:var(--text-secondary);font-size:11px;text-overflow:ellipsis;white-space:nowrap}@media(max-width:1200px){.physics-grid{grid-template-columns:1fr}}@media(max-width:800px){.physics-heading{flex-direction:column}.conformance-workspace,.material-workspace{grid-template-columns:1fr}.units-card dl{grid-template-columns:repeat(2,minmax(0,1fr))}.layer-toolbar,.pair-editor{grid-template-columns:1fr}.pair-editor span{display:none}}
.profile-card{background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 8%,var(--surface-2)),var(--surface-2))}.stability-label{margin:8px 0 0;padding:8px;border-radius:8px;color:var(--text-muted);background:var(--surface-3);font-size:11px;line-height:1.45}.stability-label strong{margin-right:6px;color:var(--success);text-transform:uppercase}
.physics-card label>div input,.material-editor label>div input{width:0;flex:1 1 0}
.physics-workspace{container-type:inline-size}.physics-card label>span{white-space:normal;overflow-wrap:anywhere}.physics-card label input,.physics-card label select{min-height:34px;min-width:0;max-width:100%}.form-error17{color:var(--danger,#d95065);overflow-wrap:anywhere}
@container(max-width:640px){.physics-grid{grid-template-columns:minmax(0,1fr)!important}.physics-card label{display:grid;grid-template-columns:minmax(0,1fr);gap:6px}.physics-card label>input,.physics-card label>select,.physics-card label>div{width:100%}}
label:has(.numeric-draft){flex-wrap:wrap;align-items:stretch}label>div:has(.numeric-draft){display:flex;flex-wrap:wrap;gap:6px}.numeric-draft{max-width:100%}
/* 26.26：按实际面板宽度折叠表单，而不是只依赖浏览器宽度；碰撞矩阵保留独立二维滚动。 */
@container(max-width:640px){
 .physics-heading{flex-direction:column}.physics-heading nav{justify-content:flex-start}
 .material-workspace,.conformance-workspace,.layer-toolbar,.pair-editor{grid-template-columns:minmax(0,1fr)}
 .material-workspace>*{min-width:0}.material-workspace aside button strong,.material-workspace aside button span{white-space:normal;overflow-wrap:anywhere;text-overflow:clip}
 .layer-list{max-height:none;overflow:visible}.layer-list article{min-width:0;grid-template-columns:24px 34px minmax(0,1fr)}.layer-list article>input:last-child{grid-column:1/-1}
 .support-row{grid-template-columns:minmax(0,1fr)}.case-grid{grid-template-columns:minmax(0,1fr)}.case-grid span{white-space:normal;overflow-wrap:anywhere}
 .units-card dl{grid-template-columns:repeat(2,minmax(0,1fr))}
}
</style>
