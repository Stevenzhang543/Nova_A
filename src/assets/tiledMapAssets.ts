import type { AssetRecord } from './types'
import { assetSourceText } from './assetReferences'
import { TILED_LIMITS } from './tiledInterchange'
import type { TileSetDocument } from '../runtime/tilemap'
import type { TileMap2D, TileCellTransform2D } from '../world/components'
type Obj=Record<string,any>
const fail=(message:string):never=>{throw new Error('TILED_DEPENDENCY: '+message)}
const document=(asset:AssetRecord):Obj=>{const text=assetSourceText(asset);if(!text)return fail('Missing tileset document: '+asset.path);const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))return fail('Invalid tileset document.');return value}
const path=(value:string)=>{const parts:string[]=[];for(const part of value.replace(/\\/g,'/').split('/')){if(!part||part==='.')continue;if(part==='..')parts.pop();else parts.push(part)}return parts.join('/')}
function dependency(owner:AssetRecord,sourcePath:string,reference:string|null|undefined,assets:readonly AssetRecord[],kind:'image'|'tileset'):AssetRecord {
  if(reference){const asset=assets.find(v=>'asset://'+v.uuid===reference&&v.assetType===kind);return asset??fail(owner.path+' requires missing '+reference)}
  if(!sourcePath)return fail(owner.path+' has an unassigned '+kind+' dependency.')
  const relative=path(owner.path.slice(0,owner.path.lastIndexOf('/')+1)+sourcePath),absolute=path(sourcePath)
  let matches=assets.filter(v=>v.assetType===kind&&(v.path===relative||v.path===absolute))
  if(!matches.length)matches=assets.filter(v=>v.assetType===kind&&v.name.toLowerCase()===absolute.split('/').pop()?.toLowerCase())
  return matches.length===1?matches[0]:fail(sourcePath+' resolves to '+matches.length+' '+kind+' assets. Assign the intended stable reference.')
}
export function isTiledMapAsset(asset:AssetRecord):boolean {if(asset.assetType!=='tileset')return false;try{return document(asset).format==='nova-tiled-map-resource'}catch{return false}}
/** Resolve and persist UUID links only; a missing dependency remains a repairable imported document. */
export function bindTiledMapDocument(asset:AssetRecord,assets:readonly AssetRecord[],previous?:AssetRecord):{value:Obj;diagnostics:Array<{severity:'error';code:string;message:string}>} {
  const value=document(asset),prior=previous?document(previous):null,diagnostics:Array<{severity:'error';code:string;message:string}>=[]
  if(!Array.isArray(value.tilesets)||value.tilesets.length>TILED_LIMITS.sources)throw new Error('TILED_IMPORT: Invalid map tilesets.')
  for(const entry of value.tilesets){try{
    const old=prior?.tilesets?.find((v:Obj)=>v.source===entry.source&&v.firstGid===entry.firstGid)
    if(entry.source){const set=dependency(asset,entry.source,entry.sourceAsset??old?.sourceAsset,assets,'tileset');entry.sourceAsset='asset://'+set.uuid}
    else if(entry.document){const item=entry.document,oldItem=old?.document,reference=item.textureAsset??(oldItem?.texturePath===item.texturePath?oldItem?.textureAsset:null),image=dependency(asset,item.texturePath,reference,assets,'image');item.textureAsset='asset://'+image.uuid;for(const source of item.sources??[])source.textureAsset=item.textureAsset}
  }catch(error){diagnostics.push({severity:'error',code:'CONTENT_TEXTURE_TILED',message:error instanceof Error?error.message:String(error)})}}
  return {value,diagnostics}
}
/** GID diagonal swap precedes H/V flips; convert image coordinates into Nova's Y-up rotation/flip flags. */
export function tiledCellTransform(gid:number):TileCellTransform2D {
  const h=(gid&0x80000000)!==0,v=(gid&0x40000000)!==0,d=(gid&0x20000000)!==0
  return (d ? (h ? (v ? 9 : 3) : (v ? 1 : 5)) : (h?4:0)|(v?8:0)) as TileCellTransform2D
}
export function resolveTiledMapAsset(asset:AssetRecord,assets:readonly AssetRecord[]):{tileSet:TileSetDocument;width:number;height:number;tileWidth:number;tileHeight:number;layers:TileMap2D['layers']} {
  const value=document(asset),width=value.width,height=value.height
  if(value.format!=='nova-tiled-map-resource'||value.version!==1||![width,height].every(n=>Number.isInteger(n)&&n>0&&n<=2048)||!Array.isArray(value.layers)||!value.layers.length||value.layers.length>TILED_LIMITS.layers||width*height*value.layers.length>TILED_LIMITS.cells)return fail('Invalid finite map geometry or layer budget.')
  if(!Array.isArray(value.tilesets)||!value.tilesets.length||value.tilesets.length>TILED_LIMITS.sources)return fail('Assign at least one tileset.')
  const sources:TileSetDocument['sources']=[],tiles:TileSetDocument['tiles']=[],sets:Array<{firstGid:number;offset:number;count:number}>=[]
  for(const entry of [...value.tilesets].sort((a,b)=>a.firstGid-b.firstGid)){
    if(!Number.isSafeInteger(entry.firstGid)||entry.firstGid<1||sets.some(v=>v.firstGid===entry.firstGid))return fail('Invalid firstgid.')
    const owner=entry.source?dependency(asset,entry.source,entry.sourceAsset,assets,'tileset'):asset,set=entry.source?document(owner):entry.document
    if(!set||set.version!==2||set.format==='nova-tiled-map-resource'||!Array.isArray(set.tiles)||!set.tiles.length||tiles.length+set.tiles.length>TILED_LIMITS.tiles)return fail('Invalid or oversized tileset.')
    if(set.tileWidth!==value.tileWidth||set.tileHeight!==value.tileHeight)return fail('All imported tilesets must use the map cell dimensions.')
    const sourceRecords=Array.isArray(set.sources)&&set.sources.length?set.sources:[{id:'primary',textureAsset:set.textureAsset,texturePath:set.texturePath,margin:0,spacing:0}],sourceIds=new Map<string,string>()
    const offset=tiles.length
    for(const source of sourceRecords){if(sources.length>=TILED_LIMITS.sources||sourceIds.has(source.id))return fail('Too many or duplicate tileset image sources.');const image=dependency(owner,source.texturePath??set.texturePath,source.textureAsset??set.textureAsset,assets,'image'),id=String(entry.firstGid)+':'+source.id;sourceIds.set(source.id,id);sources.push({id,name:image.name,textureAsset:'asset://'+image.uuid,margin:source.margin??0,spacing:source.spacing??0})}
    for(let local=0;local<set.tiles.length;local++){
      const tile=set.tiles[local],sourceId=sourceIds.get(tile.sourceId)??sources.at(-1)!.id,source=sources.find(v=>v.id===sourceId)!,image=assets.find(v=>'asset://'+v.uuid===source.textureAsset)!,region=tile.region??{x:source.margin+local%set.columns*(set.tileWidth+source.spacing),y:source.margin+Math.floor(local/set.columns)*(set.tileHeight+source.spacing),width:set.tileWidth,height:set.tileHeight}
      if(![region.x,region.y,region.width,region.height].every(Number.isFinite)||region.x<0||region.y<0||region.width<=0||region.height<=0||region.x+region.width>image.width||region.y+region.height>image.height)return fail('Tile '+local+' lies outside '+image.path)
      const animation=tile.animation?{...tile.animation,frames:tile.animation.frames.map((frame:number)=>{if(!Number.isInteger(frame)||frame<0||frame>=set.tiles.length)return fail('Invalid animated tile ID.');return frame+offset})}:null
      tiles.push({...tile,index:local+offset,sourceId,region,animation})
    }
    const prior=sets.at(-1);if(prior&&prior.firstGid+prior.count>entry.firstGid)return fail('Tileset global-ID ranges overlap.')
    sets.push({firstGid:entry.firstGid,offset,count:set.tiles.length})
  }
  const layers:TileMap2D['layers']=value.layers.map((layer:Obj,index:number)=>{
    const gids=Array.isArray(layer.gids)?layer.gids:layer.tiles?.map((tile:number)=>tile+1)
    if(!Array.isArray(gids)||gids.length!==width*height)return fail('A map layer has incomplete cell data.')
    const values:number[]=Array(gids.length),transforms:TileCellTransform2D[]=Array(gids.length)
    for(let i=0;i<gids.length;i++){const raw=gids[i];if(!Number.isSafeInteger(raw)||raw<0||raw>0xffffffff)return fail('Invalid global tile ID.');const gid=raw&0x0fffffff,target=(height-1-Math.floor(i/width))*width+i%width;transforms[target]=tiledCellTransform(raw);if(!gid){values[target]=-1;continue}const set=[...sets].reverse().find(v=>v.firstGid<=gid);if(!set||gid>=set.firstGid+set.count)return fail('Global tile ID '+gid+' has no matching tileset.');if(raw&0x20000000&&value.tileWidth!==value.tileHeight)return fail('Diagonal flips on rectangular tiles require square source cells.');values[target]=set.offset+gid-set.firstGid}
    return {id:String(layer.id),name:String(layer.name),visible:layer.visible!==false,locked:false,opacity:layer.opacity??1,blendMode:layer.blendMode??'Alpha',parallax:layer.parallax??{x:1,y:1},zOrder:index,collisionEnabled:true,navigationEnabled:true,occlusionEnabled:true,tiles:values,transforms}
  })
  return {tileSet:{version:2,textureAsset:sources[0].textureAsset,sources,tileWidth:value.tileWidth,tileHeight:value.tileHeight,columns:tiles.length,rows:1,tiles},width,height,tileWidth:value.tileWidth,tileHeight:value.tileHeight,layers}
}
