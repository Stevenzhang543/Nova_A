/** 用户偏好状态：读取和约束持久化设置，将配色、语言、缩放及动效偏好应用到文档。 */
import { reactive, watch } from 'vue'
import { colorPalette, paletteForMode, type ColorPaletteId } from './colorPalettes'

export type ThemeMode = 'dark' | 'light'
export type Locale = 'en' | 'de' | 'zh'
export type WorkspaceLayoutScope = 'user' | 'project'
export type PerformanceProfile = 'balanced' | 'low-end' | 'quality'

export interface Preferences {
  theme: ThemeMode
  lightPalette: ColorPaletteId
  darkPalette: ColorPaletteId
  locale: Locale
  formLabelLayout: 'auto' | 'stacked'
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
  performanceProfile: PerformanceProfile
  autosave: boolean
  autosaveInterval: number
  confirmDestructiveActions: boolean
  launchMaximized: boolean
  /** Retained only to migrate v3.1 preferences. */
  launchFullscreen: boolean
  workspaceLayoutScope: WorkspaceLayoutScope
  experimentalFeatures: boolean
  defaultDensity: number
  defaultRestitution: number
  defaultFriction: number
}

const STORAGE_KEY = 'nova_a.preferences.v1'
const LIGHT_CONTRAST_MIGRATION_KEY = 'nova_a.light-contrast-default.v1.1'

const defaults: Preferences = {
  theme: 'dark',
  lightPalette: 'cloud-blue',
  darkPalette: 'midnight-blue',
  locale: 'en',
  formLabelLayout: 'auto',
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
  performanceProfile: 'balanced',
  autosave: true,
  autosaveInterval: 30,
  confirmDestructiveActions: true,
  launchMaximized: true,
  launchFullscreen: false,
  workspaceLayoutScope: 'user',
  experimentalFeatures: false,
  defaultDensity: 1,
  defaultRestitution: 0,
  defaultFriction: 0.25
}

/** 仅接受有限数值并夹到指定区间；类型或数值无效时使用默认值。 */ function finiteRange(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback
}

/* 根据 typeof value === 'boolean' 的真假，分别返回 value 或 fallback。 */ function storedBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/* 根据 value === 'light' 的真假，分别返回 'light' 或 'dark'。 */ function normalizedTheme(value: unknown): ThemeMode {
  return value === 'light' ? 'light' : 'dark'
}

/* 根据 value === 'de' || value === 'zh' 的真假，分别返回 value 或 'en'。 */ function normalizedLocale(value: unknown): Locale {
  return value === 'de' || value === 'zh' ? value : 'en'
}

/** 逐项校验已保存偏好、迁移旧全屏及浅色高对比设置，并为缺失或非法值补默认值。 */ function normalizedPreferences(parsed: Partial<Preferences>, resetLegacyLightContrast: boolean): Preferences {
  return {
    ...defaults,
    theme: normalizedTheme(parsed.theme),
    lightPalette: paletteForMode(parsed.lightPalette, 'light'),
    darkPalette: paletteForMode(parsed.darkPalette, 'dark'),
    locale: normalizedLocale(parsed.locale),
    formLabelLayout: parsed.formLabelLayout === 'stacked' ? 'stacked' : 'auto',
    uiScale: finiteRange(parsed.uiScale, defaults.uiScale, 1, 2),
    compactMode: storedBoolean(parsed.compactMode, defaults.compactMode),
    reduceMotion: storedBoolean(parsed.reduceMotion, defaults.reduceMotion),
    highContrast: resetLegacyLightContrast ? false : storedBoolean(parsed.highContrast, defaults.highContrast),
    gridSize: finiteRange(parsed.gridSize, defaults.gridSize, 0.000001, 1e12),
    snapToGrid: storedBoolean(parsed.snapToGrid, defaults.snapToGrid),
    zoomSensitivity: finiteRange(parsed.zoomSensitivity, defaults.zoomSensitivity, 0.2, 3),
    showConnections: storedBoolean(parsed.showConnections, defaults.showConnections),
    connectionThickness: finiteRange(parsed.connectionThickness, defaults.connectionThickness, 0.5, 8),
    showDiagnostics: storedBoolean(parsed.showDiagnostics, defaults.showDiagnostics),
    maxPixelRatio: finiteRange(parsed.maxPixelRatio, defaults.maxPixelRatio, 1, 3),
    performanceProfile: parsed.performanceProfile === 'low-end' || parsed.performanceProfile === 'quality' ? parsed.performanceProfile : 'balanced',
    autosave: storedBoolean(parsed.autosave, defaults.autosave),
    autosaveInterval: finiteRange(parsed.autosaveInterval, defaults.autosaveInterval, 5, 600),
    confirmDestructiveActions: storedBoolean(parsed.confirmDestructiveActions, defaults.confirmDestructiveActions),
    launchMaximized: storedBoolean(parsed.launchMaximized, storedBoolean(parsed.launchFullscreen, defaults.launchMaximized)),
    launchFullscreen: false,
    workspaceLayoutScope: parsed.workspaceLayoutScope === 'project' ? 'project' : 'user',
    experimentalFeatures: storedBoolean(parsed.experimentalFeatures, defaults.experimentalFeatures),
    defaultDensity: finiteRange(parsed.defaultDensity, defaults.defaultDensity, 0.000001, 1e50),
    defaultRestitution: finiteRange(parsed.defaultRestitution, defaults.defaultRestitution, 0, 1),
    defaultFriction: finiteRange(parsed.defaultFriction, defaults.defaultFriction, 0, 1e6)
  }
}

