/** 渲染项目设置：规范质量、分辨率和后处理配置，提供加载、保存及验证。 */
import { reactive } from 'vue'
import { normalizeAntiAliasing, type AntiAliasing2D } from './outputQuality20'

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
export interface RenderQualityVolume2D { id: string; name: string; enabled: boolean; center: { x: number; y: number }; size: { x: number; y: number }; priority: number; preset: RenderQualityPreset; maximumPixelRatio: number | null; particleBudget: number | null; shadowQuality: ShadowQuality | null }
export interface TextureStreamingSettings { enabled: boolean; memoryBudgetMb: number; idleFrames: number; uploadBudgetPerFrame: number; preloadMargin: number }
export interface DeterministicCaptureSettings { frameRate: number; sampleRate: number; maximumFrames: number; memoryBudgetMb: number; includeUi: boolean }

export interface RenderingSettings {
  antiAliasing: AntiAliasing2D
  resolutionScale: number
  rendererPath: 'Auto' | 'Native' | 'Compatibility'
  unsupportedPolicy: 'Block' | 'WarnAndFallback'
  qualityPreset: RenderQualityPreset
  qualityVolumes: RenderQualityVolume2D[]
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
  textureStreaming: TextureStreamingSettings
  deterministicCapture: DeterministicCaptureSettings
  budgets: { drawCalls: number; textureMemoryMb: number; overdraw: number; gpuMs: number; particleMs: number }
}

export const DEFAULT_RENDERING_SETTINGS: RenderingSettings = {
  rendererPath: 'Auto', unsupportedPolicy: 'WarnAndFallback',
  qualityPreset: 'Balanced',
  qualityVolumes: [],
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
  antiAliasing: 'Auto', resolutionScale: 1,
  debugView: 'None', pixelSnap: false, maximumPixelRatio: 2, particleBudget: 10_000,
  textureStreaming: { enabled: true, memoryBudgetMb: 256, idleFrames: 600, uploadBudgetPerFrame: 16, preloadMargin: 1.5 },
  deterministicCapture: { frameRate: 60, sampleRate: 48_000, maximumFrames: 300, memoryBudgetMb: 128, includeUi: true },
  budgets: { drawCalls: 500, textureMemoryMb: 256, overdraw: 4, gpuMs: 8, particleMs: 2 }
}

/* 将未知输入归一化为给定范围内的有限数值。 */
function finite(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(max, Math.max(min, number))
}

export const GPU_TEXTURE_MEMORY_LIMIT_MB = 512

/* 归一化纹理流送的内存、闲置帧数、每帧上传量和预加载范围。 */
export function normalizeTextureStreamingSettings(value: unknown, fallbackBudget: unknown = 256): TextureStreamingSettings {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    enabled: source.enabled !== false,
    memoryBudgetMb: finite(source.memoryBudgetMb, finite(fallbackBudget, 256, 16, GPU_TEXTURE_MEMORY_LIMIT_MB), 16, GPU_TEXTURE_MEMORY_LIMIT_MB),
    idleFrames: Math.round(finite(source.idleFrames, 600, 2, 36_000)),
    uploadBudgetPerFrame: Math.round(finite(source.uploadBudgetPerFrame, 16, 1, 4_096)),
    preloadMargin: finite(source.preloadMargin, 1.5, 1, 8)
  }
}

/* 将未知颜色输入转换为限制在零至二百五十五之间的整数 RGB 通道。 */
function color(value: unknown, fallback: { r: number; g: number; b: number }) {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    r: Math.round(finite(source.r, fallback.r, 0, 255)),
    g: Math.round(finite(source.g, fallback.g, 0, 255)),
    b: Math.round(finite(source.b, fallback.b, 0, 255))
  }
}

/* 将设置标识符清洗为有长度上限的字母数字和连接符组合。 */
function id(value: unknown, fallback: string): string { const result = typeof value === 'string' ? value.trim().replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 80) : ''; return result || fallback }
/* 归一化后处理效果参数及用户材质引用，无效字段使用回退值。 */
function postValues(value: unknown, fallback: PostProcessValues = DEFAULT_RENDERING_SETTINGS.postProcessing): PostProcessValues {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return { exposure: finite(source.exposure, fallback.exposure, -8, 8), contrast: finite(source.contrast, fallback.contrast, 0, 4), saturation: finite(source.saturation, fallback.saturation, 0, 4), vignette: finite(source.vignette, fallback.vignette, 0, 1), bloom: finite(source.bloom, fallback.bloom, 0, 2), blur: finite(source.blur, fallback.blur, 0, 32), userMaterial: typeof source.userMaterial === 'string' ? source.userMaterial.slice(0, 512) : null }
}

