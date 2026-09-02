import type { AssetRecord } from './types'
import { assetSettingsHash, buildProductionAssetGraph, sourceFingerprint } from './assetProduction'

export type DependencyDirection = 'selected' | 'dependency' | 'dependent' | 'both' | 'missing'
export interface AssetDependencyNode {
  id: string
  uuid: string
  name: string
  path: string
  assetType: string
  direction: DependencyDirection
  depth: number
  cyclic: boolean
  reproducible: boolean
}
export interface AssetDependencyEdge { from: string; to: string; missing: boolean; cyclic: boolean }
export interface AssetDependencyView {
  selected: string
  nodes: AssetDependencyNode[]
  edges: AssetDependencyEdge[]
  directDependencies: number
  transitiveDependencies: number
  directDependents: number
  transitiveDependents: number
  missing: number
  cycles: string[][]
  truncated: boolean
}

const MAX_GRAPH_NODES = 2_048
const thumbnailCache = new Map<string, string>()

function escaped(value: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }
  return value.replace(/[&<>"']/g, character => entities[character] ?? character)
}
function shortType(value: string): string { return value.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'A' }
function normalizedUuid(value: string): string { return value.toLowerCase() }

/** Builds a bounded, deterministic two-way dependency projection suitable for visual and accessible views. */
export function buildAssetDependencyView(selectedUuid: string, assets: readonly AssetRecord[], maximumNodes = MAX_GRAPH_NODES): AssetDependencyView {
  const graph = buildProductionAssetGraph([...assets]), byUuid = new Map(assets.map(asset => [normalizedUuid(asset.uuid), asset])), selected = normalizedUuid(selectedUuid)
  const forward = new Map<string, number>(), reverse = new Map<string, number>()
  const walk = (root: string, adjacency: Map<string, Set<string>>, output: Map<string, number>) => {
    const queue: Array<[string, number]> = [[root, 0]]
    while (queue.length && output.size < Math.max(1, maximumNodes)) {
      const [owner, depth] = queue.shift()!
      for (const raw of [...(adjacency.get(owner) ?? [])].sort()) {
        const uuid = normalizedUuid(raw), previous = output.get(uuid)
        if (previous !== undefined && previous <= depth + 1) continue
        output.set(uuid, depth + 1); if (byUuid.has(uuid)) queue.push([uuid, depth + 1])
      }
    }
  }
  walk(selected, graph.dependencies, forward); walk(selected, graph.reverseDependencies, reverse)
  const cycleMembers = new Set(graph.cycles.flat().map(normalizedUuid))
  const ids = new Set([selected, ...forward.keys(), ...reverse.keys()])
  const nodes: AssetDependencyNode[] = [...ids].slice(0, maximumNodes).map(uuid => {
    const asset = byUuid.get(uuid), forwardDepth = forward.get(uuid), reverseDepth = reverse.get(uuid)
    const direction: DependencyDirection = uuid === selected ? 'selected' : forwardDepth !== undefined && reverseDepth !== undefined ? 'both' : forwardDepth !== undefined ? (asset ? 'dependency' : 'missing') : 'dependent'
    return {
      id: uuid, uuid, name: asset?.name ?? `Missing ${uuid.slice(0, 12)}…`, path: asset?.path ?? `asset://${uuid}`,
      assetType: asset?.assetType ?? 'missing', direction, depth: uuid === selected ? 0 : Math.min(forwardDepth ?? Number.MAX_SAFE_INTEGER, reverseDepth ?? Number.MAX_SAFE_INTEGER, 0x7fff),
      cyclic: cycleMembers.has(uuid), reproducible: Boolean(asset?.pipeline?.reproducible ?? asset)
    }
  }).sort((a, b) => a.depth - b.depth || a.direction.localeCompare(b.direction) || a.path.localeCompare(b.path) || a.uuid.localeCompare(b.uuid))
  const visible = new Set(nodes.map(node => node.uuid)), edgeKeys = new Set<string>(), edges: AssetDependencyEdge[] = []
  for (const [ownerRaw, dependencies] of [...graph.dependencies].sort(([a], [b]) => a.localeCompare(b))) {
    const owner = normalizedUuid(ownerRaw); if (!visible.has(owner)) continue
    for (const dependencyRaw of [...dependencies].sort()) {
      const dependency = normalizedUuid(dependencyRaw); if (!visible.has(dependency)) continue
      const key = `${owner}>${dependency}`; if (edgeKeys.has(key)) continue; edgeKeys.add(key)
      edges.push({ from: owner, to: dependency, missing: !byUuid.has(dependency), cyclic: cycleMembers.has(owner) && cycleMembers.has(dependency) })
    }
  }
  return {
    selected, nodes, edges, directDependencies: graph.dependencies.get(selected)?.size ?? 0, transitiveDependencies: forward.size,
    directDependents: graph.reverseDependencies.get(selected)?.size ?? 0, transitiveDependents: reverse.size,
    missing: nodes.filter(node => node.direction === 'missing').length,
    cycles: graph.cycles.filter(cycle => cycle.some(uuid => visible.has(normalizedUuid(uuid)))).map(cycle => cycle.map(normalizedUuid)),
    truncated: ids.size > nodes.length || forward.size >= maximumNodes || reverse.size >= maximumNodes
  }
}

export interface ContentFeature { id: string; label: string; value: string; state: 'ready' | 'attention' | 'inactive' }

/** Converts scattered importer settings into one truthful, user-facing production profile. */
export function assetContentProfile(asset: AssetRecord): ContentFeature[] {
  const settings = asset.settings, output: ContentFeature[] = []
  output.push({ id: 'provenance', label: 'Importer provenance', value: asset.pipeline ? `${asset.pipeline.importerId}@${asset.pipeline.importerVersion}` : 'Not recorded', state: asset.pipeline?.reproducible ? 'ready' : 'attention' })
  output.push({ id: 'cache', label: 'Deterministic cache', value: asset.pipeline?.cacheHit ? 'Verified cache hit' : asset.pipeline ? asset.pipeline.invalidationReason : 'Not imported', state: asset.pipeline ? 'ready' : 'inactive' })
  if (asset.assetType === 'image' || asset.assetType === 'atlas') {
    const sliceCount = asset.interchange?.slices.length ?? settings.extractedAnimationFrames.length
    const borders = settings.borders, borderTotal = borders.left + borders.top + borders.right + borders.bottom
    output.push({ id: 'slices', label: 'Sprite animation slices', value: `${sliceCount} stable frame${sliceCount === 1 ? '' : 's'}`, state: sliceCount ? 'ready' : 'inactive' })
    output.push({ id: 'nine-patch', label: 'Nine-patch borders', value: borderTotal ? `${borders.left}/${borders.top}/${borders.right}/${borders.bottom}px` : 'Not configured', state: borderTotal ? 'ready' : 'inactive' })
    output.push({ id: 'vector', label: 'Vector path', value: asset.mimeType === 'image/svg+xml' ? `${settings.svgSettings.rasterization} · ${settings.svgSettings.allowExternalResources ? 'external resources reviewed' : 'self-contained'}` : 'Raster source', state: asset.mimeType === 'image/svg+xml' ? 'ready' : 'inactive' })
  }
  if (asset.assetType === 'font') {
    output.push({ id: 'font-distance', label: 'Font distance field', value: settings.fontSettings.distanceField === 'None' ? 'Scalable/bitmap source' : `${settings.fontSettings.distanceField} · range ${settings.fontSettings.distanceRange}`, state: settings.fontSettings.distanceField === 'None' ? 'inactive' : 'ready' })
    output.push({ id: 'font-languages', label: 'Font language coverage', value: settings.fontSettings.declaredLanguages.join(', ') || 'No declared language coverage', state: settings.fontSettings.declaredLanguages.length ? 'ready' : 'attention' })
  }
  if (asset.assetType === 'audio') {
    const audio = settings.audioSettings, loop = audio.activeLoopRegion || audio.loopEnd > audio.loopStart
    output.push({ id: 'audio', label: 'Audio delivery', value: `${audio.profile} · ${audio.codec} · ${audio.streaming ? 'streaming' : 'preloaded'}`, state: 'ready' })
    output.push({ id: 'audio-loop', label: 'Loop regions', value: loop ? `${audio.loopRegions.length || 1} configured` : 'No loop', state: loop ? 'ready' : 'inactive' })
  }
  if (asset.assetType === 'localization') output.push({ id: 'localization', label: 'Localization table', value: `${settings.localizationSettings.locale} → ${settings.localizationSettings.fallbackLocale}`, state: settings.localizationSettings.locale ? 'ready' : 'attention' })
  if (asset.assetType === 'resource') output.push({ id: 'resource', label: 'Reusable library Resource', value: 'Shared base, named variants, and local overrides', state: 'ready' })
  output.push({ id: 'content-group', label: 'Export content group', value: asset.editorOnly ? 'Editor-only / stripped' : asset.contentGroup || 'main', state: asset.editorOnly ? 'inactive' : 'ready' })
  return output
}

/** Deterministic thumbnails keep non-image content identifiable without decoding or executing it. */
export function contentThumbnailDataUrl(asset: AssetRecord): string {
  if (asset.assetType === 'image' && /^(?:data:|blob:|https?:)/i.test(asset.source)) return asset.source
  const key = `${asset.uuid}:${asset.assetType}:${asset.name}:${sourceFingerprint(asset)}`
  const cached = thumbnailCache.get(key); if (cached) return cached
  const digest = assetSettingsHash(key), hue = Number.parseInt(digest.slice(0, 6), 16) % 360, label = escaped(shortType(asset.assetType)), name = escaped(asset.name.slice(0, 18))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 112"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="hsl(${hue} 64% 42%)"/><stop offset="1" stop-color="hsl(${(hue + 38) % 360} 58% 24%)"/></linearGradient></defs><rect width="160" height="112" rx="18" fill="url(#g)"/><circle cx="128" cy="18" r="34" fill="white" opacity=".08"/><text x="16" y="55" fill="white" font-family="system-ui,sans-serif" font-size="28" font-weight="750">${label}</text><text x="16" y="84" fill="white" opacity=".78" font-family="system-ui,sans-serif" font-size="11">${name}</text></svg>`
  const result = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  thumbnailCache.set(key, result); if (thumbnailCache.size > 512) thumbnailCache.delete(thumbnailCache.keys().next().value!)
  return result
}

export interface OfflineContentItem { id: string; name: string; kind: 'template' | 'package'; provenance: string; trusted: boolean; offline: boolean; tags: string[] }
export function discoverOfflineContent(items: readonly OfflineContentItem[], query = ''): OfflineContentItem[] {
  const needle = query.trim().toLocaleLowerCase()
  return items.filter(item => item.offline && (!needle || `${item.name} ${item.id} ${item.kind} ${item.provenance} ${item.tags.join(' ')}`.toLocaleLowerCase().includes(needle)))
    .sort((a, b) => Number(b.trusted) - Number(a.trusted) || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)).slice(0, 10_000)
}

export interface ContentLibraryAudit {
  scanned: number; total: number; truncated: boolean; unicodePaths: number; missingReferences: number; cycles: number; duplicateSources: number; nonReproducible: number; deterministicHash: string; status: 'passed' | 'attention'
}
export function auditContentLibrary(assets: readonly AssetRecord[], maximum = 50_000): ContentLibraryAudit {
  const selected = [...assets].sort((a, b) => a.uuid.localeCompare(b.uuid)).slice(0, maximum), graph = buildProductionAssetGraph(selected)
  const summary = selected.map(asset => ({ uuid: asset.uuid, path: asset.path, type: asset.assetType, source: sourceFingerprint(asset), settings: assetSettingsHash(asset.settings) }))
  const nonReproducible = selected.filter(asset => asset.pipeline && !asset.pipeline.reproducible).length
  const report = { scanned: selected.length, total: assets.length, truncated: assets.length > selected.length, unicodePaths: selected.filter(asset => /[^\u0000-\u007f]/.test(asset.path)).length, missingReferences: graph.missingReferences.length, cycles: graph.cycles.length, duplicateSources: graph.duplicateSources.length, nonReproducible, deterministicHash: assetSettingsHash(summary) }
  return { ...report, status: report.missingReferences || report.cycles || nonReproducible ? 'attention' : 'passed' }
}
