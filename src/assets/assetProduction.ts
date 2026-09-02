import type { AssetContentGroup, AssetImportSettings, AssetPipelineMetadata, AssetRecord, SpriteRegion } from './types'
import { assetSourceBytes, sha256Bytes } from './contentHash'
import { buildAssetDependencyGraph } from './assetGraph'

export const ASSET_SOURCE_CATALOG = Object.freeze([
  { id: 'png', extensions: ['png'], importer: 'nova.image', magic: '89 50 4e 47' },
  { id: 'jpeg', extensions: ['jpg', 'jpeg'], importer: 'nova.image', magic: 'ff d8 ff' },
  { id: 'webp', extensions: ['webp'], importer: 'nova.image', magic: 'RIFF/WEBP' },
  { id: 'gif', extensions: ['gif'], importer: 'nova.image', magic: 'GIF8' },
  { id: 'svg', extensions: ['svg'], importer: 'nova.svg', magic: '<svg' },
  { id: 'wave', extensions: ['wav'], importer: 'nova.audio', magic: 'RIFF/WAVE' },
  { id: 'ogg', extensions: ['ogg'], importer: 'nova.audio', magic: 'OggS' },
  { id: 'mpeg-audio', extensions: ['mp3'], importer: 'nova.audio', magic: 'ID3/MPEG frame' },
  { id: 'flac', extensions: ['flac'], importer: 'nova.audio', magic: 'fLaC' },
  { id: 'font-sfnt', extensions: ['ttf', 'otf'], importer: 'nova.font', magic: 'sfnt/OTTO' },
  { id: 'font-web', extensions: ['woff', 'woff2'], importer: 'nova.font', magic: 'wOFF/wOF2' },
  { id: 'nova-json', extensions: ['nova-scene', 'nova-prefab', 'nova-tileset', 'nova-atlas', 'nova-path'], importer: 'nova.document', magic: 'UTF-8' },
  { id: 'rhai', extensions: ['rhai'], importer: 'nova.script', magic: 'UTF-8' },
  { id: 'localization', extensions: ['csv', 'po', 'arb', 'nova-locale'], importer: 'nova.localization', magic: 'UTF-8' }
])

export interface ProductionAssetGraph {
  dependencies: Map<string, Set<string>>
  reverseDependencies: Map<string, Set<string>>
  missingReferences: Array<{ owner: string; reference: string }>
  cycles: string[][]
  duplicateSources: Array<{ sourceHash: string; assets: string[] }>
}

function sortedUnique(values: Iterable<string>): string[] { return [...new Set(values)].sort((a, b) => a.localeCompare(b)) }

export function stableAssetSettings(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableAssetSettings).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableAssetSettings(item)}`).join(',')}}`
  return JSON.stringify(value)
}

export function assetSettingsHash(settings: unknown): string {
  return sha256Bytes(new TextEncoder().encode(stableAssetSettings(settings)))
}

export function buildProductionAssetGraph(assets: AssetRecord[], project?: unknown): ProductionAssetGraph {
  const base = buildAssetDependencyGraph(assets, project), cycles: string[][] = [], state = new Map<string, 0 | 1 | 2>(), stack: string[] = []
  const visit = (uuid: string) => {
    const status = state.get(uuid) ?? 0
    if (status === 2) return
    if (status === 1) { const start = stack.indexOf(uuid); if (start >= 0) cycles.push([...stack.slice(start), uuid]); return }
    state.set(uuid, 1); stack.push(uuid)
    for (const dependency of [...(base.dependencies.get(uuid) ?? [])].sort()) if (base.dependencies.has(dependency)) visit(dependency)
    stack.pop(); state.set(uuid, 2)
  }
  for (const uuid of [...base.dependencies.keys()].sort()) visit(uuid)
  const hashes = new Map<string, string[]>()
  for (const asset of assets) { const hash = asset.pipeline?.sourceHash; if (hash) hashes.set(hash, [...(hashes.get(hash) ?? []), asset.uuid]) }
  const duplicateSources = [...hashes].filter(([, uuids]) => uuids.length > 1).map(([sourceHash, uuids]) => ({ sourceHash, assets: sortedUnique(uuids) })).sort((a, b) => a.sourceHash.localeCompare(b.sourceHash))
  return { ...base, cycles: cycles.sort((a, b) => a.join('/').localeCompare(b.join('/'))), duplicateSources }
}

