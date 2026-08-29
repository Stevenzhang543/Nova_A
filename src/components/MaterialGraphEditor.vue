<template>
  <section class="material-graph-editor">
    <header>
      <div><strong>{{ t('visualMaterialGraph') }}</strong><small>{{ t('visualMaterialGraphHint') }}</small></div>
      <label>{{ t('target') }}<select :value="document.target" @change="setTarget"><option>Sprite</option><option>UI</option><option>Light</option></select></label>
    </header>
    <div class="graph-workspace">
      <aside>
        <input v-model.trim="search" :placeholder="t('searchNodes')">
        <button v-for="kind in filteredKinds" :key="kind" @click="addNode(kind)">＋ {{ nodeLabel(kind) }}</button>
      </aside>
      <div class="graph-canvas" role="application" :aria-label="t('visualMaterialGraph')">
        <svg aria-hidden="true" :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"><path v-for="edge in lines" :key="edge.uuid" :d="edge.path" /></svg>
        <button v-for="node in document.nodes" :key="node.uuid" class="graph-node" :class="{ selected: node.uuid === selectedUuid, output: node.kind === 'Output' }" :style="{ left: `${node.position.x}px`, top: `${node.position.y}px` }" @click="selectedUuid = node.uuid">
          <strong>{{ nodeLabel(node.kind) }}</strong><small>{{ node.uuid }}</small>
        </button>
      </div>
      <aside class="details">
        <template v-if="selectedNode">
          <strong>{{ nodeLabel(selectedNode.kind) }}</strong>
          <label>{{ t('name') }}<input v-model.trim="selectedNode.label" maxlength="80" @change="commit"></label>
          <label>X<input v-model.number="selectedNode.position.x" type="number" step="10" @change="commit"></label>
          <label>Y<input v-model.number="selectedNode.position.y" type="number" step="10" @change="commit"></label>
          <label v-if="hasAmount">{{ t('amount') }}<input v-model.number="selectedNode.values.amount" type="number" min="0" max="1" step=".05" @change="commit"></label>
          <label v-if="hasStrength">{{ t('strength') }}<input v-model.number="selectedNode.values.strength" type="number" min="0" max="32" step=".05" @change="commit"></label>
          <label v-if="selectedNode.kind === 'Number'">{{ t('value') }}<input v-model.number="selectedNode.values.value" type="number" step=".05" @change="commit"></label>
          <label v-if="selectedNode.kind === 'Color' || selectedNode.kind === 'Outline'">{{ t('color') }}<input type="color" :value="nodeColor('color')" @input="setNodeColor('color',$event)"></label>
          <label v-if="selectedNode.kind === 'Gradient'">{{ t('startColor') }}<input type="color" :value="nodeColor('colorA')" @input="setNodeColor('colorA',$event)"></label>
          <label v-if="selectedNode.kind === 'Gradient'">{{ t('endColor') }}<input type="color" :value="nodeColor('colorB')" @input="setNodeColor('colorB',$event)"></label>
          <label v-if="selectedNode.kind === 'Palette'">{{ t('paletteSteps') }}<input v-model.number="selectedNode.values.steps" type="number" min="2" max="64" step="1" @change="commit"></label>
          <label v-if="selectedNode.kind === 'Dissolve'">{{ t('threshold') }}<input v-model.number="selectedNode.values.threshold" type="range" min="0" max="1" step=".01" @input="commit"></label>
          <label v-if="selectedNode.kind === 'Dissolve'">{{ t('softness') }}<input v-model.number="selectedNode.values.softness" type="range" min=".001" max="1" step=".01" @input="commit"></label>
          <label v-for="pin in selectedInputPins" :key="pin">{{ inputLabel(pin) }}
            <select :value="inputSource(pin)" @change="setInput(pin,$event)"><option value="">{{ t('none') }}</option><option v-for="node in inputCandidates" :key="node.uuid" :value="node.uuid">{{ node.label }} · {{ nodeLabel(node.kind) }}</option></select>
          </label>
          <button v-if="selectedNode.kind !== 'Output'" class="danger" @click="removeSelected">{{ t('removeNode') }}</button>
        </template>
        <p v-else>{{ t('selectGraphNode') }}</p>
        <hr>
        <strong>{{ t('capabilityPreview') }}</strong>
        <label>{{ t('rendererBackend') }}<select v-model="previewBackend"><option>WebGL2</option><option>Canvas2D</option></select></label>
        <dl><div><dt>{{ t('supported') }}</dt><dd>{{ capability.supportedNodes }}</dd></div><div><dt>{{ t('textureReads') }}</dt><dd>{{ capability.gpuCost.textureReads }}</dd></div><div><dt>{{ t('estimatedGpuCost') }}</dt><dd>{{ capability.gpuCost.estimatedMsAt1080p }} ms</dd></div></dl>
        <p :class="capability.fallbackNodes.length ? 'warning' : 'good'">{{ capabilityRecommendation }}</p>
      </aside>
    </div>
    <details class="generated-source"><summary>{{ t('deterministicSource') }}</summary><pre>{{ compiledSource }}</pre></details>
    <footer><span :class="diagnostics.some(item => item.severity === 'error') ? 'error' : 'good'">{{ diagnostics.length ? diagnostics.map(item => item.message).join(' · ') : t('graphReady') }}</span><button @click="resetGraph">{{ t('resetGraph') }}</button></footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../i18n'
