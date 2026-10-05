<!-- 材质图编辑器：维护节点、连接和输出，展示诊断并提交材质配置。 -->
<template>
  <section class="material-graph-editor">
    <UiPanelHeader :title="t('visualMaterialGraph')" :description="t('visualMaterialGraphHint')"><template #actions><label class="target-field">{{ t('target') }}<select :value="document.target" @change="setTarget"><option>Sprite</option><option>UI</option><option>Light</option></select></label></template></UiPanelHeader>
    <div class="graph-workspace">
      <aside>
        <input :aria-label="t('searchNodes')" v-model.trim="search" :placeholder="t('searchNodes')">
        <UiButton v-for="kind in filteredKinds" :key="kind" icon="add" @click="addNode(kind)">{{ nodeLabel(kind) }}</UiButton>
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
          <label>X<NumericExpressionInput :model-value="Number(selectedNode.position.x)" @update:model-value="selectedNode.position.x = $event" :resource-key="resourceKey + ':node:' + selectedNode.uuid + ':selectedNode.position.x'" :step="10" @change="commit" /></label>
          <label>Y<NumericExpressionInput :model-value="Number(selectedNode.position.y)" @update:model-value="selectedNode.position.y = $event" :resource-key="resourceKey + ':node:' + selectedNode.uuid + ':selectedNode.position.y'" :step="10" @change="commit" /></label>
          <label v-if="hasAmount">{{ panelControlLabel('amount') }}<NumericExpressionInput :model-value="Number(selectedNode.values.amount)" @update:model-value="selectedNode.values.amount = $event" :resource-key="resourceKey + ':node:' + selectedNode.uuid + ':selectedNode.values.amount'" :minimum="0" :maximum="1" :step=".05" @change="commit" /></label>
          <label v-if="hasStrength">{{ t('strength') }}<NumericExpressionInput :model-value="Number(selectedNode.values.strength)" @update:model-value="selectedNode.values.strength = $event" :resource-key="resourceKey + ':node:' + selectedNode.uuid + ':selectedNode.values.strength'" :minimum="0" :maximum="32" :step=".05" @change="commit" /></label>
          <label v-if="selectedNode.kind === 'Number'">{{ t('value') }}<NumericExpressionInput :model-value="Number(selectedNode.values.value)" @update:model-value="selectedNode.values.value = $event" :resource-key="resourceKey + ':node:' + selectedNode.uuid + ':selectedNode.values.value'" :step=".05" @change="commit" /></label>
          <label v-if="selectedNode.kind === 'Color' || selectedNode.kind === 'Outline'">{{ t('color') }}<input type="color" :value="nodeColor('color')" @input="setNodeColor('color',$event)"></label>
          <label v-if="selectedNode.kind === 'Gradient'">{{ t('startColor') }}<input type="color" :value="nodeColor('colorA')" @input="setNodeColor('colorA',$event)"></label>
          <label v-if="selectedNode.kind === 'Gradient'">{{ t('endColor') }}<input type="color" :value="nodeColor('colorB')" @input="setNodeColor('colorB',$event)"></label>
          <label v-if="selectedNode.kind === 'Palette'">{{ t('paletteSteps') }}<NumericExpressionInput :model-value="Number(selectedNode.values.steps)" @update:model-value="selectedNode.values.steps = $event" :resource-key="resourceKey + ':node:' + selectedNode.uuid + ':selectedNode.values.steps'" :minimum="2" :maximum="64" :step="1" @change="commit" /></label>
          <label v-if="selectedNode.kind === 'Dissolve'">{{ t('threshold') }}<UiSlider :model-value="Number(selectedNode.values.threshold)" @update:model-value="selectedNode.values.threshold = $event" min="0" max="1" step=".01" @input="commit" /></label>
          <label v-if="selectedNode.kind === 'Dissolve'">{{ t('softness') }}<UiSlider :model-value="Number(selectedNode.values.softness)" @update:model-value="selectedNode.values.softness = $event" min=".001" max="1" step=".01" @input="commit" /></label>
          <label v-for="pin in selectedInputPins" :key="pin">{{ inputLabel(pin) }}
            <select :value="inputSource(pin)" @change="setInput(pin,$event)"><option value="">{{ t('none') }}</option><option v-for="node in inputCandidates" :key="node.uuid" :value="node.uuid">{{ node.label }} · {{ nodeLabel(node.kind) }}</option></select>
          </label>
          <UiButton v-if="selectedNode.kind !== 'Output'" icon="remove" variant="danger" :label="t('removeNode')" @click="removeSelected" />
        </template>
        <p v-else>{{ t('selectGraphNode') }}</p>
        <hr>
        <strong>{{ t('capabilityPreview') }}</strong>
        <label>{{ t('rendererBackend') }}<select v-model="previewBackend"><option>WebGL2</option><option>Canvas2D</option></select></label>
        <dl><div><dt>{{ t('supported') }}</dt><dd>{{ capability.supportedNodes }}</dd></div><div><dt>{{ t('textureReads') }}</dt><dd>{{ capability.gpuCost.textureReads }}</dd></div><div><dt>{{ t('estimatedGpuCost') }}</dt><dd>{{ capability.gpuCost.estimatedMsAt1080p }} ms</dd></div></dl>
        <p :class="capability.fallbackNodes.length ? 'warning' : 'good'">{{ capabilityRecommendation }}</p>
      </aside>
    </div>
    <details data-ui-motion-disclosure class="generated-source"><summary>{{ t('deterministicSource') }}</summary><pre>{{ compiledSource }}</pre></details>
