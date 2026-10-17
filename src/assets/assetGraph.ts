/** 资源依赖查询：建立项目引用关系，解释构建包含原因并提供路径及缺失引用修复。 */
import { localizationBuildDependencies } from './localizationDependencies'
import type { AssetRecord } from './types'
import { assetSourceText, collectAssetReferences, textAssetReferences, rewriteAssetSource, referenceMetadataRepairs, commitAssetReferenceRepairs } from './assetReferences'
import { isRhaiTrivia, lexRhai } from '../visual/rhaiSyntaxLexer'
import { executableGraphSource } from '../visual/graphCompiler'
import { resolveInterchangeTexture } from './interchangeBindings'

export interface AssetDependencyGraph {
  dependencies: Map<string, Set<string>>
  reverseDependencies: Map<string, Set<string>>
  missingReferences: Array<{ owner: string; reference: string }>
  projectReferences: Set<string>
  diagnostics: Array<{owner:string;code:string;message:string}>
}
const normalizePath = /* 调用 value.replace(/\\/g, '/').replace(/^\.\//, '') 并返回调用结果。 */ (value: string) => value.replace(/\\/g, '/').replace(/^\.\//, '')
// Build patterns and editor folders describe selection policy, never individual files.
/** 排除目录设置、通配和多行文本，只返回规范化后位于 Assets 下的候选资源路径。 */ function assetPathCandidate(value:string,key:string):string|null {
  if (/^(?:include|exclude|assetFolders|outputDirectory|outputPath|folder|currentFolder)$/i.test(key) || /[*?\r\n]/.test(value)) return null
  const path=normalizePath(value)
  return /^Assets\//.test(path) ? path : null
}
/** 排除资源数据库和编辑历史，从项目作者数据及语言构建需求收集资源引用并解析已知路径。 */ export function projectAssetReferences(project: unknown, assets: readonly AssetRecord[] = []): Set<string> {
  const byPath = new Map(assets.map(/* 返回按声明顺序构造的数组 [normalizePath(asset.path), asset.uuid.toLowerCase()]。 */ asset => [normalizePath(asset.path), asset.uuid.toLowerCase()]))
  const root = project && typeof project === 'object' && !Array.isArray(project) ? Object.fromEntries(Object.entries(project).filter(/* 返回 ['assets','assetDatabase','assetFolders','editor','editorState','history'].includes(key) 的逻辑取反结果。 */ ([key]) => !['assets','assetDatabase','assetFolders','editor','editorState','history'].includes(key))) : project
  return collectAssetReferences(root, localizationBuildDependencies(assets, project).assetUuids, /** 把项目中的候选资源路径解析为已知身份，未找到时保留路径供缺失引用诊断。 */ (value,key) => { const path=assetPathCandidate(value,key); return path ? byPath.get(path) ?? path : null })
}
/** 构建正反依赖及项目入口引用，解析脚本模块和交换纹理，同时报告重复身份路径、缺失引用及源码分析失败。 */ export function buildAssetDependencyGraph(assets: AssetRecord[], project?: unknown): AssetDependencyGraph {
  const byId = new Map(assets.map(/* 返回按声明顺序构造的数组 [asset.uuid.toLowerCase(), asset]。 */ asset => [asset.uuid.toLowerCase(), asset])), byPath = new Map(assets.map(/* 返回按声明顺序构造的数组 [normalizePath(asset.path), asset.uuid.toLowerCase()]。 */ asset => [normalizePath(asset.path), asset.uuid.toLowerCase()]))
  const dependencies = new Map<string, Set<string>>(), reverseDependencies = new Map<string, Set<string>>(), missingReferences: AssetDependencyGraph['missingReferences'] = [], diagnostics:AssetDependencyGraph['diagnostics']=[]
  const identities = new Set<string>(), paths = new Map<string,string>()
  for (const asset of assets) { const id=asset.uuid.toLowerCase(),path=normalizePath(asset.path).toLowerCase(); if(identities.has(id))diagnostics.push({owner:asset.uuid,code:'ASSET_DUPLICATE_ID',message:`Duplicate asset UUID ${asset.uuid}.`});identities.add(id);const previous=paths.get(path);if(previous){diagnostics.push({owner:asset.uuid,code:'ASSET_DUPLICATE_PATH',message:`Duplicate asset path ${asset.path}.`});diagnostics.push({owner:previous,code:'ASSET_DUPLICATE_PATH',message:`Duplicate asset path ${asset.path}.`})}else paths.set(path,asset.uuid) }
  for (const asset of [...assets].sort(/* 调用 a.uuid.localeCompare(b.uuid) 并返回调用结果。 */ (a,b)=>a.uuid.localeCompare(b.uuid))) {
    const relativeFolder = asset.path.slice(0, asset.path.lastIndexOf('/') + 1)
    let refs = new Set<string>()
    try {
    const effectiveAsset = asset.assetType === 'visualScript' ? { ...asset, assetType: 'script' as const, source: executableGraphSource(assetSourceText(asset) ?? '') } : asset
    refs = textAssetReferences(effectiveAsset, /** 排除非资源字段后匹配直接路径及纹理相关相对路径，未匹配时保留合法 Assets 候选。 */ (value,key) => {
      if (/^(?:include|exclude|assetFolders|outputDirectory|outputPath|folder|currentFolder)$/i.test(key) || /[*?\r\n]/.test(value)) return null
      const path = normalizePath(value)
      const known = byPath.get(path) ?? (/^(texturePath|image|source)$/i.test(key) ? byPath.get(relativeFolder + path) : undefined)
      return known ?? assetPathCandidate(value,key)
    })
    if(asset.interchange){const binding=resolveInterchangeTexture(asset,assets);if(binding.reference)refs.add(binding.reference.slice('asset://'.length).toLowerCase());for(const issue of binding.diagnostics)diagnostics.push({owner:asset.uuid,code:issue.code,message:issue.message})}
    const source = effectiveAsset.assetType === 'script' ? assetSourceText(effectiveAsset) : null
    if (source) {
      const tokens = lexRhai(source, { moduleMode:'host' }).tokens.filter(/* 返回 isRhaiTrivia(token) 的逻辑取反结果。 */ token => !isRhaiTrivia(token))
      for (let index = 0; index < tokens.length; index++) if (tokens[index].kind === 'keyword' && tokens[index].text === 'use') {
        const token=tokens[index],start=source.lastIndexOf('\n',token.span.start-1)+1,end=source.indexOf('\n',token.span.end),line=source.slice(start,end<0?source.length:end),match=/^\s*use\s+(["'`])([^"'`\r\n]+)\1\s*;?\s*$/.exec(line)
        if(!match)continue
        const raw = normalizePath(match[2]), path = raw.startsWith('Assets/') ? raw : `Assets/Scripts/${raw}`
        refs.add(byPath.get(path) ?? byPath.get(path.endsWith('.rhai') ? path : path+'.rhai') ?? path)
      }
    }
    } catch(error) { diagnostics.push({owner:asset.uuid,code:'ASSET_DEPENDENCY_SOURCE',message:error instanceof Error?error.message:String(error)}) }
    dependencies.set(asset.uuid.toLowerCase(), refs)
    for (const reference of [...refs].sort()) {
      if (!byId.has(reference)) missingReferences.push({ owner:asset.uuid, reference })
      else { const owners=reverseDependencies.get(reference)??new Set<string>(); owners.add(asset.uuid); reverseDependencies.set(reference,owners) }
    }
  }
  const projectReferences = projectAssetReferences(project,assets)
  for (const reference of [...projectReferences].sort()) if (!byId.has(reference)) missingReferences.push({owner:'project',reference})
  return { dependencies, reverseDependencies, missingReferences, projectReferences, diagnostics }
}
/** 返回直接引用目标资源的项目入口和资源拥有者，按身份排序。 */ export function findAssetReferences(uuid:string,assets:AssetRecord[],project?:unknown):string[]{const graph=buildAssetDependencyGraph(assets,project),key=uuid.toLowerCase();return [...(graph.projectReferences.has(key)?['project']:[]),...(graph.reverseDependencies.get(key)??[])].sort()}
/** 从项目入口广度遍历依赖闭包，列出不可达的资源记录。 */ export function unusedAssetReport(assets:AssetRecord[],project?:unknown):AssetRecord[]{
  const graph=buildAssetDependencyGraph(assets,project),used=new Set<string>(),queue=[...graph.projectReferences]
  for(let index=0;index<queue.length;index++){const uuid=queue[index];if(used.has(uuid))continue;used.add(uuid);for(const dependency of graph.dependencies.get(uuid)??[])queue.push(dependency)}
  return assets.filter(/* 返回 used.has(asset.uuid.toLowerCase()) 的逻辑取反结果。 */ asset=>!used.has(asset.uuid.toLowerCase()))
}
/** 把目标资源的直接引用来源转为场景设置或资源路径说明。 */ export function explainAssetBuildInclusion(uuid:string,assets:AssetRecord[],project?:unknown):string[]{return findAssetReferences(uuid,assets,project).map(/** 将项目或资源拥有者转换为直接依赖来源说明。 */ owner=>owner==='project'?'Referenced by a scene or project setting':`Referenced by asset ${assets.find(/* 比较 asset.uuid 与 owner，返回严格相等的判断结果。 */ asset=>asset.uuid===owner)?.path??owner}`)}
/** 准备旧路径或其子路径到新位置的源码及元信息修复，再统一提交实际改变项。 */ export function repairAssetPathReferences(assets:AssetRecord[],oldPath:string,newPath:string):number{
  const from=normalizePath(oldPath).replace(/\/$/,''),to=normalizePath(newPath).replace(/\/$/,'')
  if(!from||!to)return 0
  const rewrite=/** 仅替换与旧路径完全相同或位于其目录下的引用，保留无关文本。 */ (value:string)=>{const path=normalizePath(value);return path===from||path.startsWith(from+'/')?to+path.slice(from.length):value}
  const changes=assets.map(/** 构造并返回记录 {asset,source:rewriteAssetSource(asset,rewrite),fields:referenceMetadataRepairs(asset,rewrite)}，字段按当前实参及捕获状态求值。 */ asset=>({asset,source:rewriteAssetSource(asset,rewrite),fields:referenceMetadataRepairs(asset,rewrite)})).filter(/* 先计算 asset.source!==source；仅当其为假值时求右侧 Object.keys(fields).length，返回短路求值结果。 */ ({asset,source,fields})=>asset.source!==source||Object.keys(fields).length)
  return commitAssetReferenceRepairs(changes)
}
/** 验证完整资源身份后重写准确 URI 及已知引用字段中的裸 UUID，统一提交修改。 */ export function repairMissingAssetReference(assets:AssetRecord[],missingUuid:string,replacementUuid:string):number{
  const from=missingUuid.toLowerCase().replace(/^asset:\/\//,''),to=replacementUuid.toLowerCase().replace(/^asset:\/\//,'')
  if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(from)||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(to))throw new Error('ASSET_REPAIR_ID: Repair requires complete asset UUIDs.')
  const changes=assets.map(/** 为单个资源准备 URI 和受支持裸身份字段的替换函数，返回源码及元信息修复方案。 */ asset=>{const rewrite=/** 准确替换旧资源 URI；裸 UUID 仅在已知引用字段或资源父级字段内替换。 */ (value:string,key='')=>value.toLowerCase()===`asset://${from}`?`asset://${to}`:value.toLowerCase()===from&&(/(?:asset(?:s|uuid|uuids)?|references?|clips|controllers|masks|rigs|retargetProfile)$/i.test(key)||asset.assetType==='resource'&&key==='parent')?to:value;return {asset,source:rewriteAssetSource(asset,rewrite),fields:referenceMetadataRepairs(asset,rewrite)}}).filter(/* 先计算 asset.source!==source；仅当其为假值时求右侧 Object.keys(fields).length，返回短路求值结果。 */ ({asset,source,fields})=>asset.source!==source||Object.keys(fields).length)
  return commitAssetReferenceRepairs(changes)
}
