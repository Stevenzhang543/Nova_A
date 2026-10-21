/** Shared resource cache; fixed-World command/cache/time owner. Original math is retained. */
import { plainView } from '../world/plainView'
import {BoundedImportCache} from '../assets/importRetention'
import {normalizeTileSet,type TileDefinition,type TileSetDocument} from './tileSetValues'
import {normalizeTileMap,integer,MAX_TILESET_TILES,MAX_TILEMAP_CELLS} from './tileMapValues'
import {localPointToWorld,worldPointToLocal,worldTransform} from '../world/hierarchy'
import type {Entity} from '../world/Entity'
import type {TileMap2D,TileCellTransform2D,TileCollision2D} from '../world/components'
import type {Vec2} from '../world/types'
import {decomposeSimplePolygon} from './physicsGeometry'
import type {TileChunkRenderCommand,TextureRegion} from '../renderer/types'
export interface TileResourceRecord {readonly uuid:string;readonly assetType:string;readonly source:string;readonly sourceModified?:number}
export interface TileResourcePorts {readonly generation:number;textureContentRevision():number;resolveAsset(reference:string|null|undefined):TileResourceRecord|null;readTextAsset(reference:string|null|undefined):string|null;resolveImportedTileSet(asset:TileResourceRecord):TileSetDocument;resolveTextureRegion(reference:string|null|undefined,region:{x:number;y:number;width:number;height:number},filter?:'Nearest'|'Linear'):TextureRegion|null}
export interface TileWorld {readonly entities:Entity[]}
export interface TileMapPorts {readonly world:TileWorld;readonly resources:TileSetResourceOwner;nowMilliseconds():number}


export interface RuntimeTileChunk { layerId: string; chunkX: number; chunkY: number; width: number; height: number; tiles: number[]; transforms: TileCellTransform2D[] }

export interface TileColliderDescriptor {
  center: Vec2
  size: Vec2
  vertices: Vec2[]
  oneWay: boolean
}

export interface TilePlacementDescriptor {
  layerId: string
  cell: { x: number; y: number }
  kind: 'scene' | 'prefab'
  asset: string
  position: Vec2
  rotation: number
  flipX: boolean
  flipY: boolean
}

