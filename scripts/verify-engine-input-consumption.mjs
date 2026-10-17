/** 输入消费台账：序号 → 消费 tick → 首次受影响 packet 的身份绑定（主指令 §26.4）。
 * 并守护"不重复实现 receipt→submit 测量"这一边界。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const checks = []
async function test(name, run) {
  try { await run(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error && error.message || error) }); console.error('FAIL ' + name + ' :: ' + (error && error.message || error)) }
}

const opened = await openMediaAuditModules({ repository: process.cwd(), bases: [process.cwd()] }, { ledger: 'runtime/inputConsumption' })
const { InputConsumptionLedger } = opened.modules.ledger
const ledgerSource = fs.readFileSync('src/runtime/inputConsumption.ts', 'utf8')
const observabilitySource = fs.readFileSync('src/runtime/performance/observability.ts', 'utf8')

await test('Tracking is idempotent and keeps the first record', () => {
  const ledger = new InputConsumptionLedger()
  assert.equal(ledger.track(1, 1), true)
  assert.equal(ledger.track(1, 1), false, 'a duplicate identity must not create a second record')
  assert.equal(ledger.stats().tracked, 1)
  assert.equal(ledger.get(1, 1).consumedTick, null)
})

await test('Only the FIRST consuming tick counts, so catch-up steps cannot rewrite it', () => {
  const ledger = new InputConsumptionLedger()
  ledger.track(1, 7)
  assert.equal(ledger.markConsumed(1, 7, 10), true, 'the first consuming step binds')
  assert.equal(ledger.markConsumed(1, 7, 11), false, 'a catch-up step must not move the consumption tick')
  assert.equal(ledger.get(1, 7).consumedTick, 10)
})

await test('Only the FIRST affected packet counts as the response', () => {
  const ledger = new InputConsumptionLedger()
  ledger.track(1, 3); ledger.markConsumed(1, 3, 5)
  assert.equal(ledger.markFirstAffectedPacket(1, 3, 900), true)
  assert.equal(ledger.markFirstAffectedPacket(1, 3, 901), false, 'a later packet must not replace the response identity')
  assert.equal(ledger.get(1, 3).firstAffectedPacket, 900)
})

await test('A packet cannot be bound before the input was consumed', () => {
  const ledger = new InputConsumptionLedger()
  ledger.track(1, 4)
  assert.equal(ledger.markFirstAffectedPacket(1, 4, 1), false, 'binding before consumption must be rejected')
  assert.equal(ledger.get(1, 4).firstAffectedPacket, null)
})

await test('Invalid identities and values are ignored instead of creating records', () => {
  const ledger = new InputConsumptionLedger()
  assert.equal(ledger.track(0, 1), false, 'epoch 0 is not a valid identity')
  assert.equal(ledger.track(1, 0), false, 'sequence 0 is not a valid identity')
  assert.equal(ledger.track(1.5, 1), false, 'a fractional epoch is not a valid identity')
  assert.equal(ledger.track(1, 2), true)
  assert.equal(ledger.markConsumed(1, 2, -1), false, 'a negative tick must be rejected')
  assert.equal(ledger.markConsumed(1, 2, 1.5), false, 'a fractional tick must be rejected')
  assert.equal(ledger.markConsumed(9, 9, 1), false, 'an unknown identity must not create a record')
  assert.equal(ledger.stats().tracked, 1)
})

await test('Retention is bounded while the cumulative counter keeps counting', () => {
  const ledger = new InputConsumptionLedger()
  for (let i = 1; i <= 700; i++) ledger.track(1, i)
  const stats = ledger.stats()
  assert.equal(stats.tracked, 700)
  assert.ok(stats.retained <= 512, 'records must be bounded, saw ' + stats.retained)
  assert.equal(ledger.get(1, 1), undefined, 'the oldest record must be evicted')
  assert.ok(ledger.get(1, 700), 'the newest record must survive')
})

await test('Pending reports consumed input that never reached a packet', () => {
  const ledger = new InputConsumptionLedger()
  ledger.track(1, 1); ledger.track(1, 2); ledger.track(1, 3)
  ledger.markConsumed(1, 1, 1); ledger.markFirstAffectedPacket(1, 1, 10)
  ledger.markConsumed(1, 2, 1)
  const pending = ledger.pending()
  assert.deepEqual(pending.map(/** 取序号以比较内容。 */ r => r.sequence), [2], 'only consumed but unaffected input is pending')
  assert.equal(ledger.stats().pending, 1)
  assert.equal(ledger.stats().affected, 1)
  assert.equal(ledger.stats().consumed, 2)
})

