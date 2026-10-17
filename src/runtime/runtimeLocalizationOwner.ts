/** Fixed Catalog locale reads. The original complete algorithms live in one closure. */
import {normalizeLocalizationTable,normalizeLocalizationSettings,variant,RTL_PREFIXES,MAX_FALLBACKS,createInitialLocalizationSettings} from './localizationValues'
import type {LocalizationProjectSettings,LocalizationTable,LocalizationValue,LocalizationVariable,TextDirection,PseudolocalizationMode} from './localizationValues'
export interface RuntimeLocalizationRecord {readonly uuid:string;readonly assetType:string;readonly fontFamily?:string;readonly settings:{readonly localizationSettings:{readonly locale:string}}}
export interface RuntimeLocalizationCatalog {
 readonly identity:object
 readonly projectId:string
 revision():number
 listRecords():readonly RuntimeLocalizationRecord[]
 resolveAsset(reference:string|null|undefined):RuntimeLocalizationRecord|null
 readTextAsset(reference:string|null|undefined):string|null
}
/** Explicit Editor compatibility only; foreign callers use copied non-Vue settings and fixed revision. */
export interface RuntimeLocalizationOptions {readonly mutableEditorCatalog?:boolean;readonly settingsView?:LocalizationProjectSettings}
function createRuntimeLocalizationAlgorithms(catalog:RuntimeLocalizationCatalog,localizationSettings:LocalizationProjectSettings,assertCurrent:()=>void) {
 const resolve=catalog.resolveAsset.bind(catalog),read=catalog.readTextAsset.bind(catalog),records=catalog.listRecords.bind(catalog),revision=catalog.revision.bind(catalog)
 const resolveAsset=(reference:string|null|undefined)=>{assertCurrent();return resolve(reference)}
 const readTextAsset=(reference:string|null|undefined)=>{assertCurrent();return read(reference)}
 const assetState={get records(){assertCurrent();return records()},get generation(){assertCurrent();return revision()}}
 let localeGeneration=-1
 let cachedLocaleTables:LocalizationTable[]=[]


/** 结构说明（自动提取）：readLocalizationTable；输入 reference；直接调用 resolveAsset、readTextAsset、JSON.parse、normalizeLocalizationTable。 */ function readLocalizationTable(reference: string | null | undefined): LocalizationTable | null {
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

/** 执行时调用 Object.assign(localizationSettings, normalizeLocalizationSettings(source))；不显式返回调用结果。 */ function loadLocalizationSettings(source: unknown): void {
  Object.assign(localizationSettings, normalizeLocalizationSettings(source))
}

/* 调用 normalizeLocalizationSettings(localizationSettings) 并返回调用结果。 */ function serializeLocalizationSettings(): LocalizationProjectSettings {
  return normalizeLocalizationSettings(localizationSettings)
}
/** 结构说明（自动提取）：localeTables；无显式参数；直接调用 assetState.records.filter、flatMap、records.slice；写入 cachedLocaleTables、localeGeneration；返回路径包含 cachedLocaleTables。 */ function localeTables(): LocalizationTable[] {
  if (localeGeneration !== assetState.generation) {
    const records = assetState.records.filter(/* 比较 asset.assetType 与 'localization'，返回严格相等的判断结果。 */ asset => asset.assetType === 'localization')
    let bytes = 0
    cachedLocaleTables = records.slice(0, 256).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 asset；直接调用 readTextAsset、readLocalizationTable；写入 bytes。 */ asset => { const source = readTextAsset(asset.uuid); if (source === null || (bytes += source.length * 2) > 16 * 1024 * 1024) return []; const table = readLocalizationTable(asset.uuid); return table ? [table] : [] })
    localeGeneration = assetState.generation
  }
  return cachedLocaleTables
}
/** 结构说明（自动提取）：localizationFallbackLocales；输入 requested；直接调用 localeTables、Set、visit；返回路径包含 result；包含循环处理。 */ function localizationFallbackLocales(requested = localizationSettings.previewLocale): string[] {
  const tables = localeTables(), result: string[] = [], seen = new Set<string>()
  const visit = /** 结构说明（自动提取）：visit；输入 locale；直接调用 seen.has、locale.toLowerCase、seen.add、result.push、tables.find 等。 */ (locale: string) => {
    if (!locale || seen.has(locale.toLowerCase()) || result.length >= 64) return
    seen.add(locale.toLowerCase()); result.push(locale)
    const table = tables.find(/* 比较 item.locale.toLowerCase() 与 locale.toLowerCase()，返回严格相等的判断结果。 */ item => item.locale.toLowerCase() === locale.toLowerCase())
    if (table?.fallbackLocale) visit(table.fallbackLocale)
    const language = locale.split('-')[0]; if (language !== locale) visit(language)
  }
  visit(requested)
  for (const locale of [...localizationSettings.fallbackChain, localizationSettings.sourceLocale]) visit(locale)
  return result
}

/** 结构说明（自动提取）：formatVariables；输入 text、variables、locale；直接调用 text.replace。 */ function formatVariables(text: string, variables: Record<string, LocalizationVariable>, locale: string): string {
  return text.replace(/\{([A-Za-z0-9_.-]+)(?:,\s*(number|date))?\}/g, /** 结构说明（自动提取）：text.replace 回调；输入 _match、name、kind；直接调用 formatLocalizedNumber、Date、String、Number.isFinite、date.getTime 等。 */ (_match, name: string, kind?: string) => {
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

/** 结构说明（自动提取）：formatLocalizedNumber；输入 value、locale；直接调用 format、Intl.NumberFormat、String。 */ function formatLocalizedNumber(value: number, locale = localizationSettings.previewLocale): string {
  const options: Intl.NumberFormatOptions = localizationSettings.numberStyle === 'currency' ? { style: 'currency', currency: localizationSettings.currency } : { style: localizationSettings.numberStyle }
  try { return new Intl.NumberFormat(locale, options).format(value) } catch { return String(value) }
}

/** 结构说明（自动提取）：formatLocalizedDate；输入 value、locale；直接调用 Date、Number.isFinite、date.getTime、String、format 等。 */ function formatLocalizedDate(value: Date | number | string, locale = localizationSettings.previewLocale): string {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return String(value)
  const options: Intl.DateTimeFormatOptions = { dateStyle: localizationSettings.dateStyle, ...(localizationSettings.timeZone !== 'local' ? { timeZone: localizationSettings.timeZone } : {}) }
  try { return new Intl.DateTimeFormat(locale, options).format(date) } catch { return date.toISOString().slice(0, 10) }
}

/** 结构说明（自动提取）：pseudolocalize；输入 text、mode、expansionRatio；直接调用 join、map、repeat、Math.min、Math.ceil 等。 */ function pseudolocalize(text: string, mode: PseudolocalizationMode = localizationSettings.pseudolocalizationMode, expansionRatio = localizationSettings.expansionRatio): string {
  const expansion: Record<string, string> = { a: 'àá', e: 'ëé', i: 'ïí', o: 'öó', u: 'üú', A: 'ÀÁ', E: 'ËÉ', I: 'ÏÍ', O: 'ÖÓ', U: 'ÜÚ' }
  const accented = [...text].map(/* 当 expansion[character]?.[0] 为 null 或 undefined 时返回 character，否则保留左侧值。 */ character => expansion[character]?.[0] ?? character).join('')
  if (mode === 'bidi') return `\u202e⟦${accented}\u202c⟧`
  if (mode === 'accented') return `［${accented}］`
  const padding = '~'.repeat(Math.min(2_000, Math.ceil([...text].length * Math.min(2, Math.max(0, expansionRatio)))))
  return `［${accented}${padding}］`
}

/** 结构说明（自动提取）：localize；输入 key、variables、fallback、requested；直接调用 localeTables、localizationFallbackLocales、tables.find、formatVariables、variant 等；写入 value、locale；包含循环处理。 */ function localize(key: string, variables: Record<string, LocalizationVariable> = {}, fallback = '', requested = localizationSettings.previewLocale): string {
  const tables = localeTables()
  let value: LocalizationValue | undefined, locale = requested
  for (const candidate of localizationFallbackLocales(requested)) {
    const table = tables.find(/* 比较 item.locale.toLowerCase() 与 candidate.toLowerCase()，返回严格相等的判断结果。 */ item => item.locale.toLowerCase() === candidate.toLowerCase())
    if (key && table?.entries[key] !== undefined) { value = table.entries[key]; locale = table.locale; break }
  }
  const formatted = formatVariables(value === undefined ? fallback || key : variant(value, variables, locale), variables, locale)
  return localizationSettings.pseudolocalization ? pseudolocalize(formatted) : formatted
}

/** Legacy starter UI uses whole-label {key} shorthand; literal prose and variables remain untouched. */
/** 结构说明（自动提取）：localizeUiLabel；输入 value、locale；直接调用 exec、localize。 */ function localizeUiLabel(value: string, locale = localizationSettings.previewLocale): string { const key = /^\{([A-Za-z0-9_.-]+)\}$/.exec(value)?.[1]; return key ? localize(key, {}, value, locale) : value }

/** 结构说明（自动提取）：activeTextDirection；输入 locale；直接调用 find、localeTables、RTL_PREFIXES.has、[…].toLowerCase、locale.split。 */ function activeTextDirection(locale = localizationSettings.previewLocale): TextDirection {
  const table = localeTables().find(/* 比较 item.locale.toLowerCase() 与 locale.toLowerCase()，返回严格相等的判断结果。 */ item => item.locale.toLowerCase() === locale.toLowerCase())
  return table?.direction ?? (RTL_PREFIXES.has(locale.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr')
}

/** 结构说明（自动提取）：activeFontFallbackFamilies；输入 locale；直接调用 localeTables、slice、Set、flatMap、localizationFallbackLocales。 */ function activeFontFallbackFamilies(locale = localizationSettings.previewLocale): string[] {
  const tables = localeTables()
  return [...new Set(localizationFallbackLocales(locale).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 candidate；直接调用 tables.find；返回表达式求值结果。 */ candidate => tables.find(/* 比较 table.locale.toLowerCase() 与 candidate.toLowerCase()，返回严格相等的判断结果。 */ table => table.locale.toLowerCase() === candidate.toLowerCase())?.fontFallbacks ?? []).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 reference；直接调用 resolveAsset。 */ reference => { const asset = resolveAsset(reference); return asset?.assetType === 'font' && asset.fontFamily ? [asset.fontFamily] : [] }))].slice(0, MAX_FALLBACKS)
}

/** 结构说明（自动提取）：selectedLocalizationAssetUuids；无显式参数；直接调用 Set、map、flatMap、assetState.records.flatMap。 */ function selectedLocalizationAssetUuids(): Set<string> {
  const selected = new Set([...localizationSettings.buildLocales, localizationSettings.sourceLocale].flatMap(/* 调用 localizationFallbackLocales(locale) 并返回调用结果。 */ locale => localizationFallbackLocales(locale)).map(/* 调用 locale.toLowerCase() 并返回调用结果。 */ locale => locale.toLowerCase()))
  return new Set(assetState.records.flatMap(/** 结构说明（自动提取）：assetState.records.flatMap 回调；输入 asset；直接调用 selected.has、asset.settings.localizationSettings.locale.toLowerCase；返回表达式求值结果。 */ asset => asset.assetType === 'localization' && selected.has(asset.settings.localizationSettings.locale.toLowerCase()) ? [asset.uuid] : []))
}
 return {readLocalizationTable,loadLocalizationSettings,serializeLocalizationSettings,localizationFallbackLocales,formatLocalizedNumber,formatLocalizedDate,pseudolocalize,localize,localizeUiLabel,activeTextDirection,activeFontFallbackFamilies,selectedLocalizationAssetUuids,clearCache(){localeGeneration=-1;cachedLocaleTables=[]},cacheStats(){return {generation:localeGeneration,tables:cachedLocaleTables.length}}}
}
type RuntimeLocaleAlgorithms=ReturnType<typeof createRuntimeLocalizationAlgorithms>
export class RuntimeLocalizationOwner {
 readonly identity:object
 readonly projectId:string
 readonly catalogRevision:number
 readonly settings:LocalizationProjectSettings
 private readonly algorithms:RuntimeLocaleAlgorithms
 private readonly revision:()=>number
 private closed=false
 constructor(readonly catalog:RuntimeLocalizationCatalog,configuration:unknown=createInitialLocalizationSettings(),private readonly options:RuntimeLocalizationOptions={}) {
  if(!catalog||typeof catalog.identity!=='object'||catalog.identity===null||typeof catalog.projectId!=='string'||!catalog.projectId||[catalog.revision,catalog.listRecords,catalog.resolveAsset,catalog.readTextAsset].some(value=>typeof value!=='function'))throw new Error('LOCALIZATION_CATALOG_REQUIRED')
  this.identity=catalog.identity;this.projectId=catalog.projectId;this.revision=catalog.revision.bind(catalog);this.catalogRevision=this.revision()
  if(!Number.isSafeInteger(this.catalogRevision)||this.catalogRevision<0)throw new Error('LOCALIZATION_REVISION_INVALID')
  if(options.settingsView&&!options.mutableEditorCatalog)throw new Error('LOCALIZATION_LIVE_VIEW_REQUIRES_EDITOR_CATALOG')
  this.settings=options.settingsView??normalizeLocalizationSettings(configuration)
  this.algorithms=createRuntimeLocalizationAlgorithms(catalog,this.settings,()=>this.assertCurrent())
 }
 get isDisposed():boolean{return this.closed}
 private assertCurrent():void {
  if(this.closed)throw new Error('LOCALIZATION_OWNER_DISPOSED')
  const revision=this.revision()
  if(this.catalog.identity!==this.identity||this.catalog.projectId!==this.projectId||!Number.isSafeInteger(revision)||revision<0||!this.options.mutableEditorCatalog&&revision!==this.catalogRevision)throw new Error('LOCALIZATION_CATALOG_CHANGED')
 }
 currentLocale():string{this.assertCurrent();return this.settings.previewLocale}
 getPreviewLocale():string{return this.currentLocale()}
 readLocalizationTable(...args:Parameters<RuntimeLocaleAlgorithms['readLocalizationTable']>):ReturnType<RuntimeLocaleAlgorithms['readLocalizationTable']>{this.assertCurrent();const value=this.algorithms.readLocalizationTable(...args);this.assertCurrent();return value}
 loadLocalizationSettings(...args:Parameters<RuntimeLocaleAlgorithms['loadLocalizationSettings']>):ReturnType<RuntimeLocaleAlgorithms['loadLocalizationSettings']>{this.assertCurrent();const value=this.algorithms.loadLocalizationSettings(...args);this.assertCurrent();return value}
 serializeLocalizationSettings(...args:Parameters<RuntimeLocaleAlgorithms['serializeLocalizationSettings']>):ReturnType<RuntimeLocaleAlgorithms['serializeLocalizationSettings']>{this.assertCurrent();const value=this.algorithms.serializeLocalizationSettings(...args);this.assertCurrent();return value}
 localizationFallbackLocales(...args:Parameters<RuntimeLocaleAlgorithms['localizationFallbackLocales']>):ReturnType<RuntimeLocaleAlgorithms['localizationFallbackLocales']>{this.assertCurrent();const value=this.algorithms.localizationFallbackLocales(...args);this.assertCurrent();return value}
 formatLocalizedNumber(...args:Parameters<RuntimeLocaleAlgorithms['formatLocalizedNumber']>):ReturnType<RuntimeLocaleAlgorithms['formatLocalizedNumber']>{this.assertCurrent();const value=this.algorithms.formatLocalizedNumber(...args);this.assertCurrent();return value}
 formatLocalizedDate(...args:Parameters<RuntimeLocaleAlgorithms['formatLocalizedDate']>):ReturnType<RuntimeLocaleAlgorithms['formatLocalizedDate']>{this.assertCurrent();const value=this.algorithms.formatLocalizedDate(...args);this.assertCurrent();return value}
 pseudolocalize(...args:Parameters<RuntimeLocaleAlgorithms['pseudolocalize']>):ReturnType<RuntimeLocaleAlgorithms['pseudolocalize']>{this.assertCurrent();const value=this.algorithms.pseudolocalize(...args);this.assertCurrent();return value}
 localize(...args:Parameters<RuntimeLocaleAlgorithms['localize']>):ReturnType<RuntimeLocaleAlgorithms['localize']>{this.assertCurrent();const value=this.algorithms.localize(...args);this.assertCurrent();return value}
 localizeUiLabel(...args:Parameters<RuntimeLocaleAlgorithms['localizeUiLabel']>):ReturnType<RuntimeLocaleAlgorithms['localizeUiLabel']>{this.assertCurrent();const value=this.algorithms.localizeUiLabel(...args);this.assertCurrent();return value}
 activeTextDirection(...args:Parameters<RuntimeLocaleAlgorithms['activeTextDirection']>):ReturnType<RuntimeLocaleAlgorithms['activeTextDirection']>{this.assertCurrent();const value=this.algorithms.activeTextDirection(...args);this.assertCurrent();return value}
 activeFontFallbackFamilies(...args:Parameters<RuntimeLocaleAlgorithms['activeFontFallbackFamilies']>):ReturnType<RuntimeLocaleAlgorithms['activeFontFallbackFamilies']>{this.assertCurrent();const value=this.algorithms.activeFontFallbackFamilies(...args);this.assertCurrent();return value}
 selectedLocalizationAssetUuids(...args:Parameters<RuntimeLocaleAlgorithms['selectedLocalizationAssetUuids']>):ReturnType<RuntimeLocaleAlgorithms['selectedLocalizationAssetUuids']>{this.assertCurrent();const value=this.algorithms.selectedLocalizationAssetUuids(...args);this.assertCurrent();return value}
 cacheStats(){this.assertCurrent();return this.algorithms.cacheStats()}
 dispose():void{if(this.closed)return;this.closed=true;this.algorithms.clearCache()}
}
