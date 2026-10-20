/** 26.43 P-E2：独立播放器的渲染环境（渲染器、场景、光照），全部由本次运行的 Owner 提供，不读编辑器单例。 */
import { RuntimeRiggingOwner } from '../runtimeRiggingOwner'
import { RuntimeParticleOwner } from '../particleOwner'
import { performanceCoordinator } from '../performance/services'
import { createGpuDiagnosticsBudgetOwner } from '../../renderer/GpuDiagnosticsBudget'
import type { RuntimeRenderingPolicyOwner } from '../../renderer/runtimeRenderingPolicyOwner'
import type { RendererAssetSource, RendererEnvironment } from '../../renderer/RendererEnvironment'
import type { SceneRendererEnvironment } from '../../renderer/SceneRendererEnvironment'
import type { LightingEnvironment } from '../../renderer/LightingEnvironment'
import type { RuntimeWorldHost } from '../runtimeWorldHost'
import type { RuntimeProjectCatalog } from '../runtimeProjectCatalog'
import type { AssetRecord } from '../runtimeAssetRecordContracts'
import type { RuntimeWorldSurface } from '../runtimeWorldHostContracts'

export interface PlayerRendererEvents {
  /** WebGL2 or Canvas2D was created; requested path is the project's renderer choice. */
  created(backend: 'WebGL2' | 'Canvas2D'): void
  /** The context was lost, or a GPU submission failed: the view rebuilds its renderer. */
  rebuild(reason: string): void
}

export interface PlayerSurface extends RuntimeWorldSurface { readonly rigging: RuntimeRiggingOwner; dispose(): void }

export function createPlayerSurface(host: RuntimeWorldHost, catalog: RuntimeProjectCatalog<AssetRecord>, rendering: RuntimeRenderingPolicyOwner, assets: RendererAssetSource, fontMetadata: SceneRendererEnvironment['fontMetadata'], events: PlayerRendererEvents): PlayerSurface {
  const { renderingSettings, activePostProcessing, activeRenderQuality } = rendering.state
  const rigging = new RuntimeRiggingOwner({ identity: catalog, projectId: catalog.projectId, revision: () => catalog.revision(), resolveAsset: reference => catalog.resolveAsset(reference), readTextAsset: reference => catalog.readDependencyText(reference) })
  const gpuDiagnostics = createGpuDiagnosticsBudgetOwner()
  const scene: SceneRendererEnvironment = {
    settings: renderingSettings,
    assets,
    assetKind: reference => catalog.resolveAsset(reference)?.assetType ?? null,
    fontMetadata,
    publishPostProcess: position => { rendering.updateActivePostProcess(position) },
    publishRenderQuality: position => { rendering.updateActiveRenderQuality(position) },
    tileChunkCommands: (...args) => host.tileMap.tileChunkCommands(...args),
    submitParticles(renderer, entities, sourceEntities) {
      const particles = host.particleOwner
      if (!(particles instanceof RuntimeParticleOwner) || (sourceEntities ?? entities) !== particles.world.entities) throw new Error('PARTICLE_RENDER_WORLD_MISMATCH')
      particles.submit(renderer, entities)
    },
    deformSkin: (entity, sprite) => rigging.deformSkin(entity, sprite)
  }
  const lighting: LightingEnvironment = { settings: renderingSettings, postProcessing: activePostProcessing, renderQuality: activeRenderQuality, assets, scene }
  const renderer: RendererEnvironment = {
    settings: renderingSettings, postProcessing: activePostProcessing, assets,
    rendererCreated: backend => events.created(backend),
    contextLost: () => undefined,
    contextRestored: () => events.rebuild('WebGL context restored'),
    submissionCreditLimit: () => performanceCoordinator.snapshot.gpuSubmissionCreditLimit,
    gpuDiagnosticsBudget: () => gpuDiagnostics.snapshot,
    // The view bounds how often it rebuilds; every fault is reported so a later one is not lost.
    submissionFault: reason => events.rebuild(reason)
  }
  return {
    renderer, scene, lighting, rigging,
    dispose() { rigging.dispose() }
  }
}
