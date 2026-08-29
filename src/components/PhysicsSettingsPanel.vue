<template>
  <section class="physics-workspace" @change="commit">
    <header class="physics-heading">
      <div><span class="card-icon">⌁</span><div><h2>{{ t('physicsSettings') }}</h2><p>{{ t('physicsProductionDescription') }}</p></div></div>
      <nav><button v-for="item in tabs" :key="item.id" :class="{ active: tab === item.id }" @click="tab = item.id">{{ t(item.label) }}</button></nav>
    </header>

    <div v-if="tab === 'simulation'" class="physics-grid">
      <article class="physics-card profile-card">
        <h3>{{ t('physicsQualityProfile') }}</h3>
        <label><span>{{ t('qualityProfile') }}</span><select v-model="physics.globalSettings.profile.id" @change="applyQualityProfile"><option value="Accurate">{{ t('accurateProfile') }}</option><option value="Balanced">{{ t('balancedProfile') }}</option><option value="Fast">{{ t('fastProfile') }}</option><option value="Custom">{{ t('customProfile') }}</option></select></label>
        <label><span>{{ t('droppedTimePolicy') }}</span><select v-model="physics.globalSettings.profile.droppedTimePolicy"><option value="Drop">{{ t('dropTime') }}</option><option value="PreserveBacklog">{{ t('preserveBacklog') }}</option><option value="SlowMotion">{{ t('slowMotionPolicy') }}</option></select></label>
        <label><span>{{ t('minimumSubsteps') }}</span><input v-model.number="physics.globalSettings.profile.minimumSubsteps" type="number" min="1" max="128"></label>
        <label><span>{{ t('velocityIterations') }}</span><input v-model.number="physics.globalSettings.profile.velocityIterations" type="number" min="1" max="128"></label>
        <label><span>{{ t('positionIterations') }}</span><input v-model.number="physics.globalSettings.profile.positionIterations" type="number" min="1" max="128"></label>
        <p class="stability-label"><strong>{{ t('stable') }}</strong> {{ t('physicsDeterminismBoundary') }}</p>
      </article>
      <article class="physics-card">
        <h3>{{ t('simulationSettings') }}</h3>
        <label><span>{{ t('globalGravity') }}</span><div><input v-model.number="physics.globalSettings.gravity" type="number" step="0.01"><em>m/s²</em></div></label>
        <label><span>{{ t('globalAirDamping') }}</span><div><input v-model.number="physics.globalSettings.airFriction" type="number" min="0" step="0.01"><em>s⁻¹</em></div></label>
        <label><span>{{ t('timeScale') }}</span><input v-model.number="physics.globalSettings.timeScale" type="number" min="0" step="0.1"></label>
        <label><span>{{ t('physicsTickRate') }}</span><div><input v-model.number="physics.globalSettings.profile.tickRate" type="number" min="1" max="1000" step="1"><em>Hz</em></div></label>
        <label><span>{{ t('maxCatchUpSteps') }}</span><input v-model.number="physics.globalSettings.profile.maxCatchUpSteps" type="number" min="1" max="240" step="1"></label>
        <label><span>{{ t('physicsInterpolation') }}</span><select v-model="physics.globalSettings.profile.interpolation"><option value="Interpolate">{{ t('interpolate') }}</option><option value="None">{{ t('noInterpolation') }}</option></select></label>
        <label><span>{{ t('sleepLinearThreshold') }}</span><div><input v-model.number="physics.globalSettings.profile.sleepLinearThreshold" type="number" min="0" step="0.0001"><em>m/s</em></div></label>
        <label><span>{{ t('sleepAngularThreshold') }}</span><div><input v-model.number="physics.globalSettings.profile.sleepAngularThreshold" type="number" min="0" step="0.0001"><em>rad/s</em></div></label>
        <label><span>{{ t('timeToSleep') }}</span><div><input v-model.number="physics.globalSettings.profile.timeToSleep" type="number" min="0" step="0.05"><em>s</em></div></label>
        <label><span>{{ t('physicsBudget') }}</span><div><input v-model.number="physics.globalSettings.profile.physicsBudgetMs" type="number" min="0.1" max="1000" step="0.1"><em>ms</em></div></label>
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
      <div class="layer-toolbar"><input v-model="layerSearch" type="search" :placeholder="t('searchPhysicsLayers')"><select v-model="preset"><option value="">{{ t('layerPreset') }}</option><option value="platformer">Platformer</option><option value="topdown">Top-down</option><option value="puzzle">Puzzle</option></select><button :disabled="!preset" @click="applyLayerPreset">{{ t('applyPreset') }}</button></div>
      <div class="layer-list">
        <article v-for="layer in visibleLayers" :key="layer.id">
          <b>{{ layer.id + 1 }}</b><input v-model="layer.color" type="color"><input v-model.trim="layer.name" maxlength="48"><input v-model.trim="layer.description" maxlength="240" :placeholder="t('layerDescription')">
        </article>
      </div>
      <section class="pair-editor">
        <h3>{{ t('collisionPairs') }}</h3>
        <select v-model.number="pairA"><option v-for="layer in physics.globalSettings.layers" :key="layer.id" :value="layer.id">{{ layer.name }}</option></select><span>↔</span><select v-model.number="pairB"><option v-for="layer in physics.globalSettings.layers" :key="layer.id" :value="layer.id">{{ layer.name }}</option></select>
        <button :class="{ active: layersCollide(pairA, pairB) }" @click="toggleLayerCollision(pairA, pairB)">{{ layersCollide(pairA, pairB) ? t('collides') : t('doesNotCollide') }}</button>
      </section>
      <details class="advanced-matrix"><summary>{{ t('advancedCollisionMatrix') }}</summary><div class="matrix-scroll"><div class="matrix-header"><span></span><b v-for="column in layerIds" :key="column" :title="layerLabel(column)">{{ column + 1 }}</b></div><div v-for="row in layerIds" :key="row" class="matrix-row"><b :title="layerLabel(row)">{{ row + 1 }}</b><button v-for="column in layerIds" :key="column" :class="{ active: layersCollide(row, column) }" :aria-label="`${layerLabel(row)} / ${layerLabel(column)}`" @click="toggleLayerCollision(row, column)"></button></div></div></details>
    </div>

    <div v-else-if="tab === 'materials'" class="material-workspace">
      <aside><button class="primary" @click="newMaterial">+ {{ t('physicsMaterial') }}</button><button v-for="asset in materialAssets" :key="asset.uuid" :class="{ active: asset.uuid === selectedMaterial }" @click="selectMaterial(asset.uuid)"><strong>{{ materialName(asset.uuid) }}</strong><span>{{ asset.path }}</span></button></aside>
      <article v-if="draft" class="material-editor">
        <label><span>{{ t('name') }}</span><input v-model.trim="draft.name" maxlength="80"></label>
        <label><span>{{ t('density') }}</span><div><input v-model.number="draft.density" type="number" min="0.000000001" step="0.1"><em>kg/m²</em></div></label>
        <label><span>{{ t('staticFriction') }}</span><input v-model.number="draft.staticFriction" type="number" min="0" step="0.05"></label>
        <label><span>{{ t('dynamicFriction') }}</span><input v-model.number="draft.dynamicFriction" type="number" min="0" step="0.05"></label>
        <label><span>{{ t('restitution') }}</span><input v-model.number="draft.restitution" type="number" min="0" max="1" step="0.05"></label>
        <label><span>{{ t('restitutionThreshold') }}</span><div><input v-model.number="draft.restitutionThreshold" type="number" min="0" step="0.1"><em>m/s</em></div></label>
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
import { computed, ref } from 'vue'
import { assetState, createTextAsset, readTextAsset, updateTextAsset } from '../assets/AssetDatabase'
import { openEditorTool } from '../editor/workspaces'
import { t } from '../i18n'
import { normalizeGlobalSettings, physicsState as physics, pushHistory } from '../store/physics'
import { PHYSICS_CONFORMANCE_CASES, PHYSICS_SHAPE_SUPPORT, PHYSICS_UNITS, applyPhysicsProfile, defaultPhysicsMaterial, normalizePhysicsMaterial, type PhysicsCombineMode, type PhysicsMaterialAsset2D } from '../runtime/physicsProduction'

