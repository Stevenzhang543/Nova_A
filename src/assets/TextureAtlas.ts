/** 纹理图集构建：加载图像、安排矩形位置并输出图集与资源区域映射。 */
import type { AssetRecord, TextureAtlasPage } from './types'

interface LoadedImage {
  record: AssetRecord
  image: HTMLImageElement
}

interface Shelf {
  y: number
  height: number
  x: number
}
export const TEXTURE_ATLAS_LIMITS = Object.freeze({ sources: 16384, decodeConcurrency: 4, decodedPixels: 128 * 1024 * 1024, pagePixels: 128 * 1024 * 1024, decodeTimeoutMs: 15000 })
const ordinal = /* 根据 first < second 的真假，分别返回 -1 或 first > second ? 1 : 0。 */ (first:string,second:string) => first < second ? -1 : first > second ? 1 : 0

/** 异步解码图集源图像，成功、失败或超时时结算并释放加载监听。 */ function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise(/** 建立解码图像及超时监听，将成功或失败统一交给结算函数。 */ (resolve, reject) => {
    const image = new Image()
    const finish=/** 取消图像解码计时并清除加载监听，按错误状态解决或拒绝等待。 */ (error?:Error)=>{clearTimeout(timeout);image.onload=null;image.onerror=null;if(error)reject(error);else resolve(image)}
    const timeout=setTimeout(/* 调用 finish(new Error('Image decode exceeded 15 seconds')) 并返回调用结果。 */ ()=>finish(new Error('Image decode exceeded 15 seconds')),TEXTURE_ATLAS_LIMITS.decodeTimeoutMs)
    image.onload = /* 调用 finish() 并返回调用结果。 */ () => finish()
    image.onerror = /* 调用 finish(new Error('Image asset could not be decoded')) 并返回调用结果。 */ () => finish(new Error('Image asset could not be decoded'))
    image.src = source
  })
}

/** 优先放入高度适合且横向有余量的货架，否则在页底新增货架，空间不足返回 null。 */ function place(width: number, height: number, shelves: Shelf[], pageSize: number): { x: number; y: number } | null {
  for (const shelf of shelves) {
    if (height <= shelf.height && shelf.x + width <= pageSize) {
      const result = { x: shelf.x, y: shelf.y }
      shelf.x += width
      return result
    }
  }
  const y = shelves.reduce(/* 调用 Math.max(bottom, shelf.y + shelf.height) 并返回调用结果。 */ (bottom, shelf) => Math.max(bottom, shelf.y + shelf.height), 0)
  if (y + height > pageSize) return null
  shelves.push({ y, height, x: width })
  return { x: 0, y }
}

