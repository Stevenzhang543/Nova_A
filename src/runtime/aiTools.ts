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
const elapsed = new Map<string, number>(), signals = new Set<string>(), blackboards = new Map<string, Record<string, BlackboardValue>>()
const tickElapsed = new Map<string, number>(), enteredMachines = new Map<string, string>()
const behaviorDocuments = new Map<string, { source: string; name: string; tree: BehaviorTreeDocument; nodes: Map<string, BehaviorNode> }>()
const stateDocuments = new Map<string, { source: string; name: string; machine: StateMachineDocument; states: Map<string, StateMachineDocument['states'][number]> }>()
let tickCursor = 0
export const aiDebugState = reactive({
  activeAgents: 0, tickedAgents: 0, deferredAgents: 0, droppedAgents: 0, nodeEvaluations: 0, perceptionQueries: 0, maximumPerceptionResults: 0,
  perceptionCandidates: 0,
  agents: [] as Array<{ entityUuid: string; entityName: string; tree: string; activeNode: string; result: boolean; blackboard: Record<string, BlackboardValue>; perceived: number; utility: Record<string, number> }>,
  machines: [] as Array<{ entityUuid: string; entityName: string; machine: string; activeState: string; lineage: string[]; transition: string }>
})

export let emitAiSignal: (name: string, entity: Entity) => void = () => undefined
export function setAiSignalEmitter(emitter: typeof emitAiSignal): void { emitAiSignal = emitter }
export function notifyAiSignal(name: string): void { const normalized = name.trim().slice(0, 128); if (normalized) signals.add(normalized) }
export function perceptionSpatialCellSize(maximumRadius: number): number { return Math.max(1, Math.min(1_000_000, Number.isFinite(maximumRadius) ? maximumRadius : 0) / 32) }

function scalar(value: unknown, fallback: BlackboardValue = false): BlackboardValue {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') return value.slice(0, 256)
  return fallback
}