export interface ContentClosureEntry { uuid: string; path: string; groupId: string; mode: AssetContentGroup['mode']; owner: string; reason: string }
export function buildContentClosure(assets: AssetRecord[], groups: AssetContentGroup[], roots: Iterable<string>, project?: unknown): ContentClosureEntry[] {
  const graph = buildProductionAssetGraph(assets, project), byId = new Map(assets.map(asset => [asset.uuid, asset])), groupMap = new Map(groups.map(group => [group.id, group])), queue = sortedUnique(roots), seen = new Set<string>(), output: ContentClosureEntry[] = []
  while (queue.length) {
    const uuid = queue.shift()!; if (seen.has(uuid)) continue; seen.add(uuid)
    const asset = byId.get(uuid); if (!asset || asset.editorOnly) continue
    const groupId = asset.contentGroup || 'main', group = groupMap.get(groupId) ?? { id: 'main', name: 'Main', mode: 'embedded' as const, optional: false }
    output.push({ uuid, path: asset.path, groupId, mode: group.mode, owner: uuid, reason: group.mode === 'excluded' ? 'Explicitly excluded' : 'Root or transitive dependency' })
    for (const dependency of sortedUnique(graph.dependencies.get(uuid) ?? [])) queue.push(dependency)
  }
  return output.sort((a, b) => a.path.localeCompare(b.path) || a.uuid.localeCompare(b.uuid))
}

export function validateContentClosure(entries: ContentClosureEntry[]): Array<{ severity: 'warning' | 'error'; message: string; uuid: string }> {
  return entries.filter(entry => entry.mode === 'excluded').map(entry => ({ severity: 'error', uuid: entry.uuid, message: `${entry.path} is required by the dependency closure but belongs to an excluded content group.` }))
}

export interface ImportComparison { field: string; before: string; after: string; changed: boolean }
export function compareImportMetadata(before: AssetPipelineMetadata | null | undefined, after: AssetPipelineMetadata | null | undefined): ImportComparison[] {
  const fields: Array<keyof AssetPipelineMetadata> = ['importerId', 'importerVersion', 'presetId', 'platform', 'sourceHash', 'settingsHash', 'artifactSettingsHash', 'artifactHash', 'cacheKey']
  return fields.map(field => ({ field, before: String(before?.[field] ?? ''), after: String(after?.[field] ?? ''), changed: String(before?.[field] ?? '') !== String(after?.[field] ?? '') }))
}

export function provenanceDiagnostics(asset: AssetRecord): AssetPipelineMetadata['diagnostics'] {
  const pipeline = asset.pipeline, output: AssetPipelineMetadata['diagnostics'] = []
  if (!pipeline) return [{ severity: 'error', code: 'PROVENANCE_MISSING', message: 'Reimport this asset to create reproducible importer provenance.' }]
  if (!pipeline.importerId || !pipeline.importerVersion) output.push({ severity: 'error', code: 'IMPORTER_IDENTITY', message: 'Importer identity is incomplete; reimport with a versioned preset.' })
  if (!/^[0-9a-f]{64}$/i.test(pipeline.sourceHash)) output.push({ severity: 'error', code: 'SOURCE_HASH', message: 'Source SHA-256 is missing or malformed.' })
  if (!/^[0-9a-f]{64}$/i.test(pipeline.artifactHash)) output.push({ severity: 'error', code: 'ARTIFACT_HASH', message: 'Artifact SHA-256 is missing or malformed.' })
  if (pipeline.deprecatedSettings.length) output.push({ severity: 'warning', code: 'DEPRECATED_SETTINGS', message: `Replace non-reproducible settings: ${pipeline.deprecatedSettings.join(', ')}.` })
  if (!pipeline.reproducible) output.push({ severity: 'error', code: 'NOT_REPRODUCIBLE', message: 'Importer reported non-reproducible output; inspect diagnostics and reimport.' })
  return [...output, ...pipeline.diagnostics]
}

export function revertToVerifiedArtifact(asset: AssetRecord): boolean {
  if (!asset.pipeline?.lastValidSource) return false
  asset.source = asset.pipeline.lastValidSource; asset.pipeline.status = 'ready'; asset.pipeline.error = ''; asset.pipeline.invalidationReason = 'Reverted to last verified artifact'; return true
}

