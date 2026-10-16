/** Shared original AI document validation and scalar contracts. */

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
/* 调用 Math.max(1, Math.min(1_000_000, Number.isFinite(maximumRadius) ? maximumRadius : 0) / 32) 并返回调用结果。 */ export function perceptionSpatialCellSize(maximumRadius: number): number { return Math.max(1, Math.min(1_000_000, Number.isFinite(maximumRadius) ? maximumRadius : 0) / 32) }

/** 结构说明（自动提取）：scalar；输入 value、fallback；直接调用 Number.isFinite、value.slice；返回路径包含 value、fallback。 */ export function scalar(value: unknown, fallback: BlackboardValue = false): BlackboardValue {
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
