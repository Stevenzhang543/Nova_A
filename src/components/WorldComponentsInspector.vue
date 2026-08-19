<template>
  <section v-if="region" class="world-component">
    <header><strong>{{ t('navigationRegion2D') }}</strong><span>{{ region.navigationMode }}</span></header>
    <label><span>{{ t('navigationMode') }}</span><select v-model="region.navigationMode"><option>Grid</option><option>Polygon</option></select></label>
    <label><span>{{ t('source') }}</span><select v-model="region.source"><option>SceneGeometry</option><option>TileMap</option><option>Manual</option></select></label>
    <label v-if="region.source !== 'Manual'"><span>{{ t('source') }} UUID</span><input v-model="region.sourceEntityUuid"></label>
    <label><span>{{ t('cellSize') }}</span><input v-model.number="region.cellSize" type="number" min="0.01" step="0.05"></label>
    <label><span>{{ t('agentRadius') }}</span><input v-model.number="region.agentRadius" type="number" min="0" step="0.05"></label>
    <label><span>{{ t('navigationLayer') }}</span><input v-model.number="region.navigationLayer" type="number" min="1" max="32"></label>
    <label><span>{{ t('cost') }}</span><input v-model.number="region.traversalCost" type="number" min="0.001" step="0.1"></label>
    <label><span>{{ t('dynamicRebake') }}</span><input v-model="region.dynamic" type="checkbox"></label>
    <div class="actions"><button @click="bake">{{ t('bake') }}</button><button @click="clearBake">{{ t('clear') }}</button></div>
    <small>{{ bakeMessage || `${t('navigationProfile')}: ${profile.pathQueries} queries · ${profile.lastQueryMilliseconds.toFixed(2)} ms` }}</small>
    <details><summary>{{ t('navigationLinks') }} · {{ region.links.length }}</summary><article v-for="(link,index) in region.links" :key="link.id"><input v-model="link.enabled" type="checkbox"><input v-model.number="link.start.x" type="number"><input v-model.number="link.start.y" type="number"><span>→</span><input v-model.number="link.end.x" type="number"><input v-model.number="link.end.y" type="number"><button @click="region.links.splice(index,1)">×</button></article><button @click="addLink">+ {{ t('navigationLinks') }}</button></details>
  </section>

  <section v-if="agent" class="world-component"><header><strong>{{ t('navigationAgent2D') }}</strong><span>{{ agent.pathStatus }}</span></header><label><span>{{ t('targetPosition') }}</span><div><input v-model.number="agent.targetPosition.x" type="number"><input v-model.number="agent.targetPosition.y" type="number"></div></label><label><span>{{ t('speed') }}</span><input v-model.number="agent.speed" type="number" min="0"></label><label><span>{{ t('acceleration') }}</span><input v-model.number="agent.acceleration" type="number" min="0"></label><label><span>{{ t('agentRadius') }}</span><input v-model.number="agent.radius" type="number" min="0"></label><label><span>{{ t('avoidance') }}</span><input v-model="agent.avoidance" type="checkbox"></label><label><span>{{ t('avoidancePriority') }}</span><input v-model.number="agent.avoidancePriority" type="range" min="0" max="1" step="0.01"></label><small>{{ agent.path.length }} {{ t('waypoints') }}</small></section>

  <section v-if="obstacle" class="world-component"><header><strong>{{ t('navigationObstacle2D') }}</strong><span>{{ obstacle.dynamic ? t('dynamic') : t('static') }}</span></header><label><span>{{ t('areaShape') }}</span><select v-model="obstacle.shape"><option>Circle</option><option>Box</option></select></label><label><span>{{ t('dynamicRebake') }}</span><input v-model="obstacle.dynamic" type="checkbox"></label><label><span>{{ t('navigationLayer') }}</span><input v-model.number="obstacle.navigationLayer" type="number" min="1" max="32"></label></section>

  <section v-if="chunk" class="world-component"><header><strong>{{ t('worldChunk2D') }}</strong><span>{{ streamCell?.status ?? 'Unloaded' }}</span></header><label><span>{{ t('chunkSize') }}</span><div><input v-model.number="chunk.size.x" type="number" min="1"><input v-model.number="chunk.size.y" type="number" min="1"></div></label><label><span>{{ t('loadDistance') }}</span><input v-model.number="chunk.loadDistance" type="number" min="0"></label><label><span>{{ t('unloadDistance') }}</span><input v-model.number="chunk.unloadDistance" type="number" :min="chunk.loadDistance"></label><label><span>{{ t('prefetchDistance') }}</span><input v-model.number="chunk.prefetchDistance" type="number" min="0"></label><label><span>{{ t('memoryEstimate') }}</span><input v-model.number="chunk.memoryEstimateMb" type="number" min="0"></label><label><span>{{ t('cachePolicy') }}</span><select v-model="chunk.cachePolicy"><option>Release</option><option>LRU</option><option>Retain</option></select></label><label><span>{{ t('ownership') }}</span><input v-model="chunk.ownership"></label><label class="stacked"><span>{{ t('dependencies') }}</span><textarea :value="chunk.dependencies.join('\n')" @change="setDependencies"></textarea></label><small>{{ streamCell ? `${streamCell.memoryMb.toFixed(1)} MB · ${streamCell.owner}` : t('notLoaded') }}</small></section>

  <section v-if="behavior" class="world-component"><header><strong>{{ t('behaviorTree2D') }}</strong><span>{{ aiEnabled ? t('enabled') : t('packageRequired') }}</span></header><button v-if="!aiEnabled" class="package" @click="enableAi">+ {{ t('aiPackage') }}</button><label><span>{{ t('treeAsset') }}</span><input v-model="behavior.treeAsset"></label><label><span>{{ t('tickRate') }}</span><input v-model.number="behavior.tickRate" type="number" min="1" max="240"></label></section>

  <section v-if="pool" class="world-component"><header><strong>{{ t('objectPool2D') }}</strong><span>{{ poolEnabled ? t('enabled') : t('packageRequired') }}</span></header><button v-if="!poolEnabled" class="package" @click="enablePool">+ {{ t('objectPool') }}</button><label><span>{{ t('capacity') }}</span><input v-model.number="pool.capacity" type="number" min="1"></label><label><span>{{ t('prewarm') }}</span><input v-model.number="pool.prewarm" type="number" min="0" :max="pool.capacity"></label><label><span>{{ t('resetContract') }}</span><select v-model="pool.resetContract"><option>TransformAndPhysics</option><option>FullSerializedState</option><option>CustomSignal</option></select></label><label><span>{{ t('maximumLifetime') }}</span><input v-model.number="pool.maximumLifetime" type="number" min="0" step="0.1"></label><small v-if="poolStats">{{ poolStats.active }}/{{ poolStats.allocated }} {{ t('active') }} · {{ poolStats.reused }} reused · {{ poolStats.leaked }} leaked</small></section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../i18n'
