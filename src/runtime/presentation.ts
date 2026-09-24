/** 项目呈现配置：规范显示相关设置并维护加载与持久化边界。 */
import { reactive } from 'vue'

export interface RuntimeAccessibilitySettings {
  keyboardNavigation: boolean
  gamepadNavigation: boolean
  screenReaderMetadata: boolean
  focusRingColor: string
  focusRingWidth: number
  reducedMotion: boolean
  highContrast: boolean
  textScale: number
  minimumTargetSize: number
  announceFocusChanges: boolean
  subtitles: boolean
  captions: boolean
  captionBackground: boolean
  captionScale: number
}

export interface UiAudioSettings { hover: string | null; press: string | null; focus: string | null; cancel: string | null; bus: string }
export interface RuntimeCaption { id: string; text: string; category: 'Dialogue' | 'Effects' | 'Music'; speaker: string; startedAt: number; durationMs: number }

export const runtimeAccessibilitySettings = reactive<RuntimeAccessibilitySettings>({
  keyboardNavigation: true,
  gamepadNavigation: true,
  screenReaderMetadata: true,
  focusRingColor: '#79b2ff',
  focusRingWidth: 3,
  reducedMotion: false, highContrast: false, textScale: 1, minimumTargetSize: 44,
  announceFocusChanges: true, subtitles: true, captions: true, captionBackground: true, captionScale: 1
})

export const uiAudioSettings = reactive<UiAudioSettings>({ hover: null, press: null, focus: null, cancel: null, bus: 'UI' })
export const runtimeCaptions = reactive<RuntimeCaption[]>([])
let captionClockSeconds: number | null = null, captionSequence = 0
/** 结构说明（自动提取）：setRuntimeCaptionTime；输入 seconds；直接调用 Number.isFinite、Error、runtimeCaptions.splice；写入 captionClockSeconds；包含显式抛错路径。 */ export function setRuntimeCaptionTime(seconds: number | null): void { if (seconds !== null && (!Number.isFinite(seconds) || seconds < 0)) throw new Error('Caption time must be finite and non-negative.'); if (seconds === null) runtimeCaptions.splice(0); captionClockSeconds = seconds }
/** 结构说明（自动提取）：captionNow；无显式参数；直接调用 Date.now、performance.now。 */ function captionNow(): number { return captionClockSeconds === null ? (typeof performance === 'undefined' ? Date.now() : performance.now()) : captionClockSeconds * 1000 }

/** 结构说明（自动提取）：normalizeRuntimeAccessibilitySettings；输入 source；直接调用 test、Number.isFinite、Math.min、Math.max。 */ export function normalizeRuntimeAccessibilitySettings(source: unknown): RuntimeAccessibilitySettings {
  const item = source && typeof source === 'object' ? source as Partial<RuntimeAccessibilitySettings> : {}
  const color = typeof item.focusRingColor === 'string' && /^#[0-9a-f]{6}$/i.test(item.focusRingColor) ? item.focusRingColor : '#79b2ff'
  const width = typeof item.focusRingWidth === 'number' && Number.isFinite(item.focusRingWidth) ? Math.min(12, Math.max(1, item.focusRingWidth)) : 3
  return {
    keyboardNavigation: item.keyboardNavigation !== false,
    gamepadNavigation: item.gamepadNavigation !== false,
    screenReaderMetadata: item.screenReaderMetadata !== false,
    focusRingColor: color,
    focusRingWidth: width,
    reducedMotion: item.reducedMotion === true,
    highContrast: item.highContrast === true,
    textScale: typeof item.textScale === 'number' && Number.isFinite(item.textScale) ? Math.min(4, Math.max(.75, item.textScale)) : 1,
    minimumTargetSize: typeof item.minimumTargetSize === 'number' && Number.isFinite(item.minimumTargetSize) ? Math.min(128, Math.max(24, item.minimumTargetSize)) : 44,
    announceFocusChanges: item.announceFocusChanges !== false,
    subtitles: item.subtitles !== false, captions: item.captions !== false, captionBackground: item.captionBackground !== false,
    captionScale: typeof item.captionScale === 'number' && Number.isFinite(item.captionScale) ? Math.min(4, Math.max(.75, item.captionScale)) : 1
  }
}

