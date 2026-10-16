/** Transitional real Editor/browser capabilities. Media cache ownership is still Editor scoped. */
import {toRaw} from 'vue'
import {assetState,resolveAsset,resolveTexture,resolveTextureRegion,textureContentRevision} from '../assets/AssetDatabase'
import {resolveTiledMapAsset} from '../assets/tiledMapAssets'
import {t} from '../i18n'
import {createWebAudioPlatform} from '../platform/webAudioHost'
import {createNetworkPlatformPorts} from '../platform/networkPlatformFactory'
import {localizationSettings,localizeUiLabel} from '../runtime/localization'
import {setTimelineCameraBlend} from '../renderer/sceneRenderer'
import {editorRendererEnvironment,editorSceneRendererEnvironment,editorLightingEnvironment} from './rendererAdapter'
import type {RuntimeWorldCapabilities,RuntimeWorldResources,RuntimeWorldSurface} from '../runtime/runtimeWorldHostContracts'
import type {RuntimeWorldHost} from '../runtime/runtimeWorldHost'

export type RuntimeWorldPlatformCallbacks=Pick<RuntimeWorldCapabilities,'log'|'requestQuit'|'recordScriptFunction'|'reportRecoverableError'>

/** Call only after the original loadAssets pass. This bridge never loads or renormalizes records. */
export function createEditorRuntimeWorldPlatform(resources:RuntimeWorldResources,callbacks:RuntimeWorldPlatformCallbacks):RuntimeWorldCapabilities {
 if(!resources?.catalog||!resources.scriptServices||!callbacks||[callbacks.log,callbacks.requestQuit,callbacks.recordScriptFunction,callbacks.reportRecoverableError].some(v=>typeof v!=='function'))throw new Error('RUNTIME_WORLD_PLATFORM_CALLBACKS_REQUIRED')
 const revision=resources.catalog.revision(),locale=localizationSettings.previewLocale
 // Atlas rebuilds advance generation without replacing the loaded project's record objects.
 const records=assetState.records.map(value=>({value:toRaw(value),uuid:value.uuid,path:value.path,source:value.source,assetType:value.assetType}))
 let generation=assetState.generation
 const current=()=>{
  if(resources.catalog.revision()!==revision)throw new Error('EDITOR_RUNTIME_MEDIA_GENERATION_CHANGED')
  if(assetState.generation!==generation){
   if(assetState.records.length!==records.length||records.some((entry,index)=>{const value=assetState.records[index];return toRaw(value)!==entry.value||value.uuid!==entry.uuid||value.path!==entry.path||value.source!==entry.source||value.assetType!==entry.assetType}))throw new Error('EDITOR_RUNTIME_MEDIA_GENERATION_CHANGED')
   generation=assetState.generation
  }
 }
 const record=(reference:string|null|undefined)=>{
  current();const prepared=resources.catalog.resolveAsset(reference),live=resolveAsset(reference)
  if(!prepared)return null
  if(!live||live.uuid!==prepared.uuid||live.path!==prepared.path||live.source!==prepared.source||live.assetType!==prepared.assetType)throw new Error('EDITOR_RUNTIME_MEDIA_CATALOG_MISMATCH')
  return live
 }
 const assets:RuntimeWorldCapabilities['rendererAssets']={get generation(){current();return generation},get atlasPageCount(){current();return assetState.atlasPages.length},resolveTexture(reference,filter){if(!record(reference))return null;return resolveTexture(reference,filter)},readMaterialSource(reference){current();const asset=resources.catalog.resolveAsset(reference);return asset?.assetType==='material'?resources.catalog.readDependencyText(reference):null}}
 return {
  tileResources:{get generation(){current();return revision},textureContentRevision(){current();return textureContentRevision()},resolveAsset:reference=>{current();return resources.catalog.resolveAsset(reference)},readTextAsset:reference=>{current();return resources.catalog.readDependencyText(reference)},resolveTextureRegion(reference,region,filter){if(!record(reference))return null;return resolveTextureRegion(reference,region,filter)},resolveImportedTileSet(asset){const live=record(asset.uuid);if(!live)throw new Error('EDITOR_RUNTIME_TILE_ASSET_MISSING');return resolveTiledMapAsset(live,assetState.records).tileSet}},
  rendererAssets:assets,audioPlatform:createWebAudioPlatform(),networkPlatform:createNetworkPlatformPorts(),
  save:{storage:()=>typeof localStorage==='undefined'?undefined:localStorage,origin:()=>typeof location==='undefined'?'headless-runtime':location.origin,timestamp:()=>new Date().toISOString(),abortError:message=>new DOMException(message,'AbortError')},
  pluginPlatform:{clock:{now:()=>performance.now()},crypto:globalThis.crypto,storage:typeof localStorage==='undefined'?undefined:localStorage,atob:value=>globalThis.atob(value),fetch:source=>globalThis.fetch(source)},
  locale:{currentLocale:()=>{current();return locale},localize:(value,requested)=>{current();return localizeUiLabel(value,requested)}},
  // The old publication channel remains shared; Canvas composition is still an explicit next boundary.
  camera:{publishBlend:value=>setTimelineCameraBlend(value)},message:t,unwrapEntity:toRaw,
  nowMilliseconds:()=>performance.now(),isoNow:()=>new Date().toISOString(),scheduleMacrotask:(callback,delay)=>globalThis.setTimeout(callback,delay),
  log:callbacks.log.bind(callbacks),requestQuit:callbacks.requestQuit.bind(callbacks),recordScriptFunction:callbacks.recordScriptFunction.bind(callbacks),reportRecoverableError:callbacks.reportRecoverableError.bind(callbacks)
 }
}

/** Existing renderer policy/events with this World's real tile/particle consumers and bound media reads. */
export function createEditorRuntimeWorldSurface(host:RuntimeWorldHost):RuntimeWorldSurface {
 const resources=host.view.resources
 const current=()=>{void host.state;void source.generation}
 const scene=editorSceneRendererEnvironment(()=>host.tileMap,()=>host.particleOwner)
 const source=host.rendererAssets
 const boundScene={...scene,assets:source,assetKind(reference:string|null|undefined){current();return resources.catalog.resolveAsset(reference)?.assetType??null},fontMetadata(reference:string|null|undefined){current();const asset=resources.catalog.resolveAsset(reference);return asset?.assetType==='font'?{family:asset.fontFamily,fallbackFamilies:[...asset.settings.fontSettings.fallbackFamilies],outlineWidth:asset.settings.fontSettings.outlineWidth}:null}}
 const renderer={...editorRendererEnvironment(),assets:source}
 const lighting={...editorLightingEnvironment(scene,host.world),assets:source,scene:boundScene}
 return {renderer,scene:boundScene,lighting}
}
