<template>
  <section class="world-tools">
    <header>
      <div><strong>{{ t('worldTools') }}</strong><small>{{ t('worldToolsHint') }}</small></div>
      <nav><button v-for="tab in tabs" :key="tab" :class="{ active: activeTab === tab }" @click="activeTab = tab">{{ t(`worldTab_${tab}`) }}</button></nav>
    </header>
    <div class="workspace">
      <aside>
        <button class="primary" @click="addSelectedComponent">+ {{ t(addLabel) }}</button>
        <div v-if="activeTab === 'navigation'" class="quick-adds"><button @click="addNavigationObstacle">+ {{ t('navigationObstacle2D') }}</button><button @click="addNavigationAgent">+ {{ t('navigationAgent2D') }}</button></div>
        <div v-if="activeTab === 'streaming'" class="quick-adds"><button @click="addPortal">+ {{ t('portal2D') }}</button></div>
        <template v-if="activeTab === 'navigation' || activeTab === 'ai'">
          <article class="package-card" :class="{ enabled: activePackageEnabled }">
            <span>{{ activeTab === 'navigation' ? t('navigationPackage') : t('aiPackage') }}</span>
            <strong>{{ activePackageEnabled ? t('packageEnabled') : t('packageNotInstalled') }}</strong>
            <button v-if="!activePackageEnabled" @click="enablePackage">{{ t('enablePackage') }}</button>
          </article>
        </template>
        <label v-if="activeTab === 'navigation'"><span>{{ t('debugOverlay') }}</span><input v-model="worldGameplayState.navigationDebug" type="checkbox"></label>
        <label v-if="activeTab === 'areas'"><span>{{ t('debugOverlay') }}</span><input v-model="worldGameplayState.areaDebug" type="checkbox"></label>
        <label v-if="activeTab === 'streaming'"><span>{{ t('streamingEnabled') }}</span><input v-model="worldGameplayState.streamingEnabled" type="checkbox"></label>
        <label v-if="activeTab === 'streaming'"><span>{{ t('memoryBudget') }}</span><input v-model.number="worldGameplayState.memoryBudgetMb" type="number" min="1" step="1"></label>
        <label v-if="activeTab === 'streaming'"><span>{{ t('originShiftThreshold') }}</span><input v-model.number="worldGameplayState.originShiftThreshold" type="number" min="1" step="100"></label>
        <dl v-if="activeTab === 'streaming'"><dt>{{ t('loadedChunks') }}</dt><dd>{{ worldGameplayState.loadedChunks }}</dd><dt>{{ t('memoryUsed') }}</dt><dd>{{ worldGameplayState.usedMemoryMb.toFixed(1) }} MB</dd><dt>{{ t('pendingStreams') }}</dt><dd>{{ worldGameplayState.pendingStreams }}</dd></dl>
      </aside>
      <main>
        <div v-if="!selectedEntity" class="empty"><strong>{{ t('selectObject') }}</strong><p>{{ t('worldSelectHint') }}</p></div>

        <template v-else-if="activeTab === 'character' && character">
          <h3>{{ selectedEntity.name }} · {{ t('characterBody2D') }}</h3>
          <div class="form-grid"><label><span>{{ t('maxSlopeAngle') }}</span><input v-model.number="character.maxSlopeAngle" type="number" min="0" max="89.9" step="1"></label><label><span>{{ t('stepHeight') }}</span><input v-model.number="character.stepHeight" type="number" min="0" step="0.05"></label><label><span>{{ t('floorSnap') }}</span><input v-model.number="character.floorSnap" type="number" min="0" step="0.01"></label><label><span>{{ t('coyoteTime') }}</span><input v-model.number="character.coyoteTime" type="number" min="0" step="0.01"></label><label><span>{{ t('safeMargin') }}</span><input v-model.number="character.safeMargin" type="number" min="0.000000001" step="0.0001"></label><label><span>{{ t('maxSlides') }}</span><input v-model.number="character.maxSlides" type="number" min="1" max="32"></label><label><span>{{ t('movingPlatforms') }}</span><input v-model="character.applyPlatformVelocity" type="checkbox"></label><label><span>{{ t('collisionMask') }}</span><input v-model.number="character.collisionMask" type="number" min="0" max="4294967295"></label></div>
          <div class="states"><span :class="{ active: character.onFloor }">{{ t('onFloor') }}</span><span :class="{ active: character.onWall }">{{ t('onWall') }}</span><span :class="{ active: character.onCeiling }">{{ t('onCeiling') }}</span></div>
        </template>

        <template v-else-if="activeTab === 'areas' && area">
          <h3>{{ selectedEntity.name }} · {{ t('area2D') }}</h3>
          <div class="form-grid"><label><span>{{ t('areaShape') }}</span><select v-model="area.shape"><option>Box</option><option>Circle</option></select></label><label v-if="area.shape === 'Circle'"><span>{{ t('radius') }}</span><input v-model.number="area.radius" type="number" min="0.000001"></label><label v-else><span>{{ t('areaSize') }}</span><div><input v-model.number="area.size.x" type="number" min="0.000001"><input v-model.number="area.size.y" type="number" min="0.000001"></div></label></div>
          <section v-if="effector" class="effect-list"><article v-for="effect in effector.effectors" :key="effect.id"><select v-model="effect.kind"><option>Gravity</option><option>Wind</option><option>Drag</option><option>Buoyancy</option><option>Damage</option><option>Signal</option></select><label><span>{{ t('enabled') }}</span><input v-model="effect.enabled" type="checkbox"></label><label v-if="effect.kind === 'Gravity' || effect.kind === 'Wind'"><span>{{ t('direction') }}</span><div><input v-model.number="effect.direction.x" type="number"><input v-model.number="effect.direction.y" type="number"></div></label><label v-if="effect.kind === 'Gravity' || effect.kind === 'Wind'"><span>{{ t('strength') }}</span><input v-model.number="effect.strength" type="number"></label><label v-if="effect.kind === 'Drag'"><span>{{ t('drag') }}</span><input v-model.number="effect.drag" type="number" min="0"></label><label v-if="effect.kind === 'Buoyancy'"><span>{{ t('fluidDensity') }}</span><input v-model.number="effect.fluidDensity" type="number" min="0"></label><label v-if="effect.kind === 'Damage'"><span>{{ t('damagePerSecond') }}</span><input v-model.number="effect.damagePerSecond" type="number" min="0"></label><label v-if="effect.kind === 'Signal'"><span>{{ t('signalName') }}</span><input v-model="effect.signal"></label><button class="danger" @click="removeEffector(effect.id)">×</button></article><button @click="addEffector">+ {{ t('addEffector') }}</button></section>
        </template>

        <template v-else-if="activeTab === 'navigation'">
          <div v-if="region"><h3>{{ selectedEntity.name }} · {{ t('navigationRegion2D') }}</h3><div class="form-grid"><label><span>{{ t('algorithm') }}</span><select v-model="region.algorithm"><option>AStar</option><option>FlowField</option></select></label><label><span>{{ t('cellSize') }}</span><input v-model.number="region.cellSize" type="number" min="0.01"></label><label><span>{{ t('allowDiagonal') }}</span><input v-model="region.allowDiagonal" type="checkbox"></label><label><span>{{ t('dynamicRebake') }}</span><input v-model="region.dynamic" type="checkbox"></label><label><span>{{ t('rebakeInterval') }}</span><input v-model.number="region.rebakeInterval" type="number" min="0.02"></label><label><span>{{ t('navigationLayer') }}</span><input v-model.number="region.navigationLayer" type="number" min="1" max="32"></label></div><label class="stacked"><span>{{ t('navigationPolygon') }}</span><textarea :value="polygonText" @change="setPolygon"></textarea></label></div>
          <div v-else-if="agent"><h3>{{ selectedEntity.name }} · {{ t('navigationAgent2D') }}</h3><div class="form-grid"><label><span>{{ t('targetPosition') }}</span><div><input v-model.number="agent.targetPosition.x" type="number"><input v-model.number="agent.targetPosition.y" type="number"></div></label><label><span>{{ t('speed') }}</span><input v-model.number="agent.speed" type="number" min="0"></label><label><span>{{ t('acceleration') }}</span><input v-model.number="agent.acceleration" type="number" min="0"></label><label><span>{{ t('avoidance') }}</span><input v-model="agent.avoidance" type="checkbox"></label><label><span>{{ t('pathSmoothing') }}</span><input v-model="agent.pathSmoothing" type="checkbox"></label><label><span>{{ t('repathInterval') }}</span><input v-model.number="agent.repathInterval" type="number" min="0.02"></label></div><p class="runtime-state">{{ t('pathStatus') }}: {{ agent.pathStatus }} · {{ agent.path.length }} {{ t('waypoints') }}</p></div>
          <div v-else-if="obstacle"><h3>{{ selectedEntity.name }} · {{ t('navigationObstacle2D') }}</h3><div class="form-grid"><label><span>{{ t('areaShape') }}</span><select v-model="obstacle.shape"><option>Circle</option><option>Box</option></select></label><label><span>{{ t('dynamicRebake') }}</span><input v-model="obstacle.dynamic" type="checkbox"></label><label><span>{{ t('navigationLayer') }}</span><input v-model.number="obstacle.navigationLayer" type="number" min="1" max="32"></label></div></div>
        </template>

        <template v-else-if="activeTab === 'ai'">
          <div class="asset-actions"><button @click="createBehaviorTree">+ {{ t('behaviorTree') }}</button><button @click="createStateMachine">+ {{ t('hierarchicalStateMachine') }}</button></div>
          <div v-if="behavior"><h3>{{ t('behaviorTree2D') }}</h3><label class="stacked"><span>{{ t('behaviorAsset') }}</span><select v-model="behavior.treeAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in behaviorAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label></div>
          <div v-if="machine"><h3>{{ t('stateMachine2D') }}</h3><label class="stacked"><span>{{ t('stateMachineAsset') }}</span><select v-model="machine.machineAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in stateAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label></div>
        </template>

        <template v-else-if="activeTab === 'streaming' && chunk">
          <h3>{{ selectedEntity.name }} · {{ t('worldChunk2D') }}</h3><div class="form-grid"><label><span>{{ t('chunkWorldSize') }}</span><div><input v-model.number="chunk.size.x" type="number" min="1"><input v-model.number="chunk.size.y" type="number" min="1"></div></label><label><span>{{ t('loadDistance') }}</span><input v-model.number="chunk.loadDistance" type="number" min="0"></label><label><span>{{ t('unloadDistance') }}</span><input v-model.number="chunk.unloadDistance" type="number" min="0"></label><label><span>{{ t('preloadPriority') }}</span><input v-model.number="chunk.preloadPriority" type="number"></label><label><span>{{ t('memoryEstimate') }}</span><input v-model.number="chunk.memoryEstimateMb" type="number" min="0.001"></label><label><span>{{ t('streamScene') }}</span><select v-model="chunk.sceneUuid"><option value="">{{ t('none') }}</option><option v-for="scene in sceneManager.scenes" :key="scene.uuid" :value="scene.uuid">{{ scene.name }}</option></select></label></div>
        </template>

        <template v-else-if="activeTab === 'streaming' && portal">
          <h3>{{ selectedEntity.name }} · {{ t('portal2D') }}</h3><div class="form-grid"><label><span>{{ t('targetScene') }}</span><select v-model="portal.targetSceneUuid"><option value="">{{ t('none') }}</option><option v-for="scene in sceneManager.scenes" :key="scene.uuid" :value="scene.uuid">{{ scene.name }}</option></select></label><label><span>{{ t('targetPortal') }}</span><input v-model="portal.targetPortal"></label><label><span>{{ t('triggerRadius') }}</span><input v-model.number="portal.triggerRadius" type="number" min="0.01"></label><label><span>{{ t('preload') }}</span><input v-model="portal.preload" type="checkbox"></label></div>
        </template>

        <template v-else-if="activeTab === 'pooling' && pool">
          <h3>{{ selectedEntity.name }} · {{ t('objectPool2D') }}</h3><div class="form-grid"><label><span>{{ t('prefabInstance') }}</span><select v-model="pool.prefabAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in prefabAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label><label><span>{{ t('prewarm') }}</span><input v-model.number="pool.prewarm" type="number" min="0"></label><label><span>{{ t('capacity') }}</span><input v-model.number="pool.capacity" type="number" min="1"></label><label><span>{{ t('autoExpand') }}</span><input v-model="pool.autoExpand" type="checkbox"></label></div><p class="runtime-state">{{ t('activeInstances') }}: {{ pool.activeCount }}</p>
        </template>

        <div v-else class="empty"><strong>{{ t('componentRequired') }}</strong><p>{{ t('worldAddHint') }}</p></div>
      </main>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { assetReference, assetState, createTextAsset } from '../assets/AssetDatabase'
