import { reactive } from 'vue'
import { assetReference, assetState, createTextAsset, readTextAsset, resolveAsset, updateTextAsset } from '../assets/AssetDatabase'
import { finiteNumber } from '../world/geometry'

export type TextDirection = 'ltr' | 'rtl'
export type LocalizationVariable = string | number | boolean
export type LocalizationValue = string | Record<string, string>

export interface LocalizationTable {
  version: 1
  locale: string
  fallbackLocale: string
  direction: TextDirection
  fontFallbacks: string[]
  entries: Record<string, LocalizationValue>
}

export interface LocalizationProjectSettings {
  sourceLocale: string
  previewLocale: string
  fallbackChain: string[]
  pseudolocalization: boolean
  buildLocales: string[]
}

export const localizationSettings = reactive<LocalizationProjectSettings>({
  sourceLocale: 'en', previewLocale: 'en', fallbackChain: ['en'], pseudolocalization: false, buildLocales: ['en']
})

const RTL_PREFIXES = new Set(['ar', 'fa', 'he', 'ur'])
const MAX_TABLE_ENTRIES = 20_000
const MAX_FALLBACKS = 16

function cleanLocale(value: unknown, fallback = 'en'): string {
  const locale = String(value ?? '').trim().replace(/_/g, '-').slice(0, 35)
  return /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale) ? locale : fallback
}

function cleanReference(value: unknown): string | null {
  return typeof value === 'string' && value.length <= 160 ? value : null
}

function cleanValue(value: unknown): LocalizationValue | null {
  if (typeof value === 'string') return value.slice(0, 100_000)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const variants: Record<string, string> = {}
  for (const [key, text] of Object.entries(value).slice(0, 32)) if (typeof text === 'string') variants[key.slice(0, 40)] = text.slice(0, 100_000)
  return Object.keys(variants).length ? variants : null
}

