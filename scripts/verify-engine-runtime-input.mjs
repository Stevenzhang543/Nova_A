import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const compiled = await mkdtemp(join(tmpdir(), 'nova-engine-input-'))
const checks = []
let passed = false
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) {
  if (!(name in globalThis)) Object.defineProperty(globalThis, name, { configurable: true, value: class {} })
}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0 } })
const key = (code, repeat = false) => ({ target: null, code, key: code === 'Space' ? ' ' : code.slice(3).toLowerCase(), repeat, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false })

try {
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: join(root, 'src/runtime/input.ts'), output: { entryFileNames: 'input.mjs' } } } })
  const input = await import(pathToFileURL(join(compiled, 'input.mjs')).href)
  const action = input.createInputAction('Jump', 'button', [input.createInputBinding('physical-key', 'Space')])
  const manager = new input.InputManager()
  manager.sample([action])
  manager.onKeyDown(key('Space'))
  manager.onKeyUp(key('Space'))
  const pulse = manager.sample([action])
  assert.equal(pulse.down.Jump, false, 'a completed pulse must leave no held key')
  assert.equal(pulse.pressed.Jump, true, 'keydown then keyup between two samples must preserve the press')
  assert.equal(pulse.released.Jump, true, 'keydown then keyup between two samples must preserve the release')
  const next = manager.sample([action])
  assert.equal(next.pressed.Jump, false, 'a delivered press must not repeat on the next sample')
  assert.equal(next.released.Jump, false, 'a delivered release must not repeat on the next sample')
  checks.push('same-sample-key-pulse', 'sample-edge-single-consumption')
  assert.deepEqual(pulse.edges.map(edge => edge.down), [true, false])
  assert(pulse.edges[0].sequence < pulse.edges[1].sequence)
  manager.onKeyDown(key('Space')); manager.onKeyDown(key('Space', true))
  const held = manager.sample([action]); assert.equal(held.pressed.Jump, true); assert.equal(held.edges.length, 1)
  manager.onKeyDown(key('Space', true)); assert.equal(manager.sample([action]).pressed.Jump, false)
  manager.onBlur(); const blurred = manager.sample([action]); assert.equal(blurred.released.Jump, true); assert.equal(blurred.down.Jump, false)
  checks.push('repeat-does-not-create-edge', 'blur-releases-held')
  const tap = { ...action, interaction: 'tap' }
  manager.onKeyDown(key('Space')); manager.onKeyUp(key('Space'))
  assert.equal(manager.sample([tap]).performed.Jump, true, 'a fast tap must perform using event times')
  const chord = { ...action, name: 'Chord', bindings: [{ ...action.bindings[0], modifiers: ['Control'], chord: ['KeyA'] }] }
  manager.onKeyDown({ ...key('KeyA'), ctrlKey: true }); manager.onKeyDown({ ...key('Space'), ctrlKey: true }); manager.onKeyUp({ ...key('Space'), ctrlKey: true }); manager.onKeyUp(key('KeyA'))
  const chordPulse = manager.sample([chord]); assert.equal(chordPulse.pressed.Chord, true); assert.equal(chordPulse.released.Chord, true)
  checks.push('tap-event-time', 'modifier-chord-pulse')
  const consumed = { ...action, name: 'High', consume: true, priority: 10 }
  manager.onKeyDown(key('Space')); manager.onKeyUp(key('Space'))
  const scoped = manager.sample([consumed, { ...action, name: 'Low' }]); assert.equal(scoped.pressed.High, true); assert.equal(scoped.pressed.Low, false)
  checks.push('consumed-edge-focus-scope')
  manager.onKeyDown(key('Space')); manager.sample([action])
  for (let index = 0; index < input.INPUT_EDGE_CAPACITY + 4; index++) { manager.onKeyDown(key('KeyA')); manager.onKeyUp(key('KeyA')) }
  const overflow = manager.sample([action]); assert.equal(manager.edgeDiagnostics.overflows, 1); assert(manager.edgeDiagnostics.dropped > 0); assert.equal(overflow.down.Jump, false); assert.equal(overflow.released.Jump, true); assert.equal(manager.edgeDiagnostics.queued, 0)
  manager.onKeyDown(key('Space')); assert.equal(manager.sample([action]).pressed.Jump, true)
  checks.push('overflow-explicit-resync', 'overflow-next-sample-recovery')
  manager.stop(); assert.equal(manager.sample([action]).down.Jump, false)
  checks.push('stop-clears-session-edges')
  const mouse = input.createInputAction('Click', 'button', [input.createInputBinding('mouse-button', '0')])
  manager.onMouseDown({ button: 0, clientX: 0, clientY: 0 }); manager.onMouseUp({ button: 0, clientX: 0, clientY: 0 })
  const click = manager.sample([mouse]); assert.equal(click.pressed.Click, true); assert.equal(click.released.Click, true)
  manager.onKeyDown(key('Space')); manager.onKeyUp(key('Space')); manager.onKeyDown(key('Space')); manager.onKeyUp(key('Space'))
  assert.deepEqual(manager.sample([action]).edges.map(edge => edge.down), [true, false, true, false])
  checks.push('same-sample-mouse-pulse', 'multiple-pulses-retain-order')
  const originalPerformance = globalThis.performance
  let clockMs = 0
  Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => clockMs } })
  try {
    const holdManager = new input.InputManager(), hold = { ...action, interaction: 'hold', holdSeconds: .1 }
    holdManager.sample([hold]); holdManager.onKeyDown(key('Space')); clockMs = 200; holdManager.onKeyUp(key('Space')); clockMs = 210; holdManager.onKeyDown(key('Space')); clockMs = 220
    assert.equal(holdManager.sample([hold]).performed.Jump, true, 'a completed hold must perform from event time even between samples')
    clockMs = 400; assert.equal(holdManager.sample([hold]).performed.Jump, true, 'an earlier perform must not mark the following held interaction performed')
    checks.push('hold-event-time', 'separate-hold-state-within-one-batch')
    holdManager.onBlur(); holdManager.sample([hold]); holdManager.setVirtualAction('Jump', 1); holdManager.sample([action]); holdManager.onKeyDown(key('KeyA')); holdManager.onKeyUp(key('KeyA'))
    assert.equal(holdManager.sample([action]).released.Jump, false, 'unrelated digital events must not release a held virtual action')
    checks.push('virtual-held-with-unrelated-digital-edge')
  } finally { Object.defineProperty(globalThis, 'performance', { configurable: true, value: originalPerformance }) }
  passed = true
  console.log('Nova engine input checks passed:', checks.join(', '))
} finally {
  const reports = join(root, '.cache/engine-runtime')
  await mkdir(reports, { recursive: true })
  await writeFile(join(reports, 'input-verification.json'), JSON.stringify({ scope: 'Actual InputManager unit behavior; no browser/Worker/platform certification', checks, status: passed ? 'passed' : 'failed' }, null, 2))
  await rm(compiled, { recursive: true, force: true })
}
