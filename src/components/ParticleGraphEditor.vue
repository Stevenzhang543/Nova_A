<template>
  <section class="particle-graph-editor">
    <header><div><strong>{{ t('particleGraph') }}</strong><small>{{ t('particleGraphHint') }}</small></div><label>{{ t('simulationBackend') }}<select v-model="document.simulation" @change="commit"><option>Auto</option><option>CPU</option><option>GPU</option></select></label></header>
    <div class="particle-layout">
      <aside><button v-for="item in document.modules" :key="item.id" :class="{ active: selectedId === item.id, disabled: !item.enabled }" @click="selectedId = item.id"><input :checked="item.enabled" type="checkbox" @click.stop @change="toggle(item.id,$event)"><span>{{ t(`particleModule${item.kind}`) }}</span><small>#{{ item.order + 1 }}</small></button></aside>
      <main v-if="selected">
        <header><strong>{{ t(`particleModule${selected.kind}`) }}</strong><span>{{ selected.id }}</span></header>
        <label v-if="selected.kind === 'Spawn'">{{ t('emissionRate') }}<input :value="value('rate',20)" type="number" min="0" max="100000" @input="setNumber('rate',$event)"></label>
        <label v-if="selected.kind === 'Spawn'">{{ t('burst') }}<input :value="value('burst',0)" type="number" min="0" max="100000" @input="setNumber('burst',$event,true)"></label>
        <label v-if="selected.kind === 'Spawn'">{{ t('lifetime') }}<input :value="value('lifetime',1)" type="number" min=".0001" max="86400" step=".1" @input="setNumber('lifetime',$event)"></label>
        <label v-if="selected.kind === 'Spawn'">{{ t('maxParticles') }}<input :value="value('maximum',1000)" type="number" min="0" max="100000" @input="setNumber('maximum',$event,true)"></label>
        <label v-if="selected.kind === 'Shape'">{{ t('emissionShape') }}<select :value="value('shape','Point')" @change="setText('shape',$event)"><option>Point</option><option>Box</option><option>Circle</option><option>Edge</option></select></label>
        <label v-if="selected.kind === 'Velocity'">{{ t('minimumVelocity') }}<input :value="vectorText('minimum',[-1,1])" @change="setVector('minimum',$event)"></label>
        <label v-if="selected.kind === 'Velocity'">{{ t('maximumVelocity') }}<input :value="vectorText('maximum',[1,3])" @change="setVector('maximum',$event)"></label>
        <label v-if="selected.kind === 'Force'">{{ t('particleGravity') }}<input :value="vectorText('gravity',[0,-9.80665])" @change="setVector('gravity',$event)"></label>
        <label v-if="selected.kind === 'Size'">{{ t('startSize') }}<input :value="value('start',.2)" type="number" min="0" step=".05" @input="setNumber('start',$event)"></label>
        <label v-if="selected.kind === 'Size'">{{ t('endSize') }}<input :value="value('end',0)" type="number" min="0" step=".05" @input="setNumber('end',$event)"></label>
        <label v-if="selected.kind === 'Collision'">{{ t('collisionMode') }}<select :value="value('mode','Bounce')" @change="setText('mode',$event)"><option>Bounce</option><option>Stop</option></select></label>
        <label v-if="selected.kind === 'Events'">{{ t('eventSignal') }}<input :value="value('signal','particle.event')" @input="setText('signal',$event)"></label>
        <label v-if="selected.kind === 'SubEmitter'">{{ t('subEmitterUuid') }}<input :value="value('emitterUuid','')" @input="setText('emitterUuid',$event)"></label>
        <label v-if="selected.kind === 'Trail'">{{ t('trailLength') }}<input :value="value('length',12)" type="number" min="2" max="32" @input="setNumber('length',$event,true)"></label>
        <label v-if="selected.kind === 'Trail'">{{ t('trailWidth') }}<input :value="value('width',.08)" type="number" min=".001" step=".01" @input="setNumber('width',$event)"></label>
        <label v-if="selected.kind === 'Renderer'">{{ t('blendMode') }}<select :value="value('blend','Additive')" @change="setText('blend',$event)"><option>Alpha</option><option>Additive</option></select></label>
        <p v-if="!editableSelected">{{ t('moduleUsesInspectorCurves') }}</p>
      </main>
      <aside class="particle-preview">
        <strong>{{ t('budgetEstimate') }}</strong><dl><div><dt>{{ t('maxParticles') }}</dt><dd>{{ cost.maximumParticles }}</dd></div><div><dt>{{ t('operationsPerFrame') }}</dt><dd>{{ cost.operationsPerFrame }}</dd></div><div><dt>CPU</dt><dd>{{ cost.estimatedCpuMs }} ms</dd></div><div><dt>{{ t('trailVertices') }}</dt><dd>{{ cost.trailVertices }}</dd></div></dl>
        <p>{{ backendMessage }}</p><p :class="diagnostics.some(item=>item.severity==='error') ? 'error' : diagnostics.length ? 'warning' : 'good'">{{ diagnostics.length ? t('particleFallbackNotice') : costMessage }}</p>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../i18n'
