/** Optional host views for the existing script Owners; Runtime defaults remain plain. */
import { scriptDebugState, installScriptDebugStateAdapter, isScriptDebugStateAdapterInstalled } from './scriptDebug'
import { scriptProjectSettings, installScriptProjectSettingsAdapter, isScriptProjectSettingsAdapterInstalled } from './scriptSettings'
import { scriptHotReloadState, installScriptHotReloadStateAdapter, isScriptHotReloadStateAdapterInstalled } from './scriptHotReload'
import { scriptCoverageState, installScriptCoverageStateAdapter, isScriptCoverageStateAdapterInstalled } from './scriptCoverage'

export type ScriptStateAdapter = <T extends object>(target: T) => T
let installed = false

function assertUninstalledTargets(): void {
  if (isScriptDebugStateAdapterInstalled() || isScriptProjectSettingsAdapterInstalled()
    || isScriptHotReloadStateAdapterInstalled() || isScriptCoverageStateAdapterInstalled()) {
    throw new Error('Script state aggregate installation cannot follow an independent module bootstrap')
  }
}

/** Trusted synchronous host factory: wrap the same targets without mutation, cloning or awaits. */
export function installScriptStateAdapter(adapter: ScriptStateAdapter): void {
  if (installed) return
  assertUninstalledTargets()
  // Construction may throw. No live binding changes until every view has been validated.
  const debug = adapter(scriptDebugState), settings = adapter(scriptProjectSettings)
  const hotReload = adapter(scriptHotReloadState), coverage = adapter(scriptCoverageState)
  for (const view of [debug, settings, hotReload, coverage]) {
    if (!view || typeof view !== 'object') throw new TypeError('Script state adapter must wrap all four existing object targets')
  }
  assertUninstalledTargets()
  // These callbacks only return staged values; the commits contain no user code or awaits.
  installScriptDebugStateAdapter(() => debug)
  installScriptProjectSettingsAdapter(() => settings)
  installScriptHotReloadStateAdapter(() => hotReload)
  installScriptCoverageStateAdapter(() => coverage)
  installed = true
}
