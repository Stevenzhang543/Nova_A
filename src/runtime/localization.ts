/** Editor authoring/legacy locale API. Runtime uses the required Catalog owner. */
import {assetReference,assetState,createTextAsset,resolveAsset,updateTextAsset} from '../assets/AssetDatabase'
import {parseRhai,walkRhai} from '../visual/rhaiSyntax'
import {decodeRhaiString} from '../visual/rhaiSyntaxLexer'
import {cleanLocale,defaultLocalizationTable,normalizeLocalizationTable,validateLocalizationDocument,missingLocalizationReport} from './localizationValues'
import type {LocalizationProjectSettings,LocalizationTable,LocalizationVariable,LocalizationExtraction,LocalizationDiagnostic,PseudolocalizationMode,TextDirection} from './localizationValues'
import {getEditorLocalizationSettings,getEditorLocalizationOwner} from '../editor/localizationAdapter'
export type {TextDirection,PseudolocalizationMode,LocalizationVariable,LocalizationValue,LocaleMetadata,LocalizationTable,LocalizationProjectSettings,LocalizationExtraction,MissingLocalizationEntry,LocalizationDiagnostic} from './localizationValues'
export {defaultLocalizationTable,normalizeLocalizationTable,validateLocalizationDocument,normalizeLocalizationSettings,exportLocalizationCsv,importLocalizationCsv,exportLocalizationPo,importLocalizationPo,missingLocalizationReport} from './localizationValues'
export const localizationSettings=getEditorLocalizationSettings()
const extractionDiagnostics=new WeakMap<LocalizationExtraction[],LocalizationDiagnostic[]>()
export function readLocalizationTable(reference: string | null | undefined): LocalizationTable | null { return getEditorLocalizationOwner().readLocalizationTable(reference) }
export function loadLocalizationSettings(source: unknown): void { return getEditorLocalizationOwner().loadLocalizationSettings(source) }
export function serializeLocalizationSettings(): LocalizationProjectSettings { return getEditorLocalizationOwner().serializeLocalizationSettings() }
export function localizationFallbackLocales(requested = localizationSettings.previewLocale): string[] { return getEditorLocalizationOwner().localizationFallbackLocales(requested) }
export function formatLocalizedNumber(value: number, locale = localizationSettings.previewLocale): string { return getEditorLocalizationOwner().formatLocalizedNumber(value,locale) }
export function formatLocalizedDate(value: Date | number | string, locale = localizationSettings.previewLocale): string { return getEditorLocalizationOwner().formatLocalizedDate(value,locale) }
export function pseudolocalize(text: string, mode: PseudolocalizationMode = localizationSettings.pseudolocalizationMode, expansionRatio = localizationSettings.expansionRatio): string { return getEditorLocalizationOwner().pseudolocalize(text,mode,expansionRatio) }
export function localize(key: string, variables: Record<string, LocalizationVariable> = {}, fallback = '', requested = localizationSettings.previewLocale): string { return getEditorLocalizationOwner().localize(key,variables,fallback,requested) }
export function localizeUiLabel(value: string, locale = localizationSettings.previewLocale): string { return getEditorLocalizationOwner().localizeUiLabel(value,locale) }
export function activeTextDirection(locale = localizationSettings.previewLocale): TextDirection { return getEditorLocalizationOwner().activeTextDirection(locale) }
export function activeFontFallbackFamilies(locale = localizationSettings.previewLocale): string[] { return getEditorLocalizationOwner().activeFontFallbackFamilies(locale) }
export function selectedLocalizationAssetUuids(): Set<string> { return getEditorLocalizationOwner().selectedLocalizationAssetUuids() }

/** 结构说明（自动提取）：writeLocalizationTable；输入 reference、table；直接调用 resolveAsset、validateLocalizationDocument、Error、errors.join、assetState.records.some 等；写入 asset.settings.localizationSettings.locale、asset.settings.localizationSettings.fallbackLocale；包含显式抛错路径。 */ export function writeLocalizationTable(reference: string, table: LocalizationTable): boolean {
  const asset = resolveAsset(reference)
  if (!asset || asset.assetType !== 'localization') return false
  const errors = validateLocalizationDocument(table); if (errors.length) throw new Error(errors.join('\n'))
  if (assetState.records.some(/** 结构说明（自动提取）：assetState.records.some 回调；输入 candidate；直接调用 locale.toLowerCase、readLocalizationTable、table.locale.toLowerCase；返回表达式求值结果。 */ candidate => candidate.uuid !== asset.uuid && candidate.assetType === 'localization' && readLocalizationTable(candidate.uuid)?.locale.toLowerCase() === table.locale.toLowerCase())) throw new Error(`A localization table already owns ${table.locale}; merge translations into that table instead.`)
  const normalized = normalizeLocalizationTable(table, asset.settings.localizationSettings.locale)
  if (!updateTextAsset(asset.uuid, JSON.stringify(normalized, null, 2))) return false
  asset.settings.localizationSettings.locale = normalized.locale
  asset.settings.localizationSettings.fallbackLocale = normalized.fallbackLocale
  return true
}

