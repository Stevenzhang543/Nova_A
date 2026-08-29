import { reactive } from 'vue'

export type ShadowQuality = 'Off' | 'Hard' | 'Soft' | 'Ultra'
export type ColorSpace2D = 'sRGB' | 'Linear'
export type RenderDebugView = 'None' | 'Overdraw' | 'BatchBreaks' | 'Lighting' | 'Normals'
export type RenderQualityPreset = 'Performance' | 'Balanced' | 'High' | 'Ultra' | 'PixelArt'

export interface PostProcessValues {
  exposure: number
  contrast: number
  saturation: number
  vignette: number
  bloom: number
  blur: number
  userMaterial: string | null
}
export interface PostProcessPreset2D { id: string; name: string; values: PostProcessValues }
export interface PostProcessVolume2D { id: string; name: string; enabled: boolean; center: { x: number; y: number }; size: { x: number; y: number }; blendDistance: number; priority: number; presetId: string }

export interface RenderingSettings {
  rendererPath: 'Auto' | 'Native' | 'Compatibility'
  unsupportedPolicy: 'Block' | 'WarnAndFallback'
  qualityPreset: RenderQualityPreset
  lightingEnabled: boolean
  ambientColor: { r: number; g: number; b: number }
  ambientIntensity: number
  shadowQuality: ShadowQuality
  colorSpace: ColorSpace2D
  postProcessing: PostProcessValues & {
    enabled: boolean
    activePreset: string
    presets: PostProcessPreset2D[]
    volumes: PostProcessVolume2D[]
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
  postProcessing: { enabled: false, exposure: 0, contrast: 1, saturation: 1, vignette: 0, bloom: 0, blur: 0, userMaterial: null, activePreset: 'neutral', presets: [
    { id: 'neutral', name: 'Neutral', values: { exposure: 0, contrast: 1, saturation: 1, vignette: 0, bloom: 0, blur: 0, userMaterial: null } },
    { id: 'cinematic', name: 'Cinematic', values: { exposure: -.1, contrast: 1.12, saturation: .92, vignette: .22, bloom: .15, blur: 0, userMaterial: null } },
    { id: 'dream', name: 'Dream', values: { exposure: .12, contrast: .92, saturation: 1.08, vignette: .08, bloom: .4, blur: .5, userMaterial: null } },
    { id: 'pixel', name: 'Pixel crisp', values: { exposure: 0, contrast: 1.08, saturation: 1, vignette: 0, bloom: 0, blur: 0, userMaterial: null } }
  ], volumes: [] },
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

function id(value: unknown, fallback: string): string { const result = typeof value === 'string' ? value.trim().replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 80) : ''; return result || fallback }
function postValues(value: unknown, fallback: PostProcessValues = DEFAULT_RENDERING_SETTINGS.postProcessing): PostProcessValues {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return { exposure: finite(source.exposure, fallback.exposure, -8, 8), contrast: finite(source.contrast, fallback.contrast, 0, 4), saturation: finite(source.saturation, fallback.saturation, 0, 4), vignette: finite(source.vignette, fallback.vignette, 0, 1), bloom: finite(source.bloom, fallback.bloom, 0, 2), blur: finite(source.blur, fallback.blur, 0, 32), userMaterial: typeof source.userMaterial === 'string' ? source.userMaterial.slice(0, 512) : null }
}

export function normalizeRenderingSettings(value: unknown): RenderingSettings {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const post = source.postProcessing && typeof source.postProcessing === 'object' ? source.postProcessing as Record<string, unknown> : {}
  const budgets = source.budgets && typeof source.budgets === 'object' ? source.budgets as Record<string, unknown> : {}
  const shadowQuality = ['Off', 'Hard', 'Soft', 'Ultra'].includes(String(source.shadowQuality)) ? source.shadowQuality as ShadowQuality : DEFAULT_RENDERING_SETTINGS.shadowQuality
  const debugView = ['None', 'Overdraw', 'BatchBreaks', 'Lighting', 'Normals'].includes(String(source.debugView)) ? source.debugView as RenderDebugView : 'None'
  const qualityPreset = ['Performance', 'Balanced', 'High', 'Ultra', 'PixelArt'].includes(String(source.qualityPreset)) ? source.qualityPreset as RenderQualityPreset : 'Balanced'
  const normalizedPost = postValues(post)
  const hasStoredPresets = Array.isArray(post.presets) && post.presets.length > 0
  const presets = hasStoredPresets ? (post.presets as unknown[]).slice(0, 32).flatMap((item, index) => { if (!item || typeof item !== 'object') return []; const preset = item as Record<string, unknown>; return [{ id: id(preset.id, `preset-${index + 1}`), name: typeof preset.name === 'string' ? preset.name.slice(0, 80) : `Preset ${index + 1}`, values: postValues(preset.values, normalizedPost) }] }) : [{ id: 'project', name: 'Project', values: normalizedPost }, ...DEFAULT_RENDERING_SETTINGS.postProcessing.presets.map(item => ({ ...item, values: { ...item.values } }))]
  const uniquePresets = [...new Map(presets.map(preset => [preset.id, preset])).values()]
  const volumes = Array.isArray(post.volumes) ? post.volumes.slice(0, 64).flatMap((item, index) => { if (!item || typeof item !== 'object') return []; const volume = item as Record<string, unknown>, center = volume.center && typeof volume.center === 'object' ? volume.center as Record<string, unknown> : {}, size = volume.size && typeof volume.size === 'object' ? volume.size as Record<string, unknown> : {}; return [{ id: id(volume.id, `volume-${index + 1}`), name: typeof volume.name === 'string' ? volume.name.slice(0, 80) : `Volume ${index + 1}`, enabled: volume.enabled !== false, center: { x: finite(center.x, 0, -1e9, 1e9), y: finite(center.y, 0, -1e9, 1e9) }, size: { x: finite(size.x, 10, .001, 1e9), y: finite(size.y, 10, .001, 1e9) }, blendDistance: finite(volume.blendDistance, 1, 0, 1e6), priority: Math.round(finite(volume.priority, 0, -1000, 1000)), presetId: id(volume.presetId, uniquePresets[0]?.id ?? 'neutral') }] }) : []
  const activePreset = id(post.activePreset, hasStoredPresets ? uniquePresets[0]?.id ?? 'neutral' : 'project')
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
      ...normalizedPost, activePreset, presets: uniquePresets, volumes
    },
    debugView,
    pixelSnap: source.pixelSnap === true,
    maximumPixelRatio: finite(source.maximumPixelRatio, 2, 1, 4),
    particleBudget: Math.round(finite(source.particleBudget, 10_000, 100, 100_000)),
    budgets: { drawCalls: Math.round(finite(budgets.drawCalls, 500, 1, 100_000)), textureMemoryMb: finite(budgets.textureMemoryMb, 256, 1, 65_536), overdraw: finite(budgets.overdraw, 4, 1, 128), gpuMs: finite(budgets.gpuMs, 8, .1, 100), particleMs: finite(budgets.particleMs, 2, .05, 100) }
  }
}

