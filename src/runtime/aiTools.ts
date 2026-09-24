/** 游戏 AI 工具：管理行为树、状态机及相关运行数据和编辑验证。 */
import { reactive } from 'vue'
import { readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { Entity } from '../world/Entity'
import type { BehaviorTree2D, NavigationAgent2D, StateMachine2D } from '../world/components'
import { worldTransform } from '../world/hierarchy'
import { recordScriptFunction } from './profiler'
import { recordGraphError, recordGraphTrace } from '../visual/graphDebugger'
import { SpatialHash2D } from './largeWorldPerformance'

export type BlackboardValue = boolean | number | string
export type BehaviorNodeType = 'Sequence' | 'Selector' | 'UtilitySelector' | 'Condition' | 'BlackboardCondition' | 'SetBlackboard' | 'Perception' | 'Action' | 'Wait'
export type BehaviorNode = {
  id: string; type: BehaviorNodeType; name: string; children: string[]; condition: string; action: string; seconds: number
  key?: string; value?: BlackboardValue; operator?: 'equals' | 'notEquals' | 'greater' | 'less' | 'truthy'; scoreKey?: string; weight?: number; bias?: number
}
export interface BehaviorPerceptionSensor { id: string; tags: string[]; radius: number; fieldOfView: number; maximumResults: number; blackboardKey: string }
export interface BehaviorTreeDocument { version: 1 | 2; root: string; nodes: BehaviorNode[]; blackboard?: Record<string, BlackboardValue>; perception?: BehaviorPerceptionSensor[] }
export interface StateMachineDocument {
  version: 1 | 2
  initialState: string
  states: Array<{ id: string; parent: string; onEnter: string; onUpdate?: string; onExit: string }>
  transitions: Array<{ from: string; to: string; signal: string; priority?: number }>
}

export const MAX_AI_AGENTS = 10_000
export const MAX_AI_TICKS_PER_FRAME = 2_048
export const MAX_PERCEPTION_RESULTS = 32
const elapsed = new Map<string, Map<string, number>>(), signals = new Map<string, number>(), blackboards = new Map<string, Record<string, BlackboardValue>>()
const behaviorInputs = new Map<string, { tree: BehaviorTreeDocument; overrides: string }>()
const MAX_NODE_EVALUATIONS_PER_TICK = 4096, MAX_NODE_EVALUATIONS_PER_FRAME = 65_536
const tickElapsed = new Map<string, number>(), enteredMachines = new Map<string, string>()
const behaviorDocuments = new Map<string, { source: string; name: string; tree: BehaviorTreeDocument; nodes: Map<string, BehaviorNode> }>()
const stateDocuments = new Map<string, { source: string; name: string; machine: StateMachineDocument; states: Map<string, StateMachineDocument['states'][number]> }>()
let tickCursor = 0, signalSequence = 0
const signalCursors = new Map<string, number>()
const hasAiSignal = /* 比较 (signals.get(name) ?? 0) 与 (signalCursors.get(uuid) ?? 0)，返回大于的判断结果。 */ (uuid: string, name: string): boolean => (signals.get(name) ?? 0) > (signalCursors.get(uuid) ?? 0)
export const aiDebugState = reactive({
  activeAgents: 0, tickedAgents: 0, deferredAgents: 0, droppedAgents: 0, nodeEvaluations: 0, perceptionQueries: 0, maximumPerceptionResults: 0,
  perceptionCandidates: 0, recordedTraces: 0, skippedTraces: 0,
  agents: [] as Array<{ entityUuid: string; entityName: string; tree: string; activeNode: string; result: boolean; blackboard: Record<string, BlackboardValue>; perceived: number; utility: Record<string, number> }>,
  machines: [] as Array<{ entityUuid: string; entityName: string; machine: string; activeState: string; lineage: string[]; transition: string }>
})

export let emitAiSignal: (name: string, entity: Entity) => void = /* 返回 undefined 的当前值。 */ () => undefined
/** 将 emitter 赋给 emitAiSignal，不显式返回值。 */ export function setAiSignalEmitter(emitter: typeof emitAiSignal): void { emitAiSignal = emitter }
/** 结构说明（自动提取）：notifyAiSignal；输入 name；直接调用 slice、name.trim、signals.has、Error、signals.set；包含显式抛错路径。 */ export function notifyAiSignal(name: string): void { const normalized = name.trim().slice(0, 128); if (normalized) { if (!signals.has(normalized) && signals.size >= 1024) throw new Error('AI_SIGNAL_LIMIT: at most 1024 distinct pending broadcasts are supported.'); signals.set(normalized, ++signalSequence) } }
/* 调用 Math.max(1, Math.min(1_000_000, Number.isFinite(maximumRadius) ? maximumRadius : 0) / 32) 并返回调用结果。 */ export function perceptionSpatialCellSize(maximumRadius: number): number { return Math.max(1, Math.min(1_000_000, Number.isFinite(maximumRadius) ? maximumRadius : 0) / 32) }

/** 结构说明（自动提取）：scalar；输入 value、fallback；直接调用 Number.isFinite、value.slice；返回路径包含 value、fallback。 */ function scalar(value: unknown, fallback: BlackboardValue = false): BlackboardValue {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') return value.slice(0, 256)
  return fallback
}

/** 结构说明（自动提取）：normalizeBehaviorTree；输入 value；直接调用 includes、Array.isArray、source.nodes.some、source.perception.some、map 等。 */ export function normalizeBehaviorTree(value: unknown): BehaviorTreeDocument | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Partial<BehaviorTreeDocument>
  if (!source.version || ![1, 2].includes(source.version) || typeof source.root !== 'string' || !source.root || !Array.isArray(source.nodes) || source.nodes.length > 10_000) return null
  if (source.nodes.some(/* 先计算 !node；仅当其为假值时求右侧 typeof node !== 'object'，返回短路求值结果。 */ node => !node || typeof node !== 'object') || source.blackboard !== undefined && (!source.blackboard || typeof source.blackboard !== 'object' || Array.isArray(source.blackboard)) || source.perception !== undefined && !Array.isArray(source.perception) || source.perception?.some(/* 先计算 !sensor；仅当其为假值时求右侧 typeof sensor !== 'object'，返回短路求值结果。 */ sensor => !sensor || typeof sensor !== 'object')) return null
  const supported: BehaviorNodeType[] = ['Sequence', 'Selector', 'UtilitySelector', 'Condition', 'BlackboardCondition', 'SetBlackboard', 'Perception', 'Action', 'Wait']
  const nodes = source.nodes.slice(0, 10_000).map(/** 结构说明（自动提取）：map 回调；输入 node、index；直接调用 node.id.slice、supported.includes、node.name.slice、slice、filter 等；返回表达式求值结果。 */ (node, index) => ({
    id: typeof node.id === 'string' && node.id ? node.id.slice(0, 128) : `node-${index}`,
    type: supported.includes(node.type) ? node.type : 'Action' as BehaviorNodeType,
    name: typeof node.name === 'string' ? node.name.slice(0, 128) : `Node ${index + 1}`,
    children: (Array.isArray(node.children) ? node.children : []).filter(/* 比较 typeof child 与 'string'，返回严格相等的判断结果。 */ child => typeof child === 'string').slice(0, 256),
    condition: typeof node.condition === 'string' ? node.condition.slice(0, 128) : '', action: typeof node.action === 'string' ? node.action.slice(0, 128) : '',
    seconds: Math.min(86_400, Math.max(0, Number.isFinite(node.seconds) ? node.seconds : 0)), key: typeof node.key === 'string' ? node.key.slice(0, 80) : undefined,
    value: scalar(node.value), operator: ['equals', 'notEquals', 'greater', 'less', 'truthy'].includes(node.operator ?? '') ? node.operator : 'truthy' as const,
    scoreKey: typeof node.scoreKey === 'string' ? node.scoreKey.slice(0, 80) : undefined,
    weight: Number.isFinite(node.weight) ? Math.max(-1e6, Math.min(1e6, node.weight!)) : 1, bias: Number.isFinite(node.bias) ? Math.max(-1e6, Math.min(1e6, node.bias!)) : 0
  }))
  const ids = new Set(nodes.map(/* 返回 node.id 的当前值。 */ node => node.id)), root = source.root.slice(0, 128)
  if (ids.size !== nodes.length || !ids.has(root) || nodes.some(/** 结构说明（自动提取）：nodes.some 回调；输入 node；直接调用 node.children.some；返回表达式求值结果。 */ node => node.children.some(/* 返回 ids.has(child) 的逻辑取反结果。 */ child => !ids.has(child)))) return null
  const nodesById = new Map(nodes.map(/* 返回按声明顺序构造的数组 [node.id, node]。 */ node => [node.id, node]))
  const visiting = new Set<string>(), visited = new Set<string>()
  const acyclic = /** 结构说明（自动提取）：acyclic；输入 id、depth；直接调用 visiting.has、visited.has、visiting.add、every、nodesById.get 等；返回路径包含 valid。 */ (id: string, depth = 0): boolean => {
    if (depth > 32 || visiting.has(id)) return false
    if (visited.has(id)) return true
    visiting.add(id)
    const valid = (nodesById.get(id)?.children ?? []).every(/* 调用 acyclic(child, depth + 1) 并返回调用结果。 */ child => acyclic(child, depth + 1))
    visiting.delete(id); if (valid) visited.add(id)
    return valid
  }
  // Validate every component, not only nodes reachable from the declared root.
  // Otherwise a disconnected hostile cycle could be accepted and later become
  // reachable after an editor operation.
  if (!nodes.every(/* 调用 acyclic(node.id) 并返回调用结果。 */ node => acyclic(node.id))) return null
  const blackboard = Object.fromEntries(Object.entries(source.blackboard ?? {}).slice(0, 256).map(/* 返回按声明顺序构造的数组 [key.slice(0, 80), scalar(entry)]。 */ ([key, entry]) => [key.slice(0, 80), scalar(entry)]))
  const perception = (Array.isArray(source.perception) ? source.perception : []).slice(0, 64).map(/** 结构说明（自动提取）：map 回调；输入 sensor、index；直接调用 sensor.id.slice、map、slice、filter、Array.isArray 等；返回表达式求值结果。 */ (sensor, index) => ({
    id: typeof sensor.id === 'string' ? sensor.id.slice(0, 80) : `sensor-${index}`,
    tags: (Array.isArray(sensor.tags) ? sensor.tags : []).filter(/* 比较 typeof tag 与 'string'，返回严格相等的判断结果。 */ tag => typeof tag === 'string').slice(0, 32).map(/* 调用 tag.slice(0, 80) 并返回调用结果。 */ tag => tag.slice(0, 80)),
    radius: Math.min(1e6, Math.max(0, Number.isFinite(sensor.radius) ? sensor.radius : 10)), fieldOfView: Math.min(360, Math.max(0, Number.isFinite(sensor.fieldOfView) ? sensor.fieldOfView : 360)),
    maximumResults: Math.min(MAX_PERCEPTION_RESULTS, Math.max(1, Math.round(Number.isFinite(sensor.maximumResults) ? sensor.maximumResults : 8))),
    blackboardKey: typeof sensor.blackboardKey === 'string' ? sensor.blackboardKey.slice(0, 80) : `perception.${index}`
  }))
  return { version: source.version, root, nodes, blackboard, perception }
}