/* 归一化完整渲染设置、预算、质量体积与后处理预设，限制输入范围及集合数量。 */
export function normalizeRenderingSettings(value: unknown): RenderingSettings {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const post = source.postProcessing && typeof source.postProcessing === 'object' ? source.postProcessing as Record<string, unknown> : {}
  const budgets = source.budgets && typeof source.budgets === 'object' ? source.budgets as Record<string, unknown> : {}
  const textureStreaming = source.textureStreaming && typeof source.textureStreaming === 'object' ? source.textureStreaming as Record<string, unknown> : {}
  const deterministicCapture = source.deterministicCapture && typeof source.deterministicCapture === 'object' ? source.deterministicCapture as Record<string, unknown> : {}
  const shadowQuality = ['Off', 'Hard', 'Soft', 'Ultra'].includes(String(source.shadowQuality)) ? source.shadowQuality as ShadowQuality : DEFAULT_RENDERING_SETTINGS.shadowQuality
  const debugView = ['None', 'Overdraw', 'BatchBreaks', 'Lighting', 'Normals'].includes(String(source.debugView)) ? source.debugView as RenderDebugView : 'None'
  const qualityPreset = ['Performance', 'Balanced', 'High', 'Ultra', 'PixelArt'].includes(String(source.qualityPreset)) ? source.qualityPreset as RenderQualityPreset : 'Balanced'
  const qualityVolumes = Array.isArray(source.qualityVolumes) ? source.qualityVolumes.slice(0, 64).flatMap(/* 解析单个质量体积的边界、优先级、预设和可选预算覆盖。 */ (item, index) => {
    if (!item || typeof item !== 'object') return []
    const volume = item as Record<string, unknown>, center = volume.center && typeof volume.center === 'object' ? volume.center as Record<string, unknown> : {}, size = volume.size && typeof volume.size === 'object' ? volume.size as Record<string, unknown> : {}
    const preset = ['Performance', 'Balanced', 'High', 'Ultra', 'PixelArt'].includes(String(volume.preset)) ? volume.preset as RenderQualityPreset : qualityPreset
    return [{ id: id(volume.id, `quality-volume-${index + 1}`), name: typeof volume.name === 'string' ? volume.name.slice(0, 80) : `Quality volume ${index + 1}`, enabled: volume.enabled !== false, center: { x: finite(center.x, 0, -1e9, 1e9), y: finite(center.y, 0, -1e9, 1e9) }, size: { x: finite(size.x, 10, .001, 1e9), y: finite(size.y, 10, .001, 1e9) }, priority: Math.round(finite(volume.priority, 0, -1000, 1000)), preset, maximumPixelRatio: volume.maximumPixelRatio === null || volume.maximumPixelRatio === undefined ? null : finite(volume.maximumPixelRatio, 2, 1, 4), particleBudget: volume.particleBudget === null || volume.particleBudget === undefined ? null : Math.round(finite(volume.particleBudget, 10_000, 100, 100_000)), shadowQuality: ['Off', 'Hard', 'Soft', 'Ultra'].includes(String(volume.shadowQuality)) ? volume.shadowQuality as ShadowQuality : null }]
  }) : []
  const normalizedPost = postValues(post)
  const hasStoredPresets = Array.isArray(post.presets) && post.presets.length > 0
  const presets = hasStoredPresets ? (post.presets as unknown[]).slice(0, 32).flatMap(/* 解析单个后处理预设的标识、名称和已归一化效果参数。 */ (item, index) => { if (!item || typeof item !== 'object') return []; const preset = item as Record<string, unknown>; return [{ id: id(preset.id, `preset-${index + 1}`), name: typeof preset.name === 'string' ? preset.name.slice(0, 80) : `Preset ${index + 1}`, values: postValues(preset.values, normalizedPost) }] }) : [{ id: 'project', name: 'Project', values: normalizedPost }, ...DEFAULT_RENDERING_SETTINGS.postProcessing.presets.map(/** 构造并返回记录 { ...item, values: { ...item.values } }，字段按当前实参及捕获状态求值。 */ item => ({ ...item, values: { ...item.values } }))]
  const uniquePresets = [...new Map(presets.map(/* 返回按声明顺序构造的数组 [preset.id, preset]。 */ preset => [preset.id, preset])).values()]
  const volumes = Array.isArray(post.volumes) ? post.volumes.slice(0, 64).flatMap(/* 解析单个后处理体积的空间边界、混合距离、优先级与预设引用。 */ (item, index) => { if (!item || typeof item !== 'object') return []; const volume = item as Record<string, unknown>, center = volume.center && typeof volume.center === 'object' ? volume.center as Record<string, unknown> : {}, size = volume.size && typeof volume.size === 'object' ? volume.size as Record<string, unknown> : {}; return [{ id: id(volume.id, `volume-${index + 1}`), name: typeof volume.name === 'string' ? volume.name.slice(0, 80) : `Volume ${index + 1}`, enabled: volume.enabled !== false, center: { x: finite(center.x, 0, -1e9, 1e9), y: finite(center.y, 0, -1e9, 1e9) }, size: { x: finite(size.x, 10, .001, 1e9), y: finite(size.y, 10, .001, 1e9) }, blendDistance: finite(volume.blendDistance, 1, 0, 1e6), priority: Math.round(finite(volume.priority, 0, -1000, 1000)), presetId: id(volume.presetId, uniquePresets[0]?.id ?? 'neutral') }] }) : []
  const activePreset = id(post.activePreset, hasStoredPresets ? uniquePresets[0]?.id ?? 'neutral' : 'project')
  return {
    antiAliasing: normalizeAntiAliasing(source.antiAliasing),
    resolutionScale: finite(source.resolutionScale, 1, .5, 2),
    rendererPath: ['Auto', 'Native', 'Compatibility'].includes(String(source.rendererPath)) ? source.rendererPath as RenderingSettings['rendererPath'] : 'Auto',
    unsupportedPolicy: source.unsupportedPolicy === 'Block' ? 'Block' : 'WarnAndFallback',
    qualityPreset,
    qualityVolumes,
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
    textureStreaming: normalizeTextureStreamingSettings(textureStreaming, budgets.textureMemoryMb),
    deterministicCapture: {
      frameRate: Math.round(finite(deterministicCapture.frameRate, 60, 1, 240)),
      sampleRate: Math.round(finite(deterministicCapture.sampleRate, 48_000, 8_000, 192_000)),
      maximumFrames: Math.round(finite(deterministicCapture.maximumFrames, 300, 1, 18_000)),
      memoryBudgetMb: finite(deterministicCapture.memoryBudgetMb, 128, 16, 2_048),
      includeUi: deterministicCapture.includeUi !== false
    },
    budgets: { drawCalls: Math.round(finite(budgets.drawCalls, 500, 1, 100_000)), textureMemoryMb: finite(budgets.textureMemoryMb, 256, 1, 65_536), overdraw: finite(budgets.overdraw, 4, 1, 128), gpuMs: finite(budgets.gpuMs, 8, .1, 100), particleMs: finite(budgets.particleMs, 2, .05, 100) }
  }
}

