import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sceneOwnerFixture, validateSceneOwnerComposition, canonicalSelected, createQualifiedSceneSourceReader } from './lib/sceneOwnerSourceProjection.mjs'

const option = (name, fallback) => {
  const prefix = `--${name}=`
  const item = process.argv.slice(2).find(value => value.startsWith(prefix))
  if (item) return item.slice(prefix.length)
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}
const sourceRoot = resolve(option('source-root', resolve(dirname(fileURLToPath(import.meta.url)), '..')))
const reportDir = resolve(option('report-dir', '.cache/engine-overhaul/scene-owner-contract'))
const expectStage = option('expect-stage', 'after')
if (!['before', 'after'].includes(expectStage)) throw new Error('SCENE_EXPECT_STAGE_INVALID')
mkdirSync(reportDir, { recursive: true })
const reportPath = resolve(reportDir, 'report.json')
if (existsSync(reportPath)) throw new Error('SCENE_REPORT_EXISTS: use a fresh report directory')
const sha = source => createHash('sha256').update(source, 'utf8').digest('hex')
const actualRead = path => {
  try { return readFileSync(resolve(sourceRoot, path), 'utf8') }
  catch (error) { if (error.code === 'ENOENT') return undefined; throw error }
}
const initial = new Map(sceneOwnerFixture.files.map(row => [row.path, actualRead(row.path)]))
const readInitial = path => initial.has(path) ? initial.get(path) : actualRead(path)
const existing = sceneOwnerFixture.files.filter(row => row.beforeSha256 !== null)
const added = sceneOwnerFixture.files.filter(row => row.beforeSha256 === null)
const checks = []
function check(name, fn) {
  try { const details = fn(); checks.push({ name, status: 'PASS', ...(details === undefined ? {} : { details }) }) }
  catch (error) { checks.push({ name, status: 'FAIL', error: error.stack ?? String(error) }) }
}
function modified(path, value) {
  return candidate => candidate === path ? value : readInitial(candidate)
}
function throws(fn) { assert.throws(fn, /SCENE_/) }