export function normalizeBehaviorTree(value: unknown): BehaviorTreeDocument | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Partial<BehaviorTreeDocument>
  if (!source.version || ![1, 2].includes(source.version) || typeof source.root !== 'string' || !source.root || !Array.isArray(source.nodes) || source.nodes.length > 10_000) return null
  if (source.nodes.some(node => !node || typeof node !== 'object') || source.blackboard !== undefined && (!source.blackboard || typeof source.blackboard !== 'object' || Array.isArray(source.blackboard)) || source.perception !== undefined && !Array.isArray(source.perception) || source.perception?.some(sensor => !sensor || typeof sensor !== 'object')) return null
  const supported: BehaviorNodeType[] = ['Sequence', 'Selector', 'UtilitySelector', 'Condition', 'BlackboardCondition', 'SetBlackboard', 'Perception', 'Action', 'Wait']
  const nodes = source.nodes.slice(0, 10_000).map((node, index) => ({
    id: typeof node.id === 'string' && node.id ? node.id.slice(0, 128) : `node-${index}`,
    type: supported.includes(node.type) ? node.type : 'Action' as BehaviorNodeType,
    name: typeof node.name === 'string' ? node.name.slice(0, 128) : `Node ${index + 1}`,
    children: (Array.isArray(node.children) ? node.children : []).filter(child => typeof child === 'string').slice(0, 256),
    condition: typeof node.condition === 'string' ? node.condition.slice(0, 128) : '', action: typeof node.action === 'string' ? node.action.slice(0, 128) : '',
    seconds: Math.min(86_400, Math.max(0, Number.isFinite(node.seconds) ? node.seconds : 0)), key: typeof node.key === 'string' ? node.key.slice(0, 80) : undefined,
    value: scalar(node.value), operator: ['equals', 'notEquals', 'greater', 'less', 'truthy'].includes(node.operator ?? '') ? node.operator : 'truthy' as const,
    scoreKey: typeof node.scoreKey === 'string' ? node.scoreKey.slice(0, 80) : undefined,
    weight: Number.isFinite(node.weight) ? Math.max(-1e6, Math.min(1e6, node.weight!)) : 1, bias: Number.isFinite(node.bias) ? Math.max(-1e6, Math.min(1e6, node.bias!)) : 0
  }))
  const ids = new Set(nodes.map(node => node.id)), root = source.root.slice(0, 128)
  if (ids.size !== nodes.length || !ids.has(root) || nodes.some(node => node.children.some(child => !ids.has(child)))) return null
  const nodesById = new Map(nodes.map(node => [node.id, node]))
  const visiting = new Set<string>(), visited = new Set<string>()
  const acyclic = (id: string, depth = 0): boolean => {
    if (depth > 32 || visiting.has(id)) return false
    if (visited.has(id)) return true
    visiting.add(id)
    const valid = (nodesById.get(id)?.children ?? []).every(child => acyclic(child, depth + 1))
    visiting.delete(id); if (valid) visited.add(id)
    return valid
  }
  // Validate every component, not only nodes reachable from the declared root.
  // Otherwise a disconnected hostile cycle could be accepted and later become
  // reachable after an editor operation.
  if (!nodes.every(node => acyclic(node.id))) return null
  const blackboard = Object.fromEntries(Object.entries(source.blackboard ?? {}).slice(0, 256).map(([key, entry]) => [key.slice(0, 80), scalar(entry)]))
  const perception = (Array.isArray(source.perception) ? source.perception : []).slice(0, 64).map((sensor, index) => ({
    id: typeof sensor.id === 'string' ? sensor.id.slice(0, 80) : `sensor-${index}`,
    tags: (Array.isArray(sensor.tags) ? sensor.tags : []).filter(tag => typeof tag === 'string').slice(0, 32).map(tag => tag.slice(0, 80)),
    radius: Math.min(1e6, Math.max(0, Number.isFinite(sensor.radius) ? sensor.radius : 10)), fieldOfView: Math.min(360, Math.max(0, Number.isFinite(sensor.fieldOfView) ? sensor.fieldOfView : 360)),
    maximumResults: Math.min(MAX_PERCEPTION_RESULTS, Math.max(1, Math.round(Number.isFinite(sensor.maximumResults) ? sensor.maximumResults : 8))),
    blackboardKey: typeof sensor.blackboardKey === 'string' ? sensor.blackboardKey.slice(0, 80) : `perception.${index}`
  }))
  return { version: source.version, root, nodes, blackboard, perception }
}

export function normalizeStateMachine(value: unknown): StateMachineDocument | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Partial<StateMachineDocument>
  if (!source.version || ![1, 2].includes(source.version) || typeof source.initialState !== 'string' || !source.initialState || !Array.isArray(source.states) || !Array.isArray(source.transitions) || source.states.length > 10_000 || source.transitions.length > 100_000) return null
  if (source.states.some(state => !state || typeof state !== 'object') || source.transitions.some(transition => !transition || typeof transition !== 'object')) return null
  const states = source.states.map((state, index) => ({
    id: typeof state.id === 'string' && state.id ? state.id.slice(0, 128) : `state-${index}`,
    parent: typeof state.parent === 'string' ? state.parent.slice(0, 128) : '',
    onEnter: typeof state.onEnter === 'string' ? state.onEnter.slice(0, 128) : '',
    onUpdate: typeof state.onUpdate === 'string' ? state.onUpdate.slice(0, 128) : '',
    onExit: typeof state.onExit === 'string' ? state.onExit.slice(0, 128) : ''
  }))
  const ids = new Set(states.map(state => state.id))
  const initialState = source.initialState.slice(0, 128), statesById = new Map(states.map(state => [state.id, state]))
  if (ids.size !== states.length || !ids.has(initialState) || states.some(state => state.parent && (!ids.has(state.parent) || state.parent === state.id))) return null
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
  const transitions = source.transitions.map(transition => ({
    from: typeof transition.from === 'string' ? transition.from.slice(0, 128) : '',
    to: typeof transition.to === 'string' ? transition.to.slice(0, 128) : '',
    signal: typeof transition.signal === 'string' ? transition.signal.slice(0, 128) : '',
    priority: Number.isFinite(transition.priority) ? Math.max(-1_000_000, Math.min(1_000_000, transition.priority!)) : 0
  }))
  if (transitions.some(transition => (transition.from !== '*' && !ids.has(transition.from)) || !ids.has(transition.to) || !transition.signal)) return null
  return { version: source.version, initialState, states, transitions }
}

