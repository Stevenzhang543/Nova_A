/** Actual Editor capabilities and the unique same-raw legacy view; no Owner cache. */
import { reactive, toRaw } from 'vue'
import { resolveAsset, readTextAsset } from '../assets/AssetDatabase'
import type { GraphDebugOwner } from '../runtime/graphDebugOwner'
import { recordScriptFunction } from '../runtime/profiler'
import { AiOwner, type AiWorld, type AiCapabilities } from '../runtime/aiOwner'
import { getLegacyAiRawDiagnostics, installLegacyAiPort } from '../runtime/aiTools'

const stateView = reactive(getLegacyAiRawDiagnostics())
const capabilities: Omit<AiCapabilities, 'recordGraphError' | 'recordGraphTrace'> = { resolveAsset, readTextAsset, recordScriptFunction, nowMilliseconds: () => performance.now() }
/** The WGO composition owns instance caching. A new World gets a new fixed instance. */
export function createEditorAiOwner(world: AiWorld, options: { legacyRoot: boolean }, graphDebug: Pick<GraphDebugOwner, 'world' | 'recordGraphError' | 'recordGraphTrace'>): AiOwner {
  if (!graphDebug || graphDebug.world !== world || typeof graphDebug.recordGraphError !== 'function' || typeof graphDebug.recordGraphTrace !== 'function') throw new Error('AI_GRAPH_DEBUG_WORLD_MISMATCH: Supply this World graph recorder.')
  const ownerCapabilities: AiCapabilities = { ...capabilities, recordGraphError: graphDebug.recordGraphError.bind(graphDebug), recordGraphTrace: graphDebug.recordGraphTrace.bind(graphDebug) }
  return options.legacyRoot ? new AiOwner(world, ownerCapabilities, stateView) : new AiOwner(world, ownerCapabilities)
}
/** No callback execution, World lookup, watcher, timer or scheduler is created. */
export function installEditorAiOwnerProvider(getOwner: () => AiOwner): void {
  installLegacyAiPort({ stateView, unwrapState: toRaw, getOwner })
}