await test('Clearing keeps the cumulative counter', () => {
  const ledger = new InputConsumptionLedger()
  ledger.track(1, 1); ledger.track(1, 2); ledger.markConsumed(1, 2, 1)
  ledger.clear()
  assert.equal(ledger.stats().retained, 0)
  assert.equal(ledger.stats().tracked, 2, 'tracked must survive a clear')
  assert.equal(ledger.pending().length, 0)
})

await test('This ledger does not duplicate the existing receipt-to-submit measurement', () => {
  // Strip comments first: the module documents the boundary it must not cross, so scanning the
  // prose would flag the very explanation that keeps the boundary honest.
  const code = ledgerSource
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(/** 去掉行注释，只保留可执行代码。 */ line => line.replace(/\/\/.*$/, '')).join('\n')
  assert.ok(!/Ms\b|latency|percentile|hrtime|performance\.now/i.test(code),
    'the ledger must not compute latency; FrameObservability already owns that measurement')
  assert.ok(!/inputToSubmitMs/.test(code), 'the ledger must not restate the existing metric name')
  assert.ok(/observability/.test(ledgerSource), 'the module must document which owner already covers latency')
  assert.ok(observabilitySource.includes('inputToSubmitMs'), 'the existing metric must remain owned by observability')
  assert.ok(observabilitySource.includes('A timestamp alone cannot prove'), 'the existing proof-of-containment comment must remain')
  assert.ok(ledgerSource.includes('(inputEpoch, sequence)'.replace(/[()]/g, '')) || ledgerSource.includes('inputEpoch + '),
    'the ledger must reuse the existing identity pair rather than inventing its own numbering')
})

await test('The runtime wires the ledger and uses a real fixed-step number as the tick', () => {
  const core = fs.readFileSync('src/runtime/GameplayRuntimeCore.ts', 'utf8').replaceAll('\r\n', '\n')
  assert.ok(core.includes('new InputConsumptionLedger()'), 'the runtime must own the ledger')
  assert.ok(core.includes('this.inputConsumption.track(receipt.inputEpoch, receipt.sequence)'), 'receipts must be tracked')
  assert.ok(core.includes('this.fixedStepSequence += 1'), 'a real fixed-step counter must exist')
  assert.ok(/for \(const receipt of observedSample\.receipts\) this\.inputConsumption\.markConsumed\([^)]*this\.fixedStepSequence\)/.test(core),
    'consumption must be recorded with the fixed-step number, not the render frame')
  assert.ok(!/markConsumed\([^)]*this\.time\.value\.frame\)/.test(core),
    'the render frame counter must not be passed off as the consumption tick')
  assert.ok(core.includes('bindConsumedInputToPacket('), 'the host must be able to bind the first affected packet')
  assert.ok(core.includes('this.inputConsumption.clear()'), 'a session reset must clear the ledger')
})

await test('The chain closes at the real submission site with a stable packet identity', () => {
  const canvas = fs.readFileSync('src/components/WorldCanvas.vue', 'utf8').replaceAll('\r\n', '\n')
  const perf = fs.readFileSync('src/runtime/largeWorldPerformance.ts', 'utf8').replaceAll('\r\n', '\n')
  assert.ok(/const packet = markPerformanceSubmission\(/.test(canvas), 'the submission ordinal must be captured at the real submission site')
  assert.ok(canvas.includes('gameplayRuntime.bindConsumedInputToPacket(packet)'), 'the submission site must bind the affected packet')
  assert.ok(canvas.indexOf('markPerformanceSubmission(') < canvas.indexOf('bindConsumedInputToPacket(packet)'),
    'binding must happen after the submission is accepted')
  assert.ok(/: number \{ frameObservability\.submission\(/.test(perf), 'the submission marker must return the ordinal from the observability owner')
  assert.ok(perf.includes('frameObservability.submissionOrdinal()'), 'the ordinal must come from the observability owner')
})

const out = process.env.NOVA_INPUT_CONSUMPTION_REPORT || 'reports/phase2/input-consumption.json'
fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true })
fs.writeFileSync(out, JSON.stringify({
  generatedAt: new Date().toISOString(),
  covers: ['idempotent tracking', 'first consuming tick wins', 'first affected packet wins', 'ordering constraint', 'invalid identity rejection', 'bounded retention', 'pending backlog', 'non-duplication of latency measurement'],
  notCovered: ['real end-to-end display latency, which no CPU timestamp can establish', 'multi-step catch-up attribution beyond the first consuming step', 'whether a submission actually contained the affected pixels, which only a real renderer run can show'],
  checks,
  status: checks.some(/** 任一失败即整体失败。 */ c => c.status === 'failed') ? 'failed' : 'passed',
}, null, 2) + '\n')
console.log('input consumption report -> ' + out)
if (checks.some(/** 任一失败即非零退出。 */ c => c.status === 'failed')) process.exitCode = 1
