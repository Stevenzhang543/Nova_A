<template>
  <SimulationStatusPanel17 v-if="region || chunk" />
  <p v-if="form17.error.value" class="form-error17" role="alert">{{ form17.error.value }}</p>
  <section v-if="region" class="world-component" @focusin="form17.focus" @change="form17.change">
    <header><strong>{{ t('navigationRegion2D') }}</strong><span>{{ region.navigationMode }}</span></header>
    <label><span>{{ t('navigationMode') }}</span><select v-model="region.navigationMode"><option>Grid</option><option>Polygon</option></select></label>
    <label><span>{{ t('source') }}</span><select v-model="region.source"><option>SceneGeometry</option><option>TileMap</option><option>Manual</option></select></label>
    <label v-if="region.source === 'TileMap'"><span>{{ t('source') }} UUID</span><input v-model="region.sourceEntityUuid"></label>
    <label><span>{{ t('cellSize') }}</span><input v-model.lazy.number="region.cellSize" type="number" min="0.01" step="0.05"></label>
    <label><span>{{ t('agentRadius') }}</span><input v-model.lazy.number="region.agentRadius" type="number" min="0" step="0.05"></label>
    <label><span>{{ t('navigationLayer') }}</span><input v-model.lazy.number="region.navigationLayer" type="number" min="1" max="32"></label>
    <label><span>{{ t('cost') }}</span><input v-model.lazy.number="region.traversalCost" type="number" min="0.001" step="0.1"></label>
    <label><span>{{ t('dynamicRebake') }}</span><input v-model="region.dynamic" type="checkbox"></label>
    <div class="actions"><button :disabled="navigationBakeState.active" @click="bake">{{ t('bake') }}</button><button v-if="navigationBakeState.active" @click="cancelNavigationBake">{{ t('cancel') }}</button><button @click="clearBake">{{ t('clear') }}</button></div>
    <small>{{ bakeMessage || `${t('navigationProfile')}: ${profile.pathQueries} queries · ${profile.lastQueryMilliseconds.toFixed(2)} ms` }}</small>
    <details><summary>{{ t('navigationLinks') }} · {{ region.links.length }}</summary><article v-for="(link,index) in region.links" :key="link.id"><label><span>{{ t('enabled') }}</span><input v-model="link.enabled" type="checkbox"></label><label><span>{{ label17('linkStart') }} X / Y</span><div><input v-model.lazy.number="link.start.x" type="number" aria-label="Start X"><input v-model.lazy.number="link.start.y" type="number" aria-label="Start Y"></div></label><label><span>{{ label17('linkEnd') }} X / Y</span><div><input v-model.lazy.number="link.end.x" type="number" aria-label="End X"><input v-model.lazy.number="link.end.y" type="number" aria-label="End Y"></div></label><label><span>{{ label17('bidirectional') }}</span><input v-model="link.bidirectional" type="checkbox"></label><label><span>{{ t('cost') }}</span><input v-model.lazy.number="link.cost" type="number" min="0.000001" step="0.1"></label><button @click="removeLink(index)">{{ t('remove') }}</button></article><button @click="addLink">+ {{ t('navigationLinks') }}</button></details>
  </section>

  <section v-if="agent" class="world-component" @focusin="form17.focus" @change="form17.change"><header><strong>{{ t('navigationAgent2D') }}</strong><span>{{ agent.pathStatus }}</span></header><label><span>{{ t('targetPosition') }}</span><div><input v-model.lazy.number="agent.targetPosition.x" type="number" :aria-label="t('targetPosition') + ' X'"><input v-model.lazy.number="agent.targetPosition.y" type="number" :aria-label="t('targetPosition') + ' Y'"></div></label><label><span>{{ t('speed') }}</span><input v-model.lazy.number="agent.speed" type="number" min="0"></label><label><span>{{ t('acceleration') }}</span><input v-model.lazy.number="agent.acceleration" type="number" min="0"></label><label><span>{{ t('agentRadius') }}</span><input v-model.lazy.number="agent.radius" type="number" min="0"></label><label><span>{{ t('avoidance') }}</span><input v-model="agent.avoidance" type="checkbox"></label><label><span>{{ t('avoidancePriority') }}</span><input v-model.lazy.number="agent.avoidancePriority" type="range" min="0" max="1" step="0.01"></label><small>{{ agent.path.length }} {{ t('waypoints') }}</small></section>

  <section v-if="obstacle" class="world-component" @focusin="form17.focus" @change="form17.change"><header><strong>{{ t('navigationObstacle2D') }}</strong><span>{{ obstacle.dynamic ? t('dynamic') : t('static') }}</span></header><label><span>{{ t('areaShape') }}</span><select v-model="obstacle.shape"><option>Circle</option><option>Box</option></select></label><label><span>{{ t('dynamicRebake') }}</span><input v-model="obstacle.dynamic" type="checkbox"></label><label><span>{{ t('navigationLayer') }}</span><input v-model.lazy.number="obstacle.navigationLayer" type="number" min="1" max="32"></label></section>

  <section v-if="chunk" class="world-component" @focusin="form17.focus" @change="form17.change"><header><strong>{{ t('worldChunk2D') }}</strong><span>{{ streamCell?.status ?? 'Unloaded' }}</span></header><label><span>{{ t('chunkSize') }}</span><div><input v-model.lazy.number="chunk.size.x" type="number" min="1" :aria-label="t('chunkSize') + ' X'"><input v-model.lazy.number="chunk.size.y" type="number" min="1" :aria-label="t('chunkSize') + ' Y'"></div></label><label><span>{{ t('loadDistance') }}</span><input v-model.lazy.number="chunk.loadDistance" type="number" min="0"></label><label><span>{{ t('unloadDistance') }}</span><input v-model.lazy.number="chunk.unloadDistance" type="number" :min="chunk.loadDistance"></label><label><span>{{ t('prefetchDistance') }}</span><input v-model.lazy.number="chunk.prefetchDistance" type="number" min="0"></label><label><span>{{ t('memoryEstimate') }}</span><input v-model.lazy.number="chunk.memoryEstimateMb" type="number" min="0"></label><label><span>{{ t('cachePolicy') }}</span><select v-model="chunk.cachePolicy"><option>Release</option><option>LRU</option><option>Retain</option></select></label><label><span>{{ t('ownership') }}</span><input v-model="chunk.ownership"></label><label class="stacked"><span>{{ t('dependencies') }}</span><textarea :value="chunk.dependencies.join('\n')" @change="setDependencies"></textarea></label><small>{{ streamCell ? `${streamCell.memoryMb.toFixed(1)} MB · ${streamCell.owner}` : t('notLoaded') }}</small></section>

  <section v-if="behavior" class="world-component" @focusin="form17.focus" @change="form17.change"><header><strong>{{ t('behaviorTree2D') }}</strong><span>{{ aiEnabled ? t('enabled') : t('packageRequired') }}</span></header><button v-if="!aiEnabled" class="package" @click="enableAi">+ {{ t('aiPackage') }}</button><label><span>{{ t('treeAsset') }}</span><input v-model="behavior.treeAsset"></label><label><span>{{ t('tickRate') }}</span><input v-model.lazy.number="behavior.tickRate" type="number" min="1" max="240"></label></section>

  <section v-if="pool" class="world-component" @focusin="form17.focus" @change="form17.change"><header><strong>{{ t('objectPool2D') }}</strong><span>{{ poolEnabled ? t('enabled') : t('packageRequired') }}</span></header><button v-if="!poolEnabled" class="package" @click="enablePool">+ {{ t('objectPool') }}</button><label><span>{{ t('capacity') }}</span><input v-model.lazy.number="pool.capacity" type="number" min="1"></label><label><span>{{ t('prewarm') }}</span><input v-model.lazy.number="pool.prewarm" type="number" min="0" :max="pool.capacity"></label><label><span>{{ t('resetContract') }}</span><select v-model="pool.resetContract"><option>TransformAndPhysics</option><option>FullSerializedState</option><option>CustomSignal</option></select></label><label><span>{{ t('maximumLifetime') }}</span><input v-model.lazy.number="pool.maximumLifetime" type="number" min="0" step="0.1"></label><small v-if="poolStats">{{ poolStats.active }}/{{ poolStats.allocated }} {{ t('active') }} · {{ poolStats.reused }} reused · {{ poolStats.leaked }} leaked</small></section>

  <section v-if="emitter" class="world-component" @focusin="form17.focus" @change="form17.change"><header><strong>{{ t('particleEmitter2D') }}</strong><span>{{ emitter.simulationBackend }}</span></header><label><span>{{ t('particleSystemAsset') }}</span><input v-model="emitter.particleSystemAsset" placeholder="asset://…"></label><label><span>{{ t('simulationBackend') }}</span><select v-model="emitter.simulationBackend"><option>Auto</option><option>CPU</option><option>GPU</option></select></label><label><span>{{ t('emissionRate') }}</span><input v-model.lazy.number="emitter.emissionRate" type="number" min="0" max="100000"></label><label><span>{{ t('burst') }}</span><input v-model.lazy.number="emitter.burst" type="number" min="0" max="100000"></label><label><span>{{ t('lifetime') }}</span><input v-model.lazy.number="emitter.lifetime" type="number" min=".0001" max="86400" step=".1"></label><label><span>{{ t('maxParticles') }}</span><input v-model.lazy.number="emitter.maxParticles" type="number" min="0" max="100000"></label><label><span>{{ t('collisionMode') }}</span><select v-model="emitter.collisionMode"><option>None</option><option>Bounce</option><option>Stop</option></select></label><label><span>{{ t('eventSignal') }}</span><input v-model="emitter.eventSignal" maxlength="128"></label><label><span>{{ t('trailLength') }}</span><span class="inline"><input v-model="emitter.trailEnabled" type="checkbox"><input v-model.lazy.number="emitter.trailLength" type="number" min="2" max="32"></span></label><label><span>{{ t('trailWidth') }}</span><input v-model.lazy.number="emitter.trailWidth" type="number" min=".001" step=".01"></label><small>{{ t('particleGraphHint') }}</small></section>
