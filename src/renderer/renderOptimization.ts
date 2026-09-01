import type { AssetRecord, TextureAtlasPage } from '../assets/types'
import type { RendererStats } from './types'
import type { RenderingSettings } from './renderSettings'

export interface RenderRecommendation { id: string; severity: 'info' | 'warning' | 'error'; title: string; detail: string; remedy: string; metric: number; budget: number }
export interface AtlasPreview { key: string; width: number; height: number; regions: number; utilizationEstimate: number; warning: string; thumbnail: string }
export interface ImportPreview { uuid: string; name: string; dimensions: string; profile: string; sampling: string; colorSpace: string; estimatedMemoryBytes: number; atlasGroup: string; warning: string; thumbnail: string }

export function renderRecommendations(stats: RendererStats, assets: readonly AssetRecord[], settings: RenderingSettings): RenderRecommendation[] {
  const recommendations: RenderRecommendation[] = [], images = assets.filter(asset => asset.assetType === 'image')
  const add = (id: string, severity: RenderRecommendation['severity'], title: string, detail: string, remedy: string, metric: number, budget: number) => recommendations.push({ id, severity, title, detail, remedy, metric, budget })
  if (stats.drawCalls > settings.budgets.drawCalls) add('draw-calls', 'error', 'Draw-call budget exceeded', `${stats.drawCalls} draw calls exceed the ${settings.budgets.drawCalls} project budget.`, 'Group sprites by atlas, material, filtering and blend mode.', stats.drawCalls, settings.budgets.drawCalls)
  else if (stats.drawCalls > settings.budgets.drawCalls * .75) add('draw-calls', 'warning', 'Draw calls approach the budget', `${stats.drawCalls} / ${settings.budgets.drawCalls}.`, 'Inspect Batch Breaks and atlas sprites that render together.', stats.drawCalls, settings.budgets.drawCalls)
  if (stats.overdraw > settings.budgets.overdraw) add('overdraw', 'warning', 'Overdraw exceeds the target', `${stats.overdraw.toFixed(1)} exceeds ${settings.budgets.overdraw.toFixed(1)}.`, 'Trim transparent sprites, reduce full-screen particles, or use the Overdraw view.', stats.overdraw, settings.budgets.overdraw)
  if (stats.gpuMs !== null && stats.gpuMs > settings.budgets.gpuMs) add('gpu-time', 'error', 'GPU frame budget exceeded', `${stats.gpuMs.toFixed(2)} ms exceeds ${settings.budgets.gpuMs.toFixed(2)} ms.`, 'Inspect measured pass times, quality volumes, shadow quality and post-processing.', stats.gpuMs, settings.budgets.gpuMs)
  if (stats.shaderFallbacks > 0) add('shader-fallback', 'error', 'A shader used the fallback path', `${stats.shaderFallbacks} material or post-process shader fallbacks occurred this frame.`, 'Open Shader diagnostics, repair the named material, then capture another frame.', stats.shaderFallbacks, 0)
  if (stats.textureUploads > 8) add('texture-streaming', 'warning', 'Texture uploads are spiking', `${stats.textureUploads} texture uploads occurred in one frame.`, 'Preload the scene atlas and keep streaming/background textures outside frequently switched material groups.', stats.textureUploads, 8)
  if (stats.contextLosses > 0) add('device-recovery', 'warning', 'Graphics context recovery was used', `${stats.contextLosses} WebGL context losses were observed.`, 'Capture the console and capability report; lower texture memory before retrying on the target device.', stats.contextLosses, 0)
  const textureMb = stats.textureMemoryBytes / 1_048_576
  if (textureMb > settings.budgets.textureMemoryMb) add('texture-memory', 'error', 'Texture memory exceeds the budget', `${textureMb.toFixed(1)} MB is resident.`, 'Lower maximum import size, use optimized compression, or unload optional groups.', textureMb, settings.budgets.textureMemoryMb)
  const unatlased = images.filter(asset => !asset.settings.atlas)
  if (unatlased.length > 8) add('atlas', 'info', 'Sprites can batch more efficiently', `${unatlased.length} images are outside atlases.`, 'Enable atlas packing for sprites used together; keep normal maps and streaming backgrounds separate.', unatlased.length, 8)
  const mixedFilters = new Set(images.map(asset => asset.settings.filterMode))
  if (mixedFilters.size > 1 && (stats.batchBreakReasons.filter ?? 0) > 0) add('filter-breaks', 'info', 'Filtering splits batches', `${stats.batchBreakReasons.filter} filter changes were measured.`, 'Separate pixel-art and smooth-sprite draw groups or align their import profiles.', stats.batchBreakReasons.filter ?? 0, 0)
  if (!recommendations.length) add('healthy', 'info', 'Rendering is within current budgets', 'No measured frame metric exceeds its configured target.', 'Capture representative gameplay before raising quality settings.', 0, 0)
  return recommendations.slice(0, 12)
}

export function atlasPreviews(pages: readonly TextureAtlasPage[]): AtlasPreview[] {
  return pages.slice(0, 16).map(page => {
    const width = Math.max(1, page.canvas.width), height = Math.max(1, page.canvas.height)
    let occupied = 0
    for (const region of page.regions.values()) occupied += Math.max(0, region.uv.width * width) * Math.max(0, region.uv.height * height)
    const utilizationEstimate = Math.min(1, occupied / (width * height))
    let thumbnail = ''
    try { thumbnail = page.canvas.toDataURL('image/png') } catch { /* An unavailable preview never blocks import diagnostics. */ }
    return { key: page.key, width, height, regions: page.regions.size, utilizationEstimate, warning: utilizationEstimate < .35 && page.regions.size > 1 ? 'Low utilization: align atlas groups and maximum sizes.' : '', thumbnail }
  })
}

export function importPreviews(assets: readonly AssetRecord[]): ImportPreview[] {
  return assets.filter(asset => asset.assetType === 'image').slice(0, 48).map(asset => {
    const width = Math.max(0, asset.width), height = Math.max(0, asset.height), mipFactor = asset.settings.generateMipmaps ? 4 / 3 : 1
    const estimatedMemoryBytes = Math.round(width * height * 4 * mipFactor)
    const warning = !width || !height ? 'Dimensions are pending import.' : asset.settings.textureProfile === 'PixelArt' && asset.settings.filterMode !== 'Nearest' ? 'Pixel-art profile should use nearest filtering.' : asset.settings.atlas && Math.max(width, height) > asset.settings.atlasSettings.maxSize ? 'Image exceeds its atlas maximum size.' : ''
    return { uuid: asset.uuid, name: asset.name, dimensions: `${width || '?'}×${height || '?'}`, profile: asset.settings.textureProfile, sampling: asset.settings.filterMode, colorSpace: asset.settings.colorSpace, estimatedMemoryBytes, atlasGroup: asset.settings.atlas ? asset.settings.atlasSettings.group : 'Not atlased', warning, thumbnail: asset.source }
  })
}