import { t } from '../i18n'
import { physicsState, pushHistory, sceneManager } from '../store/physics'
import { Area2D, AreaEffector2D, BehaviorTree2D, CharacterBody2D, NavigationAgent2D, NavigationObstacle2D, NavigationRegion2D, ObjectPool2D, Portal2D, StateMachine2D, WorldChunk2D, type AreaEffectKind2D, type Component2D } from '../world/components'
import { OFFICIAL_AI_PACKAGE_ID, OFFICIAL_NAVIGATION_PACKAGE_ID, enableOfficialPackage, packageEnabled } from '../runtime/packages'
import { preferencesState } from '../store/preferences'
import { worldGameplayState } from '../runtime/worldGameplay'

type Tab = 'character' | 'areas' | 'navigation' | 'ai' | 'streaming' | 'pooling'
const tabs = computed<Tab[]>(() => {
  const values: Tab[] = ['character', 'areas']
  if (packageEnabled(OFFICIAL_NAVIGATION_PACKAGE_ID) || physicsState.world.entities.some(entity => entity.hasComponent('NavigationRegion2D') || entity.hasComponent('NavigationAgent2D'))) values.push('navigation')
  if (packageEnabled(OFFICIAL_AI_PACKAGE_ID) || physicsState.world.entities.some(entity => entity.hasComponent('BehaviorTree2D') || entity.hasComponent('StateMachine2D'))) values.push('ai')
  if (preferencesState.experimentalFeatures || physicsState.world.entities.some(entity => entity.hasComponent('WorldChunk2D') || entity.hasComponent('Portal2D'))) values.push('streaming')
  if (preferencesState.experimentalFeatures || physicsState.world.entities.some(entity => entity.hasComponent('ObjectPool2D'))) values.push('pooling')
  return values
})
const activeTab = ref<Tab>('character')
const selectedEntity = computed(() => physicsState.world.entities.find(entity => entity.id === physicsState.selectedEntityId) ?? null)
const character = computed(() => selectedEntity.value?.getComponent<CharacterBody2D>('CharacterBody2D'))
const area = computed(() => selectedEntity.value?.getComponent<Area2D>('Area2D'))
const effector = computed(() => selectedEntity.value?.getComponent<AreaEffector2D>('AreaEffector2D'))
const region = computed(() => selectedEntity.value?.getComponent<NavigationRegion2D>('NavigationRegion2D'))
const agent = computed(() => selectedEntity.value?.getComponent<NavigationAgent2D>('NavigationAgent2D'))
const obstacle = computed(() => selectedEntity.value?.getComponent<NavigationObstacle2D>('NavigationObstacle2D'))
const behavior = computed(() => selectedEntity.value?.getComponent<BehaviorTree2D>('BehaviorTree2D'))
const machine = computed(() => selectedEntity.value?.getComponent<StateMachine2D>('StateMachine2D'))
const chunk = computed(() => selectedEntity.value?.getComponent<WorldChunk2D>('WorldChunk2D'))
const portal = computed(() => selectedEntity.value?.getComponent<Portal2D>('Portal2D'))
const pool = computed(() => selectedEntity.value?.getComponent<ObjectPool2D>('ObjectPool2D'))
const prefabAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'prefab'))
const behaviorAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'behaviorTree'))
const stateAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'stateMachine'))
const activePackageEnabled = computed(() => packageEnabled(activeTab.value === 'navigation' ? OFFICIAL_NAVIGATION_PACKAGE_ID : OFFICIAL_AI_PACKAGE_ID))
const addLabel = computed(() => ({ character: 'characterBody2D', areas: 'area2D', navigation: 'navigationRegion2D', ai: 'behaviorTree2D', streaming: 'worldChunk2D', pooling: 'objectPool2D' } as const)[activeTab.value])
const polygonText = computed(() => region.value?.polygon.map(point => `${point.x},${point.y}`).join(' ') ?? '')

