<!-- 材质图编辑器：维护节点、连接和输出，展示诊断并提交材质配置。 -->
<template>
  <section class="material-graph-editor">
    <header>
      <div><strong>{{ t('visualMaterialGraph') }}</strong><small>{{ t('visualMaterialGraphHint') }}</small></div>
      <label>{{ t('target') }}<select :value="document.target" @change="setTarget"><option>Sprite</option><option>UI</option><option>Light</option></select></label>
    </header>
    <div class="graph-workspace">
      <aside>
        <input :aria-label="t('searchNodes')" v-model.trim="search" :placeholder="t('searchNodes')">
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
          <label>X<NumericExpressionInput :model-value="Number(selectedNode.position.x)" @update:model-value="selectedNode.position.x = $event" :resource-key="resourceKey + ':node:' + selectedNode.uuid + ':selectedNode.position.x'" :step="10" @change="commit" /></label>
          <label>Y<NumericExpressionInput :model-value="Number(selectedNode.position.y)" @update:model-value="selectedNode.position.y = $event" :resource-key="resourceKey + ':node:' + selectedNode.uuid + ':selectedNode.position.y'" :step="10" @change="commit" /></label>
          <label v-if="hasAmount">{{ panelControlLabel('amount') }}<NumericExpressionInput :model-value="Number(selectedNode.values.amount)" @update:model-value="selectedNode.values.amount = $event" :resource-key="resourceKey + ':node:' + selectedNode.uuid + ':selectedNode.values.amount'" :minimum="0" :maximum="1" :step=".05" @change="commit" /></label>
          <label v-if="hasStrength">{{ t('strength') }}<NumericExpressionInput :model-value="Number(selectedNode.values.strength)" @update:model-value="selectedNode.values.strength = $event" :resource-key="resourceKey + ':node:' + selectedNode.uuid + ':selectedNode.values.strength'" :minimum="0" :maximum="32" :step=".05" @change="commit" /></label>
          <label v-if="selectedNode.kind === 'Number'">{{ t('value') }}<NumericExpressionInput :model-value="Number(selectedNode.values.value)" @update:model-value="selectedNode.values.value = $event" :resource-key="resourceKey + ':node:' + selectedNode.uuid + ':selectedNode.values.value'" :step=".05" @change="commit" /></label>
          <label v-if="selectedNode.kind === 'Color' || selectedNode.kind === 'Outline'">{{ t('color') }}<input type="color" :value="nodeColor('color')" @input="setNodeColor('color',$event)"></label>
          <label v-if="selectedNode.kind === 'Gradient'">{{ t('startColor') }}<input type="color" :value="nodeColor('colorA')" @input="setNodeColor('colorA',$event)"></label>
          <label v-if="selectedNode.kind === 'Gradient'">{{ t('endColor') }}<input type="color" :value="nodeColor('colorB')" @input="setNodeColor('colorB',$event)"></label>
          <label v-if="selectedNode.kind === 'Palette'">{{ t('paletteSteps') }}<NumericExpressionInput :model-value="Number(selectedNode.values.steps)" @update:model-value="selectedNode.values.steps = $event" :resource-key="resourceKey + ':node:' + selectedNode.uuid + ':selectedNode.values.steps'" :minimum="2" :maximum="64" :step="1" @change="commit" /></label>
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
<!-- 诊断严重程度回调检测错误；消息映射回调提取各诊断文本供页脚显示。 -->    <footer><span :class="diagnostics.some(item => item.severity === 'error') ? 'error' : 'good'">{{ diagnostics.length ? diagnostics.map(item => item.message).join(' · ') : t('graphReady') }}</span><button @click="resetGraph">{{ t('resetGraph') }}</button></footer>
  </section>
</template>

