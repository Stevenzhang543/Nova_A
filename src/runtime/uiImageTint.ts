/** 界面图像着色：生成和缓存带颜色调制的控件图像。 */
import type { UiRect } from './uiLayout'
export interface TintedUiImage { source: HTMLCanvasElement; rect: UiRect }
/** Tint only isolated source pixels: destination-in must never touch the scene canvas. */
export class UiImageTintCache {
  private entries = new Map<string, TintedUiImage & { original: CanvasImageSource; bytes: number }>()
  private bytes = 0
  /** 保存色调纹理缓存的最大像素内存预算。 */ constructor(private readonly maximumBytes = 16 * 1024 * 1024) {}
  /** 按源区域与色调复用最近使用缓存，超预算逐出旧项，以乘色加透明遮罩生成染色画布。 */ resolve(key: string, source: CanvasImageSource, rect: UiRect, tint: { r: number; g: number; b: number }): TintedUiImage {
    const cacheKey = `${key}:${rect.x}:${rect.y}:${rect.width}:${rect.height}:${tint.r}:${tint.g}:${tint.b}`, prior = this.entries.get(cacheKey)
    if (prior?.original === source) { this.entries.delete(cacheKey); this.entries.set(cacheKey, prior); return prior }
    if (prior) { this.bytes -= prior.bytes; this.entries.delete(cacheKey) }
    const width = Math.ceil(rect.width), height = Math.ceil(rect.height), bytes = width * height * 4
    if (![width, height, rect.x, rect.y].every(Number.isFinite) || width <= 0 || height <= 0 || bytes > this.maximumBytes) throw new Error('Image tint requires more than the 16 MiB temporary pixel budget; reduce the source region size.')
    while (this.entries.size && this.bytes + bytes > this.maximumBytes) { const oldest = this.entries.keys().next().value!; this.bytes -= this.entries.get(oldest)!.bytes; this.entries.delete(oldest) }
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    const context = canvas.getContext('2d'); if (!context) throw new Error('Image tint requires an available Canvas2D surface.')
    context.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, width, height)
    context.globalCompositeOperation = 'multiply'; context.fillStyle = `rgb(${tint.r},${tint.g},${tint.b})`; context.fillRect(0, 0, width, height)
    context.globalCompositeOperation = 'destination-in'; context.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, width, height)
    context.globalCompositeOperation = 'source-over'
    const result = { source: canvas, rect: { x: 0, y: 0, width, height }, original: source, bytes }
    this.entries.set(cacheKey, result); this.bytes += bytes; return result
  }
  /** 释放所有染色缓存引用并清零统计字节数。 */ clear(): void { this.entries.clear(); this.bytes = 0 }
  /* 返回具有所列字段的新对象 { entries: this.entries.size, bytes: this.bytes }。 */ inspect(): { entries: number; bytes: number } { return { entries: this.entries.size, bytes: this.bytes } }
}
