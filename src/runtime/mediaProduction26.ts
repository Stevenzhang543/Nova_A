/** 媒体制作数据：组织媒体资源及相关编辑配置与验证。 */
import { readTextAsset } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import { materialCapabilityPreview } from '../renderer/materialGraph'
import { normalizeMaterial } from '../renderer/materials'
import { renderingSettings } from '../renderer/renderSettings'
import type { RendererStats } from '../renderer/types'
import type { Entity } from '../world/Entity'
import { validateAnimationProject } from './animationProduction'
import type { AudioProjectSettings } from './audio'
import { audioRuntime } from './audio'
import { deterministicCapturePlan, validateCinematicProject } from './cinematicProduction'
import { particleDiagnostics } from './particles'

export type MediaProductionProfile = 'Balanced' | 'LowEnd'
export type MediaReadinessStatus = 'ready' | 'review' | 'blocked'
export interface MediaProductionIssue { code: string; status: Exclude<MediaReadinessStatus, 'ready'>; subsystem: 'Rendering' | 'Animation' | 'Audio' | 'Cinematic'; message: string; fix: string }
export interface MediaProductionCheck { id: string; subsystem: MediaProductionIssue['subsystem']; status: MediaReadinessStatus; detail: string }
export interface MediaProductionReport { profile: MediaProductionProfile; status: MediaReadinessStatus; checks: MediaProductionCheck[]; issues: MediaProductionIssue[]; semanticParity: true; exportParity: boolean }

export const MEDIA_RENDER_PASS_ORDER = Object.freeze(['World', 'Lighting', 'UI', 'EditorOverlay', 'PostProcess'] as const)
export const MEDIA_PROFILE_CONTRACTS = Object.freeze({
  Balanced: Object.freeze({ pixelRatio: 1.5, textureBudgetMb: 256, particleBudget: 10_000, shadowQuality: 'Soft', semanticSystems: Object.freeze(['materials', 'lighting', 'animation', 'audio', 'timeline', 'ui']) }),
  LowEnd: Object.freeze({ pixelRatio: 1, textureBudgetMb: 96, particleBudget: 2_500, shadowQuality: 'Off', semanticSystems: Object.freeze(['materials', 'lighting', 'animation', 'audio', 'timeline', 'ui']) })
})

/* 返回具有所列字段的新对象 { code, status, subsystem, message, fix }。 */ function issue(code: string, status: MediaProductionIssue['status'], subsystem: MediaProductionIssue['subsystem'], message: string, fix: string): MediaProductionIssue { return { code, status, subsystem, message, fix } }
/* 返回具有所列字段的新对象 { id, subsystem, status, detail }。 */ function check(id: string, subsystem: MediaProductionCheck['subsystem'], status: MediaReadinessStatus, detail: string): MediaProductionCheck { return { id, subsystem, status, detail } }

/** 结构说明（自动提取）：mediaTimingAudit；输入 durationSeconds、captureRate、sampleRate、displayRates；直接调用 Math.min、Math.max、Number.isFinite、Math.round、deterministicCapturePlan 等。 */ export function mediaTimingAudit(durationSeconds = 10, captureRate = 60, sampleRate = 48_000, displayRates: readonly number[] = [30, 60, 90, 120, 144]): { passed: boolean; expectedSamples: number; results: Array<{ displayRate: number; visualFrames: number; fixedCaptureFrames: number; finalAudioSample: number }> } {
  const duration = Math.min(600, Math.max(0.001, Number.isFinite(durationSeconds) ? durationSeconds : 10))
  const expectedSamples = Math.round(duration * sampleRate)
  const plan = deterministicCapturePlan(duration, captureRate, sampleRate)
  const results = displayRates.slice(0, 16).map(/** 结构说明（自动提取）：map 回调；输入 value；直接调用 Math.min、Math.max、Math.round、Number.isFinite、Math.ceil。 */ value => {
    const displayRate = Math.min(1_000, Math.max(1, Math.round(Number.isFinite(value) ? value : 60)))
    return { displayRate, visualFrames: Math.ceil(duration * displayRate), fixedCaptureFrames: plan.frames, finalAudioSample: Math.round(duration * plan.sampleRate) }
  })
  return { passed: !plan.truncated && results.every(/* 先计算 result.finalAudioSample === expectedSamples；仅当其为真值时求右侧 result.fixedCaptureFrames === plan.frames，返回短路求值结果。 */ result => result.finalAudioSample === expectedSamples && result.fixedCaptureFrames === plan.frames), expectedSamples, results }
}

