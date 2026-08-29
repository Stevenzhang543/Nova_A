import { reactive } from 'vue'
import { physicsState, sceneManager } from '../store/physics'
import type { Entity } from '../world/Entity'
import type { Health2D } from '../world/components'
import { finiteNumber } from '../world/geometry'
import { setWorldTransform, worldTransform } from '../world/hierarchy'

interface CheckpointEntity { uuid: string; enabled: boolean; transform: ReturnType<typeof worldTransform>; health: number | null }
interface RuntimeCheckpoint { name: string; sceneUuid: string; score: number; session: Record<string, unknown>; entities: CheckpointEntity[] }

export const gameFlowState = reactive({ paused: false, score: 0, session: {} as Record<string, unknown>, checkpoints: [] as RuntimeCheckpoint[], transitions: 0, lastError: '' })
let resumeScale = 1

function safeValue(value: unknown): unknown {
  try { const text = JSON.stringify(value); return text.length <= 64_000 ? JSON.parse(text) : null } catch { return null }
}

export function resetGameFlow(): void {
  if (gameFlowState.paused) physicsState.globalSettings.timeScale = resumeScale
  gameFlowState.paused = false; gameFlowState.score = 0; gameFlowState.session = {}; gameFlowState.checkpoints.splice(0); gameFlowState.transitions = 0; gameFlowState.lastError = ''; resumeScale = Math.max(.000001, finiteNumber(physicsState.globalSettings.timeScale, 1))
}

export function setGamePaused(paused: boolean): void {
  if (paused === gameFlowState.paused) return
  if (paused) { resumeScale = Math.max(.000001, finiteNumber(physicsState.globalSettings.timeScale, 1)); physicsState.globalSettings.timeScale = 0 }
  else physicsState.globalSettings.timeScale = resumeScale
  gameFlowState.paused = paused
}

export function setRuntimeScore(value: number): void { gameFlowState.score = Math.min(1e15, Math.max(-1e15, finiteNumber(value))) }
export function addRuntimeScore(value: number): void { setRuntimeScore(gameFlowState.score + finiteNumber(value)) }
export function setSessionValue(key: string, value: unknown): boolean { const clean = key.trim().slice(0, 80), safe = safeValue(value); if (!clean || safe === null || Object.keys(gameFlowState.session).length >= 512 && !(clean in gameFlowState.session)) return false; gameFlowState.session[clean] = safe; return true }

export function setRuntimeCheckpoint(name: string, entities: readonly Entity[] = physicsState.world.entities): boolean {
  const clean = name.trim().slice(0, 80); if (!clean) return false
  const checkpoint: RuntimeCheckpoint = { name: clean, sceneUuid: sceneManager.activeSceneUuid, score: gameFlowState.score, session: safeValue(gameFlowState.session) as Record<string, unknown>, entities: entities.slice(0, 10_000).map(entity => ({ uuid: entity.uuid, enabled: entity.enabled, transform: worldTransform(entity, entities), health: entity.getComponent<Health2D>('Health2D')?.current ?? null })) }
  const index = gameFlowState.checkpoints.findIndex(item => item.name === clean)
  if (index >= 0) gameFlowState.checkpoints.splice(index, 1, checkpoint); else { gameFlowState.checkpoints.unshift(checkpoint); gameFlowState.checkpoints.splice(32) }
  return true
}

export function restoreRuntimeCheckpoint(name: string): boolean {
  const checkpoint = gameFlowState.checkpoints.find(item => item.name === name.trim())
  if (!checkpoint) { gameFlowState.lastError = `Checkpoint not found: ${name}`; return false }
  if (checkpoint.sceneUuid !== sceneManager.activeSceneUuid) { gameFlowState.lastError = `Checkpoint belongs to another scene: ${checkpoint.sceneUuid}`; return false }
  for (const item of checkpoint.entities) {
    const entity = physicsState.world.entities.find(candidate => candidate.uuid === item.uuid); if (!entity) continue
    entity.enabled = item.enabled; setWorldTransform(entity, item.transform, physicsState.world.entities)
    const health = entity.getComponent<Health2D>('Health2D'); if (health && item.health !== null) health.current = Math.min(health.maximum, Math.max(0, item.health))
  }
  setRuntimeScore(checkpoint.score); gameFlowState.session = safeValue(checkpoint.session) as Record<string, unknown>; gameFlowState.lastError = ''; physicsState.world.invalidateRuntime(); return true
}

export function gameFlowSnapshot(): { paused: boolean; score: number; session: Record<string, unknown>; checkpoints: string[] } { return { paused: gameFlowState.paused, score: gameFlowState.score, session: safeValue(gameFlowState.session) as Record<string, unknown>, checkpoints: gameFlowState.checkpoints.map(item => item.name) } }