const tab = ref<'simulation' | 'layers' | 'materials' | 'conformance'>('simulation')
const tabs = [{ id: 'simulation' as const, label: 'simulationSettings' as const }, { id: 'layers' as const, label: 'collisionLayers' as const }, { id: 'materials' as const, label: 'physicsMaterials' as const }, { id: 'conformance' as const, label: 'conformance' as const }]
const layerSearch = ref('')
const pairA = ref(0)
const pairB = ref(0)
const preset = ref('')
const layerIds = Array.from({ length: 32 }, (_, index) => index)
const combineModes: PhysicsCombineMode[] = ['Average', 'Minimum', 'Maximum', 'Multiply']
const selectedMaterial = ref('')
const draft = ref<PhysicsMaterialAsset2D | null>(null)
const materialAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'material' && parseMaterial(asset.uuid)))
const visibleLayers = computed(() => { const needle = layerSearch.value.trim().toLocaleLowerCase(); return physics.globalSettings.layers.filter(layer => !needle || `${layer.name} ${layer.description}`.toLocaleLowerCase().includes(needle)) })

function layerBit(layer: number) { return (2 ** layer) >>> 0 }
function layerLabel(layer: number) { return physics.globalSettings.layers[layer]?.name ?? `Layer ${layer + 1}` }
function layersCollide(first: number, second: number) { return (physics.globalSettings.collisionMatrix[first] & layerBit(second)) !== 0 && (physics.globalSettings.collisionMatrix[second] & layerBit(first)) !== 0 }
function toggleLayerCollision(first: number, second: number) { const enabled = !layersCollide(first, second); const firstBit = layerBit(second), secondBit = layerBit(first); physics.globalSettings.collisionMatrix[first] = enabled ? (physics.globalSettings.collisionMatrix[first] | firstBit) >>> 0 : (physics.globalSettings.collisionMatrix[first] & ~firstBit) >>> 0; physics.globalSettings.collisionMatrix[second] = enabled ? (physics.globalSettings.collisionMatrix[second] | secondBit) >>> 0 : (physics.globalSettings.collisionMatrix[second] & ~secondBit) >>> 0; pushHistory('Edit collision pair') }
function syncProfile() { physics.globalSettings.tickRate = physics.globalSettings.profile.tickRate; physics.globalSettings.maxCatchUpSteps = physics.globalSettings.profile.maxCatchUpSteps; physics.globalSettings.interpolation = physics.globalSettings.profile.interpolation }
function commit() { syncProfile(); normalizeGlobalSettings(); pushHistory('Edit physics settings') }
function applyQualityProfile() { const id = physics.globalSettings.profile.id; if (id !== 'Custom') physics.globalSettings.profile = applyPhysicsProfile(id); syncProfile(); commit() }
function openPhysicsDebugger() { openEditorTool('profiler') }
function openTestRunner() { openEditorTool('profiler') }