/** 结构说明（自动提取）：normalizeStateMachine；输入 value；直接调用 includes、Array.isArray、source.states.some、source.transitions.some、source.states.map 等；写入 baseDepth、current；包含循环处理。 */ export function normalizeStateMachine(value: unknown): StateMachineDocument | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Partial<StateMachineDocument>
  if (!source.version || ![1, 2].includes(source.version) || typeof source.initialState !== 'string' || !source.initialState || !Array.isArray(source.states) || !Array.isArray(source.transitions) || source.states.length > 10_000 || source.transitions.length > 100_000) return null
  if (source.states.some(/* 先计算 !state；仅当其为假值时求右侧 typeof state !== 'object'，返回短路求值结果。 */ state => !state || typeof state !== 'object') || source.transitions.some(/* 先计算 !transition；仅当其为假值时求右侧 typeof transition !== 'object'，返回短路求值结果。 */ transition => !transition || typeof transition !== 'object')) return null
  const states = source.states.map(/** 结构说明（自动提取）：source.states.map 回调；输入 state、index；直接调用 state.id.slice、state.parent.slice、state.onEnter.slice、state.onUpdate.slice、state.onExit.slice；返回表达式求值结果。 */ (state, index) => ({
    id: typeof state.id === 'string' && state.id ? state.id.slice(0, 128) : `state-${index}`,
    parent: typeof state.parent === 'string' ? state.parent.slice(0, 128) : '',
    onEnter: typeof state.onEnter === 'string' ? state.onEnter.slice(0, 128) : '',
    onUpdate: typeof state.onUpdate === 'string' ? state.onUpdate.slice(0, 128) : '',
    onExit: typeof state.onExit === 'string' ? state.onExit.slice(0, 128) : ''
  }))
  const ids = new Set(states.map(/* 返回 state.id 的当前值。 */ state => state.id))
  const initialState = source.initialState.slice(0, 128), statesById = new Map(states.map(/* 返回按声明顺序构造的数组 [state.id, state]。 */ state => [state.id, state]))
  if (ids.size !== states.length || !ids.has(initialState) || states.some(/* 先计算 state.parent；仅当其为真值时求右侧 (!ids.has(state.parent) || state.parent === state.id)，返回短路求值结果。 */ state => state.parent && (!ids.has(state.parent) || state.parent === state.id))) return null
  // Iterative memoized parent traversal stays O(states), cannot overflow the JS
  // call stack on a hostile 10k-state chain, and matches the runtime's 32-level
  // lineage contract.
  const resolvedDepth = new Map<string, number>()
  for (const state of states) {
    if (resolvedDepth.has(state.id)) continue
    const path: string[] = [], inPath = new Set<string>(); let current = state.id, baseDepth = 0
    while (current) {
      const cached = resolvedDepth.get(current)
      if (cached !== undefined) { baseDepth = cached; break }
      if (inPath.has(current)) return null
      path.push(current); inPath.add(current)
      if (path.length + baseDepth > 32) return null
      current = statesById.get(current)?.parent ?? ''
    }
    for (let index = path.length - 1; index >= 0; index--) {
      baseDepth++
      if (baseDepth > 32) return null
      resolvedDepth.set(path[index], baseDepth)
    }
  }
  const transitions = source.transitions.map(/** 结构说明（自动提取）：source.transitions.map 回调；输入 transition；直接调用 transition.from.slice、transition.to.slice、transition.signal.slice、Number.isFinite、Math.max 等；返回表达式求值结果。 */ transition => ({
    from: typeof transition.from === 'string' ? transition.from.slice(0, 128) : '',
    to: typeof transition.to === 'string' ? transition.to.slice(0, 128) : '',
    signal: typeof transition.signal === 'string' ? transition.signal.slice(0, 128) : '',
    priority: Number.isFinite(transition.priority) ? Math.max(-1_000_000, Math.min(1_000_000, transition.priority!)) : 0
  }))
  if (transitions.some(/* 先计算 (transition.from !== '*' && !ids.has(transition.from)) || !ids.has(transition.to)；仅当其为假值时求右侧 !transition.signal，返回短路求值结果。 */ transition => (transition.from !== '*' && !ids.has(transition.from)) || !ids.has(transition.to) || !transition.signal)) return null
  return { version: source.version, initialState, states, transitions }
}

