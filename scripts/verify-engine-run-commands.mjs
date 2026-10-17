/** 运行控制命令的单一实现：顺序、早退与调用集合（§22.2 一个命令一个处理器）。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const checks = []
async function test(name, run) {
  try { await run(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error && error.message || error) }); console.error('FAIL ' + name + ' :: ' + (error && error.message || error)) }
}

const opened = await openMediaAuditModules({ repository: process.cwd(), bases: [process.cwd()] }, { sequence: 'editor/runCommandSequence' })
const { executePlay, executePause, executeStep, executeStop } = opened.modules.sequence

/** 构造记录调用顺序的假端口。 */
function ports(over = {}) {
  const calls = []
  const record = (/** 记录一次调用。 */ name) => calls.push(name)
  const base = {
    ensurePhysics: async () => { record('ensurePhysics'); return true },
    preflight: () => { record('preflight'); return true },
    setPlaying: playing => { record('setPlaying:' + playing); return true },
    beginSession: () => record('beginSession'),
    stepOnce: () => record('stepOnce'),
    stopSession: () => record('stopSession'),
    stopPlayMode: () => record('stopPlayMode'),
    playMode: () => 'editing',
    text: key => key,
    report: status => record('report:' + status),
    log: message => record('log:' + message),
  }
  return { calls, ports: { ...base, ...over } }
}

await test('Play runs readiness and preflight before starting the session', async () => {
  const { calls, ports: p } = ports()
  assert.equal(await executePlay(p), true)
  assert.deepEqual(calls, ['ensurePhysics', 'preflight', 'setPlaying:true', 'beginSession', 'report:physicsRunning', 'log:physicsRunning'])
})

await test('Play aborts before touching the session when readiness or preflight fails', async () => {
  const notReady = ports({ ensurePhysics: async () => false })
  assert.equal(await executePlay(notReady.ports), false)
  assert.deepEqual(notReady.calls, [], 'readiness failure must not emit any call')
  const badPreflight = ports({ preflight: () => { badPreflight.calls.push('preflight'); return false } })
  assert.equal(await executePlay(badPreflight.ports), false)
  assert.deepEqual(badPreflight.calls, ['ensurePhysics', 'preflight'], 'preflight failure must not start a session')
  const rejected = ports({ setPlaying: () => false })
  assert.equal(await executePlay(rejected.ports), false)
  assert.ok(!rejected.calls.includes('beginSession'), 'a rejected toggle must not begin a session')
})

await test('Pause only toggles and reports, never runs preflight', async () => {
  const { calls, ports: p } = ports()
  assert.equal(executePause(p), true)
  assert.deepEqual(calls, ['setPlaying:false', 'report:physicsPaused', 'log:runtimePaused'])
})

await test('Step boots and pauses a session only from the editing mode', async () => {
  const editing = ports()
  assert.equal(await executeStep(editing.ports), true)
  assert.deepEqual(editing.calls, ['ensurePhysics', 'preflight', 'setPlaying:true', 'setPlaying:false', 'stepOnce', 'report:physicsStepped', 'log:physicsStepped'])
  const paused = ports({ playMode: () => 'paused' })
  assert.equal(await executeStep(paused.ports), true)
  assert.ok(!paused.calls.some(/** 已暂停时不应再切换播放状态。 */ call => call.startsWith('setPlaying')), 'stepping while paused must not toggle play mode')
})

await test('Stop ends the session before leaving play mode', async () => {
  const { calls, ports: p } = ports()
  assert.equal(executeStop(p), true)
  assert.deepEqual(calls, ['stopSession', 'stopPlayMode', 'report:simulationRestored', 'log:simulationRestored'])
})

await test('The UI surfaces delegate to this module instead of re-implementing the sequence', () => {
  for (const file of ['src/components/ActionBar.vue', 'src/components/CommandPalette.vue', 'src/components/ProfilerPanel.vue']) {
    const source = fs.readFileSync(file, 'utf8')
    assert.ok(source.includes("editor/runCommands") || source.includes("./runCommands"),
      file + ' must use the shared run commands')
  }
})

const out = 'reports/phase2/run-commands.json'
fs.mkdirSync('reports/phase2', { recursive: true })
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), checks, status: checks.some(/** 任一失败即整体失败。 */ c => c.status === 'failed') ? 'failed' : 'passed' }, null, 2) + '\n')
console.log('run commands report -> ' + out)
if (checks.some(/** 任一失败即非零退出。 */ c => c.status === 'failed')) process.exitCode = 1
