import { reactive } from 'vue'

export type ShadowQuality = 'Off' | 'Hard' | 'Soft' | 'Ultra'
export type ColorSpace2D = 'sRGB' | 'Linear'
export type RenderDebugView = 'None' | 'Overdraw' | 'Lighting' | 'Normals'

export interface RenderingSettings {
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
}

export const DEFAULT_RENDERING_SETTINGS: RenderingSettings = {
  lightingEnabled: false,
  ambientColor: { r: 255, g: 255, b: 255 },
  ambientIntensity: 1,
  shadowQuality: 'Soft',
  colorSpace: 'sRGB',
  postProcessing: { enabled: false, exposure: 0, contrast: 1, saturation: 1, vignette: 0, bloom: 0, blur: 0, userMaterial: null },
  debugView: 'None'
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
  const shadowQuality = ['Off', 'Hard', 'Soft', 'Ultra'].includes(String(source.shadowQuality)) ? source.shadowQuality as ShadowQuality : DEFAULT_RENDERING_SETTINGS.shadowQuality
  const debugView = ['None', 'Overdraw', 'Lighting', 'Normals'].includes(String(source.debugView)) ? source.debugView as RenderDebugView : 'None'
  return {
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
    debugView
  }
}

export const renderingSettings = reactive<RenderingSettings>(normalizeRenderingSettings(DEFAULT_RENDERING_SETTINGS))

export function loadRenderingSettings(value: unknown): void { Object.assign(renderingSettings, normalizeRenderingSettings(value)) }
export function serializeRenderingSettings(): RenderingSettings { return JSON.parse(JSON.stringify(normalizeRenderingSettings(renderingSettings))) as RenderingSettings }
export function advancedRenderingActive(): boolean {
  return renderingSettings.lightingEnabled || renderingSettings.postProcessing.enabled || renderingSettings.debugView !== 'None'
}
