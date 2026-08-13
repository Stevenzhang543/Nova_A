import { reactive } from 'vue'

export interface RenderTextureRecord { key: string; width: number; height: number; canvas: HTMLCanvasElement; updatedFrame: number }
export const renderTextureState = reactive({ generation: 0, keys: [] as string[] })
const textures = new Map<string, RenderTextureRecord>()

export function captureRenderTexture(key: string, source: HTMLCanvasElement, viewport: { x: number; y: number; width: number; height: number }, frame: number): void {
  const safeKey = key.trim().slice(0, 120)
  if (!safeKey) return
  const sx = Math.round(viewport.x * source.width), sy = Math.round((1 - viewport.y - viewport.height) * source.height)
  const width = Math.max(1, Math.round(viewport.width * source.width)), height = Math.max(1, Math.round(viewport.height * source.height))
  let record = textures.get(safeKey)
  if (!record) { const canvas = document.createElement('canvas'); record = { key: safeKey, width, height, canvas, updatedFrame: frame }; textures.set(safeKey, record) }
  if (record.canvas.width !== width) record.canvas.width = width
  if (record.canvas.height !== height) record.canvas.height = height
  record.width = width; record.height = height; record.updatedFrame = frame
  record.canvas.getContext('2d')?.drawImage(source, sx, sy, width, height, 0, 0, width, height)
  renderTextureState.keys.splice(0, renderTextureState.keys.length, ...textures.keys()); renderTextureState.generation++
}
export function resolveRenderTexture(key: string): HTMLCanvasElement | null { return textures.get(key)?.canvas ?? null }
export function clearRenderTextures(): void { textures.clear(); renderTextureState.keys.splice(0); renderTextureState.generation++ }
