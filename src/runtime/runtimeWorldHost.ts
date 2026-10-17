/** One concrete Gameplay host. Algorithms stay in their already qualified Owners. */
import type { Entity } from '../world/Entity'
import { createEntityBuilder } from '../world/entityBuilder'
import { readEntityAuthoringData } from '../world/entitySerialization'
import { deleteEntitySubtreeInWorld } from '../world/entityRemoval'
import type { GameplayWorldHost, GameplayWorldState } from './gameplayWorldHost'
import { ScriptDebugOwner } from './scriptDebugOwner'
import { ScriptHotReloadOwner } from './scriptHotReloadOwner'
import { GraphDebugOwner } from './graphDebugOwner'
import type { GameplayScriptServices } from './scriptServices'
import { WorldGameplayOwner } from './worldGameplayOwner'
import { EntityLifetimeOwner } from './entityLifetimes'
import { StreamLifecycleOwner } from './streamLifecycle'
import { NavigationOwner } from './navigationOwner'
import { WorldStreamingOwner } from './worldStreamingOwner'
import { RuntimeSceneStreaming } from './runtimeSceneStreaming'
import { TileMapOwner, TileSetResourceOwner, transformNormalizedTilePoint } from './tileMapOwner'
import { RuntimeSceneInstantiator } from './runtimeSceneInstantiator'
import { RuntimeSceneOwner } from './runtimeSceneOwner'
import { createRuntimePrefabReader } from './runtimePrefabReader'
import { serializeEntity } from '../world/entitySerialization'
import { AiOwner } from './aiOwner'
import { SimulationEvidenceOwner } from './simulationEvidenceOwner'
import { RuntimeParticleOwner } from './particleOwner'
import { StableComponentScheduler } from './largeWorldPerformance'
import { RuntimePresentationOwner } from './presentationOwner'
import { ReplayOwner } from './replayOwner'
import { ProductionNetworkOwner } from './productionNetworkOwner'
import { NetworkSessionOwner } from './networkSessionOwner'
import { MultiplayerReplayOwner } from './multiplayerReplayOwner'
import { RuntimeAudioOwner } from './audioOwner'
import { createAudioResourceReader } from './audioResourceReader'
import type { AudioResources } from './audioRuntimeContracts'
import { AnimationTimelineOwner } from './animationTimelineOwner'
import type { AnimationResources } from './animationTimelineContracts'
import { createRuntimeSaveOwner } from './runtimeSaveOwner'
import { createPluginRuntimeOwner } from './pluginRuntimeOwner'
import type { RuntimePluginController } from './pluginRuntimeOwner'
import type { RuntimeWorldHostOptions, RuntimeWorldView } from './runtimeWorldHostContracts'

export class RuntimeWorldHost implements GameplayWorldHost {
 private static readonly claims=new WeakMap<GameplayWorldState['world'],RuntimeWorldHost>()
 readonly world: GameplayWorldState['world']
 readonly tileResources: TileSetResourceOwner
 readonly tileMap: TileMapOwner
 readonly particleOwner: RuntimeParticleOwner
 readonly lifetime: EntityLifetimeOwner
 readonly streams: StreamLifecycleOwner
 readonly navigation: NavigationOwner
 readonly streaming: WorldStreamingOwner
 readonly builder: ReturnType<typeof createEntityBuilder>
 readonly sceneOwner: RuntimeSceneOwner<{settings:GameplayWorldState['globalSettings'];layers:number[];activeLayer:number;renderLayer:number|'all'}>
 readonly view: RuntimeWorldView
 readonly plugins: RuntimePluginController
 private disposed=false
 private disposing=false
 private debug: ScriptDebugOwner|null=null
 private hot: ScriptHotReloadOwner|null=null
 private graph: GraphDebugOwner|null=null
 private gameplay: WorldGameplayOwner|null=null
 private ai: AiOwner|null=null
 private evidence: SimulationEvidenceOwner|null=null
 private audio: RuntimeAudioOwner|null=null
 private animation: AnimationTimelineOwner|null=null
 private save: ReturnType<typeof createRuntimeSaveOwner>|null=null
 private presentation: RuntimePresentationOwner|null=null
 private replay: ReplayOwner|null=null
 private network: ProductionNetworkOwner|null=null
 private session: NetworkSessionOwner|null=null
 private multiplayerReplay: MultiplayerReplayOwner|null=null
 private readonly catalogRevision: number
 private readonly configuration: RuntimeWorldHostOptions['configuration']
 private disposePromise: Promise<void>|null=null

