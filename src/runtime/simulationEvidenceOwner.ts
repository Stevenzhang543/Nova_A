/** Fixed-World bounded replay evidence. AI ownership is explicit in the checksum port. */
import type { Entity } from '../world/Entity'
import type { Connection } from '../world/Connection'
import type { World } from '../world/World'
import type { NavigationAgent2D } from '../world/components'
import { worldTransform } from '../world/hierarchy'

export type SimulationEvidenceWorld = Pick<World, 'entities' | 'connections'>
export type SimulationBlackboardValue = boolean | number | string
export type SimulationEvidenceChecksumPort = {
  readonly scope: 'shared-legacy-ai'
  blackboardSnapshot(entityUuid: string): Readonly<Record<string, SimulationBlackboardValue>>
} | {
  readonly scope: 'fixed-world'
  readonly world: SimulationEvidenceWorld
  blackboardSnapshot(entityUuid: string): Readonly<Record<string, SimulationBlackboardValue>>
}
export interface SimulationEvidenceState {
  enabled: boolean
  frames: Array<{ frame: number; checksum: string }>
  lastChecksum: string
  divergentFrame: number
}
export const MAX_EVIDENCE_FRAMES = 600
export function createInitialSimulationEvidenceState(): SimulationEvidenceState { return { enabled: false, frames: [], lastChecksum: '', divergentFrame: -1 } }

const fixed = /* 计算表达式 Math.round((Number.isFinite(value) ? value : 0) * 1e9) / 1e9 并返回结果，沿用操作数的原有类型规则。 */ (value: number): number => Math.round((Number.isFinite(value) ? value : 0) * 1e9) / 1e9
function stableFingerprint(value: unknown): string {
  const source = JSON.stringify(value); let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < source.length; index++) { const code = source.charCodeAt(index); first = Math.imul(first ^ code, 0x01000193) >>> 0; second = Math.imul(second ^ code, 0x85ebca6b) >>> 0 }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}
/** Preserve the original stable sort, quantization and field order; use the required real blackboard port. */
export function computeSimulationStateChecksum(entities: readonly Entity[], connections: readonly Connection[], checksumPort: SimulationEvidenceChecksumPort): string {
  return stableFingerprint({
    entities: [...entities].sort(/* 调用 a.uuid.localeCompare(b.uuid) 并返回调用结果。 */ (a, b) => a.uuid.localeCompare(b.uuid)).map(/** 结构说明（自动提取）：map 回调；输入 entity；直接调用 worldTransform、entity.getComponent、map、sort、Object.entries 等。 */ entity => {
      const transform = worldTransform(entity, entities as Entity[]), agent = entity.getComponent<NavigationAgent2D>('NavigationAgent2D')
      const behavior = entity.getComponent<import('../world/components').BehaviorTree2D>('BehaviorTree2D'), machine = entity.getComponent<import('../world/components').StateMachine2D>('StateMachine2D')
      const board = Object.entries(checksumPort.blackboardSnapshot(entity.uuid)).sort(/* 调用 first.localeCompare(second) 并返回调用结果。 */ ([first], [second]) => first.localeCompare(second)).map(/* 返回按声明顺序构造的数组 [key, typeof value === 'number' ? fixed(value) : value]。 */ ([key, value]) => [key, typeof value === 'number' ? fixed(value) : value])
      return [
        entity.uuid, entity.enabled, fixed(transform.position.x), fixed(transform.position.y), fixed(transform.rotation), fixed(entity.velocity.x), fixed(entity.velocity.y), fixed(entity.angularVelocity), entity.rigidBody.sleeping,
        agent ? [agent.pathStatus, agent.pathIndex, fixed(agent.velocity.x), fixed(agent.velocity.y), fixed(agent.targetPosition.x), fixed(agent.targetPosition.y), agent.targetEntityUuid ?? '', agent.path.map(/* 返回按声明顺序构造的数组 [fixed(point.x), fixed(point.y)]。 */ point => [fixed(point.x), fixed(point.y)])] : null,
        behavior ? [behavior.currentNode, board] : null, machine?.currentState ?? ''
      ]
    }),
    connections: [...connections].sort(/* 调用 a.uuid.localeCompare(b.uuid) 并返回调用结果。 */ (a, b) => a.uuid.localeCompare(b.uuid)).map(/** 结构说明（自动提取）：map 回调；输入 connection；直接调用 fixed、connection.ropeNodes.map；返回表达式求值结果。 */ connection => [connection.uuid, connection.enabled, connection.componentType, connection.breakState, connection.breakLink, fixed(connection.tension), fixed(connection.strain), connection.ropeNodes.map(/* 返回按声明顺序构造的数组 [fixed(node.position.x), fixed(node.position.y), fixed(node.velocity.x), fixed(node.velocity.y)]。 */ node => [fixed(node.position.x), fixed(node.position.y), fixed(node.velocity.x), fixed(node.velocity.y)])])
  })
}

