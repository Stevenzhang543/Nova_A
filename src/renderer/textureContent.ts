import type { TextureRegion } from './types'

/** Published revisions identify immutable pixels; unversioned canvases/video are dynamic. */
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
  constructor(readonly maximumEntries = 256, readonly maximumBytes = 32 * 1048576) { if (!Number.isSafeInteger(maximumEntries) || maximumEntries < 1 || !Number.isSafeInteger(maximumBytes) || maximumBytes < 1) throw Error('Canvas cache limits must be positive safe integers.') }
  get size(): number { return this.entries.size }
  get bytes(): number { return this.bytesValue }
  get(key: string): HTMLCanvasElement | undefined {
    const value = this.entries.get(key)
    if (value) { this.entries.delete(key); this.entries.set(key, value) }
    return value
  }
  set(key: string, value: HTMLCanvasElement): void {
    if (this.entries.get(key) === value) { this.get(key); return }
    this.delete(key)
    const bytes = value.width * value.height * 4
    if (bytes > this.maximumBytes) return
    while (this.entries.size >= this.maximumEntries || this.bytesValue + bytes > this.maximumBytes) this.delete(this.entries.keys().next().value!)
    this.entries.set(key, value); this.bytesValue += bytes
  }
  delete(key: string): void {
    const value = this.entries.get(key)
    if (!value) return
    this.entries.delete(key); this.bytesValue -= value.width * value.height * 4
    value.width = 0; value.height = 0
  }
  clear(): void { for (const key of this.entries.keys()) this.delete(key) }
}
