/** Editor host wiring for the standalone renderer core. No graphics implementation lives here. */
import { assetState, readTextAsset, resolveAsset, getEditorMediaOwner } from '../assets/AssetDatabase'
import { createRenderer2D as createCoreRenderer, type RendererEnvironment } from '../renderer/core'
import { activePostProcessing, activeRenderQuality, renderingSettings, updateActivePostProcess, updateActiveRenderQuality } from '../renderer/renderSettings'
import { reportRendererCreated, reportRendererContextLost, reportRendererContextRestored, requestRendererReset } from '../renderer/capabilities'
import { performanceCoordinator } from '../runtime/performance/services'
import { installMigrationSceneRendererEnvironment, type SceneRendererEnvironment } from '../renderer/SceneRendererEnvironment'
import { installMigrationLightingEnvironment, type LightingEnvironment } from '../renderer/LightingEnvironment'
import type {TileMapOwner} from '../runtime/tileMapOwner'
import {getEditorTileMapOwner} from './tileMapAdapter'
import {physicsState} from '../store/physics'
import { RuntimeParticleOwner, type ParticleWorld } from '../runtime/particleOwner'
import { getEditorParticleOwner } from './particleAdapter'
import { deformSkin } from '../runtime/rigging'
import { createGpuDiagnosticsBudgetOwner, type GpuDiagnosticsMode } from '../renderer/GpuDiagnosticsBudget'

export { RendererCanvasReplacementRequired } from '../renderer/core'
export type { Renderer2D } from '../renderer/core'

export interface RendererRecoveryOwner { readonly attempts: number; requestRebuild(reason: string): void; submissionFault(reason: string): void; dispose(): void }

/** One viewport owns this across canvas remounts. Persistent failures get two automatic retries. */
export function createRendererRecoveryOwner(requestReset = requestRendererReset): RendererRecoveryOwner {
  let attempts = 0, disposed = false, pending: ReturnType<typeof setTimeout> | null = null
  const schedule = (reason: string, fault: boolean) => {
    if (disposed || pending !== null || attempts >= 3) return
    attempts++
    if (fault) console.error('Nova_A GPU submission suspended:', reason)
    else console.warn('Nova_A renderer recovery:', reason)
    if (attempts > 2) return
    // Finish the current surface/overlay pair before its Owner remounts the canvas.
    pending = setTimeout(() => { pending = null; if (!disposed) requestReset() }, 0)
  }
  return {
    get attempts() { return attempts },
    requestRebuild: reason => schedule(reason, false),
    submissionFault: reason => schedule(reason, true),
    dispose() { disposed = true; if (pending !== null) clearTimeout(pending); pending = null }
  }
}

const legacyRecoveryOwner = createRendererRecoveryOwner()
const gpuDiagnosticsOwner = createGpuDiagnosticsBudgetOwner()

/** Host/Profiler preference bridge only; Coordinator credit and quality policy stay independent. */
export function setEditorRendererGpuDiagnosticsMode(mode: GpuDiagnosticsMode): void { gpuDiagnosticsOwner.setMode(mode) }

const editorAssets: RendererEnvironment['assets'] = {
  get generation() { return assetState.generation },
  get atlasPageCount() { return assetState.atlasPages.length },
  resolveTexture:(...args)=>getEditorMediaOwner().resolveTexture(...args),
  readMaterialSource(reference) { const asset = resolveAsset(reference); return asset?.assetType === 'material' ? readTextAsset(asset.uuid) : null }
}

const sceneEnvironment: SceneRendererEnvironment = {
  settings: renderingSettings,
  assets: editorAssets,
  assetKind(reference) { return resolveAsset(reference)?.assetType ?? null },
  fontMetadata(reference) { return getEditorMediaOwner().fontMetadata(reference) },
  publishPostProcess: updateActivePostProcess,
  publishRenderQuality: updateActiveRenderQuality,
  tileChunkCommands:(...args)=>getEditorTileMapOwner(physicsState.world).tileChunkCommands(...args),
  submitParticles(renderer, entities, sourceEntities) { const particles=getEditorParticleOwner();if((sourceEntities??entities)!==particles.world.entities)throw new Error('PARTICLE_RENDER_WORLD_MISMATCH');particles.submit(renderer, entities) },
  deformSkin
}

