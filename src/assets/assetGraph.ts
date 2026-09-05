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
const normalizePath = (value: string) => value.replace(/\\/g, '/').replace(/^\.\//, '')
// Build patterns and editor folders describe selection policy, never individual files.
function assetPathCandidate(value:string,key:string):string|null {
  if (/^(?:include|exclude|assetFolders|outputDirectory|outputPath|folder|currentFolder)$/i.test(key) || /[*?\r\n]/.test(value)) return null
  const path=normalizePath(value)
  return /^Assets\//.test(path) ? path : null
}
export function projectAssetReferences(project: unknown, assets: readonly AssetRecord[] = []): Set<string> {
  const byPath = new Map(assets.map(asset => [normalizePath(asset.path), asset.uuid.toLowerCase()]))
  const root = project && typeof project === 'object' && !Array.isArray(project) ? Object.fromEntries(Object.entries(project).filter(([key]) => !['assets','assetDatabase','assetFolders','editor','editorState','history'].includes(key))) : project
  return collectAssetReferences(root, localizationBuildDependencies(assets, project).assetUuids, (value,key) => { const path=assetPathCandidate(value,key); return path ? byPath.get(path) ?? path : null })
}
export function buildAssetDependencyGraph(assets: AssetRecord[], project?: unknown): AssetDependencyGraph {
  const byId = new Map(assets.map(asset => [asset.uuid.toLowerCase(), asset])), byPath = new Map(assets.map(asset => [normalizePath(asset.path), asset.uuid.toLowerCase()]))
  const dependencies = new Map<string, Set<string>>(), reverseDependencies = new Map<string, Set<string>>(), missingReferences: AssetDependencyGraph['missingReferences'] = [], diagnostics:AssetDependencyGraph['diagnostics']=[]
  const identities = new Set<string>(), paths = new Map<string,string>()
  for (const asset of assets) { const id=asset.uuid.toLowerCase(),path=normalizePath(asset.path).toLowerCase(); if(identities.has(id))diagnostics.push({owner:asset.uuid,code:'ASSET_DUPLICATE_ID',message:`Duplicate asset UUID ${asset.uuid}.`});identities.add(id);const previous=paths.get(path);if(previous){diagnostics.push({owner:asset.uuid,code:'ASSET_DUPLICATE_PATH',message:`Duplicate asset path ${asset.path}.`});diagnostics.push({owner:previous,code:'ASSET_DUPLICATE_PATH',message:`Duplicate asset path ${asset.path}.`})}else paths.set(path,asset.uuid) }
  for (const asset of [...assets].sort((a,b)=>a.uuid.localeCompare(b.uuid))) {
    const relativeFolder = asset.path.slice(0, asset.path.lastIndexOf('/') + 1)
    let refs = new Set<string>()
    try {
    const effectiveAsset = asset.assetType === 'visualScript' ? { ...asset, assetType: 'script' as const, source: executableGraphSource(assetSourceText(asset) ?? '') } : asset
    refs = textAssetReferences(effectiveAsset, (value,key) => {
      if (/^(?:include|exclude|assetFolders|outputDirectory|outputPath|folder|currentFolder)$/i.test(key) || /[*?\r\n]/.test(value)) return null
      const path = normalizePath(value)
      const known = byPath.get(path) ?? (/^(texturePath|image|source)$/i.test(key) ? byPath.get(relativeFolder + path) : undefined)
      return known ?? assetPathCandidate(value,key)
    })
    if(asset.interchange){const binding=resolveInterchangeTexture(asset,assets);if(binding.reference)refs.add(binding.reference.slice('asset://'.length).toLowerCase());for(const issue of binding.diagnostics)diagnostics.push({owner:asset.uuid,code:issue.code,message:issue.message})}
    const source = effectiveAsset.assetType === 'script' ? assetSourceText(effectiveAsset) : null
    if (source) {
      const tokens = lexRhai(source, { moduleMode:'host' }).tokens.filter(token => !isRhaiTrivia(token))
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
export function findAssetReferences(uuid:string,assets:AssetRecord[],project?:unknown):string[]{const graph=buildAssetDependencyGraph(assets,project),key=uuid.toLowerCase();return [...(graph.projectReferences.has(key)?['project']:[]),...(graph.reverseDependencies.get(key)??[])].sort()}
export function unusedAssetReport(assets:AssetRecord[],project?:unknown):AssetRecord[]{
  const graph=buildAssetDependencyGraph(assets,project),used=new Set<string>(),queue=[...graph.projectReferences]
  for(let index=0;index<queue.length;index++){const uuid=queue[index];if(used.has(uuid))continue;used.add(uuid);for(const dependency of graph.dependencies.get(uuid)??[])queue.push(dependency)}
  return assets.filter(asset=>!used.has(asset.uuid.toLowerCase()))
}
export function explainAssetBuildInclusion(uuid:string,assets:AssetRecord[],project?:unknown):string[]{return findAssetReferences(uuid,assets,project).map(owner=>owner==='project'?'Referenced by a scene or project setting':`Referenced by asset ${assets.find(asset=>asset.uuid===owner)?.path??owner}`)}
export function repairAssetPathReferences(assets:AssetRecord[],oldPath:string,newPath:string):number{
  const from=normalizePath(oldPath).replace(/\/$/,''),to=normalizePath(newPath).replace(/\/$/,'')
  if(!from||!to)return 0
  const rewrite=(value:string)=>{const path=normalizePath(value);return path===from||path.startsWith(from+'/')?to+path.slice(from.length):value}
  const changes=assets.map(asset=>({asset,source:rewriteAssetSource(asset,rewrite),fields:referenceMetadataRepairs(asset,rewrite)})).filter(({asset,source,fields})=>asset.source!==source||Object.keys(fields).length)
  return commitAssetReferenceRepairs(changes)
}
export function repairMissingAssetReference(assets:AssetRecord[],missingUuid:string,replacementUuid:string):number{
  const from=missingUuid.toLowerCase().replace(/^asset:\/\//,''),to=replacementUuid.toLowerCase().replace(/^asset:\/\//,'')
  if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(from)||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(to))throw new Error('ASSET_REPAIR_ID: Repair requires complete asset UUIDs.')
  const changes=assets.map(asset=>{const rewrite=(value:string,key='')=>value.toLowerCase()===`asset://${from}`?`asset://${to}`:value.toLowerCase()===from&&(/(?:asset(?:s|uuid|uuids)?|references?|clips|controllers|masks|rigs|retargetProfile)$/i.test(key)||asset.assetType==='resource'&&key==='parent')?to:value;return {asset,source:rewriteAssetSource(asset,rewrite),fields:referenceMetadataRepairs(asset,rewrite)}}).filter(({asset,source,fields})=>asset.source!==source||Object.keys(fields).length)
  return commitAssetReferenceRepairs(changes)
}
