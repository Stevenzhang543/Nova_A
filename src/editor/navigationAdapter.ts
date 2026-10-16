/** Actual Editor resources/policy and one original Bake raw view; no Owner cache. */
import { reactive, toRaw } from 'vue'
import {editorTileResources} from './tileMapAdapter'
import {transformNormalizedTilePoint} from '../runtime/tileMapOwner'
import { performanceRuntimeSettings, performanceRuntimeState } from '../runtime/largeWorldPerformance'
import { NavigationOwner, createNavigationDiagnosticLease, type NavigationCapabilities, type NavigationWorld } from '../runtime/navigationOwner'
import { getLegacyNavigationRawDiagnostics, installLegacyNavigationPort } from '../runtime/navigation2d'
const raw = getLegacyNavigationRawDiagnostics(), bakeStateView = reactive(raw.bakeState)
const legacyDiagnosticLease = createNavigationDiagnosticLease()
const tileCapabilities = {readTileSet:(reference:string|null|undefined)=>editorTileResources().readTileSet(reference),transformNormalizedTilePoint}
/** Instance caching stays only in the WGO composition. */
export function createEditorNavigationOwner(world: NavigationWorld, options: { legacyRoot: boolean }): NavigationOwner {
  const counters = options.legacyRoot ? {
    get spatialEntries() { return performanceRuntimeState.spatialEntries },
    set spatialEntries(value: number) { performanceRuntimeState.spatialEntries = value }
  } : { spatialEntries: 0 }
  const capabilities: NavigationCapabilities = {
    tile: tileCapabilities, nowMilliseconds: () => performance.now(),
    scheduleMacrotask: (callback, delayMs) => setTimeout(callback, delayMs),
    settings: { get frameWorkBudgetMs() { return performanceRuntimeSettings.frameWorkBudgetMs } }, counters
  }
  return options.legacyRoot ? new NavigationOwner(world, capabilities, { navigationDebugPaths: raw.navigationDebugPaths, profile: raw.profile, bakeState: bakeStateView }, legacyDiagnosticLease) : new NavigationOwner(world, capabilities)
}
/** Registration does not invoke the getter or read the Editor World. */
export function installEditorNavigationOwnerProvider(getOwner: () => NavigationOwner): void {
  installLegacyNavigationPort({ bakeStateView, unwrapState: toRaw, getOwner, tileCapabilities })
}
