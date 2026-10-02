/** Real runtime save data, cancellation boundaries, and serializer snapshots. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const report = process.argv.find(arg => arg.startsWith('--report='))?.slice(9) ?? 'release-audits/v26.34-investigation/save-transactions.json'
const opened = await openMediaAuditModules({ repository: process.cwd(), bases: [process.cwd()] }, {
  physics: 'store/physics', save: 'runtime/saveGame', session: 'projects/projectSession', production: 'runtime/production'
})
const { save: saves, session: { projectSessionState }, production: { productionSettings } } = opened.modules
const data = new Map(), checks = []
let writes = 0, removals = 0, denyPrimary = false
globalThis.localStorage = {
  getItem: key => data.get(key) ?? null,
  setItem(key, value) { writes++; if (denyPrimary && !/\.(tmp|journal|backup)$/.test(key)) throw Error('Injected primary write failure'); data.set(key, String(value)) },
  removeItem(key) { removals++; data.delete(key) },
  key: index => [...data.keys()][index] ?? null,
  get length() { return data.size }
}
const primary = 'nova_a.game_save.v2:save34:slot1'
function reset() {
  data.clear(); writes = 0; removals = 0; denyPrimary = false
  projectSessionState.id = 'save34'; productionSettings.data.saveSchemaVersion = 1; productionSettings.data.saveMigrations = []
  Object.assign(saves.saveGameState, { projectId: 'save34', slot: 'slot1', values: {}, dirty: false, lastCommittedAt: null, error: '', busy: false, recoveryAvailable: false, recoverySource: '', recoveryMessage: '' })
}
function state() {
  const { projectId, slot, values, dirty, lastCommittedAt, error, recoveryAvailable, recoverySource, recoveryMessage } = saves.saveGameState
  return JSON.parse(JSON.stringify({ projectId, slot, values, dirty, lastCommittedAt, error, recoveryAvailable, recoverySource, recoveryMessage }))
}
async function test(name, run) {
  reset()
  try { await run(); checks.push({ name, status: 'passed' }); console.log(`PASS ${name}`) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error) }); console.error(`FAIL ${name}: ${error}`) }
}

try {
  await test('Structured maps preserve distinct Unicode, punctuation, and long keys through commit and reload', () => {
    const prefix = 'long'.repeat(24), expected = { '玩家': 1, '得分': 2, 'move left': 3, 'move?left': 4, [prefix + 'A']: 5, [prefix + 'B']: 6, '': 7 }
    saves.setSaveValue('settings', expected)
    assert.equal(saves.commitSaveSlot(), true); saves.saveGameState.values = {}
    assert.equal(saves.loadSaveSlot('slot1'), true); assert.deepEqual(saves.saveGameState.values.settings, expected)
  })
  await test('Prototype-looking keys remain own data without changing object prototypes', () => {
    const expected = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"prototype":7}')
    saves.setSaveValue('settings', expected); saves.setSaveValue('__proto__', { own: true })
    assert.equal(Object.prototype.polluted, undefined); assert.equal(Object.getPrototypeOf(saves.saveGameState.values), Object.prototype)
    assert.equal(Object.hasOwn(saves.saveGameState.values, '__proto__'), true)
    assert.equal(saves.commitSaveSlot(), true); saves.loadSaveSlot('slot1')
    assert.deepEqual(saves.saveGameState.values.settings, expected); assert.equal(Object.getPrototypeOf(saves.saveGameState.values.settings), Object.prototype)
    assert.equal(Object.prototype.polluted, undefined)
  })
  await test('Migrations can rename and default prototype-looking keys without losing data', () => {
    productionSettings.data.saveSchemaVersion = 2
    productionSettings.data.saveMigrations = [{ fromVersion: 1, toVersion: 2, renames: { score: '__proto__' }, defaults: JSON.parse('{"constructor":8}'), remove: [] }]
    const result = saves.migrateSaveData({ score: 4 }, 1).values
    assert.equal(Object.hasOwn(result, '__proto__'), true); assert.equal(result.__proto__, 4); assert.equal(result.constructor, 8); assert.equal(Object.getPrototypeOf(result), Object.prototype)
  })
  for (const phase of ['reading', 'validating', 'migrating']) await test(`Cancelling load at ${phase} preserves selected slot, values, metadata, storage, and custom state`, async () => {
    let restored = 0
    const unregister = saves.registerSaveSerializer('cancel', { serialize: () => ({ value: 1 }), deserialize: () => { restored++ } })
    try {
      saves.setSaveValue('score', 7); assert.equal(saves.commitSaveSlot(), true); saves.loadSaveSlot('slot2'); saves.setSaveValue('score', 99)
      const before = state(), storageBefore = [...data], writtenBefore = writes, removedBefore = removals
      const controller = new AbortController()
      await assert.rejects(saves.loadSaveSlotAsync('slot1', { signal: controller.signal, onProgress: progress => { if (progress.phase === phase) controller.abort() } }), { name: 'AbortError' })
      assert.deepEqual(state(), before); assert.deepEqual([...data], storageBefore); assert.equal(writes, writtenBefore); assert.equal(removals, removedBefore); assert.equal(restored, 0); assert.equal(saves.saveGameState.busy, false)
    } finally { unregister() }
  })
  await test('Successful async load migrates and deserializes exactly once', async () => {
    let restored = 0, value
    const unregister = saves.registerSaveSerializer('one', { serialize: () => ({ count: 3 }), deserialize: next => { restored++; value = next } })
    try {
      saves.setSaveValue('score', 7); assert.equal(saves.commitSaveSlot(), true); saves.saveGameState.values = {}
      productionSettings.data.saveSchemaVersion = 2; productionSettings.data.saveMigrations = [{ fromVersion: 1, toVersion: 2, renames: { score: 'points' }, defaults: { level: 1 }, remove: [] }]
      assert.equal(await saves.loadSaveSlotAsync('slot1'), true); assert.equal(restored, 1); assert.deepEqual(value, { count: 3 }); assert.equal(saves.saveGameState.values.points, 7); assert.equal(saves.saveGameState.values.level, 1)
    } finally { unregister() }
  })
  await test('Async commit serializes once and writes the exact validated custom snapshot', async () => {
    let serialized = 0
    const unregister = saves.registerSaveSerializer('one', { serialize: () => ({ snapshot: ++serialized }), deserialize: () => {} })
    try { assert.equal(await saves.commitSaveSlotAsync(), true); assert.equal(serialized, 1); assert.deepEqual(JSON.parse(data.get(primary)).values['_custom.one'], { snapshot: 1 }); assert.equal(saves.saveGameState.busy, false) }
    finally { unregister() }
  })
  for (const phase of ['serializing', 'validating', 'writing']) await test(`Cancelling commit at ${phase} preserves state and writes nothing`, async () => {
    saves.setSaveValue('score', 99)
    const before = state(), controller = new AbortController()
    await assert.rejects(saves.commitSaveSlotAsync('slot2', { signal: controller.signal, onProgress: progress => { if (progress.phase === phase) controller.abort() } }), { name: 'AbortError' })
    assert.deepEqual(state(), before); assert.equal(writes, 0); assert.equal(data.size, 0); assert.equal(saves.saveGameState.busy, false)
  })
  await test('Primary-write failure reports failure and preserves the last committed data', async () => {
    saves.setSaveValue('score', 7); saves.commitSaveSlot(); const previous = data.get(primary)
    saves.setSaveValue('score', 99); denyPrimary = true
    assert.equal(await saves.commitSaveSlotAsync(), false); assert.equal(data.get(primary), previous); assert.equal(saves.saveGameState.values.score, 99); assert.equal(saves.saveGameState.dirty, true); assert.match(saves.saveGameState.error, /Injected primary write failure/); assert.equal(saves.saveGameState.busy, false)
  })
  await test('Existing sanitized slot names and v2 envelope remain compatible', async () => {
    saves.setSaveValue('score', 3); assert.equal(await saves.commitSaveSlotAsync('slot 2'), true)
    assert.equal(saves.saveGameState.slot, 'slot_2'); const envelope = JSON.parse(data.get('nova_a.game_save.v2:save34:slot_2'))
    assert.equal(envelope.envelopeVersion, 2); assert.equal(envelope.projectId, 'save34'); assert.equal(envelope.slot, 'slot_2'); assert.equal(await saves.loadSaveSlotAsync('slot 2'), true); assert.equal(saves.saveGameState.values.score, 3)
  })
  await test('Project switch during async load rejects the stale result without changing new-project state', async () => {
    saves.setSaveValue('score', 7); saves.commitSaveSlot()
    const storageBefore = [...data], writtenBefore = writes, removedBefore = removals
    let switchedState
    await assert.rejects(saves.loadSaveSlotAsync('slot1', { onProgress: progress => {
      if (progress.phase === 'migrating') { projectSessionState.id = 'new-project'; saves.useSaveProject(); saves.setSaveValue('score', 99); switchedState = state() }
    } }), { name: 'AbortError' })
    assert.deepEqual(state(), switchedState); assert.deepEqual([...data], storageBefore); assert.equal(writes, writtenBefore); assert.equal(removals, removedBefore); assert.equal(saves.saveGameState.busy, false)
  })
  await test('Project switch during async commit rejects the stale snapshot without writing or changing new-project state', async () => {
    saves.setSaveValue('score', 7)
    let switchedState
    await assert.rejects(saves.commitSaveSlotAsync('slot1', { onProgress: progress => {
      if (progress.phase === 'writing') { projectSessionState.id = 'new-project'; saves.useSaveProject(); saves.setSaveValue('score', 99); switchedState = state() }
    } }), { name: 'AbortError' })
    assert.deepEqual(state(), switchedState); assert.equal(writes, 0); assert.equal(data.size, 0); assert.equal(saves.saveGameState.busy, false)
  })
} finally {
  fs.mkdirSync(path.dirname(report), { recursive: true })
  fs.writeFileSync(report, JSON.stringify({ generatedAt: new Date().toISOString(), engineVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version, status: checks.every(check => check.status === 'passed') ? 'passed' : 'failed', scope: 'Actual production save module with isolated failure-injected Web Storage; physical/browser storage certification is separate.', checks, sourceHashes: { 'src/runtime/saveGame.ts': crypto.createHash('sha256').update(fs.readFileSync('src/runtime/saveGame.ts')).digest('hex') } }, null, 2) + '\n')
  await opened.close()
}
if (checks.some(check => check.status === 'failed')) process.exitCode = 1
