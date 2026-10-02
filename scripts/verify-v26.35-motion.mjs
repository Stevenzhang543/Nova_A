/** Focused real-module motion checks. Browser/compositor evidence is recorded by the user workflow suite. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const report = process.argv.find(value => value.startsWith('--report='))?.slice(9) ?? 'release-audits/v26.35-motion-unit.json'
const opened = await openMediaAuditModules({ repository: process.cwd(), bases: [process.cwd()] }, { motion: 'ui/motion', preferences: 'store/preferences' })
const { motion, preferences } = opened.modules
const checks = [], animations = []
// Deterministic browser host boundaries: the production oscillator, interruption, policy and cleanup execute unchanged.
class Matrix {
  constructor(source) {
    let values = [1, 0, 0, 1, 0, 0]
    for (const [, name, body] of (source ?? '').matchAll(/(matrix|translate|scale)\(([^)]+)\)/g)) {
      const numbers = body.split(',').map(value => Number.parseFloat(value))
      const next = name === 'matrix' ? numbers : name === 'translate' ? [1, 0, 0, 1, numbers[0], numbers[1] ?? 0] : [numbers[0], 0, 0, numbers[1] ?? numbers[0], 0, 0]
      const [a, b, c, d, e, f] = values, [g, h, i, j, k, l] = next
      values = [a*g+c*h, b*g+d*h, a*i+c*j, b*i+d*j, a*k+c*l+e, b*k+d*l+f]
    }
    ;[this.a, this.b, this.c, this.d, this.e, this.f] = values
    this.is2D = true
  }
}
globalThis.DOMMatrixReadOnly = Matrix
globalThis.getComputedStyle = element => element.displayed ?? element.natural
function element(rect = { left: 0, top: 0, width: 100, height: 30 }, transform = 'none') {
  const el = { isConnected: true, natural: { opacity: '1', transform }, displayed: null, rect, dataset: {},
    getBoundingClientRect() { return { ...this.rect } },
    animate(frames, options) {
      const animation = { frames, options, onfinish: null, oncancel: null, cancellations: 0,
        cancel() { this.cancellations++; el.displayed = null; this.oncancel?.() },
        finish() { this.onfinish?.() }
      }
      el.lastAnimation = animation; animations.push(animation); return animation
    }
  }
  return el
}
function clean() {
  for (const animation of animations) animation.cancel()
  animations.length = 0
  Object.assign(preferences.preferencesState, { reduceMotion: false, performanceProfile: 'balanced', editorDecorativeMotion: 'auto' })
  preferences.systemReducedMotion.value = false
}
async function test(name, callback) {
  clean()
  try { await callback(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error) }); console.error('FAIL ' + name + ': ' + error) }
}
function matrixValues(transform) { const matrix = new Matrix(transform); return [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f] }
try {
  for (const preset of Object.keys(motion.SPRING_PRESETS)) await test(`${preset} oscillator is deterministic, finite, bounded and settles exactly`, () => {
    const sampled = motion.sampleSpring(preset)
    assert.deepEqual(sampled, motion.sampleSpring(preset))
    assert.ok(sampled.frames.length <= 61); assert.ok(sampled.durationMs <= 800)
    assert.equal(sampled.frames[0].progress, 0); assert.equal(sampled.frames.at(-1).progress, 1)
    sampled.frames.forEach((frame, index) => { assert.ok(Number.isFinite(frame.progress)); assert.ok(frame.progress >= 0 && frame.progress <= 1.04); assert.equal(frame.offset, index / (sampled.frames.length - 1)) })
    if (preset === 'elastic') assert.ok(sampled.frames.some(frame => frame.progress > 1.02), 'elastic preset has a restrained real oscillator overshoot')
    else assert.ok(Math.max(...sampled.frames.map(frame => frame.progress)) < 1.002)
  })
  await test('Duration presets remain centralized and short', () => {
    assert.deepEqual(motion.MOTION_DURATIONS, { micro: 80, fast: 140, standard: 200, emphasized: 280 })
    const el = element(); motion.animatePresence(el, 'enter', undefined, { duration: 'emphasized' }); assert.equal(el.lastAnimation.options.duration, 280)
  })
  await test('Presence preserves authored translation and rotation', () => {
    const el = element(undefined, 'matrix(0,1,-1,0,12,24)')
    motion.animatePresence(el, 'enter')
    const frames = el.lastAnimation.frames
    assert.deepEqual(matrixValues(frames.at(-1).transform), [0, 1, -1, 0, 12, 24])
    const start = matrixValues(frames[0].transform)
    assert.equal(start[1], .985); assert.equal(start[2], -.985); assert.equal(start[4], 6); assert.equal(start[5], 24)
    assert.ok(frames.every(frame => frame.opacity >= 0 && frame.opacity <= 1))
  })
  await test('Opacity-only overlay does not move or scale its authored geometry', () => {
    const el = element(undefined, 'matrix(1,0,0,1,12,24)')
    motion.animatePresence(el, 'enter', undefined, { distance: 0, scale: 1 })
    assert.ok(el.lastAnimation.frames.every(frame => JSON.stringify(matrixValues(frame.transform)) === JSON.stringify([1, 0, 0, 1, 12, 24])))
  })
  await test('Direct supersession starts at current presentation and suppresses stale completion', () => {
    const el = element(); let obsolete = 0, latest = 0
    motion.animatePresence(el, 'enter', () => obsolete++)
    const old = el.lastAnimation, oldFinish = old.onfinish
    el.displayed = { opacity: '.43', transform: 'matrix(.99,0,0,.99,0,3)' }
    motion.animatePresence(el, 'leave', () => latest++)
    const current = el.lastAnimation
    assert.equal(current.frames[0].opacity, .43); assert.deepEqual(matrixValues(current.frames[0].transform), [.99, 0, 0, .99, 0, 3])
    oldFinish(); assert.equal(obsolete, 0); assert.equal(latest, 0)
    current.finish(); current.finish(); assert.equal(latest, 1); assert.equal(obsolete, 0)
  })
  await test('Vue cancellation followed by reentry retains current presentation', () => {
    const el = element(); let obsolete = 0
    motion.animatePresence(el, 'leave', () => obsolete++)
    el.displayed = { opacity: '.7', transform: 'matrix(1,0,0,1,0,2)' }
    motion.cancelMotion(el)
    motion.animatePresence(el, 'enter')
    assert.equal(el.lastAnimation.frames[0].opacity, .7)
    assert.deepEqual(matrixValues(el.lastAnimation.frames[0].transform), [1, 0, 0, 1, 0, 2]); assert.equal(obsolete, 0)
  })
  await test('An obsolete cancellation handle cannot cancel its successor', () => {
    const el = element(), handle = motion.animatePresence(el, 'enter')
    motion.animatePresence(el, 'leave'); const current = el.lastAnimation
    handle.cancel(); assert.equal(current.cancellations, 0)
    motion.cancelMotion(el); assert.equal(current.cancellations, 1)
  })
  for (const policy of ['user', 'system', 'off', 'low-end']) await test(`Live ${policy} policy settles animations immediately and once`, () => {
    const dispose = motion.installUiMotion(), el = element(); let completed = 0
    try {
      motion.animatePresence(el, 'enter', () => completed++)
      const running = el.lastAnimation
      if (policy === 'user') preferences.preferencesState.reduceMotion = true
      else if (policy === 'system') preferences.systemReducedMotion.value = true
      else if (policy === 'off') preferences.preferencesState.editorDecorativeMotion = 'off'
      else preferences.preferencesState.performanceProfile = 'low-end'
      assert.equal(motion.isMotionReduced(), true); assert.equal(completed, 1); assert.equal(running.cancellations, 1)
      running.finish(); assert.equal(completed, 1)
      motion.animatePresence(el, 'leave', () => completed++); assert.equal(completed, 2); assert.equal(animations.length, 1)
    } finally { dispose() }
  })
  await test('Unavailable animation and disconnected elements complete without background work', () => {
    let completed = 0
    const unavailable = element(); unavailable.animate = undefined
    motion.animatePresence(unavailable, 'enter', () => completed++)
    const disconnected = element(); disconnected.isConnected = false
    motion.animatePresence(disconnected, 'enter', () => completed++)
    assert.equal(completed, 2); assert.equal(animations.length, 0)
  })
  await test('FLIP is bounded to mounted elements and leaves logical rectangles unchanged', () => {
    const elements = Array.from({ length: 100 }, (_, index) => element({ left: 0, top: index * 30, width: 100, height: 30 }))
    const before = motion.captureRects(elements); assert.equal(before.size, 80)
    elements.forEach(el => { el.rect.top += 30 })
    motion.animateReorder(before, elements)
    assert.equal(animations.length, 80)
    elements.forEach((el, index) => assert.equal(el.rect.top, (index + 1) * 30))
    assert.deepEqual(matrixValues(elements[0].lastAnimation.frames[0].transform), [1, 0, 0, 1, 0, -30])
    assert.deepEqual(matrixValues(elements[0].lastAnimation.frames.at(-1).transform), [1, 0, 0, 1, 0, 0])
  })
  await test('FLIP interruption reuses current measured position without queuing an old endpoint', () => {
    const el = element(), before = motion.captureRects([el]); el.rect.left = 50
    motion.animateReorder(before, [el]); const old = el.lastAnimation
    el.rect.left = 25; const current = motion.captureRects([el]); el.rect.left = 80
    motion.animateReorder(current, [el])
    assert.equal(old.cancellations, 1); assert.equal(animations.length, 2)
    assert.deepEqual(matrixValues(el.lastAnimation.frames[0].transform), [1, 0, 0, 1, -55, 0])
  })
  await test('Active indicator width settles through transforms without changing its logical size', () => {
    const el = element({ left: 0, top: 0, width: 60, height: 2 }), before = motion.captureRects([el])
    el.rect = { left: 80, top: 0, width: 120, height: 2 }
    motion.animateReorder(before, [el])
    assert.deepEqual(matrixValues(el.lastAnimation.frames[0].transform), [.5, 0, 0, 1, -80, 0])
    assert.deepEqual(matrixValues(el.lastAnimation.frames.at(-1).transform), [1, 0, 0, 1, 0, 0])
    assert.equal(el.rect.width, 120)
  })
  await test('Installer disposal cancels active jobs without delivering obsolete callbacks', () => {
    const dispose = motion.installUiMotion(), el = element(); let completed = 0
    motion.animatePresence(el, 'enter', () => completed++)
    dispose(); assert.equal(el.lastAnimation.cancellations, 1); assert.equal(completed, 0)
  })
} finally {
  clean()
  const result = { engineVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version, generatedAt: new Date().toISOString(), sourceSha256: crypto.createHash('sha256').update(fs.readFileSync('src/ui/motion.ts')).digest('hex'), scope: 'Real production motion module with deterministic WAAPI/DOMMatrix browser-host doubles; browser timing, native drag pixels and compositor costs require separate real-browser evidence.', status: checks.every(check => check.status === 'passed') ? 'passed' : 'failed', passed: checks.filter(check => check.status === 'passed').length, total: checks.length, checks }
  fs.mkdirSync(path.dirname(report), { recursive: true })
  fs.writeFileSync(report, JSON.stringify(result, null, 2) + '\n')
  await opened.close()
  if (result.status === 'failed') process.exitCode = 1
}
