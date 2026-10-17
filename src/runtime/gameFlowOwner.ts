/** Per-World GameFlow Owner. Checkpoint UUID identity and original algorithms are retained. */
import type { Entity } from '../world/Entity'
import type { Health2D } from '../world/components'
import type { World, GlobalPhysicsSettings } from '../world/World'
import { finiteNumber } from '../world/geometry'
import { setWorldTransform, worldTransform } from '../world/hierarchy'

export interface CheckpointEntity { uuid: string; enabled: boolean; transform: ReturnType<typeof worldTransform>; health: number | null }
export interface RuntimeCheckpoint { name: string; sceneUuid: string; score: number; session: Record<string, unknown>; entities: CheckpointEntity[] }
export interface GameFlowState { paused: boolean; score: number; session: Record<string, unknown>; checkpoints: RuntimeCheckpoint[]; transitions: number; lastError: string }
export interface GameFlowSnapshot { paused: boolean; score: number; session: Record<string, unknown>; checkpoints: string[] }
export interface GameFlowOwnerHost {
  readonly world: Pick<World, 'entities' | 'invalidateRuntime'>
  readonly settings: Pick<GlobalPhysicsSettings, 'timeScale'>
  readonly activeSceneUuid: string
}

export function createInitialGameFlowState(): GameFlowState { return { paused: false, score: 0, session: {} as Record<string, unknown>, checkpoints: [] as RuntimeCheckpoint[], transitions: 0, lastError: '' } }

function safeValue(value: unknown): unknown {
  try { const text = JSON.stringify(value); return text.length <= 64_000 ? JSON.parse(text) : null } catch { return null }
}

/** A fixed World reference; the settings and scene getters remain live. No clock or lifecycle is started. */
export class GameFlowOwner {
  readonly world: GameFlowOwnerHost['world']
  private resumeScale = 1

  constructor(private readonly host: GameFlowOwnerHost, readonly state: GameFlowState = createInitialGameFlowState()) {
    if (!host?.world || !Array.isArray(host.world.entities) || typeof host.world.invalidateRuntime !== 'function') throw new Error("GAME_FLOW_WORLD_REQUIRED: Supply this Owner's fixed World.")
    this.world = host.world
  }

  /** Temporary Editor single-root bridge only: retain its shared view and pause history.
   * This creates a new fixed-World Owner; it is not an independent World factory.
   * Normal pure Core construction uses a fresh state and never calls this bridge. */
  rebindLegacySingleRootHost(host: GameFlowOwnerHost): GameFlowOwner {
    const rebound = new GameFlowOwner(host, this.state)
    rebound.resumeScale = this.resumeScale
    return rebound
  }

  resetGameFlow(): void {
  if (this.state.paused) this.host.settings.timeScale = this.resumeScale
  this.state.paused = false; this.state.score = 0; this.state.session = {}; this.state.checkpoints.splice(0); this.state.transitions = 0; this.state.lastError = ''; this.resumeScale = Math.max(.000001, finiteNumber(this.host.settings.timeScale, 1))
}

  setGamePaused(paused: boolean): void {
  if (paused === this.state.paused) return
  if (paused) { this.resumeScale = Math.max(.000001, finiteNumber(this.host.settings.timeScale, 1)); this.host.settings.timeScale = 0 }
  else this.host.settings.timeScale = this.resumeScale
  this.state.paused = paused
}

  setRuntimeScore(value: number): void { this.state.score = Math.min(1e15, Math.max(-1e15, finiteNumber(value))) }

  addRuntimeScore(value: number): void { this.setRuntimeScore(this.state.score + finiteNumber(value)) }

  setSessionValue(key: string, value: unknown): boolean {
    const clean = key.trim().slice(0, 80), safe = safeValue(value), session = this.state.session
    if (!clean || safe === null || Object.keys(session).length >= 512 && !Object.prototype.hasOwnProperty.call(session, clean)) return false
    if (clean === '__proto__') {
      // An own data key must survive JSON without invoking Object.prototype's setter.
      // Replace through the state field so the Editor's same-raw Vue view notifies watchers.
      const next = { ...session }
      Object.defineProperty(next, clean, { value: safe, writable: true, enumerable: true, configurable: true })
      this.state.session = next
    } else session[clean] = safe
    return true
  }

  setRuntimeCheckpoint(name: string, entities: readonly Entity[] = this.world.entities): boolean {
  const clean = name.trim().slice(0, 80); if (!clean) return false
  const checkpoint: RuntimeCheckpoint = { name: clean, sceneUuid: this.host.activeSceneUuid, score: this.state.score, session: safeValue(this.state.session) as Record<string, unknown>, entities: entities.slice(0, 10_000).map(/** 构造并返回记录 { uuid: entity.uuid, enabled: entity.enabled, transform: worldTransform(entity, entities), health: entity.getComponent<Health2D>('Health2D')?.current ?? null }，字段按当前实参及捕获状态求值。 */ entity => ({ uuid: entity.uuid, enabled: entity.enabled, transform: worldTransform(entity, entities), health: entity.getComponent<Health2D>('Health2D')?.current ?? null })) }
  const index = this.state.checkpoints.findIndex(/* 比较 item.name 与 clean，返回严格相等的判断结果。 */ item => item.name === clean)
  if (index >= 0) this.state.checkpoints.splice(index, 1, checkpoint); else { this.state.checkpoints.unshift(checkpoint); this.state.checkpoints.splice(32) }
  return true
}

  restoreRuntimeCheckpoint(name: string): boolean {
  const checkpoint = this.state.checkpoints.find(/* 比较 item.name 与 name.trim()，返回严格相等的判断结果。 */ item => item.name === name.trim())
  if (!checkpoint) { this.state.lastError = `Checkpoint not found: ${name}`; return false }
  if (checkpoint.sceneUuid !== this.host.activeSceneUuid) { this.state.lastError = `Checkpoint belongs to another scene: ${checkpoint.sceneUuid}`; return false }
  for (const item of checkpoint.entities) {
    const entity = this.world.entities.find(/* 比较 candidate.uuid 与 item.uuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === item.uuid); if (!entity) continue
    entity.enabled = item.enabled; setWorldTransform(entity, item.transform, this.world.entities)
    const health = entity.getComponent<Health2D>('Health2D'); if (health && item.health !== null) health.current = Math.min(health.maximum, Math.max(0, item.health))
  }
  this.setRuntimeScore(checkpoint.score); this.state.session = safeValue(checkpoint.session) as Record<string, unknown>; this.state.lastError = ''; this.world.invalidateRuntime(); return true
}

  gameFlowSnapshot(): { paused: boolean; score: number; session: Record<string, unknown>; checkpoints: string[] } { return { paused: this.state.paused, score: this.state.score, session: safeValue(this.state.session) as Record<string, unknown>, checkpoints: this.state.checkpoints.map(/* 返回 item.name 的当前值。 */ item => item.name) } }
}