/** 结构说明（自动提取）：behaviorDocument；输入 reference；直接调用 resolveAsset、readTextAsset、behaviorDocuments.get、normalizeBehaviorTree、JSON.parse 等。 */ function behaviorDocument(reference: string | null): { uuid: string; name: string; tree: BehaviorTreeDocument; nodes: Map<string, BehaviorNode> } | null {
  const asset = resolveAsset(reference), source = readTextAsset(reference)
  if (!asset || asset.assetType !== 'behaviorTree' || !source) return null
  const cached = behaviorDocuments.get(asset.uuid)
  if (cached?.source === source) return { uuid: asset.uuid, name: cached.name, tree: cached.tree, nodes: cached.nodes }
  try {
    const tree = normalizeBehaviorTree(JSON.parse(source))
    if (!tree) { recordGraphError(asset.uuid, 'document', 'Unsupported or invalid behavior-tree document'); return null }
    const entry = { source, name: asset.name, tree, nodes: new Map(tree.nodes.map(/* 返回按声明顺序构造的数组 [node.id, node]。 */ node => [node.id, node])) }
    behaviorDocuments.set(asset.uuid, entry)
    return { uuid: asset.uuid, name: entry.name, tree: entry.tree, nodes: entry.nodes }
  } catch { recordGraphError(asset.uuid, 'document', 'Invalid behaviorTree JSON'); return null }
}

