import { assetReference, createTextAsset, readTextAsset, resolveAsset, updateTextAsset } from '../assets/AssetDatabase'

export interface UiThemeStyle {
  background?: string
  foreground?: string
  border?: string
  borderWidth?: number | string
  cornerRadius?: number | string
  fontSize?: number | string
  fontWeight?: number | string
  opacity?: number | string
}

export interface UiThemeClass {
  normal: UiThemeStyle
  hovered?: UiThemeStyle
  pressed?: UiThemeStyle
  disabled?: UiThemeStyle
  focused?: UiThemeStyle
}

export type UiThemeTokenValue = string | number
export interface UiThemeTokens {
  colors: Record<string, UiThemeTokenValue>
  typography: Record<string, UiThemeTokenValue>
  spacing: Record<string, UiThemeTokenValue>
  radii: Record<string, UiThemeTokenValue>
  states: Record<string, UiThemeTokenValue>
  icons: Record<string, UiThemeTokenValue>
  sounds: Record<string, UiThemeTokenValue>
  animation: Record<string, UiThemeTokenValue>
}

export interface UiThemeDocument {
  version: 3
  name: string
  parentTheme: string | null
  tokens: UiThemeTokens
  variables: Record<string, string | number>
  variants: Record<string, Record<string, string | number>>
  classes: Record<string, UiThemeClass>
}

const MAX_CLASSES = 512
const MAX_VARIABLES = 512
const TOKEN_GROUPS = ['colors', 'typography', 'spacing', 'radii', 'states', 'icons', 'sounds', 'animation'] as const

function defaultTokens(): UiThemeTokens {
  return {
    colors: { accent: '#4f96ff', surface: '#232934', text: '#f5f7fb', muted: '#8d98aa', danger: '#f05d77', focus: '#ffffff' },
    typography: { bodyFamily: 'Nunito Sans', bodySize: 16, bodyWeight: 500, titleSize: 24, titleWeight: 700 },
    spacing: { xs: 4, sm: 8, md: 12, lg: 20 }, radii: { control: 8, panel: 12, pill: 999 },
    states: { disabledOpacity: .7, hoverBrightness: 1.08, pressScale: .98 }, icons: {},
    sounds: { hover: '', press: '', focus: '', cancel: '' }, animation: { fastMs: 120, normalMs: 200, slowMs: 360, easing: 'cubic-bezier(.2,.8,.2,1)' }
  }
}

