import { reactive } from 'vue'
import { assetReference, assetState, createTextAsset, readTextAsset, resolveAsset, updateTextAsset } from '../assets/AssetDatabase'
import { finiteNumber } from '../world/geometry'
import { parseRhai, walkRhai } from '../visual/rhaiSyntax'
import { decodeRhaiString } from '../visual/rhaiSyntaxLexer'

export type TextDirection = 'ltr' | 'rtl'
export type PseudolocalizationMode = 'accented' | 'expanded' | 'bidi'
export type LocalizationVariable = string | number | boolean
export type LocalizationValue = string | Record<string, string>

export interface LocaleMetadata { displayName: string; nativeName: string; region: string; script: string }

export interface LocalizationTable {
  version: 2
  locale: string
  fallbackLocale: string
  direction: TextDirection
  metadata: LocaleMetadata
  fontFallbacks: string[]
  entries: Record<string, LocalizationValue>
  contexts: Record<string, string>
}

export interface LocalizationProjectSettings {
  sourceLocale: string
  previewLocale: string
  fallbackChain: string[]
  pseudolocalization: boolean
  pseudolocalizationMode: PseudolocalizationMode
  expansionRatio: number
  buildLocales: string[]
  numberStyle: 'decimal' | 'percent' | 'currency'
  currency: string
  dateStyle: 'short' | 'medium' | 'long' | 'full'
  timeZone: string
}

export interface LocalizationExtraction { key: string; context: string; source: string }
export interface MissingLocalizationEntry { key: string; locale: string; source: string; context: string }
export interface LocalizationDiagnostic { code: string; severity: 'error' | 'warning' | 'info'; key: string; locale: string; message: string }

export const localizationSettings = reactive<LocalizationProjectSettings>({
  sourceLocale: 'en', previewLocale: 'en', fallbackChain: ['en'], pseudolocalization: false, pseudolocalizationMode: 'expanded', expansionRatio: .35, buildLocales: ['en'], numberStyle: 'decimal', currency: 'USD', dateStyle: 'medium', timeZone: 'local'
})

const RTL_PREFIXES = new Set(['ar', 'fa', 'he', 'ur'])
const MAX_TABLE_ENTRIES = 20_000
const MAX_FALLBACKS = 16
const extractionDiagnostics = new WeakMap<LocalizationExtraction[], LocalizationDiagnostic[]>()

function cleanLocale(value: unknown, fallback = 'en'): string {
  const locale = String(value ?? '').trim().replace(/_/g, '-').slice(0, 35)
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale)) return fallback
  try { return Intl.getCanonicalLocales(locale)[0] ?? fallback } catch { return fallback }
}

function cleanReference(value: unknown): string | null {
  return typeof value === 'string' && value.length <= 160 ? value : null
}

function cleanValue(value: unknown): LocalizationValue | null {
  if (typeof value === 'string') return value.slice(0, 100_000)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const variants: Record<string, string> = Object.create(null)
  for (const [key, text] of Object.entries(value).slice(0, 32)) if (typeof text === 'string') variants[key.slice(0, 40)] = text.slice(0, 100_000)
  return Object.keys(variants).length ? variants : null
}

