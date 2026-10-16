/** C04 相关：信号队列的顺序、序号与**可观测**丢弃语义。
 * 主指令 §5.3 要求可靠边缘不得静默丢弃；本测试把"丢弃可被计数与定位"固化为契约。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const checks = []
async function test(name, run) {
  try { await run(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error && error.message || error) }); console.error('FAIL ' + name + ' :: ' + (error && error.message || error)) }
}

const opened = await openMediaAuditModules({ repository: process.cwd(), bases: [process.cwd()] }, { queue: 'runtime/signalQueue' })
const { SignalQueue } = opened.modules.queue
const entry = (/** 构造一条最小信号条目。 */ name, target = '') => ({ name, payload: null, target, source: 'test', deliveredCallbacks: [] })
const core = fs.readFileSync('src/runtime/GameplayRuntimeCore.ts', 'utf8').replaceAll('\r\n', '\n')

await test('Draining preserves enqueue order and assigns monotonic sequence numbers', () => {
  const queue = new SignalQueue()
  const names = ['a', 'b', 'c', 'd']
  const sequences = names.map(/** 入队并记录分配到的序号。 */ name => queue.enqueue(entry(name)).sequence)
  assert.deepEqual(sequences, [1, 2, 3, 4], 'sequence numbers must start at 1 and increase by one')
  assert.deepEqual(queue.drain().map(/** 取信号名以比较顺序。 */ s => s.name), names, 'drain must preserve enqueue order')
  assert.equal(queue.stats().depth, 0, 'draining must empty the queue')
})

await test('Overflow drops the oldest entries and records how many and which range', () => {
  const queue = new SignalQueue(4)
  for (let i = 1; i <= 7; i++) queue.enqueue(entry('s' + i))
  const stats = queue.stats()
  assert.equal(stats.emitted, 7)
  assert.equal(stats.dropped, 3, 'three oldest entries must be dropped')
  assert.deepEqual(stats.droppedRange, { from: 1, to: 3 }, 'the dropped sequence range must be recorded')
  assert.equal(stats.depth, 4, 'the queue must stay at its limit')
  assert.deepEqual(queue.drain().map(/** 取信号名以比较顺序。 */ s => s.name), ['s4', 's5', 's6', 's7'], 'the newest entries must survive')
})

await test('Overflow episodes are counted separately from dropped signals', () => {
  const queue = new SignalQueue(2)
  queue.enqueue(entry('a')); queue.enqueue(entry('b'))
  queue.drain()
  queue.enqueue(entry('c')); queue.enqueue(entry('d')); queue.enqueue(entry('e'))
  queue.drain()
  queue.enqueue(entry('f')); queue.enqueue(entry('g')); queue.enqueue(entry('h'))
  const stats = queue.stats()
  assert.equal(stats.dropped, 2, 'two signals were dropped in total')
  assert.equal(stats.overflowEpisodes, 2, 'each overflowing enqueue counts as one episode')
})

await test('Dropping by target removes only that target and never touches counters', () => {
  const queue = new SignalQueue()
  queue.enqueue(entry('a', 'u1')); queue.enqueue(entry('b', 'u2')); queue.enqueue(entry('c', 'u1'))
  const removed = queue.dropTarget('u1')
  assert.equal(removed, 2, 'both signals addressed to u1 must be removed')
  assert.deepEqual(queue.drain().map(/** 取信号名以比较顺序。 */ s => s.name), ['b'], 'the other target must survive')
  const stats = queue.stats()
  assert.equal(stats.emitted, 3, 'emitted must still count everything ever enqueued')
  assert.equal(stats.dropped, 0, 'target removal is not an overflow drop')
})

await test('Clearing empties the queue but keeps cumulative accounting', () => {
  const queue = new SignalQueue()
  queue.enqueue(entry('a')); queue.drain(); queue.enqueue(entry('b'))
  queue.clear()
  const stats = queue.stats()
  assert.equal(stats.depth, 0, 'clear must empty the queue')
  assert.equal(stats.emitted, 2, 'emitted must survive a clear')
  assert.equal(stats.dispatched, 1, 'dispatched must survive a clear')
  assert.equal(stats.lastSequence, 2, 'the sequence must not rewind, so later orders stay comparable')
})

await test('An invalid limit is rejected instead of silently unbounded', () => {
  assert.throws(/** 非正整数上限必须报错。 */ () => new SignalQueue(0), /positive integer/)
  assert.throws(/** 非整数上限必须报错。 */ () => new SignalQueue(1.5), /positive integer/)
})

await test('The runtime uses the queue instead of a raw array with a silent drop', () => {
  assert.ok(core.includes('new SignalQueue()'), 'the runtime must own a SignalQueue')
  assert.ok(core.includes('this.signalQueue.enqueue('), 'emitSignal must enqueue through the queue')
  assert.ok(core.includes('const batch = this.signalQueue.drain()'), 'dispatch must drain the queue')
  assert.ok(core.includes('this.signalQueue.dropTarget(entity.uuid)'), 'entity removal must go through dropTarget')
  assert.ok(!core.includes('this.pendingSignals'), 'the raw pending array must be gone')
  assert.ok(core.includes('signalQueueStats()'), 'the drop accounting must be reachable for diagnostics')
})

const out = process.env.NOVA_SIGNAL_QUEUE_REPORT || 'reports/phase2/signal-queue.json'
fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true })
fs.writeFileSync(out, JSON.stringify({
  generatedAt: new Date().toISOString(),
  covers: ['enqueue order', 'monotonic sequence', 'bounded overflow with recorded range', 'overflow episodes', 'target removal', 'clear semantics', 'limit validation', 'runtime wiring'],
  notCovered: ['signal parameter schema', 'persistent connection identity', 'same-phase dispatch ordering against real scripts'],
  checks,
  status: checks.some(/** 任一失败即整体失败。 */ c => c.status === 'failed') ? 'failed' : 'passed',
}, null, 2) + '\n')
console.log('signal queue report -> ' + out)
if (checks.some(/** 任一失败即非零退出。 */ c => c.status === 'failed')) process.exitCode = 1
