import { assetReference, createTextAsset, readTextAsset, resolveAsset, updateTextAsset } from '../assets/AssetDatabase'

export interface UiThemeStyle {
  background?: string
  foreground?: string
  border?: string
  borderWidth?: number
  cornerRadius?: number
  fontSize?: number
  fontWeight?: number
  opacity?: number
}

export interface UiThemeClass {
  normal: UiThemeStyle
  hovered?: UiThemeStyle
  pressed?: UiThemeStyle
  disabled?: UiThemeStyle
  focused?: UiThemeStyle
}

export interface UiThemeDocument {
  version: 2
  name: string
  parentTheme: string | null
  variables: Record<string, string | number>
  variants: Record<string, Record<string, string | number>>
  classes: Record<string, UiThemeClass>
}

const MAX_CLASSES = 512
const MAX_VARIABLES = 512

export function defaultUiTheme(): UiThemeDocument {
  return {
    version: 2,
    name: 'Nova UI',
    parentTheme: null,
    variables: { accent: '#4f96ff', surface: '#232934', text: '#f5f7fb', muted: '#8d98aa', radius: 10, spacing: 8, fontSize: 16, fontFamily: 'Nunito Sans' },
    variants: { default: {}, compact: { spacing: 5, radius: 7 }, highContrast: { surface: '#000000', text: '#ffffff', accent: '#74b4ff' } },
    classes: {
      button: {
        normal: { background: '$accent', foreground: '$text', cornerRadius: 10 },
        hovered: { background: '#61a5ff' }, pressed: { background: '#2f76d2' }, disabled: { background: '#5a616e', opacity: .7 },
        focused: { border: '#ffffff', borderWidth: 2 }
      },
      input: { normal: { background: '$surface', foreground: '$text', border: '$muted', borderWidth: 1, cornerRadius: 8 }, focused: { border: '$accent', borderWidth: 2 } },
      checkbox: { normal: { foreground: '$text', border: '$muted' } },
      slider: { normal: { background: '$surface', foreground: '$accent' } },
      progress: { normal: { background: '$surface', foreground: '$accent' } }
    }
  }
}

function cleanStyle(value: unknown): UiThemeStyle {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>, style: UiThemeStyle = {}
  for (const key of ['background', 'foreground', 'border'] as const) if (typeof source[key] === 'string') style[key] = source[key].slice(0, 80)
  for (const key of ['borderWidth', 'cornerRadius', 'fontSize', 'fontWeight', 'opacity'] as const) if (typeof source[key] === 'number' && Number.isFinite(source[key])) style[key] = source[key]
  return style
}

export function normalizeUiTheme(source: unknown): UiThemeDocument {
  const item = source && typeof source === 'object' ? source as Partial<UiThemeDocument> : {}
  const variables: Record<string, string | number> = {}
  if (item.variables && typeof item.variables === 'object') for (const [key, value] of Object.entries(item.variables).slice(0, MAX_VARIABLES)) {
    if (typeof value === 'string' || typeof value === 'number' && Number.isFinite(value)) variables[key.slice(0, 80)] = typeof value === 'string' ? value.slice(0, 120) : value
  }
  const classes: Record<string, UiThemeClass> = {}
  if (item.classes && typeof item.classes === 'object') for (const [key, raw] of Object.entries(item.classes).slice(0, MAX_CLASSES)) {
    if (!raw || typeof raw !== 'object') continue
    const value = raw as Partial<UiThemeClass>
    classes[key.slice(0, 80)] = { normal: cleanStyle(value.normal), hovered: cleanStyle(value.hovered), pressed: cleanStyle(value.pressed), disabled: cleanStyle(value.disabled), focused: cleanStyle(value.focused) }
  }
  const defaults = defaultUiTheme()
  const variants: Record<string, Record<string, string | number>> = {}
  if (item.variants && typeof item.variants === 'object') for (const [name, raw] of Object.entries(item.variants).slice(0, 64)) if (raw && typeof raw === 'object' && !Array.isArray(raw)) variants[name.slice(0, 80)] = Object.fromEntries(Object.entries(raw).slice(0, MAX_VARIABLES).flatMap(([key, value]) => typeof value === 'string' || typeof value === 'number' && Number.isFinite(value) ? [[key.slice(0, 80), typeof value === 'string' ? value.slice(0, 120) : value]] : []))
  return {
    version: 2, name: typeof item.name === 'string' ? item.name.slice(0, 120) : defaults.name,
    parentTheme: typeof item.parentTheme === 'string' ? item.parentTheme.slice(0, 160) : null,
    variables: { ...defaults.variables, ...variables }, variants: { ...defaults.variants, ...variants }, classes: Object.keys(classes).length ? classes : defaults.classes
  }
}

export function createUiTheme(name = 'Nova UI'): string {
  const theme = defaultUiTheme(); theme.name = name.slice(0, 120)
  const asset = createTextAsset(theme.name, 'uiTheme', JSON.stringify(theme, null, 2), 'Assets/UI Themes')
  return assetReference(asset.uuid)
}

export function readUiTheme(reference: string | null | undefined, visited = new Set<string>()): UiThemeDocument | null {
  const asset = resolveAsset(reference), text = readTextAsset(reference)
  if (!asset || asset.assetType !== 'uiTheme' || text === null || visited.has(asset.uuid)) return null
  visited.add(asset.uuid)
  try {
    const current = normalizeUiTheme(JSON.parse(text) as unknown)
    const parent = current.parentTheme ? readUiTheme(current.parentTheme, visited) : null
    return parent ? { ...current, variables: { ...parent.variables, ...current.variables }, variants: { ...parent.variants, ...current.variants }, classes: { ...parent.classes, ...current.classes } } : current
  } catch { return null }
}

export function writeUiTheme(reference: string, theme: UiThemeDocument): boolean {
  const asset = resolveAsset(reference)
  return Boolean(asset?.assetType === 'uiTheme' && updateTextAsset(asset.uuid, JSON.stringify(normalizeUiTheme(theme), null, 2)))
}

export function themeStyle(theme: UiThemeDocument | null, className: string, state = 'normal', overrides: Record<string, string | number> = {}): UiThemeStyle {
  const usableOverrides = Object.fromEntries(Object.entries(overrides).filter(([, value]) => typeof value === 'number' && Number.isFinite(value) || typeof value === 'string' && value.trim().length > 0))
  if (!theme) return usableOverrides
  const styleClass = theme.classes[className] ?? theme.classes[className.split('.')[0]]
  const raw = { ...(styleClass?.normal ?? {}), ...(styleClass?.[state as keyof UiThemeClass] ?? {}), ...usableOverrides } as UiThemeStyle
  const resolve = (value: unknown): unknown => typeof value === 'string' && value.startsWith('$') ? theme.variables[value.slice(1)] ?? value : value
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, resolve(value)])) as UiThemeStyle
}

export function themeVariant(theme: UiThemeDocument | null, variant = 'default'): UiThemeDocument | null { return theme ? { ...theme, variables: { ...theme.variables, ...(theme.variants[variant] ?? {}) } } : null }
