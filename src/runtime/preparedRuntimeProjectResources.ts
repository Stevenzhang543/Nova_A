/** Explicit CPU metadata/catalog preparation; not a media/GPU Ready barrier. */
import type { PreparedRuntimeProjectValues } from './runtimeProjectLoader'
import { prepareRuntimeAssetRecords } from './runtimeAssetPreparation'
import type { RuntimeAssetPreparationCapabilities } from './runtimeAssetPreparation'
import { RuntimeProjectCatalog } from './runtimeProjectCatalog'

export interface RuntimeResourcePreparationLimits {
  maximumRecords: number
  maximumMetadataValues: number
  maximumDepth: number
  maximumTextBytes: number
}

/** New caller policy; it does not reinterpret a PAK-v1 protocol limit or source AssetRecord mathematics. */
function admitRuntimeAssetValues(value: unknown, limits: RuntimeResourcePreparationLimits): void {
  if (!limits || [limits.maximumRecords, limits.maximumMetadataValues, limits.maximumDepth, limits.maximumTextBytes].some(item => !Number.isSafeInteger(item) || item < 1)) throw new Error('RUNTIME_ASSET_LIMITS_REQUIRED: Supply four positive finite caller budgets.')
  if (Array.isArray(value) && value.length > limits.maximumRecords) throw new Error('RUNTIME_ASSET_RECORD_LIMIT: Resource count exceeds the caller budget.')
  const pending = [{ value, depth: 0 }], visited = new WeakSet<object>(), encoder = new TextEncoder()
  let count = 0, bytes = 0
  while (pending.length) {
    const current = pending.pop()!
    if (++count > limits.maximumMetadataValues || current.depth > limits.maximumDepth) throw new Error('RUNTIME_ASSET_METADATA_LIMIT: Resource metadata exceeds the caller budget.')
    if (typeof current.value === 'string') {
      if (current.value.length > limits.maximumTextBytes - bytes) throw new Error('RUNTIME_ASSET_TEXT_LIMIT: Resource text exceeds the caller budget.')
      for (let offset = 0; offset < current.value.length;) {
        let end = Math.min(current.value.length, offset + 4096)
        if (end < current.value.length && /[\uD800-\uDBFF]/.test(current.value[end - 1]) && /[\uDC00-\uDFFF]/.test(current.value[end])) end--
        bytes += encoder.encode(current.value.slice(offset, end)).byteLength
        if (bytes > limits.maximumTextBytes) throw new Error('RUNTIME_ASSET_TEXT_LIMIT: Resource text exceeds the caller budget.')
        offset = end
      }
    } else if (typeof current.value === 'number') {
      if (!Number.isFinite(current.value)) throw new Error('RUNTIME_ASSET_VALUE_INVALID: Only finite persisted data is supported.')
    } else if (current.value && typeof current.value === 'object') {
      const array = Array.isArray(current.value), prototype = Object.getPrototypeOf(current.value)
      if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) throw new Error('RUNTIME_ASSET_VALUE_INVALID: Only JSON-like records are supported.')
      if (visited.has(current.value)) throw new Error('RUNTIME_ASSET_VALUE_INVALID: Cyclic or shared mutable input is unsupported.')
      visited.add(current.value)
      const descriptors = Object.getOwnPropertyDescriptors(current.value)
      const arrayLength = Array.isArray(current.value) ? current.value.length : 0
      if (array && Object.keys(descriptors).length - 1 !== arrayLength) throw new Error('RUNTIME_ASSET_VALUE_INVALID: Sparse arrays are unsupported.')
      for (const key of Reflect.ownKeys(descriptors)) {
        if (typeof key !== 'string') throw new Error('RUNTIME_ASSET_VALUE_INVALID: Symbol properties are unsupported.')
        if (array && key === 'length') continue
        const descriptor = descriptors[key]
        if (!descriptor.enumerable || !('value' in descriptor) || array && !/^(0|[1-9][0-9]*)$/.test(key)) throw new Error('RUNTIME_ASSET_VALUE_INVALID: Accessors and hidden properties are unsupported.')
        pending.push({ value: key, depth: current.depth + 1 }, { value: descriptor.value, depth: current.depth + 1 })
      }
    } else if (current.value !== null && current.value !== undefined && typeof current.value !== 'boolean') throw new Error('RUNTIME_ASSET_VALUE_INVALID: Only JSON-like records are supported.')
  }
}

export function prepareRuntimeProjectResources(prepared: PreparedRuntimeProjectValues, options: {
  projectId: string
  revision: number
  limits: RuntimeResourcePreparationLimits
  assetPreparation: RuntimeAssetPreparationCapabilities
  compileVisual(source: string): string
}) {
  if (!prepared || !prepared.project || Array.isArray(prepared.project) || typeof prepared.source !== 'string') throw new Error('RUNTIME_PROJECT_VALUES_REQUIRED: Supply the decoded/migrated project result.')
  if (!options || typeof options.compileVisual !== 'function' || typeof options.projectId !== 'string' || !options.projectId || !Number.isSafeInteger(options.revision) || options.revision < 0) throw new Error('RUNTIME_PROJECT_RESOURCE_CAPABILITIES_REQUIRED: Supply explicit project identity/revision and the actual visual compiler.')
  admitRuntimeAssetValues(prepared.project.assets, options.limits)
  const records = prepareRuntimeAssetRecords(prepared.project.assets, options.assetPreparation)
  const identities = new Set<string>()
  for (const record of records) {
    if (identities.has(record.uuid)) throw new Error('RUNTIME_ASSET_DUPLICATE_IDENTITY: Duplicate normalized resource UUID.')
    identities.add(record.uuid)
  }
  const catalog = new RuntimeProjectCatalog(records, { projectId: options.projectId, revision: options.revision })
  const scriptServices = catalog.createScriptServices(options.compileVisual.bind(options))
  return Object.freeze({ catalog, scriptServices, preparationScope: 'CPU_METADATA_AND_TEXT_CATALOG' as const })
}