export const renderingSettings = reactive<RenderingSettings>(normalizeRenderingSettings(DEFAULT_RENDERING_SETTINGS))
export const activePostProcessing = reactive<PostProcessValues>({ ...DEFAULT_RENDERING_SETTINGS.postProcessing })

function mix(first: number, second: number, amount: number): number { return first + (second - first) * amount }
function blendPost(first: PostProcessValues, second: PostProcessValues, amount: number): PostProcessValues {
  const factor = Math.min(1, Math.max(0, amount))
  return { exposure: mix(first.exposure, second.exposure, factor), contrast: mix(first.contrast, second.contrast, factor), saturation: mix(first.saturation, second.saturation, factor), vignette: mix(first.vignette, second.vignette, factor), bloom: mix(first.bloom, second.bloom, factor), blur: mix(first.blur, second.blur, factor), userMaterial: factor >= .5 ? second.userMaterial : first.userMaterial }
}

export function updateActivePostProcess(position = { x: 0, y: 0 }): PostProcessValues {
  const settings = renderingSettings.postProcessing, preset = settings.presets.find(item => item.id === settings.activePreset)
  let result = preset ? { ...preset.values } : postValues(settings)
  const candidates = settings.volumes.filter(volume => volume.enabled && settings.presets.some(item => item.id === volume.presetId)).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
  for (const volume of candidates) {
    const outsideX = Math.max(0, Math.abs(position.x - volume.center.x) - volume.size.x * .5), outsideY = Math.max(0, Math.abs(position.y - volume.center.y) - volume.size.y * .5), outside = Math.hypot(outsideX, outsideY)
    if (outside > volume.blendDistance) continue
    const weight = volume.blendDistance <= 0 ? 1 : 1 - outside / volume.blendDistance
    result = blendPost(result, settings.presets.find(item => item.id === volume.presetId)!.values, weight)
    break
  }
  Object.assign(activePostProcessing, postValues(result)); return activePostProcessing
}

export function estimatePostProcessCost(values: PostProcessValues = activePostProcessing) {
  const passes = 1 + (values.bloom > 0 ? 2 : 0) + (values.blur > 0 ? 2 : 0) + (values.userMaterial ? 1 : 0)
  const estimatedMsAt1080p = .08 + values.vignette * .03 + values.bloom * .32 + values.blur * .025 + (values.userMaterial ? .18 : 0)
  return { passes, estimatedMsAt1080p: Number(estimatedMsAt1080p.toFixed(3)), withinBudget: estimatedMsAt1080p <= renderingSettings.budgets.gpuMs * .35, recommendation: estimatedMsAt1080p <= renderingSettings.budgets.gpuMs * .35 ? 'Within the post-process budget.' : 'Reduce blur/bloom or switch to the Performance preset.' }
}

export function loadRenderingSettings(value: unknown): void { Object.assign(renderingSettings, normalizeRenderingSettings(value)); updateActivePostProcess() }
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