</template>

<script setup lang="ts">
import SimulationStatusPanel17 from './SimulationStatusPanel17.vue'
import { useSimulationFormGuard17 } from '../editor/simulationForm17'
import { simulationLabel17 as label17 } from '../editor/simulationLabels17'

import { computed, ref } from 'vue'
import { t } from '../i18n'
import type { Entity } from '../world/Entity'
import type { BehaviorTree2D, NavigationAgent2D, NavigationObstacle2D, NavigationRegion2D, ObjectPool2D, ParticleEmitter2D, WorldChunk2D } from '../world/components'
import { clearNavigationData, navigationProfileSnapshot, requestNavigationBake, navigationBakeState, cancelNavigationBake } from '../runtime/navigation2d'
import { physicsState, pushHistory } from '../store/physics'
import { OFFICIAL_AI_PACKAGE_ID, OFFICIAL_OBJECT_POOL_PACKAGE_ID, enableOfficialPackage, packageEnabled } from '../runtime/packages'
import { worldStreamingState } from '../runtime/worldStreaming'
import { objectPoolDiagnostics } from '../runtime/objectPool'

const form17 = useSimulationFormGuard17(() => pushHistory('Edit world component'))
const props = defineProps<{ entity: Entity }>()
const region = computed(() => props.entity.getComponent<NavigationRegion2D>('NavigationRegion2D'))
const agent = computed(() => props.entity.getComponent<NavigationAgent2D>('NavigationAgent2D'))
const obstacle = computed(() => props.entity.getComponent<NavigationObstacle2D>('NavigationObstacle2D'))
const chunk = computed(() => props.entity.getComponent<WorldChunk2D>('WorldChunk2D'))
const behavior = computed(() => props.entity.getComponent<BehaviorTree2D>('BehaviorTree2D'))
const pool = computed(() => props.entity.getComponent<ObjectPool2D>('ObjectPool2D'))
const emitter = computed(() => props.entity.getComponent<ParticleEmitter2D>('ParticleEmitter2D'))
const profile = computed(() => navigationProfileSnapshot())
const streamCell = computed(() => worldStreamingState.cells.find(cell => cell.entityUuid === props.entity.uuid))
const poolStats = computed(() => objectPoolDiagnostics().find(item => item.ownerUuid === props.entity.uuid))
const aiEnabled = computed(() => packageEnabled(OFFICIAL_AI_PACKAGE_ID)), poolEnabled = computed(() => packageEnabled(OFFICIAL_OBJECT_POOL_PACKAGE_ID))
const bakeMessage = ref('')
async function bake() { try { const result = await requestNavigationBake(physicsState.world.entities); bakeMessage.value = `${result.baked} / ${result.cells} · ${result.milliseconds.toFixed(2)} ms` } catch (error) { bakeMessage.value = String(error) } }
function clearBake() { clearNavigationData(region.value ? props.entity.uuid : undefined); bakeMessage.value = t('cleared'); pushHistory('Clear navigation bake') }
function removeLink(index: number) { region.value?.links.splice(index, 1); pushHistory('Remove navigation link') }
function addLink() { region.value?.links.push({ id: crypto.randomUUID(), start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, bidirectional: true, cost: 1, enabled: true }); pushHistory('Add navigation link') }
function setDependencies(event: Event) { if (chunk.value) chunk.value.dependencies = (event.target as HTMLTextAreaElement).value.split(/\r?\n/).map(value => value.trim()).filter(Boolean).slice(0, 128) }
function enableAi() { enableOfficialPackage(OFFICIAL_AI_PACKAGE_ID); pushHistory('Enable AI Tools package') }
function enablePool() { enableOfficialPackage(OFFICIAL_OBJECT_POOL_PACKAGE_ID); pushHistory('Enable Object Pool package') }
</script>