interface ChunkCache { signature: string; revision: number; chunks: Map<string, TileChunkRenderCommand>; dirty: Set<string>; cameraOffsets: Map<string, Vec2>; animationTick: string; animatedChunks: Set<string> }
function createTileResourceImplementation(ports:TileResourcePorts){
 const assetState=ports,resolveAsset=ports.resolveAsset.bind(ports),readTextAsset=ports.readTextAsset.bind(ports)
 const parsedTileSets = new BoundedImportCache<string, {asset: TileResourceRecord; source: string; generation: number; value: TileSetDocument | null}>(128, 64 * 1024 * 1024)

/* 返回具有所列字段的新对象 {entries: parsedTileSets.size, bytes: parsedTileSets.bytes, maxEntries: 128, maxBytes: 64 * 1024 * 1024}。 */ function tileSetCacheStats() { return {entries: parsedTileSets.size, bytes: parsedTileSets.bytes, maxEntries: 128, maxBytes: 64 * 1024 * 1024} }
/** 结构说明（自动提取）：readRuntimeTileSet；输入 reference；直接调用 resolveAsset、parsedTileSets.get、readTextAsset、JSON.parse、normalizeTileSet 等；写入 value；返回路径包含 cached.value、value。 */ function readRuntimeTileSet(reference: string | null | undefined): TileSetDocument | null {
  const asset = resolveAsset(reference)
  if (!asset || asset.assetType !== 'tileset') return null
  const cached = parsedTileSets.get(asset.uuid)
  if (cached && cached.asset === asset && cached.source === asset.source && cached.generation === assetState.generation) return cached.value
  const source = readTextAsset(reference); if (!source) return null
  let value: TileSetDocument | null = null
  try { const parsed = JSON.parse(source); value = normalizeTileSet(parsed.format === 'nova-tiled-map-resource' ? ports.resolveImportedTileSet(asset) : parsed) } catch { /* Import details expose the precise dependency diagnostic. */ }
  parsedTileSets.set(asset.uuid, {asset, source: asset.source, generation: assetState.generation, value}, source.length * 2 + (value?.tiles.length ?? 0) * 512)
  return value
}

/** Editors receive detached data; unsaved Inspector edits cannot alter the renderer's cached document. */
/** 结构说明（自动提取）：readTileSet；输入 reference；直接调用 readRuntimeTileSet、JSON.parse、JSON.stringify。 */ function readTileSet(reference: string | null | undefined): TileSetDocument | null { const value=readRuntimeTileSet(reference);return value?JSON.parse(JSON.stringify(value)):null }
 return {readRuntimeTileSet,readTileSet,tileSetCacheStats,clear:()=>parsedTileSets.clear()}
}
export class TileSetResourceOwner {
 private readonly impl:ReturnType<typeof createTileResourceImplementation>
 constructor(private readonly ports:TileResourcePorts){if(!ports||[ports.resolveAsset,ports.readTextAsset,ports.resolveImportedTileSet,ports.resolveTextureRegion,ports.textureContentRevision].some(v=>typeof v!=='function'))throw new Error('TILE_RESOURCE_PORTS_REQUIRED');this.impl=createTileResourceImplementation(ports)}
 private requireGeneration(){if(!Number.isSafeInteger(this.ports.generation)||this.ports.generation<0)throw new Error('TILE_RESOURCE_REVISION_INVALID')}
 get generation(){this.requireGeneration();return this.ports.generation}
 textureContentRevision(){return this.ports.textureContentRevision()}
 resolveAsset(reference:string|null|undefined){this.requireGeneration();return this.ports.resolveAsset(reference)}
 resolveTextureRegion(reference:string|null|undefined,region:{x:number;y:number;width:number;height:number},filter?:'Nearest'|'Linear'){return this.ports.resolveTextureRegion(reference,region,filter)}
 /** Internal read-only document; public authoring reader remains detached. */
 readRuntimeTileSet(reference:string|null|undefined){this.requireGeneration();return this.impl.readRuntimeTileSet(reference)}
 readTileSet(reference:string|null|undefined){this.requireGeneration();return this.impl.readTileSet(reference)}
 tileSetCacheStats(){return this.impl.tileSetCacheStats()}
 clear(){this.impl.clear()}
}
function createTileImplementation(ports:TileMapPorts){
 const assetState=ports.resources,textureContentRevision=assetState.textureContentRevision.bind(assetState),resolveAsset=assetState.resolveAsset.bind(assetState),readRuntimeTileSet=assetState.readRuntimeTileSet.bind(assetState),resolveTextureRegion=assetState.resolveTextureRegion.bind(assetState)
 const chunkCaches = new WeakMap<TileMap2D, ChunkCache>()
 let explicitTileTime: number | null = null
 

/** Read-only projection: Inspector/render queries never normalize live reactive arrays. */
/** 结构说明（自动提取）：tileMapView；输入 component；直接调用 Number.isInteger、Array.isArray、component.layers.every、Number.isFinite、normalizeTileMap；返回路径包含 component、view。 */ function tileMapView(component: TileMap2D): TileMap2D {
  const cells=component.width*component.height
  const valid=Number.isInteger(component.width)&&Number.isInteger(component.height)&&component.width>=1&&component.width<=2048&&component.height>=1&&component.height<=2048&&Array.isArray(component.layers)&&component.layers.length>0&&component.layers.length<=128&&cells*component.layers.length<=MAX_TILEMAP_CELLS&&component.layers.every(/* 先计算 Array.isArray(layer.tiles)&&Array.isArray(layer.transforms)&&layer.tiles.length===cells；仅当其为真值时求右侧 layer.transforms.length===cells，返回短路求值结果。 */ layer=>Array.isArray(layer.tiles)&&Array.isArray(layer.transforms)&&layer.tiles.length===cells&&layer.transforms.length===cells)&&Number.isInteger(component.activeLayer)&&component.activeLayer>=0&&component.activeLayer<component.layers.length&&component.tiles===component.layers[component.activeLayer].tiles&&Number.isInteger(component.chunkSize)&&component.chunkSize>=4&&component.chunkSize<=128&&Number.isFinite(component.tileSize?.x)&&component.tileSize.x>0&&Number.isFinite(component.tileSize?.y)&&component.tileSize.y>0
  if(valid)return component
  const view={...component} as TileMap2D;normalizeTileMap(view);return view
}
/** 结构说明（自动提取）：ensureRuntimeTileMap；输入 component；直接调用 tileMapView、normalizeTileMap。 */ function ensureRuntimeTileMap(component: TileMap2D): void { if(tileMapView(component)!==component)normalizeTileMap(component) }

/** 结构说明（自动提取）：readRuntimeTileChunk；输入 component、layerId、chunkX、chunkY；直接调用 tileMapView、component.layers.find、Math.max、Math.round、Math.min 等；写入 component；包含循环处理。 */ function readRuntimeTileChunk(component: TileMap2D, layerId: string, chunkX: number, chunkY: number): RuntimeTileChunk | null {
  component = tileMapView(component)
  const layer = component.layers.find(/* 比较 candidate.id 与 layerId，返回严格相等的判断结果。 */ candidate => candidate.id === layerId)
  if (!layer) return null
  const startX = Math.max(0, Math.round(chunkX) * component.chunkSize), startY = Math.max(0, Math.round(chunkY) * component.chunkSize)
  if (startX >= component.width || startY >= component.height) return null
  const width = Math.min(component.chunkSize, component.width - startX), height = Math.min(component.chunkSize, component.height - startY)
  const tiles: number[] = [], transforms: TileCellTransform2D[] = []
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const index = (startY + y) * component.width + startX + x; tiles.push(layer.tiles[index]); transforms.push(layer.transforms[index]) }
  return { layerId, chunkX: Math.round(chunkX), chunkY: Math.round(chunkY), width, height, tiles, transforms }
}

