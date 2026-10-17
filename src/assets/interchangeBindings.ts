/** 互通资源绑定：将外部文档中的纹理引用解析并关联到项目内资源。 */
import type { AssetRecord } from './types'
import { bindTiledMapDocument } from './tiledMapAssets'
import { assetSourceText, commitAssetReferenceRepairs } from './assetReferences'

export interface InterchangeTextureBinding { reference: string | null; diagnostics: Array<{ severity: 'error'; code: string; message: string }> }
/** 统一路径分隔符并按段消解点目录和上级段，生成项目内匹配路径。 */ function projectPath(value: string): string {
  const parts: string[] = []
  for (const part of value.replace(/\\/g, '/').split('/')) { if (!part || part === '.') continue; if (part === '..') parts.pop(); else parts.push(part) }
  return parts.join('/')
}
/** 安全解析资源源文本为非数组对象，缺失或非法 JSON 返回 null。 */ function document(asset: AssetRecord): Record<string, unknown> | null {
  try { const text=assetSourceText(asset),value=text?JSON.parse(text):null; return value&&typeof value==='object'&&!Array.isArray(value)?value:null } catch { return null }
}
/** Prefer explicit stable identity; basename fallback must resolve to exactly one image. */
/** 优先解析显式稳定纹理引用，再按直接、相对路径和文件名查找，缺失或歧义时返回诊断。 */ export function resolveInterchangeTexture(asset: AssetRecord, assets: readonly AssetRecord[]): InterchangeTextureBinding {
  const source=document(asset),explicit=typeof source?.textureAsset==='string'?source.textureAsset:null
  const failure=/** 构造并返回记录 {reference:null,diagnostics:[{severity:'error',code,message}]}，字段按当前实参及捕获状态求值。 */ (code:string,message:string):InterchangeTextureBinding=>({reference:null,diagnostics:[{severity:'error',code,message}]})
  if(explicit){const id=explicit.replace(/^asset:\/\//,'').toLowerCase(),image=assets.find(/* 先计算 value.uuid.toLowerCase()===id；仅当其为真值时求右侧 value.assetType==='image'，返回短路求值结果。 */ value=>value.uuid.toLowerCase()===id&&value.assetType==='image');return image?{reference:`asset://${image.uuid}`,diagnostics:[]}:failure('CONTENT_TEXTURE_MISSING',`${asset.path} requires missing image ${explicit}.`)}
  const path=asset.interchange?.texturePath||(typeof source?.texturePath==='string'?source.texturePath:'')
  if(!path)return {reference:null,diagnostics:[]}
  const normalized=projectPath(path),relative=projectPath(asset.path.slice(0,asset.path.lastIndexOf('/')+1)+path)
  let images=assets.filter(/* 先计算 value.assetType==='image'；仅当其为真值时求右侧 (value.path===normalized||value.path===relative)，返回短路求值结果。 */ value=>value.assetType==='image'&&(value.path===normalized||value.path===relative))
  if(!images.length){const name=normalized.split('/').pop()?.toLowerCase();images=assets.filter(/* 先计算 value.assetType==='image'；仅当其为真值时求右侧 value.name.toLowerCase()===name，返回短路求值结果。 */ value=>value.assetType==='image'&&value.name.toLowerCase()===name)}
  if(images.length!==1)return failure(images.length?'CONTENT_TEXTURE_AMBIGUOUS':'CONTENT_TEXTURE_MISSING',`${asset.path}: ${path} resolves to ${images.length} images. Assign one stable texture reference.`)
  return {reference:`asset://${images[0].uuid}`,diagnostics:[]}
}
/** Resolve imported metadata after a batch, or prepare one candidate without touching the live record. */
/** 为交换资源绑定纹理或地图依赖，尽量保留原显式引用，提交源修复并替换相关诊断。 */ export function bindInterchangeTexture(asset: AssetRecord, assets: readonly AssetRecord[], previous?: AssetRecord): InterchangeTextureBinding {
  if(!asset.interchange)return {reference:null,diagnostics:[]}
  const value=document(asset);if(!value)return {reference:null,diagnostics:[]}
  if(value.format==='nova-tiled-map-resource'){
    const binding=bindTiledMapDocument(asset,assets,previous),source='data:'+asset.mimeType+';charset=utf-8,'+encodeURIComponent(JSON.stringify(binding.value,null,2)+'\n')
    if(source!==asset.source)commitAssetReferenceRepairs([{asset,source}])
    if(asset.pipeline)asset.pipeline.diagnostics=[...asset.pipeline.diagnostics.filter(/* 返回 issue.code.startsWith('CONTENT_TEXTURE_') 的逻辑取反结果。 */ issue=>!issue.code.startsWith('CONTENT_TEXTURE_')),...binding.diagnostics]
    return {reference:null,diagnostics:binding.diagnostics}
  }
  if(previous?.interchange?.texturePath===asset.interchange.texturePath&&!value.textureAsset){const prior=document(previous);if(typeof prior?.textureAsset==='string')value.textureAsset=prior.textureAsset}
  const candidate={...asset,source:JSON.stringify(value)},binding=resolveInterchangeTexture(candidate,assets)
  if(binding.reference){
    value.textureAsset=binding.reference
    if(Array.isArray(value.sources))value.sources=value.sources.map(/* 根据 source&&typeof source==='object'&&!Array.isArray(source) 的真假，分别返回 {...source,textureAsset:binding.reference} 或 source。 */ source=>source&&typeof source==='object'&&!Array.isArray(source)?{...source,textureAsset:binding.reference}:source)
    const source=`data:${asset.mimeType};charset=utf-8,${encodeURIComponent(JSON.stringify(value,null,2)+'\n')}`
    if(source!==asset.source)commitAssetReferenceRepairs([{asset,source}])
  }
  if(asset.pipeline)asset.pipeline.diagnostics=[...asset.pipeline.diagnostics.filter(/* 返回 issue.code.startsWith('CONTENT_TEXTURE_') 的逻辑取反结果。 */ issue=>!issue.code.startsWith('CONTENT_TEXTURE_')),...binding.diagnostics]
  return binding
}