/** 结构说明（自动提取）：stateDocument；输入 reference；直接调用 resolveAsset、readTextAsset、stateDocuments.get、normalizeStateMachine、JSON.parse 等。 */ function stateDocument(reference: string | null): { uuid: string; name: string; machine: StateMachineDocument; states: Map<string, StateMachineDocument['states'][number]> } | null {
  const asset = resolveAsset(reference), source = readTextAsset(reference)
  if (!asset || asset.assetType !== 'stateMachine' || !source) return null
  const cached = stateDocuments.get(asset.uuid)
  if (cached?.source === source) return { uuid: asset.uuid, name: cached.name, machine: cached.machine, states: cached.states }
  try {
    const machine = normalizeStateMachine(JSON.parse(source))
    if (!machine) { recordGraphError(asset.uuid, 'document', 'Unsupported, cyclic or invalid state-machine document'); return null }
    const entry = { source, name: asset.name, machine, states: new Map(machine.states.map(/* 返回按声明顺序构造的数组 [state.id, state]。 */ state => [state.id, state])) }
    stateDocuments.set(asset.uuid, entry)
    return { uuid: asset.uuid, name: entry.name, machine: entry.machine, states: entry.states }
  } catch { recordGraphError(asset.uuid, 'document', 'Invalid stateMachine JSON'); return null }
}

/** 结构说明（自动提取）：compareBlackboard；输入 actual、operator、expected；直接调用 Boolean、Number、Number.isFinite。 */ function compareBlackboard(actual: BlackboardValue | undefined, operator: BehaviorNode['operator'], expected: BlackboardValue): boolean {
  if (operator === 'truthy') return Boolean(actual)
  if (operator === 'equals') return actual === expected
  if (operator === 'notEquals') return actual !== expected
  const left = typeof actual === 'number' ? actual : Number(actual), right = typeof expected === 'number' ? expected : Number(expected)
  return Number.isFinite(left) && Number.isFinite(right) && (operator === 'greater' ? left > right : left < right)
}

interface PerceptionIndex { spatial: SpatialHash2D; entities: Map<string, Entity>; positions: Map<string, ReturnType<typeof worldTransform>> }