/** Shared algorithm for explicit legacy arrays and fixed-World Owner capture. */
export function captureSimulationEvidenceIntoState(simulationEvidenceState: SimulationEvidenceState, frame: number, entities: readonly Entity[], connections: readonly Connection[], checksumPort: SimulationEvidenceChecksumPort): string {
  if (!simulationEvidenceState.enabled) return simulationEvidenceState.lastChecksum
  const checksum = computeSimulationStateChecksum(entities, connections, checksumPort); simulationEvidenceState.lastChecksum = checksum
  const existing = simulationEvidenceState.frames.find(/* 比较 item.frame 与 frame，返回严格相等的判断结果。 */ item => item.frame === frame)
  if (existing && existing.checksum !== checksum && simulationEvidenceState.divergentFrame < 0) simulationEvidenceState.divergentFrame = frame
  if (!existing && simulationEvidenceState.frames.length < MAX_EVIDENCE_FRAMES) simulationEvidenceState.frames.push({ frame, checksum })
  return checksum
}
export function clearSimulationEvidenceState(simulationEvidenceState: SimulationEvidenceState): void { simulationEvidenceState.frames.splice(0); simulationEvidenceState.lastChecksum = ''; simulationEvidenceState.divergentFrame = -1 }

export class SimulationEvidenceOwner {
  constructor(readonly world: SimulationEvidenceWorld, readonly checksumPort: SimulationEvidenceChecksumPort, readonly state: SimulationEvidenceState = createInitialSimulationEvidenceState()) {
    if (!world || !Array.isArray(world.entities) || !Array.isArray(world.connections)) throw new Error('SIMULATION_EVIDENCE_WORLD_REQUIRED: Supply a fixed World.')
    if (!checksumPort || typeof checksumPort.blackboardSnapshot !== 'function' || !['shared-legacy-ai', 'fixed-world'].includes(checksumPort.scope)) throw new Error('SIMULATION_EVIDENCE_CHECKSUM_PORT_REQUIRED: Supply the real checksum blackboard port and its ownership scope.')
    if (checksumPort.scope === 'fixed-world' && checksumPort.world !== world) throw new Error('SIMULATION_EVIDENCE_CHECKSUM_WORLD_MISMATCH: The checksum port must belong to the same fixed World.')
  }
  captureSimulationEvidence(frame: number, entities: readonly Entity[] = this.world.entities, connections: readonly Connection[] = this.world.connections): string {
    if (entities !== this.world.entities || connections !== this.world.connections) throw new Error('SIMULATION_EVIDENCE_WORLD_ARRAY_MISMATCH: Capture only the fixed World entity and connection arrays.')
    return captureSimulationEvidenceIntoState(this.state, frame, entities, connections, this.checksumPort)
  }
  clearSimulationEvidence(): void { clearSimulationEvidenceState(this.state) }
}