export function defaultUiTheme(): UiThemeDocument {
  return {
    version: 3,
    name: 'Nova UI',
    parentTheme: null,
    tokens: defaultTokens(),
    variables: { accent: '#4f96ff', surface: '#232934', text: '#f5f7fb', muted: '#8d98aa', radius: 10, spacing: 8, fontSize: 16, fontFamily: 'Nunito Sans' },
    variants: { default: {}, compact: { spacing: 5, radius: 7 }, highContrast: { surface: '#000000', text: '#ffffff', accent: '#74b4ff' } },
    classes: {
      button: {
        normal: { background: '$accent', foreground: '$text', cornerRadius: '$radius', fontSize: '$fontSize' },
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
  for (const key of ['borderWidth', 'cornerRadius', 'fontSize', 'fontWeight', 'opacity'] as const) if (typeof source[key] === 'number' && Number.isFinite(source[key])) style[key] = key === 'opacity' ? Math.min(1, Math.max(0, source[key])) : Math.max(0, source[key]); else if (typeof source[key] === 'string' && /^\$[A-Za-z0-9_.-]+$/.test(source[key])) style[key] = source[key]
  return style
}

function cleanTokens(value: unknown): UiThemeTokens {
  const defaults = defaultTokens(), source = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<UiThemeTokens> : {}
  const result = {} as UiThemeTokens
  for (const group of TOKEN_GROUPS) {
    const values = source[group] && typeof source[group] === 'object' && !Array.isArray(source[group]) ? source[group] as Record<string, unknown> : {}
    result[group] = { ...defaults[group], ...Object.fromEntries(Object.entries(values).slice(0, MAX_VARIABLES).flatMap(([key, raw]) => typeof raw === 'string' || typeof raw === 'number' && Number.isFinite(raw) ? [[key.slice(0, 80), typeof raw === 'string' ? raw.slice(0, 240) : raw]] : [])) }
  }
  return result
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
  const tokens = cleanTokens(item.tokens)
  const variants: Record<string, Record<string, string | number>> = {}
  if (item.variants && typeof item.variants === 'object') for (const [name, raw] of Object.entries(item.variants).slice(0, 64)) if (raw && typeof raw === 'object' && !Array.isArray(raw)) variants[name.slice(0, 80)] = Object.fromEntries(Object.entries(raw).slice(0, MAX_VARIABLES).flatMap(([key, value]) => typeof value === 'string' || typeof value === 'number' && Number.isFinite(value) ? [[key.slice(0, 80), typeof value === 'string' ? value.slice(0, 120) : value]] : []))
  return {
    version: 3, name: typeof item.name === 'string' ? item.name.slice(0, 120) : defaults.name,
    parentTheme: typeof item.parentTheme === 'string' ? item.parentTheme.slice(0, 160) : null,
    tokens,
    variables: { ...defaults.variables, ...variables }, variants: { ...defaults.variants, ...variants }, classes: Object.keys(classes).length ? classes : defaults.classes
  }
}

/** Editable authored values only. Inheritance is resolved separately and must never be baked into a child save. */
export function normalizeUiThemeSource(source: unknown): UiThemeDocument {
  const raw = source && typeof source === 'object' && !Array.isArray(source) ? source as Partial<UiThemeDocument> : {}, normalized = normalizeUiTheme(raw)
  const own = <T>(values: Record<string, T>, authored: unknown): Record<string, T> => Object.fromEntries(Object.keys(authored && typeof authored === 'object' && !Array.isArray(authored) ? authored : {}).filter(key => Object.prototype.hasOwnProperty.call(values, key)).map(key => [key, values[key]]))
  return { ...normalized, variables: own(normalized.variables, raw.variables), variants: own(normalized.variants, raw.variants), classes: own(normalized.classes, raw.classes), tokens: Object.fromEntries(TOKEN_GROUPS.map(group => [group, own(normalized.tokens[group], raw.tokens?.[group])])) as unknown as UiThemeTokens }
}
export function readUiThemeSource(reference: string | null | undefined): UiThemeDocument | null {
  const asset = resolveAsset(reference), text = readTextAsset(reference)
  if (!asset || asset.assetType !== 'uiTheme' || text === null || text.length > 2 * 1024 * 1024) return null
  try { return normalizeUiThemeSource(JSON.parse(text)) } catch { return null }
}

export function createUiTheme(name = 'Nova UI'): string {
  const theme = defaultUiTheme(); theme.name = name.slice(0, 120)
  const asset = createTextAsset(theme.name, 'uiTheme', JSON.stringify(theme, null, 2), 'Assets/UI Themes')
  return assetReference(asset.uuid)
}

/** Merge explicit child fields before defaults; omitted child values cannot erase parent states/tokens. */
export function mergeUiTheme(parent: UiThemeDocument | null, source: unknown): UiThemeDocument {
  const raw = source && typeof source === 'object' && !Array.isArray(source) ? source as Partial<UiThemeDocument> : {}
  if (!parent) return normalizeUiTheme(raw)
  const classes: Record<string, UiThemeClass> = { ...parent.classes }
  for (const [name, value] of Object.entries(raw.classes ?? {}).slice(0, MAX_CLASSES)) {
    if (!value || typeof value !== 'object') continue
    const inherited = parent.classes[name]
    classes[name] = { normal: { ...inherited?.normal, ...value.normal } }
    for (const state of ['hovered', 'pressed', 'disabled', 'focused'] as const) classes[name][state] = { ...inherited?.[state], ...value[state] }
  }
  return normalizeUiTheme({ ...parent, ...raw, tokens: Object.fromEntries(TOKEN_GROUPS.map(group => [group, { ...parent.tokens[group], ...raw.tokens?.[group] }])), variables: { ...parent.variables, ...raw.variables }, variants: Object.fromEntries([...new Set([...Object.keys(parent.variants), ...Object.keys(raw.variants ?? {})])].map(name => [name, { ...parent.variants[name], ...raw.variants?.[name] }])), classes })
}
export function readUiTheme(reference: string | null | undefined, visited = new Set<string>()): UiThemeDocument | null {
  const asset = resolveAsset(reference), text = readTextAsset(reference)
  if (!asset || asset.assetType !== 'uiTheme' || text === null || text.length > 2 * 1024 * 1024 || visited.has(asset.uuid) || visited.size >= 32) return null
  visited.add(asset.uuid)
  try {
    const raw = JSON.parse(text) as Partial<UiThemeDocument>
    const parent = raw.parentTheme ? readUiTheme(raw.parentTheme, visited) : null
    if (raw.parentTheme && !parent) return null
    return mergeUiTheme(parent, raw)
  } catch { return null }
}

export function validateUiThemeDocument(theme: UiThemeDocument): string[] {
  const errors: string[] = []
  if (JSON.stringify(theme).length > 2 * 1024 * 1024 || Object.keys(theme.classes).length > MAX_CLASSES || Object.keys(theme.variables).length > MAX_VARIABLES || Object.keys(theme.variants).length > 64) errors.push('Theme exceeds supported document/class/variable limits.')
  for (const [name, styleClass] of Object.entries(theme.classes)) for (const [state, style] of Object.entries(styleClass)) {
    if (!style || typeof style !== 'object') continue
    for (const [key, value] of Object.entries(style)) {
      if (!['background', 'foreground', 'border', 'borderWidth', 'cornerRadius', 'fontSize', 'fontWeight', 'opacity'].includes(key)) errors.push(`Unsupported theme property ${name}.${state}.${key}.`)
      else if (['background', 'foreground', 'border'].includes(key)) { if (typeof value !== 'string' || value.length > 80 || !value.startsWith('$') && typeof CSS !== 'undefined' && !CSS.supports('color', value)) errors.push(`Invalid theme color ${name}.${state}.${key}.`) }
      else if (!(typeof value === 'string' && /^\$[A-Za-z0-9_.-]+$/.test(value)) && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || key === 'opacity' && value > 1)) errors.push(`Invalid theme number ${name}.${state}.${key}.`)
      if (errors.length >= 64) return errors
    }
  }
  return errors
}
export function writeUiTheme(reference: string, theme: UiThemeDocument): boolean {
  const asset = resolveAsset(reference)
  const errors = validateUiThemeDocument(theme); if (errors.length) throw new Error(errors.join('\n'))
  if (theme.parentTheme) { const chain = themeInheritanceChain(theme.parentTheme); if (chain.cycle || chain.missing.length || chain.references.includes(asset?.uuid ?? '')) throw new Error('Theme parent is missing, cyclic or exceeds the inheritance limit.') }
  return Boolean(asset?.assetType === 'uiTheme' && updateTextAsset(asset.uuid, JSON.stringify(normalizeUiThemeSource(theme), null, 2)))
}

export function themeStyle(theme: UiThemeDocument | null, className: string, state = 'normal', overrides: Record<string, string | number> = {}): UiThemeStyle {
  const styleClass = theme?.classes[className] ?? theme?.classes[className.split('.')[0]]
  const raw = { ...(styleClass?.normal ?? {}), ...(styleClass?.[state as keyof UiThemeClass] ?? {}), ...cleanStyle(overrides) }
  const resolve = (input: string | number | undefined): string | number | undefined => {
    let value = input
    const seen = new Set<string>()
    while (typeof value === 'string' && value.startsWith('$')) {
      if (!theme || seen.has(value) || seen.size >= 32) return undefined
      seen.add(value)
      const key = value.slice(1), [group, name] = key.split('.')
      value = theme.variables[key] ?? (TOKEN_GROUPS.includes(group as typeof TOKEN_GROUPS[number]) && name ? theme.tokens[group as typeof TOKEN_GROUPS[number]][name] : undefined)
    }
    return value
  }
  return cleanStyle(Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, resolve(value)])))
}