/** 结构说明（自动提取）：runPerception；输入 entity、tree、board、entities、index；直接调用 index.positions.get、worldTransform、Math.cos、Math.sin、flatMap 等；写入 aiDebugState.perceptionCandidates、total、board[…]、aiDebugState.maximumPerceptionResults；返回路径包含 total；包含循环处理。 */ function runPerception(entity: Entity, tree: BehaviorTreeDocument, board: Record<string, BlackboardValue>, entities: Entity[], index: PerceptionIndex): number {
  const origin = index.positions.get(entity.uuid) ?? worldTransform(entity, entities), forward = { x: Math.cos(origin.rotation), y: Math.sin(origin.rotation) }
  let total = 0
  for (const sensor of tree.perception ?? []) {
    aiDebugState.perceptionQueries++
    const candidates = index.spatial.query({ minX: origin.position.x - sensor.radius, minY: origin.position.y - sensor.radius, maxX: origin.position.x + sensor.radius, maxY: origin.position.y + sensor.radius }).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 uuid；直接调用 index.entities.get。 */ uuid => { const candidate = index.entities.get(uuid); return candidate ? [candidate] : [] })
    aiDebugState.perceptionCandidates += candidates.length
    const matches = candidates.flatMap(/** 结构说明（自动提取）：candidates.flatMap 回调；输入 candidate；直接调用 sensor.tags.some、index.positions.get、worldTransform、Math.hypot、Math.max 等。 */ candidate => {
      if (candidate === entity || !candidate.enabled || sensor.tags.length && !sensor.tags.some(/* 调用 candidate.tags.includes(tag) 并返回调用结果。 */ tag => candidate.tags.includes(tag))) return []
      const point = index.positions.get(candidate.uuid)?.position ?? worldTransform(candidate, entities).position, dx = point.x - origin.position.x, dy = point.y - origin.position.y, distance = Math.hypot(dx, dy)
      if (distance > sensor.radius) return []
      if (sensor.fieldOfView < 360 && distance > 1e-9) { const dot = Math.max(-1, Math.min(1, (dx * forward.x + dy * forward.y) / distance)); if (Math.acos(dot) * 180 / Math.PI > sensor.fieldOfView * .5) return [] }
      return [{ candidate, distance }]
    }).sort(/* 先计算 a.distance - b.distance；仅当其为假值时求右侧 a.candidate.uuid.localeCompare(b.candidate.uuid)，返回短路求值结果。 */ (a, b) => a.distance - b.distance || a.candidate.uuid.localeCompare(b.candidate.uuid)).slice(0, sensor.maximumResults)
    total += matches.length; board[`${sensor.blackboardKey}.count`] = matches.length; board[`${sensor.blackboardKey}.uuid`] = matches[0]?.candidate.uuid ?? ''; board[`${sensor.blackboardKey}.distance`] = matches[0]?.distance ?? -1
    aiDebugState.maximumPerceptionResults = Math.max(aiDebugState.maximumPerceptionResults, matches.length)
  }
  return total
}

/** 结构说明（自动提取）：recordAiTrace；输入 command；直接调用 recordGraphTrace。 */ function recordAiTrace(command: Parameters<typeof recordGraphTrace>[0]): void {
  if (aiDebugState.recordedTraces < 256) { aiDebugState.recordedTraces++; recordGraphTrace(command) } else aiDebugState.skippedTraces++
}
interface TickDebug { remaining: number; exhausted: boolean; activeNode: string; utility: Record<string, number> }
/** 结构说明（自动提取）：tickNode；输入 entity、graphUuid、nodes、id、board、dt、debug、depth、visiting；直接调用 visiting.has、recordGraphError、nodes.get、performance.now、visiting.add 等；写入 debug.exhausted、debug.activeNode、result、edgeUuid 等；返回路径包含 result；包含循环处理。 */ function tickNode(entity: Entity, graphUuid: string, nodes: ReadonlyMap<string, BehaviorNode>, id: string, board: Record<string, BlackboardValue>, dt: number, debug: TickDebug, depth = 0, visiting = new Set<string>()): boolean {
  if (depth > 32 || visiting.has(id)) { recordGraphError(graphUuid, id || 'root', 'Behavior tree contains a cycle or exceeds 32 levels'); return false }
  if (debug.remaining-- <= 0 || aiDebugState.nodeEvaluations >= MAX_NODE_EVALUATIONS_PER_FRAME) { if (!debug.exhausted) recordGraphError(graphUuid, id, 'AI_NODE_BUDGET: tree evaluation exceeded its bounded tick/frame budget.'); debug.exhausted = true; return false }
  const node = nodes.get(id); if (!node) { recordGraphError(graphUuid, id || 'root', 'Behavior tree node is missing'); return false }
  const started = performance.now(); debug.activeNode = node.id; aiDebugState.nodeEvaluations++; visiting.add(id)
  let result = false, edgeUuid = ''
  if (node.type === 'Sequence') { result = true; for (const child of node.children) { edgeUuid = `${node.id}->${child}`; if (!tickNode(entity, graphUuid, nodes, child, board, dt, debug, depth + 1, new Set(visiting))) { result = false; break } } }
  else if (node.type === 'Selector') { for (const child of node.children) { edgeUuid = `${node.id}->${child}`; if (tickNode(entity, graphUuid, nodes, child, board, dt, debug, depth + 1, new Set(visiting))) { result = true; break } if (debug.exhausted) break } }
  else if (node.type === 'UtilitySelector') {
    const candidates = node.children.flatMap(/** 结构说明（自动提取）：node.children.flatMap 回调；输入 child、index；直接调用 nodes.get、Number、Number.isFinite；写入 debug.utility[…]。 */ (child, index) => { const target = nodes.get(child); if (!target) return []; const raw = target.scoreKey ? Number(board[target.scoreKey]) : 0; const score = (Number.isFinite(raw) ? raw : 0) * (target.weight ?? 1) + (target.bias ?? 0); debug.utility[child] = score; return [{ child, score, index }] }).sort(/* 先计算 b.score - a.score；仅当其为假值时求右侧 a.index - b.index，返回短路求值结果。 */ (a, b) => b.score - a.score || a.index - b.index)
    if (candidates[0]) { edgeUuid = `${node.id}->${candidates[0].child}`; result = tickNode(entity, graphUuid, nodes, candidates[0].child, board, dt, debug, depth + 1, new Set(visiting)) }
  } else if (node.type === 'Condition') result = node.condition === 'has_navigation_target' ? Boolean(entity.getComponent<NavigationAgent2D>('NavigationAgent2D')) : hasAiSignal(entity.uuid, node.condition)
  else if (node.type === 'BlackboardCondition') result = compareBlackboard(board[node.key ?? ''], node.operator, node.value ?? false)
  else if (node.type === 'SetBlackboard') { if (node.key) board[node.key] = scalar(node.value); result = Boolean(node.key) }
  else if (node.type === 'Perception') result = Number(board[`${node.key ?? node.condition}.count`] ?? 0) > 0
  else if (node.type === 'Action') { if (node.action || node.name) emitAiSignal(node.action || node.name, entity); result = true }
  else { const timers = elapsed.get(entity.uuid) ?? new Map<string, number>(); elapsed.set(entity.uuid, timers); const value = (timers.get(node.id) ?? 0) + dt; if (value >= node.seconds) { timers.delete(node.id); result = true } else timers.set(node.id, value) }
  recordAiTrace({ type: 'graphTrace', graphUuid, scopeUuid: entity.uuid, nodeUuid: node.id, edgeUuid, depth, durationMicros: (performance.now() - started) * 1_000, values: { entity: entity.uuid, node: node.name, result, state: 'behaviorTree' } })
  return result
}