export function applyBulkAssetSettings(assets: AssetRecord[], patch: Partial<Pick<AssetRecord, 'contentGroup' | 'editorOnly' | 'tags' | 'collectionIds'>>): number {
  for (const asset of assets) {
    if (patch.contentGroup !== undefined) asset.contentGroup = patch.contentGroup.slice(0, 80)
    if (patch.editorOnly !== undefined) asset.editorOnly = patch.editorOnly
    if (patch.tags) asset.tags = sortedUnique(patch.tags.map(tag => tag.trim()).filter(Boolean)).slice(0, 64)
    if (patch.collectionIds) asset.collectionIds = sortedUnique(patch.collectionIds).slice(0, 64)
  }
  return assets.length
}

export function moveAssetFolderTransactional(assets: AssetRecord[], fromFolder: string, toFolder: string, faultAt?: 'after-paths' | 'after-references'): number {
  const from = fromFolder.replace(/\\/g, '/').replace(/\/+$/, ''), to = toFolder.replace(/\\/g, '/').replace(/\/+$/, '')
  if (!from.startsWith('Assets') || !to.startsWith('Assets') || to === from || to.startsWith(`${from}/`)) throw new Error('Folder move must remain inside Assets and cannot target its own descendant.')
  const snapshot = assets.map(asset => ({ asset, path: asset.path, source: asset.source })), moving = assets.filter(asset => asset.path === from || asset.path.startsWith(`${from}/`))
  try {
    for (const asset of moving) asset.path = `${to}${asset.path.slice(from.length)}`
    if (faultAt === 'after-paths') throw new Error('Injected folder-move interruption after paths')
    for (const asset of assets) asset.source = asset.source.split(from).join(to).split(encodeURIComponent(from)).join(encodeURIComponent(to))
    if (faultAt === 'after-references') throw new Error('Injected folder-move interruption after references')
    const paths = new Set<string>(); for (const asset of assets) { const key = asset.path.toLowerCase(); if (paths.has(key)) throw new Error(`Folder move produced duplicate path ${asset.path}`); paths.add(key) }
    return moving.length
  } catch (error) { for (const item of snapshot) { item.asset.path = item.path; item.asset.source = item.source } throw error }
}

export interface AtlasInput { uuid: string; width: number; height: number; group: string }
export interface AtlasPlacement { uuid: string; page: number; x: number; y: number; width: number; height: number; rotated: boolean }
export interface AtlasPackingReport { pages: number; placements: AtlasPlacement[]; utilization: number; deterministicKey: string; diagnostics: string[] }
export function packAtlasDeterministic(inputs: AtlasInput[], options: { maxSize: number; padding: number; rotationPolicy: 'Never' | 'Allow' }): AtlasPackingReport {
  const size = Math.min(8192, Math.max(64, Math.trunc(options.maxSize))), padding = Math.min(64, Math.max(0, Math.trunc(options.padding))), diagnostics: string[] = []
  const sorted = [...inputs].filter(input => input.width > 0 && input.height > 0).sort((a, b) => a.group.localeCompare(b.group) || Math.max(b.width, b.height) - Math.max(a.width, a.height) || b.height - a.height || b.width - a.width || a.uuid.localeCompare(b.uuid))
  const pages: Array<{ x: number; y: number; rowHeight: number }> = [{ x: 0, y: 0, rowHeight: 0 }], placements: AtlasPlacement[] = []
  for (const input of sorted) {
    let width = input.width, height = input.height, rotated = false
    if (options.rotationPolicy === 'Allow' && height > width && height <= size && width <= size) { [width, height] = [height, width]; rotated = true }
    if (width + padding * 2 > size || height + padding * 2 > size) { diagnostics.push(`${input.uuid} exceeds ${size}px atlas limit.`); continue }
    let page = pages.length - 1, cursor = pages[page]
    if (cursor.x + width + padding * 2 > size) { cursor.x = 0; cursor.y += cursor.rowHeight; cursor.rowHeight = 0 }
    if (cursor.y + height + padding * 2 > size) { pages.push({ x: 0, y: 0, rowHeight: 0 }); page++; cursor = pages[page] }
    placements.push({ uuid: input.uuid, page, x: cursor.x + padding, y: cursor.y + padding, width, height, rotated })
    cursor.x += width + padding * 2; cursor.rowHeight = Math.max(cursor.rowHeight, height + padding * 2)
  }
  const used = placements.reduce((sum, item) => sum + item.width * item.height, 0), pageCount = Math.max(1, pages.length), deterministicKey = sha256Bytes(new TextEncoder().encode(stableAssetSettings({ size, padding, placements })))
  return { pages: pageCount, placements, utilization: used / (pageCount * size * size), deterministicKey, diagnostics }
}