function applyLayerPreset() {
  const names = preset.value === 'platformer' ? ['World', 'Player', 'Enemy', 'Pickup', 'Trigger', 'Projectile'] : preset.value === 'topdown' ? ['World', 'Player', 'Enemy', 'Interactable', 'Trigger', 'Projectile'] : ['World', 'Pieces', 'Goals', 'Trigger', 'Decoration']
  names.forEach((name, id) => { const layer = physics.globalSettings.layers[id]; if (layer) { layer.name = name; layer.description = `${preset.value} preset · ${name}` } })
  physics.globalSettings.collisionMatrix = layerIds.map(row => layerIds.reduce((mask, column) => row < names.length && column < names.length ? (mask | layerBit(column)) >>> 0 : mask, 0))
  pushHistory('Apply physics layer preset')
}

function parseMaterial(uuid: string): PhysicsMaterialAsset2D | null { const source = readTextAsset(uuid); if (!source) return null; try { const parsed = JSON.parse(source) as Record<string, unknown>; return parsed.format === 'nova-physics-material' ? normalizePhysicsMaterial(parsed) : null } catch { return null } }
function materialName(uuid: string) { return parseMaterial(uuid)?.name ?? t('physicsMaterial') }
function selectMaterial(uuid: string) { selectedMaterial.value = uuid; draft.value = parseMaterial(uuid) }
function newMaterial() { const material = defaultPhysicsMaterial(`Physics Material ${materialAssets.value.length + 1}`); const asset = createTextAsset(material.name, 'material', JSON.stringify(material, null, 2), 'Assets/Materials/Physics'); selectMaterial(asset.uuid); pushHistory('Create physics material') }
function saveMaterial() { if (!draft.value || !selectedMaterial.value) return; draft.value = normalizePhysicsMaterial(draft.value); updateTextAsset(selectedMaterial.value, JSON.stringify(draft.value, null, 2)); pushHistory('Save physics material') }
</script>