/** 结构说明（自动提取）：tickBehavior；输入 entity、behavior、entities、dt、index；直接调用 behaviorDocument、performance.now、JSON.stringify、behaviorInputs.get、retireAiEntity 等；写入 behavior.currentNode。 */ function tickBehavior(entity: Entity, behavior: BehaviorTree2D, entities: Entity[], dt: number, index: PerceptionIndex | null): void {
  const source = behaviorDocument(behavior.treeAsset); if (!source) return
  const started = performance.now(), tree = source.tree
  const overrides = JSON.stringify(behavior.blackboardOverrides), previous = behaviorInputs.get(entity.uuid)
  if (previous && (previous.tree !== tree || previous.overrides !== overrides)) retireAiEntity(entity.uuid)
  if (!behaviorInputs.has(entity.uuid)) { const initial = { ...(tree.blackboard ?? {}), ...(blackboards.get(entity.uuid) ?? {}), ...behavior.blackboardOverrides }; blackboards.set(entity.uuid, initial); behaviorInputs.set(entity.uuid, { tree, overrides }) }
  const board = blackboards.get(entity.uuid)!
  const perceived = index && tree.perception?.length ? runPerception(entity, tree, board, entities, index) : 0, debug: TickDebug = { remaining: MAX_NODE_EVALUATIONS_PER_TICK, exhausted: false, activeNode: tree.root, utility: {} }, result = tickNode(entity, source.uuid, source.nodes, tree.root, board, Math.min(.25, Math.max(0, dt)), debug)
  behavior.currentNode = debug.activeNode
  if (aiDebugState.agents.length < 512) aiDebugState.agents.push({ entityUuid: entity.uuid, entityName: entity.name, tree: source.name, activeNode: debug.activeNode, result, blackboard: { ...board }, perceived, utility: debug.utility })
  recordScriptFunction(source.uuid, source.name, 'BehaviorTree.tick', performance.now() - started, 0)
}

/** 结构说明（自动提取）：stateLineage；输入 states、leaf；直接调用 result.push、states.get；写入 current；返回路径包含 result；包含循环处理。 */ function stateLineage(states: ReadonlyMap<string, StateMachineDocument['states'][number]>, leaf: string): string[] {
  const result: string[] = []; let current: string | undefined = leaf
  while (current && result.length <= 32) { result.push(current); current = states.get(current)?.parent || undefined }
  return result
}

