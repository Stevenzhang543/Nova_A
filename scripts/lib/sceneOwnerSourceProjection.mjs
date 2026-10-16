import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { canonicalBeforeRuntimeWorldAdoption } from './runtimeWorldAdoptionSourceProjection.mjs'

export const sceneOwnerFixture = JSON.parse(readFileSync(new URL('../fixtures/scene-owner-composition-v1.json', import.meta.url), 'utf8'))
const rows = new Map(sceneOwnerFixture.files.map(row => [row.path, row]))
const sha = source => createHash('sha256').update(source, 'utf8').digest('hex')
const error = (code, path = '') => new Error(`${code}${path ? ': ' + path : ''}`)
// At most one exact known source per registered path. This memo stores neither
// readers nor provider qualifications. Unknown inputs are never retained.
const exactSourceMemo = new Map()

function knownDigest(row, source) {
  if (source === undefined) return null
  const cached = exactSourceMemo.get(row.path)
  if (cached?.source === source) return cached.sha256
  const digest = sha(source)
  if (digest === row.beforeSha256 || digest === row.afterSha256) exactSourceMemo.set(row.path, { source, sha256: digest })
  return digest
}

function assertReader(read) {
  if (typeof read !== 'function') throw error('SCENE_SOURCE_READER_REQUIRED')
}

function sceneUpstream(path, source, read) {
  const row = rows.get(path)
  // Preserve the original exact before13/after13 inputs; newer inputs require all eight current sources.
  if (typeof source === 'string' && (source === row?.beforeSource || source === row?.afterSource)) return source
  try { return canonicalBeforeRuntimeWorldAdoption(path, source, read) }
  catch (cause) { throw error('SCENE_UPSTREAM_QUALIFICATION_' + cause.message, path) }
}

function readGroup(read) {
  assertReader(read)
  const sources = new Map()
  const actual = []
  for (const row of sceneOwnerFixture.files) {
    const source = sceneUpstream(row.path, read(row.path), read)
    if (source !== undefined && typeof source !== 'string') throw error('SCENE_SOURCE_STRING_OR_ABSENT_REQUIRED', row.path)
    sources.set(row.path, source)
    actual.push({ path: row.path, sha256: knownDigest(row, source) })
  }
  return { sources, actual }
}

function reverseKnown(row, source) {
  if (typeof source !== 'string' || knownDigest(row, source) !== row.afterSha256) throw error('SCENE_AFTER_SOURCE_UNKNOWN', row.path)
  if (row.beforeSha256 === null) return source
  const cached = exactSourceMemo.get(row.path)
  if (cached?.source === source && cached.canonical !== undefined) return cached.canonical
  let canonical = source
  for (let index = row.steps.length - 1; index >= 0; index--) {
    const step = row.steps[index]
    if (canonical.slice(step.at, step.at + step.after.length) !== step.after) throw error('SCENE_INVERSE_STEP_MISMATCH', row.path)
    canonical = canonical.slice(0, step.at) + step.before + canonical.slice(step.at + step.after.length)
  }
  if (canonical !== row.beforeSource || sha(canonical) !== row.beforeSha256) throw error('SCENE_WHOLE_INVERSE_MISMATCH', row.path)
  exactSourceMemo.set(row.path, { source, sha256: row.afterSha256, canonical })
  return canonical
}

/** This validator accepts only the complete frozen before13 or complete after13.
 * Undefined denotes a genuinely absent new file, never an unreadable file.
 * It does not qualify runtime execution, resource readiness or a RuntimeHost.
 */
function qualifyGroup(read) {
  const { sources, actual } = readGroup(read)
  const digests = new Map(actual.map(row => [row.path, row.sha256]))
  const before = sceneOwnerFixture.files.every(row => {
    const source = sources.get(row.path)
    return row.beforeSha256 === null ? source === undefined : typeof source === 'string' && source === row.beforeSource && digests.get(row.path) === row.beforeSha256
  })
  const after = sceneOwnerFixture.files.every(row => {
    const source = sources.get(row.path)
    return typeof source === 'string' && digests.get(row.path) === row.afterSha256
  })
  if (!before && !after) {
    const rejected = actual.filter(({ path, sha256 }) => {
      const row = rows.get(path)
      return sha256 !== row.beforeSha256 && sha256 !== row.afterSha256
    })
    throw error('SCENE_GROUP_MISSING_MUTATED_OR_PARTIAL', rejected.map(row => row.path).join(', ') || 'mixed before/after stages')
  }
  const files = sceneOwnerFixture.files.map(row => {
    const source = sources.get(row.path)
    const canonical = after ? reverseKnown(row, source) : source
    return {
      path: row.path,
      actualSha256: digests.get(row.path),
      projectedSha256: canonical === undefined ? null : row.beforeSha256 ?? row.afterSha256,
      disposition: row.beforeSha256 === null ? (after ? 'NEW_ACTUAL_HASH_VALIDATED' : 'ABSENT_BEFORE') : (after ? 'WHOLE_FILE_EXACT_INVERSE' : 'EXACT_BEFORE_IDENTITY'),
    }
  })
  return { sources, result: { schema: 'nova-scene-owner-qualification-v1', stage: after ? 'after' : 'before', files, existingFiles: 7, newFiles: 6 } }
}

export function validateSceneOwnerComposition(read) {
  return qualifyGroup(read).result
}

/** Source eligibility only: the actual source must still be compiled/executed.
 * allowQualifiedBefore applies exclusively to an exact frozen existing before
 * source supplied against a complete proven after group. There is no historical
 * hash allowlist, implicit fallback, mutable registry or missing linked exemption.
 */
export function canonicalSelected(path, source, read, allowQualifiedBefore = false) {
  const row = rows.get(path)
  if (!row) return source
  return canonicalFromGroup(row, sceneUpstream(path, source, read), qualifyGroup(read), allowQualifiedBefore)
}

function canonicalFromGroup(row, source, group, allowQualifiedBefore) {
  const linked = group.sources.get(row.path)
  if (group.result.stage === 'before') {
    if (source !== linked) throw error('SCENE_SELECTED_LINKED_STAGE_MISMATCH', row.path)
    return source
  }
  if (source === linked) return reverseKnown(row, source)
  if (allowQualifiedBefore === true && row.beforeSha256 !== null && source === row.beforeSource && sha(source) === row.beforeSha256) return source
  throw error('SCENE_SELECTED_LINKED_STAGE_MISMATCH', row.path)
}

/** A qualified reader is obtainable only for the latest complete after13.
 * Every read revalidates the linked group, so a later mutation cannot use an
 * earlier qualification. New modules remain actual source, not erased modules.
 */
export function createQualifiedSceneSourceReader(read) {
  assertReader(read)
  if (validateSceneOwnerComposition(read).stage !== 'after') throw error('SCENE_COMPLETE_AFTER_REQUIRED')
  return path => {
    const group = qualifyGroup(read)
    if (group.result.stage !== 'after') throw error('SCENE_COMPLETE_AFTER_REQUIRED')
    const row = rows.get(path)
    return row ? canonicalFromGroup(row, group.sources.get(path), group, false) : read(path)
  }
}