<style scoped>
.physics-workspace{grid-column:1/-1;min-width:0;padding:18px;border:1px solid var(--border-subtle);border-radius:var(--radius-lg);background:var(--surface-1);box-shadow:var(--shadow-sm)}.physics-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:14px}.physics-heading>div{min-width:0;display:flex;gap:10px}.card-icon{display:grid;place-items:center;flex:0 0 30px;height:30px;border-radius:9px;color:var(--accent);background:var(--accent-soft);font-size:16px}.physics-heading h2,.physics-card h3,.conformance-workspace h3,.pair-editor h3{margin:0;font-size:14px}.physics-heading p,.units-card p{margin:4px 0 0;color:var(--text-muted);font-size:12px;line-height:1.45}.physics-heading nav{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}.physics-heading button,.layer-toolbar button,.pair-editor button,.material-workspace button,.conformance-workspace button,.diagnostics-card>button{min-height:32px;padding:0 11px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}.physics-heading button.active,.pair-editor button.active,.material-workspace aside button.active{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}.physics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(430px,100%),1fr));gap:10px}.physics-card{min-width:0;padding:12px;border:1px solid var(--border-subtle);border-radius:11px;background:var(--surface-2)}.physics-card>label,.material-editor>label{min-height:38px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;border-top:1px solid var(--border-subtle);font-size:12px}.physics-card>label>span,.material-editor>label>span{min-width:0;flex:1 1 180px;overflow-wrap:anywhere}.physics-card label>input,.physics-card label>div,.material-editor label>input,.material-editor label>div{width:min(190px,55%);min-width:0}.physics-card label>select,.material-editor label>select{width:min(230px,100%);min-width:min(210px,100%);max-width:230px;flex:1 1 210px}.physics-card label>div,.material-editor label>div{display:flex;align-items:center;gap:6px}.physics-card label>div input,.material-editor label>div input{min-width:0;width:100%}.physics-card em,.material-editor em{color:var(--text-muted);font-size:11px;font-style:normal;white-space:nowrap}.diagnostics-card dl,.units-card dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.diagnostics-card dl div,.units-card dl div{padding:8px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-3)}dt{color:var(--text-muted);font-size:11px}dd{margin:3px 0 0;font-size:12px}.notice{margin-top:7px;padding:8px;display:grid;grid-template-columns:70px 1fr;gap:7px;border-radius:8px;background:var(--surface-3);font-size:11px}.notice span{color:var(--text-muted);line-height:1.4}.units-card{grid-column:1/-1}.units-card dl{grid-template-columns:repeat(5,minmax(0,1fr))}.layer-toolbar{display:grid;grid-template-columns:minmax(180px,1fr) 180px auto;gap:7px}.layer-list{max-height:310px;margin-top:10px;overflow:auto;border:1px solid var(--border-subtle);border-radius:10px}.layer-list article{min-width:650px;padding:5px 8px;display:grid;grid-template-columns:24px 34px minmax(130px,.7fr) minmax(250px,1.3fr);gap:7px;align-items:center;border-bottom:1px solid var(--border-subtle)}.layer-list article:last-child{border-bottom:0}.layer-list input{min-width:0;width:100%}.layer-list input[type=color]{height:28px;padding:2px}.pair-editor{margin-top:10px;padding:10px;display:grid;grid-template-columns:auto minmax(130px,1fr) auto minmax(130px,1fr) auto;gap:8px;align-items:center;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.advanced-matrix{margin-top:10px}.advanced-matrix summary{display:block;min-height:18px;cursor:pointer;color:var(--text-secondary);font-size:12px;line-height:1.5}.matrix-scroll{max-width:100%;margin-top:8px;padding:7px;overflow:auto;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.matrix-header,.matrix-row{width:max-content;display:grid;grid-template-columns:30px repeat(32,18px);gap:3px;align-items:center}.matrix-header b,.matrix-row>b{font-size:11px;text-align:center}.matrix-row button{width:18px;height:18px;padding:0;border:1px solid var(--border-subtle);border-radius:4px;background:var(--surface-3)}.matrix-row button.active{background:var(--accent);border-color:var(--accent)}.material-workspace{min-height:330px;display:grid;grid-template-columns:minmax(190px,.7fr) minmax(280px,1.3fr);gap:10px}.material-workspace aside{display:flex;flex-direction:column;gap:6px}.material-workspace aside button{text-align:left}.material-workspace aside button strong,.material-workspace aside button span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.material-workspace aside button span{color:var(--text-muted);font-size:11px}.material-editor{padding:12px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.primary{color:var(--accent)!important;border-color:var(--accent)!important}.conformance-workspace{display:grid;grid-template-columns:1fr 1fr;gap:10px}.conformance-workspace>article{padding:12px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.conformance-workspace header{display:flex;justify-content:space-between}.support-row{padding:6px 0;display:grid;grid-template-columns:110px 130px 1fr;gap:7px;border-bottom:1px solid var(--border-subtle);font-size:11px}.support-row b{color:var(--accent)}.support-row span{color:var(--text-muted)}.case-grid{margin:9px 0;display:grid;grid-template-columns:1fr 1fr;gap:5px}.case-grid span{overflow:hidden;color:var(--text-secondary);font-size:11px;text-overflow:ellipsis;white-space:nowrap}@media(max-width:1200px){.physics-grid{grid-template-columns:1fr}}@media(max-width:800px){.physics-heading{flex-direction:column}.conformance-workspace,.material-workspace{grid-template-columns:1fr}.units-card dl{grid-template-columns:repeat(2,minmax(0,1fr))}.layer-toolbar,.pair-editor{grid-template-columns:1fr}.pair-editor span{display:none}}
.profile-card{background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 8%,var(--surface-2)),var(--surface-2))}.stability-label{margin:8px 0 0;padding:8px;border-radius:8px;color:var(--text-muted);background:var(--surface-3);font-size:11px;line-height:1.45}.stability-label strong{margin-right:6px;color:var(--success);text-transform:uppercase}
</style>
