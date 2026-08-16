import { reactive } from 'vue'

export interface RuntimeAccessibilitySettings {
  keyboardNavigation: boolean
  gamepadNavigation: boolean
  screenReaderMetadata: boolean
  focusRingColor: string
  focusRingWidth: number
  reducedMotion: boolean
  announceFocusChanges: boolean
}

export const runtimeAccessibilitySettings = reactive<RuntimeAccessibilitySettings>({
  keyboardNavigation: true,
  gamepadNavigation: true,
  screenReaderMetadata: true,
  focusRingColor: '#79b2ff',
  focusRingWidth: 3,
  reducedMotion: false,
  announceFocusChanges: true
})

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
    announceFocusChanges: item.announceFocusChanges !== false
  }
}

export function loadRuntimeAccessibilitySettings(source: unknown): void {
  Object.assign(runtimeAccessibilitySettings, normalizeRuntimeAccessibilitySettings(source))
}

export function serializeRuntimeAccessibilitySettings(): RuntimeAccessibilitySettings {
  return normalizeRuntimeAccessibilitySettings(runtimeAccessibilitySettings)
}
