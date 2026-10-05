/** Focused real-module motion checks. Browser/compositor evidence is recorded by the user workflow suite. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const report = process.argv.find(value => value.startsWith('--report='))?.slice(9) ?? 'release-audits/v26.37-motion-unit.json'
const opened = await openMediaAuditModules({ repository: process.cwd(), bases: [process.cwd()] }, { motion: 'ui/motion', preferences: 'store/preferences' })
const { motion, preferences } = opened.modules
const hostDocument=globalThis.document
globalThis.document=undefined // Pure logic fixtures install a deterministic DOM/event host for controller cases below.
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

/** Deterministic DOM/event boundaries; the imported production controller is not replaced. */
function motionDomHost() {
  const keys = ['document', 'window', 'Element', 'HTMLElement', 'HTMLInputElement', 'HTMLDetailsElement', 'MutationObserver', 'ResizeObserver', 'getComputedStyle', 'CustomEvent']
  const saved = Object.fromEntries(keys.map(key => [key, globalThis[key]]))
  const observers = [], resizeObservers = []
  class Events {
    bindings = []
    addEventListener(name, fn, capture = false) { if (!this.bindings.some(b => b.name === name && b.fn === fn && b.capture === capture)) this.bindings.push({ name, fn, capture }) }
    removeEventListener(name, fn, capture = false) { this.bindings = this.bindings.filter(b => !(b.name === name && b.fn === fn && b.capture === capture)) }
    dispatchEvent(event) {
      event.target ??= this
      event.currentTarget = this
      for (const binding of [...this.bindings.filter(b => b.name === event.type)].sort((a, b) => Number(b.capture) - Number(a.capture))) {
        if (event.immediateStopped) break
        binding.fn(event)
      }
      return !event.defaultPrevented
    }
  }
  class Node extends Events {
    constructor(tag = 'div', attrs = {}) {
      super(); this.tagName = tag.toUpperCase(); this.parentElement = null; this.children = []; this.dataset = {}; this.attrs = new Map(); this.isConnected = false
      this.style = { height: '', overflow: '', pointerEvents: '', opacity: '', _priorities: {}, getPropertyValue(name) { return this[name.replace(/-([a-z])/g,(_,char)=>char.toUpperCase())] ?? '' }, getPropertyPriority(name) { return this._priorities[name] ?? '' }, setProperty(name,value,priority='') { this[name.replace(/-([a-z])/g,(_,char)=>char.toUpperCase())]=value; this._priorities[name]=priority }, removeProperty(name) { const key=name.replace(/-([a-z])/g,(_,char)=>char.toUpperCase()), prior=this[key]; this[key]=''; delete this._priorities[name]; return prior } }; this.inert = false; this.hidden = false; this.className = ''; this.rect = { left: 0, top: 0, width: 100, height: 44 }
      this.natural = { opacity: '1', transform: 'none', scale: '0.975', color: 'rgb(222, 230, 244)', display: 'block', paddingTop: '0', paddingBottom: '0', borderTopWidth: '0', borderBottomWidth: '0' }
      this.classList = { add: value => { this.className += ' ' + value }, contains: value => this.className.split(/\s+/).includes(value) }
      for (const [key, value] of Object.entries(attrs)) this.setAttribute(key, value)
    }
    setAttribute(key, value) { this.attrs.set(key, String(value)); if (key === 'class') this.className = String(value); if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = String(value) }
    getAttribute(key) { if (key.startsWith('data-')) return this.dataset[key.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] ?? null; if (key === 'class') return this.className || null; return this.attrs.get(key) ?? null }
    removeAttribute(key) { this.attrs.delete(key); if (key.startsWith('data-')) delete this.dataset[key.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] }
    matches(selector) {
      return selector.split(',').some(part => {
        part = part.trim()
        if (part === ':disabled') return this.disabled === true
        if (part === ':popover-open') return this.nativeShown === true
        const tag = /^[a-z]+/i.exec(part)?.[0]; if (tag && tag.toUpperCase() !== this.tagName) return false
        for (const [, name] of part.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(name)) return false
        for (const [, name, raw] of part.matchAll(/\[([\w-]+)(?:=([^\]]+))?\]/g)) { const value = this.getAttribute(name); if (value === null || (raw && value !== raw.replace(/^["']|["']$/g, ''))) return false }
        return true
      })
    }
    closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null }
    contains(node) { for (; node; node = node.parentElement) if (node === this) return true; return false }
    querySelectorAll(selector) { const nodes = []; const visit = parent => { for (const child of parent.children) { if (child.matches(selector)) nodes.push(child); visit(child) } }; visit(this); return nodes }
    querySelector(selector) { return selector.startsWith(':scope > ') ? this.children.find(child => child.matches(selector.slice(9))) ?? null : this.querySelectorAll(selector)[0] ?? null }
    connect(value) { this.isConnected = value; for (const child of this.children) child.connect(value) }
    append(...nodes) { for (const node of nodes) { node.remove(); node.parentElement = this; this.children.push(node); node.connect(this.isConnected) } }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement = null; this.connect(false) }
    focus() { doc.activeElement = this }
    getBoundingClientRect() {
      const top=this.style.position==='fixed'?(Number.parseFloat(this.style.top)||0):this.rect.top,left=this.style.position==='fixed'?(Number.parseFloat(this.style.left)||0):this.rect.left
      const maxWidth=Number.parseFloat(this.style.maxWidth),maxHeight=Number.parseFloat(this.style.maxHeight)
      const width=Math.min(this.rect.width,Number.isFinite(maxWidth)?Math.max(0,maxWidth):this.rect.width),height=Math.min(this.presentedHeight??this.rect.height,Number.isFinite(maxHeight)?Math.max(0,maxHeight):this.rect.height)
      return {...this.rect,left,top,width,height,right:left+width,bottom:top+height}
    }
    animate(frames, options) {
      const el = this
      const animation = { frames, options, onfinish: null, oncancel: null, cancellations: 0,
        cancel() { this.cancellations++; el.displayed = null; el.presentedHeight = undefined; this.oncancel?.() },
        finish() { this.onfinish?.() }
      }
      this.lastAnimation = animation; animations.push(animation); return animation
    }
  }
  class Input extends Node { constructor(type) { super('input', { type }); this.type = type; this.value = '0'; this.checked = false } }
  class Details extends Node {
    constructor() { super('details', { class: 'ui-property-section' }); this.open = true; this.rect.height = 240 }
    getBoundingClientRect() { return { ...this.rect, height: this.presentedHeight ?? (this.open ? 240 : 56) } }
  }
  class Observer { constructor(callback) { this.callback = callback; this.connected = false; observers.push(this) } observe() { this.connected = true } disconnect() { this.connected = false } notify(records) { if (this.connected) this.callback(records) } }
  class Resize { constructor(callback) { this.callback=callback;this.targets=new Set();resizeObservers.push(this) } observe(node){this.targets.add(node)} disconnect(){this.targets.clear()} notify(){if(this.targets.size)this.callback([])} }
  const doc = new Events(), win = new Events(); win.innerWidth=1024; win.innerHeight=640
  doc.body = new Node('body'); doc.body.connect(true)
  doc.documentElement = new Node('html'); doc.documentElement.connect(true)
  doc.querySelector = selector => doc.body.querySelector(selector)
  doc.createElement = tag => new Node(tag)
  doc.activeElement = doc.body
  const editor = new Node('main', { class: 'editor-root' }); doc.body.append(editor)
  Object.assign(globalThis, { document: doc, window: win, Element: Node, HTMLElement: Node, HTMLInputElement: Input, HTMLDetailsElement: Details, MutationObserver: Observer, ResizeObserver: Resize, getComputedStyle: el => el.displayed ?? el.natural, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail } } })
  function event(type, target, extra = {}) { return { type, target, button: 0, defaultPrevented: false, immediateStopped: false, preventDefault() { this.defaultPrevented = true }, stopPropagation() { this.stopped = true }, stopImmediatePropagation() { this.immediateStopped = true }, ...extra } }
  return { doc, win, editor, Node, Input, Details, observers, resizeObservers, event,
    enablePopover(node) { node.nativeShown=false; node.showPopover=function(){this.nativeShowCalls=(this.nativeShowCalls??0)+1;this.nativeShown=true};node.hidePopover=function(){this.nativeHideCalls=(this.nativeHideCalls??0)+1;this.nativeShown=false};return node },
    emit(type, target, extra) { const ev = event(type, target, extra); doc.dispatchEvent(ev); return ev },
    close() { Object.assign(globalThis, saved) }
  }
}

