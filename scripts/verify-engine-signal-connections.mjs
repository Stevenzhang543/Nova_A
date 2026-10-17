/** 节点信号连接模型：复用脚本资源的 signalConnections，不新建第二套派发模型。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const checks = []
async function test(name, run) {
  try { await run(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error && error.message || error) }); console.error('FAIL ' + name + ' :: ' + (error && error.message || error)) }
}

const opened = await openMediaAuditModules({ repository: process.cwd(), bases: [process.cwd()] }, { connections: 'editor/signalConnections' })
const { addNodeSignalConnection, removeNodeSignalConnection, validateNodeSignalConnection, nodeConnectionsFor, connectionCountForSignal } = opened.modules.connections
const source = fs.readFileSync('src/editor/signalConnections.ts', 'utf8')

const input = (/** 构造一条连接输入。 */ over) => ({ signal: 'area.entered', source: 'uuid-a', target: 'uuid-b', callback: 'on_area_enter', ...over })

await test('A valid connection is appended with enabled true', () => {
  const asset = {}
  assert.equal(addNodeSignalConnection(asset, input()), null)
  assert.equal(asset.script.signalConnections.length, 1)
  assert.deepEqual(asset.script.signalConnections[0], { signal: 'area.entered', source: 'uuid-a', target: 'uuid-b', callback: 'on_area_enter', enabled: true })
})

await test('Duplicate connections are rejected instead of silently stacked', () => {
  const asset = {}
  assert.equal(addNodeSignalConnection(asset, input()), null)
  assert.equal(addNodeSignalConnection(asset, input()), 'duplicate')
  assert.equal(asset.script.signalConnections.length, 1, 'a duplicate must not create a second row')
  assert.equal(addNodeSignalConnection(asset, input({ callback: 'on_other' })), null, 'a different callback is a distinct connection')
})

await test('Validation rejects malformed input with a specific reason', () => {
  assert.equal(validateNodeSignalConnection(input({ signal: '   ' })), 'invalid-signal')
  assert.equal(validateNodeSignalConnection(input({ source: '' })), 'invalid-source')
  assert.equal(validateNodeSignalConnection(input({ target: '' })), 'invalid-target')
  assert.equal(validateNodeSignalConnection(input({ callback: '1notAnIdentifier' })), 'invalid-callback')
  assert.equal(validateNodeSignalConnection(input({ callback: 'has space' })), 'invalid-callback')
  assert.equal(validateNodeSignalConnection(input({ signal: 'x'.repeat(129) })), 'invalid-signal')
  const asset = {}
  assert.equal(addNodeSignalConnection(asset, input({ callback: '9bad' })), 'invalid-callback')
  assert.equal(asset.script, undefined, 'a rejected input must not create or mutate the script structure at all')
})

await test('Removing a connection is index checked', () => {
  const asset = {}
  addNodeSignalConnection(asset, input()); addNodeSignalConnection(asset, input({ callback: 'second' }))
  assert.equal(removeNodeSignalConnection(asset, 0), true)
  assert.equal(asset.script.signalConnections.length, 1)
  assert.equal(asset.script.signalConnections[0].callback, 'second')
  assert.equal(removeNodeSignalConnection(asset, 5), false)
  assert.equal(removeNodeSignalConnection({}, 0), false)
})

await test('Lookups are scoped to the receiving object', () => {
  const asset = {}
  addNodeSignalConnection(asset, input({ target: 'uuid-b', signal: 'area.entered' }))
  addNodeSignalConnection(asset, input({ target: 'uuid-c', signal: 'area.exited' }))
  assert.deepEqual(nodeConnectionsFor(asset, 'uuid-b').map(/** 取信号名。 */ c => c.signal), ['area.entered'])
  assert.equal(nodeConnectionsFor(asset, 'uuid-z').length, 0)
  assert.equal(connectionCountForSignal(asset, 'area.entered'), 1)
  assert.equal(connectionCountForSignal(asset, 'no.such.signal'), 0)
})

await test('This module reuses the runtime model instead of introducing a second dispatcher', () => {
  assert.ok(source.includes('signalConnections'), 'the module must write the existing connection array')
  // Strip comments first: the module documents which owner performs dispatching, so scanning prose
  // would flag the very explanation that keeps the boundary honest.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(/** 去掉行注释。 */ line => line.replace(/\/\/.*$/, '')).join('\n')
  assert.ok(!/emitSignal|dispatchSignals|on_signal/.test(code), 'the module must not implement dispatching itself')
  const runtime = fs.readFileSync('src/runtime/GameplayRuntimeCore.ts', 'utf8')
  assert.ok(runtime.includes('signalConnections'), 'the runtime must remain the single dispatch owner')
})

const out = 'reports/phase2/signal-connections.json'
fs.mkdirSync('reports/phase2', { recursive: true })
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), checks, status: checks.some(/** 任一失败即整体失败。 */ c => c.status === 'failed') ? 'failed' : 'passed' }, null, 2) + '\n')
console.log('signal connections report -> ' + out)
if (checks.some(/** 任一失败即非零退出。 */ c => c.status === 'failed')) process.exitCode = 1
