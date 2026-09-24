/** 资源生产工具：计算构建依赖闭包、校验导入来源，执行批量设置、图集安排及透明区域分析。 */
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

const ordinal = /* 根据 first < second 的真假，分别返回 -1 或 first > second ? 1 : 0。 */ (first:string,second:string) => first < second ? -1 : first > second ? 1 : 0
/* 调用 [...new Set(values)].sort((a, b) => ordinal(a,b)) 并返回调用结果。 */ function sortedUnique(values: Iterable<string>): string[] { return [...new Set(values)].sort(/* 调用 ordinal(a,b) 并返回调用结果。 */ (a, b) => ordinal(a,b)) }

/** 递归按稳定键顺序序列化设置，保留数组顺序以生成可复现摘要输入。 */ export function stableAssetSettings(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableAssetSettings).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(/* 调用 ordinal(a,b) 并返回调用结果。 */ ([a], [b]) => ordinal(a,b)).map(/** 按模板 `${JSON.stringify(key)}:${stableAssetSettings(item)}` 生成并返回字符串。 */ ([key, item]) => `${JSON.stringify(key)}:${stableAssetSettings(item)}`).join(',')}}`
  return JSON.stringify(value)
}

/* 调用 sha256Bytes(new TextEncoder().encode(stableAssetSettings(settings))) 并返回调用结果。 */ export function assetSettingsHash(settings: unknown): string {
  return sha256Bytes(new TextEncoder().encode(stableAssetSettings(settings)))
}

/** 在基本依赖图上迭代检测有界循环列表，并按源摘要汇总重复内容。 */ export function buildProductionAssetGraph(assets: AssetRecord[], project?: unknown): ProductionAssetGraph {
  const base = buildAssetDependencyGraph(assets, project), cycles: string[][] = [], state = new Map<string, 0 | 1 | 2>()
  for(const root of [...base.dependencies.keys()].sort()){
    if(state.get(root)===2)continue
    const path:string[]=[],positions=new Map<string,number>(),stack:Array<{uuid:string;children:string[];index:number}>=[]
    const enter=/** 标记依赖节点处于当前访问链，记录路径位置并压入排序后的子节点栈。 */ (uuid:string)=>{state.set(uuid,1);positions.set(uuid,path.length);path.push(uuid);stack.push({uuid,children:[...(base.dependencies.get(uuid)??[])].filter(/* 调用 base.dependencies.has(id) 并返回调用结果。 */ id=>base.dependencies.has(id)).sort(),index:0})}
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
  const duplicateSources = [...hashes].filter(/* 比较 uuids.length 与 1，返回大于的判断结果。 */ ([, uuids]) => uuids.length > 1).map(/** 构造并返回记录 { sourceHash, assets: sortedUnique(uuids) }，字段按当前实参及捕获状态求值。 */ ([sourceHash, uuids]) => ({ sourceHash, assets: sortedUnique(uuids) })).sort(/* 调用 ordinal(a.sourceHash,b.sourceHash) 并返回调用结果。 */ (a, b) => ordinal(a.sourceHash,b.sourceHash))
  return { ...base, cycles: cycles.sort(/* 调用 ordinal(a.join('/'),b.join('/')) 并返回调用结果。 */ (a, b) => ordinal(a.join('/'),b.join('/'))), duplicateSources }
}

export interface ContentClosureEntry { uuid: string; path: string; groupId: string; mode: AssetContentGroup['mode']; owner: string; reason: string; issue?: 'missing' | 'editor-only' | 'unknown-group' | 'invalid-source'; sourceError?:string }
/** 从构建根引用遍历全部依赖，记录来源、交付分组和缺失、编辑器专用或无效源码问题。 */ export function buildContentClosure(assets: AssetRecord[], groups: AssetContentGroup[], roots: Iterable<string>, project?: unknown): ContentClosureEntry[] {
  const graph = buildAssetDependencyGraph(assets, project), byId = new Map(assets.map(/* 返回按声明顺序构造的数组 [asset.uuid.toLowerCase(), asset]。 */ asset => [asset.uuid.toLowerCase(), asset])), groupMap = new Map(groups.map(/* 返回按声明顺序构造的数组 [group.id, group]。 */ group => [group.id, group]))
  const sourceErrors=new Map(graph.diagnostics.map(/* 返回按声明顺序构造的数组 [issue.owner,issue.message]。 */ issue=>[issue.owner,issue.message]))
  const queue = sortedUnique(roots).map(/** 将完整资源根引用规范为小写 UUID，其他引用保持可诊断文本。 */ reference => {const uuid=reference.replace(/^asset:\/\//i,'');return {uuid:/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(uuid)?uuid.toLowerCase():uuid,owner:'project'}}), seen = new Set<string>(), output: ContentClosureEntry[] = []
  for (let index=0;index<queue.length;index++) {
    const {uuid,owner}=queue[index]; if(seen.has(uuid))continue;seen.add(uuid)
    const asset=byId.get(uuid)
    if(!asset){output.push({uuid,path:uuid,groupId:'',mode:'excluded',owner,reason:'Required asset is missing',issue:'missing'});continue}
    const sourceError=sourceErrors.get(asset.uuid)
    const groupId=asset.contentGroup||'main',group=groupMap.get(groupId),issue=sourceError?'invalid-source':asset.editorOnly?'editor-only':!group&&groupId!=='main'?'unknown-group':undefined
    output.push({uuid:asset.uuid,path:asset.path,groupId,mode:asset.editorOnly?'excluded':group?.mode??'embedded',owner,reason:owner==='project'?'Build root':`Required by ${byId.get(owner)?.path??owner}`,issue,sourceError})
    for(const dependency of sortedUnique(graph.dependencies.get(uuid)??[]))queue.push({uuid:dependency,owner:uuid})
  }
  return output.sort(/* 先计算 ordinal(a.path,b.path)；仅当其为假值时求右侧 ordinal(a.uuid,b.uuid)，返回短路求值结果。 */ (a,b)=>ordinal(a.path,b.path)||ordinal(a.uuid,b.uuid))
}
/** 将依赖闭包中排除或错误项转换为明确的构建错误。 */ export function validateContentClosure(entries: ContentClosureEntry[]): Array<{severity:'warning'|'error';message:string;uuid:string}> {
  return entries.filter(/* 先计算 entry.issue；仅当其为假值时求右侧 entry.mode==='excluded'，返回短路求值结果。 */ entry=>entry.issue||entry.mode==='excluded').map(/** 按闭包错误类型生成包含资源、拥有者或分组的构建失败说明。 */ entry=>({severity:'error',uuid:entry.uuid,message:entry.issue==='invalid-source'?`${entry.path} dependency source is invalid: ${entry.sourceError}`:entry.issue==='missing'?`${entry.path} is missing (${entry.reason}; owner ${entry.owner}).`:entry.issue==='editor-only'?`${entry.path} is required but marked editor-only.`:entry.issue==='unknown-group'?`${entry.path} belongs to unknown content group ${entry.groupId}.`:`${entry.path} is required by the dependency closure but belongs to an excluded content group.`}))
}
export interface AssetBuildPolicy {include:readonly string[];exclude:readonly string[];stripUnusedAssets:boolean}
export interface AssetBuildSelection {assets:AssetRecord[];closure:ContentClosureEntry[];diagnostics:Array<{severity:'warning'|'error';message:string;uuid:string}>}
/** 将双星、单星和问号路径规则转为转义正则，统一分隔符后忽略大小写匹配。 */ function buildGlob(path:string,pattern:string):boolean {
  const escaped=pattern.split('**').map(/** 把单个双星分段内的星号和问号转为不跨目录的正则模式。 */ part=>part.split('*').map(/* 调用 part.split('?').map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[^/]') 并返回调用结果。 */ part=>part.split('?').map(/* 调用 part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') 并返回调用结果。 */ part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[^/]')).join('[^/]*')).join('.*')
  return new RegExp('^'+escaped+'$','i').test(path.replace(/\\/g,'/'))
}
/** 结合项目入口、裁剪及包含排除规则计算构建闭包，拒绝必需但被排除的资源。 */ export function selectBuildAssets(assets:AssetRecord[],groups:AssetContentGroup[],project:unknown,policy:AssetBuildPolicy):AssetBuildSelection {
  const allowed=/** 要求资源不匹配排除规则，且在存在包含规则时至少匹配一项。 */ (asset:AssetRecord)=>!policy.exclude.some(/* 调用 buildGlob(asset.path,pattern) 并返回调用结果。 */ pattern=>buildGlob(asset.path,pattern))&&(!policy.include.length||policy.include.some(/* 调用 buildGlob(asset.path,pattern) 并返回调用结果。 */ pattern=>buildGlob(asset.path,pattern)))
  const roots=projectAssetReferences(project,assets)
  if(!policy.stripUnusedAssets)for(const asset of assets)if(!asset.editorOnly&&allowed(asset)&&groups.find(/* 比较 group.id 与 (asset.contentGroup||'main')，返回严格相等的判断结果。 */ group=>group.id===(asset.contentGroup||'main'))?.mode!=='excluded')roots.add(asset.uuid.toLowerCase())
  const closure=buildContentClosure(assets,groups,roots,project),diagnostics=validateContentClosure(closure),byId=new Map(assets.map(/* 返回按声明顺序构造的数组 [asset.uuid.toLowerCase(),asset]。 */ asset=>[asset.uuid.toLowerCase(),asset]))
  for(const entry of closure){const asset=byId.get(entry.uuid.toLowerCase());if(asset&&!allowed(asset))diagnostics.push({severity:'error',uuid:asset.uuid,message:`${asset.path} is required but excluded by build include/exclude rules (${entry.reason}).`})}
  const selected=closure.flatMap(/** 仅选择存在、无闭包错误、未排除且满足构建规则的资源。 */ entry=>{const asset=byId.get(entry.uuid.toLowerCase());return asset&&!entry.issue&&entry.mode!=='excluded'&&allowed(asset)?[asset]:[]})
  return {assets:selected,closure,diagnostics}
}

export interface ImportComparison { field: string; before: string; after: string; changed: boolean }
/** 逐字段比较导入身份、平台、设置与源和产物摘要，返回前后值及变化标记。 */ export function compareImportMetadata(before: AssetPipelineMetadata | null | undefined, after: AssetPipelineMetadata | null | undefined): ImportComparison[] {
  const fields: Array<keyof AssetPipelineMetadata> = ['importerId', 'importerVersion', 'presetId', 'platform', 'sourceHash', 'settingsHash', 'artifactSettingsHash', 'artifactHash', 'cacheKey']
  return fields.map(/** 构造并返回记录 { field, before: String(before?.[field] ?? ''), after: String(after?.[field] ?? ''), changed: String(before?.[field] ?? '') !== String(after?.[field] ?? '') }，字段按当前实参及捕获状态求值。 */ field => ({ field, before: String(before?.[field] ?? ''), after: String(after?.[field] ?? ''), changed: String(before?.[field] ?? '') !== String(after?.[field] ?? '') }))
}

/** 检查导入器身份、源产物摘要和可复现声明，合并弃用设置及既有流水线诊断。 */ export function provenanceDiagnostics(asset: AssetRecord): AssetPipelineMetadata['diagnostics'] {
  const pipeline = asset.pipeline, output: AssetPipelineMetadata['diagnostics'] = []
  if (!pipeline) return [{ severity: 'error', code: 'PROVENANCE_MISSING', message: 'Reimport this asset to create reproducible importer provenance.' }]
  if (!pipeline.importerId || !pipeline.importerVersion) output.push({ severity: 'error', code: 'IMPORTER_IDENTITY', message: 'Importer identity is incomplete; reimport with a versioned preset.' })
  if (!/^[0-9a-f]{64}$/i.test(pipeline.sourceHash)) output.push({ severity: 'error', code: 'SOURCE_HASH', message: 'Source SHA-256 is missing or malformed.' })
  if (!/^[0-9a-f]{64}$/i.test(pipeline.artifactHash)) output.push({ severity: 'error', code: 'ARTIFACT_HASH', message: 'Artifact SHA-256 is missing or malformed.' })
  if (pipeline.deprecatedSettings.length) output.push({ severity: 'warning', code: 'DEPRECATED_SETTINGS', message: `Replace non-reproducible settings: ${pipeline.deprecatedSettings.join(', ')}.` })
  if (!pipeline.reproducible) output.push({ severity: 'error', code: 'NOT_REPRODUCIBLE', message: 'Importer reported non-reproducible output; inspect diagnostics and reimport.' })
  return [...output, ...pipeline.diagnostics]
}

/** 存在已验证源时恢复它并清除导入错误，标记本次回退原因。 */ export function revertToVerifiedArtifact(asset: AssetRecord): boolean {
  if (!asset.pipeline?.lastValidSource) return false
  asset.source = asset.pipeline.lastValidSource; asset.pipeline.status = 'ready'; asset.pipeline.error = ''; asset.pipeline.invalidationReason = 'Reverted to last verified artifact'; return true
}

/** 批量更新内容分组、编辑器专用标记和去重有界标签及集合归属。 */ export function applyBulkAssetSettings(assets: AssetRecord[], patch: Partial<Pick<AssetRecord, 'contentGroup' | 'editorOnly' | 'tags' | 'collectionIds'>>): number {
  for (const asset of assets) {
    if (patch.contentGroup !== undefined) asset.contentGroup = patch.contentGroup.slice(0, 80)
    if (patch.editorOnly !== undefined) asset.editorOnly = patch.editorOnly
    if (patch.tags) asset.tags = sortedUnique(patch.tags.map(/* 调用 tag.trim() 并返回调用结果。 */ tag => tag.trim()).filter(Boolean)).slice(0, 64)
    if (patch.collectionIds) asset.collectionIds = sortedUnique(patch.collectionIds).slice(0, 64)
  }
  return assets.length
}

/** 仅允许 Assets 内非后代目录移动，更新资源路径和引用并检查冲突，失败时恢复所有记录快照。 */ export function moveAssetFolderTransactional(assets: AssetRecord[], fromFolder: string, toFolder: string, faultAt?: 'after-paths' | 'after-references'): number {
  const from = fromFolder.replace(/\\/g, '/').replace(/\/+$/, ''), to = toFolder.replace(/\\/g, '/').replace(/\/+$/, '')
  if (!(from === 'Assets' || from.startsWith('Assets/')) || !(to === 'Assets' || to.startsWith('Assets/')) || [...from.split('/'), ...to.split('/')].some(/* 先计算 part === '..'；仅当其为假值时求右侧 part === '.'，返回短路求值结果。 */ part => part === '..' || part === '.') || to === from || to.startsWith(`${from}/`)) throw new Error('Folder move must remain inside Assets and cannot target its own descendant.')
  const snapshot = assets.map(/** 构造并返回记录 { asset, state: JSON.parse(JSON.stringify(asset)) as AssetRecord }，字段按当前实参及捕获状态求值。 */ asset => ({ asset, state: JSON.parse(JSON.stringify(asset)) as AssetRecord })), moving = assets.filter(/* 先计算 asset.path === from；仅当其为假值时求右侧 asset.path.startsWith(`${from}/`)，返回短路求值结果。 */ asset => asset.path === from || asset.path.startsWith(`${from}/`))
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
/** 规范化页尺寸和留白，按分组稳定排序并可选旋转行式装箱，返回布局、利用率、诊断和确定性摘要。 */ export function packAtlasDeterministic(inputs: AtlasInput[], options: { maxSize: number; padding: number; rotationPolicy: 'Never' | 'Allow' }): AtlasPackingReport {
  const size = Math.min(8192, Math.max(64, Math.trunc(Number.isFinite(options.maxSize) ? options.maxSize : 2048))), padding = Math.min(64, Math.max(0, Math.trunc(Number.isFinite(options.padding) ? options.padding : 0))), diagnostics: string[] = []
  const seen = new Set<string>()
  const sorted = [...inputs].filter(/** 筛除非法尺寸图集项并记录诊断，重复资源身份则直接拒绝。 */ input => { if (!Number.isSafeInteger(input.width) || !Number.isSafeInteger(input.height) || input.width <= 0 || input.height <= 0) { diagnostics.push(`${input.uuid} has invalid dimensions.`); return false } if (seen.has(input.uuid)) throw new Error(`ATLAS_DUPLICATE_ID: ${input.uuid}`); seen.add(input.uuid); return true }).sort(/** 按分组、最大边、宽高及身份稳定排序图集输入。 */ (a, b) => ordinal(a.group,b.group) || Math.max(b.width, b.height) - Math.max(a.width, a.height) || b.height - a.height || b.width - a.width || ordinal(a.uuid,b.uuid))
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
  const used = placements.reduce(/* 计算表达式 sum + item.width * item.height 并返回结果，沿用操作数的原有类型规则。 */ (sum, item) => sum + item.width * item.height, 0), pageCount = placements.length ? pages.length : 0, deterministicKey = sha256Bytes(new TextEncoder().encode(stableAssetSettings({ size, padding, groups:sorted.map(/* 返回按声明顺序构造的数组 [input.uuid,input.group]。 */ input=>[input.uuid,input.group]), placements })))
  return { pages: pageCount, placements, utilization: pageCount ? used / (pageCount * size * size) : 0, deterministicKey, diagnostics }
}

/** 按限制后的行列数、边距和间隔生成均匀网格帧矩形。 */ export function gridSliceRegions(width: number, height: number, columns: number, rows: number, margin = 0, spacing = 0): SpriteRegion[] {
  const safeColumns = Math.min(4096, Math.max(1, Math.trunc(columns))), safeRows = Math.min(4096, Math.max(1, Math.trunc(rows)))
  const cellWidth = Math.max(1, Math.floor((width - margin * 2 - spacing * (safeColumns - 1)) / safeColumns)), cellHeight = Math.max(1, Math.floor((height - margin * 2 - spacing * (safeRows - 1)) / safeRows)), output: SpriteRegion[] = []
  for (let row = 0; row < safeRows; row++) for (let column = 0; column < safeColumns; column++) output.push({ x: margin + column * (cellWidth + spacing), y: margin + row * (cellHeight + spacing), width: cellWidth, height: cellHeight })
  return output
}

/** 用四邻接遍历 alpha 阈值以上连通区域，记录有限数量包围盒并按位置排序。 */ export function detectOpaqueRegions(width: number, height: number, alpha: Uint8Array, threshold = 1, maximumRegions = 4096): SpriteRegion[] {
  if (width < 1 || height < 1 || alpha.length < width * height) return []
  const visited = new Uint8Array(width * height), regions: SpriteRegion[] = [], neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const
  for (let start = 0; start < width * height; start++) {
    if (visited[start] || alpha[start] < threshold) continue
    const queue = [start]; visited[start] = 1; let left = start % width, right = left, top = Math.floor(start / width), bottom = top
    for (let cursor = 0; cursor < queue.length; cursor++) { const index = queue[cursor], x = index % width, y = Math.floor(index / width); left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); for (const [dx, dy] of neighbors) { const nx = x + dx, ny = y + dy, next = ny * width + nx; if (nx >= 0 && ny >= 0 && nx < width && ny < height && !visited[next] && alpha[next] >= threshold) { visited[next] = 1; queue.push(next) } } }
    if (regions.length < maximumRegions) regions.push({ x: left, y: top, width: right - left + 1, height: bottom - top + 1 })
  }
  return regions.sort(/* 先计算 a.y - b.y || a.x - b.x || a.width - b.width；仅当其为假值时求右侧 a.height - b.height，返回短路求值结果。 */ (a, b) => a.y - b.y || a.x - b.x || a.width - b.width || a.height - b.height)
}

/** 将矩形区域转换为四角多边形轮廓。 */ export function polygonOutlineForRegion(region: SpriteRegion): Array<{ x: number; y: number }> { return [{ x: region.x, y: region.y }, { x: region.x + region.width, y: region.y }, { x: region.x + region.width, y: region.y + region.height }, { x: region.x, y: region.y + region.height }] }

const LANGUAGE_SAMPLES: Record<string, string> = { en: 'Nova game engine', de: 'Grüße für Nova', 'zh-CN': '诺瓦游戏引擎', ar: 'محرك نوفا', he: 'מנוע נובה', combining: 'Å é ñ', emoji: '🎮 ✨ 🧭' }
export interface GlyphCoverageReport { language: string; sample: string; supported: boolean; missing: string[]; action: string }
/** 依据声明语言和回退配置生成覆盖提示及样例，不执行实际字体字形解析。 */ export function fontGlyphCoverage(asset: AssetRecord, languages: string[] = Object.keys(LANGUAGE_SAMPLES)): GlyphCoverageReport[] {
  const declared = new Set(asset.settings.fontSettings.declaredLanguages), fallback = asset.settings.fontSettings.fallbackFamilies.length > 0 || asset.settings.fontSettings.fallbackAssetUuids.length > 0
  return sortedUnique(languages).map(/** 根据语言声明或回退配置判断覆盖状态，返回样例和需要补充的配置提示。 */ language => { const sample = LANGUAGE_SAMPLES[language] ?? language, supported = declared.has(language) || fallback; return { language, sample, supported, missing: supported ? [] : [...sample], action: supported ? 'Coverage declared or provided by a fallback chain.' : `Add ${language} to declared languages or assign a font fallback that covers the listed glyphs.` } })
}

/* 调用 String.fromCharCode(...bytes.slice(start, start + length)) 并返回调用结果。 */ function ascii(bytes: Uint8Array, start: number, length: number): string { return String.fromCharCode(...bytes.slice(start, start + length)) }
/** 检查源名称、大小和常见文件头，对有界 SVG 与本地化文本应用格式和活动内容检查。 */ export function validateImportSource(name: string, mimeType: string, bytes: ArrayBuffer, settings: AssetImportSettings): AssetPipelineMetadata['diagnostics'] {
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
  /** 创建带可配置容量的缩略图最近使用缓存。 */ constructor(readonly capacity = 512) {}
  /** 读取缩略图 URL 并刷新使用时间，缓存未命中时返回 null。 */ get(key: string): string | null { const item = this.values.get(key); if (!item) return null; item.used = performance.now(); return item.url }
  /** 保存缩略图及使用时间，超过容量时按时间和稳定键淘汰最旧条目。 */ set(key: string, url: string): void { this.values.set(key, { url, used: performance.now() }); if (this.values.size <= this.capacity) return; const victim = [...this.values].sort(/* 先计算 a[1].used - b[1].used；仅当其为假值时求右侧 ordinal(a[0],b[0])，返回短路求值结果。 */ (a, b) => a[1].used - b[1].used || ordinal(a[0],b[0]))[0]; if (victim) this.values.delete(victim[0]) }
  /** 执行时调用 this.values.clear()；不显式返回调用结果。 */ clear(): void { this.values.clear() }
}

/* 先计算 asset.pipeline?.sourceHash；仅当其为假值时求右侧 sha256Bytes(assetSourceBytes(asset.source))，返回短路求值结果。 */ export function sourceFingerprint(asset: AssetRecord): string { return asset.pipeline?.sourceHash || sha256Bytes(assetSourceBytes(asset.source)) }