<!-- 诊断严重程度回调检测错误；消息映射回调提取各诊断文本供页脚显示。 -->    <footer><span :class="diagnostics.some(item => item.severity === 'error') ? 'error' : 'good'">{{ diagnostics.length ? diagnostics.map(item => item.message).join(' · ') : t('graphReady') }}</span><UiButton icon="reset" :label="t('resetGraph')" @click="resetGraph" /></footer>
  </section>
</template>

<script setup lang="ts">
import NumericExpressionInput from './NumericExpressionInput.vue'
import UiButton from '../ui/components/UiButton.vue'
import UiPanelHeader from '../ui/components/UiPanelHeader.vue'
import { computed, ref } from 'vue'
import { t } from '../i18n'
import { panelControlLabel } from '../editor/panelControlCopy'
import { compileMaterialGraph, defaultMaterialGraph, materialCapabilityPreview, normalizeMaterialGraph, validateMaterialGraph, type MaterialGraphDocument, type MaterialGraphNodeKind, type MaterialGraphTarget, type MaterialLayer2D } from '../renderer/materialGraph'

const props = withDefaults(defineProps<{ modelValue: MaterialGraphDocument; layers?: MaterialLayer2D[]; resourceKey?: string }>(),{resourceKey:'material-graph'})
const emit = defineEmits<{ 'update:modelValue': [value: MaterialGraphDocument] }>()
const search = ref(''), selectedUuid = ref(''), previewBackend = ref<'WebGL2' | 'Canvas2D'>('WebGL2')
const kinds: MaterialGraphNodeKind[] = ['SpriteTexture', 'UITexture', 'LightColor', 'UV', 'Time', 'Color', 'Number', 'Gradient', 'Palette', 'Mask', 'Outline', 'Dissolve', 'Distortion', 'Multiply', 'Add', 'Blend']
const document = computed(/* 返回 props.modelValue 的当前值。 */ () => props.modelValue)
const filteredKinds = computed(/* 调用 kinds.filter(kind => nodeLabel(kind).toLocaleLowerCase().includes(search.value.toLocaleLowerCase())) 并返回调用结果。 */ () => kinds.filter(/* 调用 nodeLabel(kind).toLocaleLowerCase().includes(search.value.toLocaleLowerCase()) 并返回调用结果。 */ kind => nodeLabel(kind).toLocaleLowerCase().includes(search.value.toLocaleLowerCase())))
const selectedNode = computed(/** 查找当前选中材质节点，缺失时返回空值。 */ () => document.value.nodes.find(/* 比较 node.uuid 与 selectedUuid.value，返回严格相等的判断结果。 */ node => node.uuid === selectedUuid.value) ?? null)
const diagnostics = computed(/* 调用 validateMaterialGraph(document.value) 并返回调用结果。 */ () => validateMaterialGraph(document.value))
const capability = computed(/* 调用 materialCapabilityPreview(document.value, props.layers ?? [], previewBackend.value) 并返回调用结果。 */ () => materialCapabilityPreview(document.value, props.layers ?? [], previewBackend.value))
const compiledSource = computed(/* 返回 compileMaterialGraph(document.value).source 的当前值。 */ () => compileMaterialGraph(document.value).source)
const capabilityRecommendation = computed(/** 优先提示 Canvas 回退节点，否则按 GPU 成本阈值显示预算建议。 */ () => capability.value.fallbackNodes.length ? t('canvasMaterialFallback') : capability.value.gpuCost.score > 24 ? t('materialBudgetReduce') : t('materialBudgetGood'))
const hasAmount = computed(/* 比较 selectedNode.value?.kind 与 'Blend'，返回严格相等的判断结果。 */ () => selectedNode.value?.kind === 'Blend')
const hasStrength = computed(/* 调用 ['Palette', 'Outline', 'Distortion'].includes(selectedNode.value?.kind ?? '') 并返回调用结果。 */ () => ['Palette', 'Outline', 'Distortion'].includes(selectedNode.value?.kind ?? ''))
const selectedInputPins = computed(/** 根据选中节点种类返回其可连接输入引脚名称。 */ () => {
  const kind = selectedNode.value?.kind
  if (kind === 'Mask') return ['color', 'mask']
  if (kind === 'Multiply' || kind === 'Add' || kind === 'Blend') return ['a', 'b']
  if (kind === 'Palette' || kind === 'Outline' || kind === 'Dissolve' || kind === 'Distortion' || kind === 'Output') return ['color']
  return []
})
const inputCandidates = computed(/* 调用 document.value.nodes.filter(node => node.uuid !== selectedUuid.value && node.kind !== 'Output') 并返回调用结果。 */ () => document.value.nodes.filter(/* 先计算 node.uuid !== selectedUuid.value；仅当其为真值时求右侧 node.kind !== 'Output'，返回短路求值结果。 */ node => node.uuid !== selectedUuid.value && node.kind !== 'Output'))
const canvasWidth = computed(/* 调用 Math.max(720, ...document.value.nodes.map(node => node.position.x + 190)) 并返回调用结果。 */ () => Math.max(720, ...document.value.nodes.map(/* 计算表达式 node.position.x + 190 并返回结果，沿用操作数的原有类型规则。 */ node => node.position.x + 190)))
const canvasHeight = computed(/* 调用 Math.max(420, ...document.value.nodes.map(node => node.position.y + 100)) 并返回调用结果。 */ () => Math.max(420, ...document.value.nodes.map(/* 计算表达式 node.position.y + 100 并返回结果，沿用操作数的原有类型规则。 */ node => node.position.y + 100)))
const lines = computed(/** 把有效连接转换为可绘制的贝塞尔路径列表。 */ () => document.value.edges.flatMap(/** 查找边的两端节点，端点均存在时计算路径，否则忽略该边。 */ edge => { const from = document.value.nodes.find(/* 比较 node.uuid 与 edge.fromNode，返回严格相等的判断结果。 */ node => node.uuid === edge.fromNode), to = document.value.nodes.find(/* 比较 node.uuid 与 edge.toNode，返回严格相等的判断结果。 */ node => node.uuid === edge.toNode); return from && to ? [{ uuid: edge.uuid, path: `M ${from.position.x + 150} ${from.position.y + 33} C ${from.position.x + 210} ${from.position.y + 33}, ${to.position.x - 60} ${to.position.y + 33}, ${to.position.x} ${to.position.y + 33}` }] : [] }))

