/** Explicit entry requirements. This module does not guess assets from scripts or reparse resource documents. */
import type { AssetRecord } from './runtimeAssetRecordContracts'
import type { RuntimeProjectCatalog } from './runtimeProjectCatalog'

export interface RuntimeMediaClock { nowMilliseconds(): number }
export interface RuntimeMediaRequirementLimits { maximumReferences: number; maximumReferenceBytes: number }
export interface RuntimeSceneMediaRequirementInput {
  catalogIdentity: object
  revision: number
  entry: { identity: object; sceneUuid: string; verification: 'caller-verified'; images: readonly string[]; fonts: readonly string[] }
  dynamic: {
    coverage: 'verified-none' | 'verified-declarations' | 'unverified'
    declarations: readonly { sourceAsset: string; images: readonly string[]; fonts: readonly string[] }[]
    unresolved: readonly string[]
  }
}
export interface RuntimeSceneMediaRequirements {
  readonly catalogIdentity: object
  readonly revision: number
  readonly clockIdentity: RuntimeMediaClock
  readonly entryIdentity: object
  readonly sceneUuid: string
  readonly status: 'PREPARED' | 'NOT_READY'
  readonly unresolved: readonly string[]
  readonly scope: 'CALLER_VERIFIED_ENTRY_AND_DYNAMIC_DECLARATIONS'
  readonly mediaPlan: Readonly<{ catalogIdentity: object; revision: number; images: readonly string[]; fonts: readonly string[]; atlas: boolean }>
  readonly atlasScope: 'ORIGINAL_CATALOG'
  readonly atlasImageCount: number
  readonly costs: Readonly<{ preparationWallMs: number | null; startedAtMs: number | null; referenceBytes: number; referenceCount: number; actualDecodedBytes: null }>
}
const prepared = new WeakSet<object>()
const stamp = (clock: RuntimeMediaClock): number | null => { const value = clock.nowMilliseconds(); return Number.isFinite(value) && value >= 0 ? value : null }

