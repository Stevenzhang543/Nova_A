import { reactive } from 'vue'

export type ShadowQuality = 'Off' | 'Hard' | 'Soft' | 'Ultra'
export type ColorSpace2D = 'sRGB' | 'Linear'
export type RenderDebugView = 'None' | 'Overdraw' | 'BatchBreaks' | 'Lighting' | 'Normals'
export type RenderQualityPreset = 'Performance' | 'Balanced' | 'High' | 'Ultra' | 'PixelArt'

export interface RenderingSettings {
  rendererPath: 'Auto' | 'Native' | 'Compatibility'
  unsupportedPolicy: 'Block' | 'WarnAndFallback'
  qualityPreset: RenderQualityPreset
  lightingEnabled: boolean
  ambientColor: { r: number; g: number; b: number }
  ambientIntensity: number
  shadowQuality: ShadowQuality
  colorSpace: ColorSpace2D
  postProcessing: {
    enabled: boolean
    exposure: number
    contrast: number
    saturation: number
    vignette: number
    bloom: number
    blur: number
    userMaterial: string | null
  }
  debugView: RenderDebugView
  pixelSnap: boolean
  maximumPixelRatio: number
  particleBudget: number
  budgets: { drawCalls: number; textureMemoryMb: number; overdraw: number; gpuMs: number; particleMs: number }
}

export const DEFAULT_RENDERING_SETTINGS: RenderingSettings = {
  rendererPath: 'Auto', unsupportedPolicy: 'WarnAndFallback',
  qualityPreset: 'Balanced',
  lightingEnabled: false,
  ambientColor: { r: 255, g: 255, b: 255 },
  ambientIntensity: 1,
  shadowQuality: 'Soft',
  colorSpace: 'sRGB',
  postProcessing: { enabled: false, exposure: 0, contrast: 1, saturation: 1, vignette: 0, bloom: 0, blur: 0, userMaterial: null },
  debugView: 'None', pixelSnap: false, maximumPixelRatio: 2, particleBudget: 10_000,
  budgets: { drawCalls: 500, textureMemoryMb: 256, overdraw: 4, gpuMs: 8, particleMs: 2 }
}

function finite(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(max, Math.max(min, number))
}

function color(value: unknown, fallback: { r: number; g: number; b: number }) {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    r: Math.round(finite(source.r, fallback.r, 0, 255)),
    g: Math.round(finite(source.g, fallback.g, 0, 255)),
    b: Math.round(finite(source.b, fallback.b, 0, 255))
  }
}

export function normalizeRenderingSettings(value: unknown): RenderingSettings {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const post = source.postProcessing && typeof source.postProcessing === 'object' ? source.postProcessing as Record<string, unknown> : {}
  const budgets = source.budgets && typeof source.budgets === 'object' ? source.budgets as Record<string, unknown> : {}
  const shadowQuality = ['Off', 'Hard', 'Soft', 'Ultra'].includes(String(source.shadowQuality)) ? source.shadowQuality as ShadowQuality : DEFAULT_RENDERING_SETTINGS.shadowQuality
  const debugView = ['None', 'Overdraw', 'BatchBreaks', 'Lighting', 'Normals'].includes(String(source.debugView)) ? source.debugView as RenderDebugView : 'None'
  const qualityPreset = ['Performance', 'Balanced', 'High', 'Ultra', 'PixelArt'].includes(String(source.qualityPreset)) ? source.qualityPreset as RenderQualityPreset : 'Balanced'
  return {
    rendererPath: ['Auto', 'Native', 'Compatibility'].includes(String(source.rendererPath)) ? source.rendererPath as RenderingSettings['rendererPath'] : 'Auto',
    unsupportedPolicy: source.unsupportedPolicy === 'Block' ? 'Block' : 'WarnAndFallback',
    qualityPreset,
    lightingEnabled: source.lightingEnabled === true,
    ambientColor: color(source.ambientColor, DEFAULT_RENDERING_SETTINGS.ambientColor),
    ambientIntensity: finite(source.ambientIntensity, 1, 0, 8),
    shadowQuality,
    colorSpace: source.colorSpace === 'Linear' ? 'Linear' : 'sRGB',
    postProcessing: {
      enabled: post.enabled === true,
      exposure: finite(post.exposure, 0, -8, 8), contrast: finite(post.contrast, 1, 0, 4), saturation: finite(post.saturation, 1, 0, 4),
      vignette: finite(post.vignette, 0, 0, 1), bloom: finite(post.bloom, 0, 0, 2), blur: finite(post.blur, 0, 0, 32),
      userMaterial: typeof post.userMaterial === 'string' ? post.userMaterial.slice(0, 512) : null
    },
    debugView,
    pixelSnap: source.pixelSnap === true,
    maximumPixelRatio: finite(source.maximumPixelRatio, 2, 1, 4),
    particleBudget: Math.round(finite(source.particleBudget, 10_000, 100, 100_000)),
    budgets: { drawCalls: Math.round(finite(budgets.drawCalls, 500, 1, 100_000)), textureMemoryMb: finite(budgets.textureMemoryMb, 256, 1, 65_536), overdraw: finite(budgets.overdraw, 4, 1, 128), gpuMs: finite(budgets.gpuMs, 8, .1, 100), particleMs: finite(budgets.particleMs, 2, .05, 100) }
  }
}

export const renderingSettings = reactive<RenderingSettings>(normalizeRenderingSettings(DEFAULT_RENDERING_SETTINGS))

export function loadRenderingSettings(value: unknown): void { Object.assign(renderingSettings, normalizeRenderingSettings(value)) }
export function serializeRenderingSettings(): RenderingSettings { return JSON.parse(JSON.stringify(normalizeRenderingSettings(renderingSettings))) as RenderingSettings }
export function advancedRenderingActive(): boolean {
  return renderingSettings.lightingEnabled || renderingSettings.postProcessing.enabled || renderingSettings.debugView !== 'None'
}

export function applyQualityPreset(preset: RenderQualityPreset): void {
  renderingSettings.qualityPreset = preset
  if (preset === 'Performance') { Object.assign(renderingSettings, { shadowQuality: 'Off', maximumPixelRatio: 1, particleBudget: 2_500, pixelSnap: false }); Object.assign(renderingSettings.postProcessing, { enabled: false, bloom: 0, blur: 0 }) }
  else if (preset === 'Balanced') Object.assign(renderingSettings, { shadowQuality: 'Soft', maximumPixelRatio: 1.5, particleBudget: 10_000, pixelSnap: false })
  else if (preset === 'High') Object.assign(renderingSettings, { shadowQuality: 'Soft', maximumPixelRatio: 2, particleBudget: 25_000, pixelSnap: false })
  else if (preset === 'Ultra') Object.assign(renderingSettings, { shadowQuality: 'Ultra', maximumPixelRatio: 3, particleBudget: 50_000, pixelSnap: false })
  else if (preset === 'PixelArt') Object.assign(renderingSettings, { shadowQuality: 'Hard', maximumPixelRatio: 1, particleBudget: 10_000, pixelSnap: true, colorSpace: 'sRGB' })
}