 constructor(private readonly options:RuntimeWorldHostOptions) {
  const c=options?.capabilities,r=options?.resources,state=options?.state
  if(!state?.world||!options.scenes||!r?.catalog||!r.scriptServices||!options.configuration||[c?.nowMilliseconds,c?.isoNow,c?.scheduleMacrotask,c?.unwrapEntity,c?.message,c?.log,c?.requestQuit,c?.recordScriptFunction,c?.reportRecoverableError,c?.locale?.currentLocale,c?.locale?.localize,c?.camera?.publishBlend].some(f=>typeof f!=='function')||!c.tileResources||!c.rendererAssets||!c.audioPlatform||!c.networkPlatform||!c.save||!c.pluginPlatform)throw new Error('RUNTIME_WORLD_HOST_CAPABILITIES_REQUIRED')
  if(r.catalog.projectId!==options.configuration.projectId||r.scriptServices.revision()!==r.catalog.revision()||r.scriptServices.listIdentities()!==r.catalog.listIdentities())throw new Error('RUNTIME_WORLD_CATALOG_MISMATCH')
  if(RuntimeWorldHost.claims.has(state.world))throw new Error('RUNTIME_WORLD_HOST_ALREADY_BOUND')
  this.world=state.world;this.catalogRevision=r.catalog.revision()
  this.configuration=structuredClone(options.configuration)
  RuntimeWorldHost.claims.set(this.world,this)
  const own=()=>this.assertCurrent(),clock=()=>{this.assertServiceCurrent();return c.nowMilliseconds()},unwrap=(e:Entity)=>{own();return c.unwrapEntity(e)}
  let navigation:NavigationOwner|undefined,streaming:WorldStreamingOwner|undefined,particles:RuntimeParticleOwner|undefined,resources:TileSetResourceOwner|undefined
  try {
   resources=this.tileResources=new TileSetResourceOwner(c.tileResources)
   this.tileMap=new TileMapOwner({world:this.world,resources,nowMilliseconds:clock})
   this.builder=createEntityBuilder({message:(...a)=>{own();return c.message(...a)},invalidateTileMap:component=>{own();this.tileMap.invalidateTileMap(component)}})
   const scheduler=new StableComponentScheduler()
   particles=this.particleOwner=new RuntimeParticleOwner(this.world,{resources:c.rendererAssets,readBudget:()=>{own();return {particleBudget:this.configuration.particleBudget,adaptiveParticleScale:this.configuration.adaptiveParticleScale}},emitterIndices:entities=>{own();if(entities!==this.world.entities)throw new Error('RUNTIME_PARTICLE_INDEX_WORLD_MISMATCH');scheduler.synchronize(entities);return scheduler.indices('ParticleEmitter2D')},nowMs:clock})
   this.lifetime=new EntityLifetimeOwner(this.world,unwrap);this.streams=new StreamLifecycleOwner(this.lifetime)
   navigation=this.navigation=new NavigationOwner(this.world,{tile:{readTileSet:reference=>{own();return this.tileResources.readTileSet(reference)},transformNormalizedTilePoint},nowMilliseconds:clock,scheduleMacrotask:(cb,delay)=>{own();return c.scheduleMacrotask(()=>{if(!this.disposed&&this.options.state.world===this.world)cb()},delay)},settings:{frameWorkBudgetMs:this.configuration.frameWorkBudgetMs},counters:{spatialEntries:0}})
   streaming=this.streaming=new WorldStreamingOwner(this.world,this.streams,{settings:{streamingBudgetMs:this.configuration.streamingBudgetMs},metrics:{streamingProcessed:0,streamingDeferred:0},nowMs:clock,isoNow:()=>{own();return c.isoNow()}})
   this.view={state,scenes:options.scenes,resources:r,layers:[1],activeLayer:1,renderLayer:'all'}
   this.sceneOwner=new RuntimeSceneOwner({state,scenes:options.scenes,builder:this.builder,origin:()=>{own();return {...this.gameplay?.state.originOffset??{x:0,y:0}}},captureView:()=>{own();return {settings:structuredClone(state.globalSettings),layers:[...this.view.layers],activeLayer:this.view.activeLayer,renderLayer:this.view.renderLayer}},restoreView:value=>{own();Object.assign(state.globalSettings,value.settings);this.view.layers.splice(0,this.view.layers.length,...value.layers);this.view.activeLayer=value.activeLayer;this.view.renderLayer=value.renderLayer},applyView:(scene,entities)=>{own();this.sceneOwner.sceneData.loadGlobalSettings(scene);this.applySceneLayers(scene,entities)}})
   const pluginState={manifests:[],active:0,errors:[],safeMode:this.configuration.pluginSafeMode,activePluginIds:[],safeModeRecommended:this.configuration.pluginSafeModeRecommended,contributions:[],generation:0,reloads:0,unloads:0,isolatedFailures:0}
   const plugin=createPluginRuntimeOwner({...c.pluginPlatform,state:pluginState,log:(...a)=>{own();c.log(...a)},assetReference:uuid=>'asset://'+uuid,resolveAsset:reference=>{own();return r.catalog.resolveAsset(reference)}})
   const controller=plugin.pluginRuntime
   this.plugins={start:()=>{own();return controller.start()},update:delta=>{own();controller.update(delta)},stop:()=>controller.stop(),unload:id=>{own();return controller.unload(id)},reload:id=>{own();return controller.reload(id)},invokeCommand:(...args)=>{own();return controller.invokeCommand(...args)},invokeContribution:(...args)=>{own();return controller.invokeContribution(...args)}}
   plugin.loadPluginManifests(this.configuration.plugins)
  } catch(error) {
   this.disposed=true;this.disposing=true
   for(const cleanup of [()=>streaming?.dispose(),()=>navigation?.dispose(),()=>particles?.dispose(),()=>resources?.clear()])try{cleanup()}catch(cleanupError){Object.assign(error instanceof Error?error:new Error(String(error)),{cleanupError})}
   this.disposing=false;if(RuntimeWorldHost.claims.get(this.world)===this)RuntimeWorldHost.claims.delete(this.world);throw error
  }
 }
 private assertCurrent():void {if(this.disposed)throw new Error('RUNTIME_WORLD_HOST_DISPOSED');if(this.options.state.world!==this.world||this.options.resources.catalog.revision()!==this.catalogRevision)throw new Error('RUNTIME_WORLD_HOST_CHANGED')}
 private assertServiceCurrent():void {if(this.disposed&&!this.disposing)throw new Error('RUNTIME_WORLD_HOST_DISPOSED');if(this.options.state.world!==this.world||this.options.resources.catalog.revision()!==this.catalogRevision)throw new Error('RUNTIME_WORLD_HOST_CHANGED')}
 get rendererAssets(){this.assertCurrent();return this.options.capabilities.rendererAssets}
 get state(){this.assertCurrent();return this.options.state}
 get activeSceneUuid(){this.assertCurrent();return this.options.scenes.activeSceneUuid}
 readEnabledPackageIds(){this.assertCurrent();return [...this.configuration.enabledPackageIds]}
 private requireCatalog(catalog:GameplayScriptServices){this.assertCurrent();if(catalog!==this.options.resources.scriptServices)throw new Error('RUNTIME_WORLD_SCRIPT_CATALOG_MISMATCH')}
 createScriptDebugOwner(catalog:GameplayScriptServices){this.requireCatalog(catalog);return this.debug??=new ScriptDebugOwner(this.world,catalog)}
 createScriptHotReloadOwner(catalog:GameplayScriptServices){this.requireCatalog(catalog);return this.hot??=new ScriptHotReloadOwner(this.world,catalog)}
 createGraphDebugOwner(catalog:GameplayScriptServices){this.requireCatalog(catalog);return this.graph??=new GraphDebugOwner(this.world,catalog,{nowMilliseconds:()=>{this.assertCurrent();return this.options.capabilities.nowMilliseconds()}})}
 createWorldGameplayOwner(graph:GraphDebugOwner){this.assertCurrent();if(graph!==this.createGraphDebugOwner(this.options.resources.scriptServices))throw new Error('RUNTIME_WORLD_GRAPH_MISMATCH');if(this.gameplay)return this.gameplay
  const c=this.options.capabilities,r=this.options.resources,own=()=>this.assertCurrent(),world=this.world
  this.ai=new AiOwner(world,{resolveAsset:reference=>{own();return r.catalog.resolveAsset(reference)},readTextAsset:reference=>{own();return r.catalog.readDependencyText(reference)},recordGraphError:graph.recordGraphError.bind(graph),recordGraphTrace:graph.recordGraphTrace.bind(graph),recordScriptFunction:(...a)=>{own();c.recordScriptFunction(...a)},nowMilliseconds:()=>{own();return c.nowMilliseconds()}})
  this.evidence=new SimulationEvidenceOwner(world,{scope:'fixed-world',world,blackboardSnapshot:this.ai.blackboardSnapshot.bind(this.ai)})
  const readPrefab=createRuntimePrefabReader(r.scriptServices),host=this
  this.gameplay=new WorldGameplayOwner({world,get camera(){own();return host.state.camera},get activeSceneUuid(){return host.activeSceneUuid}},{graphDebug:graph,packages:{aiEnabled:()=>{own();return this.configuration.aiEnabled},objectPoolEnabled:()=>{own();return this.configuration.objectPoolEnabled}},loadAi:async()=>{own();return this.ai!},runtimeObjects:{readPrefab:ref=>{own();return readPrefab(ref)},createEntity:(...a)=>{own();return this.builder.createEntityFromData(...a)},unwrapEntity:e=>{own();return c.unwrapEntity(e)},lifetimes:this.lifetime,log:(...a)=>{own();c.log(...a)},defaultClockSeconds:()=>{own();return c.nowMilliseconds()/1000}},lifecycle:{lifetimes:this.lifetime,streams:this.streams},navigation:this.navigation,streaming:this.streaming,createSceneStreaming:p=>{own();return new RuntimeSceneStreaming({world:p.world,scenes:this.options.scenes,origin:p.origin,createEntity:(...a)=>{own();return this.builder.createEntityFromData(...a)},serializeEntity:e=>{own();return serializeEntity(e)},readHandoff:p.streamingOwner.sceneHandoffPorts.readHandoff,writeHandoff:p.streamingOwner.sceneHandoffPorts.writeHandoff,lifecycle:p.lifecycle,streamingOwner:p.streamingOwner})},tile:{map:this.tileMap,scene:new RuntimeSceneInstantiator(world,{resolveAsset:ref=>{own();return r.catalog.resolveAsset(ref)},readTextAsset:ref=>{own();return r.catalog.readDependencyText(ref)},assetReference:uuid=>'asset://'+uuid,createEntity:(...a)=>{own();return this.builder.createEntityFromData(...a)}})},evidence:this.evidence,particles:{shiftParticleOrigin:(offset,entities)=>{own();if(entities!==world.entities)throw new Error('RUNTIME_PARTICLE_ORIGIN_WORLD_MISMATCH');this.particleOwner.shiftOrigin(offset)}}},structuredClone(this.configuration.world))
  this.navigation.activateDiagnostics();this.streaming.activateDiagnostics();return this.gameplay
 }
 createParticleOwner(){this.assertCurrent();return this.particleOwner}
 createPresentationOwner(){this.assertCurrent();return this.presentation??=new RuntimePresentationOwner({world:this.world,nowMilliseconds:()=>{this.assertCurrent();return this.options.capabilities.nowMilliseconds()}},structuredClone(this.configuration.presentation))}
 createReplayOwner(){this.assertCurrent();return this.replay??=new ReplayOwner({world:this.world,readReplaySettings:()=>{this.assertCurrent();return this.configuration.replay}})}
 createProductionNetworkOwner(){this.assertCurrent();if(this.network)return this.network;const host={world:this.world,readConfiguration:()=>{this.assertServiceCurrent();return this.configuration.network}},c=this.options.capabilities
  this.multiplayerReplay=new MultiplayerReplayOwner(host,c.networkPlatform);this.session=new NetworkSessionOwner(host,c.networkPlatform,this.multiplayerReplay)
  this.network=new ProductionNetworkOwner(host,{packageId:this.configuration.networkPackageId,packageEnabled:id=>{this.assertCurrent();return this.configuration.enabledPackageIds.includes(id)},loadSession:async()=>{this.assertCurrent();return this.session!},reportRecoverableError:(...a)=>{if(!this.disposed)c.reportRecoverableError(...a)}});return this.network
 }
 createAudioOwner(resources:AudioResources){this.assertCurrent();if(this.audio){if(this.audio.resources!==resources)throw new Error('RUNTIME_WORLD_AUDIO_CATALOG_MISMATCH');return this.audio}return this.audio=new RuntimeAudioOwner(this.world,resources,{resources:createAudioResourceReader(resources),platform:this.options.capabilities.audioPlatform},e=>{this.assertCurrent();return this.options.capabilities.unwrapEntity(e)})}
 createAnimationTimelineOwner(resources:AnimationResources,audio:RuntimeAudioOwner){this.assertCurrent();if(audio!==this.audio||audio.world!==this.world||audio.resources!==resources)throw new Error('RUNTIME_WORLD_ANIMATION_AUDIO_MISMATCH');if(this.animation)return this.animation;const scheduler=new StableComponentScheduler(),c=this.options.capabilities
  return this.animation=new AnimationTimelineOwner(this.world,{resources,unwrapEntity:value=>{this.assertCurrent();return c.unwrapEntity(value as Entity)},animatorIndices:entities=>{this.assertCurrent();if(entities!==this.world.entities)throw new Error('RUNTIME_ANIMATOR_INDEX_WORLD_MISMATCH');scheduler.synchronize(entities);return scheduler.indices('Animator')},audio:{reconcileTimelineVoices:(...a)=>{this.assertCurrent();return audio.reconcileTimelineVoices(...a)}},locale:{currentLocale:()=>{this.assertCurrent();return c.locale.currentLocale()},localize:(...a)=>{this.assertCurrent();return c.locale.localize(...a)}},camera:{publishBlend:value=>{this.assertCurrent();c.camera.publishBlend(value)}},trace:{nowMilliseconds:()=>{this.assertCurrent();return c.nowMilliseconds()}}})
 }
 createSaveOwner(){this.assertCurrent();return this.save??=createRuntimeSaveOwner({...this.options.capabilities.save,projectId:()=>{this.assertCurrent();return this.configuration.projectId},configuration:()=>{this.assertCurrent();return this.configuration.save}})}
 readEntityAuthoringData(entity:Entity){this.assertCurrent();if(!this.world.entities.includes(entity))throw new Error('RUNTIME_AUTHORING_ENTITY_WORLD_MISMATCH');return readEntityAuthoringData(entity)}
 deleteEntity(id:number){this.assertCurrent();deleteEntitySubtreeInWorld(this.world,id)}
 prepareRuntimeSceneTransition(identifier?:string){this.assertCurrent();return this.sceneOwner.prepareRuntimeSceneTransition(identifier)}
 log(...args:Parameters<GameplayWorldHost['log']>){this.assertCurrent();this.options.capabilities.log(...args)}
 requestQuit(){this.assertCurrent();this.options.capabilities.requestQuit()}
 /** Layout bookkeeping only. Scene data/global settings use the original shared loader. */
 applySceneLayers(scene:Record<string,unknown>,entities:Entity[]):void {this.assertCurrent();const layers=[...new Set([1,...(Array.isArray(scene.layers)?scene.layers.map(value=>this.builder.normalizeIdentifier(value)):[]),...entities.map(entity=>entity.layer)])].sort((a,b)=>a-b);this.view.layers.splice(0,this.view.layers.length,...layers);const active=this.builder.normalizeIdentifier(scene.activeLayer,layers[0]),render=this.builder.normalizeIdentifier(scene.renderLayer,layers[0]);this.view.activeLayer=layers.includes(active)?active:layers[0];this.view.renderLayer=scene.renderLayer==='all'||!layers.includes(render)?'all':render}
 cancelPendingTransitions(){this.assertCurrent();this.sceneOwner.cancelPendingTransitions()}
 /** Core.stopSession runs first. Closing this host invalidates callbacks before releasing services. */
 dispose():Promise<void>{if(this.disposePromise)return this.disposePromise;this.disposed=true;this.disposing=true;const failures:unknown[]=[],jobs:Promise<unknown>[]=[]
  let resolve!:()=>void,reject!:(error:unknown)=>void;this.disposePromise=new Promise<void>((yes,no)=>{resolve=yes;reject=no})
  const attempt=(cb:()=>unknown)=>{try{const result=cb();if(result&&typeof (result as Promise<unknown>).then==='function')jobs.push(Promise.resolve(result).catch(e=>{failures.push(e)}))}catch(e){failures.push(e)}}
  attempt(()=>this.sceneOwner.dispose());attempt(()=>this.streaming.dispose());attempt(()=>this.navigation.dispose());attempt(()=>this.particleOwner.dispose());attempt(()=>this.plugins.stop());attempt(()=>this.network?.stopProductionRuntime());attempt(()=>this.session?.stopNetworking());attempt(()=>this.audio?.dispose());attempt(()=>this.tileResources.clear())
  void Promise.all(jobs).then(()=>{this.disposing=false;if(RuntimeWorldHost.claims.get(this.world)===this)RuntimeWorldHost.claims.delete(this.world);if(failures.length)reject(Object.assign(new Error('RUNTIME_WORLD_HOST_CLEANUP_FAILED'),{errors:failures}));else resolve()},error=>{this.disposing=false;if(RuntimeWorldHost.claims.get(this.world)===this)RuntimeWorldHost.claims.delete(this.world);reject(error)});return this.disposePromise
 }
}
