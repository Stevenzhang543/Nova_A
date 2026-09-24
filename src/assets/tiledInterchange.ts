/** Tiled 数据转换：将瓦片集与地图文档转换为 Nova_A 可消费的资源结构。 */
/** Finite orthogonal Tiled interchange. Unsupported encodings fail explicitly before import commit. */
export const TILED_LIMITS = Object.freeze({cells: 4_194_304, layers: 128, tiles: 65_536, sources: 64, dimension: 2048})
type Obj = Record<string, any>
const object = /* 根据 value && typeof value === 'object' && !Array.isArray(value) 的真假，分别返回 value as Obj 或 {}。 */ (value: unknown): Obj => value && typeof value === 'object' && !Array.isArray(value) ? value as Obj : {}
const fail = /** 抛出带 Tiled 导入前缀的具体格式错误。 */ (message: string): never => { throw new Error('TILED_IMPORT: ' + message) }
const number = /** 读取数值或默认值，按有限性、整数选项及范围校验，拒绝非法或超大字段。 */ (value: unknown, fallback: number, min: number, max: number, whole = true): number => {
  const n = value === undefined ? fallback : Number(value)
  if (!Number.isFinite(n) || whole && !Number.isSafeInteger(n) || n < min || n > max) return fail('Invalid or oversized numeric field.')
  return n
}
const list = /** 缺失值视为空数组，其他输入必须为不超过上限的数组。 */ (value: unknown, max: number): any[] => { if (value === undefined) return []; if (!Array.isArray(value) || value.length > max) return fail('Array exceeds its supported limit.'); return value }
const name = /* 根据 typeof value === 'string' 的真假，分别返回 value.slice(0, 1024) 或 fallback。 */ (value: unknown, fallback = '') => typeof value === 'string' ? value.slice(0, 1024) : fallback
const properties = /** 从有界属性列表提取具字符串名称和有限基本值的项，限制名称长度后生成映射。 */ (value: unknown) => Object.fromEntries(list(value,128).map(object).filter(/** 保留具字符串名称且值为字符串、布尔或有限数值的自定义属性。 */ v => typeof v.name === 'string' && ['string','boolean','number'].includes(typeof v.value) && (typeof v.value !== 'number' || Number.isFinite(v.value))).map(/* 返回按声明顺序构造的数组 [v.name.slice(0,120),v.value]。 */ v => [v.name.slice(0,120),v.value]))