export function gridSliceRegions(width: number, height: number, columns: number, rows: number, margin = 0, spacing = 0): SpriteRegion[] {
  const safeColumns = Math.min(4096, Math.max(1, Math.trunc(columns))), safeRows = Math.min(4096, Math.max(1, Math.trunc(rows)))
  const cellWidth = Math.max(1, Math.floor((width - margin * 2 - spacing * (safeColumns - 1)) / safeColumns)), cellHeight = Math.max(1, Math.floor((height - margin * 2 - spacing * (safeRows - 1)) / safeRows)), output: SpriteRegion[] = []
  for (let row = 0; row < safeRows; row++) for (let column = 0; column < safeColumns; column++) output.push({ x: margin + column * (cellWidth + spacing), y: margin + row * (cellHeight + spacing), width: cellWidth, height: cellHeight })
  return output
}

export function detectOpaqueRegions(width: number, height: number, alpha: Uint8Array, threshold = 1, maximumRegions = 4096): SpriteRegion[] {
  if (width < 1 || height < 1 || alpha.length < width * height) return []
  const visited = new Uint8Array(width * height), regions: SpriteRegion[] = [], neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const
  for (let start = 0; start < width * height; start++) {
    if (visited[start] || alpha[start] < threshold) continue
    const queue = [start]; visited[start] = 1; let left = start % width, right = left, top = Math.floor(start / width), bottom = top
    for (let cursor = 0; cursor < queue.length; cursor++) { const index = queue[cursor], x = index % width, y = Math.floor(index / width); left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); for (const [dx, dy] of neighbors) { const nx = x + dx, ny = y + dy, next = ny * width + nx; if (nx >= 0 && ny >= 0 && nx < width && ny < height && !visited[next] && alpha[next] >= threshold) { visited[next] = 1; queue.push(next) } } }
    if (regions.length < maximumRegions) regions.push({ x: left, y: top, width: right - left + 1, height: bottom - top + 1 })
  }
  return regions.sort((a, b) => a.y - b.y || a.x - b.x || a.width - b.width || a.height - b.height)
}

export function polygonOutlineForRegion(region: SpriteRegion): Array<{ x: number; y: number }> { return [{ x: region.x, y: region.y }, { x: region.x + region.width, y: region.y }, { x: region.x + region.width, y: region.y + region.height }, { x: region.x, y: region.y + region.height }] }

const LANGUAGE_SAMPLES: Record<string, string> = { en: 'Nova game engine', de: 'Grüße für Nova', 'zh-CN': '诺瓦游戏引擎', ar: 'محرك نوفا', he: 'מנוע נובה', combining: 'Å é ñ', emoji: '🎮 ✨ 🧭' }
export interface GlyphCoverageReport { language: string; sample: string; supported: boolean; missing: string[]; action: string }
export function fontGlyphCoverage(asset: AssetRecord, languages: string[] = Object.keys(LANGUAGE_SAMPLES)): GlyphCoverageReport[] {
  const declared = new Set(asset.settings.fontSettings.declaredLanguages), fallback = asset.settings.fontSettings.fallbackFamilies.length > 0 || asset.settings.fontSettings.fallbackAssetUuids.length > 0
  return sortedUnique(languages).map(language => { const sample = LANGUAGE_SAMPLES[language] ?? language, supported = declared.has(language) || fallback; return { language, sample, supported, missing: supported ? [] : [...sample], action: supported ? 'Coverage declared or provided by a fallback chain.' : `Add ${language} to declared languages or assign a font fallback that covers the listed glyphs.` } })
}

