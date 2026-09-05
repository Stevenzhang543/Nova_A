import type { AssetRecord } from './types'
import { bindInterchangeTexture } from './interchangeBindings'
import { isTiledMapAsset } from './tiledMapAssets'
import { assetState, readTextAsset, resolveAsset, updateTextAssetTransactional } from './AssetDatabase'
export interface ImportedDependencySlot {id:string;name:string;kind:'image'|'tileset';reference:string|null}
function document(asset:AssetRecord):Record<string,any>{const raw=readTextAsset(asset.uuid);if(!raw)throw new Error('CONTENT_BINDING: The imported document is missing.');const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('CONTENT_BINDING: Invalid imported document.');return value}
export function importedDependencySlots(asset:AssetRecord):ImportedDependencySlot[]{
  if(!asset.interchange)return []
  const value=document(asset)
  if(value.format==='nova-tiled-map-resource')return (value.tilesets??[]).map((entry:Record<string,any>,index:number)=>({id:'map:'+index,name:String(entry.source||entry.document?.texturePath||'Tileset '+entry.firstGid),kind:entry.source?'tileset':'image',reference:entry.source?entry.sourceAsset??null:entry.document?.textureAsset??null}))
  return [{id:'texture',name:asset.interchange.texturePath||asset.name,kind:'image',reference:value.textureAsset??null}]
}
export function setImportedDependency(asset:AssetRecord,id:string,reference:string):boolean {
  if(resolveAsset(asset.uuid)!==asset)throw new Error('CONTENT_BINDING: The source is no longer in this project.')
  const slot=importedDependencySlots(asset).find(v=>v.id===id),target=resolveAsset(reference)
  if(!slot||!target||target.assetType!==slot.kind||target.derivedSprite||slot.kind==='tileset'&&isTiledMapAsset(target)||target===asset||!assetState.records.includes(target))throw new Error('CONTENT_BINDING: Choose an original image or tileset of the required kind.')
  const value=document(asset),ref='asset://'+target.uuid
  if(id==='texture'){value.textureAsset=ref;for(const source of value.sources??[])source.textureAsset=ref}
  else {const entry=value.tilesets[Number(id.slice(4))];if(entry.source)entry.sourceAsset=ref;else {entry.document.textureAsset=ref;for(const source of entry.document.sources??[])source.textureAsset=ref}}
  if(!updateTextAssetTransactional(asset.uuid,JSON.stringify(value,null,2)+'\n'))throw new Error('CONTENT_BINDING: The source could not be saved.')
  bindInterchangeTexture(asset,assetState.records)
  return true
}