function behaviorDocument(reference: string | null): { uuid: string; name: string; tree: BehaviorTreeDocument; nodes: Map<string, BehaviorNode> } | null {
  const asset = resolveAsset(reference), source = readTextAsset(reference)
  if (!asset || asset.assetType !== 'behaviorTree' || !source) return null
  const cached = behaviorDocuments.get(asset.uuid)
  if (cached?.source === source) return { uuid: asset.uuid, name: cached.name, tree: cached.tree, nodes: cached.nodes }
  try {
    const tree = normalizeBehaviorTree(JSON.parse(source))
    if (!tree) { recordGraphError(asset.uuid, 'document', 'Unsupported or invalid behavior-tree document'); return null }
    const entry = { source, name: asset.name, tree, nodes: new Map(tree.nodes.map(node => [node.id, node])) }
    behaviorDocuments.set(asset.uuid, entry)
    return { uuid: asset.uuid, name: entry.name, tree: entry.tree, nodes: entry.nodes }
  } catch { recordGraphError(asset.uuid, 'document', 'Invalid behaviorTree JSON'); return null }
}

function stateDocument(reference: string | null): { uuid: string; name: string; machine: StateMachineDocument; states: Map<string, StateMachineDocument['states'][number]> } | null {
  const asset = resolveAsset(reference), source = readTextAsset(reference)
  if (!asset || asset.assetType !== 'stateMachine' || !source) return null
  const cached = stateDocuments.get(asset.uuid)
  if (cached?.source === source) return { uuid: asset.uuid, name: cached.name, machine: cached.machine, states: cached.states }
  try {
    const machine = normalizeStateMachine(JSON.parse(source))
    if (!machine) { recordGraphError(asset.uuid, 'document', 'Unsupported, cyclic or invalid state-machine document'); return null }
    const entry = { source, name: asset.name, machine, states: new Map(machine.states.map(state => [state.id, state])) }
    stateDocuments.set(asset.uuid, entry)
    return { uuid: asset.uuid, name: entry.name, machine: entry.machine, states: entry.states }
  } catch { recordGraphError(asset.uuid, 'document', 'Invalid stateMachine JSON'); return null }
}

function compareBlackboard(actual: BlackboardValue | undefined, operator: BehaviorNode['operator'], expected: BlackboardValue): boolean {
  if (operator === 'truthy') return Boolean(actual)
  if (operator === 'equals') return actual === expected
  if (operator === 'notEquals') return actual !== expected
  const left = typeof actual === 'number' ? actual : Number(actual), right = typeof expected === 'number' ? expected : Number(expected)
  return Number.isFinite(left) && Number.isFinite(right) && (operator === 'greater' ? left > right : left < right)
}

interface PerceptionIndex { spatial: SpatialHash2D; entities: Map<string, Entity>; positions: Map<string, ReturnType<typeof worldTransform>> }