/** Limits are an explicit caller admission policy, not new PAK-v1 or asset-format limits. */
export function prepareRuntimeSceneMediaRequirements(catalog: RuntimeProjectCatalog<AssetRecord>, input: RuntimeSceneMediaRequirementInput, limits: RuntimeMediaRequirementLimits, clock: RuntimeMediaClock): RuntimeSceneMediaRequirements {
  if (!catalog || typeof catalog.listIdentities !== 'function' || typeof catalog.resolveAsset !== 'function' || !clock || typeof clock.nowMilliseconds !== 'function') throw new Error('RUNTIME_MEDIA_REQUIREMENT_PORTS_REQUIRED')
  const startedAtMs = stamp(clock)
  if (!limits || !Number.isSafeInteger(limits.maximumReferences) || limits.maximumReferences < 1 || !Number.isSafeInteger(limits.maximumReferenceBytes) || limits.maximumReferenceBytes < 1) throw new Error('RUNTIME_MEDIA_REQUIREMENT_LIMITS_REQUIRED')
  if (!input || input.catalogIdentity !== catalog || input.revision !== catalog.revision()) throw new Error('RUNTIME_MEDIA_REQUIREMENT_CATALOG_MISMATCH')
  if (!input.entry?.identity || typeof input.entry.identity !== 'object' || !input.entry.sceneUuid || input.entry.verification !== 'caller-verified' || !Array.isArray(input.entry.images) || !Array.isArray(input.entry.fonts)) throw new Error('RUNTIME_MEDIA_ENTRY_VERIFICATION_REQUIRED')
  const dynamic = input.dynamic
  if (!dynamic || !['verified-none', 'verified-declarations', 'unverified'].includes(dynamic.coverage) || !Array.isArray(dynamic.declarations) || !Array.isArray(dynamic.unresolved)) throw new Error('RUNTIME_MEDIA_DYNAMIC_COVERAGE_REQUIRED')
  if (dynamic.coverage === 'verified-none' && dynamic.declarations.length) throw new Error('RUNTIME_MEDIA_DYNAMIC_DECLARATION_CONFLICT')
  if (dynamic.coverage === 'verified-declarations' && !dynamic.declarations.length) throw new Error('RUNTIME_MEDIA_DYNAMIC_DECLARATIONS_REQUIRED')
  const encoder = new TextEncoder(), images = new Set<string>(), fonts = new Set<string>(), unresolved: string[] = []
  let referenceCount = 0, referenceBytes = 0
  const text = (value: string): string => {
    if (typeof value !== 'string' || !value) throw new Error('RUNTIME_MEDIA_REQUIREMENT_REFERENCE_INVALID')
    if (++referenceCount > limits.maximumReferences || value.length > limits.maximumReferenceBytes - referenceBytes) throw new Error('RUNTIME_MEDIA_REQUIREMENT_BUDGET')
    referenceBytes += encoder.encode(value).byteLength
    if (referenceBytes > limits.maximumReferenceBytes) throw new Error('RUNTIME_MEDIA_REQUIREMENT_BUDGET')
    return value
  }
  text(input.entry.sceneUuid)
  const include = (references: readonly string[], kind: 'image' | 'font', into: Set<string>) => {
    if (!Array.isArray(references)) throw new Error('RUNTIME_MEDIA_REQUIREMENT_LIST_INVALID')
    if (references.length > limits.maximumReferences - referenceCount) throw new Error('RUNTIME_MEDIA_REQUIREMENT_BUDGET')
    for (const reference of references) { const record = catalog.resolveAsset(text(reference)); if (!record || record.assetType !== kind) throw new Error('RUNTIME_MEDIA_REQUIRED_' + kind.toUpperCase() + '_MISSING'); into.add('asset://' + record.uuid) }
  }
  include(input.entry.images, 'image', images); include(input.entry.fonts, 'font', fonts)
  if (dynamic.declarations.length > limits.maximumReferences - referenceCount || dynamic.unresolved.length > limits.maximumReferences - referenceCount) throw new Error('RUNTIME_MEDIA_REQUIREMENT_BUDGET')
  for (const declaration of dynamic.declarations) {
    if (!declaration || !catalog.resolveAsset(text(declaration.sourceAsset))) throw new Error('RUNTIME_MEDIA_DYNAMIC_SOURCE_MISSING')
    include(declaration.images, 'image', images); include(declaration.fonts, 'font', fonts)
  }
  for (const reason of dynamic.unresolved) unresolved.push(text(reason))
  if (dynamic.coverage === 'unverified') unresolved.push('DYNAMIC_MEDIA_COVERAGE_NOT_VERIFIED')
  // Preserve the original atlas scope. Entry-critical lists do not relabel the entire Catalog critical.
  const atlasImageCount = catalog.listIdentities().filter(record => record.assetType === 'image' && record.settings.atlas).length
  const endedAtMs = stamp(clock)
  const result: RuntimeSceneMediaRequirements = Object.freeze({ catalogIdentity: catalog, revision: input.revision, clockIdentity: clock, entryIdentity: input.entry.identity, sceneUuid: input.entry.sceneUuid, status: unresolved.length ? 'NOT_READY' : 'PREPARED', unresolved: Object.freeze(unresolved), scope: 'CALLER_VERIFIED_ENTRY_AND_DYNAMIC_DECLARATIONS', mediaPlan: Object.freeze({ catalogIdentity: catalog, revision: input.revision, images: Object.freeze([...images]), fonts: Object.freeze([...fonts]), atlas: atlasImageCount > 0 }), atlasScope: 'ORIGINAL_CATALOG', atlasImageCount, costs: Object.freeze({ preparationWallMs: startedAtMs === null || endedAtMs === null || endedAtMs < startedAtMs ? null : endedAtMs - startedAtMs, startedAtMs, referenceBytes, referenceCount, actualDecodedBytes: null }) })
  prepared.add(result); return result
}

/** Prevent forged or foreign plans from bypassing the explicit preparation boundary. */
export function assertRuntimeSceneMediaRequirements(value: RuntimeSceneMediaRequirements, catalog: RuntimeProjectCatalog<AssetRecord>, clock: RuntimeMediaClock): void {
  if (!value || !prepared.has(value) || value.catalogIdentity !== catalog || value.revision !== catalog.revision() || value.clockIdentity !== clock) throw new Error('RUNTIME_MEDIA_REQUIREMENTS_FOREIGN_OR_UNPREPARED')
}
