import assert from 'node:assert/strict'
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), before = process.argv.includes('--before')
const reportOverride = process.argv.find(value => value.startsWith('--report='))?.slice('--report='.length)
const temporary = await mkdtemp(join(tmpdir(), 'nova-debug-counter-')), checks = [], observations = []
const point = { id: 'id', line: 3, functionName: 'update', condition: '', hitCondition: 2, logMessage: '', enabled: true, hitCount: 0 }
const check = (name, operation) => { operation(); checks.push(name) }
let passed = false
try {
  const entry = join(temporary, 'entry.ts')
  await writeFile(entry, `export { BoundedScriptDebugCounterOwner } from '${join(root, 'src/runtime/scriptDebugCounterOwner.ts').replaceAll('\\', '/')}';`)
  await build({ configFile: false, root, logLevel: 'error', build: { ssr: true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'owner.mjs', inlineDynamicImports: true } } } })
  const { BoundedScriptDebugCounterOwner } = await import(pathToFileURL(join(temporary, 'owner.mjs')).href)
  const owner = new BoundedScriptDebugCounterOwner(), session = owner.openSession(1)
  const old = session.prepareHit('script', 'source', 0, point), renamed = session.prepareHit('script', 'source', 0, { ...point, id: 'renamed' })
  assert.equal(old.status, 'prepared'); assert.equal(renamed.status, 'prepared')
  const oldResult = session.consumeHit(old.token)
  observations.push({ scope: 'accepted-ID-replacement-old-token', result: oldResult, points: owner.diagnostics.points })
  const bounded = new BoundedScriptDebugCounterOwner({ maxMetadataBytes: 130 }), budget = bounded.openSession(1)
  const escaped = budget.prepareHit('\\'.repeat(8), 'source', 0, point)
  observations.push({ scope: 'key-encoding-budget', result: escaped, diagnostics: { ...bounded.diagnostics } })
  if (before) {
    check('confirmed-ID-replacement-left-old-token-accepted', () => { assert.equal(oldResult.status, 'recorded'); assert.equal(owner.diagnostics.points, 2) })
    check('confirmed-escaped-key-was-not-counted-in-byte-budget', () => assert.equal(escaped.status, 'prepared'))
  } else {
    check('accepted-ID-replacement-revokes-old-token-without-extra-slot', () => { assert.equal(oldResult.reason, 'stale-hit-token'); assert.equal(session.consumeHit(renamed.token).hitCount, 1); assert.equal(owner.diagnostics.points, 1) })
    check('encoded-key-byte-budget-refuses-before-admitting-state', () => { assert.equal(escaped.reason, 'debug-metadata-byte-capacity'); assert.equal(bounded.diagnostics.points, 0); assert.equal(bounded.diagnostics.metadataBytes, 0) })
    const deleted = session.prepareHit('script', 'source', 0, { ...point, id: 'removed' }), reused = session.prepareHit('script', 'source', 0, { ...point, id: 'replacement' })
    check('deleted-point-index-reuse-rejects-prior-identity', () => { assert.equal(session.consumeHit(deleted.token).reason, 'stale-hit-token'); assert.equal(session.consumeHit(reused.token).hitCount, 1); assert.equal(owner.diagnostics.points, 1) })
    const duplicate = session.prepareHit('script', 'source', 0, { ...point, id: 'replacement' }), newest = session.prepareHit('script', 'source', 0, { ...point, id: 'replacement' })
    check('repeated-prepare-replaces-token-and-retains-accepted-hit-count', () => { assert.equal(session.consumeHit(duplicate.token).reason, 'stale-hit-token'); assert.equal(session.consumeHit(newest.token).hitCount, 2) })
    const other = session.prepareHit('other', 'source', 0, point); session.consumeHit(other.token)
    const changed = session.prepareHit('script', 'source', 0, { ...point, id: 'next' }); session.consumeHit(changed.token)
    const retained = session.prepareHit('other', 'source', 0, point)
    check('point-replacement-does-not-evict-other-script-count', () => assert.equal(session.consumeHit(retained.token).hitCount, 2))
    const huge = budget.prepareHit('\\'.repeat(100_000), 'source', 0, point)
    check('encoding-input-is-bounded-before-key-allocation', () => { assert.equal(huge.reason, 'debug-metadata-byte-capacity'); assert.equal(bounded.diagnostics.points, 0) })
    const key = JSON.stringify(['a', 0]), smallPoint = { ...point, id: 'b', functionName: '' }, exact = new BoundedScriptDebugCounterOwner({ maxMetadataBytes: 96 + 2 * (1 + 1) + key.length * 2 }), exactSession = exact.openSession(1)
    const accepted = exactSession.prepareHit('a', 'source', 0, smallPoint)
    check('actual-key-UTF16-and-fixed-record-accounting-matches-budget', () => { assert.equal(accepted.status, 'prepared'); assert.equal(exact.diagnostics.metadataBytes, 96 + 4 + key.length * 2) })
  }
  passed = true
} finally {
  const directory = join(root, '.cache/engine-runtime'); await mkdir(directory, { recursive: true })
  const hashes = {}
  for (const file of ['src/runtime/scriptDebugCounterOwner.ts', 'scripts/verify-engine-runtime-debug-counter-boundaries.mjs']) hashes[file] = createHash('sha256').update(await readFile(join(root, file))).digest('hex')
  const reportPath = reportOverride ? join(root, reportOverride) : join(directory, `debug-counter-boundaries-${before ? 'before' : 'after'}.json`)
  await mkdir(dirname(reportPath), { recursive: true })
  await writeFile(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), status: passed ? before ? 'CONFIRMED_DEFECT' : 'passed' : 'failed', checks, observations, sourceHashes: hashes, scope: 'Actual production counter Owner; synchronous prepare/consume, semantic byte budget, not exact JS heap size or full Player debugger.' }, null, 2))
  await rm(temporary, { recursive: true, force: true })
  console.log(`Debug counter boundaries ${before ? 'before' : 'after'}: ${checks.length} checks ${passed ? 'completed' : 'failed'}`)
}
