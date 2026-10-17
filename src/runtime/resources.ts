
import { assetReference, assetState, createTextAsset, updateTextAssetTransactional } from '../assets/AssetDatabase'
import {defaultResource,serializeResource,resourceRecord,readResourceFromAssets,resolveResourceFromAssets,resourceVariantNames as resourceVariantNamesFromAssets,validateResourceProject as validateResourceProjectFromAssets} from './resourceValues'
import type {ResourceKind,NovaResourceDocument,ResolvedResource,ResourceIssue} from './resourceValues'
export type {ResourceKind,NovaResourceDocument,ResolvedResource,ResourceIssue} from './resourceValues'
export {defaultResource,normalizeResource,serializeResource,readResourceFromAssets,resolveResourceFromAssets,setResourceVariantData} from './resourceValues'
import type { AssetRecord } from '../assets/types'
/** 结构说明（自动提取）：createResourceAsset；输入 kind、name；直接调用 createTextAsset、serializeResource、defaultResource、replace。 */ export function createResourceAsset(kind: ResourceKind, name: string = kind): AssetRecord { return createTextAsset(name, 'resource', serializeResource(defaultResource(kind, name)), `Assets/Resources/${kind === 'AnimationLibrary' ? 'Animation Libraries' : kind === 'InputMap' ? 'Input Maps' : kind === 'PhysicsMaterial' ? 'Physics Materials' : ''}`.replace(/\/$/, '')) }
/* 调用 readResourceFromAssets(referenceValue,assetState.records) 并返回调用结果。 */ export function readResource(referenceValue:string|null|undefined):NovaResourceDocument|null{return readResourceFromAssets(referenceValue,assetState.records)}
/** 结构说明（自动提取）：saveResource；输入 referenceValue、resource；直接调用 resourceRecord、serializeResource、resolveResourceFromAssets、assetState.records.map、updateTextAssetTransactional。 */ export function saveResource(referenceValue:string,resource:NovaResourceDocument):boolean{
  const record=resourceRecord(referenceValue,assetState.records);if(!record||record.assetType!=='resource')return false
  const source=serializeResource(resource),candidate={...record,source}
  if(!resolveResourceFromAssets(record.uuid,assetState.records.map(/* 根据 asset.uuid===record.uuid 的真假，分别返回 candidate 或 asset。 */ asset=>asset.uuid===record.uuid?candidate:asset)))return false
  return updateTextAssetTransactional(record.uuid,source)
}

/** 结构说明（自动提取）：createResourceOverride；输入 referenceValue、name；直接调用 readResource、resolveResource、Error、defaultResource、referenceValue.startsWith 等；写入 document.parent、document.data；包含显式抛错路径。 */ export function createResourceOverride(referenceValue:string,name='Resource Override'):AssetRecord{
  const source=readResource(referenceValue)
  if(!source||!resolveResource(referenceValue))throw new Error('RESOURCE_SOURCE_MISSING: Choose a valid Resource inheritance chain before creating an override.')
  const document=defaultResource(source.kind,name);document.parent=referenceValue.startsWith('asset://')?referenceValue:assetReference(referenceValue);document.data={}
  return createTextAsset(name,'resource',serializeResource(document),'Assets/Resources')
}
/* 调用 resolveResourceFromAssets(referenceValue,assetState.records,variantName) 并返回调用结果。 */ export function resolveResource(referenceValue:string|null|undefined,variantName?:string):ResolvedResource|null{return resolveResourceFromAssets(referenceValue,assetState.records,variantName)}
/** 结构说明（自动提取）：resourceVariantNames；输入 value、assets；直接调用 Set、Object.keys、resourceRecord、seen.has、seen.add 等；写入 parent；包含循环处理。 */ export function resourceVariantNames(value: NovaResourceDocument | null | undefined, assets:readonly AssetRecord[]=assetState.records): string[] { return resourceVariantNamesFromAssets(value,assets) }
/** 结构说明（自动提取）：validateResourceProject；输入 assets；直接调用 sort、assets.filter、readResourceFromAssets、issues.push、resolveResourceFromAssets；返回路径包含 issues；包含循环处理。 */ export function validateResourceProject(assets: AssetRecord[] = assetState.records): ResourceIssue[] { return validateResourceProjectFromAssets(assets) }