export function defaultLocalizationTable(locale = 'en'): LocalizationTable {
  const normalized = cleanLocale(locale)
  return {
    version: 1,
    locale: normalized,
    fallbackLocale: normalized === 'en' ? '' : 'en',
    direction: RTL_PREFIXES.has(normalized.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr',
    fontFallbacks: [],
    entries: { 'game.title': 'My Game', 'menu.play': 'Play', 'menu.quit': 'Quit' }
  }
}

export function normalizeLocalizationTable(source: unknown, localeHint = 'en'): LocalizationTable {
  const item = source && typeof source === 'object' ? source as Partial<LocalizationTable> : {}
  const locale = cleanLocale(item.locale, cleanLocale(localeHint))
  const entries: Record<string, LocalizationValue> = {}
  if (item.entries && typeof item.entries === 'object' && !Array.isArray(item.entries)) {
    for (const [key, raw] of Object.entries(item.entries).slice(0, MAX_TABLE_ENTRIES)) {
      const clean = cleanValue(raw)
      if (key.trim() && clean !== null) entries[key.trim().slice(0, 240)] = clean
    }
  }
  return {
    version: 1,
    locale,
    fallbackLocale: item.fallbackLocale ? cleanLocale(item.fallbackLocale) : '',
    direction: item.direction === 'rtl' || RTL_PREFIXES.has(locale.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr',
    fontFallbacks: Array.isArray(item.fontFallbacks)
      ? item.fontFallbacks.map(cleanReference).filter((value): value is string => value !== null).filter((value, index, list) => list.indexOf(value) === index).slice(0, MAX_FALLBACKS)
      : [],
    entries
  }
}

export function readLocalizationTable(reference: string | null | undefined): LocalizationTable | null {
  const asset = resolveAsset(reference)
  const text = readTextAsset(reference)
  if (!asset || asset.assetType !== 'localization' || text === null) return null
  try {
    const parsed = JSON.parse(text) as unknown
    return normalizeLocalizationTable(parsed, asset.settings.localizationSettings.locale)
  } catch {
    return null
  }
}

export function writeLocalizationTable(reference: string, table: LocalizationTable): boolean {
  const asset = resolveAsset(reference)
  if (!asset || asset.assetType !== 'localization') return false
  const normalized = normalizeLocalizationTable(table, asset.settings.localizationSettings.locale)
  asset.settings.localizationSettings.locale = normalized.locale
  asset.settings.localizationSettings.fallbackLocale = normalized.fallbackLocale
  return updateTextAsset(asset.uuid, JSON.stringify(normalized, null, 2))
}

export function createLocalizationTable(locale: string): string {
  const table = defaultLocalizationTable(locale)
  const asset = createTextAsset(`${table.locale}.nova-locale`, 'localization', JSON.stringify(table, null, 2), 'Assets/Localization')
  asset.settings.localizationSettings.locale = table.locale
  asset.settings.localizationSettings.fallbackLocale = table.fallbackLocale
  return assetReference(asset.uuid)
}

export function normalizeLocalizationSettings(source: unknown): LocalizationProjectSettings {
  const item = source && typeof source === 'object' ? source as Partial<LocalizationProjectSettings> : {}
  const sourceLocale = cleanLocale(item.sourceLocale)
  const previewLocale = cleanLocale(item.previewLocale, sourceLocale)
  const fallbackChain = (Array.isArray(item.fallbackChain) ? item.fallbackChain : [sourceLocale])
    .map(locale => cleanLocale(locale, sourceLocale)).filter((locale, index, list) => list.indexOf(locale) === index).slice(0, MAX_FALLBACKS)
  const buildLocales = (Array.isArray(item.buildLocales) ? item.buildLocales : [sourceLocale])
    .map(locale => cleanLocale(locale, sourceLocale)).filter((locale, index, list) => list.indexOf(locale) === index).slice(0, 64)
  if (!fallbackChain.includes(sourceLocale)) fallbackChain.push(sourceLocale)
  if (!buildLocales.includes(sourceLocale)) buildLocales.push(sourceLocale)
  return { sourceLocale, previewLocale, fallbackChain, pseudolocalization: item.pseudolocalization === true, buildLocales }
}

export function loadLocalizationSettings(source: unknown): void {
  Object.assign(localizationSettings, normalizeLocalizationSettings(source))
}

export function serializeLocalizationSettings(): LocalizationProjectSettings {
  return normalizeLocalizationSettings(localizationSettings)
}

function localeTables(): LocalizationTable[] {
  void assetState.generation
  return assetState.records.flatMap(asset => {
    if (asset.assetType !== 'localization') return []
    const table = readLocalizationTable(asset.uuid)
    return table ? [table] : []
  })
}

function variant(value: LocalizationValue, variables: Record<string, LocalizationVariable>, locale: string): string {
  if (typeof value === 'string') return value
  const selection = String(variables.select ?? '')
  if (selection && value[selection] !== undefined) return value[selection]
  const count = finiteNumber(variables.count, Number.NaN)
  if (Number.isFinite(count)) {
    const category = new Intl.PluralRules(locale).select(count)
    if (value[`=${count}`] !== undefined) return value[`=${count}`]
    if (value[category] !== undefined) return value[category]
  }
  return value.other ?? Object.values(value)[0] ?? ''
}

function formatVariables(text: string, variables: Record<string, LocalizationVariable>, locale: string): string {
  return text.replace(/\{([A-Za-z0-9_.-]+)(?:,\s*(number|date))?\}/g, (_match, name: string, kind?: string) => {
    const value = variables[name]
    if (value === undefined) return `{${name}}`
    if (kind === 'number' && typeof value === 'number') return new Intl.NumberFormat(locale).format(value)
    if (kind === 'date') {
      const date = new Date(typeof value === 'number' ? value : String(value))
      return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(locale).format(date) : String(value)
    }
    return String(value)
  })
}

export function pseudolocalize(text: string): string {
  const expansion: Record<string, string> = { a: 'àá', e: 'ëé', i: 'ïí', o: 'öó', u: 'üú', A: 'ÀÁ', E: 'ËÉ', I: 'ÏÍ', O: 'ÖÓ', U: 'ÜÚ' }
  return `［${[...text].map(character => expansion[character] ?? character).join('')}］`
}

export function localize(key: string, variables: Record<string, LocalizationVariable> = {}, fallback = ''): string {
  if (!key) return fallback
  const tables = localeTables()
  const requested = localizationSettings.previewLocale
  const requestedTable = tables.find(table => table.locale.toLowerCase() === requested.toLowerCase())
  const chain = [requestedTable?.locale, requestedTable?.fallbackLocale, ...localizationSettings.fallbackChain, localizationSettings.sourceLocale]
    .filter((locale): locale is string => Boolean(locale))
  let value: LocalizationValue | undefined
  let locale = requested
  for (const candidate of chain) {
    const table = tables.find(item => item.locale.toLowerCase() === candidate.toLowerCase())
    if (table?.entries[key] !== undefined) { value = table.entries[key]; locale = table.locale; break }
  }
  const formatted = formatVariables(value === undefined ? fallback || key : variant(value, variables, locale), variables, locale)
  return localizationSettings.pseudolocalization ? pseudolocalize(formatted) : formatted
}

export function activeTextDirection(): TextDirection {
  const table = localeTables().find(item => item.locale.toLowerCase() === localizationSettings.previewLocale.toLowerCase())
  return table?.direction ?? (RTL_PREFIXES.has(localizationSettings.previewLocale.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr')
}

export function activeFontFallbackFamilies(): string[] {
  const table = localeTables().find(item => item.locale.toLowerCase() === localizationSettings.previewLocale.toLowerCase())
  return (table?.fontFallbacks ?? []).flatMap(reference => {
    const asset = resolveAsset(reference)
    return asset?.assetType === 'font' && asset.fontFamily ? [asset.fontFamily] : []
  }).slice(0, MAX_FALLBACKS)
}

export function selectedLocalizationAssetUuids(): Set<string> {
  const selected = new Set(localizationSettings.buildLocales.map(locale => locale.toLowerCase()))
  selected.add(localizationSettings.sourceLocale.toLowerCase())
  return new Set(assetState.records.flatMap(asset => asset.assetType === 'localization' && selected.has(asset.settings.localizationSettings.locale.toLowerCase()) ? [asset.uuid] : []))
}