function ascii(bytes: Uint8Array, start: number, length: number): string { return String.fromCharCode(...bytes.slice(start, start + length)) }
export function validateImportSource(name: string, mimeType: string, bytes: ArrayBuffer, settings: AssetImportSettings): AssetPipelineMetadata['diagnostics'] {
  const data = new Uint8Array(bytes), extension = name.split('.').pop()?.toLowerCase() ?? '', diagnostics: AssetPipelineMetadata['diagnostics'] = []
  if (name.includes('..') || /[\\/]/.test(name) || name.startsWith('.')) diagnostics.push({ severity: 'error', code: 'UNSAFE_PATH', message: 'Source name contains an unsafe archive/path segment.' })
  if (data.byteLength > 512 * 1024 * 1024) diagnostics.push({ severity: 'error', code: 'SOURCE_TOO_LARGE', message: 'Source exceeds the 512 MiB stable importer limit.' })
  const valid = extension === 'png' ? data[0] === 0x89 && ascii(data, 1, 3) === 'PNG' : ['jpg', 'jpeg'].includes(extension) ? data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff : extension === 'gif' ? ascii(data, 0, 4) === 'GIF8' : extension === 'webp' ? ascii(data, 0, 4) === 'RIFF' && ascii(data, 8, 4) === 'WEBP' : extension === 'wav' ? ascii(data, 0, 4) === 'RIFF' && ascii(data, 8, 4) === 'WAVE' : extension === 'ogg' ? ascii(data, 0, 4) === 'OggS' : extension === 'mp3' ? ascii(data, 0, 3) === 'ID3' || data[0] === 0xff && (data[1] & 0xe0) === 0xe0 : extension === 'flac' ? ascii(data, 0, 4) === 'fLaC' : ['woff', 'woff2'].includes(extension) ? ['wOFF', 'wOF2'].includes(ascii(data, 0, 4)) : extension === 'otf' ? ascii(data, 0, 4) === 'OTTO' : extension === 'ttf' ? data[0] === 0 && data[1] === 1 && data[2] === 0 && data[3] === 0 : true
  if (!valid) diagnostics.push({ severity: 'error', code: 'MAGIC_MISMATCH', message: `${name} does not match the declared ${extension || mimeType || 'source'} format.` })
  if (extension === 'svg' || mimeType === 'image/svg+xml') {
    const text = new TextDecoder().decode(data.slice(0, 4 * 1024 * 1024))
    if (!/<svg[\s>]/i.test(text)) diagnostics.push({ severity: 'error', code: 'SVG_ROOT', message: 'SVG source has no valid root element.' })
    if (/<script|\son\w+\s*=|javascript:/i.test(text)) diagnostics.push({ severity: 'error', code: 'SVG_ACTIVE_CONTENT', message: 'SVG active content is forbidden.' })
    if (!settings.svgSettings.allowExternalResources && /(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i.test(text)) diagnostics.push({ severity: 'error', code: 'SVG_EXTERNAL_RESOURCE', message: 'External SVG resources are disabled by this reproducible preset.' })
  }
  if (['csv', 'po', 'arb', 'nova-locale'].includes(extension)) {
    const source = new TextDecoder('utf-8', { fatal: false }).decode(data.slice(0, 16 * 1024 * 1024))
    if (source.includes('\u0000')) diagnostics.push({ severity: 'error', code: 'LOCALIZATION_BINARY', message: 'Localization sources must be UTF-8 text without NUL bytes.' })
    if (extension === 'arb') { try { const parsed = JSON.parse(source); if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error() } catch { diagnostics.push({ severity: 'error', code: 'ARB_JSON', message: 'ARB localization must be a JSON object.' }) } }
    if (extension === 'po' && !/(?:^|\n)msgid\s+"/m.test(source)) diagnostics.push({ severity: 'error', code: 'PO_MESSAGES', message: 'PO localization contains no msgid entries.' })
    if (extension === 'csv' && !source.split(/\r?\n/, 1)[0]?.includes(',')) diagnostics.push({ severity: 'warning', code: 'CSV_COLUMNS', message: 'CSV localization should begin with at least two comma-separated columns.' })
  }
  return diagnostics
}

export class ThumbnailCache {
  private readonly values = new Map<string, { url: string; used: number }>()
  constructor(readonly capacity = 512) {}
  get(key: string): string | null { const item = this.values.get(key); if (!item) return null; item.used = performance.now(); return item.url }
  set(key: string, url: string): void { this.values.set(key, { url, used: performance.now() }); if (this.values.size <= this.capacity) return; const victim = [...this.values].sort((a, b) => a[1].used - b[1].used || a[0].localeCompare(b[0]))[0]; if (victim) this.values.delete(victim[0]) }
  clear(): void { this.values.clear() }
}

export function sourceFingerprint(asset: AssetRecord): string { return asset.pipeline?.sourceHash || sha256Bytes(assetSourceBytes(asset.source)) }