/** 结构说明（自动提取）：tickMachine；输入 entity、machine；直接调用 stateDocument、performance.now、states.has、stateLineage、enteredMachines.get 等；写入 machine.currentState、lineage；包含循环处理。 */ function tickMachine(entity: Entity, machine: StateMachine2D): void {
  const source = stateDocument(machine.machineAsset); if (!source) return
  const started = performance.now(), value = source.machine, states = source.states
  {
    if (!states.has(machine.currentState)) machine.currentState = value.initialState
    let lineage = stateLineage(states, machine.currentState)
    const entryKey = `${source.uuid}:${machine.currentState}`
    if (enteredMachines.get(entity.uuid) !== entryKey) {
      for (const stateId of [...lineage].reverse()) { const state = states.get(stateId); if (state?.onEnter) emitAiSignal(state.onEnter, entity) }
      enteredMachines.set(entity.uuid, entryKey)
    }
    for (const stateId of [...lineage].reverse()) { const state = states.get(stateId); if (state?.onUpdate) emitAiSignal(state.onUpdate, entity) }
    const transition = value.transitions.map(/** 构造并返回记录 { candidate, index, depth: candidate.from === '*' ? Number.MAX_SAFE_INTEGER : lineage.indexOf(candidate.from) }，字段按当前实参及捕获状态求值。 */ (candidate, index) => ({ candidate, index, depth: candidate.from === '*' ? Number.MAX_SAFE_INTEGER : lineage.indexOf(candidate.from) })).filter(/* 先计算 item.depth >= 0；仅当其为真值时求右侧 hasAiSignal(entity.uuid, item.candidate.signal)，返回短路求值结果。 */ item => item.depth >= 0 && hasAiSignal(entity.uuid, item.candidate.signal)).sort(/* 先计算 (b.candidate.priority ?? 0) - (a.candidate.priority ?? 0) || a.depth - b.depth；仅当其为假值时求右侧 a.index - b.index，返回短路求值结果。 */ (a, b) => (b.candidate.priority ?? 0) - (a.candidate.priority ?? 0) || a.depth - b.depth || a.index - b.index)[0]?.candidate
    if (transition) {
      const next = states.get(transition.to)
      if (!next) recordGraphError(source.uuid, transition.to, 'Transition target state is missing')
      else {
        const targetLineage = stateLineage(states, next.id), common = lineage.find(/* 调用 targetLineage.includes(state) 并返回调用结果。 */ state => targetLineage.includes(state)) ?? ''
        for (const stateId of lineage) { if (stateId === common) break; const state = states.get(stateId); if (state?.onExit) emitAiSignal(state.onExit, entity) }
        for (const stateId of targetLineage.slice(0, common ? targetLineage.indexOf(common) : targetLineage.length).reverse()) { const state = states.get(stateId); if (state?.onEnter) emitAiSignal(state.onEnter, entity) }
        machine.currentState = transition.to
        lineage = targetLineage
        enteredMachines.set(entity.uuid, `${source.uuid}:${machine.currentState}`)
      }
    }
    const activeLineage = transition ? lineage : stateLineage(states, machine.currentState)
    if (aiDebugState.machines.length < 512) aiDebugState.machines.push({ entityUuid: entity.uuid, entityName: entity.name, machine: source.name, activeState: machine.currentState, lineage: activeLineage, transition: transition?.signal ?? '' })
    recordAiTrace({ type: 'graphTrace', graphUuid: source.uuid, scopeUuid: entity.uuid, nodeUuid: machine.currentState, edgeUuid: transition ? `${transition.from}->${transition.to}` : '', depth: 0, durationMicros: (performance.now() - started) * 1_000, values: { entity: entity.uuid, state: machine.currentState, transition: transition?.signal ?? '' } })
  }
  recordScriptFunction(source.uuid, source.name, 'StateMachine.tick', performance.now() - started, 0)
}