/** 结构说明（自动提取）：buildMediaProductionReport；输入 assets、entities、renderer、audio、profile；直接调用 slice、assets.filter、readTextAsset、issues.push、issue 等；写入 materialFallbacks；包含循环处理。 */ export function buildMediaProductionReport(assets: readonly AssetRecord[], entities: Entity[], renderer: RendererStats, audio: AudioProjectSettings, profile: MediaProductionProfile = renderingSettings.qualityPreset === 'Performance' ? 'LowEnd' : 'Balanced'): MediaProductionReport {
  const issues: MediaProductionIssue[] = []
  const backend = renderer.backend
  const materialAssets = assets.filter(/* 比较 asset.assetType 与 'material'，返回严格相等的判断结果。 */ asset => asset.assetType === 'material').slice(0, 512)
  let materialFallbacks = 0
  for (const asset of materialAssets) {
    const source = readTextAsset(asset.uuid)
    if (!source) { issues.push(issue('MEDIA-MATERIAL-SOURCE', 'blocked', 'Rendering', `${asset.name} has no readable source.`, 'Restore or reimport the material asset.')); continue }
    try {
      const material = normalizeMaterial(JSON.parse(source)), capability = materialCapabilityPreview(material.graph, material.layers, backend)
      if (capability.fallbackNodes.length) materialFallbacks += capability.fallbackNodes.length
    } catch { issues.push(issue('MEDIA-MATERIAL-PARSE', 'blocked', 'Rendering', `${asset.name} is not valid material JSON.`, 'Open Rendering → Materials and restore the last valid version.')) }
  }
  if (backend === 'Canvas2D' && materialFallbacks) issues.push(issue('MEDIA-CANVAS-PARITY', renderingSettings.unsupportedPolicy === 'Block' ? 'blocked' : 'review', 'Rendering', `${materialFallbacks} visual shader nodes use documented Canvas2D approximations.`, 'Use WebGL2 for full effects or review every named fallback in Rendering → Diagnostics.'))
  if (renderer.textureBudgetExceeded) issues.push(issue('MEDIA-TEXTURE-BUDGET', 'blocked', 'Rendering', 'Resident GPU textures exceed the streaming budget.', 'Raise the explicit budget, atlas compatible sprites, or let idle textures evict before capture.'))
  if (renderer.textureUploads > renderingSettings.textureStreaming.uploadBudgetPerFrame) issues.push(issue('MEDIA-UPLOAD-SPIKE', 'review', 'Rendering', `${renderer.textureUploads} texture uploads exceeded the per-frame budget.`, 'Preload the scene atlas or divide streaming backgrounds across adjacent camera regions.'))

  for (const problem of validateAnimationProject([...assets], entities)) issues.push(issue(problem.code, problem.severity === 'error' ? 'blocked' : 'review', 'Animation', problem.message, 'Open Animation → Validation and repair the named asset path.'))
  for (const problem of validateCinematicProject([...assets], entities)) issues.push(issue(problem.code, problem.severity === 'error' ? 'blocked' : 'review', 'Cinematic', problem.message, 'Open Animation → Timeline and repair the named track or marker.'))

  const busIds = new Set(audio.mixer.buses.map(/* 返回 bus.id 的当前值。 */ bus => bus.id))
  for (const bus of audio.mixer.buses) {
    if (bus.parent && !busIds.has(bus.parent)) issues.push(issue('MEDIA-AUDIO-PARENT', 'blocked', 'Audio', `${bus.name} routes to a missing parent bus.`, 'Choose an existing parent in Presentation → Audio.'))
    for (const send of bus.sends) if (!busIds.has(send.target)) issues.push(issue('MEDIA-AUDIO-SEND', 'blocked', 'Audio', `${bus.name} sends to missing bus ${send.target}.`, 'Choose an existing target bus or remove the send.'))
  }
  if (audioRuntime.diagnostics.activeVoices > audio.mixer.masterVoiceLimit) issues.push(issue('MEDIA-VOICE-BUDGET', 'blocked', 'Audio', 'Active voices exceed the project master voice limit.', 'Raise the intentional limit or use priorities/virtual voices for inaudible sources.'))
  if (audioRuntime.diagnostics.underruns) issues.push(issue('MEDIA-AUDIO-UNDERRUN', 'review', 'Audio', `${audioRuntime.diagnostics.underruns} audio underruns were observed.`, 'Stream long music, preload short effects, and inspect the device latency report.'))

  const timing = mediaTimingAudit(10, renderingSettings.deterministicCapture.frameRate, renderingSettings.deterministicCapture.sampleRate)
  if (!timing.passed) issues.push(issue('MEDIA-CAPTURE-CLOCK', 'blocked', 'Cinematic', 'Frame and audio sample clocks diverge across display rates.', 'Restore a supported capture/sample rate before recording.'))
  if (particleDiagnostics.budgetExceeded) issues.push(issue('MEDIA-PARTICLE-BUDGET', 'review', 'Rendering', 'Active particles exceed the selected quality budget.', 'Reduce lifetime/emission or raise the explicit project particle budget.'))

  const checks: MediaProductionCheck[] = [
    check('materials', 'Rendering', issues.some(/* 先计算 item.code.startsWith('MEDIA-MATERIAL')；仅当其为真值时求右侧 item.status === 'blocked'，返回短路求值结果。 */ item => item.code.startsWith('MEDIA-MATERIAL') && item.status === 'blocked') ? 'blocked' : materialFallbacks ? 'review' : 'ready', `${materialAssets.length} materials · ${materialFallbacks} fallback nodes`),
    check('render-passes', 'Rendering', renderer.passes >= MEDIA_RENDER_PASS_ORDER.length ? 'ready' : 'review', `${renderer.passes}/${MEDIA_RENDER_PASS_ORDER.length} ordered pass records · ${renderer.drawCalls} draw calls`),
    check('texture-streaming', 'Rendering', renderer.textureBudgetExceeded ? 'blocked' : renderer.textureUploads > renderingSettings.textureStreaming.uploadBudgetPerFrame ? 'review' : 'ready', `${(renderer.textureMemoryBytes / 1048576).toFixed(1)} / ${renderingSettings.textureStreaming.memoryBudgetMb} MB · ${renderer.textureEvictions} evictions`),
    check('animation', 'Animation', issues.some(/* 先计算 item.subsystem === 'Animation'；仅当其为真值时求右侧 item.status === 'blocked'，返回短路求值结果。 */ item => item.subsystem === 'Animation' && item.status === 'blocked') ? 'blocked' : issues.some(/* 比较 item.subsystem 与 'Animation'，返回严格相等的判断结果。 */ item => item.subsystem === 'Animation') ? 'review' : 'ready', `${assets.filter(/** 结构说明（自动提取）：assets.filter 回调；输入 asset；返回表达式求值结果。 */ asset => asset.assetType === 'animation' || asset.assetType === 'controller' || asset.assetType === 'rig' || asset.assetType === 'skin').length} production assets`),
    check('audio', 'Audio', issues.some(/* 先计算 item.subsystem === 'Audio'；仅当其为真值时求右侧 item.status === 'blocked'，返回短路求值结果。 */ item => item.subsystem === 'Audio' && item.status === 'blocked') ? 'blocked' : issues.some(/* 比较 item.subsystem 与 'Audio'，返回严格相等的判断结果。 */ item => item.subsystem === 'Audio') ? 'review' : 'ready', `${audio.mixer.buses.length} buses · ${audioRuntime.diagnostics.activeVoices}/${audio.mixer.masterVoiceLimit} voices`),
    check('cinematic', 'Cinematic', issues.some(/* 先计算 item.subsystem === 'Cinematic'；仅当其为真值时求右侧 item.status === 'blocked'，返回短路求值结果。 */ item => item.subsystem === 'Cinematic' && item.status === 'blocked') ? 'blocked' : issues.some(/* 比较 item.subsystem 与 'Cinematic'，返回严格相等的判断结果。 */ item => item.subsystem === 'Cinematic') ? 'review' : 'ready', `${assets.filter(/* 比较 asset.assetType 与 'timeline'，返回严格相等的判断结果。 */ asset => asset.assetType === 'timeline').length} timelines · ${renderingSettings.deterministicCapture.frameRate} fps / ${renderingSettings.deterministicCapture.sampleRate} Hz`)
  ]
  const status: MediaReadinessStatus = issues.some(/* 比较 item.status 与 'blocked'，返回严格相等的判断结果。 */ item => item.status === 'blocked') ? 'blocked' : issues.length ? 'review' : 'ready'
  return { profile, status, checks, issues: issues.slice(0, 256), semanticParity: true, exportParity: status !== 'blocked' }
}
