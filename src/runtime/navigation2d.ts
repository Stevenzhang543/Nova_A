/** Pure legacy facade. Editor installs the original raw view and lazy fixed Owner. */
import type { Entity } from '../world/Entity'
import type { Vec2 } from '../world/types'
import { createInitialNavigationDiagnostics, NavigationOwner, type NavigationGrid } from './navigationOwner'
import { installLegacyNavigationTileCapabilities, type NavigationTileCapabilities } from './navigationGeometry'
export { MAX_NAVIGATION_AGENTS, MAX_NAVIGATION_REPATHS_PER_TICK, MAX_NAVIGATION_AVOIDANCE_NEIGHBORS } from './navigationOwner'
export type { NavigationDebugPath } from './navigationOwner'
const legacyRaw = createInitialNavigationDiagnostics()
export const navigationDebugPaths = legacyRaw.navigationDebugPaths
export const navigationProfile = legacyRaw.profile
/** One wrap of the same raw only; Owner replacement never replaces this raw. */
export let navigationBakeState = legacyRaw.bakeState
export function getLegacyNavigationRawDiagnostics() { return legacyRaw }
export interface LegacyNavigationPort {
  readonly bakeStateView: typeof legacyRaw.bakeState
  unwrapState(value: typeof legacyRaw.bakeState): typeof legacyRaw.bakeState
  getOwner(): NavigationOwner
  readonly tileCapabilities: NavigationTileCapabilities
}
let legacyPort: LegacyNavigationPort | null = null
export function installLegacyNavigationPort(port: LegacyNavigationPort): void {
  if (legacyPort) { if (legacyPort === port) return; throw new Error('NAVIGATION_LEGACY_PORT_ALREADY_INSTALLED: Keep the unique Editor composition.') }
  if (typeof port?.getOwner !== 'function' || typeof port?.unwrapState !== 'function' || port.unwrapState(port.bakeStateView) !== legacyRaw.bakeState) throw new Error('NAVIGATION_LEGACY_VIEW_MISMATCH: Wrap the same original raw Bake state.')
  installLegacyNavigationTileCapabilities(port.tileCapabilities)
  navigationBakeState = port.bakeStateView; legacyPort = port
}
function requireLegacyNavigationOwner(): NavigationOwner {
  if (!legacyPort) throw new Error('NAVIGATION_LEGACY_PORT_REQUIRED: Install the actual Editor host or construct a pure fixed Owner.')
  const owner = legacyPort.getOwner()
  if (!(owner instanceof NavigationOwner) || owner.navigationDebugPaths !== navigationDebugPaths || owner.profile !== navigationProfile || legacyPort.unwrapState(owner.bakeState) !== legacyRaw.bakeState) throw new Error('NAVIGATION_LEGACY_OWNER_MISMATCH: Use the current single-root Owner and original raw view.')
  return owner
}
export function inspectNavigationCache(){ return requireLegacyNavigationOwner().inspectNavigationCache() }
export function bakeNavigationGrid(regionEntity: Entity, entities: Entity[], now = performance.now(), radius?: number): NavigationGrid | null { return requireLegacyNavigationOwner().bakeNavigationGrid(regionEntity, entities, now, radius) }
export function findNavigationPath(regionEntity: Entity, start: Vec2, goal: Vec2, entities: Entity[], agentRadius?: number, nowMilliseconds = performance.now()): Vec2[] { return requireLegacyNavigationOwner().findNavigationPath(regionEntity, start, goal, entities, agentRadius, nowMilliseconds) }
export function avoidanceSpatialCellSize(maximumExtent: number): number { return requireLegacyNavigationOwner().avoidanceSpatialCellSize(maximumExtent) }
export function updateNavigation(entities: Entity[], fixedDelta: number, nowSeconds: number): void { return requireLegacyNavigationOwner().updateNavigation(entities, fixedDelta, nowSeconds) }
export function clearNavigationData(regionUuid?: string): void { return requireLegacyNavigationOwner().clearNavigationData(regionUuid) }
export function rebakeNavigation(entities: Entity[]): { baked: number; cells: number; milliseconds: number } { return requireLegacyNavigationOwner().rebakeNavigation(entities) }
export function cancelNavigationBake(): boolean { return requireLegacyNavigationOwner().cancelNavigationBake() }
export async function requestNavigationBake(entities: Entity[]): Promise<{ baked: number; cells: number; milliseconds: number; cancelled: boolean; artifactHash: string }> { return requireLegacyNavigationOwner().requestNavigationBake(entities) }
export function navigationProfileSnapshot(): typeof navigationProfile { return requireLegacyNavigationOwner().navigationProfileSnapshot() }
export function resetNavigation(): void { return requireLegacyNavigationOwner().resetNavigation() }
export function shiftNavigationOrigin(offset: Vec2, entities: Entity[]): void { return requireLegacyNavigationOwner().shiftNavigationOrigin(offset, entities) }