import { compileMaterialGraph, defaultMaterialGraph, materialCapabilityPreview, normalizeMaterialGraph, validateMaterialGraph, type MaterialGraphDocument, type MaterialGraphNodeKind, type MaterialGraphTarget, type MaterialLayer2D } from '../renderer/materialGraph'

const props = defineProps<{ modelValue: MaterialGraphDocument; layers?: MaterialLayer2D[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: MaterialGraphDocument] }>()
const search = ref(''), selectedUuid = ref(''), previewBackend = ref<'WebGL2' | 'Canvas2D'>('WebGL2')
const kinds: MaterialGraphNodeKind[] = ['SpriteTexture', 'UITexture', 'LightColor', 'UV', 'Time', 'Color', 'Number', 'Gradient', 'Palette', 'Mask', 'Outline', 'Dissolve', 'Distortion', 'Multiply', 'Add', 'Blend']
const document = computed(() => props.modelValue)
const filteredKinds = computed(() => kinds.filter(kind => nodeLabel(kind).toLocaleLowerCase().includes(search.value.toLocaleLowerCase())))
const selectedNode = computed(() => document.value.nodes.find(node => node.uuid === selectedUuid.value) ?? null)
const diagnostics = computed(() => validateMaterialGraph(document.value))
const capability = computed(() => materialCapabilityPreview(document.value, props.layers ?? [], previewBackend.value))
const compiledSource = computed(() => compileMaterialGraph(document.value).source)
const capabilityRecommendation = computed(() => capability.value.fallbackNodes.length ? t('canvasMaterialFallback') : capability.value.gpuCost.score > 24 ? t('materialBudgetReduce') : t('materialBudgetGood'))
const hasAmount = computed(() => selectedNode.value?.kind === 'Blend')
const hasStrength = computed(() => ['Palette', 'Outline', 'Distortion'].includes(selectedNode.value?.kind ?? ''))
const selectedInputPins = computed(() => {
  const kind = selectedNode.value?.kind
  if (kind === 'Mask') return ['color', 'mask']
  if (kind === 'Multiply' || kind === 'Add' || kind === 'Blend') return ['a', 'b']
  if (kind === 'Palette' || kind === 'Outline' || kind === 'Dissolve' || kind === 'Distortion' || kind === 'Output') return ['color']
  return []
})
const inputCandidates = computed(() => document.value.nodes.filter(node => node.uuid !== selectedUuid.value && node.kind !== 'Output'))
const canvasWidth = computed(() => Math.max(720, ...document.value.nodes.map(node => node.position.x + 190)))
const canvasHeight = computed(() => Math.max(420, ...document.value.nodes.map(node => node.position.y + 100)))
const lines = computed(() => document.value.edges.flatMap(edge => { const from = document.value.nodes.find(node => node.uuid === edge.fromNode), to = document.value.nodes.find(node => node.uuid === edge.toNode); return from && to ? [{ uuid: edge.uuid, path: `M ${from.position.x + 150} ${from.position.y + 33} C ${from.position.x + 210} ${from.position.y + 33}, ${to.position.x - 60} ${to.position.y + 33}, ${to.position.x} ${to.position.y + 33}` }] : [] }))

