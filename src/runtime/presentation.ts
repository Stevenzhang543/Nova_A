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
}

export interface UiAudioSettings { hover: string | null; press: string | null; focus: string | null; cancel: string | null; bus: string }

export const runtimeAccessibilitySettings = reactive<RuntimeAccessibilitySettings>({
  keyboardNavigation: true,
  gamepadNavigation: true,
  screenReaderMetadata: true,
  focusRingColor: '#79b2ff',
  focusRingWidth: 3,
  reducedMotion: false, highContrast: false, textScale: 1, minimumTargetSize: 44,
  announceFocusChanges: true
})

export const uiAudioSettings = reactive<UiAudioSettings>({ hover: null, press: null, focus: null, cancel: null, bus: 'UI' })

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
    textScale: typeof item.textScale === 'number' && Number.isFinite(item.textScale) ? Math.min(3, Math.max(.75, item.textScale)) : 1,
    minimumTargetSize: typeof item.minimumTargetSize === 'number' && Number.isFinite(item.minimumTargetSize) ? Math.min(128, Math.max(24, item.minimumTargetSize)) : 44,
    announceFocusChanges: item.announceFocusChanges !== false
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