/** 结构说明（自动提取）：updateAi；输入 entities、dt、_frame；直接调用 Object.assign、sort、entities.filter、candidates.slice、Math.max 等；写入 aiDebugState.activeAgents、aiDebugState.droppedAgents、tickCursor、aiDebugState.deferredAgents 等；包含循环处理。 */ export function updateAi(entities: Entity[], dt: number, _frame: number): void {
  Object.assign(aiDebugState, { activeAgents: 0, tickedAgents: 0, deferredAgents: 0, droppedAgents: 0, nodeEvaluations: 0, perceptionQueries: 0, maximumPerceptionResults: 0, perceptionCandidates: 0, recordedTraces: 0, skippedTraces: 0, agents: [], machines: [] })
  const candidates = entities.filter(/** 结构说明（自动提取）：entities.filter 回调；输入 entity；直接调用 entity.getComponent；返回表达式求值结果。 */ entity => entity.enabled && (entity.getComponent<BehaviorTree2D>('BehaviorTree2D')?.enabled || entity.getComponent<StateMachine2D>('StateMachine2D')?.enabled)).sort(/* 调用 a.uuid.localeCompare(b.uuid) 并返回调用结果。 */ (a, b) => a.uuid.localeCompare(b.uuid)), bounded = candidates.slice(0, MAX_AI_AGENTS)
  aiDebugState.activeAgents = bounded.length; aiDebugState.droppedAgents = Math.max(0, candidates.length - bounded.length)
  const boundedIds = new Set(bounded.map(/* 返回 entity.uuid 的当前值。 */ entity => entity.uuid))
  for (const uuid of signalCursors.keys()) if (!boundedIds.has(uuid)) signalCursors.delete(uuid)
  for (const uuid of behaviorInputs.keys()) if (!boundedIds.has(uuid)) retireAiEntity(uuid)
  for (const key of tickElapsed.keys()) if (!boundedIds.has(key)) tickElapsed.delete(key)
  for (const key of blackboards.keys()) if (!boundedIds.has(key)) blackboards.delete(key)
  for (const key of enteredMachines.keys()) if (!boundedIds.has(key)) enteredMachines.delete(key)
  const due = bounded.filter(/** 结构说明（自动提取）：bounded.filter 回调；输入 entity；直接调用 entity.getComponent、tickElapsed.get、Math.max、tickElapsed.set。 */ entity => {
    const behavior = entity.getComponent<BehaviorTree2D>('BehaviorTree2D')
    if (!behavior?.enabled) return true
    const accumulated = (tickElapsed.get(entity.uuid) ?? 0) + Math.max(0, dt)
    tickElapsed.set(entity.uuid, accumulated)
    return accumulated + Number.EPSILON >= 1 / Math.max(1, behavior.tickRate)
  }), selected = new Set<string>()
  for (let index = 0; index < Math.min(MAX_AI_TICKS_PER_FRAME, due.length); index++) selected.add(due[(tickCursor + index) % due.length].uuid)
  if (due.length) tickCursor = (tickCursor + MAX_AI_TICKS_PER_FRAME) % due.length
  aiDebugState.deferredAgents = Math.max(0, due.length - selected.size)
  let maximumPerceptionRadius = 0, needsPerception = false
  for (const entity of bounded) {
    if (!selected.has(entity.uuid)) continue
    const sensors = behaviorDocument(entity.getComponent<BehaviorTree2D>('BehaviorTree2D')?.treeAsset ?? null)?.tree.perception ?? []
    needsPerception ||= sensors.length > 0
    for (const sensor of sensors) maximumPerceptionRadius = Math.max(maximumPerceptionRadius, sensor.radius)
  }
  let perceptionIndex: PerceptionIndex | null = null
  if (needsPerception) {
    // SpatialHash2D intentionally bounds cell enumeration. Size cells from the
    // largest active sensor so every valid query occupies at most ~65² cells;
    // even a 1,000,000-unit sensor therefore remains exact rather than silently
    // missing distant candidates.
    const spatial = new SpatialHash2D(perceptionSpatialCellSize(maximumPerceptionRadius)), byUuid = new Map<string, Entity>(), positions = new Map<string, ReturnType<typeof worldTransform>>()
    for (const entity of entities.filter(/* 返回 candidate.enabled 的当前值。 */ candidate => candidate.enabled).sort(/* 调用 a.uuid.localeCompare(b.uuid) 并返回调用结果。 */ (a, b) => a.uuid.localeCompare(b.uuid))) { const transform = worldTransform(entity, entities), position = transform.position; spatial.upsert({ id: entity.uuid, bounds: { minX: position.x, minY: position.y, maxX: position.x, maxY: position.y } }); byUuid.set(entity.uuid, entity); positions.set(entity.uuid, transform) }
    perceptionIndex = { spatial, entities: byUuid, positions }
  }
  for (const entity of bounded) {
    if (!selected.has(entity.uuid)) continue
    aiDebugState.tickedAgents++
    const consumedThrough = signalSequence
    const behavior = entity.getComponent<BehaviorTree2D>('BehaviorTree2D')
    if (behavior?.enabled) {
      const interval = 1 / Math.max(1, behavior.tickRate), accumulated = tickElapsed.get(entity.uuid) ?? dt
      tickBehavior(entity, behavior, entities, accumulated, perceptionIndex)
      tickElapsed.set(entity.uuid, accumulated % interval)
    }
    const machine = entity.getComponent<StateMachine2D>('StateMachine2D'); if (machine?.enabled) tickMachine(entity, machine)
    signalCursors.set(entity.uuid, consumedThrough)
  }
  let consumed = signalSequence
  for (const entity of bounded) consumed = Math.min(consumed, signalCursors.get(entity.uuid) ?? 0)
  for (const [name, sequence] of signals) if (sequence <= consumed) signals.delete(name)
}

/* 返回具有所列字段的新对象 { ...(blackboards.get(entityUuid) ?? {}) }。 */ export function blackboardSnapshot(entityUuid: string): Record<string, BlackboardValue> { return { ...(blackboards.get(entityUuid) ?? {}) } }
/** 结构说明（自动提取）：setBlackboardValue；输入 entityUuid、key、value；直接调用 slice、key.trim、blackboards.get、scalar、blackboards.set；写入 board[…]。 */ export function setBlackboardValue(entityUuid: string, key: string, value: BlackboardValue): void { const normalized = key.trim().slice(0, 80); if (!normalized) return; const board = blackboards.get(entityUuid) ?? {}; board[normalized] = scalar(value); blackboards.set(entityUuid, board) }
/** 结构说明（自动提取）：retireAiEntity；输入 uuid；直接调用 signalCursors.delete、elapsed.delete、blackboards.delete、behaviorInputs.delete、tickElapsed.delete 等。 */ export function retireAiEntity(uuid: string): void { signalCursors.delete(uuid); elapsed.delete(uuid); blackboards.delete(uuid); behaviorInputs.delete(uuid); tickElapsed.delete(uuid); enteredMachines.delete(uuid) }
/** 结构说明（自动提取）：resetAi；无显式参数；直接调用 signalCursors.clear、behaviorInputs.clear、elapsed.clear、signals.clear、blackboards.clear 等；写入 signalSequence、tickCursor。 */ export function resetAi(): void { signalCursors.clear(); signalSequence = 0; behaviorInputs.clear(); elapsed.clear(); signals.clear(); blackboards.clear(); tickElapsed.clear(); enteredMachines.clear(); behaviorDocuments.clear(); stateDocuments.clear(); tickCursor = 0; Object.assign(aiDebugState, { activeAgents: 0, tickedAgents: 0, deferredAgents: 0, droppedAgents: 0, nodeEvaluations: 0, perceptionQueries: 0, maximumPerceptionResults: 0, perceptionCandidates: 0, recordedTraces: 0, skippedTraces: 0, agents: [], machines: [] }) }
