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
export function setRuntimeCaptionTime(seconds: number | null): void { if (seconds !== null && (!Number.isFinite(seconds) || seconds < 0)) throw new Error('Caption time must be finite and non-negative.'); if (seconds === null) runtimeCaptions.splice(0); captionClockSeconds = seconds }
function captionNow(): number { return captionClockSeconds === null ? (typeof performance === 'undefined' ? Date.now() : performance.now()) : captionClockSeconds * 1000 }

export function normalizeRuntimeAccessibilitySettings(source: unknown): RuntimeAccessibilitySettings {
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

export function loadRuntimeAccessibilitySettings(source: unknown): void {
  Object.assign(runtimeAccessibilitySettings, normalizeRuntimeAccessibilitySettings(source))
}

export function serializeRuntimeAccessibilitySettings(): RuntimeAccessibilitySettings {
  return normalizeRuntimeAccessibilitySettings(runtimeAccessibilitySettings)
}

export function normalizeUiAudioSettings(source: unknown): UiAudioSettings { const item = source && typeof source === 'object' ? source as Partial<UiAudioSettings> : {}; const reference = (value: unknown) => typeof value === 'string' && value.length <= 160 ? value : null; return { hover: reference(item.hover), press: reference(item.press), focus: reference(item.focus), cancel: reference(item.cancel), bus: typeof item.bus === 'string' && item.bus.trim() ? item.bus.trim().slice(0, 80) : 'UI' } }
export function loadUiAudioSettings(source: unknown): void { Object.assign(uiAudioSettings, normalizeUiAudioSettings(source)) }
export function serializeUiAudioSettings(): UiAudioSettings { return normalizeUiAudioSettings(uiAudioSettings) }

export function publishRuntimeCaption(caption: Omit<RuntimeCaption, 'id' | 'startedAt'> & { id?: string }): string {
  const id = caption.id?.trim().slice(0, 80) || `caption-${(++captionSequence).toString(36)}`
  runtimeCaptions.push({ id, text: caption.text.slice(0, 4_000), category: caption.category, speaker: caption.speaker.slice(0, 120), startedAt: captionNow(), durationMs: Math.min(120_000, Math.max(250, Number(caption.durationMs) || 3_000)) })
  if (runtimeCaptions.length > 32) runtimeCaptions.splice(0, runtimeCaptions.length - 32)
  return id
}
export function dismissRuntimeCaption(id: string): void { const index = runtimeCaptions.findIndex(caption => caption.id === id); if (index >= 0) runtimeCaptions.splice(index, 1) }
export function activeRuntimeCaptions(now = captionNow()): RuntimeCaption[] {
  for (let index = runtimeCaptions.length - 1; index >= 0; index--) if (now - runtimeCaptions[index].startedAt >= runtimeCaptions[index].durationMs) runtimeCaptions.splice(index, 1)
  return runtimeCaptions.filter(caption => now >= caption.startedAt).filter(caption => caption.category === 'Dialogue' ? runtimeAccessibilitySettings.subtitles : runtimeAccessibilitySettings.captions)
}