/** 快照图集设置，在并发和像素预算内解码，再按分组及尺寸排序分页打包，返回纹理区域映射。 */ export async function buildTextureAtlases(records: AssetRecord[], pageSize = 2048): Promise<TextureAtlasPage[]> {
  pageSize = Math.min(8192, Math.max(64, Math.trunc(Number.isFinite(pageSize) ? pageSize : 2048)))
  const sources = records.filter(/* 先计算 record.assetType === 'image' && !record.derivedSprite && record.settings.atlas；仅当其为真值时求右侧 record.source，返回短路求值结果。 */ record => record.assetType === 'image' && !record.derivedSprite && record.settings.atlas && record.source).map(/** 构造并返回记录 {...record,settings:JSON.parse(JSON.stringify(record.settings)) as AssetRecord['settings']}，字段按当前实参及捕获状态求值。 */ record=>({...record,settings:JSON.parse(JSON.stringify(record.settings)) as AssetRecord['settings']}))
  if(sources.length>TEXTURE_ATLAS_LIMITS.sources)throw new Error('ATLAS_SOURCE_LIMIT: Too many atlas sources; previous atlas retained.')
  const loaded:LoadedImage[]=[];let decodedPixels=0,cursor=0,failure:Error|null=null
  const workers=Array.from({length:Math.min(TEXTURE_ATLAS_LIMITS.decodeConcurrency,sources.length)},/** 从共享游标获取图像并解码，累计像素预算；首次失败后停止领取后续任务。 */ async()=>{
    while(cursor<sources.length&&!failure){const record=sources[cursor++]
      try{const image=await loadImage(record.source),pixels=image.naturalWidth*image.naturalHeight
        if(!Number.isSafeInteger(pixels)||pixels<1||decodedPixels+pixels>TEXTURE_ATLAS_LIMITS.decodedPixels)throw new Error('ATLAS_PIXEL_LIMIT: Decoded atlas images exceed the pixel budget.')
        decodedPixels+=pixels;loaded.push({record,image})
      }catch(error){failure=error instanceof Error&&error.message.startsWith('ATLAS_PIXEL_LIMIT')?error:new Error(`ATLAS_IMAGE_DECODE: ${record.path} could not be decoded; previous atlas retained.`)}
    }
  })
  await Promise.all(workers)
  if(failure)throw failure
  loaded.sort(/** 按图集分组、递减高宽及稳定资源身份排序，确保打包顺序可复现。 */ (first, second) => ordinal(first.record.settings.atlasSettings.group,second.record.settings.atlasSettings.group) || second.image.naturalHeight - first.image.naturalHeight || second.image.naturalWidth - first.image.naturalWidth || ordinal(first.record.uuid,second.record.uuid))

  const groupSizes = new Map<string, number>()
  for (const item of loaded) { const requested = Number(item.record.settings.atlasSettings.maxSize), limit = Number.isFinite(requested) ? Math.min(pageSize, Math.max(64, Math.trunc(requested))) : pageSize; groupSizes.set(item.record.settings.atlasSettings.group, Math.min(groupSizes.get(item.record.settings.atlasSettings.group) ?? pageSize, limit)) }
  const pages: TextureAtlasPage[] = []
  let activeSize = pageSize
  let page: TextureAtlasPage | null = null
  let context: CanvasRenderingContext2D | null = null
  let shelves: Shelf[] = []
  let activeGroup: string | null = null
  let pagePixels=0
  const createPage = /** 检查生成页像素预算后创建透明图集画布，重置货架并要求二维上下文可用。 */ () => {
    if(pagePixels+activeSize*activeSize>TEXTURE_ATLAS_LIMITS.pagePixels)throw new Error('ATLAS_PAGE_LIMIT: Generated atlas pages exceed the pixel budget; previous atlas retained.')
    pagePixels+=activeSize*activeSize
    const canvas = document.createElement('canvas')
    canvas.width = activeSize
    canvas.height = activeSize
    page = { key: `atlas:${pages.length}`, canvas, regions: new Map() }
    pages.push(page)
    context = canvas.getContext('2d', { alpha: true })
    if (!context) throw new Error('ATLAS_CANVAS: Could not allocate a 2D canvas; previous atlas retained.')
    context.clearRect(0, 0, activeSize, activeSize)
    shelves = []
  }

  for (const item of loaded) {
    activeSize = groupSizes.get(item.record.settings.atlasSettings.group) ?? pageSize
    const rawPadding = Number(item.record.settings.atlasSettings.padding), padding = Math.min(32, Math.max(0, Math.trunc(Number.isFinite(rawPadding) ? rawPadding : 0)))
    if (padding * 2 >= activeSize || item.image.naturalWidth < 1 || item.image.naturalHeight < 1) throw new Error(`ATLAS_DIMENSIONS: Invalid image dimensions or padding for ${item.record.path}.`)
    const scale = Math.min(1, (activeSize - padding * 2) / Math.max(item.image.naturalWidth, item.image.naturalHeight))
    const width = Math.max(1, Math.round(item.image.naturalWidth * scale))
    const height = Math.max(1, Math.round(item.image.naturalHeight * scale))
    if (!page || activeGroup !== item.record.settings.atlasSettings.group) createPage()
    activeGroup = item.record.settings.atlasSettings.group
    let position = place(width + padding * 2, height + padding * 2, shelves, activeSize)
    if (!position) { createPage(); position = place(width + padding * 2, height + padding * 2, shelves, activeSize) }
    if (!page || !context || !position) continue
    const activePage = page as TextureAtlasPage
    const activeContext = context as CanvasRenderingContext2D
    const x = position.x + padding, y = position.y + padding
    activeContext.drawImage(item.image, x, y, width, height)
    activePage.regions.set(item.record.uuid, {
      key: activePage.key,
      source: activePage.canvas,
      uv: { x: x / activeSize, y: y / activeSize, width: width / activeSize, height: height / activeSize },
      filter: item.record.settings.filterMode
    })
  }
  return pages
}
