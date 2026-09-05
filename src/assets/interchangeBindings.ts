import type { AssetRecord } from './types'
import { bindTiledMapDocument } from './tiledMapAssets'
import { assetSourceText, commitAssetReferenceRepairs } from './assetReferences'

export interface InterchangeTextureBinding { reference: string | null; diagnostics: Array<{ severity: 'error'; code: string; message: string }> }
function projectPath(value: string): string {
  const parts: string[] = []
  for (const part of value.replace(/\\/g, '/').split('/')) { if (!part || part === '.') continue; if (part === '..') parts.pop(); else parts.push(part) }
  return parts.join('/')
}
function document(asset: AssetRecord): Record<string, unknown> | null {
  try { const text=assetSourceText(asset),value=text?JSON.parse(text):null; return value&&typeof value==='object'&&!Array.isArray(value)?value:null } catch { return null }
}
/** Prefer explicit stable identity; basename fallback must resolve to exactly one image. */
export function resolveInterchangeTexture(asset: AssetRecord, assets: readonly AssetRecord[]): InterchangeTextureBinding {
  const source=document(asset),explicit=typeof source?.textureAsset==='string'?source.textureAsset:null
  const failure=(code:string,message:string):InterchangeTextureBinding=>({reference:null,diagnostics:[{severity:'error',code,message}]})
  if(explicit){const id=explicit.replace(/^asset:\/\//,'').toLowerCase(),image=assets.find(value=>value.uuid.toLowerCase()===id&&value.assetType==='image');return image?{reference:`asset://${image.uuid}`,diagnostics:[]}:failure('CONTENT_TEXTURE_MISSING',`${asset.path} requires missing image ${explicit}.`)}
  const path=asset.interchange?.texturePath||(typeof source?.texturePath==='string'?source.texturePath:'')
  if(!path)return {reference:null,diagnostics:[]}
  const normalized=projectPath(path),relative=projectPath(asset.path.slice(0,asset.path.lastIndexOf('/')+1)+path)
  let images=assets.filter(value=>value.assetType==='image'&&(value.path===normalized||value.path===relative))
  if(!images.length){const name=normalized.split('/').pop()?.toLowerCase();images=assets.filter(value=>value.assetType==='image'&&value.name.toLowerCase()===name)}
  if(images.length!==1)return failure(images.length?'CONTENT_TEXTURE_AMBIGUOUS':'CONTENT_TEXTURE_MISSING',`${asset.path}: ${path} resolves to ${images.length} images. Assign one stable texture reference.`)
  return {reference:`asset://${images[0].uuid}`,diagnostics:[]}
}
/** Resolve imported metadata after a batch, or prepare one candidate without touching the live record. */
export function bindInterchangeTexture(asset: AssetRecord, assets: readonly AssetRecord[], previous?: AssetRecord): InterchangeTextureBinding {
  if(!asset.interchange)return {reference:null,diagnostics:[]}
  const value=document(asset);if(!value)return {reference:null,diagnostics:[]}
  if(value.format==='nova-tiled-map-resource'){
    const binding=bindTiledMapDocument(asset,assets,previous),source='data:'+asset.mimeType+';charset=utf-8,'+encodeURIComponent(JSON.stringify(binding.value,null,2)+'\n')
    if(source!==asset.source)commitAssetReferenceRepairs([{asset,source}])
    if(asset.pipeline)asset.pipeline.diagnostics=[...asset.pipeline.diagnostics.filter(issue=>!issue.code.startsWith('CONTENT_TEXTURE_')),...binding.diagnostics]
    return {reference:null,diagnostics:binding.diagnostics}
  }
  if(previous?.interchange?.texturePath===asset.interchange.texturePath&&!value.textureAsset){const prior=document(previous);if(typeof prior?.textureAsset==='string')value.textureAsset=prior.textureAsset}
  const candidate={...asset,source:JSON.stringify(value)},binding=resolveInterchangeTexture(candidate,assets)
  if(binding.reference){
    value.textureAsset=binding.reference
    if(Array.isArray(value.sources))value.sources=value.sources.map(source=>source&&typeof source==='object'&&!Array.isArray(source)?{...source,textureAsset:binding.reference}:source)
    const source=`data:${asset.mimeType};charset=utf-8,${encodeURIComponent(JSON.stringify(value,null,2)+'\n')}`
    if(source!==asset.source)commitAssetReferenceRepairs([{asset,source}])
  }
  if(asset.pipeline)asset.pipeline.diagnostics=[...asset.pipeline.diagnostics.filter(issue=>!issue.code.startsWith('CONTENT_TEXTURE_')),...binding.diagnostics]
  return binding
}
