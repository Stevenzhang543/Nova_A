import { reactive, watch } from 'vue'

export type ThemeMode = 'dark' | 'light'
export type Locale = 'en' | 'de' | 'zh'

export interface Preferences {
  theme: ThemeMode
  locale: Locale
  uiScale: number
  compactMode: boolean
  reduceMotion: boolean
  highContrast: boolean
  gridSize: number
  snapToGrid: boolean
  zoomSensitivity: number
  showConnections: boolean
  connectionThickness: number
  showDiagnostics: boolean
  maxPixelRatio: number
  autosave: boolean
  autosaveInterval: number
  confirmDestructiveActions: boolean
  defaultDensity: number
  defaultRestitution: number
  defaultFriction: number
}

const STORAGE_KEY = 'nova_a.preferences.v1'

const defaults: Preferences = {
  theme: 'dark',
  locale: 'en',
  uiScale: 1,
  compactMode: false,
  reduceMotion: typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  highContrast: false,
  gridSize: 10,
  snapToGrid: false,
  zoomSensitivity: 1,
  showConnections: true,
  connectionThickness: 2,
  showDiagnostics: true,
  maxPixelRatio: 2,
  autosave: true,
  autosaveInterval: 30,
  confirmDestructiveActions: true,
  defaultDensity: 1,
  defaultRestitution: 0,
  defaultFriction: 0.25
}

function finiteRange(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback
}

function loadPreferences(): Preferences {
  if (typeof localStorage === 'undefined') return { ...defaults }
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Preferences>
    return {
      ...defaults,
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      locale: parsed.locale === 'de' || parsed.locale === 'zh' ? parsed.locale : 'en',
      uiScale: finiteRange(parsed.uiScale, defaults.uiScale, 0.85, 1.25),
      compactMode: typeof parsed.compactMode === 'boolean' ? parsed.compactMode : defaults.compactMode,
      reduceMotion: typeof parsed.reduceMotion === 'boolean' ? parsed.reduceMotion : defaults.reduceMotion,
      highContrast: typeof parsed.highContrast === 'boolean' ? parsed.highContrast : defaults.highContrast,
      gridSize: finiteRange(parsed.gridSize, defaults.gridSize, 0.000001, 1e12),
      snapToGrid: typeof parsed.snapToGrid === 'boolean' ? parsed.snapToGrid : defaults.snapToGrid,
      zoomSensitivity: finiteRange(parsed.zoomSensitivity, defaults.zoomSensitivity, 0.2, 3),
      showConnections: typeof parsed.showConnections === 'boolean' ? parsed.showConnections : defaults.showConnections,
      connectionThickness: finiteRange(parsed.connectionThickness, defaults.connectionThickness, 0.5, 8),
      showDiagnostics: typeof parsed.showDiagnostics === 'boolean' ? parsed.showDiagnostics : defaults.showDiagnostics,
      maxPixelRatio: finiteRange(parsed.maxPixelRatio, defaults.maxPixelRatio, 1, 3),
      autosave: typeof parsed.autosave === 'boolean' ? parsed.autosave : defaults.autosave,
      autosaveInterval: finiteRange(parsed.autosaveInterval, defaults.autosaveInterval, 5, 600),
      confirmDestructiveActions: typeof parsed.confirmDestructiveActions === 'boolean'
        ? parsed.confirmDestructiveActions
        : defaults.confirmDestructiveActions,
      defaultDensity: finiteRange(parsed.defaultDensity, defaults.defaultDensity, 0.000001, 1e50),
      defaultRestitution: finiteRange(parsed.defaultRestitution, defaults.defaultRestitution, 0, 1),
      defaultFriction: finiteRange(parsed.defaultFriction, defaults.defaultFriction, 0, 1e6)
    }
  } catch {
    return { ...defaults }
  }
}

export const preferencesState = reactive<Preferences>(loadPreferences())

export function applyPreferences(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.theme = preferencesState.theme
  root.dataset.compact = String(preferencesState.compactMode)
  root.dataset.reduceMotion = String(preferencesState.reduceMotion)
  root.dataset.highContrast = String(preferencesState.highContrast)
  root.style.setProperty('--ui-scale', String(preferencesState.uiScale))
  root.lang = preferencesState.locale === 'zh' ? 'zh-CN' : preferencesState.locale
}

export function resetPreferences(): void {
  Object.assign(preferencesState, { ...defaults })
}

applyPreferences()

watch(preferencesState, () => {
  applyPreferences()
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferencesState))
    } catch (error) {
      console.warn('Nova_A could not persist the interface preferences.', error)
    }
  }
}, { deep: true })