export function defaultLocalizationTable(locale = 'en'): LocalizationTable {
  const normalized = cleanLocale(locale)
  return {
    version: 2,
    locale: normalized,
    fallbackLocale: normalized === 'en' ? '' : 'en',
    direction: RTL_PREFIXES.has(normalized.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr',
    metadata: { displayName: normalized, nativeName: normalized, region: normalized.split('-')[1] ?? '', script: '' },
    fontFallbacks: [],
    entries: { 'game.title': 'My Game', 'menu.play': 'Play', 'menu.quit': 'Quit' },
    contexts: { 'game.title': 'Window and menu title', 'menu.play': 'Primary menu action', 'menu.quit': 'Exit action' }
  }
}

export function normalizeLocalizationTable(source: unknown, localeHint = 'en'): LocalizationTable {
  const item = source && typeof source === 'object' ? source as Partial<LocalizationTable> : {}
  const locale = cleanLocale(item.locale, cleanLocale(localeHint))
  const entries: Record<string, LocalizationValue> = Object.create(null)
  const contexts: Record<string, string> = Object.create(null)
  if (item.entries && typeof item.entries === 'object' && !Array.isArray(item.entries)) {
    for (const [key, raw] of Object.entries(item.entries).slice(0, MAX_TABLE_ENTRIES)) {
      const clean = cleanValue(raw)
      if (key.trim() && clean !== null) entries[key.trim().slice(0, 240)] = clean
    }
  }
  if (item.contexts && typeof item.contexts === 'object' && !Array.isArray(item.contexts)) for (const [key, context] of Object.entries(item.contexts).slice(0, MAX_TABLE_ENTRIES)) if (typeof context === 'string' && entries[key] !== undefined) contexts[key] = context.slice(0, 2_000)
  const rawMetadata = item.metadata && typeof item.metadata === 'object' ? item.metadata as Partial<LocaleMetadata> : {}
  return {
    version: 2,
    locale,
    fallbackLocale: item.fallbackLocale ? cleanLocale(item.fallbackLocale) : '',
    direction: item.direction === 'rtl' || RTL_PREFIXES.has(locale.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr',
    metadata: {
      displayName: typeof rawMetadata.displayName === 'string' ? rawMetadata.displayName.slice(0, 120) : locale,
      nativeName: typeof rawMetadata.nativeName === 'string' ? rawMetadata.nativeName.slice(0, 120) : locale,
      region: typeof rawMetadata.region === 'string' ? rawMetadata.region.slice(0, 32) : locale.split('-')[1] ?? '',
      script: typeof rawMetadata.script === 'string' ? rawMetadata.script.slice(0, 32) : ''
    },
    fontFallbacks: Array.isArray(item.fontFallbacks)
      ? item.fontFallbacks.map(cleanReference).filter((value): value is string => value !== null).filter((value, index, list) => list.indexOf(value) === index).slice(0, MAX_FALLBACKS)
      : [],
    entries,
    contexts
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

export function validateLocalizationDocument(table: LocalizationTable): string[] {
  const errors: string[] = []
  if (!table || typeof table !== 'object' || !table.entries || typeof table.entries !== 'object' || Array.isArray(table.entries)) return ['Localization document requires an entries object.']
  if (Object.keys(table.entries).length > MAX_TABLE_ENTRIES || JSON.stringify(table).length > 8 * 1024 * 1024) errors.push('Localization document exceeds 20,000 entries or 16 MiB of UTF-16 content.')
  if (cleanLocale(table.locale, '') !== table.locale || table.fallbackLocale && cleanLocale(table.fallbackLocale, '') !== table.fallbackLocale) errors.push('Locale must be a canonical BCP-47 locale such as en, de or zh-CN.')
  for (const [key, value] of Object.entries(table.entries)) {
    if (!key.trim() || key.trim() !== key || key.length > 240) errors.push(`Localization key would be altered: ${key.slice(0, 80)}`)
    if (typeof value === 'string') { if (value.length > 100_000) errors.push(`Translation exceeds 100,000 UTF-16 units: ${key}`) }
    else if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).length > 32 || !Object.prototype.hasOwnProperty.call(value, 'other') || Object.entries(value).some(([name, text]) => name.length > 40 || typeof text !== 'string' || text.length > 100_000)) errors.push(`Plural/select entry requires up to 32 string variants including other: ${key}`)
    if (errors.length >= 64) break
  }
  return errors
}
export function writeLocalizationTable(reference: string, table: LocalizationTable): boolean {
  const asset = resolveAsset(reference)
  if (!asset || asset.assetType !== 'localization') return false
  const errors = validateLocalizationDocument(table); if (errors.length) throw new Error(errors.join('\n'))
  if (assetState.records.some(candidate => candidate.uuid !== asset.uuid && candidate.assetType === 'localization' && readLocalizationTable(candidate.uuid)?.locale.toLowerCase() === table.locale.toLowerCase())) throw new Error(`A localization table already owns ${table.locale}; merge translations into that table instead.`)
  const normalized = normalizeLocalizationTable(table, asset.settings.localizationSettings.locale)
  if (!updateTextAsset(asset.uuid, JSON.stringify(normalized, null, 2))) return false
  asset.settings.localizationSettings.locale = normalized.locale
  asset.settings.localizationSettings.fallbackLocale = normalized.fallbackLocale
  return true
}

export function createLocalizationTable(locale: string): string {
  const canonical = cleanLocale(locale, ''); if (!canonical) throw new Error('Enter a valid BCP-47 locale such as en, de or zh-CN.')
  if (assetState.records.some(candidate => candidate.assetType === 'localization' && readLocalizationTable(candidate.uuid)?.locale.toLowerCase() === canonical.toLowerCase())) throw new Error(`A localization table already owns ${canonical}; edit that table instead.`)
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
  const modes: PseudolocalizationMode[] = ['accented', 'expanded', 'bidi']
  const numberStyle = item.numberStyle === 'percent' || item.numberStyle === 'currency' ? item.numberStyle : 'decimal'
  const dateStyle = item.dateStyle === 'short' || item.dateStyle === 'long' || item.dateStyle === 'full' ? item.dateStyle : 'medium'
  const currency = typeof item.currency === 'string' && /^[A-Z]{3}$/.test(item.currency) ? item.currency : 'USD'
  const timeZone = typeof item.timeZone === 'string' && item.timeZone.length <= 80 ? item.timeZone : 'local'
  return { sourceLocale, previewLocale, fallbackChain, pseudolocalization: item.pseudolocalization === true, pseudolocalizationMode: modes.includes(item.pseudolocalizationMode as PseudolocalizationMode) ? item.pseudolocalizationMode as PseudolocalizationMode : 'expanded', expansionRatio: Math.min(2, Math.max(0, finiteNumber(item.expansionRatio, .35))), buildLocales, numberStyle, currency, dateStyle, timeZone }
}

export function loadLocalizationSettings(source: unknown): void {
  Object.assign(localizationSettings, normalizeLocalizationSettings(source))
}

export function serializeLocalizationSettings(): LocalizationProjectSettings {
  return normalizeLocalizationSettings(localizationSettings)
}

let localeGeneration = -1
let cachedLocaleTables: LocalizationTable[] = []
function localeTables(): LocalizationTable[] {
  if (localeGeneration !== assetState.generation) {
    const records = assetState.records.filter(asset => asset.assetType === 'localization')
    let bytes = 0
    cachedLocaleTables = records.slice(0, 256).flatMap(asset => { const source = readTextAsset(asset.uuid); if (source === null || (bytes += source.length * 2) > 16 * 1024 * 1024) return []; const table = readLocalizationTable(asset.uuid); return table ? [table] : [] })
    localeGeneration = assetState.generation
  }
  return cachedLocaleTables
}
export function localizationFallbackLocales(requested = localizationSettings.previewLocale): string[] {
  const tables = localeTables(), result: string[] = [], seen = new Set<string>()
  const visit = (locale: string) => {
    if (!locale || seen.has(locale.toLowerCase()) || result.length >= 64) return
    seen.add(locale.toLowerCase()); result.push(locale)
    const table = tables.find(item => item.locale.toLowerCase() === locale.toLowerCase())
    if (table?.fallbackLocale) visit(table.fallbackLocale)
    const language = locale.split('-')[0]; if (language !== locale) visit(language)
  }
  visit(requested)
  for (const locale of [...localizationSettings.fallbackChain, localizationSettings.sourceLocale]) visit(locale)
  return result
}

function variant(value: LocalizationValue, variables: Record<string, LocalizationVariable>, locale: string): string {
  if (typeof value === 'string') return value
  const selection = String(variables.select ?? '')
  if (selection && value[selection] !== undefined) return value[selection]
  const count = finiteNumber(variables.count, Number.NaN)
  if (Number.isFinite(count)) {
    let category: Intl.LDMLPluralRule = 'other'
    try { category = new Intl.PluralRules(locale).select(count) } catch { /* Invalid author locale uses the explicit other variant. */ }
    if (value[`=${count}`] !== undefined) return value[`=${count}`]
    if (value[category] !== undefined) return value[category]
  }
  return value.other ?? Object.values(value)[0] ?? ''
}

function formatVariables(text: string, variables: Record<string, LocalizationVariable>, locale: string): string {
  return text.replace(/\{([A-Za-z0-9_.-]+)(?:,\s*(number|date))?\}/g, (_match, name: string, kind?: string) => {
    const value = variables[name]
    if (value === undefined) return `{${name}}`
    if (kind === 'number' && typeof value === 'number') return formatLocalizedNumber(value, locale)
    if (kind === 'date') {
      const date = new Date(typeof value === 'number' ? value : String(value))
      return Number.isFinite(date.getTime()) ? formatLocalizedDate(date, locale) : String(value)
    }
    return String(value)
  })
}

export function formatLocalizedNumber(value: number, locale = localizationSettings.previewLocale): string {
  const options: Intl.NumberFormatOptions = localizationSettings.numberStyle === 'currency' ? { style: 'currency', currency: localizationSettings.currency } : { style: localizationSettings.numberStyle }
  try { return new Intl.NumberFormat(locale, options).format(value) } catch { return String(value) }
}

export function formatLocalizedDate(value: Date | number | string, locale = localizationSettings.previewLocale): string {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return String(value)
  const options: Intl.DateTimeFormatOptions = { dateStyle: localizationSettings.dateStyle, ...(localizationSettings.timeZone !== 'local' ? { timeZone: localizationSettings.timeZone } : {}) }
  try { return new Intl.DateTimeFormat(locale, options).format(date) } catch { return date.toISOString().slice(0, 10) }
}

export function pseudolocalize(text: string, mode: PseudolocalizationMode = localizationSettings.pseudolocalizationMode, expansionRatio = localizationSettings.expansionRatio): string {
  const expansion: Record<string, string> = { a: 'àá', e: 'ëé', i: 'ïí', o: 'öó', u: 'üú', A: 'ÀÁ', E: 'ËÉ', I: 'ÏÍ', O: 'ÖÓ', U: 'ÜÚ' }
  const accented = [...text].map(character => expansion[character]?.[0] ?? character).join('')
  if (mode === 'bidi') return `\u202e⟦${accented}\u202c⟧`
  if (mode === 'accented') return `［${accented}］`
  const padding = '~'.repeat(Math.min(2_000, Math.ceil([...text].length * Math.min(2, Math.max(0, expansionRatio)))))
  return `［${accented}${padding}］`
}

export function localize(key: string, variables: Record<string, LocalizationVariable> = {}, fallback = '', requested = localizationSettings.previewLocale): string {
  const tables = localeTables()
  let value: LocalizationValue | undefined, locale = requested
  for (const candidate of localizationFallbackLocales(requested)) {
    const table = tables.find(item => item.locale.toLowerCase() === candidate.toLowerCase())
    if (key && table?.entries[key] !== undefined) { value = table.entries[key]; locale = table.locale; break }
  }
  const formatted = formatVariables(value === undefined ? fallback || key : variant(value, variables, locale), variables, locale)
  return localizationSettings.pseudolocalization ? pseudolocalize(formatted) : formatted
}

/** Legacy starter UI uses whole-label {key} shorthand; literal prose and variables remain untouched. */
export function localizeUiLabel(value: string, locale = localizationSettings.previewLocale): string { const key = /^\{([A-Za-z0-9_.-]+)\}$/.exec(value)?.[1]; return key ? localize(key, {}, value, locale) : value }

function csvCell(value: string): string { return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value }
function parseCsv(source: string): string[][] {
  if (source.length > 8 * 1024 * 1024) throw new Error('Localization CSV exceeds 16 MiB of UTF-16 content.')
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false, closed = false
  const field = () => { row.push(cell); cell = ''; closed = false }
  for (let index = 0; index < source.length; index++) {
    const character = source[index]
    if (quoted) { if (character === '"' && source[index + 1] === '"') { cell += '"'; index++ } else if (character === '"') { quoted = false; closed = true } else cell += character; continue }
    if (character === ',') field()
    else if (character === '\n' || character === '\r') { if (character === '\r' && source[index + 1] === '\n') index++; field(); rows.push(row); row = []; if (rows.length > MAX_TABLE_ENTRIES + 1) throw new Error('Localization CSV exceeds 20,000 entries.') }
    else if (character === '"' && !cell && !closed) quoted = true
    else if (character === '"' || closed) throw new Error(`Malformed localization CSV near UTF-16 offset ${index}.`)
    else cell += character
  }
  if (quoted) throw new Error('Localization CSV contains an unterminated quoted field.')
  if (cell || row.length || closed) { field(); rows.push(row) }
  return rows
}

export function exportLocalizationCsv(table: LocalizationTable): string {
  const normalized = normalizeLocalizationTable(table)
  return [['key', 'context', 'value'], ...Object.keys(normalized.entries).sort().map(key => [key, normalized.contexts[key] ?? '', typeof normalized.entries[key] === 'string' ? normalized.entries[key] : JSON.stringify(normalized.entries[key])])].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export function importLocalizationCsv(source: string, locale = 'en', base?: LocalizationTable): LocalizationTable {
  const table = normalizeLocalizationTable(base ?? defaultLocalizationTable(locale), locale), rows = parseCsv(source)
  const header = rows.shift()?.map(value => value.trim().toLowerCase()) ?? [], keyIndex = header.indexOf('key'), valueIndex = header.indexOf('value'), contextIndex = header.indexOf('context')
  if (keyIndex < 0 || valueIndex < 0) throw new Error('Localization CSV requires key and value columns.')
  for (const row of rows.slice(0, MAX_TABLE_ENTRIES)) { const key = String(row[keyIndex] ?? '').trim().slice(0, 240), raw = String(row[valueIndex] ?? ''); if (!key) continue; try { const parsed = JSON.parse(raw) as unknown; table.entries[key] = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, string> : raw } catch { table.entries[key] = raw }; const context = String(row[contextIndex] ?? '').trim(); if (context) table.contexts[key] = context.slice(0, 2_000) }
  const errors = validateLocalizationDocument(table); if (errors.length) throw new Error(errors.join('\n'))
  return normalizeLocalizationTable(table, locale)
}

function poQuote(value: string): string { return JSON.stringify(value) }
function poUnquote(value: string): string { try { const parsed = JSON.parse(value.trim()) as unknown; if (typeof parsed === 'string') return parsed } catch { /* Report malformed import, never replace existing translations with empty strings. */ }; throw new Error('Malformed quoted localization PO string.') }

export function exportLocalizationPo(table: LocalizationTable): string {
  const normalized = normalizeLocalizationTable(table)
  const header = `msgid ""\nmsgstr ""\n"Language: ${normalized.locale}\\n"\n"Content-Type: text/plain; charset=UTF-8\\n"\n`
  const rows = Object.keys(normalized.entries).sort().map(key => {
    const raw = normalized.entries[key], context = normalized.contexts[key], value = typeof raw === 'string' ? raw : raw.other ?? Object.values(raw)[0] ?? ''
    return `${typeof raw !== 'string' ? `#. nova-variants ${JSON.stringify(raw)}\n` : ''}${context ? `#. ${context.replace(/[\r\n]+/g, ' ').slice(0, 2_000)}\n` : ''}msgctxt ${poQuote(key)}\nmsgid ${poQuote(key)}\nmsgstr ${poQuote(value)}\n`
  })
  return `${header}\n${rows.join('\n')}`
}

export function importLocalizationPo(source: string, locale = 'en', base?: LocalizationTable): LocalizationTable {
  if (source.length > 8 * 1024 * 1024) throw new Error('Localization PO exceeds 16 MiB of UTF-16 content.')
  const table = normalizeLocalizationTable(base ?? defaultLocalizationTable(locale), locale)
  let fields: Record<string, string> = Object.create(null), current = '', comments: string[] = [], variants: Record<string, string> | null = null, entries = 0
  const finish = () => {
    if (!Object.keys(fields).length) { comments = []; variants = null; return }
    if (!Object.prototype.hasOwnProperty.call(fields, 'msgid') || !Object.prototype.hasOwnProperty.call(fields, 'msgstr')) throw new Error('PO entry requires msgid and msgstr; indexed gettext plurals need CSV or Nova variant metadata.')
    const key = fields.msgctxt || fields.msgid
    if (key) { if (++entries > MAX_TABLE_ENTRIES) throw new Error('Localization PO exceeds 20,000 entries.'); table.entries[key] = variants ? { ...variants, other: fields.msgstr } : fields.msgstr; if (comments.length) table.contexts[key] = comments.join('\n') }
    fields = Object.create(null); current = ''; comments = []; variants = null
  }
  for (const [index, line] of source.replace(/\r\n?/g, '\n').split('\n').entries()) {
    const value = line.trim()
    if (!value) { finish(); continue }
    if (value.startsWith('#. nova-variants ')) { const parsed = JSON.parse(value.slice(17)) as unknown; if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid Nova PO variant metadata.'); variants = parsed as Record<string, string>; continue }
    if (value.startsWith('#.')) { comments.push(value.slice(2).trim()); continue }
    if (value.startsWith('#')) continue
    const field = value.match(/^(msgctxt|msgid|msgstr)\s+(".*")$/)
    if (field) { if (Object.prototype.hasOwnProperty.call(fields, field[1])) { if (field[1] === 'msgid' && Object.prototype.hasOwnProperty.call(fields, 'msgstr')) finish(); else throw new Error(`Duplicate PO field on line ${index + 1}.`) }; current = field[1]; fields[current] = poUnquote(field[2]); continue }
    if (value.startsWith('"') && current) { fields[current] += poUnquote(value); continue }
    throw new Error(`Unsupported or malformed PO field on line ${index + 1}; existing draft retained. Indexed gettext plurals require a lossless CSV import.`)
  }
  finish()
  const errors = validateLocalizationDocument(table); if (errors.length) throw new Error(errors.join('\n'))
  return normalizeLocalizationTable(table, locale)
}

export function localizationDiagnostics(extracted: LocalizationExtraction[], tables: LocalizationTable[]): LocalizationDiagnostic[] {
  const diagnostics: LocalizationDiagnostic[] = [...(extractionDiagnostics.get(extracted) ?? []), ...missingLocalizationReport(extracted, tables).map((item): LocalizationDiagnostic => ({ code: 'NOVA-LOC-MISSING', severity: 'error', key: item.key, locale: item.locale, message: `Missing ${item.key} in ${item.locale}.` }))]
  for (const table of tables) {
    for (const [key, value] of Object.entries(table.entries)) {
      if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,239}$/.test(key)) diagnostics.push({ code: 'NOVA-LOC-KEY', severity: 'warning', key, locale: table.locale, message: 'Localization key is not stable identifier syntax.' })
      const variants = typeof value === 'string' ? null : value
      if (variants && !Object.prototype.hasOwnProperty.call(variants, 'other')) diagnostics.push({ code: 'NOVA-LOC-PLURAL-OTHER', severity: 'error', key, locale: table.locale, message: 'Plural/select entry requires an other variant.' })
      const text = typeof value === 'string' ? value : Object.values(value).join(' ')
      if (/\uFFFD/.test(text)) diagnostics.push({ code: 'NOVA-LOC-GLYPH', severity: 'error', key, locale: table.locale, message: 'Replacement glyph detected in localized text.' })
      const isolates = [...text].reduce((depth, character) => depth + (/\u2066|\u2067|\u2068/.test(character) ? 1 : character === '\u2069' ? -1 : 0), 0)
      if (isolates !== 0) diagnostics.push({ code: 'NOVA-LOC-BIDI', severity: 'warning', key, locale: table.locale, message: 'Bidirectional isolate controls are unbalanced.' })
    }
  }
  return diagnostics.sort((a, b) => a.locale.localeCompare(b.locale) || a.key.localeCompare(b.key) || a.code.localeCompare(b.code))
}

/** Extracts structured localization keys from serialized UI components and Rhai calls. */
export function extractLocalizationKeys(project: unknown, scripts: Array<{ path: string; source: string }> = []): LocalizationExtraction[] {
  const found = new Map<string, LocalizationExtraction>(), seen = new WeakSet<object>(), stack: Array<{ value: unknown; path: string; depth: number }> = [{ value: project, path: 'project', depth: 0 }]
  let remaining = 100_000, limited = scripts.length > 512
  while (stack.length && remaining-- > 0) {
    const { value, path, depth } = stack.pop()!
    if (depth > 64) { limited = true; continue }
    if (!value || typeof value !== 'object' || seen.has(value)) continue
    seen.add(value)
    const entries: Array<[string, unknown]> = value instanceof Map ? [...value.entries()].map(([key, child]) => [String(key), child]) : Object.entries(value)
    if (entries.length > 20_000) limited = true
    for (const [key, child] of entries.slice(0, 20_000)) { if (key === 'localizationKey' && typeof child === 'string' && child.trim()) found.set(child.trim(), { key: child.trim(), context: 'UI component', source: path }); if (child && typeof child === 'object') stack.push({ value: child, path: `${path}.${key}`, depth: depth + 1 }) }
  }
  if (stack.length) limited = true
  let sourceBudget = 4 * 1024 * 1024
  for (const script of scripts.slice(0, 512)) {
    if ((sourceBudget -= script.source.length) < 0) { limited = true; break }
    const program = parseRhai(script.source, { moduleMode: 'host' })
    for (const node of walkRhai(program)) if (node.kind === 'Call' && node.callee.kind === 'Identifier' && ['localize', 'tr'].includes(node.callee.name)) {
      const literal = node.arguments[0]
      if (literal?.kind !== 'Literal' || literal.literalKind !== 'string') continue
      try { const key = decodeRhaiString(literal.raw); if (key) found.set(key, { key, context: 'Script call', source: `${script.path}:${literal.span.line}` }) } catch { /* Invalid source remains diagnosed by the shared language model. */ }
    }
  }
  const result = [...found.values()].sort((a, b) => a.key.localeCompare(b.key))
  if (limited) extractionDiagnostics.set(result, [{ code: 'NOVA-LOC-EXTRACTION-LIMIT', severity: 'warning', key: '', locale: '', message: 'Key extraction is incomplete: maximum64 ancestry,100,000 objects,20,000 fields/object,512 scripts or4 Mi UTF-16 script units reached. Split the input and audit each part.' }])
  return result
}

export function missingLocalizationReport(extracted: LocalizationExtraction[], tables: LocalizationTable[]): MissingLocalizationEntry[] {
  return extracted.flatMap(item => tables.flatMap(table => table.entries[item.key] === undefined ? [{ key: item.key, locale: table.locale, source: item.source, context: item.context }] : [])).sort((a, b) => a.key.localeCompare(b.key) || a.locale.localeCompare(b.locale))
}

export function activeTextDirection(locale = localizationSettings.previewLocale): TextDirection {
  const table = localeTables().find(item => item.locale.toLowerCase() === locale.toLowerCase())
  return table?.direction ?? (RTL_PREFIXES.has(locale.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr')
}

export function activeFontFallbackFamilies(locale = localizationSettings.previewLocale): string[] {
  const tables = localeTables()
  return [...new Set(localizationFallbackLocales(locale).flatMap(candidate => tables.find(table => table.locale.toLowerCase() === candidate.toLowerCase())?.fontFallbacks ?? []).flatMap(reference => { const asset = resolveAsset(reference); return asset?.assetType === 'font' && asset.fontFamily ? [asset.fontFamily] : [] }))].slice(0, MAX_FALLBACKS)
}

export function selectedLocalizationAssetUuids(): Set<string> {
  const selected = new Set([...localizationSettings.buildLocales, localizationSettings.sourceLocale].flatMap(locale => localizationFallbackLocales(locale)).map(locale => locale.toLowerCase()))
  return new Set(assetState.records.flatMap(asset => asset.assetType === 'localization' && selected.has(asset.settings.localizationSettings.locale.toLowerCase()) ? [asset.uuid] : []))
}