import type { Entity } from '../world/Entity'
import type { BehaviorTree2D, NavigationAgent2D, NavigationObstacle2D, NavigationRegion2D, ObjectPool2D, WorldChunk2D } from '../world/components'
import { clearNavigationData, navigationProfileSnapshot, rebakeNavigation } from '../runtime/navigation2d'
import { physicsState, pushHistory } from '../store/physics'
import { OFFICIAL_AI_PACKAGE_ID, OFFICIAL_OBJECT_POOL_PACKAGE_ID, enableOfficialPackage, packageEnabled } from '../runtime/packages'
import { worldStreamingState } from '../runtime/worldStreaming'
import { objectPoolDiagnostics } from '../runtime/objectPool'

const props = defineProps<{ entity: Entity }>()
const region = computed(() => props.entity.getComponent<NavigationRegion2D>('NavigationRegion2D'))
const agent = computed(() => props.entity.getComponent<NavigationAgent2D>('NavigationAgent2D'))
const obstacle = computed(() => props.entity.getComponent<NavigationObstacle2D>('NavigationObstacle2D'))
const chunk = computed(() => props.entity.getComponent<WorldChunk2D>('WorldChunk2D'))
const behavior = computed(() => props.entity.getComponent<BehaviorTree2D>('BehaviorTree2D'))
const pool = computed(() => props.entity.getComponent<ObjectPool2D>('ObjectPool2D'))
const profile = computed(() => navigationProfileSnapshot())
const streamCell = computed(() => worldStreamingState.cells.find(cell => cell.entityUuid === props.entity.uuid))
const poolStats = computed(() => objectPoolDiagnostics().find(item => item.ownerUuid === props.entity.uuid))
const aiEnabled = computed(() => packageEnabled(OFFICIAL_AI_PACKAGE_ID)), poolEnabled = computed(() => packageEnabled(OFFICIAL_OBJECT_POOL_PACKAGE_ID))
const bakeMessage = ref('')
function bake() { const result = rebakeNavigation(physicsState.world.entities); bakeMessage.value = `${result.baked} regions · ${result.cells} cells · ${result.milliseconds.toFixed(2)} ms`; pushHistory('Bake navigation') }
function clearBake() { clearNavigationData(region.value ? props.entity.uuid : undefined); bakeMessage.value = t('cleared'); pushHistory('Clear navigation bake') }
function addLink() { region.value?.links.push({ id: crypto.randomUUID(), start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, bidirectional: true, cost: 1, enabled: true }); pushHistory('Add navigation link') }
function setDependencies(event: Event) { if (chunk.value) chunk.value.dependencies = (event.target as HTMLTextAreaElement).value.split(/\r?\n/).map(value => value.trim()).filter(Boolean).slice(0, 128) }
function enableAi() { enableOfficialPackage(OFFICIAL_AI_PACKAGE_ID); pushHistory('Enable AI Tools package') }
function enablePool() { enableOfficialPackage(OFFICIAL_OBJECT_POOL_PACKAGE_ID); pushHistory('Enable Object Pool package') }
</script>

<style scoped>
.world-component{margin-top:8px;padding:8px;display:grid;gap:4px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-1)}header{display:flex;justify-content:space-between;gap:8px}header span,small{color:var(--text-muted)}label{min-height:32px;display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid var(--border-subtle)}label>input,label>select,label>div,label>textarea{width:56%;min-width:0}label>div{display:grid;grid-template-columns:1fr 1fr;gap:4px}.stacked{padding:5px 0;align-items:stretch;flex-direction:column}.stacked textarea{width:100%;min-height:58px}.actions{display:flex;gap:5px}.actions button,.package,details>button{min-height:30px;padding:0 8px;border:1px solid var(--border-subtle);border-radius:7px;background:var(--surface-2);color:var(--text-secondary)}.package{border-color:var(--accent);color:var(--accent)}details article{display:grid;grid-template-columns:auto repeat(2,1fr) auto repeat(2,1fr) auto;gap:3px;align-items:center}details article input{min-width:0;width:100%}
</style>
