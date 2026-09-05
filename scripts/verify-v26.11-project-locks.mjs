import assert from 'node:assert/strict'
import { build } from 'vite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const temporary = await mkdtemp(join(tmpdir(), 'nova-v2611-project-locks-'))
const storage = new Map(), checks = []
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) }
const check = (id, run) => { try { run(); checks.push({ id, status: 'passed' }) } catch (error) { checks.push({ id, status: 'failed', error: error.message }) } }
const hide = (surface, persisted = false) => { const event = new Event('pagehide'); Object.defineProperty(event, 'persisted', { value: persisted }); surface.dispatchEvent(event) }
let instance = 0

try {
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: join(temporary, 'compiled'), rollupOptions: { input: join(root, 'src/runtime/teamWorkflow.ts'), output: { entryFileNames: 'team.mjs' } } } })
  const editor = async () => {
    const surface = new EventTarget(); globalThis.window = surface
    const module = await import(`${pathToFileURL(join(temporary, 'compiled', 'team.mjs'))}?editor=${instance++}`)
    return { surface, module }
  }
  const first = await editor(), project = 'reload-fixture', key = `nova_a.project_lock.${project}`
  check('initial editor acquires project lease', () => assert.equal(first.module.acquireProjectLock(project, 'First editor'), true))
  check('normal pagehide releases exact owned lease before reload', () => { hide(first.surface); assert.equal(storage.has(key), false) })
  const reloaded = await editor()
  check('fresh module after reload can reopen writable', () => { assert.equal(reloaded.module.inspectProjectLock(project).locked, false); assert.equal(reloaded.module.acquireProjectLock(project, 'Reloaded editor'), true) })
  const token = reloaded.module.teamWorkflowState.lockToken
  const other = await editor()
  check('another editor remains blocked by active lease', () => { assert.equal(other.module.inspectProjectLock(project).locked, true); assert.equal(other.module.acquireProjectLock(project, 'Other editor'), false); assert.equal(JSON.parse(storage.get(key)).token, token) })
  check('unrelated project release does not lose current ownership', () => { reloaded.module.releaseProjectLock('different-project'); assert.equal(reloaded.module.teamWorkflowState.lockToken, token); assert.equal(JSON.parse(storage.get(key)).token, token) })
  check('BFCache pagehide keeps ownership for the frozen document', () => { hide(reloaded.surface, true); assert.equal(JSON.parse(storage.get(key)).token, token) })
  check('non-owner pagehide cannot release another editor lease', () => { hide(other.surface); assert.equal(JSON.parse(storage.get(key)).token, token) })
  check('owned pagehide releases after BFCache restoration', () => { hide(reloaded.surface); assert.equal(storage.has(key), false) })
  const stale = await editor()
  stale.module.acquireProjectLock(project, 'Stale editor')
  const replacement = { token: 'replacement-token', owner: 'New owner', createdAt: Date.now(), expiresAt: Date.now() + 120_000 }
  storage.set(key, JSON.stringify(replacement))
  check('stale owner cannot remove a replacement lease on pagehide', () => { hide(stale.surface); assert.deepEqual(JSON.parse(storage.get(key)), replacement) })
  check('expired foreign lease can still be acquired', () => { storage.set(key, JSON.stringify({ ...replacement, expiresAt: Date.now() - 1 })); assert.equal(other.module.acquireProjectLock(project, 'Other editor'), true) })
  check('switching projects releases the previous owned lease', () => { assert.equal(other.module.acquireProjectLock('next-project', 'Other editor'), true); assert.equal(storage.has(key), false); assert.equal(other.module.inspectProjectLock('next-project').locked, false) })
  check('blocked switch preserves current project ownership', () => { storage.set(key, JSON.stringify(replacement)); const current = other.module.teamWorkflowState.lockToken; assert.equal(other.module.acquireProjectLock(project, 'Other editor'), false); assert.equal(other.module.teamWorkflowState.lockToken, current); assert.equal(JSON.parse(storage.get('nova_a.project_lock.next-project')).token, current) })
  check('unreadable lease is never removed during owned-page cleanup', () => { storage.set('nova_a.project_lock.next-project', '{malformed'); hide(other.surface); assert.equal(storage.get('nova_a.project_lock.next-project'), '{malformed') })
  const report = { release: '26.11', status: checks.some(item => item.status === 'failed') ? 'failed' : 'passed', coverage: 'Production lease module with shared storage and separate page lifecycle event targets; actual browser reload is a separate UI check.', checks }
  await mkdir(join(root, 'release-audits'), { recursive: true })
  await writeFile(join(root, 'release-audits/v26.11-project-locks.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
  if (report.status === 'failed') process.exitCode = 1
} finally {
  // Remove only the exact temporary directory returned by mkdtemp.
  await rm(temporary, { recursive: true, force: true })
}