/** 结构说明（自动提取）：writeRuntimeTileChunk；输入 component、chunk；直接调用 ensureRuntimeTileMap、component.layers.findIndex、Math.max、Math.round、Math.min 等；写入 component.layers[…].tiles[…]、component.layers[…].transforms[…]、changed；返回路径包含 changed；包含循环处理。 */ function writeRuntimeTileChunk(component: TileMap2D, chunk: RuntimeTileChunk): boolean {
  ensureRuntimeTileMap(component)
  const layerIndex = component.layers.findIndex(/* 比较 candidate.id 与 chunk.layerId，返回严格相等的判断结果。 */ candidate => candidate.id === chunk.layerId)
  if (layerIndex < 0 || component.layers[layerIndex].locked) return false
  const startX = Math.max(0, Math.round(chunk.chunkX) * component.chunkSize), startY = Math.max(0, Math.round(chunk.chunkY) * component.chunkSize)
  let changed = false
  for (let y = 0; y < Math.min(component.chunkSize, chunk.height); y++) for (let x = 0; x < Math.min(component.chunkSize, chunk.width); x++) {
    if (startX + x >= component.width || startY + y >= component.height) continue
    const source = y * chunk.width + x, target = (startY + y) * component.width + startX + x
    const tile = integer(chunk.tiles[source], -1, -1, MAX_TILESET_TILES - 1), flags = integer(chunk.transforms[source], 0, 0, 15) as TileCellTransform2D
    if (component.layers[layerIndex].tiles[target] !== tile || component.layers[layerIndex].transforms[target] !== flags) {
      component.layers[layerIndex].tiles[target] = tile; component.layers[layerIndex].transforms[target] = flags; changed = true
      markTileDirty(component, startX + x, startY + y, chunk.layerId)
    }
  }
  if (changed) advanceLocalTileRevision(component)
  return changed
}

/** 结构说明（自动提取）：tileMetadataAt；输入 component、x、y；直接调用 ensureRuntimeTileMap、readRuntimeTileSet、Object.assign、map、component.layers.filter。 */ function tileMetadataAt(component: TileMap2D, x: number, y: number): Record<string, boolean | number | string> {
  ensureRuntimeTileMap(component)
  if (x < 0 || y < 0 || x >= component.width || y >= component.height) return {}
  const set = readRuntimeTileSet(component.tileSetAsset), index = y * component.width + x
  return Object.assign({}, ...component.layers.filter(/* 返回 layer.visible 的当前值。 */ layer => layer.visible).map(/* 当 set?.tiles[layer.tiles[index]]?.metadata 为 null 或 undefined 时返回 {}，否则保留左侧值。 */ layer => set?.tiles[layer.tiles[index]]?.metadata ?? {}))
}

/** 结构说明（自动提取）：worldToTile；输入 entity、component、point、entities；直接调用 worldPointToLocal、Math.floor。 */ function worldToTile(entity: Entity, component: TileMap2D, point: Vec2, entities: Entity[]): { x: number; y: number } | null {
  const local = worldPointToLocal(entity, point, entities)
  const x = Math.floor(local.x / component.tileSize.x + component.width * .5)
  const y = Math.floor(local.y / component.tileSize.y + component.height * .5)
  return x >= 0 && y >= 0 && x < component.width && y < component.height ? { x, y } : null
}

/** 结构说明（自动提取）：tileWorldCoordinate；输入 entity、component、cell、entities；直接调用 tileMapView、localPointToWorld；写入 component。 */ function tileWorldCoordinate(entity: Entity, component: TileMap2D, cell: { x: number; y: number }, entities: Entity[]): Vec2 {
  component = tileMapView(component)
  return localPointToWorld(entity, { x: (cell.x + .5 - component.width / 2) * component.tileSize.x, y: (component.height / 2 - cell.y - .5) * component.tileSize.y }, entities)
}

/** 结构说明（自动提取）：deterministicTileMapStorage；输入 component；直接调用 tileMapView、map、sort、JSON.stringify；写入 component。 */ function deterministicTileMapStorage(component: TileMap2D): string {
  component = tileMapView(component)
  const runLength = /** 结构说明（自动提取）：runLength；输入 values；直接调用 output.push；返回路径包含 output；包含循环处理。 */ (values: number[]) => { const output: Array<[number, number]> = []; for (const value of values) { const previous = output[output.length - 1]; if (previous?.[0] === value) previous[1]++; else output.push([value, 1]) } return output }
  const value = {
    format: 'nova-tilemap-source', version: 1, width: component.width, height: component.height, tileSize: { ...component.tileSize }, chunkSize: component.chunkSize,
    layers: [...component.layers].sort(/* 先计算 a.zOrder - b.zOrder；仅当其为假值时求右侧 a.id.localeCompare(b.id)，返回短路求值结果。 */ (a, b) => a.zOrder - b.zOrder || a.id.localeCompare(b.id)).map(/** 结构说明（自动提取）：map 回调；输入 layer；直接调用 runLength；返回表达式求值结果。 */ layer => ({ id: layer.id, name: layer.name, visible: layer.visible, locked: layer.locked, opacity: layer.opacity, blendMode: layer.blendMode, parallax: { ...layer.parallax }, zOrder: layer.zOrder, collisionEnabled: layer.collisionEnabled, navigationEnabled: layer.navigationEnabled, occlusionEnabled: layer.occlusionEnabled, tilesRle: runLength(layer.tiles), transformsRle: runLength(layer.transforms) }))
  }
  return `${JSON.stringify(value, null, 2)}\n`
}

