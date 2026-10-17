/** Temporary legacy entry: one explicitly installed Editor view/Owner. Pure callers use GameFlowOwner. */
import type { Entity } from '../world/Entity'
import { createInitialGameFlowState, type GameFlowOwner, type GameFlowState, type GameFlowSnapshot } from './gameFlowOwner'
export type { GameFlowState, GameFlowSnapshot } from './gameFlowOwner'

const rawState = createInitialGameFlowState()
export let gameFlowState: GameFlowState = rawState
let ownerGetter: (() => GameFlowOwner) | null = null

export function getLegacyGameFlowRawState(): GameFlowState { return rawState }
export interface LegacyGameFlowPort {
  stateView: GameFlowState
  unwrapState(state: GameFlowState): GameFlowState
  getOwner(): GameFlowOwner
}

/** Install a same-raw view and a lazy provider; no World access or lifecycle runs here.
 * Exit: migrate remaining Editor legacy callers to explicit Owners, then remove this registry/export bridge. */
export function installLegacyGameFlowPort(port: LegacyGameFlowPort): void {
  if (!port || typeof port.getOwner !== 'function' || typeof port.unwrapState !== 'function') throw new Error('GAME_FLOW_LEGACY_PORT_REQUIRED: Supply the complete legacy host port.')
  if (port.unwrapState(port.stateView) !== rawState) throw new Error('GAME_FLOW_SAME_RAW_REQUIRED: The legacy view must wrap the original state.')
  if (ownerGetter) {
    if (port.stateView !== gameFlowState || port.getOwner !== ownerGetter) throw new Error('GAME_FLOW_LEGACY_PORT_ALREADY_INSTALLED: Use the unique Editor composition or reload the host.')
    return
  }
  gameFlowState = port.stateView
  ownerGetter = port.getOwner
}

export function requireLegacyGameFlowOwner(): GameFlowOwner {
  if (!ownerGetter) throw new Error('GAME_FLOW_LEGACY_PORT_REQUIRED: Install the Editor port or pass an explicit GameFlow Owner.')
  const owner = ownerGetter()
  if (!owner || owner.state !== gameFlowState) throw new Error('GAME_FLOW_SAME_RAW_REQUIRED: The legacy Owner must use the installed view.')
  return owner
}

export function resetGameFlow(): void { requireLegacyGameFlowOwner().resetGameFlow() }
export function setGamePaused(paused: boolean): void { requireLegacyGameFlowOwner().setGamePaused(paused) }
export function setRuntimeScore(value: number): void { requireLegacyGameFlowOwner().setRuntimeScore(value) }
export function addRuntimeScore(value: number): void { requireLegacyGameFlowOwner().addRuntimeScore(value) }
export function setSessionValue(key: string, value: unknown): boolean { return requireLegacyGameFlowOwner().setSessionValue(key, value) }
export function setRuntimeCheckpoint(name: string, entities?: readonly Entity[]): boolean { return requireLegacyGameFlowOwner().setRuntimeCheckpoint(name, entities) }
export function restoreRuntimeCheckpoint(name: string): boolean { return requireLegacyGameFlowOwner().restoreRuntimeCheckpoint(name) }
export function gameFlowSnapshot(): GameFlowSnapshot { return requireLegacyGameFlowOwner().gameFlowSnapshot() }