function matrixValues(transform) { const matrix = new Matrix(transform); return [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f] }
try {
  for (const preset of Object.keys(motion.SPRING_PRESETS)) await test(`${preset} oscillator is deterministic, finite, bounded and settles exactly`, () => {
    const sampled = motion.sampleSpring(preset)
    assert.deepEqual(sampled, motion.sampleSpring(preset))
    assert.ok(sampled.frames.length <= 61); assert.ok(sampled.durationMs <= 800)
    assert.equal(sampled.frames[0].progress, 0); assert.equal(sampled.frames.at(-1).progress, 1)
    sampled.frames.forEach((frame, index) => { assert.ok(Number.isFinite(frame.progress)); assert.ok(frame.progress >= 0 && frame.progress <= 1.2); assert.equal(frame.offset, index / (sampled.frames.length - 1)) })
    assert.ok(sampled.frames.some(frame => frame.progress > 1.015), 'Each family has perceptible bounded convergence')
  })
  await test('Duration presets remain centralized and short', () => {
    assert.deepEqual(motion.MOTION_DURATIONS, { micro: 120, fast: 180, standard: 240, emphasized: 320 })
    const el = element(); motion.animatePresence(el, 'enter', undefined, { duration: 'emphasized' }); assert.equal(el.lastAnimation.options.duration, 320)
  })
  await test('Presence preserves authored translation and rotation', () => {
    const el = element(undefined, 'matrix(0,1,-1,0,12,24)')
    motion.animatePresence(el, 'enter')
    const frames = el.lastAnimation.frames
    assert.deepEqual(matrixValues(frames.at(-1).transform), [0, 1, -1, 0, 12, 24])
    const start = matrixValues(frames[0].transform)
    assert.equal(start[1], .985); assert.equal(start[2], -.985); assert.equal(start[4], 4); assert.equal(start[5], 24)
    assert.ok(frames.every(frame => frame.opacity >= 0 && frame.opacity <= 1))
  })
  await test('Persistent content remains readable during finite interruptible handoff', () => {
    const el = element(); let obsolete = 0, latest = 0
    motion.animatePresence(el, 'enter', () => obsolete++, { preserveOpacity: true, scale: 1 })
    const old = el.lastAnimation, oldFinish = old.onfinish
    assert.ok(old.frames.every(frame => frame.opacity === 1))
    assert.notDeepEqual(matrixValues(old.frames[0].transform), matrixValues(old.frames.at(-1).transform))
    assert.equal(old.options.duration, 240)
    el.displayed = { opacity: '1', transform: 'matrix(1,0,0,1,0,3)' }
    motion.animatePresence(el, 'enter', () => latest++, { preserveOpacity: true, scale: 1 })
    const current = el.lastAnimation
    assert.ok(current.frames.every(frame => frame.opacity === 1))
    assert.deepEqual(matrixValues(current.frames[0].transform), [1, 0, 0, 1, 0, 3])
    oldFinish(); assert.equal(obsolete, 0)
    current.finish(); assert.equal(latest, 1)
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
  for (const policy of ['user', 'system']) await test(`Live ${policy} policy settles animations immediately and once`, () => {
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

  for(const mode of ['off','low-end'])await test('Light budget '+mode+' retains interaction feedback',()=>{
    const dispose=motion.installUiMotion(),el=element();let completed=0
    try{
      motion.animatePresence(el,'enter',()=>completed++)
      if(mode==='off')preferences.preferencesState.editorDecorativeMotion='off';else preferences.preferencesState.performanceProfile='low-end'
      assert.equal(motion.getUiMotionPolicy(),'light');assert.equal(motion.isMotionReduced(),false);assert.equal(completed,0)
      assert.equal(el.lastAnimation.cancellations,0);el.lastAnimation.finish();assert.equal(completed,1)
    }finally{dispose()}
  })
  await test('Controlled short and long frames converge without unstable integration',()=>{
    for(const preset of ['snappy','smooth','elastic']){
      const frames=motion.sampleSpring(preset).frames,duration=motion.MOTION_DURATIONS[preset==='elastic'?'emphasized':preset==='smooth'?'standard':'fast']
      const valueAt=ms=>{
        const offset=Math.min(1,Math.max(0,ms/duration)),right=frames.findIndex(f=>f.offset>=offset)
        if(right<=0)return frames[Math.max(0,right)].progress
        const a=frames[right-1],b=frames[right],t=(offset-a.offset)/(b.offset-a.offset)
        return a.progress+(b.progress-a.progress)*t
      }
      for(const dt of [16,33,100,500]){
        let elapsed=0
        while(elapsed<duration){const value=valueAt(elapsed);assert.ok(Number.isFinite(value)&&value>=0&&value<1.2);elapsed+=dt}
        assert.equal(valueAt(elapsed),1)
      }
    }
  })
  await test('Platform rejection completes safely exactly once',()=>{
    const el=element();let completed=0;el.animate=()=>{throw Error('Controlled platform rejection')}
    const handle=motion.run(el,[{opacity:0},{opacity:1}],'standard',()=>completed++)
    assert.equal(completed,1);assert.equal(motion.getUiMotionDiagnostics().activeJobs,0);handle.cancel();assert.equal(completed,1)
  })
  await test('Fresh entry is preserved by reorder without a previous rectangle',()=>{
    const fresh=element();let done=0;motion.animatePresence(fresh,'enter',()=>done++)
    const animation=fresh.lastAnimation;motion.animateReorder(new Map(),[fresh])
    assert.equal(animation.cancellations,0);animation.finish();assert.equal(done,1)
  })
  await test('Reduced policy settles latest owner and disposal removes its watch',()=>{
    const dispose=motion.installUiMotion(),el=element();let stale=0,latest=0
    motion.animatePresence(el,'enter',()=>stale++);const obsolete=el.lastAnimation.onfinish
    motion.animatePresence(el,'leave',()=>latest++);preferences.preferencesState.reduceMotion=true
    assert.equal(latest,1);assert.equal(stale,0);obsolete();assert.equal(motion.getUiMotionDiagnostics().activeJobs,0)
    preferences.preferencesState.reduceMotion=false;dispose()
    motion.run(el,[{opacity:0},{opacity:1}],'fast',()=>latest++);preferences.preferencesState.reduceMotion=true
    assert.equal(latest,1);assert.equal(motion.getUiMotionDiagnostics().activeJobs,1);motion.cancelMotion(el)
    assert.equal(motion.getUiMotionDiagnostics().activeJobs,0)
  })
  await test('Block-size reversal starts at the captured height and suppresses an obsolete completion', () => {
    const el = element(); let oldDone = 0, latestDone = 0
    motion.animateBlockSize(el, 300, 56, () => oldDone++)
    const old = el.lastAnimation, obsolete = old.onfinish
    motion.animateBlockSize(el, 142, 300, () => latestDone++)
    assert.equal(old.cancellations, 1); assert.equal(el.lastAnimation.frames[0].height, '142px')
    assert.equal(el.lastAnimation.frames.at(-1).height, '300px')
    assert.ok(el.lastAnimation.frames.every(frame => Number.parseFloat(frame.height) >= 142 && Number.isFinite(Number.parseFloat(frame.height))))
    obsolete(); assert.equal(oldDone, 0); el.lastAnimation.finish(); assert.equal(latestDone, 1)
    assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
  })
  await test('Closing modal blocks its scrim events and restores exact authored state idempotently', () => {
    const host = motionDomHost()
    try {
      const root = new host.Node('div'), inner = new host.Node('section'), alreadyInert = new host.Node('aside')
      root.style.pointerEvents = 'painted'; root.setAttribute('aria-hidden', 'false'); root.dataset.uiExit = 'prior'; alreadyInert.inert = true
      root.append(inner, alreadyInert); host.editor.append(root)
      let closeRequests = 0; root.addEventListener('pointerdown', () => closeRequests++)
      const restore = motion.deactivateMotionSurface(root, true)
      assert.equal(root.inert, false); assert.equal(root.style.pointerEvents, 'auto'); assert.equal(inner.inert, true)
      const pointer = host.event('pointerdown', root); root.dispatchEvent(pointer)
      assert.equal(closeRequests, 0); assert.equal(pointer.defaultPrevented, true); assert.equal(pointer.immediateStopped, true)
      restore(); restore()
      assert.equal(root.style.pointerEvents, 'painted'); assert.equal(inner.inert, false); assert.equal(alreadyInert.inert, true)
      assert.equal(root.getAttribute('aria-hidden'), 'false'); assert.equal(root.dataset.uiExit, 'prior')
      assert.equal(root.bindings.length, 1); root.dispatchEvent(host.event('pointerdown', root)); assert.equal(closeRequests, 1)
      const restoreNormal = motion.deactivateMotionSurface(root)
      assert.equal(root.inert, true); assert.equal(root.style.pointerEvents, 'none')
      restoreNormal(); assert.equal(root.inert, false)
    } finally { host.close() }
  })
  await test('Production delegation preserves draggable-panel buttons, native values and game UI isolation', () => {
    const host = motionDomHost(); const dispose = motion.installUiMotion()
    try {
      const panel = new host.Node('aside', { draggable: 'true' }), button = new host.Node('button'), nativeSource = new host.Node('button', { draggable: 'true' })
      panel.append(button, nativeSource); host.editor.append(panel)
      host.emit('pointerdown', button); assert.equal(button.dataset.uiPressed, 'true')
      host.emit('pointerup', button); assert.equal(button.dataset.uiPressed, undefined); assert.ok(button.lastAnimation)
      host.emit('pointerdown', nativeSource); assert.equal(nativeSource.dataset.uiPressed, undefined)
      const range = new host.Input('range'); host.editor.append(range); range.value = '37'
      host.emit('pointerdown', range); assert.equal(range.dataset.uiRangeDragging, 'true'); assert.equal(range.value, '37'); assert.equal(range.lastAnimation, undefined)
      host.emit('pointercancel', range); assert.equal(range.dataset.uiRangeDragging, undefined); assert.equal(range.value, '37')
      const game = new host.Node('div', { class: 'canvas-container' }), gameButton = new host.Node('button'), gameInput = new host.Input('range')
      game.append(gameButton, gameInput); host.editor.append(game)
      host.emit('pointerdown', gameButton); host.emit('pointerdown', gameInput)
      assert.equal(gameButton.dataset.uiPressed, undefined); assert.equal(gameInput.dataset.uiRangeDragging, undefined)
      host.emit('pointerdown', button); host.emit('dragstart', panel)
      assert.equal(button.dataset.uiPressed, undefined)
    } finally {
      dispose(); assert.equal(host.doc.bindings.length, 0); assert.equal(host.win.bindings.length, 0)
      assert.equal(host.observers.filter(observer => observer.connected).length, 0); host.close()
    }
    assert.equal(motion.getUiMotionDiagnostics().interactionBindings, 0); assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
  })
  await test('Production disclosure latest-target reversal preserves focus and restores geometry', () => {
    const host = motionDomHost(), details = new host.Details(), summary = new host.Node('summary'), body = new host.Node('div'), field = new host.Input('text')
    summary.rect.height = 56; body.append(field); details.append(summary, body); host.editor.append(details)
    const dispose = motion.installUiMotion()
    try {
      field.focus()
      const closeClick = host.emit('click', summary); const old = details.lastAnimation, obsolete = old.onfinish
      assert.equal(closeClick.defaultPrevented, true); assert.equal(details.dataset.uiDisclosureOpen, 'false')
      assert.equal(summary.getAttribute('aria-expanded'), 'false'); assert.equal(body.inert, true); assert.equal(host.doc.activeElement, summary)
      details.presentedHeight = 132
      host.emit('click', summary)
      assert.equal(details.lastAnimation.frames[0].height, '132px'); assert.equal(details.dataset.uiDisclosureOpen, 'true'); assert.equal(body.inert, false)
      obsolete(); assert.equal(details.dataset.uiDisclosureOpen, 'true')
      details.lastAnimation.finish(); assert.equal(details.open, true); assert.equal(details.style.height, ''); assert.equal(details.style.overflow, '')
      host.emit('click', summary); preferences.preferencesState.reduceMotion = true
      assert.equal(details.open, false); assert.equal(details.dataset.uiDisclosureOpen, 'false'); assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
    } finally { dispose(); host.close() }
    assert.equal(motion.getUiMotionDiagnostics().disclosures, 0)
  })
  await test('Prevented disclosure clicks are respected and external close interrupts an active opening', () => {
    const host = motionDomHost(), details = new host.Details(), summary = new host.Node('summary'), body = new host.Node('div')
    summary.rect.height = 56; details.append(summary, body); details.open = false; host.editor.append(details)
    const dispose = motion.installUiMotion()
    try {
      host.emit('click', summary, { defaultPrevented: true }); assert.equal(details.lastAnimation, undefined); assert.equal(details.open, false)
      host.emit('click', summary); const old = details.lastAnimation; details.open = false; host.emit('toggle', details)
      assert.equal(old.cancellations, 1); assert.equal(details.dataset.uiDisclosureOpen, 'false')
      details.lastAnimation.finish(); assert.equal(details.open, false)
    } finally { dispose(); host.close() }
  })
  await test('Removal releases controller records while a connected reparent preserves the current owner', () => {
    const host = motionDomHost(), details = new host.Details(), summary = new host.Node('summary'), body = new host.Node('div'), button = new host.Node('button'), range = new host.Input('range')
    summary.rect.height = 56; details.append(summary, body); host.editor.append(details, button, range)
    const dispose = motion.installUiMotion()
    try {
      host.emit('click', summary); const running = details.lastAnimation
      const second = new host.Node('aside'); host.editor.append(second); second.append(details)
      host.observers[0].notify([{ type: 'childList', addedNodes: [details], removedNodes: [details] }])
      assert.equal(running.cancellations, 0); assert.equal(motion.getUiMotionDiagnostics().disclosures, 1)
      host.emit('pointerdown', button); host.emit('pointerdown', range)
      host.editor.remove(); host.observers[0].notify([{ type: 'childList', addedNodes: [], removedNodes: [host.editor] }])
      assert.equal(running.cancellations, 1); assert.equal(details.style.height, ''); assert.equal(details.style.overflow, '')
      assert.equal(details.dataset.uiDisclosureControlled, undefined); assert.equal(button.dataset.uiPressed, undefined); assert.equal(range.dataset.uiRangeDragging, undefined)
      assert.equal(motion.getUiMotionDiagnostics().disclosures, 0); assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
    } finally { dispose(); host.close() }
  })

  await test('Explicit native popup initial entry preserves trigger and absolute geometry', () => {
    const host = motionDomHost(), details = new host.Details(), summary = new host.Node('summary'), body = new host.Node('section')
    details.setAttribute('data-ui-motion-popover', ''); details.style.height = '72px'; details.style.overflow = 'visible'
    body.rect.left = 44; body.rect.top = 82; body.natural.transform = 'matrix(1,0,0,1,22,17)'
    details.append(summary, body); host.editor.append(details)
    const dispose = motion.installUiMotion()
    try {
      assert.ok(body.lastAnimation); assert.equal(details.lastAnimation, undefined)
      assert.equal(summary.getAttribute('aria-expanded'), 'true'); assert.equal(details.dataset.uiPopoverOpen, 'true')
      assert.equal(details.style.height, '72px'); assert.equal(details.style.overflow, 'visible')
      assert.equal(body.rect.left, 44); assert.equal(body.rect.top, 82)
      assert.deepEqual(matrixValues(body.lastAnimation.frames.at(-1).transform), [1,0,0,1,22,17])
      body.lastAnimation.finish(); assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
    } finally { dispose(); host.close() }
    assert.equal(motion.getUiMotionDiagnostics().nativePopovers, 0)
  })
  await test('Native popup close and reopen retarget displayed state without obsolete completion', () => {
    const host = motionDomHost(), details = new host.Details(), summary = new host.Node('summary'), body = new host.Node('div'), field = new host.Input('text')
    details.setAttribute('data-ui-motion-popover', ''); details.append(summary, body); body.append(field); host.editor.append(details)
    const dispose = motion.installUiMotion()
    try {
      body.lastAnimation.finish(); field.focus()
      const close = host.emit('click', summary), old = body.lastAnimation, obsolete = old.onfinish
      assert.equal(close.defaultPrevented, true); assert.equal(details.open, true)
      assert.equal(details.dataset.uiPopoverOpen, 'false'); assert.equal(summary.getAttribute('aria-expanded'), 'false')
      assert.equal(body.inert, true); assert.equal(body.style.pointerEvents, 'none'); assert.equal(host.doc.activeElement, summary)
      body.displayed = { ...body.natural, opacity: '.37', transform: 'matrix(.99,0,0,.99,0,2)' }
      host.emit('click', summary)
      assert.equal(body.lastAnimation.frames[0].opacity, .37); assert.deepEqual(matrixValues(body.lastAnimation.frames[0].transform), [.99,0,0,.99,0,2])
      assert.equal(body.inert, false); assert.equal(details.dataset.uiPopoverOpen, 'true')
      obsolete(); assert.equal(details.open, true); body.lastAnimation.finish()
      assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
    } finally { dispose(); host.close() }
  })
  await test('External native popup close observes before paint and ignores retained-open toggles', () => {
    const host = motionDomHost(), details = new host.Details(), summary = new host.Node('summary'), body = new host.Node('div')
    details.setAttribute('data-ui-motion-popover', ''); details.open = false; details.append(summary, body); host.editor.append(details)
    const dispose = motion.installUiMotion()
    try {
      host.emit('click', summary); const enter = body.lastAnimation
      host.observers[0].notify([{ type: 'attributes', target: details, attributeName: 'open' }]); host.emit('toggle', details)
      assert.equal(body.lastAnimation, enter); assert.equal(enter.cancellations, 0)
      details.open = false
      host.observers[0].notify([{ type: 'attributes', target: details, attributeName: 'open' }])
      const leave = body.lastAnimation; assert.equal(enter.cancellations, 1); assert.equal(details.open, true); assert.equal(details.dataset.uiPopoverOpen, 'false')
      host.emit('toggle', details); assert.equal(body.lastAnimation, leave)
      details.open = false; host.emit('toggle', details)
      assert.equal(body.lastAnimation, leave); assert.equal(details.open, true)
      leave.finish(); assert.equal(details.open, false)
      host.observers[0].notify([{ type: 'attributes', target: details, attributeName: 'open' }]); host.emit('toggle', details)
      assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
    } finally { dispose(); host.close() }
  })
  await test('Native popup cancellation settles latest target and obsolete handles cannot cancel successors', () => {
    const host = motionDomHost(), details = new host.Details(), summary = new host.Node('summary'), body = new host.Node('div')
    details.setAttribute('data-ui-motion-popover', ''); details.open = false; details.append(summary, body); host.editor.append(details)
    const dispose = motion.installUiMotion()
    try {
      const first = motion.animateNativePopover(details, true), second = motion.animateNativePopover(details, false), current = body.lastAnimation
      first.cancel(); assert.equal(current.cancellations, 0)
      second.cancel(); assert.equal(current.cancellations, 1); assert.equal(details.open, false)
      assert.equal(details.dataset.uiPopoverOpen, 'false'); assert.equal(body.inert, true); assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
      const reopen = motion.animateNativePopover(details, true); assert.equal(body.lastAnimation.frames[0].opacity, 0)
      reopen.cancel(); assert.equal(details.open, true); assert.equal(body.inert, false); assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
    } finally { dispose(); host.close() }
  })
  await test('Multiple popup surfaces retain completed exits and live Reduced Motion settles all latest state', () => {
    const host = motionDomHost(), details = new host.Details(), summary = new host.Node('summary'), first = new host.Node('section'), second = new host.Node('div')
    details.setAttribute('data-ui-motion-popover', ''); details.append(summary, first, second); host.editor.append(details)
    const dispose = motion.installUiMotion()
    try {
      first.lastAnimation.finish(); second.lastAnimation.finish()
      motion.animateNativePopover(details, false); first.lastAnimation.finish()
      assert.equal(first.style.opacity, '0'); assert.equal(details.open, true); assert.equal(first.inert, true)
      preferences.systemReducedMotion.value = true
      assert.equal(details.open, false); assert.equal(second.inert, true); assert.equal(first.style.opacity, '')
      assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
      motion.animateNativePopover(details, true); assert.equal(details.open, true); assert.equal(first.inert, false)
      assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
    } finally { dispose(); host.close() }
  })
  await test('Native popup removal and disposal restore authored state and exclude game details', () => {
    const host = motionDomHost(), details = new host.Details(), summary = new host.Node('summary'), body = new host.Node('div')
    details.setAttribute('data-ui-motion-popover', ''); summary.setAttribute('aria-expanded', 'authored'); body.style.pointerEvents = 'painted'; body.style.opacity = '.6'; body.setAttribute('aria-hidden', 'false')
    details.append(summary, body); host.editor.append(details)
    const game = new host.Node('div', { class: 'canvas-container' }), gameDetails = new host.Details(), gameSummary = new host.Node('summary'), gameBody = new host.Node('div')
    gameDetails.setAttribute('data-ui-motion-popover', ''); gameDetails.append(gameSummary, gameBody); game.append(gameDetails); host.editor.append(game)
    const dispose = motion.installUiMotion()
    try {
      assert.equal(gameBody.lastAnimation, undefined); host.emit('click', gameSummary); assert.equal(gameBody.lastAnimation, undefined)
      motion.animateNativePopover(details, false); const pending = body.lastAnimation
      details.remove(); host.observers[0].notify([{ type: 'childList', target: host.editor, addedNodes: [], removedNodes: [details] }])
      assert.equal(pending.cancellations, 1); assert.equal(details.open, false); assert.equal(details.dataset.uiPopoverControlled, undefined)
      assert.equal(summary.getAttribute('aria-expanded'), 'authored'); assert.equal(body.inert, false)
      assert.equal(body.style.pointerEvents, 'painted'); assert.equal(body.style.opacity, '.6'); assert.equal(body.getAttribute('aria-hidden'), 'false')
      assert.equal(motion.getUiMotionDiagnostics().nativePopovers, 0)
    } finally { dispose(); host.close() }
  })
  await test('Popup surface replacement cancels stale owner and gives the latest target to new content', () => {
    const host = motionDomHost(), details = new host.Details(), summary = new host.Node('summary'), oldBody = new host.Node('div'), newBody = new host.Node('section')
    details.setAttribute('data-ui-motion-popover', ''); details.append(summary, oldBody); host.editor.append(details)
    const dispose = motion.installUiMotion()
    try {
      motion.animateNativePopover(details, false); const old = oldBody.lastAnimation, obsolete = old.onfinish
      oldBody.remove(); details.append(newBody)
      host.observers[0].notify([{ type: 'childList', target: details, addedNodes: [newBody], removedNodes: [oldBody] }])
      assert.equal(old.cancellations, 1); assert.equal(oldBody.inert, false); assert.equal(newBody.inert, true)
      obsolete(); assert.equal(details.open, true); newBody.lastAnimation.finish()
      assert.equal(details.open, false); assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
    } finally { dispose(); host.close() }
  })
  await test('Unsupported popup animation support completes without retained invisible input regions', () => {
    const host = motionDomHost(), details = new host.Details(), summary = new host.Node('summary'), body = new host.Node('div')
    details.setAttribute('data-ui-motion-popover', ''); body.animate = undefined; details.append(summary, body); host.editor.append(details)
    const dispose = motion.installUiMotion()
    try {
      motion.animateNativePopover(details, false)
      assert.equal(details.open, false); assert.equal(body.inert, true); assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
      motion.animateNativePopover(details, true); assert.equal(details.open, true); assert.equal(body.inert, false)
      assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
    } finally { dispose(); host.close() }
    assert.equal(motion.getUiMotionDiagnostics().nativePopovers, 0)
  })

  await test('Lazy disclosure refresh measures mounted content without redispatching logical intent', () => {
    const host = motionDomHost(), details = new host.Details(), summary = new host.Node('summary'), body = new host.Node('div')
    details.open = false; summary.rect.height = 56; details.append(summary); host.editor.append(details)
    details.getBoundingClientRect = function () { return { ...this.rect, height: this.presentedHeight ?? (this.open && this.children.some(child => child.tagName !== 'SUMMARY') ? 240 : 56) } }
    let intents = 0; details.addEventListener('ui-disclosure-change', () => intents++)
    const dispose = motion.installUiMotion()
    try {
      motion.animateDisclosure(details, true); const initial = details.lastAnimation, obsolete = initial.onfinish
      assert.equal(details.dataset.uiDisclosureOpen, 'true'); assert.equal(summary.getAttribute('aria-expanded'), 'true')
      assert.equal(initial.frames.at(-1).height, '56px'); assert.equal(intents, 1)
      // Vue-equivalent DOM commit boundary: the lazy body appears after synchronous intent.
      details.presentedHeight = 56; details.append(body)
      motion.refreshDisclosure(details); const refreshed = details.lastAnimation
      assert.equal(initial.cancellations, 1); assert.equal(refreshed.frames[0].height, '56px')
      assert.equal(refreshed.frames.at(-1).height, '240px'); assert.equal(intents, 1); assert.equal(body.inert, false)
      obsolete(); assert.equal(motion.getUiMotionDiagnostics().activeJobs, 1)
      refreshed.finish(); assert.equal(details.open, true); assert.equal(details.style.overflow, '')
      assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
    } finally { dispose(); host.close() }
    assert.equal(motion.getUiMotionDiagnostics().disclosures, 0)
  })
  await test('A late lazy disclosure refresh respects latest close and detached cleanup', () => {
    const host = motionDomHost(), details = new host.Details(), summary = new host.Node('summary'), body = new host.Node('div')
    details.open = false; summary.rect.height = 56; details.append(summary); host.editor.append(details)
    details.getBoundingClientRect = function () { return { ...this.rect, height: this.presentedHeight ?? (this.open && this.children.some(child => child.tagName !== 'SUMMARY') ? 240 : 56) } }
    let intents = 0; details.addEventListener('ui-disclosure-change', () => intents++)
    const dispose = motion.installUiMotion()
    try {
      motion.animateDisclosure(details, true); motion.animateDisclosure(details, false)
      details.append(body); details.presentedHeight = 56; motion.refreshDisclosure(details)
      assert.equal(details.lastAnimation.frames.at(-1).height, '56px'); assert.equal(intents, 2)
      assert.equal(details.dataset.uiDisclosureOpen, 'false'); assert.equal(summary.getAttribute('aria-expanded'), 'false')
      assert.equal(body.inert, true); details.lastAnimation.finish(); assert.equal(details.open, false)
      details.remove(); const count = animations.length; motion.refreshDisclosure(details).cancel()
      assert.equal(animations.length, count)
      host.observers[0].notify([{ type: 'childList', target: host.editor, addedNodes: [], removedNodes: [details] }])
      assert.equal(motion.getUiMotionDiagnostics().disclosures, 0); assert.equal(motion.getUiMotionDiagnostics().activeJobs, 0)
    } finally { dispose(); host.close() }
  })

  await test('Native top-layer popup flips above and clamps viewport without changing ancestor clipping', () => {
    const host=motionDomHost(),panel=new host.Node('section'),details=new host.Details(),summary=new host.Node('summary'),body=host.enablePopover(new host.Node('section'))
    panel.natural.overflow='clip';panel.rect={left:780,top:360,width:230,height:240}
    details.setAttribute('data-ui-motion-popover','');details.open=false;summary.rect={left:948,top:560,width:44,height:44}
    body.rect={left:948,top:604,width:340,height:420};details.append(summary,body);panel.append(details);host.editor.append(panel)
    const dispose=motion.installUiMotion()
    try {
      host.emit('click',summary)
      assert.equal(body.nativeShown,true);assert.equal(body.getAttribute('popover'),'manual');assert.equal(body.dataset.uiPopoverLayer,'top')
      assert.equal(body.style.position,'fixed');assert.equal(body.style.margin,'0')
      const rect=body.getBoundingClientRect();assert.ok(rect.left>=8&&rect.right<=1016);assert.ok(rect.top>=8&&rect.bottom<=632)
      assert.ok(rect.bottom<=summary.rect.top-8);assert.equal(panel.natural.overflow,'clip')
      assert.equal(body.style.overflow,'auto');assert.equal(details.style.overflow,'');body.lastAnimation.finish()
    } finally {dispose();host.close()}
  })
  await test('Top-layer close retains surface until done and interrupted reopen does not hide the native layer', () => {
    const host=motionDomHost(),details=new host.Details(),summary=new host.Node('summary'),body=host.enablePopover(new host.Node('section'))
    details.setAttribute('data-ui-motion-popover','');details.append(summary,body);host.editor.append(details);const dispose=motion.installUiMotion()
    try {
      body.lastAnimation.finish();motion.animateNativePopover(details,false)
      assert.equal(body.nativeShown,true);assert.equal(body.inert,true);assert.equal(summary.getAttribute('aria-expanded'),'false')
      const old=body.lastAnimation,obsolete=old.onfinish;body.displayed={...body.natural,opacity:'.4',transform:'matrix(.99,0,0,.99,0,2)'}
      motion.animateNativePopover(details,true)
      assert.equal(body.lastAnimation.frames[0].opacity,.4);assert.equal(body.nativeHideCalls??0,0);assert.equal(body.inert,false)
      obsolete();assert.equal(body.nativeShown,true);body.lastAnimation.finish()
      motion.animateNativePopover(details,false);body.lastAnimation.finish()
      assert.equal(body.nativeShown,false);assert.equal(body.getAttribute('popover'),null);assert.equal(body.style.position,'')
      assert.equal(body.style.maxHeight,'');assert.equal(details.open,false)
    } finally {dispose();host.close()}
  })
  await test('Top-layer placement follows resize and scroll immediately and outside or Escape closes latest intent', () => {
    const host=motionDomHost(),details=new host.Details(),summary=new host.Node('summary'),body=host.enablePopover(new host.Node('div')),outside=new host.Node('button')
    details.setAttribute('data-ui-motion-popover','');summary.rect={left:300,top:100,width:44,height:44};body.rect.height=200
    details.append(summary,body);host.editor.append(details,outside);const dispose=motion.installUiMotion()
    try {
      body.lastAnimation.finish();const firstTop=body.style.top;summary.rect.top=160;host.emit('scroll',host.doc.body)
      assert.notEqual(body.style.top,firstTop);assert.equal(body.lastAnimation.cancellations,1)
      host.win.innerHeight=260;host.win.dispatchEvent(host.event('resize',host.win));assert.ok(body.getBoundingClientRect().bottom<=252)
      host.emit('pointerdown',outside);assert.equal(details.dataset.uiPopoverOpen,'false');assert.equal(body.inert,true)
      motion.animateNativePopover(details,true);body.lastAnimation.finish();body.focus()
      const escape=host.emit('keydown',body,{key:'Escape',repeat:false})
      assert.equal(escape.defaultPrevented,true);assert.equal(details.dataset.uiPopoverOpen,'false');assert.equal(host.doc.activeElement,summary)
      preferences.systemReducedMotion.value=true;assert.equal(body.nativeShown,false);assert.equal(details.open,false)
      assert.equal(motion.getUiMotionDiagnostics().activeJobs,0)
    } finally {dispose();host.close()}
    assert.equal(host.doc.bindings.length,0);assert.equal(host.win.bindings.length,0)
  })
  await test('Top-layer removal restores authored styles and attributes while legacy fallback remains scroll bounded', () => {
    const host=motionDomHost(),details=new host.Details(),summary=new host.Node('summary'),body=host.enablePopover(new host.Node('div'))
    details.setAttribute('data-ui-motion-popover','');body.style.setProperty('position','absolute','important');body.style.margin='7px';body.style.maxHeight='50vh';body.dataset.uiPopoverLayer='authored'
    details.append(summary,body);host.editor.append(details);const dispose=motion.installUiMotion()
    try {
      const current=body.lastAnimation;details.remove();host.observers[0].notify([{type:'childList',target:host.editor,addedNodes:[],removedNodes:[details]}])
      assert.equal(body.nativeShown,false);assert.equal(current.cancellations,1);assert.equal(body.style.position,'absolute')
      assert.equal(body.style.getPropertyPriority('position'),'important');assert.equal(body.style.margin,'7px');assert.equal(body.style.maxHeight,'50vh')
      assert.equal(body.dataset.uiPopoverLayer,'authored');assert.equal(body.getAttribute('popover'),null)
      const clip=new host.Node('section'),legacy=new host.Details(),trigger=new host.Node('summary'),menu=new host.Node('div')
      clip.natural.overflow='hidden';clip.rect={left:0,top:300,width:320,height:280}
      legacy.setAttribute('data-ui-motion-popover','');legacy.open=false;trigger.rect={left:30,top:460,width:44,height:44};menu.rect.height=400
      legacy.append(trigger,menu);clip.append(legacy);host.editor.append(clip)
      motion.animateNativePopover(legacy,true);assert.equal(menu.dataset.uiPopoverLayer,'inline');assert.equal(menu.style.getPropertyValue('position'),'')
      assert.equal(menu.style.overflow,'auto');assert.ok(Number.parseFloat(menu.style.maxHeight)<=152)
      motion.animateNativePopover(legacy,false);menu.lastAnimation.finish();assert.equal(menu.style.maxHeight,'')
    } finally {dispose();host.close()}
    assert.equal(motion.getUiMotionDiagnostics().nativePopovers,0)
  })

  await test('Native layer inherits live editor text and restores explicit authored color and priority', () => {
    const host=motionDomHost(),details=new host.Details(),summary=new host.Node('summary'),body=host.enablePopover(new host.Node('div')),authored=new host.Details(),explicit=host.enablePopover(new host.Node('div'))
    details.setAttribute('data-ui-motion-popover','');details.append(summary,body)
    authored.setAttribute('data-ui-motion-popover','');explicit.style.setProperty('color','var(--custom-menu-text)','important');authored.append(new host.Node('summary'),explicit)
    host.editor.append(details,authored);const dispose=motion.installUiMotion()
    try {
      assert.equal(body.style.color,'inherit');body.natural.color='rgb(20, 30, 40)';body.lastAnimation.finish()
      motion.animateNativePopover(details,false);body.lastAnimation.finish();assert.equal(body.style.color,'')
      assert.equal(explicit.style.color,'var(--custom-menu-text)');assert.equal(explicit.style.getPropertyPriority('color'),'important')
    } finally {dispose();host.close()}
    assert.equal(body.style.color,'');assert.equal(explicit.style.color,'var(--custom-menu-text)');assert.equal(explicit.style.getPropertyPriority('color'),'important')
  })
  await test('Open-only popup geometry observes trigger and async surface sizes and releases on close, cancel and removal', () => {
    const host=motionDomHost(),details=new host.Details(),summary=new host.Node('summary'),body=host.enablePopover(new host.Node('div'))
    details.setAttribute('data-ui-motion-popover','');details.open=false;summary.rect={left:920,top:520,width:44,height:44};body.rect={left:0,top:0,width:220,height:100};details.append(summary,body);host.editor.append(details)
    const dispose=motion.installUiMotion()
    try {
      assert.equal(host.resizeObservers.length,0);motion.animateNativePopover(details,true);const first=host.resizeObservers.at(-1)
      assert.deepEqual([...first.targets],[summary,body]);body.lastAnimation.finish();body.rect.height=450;first.notify();assert.ok(body.getBoundingClientRect().bottom<=summary.rect.top-8)
      summary.rect.left=30;first.notify();assert.equal(body.style.left,'30px')
      motion.animateNativePopover(details,false);assert.equal(first.targets.size,0);const previous=body.style.left;summary.rect.left=200;first.notify();assert.equal(body.style.left,previous)
      motion.animateNativePopover(details,true);const next=host.resizeObservers.at(-1);assert.equal(next.targets.size,2)
      const close=motion.animateNativePopover(details,false);close.cancel();assert.equal(next.targets.size,0)
      motion.animateNativePopover(details,true);const removed=host.resizeObservers.at(-1);details.remove();host.observers[0].notify([{type:'childList',target:host.editor,addedNodes:[],removedNodes:[details]}]);assert.equal(removed.targets.size,0)
    } finally {dispose();host.close()}
    assert.ok(host.resizeObservers.every(o=>o.targets.size===0))
  })
  await test('Keyboard focus leaving a native popup closes immediately without taking focus from the new target', () => {
    const host=motionDomHost(),details=new host.Details(),summary=new host.Node('summary'),body=host.enablePopover(new host.Node('div')),input=new host.Input('text'),outside=new host.Node('button')
    details.setAttribute('data-ui-motion-popover','');body.append(input);details.append(summary,body);host.editor.append(details,outside);const dispose=motion.installUiMotion()
    try {
      body.lastAnimation.finish();input.focus();host.emit('focusin',input);assert.equal(details.dataset.uiPopoverOpen,'true')
      outside.focus();host.emit('focusin',outside);assert.equal(details.dataset.uiPopoverOpen,'false');assert.equal(body.inert,true);assert.equal(host.doc.activeElement,outside);assert.equal(details.open,true)
      body.lastAnimation.finish();assert.equal(body.nativeShown,false);assert.equal(host.doc.activeElement,outside)
    } finally {dispose();host.close()}
  })
} finally {
  clean()
  globalThis.document=hostDocument
  const result = { engineVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version, generatedAt: new Date().toISOString(), sourceSha256: crypto.createHash('sha256').update(fs.readFileSync('src/ui/motion.ts')).digest('hex'), scope: 'Real production motion module with deterministic WAAPI/DOMMatrix and DOM/event/observer host doubles; browser timing, native drag pixels and compositor costs require separate real-browser evidence.', status: checks.every(check => check.status === 'passed') ? 'passed' : 'failed', passed: checks.filter(check => check.status === 'passed').length, total: checks.length, checks }
  fs.mkdirSync(path.dirname(report), { recursive: true })
  fs.writeFileSync(report, JSON.stringify(result, null, 2) + '\n')
  await opened.close()
  if (result.status === 'failed') process.exitCode = 1
}