/** 结构说明（自动提取）：tileStreamingBoundaries；输入 component；直接调用 tileMapView、Math.max、output.push、Math.floor、Math.min；写入 component、y、x；返回路径包含 output；包含循环处理。 */ function tileStreamingBoundaries(component: TileMap2D): Array<{ chunkX: number; chunkY: number; left: number; top: number; right: number; bottom: number }> {
  component = tileMapView(component); const size = Math.max(1, component.chunkSize), output = []
  for (let y = 0; y < component.height; y += size) for (let x = 0; x < component.width; x += size) output.push({ chunkX: Math.floor(x / size), chunkY: Math.floor(y / size), left: x, top: y, right: Math.min(component.width, x + size), bottom: Math.min(component.height, y + size) })
  return output
}

/** 按模板 `${Math.floor(x / component.chunkSize)}:${Math.floor(y / component.chunkSize)}` 生成并返回字符串。 */ function chunkKey(component: TileMap2D, x: number, y: number): string {
  return `${Math.floor(x / component.chunkSize)}:${Math.floor(y / component.chunkSize)}`
}

/** Register only the chunk modified by this layer writer. */ function markTileDirty(component: TileMap2D, x: number, y: number, layerId = component.layers[component.activeLayer]?.id): void {
  if (layerId) chunkCaches.get(component)?.dirty.add(`${layerId}:${chunkKey(component, x, y)}`)
}
/** Known local writers have already marked their affected chunks; external revisions still invalidate all. */
function advanceLocalTileRevision(component: TileMap2D): void {
  const previous = component.revision++
  const cache = chunkCaches.get(component)
  if (cache?.revision === previous) cache.revision = component.revision
}
/** 执行时调用 chunkCaches.delete(component)；不显式返回调用结果。 */ function invalidateTileMap(component: TileMap2D): void { chunkCaches.delete(component) }
/** 结构说明（自动提取）：setTileAnimationTime；输入 seconds；直接调用 Number.isFinite、Error；写入 explicitTileTime；包含显式抛错路径。 */ function setTileAnimationTime(seconds: number | null): void { if(seconds!==null&&(!Number.isFinite(seconds)||seconds<0))throw new Error('TILE_TIME: Expected a finite non-negative time.');explicitTileTime=seconds }
/* 当 explicitTileTime 为 null 或 undefined 时返回 ports.nowMilliseconds()/1000，否则保留左侧值。 */ function tileAnimationTime(): number { return explicitTileTime ?? ports.nowMilliseconds()/1000 }
/** 结构说明（自动提取）：animationTile；输入 definition、nowSeconds；直接调用 animation.frames.keys、Array.from、order.reduce、Math.max、Math.min 等；写入 cursor；返回路径包含 animation.frames[…]；包含循环处理。 */ function animationTile(definition: TileDefinition | undefined, nowSeconds: number): number | null {
  const animation = definition?.animation
  if (!animation?.frames.length) return definition?.index ?? null
  if(animation.durations?.length===animation.frames.length){
    const order=animation.mode==='PingPong'&&animation.frames.length>1?[...animation.frames.keys(),...Array.from({length:animation.frames.length-2},/* 计算表达式 animation.frames.length-2-i 并返回结果，沿用操作数的原有类型规则。 */ (_,i)=>animation.frames.length-2-i)]:[...animation.frames.keys()]
    const total=order.reduce(/* 计算表达式 sum+animation.durations![index] 并返回结果，沿用操作数的原有类型规则。 */ (sum,index)=>sum+animation.durations![index],0),time=Math.max(0,nowSeconds)
    let cursor=animation.mode==='Once'?Math.min(total,time):time%total
    for(const index of order){const duration=animation.durations[index];if(cursor<duration)return animation.frames[index];cursor-=duration}
    return animation.frames[order.at(-1)!]
  }
  const raw = Math.max(0, Math.floor(nowSeconds * animation.framesPerSecond))
  if (animation.mode === 'Once') return animation.frames[Math.min(animation.frames.length - 1, raw)]
  if (animation.mode === 'PingPong' && animation.frames.length > 1) {
    const period = animation.frames.length * 2 - 2
    const cursor = raw % period
    return animation.frames[cursor < animation.frames.length ? cursor : period - cursor]
  }
  return animation.frames[raw % animation.frames.length]
}

