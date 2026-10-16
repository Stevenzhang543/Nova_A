/** Editor composition for the existing AssetDatabase; no global Runtime service registry. */
import { resolveRuntimeModuleAsset } from '../runtime/runtimeAssetValues'
import { assetState, readTextAsset, resolveAsset, updateTextAsset } from '../assets/AssetDatabase'
import { executableGraphSource } from '../visual/graphCompiler'
import type { GameplayScriptServices } from '../runtime/scriptServices'

export function createEditorGameplayScriptServices(): GameplayScriptServices {
  return {
    resolveAsset,
    resolveModuleAsset: reference => resolveRuntimeModuleAsset(reference, resolveAsset, assetState.records),
    readSource: readTextAsset,
    revision: () => assetState.generation,
    listIdentities: () => assetState.records,
    compileVisual: executableGraphSource,
    writeSource: updateTextAsset,
    recordBreakpointHit: (uuid, index, breakpoint) => {
      const point = resolveAsset(uuid)?.script?.breakpointDetails[index]
      if (!point || point.id !== breakpoint.id || point.line !== breakpoint.line || point.hitCount !== breakpoint.hitCount) throw new Error('Script breakpoint authoring identity changed before its hit was recorded.')
      point.hitCount = Math.min(1_000_000_000, point.hitCount + 1)
      return point.hitCount
    }
  }
}
