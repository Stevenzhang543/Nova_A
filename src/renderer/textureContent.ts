/** 纹理内容标识：追踪图像内容与版本，供渲染纹理缓存判断是否需要更新。 */
import type { TextureRegion } from './types'

/** Published revisions identify immutable pixels; unversioned canvases/video are dynamic. */
/* 优先使用显式内容版本；可变画布与视频按帧失效，静态源使用稳定版本。 */
export function textureContentVersion(region: TextureRegion, frame: number): string {
  if (region.revision !== undefined) return `revision:${region.revision}`
  const source = region.source
  const mutable = (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement)
    || (typeof OffscreenCanvas !== 'undefined' && source instanceof OffscreenCanvas)
    || (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement)
    || (typeof VideoFrame !== 'undefined' && source instanceof VideoFrame)
  return mutable ? `frame:${frame}` : 'static'
}

/** Canvas caches release backing pixels at eviction, not only map references. */
export class CanvasPixelCache {
  private readonly entries = new Map<string, HTMLCanvasElement>()
  private bytesValue = 0
  /* 验证画布缓存的条目和字节上限为正的安全整数。 */
  constructor(readonly maximumEntries = 256, readonly maximumBytes = 32 * 1048576) { if (!Number.isSafeInteger(maximumEntries) || maximumEntries < 1 || !Number.isSafeInteger(maximumBytes) || maximumBytes < 1) throw Error('Canvas cache limits must be positive safe integers.') }
  /* 返回 this.entries.size 的当前值。 */ get size(): number { return this.entries.size }
  /* 返回 this.bytesValue 的当前值。 */ get bytes(): number { return this.bytesValue }
  /* 读取缓存画布并将命中条目移到最近访问位置。 */
  get(key: string): HTMLCanvasElement | undefined {
    const value = this.entries.get(key)
    if (value) { this.entries.delete(key); this.entries.set(key, value) }
    return value
  }
  /* 按条目和内存预算淘汰旧画布后插入新值，过大的单个画布不缓存。 */
  set(key: string, value: HTMLCanvasElement): void {
    if (this.entries.get(key) === value) { this.get(key); return }
    this.delete(key)
    const bytes = value.width * value.height * 4
    if (bytes > this.maximumBytes) return
    while (this.entries.size >= this.maximumEntries || this.bytesValue + bytes > this.maximumBytes) this.delete(this.entries.keys().next().value!)
    this.entries.set(key, value); this.bytesValue += bytes
  }
  /* 删除缓存条目、扣除字节统计并将画布尺寸清零释放像素存储。 */
  delete(key: string): void {
    const value = this.entries.get(key)
    if (!value) return
    this.entries.delete(key); this.bytesValue -= value.width * value.height * 4
    value.width = 0; value.height = 0
  }
  /* 逐项删除并释放全部缓存画布。 */
  clear(): void { for (const key of this.entries.keys()) this.delete(key) }
}