function runPerception(entity: Entity, tree: BehaviorTreeDocument, board: Record<string, BlackboardValue>, entities: Entity[], index: PerceptionIndex): number {
  const origin = index.positions.get(entity.uuid) ?? worldTransform(entity, entities), forward = { x: Math.cos(origin.rotation), y: Math.sin(origin.rotation) }
  let total = 0
  for (const sensor of tree.perception ?? []) {
    aiDebugState.perceptionQueries++
    const candidates = index.spatial.query({ minX: origin.position.x - sensor.radius, minY: origin.position.y - sensor.radius, maxX: origin.position.x + sensor.radius, maxY: origin.position.y + sensor.radius }).flatMap(uuid => { const candidate = index.entities.get(uuid); return candidate ? [candidate] : [] })
    aiDebugState.perceptionCandidates += candidates.length
    const matches = candidates.flatMap(candidate => {
      if (candidate === entity || !candidate.enabled || sensor.tags.length && !sensor.tags.some(tag => candidate.tags.includes(tag))) return []
      const point = index.positions.get(candidate.uuid)?.position ?? worldTransform(candidate, entities).position, dx = point.x - origin.position.x, dy = point.y - origin.position.y, distance = Math.hypot(dx, dy)
      if (distance > sensor.radius) return []
      if (sensor.fieldOfView < 360 && distance > 1e-9) { const dot = Math.max(-1, Math.min(1, (dx * forward.x + dy * forward.y) / distance)); if (Math.acos(dot) * 180 / Math.PI > sensor.fieldOfView * .5) return [] }
      return [{ candidate, distance }]
    }).sort((a, b) => a.distance - b.distance || a.candidate.uuid.localeCompare(b.candidate.uuid)).slice(0, sensor.maximumResults)
    total += matches.length; board[`${sensor.blackboardKey}.count`] = matches.length; board[`${sensor.blackboardKey}.uuid`] = matches[0]?.candidate.uuid ?? ''; board[`${sensor.blackboardKey}.distance`] = matches[0]?.distance ?? -1
    aiDebugState.maximumPerceptionResults = Math.max(aiDebugState.maximumPerceptionResults, matches.length)
  }
  return total
}

interface TickDebug { activeNode: string; utility: Record<string, number> }
function tickNode(entity: Entity, graphUuid: string, nodes: ReadonlyMap<string, BehaviorNode>, id: string, board: Record<string, BlackboardValue>, dt: number, debug: TickDebug, depth = 0, visiting = new Set<string>()): boolean {
  if (depth > 32 || visiting.has(id)) { recordGraphError(graphUuid, id || 'root', 'Behavior tree contains a cycle or exceeds 32 levels'); return false }
  const node = nodes.get(id); if (!node) { recordGraphError(graphUuid, id || 'root', 'Behavior tree node is missing'); return false }
  const started = performance.now(); debug.activeNode = node.id; aiDebugState.nodeEvaluations++; visiting.add(id)
  let result = false, edgeUuid = ''
  if (node.type === 'Sequence') { result = true; for (const child of node.children) { edgeUuid = `${node.id}->${child}`; if (!tickNode(entity, graphUuid, nodes, child, board, dt, debug, depth + 1, new Set(visiting))) { result = false; break } } }
  else if (node.type === 'Selector') { for (const child of node.children) { edgeUuid = `${node.id}->${child}`; if (tickNode(entity, graphUuid, nodes, child, board, dt, debug, depth + 1, new Set(visiting))) { result = true; break } } }
  else if (node.type === 'UtilitySelector') {
    const candidates = node.children.flatMap((child, index) => { const target = nodes.get(child); if (!target) return []; const raw = target.scoreKey ? Number(board[target.scoreKey]) : 0; const score = (Number.isFinite(raw) ? raw : 0) * (target.weight ?? 1) + (target.bias ?? 0); debug.utility[child] = score; return [{ child, score, index }] }).sort((a, b) => b.score - a.score || a.index - b.index)
    if (candidates[0]) { edgeUuid = `${node.id}->${candidates[0].child}`; result = tickNode(entity, graphUuid, nodes, candidates[0].child, board, dt, debug, depth + 1, new Set(visiting)) }
  } else if (node.type === 'Condition') result = node.condition === 'has_navigation_target' ? Boolean(entity.getComponent<NavigationAgent2D>('NavigationAgent2D')) : signals.has(node.condition)
  else if (node.type === 'BlackboardCondition') result = compareBlackboard(board[node.key ?? ''], node.operator, node.value ?? false)
  else if (node.type === 'SetBlackboard') { if (node.key) board[node.key] = scalar(node.value); result = Boolean(node.key) }
  else if (node.type === 'Perception') result = Number(board[`${node.key ?? node.condition}.count`] ?? 0) > 0
  else if (node.type === 'Action') { if (node.action || node.name) emitAiSignal(node.action || node.name, entity); result = true }
  else { const key = `${entity.uuid}:${node.id}`, value = (elapsed.get(key) ?? 0) + dt; if (value >= node.seconds) { elapsed.delete(key); result = true } else elapsed.set(key, value) }
  recordGraphTrace({ type: 'graphTrace', graphUuid, scopeUuid: entity.uuid, nodeUuid: node.id, edgeUuid, depth, durationMicros: (performance.now() - started) * 1_000, values: { entity: entity.uuid, node: node.name, result, state: 'behaviorTree' } })
  return result
}

