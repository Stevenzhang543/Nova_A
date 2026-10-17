/** Immutable, explicitly prepared per-project resource reads. No global catalog or loading lifecycle. */
import { createRuntimeAssetIndex, runtimeAssetGuid, resolveRuntimeAssetGuid, resolveRuntimeModuleAsset, resolveRuntimeResourceRecord, readRuntimeScriptText, runtimeAssetSourceText } from './runtimeAssetValues'
import type { RuntimeAssetSourceView } from './runtimeAssetValues'
import type { GameplayScriptServices, ScriptResource } from './scriptServices'

export interface RuntimeCatalogRecord extends ScriptResource, RuntimeAssetSourceView {}
export type CatalogReadonly<T> = T extends readonly (infer U)[] ? readonly CatalogReadonly<U>[] : T extends object ? { readonly [K in keyof T]: CatalogReadonly<T[K]> } : T

/** Accept only trusted prepared plain-data records. This is not a Proxy/getter or binary-buffer freezing API. */
function clonePlainCatalogValue(value: unknown, ancestors = new WeakSet<object>()): unknown {
  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'object') throw new Error('RUNTIME_CATALOG_RECORD_INVALID: Only finite plain-data values are supported.')
  const array = Array.isArray(value), prototype = Object.getPrototypeOf(value)
  if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) throw new Error('RUNTIME_CATALOG_RECORD_INVALID: Binary buffers and class instances are unsupported.')
  if (ancestors.has(value)) throw new Error('RUNTIME_CATALOG_RECORD_INVALID: Cyclic records are unsupported.')
  ancestors.add(value)
  try {
    const target: Record<string, unknown> | unknown[] = array ? [] : Object.create(prototype)
    const descriptors = Object.getOwnPropertyDescriptors(value)
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== 'string') throw new Error('RUNTIME_CATALOG_RECORD_INVALID: Symbol keys are unsupported.')
      if (array && key === 'length') continue
      const descriptor = descriptors[key]
      if (!('value' in descriptor) || !descriptor.enumerable) throw new Error('RUNTIME_CATALOG_RECORD_INVALID: Accessors and hidden fields are unsupported.')
      if (array && !/^(0|[1-9][0-9]*)$/.test(key)) throw new Error('RUNTIME_CATALOG_RECORD_INVALID: Only plain array indexes are supported.')
      Object.defineProperty(target, key, { value: clonePlainCatalogValue(descriptor.value, ancestors), enumerable: true, writable: false, configurable: false })
    }
    if (array) {
      const length = descriptors.length.value as number
      if (Object.keys(target).length !== length) throw new Error('RUNTIME_CATALOG_RECORD_INVALID: Sparse arrays are unsupported.')
    }
    return Object.freeze(target)
  } finally { ancestors.delete(value) }
}

export class RuntimeProjectCatalog<T extends RuntimeCatalogRecord = RuntimeCatalogRecord> {
  readonly projectId: string
  readonly catalogRevision: number
  readonly #records: readonly CatalogReadonly<T>[]
  readonly #byUuid: ReadonlyMap<string, CatalogReadonly<T>>

  constructor(records: readonly T[], options: { projectId: string; revision: number }) {
    if (!options || typeof options.projectId !== 'string' || !options.projectId || !Number.isSafeInteger(options.revision) || options.revision < 0 || !Array.isArray(records)) throw new Error('RUNTIME_CATALOG_REQUIRED: Supply explicit prepared project records and revision.')
    const owned = clonePlainCatalogValue(records) as readonly CatalogReadonly<T>[]
    for (const record of owned) if (!record || ['uuid', 'path', 'name', 'source', 'assetType', 'mimeType'].some(key => typeof (record as unknown as Record<string, unknown>)[key] !== 'string')) throw new Error('RUNTIME_CATALOG_RECORD_INVALID: Record identity and source fields must be strings.')
    this.projectId = options.projectId; this.catalogRevision = options.revision; this.#records = owned
    this.#byUuid = createRuntimeAssetIndex(owned).byUuid
    Object.freeze(this)
  }

  resolveAsset(reference: string | null | undefined): CatalogReadonly<T> | null { return resolveRuntimeAssetGuid(runtimeAssetGuid(reference) ?? reference, this.#byUuid) }
  resolveModuleAsset(reference: string) { return resolveRuntimeModuleAsset(reference, value => this.resolveAsset(value), this.#records) }
  resolveResourceRecord(reference: string | null | undefined): CatalogReadonly<T> | null { return resolveRuntimeResourceRecord(reference, this.#records) }
  readSource(reference: string | null | undefined): string | null { return readRuntimeScriptText(this.resolveAsset(reference)) }
  readDependencyText(reference: string | null | undefined): string | null { const record = this.resolveAsset(reference); return record ? runtimeAssetSourceText(record) : null }
  revision(): number { return this.catalogRevision }
  listIdentities(): readonly CatalogReadonly<T>[] { return this.#records }
  createScriptServices(compileVisual: (source: string) => string): GameplayScriptServices {
    if (typeof compileVisual !== 'function') throw new Error('SCRIPT_SERVICES_REQUIRED: Supply the real visual compiler capability.')
    return Object.freeze({
      resolveAsset: (reference: string | null | undefined) => this.resolveAsset(reference),
      resolveModuleAsset: (reference: string) => this.resolveModuleAsset(reference),
      readSource: (reference: string | null | undefined) => this.readSource(reference),
      revision: () => this.revision(), listIdentities: () => this.listIdentities(), compileVisual
    })
  }
}
