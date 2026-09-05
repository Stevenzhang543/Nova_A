import type { AssetRecord } from './types'
import { assetSourceText } from './assetReferences'
/** Pure snapshot closure: selected language tables, every declared fallback and their ordinary asset dependencies. */
export function localizationBuildDependencies(assets: readonly AssetRecord[], project: unknown): { locales: Set<string>; assetUuids: Set<string> } {
  const source = project && typeof project === 'object' ? project as Record<string, unknown> : {}, settings = (source.projectSettings as { presentation?: { localization?: { sourceLocale?: string; buildLocales?: string[]; fallbackChain?: string[] } } } | undefined)?.presentation?.localization
  const requested = [...(settings?.buildLocales ?? [settings?.sourceLocale ?? 'en']), ...(settings?.fallbackChain ?? []), settings?.sourceLocale ?? 'en']
  const scenes = Array.isArray(source.scenes) ? source.scenes : []
  for (const scene of scenes) if (scene && typeof scene === 'object' && Array.isArray(scene.entities)) for (const entity of scene.entities) if (entity && typeof entity === 'object' && Array.isArray(entity.components)) for (const component of entity.components) if (component?.kind === 'Canvas' && typeof component.data?.localePreview === 'string' && component.data.localePreview) requested.push(component.data.localePreview)
  let timelineBytes = 0
  for (const asset of assets) if (asset.assetType === 'timeline') {
    const text = assetSourceText(asset); if (!text) continue
    if ((timelineBytes += text.length * 2) > 64 * 1024 * 1024) throw new Error('LOCALIZATION_BUILD_LIMIT: Timeline locale discovery exceeds 64 MiB of source text.')
    let document: { tracks?: Array<{ clips?: Array<{ locale?: unknown }> }> }; try { document = JSON.parse(text) as typeof document } catch { continue }
    if (Array.isArray(document?.tracks)) for (const track of document.tracks) if (Array.isArray(track?.clips)) for (const clip of track.clips) if (typeof clip?.locale === 'string' && clip.locale) requested.push(clip.locale)
  }
  const records = assets.filter(asset => asset.assetType === 'localization'), tables: Array<{ uuid: string; locale: string; fallback: string }> = []
  if (records.length > 256) throw new Error('LOCALIZATION_BUILD_LIMIT: More than 256 localization tables are not supported.')
  let content = 0
  for (const asset of records) {
    const text = assetSourceText(asset)
    if (text && (content += text.length * 2) > 16 * 1024 * 1024) throw new Error('LOCALIZATION_BUILD_LIMIT: Localization text exceeds the 16 MiB runtime table budget.')
    let document: { locale?: unknown; fallbackLocale?: unknown } = {}
    if (text) try { document = JSON.parse(text) as typeof document } catch { /* Reachable malformed documents are rejected by the ordinary asset source closure. */ }
    const locale = String(document.locale ?? asset.settings.localizationSettings.locale).toLowerCase(), fallback = String(document.fallbackLocale ?? asset.settings.localizationSettings.fallbackLocale ?? '').toLowerCase()
    tables.push({ uuid: asset.uuid.toLowerCase(), locale, fallback })
  }
  const locales = new Set<string>(), pending = requested.map(value => String(value).toLowerCase()).filter(Boolean)
  for (let index = 0; index < pending.length; index++) {
    const locale = pending[index]; if (locales.has(locale)) continue
    if (locales.size >= 64) throw new Error('LOCALIZATION_BUILD_LIMIT: Locale fallback closure exceeds 64 languages.')
    locales.add(locale)
    const language = locale.split('-')[0]; if (language !== locale) pending.push(language)
    for (const table of tables) if (table.locale === locale && table.fallback) pending.push(table.fallback)
  }
  return { locales, assetUuids: new Set(tables.filter(table => locales.has(table.locale)).map(table => table.uuid)) }
}
