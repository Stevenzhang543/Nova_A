/** 内容库视图：组织依赖、内容档案、缩略图和离线发现结果，并执行内容库校验。 */
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
  /** 正反遍历实际访问项数，用于记录大资源库的有界成本。 */
  visited: number
}

const MAX_GRAPH_NODES = 2_048
const thumbnailCache = new Map<string, string>()

/** 将 XML 特殊字符转为实体，安全写入生成的 SVG 缩略图文本。 */ function escaped(value: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }
  return value.replace(/[&<>"']/g, /* 当 entities[character] 为 null 或 undefined 时返回 character，否则保留左侧值。 */ character => entities[character] ?? character)
}
/* 先计算 value.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase()；仅当其为假值时求右侧 'A'，返回短路求值结果。 */ function shortType(value: string): string { return value.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'A' }
/* 调用 value.toLowerCase() 并返回调用结果。 */ function normalizedUuid(value: string): string { return value.toLowerCase() }

/** Builds a bounded, deterministic two-way dependency projection suitable for visual and accessible views. */
/** 从选定资源向正反依赖展开有界视图，标注缺失、循环和距离并仅保留可见节点间连线。 */ export function buildAssetDependencyView(selectedUuid: string, assets: readonly AssetRecord[], maximumNodes = MAX_GRAPH_NODES): AssetDependencyView {
  maximumNodes = Number.isFinite(maximumNodes) ? Math.max(1, Math.min(MAX_GRAPH_NODES, Math.floor(maximumNodes))) : MAX_GRAPH_NODES
  const graph = buildProductionAssetGraph([...assets]), byUuid = new Map(assets.map(/* 返回按声明顺序构造的数组 [normalizedUuid(asset.uuid), asset]。 */ asset => [normalizedUuid(asset.uuid), asset])), selected = normalizedUuid(selectedUuid)
  const forward = new Map<string, number>(), reverse = new Map<string, number>()
  const walk = /** 按广度遍历排序邻接项并记录最短发现深度，在输出达到节点限制后停止扩展。 */ (root: string, adjacency: Map<string, Set<string>>, output: Map<string, number>) => {
    const queue: Array<[string, number]> = [[root, 0]]
    let cursor = 0
    while (cursor < queue.length && output.size < maximumNodes) {
      const [owner, depth] = queue[cursor++]!
      for (const raw of [...(adjacency.get(owner) ?? [])].sort()) {
        if (output.size >= maximumNodes) break
        const uuid = normalizedUuid(raw), previous = output.get(uuid)
        if (previous !== undefined && previous <= depth + 1) continue
        output.set(uuid, depth + 1); if (byUuid.has(uuid)) queue.push([uuid, depth + 1])
      }
    }
  }
  walk(selected, graph.dependencies, forward); walk(selected, graph.reverseDependencies, reverse)
  const cycleMembers = new Set(graph.cycles.flat().map(normalizedUuid))
  const ids = new Set([selected, ...forward.keys(), ...reverse.keys()])
  const nodes: AssetDependencyNode[] = [...ids].slice(0, maximumNodes).map(/** 把资源身份转换为依赖视图节点，计算方向、深度和循环标记并保留缺失项。 */ uuid => {
    const asset = byUuid.get(uuid), forwardDepth = forward.get(uuid), reverseDepth = reverse.get(uuid)
    const direction: DependencyDirection = uuid === selected ? 'selected' : forwardDepth !== undefined && reverseDepth !== undefined ? 'both' : forwardDepth !== undefined ? (asset ? 'dependency' : 'missing') : 'dependent'
    return {
      id: uuid, uuid, name: asset?.name ?? `Missing ${uuid.slice(0, 12)}…`, path: asset?.path ?? `asset://${uuid}`,
      assetType: asset?.assetType ?? 'missing', direction, depth: uuid === selected ? 0 : Math.min(forwardDepth ?? Number.MAX_SAFE_INTEGER, reverseDepth ?? Number.MAX_SAFE_INTEGER, 0x7fff),
      cyclic: cycleMembers.has(uuid), reproducible: Boolean(asset?.pipeline?.reproducible ?? asset)
    }
  }).sort(/** 按距离、依赖方向、路径及身份稳定排序资源图节点。 */ (a, b) => a.depth - b.depth || a.direction.localeCompare(b.direction) || a.path.localeCompare(b.path) || a.uuid.localeCompare(b.uuid))
  const visible = new Set(nodes.map(/* 返回 node.uuid 的当前值。 */ node => node.uuid)), edgeKeys = new Set<string>(), edges: AssetDependencyEdge[] = []
  for (const [ownerRaw, dependencies] of [...graph.dependencies].sort(/* 调用 a.localeCompare(b) 并返回调用结果。 */ ([a], [b]) => a.localeCompare(b))) {
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
    missing: nodes.filter(/* 比较 node.direction 与 'missing'，返回严格相等的判断结果。 */ node => node.direction === 'missing').length,
    cycles: graph.cycles.filter(/* 调用 cycle.some(uuid => visible.has(normalizedUuid(uuid))) 并返回调用结果。 */ cycle => cycle.some(/* 调用 visible.has(normalizedUuid(uuid)) 并返回调用结果。 */ uuid => visible.has(normalizedUuid(uuid)))).map(/* 调用 cycle.map(normalizedUuid) 并返回调用结果。 */ cycle => cycle.map(normalizedUuid)),
    truncated: ids.size > nodes.length || forward.size >= maximumNodes || reverse.size >= maximumNodes,
    visited: forward.size + reverse.size
  }
}

export interface ContentFeature { id: string; label: string; value: string; state: 'ready' | 'attention' | 'inactive' }

/** Converts scattered importer settings into one truthful, user-facing production profile. */
/** 根据资源类型、导入设置和流水线状态生成内容能力与待处理状态摘要。 */ export function assetContentProfile(asset: AssetRecord): ContentFeature[] {
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
/** 图像资源直接返回可显示源，其他类型按身份和内容生成转义 SVG 卡片并保留最多五百一十二项缓存。 */ export function contentThumbnailDataUrl(asset: AssetRecord): string {
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
/** 筛选离线可用且匹配查询的内容，优先受信任项，再按类别、名称和身份稳定排序。 */ export function discoverOfflineContent(items: readonly OfflineContentItem[], query = ''): OfflineContentItem[] {
  const needle = query.trim().toLocaleLowerCase()
  return items.filter(/** 只接受离线可用内容，并在名称、身份、类别、来源及标签中匹配不区分大小写的查询。 */ item => item.offline && (!needle || `${item.name} ${item.id} ${item.kind} ${item.provenance} ${item.tags.join(' ')}`.toLocaleLowerCase().includes(needle)))
    .sort(/** 将可信内容置前，其后按类别、名称和身份稳定排序。 */ (a, b) => Number(b.trusted) - Number(a.trusted) || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)).slice(0, 10_000)
}

export interface ContentLibraryAudit {
  scanned: number; total: number; truncated: boolean; unicodePaths: number; missingReferences: number; cycles: number; duplicateSources: number; nonReproducible: number; deterministicHash: string; status: 'passed' | 'attention'
}
/** 对按身份截取的资源集合生成依赖和可复现性摘要，明确记录截断并计算确定性报告摘要。 */ export function auditContentLibrary(assets: readonly AssetRecord[], maximum = 50_000): ContentLibraryAudit {
  const selected = [...assets].sort(/* 调用 a.uuid.localeCompare(b.uuid) 并返回调用结果。 */ (a, b) => a.uuid.localeCompare(b.uuid)).slice(0, maximum), graph = buildProductionAssetGraph(selected)
  const summary = selected.map(/** 构造并返回记录 { uuid: asset.uuid, path: asset.path, type: asset.assetType, source: sourceFingerprint(asset), settings: assetSettingsHash(asset.settings) }，字段按当前实参及捕获状态求值。 */ asset => ({ uuid: asset.uuid, path: asset.path, type: asset.assetType, source: sourceFingerprint(asset), settings: assetSettingsHash(asset.settings) }))
  const nonReproducible = selected.filter(/* 先计算 asset.pipeline；仅当其为真值时求右侧 !asset.pipeline.reproducible，返回短路求值结果。 */ asset => asset.pipeline && !asset.pipeline.reproducible).length
  const report = { scanned: selected.length, total: assets.length, truncated: assets.length > selected.length, unicodePaths: selected.filter(/* 调用 /[^\u0000-\u007f]/.test(asset.path) 并返回调用结果。 */ asset => /[^\u0000-\u007f]/.test(asset.path)).length, missingReferences: graph.missingReferences.length, cycles: graph.cycles.length, duplicateSources: graph.duplicateSources.length, nonReproducible, deterministicHash: assetSettingsHash(summary) }
  return { ...report, status: report.missingReferences || report.cycles || nonReproducible ? 'attention' : 'passed' }
}