export function themeVariant(theme: UiThemeDocument | null, variant = 'default'): UiThemeDocument | null { return theme ? { ...theme, variables: { ...theme.variables, ...(theme.variants[variant] ?? {}) } } : null }

export function themeInheritanceChain(reference: string | null | undefined): { references: string[]; cycle: boolean; missing: string[] } {
  const references: string[] = [], missing: string[] = [], visited = new Set<string>()
  let current = reference ?? null
  while (current && references.length < 32) {
    const asset = resolveAsset(current), text = readTextAsset(current)
    if (!asset || asset.assetType !== 'uiTheme' || text === null) { missing.push(current); break }
    if (visited.has(asset.uuid)) { references.push(asset.uuid); return { references, cycle: true, missing } }
    visited.add(asset.uuid); references.push(asset.uuid)
    try { current = normalizeUiTheme(JSON.parse(text) as unknown).parentTheme } catch { missing.push(asset.uuid); break }
  }
  if (current && references.length >= 32) missing.push(`Theme inheritance exceeds 32 levels: ${current}`)
  return { references, cycle: false, missing }
}

export function themeUnusedTokens(theme: UiThemeDocument): string[] {
  const serialized = JSON.stringify({ classes: theme.classes, variants: theme.variants })
  const result: string[] = []
  for (const group of TOKEN_GROUPS) for (const key of Object.keys(theme.tokens[group])) {
    if (!serialized.includes(`$${group}.${key}`) && !serialized.includes(`$${key}`)) result.push(`${group}.${key}`)
  }
  return result.sort()
}

export function compareUiThemes(first: UiThemeDocument, second: UiThemeDocument): Array<{ path: string; first: UiThemeTokenValue | null; second: UiThemeTokenValue | null }> {
  const differences: Array<{ path: string; first: UiThemeTokenValue | null; second: UiThemeTokenValue | null }> = []
  for (const group of TOKEN_GROUPS) for (const key of new Set([...Object.keys(first.tokens[group]), ...Object.keys(second.tokens[group])])) {
    const left = first.tokens[group][key] ?? null, right = second.tokens[group][key] ?? null
    if (left !== right) differences.push({ path: `${group}.${key}`, first: left, second: right })
  }
  return differences.sort((a, b) => a.path.localeCompare(b.path))
}
