/** Temporary single-root legacy API. Pure callers construct WorldGameplayOwner with real ports. */
import type { Entity } from '../world/Entity'
import type { Vec2 } from '../world/types'
import { createInitialWorldGameplayState, type WorldGameplayOwner, type WorldGameplayState, type WorldGameplayNavigationDebugPath, type WorldGameplayTileState } from './worldGameplayOwner'
export type { WorldGameplayState } from './worldGameplayOwner'
const rawState = createInitialWorldGameplayState()
export let worldGameplayState: WorldGameplayState = rawState
let ownerGetter: (() => WorldGameplayOwner) | null = null
export function getLegacyWorldGameplayRawState(): WorldGameplayState { return rawState }
export interface LegacyWorldGameplayPort { stateView: WorldGameplayState; unwrapState(state: WorldGameplayState): WorldGameplayState; getOwner(): WorldGameplayOwner }
/** Install only the same-raw view and lazy getter. Exit when Editor legacy callers
 * use explicit Owners; then remove this single-root registry, not its algorithms. */
export function installLegacyWorldGameplayPort(port: LegacyWorldGameplayPort): void {
  if (!port || typeof port.getOwner !== 'function' || typeof port.unwrapState !== 'function') throw new Error('WORLD_GAMEPLAY_LEGACY_PORT_REQUIRED: Supply the complete legacy port.')
  if (port.unwrapState(port.stateView) !== rawState) throw new Error('WORLD_GAMEPLAY_SAME_RAW_REQUIRED: Wrap the original legacy state.')
  if (ownerGetter) {
    if (port.stateView !== worldGameplayState || port.getOwner !== ownerGetter) throw new Error('WORLD_GAMEPLAY_LEGACY_PORT_ALREADY_INSTALLED: Use the unique Editor composition.')
    return
  }
  worldGameplayState = port.stateView; ownerGetter = port.getOwner
}
export function requireLegacyWorldGameplayOwner(): WorldGameplayOwner {
  if (!ownerGetter) throw new Error('WORLD_GAMEPLAY_LEGACY_PORT_REQUIRED: Install the Editor port or use an explicit Owner.')
  const owner = ownerGetter()
  if (!owner || owner.state !== worldGameplayState) throw new Error('WORLD_GAMEPLAY_SAME_RAW_REQUIRED: The legacy Owner must use the installed view.')
  return owner
}
export function serializeWorldGameplaySettings(): Record<string, unknown> { return requireLegacyWorldGameplayOwner().serializeWorldGameplaySettings() }
export function loadWorldGameplaySettings(value: unknown): void { requireLegacyWorldGameplayOwner().loadWorldGameplaySettings(value) }
export function queueCharacterMotion(entity: Entity, displacement: Vec2): boolean { return requireLegacyWorldGameplayOwner().queueCharacterMotion(entity, displacement) }
export function canUseCoyoteTime(entity: Entity): boolean { return requireLegacyWorldGameplayOwner().canUseCoyoteTime(entity) }
export function inspectStreamedScenes() { return requireLegacyWorldGameplayOwner().inspectStreamedScenes() }
export function shiftWorldOrigin(offset: Vec2): void { requireLegacyWorldGameplayOwner().shiftWorldOrigin(offset) }
export function beginWorldGameplay(emitSignal: (name: string, payload: unknown, target: string, source: string) => void, isCurrent: () => boolean = () => true): Promise<void> { return requireLegacyWorldGameplayOwner().beginWorldGameplay(emitSignal, isCurrent) }
export function beforeWorldPhysicsStep(fixedDelta: number, nowSeconds: number, frame: number, emitSignal: (name: string, payload: unknown, target: string, source: string) => void, requestSceneLoad: (scene: string) => void = () => {}): void { requireLegacyWorldGameplayOwner().beforeWorldPhysicsStep(fixedDelta, nowSeconds, frame, emitSignal, requestSceneLoad) }
export function finishWorldSceneTransition(): void { requireLegacyWorldGameplayOwner().finishWorldSceneTransition() }
export function retireWorldGameplayEntity(uuid: string): void { requireLegacyWorldGameplayOwner().retireWorldGameplayEntity(uuid) }
export function resetWorldGameplay(): void { requireLegacyWorldGameplayOwner().resetWorldGameplay() }
export function navigationPaths(): readonly WorldGameplayNavigationDebugPath[] { return requireLegacyWorldGameplayOwner().navigationPaths() }
export function tileSceneRuntimeSnapshot(): WorldGameplayTileState { return requireLegacyWorldGameplayOwner().tileSceneRuntimeSnapshot() }
