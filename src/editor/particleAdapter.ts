/** One Editor composition per actual fixed World; shared textures are retained, state is not. */
import {reactive,toRaw} from 'vue'
import {physicsState} from '../store/physics'
import {assetState,resolveTexture} from '../assets/AssetDatabase'
import {activeRenderQuality} from '../renderer/renderSettings'
import {StableComponentScheduler,performanceRuntimeState} from '../runtime/largeWorldPerformance'
import {RuntimeParticleOwner,createInitialParticleDiagnostics,type ParticleWorld} from '../runtime/particleOwner'
import {getLegacyParticleDiagnosticsRaw,installLegacyParticlePort} from '../runtime/particles'
const view=reactive(getLegacyParticleDiagnosticsRaw())
const owners=new WeakMap<ParticleWorld,RuntimeParticleOwner>()
let legacy:RuntimeParticleOwner|null=null
const resources={get generation(){return assetState.generation},resolveTexture}
export function createEditorParticleOwner(world:ParticleWorld,options:{legacyRoot:boolean}):RuntimeParticleOwner{
 if(options.legacyRoot&&(world as unknown)!==toRaw(physicsState.world))throw new Error('PARTICLE_LEGACY_ROOT_REQUIRED')
 const cached=owners.get(world)
 if(cached&&!cached.isDisposed){if(options.legacyRoot&&cached.diagnostics!==view)throw new Error('PARTICLE_LEGACY_VIEW_MISMATCH');return cached}
 if(options.legacyRoot&&legacy&&legacy.world!==world)legacy.dispose()
 const scheduler=new StableComponentScheduler()
 const owner=new RuntimeParticleOwner(world,{resources,
  readBudget:()=>({particleBudget:activeRenderQuality.particleBudget,adaptiveParticleScale:performanceRuntimeState.adaptiveParticleScale}),
  emitterIndices(entities){if(entities!==world.entities)throw new Error('PARTICLE_INDEX_WORLD_MISMATCH');scheduler.synchronize(entities);return scheduler.indices('ParticleEmitter2D')},
  nowMs:()=>performance.now()},options.legacyRoot?view:reactive(createInitialParticleDiagnostics()))
 owners.set(world,owner);if(options.legacyRoot)legacy=owner
 return owner
}
export function getEditorParticleOwner():RuntimeParticleOwner{return createEditorParticleOwner(toRaw(physicsState.world),{legacyRoot:true})}
installLegacyParticlePort({diagnostics:view,unwrap:toRaw,getOwner:getEditorParticleOwner})