function nodeLabel(kind: MaterialGraphNodeKind) { return t(`materialNode${kind}`) }
function inputLabel(pin: string) { return pin === 'a' ? 'A' : pin === 'b' ? 'B' : pin === 'mask' ? t('mask') : t('input') }
function commit() { emit('update:modelValue', normalizeMaterialGraph(document.value)) }
function nodeColor(key: string) { const value = selectedNode.value?.values[key], channels = Array.isArray(value) ? value : key === 'colorA' || key === 'color' ? [1, 1, 1, 1] : [0, 0, 0, 1]; return `#${channels.slice(0,3).map(channel => Math.round(Math.min(1,Math.max(0,channel))*255).toString(16).padStart(2,'0')).join('')}` }
function setNodeColor(key: string, event: Event) { if (!selectedNode.value) return; const value = (event.target as HTMLInputElement).value; selectedNode.value.values[key] = [1,3,5].map(index => parseInt(value.slice(index,index+2),16)/255).concat([1]); commit() }
function inputSource(pin: string) { return document.value.edges.find(edge => edge.toNode === selectedUuid.value && edge.toPin === pin)?.fromNode ?? '' }
function setInput(pin: string, event: Event) { if (!selectedNode.value) return; const source = (event.target as HTMLSelectElement).value, edges = document.value.edges.filter(edge => !(edge.toNode === selectedNode.value!.uuid && edge.toPin === pin)); if (source) edges.push({ uuid: `edge-${source}-${selectedNode.value.uuid}-${pin}`, fromNode: source, fromPin: 'color', toNode: selectedNode.value.uuid, toPin: pin }); emit('update:modelValue', normalizeMaterialGraph({ ...document.value, edges })) }
function setTarget(event: Event) { const value = (event.target as HTMLSelectElement).value as MaterialGraphTarget; emit('update:modelValue', normalizeMaterialGraph({ ...document.value, target: value })) }
function addNode(kind: MaterialGraphNodeKind) {
  const output = document.value.nodes.find(node => node.kind === 'Output'), incoming = output ? document.value.edges.find(edge => edge.toNode === output.uuid) : null
  const uuid = `node-${kind.toLocaleLowerCase()}-${Date.now().toString(36)}`, previous = incoming?.fromNode ?? document.value.nodes.find(node => node.kind.endsWith('Texture') || node.kind === 'LightColor')?.uuid
  const node = { uuid, kind, label: nodeLabel(kind), position: { x: Math.max(190, (output?.position.x ?? 520) - 190), y: 50 + (document.value.nodes.length % 5) * 76 }, values: kind === 'Palette' ? { steps: 6, strength: 6 } : kind === 'Dissolve' ? { threshold: .5, softness: .05 } : kind === 'Distortion' || kind === 'Outline' ? { strength: .25 } : kind === 'Blend' ? { amount: .5 } : {} }
  const edges = document.value.edges.filter(edge => edge !== incoming)
  if (previous) edges.push({ uuid: `edge-${previous}-${uuid}`, fromNode: previous, fromPin: 'color', toNode: uuid, toPin: kind === 'Blend' ? 'a' : 'color' })
  if (output) edges.push({ uuid: `edge-${uuid}-${output.uuid}`, fromNode: uuid, fromPin: 'color', toNode: output.uuid, toPin: 'color' })
  emit('update:modelValue', normalizeMaterialGraph({ ...document.value, nodes: [...document.value.nodes, node], edges })); selectedUuid.value = uuid
}
function removeSelected() { if (!selectedNode.value || selectedNode.value.kind === 'Output') return; const uuid = selectedNode.value.uuid, incoming = document.value.edges.find(edge => edge.toNode === uuid), outgoing = document.value.edges.find(edge => edge.fromNode === uuid), edges = document.value.edges.filter(edge => edge.fromNode !== uuid && edge.toNode !== uuid); if (incoming && outgoing) edges.push({ uuid: `edge-${incoming.fromNode}-${outgoing.toNode}`, fromNode: incoming.fromNode, fromPin: incoming.fromPin, toNode: outgoing.toNode, toPin: outgoing.toPin }); emit('update:modelValue', normalizeMaterialGraph({ ...document.value, nodes: document.value.nodes.filter(node => node.uuid !== uuid), edges })); selectedUuid.value = '' }
function resetGraph() { emit('update:modelValue', defaultMaterialGraph(document.value.target)); selectedUuid.value = '' }
</script>