function ensure<T extends Component2D>(component: T): T | null { if (!selectedEntity.value) return null; const result = selectedEntity.value.addComponent(component); pushHistory(`Add ${component.kind}`); return result }
function addSelectedComponent() {
  if (!selectedEntity.value) return
  if (activeTab.value === 'character') { const value = ensure(new CharacterBody2D()); if (value) { selectedEntity.value.rigidBody.bodyType = 'Kinematic'; selectedEntity.value.rigidBody.gravityScale = 0 } }
  else if (activeTab.value === 'areas') { ensure(new Area2D()); ensure(new AreaEffector2D()); const collider = selectedEntity.value.getCollider(); if (collider) collider.sensor = true }
  else if (activeTab.value === 'navigation') { enableOfficialPackage(OFFICIAL_NAVIGATION_PACKAGE_ID); ensure(new NavigationRegion2D()) }
  else if (activeTab.value === 'ai') { enableOfficialPackage(OFFICIAL_AI_PACKAGE_ID); ensure(new BehaviorTree2D()) }
  else if (activeTab.value === 'streaming') ensure(new WorldChunk2D())
  else ensure(new ObjectPool2D())
}
function enablePackage() { enableOfficialPackage(activeTab.value === 'navigation' ? OFFICIAL_NAVIGATION_PACKAGE_ID : OFFICIAL_AI_PACKAGE_ID); pushHistory('Enable official gameplay package') }
function addNavigationObstacle() { enableOfficialPackage(OFFICIAL_NAVIGATION_PACKAGE_ID); ensure(new NavigationObstacle2D()) }
function addNavigationAgent() { enableOfficialPackage(OFFICIAL_NAVIGATION_PACKAGE_ID); ensure(new NavigationAgent2D()) }
function addPortal() { ensure(new Portal2D()) }
function addEffector() { effector.value?.effectors.push({ id: crypto.randomUUID(), kind: 'Wind' as AreaEffectKind2D, enabled: true, direction: { x: 1, y: 0 }, strength: 5, drag: 1, fluidDensity: 1, damagePerSecond: 10, signal: 'area.effect' }); pushHistory('Add area effector') }
function removeEffector(id: string) { if (!effector.value) return; effector.value.effectors = effector.value.effectors.filter(effect => effect.id !== id); pushHistory('Remove area effector') }
function setPolygon(event: Event) { if (!region.value) return; const points = (event.target as HTMLTextAreaElement).value.split(/\s+/).flatMap(value => { const [x, y] = value.split(',').map(Number); return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : [] }); if (points.length >= 3) { region.value.polygon = points.slice(0, 4096); pushHistory('Edit navigation polygon') } }
function createBehaviorTree() { const asset = createTextAsset('New Behavior Tree', 'behaviorTree', JSON.stringify({ version: 1, root: 'root', nodes: [{ id: 'root', type: 'Sequence', name: 'Root', children: ['ready'], condition: '', action: '', seconds: 0 }, { id: 'ready', type: 'Action', name: 'Ready', children: [], condition: '', action: 'ai.ready', seconds: 0 }] }, null, 2), 'Assets/AI'); ensure(new BehaviorTree2D())!.treeAsset = assetReference(asset.uuid) }
function createStateMachine() { const asset = createTextAsset('New State Machine', 'stateMachine', JSON.stringify({ version: 1, initialState: 'idle', states: [{ id: 'idle', parent: '', onEnter: 'state.idle.enter', onExit: 'state.idle.exit' }], transitions: [] }, null, 2), 'Assets/AI'); ensure(new StateMachine2D())!.machineAsset = assetReference(asset.uuid) }
</script>

