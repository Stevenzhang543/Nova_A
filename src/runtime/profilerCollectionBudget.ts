/** Diagnostic collection admission only. UTF16 accounting is an estimate, not measured heap usage. */
export const SCRIPT_PROFILE_MAX_ENTRIES = 4096
export const SCRIPT_PROFILE_MAX_METADATA_BYTES = 2 * 1024 * 1024
export const SCRIPT_PROFILE_RECORD_ESTIMATE_BYTES = 128
export const SCRIPT_PROFILE_DISPLAY_LIMIT = 2000

export interface ScriptProfileCollectionEvidence {
  readonly schema: 'nova-script-profile-collection-v1'
  readonly maxEntries: number
  readonly maxEstimatedMetadataBytes: number
  readonly recordEstimateBytes: number
  readonly admittedEntries: number
  readonly estimatedMetadataBytes: number
  readonly rejectedCalls: number
  readonly rejectedCallsSaturated: boolean
  readonly revision: number
  readonly displayLimit: number
  readonly collectionTruncated: boolean
  readonly displayTruncated: boolean
  readonly rankingScope: 'admitted-set'
}

export function incrementScriptProfileCounter(value: number): number { return value < Number.MAX_SAFE_INTEGER ? value + 1 : Number.MAX_SAFE_INTEGER }

/** Count the key and the strings actually stored on the first admitted record, without truncating them. */
export function scriptProfileMetadataEstimate(key: string, scriptUuid: string, scriptName: string, functionName: string): number {
  return SCRIPT_PROFILE_RECORD_ESTIMATE_BYTES + 2 * (key.length + scriptUuid.length + scriptName.length + functionName.length)
}

export function createProfilerCollectionBudget(options: { maxEntries?: number; maxEstimatedMetadataBytes?: number } = {}) {
  const maxEntries = options.maxEntries ?? SCRIPT_PROFILE_MAX_ENTRIES
  const maxEstimatedMetadataBytes = options.maxEstimatedMetadataBytes ?? SCRIPT_PROFILE_MAX_METADATA_BYTES
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 0 || maxEntries > SCRIPT_PROFILE_MAX_ENTRIES
    || !Number.isSafeInteger(maxEstimatedMetadataBytes) || maxEstimatedMetadataBytes < 0 || maxEstimatedMetadataBytes > SCRIPT_PROFILE_MAX_METADATA_BYTES) throw new RangeError('Invalid bounded script profile collection budget')
  let admittedEntries = 0, estimatedMetadataBytes = 0, rejectedCalls = 0, rejectedCallsSaturated = false, revision = 0
  const publish = (): Readonly<ScriptProfileCollectionEvidence> => Object.freeze({
    schema: 'nova-script-profile-collection-v1', maxEntries, maxEstimatedMetadataBytes, recordEstimateBytes: SCRIPT_PROFILE_RECORD_ESTIMATE_BYTES,
    admittedEntries, estimatedMetadataBytes, rejectedCalls, rejectedCallsSaturated, revision, displayLimit: SCRIPT_PROFILE_DISPLAY_LIMIT,
    collectionTruncated: rejectedCalls > 0, displayTruncated: admittedEntries > SCRIPT_PROFILE_DISPLAY_LIMIT, rankingScope: 'admitted-set'
  })
  let snapshot = publish()
  const canAdmit = (weight: number): boolean => Number.isSafeInteger(weight) && weight >= SCRIPT_PROFILE_RECORD_ESTIMATE_BYTES
    && admittedEntries < maxEntries && weight <= maxEstimatedMetadataBytes - estimatedMetadataBytes
  return {
    get snapshot(): Readonly<ScriptProfileCollectionEvidence> { return snapshot },
    canAdmit,
    admit(weight: number): Readonly<ScriptProfileCollectionEvidence> {
      if (!canAdmit(weight)) throw new RangeError('Script profile collection admission exceeds its budget')
      admittedEntries++; estimatedMetadataBytes += weight; revision = incrementScriptProfileCounter(revision)
      return snapshot = publish()
    },
    reject(): Readonly<ScriptProfileCollectionEvidence> {
      if (rejectedCalls === Number.MAX_SAFE_INTEGER && rejectedCallsSaturated) return snapshot
      rejectedCallsSaturated = rejectedCalls === Number.MAX_SAFE_INTEGER
      rejectedCalls = incrementScriptProfileCounter(rejectedCalls); revision = incrementScriptProfileCounter(revision)
      return snapshot = publish()
    },
    clear(): Readonly<ScriptProfileCollectionEvidence> {
      admittedEntries = 0; estimatedMetadataBytes = 0; rejectedCalls = 0; rejectedCallsSaturated = false
      revision = incrementScriptProfileCounter(revision)
      return snapshot = publish()
    }
  }
}

/** Old or malformed evidence stays unknown; do not trust capture flags or promote missing values to zero. */
export function readScriptProfileCollectionEvidence(value: unknown): Readonly<ScriptProfileCollectionEvidence> | null {
  if (!value || typeof value !== 'object') return null
  const fields = ['schema', 'maxEntries', 'maxEstimatedMetadataBytes', 'recordEstimateBytes', 'admittedEntries', 'estimatedMetadataBytes', 'rejectedCalls', 'rejectedCallsSaturated', 'revision', 'displayLimit', 'collectionTruncated', 'displayTruncated', 'rankingScope'] as const
  const data: Record<string, unknown> = {}
  for (const key of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !('value' in descriptor)) return null
    data[key] = descriptor.value
  }
  const nonnegative = (key: string): number | null => typeof data[key] === 'number' && Number.isSafeInteger(data[key]) && (data[key] as number) >= 0 ? data[key] as number : null
  const maxEntries = nonnegative('maxEntries'), maxBytes = nonnegative('maxEstimatedMetadataBytes'), entries = nonnegative('admittedEntries'), bytes = nonnegative('estimatedMetadataBytes'), rejected = nonnegative('rejectedCalls'), revision = nonnegative('revision')
  if (data.schema !== 'nova-script-profile-collection-v1' || data.rankingScope !== 'admitted-set'
    || maxEntries === null || maxEntries > SCRIPT_PROFILE_MAX_ENTRIES || maxBytes === null || maxBytes > SCRIPT_PROFILE_MAX_METADATA_BYTES
    || entries === null || entries > maxEntries || bytes === null || bytes > maxBytes || bytes < entries * SCRIPT_PROFILE_RECORD_ESTIMATE_BYTES
    || entries === 0 && bytes !== 0 || rejected === null || revision === null
    || data.recordEstimateBytes !== SCRIPT_PROFILE_RECORD_ESTIMATE_BYTES || data.displayLimit !== SCRIPT_PROFILE_DISPLAY_LIMIT
    || typeof data.rejectedCallsSaturated !== 'boolean' || data.rejectedCallsSaturated && rejected !== Number.MAX_SAFE_INTEGER
    || data.collectionTruncated !== (rejected > 0) || data.displayTruncated !== (entries > SCRIPT_PROFILE_DISPLAY_LIMIT)) return null
  return Object.freeze(data) as unknown as Readonly<ScriptProfileCollectionEvidence>
}