/** 转换单图集瓦片集，检查尺寸、身份、可支持碰撞多边形及动画帧，生成 Nova 瓦片文档。 */ export function convertTiledTileSet(document: Obj): Obj {
  if (document.objectalignment && document.objectalignment !== 'unspecified' || document.tileoffset && (document.tileoffset.x || document.tileoffset.y)) return fail('Tile alignment/offset must be baked into source pixels before import.')
  const tileWidth = number(document.tilewidth,32,1,8192), tileHeight = number(document.tileheight,32,1,8192)
  const margin = number(document.margin,0,0,8192), spacing = number(document.spacing,0,0,8192)
  const imageWidth = number(document.imagewidth,tileWidth,1,8192), imageHeight = number(document.imageheight,tileHeight,1,8192)
  const columns = number(document.columns,Math.floor((imageWidth-2*margin+spacing)/(tileWidth+spacing)),1,TILED_LIMITS.tiles)
  const count = number(document.tilecount,columns*Math.floor((imageHeight-2*margin+spacing)/(tileHeight+spacing)),1,TILED_LIMITS.tiles)
  const raw = new Map<number,Obj>()
  for (const item of list(document.tiles,TILED_LIMITS.tiles).map(object)) { const id=number(item.id,0,0,count-1); if(raw.has(id))return fail('Duplicate local tile ID.'); if(item.image)return fail('Image-collection tilesets require an atlas image.'); raw.set(id,item) }
  const tiles = Array.from({length:count},/** 转换单个瓦片的裁剪区域、至多四点凸碰撞轮廓、属性和逐帧时长，拒绝不受支持几何。 */ (_,index)=>{
    const tile=raw.get(index)??{}, objects=list(object(tile.objectgroup).objects,1).map(object)
    let collision='None',polygon: Array<{x:number;y:number}>=[]
    if(objects.length){const item=objects[0];if(item.ellipse||item.polyline||item.point||item.rotation)return fail('Tile collision supports one unrotated rectangle or convex polygon of at most four vertices.');const x=number(item.x,0,0,tileWidth,false),y=number(item.y,0,0,tileHeight,false)
      const points=item.polygon?list(item.polygon,4).map(object):[{x:0,y:0},{x:number(item.width,tileWidth,0,tileWidth,false),y:0},{x:number(item.width,tileWidth,0,tileWidth,false),y:number(item.height,tileHeight,0,tileHeight,false)},{x:0,y:number(item.height,tileHeight,0,tileHeight,false)}]
      if(points.length<3)return fail('Collision polygons need three or four vertices.')
      polygon=points.map(/** 构造并返回记录 {x:number(x+Number(p.x),0,0,tileWidth,false)/tileWidth,y:1-number(y+Number(p.y),0,0,tileHeight,false)/tileHeight}，字段按当前实参及捕获状态求值。 */ p=>({x:number(x+Number(p.x),0,0,tileWidth,false)/tileWidth,y:1-number(y+Number(p.y),0,0,tileHeight,false)/tileHeight}));let sign=0;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],c=polygon[(i+2)%polygon.length],cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);if(!cross)return fail('Collision polygon is degenerate.');if(sign&&Math.sign(cross)!==sign)return fail('Collision polygon must be convex.');sign=Math.sign(cross)}collision='Polygon'
    }
    const frames=list(tile.animation,256).map(object)
    return {index,name:name(tile.type??tile.class,'Tile '+index),collision,polygon,terrain:'',navigationCost:1,occluder:false,navigationPolygon:[],occlusionPolygon:[],metadata:properties(tile.properties),sceneAsset:null,prefabAsset:null,sourceId:'tiled-primary',region:{x:margin+index%columns*(tileWidth+spacing),y:margin+Math.floor(index/columns)*(tileHeight+spacing),width:tileWidth,height:tileHeight},animation:frames.length?{frames:frames.map(/* 调用 number(f.tileid,index,0,count-1) 并返回调用结果。 */ f=>number(f.tileid,index,0,count-1)),durations:frames.map(/* 计算表达式 number(f.duration,125,1,3_600_000)/1000 并返回结果，沿用操作数的原有类型规则。 */ f=>number(f.duration,125,1,3_600_000)/1000),framesPerSecond:1000/number(frames[0].duration,125,1,3_600_000),mode:'Loop'}:null,variants:[]}
  })
  if(tiles.some(/* 先计算 tile.region.x+tileWidth>imageWidth；仅当其为假值时求右侧 tile.region.y+tileHeight>imageHeight，返回短路求值结果。 */ tile=>tile.region.x+tileWidth>imageWidth||tile.region.y+tileHeight>imageHeight))return fail('Tile regions exceed the declared atlas image.')
  return {version:2,textureAsset:null,texturePath:name(document.image),sources:[{id:'tiled-primary',name:name(document.name,'Tiled source'),textureAsset:null,texturePath:name(document.image),margin,spacing}],tileWidth,tileHeight,columns,rows:Math.ceil(count/columns),tiles}
}
/** 仅接受有限正交地图及支持的瓦片层，检查总单元预算，保留全局瓦片标识并转换嵌入瓦片集。 */ export function convertTiledMap(document: Obj): Obj {
  if(document.infinite===true||document.infinite===1||document.infinite==='1')return fail('Infinite/chunked maps are not supported by this finite-map importer; export a finite map.')
  if(document.orientation&&document.orientation!=='orthogonal')return fail('Export an orthogonal map; isometric, staggered and hexagonal layouts need their own coordinate model.')
  if(document.renderorder&&document.renderorder!=='right-down')return fail('Only right-down source drawing order is supported.')
  const width=number(document.width,1,1,2048),height=number(document.height,1,1,2048),raw=list(document.layers,TILED_LIMITS.layers)
  if(raw.length*width*height>TILED_LIMITS.cells)throw new Error('CONTENT_CELL_LIMIT: Tiled layers exceed the aggregate 4,194,304-cell budget.')
  const ids=new Set<string>(),layers=raw.map(/** 检查地图层布局、编码、单元数量和唯一身份，再转换混合模式、视差及属性。 */ (value,index)=>{const layer=object(value)
    if(layer.type&&layer.type!=='tilelayer'||layer.chunks||!Array.isArray(layer.data)||layer.compression||layer.encoding&&layer.encoding!=='csv')return fail('Use finite tile layers with JSON arrays or uncompressed XML CSV data; object/image/group layers must be converted explicitly.')
    if(layer.offsetx||layer.offsety||layer.x||layer.y||layer.tintcolor)return fail('Layer offsets and tints must be baked before import.')
    if(number(layer.width,width,1,2048)!==width||number(layer.height,height,1,2048)!==height||layer.data.length!==width*height)return fail('Every layer must contain exactly width × height cells.')
    const id=String(layer.id??'layer-'+index);if(ids.has(id))return fail('Duplicate layer ID.');ids.add(id)
    const gids=layer.data.map(/* 调用 number(gid,0,0,0xffffffff) 并返回调用结果。 */ (gid:unknown)=>number(gid,0,0,0xffffffff)),mode=layer.mode??'normal';if(!['normal','add','multiply','screen'].includes(mode))return fail('Unsupported layer blend mode: '+mode)
    return {id,name:name(layer.name,'Layer '+(index+1)),visible:layer.visible!==false&&layer.visible!=='0',opacity:number(layer.opacity,1,0,1,false),parallax:{x:number(layer.parallaxx,1,-16,16,false),y:number(layer.parallaxy,1,-16,16,false)},blendMode:({normal:'Alpha',add:'Additive',multiply:'Multiply',screen:'Screen'} as Obj)[mode],gids,tiles:gids.map(/* 计算表达式 (gid&0x0fffffff)-1 并返回结果，沿用操作数的原有类型规则。 */ (gid:number)=>(gid&0x0fffffff)-1),properties:properties(layer.properties)}
  })
  const firstIds=new Set<number>(),tilesets=list(document.tilesets,TILED_LIMITS.sources).map(/** 校验瓦片集起始全局身份唯一，保留外部来源或转换内嵌文档。 */ value=>{const item=object(value),firstGid=number(item.firstgid,1,1,0x0fffffff);if(firstIds.has(firstGid))return fail('Duplicate firstgid.');firstIds.add(firstGid);return {firstGid,source:name(item.source),sourceAsset:null,document:item.source?null:convertTiledTileSet(item)}}).sort(/* 计算表达式 a.firstGid-b.firstGid 并返回结果，沿用操作数的原有类型规则。 */ (a,b)=>a.firstGid-b.firstGid)
  return {format:'nova-tiled-map-resource',version:1,width,height,tileWidth:number(document.tilewidth,32,1,8192),tileHeight:number(document.tileheight,32,1,8192),infinite:false,layers,tilesets,properties:properties(document.properties)}
}