<style scoped>
.world-tools{height:100%;min-width:0;display:flex;flex-direction:column}.world-tools>header{min-height:46px;padding:6px 9px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border-subtle)}.world-tools>header>div{min-width:160px;display:flex;flex-direction:column}.world-tools strong,.world-tools h3{color:var(--text-primary)}.world-tools small{color:var(--text-muted);font-size:11px}.world-tools nav{min-width:0;display:flex;gap:4px;overflow-x:auto}.world-tools button,.world-tools input,.world-tools select,.world-tools textarea{min-height:29px;border:1px solid var(--border-subtle);border-radius:7px;color:var(--text-secondary);background:var(--surface-2);font:inherit}.world-tools button{padding:0 9px;white-space:nowrap}.world-tools button.active,.world-tools button:hover{color:var(--accent);border-color:var(--accent)}.workspace{min-height:0;flex:1;display:grid;grid-template-columns:230px minmax(0,1fr)}aside,main{min-height:0;padding:9px;overflow:auto}aside{border-right:1px solid var(--border-subtle)}aside>.primary{width:100%;color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}aside>label,.form-grid label,.effect-list label{min-height:34px;display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--text-muted);font-size:11px}aside>label input:not([type=checkbox]),.form-grid label>input,.form-grid label>select{width:52%}.package-card{margin:8px 0;padding:8px;display:flex;flex-direction:column;gap:4px;border:1px solid var(--warning);border-radius:9px}.package-card.enabled{border-color:var(--success)}.package-card span{font-size:11px}.package-card strong{font-size:11px;color:var(--warning)}.package-card.enabled strong{color:var(--success)}dl{display:grid;grid-template-columns:1fr auto;gap:5px;font-size:11px}dt{color:var(--text-muted)}dd{margin:0;color:var(--accent)}h3{margin:2px 0 9px;font-size:13px}.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:5px 14px}.form-grid label{border-bottom:1px solid var(--border-subtle)}.form-grid label>div{width:52%;display:flex;gap:4px}.form-grid label>div input{width:50%;min-width:0}.states{margin-top:10px;display:flex;gap:6px}.states span{padding:5px 9px;border-radius:99px;color:var(--text-muted);background:var(--surface-3);font-size:11px}.states span.active{color:var(--success);background:color-mix(in srgb,var(--success) 14%,var(--surface-3))}.effect-list{margin-top:10px;display:flex;flex-direction:column;gap:6px}.effect-list article{padding:7px;display:grid;grid-template-columns:120px repeat(auto-fit,minmax(140px,1fr)) 30px;align-items:center;gap:6px;border:1px solid var(--border-subtle);border-radius:9px}.effect-list label{padding:0 4px}.effect-list label>div{display:flex;gap:3px}.effect-list input{min-width:0;width:80px}.danger{color:var(--danger)!important}.stacked{display:flex;flex-direction:column;gap:5px;color:var(--text-muted);font-size:11px}.stacked textarea,.stacked select{width:100%;min-height:64px}.stacked select{min-height:30px}.asset-actions{display:flex;gap:6px;margin-bottom:10px}.runtime-state{padding:8px;border:1px solid var(--border-subtle);border-radius:8px;color:var(--accent);background:var(--surface-2);font-size:11px}.empty{height:100%;display:grid;place-content:center;text-align:center;color:var(--text-muted)}.empty p{max-width:360px;font-size:11px}@media(max-width:760px){.workspace{grid-template-columns:180px minmax(0,1fr)}.world-tools>header>div{display:none}.effect-list article{grid-template-columns:1fr 1fr}}
.quick-adds{margin-top:5px;display:grid;gap:4px}.quick-adds button{width:100%;overflow:hidden;text-overflow:ellipsis}
</style>
