import type { DerivedSprite } from './derivedSprites'
import { validateDerivedSprite } from './derivedSprites'
import type { TextureRegion } from '../renderer'

const cache = new Map<string, { canvas: HTMLCanvasElement; bytes: number }>()
const MAX_BYTES = 64 * 1024 * 1024, MAX_ENTRIES = 512
let bytes = 0
export function derivedSpriteTextureStats() { return { entries: cache.size, bytes, maxBytes: MAX_BYTES, maxEntries: MAX_ENTRIES } }
export function clearDerivedSpriteTextures(): void { cache.clear(); bytes = 0 }

/** Undo clockwise atlas packing and transparent trimming into original source-frame coordinates. */
export function resolveDerivedSpriteTexture(sprite: DerivedSprite, texture: TextureRegion, imageSize: { width: number; height: number }, filter: 'Nearest' | 'Linear'): TextureRegion | null {
  const valid = validateDerivedSprite(sprite)!, frame = valid.frame, source = texture.source
  if (frame.x + frame.width > imageSize.width || frame.y + frame.height > imageSize.height || imageSize.width <= 0 || imageSize.height <= 0) return null
  const key = `derived:${texture.key}:${texture.revision ?? ''}:${JSON.stringify(valid)}`
  let entry = cache.get(key)
  if (entry) { cache.delete(key); cache.set(key, entry) }
  else {
    const weight = valid.sourceSize.width * valid.sourceSize.height * 4
    if (weight > MAX_BYTES) return null
    while (cache.size && (bytes + weight > MAX_BYTES || cache.size >= MAX_ENTRIES)) { const first = cache.keys().next().value!; bytes -= cache.get(first)!.bytes; cache.delete(first) }
    const canvas = document.createElement('canvas'); canvas.width = valid.sourceSize.width; canvas.height = valid.sourceSize.height
    const context = canvas.getContext('2d'); if (!context) return null
    const dimensions = source as { width: number; height: number; naturalWidth?: number; naturalHeight?: number }
    const sourceWidth = dimensions.naturalWidth || dimensions.width, sourceHeight = dimensions.naturalHeight || dimensions.height
    const sx = (texture.uv.x + frame.x / imageSize.width * texture.uv.width) * sourceWidth
    const sy = (texture.uv.y + frame.y / imageSize.height * texture.uv.height) * sourceHeight
    const sw = frame.width / imageSize.width * texture.uv.width * sourceWidth, sh = frame.height / imageSize.height * texture.uv.height * sourceHeight
    context.imageSmoothingEnabled = false
    if (valid.rotated) { context.translate(valid.trimOffset.x, valid.trimOffset.y + frame.width); context.rotate(-Math.PI / 2) }
    else context.translate(valid.trimOffset.x, valid.trimOffset.y)
    // The database supplies decoded HTML images or packed atlas canvases.
    context.drawImage(source as CanvasImageSource, sx, sy, sw, sh, 0, 0, frame.width, frame.height)
    entry = { canvas, bytes: weight }; cache.set(key, entry); bytes += weight
  }
  return { key, revision: key, source: entry.canvas, uv: { x: 0, y: 0, width: 1, height: 1 }, filter, colorSpace: texture.colorSpace }
}
