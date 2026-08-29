import { reactive } from 'vue'
import { readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { Entity } from '../world/Entity'
import type { BehaviorTree2D, NavigationAgent2D, StateMachine2D } from '../world/components'
import { worldTransform } from '../world/hierarchy'
import { recordScriptFunction } from './profiler'
import { recordGraphError, recordGraphTrace } from '../visual/graphDebugger'

export type BlackboardValue = boolean | number | string
export type BehaviorNodeType = 'Sequence' | 'Selector' | 'UtilitySelector' | 'Condition' | 'BlackboardCondition' | 'SetBlackboard' | 'Perception' | 'Action' | 'Wait'
export type BehaviorNode = {
  id: string; type: BehaviorNodeType; name: string; children: string[]; condition: string; action: string; seconds: number
  key?: string; value?: BlackboardValue; operator?: 'equals' | 'notEquals' | 'greater' | 'less' | 'truthy'; scoreKey?: string; weight?: number; bias?: number
}
export interface BehaviorPerceptionSensor { id: string; tags: string[]; radius: number; fieldOfView: number; maximumResults: number; blackboardKey: string }
export interface BehaviorTreeDocument { version: 1 | 2; root: string; nodes: BehaviorNode[]; blackboard?: Record<string, BlackboardValue>; perception?: BehaviorPerceptionSensor[] }
export interface StateMachineDocument { version: 1; initialState: string; states: Array<{ id: string; parent: string; onEnter: string; onExit: string }>; transitions: Array<{ from: string; to: string; signal: string }> }

export const MAX_AI_AGENTS = 10_000
export const MAX_AI_TICKS_PER_FRAME = 2_048
export const MAX_PERCEPTION_RESULTS = 32
const elapsed = new Map<string, number>(), signals = new Set<string>(), blackboards = new Map<string, Record<string, BlackboardValue>>()
let tickCursor = 0
export const aiDebugState = reactive({
  activeAgents: 0, tickedAgents: 0, deferredAgents: 0, droppedAgents: 0, nodeEvaluations: 0, perceptionQueries: 0, maximumPerceptionResults: 0,
  agents: [] as Array<{ entityUuid: string; entityName: string; tree: string; activeNode: string; result: boolean; blackboard: Record<string, BlackboardValue>; perceived: number; utility: Record<string, number> }>
})

export let emitAiSignal: (name: string, entity: Entity) => void = () => undefined
export function setAiSignalEmitter(emitter: typeof emitAiSignal): void { emitAiSignal = emitter }
export function notifyAiSignal(name: string): void { signals.add(name.slice(0, 128)) }

function document<T>(reference: string | null, type: 'behaviorTree' | 'stateMachine'): { uuid: string; name: string; value: T } | null {
  const asset = resolveAsset(reference), source = readTextAsset(reference)
  if (!asset || asset.assetType !== type || !source) return null
  try { return { uuid: asset.uuid, name: asset.name, value: JSON.parse(source) as T } } catch { recordGraphError(asset.uuid, 'document', `Invalid ${type} JSON`); return null }
}

function scalar(value: unknown, fallback: BlackboardValue = false): BlackboardValue {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') return value.slice(0, 256)
  return fallback
}

export function normalizeBehaviorTree(value: BehaviorTreeDocument): BehaviorTreeDocument | null {
  if (![1, 2].includes(value?.version) || !value.root || !Array.isArray(value.nodes) || value.nodes.length > 10_000) return null
  const supported: BehaviorNodeType[] = ['Sequence', 'Selector', 'UtilitySelector', 'Condition', 'BlackboardCondition', 'SetBlackboard', 'Perception', 'Action', 'Wait']
  const nodes = value.nodes.slice(0, 10_000).map((node, index) => ({
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
  const blackboard = Object.fromEntries(Object.entries(value.blackboard ?? {}).slice(0, 256).map(([key, entry]) => [key.slice(0, 80), scalar(entry)]))
  const perception = (Array.isArray(value.perception) ? value.perception : []).slice(0, 64).map((sensor, index) => ({
    id: typeof sensor.id === 'string' ? sensor.id.slice(0, 80) : `sensor-${index}`,
    tags: (Array.isArray(sensor.tags) ? sensor.tags : []).filter(tag => typeof tag === 'string').slice(0, 32).map(tag => tag.slice(0, 80)),
    radius: Math.min(1e6, Math.max(0, Number.isFinite(sensor.radius) ? sensor.radius : 10)), fieldOfView: Math.min(360, Math.max(0, Number.isFinite(sensor.fieldOfView) ? sensor.fieldOfView : 360)),
    maximumResults: Math.min(MAX_PERCEPTION_RESULTS, Math.max(1, Math.round(Number.isFinite(sensor.maximumResults) ? sensor.maximumResults : 8))),
    blackboardKey: typeof sensor.blackboardKey === 'string' ? sensor.blackboardKey.slice(0, 80) : `perception.${index}`
  }))
  return { version: value.version, root: value.root.slice(0, 128), nodes, blackboard, perception }
}

function compareBlackboard(actual: BlackboardValue | undefined, operator: BehaviorNode['operator'], expected: BlackboardValue): boolean {
  if (operator === 'truthy') return Boolean(actual)
  if (operator === 'equals') return actual === expected
  if (operator === 'notEquals') return actual !== expected
  const left = typeof actual === 'number' ? actual : Number(actual), right = typeof expected === 'number' ? expected : Number(expected)
  return Number.isFinite(left) && Number.isFinite(right) && (operator === 'greater' ? left > right : left < right)
}

function runPerception(entity: Entity, tree: BehaviorTreeDocument, board: Record<string, BlackboardValue>, entities: Entity[]): number {
  const origin = worldTransform(entity, entities), forward = { x: Math.cos(origin.rotation), y: Math.sin(origin.rotation) }
  let total = 0
  for (const sensor of tree.perception ?? []) {
    aiDebugState.perceptionQueries++
    const matches = entities.flatMap(candidate => {
      if (candidate === entity || !candidate.enabled || sensor.tags.length && !sensor.tags.some(tag => candidate.tags.includes(tag))) return []
      const point = worldTransform(candidate, entities).position, dx = point.x - origin.position.x, dy = point.y - origin.position.y, distance = Math.hypot(dx, dy)
      if (distance > sensor.radius) return []
      if (sensor.fieldOfView < 360 && distance > 1e-9) { const dot = Math.max(-1, Math.min(1, (dx * forward.x + dy * forward.y) / distance)); if (Math.acos(dot) * 360 / Math.PI > sensor.fieldOfView) return [] }
      return [{ candidate, distance }]
    }).sort((a, b) => a.distance - b.distance || a.candidate.uuid.localeCompare(b.candidate.uuid)).slice(0, sensor.maximumResults)
    total += matches.length; board[`${sensor.blackboardKey}.count`] = matches.length; board[`${sensor.blackboardKey}.uuid`] = matches[0]?.candidate.uuid ?? ''; board[`${sensor.blackboardKey}.distance`] = matches[0]?.distance ?? -1
    aiDebugState.maximumPerceptionResults = Math.max(aiDebugState.maximumPerceptionResults, matches.length)
  }
  return total
}

interface TickDebug { activeNode: string; utility: Record<string, number> }
function tickNode(entity: Entity, graphUuid: string, tree: BehaviorTreeDocument, id: string, board: Record<string, BlackboardValue>, dt: number, debug: TickDebug, depth = 0, visiting = new Set<string>()): boolean {
  if (depth > 32 || visiting.has(id)) { recordGraphError(graphUuid, id || 'root', 'Behavior tree contains a cycle or exceeds 32 levels'); return false }
  const node = tree.nodes.find(candidate => candidate.id === id); if (!node) { recordGraphError(graphUuid, id || 'root', 'Behavior tree node is missing'); return false }
  const started = performance.now(); debug.activeNode = node.id; aiDebugState.nodeEvaluations++; visiting.add(id)
  let result = false, edgeUuid = ''
  if (node.type === 'Sequence') { result = true; for (const child of node.children) { edgeUuid = `${node.id}->${child}`; if (!tickNode(entity, graphUuid, tree, child, board, dt, debug, depth + 1, new Set(visiting))) { result = false; break } } }
  else if (node.type === 'Selector') { for (const child of node.children) { edgeUuid = `${node.id}->${child}`; if (tickNode(entity, graphUuid, tree, child, board, dt, debug, depth + 1, new Set(visiting))) { result = true; break } } }
  else if (node.type === 'UtilitySelector') {
    const candidates = node.children.flatMap((child, index) => { const target = tree.nodes.find(candidate => candidate.id === child); if (!target) return []; const raw = target.scoreKey ? Number(board[target.scoreKey]) : 0; const score = (Number.isFinite(raw) ? raw : 0) * (target.weight ?? 1) + (target.bias ?? 0); debug.utility[child] = score; return [{ child, score, index }] }).sort((a, b) => b.score - a.score || a.index - b.index)
    if (candidates[0]) { edgeUuid = `${node.id}->${candidates[0].child}`; result = tickNode(entity, graphUuid, tree, candidates[0].child, board, dt, debug, depth + 1, new Set(visiting)) }
  } else if (node.type === 'Condition') result = node.condition === 'has_navigation_target' ? Boolean(entity.getComponent<NavigationAgent2D>('NavigationAgent2D')) : signals.has(node.condition)
  else if (node.type === 'BlackboardCondition') result = compareBlackboard(board[node.key ?? ''], node.operator, node.value ?? false)
  else if (node.type === 'SetBlackboard') { if (node.key) board[node.key] = scalar(node.value); result = Boolean(node.key) }
  else if (node.type === 'Perception') result = Number(board[`${node.key ?? node.condition}.count`] ?? 0) > 0
  else if (node.type === 'Action') { if (node.action || node.name) emitAiSignal(node.action || node.name, entity); result = true }
  else { const key = `${entity.uuid}:${node.id}`, value = (elapsed.get(key) ?? 0) + dt; if (value >= node.seconds) { elapsed.delete(key); result = true } else elapsed.set(key, value) }
  recordGraphTrace({ type: 'graphTrace', graphUuid, scopeUuid: entity.uuid, nodeUuid: node.id, edgeUuid, depth, durationMicros: (performance.now() - started) * 1_000, values: { entity: entity.uuid, node: node.name, result, state: 'behaviorTree' } })
  return result
}

function tickBehavior(entity: Entity, behavior: BehaviorTree2D, entities: Entity[], dt: number): void {
  const source = document<BehaviorTreeDocument>(behavior.treeAsset, 'behaviorTree'); if (!source) return
  const started = performance.now(), tree = normalizeBehaviorTree(source.value); if (!tree) { recordGraphError(source.uuid, 'document', 'Unsupported or invalid behavior-tree document'); return }
  const board = blackboards.get(entity.uuid) ?? { ...(tree.blackboard ?? {}) }; Object.assign(board, behavior.blackboardOverrides); blackboards.set(entity.uuid, board)
  const perceived = runPerception(entity, tree, board, entities), debug: TickDebug = { activeNode: tree.root, utility: {} }, result = tickNode(entity, source.uuid, tree, tree.root, board, Math.min(.25, Math.max(0, dt)), debug)
  behavior.currentNode = debug.activeNode
  if (aiDebugState.agents.length < 512) aiDebugState.agents.push({ entityUuid: entity.uuid, entityName: entity.name, tree: source.name, activeNode: debug.activeNode, result, blackboard: { ...board }, perceived, utility: debug.utility })
  recordScriptFunction(source.uuid, source.name, 'BehaviorTree.tick', performance.now() - started, 0)
}

function tickMachine(entity: Entity, machine: StateMachine2D): void {
  const source = document<StateMachineDocument>(machine.machineAsset, 'stateMachine'); if (!source) return
  const started = performance.now(), value = source.value
  if (value.version !== 1 || !Array.isArray(value.states) || !Array.isArray(value.transitions) || value.states.length > 10_000 || value.transitions.length > 100_000) recordGraphError(source.uuid, 'document', 'Unsupported or invalid state-machine document')
  else {
    if (!machine.currentState) machine.currentState = value.initialState
    const current = value.states.find(state => state.id === machine.currentState); if (!current) recordGraphError(source.uuid, machine.currentState || 'initial', 'State-machine state is missing')
    const transition = value.transitions.find(candidate => candidate.from === machine.currentState && signals.has(candidate.signal))
    if (transition) { const next = value.states.find(state => state.id === transition.to); if (!next) recordGraphError(source.uuid, transition.to, 'Transition target state is missing'); else { if (current?.onExit) emitAiSignal(current.onExit, entity); machine.currentState = transition.to; if (next.onEnter) emitAiSignal(next.onEnter, entity) } }
    recordGraphTrace({ type: 'graphTrace', graphUuid: source.uuid, scopeUuid: entity.uuid, nodeUuid: machine.currentState, edgeUuid: transition ? `${transition.from}->${transition.to}` : '', depth: 0, durationMicros: (performance.now() - started) * 1_000, values: { entity: entity.uuid, state: machine.currentState, transition: transition?.signal ?? '' } })
  }
  recordScriptFunction(source.uuid, source.name, 'StateMachine.tick', performance.now() - started, 0)
}

export function updateAi(entities: Entity[], dt: number, frame: number): void {
  Object.assign(aiDebugState, { activeAgents: 0, tickedAgents: 0, deferredAgents: 0, droppedAgents: 0, nodeEvaluations: 0, perceptionQueries: 0, maximumPerceptionResults: 0, agents: [] })
  const candidates = entities.filter(entity => entity.enabled && (entity.getComponent<BehaviorTree2D>('BehaviorTree2D')?.enabled || entity.getComponent<StateMachine2D>('StateMachine2D')?.enabled)).sort((a, b) => a.uuid.localeCompare(b.uuid)), bounded = candidates.slice(0, MAX_AI_AGENTS)
  aiDebugState.activeAgents = bounded.length; aiDebugState.droppedAgents = Math.max(0, candidates.length - bounded.length)
  const due = bounded.filter(entity => { const behavior = entity.getComponent<BehaviorTree2D>('BehaviorTree2D'); return !behavior || frame % Math.max(1, Math.round(60 / Math.max(1, behavior.tickRate))) === 0 }), selected = new Set<string>()
  for (let index = 0; index < Math.min(MAX_AI_TICKS_PER_FRAME, due.length); index++) selected.add(due[(tickCursor + index) % due.length].uuid)
  if (due.length) tickCursor = (tickCursor + MAX_AI_TICKS_PER_FRAME) % due.length
  aiDebugState.deferredAgents = Math.max(0, due.length - selected.size)
  for (const entity of bounded) { if (!selected.has(entity.uuid)) continue; aiDebugState.tickedAgents++; const behavior = entity.getComponent<BehaviorTree2D>('BehaviorTree2D'); if (behavior?.enabled) tickBehavior(entity, behavior, entities, dt); const machine = entity.getComponent<StateMachine2D>('StateMachine2D'); if (machine?.enabled) tickMachine(entity, machine) }
  signals.clear()
}

export function blackboardSnapshot(entityUuid: string): Record<string, BlackboardValue> { return { ...(blackboards.get(entityUuid) ?? {}) } }
export function setBlackboardValue(entityUuid: string, key: string, value: BlackboardValue): void { const board = blackboards.get(entityUuid) ?? {}; board[key.slice(0, 80)] = scalar(value); blackboards.set(entityUuid, board) }
export function resetAi(): void { elapsed.clear(); signals.clear(); blackboards.clear(); tickCursor = 0; Object.assign(aiDebugState, { activeAgents: 0, tickedAgents: 0, deferredAgents: 0, droppedAgents: 0, nodeEvaluations: 0, perceptionQueries: 0, maximumPerceptionResults: 0, agents: [] }) }