export const renderingSettings = reactive<RenderingSettings>(normalizeRenderingSettings(DEFAULT_RENDERING_SETTINGS))
export const activePostProcessing = reactive<PostProcessValues>({ ...DEFAULT_RENDERING_SETTINGS.postProcessing })
export const activeRenderQuality = reactive({ preset: DEFAULT_RENDERING_SETTINGS.qualityPreset, maximumPixelRatio: DEFAULT_RENDERING_SETTINGS.maximumPixelRatio, particleBudget: DEFAULT_RENDERING_SETTINGS.particleBudget, shadowQuality: DEFAULT_RENDERING_SETTINGS.shadowQuality, volumeId: null as string | null })

/* 计算表达式 first + (second - first) * amount 并返回结果，沿用操作数的原有类型规则。 */ function mix(first: number, second: number, amount: number): number { return first + (second - first) * amount }
/* 按受限权重插值后处理数值，并在中点切换用户材质。 */
function blendPost(first: PostProcessValues, second: PostProcessValues, amount: number): PostProcessValues {
  const factor = Math.min(1, Math.max(0, amount))
  return { exposure: mix(first.exposure, second.exposure, factor), contrast: mix(first.contrast, second.contrast, factor), saturation: mix(first.saturation, second.saturation, factor), vignette: mix(first.vignette, second.vignette, factor), bloom: mix(first.bloom, second.bloom, factor), blur: mix(first.blur, second.blur, factor), userMaterial: factor >= .5 ? second.userMaterial : first.userMaterial }
}

