import { assetReference, assetState, createTextAsset, readTextAsset, resolveAsset, updateTextAssetTransactional } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'

export type ResourceKind = 'Material' | 'AnimationLibrary' | 'InputMap' | 'PhysicsMaterial' | 'Theme' | 'DataTable'
export interface NovaResourceDocument {
  format: 'nova-resource'
  version: 1
  id: string
  name: string
  kind: ResourceKind
  parent: string | null
  data: Record<string, unknown>
}
export interface ResolvedResource extends NovaResourceDocument { chain: string[]; overrides: string[] }
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
  return Object.fromEntries(Object.keys(data).filter(key => key in complete).sort().map(key => [key, complete[key]]))
}
export function defaultResource(kind: ResourceKind, name: string = kind): NovaResourceDocument {
  return normalizeResource({ format: 'nova-resource', version: 1, id: id(name, kind), name, kind, parent: null, data: {} })
}
export function normalizeResource(value: unknown): NovaResourceDocument {
  const source = object(value), kind = kinds.includes(source.kind as ResourceKind) ? source.kind as ResourceKind : 'Material'
  const name = typeof source.name === 'string' && source.name.trim() ? source.name.trim().slice(0, 120) : kind
  const parent = reference(source.parent)
  return { format: 'nova-resource', version: 1, id: id(source.id, name), name, kind, parent, data: parent ? normalizeOverrideData(kind, source.data) : normalizeData(kind, source.data) }
}
export function serializeResource(value: unknown): string { return `${JSON.stringify(normalizeResource(value), null, 2)}\n` }
export function createResourceAsset(kind: ResourceKind, name: string = kind): AssetRecord { return createTextAsset(name, 'resource', serializeResource(defaultResource(kind, name)), `Assets/Resources/${kind === 'AnimationLibrary' ? 'Animation Libraries' : kind === 'InputMap' ? 'Input Maps' : kind === 'PhysicsMaterial' ? 'Physics Materials' : ''}`.replace(/\/$/, '')) }
export function readResource(referenceValue: string | null | undefined): NovaResourceDocument | null {
  const asset = resolveAsset(referenceValue), source = readTextAsset(referenceValue)
  if (!asset || asset.assetType !== 'resource' || !source) return null
  try { return normalizeResource(JSON.parse(source)) } catch { return null }
}
export function saveResource(referenceValue: string, resource: NovaResourceDocument): boolean { return updateTextAssetTransactional(referenceValue, serializeResource(resource)) }
export function createResourceOverride(referenceValue: string, name = 'Resource Override'): AssetRecord {
  const source = readResource(referenceValue)
  if (!source) throw new Error('RESOURCE_SOURCE_MISSING: Choose a valid Resource asset before creating an override.')
  const asset = createResourceAsset(source.kind, name)
  const document = defaultResource(source.kind, name); document.parent = referenceValue.startsWith('asset://') ? referenceValue : assetReference(referenceValue); document.data = {}
  saveResource(asset.uuid, document); return asset
}
function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const output = structuredClone(base)
  for (const [key, value] of Object.entries(override)) output[key] = value && typeof value === 'object' && !Array.isArray(value) && output[key] && typeof output[key] === 'object' && !Array.isArray(output[key]) ? deepMerge(output[key] as Record<string, unknown>, value as Record<string, unknown>) : structuredClone(value)
  return output
}
export function resolveResource(referenceValue: string | null | undefined): ResolvedResource | null {
  let currentReference = referenceValue ?? null, resolved: NovaResourceDocument | null = null
  const visited = new Set<string>(), chain: string[] = [], layers: NovaResourceDocument[] = []
  while (currentReference && layers.length < 64) {
    const asset = resolveAsset(currentReference)
    if (!asset || asset.assetType !== 'resource' || visited.has(asset.uuid)) return null
    visited.add(asset.uuid); chain.push(asset.uuid)
    const document = readResource(asset.uuid); if (!document) return null
    layers.push(document); currentReference = document.parent
  }
  if (currentReference) return null
  const localOverrides = Object.keys(layers[0]?.data ?? {}).sort()
  for (const layer of [...layers].reverse()) resolved = resolved ? { ...layer, data: deepMerge(resolved.data, layer.data) } : structuredClone(layer)
  return resolved ? { ...resolved, chain: [...chain].reverse(), overrides: localOverrides } : null
}
export function validateResourceProject(assets: AssetRecord[] = assetState.records): ResourceIssue[] {
  const issues: ResourceIssue[] = []
  for (const asset of assets.filter(candidate => candidate.assetType === 'resource').sort((a, b) => a.uuid.localeCompare(b.uuid))) {
    const document = readResource(asset.uuid)
    if (!document) { issues.push({ severity: 'error', code: 'RESOURCE_PARSE', assetUuid: asset.uuid, message: `${asset.path} is not a valid Resource asset.` }); continue }
    if (document.parent) {
      const parent = readResource(document.parent)
      if (!parent) issues.push({ severity: 'error', code: 'RESOURCE_PARENT_MISSING', assetUuid: asset.uuid, message: `${asset.path} references a missing parent Resource.` })
      else if (parent.kind !== document.kind) issues.push({ severity: 'error', code: 'RESOURCE_KIND_MISMATCH', assetUuid: asset.uuid, message: `${asset.path} cannot override ${parent.kind} with ${document.kind}.` })
    }
    if (!resolveResource(asset.uuid)) issues.push({ severity: 'error', code: 'RESOURCE_CYCLE', assetUuid: asset.uuid, message: `${asset.path} contains a missing or cyclic Resource inheritance chain.` })
  }
  return issues
}
