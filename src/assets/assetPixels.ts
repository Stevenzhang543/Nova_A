/** 资源像素读取：解码图像并通过画布取得像素数据，供裁剪及区域分析使用。 */
import type { AssetRecord } from './types'
import { DERIVED_SPRITE_LIMITS, validateDerivedSprite } from './derivedSprites'

const fingerprint = /* 调用 JSON.stringify([record.source, record.width, record.height, record.derivedSprite, record.settings]) 并返回调用结果。 */ (record: AssetRecord) => JSON.stringify([record.source, record.width, record.height, record.derivedSprite, record.settings])
const bounds = /** 限制图像边长为正安全整数并检查总像素预算，拒绝超大分析画布。 */ (width: number, height: number) => {
  if (![width, height].every(/* 先计算 Number.isSafeInteger(value) && value > 0；仅当其为真值时求右侧 value <= DERIVED_SPRITE_LIMITS.dimension，返回短路求值结果。 */ value => Number.isSafeInteger(value) && value > 0 && value <= DERIVED_SPRITE_LIMITS.dimension) || width * height > DERIVED_SPRITE_LIMITS.pixels) throw new Error('ASSET_PIXEL_BUDGET: Image analysis accepts at most 8192 pixels per side and 16 megapixels.')
}
/** Reads full original pixels, including unrotated/untrimmed linked frames; authored crops are not applied twice. */
/** 核对图像与原始来源身份，按预算解码并恢复派生裁剪旋转，返回像素和新鲜度断言，同时释放临时图像画布。 */ export async function readAssetPixels(record: AssetRecord, records: readonly AssetRecord[], signal?: AbortSignal): Promise<{width: number; height: number; data: Uint8ClampedArray; assertCurrent(): void}> {
  if (record.assetType !== 'image' || !records.includes(record)) throw new Error('ASSET_PIXEL_SOURCE: The image is no longer in this project.')
  const derived = validateDerivedSprite(record.derivedSprite)
  const source = derived ? records.find(/* 比较 'asset://' + value.uuid 与 derived.textureAsset，返回严格相等的判断结果。 */ value => 'asset://' + value.uuid === derived.textureAsset) : record
  if (!source || source.assetType !== 'image' || source.derivedSprite || !source.source) throw new Error('ASSET_PIXEL_SOURCE: Repair the missing original image first.')
  bounds(source.width, source.height)
  const width = derived?.sourceSize.width ?? record.width, height = derived?.sourceSize.height ?? record.height
  bounds(width, height)
  const before = fingerprint(record), sourceBefore = fingerprint(source)
  const assertCurrent = /** 在异步分析前后检查取消、资源身份以及源和设置指纹，拒绝使用过时像素。 */ () => { if (signal?.aborted || !records.includes(record) || !records.includes(source) || before !== fingerprint(record) || sourceBefore !== fingerprint(source)) throw new Error('ASSET_PIXEL_STALE: The source or settings changed during image analysis. Retry with the current image.') }
  assertCurrent()
  const image = new Image()
  try {
    await new Promise<void>(/** 登记可取消且有超时的图像解码，所有完成路径统一清理监听。 */ (resolve, reject) => {
      const finish = /** 清理解码计时、图像事件和取消监听，再解决或拒绝像素读取等待。 */ (error?: Error) => { clearTimeout(timeout); image.onload = null; image.onerror = null; signal?.removeEventListener('abort', abort); if (error) reject(error); else resolve() }
      const abort = /* 调用 finish(new Error('ASSET_PIXEL_CANCELLED: Image analysis was cancelled.')) 并返回调用结果。 */ () => finish(new Error('ASSET_PIXEL_CANCELLED: Image analysis was cancelled.'))
      const timeout = setTimeout(/* 调用 finish(new Error('ASSET_PIXEL_TIMEOUT: Image decoding exceeded 15 seconds.')) 并返回调用结果。 */ () => finish(new Error('ASSET_PIXEL_TIMEOUT: Image decoding exceeded 15 seconds.')), 15_000)
      image.onload = /* 调用 finish() 并返回调用结果。 */ () => finish(); image.onerror = /* 调用 finish(new Error('ASSET_PIXEL_DECODE: The original image could not be decoded.')) 并返回调用结果。 */ () => finish(new Error('ASSET_PIXEL_DECODE: The original image could not be decoded.'))
      signal?.addEventListener('abort', abort, {once: true}); image.src = source.source
    })
    assertCurrent(); bounds(image.naturalWidth, image.naturalHeight)
    if (image.naturalWidth !== source.width || image.naturalHeight !== source.height) throw new Error('ASSET_PIXEL_DIMENSIONS: Reimport the source to refresh its image dimensions.')
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    try {
      const context = canvas.getContext('2d', {willReadFrequently: true}); if (!context) throw new Error('ASSET_PIXEL_CANVAS: A 2D canvas is unavailable.')
      if (derived) {
        const frame = derived.frame
        if (frame.x + frame.width > source.width || frame.y + frame.height > source.height) throw new Error('ASSET_PIXEL_BOUNDS: The linked frame exceeds its original image.')
        if (derived.rotated) { context.translate(derived.trimOffset.x, derived.trimOffset.y + frame.width); context.rotate(-Math.PI / 2); context.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height) }
        else context.drawImage(image, frame.x, frame.y, frame.width, frame.height, derived.trimOffset.x, derived.trimOffset.y, frame.width, frame.height)
      } else context.drawImage(image, 0, 0)
      const data = context.getImageData(0, 0, width, height).data; assertCurrent()
      return {width, height, data, assertCurrent}
    } finally { canvas.width = 0; canvas.height = 0 }
  } finally { image.onload = null; image.onerror = null; image.src = '' }
}