/* 按当前位置选取最高优先级有效体积并混合后处理参数，更新活动状态。 */
export function updateActivePostProcess(position = { x: 0, y: 0 }): PostProcessValues {
  const settings = renderingSettings.postProcessing, preset = settings.presets.find(/* 比较 item.id 与 settings.activePreset，返回严格相等的判断结果。 */ item => item.id === settings.activePreset)
  let result = preset ? { ...preset.values } : postValues(settings)
  const candidates = settings.volumes.filter(/* 筛选已启用且引用现有后处理预设的体积。 */ volume => volume.enabled && settings.presets.some(/* 比较 item.id 与 volume.presetId，返回严格相等的判断结果。 */ item => item.id === volume.presetId)).sort(/* 先计算 b.priority - a.priority；仅当其为假值时求右侧 a.id.localeCompare(b.id)，返回短路求值结果。 */ (a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
  for (const volume of candidates) {
    const outsideX = Math.max(0, Math.abs(position.x - volume.center.x) - volume.size.x * .5), outsideY = Math.max(0, Math.abs(position.y - volume.center.y) - volume.size.y * .5), outside = Math.hypot(outsideX, outsideY)
    if (outside > volume.blendDistance) continue
    const weight = volume.blendDistance <= 0 ? 1 : 1 - outside / volume.blendDistance
    result = blendPost(result, settings.presets.find(/* 比较 item.id 与 volume.presetId，返回严格相等的判断结果。 */ item => item.id === volume.presetId)!.values, weight)
    break
  }
  Object.assign(activePostProcessing, postValues(result)); return activePostProcessing
}

/* 返回指定质量预设的像素比、粒子预算和阴影质量默认值。 */
function presetQuality(preset: RenderQualityPreset) {
  if (preset === 'Performance') return { maximumPixelRatio: 1, particleBudget: 2_500, shadowQuality: 'Off' as ShadowQuality }
  if (preset === 'High') return { maximumPixelRatio: 2, particleBudget: 25_000, shadowQuality: 'Soft' as ShadowQuality }
  if (preset === 'Ultra') return { maximumPixelRatio: 3, particleBudget: 50_000, shadowQuality: 'Ultra' as ShadowQuality }
  if (preset === 'PixelArt') return { maximumPixelRatio: 1, particleBudget: 10_000, shadowQuality: 'Hard' as ShadowQuality }
  return { maximumPixelRatio: 1.5, particleBudget: 10_000, shadowQuality: 'Soft' as ShadowQuality }
}

/* 按当前位置选取质量体积并应用其覆盖参数，更新活动渲染质量。 */
export function updateActiveRenderQuality(position = { x: 0, y: 0 }) {
  const selected = renderingSettings.qualityVolumes.filter(/* 判断当前位置是否位于启用的质量体积内部。 */ volume => volume.enabled
    && Math.abs(position.x - volume.center.x) <= volume.size.x * .5
    && Math.abs(position.y - volume.center.y) <= volume.size.y * .5)
    .sort(/* 先计算 second.priority - first.priority；仅当其为假值时求右侧 first.id.localeCompare(second.id)，返回短路求值结果。 */ (first, second) => second.priority - first.priority || first.id.localeCompare(second.id))[0]
  const preset = selected?.preset ?? renderingSettings.qualityPreset
  const defaults = presetQuality(preset)
  Object.assign(activeRenderQuality, {
    preset,
    maximumPixelRatio: selected?.maximumPixelRatio ?? (selected ? defaults.maximumPixelRatio : renderingSettings.maximumPixelRatio),
    particleBudget: selected?.particleBudget ?? (selected ? defaults.particleBudget : renderingSettings.particleBudget),
    shadowQuality: selected?.shadowQuality ?? (selected ? defaults.shadowQuality : renderingSettings.shadowQuality),
    volumeId: selected?.id ?? null
  })
  return activeRenderQuality
}

/* 估算后处理通道数量和一千零八十行输出成本，并与项目 GPU 预算比较。 */
export function estimatePostProcessCost(values: PostProcessValues = activePostProcessing) {
  const passes = 1 + (values.bloom > 0 ? 2 : 0) + (values.blur > 0 ? 2 : 0) + (values.userMaterial ? 1 : 0)
  const estimatedMsAt1080p = .08 + values.vignette * .03 + values.bloom * .32 + values.blur * .025 + (values.userMaterial ? .18 : 0)
  return { passes, estimatedMsAt1080p: Number(estimatedMsAt1080p.toFixed(3)), withinBudget: estimatedMsAt1080p <= renderingSettings.budgets.gpuMs * .35, recommendation: estimatedMsAt1080p <= renderingSettings.budgets.gpuMs * .35 ? 'Within the post-process budget.' : 'Reduce blur/bloom or switch to the Performance preset.' }
}

/* 载入归一化渲染设置并刷新活动后处理与质量状态。 */
export function loadRenderingSettings(value: unknown): void { Object.assign(renderingSettings, normalizeRenderingSettings(value)); updateActivePostProcess(); updateActiveRenderQuality() }
/* 返回归一化渲染设置的可序列化深拷贝。 */
export function serializeRenderingSettings(): RenderingSettings { return JSON.parse(JSON.stringify(normalizeRenderingSettings(renderingSettings))) as RenderingSettings }
/* 先计算 renderingSettings.lightingEnabled || renderingSettings.postProcessing.enabled；仅当其为假值时求右侧 renderingSettings.debugView !== 'None'，返回短路求值结果。 */ export function advancedRenderingActive(): boolean {
  return renderingSettings.lightingEnabled || renderingSettings.postProcessing.enabled || renderingSettings.debugView !== 'None'
}

/* 应用质量预设对应的阴影、分辨率、粒子、流送和像素对齐设置。 */
export function applyQualityPreset(preset: RenderQualityPreset): void {
  renderingSettings.qualityPreset = preset
  if (preset === 'Performance') { Object.assign(renderingSettings, { shadowQuality: 'Off', maximumPixelRatio: 1, particleBudget: 2_500, pixelSnap: false }); Object.assign(renderingSettings.textureStreaming, { enabled: true, memoryBudgetMb: 96, idleFrames: 180, uploadBudgetPerFrame: 6 }); Object.assign(renderingSettings.postProcessing, { enabled: false, bloom: 0, blur: 0 }) }
  else if (preset === 'Balanced') { Object.assign(renderingSettings, { shadowQuality: 'Soft', maximumPixelRatio: 1.5, particleBudget: 10_000, pixelSnap: false }); Object.assign(renderingSettings.textureStreaming, { enabled: true, memoryBudgetMb: 256, idleFrames: 600, uploadBudgetPerFrame: 16 }) }
  else if (preset === 'High') { Object.assign(renderingSettings, { shadowQuality: 'Soft', maximumPixelRatio: 2, particleBudget: 25_000, pixelSnap: false }); Object.assign(renderingSettings.textureStreaming, { enabled: true, memoryBudgetMb: 512, idleFrames: 1_200, uploadBudgetPerFrame: 32 }) }
  else if (preset === 'Ultra') { Object.assign(renderingSettings, { shadowQuality: 'Ultra', maximumPixelRatio: 3, particleBudget: 50_000, pixelSnap: false }); Object.assign(renderingSettings.textureStreaming, { enabled: true, memoryBudgetMb: GPU_TEXTURE_MEMORY_LIMIT_MB, idleFrames: 2_400, uploadBudgetPerFrame: 64 }) }
  else if (preset === 'PixelArt') { Object.assign(renderingSettings, { shadowQuality: 'Hard', maximumPixelRatio: 1, particleBudget: 10_000, pixelSnap: true, colorSpace: 'sRGB' }); Object.assign(renderingSettings.textureStreaming, { enabled: true, memoryBudgetMb: 192, idleFrames: 600, uploadBudgetPerFrame: 16 }) }
}
