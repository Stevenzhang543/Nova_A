import { assetState, resolveAsset } from '../assets/AssetDatabase'
import { resolveTiledMapAsset } from '../assets/tiledMapAssets'
import { physicsState, pushHistory, selectEntities } from '../store/physics'
import { editorState } from '../store/editor'
import { BoxEntity } from '../world/BoxEntity'
import { TileMap2D } from '../world/components'
import { normalizeTileMap } from '../runtime/tilemap'
/** Prepare every dependency and cell before allocating a scene identity; commit one history transaction. */
export function instantiateImportedTileMap(reference: string) {
  const asset=resolveAsset(reference);if(!asset)throw new Error('TILED_SCENE: The map is missing.')
  const plan=resolveTiledMapAsset(asset,assetState.records),component=new TileMap2D()
  Object.assign(component,{tileSetAsset:'asset://'+asset.uuid,width:plan.width,height:plan.height,tileSize:{x:1,y:plan.tileHeight/plan.tileWidth},layers:plan.layers,tiles:plan.layers[0].tiles,activeLayer:0})
  normalizeTileMap(component)
  const entity=new BoxEntity(physicsState.world.allocateId(),{x:0,y:0},{x:1,y:1})
  entity.name=asset.name.replace(/\.[^.]+$/,'');entity.layer=editorState.activeLayer
  entity.removeComponent('ShapeRenderer2D');entity.removeComponent('RigidBody2D');const collider=entity.getCollider();if(collider)entity.removeComponent(collider.kind)
  entity.addComponent(component);physicsState.world.entities.push(entity);selectEntities([entity.id],'replace',entity.id);pushHistory('Create imported tilemap','entity:'+entity.uuid)
  return entity
}