<style scoped>
.material-graph-editor{height:100%;min-height:360px;display:flex;flex-direction:column;border:1px solid var(--border-subtle);border-radius:10px;overflow:hidden;background:var(--surface-2)}header,footer{min-height:42px;padding:6px 9px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid var(--border-subtle)}header>div{display:grid}header small{color:var(--text-muted);font-size:11px}.graph-workspace{min-height:0;display:grid;grid-template-columns:minmax(150px,190px) minmax(460px,1fr) minmax(190px,240px);flex:1}.graph-workspace>aside{min-width:0;padding:7px;display:flex;flex-direction:column;gap:5px;overflow:auto;border-right:1px solid var(--border-subtle)}aside>button{min-height:30px;text-align:left}.graph-canvas{position:relative;min-width:0;overflow:auto;background-color:#11161e;background-image:radial-gradient(circle,#344054 1px,transparent 1px);background-size:18px 18px}.graph-canvas svg{position:absolute;inset:0;min-width:100%;min-height:100%;pointer-events:none}.graph-canvas path{fill:none;stroke:#67a7ff;stroke-width:2}.graph-node{position:absolute;width:150px;height:66px;padding:7px;display:grid;text-align:left;border:1px solid #50617a;border-radius:8px;color:#d8e5f7;background:#202a38;box-shadow:0 8px 20px #0005}.graph-node.selected{border-color:#74b0ff;box-shadow:0 0 0 2px #4090ff44,0 8px 20px #0006}.graph-node.output{background:#263b35}.graph-node small{overflow:hidden;color:#91a3bb;text-overflow:ellipsis}.details{border-right:0!important;border-left:1px solid var(--border-subtle)}.details label{display:grid;gap:3px;color:var(--text-muted);font-size:11px}.details dl{display:grid;gap:4px}.details dl div{display:flex;justify-content:space-between}.details dd{margin:0;color:var(--accent)}.details p{font-size:11px;line-height:1.4}.generated-source{max-height:130px;padding:5px 9px;overflow:auto;border-top:1px solid var(--border-subtle)}.generated-source pre{font:11px/1.45 var(--font-mono);white-space:pre-wrap}.warning,.error{color:var(--warning)}.good{color:var(--success)}footer{border-top:1px solid var(--border-subtle);border-bottom:0}footer span{min-width:0;overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}@media(max-width:1100px){.graph-workspace{grid-template-columns:150px minmax(430px,1fr)}.details{grid-column:1/-1;max-height:180px;border-top:1px solid var(--border-subtle);border-left:0!important}}@media(max-width:760px){.graph-workspace{grid-template-columns:1fr}.graph-workspace>aside{max-height:120px;border-right:0;border-bottom:1px solid var(--border-subtle)}.graph-canvas{min-height:420px}.details{max-height:220px}}
.graph-workspace>aside>button{white-space:normal;overflow-wrap:anywhere}
</style>