// Identity metadata only; particle state remains exclusively inside its fixed-World Owner.
const sceneParticleOwners=new WeakMap<SceneRendererEnvironment,()=>RuntimeParticleOwner>()

/** Editor Preview/Play pass this same service owner explicitly. No secondary caches or simulation. */
export function editorSceneRendererEnvironment(tile?:()=>TileMapOwner,particles?:()=>RuntimeParticleOwner): SceneRendererEnvironment {
  if(!tile&&!particles)return sceneEnvironment
  if(particles&&typeof particles!=='function')throw new Error('PARTICLE_RENDER_OWNER_REQUIRED')
  const environment:SceneRendererEnvironment={...sceneEnvironment,...(tile?{tileChunkCommands:(...args:Parameters<TileMapOwner['tileChunkCommands']>)=>tile().tileChunkCommands(...args)}:{}),...(particles?{submitParticles(renderer:Parameters<SceneRendererEnvironment['submitParticles']>[0],entities:Parameters<SceneRendererEnvironment['submitParticles']>[1],sourceEntities?:Parameters<SceneRendererEnvironment['submitParticles']>[2]){const owner=particles();if(!(owner instanceof RuntimeParticleOwner))throw new Error('PARTICLE_RENDER_OWNER_REQUIRED');if((sourceEntities??entities)!==owner.world.entities)throw new Error('PARTICLE_RENDER_WORLD_MISMATCH');owner.submit(renderer,entities)}}:{})}
  if(particles)sceneParticleOwners.set(environment,particles)
  return environment
}

// Complete migration bridge for old authoring callers only; see its documented removal conditions.
installMigrationSceneRendererEnvironment(sceneEnvironment)

const lightingEnvironment: LightingEnvironment = {
  settings: renderingSettings, postProcessing: activePostProcessing, renderQuality: activeRenderQuality,
  assets: editorAssets, scene: sceneEnvironment
}

/** Same policy, asset owner and single lighting cache for Editor Preview/Play. */
export function editorLightingEnvironment(scene:SceneRendererEnvironment=sceneEnvironment,world?:ParticleWorld): LightingEnvironment {
  if(world){const provider=sceneParticleOwners.get(scene),particles=provider?provider():getEditorParticleOwner();if(!(particles instanceof RuntimeParticleOwner)||particles.world!==world)throw new Error('PARTICLE_LIGHTING_WORLD_MISMATCH')}
  return scene===sceneEnvironment?lightingEnvironment:{...lightingEnvironment,scene}
}
installMigrationLightingEnvironment(lightingEnvironment)

export function editorRendererEnvironment(recoveryOwner: RendererRecoveryOwner = legacyRecoveryOwner): RendererEnvironment {
  return {
    settings: renderingSettings,
    postProcessing: activePostProcessing,
    assets: editorAssets,
    rendererCreated: reportRendererCreated,
    contextLost: reportRendererContextLost,
    contextRestored() { reportRendererContextRestored(); recoveryOwner.requestRebuild('WebGL context restored; rebuild resource ownership') },
    submissionCreditLimit: () => performanceCoordinator.snapshot.gpuSubmissionCreditLimit,
    gpuDiagnosticsBudget: () => gpuDiagnosticsOwner.snapshot,
    submissionFault: reason => recoveryOwner.submissionFault(reason)
  }
}

export function createRenderer2D(canvas: HTMLCanvasElement, canvas2dOnly = false, recoveryOwner: RendererRecoveryOwner = legacyRecoveryOwner) { return createCoreRenderer(canvas, canvas2dOnly, editorRendererEnvironment(recoveryOwner)) }