/* 调用 t(`materialNode${kind}`) 并返回调用结果。 */ function nodeLabel(kind: MaterialGraphNodeKind) { return t(`materialNode${kind}`) }
/* 根据 pin === 'a' 的真假，分别返回 'A' 或 pin === 'b' ? 'B' : pin === 'mask' ? t('mask') : t('input')。 */ function inputLabel(pin: string) { return pin === 'a' ? 'A' : pin === 'b' ? 'B' : pin === 'mask' ? t('mask') : t('input') }
/** 规范化当前材质图并通知父组件更新。 */ function commit() { emit('update:modelValue', normalizeMaterialGraph(document.value)) }
/** 从节点颜色值或默认值生成钳制到有效通道范围的十六进制颜色。 */ function nodeColor(key: string) { const value = selectedNode.value?.values[key], channels = Array.isArray(value) ? value : key === 'colorA' || key === 'color' ? [1, 1, 1, 1] : [0, 0, 0, 1]; return `#${channels.slice(0,3).map(/* 调用 Math.round(Math.min(1,Math.max(0,channel))*255).toString(16).padStart(2,'0') 并返回调用结果。 */ channel => Math.round(Math.min(1,Math.max(0,channel))*255).toString(16).padStart(2,'0')).join('')}` }
/** 解析颜色输入为归一化 RGB 与不透明 alpha，然后提交。 */ function setNodeColor(key: string, event: Event) { if (!selectedNode.value) return; const value = (event.target as HTMLInputElement).value; selectedNode.value.values[key] = [1,3,5].map(/* 计算表达式 parseInt(value.slice(index,index+2),16)/255 并返回结果，沿用操作数的原有类型规则。 */ index => parseInt(value.slice(index,index+2),16)/255).concat([1]); commit() }
/* 当 document.value.edges.find(edge => edge.toNode === selectedUuid.value && edge.toPin === pin)?.fromNode 为 null 或 undefined 时返回 ''，否则保留左侧值。 */ function inputSource(pin: string) { return document.value.edges.find(/* 先计算 edge.toNode === selectedUuid.value；仅当其为真值时求右侧 edge.toPin === pin，返回短路求值结果。 */ edge => edge.toNode === selectedUuid.value && edge.toPin === pin)?.fromNode ?? '' }
/** 替换指定输入引脚已有连接，选中来源时新增连接并提交规范化图。 */ function setInput(pin: string, event: Event) { if (!selectedNode.value) return; const source = (event.target as HTMLSelectElement).value, edges = document.value.edges.filter(/* 返回 (edge.toNode === selectedNode.value!.uuid && edge.toPin === pin) 的逻辑取反结果。 */ edge => !(edge.toNode === selectedNode.value!.uuid && edge.toPin === pin)); if (source) edges.push({ uuid: `edge-${source}-${selectedNode.value.uuid}-${pin}`, fromNode: source, fromPin: 'color', toNode: selectedNode.value.uuid, toPin: pin }); emit('update:modelValue', normalizeMaterialGraph({ ...document.value, edges })) }
/** 读取新材质目标并提交规范化图。 */ function setTarget(event: Event) { const value = (event.target as HTMLSelectElement).value as MaterialGraphTarget; emit('update:modelValue', normalizeMaterialGraph({ ...document.value, target: value })) }
/** 创建具有种类默认参数的节点，插入现有输出路径并选中新节点。 */ function addNode(kind: MaterialGraphNodeKind) {
  const output = document.value.nodes.find(/* 比较 node.kind 与 'Output'，返回严格相等的判断结果。 */ node => node.kind === 'Output'), incoming = output ? document.value.edges.find(/* 比较 edge.toNode 与 output.uuid，返回严格相等的判断结果。 */ edge => edge.toNode === output.uuid) : null
  const uuid = `node-${kind.toLocaleLowerCase()}-${Date.now().toString(36)}`, previous = incoming?.fromNode ?? document.value.nodes.find(/* 先计算 node.kind.endsWith('Texture')；仅当其为假值时求右侧 node.kind === 'LightColor'，返回短路求值结果。 */ node => node.kind.endsWith('Texture') || node.kind === 'LightColor')?.uuid
  const node = { uuid, kind, label: nodeLabel(kind), position: { x: Math.max(190, (output?.position.x ?? 520) - 190), y: 50 + (document.value.nodes.length % 5) * 76 }, values: kind === 'Palette' ? { steps: 6, strength: 6 } : kind === 'Dissolve' ? { threshold: .5, softness: .05 } : kind === 'Distortion' || kind === 'Outline' ? { strength: .25 } : kind === 'Blend' ? { amount: .5 } : {} }
  const edges = document.value.edges.filter(/* 比较 edge 与 incoming，返回严格不等的判断结果。 */ edge => edge !== incoming)
  if (previous) edges.push({ uuid: `edge-${previous}-${uuid}`, fromNode: previous, fromPin: 'color', toNode: uuid, toPin: kind === 'Blend' ? 'a' : 'color' })
  if (output) edges.push({ uuid: `edge-${uuid}-${output.uuid}`, fromNode: uuid, fromPin: 'color', toNode: output.uuid, toPin: 'color' })
  emit('update:modelValue', normalizeMaterialGraph({ ...document.value, nodes: [...document.value.nodes, node], edges })); selectedUuid.value = uuid
}
/** 禁止删除输出节点；删除所选节点及其边，存在前后连接时桥接第一对端点后提交。 */ function removeSelected() { if (!selectedNode.value || selectedNode.value.kind === 'Output') return; const uuid = selectedNode.value.uuid, incoming = document.value.edges.find(/* 比较 edge.toNode 与 uuid，返回严格相等的判断结果。 */ edge => edge.toNode === uuid), outgoing = document.value.edges.find(/* 比较 edge.fromNode 与 uuid，返回严格相等的判断结果。 */ edge => edge.fromNode === uuid), edges = document.value.edges.filter(/* 先计算 edge.fromNode !== uuid；仅当其为真值时求右侧 edge.toNode !== uuid，返回短路求值结果。 */ edge => edge.fromNode !== uuid && edge.toNode !== uuid); if (incoming && outgoing) edges.push({ uuid: `edge-${incoming.fromNode}-${outgoing.toNode}`, fromNode: incoming.fromNode, fromPin: incoming.fromPin, toNode: outgoing.toNode, toPin: outgoing.toPin }); emit('update:modelValue', normalizeMaterialGraph({ ...document.value, nodes: document.value.nodes.filter(/* 比较 node.uuid 与 uuid，返回严格不等的判断结果。 */ node => node.uuid !== uuid), edges })); selectedUuid.value = '' }
/** 按当前目标恢复默认材质图并清除选择。 */ function resetGraph() { emit('update:modelValue', defaultMaterialGraph(document.value.target)); selectedUuid.value = '' }
</script>

