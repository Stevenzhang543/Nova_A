/** Fixed-Catalog CPU media composition. No default Editor state, Renderer Owner or second Coordinator. */
import { RuntimeMediaBinding } from '../runtime/runtimeMediaBinding'
import { createRuntimePrefabReader } from '../runtime/runtimePrefabReader'
import { createRuntimeResourceReader } from '../runtime/resourceValues'
import { createWebMediaPorts } from './webMediaPorts'
import type { RuntimeMediaClock } from '../runtime/runtimeSceneMediaRequirements'
import type { RuntimeMediaPorts } from '../runtime/runtimeMediaOwner'
import type { AssetRecord } from '../runtime/runtimeAssetRecordContracts'
import type { CatalogReadonly, RuntimeProjectCatalog } from '../runtime/runtimeProjectCatalog'
import type { RendererAssetSource } from '../renderer/RendererEnvironment'
import type { TileResourcePorts } from '../runtime/tileMapOwner'
import type { TileSetDocument } from '../runtime/tileSetValues'
import type { BudgetedWorkScheduler } from '../runtime/performance/workScheduler'

export function createRuntimeWorldMediaPlatformAdapter(catalog: RuntimeProjectCatalog<AssetRecord>, options: {
  clock: RuntimeMediaClock
  mediaPorts?: RuntimeMediaPorts
  scheduler?: BudgetedWorkScheduler
  /** Inject the existing actual imported-Tiled reader; no new parser or Editor global fallback. */
  resolveImportedTileSet(asset: CatalogReadonly<AssetRecord>, records: readonly CatalogReadonly<AssetRecord>[], catalogIdentity: object): TileSetDocument
}) {
  if (!options || typeof options.resolveImportedTileSet !== 'function') throw new Error('RUNTIME_MEDIA_IMPORTED_TILE_READER_REQUIRED')
  const imported = options.resolveImportedTileSet.bind(options)
  const binding = new RuntimeMediaBinding(catalog, options.mediaPorts ?? createWebMediaPorts(options.scheduler), options.clock)
  const readSource = (reference: string | null | undefined) => { binding.assertCurrent(); return catalog.readDependencyText(reference) }
  const prefab = createRuntimePrefabReader({ resolveAsset: binding.resolveAsset.bind(binding), readSource })
  const resources = createRuntimeResourceReader({ listIdentities: () => { binding.assertCurrent(); return catalog.listIdentities() } })
  const rendererAssets: RendererAssetSource = Object.freeze({
    get generation() { binding.assertCurrent(); return binding.media.state.generation + binding.media.textureContentRevision() },
    get atlasPageCount() { binding.assertCurrent(); return binding.media.state.atlasPages.length },
    resolveTexture: binding.resolveTexture.bind(binding), readMaterialSource: binding.readMaterialSource.bind(binding)
  })
  const tileResources: TileResourcePorts = Object.freeze({
    get generation() { binding.assertCurrent(); return binding.revision },
    textureContentRevision() { binding.assertCurrent(); return binding.media.textureContentRevision() },
    resolveAsset: binding.resolveAsset.bind(binding), readTextAsset: readSource,
    resolveTextureRegion: binding.resolveTextureRegion.bind(binding),
    resolveImportedTileSet(asset: Parameters<TileResourcePorts['resolveImportedTileSet']>[0]) { binding.assertCurrent(); const actual = catalog.resolveAsset(asset.uuid); if (!actual || actual !== asset) throw new Error('RUNTIME_MEDIA_TILE_CATALOG_MISMATCH'); return imported(actual, catalog.listIdentities(), catalog) }
  })
  return Object.freeze({ catalog, binding, rendererAssets, tileResources, fontMetadata: binding.fontMetadata.bind(binding), readPrefab: prefab, resourceReader: resources, dispose: binding.dispose.bind(binding) })
}
