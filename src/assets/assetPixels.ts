import type { AssetRecord } from './types'
import { DERIVED_SPRITE_LIMITS, validateDerivedSprite } from './derivedSprites'

const fingerprint = (record: AssetRecord) => JSON.stringify([record.source, record.width, record.height, record.derivedSprite, record.settings])
const bounds = (width: number, height: number) => {
  if (![width, height].every(value => Number.isSafeInteger(value) && value > 0 && value <= DERIVED_SPRITE_LIMITS.dimension) || width * height > DERIVED_SPRITE_LIMITS.pixels) throw new Error('ASSET_PIXEL_BUDGET: Image analysis accepts at most 8192 pixels per side and 16 megapixels.')
}
/** Reads full original pixels, including unrotated/untrimmed linked frames; authored crops are not applied twice. */
export async function readAssetPixels(record: AssetRecord, records: readonly AssetRecord[], signal?: AbortSignal): Promise<{width: number; height: number; data: Uint8ClampedArray; assertCurrent(): void}> {
  if (record.assetType !== 'image' || !records.includes(record)) throw new Error('ASSET_PIXEL_SOURCE: The image is no longer in this project.')
  const derived = validateDerivedSprite(record.derivedSprite)
  const source = derived ? records.find(value => 'asset://' + value.uuid === derived.textureAsset) : record
  if (!source || source.assetType !== 'image' || source.derivedSprite || !source.source) throw new Error('ASSET_PIXEL_SOURCE: Repair the missing original image first.')
  bounds(source.width, source.height)
  const width = derived?.sourceSize.width ?? record.width, height = derived?.sourceSize.height ?? record.height
  bounds(width, height)
  const before = fingerprint(record), sourceBefore = fingerprint(source)
  const assertCurrent = () => { if (signal?.aborted || !records.includes(record) || !records.includes(source) || before !== fingerprint(record) || sourceBefore !== fingerprint(source)) throw new Error('ASSET_PIXEL_STALE: The source or settings changed during image analysis. Retry with the current image.') }
  assertCurrent()
  const image = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => { clearTimeout(timeout); image.onload = null; image.onerror = null; signal?.removeEventListener('abort', abort); if (error) reject(error); else resolve() }
      const abort = () => finish(new Error('ASSET_PIXEL_CANCELLED: Image analysis was cancelled.'))
      const timeout = setTimeout(() => finish(new Error('ASSET_PIXEL_TIMEOUT: Image decoding exceeded 15 seconds.')), 15_000)
      image.onload = () => finish(); image.onerror = () => finish(new Error('ASSET_PIXEL_DECODE: The original image could not be decoded.'))
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
