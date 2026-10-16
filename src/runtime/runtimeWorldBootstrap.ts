/** Bootstrap a fixed World from already-normalized authoring records and prepared resources. */
import { SceneManager } from '../world/SceneManager'
import type { World, WorldHostServices } from '../world/World'
import type { SceneEntityData } from '../world/sceneEntityData'
import type { GameplayWorldState } from './gameplayWorldHost'
import { RuntimeWorldHost } from './runtimeWorldHost'
import type { RuntimeWorldBootstrapOptions } from './runtimeWorldHostContracts'

export async function bootstrapRuntimeWorld(options: RuntimeWorldBootstrapOptions) {
 if (!options || typeof options.createWorld !== 'function' || typeof options.releaseWorld !== 'function' || !Array.isArray(options.sceneRecords) || !options.sceneRecords.length || !options.resources?.catalog || !options.resources.scriptServices || !options.initialState || !options.configuration || !options.capabilities) throw new Error('RUNTIME_WORLD_BOOTSTRAP_REQUIRED')
 const revision=options.resources.catalog.revision(), projectId=options.resources.catalog.projectId
 let world:World|undefined,host:RuntimeWorldHost|undefined,released=false,closed=false,disposePromise:Promise<void>|undefined
 const assertLoading=()=>{if(closed)throw new Error('RUNTIME_WORLD_BOOTSTRAP_DISPOSED');if(options.signal?.aborted)throw new DOMException('Runtime world loading was cancelled.','AbortError');if(options.resources.catalog.revision()!==revision||projectId!==options.configuration.projectId)throw new Error('RUNTIME_WORLD_BOOTSTRAP_CATALOG_CHANGED')}
 const services:WorldHostServices={
  readTextAsset(reference){assertLoading();return options.resources.catalog.readDependencyText(reference)},
  assetRevision(){assertLoading();return revision},
  buildTileColliderDescriptors(component){assertLoading();if(!host)throw new Error('RUNTIME_WORLD_TILE_OWNER_NOT_COMPOSED');return host.tileMap.buildTileColliderDescriptors(component)}
 }
 const release=async()=>{if(released||!world)return;released=true;await options.releaseWorld(world)}
 const dispose=():Promise<void>=>{
  if(disposePromise)return disposePromise
  closed=true
  // Install the terminal promise before callbacks can re-enter this lease.
  let resolve!:()=>void,reject!:(error:unknown)=>void
  disposePromise=new Promise<void>((yes,no)=>{resolve=yes;reject=no})
  void(async()=>{const failures:unknown[]=[];try{await host?.dispose()}catch(e){failures.push(e)}try{await release()}catch(e){failures.push(e)}if(failures.length)reject(Object.assign(new Error('RUNTIME_WORLD_BOOTSTRAP_CLEANUP_FAILED'),{errors:failures}));else resolve()})()
  return disposePromise
 }
 try {
  assertLoading()
  const scenes=new SceneManager()
  scenes.importProject(options.sceneRecords,options.activeSceneUuid)
  const data=scenes.activeScene.data
  if(!Array.isArray(data.entities)||data.entities.length>100_000||data.entities.some(v=>!v||typeof v!=='object'||Array.isArray(v)))throw new Error('RUNTIME_WORLD_SCENE_ENTITIES_REQUIRED')
  if(data.connections!==undefined&&!Array.isArray(data.connections))throw new Error('RUNTIME_WORLD_SCENE_CONNECTIONS_REQUIRED')
  world=await options.createWorld(services)
  assertLoading()
  await world.wasmReady
  assertLoading()
  if(world.wasmError)throw world.wasmError
  const state:GameplayWorldState={...structuredClone(options.initialState),world}
  host=new RuntimeWorldHost({state,scenes,resources:options.resources,configuration:options.configuration,capabilities:options.capabilities})
  // This is the existing record decoder, not a second entity builder or UUID scheme.
  const loaded=host.sceneOwner.sceneData.loadEntities(data.entities as SceneEntityData[])
  const connections=host.sceneOwner.sceneData.loadConnections(Array.isArray(data.connections)?data.connections:[],loaded.entities,loaded.uuidToId)
  world.invalidateRuntime()
  world.entities.splice(0,world.entities.length,...loaded.entities)
  world.connections.splice(0,world.connections.length,...connections.connections)
  world.setNextId(loaded.maximumId+1)
  world.setNextConnectionId(connections.maximumId+1)
  host.sceneOwner.sceneData.loadGlobalSettings(data)
  host.applySceneLayers(data,loaded.entities)
  assertLoading()
  return Object.freeze({host,world,state,scenes,view:host.view,dispose})
 }catch(error){try{await dispose()}catch(cleanupError){if(error instanceof Error)Object.assign(error,{cleanupError})}throw error}
}