/** 结构说明（自动提取）：chunkCommand；输入 entity、component、layer、tileSet、chunkX、chunkY、entities、cameraPosition；直接调用 worldTransform、Math.min、animationTile、tileAnimationTime、tileSet.sources.find 等；写入 position.x、position.y；包含循环处理。 */ function chunkCommand(entity: Entity, component: TileMap2D, layer: TileMap2D['layers'][number], tileSet: TileSetDocument, chunkX: number, chunkY: number, entities: Entity[], cameraPosition?: Vec2, animated: { value: boolean } = { value: false }): TileChunkRenderCommand {
  const transform = worldTransform(entity, entities)
  const sprites: TileChunkRenderCommand['sprites'] = []
  const startX = chunkX * component.chunkSize, startY = chunkY * component.chunkSize
  const endX = Math.min(component.width, startX + component.chunkSize), endY = Math.min(component.height, startY + component.chunkSize)
  for (let y = startY; y < endY; y++) for (let x = startX; x < endX; x++) {
    const cellIndex = y * component.width + x
    const value = layer.tiles[cellIndex]
    if (value < 0 || value >= tileSet.columns * tileSet.rows) continue
    const definition = tileSet.tiles[value]
    if (definition?.animation?.frames.length) animated.value = true
    const frame = animationTile(definition, tileAnimationTime()) ?? value
    const frameDefinition = tileSet.tiles[frame] ?? definition
    const source = tileSet.sources.find(/* 比较 candidate.id 与 frameDefinition?.sourceId，返回严格相等的判断结果。 */ candidate => candidate.id === frameDefinition?.sourceId) ?? tileSet.sources[0]
    const region = frameDefinition?.region ?? {
      x: source.margin + frame % tileSet.columns * (tileSet.tileWidth + source.spacing),
      y: source.margin + Math.floor(frame / tileSet.columns) * (tileSet.tileHeight + source.spacing),
      width: tileSet.tileWidth,
      height: tileSet.tileHeight
    }
    const texture = resolveTextureRegion(source.textureAsset ?? tileSet.textureAsset, {
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height
    }, component.filterMode)
    if (!texture) continue
    const local = { x: (x + .5 - component.width * .5) * component.tileSize.x, y: (y + .5 - component.height * .5) * component.tileSize.y }
    const position = localPointToWorld(entity, local, entities)
    if (cameraPosition) { position.x += cameraPosition.x * (1 - layer.parallax.x); position.y += cameraPosition.y * (1 - layer.parallax.y) }
    const flags = layer.transforms[cellIndex] ?? 0
    sprites.push({
      position, rotation: transform.rotation + (flags & 3) * Math.PI * .5, scale: transform.scale,
      size: { ...component.tileSize }, pivot: { x: .5, y: .5 }, flipX: (flags & 4) !== 0, flipY: (flags & 8) !== 0,
      tint: { ...component.tint, a: component.opacity / 100 * layer.opacity }, texture
    })
  }
  return { sprites, sortingLayer: component.sortingLayer, orderInLayer: component.orderInLayer + layer.zOrder, material: component.material, blendMode: layer.blendMode }
}