import { normalizeParticleGraph, particleGraphCost, validateParticleGraph, type ParticleGraphDocument } from '../renderer/particleGraph'
const props = defineProps<{ modelValue: ParticleGraphDocument; backend: 'WebGL2' | 'Canvas2D' }>()
const emit = defineEmits<{ 'update:modelValue': [value: ParticleGraphDocument] }>()
const selectedId = ref('spawn'), document = computed(() => props.modelValue), selected = computed(() => document.value.modules.find(item => item.id === selectedId.value) ?? document.value.modules[0] ?? null)
const diagnostics = computed(() => validateParticleGraph(document.value, props.backend)), cost = computed(() => particleGraphCost(document.value))
const backendMessage = computed(() => props.backend === 'Canvas2D' ? t('particleCpuOnly') : document.value.simulation === 'GPU' && document.value.modules.some(item => item.enabled && ['Collision','Events','SubEmitter'].includes(item.kind)) ? t('particleHybridFallback') : t('particleCpuGpu'))
const costMessage = computed(() => cost.value.operationsPerFrame > 700_000 ? t('particleBudgetReduce') : t('particleBudgetGood'))
const editableSelected = computed(() => selected.value && ['Spawn','Shape','Velocity','Force','Size','Collision','Events','SubEmitter','Trail','Renderer'].includes(selected.value.kind))
function commit(){emit('update:modelValue',normalizeParticleGraph(document.value))}
function toggle(id:string,event:Event){const item=document.value.modules.find(candidate=>candidate.id===id);if(item)item.enabled=(event.target as HTMLInputElement).checked;commit()}
function value(key:string,fallback:number|string){return selected.value?.values[key]??fallback}
function vectorText(key:string,fallback:number[]){const value=selected.value?.values[key];return (Array.isArray(value)?value:fallback).join(', ')}
function setNumber(key:string,event:Event,integer=false){if(!selected.value)return;const number=Number((event.target as HTMLInputElement).value);selected.value.values[key]=integer?Math.round(number):number;commit()}
function setText(key:string,event:Event){if(!selected.value)return;selected.value.values[key]=(event.target as HTMLInputElement|HTMLSelectElement).value;commit()}
function setVector(key:string,event:Event){if(!selected.value)return;const parts=(event.target as HTMLInputElement).value.split(',').map(Number);if(parts.length===2&&parts.every(Number.isFinite)){selected.value.values[key]=parts;commit()}}
</script>

<style scoped>
.particle-graph-editor{min-height:350px;display:flex;flex-direction:column;border:1px solid var(--border-subtle);border-radius:10px;overflow:hidden;background:var(--surface-2)}.particle-graph-editor>header{min-height:42px;padding:6px 9px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid var(--border-subtle)}header>div{display:grid}header small{color:var(--text-muted);font-size:11px}.particle-layout{min-height:0;display:grid;grid-template-columns:minmax(170px,220px) minmax(290px,1fr) minmax(210px,280px);flex:1}.particle-layout>aside,.particle-layout>main{min-width:0;padding:8px;overflow:auto;border-right:1px solid var(--border-subtle)}.particle-layout>aside:first-child{display:flex;flex-direction:column;gap:4px}.particle-layout>aside:first-child button{min-height:32px;padding:4px 7px;display:grid;grid-template-columns:20px 1fr auto;align-items:center;text-align:left}.particle-layout button.disabled{opacity:.6}.particle-layout button.active{border-color:var(--accent);background:var(--accent-soft)}main header{display:flex;justify-content:space-between}main>label{min-height:34px;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted)}main input,main select{width:min(180px,55%)}.particle-preview{border-right:0!important}.particle-preview dl{display:grid;gap:5px}.particle-preview dl div{display:flex;justify-content:space-between}.particle-preview dd{margin:0;color:var(--accent)}.particle-preview p{font-size:11px;line-height:1.4}.good{color:var(--success)}.warning{color:var(--warning)}.error{color:var(--danger)}@media(max-width:1000px){.particle-layout{grid-template-columns:180px 1fr}.particle-preview{grid-column:1/-1;max-height:150px;border-top:1px solid var(--border-subtle)}}@media(max-width:680px){.particle-layout{grid-template-columns:1fr}.particle-layout>aside:first-child{max-height:135px}.particle-preview{grid-column:auto}}
</style>
