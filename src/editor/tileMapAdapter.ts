/** Unique Editor catalog/authoring bridge; fixed World cache belongs to its actual child. */
import {reactive,toRaw} from 'vue'
import {assetState,readTextAsset,resolveAsset,resolveTextureRegion,textureContentRevision,assetReference} from '../assets/AssetDatabase'
import {resolveTiledMapAsset} from '../assets/tiledMapAssets'
import {registerImportSessionCleanup} from '../assets/importRetention'
import {TileMapOwner,TileSetResourceOwner,type TileWorld} from '../runtime/tileMapOwner'
import {RuntimeSceneInstantiator,type RuntimeScenePorts} from '../runtime/runtimeSceneInstantiator'
import {getLegacyTileSceneRawState,installLegacyTileScenePort} from '../runtime/tileSceneRuntime'
import {installLegacyTileMapPort} from '../runtime/tilemap'
import type {TileSceneOwner} from '../runtime/tileSceneOwner'
const resources=new TileSetResourceOwner({get generation(){return assetState.generation},textureContentRevision,resolveAsset,readTextAsset,resolveTextureRegion,resolveImportedTileSet(asset){const current=resolveAsset(asset.uuid);if(!current||current!==asset)throw new Error('TILE_RESOURCE_IDENTITY_CHANGED');return resolveTiledMapAsset(current,assetState.records).tileSet}})
registerImportSessionCleanup(()=>resources.clear())
const owners=new WeakMap<TileWorld,TileMapOwner>(),stateView=reactive(getLegacyTileSceneRawState())
export function getEditorTileMapOwner(world:TileWorld):TileMapOwner {let owner=owners.get(world);if(!owner){owner=new TileMapOwner({world,resources,nowMilliseconds:()=>performance.now()});owners.set(world,owner)}return owner}
export function editorTileResources(){return resources}
export function createEditorRuntimeSceneInstantiator(world:ConstructorParameters<typeof RuntimeSceneInstantiator>[0],ports:Pick<RuntimeScenePorts,'createEntity'|'selectEntities'>){return new RuntimeSceneInstantiator(world,{resolveAsset,readTextAsset,assetReference,...ports})}
export function editorTileSceneStateView(){return stateView}
/** Installation invokes neither provider nor World; foreign callers use explicit children. */
export function installEditorTileOwnerProvider(getOwner:()=>TileSceneOwner,getTileOwner:()=>TileMapOwner){installLegacyTileScenePort({stateView,unwrap:toRaw,getOwner});installLegacyTileMapPort({resources,getOwner:getTileOwner})}
