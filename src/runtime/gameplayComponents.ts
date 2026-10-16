/** Temporary single-root compatibility API. Pure callers use the composed fixed-World Owner. */
import type { Entity } from '../world/Entity'
import type { RuntimePhysicsEvent } from '../world/World'
import type { InputSnapshot } from './input'
import { createInitialGameplayComponentDiagnostics, type GameplayComponentDiagnostics, type GameplayEmit, type GameplaySpawn, type GameplayRemove } from './gameplayComponentsOwner'
import { requireLegacyWorldGameplayOwner } from './worldGameplay'
import { requireLegacyGameFlowOwner } from './gameFlow'
export { initializeGameplayEntities } from './gameplayComponentsOwner'
export type { GameplayComponentDiagnostics } from './gameplayComponentsOwner'

const rawDiagnostics = createInitialGameplayComponentDiagnostics()
export let gameplayComponentDiagnostics: GameplayComponentDiagnostics = rawDiagnostics
let diagnosticsViewInstalled = false
export function getLegacyGameplayComponentDiagnosticsRaw(): GameplayComponentDiagnostics { return rawDiagnostics }
export interface LegacyGameplayComponentDiagnosticsView { view: GameplayComponentDiagnostics; unwrap(view: GameplayComponentDiagnostics): GameplayComponentDiagnostics }
/** Same-raw view only: the existing WorldGameplay legacy provider owns composition.
 * Remove this facade/view port when all legacy callers receive explicit Owners. */
export function installLegacyGameplayComponentDiagnosticsView(port: LegacyGameplayComponentDiagnosticsView): void {
  if (!port || typeof port.unwrap !== 'function') throw new Error('GAMEPLAY_COMPONENTS_VIEW_REQUIRED: Supply the complete same-raw view port.')
  if (port.unwrap(port.view) !== rawDiagnostics) throw new Error('GAMEPLAY_COMPONENTS_SAME_RAW_REQUIRED: Wrap the original diagnostics.')
  if (diagnosticsViewInstalled) {
    if (port.view !== gameplayComponentDiagnostics) throw new Error('GAMEPLAY_COMPONENTS_VIEW_ALREADY_INSTALLED: Use the unique Editor view.')
    return
  }
  gameplayComponentDiagnostics = port.view; diagnosticsViewInstalled = true
}
function owner() { return requireLegacyWorldGameplayOwner().componentsOwner }
export function beginGameplayComponents(entities: readonly Entity[]): void { owner().beginGameplayComponents(entities) }
export function updateGameplayComponents(entities: readonly Entity[], input: InputSnapshot, fixedDelta: number, emit: GameplayEmit, spawn: GameplaySpawn, remove: GameplayRemove): void { owner().updateGameplayComponents(entities, input, fixedDelta, emit, spawn, remove) }
export function processGameplayContacts(events: readonly RuntimePhysicsEvent[], entities: readonly Entity[], emit: GameplayEmit, remove: GameplayRemove, addScore?: (value: number) => void): void {
  owner().processGameplayContacts(events, entities, emit, remove, addScore ?? (value => requireLegacyGameFlowOwner().addRuntimeScore(value)))
}