/** 结构说明（自动提取）：chunkIntersectsBounds；输入 entity、component、chunkX、chunkY、entities、bounds；直接调用 Math.min、localPointToWorld、corners.map、Math.max。 */ function chunkIntersectsBounds(
  entity: Entity,
  component: TileMap2D,
  chunkX: number,
  chunkY: number,
  entities: Entity[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  cameraOffset: Vec2
): boolean {
  const startX = chunkX * component.chunkSize
  const startY = chunkY * component.chunkSize
  const endX = Math.min(component.width, startX + component.chunkSize)
  const endY = Math.min(component.height, startY + component.chunkSize)
  const left = (startX - component.width * .5) * component.tileSize.x
  const right = (endX - component.width * .5) * component.tileSize.x
  const bottom = (startY - component.height * .5) * component.tileSize.y
  const top = (endY - component.height * .5) * component.tileSize.y
  const corners = [
    localPointToWorld(entity, { x: left, y: bottom }, entities),
    localPointToWorld(entity, { x: right, y: bottom }, entities),
    localPointToWorld(entity, { x: right, y: top }, entities),
    localPointToWorld(entity, { x: left, y: top }, entities)
  ]
  const minX = Math.min(...corners.map(/* 返回 point.x 的当前值。 */ point => point.x))
  const maxX = Math.max(...corners.map(/* 返回 point.x 的当前值。 */ point => point.x))
  const minY = Math.min(...corners.map(/* 返回 point.y 的当前值。 */ point => point.y))
  const maxY = Math.max(...corners.map(/* 返回 point.y 的当前值。 */ point => point.y))
  return maxX + cameraOffset.x >= bounds.minX && minX + cameraOffset.x <= bounds.maxX && maxY + cameraOffset.y >= bounds.minY && minY + cameraOffset.y <= bounds.maxY
}

/** 结构说明（自动提取）：tileChunkCommands；输入 entity、component、entities、visibleBounds、cameraPosition；直接调用 tileMapView、readRuntimeTileSet、resolveAsset、worldTransform、tileSet.tiles.some 等；写入 component、cache、command；返回路径包含 commands；包含循环处理。 */ function tileChunkCommands(
  entity: Entity,
  component: TileMap2D,
  entities: Entity[],
  visibleBounds?: { minX: number; minY: number; maxX: number; maxY: number },
  cameraPosition?: Vec2
): TileChunkRenderCommand[] {
  if (!component.enabled || component.removed || !component.tileSetAsset) return []
  component = tileMapView(component)
  const tileSet = readRuntimeTileSet(component.tileSetAsset)
  const asset = resolveAsset(component.tileSetAsset)
  if (!tileSet || !asset) return []
  const transform = worldTransform(entity, entities)
  const hasAnimation = tileSet.tiles.some(/* 返回 tile.animation?.frames.length 的当前值。 */ tile => tile.animation?.frames.length)
  // 26.44: an animated tile's frame change rebuilds only the chunks that hold animated tiles (it used to drop every chunk).
  const animationTick = hasAnimation ? tileSet.tiles.filter(/* 返回 tile.animation?.frames.length 的当前值。 */ tile=>tile.animation?.frames.length).map(/* 调用 animationTile(tile,tileAnimationTime()) 并返回调用结果。 */ tile=>animationTile(tile,tileAnimationTime())).join(',') : ''
  const signature = [assetState.generation, textureContentRevision(), component.width, component.height, component.chunkSize, component.tileSize.x, component.tileSize.y, component.tileSetAsset, asset.sourceModified, transform.position.x, transform.position.y, transform.rotation, transform.scale.x, transform.scale.y, component.tint.r, component.tint.g, component.tint.b, component.opacity, component.filterMode, component.sortingLayer, component.orderInLayer, component.material, ...component.layers.map(/** 按模板 `${layer.id}:${layer.visible}:${layer.opacity}:${layer.blendMode}:${layer.parallax.x}:${layer.parallax.y}:${layer.zOrder}` 生成并返回字符串。 */ layer => `${layer.id}:${layer.visible}:${layer.opacity}:${layer.blendMode}:${layer.parallax.x}:${layer.parallax.y}:${layer.zOrder}`)].join(':')
  let cache = chunkCaches.get(component)
  if (!cache || cache.signature !== signature || cache.revision !== component.revision) {
    cache = { signature, revision: component.revision, chunks: new Map(), dirty: new Set(), cameraOffsets: new Map(), animationTick, animatedChunks: new Set() }
    chunkCaches.set(component, cache)
  }
  if (cache.animationTick !== animationTick) {
    for (const key of cache.animatedChunks) cache.chunks.delete(key)
    cache.animationTick = animationTick
  }
  const columns = Math.ceil(component.width / component.chunkSize), rows = Math.ceil(component.height / component.chunkSize)
  const commands: TileChunkRenderCommand[] = []
  for (const layer of component.layers) {
    if (!layer.visible || layer.opacity <= 0) continue
    const offset = { x: (cameraPosition?.x ?? 0) * (1 - layer.parallax.x), y: (cameraPosition?.y ?? 0) * (1 - layer.parallax.y) }
    const previousOffset = cache.cameraOffsets.get(layer.id)
    if (previousOffset && (previousOffset.x !== offset.x || previousOffset.y !== offset.y)) {
      // Only layers whose actual world geometry moves with the camera are invalidated.
      for (const key of cache.chunks.keys()) if (key.startsWith(`${layer.id}:`)) cache.chunks.delete(key)
    }
    cache.cameraOffsets.set(layer.id, offset)
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      // Cull at chunk granularity before generating or walking any tile sprites.
      if (visibleBounds && !chunkIntersectsBounds(entity, component, x, y, entities, visibleBounds, offset)) continue
      const key = `${layer.id}:${x}:${y}`
      let command = cache.chunks.get(key)
      if (!command || cache.dirty.has(key)) {
        const animated = { value: false }
        command = chunkCommand(entity, component, layer, tileSet, x, y, entities, cameraPosition, animated)
        cache.chunks.set(key, command)
        cache.dirty.delete(key)
        if (animated.value) cache.animatedChunks.add(key); else cache.animatedChunks.delete(key)
      }
      if (command.sprites.length) commands.push(command)
    }
  }
  return commands
}

/**
 * Returns bounded, chunk-local scene/prefab placements for a streaming host.
 * The function never expands an entire large world unless the caller asks for
 * every chunk explicitly.
 */
/** 结构说明（自动提取）：tilePlacementDescriptors；输入 entity、component、entities、chunkX、chunkY；直接调用 ensureRuntimeTileMap、readRuntimeTileSet、Math.max、Math.round、Math.min 等；返回路径包含 result；包含循环处理。 */ function tilePlacementDescriptors(
  entity: Entity,
  component: TileMap2D,
  entities: Entity[],
  chunkX: number,
  chunkY: number
): TilePlacementDescriptor[] {
  ensureRuntimeTileMap(component)
  const tileSet = readRuntimeTileSet(component.tileSetAsset)
  if (!tileSet) return []
  const startX = Math.max(0, Math.round(chunkX) * component.chunkSize), startY = Math.max(0, Math.round(chunkY) * component.chunkSize)
  if (startX >= component.width || startY >= component.height) return []
  const endX = Math.min(component.width, startX + component.chunkSize), endY = Math.min(component.height, startY + component.chunkSize)
  const mapTransform = worldTransform(entity, entities), result: TilePlacementDescriptor[] = []
  for (const layer of component.layers.filter(/* 返回 candidate.visible 的当前值。 */ candidate => candidate.visible)) {
    for (let y = startY; y < endY; y++) for (let x = startX; x < endX; x++) {
      const index = y * component.width + x, definition = tileSet.tiles[layer.tiles[index]]
      const asset = definition?.sceneAsset ?? definition?.prefabAsset
      if (!definition || !asset) continue
      const flags = layer.transforms[index] ?? 0
      const local = { x: (x + .5 - component.width * .5) * component.tileSize.x, y: (y + .5 - component.height * .5) * component.tileSize.y }
      result.push({
        layerId: layer.id,
        cell: { x, y },
        kind: definition.sceneAsset ? 'scene' : 'prefab',
        asset,
        position: localPointToWorld(entity, local, entities),
        rotation: mapTransform.rotation + (flags & 3) * Math.PI * .5,
        flipX: (flags & 4) !== 0,
        flipY: (flags & 8) !== 0
      })
    }
  }
  return result
}

