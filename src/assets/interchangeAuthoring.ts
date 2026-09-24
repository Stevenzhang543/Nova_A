/** 互通资源编辑：读取导入文档的依赖槽位并修改选中的依赖绑定。 */
import type { AssetRecord } from './types'
import { bindInterchangeTexture } from './interchangeBindings'
import { isTiledMapAsset } from './tiledMapAssets'
import { assetState, readTextAsset, resolveAsset, updateTextAssetTransactional } from './AssetDatabase'
export interface ImportedDependencySlot {id:string;name:string;kind:'image'|'tileset';reference:string|null}
/** 读取并解析交换资源的文本对象文档，缺失、数组或非对象时抛出绑定错误。 */ function document(asset:AssetRecord):Record<string,any>{const raw=readTextAsset(asset.uuid);if(!raw)throw new Error('CONTENT_BINDING: The imported document is missing.');const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('CONTENT_BINDING: Invalid imported document.');return value}
/** 为导入地图列出外部瓦片集或嵌入图像槽，其他交换资源提供单个纹理槽。 */ export function importedDependencySlots(asset:AssetRecord):ImportedDependencySlot[]{
  if(!asset.interchange)return []
  const value=document(asset)
  if(value.format==='nova-tiled-map-resource')return (value.tilesets??[]).map(/** 将地图瓦片集记录展开为可编辑依赖槽，区分外部瓦片集和嵌入纹理。 */ (entry:Record<string,any>,index:number)=>({id:'map:'+index,name:String(entry.source||entry.document?.texturePath||'Tileset '+entry.firstGid),kind:entry.source?'tileset':'image',reference:entry.source?entry.sourceAsset??null:entry.document?.textureAsset??null}))
  return [{id:'texture',name:asset.interchange.texturePath||asset.name,kind:'image',reference:value.textureAsset??null}]
}
/** 校验来源和目标资源身份及类型，在事务中写入稳定依赖引用，再更新交换资源纹理绑定。 */ export function setImportedDependency(asset:AssetRecord,id:string,reference:string):boolean {
  if(resolveAsset(asset.uuid)!==asset)throw new Error('CONTENT_BINDING: The source is no longer in this project.')
  const slot=importedDependencySlots(asset).find(/* 比较 v.id 与 id，返回严格相等的判断结果。 */ v=>v.id===id),target=resolveAsset(reference)
  if(!slot||!target||target.assetType!==slot.kind||target.derivedSprite||slot.kind==='tileset'&&isTiledMapAsset(target)||target===asset||!assetState.records.includes(target))throw new Error('CONTENT_BINDING: Choose an original image or tileset of the required kind.')
  const value=document(asset),ref='asset://'+target.uuid
  if(id==='texture'){value.textureAsset=ref;for(const source of value.sources??[])source.textureAsset=ref}
  else {const entry=value.tilesets[Number(id.slice(4))];if(entry.source)entry.sourceAsset=ref;else {entry.document.textureAsset=ref;for(const source of entry.document.sources??[])source.textureAsset=ref}}
  if(!updateTextAssetTransactional(asset.uuid,JSON.stringify(value,null,2)+'\n'))throw new Error('CONTENT_BINDING: The source could not be saved.')
  bindInterchangeTexture(asset,assetState.records)
  return true
}
