/** Unique resource value/read algorithms. Explicit readonly records; no Editor defaults, state, decode cache or media readiness. */
import {resolveRuntimeResourceRecord,runtimeAssetSourceText as assetSourceText} from './runtimeAssetValues'
import type {RuntimeAssetIdentityView,RuntimeAssetSourceView} from './runtimeAssetValues'

export interface RuntimeResourceRecord extends RuntimeAssetIdentityView,RuntimeAssetSourceView {}
export interface RuntimeResourceReadSource {listIdentities():readonly RuntimeResourceRecord[]}


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
/* 根据 value && typeof value === 'object' && !Array.isArray(value) 的真假，分别返回 value as Record<string, unknown> 或 {}。 */ function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
/** 结构说明（自动提取）：finite；输入 value、fallback、minimum、maximum；直接调用 Number、Math.min、Math.max、Number.isFinite。 */ function finite(value: unknown, fallback: number, minimum: number, maximum: number): number { const number = Number(value); return Math.min(maximum, Math.max(minimum, Number.isFinite(number) ? number : fallback)) }
/** 结构说明（自动提取）：id；输入 value、fallback；直接调用 slice、replace、value.trim。 */ function id(value: unknown, fallback: string): string { const result = typeof value === 'string' ? value.trim().replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 120) : ''; return result || fallback }
/* 根据 typeof value === 'string' && /^(?:asset:\/\/)?[0-9a-f-]{8,}$/i.test(value) 的真假，分别返回 value.slice(0, 160) 或 null。 */ function reference(value: unknown): string | null { return typeof value === 'string' && /^(?:asset:\/\/)?[0-9a-f-]{8,}$/i.test(value) ? value.slice(0, 160) : null }
/** 结构说明（自动提取）：references；输入 value、maximum；直接调用 slice、sort、Set、flatMap、Array.isArray。 */ function references(value: unknown, maximum = 4_096): string[] { return [...new Set((Array.isArray(value) ? value : []).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 item；直接调用 reference。 */ item => { const result = reference(item); return result ? [result] : [] }))].sort().slice(0, maximum) }
/** 结构说明（自动提取）：safeJson；输入 value、depth；直接调用 includes、value.slice、Number.isFinite、Array.isArray、map 等。 */ function safeJson(value: unknown, depth = 0): unknown {
  if (depth > 12) return null
  if (value === null || ['string', 'boolean'].includes(typeof value)) return typeof value === 'string' ? value.slice(0, 100_000) : value
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (Array.isArray(value)) return value.slice(0, 10_000).map(/* 调用 safeJson(item, depth + 1) 并返回调用结果。 */ item => safeJson(item, depth + 1))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(/* 调用 a.localeCompare(b) 并返回调用结果。 */ ([a], [b]) => a.localeCompare(b)).slice(0, 2_000).map(/* 返回按声明顺序构造的数组 [key.slice(0, 160), safeJson(item, depth + 1)]。 */ ([key, item]) => [key.slice(0, 160), safeJson(item, depth + 1)]))
  return null
}
/** 结构说明（自动提取）：normalizeData；输入 kind、source；直接调用 object、finite、references、reference、flatMap 等。 */ function normalizeData(kind: ResourceKind, source: unknown): Record<string, unknown> {
  const data = object(source)
  if (kind === 'PhysicsMaterial') return {
    density: finite(data.density, 1, .000001, 1e9), friction: finite(data.friction, .5, 0, 1), restitution: finite(data.restitution, .2, 0, 1),
    linearDamping: finite(data.linearDamping, .01, 0, 1e6), angularDamping: finite(data.angularDamping, .01, 0, 1e6), surfaceVelocity: finite(data.surfaceVelocity, 0, -1e9, 1e9)
  }
  if (kind === 'AnimationLibrary') return { clips: references(data.clips), controllers: references(data.controllers), masks: references(data.masks), rigs: references(data.rigs), retargetProfile: reference(data.retargetProfile) }
  if (kind === 'InputMap') return { actions: (Array.isArray(data.actions) ? data.actions : []).slice(0, 1_024).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 raw、index；直接调用 object、id、finite、Math.round、map 等。 */ (raw, index) => { const action = object(raw), name = id(action.name, `action_${index + 1}`); return [{ name, deadZone: finite(action.deadZone, .15, 0, 1), consume: action.consume !== false, priority: Math.round(finite(action.priority, 0, -1_000_000, 1_000_000)), bindings: (Array.isArray(action.bindings) ? action.bindings : []).slice(0, 64).map(/* 调用 safeJson(binding) 并返回调用结果。 */ binding => safeJson(binding)) }] }) }
  if (kind === 'Material') return { materialAsset: reference(data.materialAsset), parameters: object(safeJson(data.parameters)) }
  if (kind === 'Theme') return { themeAsset: reference(data.themeAsset), variant: id(data.variant, 'Default'), tokens: object(safeJson(data.tokens)) }
  return { tableAsset: reference(data.tableAsset), rowFilter: typeof data.rowFilter === 'string' ? data.rowFilter.slice(0, 2_000) : '', overrides: object(safeJson(data.overrides)) }
}
/** 结构说明（自动提取）：normalizeOverrideData；输入 kind、source；直接调用 object、normalizeData、Object.fromEntries、map、sort 等。 */ function normalizeOverrideData(kind: ResourceKind, source: unknown): Record<string, unknown> {
  const data = object(source), complete = normalizeData(kind, data)
  return Object.fromEntries(Object.keys(data).filter(/* 调用 Object.prototype.hasOwnProperty.call(complete,key) 并返回调用结果。 */ key => Object.prototype.hasOwnProperty.call(complete,key)).sort().map(/* 返回按声明顺序构造的数组 [key, complete[key]]。 */ key => [key, complete[key]]))
}
/** 结构说明（自动提取）：normalizeVariants；输入 kind、source；直接调用 Object.fromEntries、flatMap、slice、sort、Object.entries 等。 */ function normalizeVariants(kind: ResourceKind, source: unknown): Record<string, Record<string, unknown>> {
  return Object.fromEntries(Object.entries(object(source)).sort(/* 调用 a.localeCompare(b) 并返回调用结果。 */ ([a], [b]) => a.localeCompare(b)).slice(0, 128).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 [name, value]；直接调用 slice、id、normalizeOverrideData。 */ ([name, value]) => {
    const safeName = id(name, '').slice(0, 80)
    return safeName && safeName !== 'Default' ? [[safeName, normalizeOverrideData(kind, value)]] : []
  }))
}
/** 结构说明（自动提取）：defaultResource；输入 kind、name；直接调用 normalizeResource、id。 */ export function defaultResource(kind: ResourceKind, name: string = kind): NovaResourceDocument {
  return normalizeResource({ format: 'nova-resource', version: 1, id: id(name, kind), name, kind, parent: null, data: {}, variants: {}, activeVariant: 'Default' })
}
/** 结构说明（自动提取）：normalizeResource；输入 value；直接调用 object、kinds.includes、source.name.trim、slice、reference 等。 */ export function normalizeResource(value: unknown): NovaResourceDocument {
  const source = object(value), kind = kinds.includes(source.kind as ResourceKind) ? source.kind as ResourceKind : 'Material'
  const name = typeof source.name === 'string' && source.name.trim() ? source.name.trim().slice(0, 120) : kind
  const parent = reference(source.parent)
  const variants = normalizeVariants(kind, source.variants), requestedVariant = id(source.activeVariant, 'Default')
  // Parent variants are validated by the context-aware resolver, after serialization.
  const activeVariant = requestedVariant === 'Default' || Object.prototype.hasOwnProperty.call(variants,requestedVariant) || parent ? requestedVariant : 'Default'
  return { format: 'nova-resource', version: 1, id: id(source.id, name), name, kind, parent, data: parent ? normalizeOverrideData(kind, source.data) : normalizeData(kind, source.data), variants, activeVariant }
}
/** 按模板 `${JSON.stringify(normalizeResource(value), null, 2)}\n` 生成并返回字符串。 */ export function serializeResource(value: unknown): string { return `${JSON.stringify(normalizeResource(value), null, 2)}\n` }
/** 结构说明（自动提取）：resourceRecord；输入 referenceValue、assets；直接调用 toLowerCase、replace、assets.find。 */ export function resourceRecord<T extends RuntimeResourceRecord>(referenceValue:string|null|undefined,assets:readonly T[]):T|null{ return resolveRuntimeResourceRecord(referenceValue, assets) }
/** 结构说明（自动提取）：readResourceFromAssets；输入 referenceValue、assets；直接调用 resourceRecord、assetSourceText、JSON.parse、kinds.includes、reference 等。 */ export function readResourceFromAssets(referenceValue:string|null|undefined,assets:readonly RuntimeResourceRecord[]):NovaResourceDocument|null{
  const asset=resourceRecord(referenceValue,assets)
  if(!asset||asset.assetType!=='resource')return null
  try{const source=assetSourceText(asset);if(!source)return null;const parsed=JSON.parse(source)
    if(parsed?.format!=='nova-resource'||parsed.version!==1||!kinds.includes(parsed.kind)||parsed.parent!=null&&!reference(parsed.parent))return null
    return normalizeResource(parsed)
  }catch{return null}
}

