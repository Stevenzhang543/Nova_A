import { assetReference, assetState, createTextAsset, updateTextAssetTransactional } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import { assetSourceText } from '../assets/assetReferences'

export type ResourceKind = 'Material' | 'AnimationLibrary' | 'InputMap' | 'PhysicsMaterial' | 'Theme' | 'DataTable'
export interface NovaResourceDocument {
  format: 'nova-resource'
  version: 1
  id: string
  name: string
  kind: ResourceKind
  parent: string | null
  data: Record<string, unknown>
  /** Additive named overrides; older editors safely ignore these fields. */
  variants?: Record<string, Record<string, unknown>>
  activeVariant?: string
}
export interface ResolvedResource extends NovaResourceDocument { chain: string[]; overrides: string[]; activeVariant: string; variants: Record<string, Record<string, unknown>> }
export interface ResourceIssue { severity: 'error' | 'warning'; code: string; assetUuid: string; message: string }

const kinds: ResourceKind[] = ['Material', 'AnimationLibrary', 'InputMap', 'PhysicsMaterial', 'Theme', 'DataTable']
function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function finite(value: unknown, fallback: number, minimum: number, maximum: number): number { const number = Number(value); return Math.min(maximum, Math.max(minimum, Number.isFinite(number) ? number : fallback)) }
function id(value: unknown, fallback: string): string { const result = typeof value === 'string' ? value.trim().replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 120) : ''; return result || fallback }
function reference(value: unknown): string | null { return typeof value === 'string' && /^(?:asset:\/\/)?[0-9a-f-]{8,}$/i.test(value) ? value.slice(0, 160) : null }
function references(value: unknown, maximum = 4_096): string[] { return [...new Set((Array.isArray(value) ? value : []).flatMap(item => { const result = reference(item); return result ? [result] : [] }))].sort().slice(0, maximum) }
function safeJson(value: unknown, depth = 0): unknown {
  if (depth > 12) return null
  if (value === null || ['string', 'boolean'].includes(typeof value)) return typeof value === 'string' ? value.slice(0, 100_000) : value
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (Array.isArray(value)) return value.slice(0, 10_000).map(item => safeJson(item, depth + 1))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).slice(0, 2_000).map(([key, item]) => [key.slice(0, 160), safeJson(item, depth + 1)]))
  return null
}
function normalizeData(kind: ResourceKind, source: unknown): Record<string, unknown> {
  const data = object(source)
  if (kind === 'PhysicsMaterial') return {
    density: finite(data.density, 1, .000001, 1e9), friction: finite(data.friction, .5, 0, 1), restitution: finite(data.restitution, .2, 0, 1),
    linearDamping: finite(data.linearDamping, .01, 0, 1e6), angularDamping: finite(data.angularDamping, .01, 0, 1e6), surfaceVelocity: finite(data.surfaceVelocity, 0, -1e9, 1e9)
  }
  if (kind === 'AnimationLibrary') return { clips: references(data.clips), controllers: references(data.controllers), masks: references(data.masks), rigs: references(data.rigs), retargetProfile: reference(data.retargetProfile) }
  if (kind === 'InputMap') return { actions: (Array.isArray(data.actions) ? data.actions : []).slice(0, 1_024).flatMap((raw, index) => { const action = object(raw), name = id(action.name, `action_${index + 1}`); return [{ name, deadZone: finite(action.deadZone, .15, 0, 1), consume: action.consume !== false, priority: Math.round(finite(action.priority, 0, -1_000_000, 1_000_000)), bindings: (Array.isArray(action.bindings) ? action.bindings : []).slice(0, 64).map(binding => safeJson(binding)) }] }) }
  if (kind === 'Material') return { materialAsset: reference(data.materialAsset), parameters: object(safeJson(data.parameters)) }
  if (kind === 'Theme') return { themeAsset: reference(data.themeAsset), variant: id(data.variant, 'Default'), tokens: object(safeJson(data.tokens)) }
  return { tableAsset: reference(data.tableAsset), rowFilter: typeof data.rowFilter === 'string' ? data.rowFilter.slice(0, 2_000) : '', overrides: object(safeJson(data.overrides)) }
}
function normalizeOverrideData(kind: ResourceKind, source: unknown): Record<string, unknown> {
  const data = object(source), complete = normalizeData(kind, data)
  return Object.fromEntries(Object.keys(data).filter(key => Object.prototype.hasOwnProperty.call(complete,key)).sort().map(key => [key, complete[key]]))
}
function normalizeVariants(kind: ResourceKind, source: unknown): Record<string, Record<string, unknown>> {
  return Object.fromEntries(Object.entries(object(source)).sort(([a], [b]) => a.localeCompare(b)).slice(0, 128).flatMap(([name, value]) => {
    const safeName = id(name, '').slice(0, 80)
    return safeName && safeName !== 'Default' ? [[safeName, normalizeOverrideData(kind, value)]] : []
  }))
}
export function defaultResource(kind: ResourceKind, name: string = kind): NovaResourceDocument {
  return normalizeResource({ format: 'nova-resource', version: 1, id: id(name, kind), name, kind, parent: null, data: {}, variants: {}, activeVariant: 'Default' })
}
export function normalizeResource(value: unknown): NovaResourceDocument {
  const source = object(value), kind = kinds.includes(source.kind as ResourceKind) ? source.kind as ResourceKind : 'Material'
  const name = typeof source.name === 'string' && source.name.trim() ? source.name.trim().slice(0, 120) : kind
  const parent = reference(source.parent)
  const variants = normalizeVariants(kind, source.variants), requestedVariant = id(source.activeVariant, 'Default')
  // Parent variants are validated by the context-aware resolver, after serialization.
  const activeVariant = requestedVariant === 'Default' || Object.prototype.hasOwnProperty.call(variants,requestedVariant) || parent ? requestedVariant : 'Default'
  return { format: 'nova-resource', version: 1, id: id(source.id, name), name, kind, parent, data: parent ? normalizeOverrideData(kind, source.data) : normalizeData(kind, source.data), variants, activeVariant }
}
export function serializeResource(value: unknown): string { return `${JSON.stringify(normalizeResource(value), null, 2)}\n` }
export function createResourceAsset(kind: ResourceKind, name: string = kind): AssetRecord { return createTextAsset(name, 'resource', serializeResource(defaultResource(kind, name)), `Assets/Resources/${kind === 'AnimationLibrary' ? 'Animation Libraries' : kind === 'InputMap' ? 'Input Maps' : kind === 'PhysicsMaterial' ? 'Physics Materials' : ''}`.replace(/\/$/, '')) }
function resourceRecord(referenceValue:string|null|undefined,assets:readonly AssetRecord[]):AssetRecord|null{
  const id=(referenceValue??'').replace(/^asset:\/\//,'').toLowerCase()
  return assets.find(asset=>asset.uuid.toLowerCase()===id)??null
}
export function readResourceFromAssets(referenceValue:string|null|undefined,assets:readonly AssetRecord[]):NovaResourceDocument|null{
  const asset=resourceRecord(referenceValue,assets)
  if(!asset||asset.assetType!=='resource')return null
  try{const source=assetSourceText(asset);if(!source)return null;const parsed=JSON.parse(source)
    if(parsed?.format!=='nova-resource'||parsed.version!==1||!kinds.includes(parsed.kind)||parsed.parent!=null&&!reference(parsed.parent))return null
    return normalizeResource(parsed)
  }catch{return null}
}
export function readResource(referenceValue:string|null|undefined):NovaResourceDocument|null{return readResourceFromAssets(referenceValue,assetState.records)}
export function saveResource(referenceValue:string,resource:NovaResourceDocument):boolean{
  const record=resourceRecord(referenceValue,assetState.records);if(!record||record.assetType!=='resource')return false
  const source=serializeResource(resource),candidate={...record,source}
  if(!resolveResourceFromAssets(record.uuid,assetState.records.map(asset=>asset.uuid===record.uuid?candidate:asset)))return false
  return updateTextAssetTransactional(record.uuid,source)
}

export function createResourceOverride(referenceValue:string,name='Resource Override'):AssetRecord{
  const source=readResource(referenceValue)
  if(!source||!resolveResource(referenceValue))throw new Error('RESOURCE_SOURCE_MISSING: Choose a valid Resource inheritance chain before creating an override.')
  const document=defaultResource(source.kind,name);document.parent=referenceValue.startsWith('asset://')?referenceValue:assetReference(referenceValue);document.data={}
  return createTextAsset(name,'resource',serializeResource(document),'Assets/Resources')
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const output = structuredClone(base)
  for (const [key, value] of Object.entries(override)) { const previous=Object.prototype.hasOwnProperty.call(output,key)?output[key]:undefined; Object.defineProperty(output,key,{value:value&&typeof value==='object'&&!Array.isArray(value)&&previous&&typeof previous==='object'&&!Array.isArray(previous)?deepMerge(previous as Record<string,unknown>,value as Record<string,unknown>):structuredClone(value),enumerable:true,writable:true,configurable:true}) }
  return output
}
export function resolveResource(referenceValue:string|null|undefined,variantName?:string):ResolvedResource|null{return resolveResourceFromAssets(referenceValue,assetState.records,variantName)}
export function resolveResourceFromAssets(referenceValue: string | null | undefined, assets:readonly AssetRecord[], variantName?: string): ResolvedResource | null {
  let currentReference = referenceValue ?? null, resolved: NovaResourceDocument | null = null
  const visited = new Set<string>(), chain: string[] = [], layers: NovaResourceDocument[] = []
  while (currentReference && layers.length < 64) {
    const asset = resourceRecord(currentReference,assets)
    if (!asset || asset.assetType !== 'resource' || visited.has(asset.uuid)) return null
    visited.add(asset.uuid); chain.push(asset.uuid)
    const document = readResourceFromAssets(asset.uuid,assets); if (!document || layers.length && layers[0].kind !== document.kind) return null
    layers.push(document); currentReference = document.parent
  }
  if (currentReference) return null
  const allVariants:Record<string,Record<string,unknown>>={}
  for(const layer of [...layers].reverse())for(const [name,data] of Object.entries(layer.variants??{}))Object.defineProperty(allVariants,name,{value:deepMerge(Object.prototype.hasOwnProperty.call(allVariants,name)?allVariants[name]:{},data),enumerable:true,writable:true,configurable:true})
  const selectedVariant = id(variantName ?? layers[0]?.activeVariant, 'Default'), localOverrides = Object.keys(layers[0]?.data ?? {}).sort()
  if(selectedVariant!=='Default'&&!Object.prototype.hasOwnProperty.call(allVariants,selectedVariant))return null
  for (const layer of [...layers].reverse()) {
    const base: Record<string, unknown> = resolved ? deepMerge(resolved.data, layer.data) : structuredClone(layer.data)
    const variant: Record<string, unknown> = selectedVariant === 'Default' ? {} : layer.variants?.[selectedVariant] ?? {}
    resolved = { ...layer, data: deepMerge(base, variant), variants: structuredClone(layer.variants ?? {}), activeVariant: selectedVariant }
  }
  return resolved ? { ...resolved, chain: [...chain].reverse(), overrides: localOverrides, variants: structuredClone(allVariants), activeVariant: selectedVariant } : null
}
export function resourceVariantNames(value: NovaResourceDocument | null | undefined, assets:readonly AssetRecord[]=assetState.records): string[] { const names=new Set(Object.keys(value?.variants??{})),seen=new Set<string>();let parent=value?.parent;while(parent&&seen.size<64){const record=resourceRecord(parent,assets);if(!record||seen.has(record.uuid))break;seen.add(record.uuid);const resource=readResourceFromAssets(record.uuid,assets);if(!resource||resource.kind!==value?.kind)break;Object.keys(resource.variants??{}).forEach(name=>names.add(name));parent=resource.parent}return ['Default', ...[...names].sort()] }
export function setResourceVariantData(value: NovaResourceDocument, name: string, data: unknown): NovaResourceDocument {
  const safeName = id(name, '').slice(0,80)
  if (!safeName || safeName === 'Default') throw new Error('RESOURCE_VARIANT_NAME: Choose a unique named variant.')
  const normalized = normalizeResource(value)
  if(!Object.prototype.hasOwnProperty.call(normalized.variants??{},safeName)&&Object.keys(normalized.variants??{}).length>=128)throw new Error('RESOURCE_VARIANT_LIMIT: A Resource supports at most 128 local variants.')
  const variants = { ...(normalized.variants ?? {}), [safeName]: normalizeOverrideData(normalized.kind, data) }
  return normalizeResource({ ...normalized, variants, activeVariant: safeName })
}
export function validateResourceProject(assets: AssetRecord[] = assetState.records): ResourceIssue[] {
  const issues: ResourceIssue[] = []
  for (const asset of assets.filter(candidate => candidate.assetType === 'resource').sort((a, b) => a.uuid.localeCompare(b.uuid))) {
    const document = readResourceFromAssets(asset.uuid,assets)
    if (!document) { issues.push({ severity: 'error', code: 'RESOURCE_PARSE', assetUuid: asset.uuid, message: `${asset.path} is not a valid Resource asset.` }); continue }
    if (document.parent) {
      const parent = readResourceFromAssets(document.parent,assets)
      if (!parent) issues.push({ severity: 'error', code: 'RESOURCE_PARENT_MISSING', assetUuid: asset.uuid, message: `${asset.path} references a missing parent Resource.` })
      else if (parent.kind !== document.kind) issues.push({ severity: 'error', code: 'RESOURCE_KIND_MISMATCH', assetUuid: asset.uuid, message: `${asset.path} cannot override ${parent.kind} with ${document.kind}.` })
    }
    if (!resolveResourceFromAssets(asset.uuid,assets)) issues.push({ severity: 'error', code: 'RESOURCE_CYCLE', assetUuid: asset.uuid, message: `${asset.path} contains a missing or cyclic Resource inheritance chain.` })
  }
  return issues
}