<style scoped>
.material-graph-editor { container: nova-material / inline-size; height: 100%; min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--surface-1); }
.target-field { display: flex; align-items: center; gap: var(--ui-control-gap); font-size: var(--type-body); line-height: var(--line-body); }.target-field select { width: auto; }
.graph-workspace { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(14ch, .65fr) minmax(0, 2fr) minmax(20ch, 1fr); overflow: auto; }
.graph-workspace > aside { min-width: 0; padding: var(--space-2); display: flex; flex-direction: column; gap: var(--space-1); overflow: auto; border-right: var(--ui-border-width) solid var(--border-subtle); }
.graph-workspace > aside > button { justify-content: start; text-align: start; white-space: normal; overflow-wrap: anywhere; }
.graph-canvas { position: relative; min-width: 0; overflow: auto; background-color: var(--bg-canvas); background-image: radial-gradient(circle, var(--border-strong) 1px, transparent 1px); background-size: var(--space-5) var(--space-5); }
.graph-canvas svg { position: absolute; inset: 0; min-width: 100%; min-height: 100%; pointer-events: none; }.graph-canvas path { fill: none; stroke: var(--accent); stroke-width: 2; }
/* Node geometry remains coupled to graph edge coordinates, not form controls. */
.graph-node { position: absolute; width: 150px; height: 66px; padding: var(--space-2); display: grid; text-align: start; border: var(--ui-border-width) solid var(--border-strong); border-radius: var(--radius-control); color: var(--text-primary); background: var(--surface-2); }
.graph-node.selected { border-color: var(--accent); outline: var(--ui-border-width) solid var(--accent); }.graph-node.output { border-left: var(--space-1) solid var(--success); }.graph-node strong { white-space: normal; overflow-wrap: anywhere; }.graph-node small { overflow: hidden; color: var(--text-muted); text-overflow: ellipsis; }
.graph-workspace > .details { border-right: 0; border-left: var(--ui-border-width) solid var(--border-subtle); }.details label { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-1) var(--space-2); min-height: var(--ui-standard-height); padding-block: var(--space-1); color: var(--text-secondary); font-size: var(--type-dense); }.details label > :is(input, select) { flex: 0 1 auto; }.details dl { display: grid; gap: var(--space-1); }.details dl div { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-2); }.details dd { margin: 0; font-variant-numeric: tabular-nums; }.details p { font-size: var(--type-caption); line-height: var(--line-body); overflow-wrap: anywhere; }
.generated-source { max-height: calc(6 * var(--ui-control-height)); overflow: auto; border-top: var(--ui-border-width) solid var(--border-subtle); }.generated-source pre { padding: var(--space-2); font-size: var(--type-caption); white-space: pre-wrap; }
footer { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: var(--space-2); padding: var(--space-1) var(--space-2); border-top: var(--ui-border-width) solid var(--border-subtle); }footer span { min-width: 0; overflow-wrap: anywhere; font-size: var(--type-caption); }.warning { color: var(--warning); }.error { color: var(--danger); }.good { color: var(--success); }
@container nova-material (max-width: 900px) { .graph-workspace { grid-template-columns: minmax(14ch,.65fr) minmax(0,2fr); grid-template-rows: minmax(320px,1fr) auto; }.graph-workspace > .details { grid-column: 1 / -1; max-height: calc(8 * var(--ui-standard-height)); border-left: 0; border-top: var(--ui-border-width) solid var(--border-subtle); } }
@container nova-material (max-width: 520px) { .graph-workspace { grid-template-columns: minmax(0,1fr); grid-template-rows: auto minmax(320px,1fr) auto; }.graph-workspace > aside:first-child { max-height: calc(5 * var(--ui-standard-height)); }.graph-workspace > .details { grid-column: auto; } }
</style>
