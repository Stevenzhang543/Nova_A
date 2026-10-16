/** Editor reactive adapter for the standalone renderer's settings schema. */
import { reactive } from 'vue'
import { DEFAULT_RENDERING_SETTINGS, normalizeRenderingSettings, type PostProcessValues, type RenderingSettings, type RenderQualityPreset } from './renderSettingsSchema'
import { RuntimeRenderingPolicyOwner } from './runtimeRenderingPolicyOwner'
import { installMigrationRendererEnvironment } from './RendererEnvironment'
export * from './renderSettingsSchema'
export const renderingSettings = reactive<RenderingSettings>(normalizeRenderingSettings(DEFAULT_RENDERING_SETTINGS))
export const activePostProcessing = reactive<PostProcessValues>({ ...DEFAULT_RENDERING_SETTINGS.postProcessing })
export const activeRenderQuality = reactive({ preset: DEFAULT_RENDERING_SETTINGS.qualityPreset, maximumPixelRatio: DEFAULT_RENDERING_SETTINGS.maximumPixelRatio, particleBudget: DEFAULT_RENDERING_SETTINGS.particleBudget, shadowQuality: DEFAULT_RENDERING_SETTINGS.shadowQuality, volumeId: null as string | null })

const editorRenderingPolicy = new RuntimeRenderingPolicyOwner({ renderingSettings, activePostProcessing, activeRenderQuality })

export function updateActivePostProcess(position = { x: 0, y: 0 }): PostProcessValues { return editorRenderingPolicy.updateActivePostProcess(position) }
export function updateActiveRenderQuality(position = { x: 0, y: 0 }) { return editorRenderingPolicy.updateActiveRenderQuality(position) }
export function estimatePostProcessCost(values: PostProcessValues = activePostProcessing) { return editorRenderingPolicy.estimatePostProcessCost(values) }
export function loadRenderingSettings(value: unknown): void { editorRenderingPolicy.loadRenderingSettings(value) }
export function serializeRenderingSettings(): RenderingSettings { return editorRenderingPolicy.serializeRenderingSettings() }
export function advancedRenderingActive(): boolean { return editorRenderingPolicy.advancedRenderingActive() }
export function applyQualityPreset(preset: RenderQualityPreset): void { editorRenderingPolicy.applyQualityPreset(preset) }

// Compatibility for historical direct constructors; production hosts inject explicitly.
installMigrationRendererEnvironment({ settings: renderingSettings, postProcessing: activePostProcessing })