/** Greedily merges adjacent box tiles and horizontal one-way runs. */
/** 结构说明（自动提取）：buildTileColliderDescriptors；输入 component；直接调用 readRuntimeTileSet、normalizeTileMap、component.layers.filter、Uint8Array、collision 等；写入 visited[…]；返回路径包含 result；包含循环处理。 */ function buildTileColliderDescriptors(component: TileMap2D): TileColliderDescriptor[] {
  if (!component.bakeCollision) return []
  const tileSet = readRuntimeTileSet(component.tileSetAsset)
  if (!tileSet) return []
  normalizeTileMap(component)
  const collisionLayers = component.layers.filter(/* 先计算 layer.visible；仅当其为真值时求右侧 layer.collisionEnabled，返回短路求值结果。 */ layer => layer.visible && layer.collisionEnabled)
  const collision = /** 结构说明（自动提取）：collision；输入 x、y；返回路径包含 kind；包含循环处理。 */ (x: number, y: number) => {
    for (let index = collisionLayers.length - 1; index >= 0; index--) {
      const kind = tileSet.tiles[collisionLayers[index].tiles[y * component.width + x]]?.collision ?? 'None'
      if (kind !== 'None') return kind
    }
    return 'None' as TileCollision2D
  }
  const definitionAt = /** 结构说明（自动提取）：definitionAt；输入 x、y；返回路径包含 undefined；包含循环处理。 */ (x: number, y: number) => {
    for (let index = collisionLayers.length - 1; index >= 0; index--) {
      const layer = collisionLayers[index], cellIndex = y * component.width + x
      const definition = tileSet.tiles[layer.tiles[cellIndex]]
      if (definition?.collision !== 'None') return { definition, flags: layer.transforms[cellIndex] ?? 0 }
    }
    return undefined
  }
  const visited = new Uint8Array(component.width * component.height)
  const result: TileColliderDescriptor[] = []
  for (let y = 0; y < component.height; y++) for (let x = 0; x < component.width; x++) {
    const index = y * component.width + x
    if (visited[index]) continue
    const kind = collision(x, y)
    if (kind === 'None') { visited[index] = 1; continue }
    const cellDefinition = definitionAt(x, y)
    if (kind === 'Polygon' || (cellDefinition?.flags ?? 0) !== 0) {
      visited[index] = 1
      const definition = cellDefinition?.definition
      const fullTile = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
      // 26.45: tile polygons with more than four corners (or concave ones) are split into convex
      // pieces of up to four corners instead of becoming a full square.
      const authored = definition?.polygon.length ? definition.polygon : fullTile
      const pieces = authored.length <= 4 ? [authored] : decomposeSimplePolygon(authored)
      for (const polygon of pieces.length ? pieces : [fullTile]) result.push({
        center: { x: (x + .5 - component.width * .5) * component.tileSize.x, y: (y + .5 - component.height * .5) * component.tileSize.y },
        size: { ...component.tileSize }, oneWay: kind === 'OneWay',
        vertices: polygon.map(/* 调用 transformNormalizedTilePoint(point, cellDefinition?.flags ?? 0) 并返回调用结果。 */ point => transformNormalizedTilePoint(point, cellDefinition?.flags ?? 0)).map(/** 构造并返回记录 { x: (point.x - .5) * component.tileSize.x, y: (point.y - .5) * component.tileSize.y }，字段按当前实参及捕获状态求值。 */ point => ({ x: (point.x - .5) * component.tileSize.x, y: (point.y - .5) * component.tileSize.y }))
      })
      continue
    }
    let runWidth = 1
    while (x + runWidth < component.width && !visited[index + runWidth] && collision(x + runWidth, y) === kind) runWidth++
    let runHeight = 1
    if (kind === 'Box') {
      outer: while (y + runHeight < component.height) {
        for (let dx = 0; dx < runWidth; dx++) if (visited[(y + runHeight) * component.width + x + dx] || collision(x + dx, y + runHeight) !== 'Box') break outer
        runHeight++
      }
    }
    for (let dy = 0; dy < runHeight; dy++) for (let dx = 0; dx < runWidth; dx++) visited[(y + dy) * component.width + x + dx] = 1
    const width = runWidth * component.tileSize.x, height = runHeight * component.tileSize.y
    result.push({
      center: { x: (x + runWidth * .5 - component.width * .5) * component.tileSize.x, y: (y + runHeight * .5 - component.height * .5) * component.tileSize.y },
      size: { x: width, y: height }, vertices: [], oneWay: kind === 'OneWay'
    })
  }
  return result
}
 return {tileMapView,readRuntimeTileChunk,writeRuntimeTileChunk,tileMetadataAt,worldToTile,tileWorldCoordinate,deterministicTileMapStorage,tileStreamingBoundaries,markTileDirty,advanceLocalTileRevision,invalidateTileMap,setTileAnimationTime,animationTile,tileChunkCommands,transformNormalizedTilePoint,tilePlacementDescriptors,buildTileColliderDescriptors}
}