/** 执行时调用 Object.assign(runtimeAccessibilitySettings, normalizeRuntimeAccessibilitySettings(source))；不显式返回调用结果。 */ export function loadRuntimeAccessibilitySettings(source: unknown): void {
  Object.assign(runtimeAccessibilitySettings, normalizeRuntimeAccessibilitySettings(source))
}

/* 调用 normalizeRuntimeAccessibilitySettings(runtimeAccessibilitySettings) 并返回调用结果。 */ export function serializeRuntimeAccessibilitySettings(): RuntimeAccessibilitySettings {
  return normalizeRuntimeAccessibilitySettings(runtimeAccessibilitySettings)
}

/** 结构说明（自动提取）：normalizeUiAudioSettings；输入 source；直接调用 reference、item.bus.trim、slice。 */ export function normalizeUiAudioSettings(source: unknown): UiAudioSettings { const item = source && typeof source === 'object' ? source as Partial<UiAudioSettings> : {}; const reference = /* 根据 typeof value === 'string' && value.length <= 160 的真假，分别返回 value 或 null。 */ (value: unknown) => typeof value === 'string' && value.length <= 160 ? value : null; return { hover: reference(item.hover), press: reference(item.press), focus: reference(item.focus), cancel: reference(item.cancel), bus: typeof item.bus === 'string' && item.bus.trim() ? item.bus.trim().slice(0, 80) : 'UI' } }
/** 执行时调用 Object.assign(uiAudioSettings, normalizeUiAudioSettings(source))；不显式返回调用结果。 */ export function loadUiAudioSettings(source: unknown): void { Object.assign(uiAudioSettings, normalizeUiAudioSettings(source)) }
/* 调用 normalizeUiAudioSettings(uiAudioSettings) 并返回调用结果。 */ export function serializeUiAudioSettings(): UiAudioSettings { return normalizeUiAudioSettings(uiAudioSettings) }

/** 结构说明（自动提取）：publishRuntimeCaption；输入 caption；直接调用 slice、caption.id.trim、toString、runtimeCaptions.push、caption.text.slice 等；返回路径包含 id。 */ export function publishRuntimeCaption(caption: Omit<RuntimeCaption, 'id' | 'startedAt'> & { id?: string }): string {
  const id = caption.id?.trim().slice(0, 80) || `caption-${(++captionSequence).toString(36)}`
  runtimeCaptions.push({ id, text: caption.text.slice(0, 4_000), category: caption.category, speaker: caption.speaker.slice(0, 120), startedAt: captionNow(), durationMs: Math.min(120_000, Math.max(250, Number(caption.durationMs) || 3_000)) })
  if (runtimeCaptions.length > 32) runtimeCaptions.splice(0, runtimeCaptions.length - 32)
  return id
}
/** 结构说明（自动提取）：dismissRuntimeCaption；输入 id；直接调用 runtimeCaptions.findIndex、runtimeCaptions.splice。 */ export function dismissRuntimeCaption(id: string): void { const index = runtimeCaptions.findIndex(/* 比较 caption.id 与 id，返回严格相等的判断结果。 */ caption => caption.id === id); if (index >= 0) runtimeCaptions.splice(index, 1) }
/** 结构说明（自动提取）：activeRuntimeCaptions；输入 now；直接调用 runtimeCaptions.splice、filter、runtimeCaptions.filter；包含循环处理。 */ export function activeRuntimeCaptions(now = captionNow()): RuntimeCaption[] {
  for (let index = runtimeCaptions.length - 1; index >= 0; index--) if (now - runtimeCaptions[index].startedAt >= runtimeCaptions[index].durationMs) runtimeCaptions.splice(index, 1)
  return runtimeCaptions.filter(/* 比较 now 与 caption.startedAt，返回大于或等于的判断结果。 */ caption => now >= caption.startedAt).filter(/* 根据 caption.category === 'Dialogue' 的真假，分别返回 runtimeAccessibilitySettings.subtitles 或 runtimeAccessibilitySettings.captions。 */ caption => caption.category === 'Dialogue' ? runtimeAccessibilitySettings.subtitles : runtimeAccessibilitySettings.captions)
}