/** 从本地存储加载偏好并执行一次浅色对比迁移；缺少存储或解析失败时恢复默认值。 */ function loadPreferences(): Preferences {
  if (typeof localStorage === 'undefined') return { ...defaults }
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Preferences>
    const resetLegacyLightContrast = parsed.theme === 'light'
      && localStorage.getItem(LIGHT_CONTRAST_MIGRATION_KEY) !== 'done'
    if (resetLegacyLightContrast) localStorage.setItem(LIGHT_CONTRAST_MIGRATION_KEY, 'done')
    return normalizedPreferences(parsed, resetLegacyLightContrast)
  } catch {
    return { ...defaults }
  }
}

export const preferencesState = reactive<Preferences>(loadPreferences())

/** 将当前偏好写入根元素数据属性、界面缩放变量和文档语言；无文档环境直接返回。 */ export function applyPreferences(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.theme = preferencesState.theme
  root.dataset.palette = paletteForMode(preferencesState.theme === 'light' ? preferencesState.lightPalette : preferencesState.darkPalette, preferencesState.theme)
  root.dataset.formLabelLayout = preferencesState.formLabelLayout
  root.dataset.compact = String(preferencesState.compactMode)
  root.dataset.reduceMotion = String(preferencesState.reduceMotion)
  root.dataset.highContrast = String(preferencesState.highContrast)
  root.dataset.performanceProfile = preferencesState.performanceProfile
  root.style.setProperty('--ui-scale', String(preferencesState.uiScale))
  root.dataset.uiScale = preferencesState.uiScale > 1.75 ? 'xlarge' : preferencesState.uiScale > 1.25 ? 'large' : 'standard'
  root.lang = preferencesState.locale === 'zh' ? 'zh-CN' : preferencesState.locale
}

/** 仅接受已登记配色，并同步其明暗模式及该模式下选中的配色标识。 */ export function selectColorPalette(value: unknown): void {
  const palette = colorPalette(value)
  if (!palette) return
  preferencesState.theme = palette.mode
  if (palette.mode === 'light') preferencesState.lightPalette = palette.id
  else preferencesState.darkPalette = palette.id
}

/** 就地恢复全部默认偏好，保留响应式对象身份以继续通知已有订阅者。 */ export function resetPreferences(): void {
  Object.assign(preferencesState, { ...defaults })
}

applyPreferences()

watch(preferencesState, /** 应用响应式偏好变更并尝试持久化；存储失败只记录警告，不阻断编辑。 */ () => {
  applyPreferences()
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferencesState))
    } catch (error) {
      console.warn('Nova_A could not persist the interface preferences.', error)
    }
  }
}, { deep: true })