function tickBehavior(entity: Entity, behavior: BehaviorTree2D, entities: Entity[], dt: number, index: PerceptionIndex | null): void {
  const source = behaviorDocument(behavior.treeAsset); if (!source) return
  const started = performance.now(), tree = source.tree
  const board = blackboards.get(entity.uuid) ?? { ...(tree.blackboard ?? {}) }; Object.assign(board, behavior.blackboardOverrides); blackboards.set(entity.uuid, board)
  const perceived = index && tree.perception?.length ? runPerception(entity, tree, board, entities, index) : 0, debug: TickDebug = { activeNode: tree.root, utility: {} }, result = tickNode(entity, source.uuid, source.nodes, tree.root, board, Math.min(.25, Math.max(0, dt)), debug)
  behavior.currentNode = debug.activeNode
  if (aiDebugState.agents.length < 512) aiDebugState.agents.push({ entityUuid: entity.uuid, entityName: entity.name, tree: source.name, activeNode: debug.activeNode, result, blackboard: { ...board }, perceived, utility: debug.utility })
  recordScriptFunction(source.uuid, source.name, 'BehaviorTree.tick', performance.now() - started, 0)
}

function stateLineage(states: ReadonlyMap<string, StateMachineDocument['states'][number]>, leaf: string): string[] {
  const result: string[] = []; let current: string | undefined = leaf
  while (current && result.length <= 32) { result.push(current); current = states.get(current)?.parent || undefined }
  return result
}

function tickMachine(entity: Entity, machine: StateMachine2D): void {
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
    const transition = value.transitions.map((candidate, index) => ({ candidate, index, depth: candidate.from === '*' ? Number.MAX_SAFE_INTEGER : lineage.indexOf(candidate.from) })).filter(item => item.depth >= 0 && signals.has(item.candidate.signal)).sort((a, b) => (b.candidate.priority ?? 0) - (a.candidate.priority ?? 0) || a.depth - b.depth || a.index - b.index)[0]?.candidate
    if (transition) {
      const next = states.get(transition.to)
      if (!next) recordGraphError(source.uuid, transition.to, 'Transition target state is missing')
      else {
        const targetLineage = stateLineage(states, next.id), common = lineage.find(state => targetLineage.includes(state)) ?? ''
        for (const stateId of lineage) { if (stateId === common) break; const state = states.get(stateId); if (state?.onExit) emitAiSignal(state.onExit, entity) }
        for (const stateId of targetLineage.slice(0, common ? targetLineage.indexOf(common) : targetLineage.length).reverse()) { const state = states.get(stateId); if (state?.onEnter) emitAiSignal(state.onEnter, entity) }
        machine.currentState = transition.to
        lineage = targetLineage
        enteredMachines.set(entity.uuid, `${source.uuid}:${machine.currentState}`)
      }
    }
    const activeLineage = transition ? lineage : stateLineage(states, machine.currentState)
    if (aiDebugState.machines.length < 512) aiDebugState.machines.push({ entityUuid: entity.uuid, entityName: entity.name, machine: source.name, activeState: machine.currentState, lineage: activeLineage, transition: transition?.signal ?? '' })
    recordGraphTrace({ type: 'graphTrace', graphUuid: source.uuid, scopeUuid: entity.uuid, nodeUuid: machine.currentState, edgeUuid: transition ? `${transition.from}->${transition.to}` : '', depth: 0, durationMicros: (performance.now() - started) * 1_000, values: { entity: entity.uuid, state: machine.currentState, transition: transition?.signal ?? '' } })
  }
  recordScriptFunction(source.uuid, source.name, 'StateMachine.tick', performance.now() - started, 0)
}