check('Actual complete group has the requested stage and exact 7 existing / 6 new paths', () => {
  const q = validateSceneOwnerComposition(actualRead)
  assert.equal(q.stage, expectStage); assert.equal(q.files.length, 13)
  assert.equal(existing.length, 7); assert.equal(added.length, 6)
  return q
})
check('All seven actual existing files canonicalize to complete original before bytes', () => {
  for (const row of existing) {
    const result = canonicalSelected(row.path, actualRead(row.path), actualRead)
    assert.equal(result, row.beforeSource); assert.equal(sha(result), row.beforeSha256)
  }
})
check('All six new actual modules have their exact after hash or are genuinely absent before', () => {
  for (const row of added) {
    const source = actualRead(row.path)
    if (expectStage === 'before') assert.equal(source, undefined)
    else { assert.equal(sha(source), row.afterSha256); assert.equal(canonicalSelected(row.path, source, actualRead), source) }
  }
})
check('Qualified reader requires the complete after group', () => {
  if (expectStage === 'before') throws(() => createQualifiedSceneSourceReader(actualRead))
  else {
    const qualified = createQualifiedSceneSourceReader(actualRead)
    for (const row of existing) assert.equal(qualified(row.path), row.beforeSource)
    for (const row of added) assert.equal(sha(qualified(row.path)), row.afterSha256)
  }
})
check('Missing existing files reject in every path', () => {
  for (const row of existing) throws(() => validateSceneOwnerComposition(modified(row.path, undefined)))
  return { negativeCases: existing.length }
})
check('Mutation of every actual existing file rejects', () => {
  for (const row of existing) throws(() => validateSceneOwnerComposition(modified(row.path, readInitial(row.path) + '\n// mutated linked body\n')))
  return { negativeCases: existing.length }
})
check('Missing new files after / solitary new modules before reject', () => {
  for (const row of added) {
    const value = expectStage === 'after' ? undefined : '// an unqualified solitary module\n'
    throws(() => validateSceneOwnerComposition(modified(row.path, value)))
  }
  return { negativeCases: added.length }
})
check('All new modules reject mutation instead of trusting names or paths', () => {
  for (const row of added) throws(() => validateSceneOwnerComposition(modified(row.path, (readInitial(row.path) ?? '') + '\n// mutated owner body\n')))
  return { negativeCases: added.length }
})
check('Before and after mixing cannot be qualified', () => {
  const target = existing[0]
  const other = expectStage === 'after' ? target.beforeSource : target.afterSource
  throws(() => validateSceneOwnerComposition(modified(target.path, other)))
})
check('Selected source mutation rejects even when all linked files are correct', () => {
  for (const row of existing) throws(() => canonicalSelected(row.path, readInitial(row.path) + '\n// unknown selected body\n', readInitial))
  return { negativeCases: existing.length }
})
check('Default selected / linked level is strict; no historical fallback', () => {
  for (const row of existing) {
    const other = expectStage === 'after' ? row.beforeSource : row.afterSource
    throws(() => canonicalSelected(row.path, other, readInitial))
  }
  return { negativeCases: existing.length }
})
check('Explicit allowQualifiedBefore permits only the exact old seven bytes after full after proof', () => {
  for (const row of existing) {
    if (expectStage === 'after') assert.equal(canonicalSelected(row.path, row.beforeSource, readInitial, true), row.beforeSource)
    else throws(() => canonicalSelected(row.path, row.afterSource, readInitial, true))
  }
})
check('Explicit allowQualifiedBefore never permits unknown earlier text', () => {
  for (const row of existing) throws(() => canonicalSelected(row.path, row.beforeSource + '\n// unknown earlier revision\n', readInitial, true))
  return { negativeCases: existing.length }
})
check('Explicit allowQualifiedBefore cannot hide a corrupted or missing linked owner', () => {
  const selected = existing[0]
  for (const row of added) {
    if (expectStage === 'after') throws(() => canonicalSelected(selected.path, selected.beforeSource, modified(row.path, undefined), true))
    else throws(() => canonicalSelected(selected.path, selected.beforeSource, modified(row.path, '// half migration\n'), true))
  }
  return { negativeCases: added.length }
})
check('Qualified reader refuses later linked mutation or downgrade', () => {
  if (expectStage === 'before') { throws(() => createQualifiedSceneSourceReader(readInitial)); return }
  let changed = false
  const target = added[0]
  const liveRead = path => changed && path === target.path ? undefined : readInitial(path)
  const qualified = createQualifiedSceneSourceReader(liveRead)
  assert.equal(qualified(existing[0].path), existing[0].beforeSource)
  changed = true
  throws(() => qualified(existing[0].path))
  throws(() => qualified('src/runtime/GameplayRuntimeCore.ts'))
})
check('Linked reader must be explicit and return only string or absent', () => {
  throws(() => validateSceneOwnerComposition(undefined))
  throws(() => validateSceneOwnerComposition(modified(existing[0].path, null)))
  throws(() => validateSceneOwnerComposition(modified(existing[0].path, Buffer.from('not a source string'))))
})
check('Unowned selected text is an identity projection without a broader historical allowlist', () => {
  const original = actualRead('src/runtime/GameplayRuntimeCore.ts')
  assert.equal(typeof original, 'string')
  assert.equal(canonicalSelected('src/runtime/GameplayRuntimeCore.ts', original, readInitial), original)
  if (expectStage === 'after') assert.equal(createQualifiedSceneSourceReader(readInitial)('src/runtime/GameplayRuntimeCore.ts'), original)
})
check('Terminal actual thirteen source hashes remain identical', () => {
  for (const row of sceneOwnerFixture.files) assert.equal(actualRead(row.path), initial.get(row.path))
  return { checked: 13, changes: [] }
})

const result = {
  schema: 'nova-scene-owner-contract-report-v1', createdAt: new Date().toISOString(),
  sourceRoot, expectedStage: expectStage, buildId: null, sourceHash: null,
  scope: 'Actual source qualification and strict source projection; no runtime execution substitution',
  sourceQualification: checks[0].status === 'PASS' ? checks[0].details : null,
  checks, pass: checks.filter(item => item.status === 'PASS').length, fail: checks.filter(item => item.status === 'FAIL').length,
  allPassed: checks.every(item => item.status === 'PASS'),
  limitations: sceneOwnerFixture.limitations,
  cleanup: { ownServers: 0, ownBrowsers: 0, ownWorkers: 0, ownWorlds: 0, ownVMs: 0, ownedTimers: 0, ownedListeners: 0 },
}
writeFileSync(reportPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ reportPath, pass: result.pass, fail: result.fail, expectedStage: expectStage }))
if (!result.allPassed) process.exitCode = 1
