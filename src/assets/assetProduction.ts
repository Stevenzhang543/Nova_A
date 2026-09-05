import type { AssetContentGroup, AssetImportSettings, AssetPipelineMetadata, AssetRecord, SpriteRegion } from './types'
import { assetSourceBytes, sha256Bytes } from './contentHash'
import { buildAssetDependencyGraph, projectAssetReferences, repairAssetPathReferences } from './assetGraph'

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

const ordinal = (first:string,second:string) => first < second ? -1 : first > second ? 1 : 0
function sortedUnique(values: Iterable<string>): string[] { return [...new Set(values)].sort((a, b) => ordinal(a,b)) }

export function stableAssetSettings(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableAssetSettings).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => ordinal(a,b)).map(([key, item]) => `${JSON.stringify(key)}:${stableAssetSettings(item)}`).join(',')}}`
  return JSON.stringify(value)
}

export function assetSettingsHash(settings: unknown): string {
  return sha256Bytes(new TextEncoder().encode(stableAssetSettings(settings)))
}

export function buildProductionAssetGraph(assets: AssetRecord[], project?: unknown): ProductionAssetGraph {
  const base = buildAssetDependencyGraph(assets, project), cycles: string[][] = [], state = new Map<string, 0 | 1 | 2>()
  for(const root of [...base.dependencies.keys()].sort()){
    if(state.get(root)===2)continue
    const path:string[]=[],positions=new Map<string,number>(),stack:Array<{uuid:string;children:string[];index:number}>=[]
    const enter=(uuid:string)=>{state.set(uuid,1);positions.set(uuid,path.length);path.push(uuid);stack.push({uuid,children:[...(base.dependencies.get(uuid)??[])].filter(id=>base.dependencies.has(id)).sort(),index:0})}
    enter(root)
    while(stack.length){const frame=stack[stack.length-1]
      if(frame.index>=frame.children.length){state.set(frame.uuid,2);positions.delete(frame.uuid);path.pop();stack.pop();continue}
      const child=frame.children[frame.index++],status=state.get(child)??0
      if(status===0)enter(child)
      else if(status===1&&cycles.length<256)cycles.push([...path.slice(positions.get(child)!),child])
    }
  }
  const hashes = new Map<string, string[]>()
  for (const asset of assets) { const hash = asset.pipeline?.sourceHash; if (hash) { const values=hashes.get(hash)??[]; values.push(asset.uuid); hashes.set(hash,values) } }
  const duplicateSources = [...hashes].filter(([, uuids]) => uuids.length > 1).map(([sourceHash, uuids]) => ({ sourceHash, assets: sortedUnique(uuids) })).sort((a, b) => ordinal(a.sourceHash,b.sourceHash))
  return { ...base, cycles: cycles.sort((a, b) => ordinal(a.join('/'),b.join('/'))), duplicateSources }
}

export interface ContentClosureEntry { uuid: string; path: string; groupId: string; mode: AssetContentGroup['mode']; owner: string; reason: string; issue?: 'missing' | 'editor-only' | 'unknown-group' | 'invalid-source'; sourceError?:string }
export function buildContentClosure(assets: AssetRecord[], groups: AssetContentGroup[], roots: Iterable<string>, project?: unknown): ContentClosureEntry[] {
  const graph = buildAssetDependencyGraph(assets, project), byId = new Map(assets.map(asset => [asset.uuid.toLowerCase(), asset])), groupMap = new Map(groups.map(group => [group.id, group]))
  const sourceErrors=new Map(graph.diagnostics.map(issue=>[issue.owner,issue.message]))
  const queue = sortedUnique(roots).map(reference => {const uuid=reference.replace(/^asset:\/\//i,'');return {uuid:/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(uuid)?uuid.toLowerCase():uuid,owner:'project'}}), seen = new Set<string>(), output: ContentClosureEntry[] = []
  for (let index=0;index<queue.length;index++) {
    const {uuid,owner}=queue[index]; if(seen.has(uuid))continue;seen.add(uuid)
    const asset=byId.get(uuid)
    if(!asset){output.push({uuid,path:uuid,groupId:'',mode:'excluded',owner,reason:'Required asset is missing',issue:'missing'});continue}
    const sourceError=sourceErrors.get(asset.uuid)
    const groupId=asset.contentGroup||'main',group=groupMap.get(groupId),issue=sourceError?'invalid-source':asset.editorOnly?'editor-only':!group&&groupId!=='main'?'unknown-group':undefined
    output.push({uuid:asset.uuid,path:asset.path,groupId,mode:asset.editorOnly?'excluded':group?.mode??'embedded',owner,reason:owner==='project'?'Build root':`Required by ${byId.get(owner)?.path??owner}`,issue,sourceError})
    for(const dependency of sortedUnique(graph.dependencies.get(uuid)??[]))queue.push({uuid:dependency,owner:uuid})
  }
  return output.sort((a,b)=>ordinal(a.path,b.path)||ordinal(a.uuid,b.uuid))
}
export function validateContentClosure(entries: ContentClosureEntry[]): Array<{severity:'warning'|'error';message:string;uuid:string}> {
  return entries.filter(entry=>entry.issue||entry.mode==='excluded').map(entry=>({severity:'error',uuid:entry.uuid,message:entry.issue==='invalid-source'?`${entry.path} dependency source is invalid: ${entry.sourceError}`:entry.issue==='missing'?`${entry.path} is missing (${entry.reason}; owner ${entry.owner}).`:entry.issue==='editor-only'?`${entry.path} is required but marked editor-only.`:entry.issue==='unknown-group'?`${entry.path} belongs to unknown content group ${entry.groupId}.`:`${entry.path} is required by the dependency closure but belongs to an excluded content group.`}))
}
export interface AssetBuildPolicy {include:readonly string[];exclude:readonly string[];stripUnusedAssets:boolean}
export interface AssetBuildSelection {assets:AssetRecord[];closure:ContentClosureEntry[];diagnostics:Array<{severity:'warning'|'error';message:string;uuid:string}>}
function buildGlob(path:string,pattern:string):boolean {
  const escaped=pattern.split('**').map(part=>part.split('*').map(part=>part.split('?').map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[^/]')).join('[^/]*')).join('.*')
  return new RegExp('^'+escaped+'$','i').test(path.replace(/\\/g,'/'))
}
export function selectBuildAssets(assets:AssetRecord[],groups:AssetContentGroup[],project:unknown,policy:AssetBuildPolicy):AssetBuildSelection {
  const allowed=(asset:AssetRecord)=>!policy.exclude.some(pattern=>buildGlob(asset.path,pattern))&&(!policy.include.length||policy.include.some(pattern=>buildGlob(asset.path,pattern)))
  const roots=projectAssetReferences(project,assets)
  if(!policy.stripUnusedAssets)for(const asset of assets)if(!asset.editorOnly&&allowed(asset)&&groups.find(group=>group.id===(asset.contentGroup||'main'))?.mode!=='excluded')roots.add(asset.uuid.toLowerCase())
  const closure=buildContentClosure(assets,groups,roots,project),diagnostics=validateContentClosure(closure),byId=new Map(assets.map(asset=>[asset.uuid.toLowerCase(),asset]))
  for(const entry of closure){const asset=byId.get(entry.uuid.toLowerCase());if(asset&&!allowed(asset))diagnostics.push({severity:'error',uuid:asset.uuid,message:`${asset.path} is required but excluded by build include/exclude rules (${entry.reason}).`})}
  const selected=closure.flatMap(entry=>{const asset=byId.get(entry.uuid.toLowerCase());return asset&&!entry.issue&&entry.mode!=='excluded'&&allowed(asset)?[asset]:[]})
  return {assets:selected,closure,diagnostics}
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
  if (!(from === 'Assets' || from.startsWith('Assets/')) || !(to === 'Assets' || to.startsWith('Assets/')) || [...from.split('/'), ...to.split('/')].some(part => part === '..' || part === '.') || to === from || to.startsWith(`${from}/`)) throw new Error('Folder move must remain inside Assets and cannot target its own descendant.')
  const snapshot = assets.map(asset => ({ asset, state: JSON.parse(JSON.stringify(asset)) as AssetRecord })), moving = assets.filter(asset => asset.path === from || asset.path.startsWith(`${from}/`))
  try {
    for (const asset of moving) asset.path = `${to}${asset.path.slice(from.length)}`
    if (faultAt === 'after-paths') throw new Error('Injected folder-move interruption after paths')
    repairAssetPathReferences(assets, from, to)
    if (faultAt === 'after-references') throw new Error('Injected folder-move interruption after references')
    const paths = new Set<string>(); for (const asset of assets) { const key = asset.path.toLowerCase(); if (paths.has(key)) throw new Error(`Folder move produced duplicate path ${asset.path}`); paths.add(key) }
    return moving.length
  } catch (error) { for (const item of snapshot) { for (const key of Object.keys(item.asset)) if (!(key in item.state)) delete (item.asset as unknown as Record<string,unknown>)[key]; Object.assign(item.asset, item.state) } throw error }
}

export interface AtlasInput { uuid: string; width: number; height: number; group: string }
export interface AtlasPlacement { uuid: string; page: number; x: number; y: number; width: number; height: number; rotated: boolean }
export interface AtlasPackingReport { pages: number; placements: AtlasPlacement[]; utilization: number; deterministicKey: string; diagnostics: string[] }
export function packAtlasDeterministic(inputs: AtlasInput[], options: { maxSize: number; padding: number; rotationPolicy: 'Never' | 'Allow' }): AtlasPackingReport {
  const size = Math.min(8192, Math.max(64, Math.trunc(Number.isFinite(options.maxSize) ? options.maxSize : 2048))), padding = Math.min(64, Math.max(0, Math.trunc(Number.isFinite(options.padding) ? options.padding : 0))), diagnostics: string[] = []
  const seen = new Set<string>()
  const sorted = [...inputs].filter(input => { if (!Number.isSafeInteger(input.width) || !Number.isSafeInteger(input.height) || input.width <= 0 || input.height <= 0) { diagnostics.push(`${input.uuid} has invalid dimensions.`); return false } if (seen.has(input.uuid)) throw new Error(`ATLAS_DUPLICATE_ID: ${input.uuid}`); seen.add(input.uuid); return true }).sort((a, b) => ordinal(a.group,b.group) || Math.max(b.width, b.height) - Math.max(a.width, a.height) || b.height - a.height || b.width - a.width || ordinal(a.uuid,b.uuid))
  const pages: Array<{ x: number; y: number; rowHeight: number }> = [{ x: 0, y: 0, rowHeight: 0 }], placements: AtlasPlacement[] = []
  let activeGroup: string | null = null
  for (const input of sorted) {
    let width = input.width, height = input.height, rotated = false
    if (options.rotationPolicy === 'Allow' && height > width && height <= size && width <= size) { [width, height] = [height, width]; rotated = true }
    if (width + padding * 2 > size || height + padding * 2 > size) { diagnostics.push(`${input.uuid} exceeds ${size}px atlas limit.`); continue }
    if (activeGroup !== null && activeGroup !== input.group) pages.push({ x:0, y:0, rowHeight:0 })
    activeGroup = input.group
    let page = pages.length - 1, cursor = pages[page]
    if (cursor.x + width + padding * 2 > size) { cursor.x = 0; cursor.y += cursor.rowHeight; cursor.rowHeight = 0 }
    if (cursor.y + height + padding * 2 > size) { pages.push({ x: 0, y: 0, rowHeight: 0 }); page++; cursor = pages[page] }
    placements.push({ uuid: input.uuid, page, x: cursor.x + padding, y: cursor.y + padding, width, height, rotated })
    cursor.x += width + padding * 2; cursor.rowHeight = Math.max(cursor.rowHeight, height + padding * 2)
  }
  const used = placements.reduce((sum, item) => sum + item.width * item.height, 0), pageCount = placements.length ? pages.length : 0, deterministicKey = sha256Bytes(new TextEncoder().encode(stableAssetSettings({ size, padding, groups:sorted.map(input=>[input.uuid,input.group]), placements })))
  return { pages: pageCount, placements, utilization: pageCount ? used / (pageCount * size * size) : 0, deterministicKey, diagnostics }
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
  set(key: string, url: string): void { this.values.set(key, { url, used: performance.now() }); if (this.values.size <= this.capacity) return; const victim = [...this.values].sort((a, b) => a[1].used - b[1].used || ordinal(a[0],b[0]))[0]; if (victim) this.values.delete(victim[0]) }
  clear(): void { this.values.clear() }
}

export function sourceFingerprint(asset: AssetRecord): string { return asset.pipeline?.sourceHash || sha256Bytes(assetSourceBytes(asset.source)) }