<style scoped>
.world-component{margin-top:8px;padding:8px;display:grid;gap:4px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-1)}header{display:flex;justify-content:space-between;gap:8px}header span,small{color:var(--text-muted)}label{min-height:32px;display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid var(--border-subtle)}label>input,label>select,label>div,label>textarea,label>.inline{width:56%;min-width:0}label>div{display:grid;grid-template-columns:1fr 1fr;gap:4px}.inline{display:flex;align-items:center;gap:5px}.inline input[type=number]{min-width:0;flex:1}.stacked{padding:5px 0;align-items:stretch;flex-direction:column}.stacked textarea{width:100%;min-height:58px}.actions{display:flex;gap:5px}.actions button,.package,details>button{min-height:30px;padding:0 8px;border:1px solid var(--border-subtle);border-radius:7px;background:var(--surface-2);color:var(--text-secondary)}.package{border-color:var(--accent);color:var(--accent)}details article{display:grid;grid-template-columns:auto repeat(2,1fr) auto repeat(2,1fr) auto;gap:3px;align-items:center}details article input{min-width:0;width:100%}
.world-component{container-type:inline-size;gap:8px;padding:12px}header{flex-wrap:wrap}header strong,header span,label>span,small{overflow-wrap:anywhere;min-width:0}label{display:grid;grid-template-columns:minmax(0,1fr);gap:5px;padding:5px 0}label>input,label>select,label>div,label>textarea,label>.inline{width:100%;min-height:34px}label>input[type=checkbox]{width:auto;min-height:22px;justify-self:start}.actions{flex-wrap:wrap}.actions button{white-space:normal;overflow-wrap:anywhere;max-width:100%}details article{display:grid;grid-template-columns:minmax(0,1fr);padding:10px 0;gap:7px;border-top:1px solid var(--border-subtle)}details article input{min-height:32px}.form-error17{color:var(--danger,#d95065);overflow-wrap:anywhere}
@container(min-width:520px){label{grid-template-columns:minmax(0,1fr) minmax(0,1.2fr)}}
details article .inline{flex-wrap:wrap}details article .inline input[type=number]{flex:1 1 86px;min-width:86px}
label>div{display:flex;flex-wrap:wrap}label>div input[type=number]{flex:1 1 86px;min-width:86px;width:0}
</style>