<script setup lang="ts">
import NumericExpressionInput from './NumericExpressionInput.vue'
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
.material-graph-editor{height:100%;min-height:360px;display:flex;flex-direction:column;border:1px solid var(--border-subtle);border-radius:10px;overflow:hidden;background:var(--surface-2)}header,footer{min-height:42px;padding:6px 9px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid var(--border-subtle)}header>div{display:grid}header small{color:var(--text-muted);font-size:11px}.graph-workspace{min-height:0;display:grid;grid-template-columns:minmax(150px,190px) minmax(460px,1fr) minmax(190px,240px);flex:1}.graph-workspace>aside{min-width:0;padding:7px;display:flex;flex-direction:column;gap:5px;overflow:auto;border-right:1px solid var(--border-subtle)}aside>button{min-height:30px;text-align:left}.graph-canvas{position:relative;min-width:0;overflow:auto;background-color:#11161e;background-image:radial-gradient(circle,#344054 1px,transparent 1px);background-size:18px 18px}.graph-canvas svg{position:absolute;inset:0;min-width:100%;min-height:100%;pointer-events:none}.graph-canvas path{fill:none;stroke:#67a7ff;stroke-width:2}.graph-node{position:absolute;width:150px;height:66px;padding:7px;display:grid;text-align:left;border:1px solid #50617a;border-radius:8px;color:#d8e5f7;background:#202a38;box-shadow:0 8px 20px #0005}.graph-node.selected{border-color:#74b0ff;box-shadow:0 0 0 2px #4090ff44,0 8px 20px #0006}.graph-node.output{background:#263b35}.graph-node small{overflow:hidden;color:#91a3bb;text-overflow:ellipsis}.details{border-right:0!important;border-left:1px solid var(--border-subtle)}.details label{display:grid;gap:3px;color:var(--text-muted);font-size:11px}.details dl{display:grid;gap:4px}.details dl div{display:flex;justify-content:space-between}.details dd{margin:0;color:var(--accent)}.details p{font-size:11px;line-height:1.4}.generated-source{max-height:130px;padding:5px 9px;overflow:auto;border-top:1px solid var(--border-subtle)}.generated-source pre{font:11px/1.45 var(--font-mono);white-space:pre-wrap}.warning,.error{color:var(--warning)}.good{color:var(--success)}footer{border-top:1px solid var(--border-subtle);border-bottom:0}footer span{min-width:0;overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}@container nova-material (max-width:1100px){.graph-workspace{grid-template-columns:150px minmax(430px,1fr)}.details{grid-column:1/-1;max-height:180px;border-top:1px solid var(--border-subtle);border-left:0!important}}@container nova-material (max-width:760px){.graph-workspace{grid-template-columns:1fr}.graph-workspace>aside{max-height:120px;border-right:0;border-bottom:1px solid var(--border-subtle)}.graph-canvas{min-height:420px}.details{max-height:220px}}
.graph-workspace>aside>button{white-space:normal;overflow-wrap:anywhere}
/* 26.13: graph canvases keep their own scroll range while surrounding panes reflow. */
.material-graph-editor{container:nova-material/inline-size;min-width:0}.material-graph-editor>header,.material-graph-editor>footer{flex-wrap:wrap;flex-shrink:0}.material-graph-editor>header>*{min-width:0;max-width:100%}.graph-workspace{overflow:auto}.graph-workspace input,.graph-workspace select{min-width:0;max-width:100%}.graph-node strong{white-space:normal;overflow-wrap:anywhere}.details :is(p,dt,dd){overflow-wrap:anywhere}.details dl div{flex-wrap:wrap;gap:5px}footer span{white-space:normal;overflow:visible;overflow-wrap:anywhere}
@container nova-material (max-width:1100px){.graph-workspace{grid-template-columns:minmax(130px,170px) minmax(0,1fr);grid-template-rows:minmax(320px,1fr) auto}.details{grid-column:1/-1;max-height:260px}}
@container nova-material (max-width:680px){.graph-workspace{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(320px,1fr) auto}.graph-workspace>aside{max-height:180px}.graph-canvas{min-height:320px}.details{grid-column:auto;max-height:260px}}
</style>