/** Applies the same rotate/mirror flags used by rendering and collider baking. */
/** 结构说明（自动提取）：transformNormalizedTilePoint；输入 point、flags；写入 x、y；包含循环处理。 */ export function transformNormalizedTilePoint(point: Vec2, flags: number): Vec2 {
  let x = point.x - .5, y = point.y - .5
  if ((flags & 4) !== 0) x = -x
  if ((flags & 8) !== 0) y = -y
  for (let turn = 0; turn < (flags & 3); turn++) { const previous = x; x = -y; y = previous }
  return { x: x + .5, y: y + .5 }
}
export class TileMapOwner {
 readonly world:TileWorld
 readonly resources:TileSetResourceOwner
 private readonly impl:ReturnType<typeof createTileImplementation>
 constructor(ports:TileMapPorts){if(!ports?.world||!Array.isArray(ports.world.entities)||!(ports.resources instanceof TileSetResourceOwner)||typeof ports.nowMilliseconds!=='function')throw new Error('TILE_WORLD_PORTS_REQUIRED');this.world=ports.world;this.resources=ports.resources;this.impl=createTileImplementation({...ports,nowMilliseconds:ports.nowMilliseconds.bind(ports)})}
 private requireComponent(component:TileMap2D){const plain=plainView(component);if(!this.world.entities.some(v=>plainView(v.getComponent('TileMap2D'))===plain))throw new Error('TILE_COMPONENT_WORLD_MISMATCH')}
 private requireMembers(entity:Entity,component:TileMap2D,entities:Entity[]){const members=plainView(entities);if(members!==plainView(this.world.entities)||!members.includes(plainView(entity))||plainView(entity.getComponent('TileMap2D'))!==plainView(component))throw new Error('TILE_WORLD_MISMATCH')}
 readTileSet(reference:string|null|undefined){return this.resources.readTileSet(reference)}
 
  tileMapView(component: TileMap2D): TileMap2D { return this.impl.tileMapView(component) }
  readRuntimeTileChunk(component: TileMap2D, layerId: string, chunkX: number, chunkY: number): RuntimeTileChunk | null { return this.impl.readRuntimeTileChunk(component,layerId,chunkX,chunkY) }
  writeRuntimeTileChunk(component: TileMap2D, chunk: RuntimeTileChunk): boolean { this.requireComponent(component);return this.impl.writeRuntimeTileChunk(component,chunk) }
  tileMetadataAt(component: TileMap2D, x: number, y: number): Record<string, boolean | number | string> { return this.impl.tileMetadataAt(component,x,y) }
  worldToTile(entity: Entity, component: TileMap2D, point: Vec2, entities: Entity[]): { x: number; y: number } | null { return this.impl.worldToTile(entity,component,point,entities) }
  tileWorldCoordinate(entity: Entity, component: TileMap2D, cell: { x: number; y: number }, entities: Entity[]): Vec2 { return this.impl.tileWorldCoordinate(entity,component,cell,entities) }
  deterministicTileMapStorage(component: TileMap2D): string { return this.impl.deterministicTileMapStorage(component) }
  tileStreamingBoundaries(component: TileMap2D): Array<{ chunkX: number; chunkY: number; left: number; top: number; right: number; bottom: number }> { return this.impl.tileStreamingBoundaries(component) }
  markTileDirty(component: TileMap2D, x: number, y: number, layerId = component.layers[component.activeLayer]?.id): void { return this.impl.markTileDirty(component,x,y,layerId) }
  advanceLocalTileRevision(component: TileMap2D): void { return this.impl.advanceLocalTileRevision(component) }
  invalidateTileMap(component: TileMap2D): void { return this.impl.invalidateTileMap(component) }
  setTileAnimationTime(seconds: number | null): void { return this.impl.setTileAnimationTime(seconds) }
  animationTile(definition: TileDefinition | undefined, nowSeconds: number): number | null { return this.impl.animationTile(definition,nowSeconds) }
  tileChunkCommands(
  entity: Entity,
  component: TileMap2D,
  entities: Entity[],
  visibleBounds?: { minX: number; minY: number; maxX: number; maxY: number },
  cameraPosition?: Vec2
): TileChunkRenderCommand[] { this.requireMembers(entity,component,entities);return this.impl.tileChunkCommands(entity,component,entities,visibleBounds,cameraPosition) }
  transformNormalizedTilePoint(point: Vec2, flags: number): Vec2 { return this.impl.transformNormalizedTilePoint(point,flags) }
  tilePlacementDescriptors(
  entity: Entity,
  component: TileMap2D,
  entities: Entity[],
  chunkX: number,
  chunkY: number
): TilePlacementDescriptor[] { this.requireMembers(entity,component,entities);return this.impl.tilePlacementDescriptors(entity,component,entities,chunkX,chunkY) }
  buildTileColliderDescriptors(component: TileMap2D): TileColliderDescriptor[] { return this.impl.buildTileColliderDescriptors(component) }
}