/** 结构说明（自动提取）：createLocalizationTable；输入 locale；直接调用 cleanLocale、Error、assetState.records.some、defaultLocalizationTable、createTextAsset 等；写入 asset.settings.localizationSettings.locale、asset.settings.localizationSettings.fallbackLocale；包含显式抛错路径。 */ export function createLocalizationTable(locale: string): string {
  const canonical = cleanLocale(locale, ''); if (!canonical) throw new Error('Enter a valid BCP-47 locale such as en, de or zh-CN.')
  if (assetState.records.some(/** 结构说明（自动提取）：assetState.records.some 回调；输入 candidate；直接调用 locale.toLowerCase、readLocalizationTable、canonical.toLowerCase；返回表达式求值结果。 */ candidate => candidate.assetType === 'localization' && readLocalizationTable(candidate.uuid)?.locale.toLowerCase() === canonical.toLowerCase())) throw new Error(`A localization table already owns ${canonical}; edit that table instead.`)
  const table = defaultLocalizationTable(locale)
  const asset = createTextAsset(`${table.locale}.nova-locale`, 'localization', JSON.stringify(table, null, 2), 'Assets/Localization')
  asset.settings.localizationSettings.locale = table.locale
  asset.settings.localizationSettings.fallbackLocale = table.fallbackLocale
  return assetReference(asset.uuid)
}

/** 结构说明（自动提取）：localizationDiagnostics；输入 extracted、tables；直接调用 extractionDiagnostics.get、map、missingLocalizationReport、Object.entries、test 等；包含循环处理。 */ export function localizationDiagnostics(extracted: LocalizationExtraction[], tables: LocalizationTable[]): LocalizationDiagnostic[] {
  const diagnostics: LocalizationDiagnostic[] = [...(extractionDiagnostics.get(extracted) ?? []), ...missingLocalizationReport(extracted, tables).map(/** 构造并返回记录 { code: 'NOVA-LOC-MISSING', severity: 'error', key: item.key, locale: item.locale, message: `Missing ${item.key} in ${item.locale}.` }，字段按当前实参及捕获状态求值。 */ (item): LocalizationDiagnostic => ({ code: 'NOVA-LOC-MISSING', severity: 'error', key: item.key, locale: item.locale, message: `Missing ${item.key} in ${item.locale}.` }))]
  for (const table of tables) {
    for (const [key, value] of Object.entries(table.entries)) {
      if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,239}$/.test(key)) diagnostics.push({ code: 'NOVA-LOC-KEY', severity: 'warning', key, locale: table.locale, message: 'Localization key is not stable identifier syntax.' })
      const variants = typeof value === 'string' ? null : value
      if (variants && !Object.prototype.hasOwnProperty.call(variants, 'other')) diagnostics.push({ code: 'NOVA-LOC-PLURAL-OTHER', severity: 'error', key, locale: table.locale, message: 'Plural/select entry requires an other variant.' })
      const text = typeof value === 'string' ? value : Object.values(value).join(' ')
      if (/\uFFFD/.test(text)) diagnostics.push({ code: 'NOVA-LOC-GLYPH', severity: 'error', key, locale: table.locale, message: 'Replacement glyph detected in localized text.' })
      const isolates = [...text].reduce(/* 计算表达式 depth + (/\u2066|\u2067|\u2068/.test(character) ? 1 : character === '\u2069' ? -1 : 0) 并返回结果，沿用操作数的原有类型规则。 */ (depth, character) => depth + (/\u2066|\u2067|\u2068/.test(character) ? 1 : character === '\u2069' ? -1 : 0), 0)
      if (isolates !== 0) diagnostics.push({ code: 'NOVA-LOC-BIDI', severity: 'warning', key, locale: table.locale, message: 'Bidirectional isolate controls are unbalanced.' })
    }
  }
  return diagnostics.sort(/* 先计算 a.locale.localeCompare(b.locale) || a.key.localeCompare(b.key)；仅当其为假值时求右侧 a.code.localeCompare(b.code)，返回短路求值结果。 */ (a, b) => a.locale.localeCompare(b.locale) || a.key.localeCompare(b.key) || a.code.localeCompare(b.code))
}

/** Extracts structured localization keys from serialized UI components and Rhai calls. */
/** 结构说明（自动提取）：extractLocalizationKeys；输入 project、scripts；直接调用 Map、WeakSet、stack.pop、seen.has、seen.add 等；写入 limited、sourceBudget；返回路径包含 result；包含循环处理。 */ export function extractLocalizationKeys(project: unknown, scripts: Array<{ path: string; source: string }> = []): LocalizationExtraction[] {
  const found = new Map<string, LocalizationExtraction>(), seen = new WeakSet<object>(), stack: Array<{ value: unknown; path: string; depth: number }> = [{ value: project, path: 'project', depth: 0 }]
  let remaining = 100_000, limited = scripts.length > 512
  while (stack.length && remaining-- > 0) {
    const { value, path, depth } = stack.pop()!
    if (depth > 64) { limited = true; continue }
    if (!value || typeof value !== 'object' || seen.has(value)) continue
    seen.add(value)
    const entries: Array<[string, unknown]> = value instanceof Map ? [...value.entries()].map(/* 返回按声明顺序构造的数组 [String(key), child]。 */ ([key, child]) => [String(key), child]) : Object.entries(value)
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
  const result = [...found.values()].sort(/* 调用 a.key.localeCompare(b.key) 并返回调用结果。 */ (a, b) => a.key.localeCompare(b.key))
  if (limited) extractionDiagnostics.set(result, [{ code: 'NOVA-LOC-EXTRACTION-LIMIT', severity: 'warning', key: '', locale: '', message: 'Key extraction is incomplete: maximum64 ancestry,100,000 objects,20,000 fields/object,512 scripts or4 Mi UTF-16 script units reached. Split the input and audit each part.' }])
  return result
}