/** 结构说明（自动提取）：deepMerge；输入 base、override；直接调用 structuredClone、Object.entries、Object.prototype.hasOwnProperty.call、Object.defineProperty、Array.isArray 等；返回路径包含 output；包含循环处理。 */ function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const output = structuredClone(base)
  for (const [key, value] of Object.entries(override)) { const previous=Object.prototype.hasOwnProperty.call(output,key)?output[key]:undefined; Object.defineProperty(output,key,{value:value&&typeof value==='object'&&!Array.isArray(value)&&previous&&typeof previous==='object'&&!Array.isArray(previous)?deepMerge(previous as Record<string,unknown>,value as Record<string,unknown>):structuredClone(value),enumerable:true,writable:true,configurable:true}) }
  return output
}
/** 结构说明（自动提取）：resolveResourceFromAssets；输入 referenceValue、assets、variantName；直接调用 Set、resourceRecord、visited.has、visited.add、chain.push 等；写入 currentReference、resolved；包含循环处理。 */ export function resolveResourceFromAssets(referenceValue: string | null | undefined, assets:readonly RuntimeResourceRecord[], variantName?: string): ResolvedResource | null {
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
/** 结构说明（自动提取）：resourceVariantNames；输入 value、assets；直接调用 Set、Object.keys、resourceRecord、seen.has、seen.add 等；写入 parent；包含循环处理。 */ export function resourceVariantNames(value: NovaResourceDocument | null | undefined, assets:readonly RuntimeResourceRecord[]): string[] { const names=new Set(Object.keys(value?.variants??{})),seen=new Set<string>();let parent=value?.parent;while(parent&&seen.size<64){const record=resourceRecord(parent,assets);if(!record||seen.has(record.uuid))break;seen.add(record.uuid);const resource=readResourceFromAssets(record.uuid,assets);if(!resource||resource.kind!==value?.kind)break;Object.keys(resource.variants??{}).forEach(/* 调用 names.add(name) 并返回调用结果。 */ name=>names.add(name));parent=resource.parent}return ['Default', ...[...names].sort()] }
/** 结构说明（自动提取）：setResourceVariantData；输入 value、name、data；直接调用 slice、id、Error、normalizeResource、Object.prototype.hasOwnProperty.call 等；包含显式抛错路径。 */ export function setResourceVariantData(value: NovaResourceDocument, name: string, data: unknown): NovaResourceDocument {
  const safeName = id(name, '').slice(0,80)
  if (!safeName || safeName === 'Default') throw new Error('RESOURCE_VARIANT_NAME: Choose a unique named variant.')
  const normalized = normalizeResource(value)
  if(!Object.prototype.hasOwnProperty.call(normalized.variants??{},safeName)&&Object.keys(normalized.variants??{}).length>=128)throw new Error('RESOURCE_VARIANT_LIMIT: A Resource supports at most 128 local variants.')
  const variants = { ...(normalized.variants ?? {}), [safeName]: normalizeOverrideData(normalized.kind, data) }
  return normalizeResource({ ...normalized, variants, activeVariant: safeName })
}
/** 结构说明（自动提取）：validateResourceProject；输入 assets；直接调用 sort、assets.filter、readResourceFromAssets、issues.push、resolveResourceFromAssets；返回路径包含 issues；包含循环处理。 */ export function validateResourceProject(assets: readonly RuntimeResourceRecord[]): ResourceIssue[] {
  const issues: ResourceIssue[] = []
  for (const asset of assets.filter(/* 比较 candidate.assetType 与 'resource'，返回严格相等的判断结果。 */ candidate => candidate.assetType === 'resource').sort(/* 调用 a.uuid.localeCompare(b.uuid) 并返回调用结果。 */ (a, b) => a.uuid.localeCompare(b.uuid))) {
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
/** No second catalog/Owner: each operation captures one actual readonly list from the bound resource source. */
export function createRuntimeResourceReader(resources:RuntimeResourceReadSource) {
  if(!resources||typeof resources.listIdentities!=='function')throw new Error('RUNTIME_RESOURCE_READER_REQUIRED: Supply the actual resource catalog.')
  const list=resources.listIdentities.bind(resources)
  const records=():readonly RuntimeResourceRecord[]=>{const value=list();if(!Array.isArray(value))throw new Error('RUNTIME_RESOURCE_RECORDS_REQUIRED: Supply a readonly record array.');return value}
  return Object.freeze({
    read:(reference:string|null|undefined)=>readResourceFromAssets(reference,records()),
    resolve:(reference:string|null|undefined,variant?:string)=>resolveResourceFromAssets(reference,records(),variant),
    variantNames:(value:NovaResourceDocument|null|undefined)=>resourceVariantNames(value,records()),
    validate:()=>validateResourceProject(records())
  })
}