export function updateAi(entities: Entity[], dt: number, _frame: number): void {
  Object.assign(aiDebugState, { activeAgents: 0, tickedAgents: 0, deferredAgents: 0, droppedAgents: 0, nodeEvaluations: 0, perceptionQueries: 0, maximumPerceptionResults: 0, perceptionCandidates: 0, agents: [], machines: [] })
  const candidates = entities.filter(entity => entity.enabled && (entity.getComponent<BehaviorTree2D>('BehaviorTree2D')?.enabled || entity.getComponent<StateMachine2D>('StateMachine2D')?.enabled)).sort((a, b) => a.uuid.localeCompare(b.uuid)), bounded = candidates.slice(0, MAX_AI_AGENTS)
  aiDebugState.activeAgents = bounded.length; aiDebugState.droppedAgents = Math.max(0, candidates.length - bounded.length)
  const boundedIds = new Set(bounded.map(entity => entity.uuid))
  for (const key of tickElapsed.keys()) if (!boundedIds.has(key)) tickElapsed.delete(key)
  for (const key of blackboards.keys()) if (!boundedIds.has(key)) blackboards.delete(key)
  for (const key of enteredMachines.keys()) if (!boundedIds.has(key)) enteredMachines.delete(key)
  const due = bounded.filter(entity => {
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
    for (const entity of entities.filter(candidate => candidate.enabled).sort((a, b) => a.uuid.localeCompare(b.uuid))) { const transform = worldTransform(entity, entities), position = transform.position; spatial.upsert({ id: entity.uuid, bounds: { minX: position.x, minY: position.y, maxX: position.x, maxY: position.y } }); byUuid.set(entity.uuid, entity); positions.set(entity.uuid, transform) }
    perceptionIndex = { spatial, entities: byUuid, positions }
  }
  for (const entity of bounded) {
    if (!selected.has(entity.uuid)) continue
    aiDebugState.tickedAgents++
    const behavior = entity.getComponent<BehaviorTree2D>('BehaviorTree2D')
    if (behavior?.enabled) {
      const interval = 1 / Math.max(1, behavior.tickRate), accumulated = tickElapsed.get(entity.uuid) ?? dt
      tickBehavior(entity, behavior, entities, accumulated, perceptionIndex)
      tickElapsed.set(entity.uuid, accumulated % interval)
    }
    const machine = entity.getComponent<StateMachine2D>('StateMachine2D'); if (machine?.enabled) tickMachine(entity, machine)
  }
  signals.clear()
}

export function blackboardSnapshot(entityUuid: string): Record<string, BlackboardValue> { return { ...(blackboards.get(entityUuid) ?? {}) } }
export function setBlackboardValue(entityUuid: string, key: string, value: BlackboardValue): void { const normalized = key.trim().slice(0, 80); if (!normalized) return; const board = blackboards.get(entityUuid) ?? {}; board[normalized] = scalar(value); blackboards.set(entityUuid, board) }
export function resetAi(): void { elapsed.clear(); signals.clear(); blackboards.clear(); tickElapsed.clear(); enteredMachines.clear(); behaviorDocuments.clear(); stateDocuments.clear(); tickCursor = 0; Object.assign(aiDebugState, { activeAgents: 0, tickedAgents: 0, deferredAgents: 0, droppedAgents: 0, nodeEvaluations: 0, perceptionQueries: 0, maximumPerceptionResults: 0, perceptionCandidates: 0, agents: [], machines: [] }) }
