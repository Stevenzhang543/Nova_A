import { reactive } from 'vue'

export const RENDER_TEXTURE_LIMITS = { entries: 32, bytes: 64 * 1048576, dimension: 2048 } as const
export interface RenderTextureRecord { key: string; width: number; height: number; canvas: HTMLCanvasElement; updatedFrame: number; revision: number }
export const renderTextureState = reactive({ generation: 0, keys: [] as string[], bytes: 0, evictions: 0, rejectedCaptures: 0, lastError: '' })
const textures = new Map<string, RenderTextureRecord>()
function discard(key: string): void { const record = textures.get(key); if (!record) return; textures.delete(key); renderTextureState.bytes -= record.width * record.height * 4; record.canvas.width = 0; record.canvas.height = 0; renderTextureState.evictions++ }
function reject(message: string): false { renderTextureState.rejectedCaptures++; renderTextureState.lastError = message; return false }

/** Capture into a temporary surface first; invalid/failed captures retain the last good pixels. */
export function captureRenderTexture(key: string, source: HTMLCanvasElement, viewport: { x: number; y: number; width: number; height: number }, frame: number): boolean {
  const safeKey = key.trim().slice(0, 120)
  if (!safeKey || ![viewport.x, viewport.y, viewport.width, viewport.height, frame, source.width, source.height].every(Number.isFinite) || viewport.width <= 0 || viewport.height <= 0 || source.width <= 0 || source.height <= 0) return reject('Render texture needs a finite non-empty viewport and source.')
  const left = Math.max(0, viewport.x), right = Math.min(1, viewport.x + viewport.width), top = Math.max(0, 1 - viewport.y - viewport.height), bottom = Math.min(1, 1 - viewport.y)
  if (right <= left || bottom <= top) return reject('Render texture viewport does not intersect the source.')
  const sx = Math.round(left * source.width), sy = Math.round(top * source.height), sw = Math.max(1, Math.round(right * source.width) - sx), sh = Math.max(1, Math.round(bottom * source.height) - sy)
  const reduction = Math.min(1, RENDER_TEXTURE_LIMITS.dimension / Math.max(sw, sh)), width = Math.max(1, Math.round(sw * reduction)), height = Math.max(1, Math.round(sh * reduction))
  const prepared = document.createElement('canvas'); prepared.width = width; prepared.height = height
  try {
    const context = prepared.getContext('2d'); if (!context) return reject('Render texture Canvas2D is unavailable.')
    context.globalCompositeOperation = 'copy'; context.drawImage(source, sx, sy, sw, sh, 0, 0, width, height)
    let record = textures.get(safeKey)
    const previousBytes = record ? record.width * record.height * 4 : 0, nextBytes = width * height * 4
    while (textures.size - (record ? 1 : 0) >= RENDER_TEXTURE_LIMITS.entries || renderTextureState.bytes - previousBytes + nextBytes > RENDER_TEXTURE_LIMITS.bytes) { const oldest = [...textures.keys()].find(candidate => candidate !== safeKey); if (!oldest) return reject('Render texture exceeds the cache budget.'); discard(oldest) }
    if (!record) record = { key: safeKey, width, height, canvas: document.createElement('canvas'), updatedFrame: frame, revision: 0 }
    const destination = record.canvas.getContext('2d'); if (!destination) return reject('Render texture output is unavailable.')
    if (record.canvas.width !== width) record.canvas.width = width
    if (record.canvas.height !== height) record.canvas.height = height
    destination.globalCompositeOperation = 'copy'; destination.drawImage(prepared, 0, 0)
    record.width = width; record.height = height; record.updatedFrame = frame; record.revision++
    textures.delete(safeKey); textures.set(safeKey, record); renderTextureState.bytes += nextBytes - previousBytes
    renderTextureState.keys.splice(0, renderTextureState.keys.length, ...textures.keys()); renderTextureState.generation++; renderTextureState.lastError = ''
    return true
  } catch (error) { return reject(error instanceof Error ? error.message : String(error)) }
  finally { prepared.width = 0; prepared.height = 0 }
}
export function resolveRenderTexture(key: string): HTMLCanvasElement | null { const record = textures.get(key); if (record) { textures.delete(key); textures.set(key, record) }; return record?.canvas ?? null }
export function clearRenderTextures(): void { for (const key of textures.keys()) discard(key); renderTextureState.keys.splice(0); renderTextureState.generation++; renderTextureState.lastError = '' }
