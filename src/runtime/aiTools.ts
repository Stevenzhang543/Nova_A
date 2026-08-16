import { readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { Entity } from '../world/Entity'
import type { BehaviorTree2D, NavigationAgent2D, StateMachine2D } from '../world/components'

export type BehaviorNode = { id: string; type: 'Sequence' | 'Selector' | 'Condition' | 'Action' | 'Wait'; name: string; children: string[]; condition: string; action: string; seconds: number }
export interface BehaviorTreeDocument { version: 1; root: string; nodes: BehaviorNode[] }
export interface StateMachineDocument { version: 1; initialState: string; states: Array<{ id: string; parent: string; onEnter: string; onExit: string }>; transitions: Array<{ from: string; to: string; signal: string }> }

const elapsed = new Map<string, number>(), signals = new Set<string>()
export let emitAiSignal: (name: string, entity: Entity) => void = () => undefined
export function setAiSignalEmitter(emitter: typeof emitAiSignal): void { emitAiSignal = emitter }
export function notifyAiSignal(name: string): void { signals.add(name.slice(0, 128)) }

function document<T>(reference: string | null, type: 'behaviorTree' | 'stateMachine'): T | null {
  const asset = resolveAsset(reference), source = readTextAsset(reference)
  if (!asset || asset.assetType !== type || !source) return null
  try { return JSON.parse(source) as T } catch { return null }
}

function tickNode(entity: Entity, tree: BehaviorTreeDocument, id: string, dt: number, visiting = new Set<string>()): boolean {
  if (visiting.has(id)) return false
  const node = tree.nodes.find(candidate => candidate.id === id); if (!node) return false
  visiting.add(id)
  if (node.type === 'Sequence') return node.children.every(child => tickNode(entity, tree, child, dt, new Set(visiting)))
  if (node.type === 'Selector') return node.children.some(child => tickNode(entity, tree, child, dt, new Set(visiting)))
  if (node.type === 'Condition') return node.condition === 'has_navigation_target' ? Boolean(entity.getComponent<NavigationAgent2D>('NavigationAgent2D')) : signals.has(node.condition)
  if (node.type === 'Action') { emitAiSignal(node.action || node.name, entity); return true }
  const key = `${entity.uuid}:${node.id}`, value = (elapsed.get(key) ?? 0) + dt
  if (value >= Math.max(0, node.seconds)) { elapsed.delete(key); return true }
  elapsed.set(key, value); return false
}

export function updateAi(entities: Entity[], dt: number, frame: number): void {
  for (const entity of entities) {
    const behavior = entity.getComponent<BehaviorTree2D>('BehaviorTree2D')
    if (entity.enabled && behavior?.enabled && frame % Math.max(1, Math.round(60 / Math.max(1, behavior.tickRate))) === 0) {
      const tree = document<BehaviorTreeDocument>(behavior.treeAsset, 'behaviorTree')
      if (tree) { behavior.currentNode = tree.root; tickNode(entity, tree, tree.root, dt) }
    }
    const machine = entity.getComponent<StateMachine2D>('StateMachine2D')
    if (entity.enabled && machine?.enabled) {
      const source = document<StateMachineDocument>(machine.machineAsset, 'stateMachine'); if (!source) continue
      if (!machine.currentState) machine.currentState = source.initialState
      const transition = source.transitions.find(candidate => candidate.from === machine.currentState && signals.has(candidate.signal))
      if (transition) { emitAiSignal(source.states.find(state => state.id === machine.currentState)?.onExit ?? '', entity); machine.currentState = transition.to; emitAiSignal(source.states.find(state => state.id === machine.currentState)?.onEnter ?? '', entity) }
    }
  }
  signals.clear()
}

export function resetAi(): void { elapsed.clear(); signals.clear() }

