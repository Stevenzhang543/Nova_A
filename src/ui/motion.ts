/** Finite editor motion. Project/game data and direct pointer coordinates never enter this module. */
import { watch } from 'vue'
import { editorPerformancePreferences, preferencesState, systemReducedMotion } from '../store/preferences'

export const MOTION_DURATIONS = Object.freeze({ micro: 120, fast: 180, standard: 240, emphasized: 320 })
export const SPRING_PRESETS = Object.freeze({
  snappy: Object.freeze({ stiffness: 700, damping: 34, mass: 1 }),
  smooth: Object.freeze({ stiffness: 360, damping: 28, mass: 1 }),
  elastic: Object.freeze({ stiffness: 480, damping: 22, mass: 1 })
})
export type SpringPreset = keyof typeof SPRING_PRESETS
export type MotionDuration = keyof typeof MOTION_DURATIONS
export interface MotionHandle { cancel: () => void }
export interface PresenceOptions { preset?: SpringPreset; duration?: MotionDuration; distance?: number; scale?: number; preserveOpacity?: boolean }
export interface MotionRect { left: number; top: number; width: number; height: number }
type MotionJob = { animation: Animation; finish: () => void }
const active = new Map<HTMLElement, MotionJob>()
const interruptedPresentation = new WeakMap<HTMLElement, { opacity: number; transform: string }>()

/** Exact damped-oscillator step response, sampled once; there is no idle animation loop. */
export function sampleSpring(preset: SpringPreset = 'snappy') {
  const { stiffness, damping, mass } = SPRING_PRESETS[preset]
  const frequency = Math.sqrt(stiffness / mass), decay = damping / (2 * mass)
  const damped = Math.sqrt(frequency * frequency - decay * decay)
  const seconds = Math.min(.8, Math.max(.24, -Math.log(.001) / decay))
  const count = Math.min(60, Math.max(24, Math.ceil(seconds * 120)))
  const frames = Array.from({ length: count + 1 }, (_, index) => {
    const offset = index / count, time = offset * seconds
    const progress = index === count ? 1 : 1 - Math.exp(-decay * time) * (Math.cos(damped * time) + decay / damped * Math.sin(damped * time))
    return { offset, progress }
  })
  return { durationMs: Math.round(seconds * 1000), frames }
}

export function getUiMotionPolicy(): 'on' | 'light' | 'reduced' {
  if (preferencesState.reduceMotion || systemReducedMotion.value) return 'reduced'
  return editorPerformancePreferences.value.decorativeMotion ? 'on' : 'light'
}
export function isMotionReduced(): boolean { return getUiMotionPolicy() === 'reduced' }
function motionAmplitude(): number { return getUiMotionPolicy() === 'light' ? .6 : 1 }

/** Cancellation intentionally never delivers an obsolete Vue transition completion. */
export function cancelMotion(element: HTMLElement): void {
  const previous = active.get(element)
  if (!previous) return
  interruptedPresentation.set(element, presentation(element))
  active.delete(element)
  previous.animation.onfinish = null
  previous.animation.oncancel = null
  previous.animation.cancel()
}

export function run(element: HTMLElement, frames: Keyframe[], duration: MotionDuration, done?: () => void): MotionHandle {
  cancelMotion(element)
  interruptedPresentation.delete(element)
  if (isMotionReduced() || typeof element.animate !== 'function' || !element.isConnected) {
    done?.()
    return { cancel: () => {} }
  }
  let complete = false
  let animation: Animation
  try { animation = element.animate(frames, { duration: MOTION_DURATIONS[duration], easing: 'linear', fill: 'both' }) }
  catch { done?.(); return { cancel: () => {} } }
  const finish = () => {
    if (complete || active.get(element)?.animation !== animation) return
    complete = true
    active.delete(element)
    animation.onfinish = null
    animation.oncancel = null
    animation.cancel()
    done?.()
  }
  active.set(element, { animation, finish })
  animation.onfinish = finish
  animation.oncancel = () => { if (active.get(element)?.animation === animation) active.delete(element) }
  return { cancel: () => { if (active.get(element)?.animation === animation) cancelMotion(element) } }
}

/** A real layout disclosure uses height only; its data and pointer coordinates remain immediate. */
export function animateBlockSize(element: HTMLElement, from: number, to: number, done?: () => void): MotionHandle {
  const start = Number.isFinite(from) ? Math.max(0, from) : 0
  const end = Number.isFinite(to) ? Math.max(0, to) : start
  const minimum = Math.min(start, end)
  return run(element, sampleSpring('smooth').frames.map(({ offset, progress }) => ({
    offset, height: Math.max(minimum, start + (end - start) * progress) + 'px'
  })), 'standard', done)
}

/** Retain a closing modal's hit-testing scrim while deactivating its controls.
 * Restoring is idempotent and preserves authored inert, pointer and accessibility values.
 */
export function deactivateMotionSurface(element: HTMLElement, modal = false): () => void {
  const saved = { inert: element.inert, pointerEvents: element.style.pointerEvents, exit: element.getAttribute('data-ui-exit'), ariaHidden: element.getAttribute('aria-hidden') }
  const children = modal ? Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement).map(child => ({ child, inert: child.inert })) : []
  let closed = false
  const block = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation() }
  const names = ['pointerdown', 'pointerup', 'click', 'dblclick', 'keydown']
  element.inert = modal ? false : true
  element.style.pointerEvents = modal ? 'auto' : 'none'
  element.dataset.uiExit = 'true'
  element.setAttribute('aria-hidden', 'true')
  for (const { child } of children) child.inert = true
  if (modal) for (const name of names) element.addEventListener(name, block, true)
  return () => {
    if (closed) return
    closed = true
    if (modal) for (const name of names) element.removeEventListener(name, block, true)
    element.inert = saved.inert
    element.style.pointerEvents = saved.pointerEvents
    for (const { child, inert } of children) child.inert = inert
    if (saved.exit === null) element.removeAttribute('data-ui-exit'); else element.setAttribute('data-ui-exit', saved.exit)
    if (saved.ariaHidden === null) element.removeAttribute('aria-hidden'); else element.setAttribute('aria-hidden', saved.ariaHidden)
  }
}

function presentation(element: HTMLElement) {
  const style = getComputedStyle(element)
  return { opacity: Number.isFinite(Number(style.opacity)) ? Number(style.opacity) : 1, transform: style.transform || 'none' }
}
function transformed(base: string, x: number, y: number, scale = 1, scaleY = scale): string {
  return `${base === 'none' ? '' : base + ' '}translate(${x}px, ${y}px) scale(${scale}, ${scaleY})`
}

/** Interruptions start at the displayed opacity/transform; authored transforms stay intact. */
export function animatePresence(element: HTMLElement, phase: 'enter' | 'leave', done?: () => void, options: PresenceOptions = {}): MotionHandle {
  const interrupted = active.has(element) || interruptedPresentation.has(element)
  const displayed = active.has(element) ? presentation(element) : interruptedPresentation.get(element) ?? presentation(element)
  cancelMotion(element)
  interruptedPresentation.delete(element)
  const natural = presentation(element)
  const distance = Math.max(-32, Math.min(32, (options.distance ?? 8) * motionAmplitude())), scale = Math.max(.95, Math.min(1.05, 1 + ((options.scale ?? .985) - 1) * motionAmplitude()))
  const hidden = transformed(natural.transform, 0, distance, scale)
  const hiddenOpacity = options.preserveOpacity ? natural.opacity : 0
  const start = interrupted ? displayed : phase === 'enter' ? { opacity: hiddenOpacity, transform: hidden } : natural
  const end = phase === 'enter' ? natural : { opacity: hiddenOpacity, transform: hidden }
  // Matrix interpolation is delegated to WAAPI; the real oscillator controls offset spacing.
  const sampled = sampleSpring(options.preset ?? 'smooth')
  const frames: Keyframe[] = sampled.frames.map(({ offset, progress }) => ({
    offset,
    opacity: Math.max(0, Math.min(1, start.opacity + (end.opacity - start.opacity) * progress)),
    transform: interpolateTransform(start.transform, end.transform, progress)
  }))
  return run(element, frames, options.duration ?? (phase === 'enter' ? 'standard' : 'fast'), done)
}

function interpolateTransform(start: string, end: string, progress: number): string {
  if (typeof DOMMatrixReadOnly === 'undefined') return progress < .5 ? start : end
  const a = new DOMMatrixReadOnly(start === 'none' ? undefined : start), b = new DOMMatrixReadOnly(end === 'none' ? undefined : end)
  if (!a.is2D || !b.is2D) return progress < .5 ? start : end
  const values = ['a', 'b', 'c', 'd', 'e', 'f'].map(key => {
    const property = key as 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
    return a[property] + (b[property] - a[property]) * progress
  })
  return `matrix(${values.join(',')})`
}

/** Only the mounted window is measured, keeping virtual lists bounded. */
export function captureRects(elements: Iterable<HTMLElement>): Map<HTMLElement, MotionRect> {
  const result = new Map<HTMLElement, MotionRect>()
  for (const element of elements) {
    if (result.size >= 80) break
    if (element.isConnected) {
      const { left, top, width, height } = element.getBoundingClientRect()
      result.set(element, { left, top, width, height })
    }
  }
  return result
}

/** FLIP runs after a committed drop/selection; dragged pointer geometry is never animated. */
export function animateReorder(before: Map<HTMLElement, MotionRect>, elements: Iterable<HTMLElement>): void {
  let count = 0
  const sampled = sampleSpring('smooth')
  for (const element of elements) {
    if (++count > 80) break
    const previous = before.get(element)
    if (!previous || !element.isConnected || isMotionReduced()) continue
    cancelMotion(element)
    const rect = element.getBoundingClientRect(), x = previous.left - rect.left, y = previous.top - rect.top
    const scaleX = rect.width > 0 ? previous.width / rect.width : 1
    if (Math.abs(x) + Math.abs(y) + Math.abs(previous.width - rect.width) < .5) continue
    const natural = presentation(element)
    // The captured rectangle includes any interrupted presentation; cancellation exposes the target.
    run(element, sampled.frames.map(({ offset, progress }) => ({ offset, transformOrigin: '0 0', transform: transformed(natural.transform, x * (1 - progress), y * (1 - progress), 1 + (scaleX - 1) * (1 - progress), 1) })), 'standard')
  }
}

let dragSource: HTMLElement | undefined, dragPreview: HTMLElement | undefined
/** A compact native drag image follows the platform pointer exactly, without an elastic tether. */
export function beginNativeDrag(event: DragEvent, label: string): void {
  endNativeDrag()
  const source = event.currentTarget as HTMLElement | null
  if (!source || !event.dataTransfer || typeof document === 'undefined') return
  cancelMotion(source)
  dragSource = source
  source.dataset.uiDragging = 'true'
  document.documentElement.dataset.uiDragging = 'true'
  const preview = document.createElement('div')
  preview.className = 'ui-drag-preview'
  preview.setAttribute('aria-hidden', 'true')
  const icon = source.querySelector('svg')?.cloneNode(true)
  if (icon) preview.append(icon)
  const text = document.createElement('span')
  text.textContent = label
  preview.append(text)
  document.body.append(preview)
  event.dataTransfer.setDragImage(preview, 16, 16)
  dragPreview = preview
}
export function endNativeDrag(): void {
  if (dragSource) delete dragSource.dataset.uiDragging
  dragPreview?.remove()
  dragSource = dragPreview = undefined
  if (typeof document !== 'undefined') delete document.documentElement.dataset.uiDragging
}

/** Policy changes settle pending transitions immediately; installations are explicitly disposable. */
export function installUiMotion(): () => void {
  const stop = watch(() => isMotionReduced(), reduced => {
    if (reduced) for (const job of [...active.values()]) job.finish()
  }, { flush: 'sync' })
  const disposeInteractions = installMotionInteractions()
  const end = () => endNativeDrag()
  window.addEventListener('dragend', end)
  window.addEventListener('drop', end)
  window.addEventListener('blur', end)
  return () => {
    stop()
    disposeInteractions()
    window.removeEventListener('dragend', end)
    window.removeEventListener('drop', end)
    window.removeEventListener('blur', end)
    for (const element of [...active.keys()]) cancelMotion(element)
    endNativeDrag()
  }
}

// Presentation only: native values, project edits and history commit synchronously.
interface UiDisclosureState {
  desired:boolean; generation:number; running:boolean; height:string; overflow:string
  summary:HTMLElement|null; ariaExpanded:string|null
  content:Map<HTMLElement,{inert:boolean;pointerEvents:string}>
}
const uiDisclosures=new Map<HTMLDetailsElement,UiDisclosureState>(),uiDragFeedback=new Set<HTMLElement>()
let uiInteractionBindings=0
const disclosureSelector='details.ui-property-section,details[data-ui-motion-disclosure]'
function isEditorUi(el:Element):boolean{
  if(el.closest('.canvas-container,.player-root,[data-game-ui-control]'))return false
  return !!el.closest('.editor-root,.project-manager,[data-ui-editor-layer]')||!!document.querySelector('.editor-root,.project-manager')
}
export function hasActiveMotion(el:HTMLElement):boolean{return active.has(el)}
export function getUiMotionDiagnostics(){return{activeJobs:active.size,policy:getUiMotionPolicy(),interactionBindings:uiInteractionBindings,disclosures:uiDisclosures.size,nativePopovers:uiNativePopovers.size,dragFeedback:uiDragFeedback.size}}
function disclosureState(details:HTMLDetailsElement):UiDisclosureState{
  let state=uiDisclosures.get(details)
  if(!state){
    const summary=details.querySelector<HTMLElement>(':scope > summary')
    state={desired:details.open,generation:0,running:false,height:details.style.height,overflow:details.style.overflow,summary,ariaExpanded:summary?.getAttribute('aria-expanded')??null,content:new Map()}
    uiDisclosures.set(details,state);details.dataset.uiDisclosureControlled='true';details.dataset.uiDisclosureOpen=String(state.desired)
    summary?.setAttribute('aria-expanded',String(state.desired))
  }
  for(const child of Array.from(details.children)){
    if(!(child instanceof HTMLElement)||child.tagName==='SUMMARY'||state.content.has(child))continue
    state.content.set(child,{inert:child.inert,pointerEvents:child.style.pointerEvents})
  }
  for(const child of state.content.keys())if(child.parentElement!==details)state.content.delete(child)
  return state
}
function restoreDisclosure(details:HTMLDetailsElement,state:UiDisclosureState){
  details.style.height=state.height;details.style.overflow=state.overflow
  for(const[child,saved]of state.content){child.inert=saved.inert;child.style.pointerEvents=saved.pointerEvents}
}
function releaseDisclosure(details:HTMLDetailsElement,state:UiDisclosureState){
  cancelMotion(details);details.open=state.desired;restoreDisclosure(details,state)
  delete details.dataset.uiDisclosureControlled;delete details.dataset.uiDisclosureOpen
  if(state.ariaExpanded===null)state.summary?.removeAttribute('aria-expanded');else state.summary?.setAttribute('aria-expanded',state.ariaExpanded)
  uiDisclosures.delete(details)
}
export function animateDisclosure(details:HTMLDetailsElement,open:boolean,notify=true):MotionHandle{
  const state=disclosureState(details),from=details.getBoundingClientRect().height
  cancelMotion(details);const generation=++state.generation
  state.desired=open;state.running=true;details.dataset.uiDisclosureOpen=String(open);state.summary?.setAttribute('aria-expanded',String(open))
  if(notify)details.dispatchEvent(new CustomEvent('ui-disclosure-change',{detail:{open}}))
  if(!open&&state.summary&&[...state.content.keys()].some(child=>child.contains(document.activeElement)))state.summary.focus({preventScroll:true})
  details.open=true;details.style.height=state.height
  const style=getComputedStyle(details),number=(v:string)=>Number.parseFloat(v)||0
  const closed=(state.summary?.getBoundingClientRect().height??0)+number(style.paddingTop)+number(style.paddingBottom)+number(style.borderTopWidth)+number(style.borderBottomWidth)
  const to=open?details.getBoundingClientRect().height:closed
  for(const[child,saved]of state.content){child.inert=open?saved.inert:true;child.style.pointerEvents=open?saved.pointerEvents:'none'}
  details.style.overflow='clip'
  return run(details,sampleSpring('smooth').frames.map(({offset,progress})=>({offset,height:Math.max(closed,from+(to-from)*progress)+'px'})),'standard',()=>{
    if(state.generation!==generation)return
    state.running=false;details.open=state.desired;restoreDisclosure(details,state)
  })
}
/** Remeasure a committed lazy body without re-emitting intent or reviving a stale target. */
export function refreshDisclosure(details:HTMLDetailsElement):MotionHandle{
  const state=uiDisclosures.get(details)
  if(!state||!details.isConnected)return{cancel:()=>{}}
  return animateDisclosure(details,state.desired,false)
}


interface UiNativePopoverLayer {
  native: boolean; shown: boolean; wasOpen: boolean; alignEnd: boolean
  color: string
  popover: string | null; marker: string | null
  styles: Map<string, { value: string; priority: string }>
}
const nativePopoverStyleProperties = ['position','inset','inset-inline','inset-block','inset-block-start','inset-block-end','left','top','right','bottom','margin','max-width','max-height','min-width','overflow','box-sizing','z-index','color']
function nativePopoverLayer(surface: HTMLElement): UiNativePopoverLayer {
  const style = getComputedStyle(surface)
  let wasOpen = false
  try { wasOpen = surface.matches(':popover-open') } catch {}
  return {
    native: typeof surface.showPopover === 'function' && typeof surface.hidePopover === 'function',
    shown: false, wasOpen, color: surface.style.getPropertyValue('color') || 'inherit', alignEnd: Boolean(style.right && style.right !== 'auto') || Boolean(style.insetInlineEnd && style.insetInlineEnd !== 'auto'),
    popover: surface.getAttribute('popover'), marker: surface.getAttribute('data-ui-popover-layer'),
    styles: new Map(nativePopoverStyleProperties.map(name => [name, { value: surface.style.getPropertyValue(name), priority: surface.style.getPropertyPriority(name) }]))
  }
}
function restoreNativePopoverLayer(surface: HTMLElement, layer: UiNativePopoverLayer, restoreAuthoredOpen = false) {
  if (layer.shown) { layer.shown = false; try { surface.hidePopover() } catch {} }
  for (const [name, saved] of layer.styles) {
    if (saved.value) surface.style.setProperty(name, saved.value, saved.priority); else surface.style.removeProperty(name)
  }
  if (layer.popover === null) surface.removeAttribute('popover'); else surface.setAttribute('popover', layer.popover)
  if (layer.marker === null) surface.removeAttribute('data-ui-popover-layer'); else surface.setAttribute('data-ui-popover-layer', layer.marker)
  if (restoreAuthoredOpen && layer.wasOpen && surface.isConnected) try { surface.showPopover() } catch {}
}
function nativePopoverViewport() {
  const viewport = window.visualViewport
  const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0
  const width = Math.max(1, viewport?.width ?? window.innerWidth ?? document.documentElement.clientWidth)
  const height = Math.max(1, viewport?.height ?? window.innerHeight ?? document.documentElement.clientHeight)
  return { left: left + 8, top: top + 8, right: left + width - 8, bottom: top + height - 8 }
}
function positionNativePopoverLayer(details: HTMLDetailsElement, surface: HTMLElement, layer: UiNativePopoverLayer) {
  const summary = details.querySelector<HTMLElement>(':scope > summary')
  if (!summary || !surface.isConnected) return
  const viewport = nativePopoverViewport(), anchor = summary.getBoundingClientRect(), gap = 8
  const set = (name: string, value: string) => surface.style.setProperty(name, value)
  if (layer.native && layer.shown) {
    set('max-width', Math.max(0, viewport.right - viewport.left) + 'px')
    set('max-height', Math.max(0, viewport.bottom - viewport.top) + 'px')
    const rect = surface.getBoundingClientRect(), naturalHeight = surface.offsetHeight || rect.height
    const below = Math.max(0, viewport.bottom - anchor.bottom - gap), above = Math.max(0, anchor.top - gap - viewport.top)
    const flip = naturalHeight > below && above > below, available = flip ? above : below
    set('max-height', available + 'px')
    const sized = surface.getBoundingClientRect(), width = surface.offsetWidth || sized.width, height = surface.offsetHeight || sized.height
    const left = Math.min(Math.max(viewport.left, layer.alignEnd ? anchor.right - width : anchor.left), Math.max(viewport.left, viewport.right - width))
    const top = Math.min(Math.max(viewport.top, flip ? anchor.top - gap - height : anchor.bottom + gap), Math.max(viewport.top, viewport.bottom - height))
    set('left', left + 'px'); set('top', top + 'px')
    return
  }
  // Legacy engines retain inline DOM/position and scroll inside their clipping regions.
  const bounds = { ...viewport }
  for (let parent = details.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent)
    if (!/(hidden|clip|auto|scroll)/.test([style.overflow, style.overflowX, style.overflowY].join(' '))) continue
    const rect = parent.getBoundingClientRect()
    bounds.left = Math.max(bounds.left, rect.left); bounds.right = Math.min(bounds.right, rect.right)
    bounds.top = Math.max(bounds.top, rect.top); bounds.bottom = Math.min(bounds.bottom, rect.bottom)
  }
  const below = Math.max(0, bounds.bottom - anchor.bottom - gap), above = Math.max(0, anchor.top - gap - bounds.top)
  const naturalHeight = surface.offsetHeight || surface.getBoundingClientRect().height
  const flip = naturalHeight > below && above > below
  if (flip) { set('inset-block-start', 'auto'); set('inset-block-end', '100%'); set('top', 'auto'); set('bottom', '100%') }
  set('max-width', Math.max(0, bounds.right - bounds.left) + 'px')
  set('max-height', Math.max(0, flip ? above : below) + 'px')
}
function showNativePopoverLayer(details: HTMLDetailsElement, surface: HTMLElement, layer: UiNativePopoverLayer) {
  surface.style.setProperty('overflow', 'auto'); surface.style.setProperty('box-sizing', 'border-box'); surface.style.setProperty('min-width', '0')
  if (layer.native) {
    // These menu surfaces inherit editor text; neutralize UA CanvasText without freezing live theme colors.
    surface.style.setProperty('color', layer.color, layer.styles.get('color')?.priority ?? '')
    surface.setAttribute('popover', 'manual')
    for (const [name, value] of [['position','fixed'],['inset','auto'],['inset-inline','auto'],['inset-block','auto'],['inset-block-start','auto'],['inset-block-end','auto'],['right','auto'],['bottom','auto'],['margin','0']]) surface.style.setProperty(name!, value!)
    try { if (!layer.shown) surface.showPopover(); layer.shown = true } catch {
      layer.native = false; restoreNativePopoverLayer(surface, layer)
      surface.style.setProperty('overflow', 'auto'); surface.style.setProperty('box-sizing', 'border-box'); surface.style.setProperty('min-width', '0')
    }
  }
  surface.dataset.uiPopoverLayer = layer.native && layer.shown ? 'top' : 'inline'
  positionNativePopoverLayer(details, surface, layer)
}

interface UiNativePopoverSurface {
  inert: boolean; pointerEvents: string; opacity: string; ariaHidden: string | null; exit: string | null; layer: UiNativePopoverLayer
}
interface UiNativePopoverState {
  desired: boolean; generation: number; running: boolean; expectedOpen: boolean | null; order: number
  summary: HTMLElement | null; ariaExpanded: string | null
  surfaces: Map<HTMLElement, UiNativePopoverSurface>
  geometryObserver: ResizeObserver | null
}
const uiNativePopovers = new Map<HTMLDetailsElement, UiNativePopoverState>()
const nativePopoverSelector = 'details[data-ui-motion-popover]'
let nativePopoverOrder = 0
function restoreNativePopoverSurface(surface: HTMLElement, saved: UiNativePopoverSurface) {
  surface.inert = saved.inert
  surface.style.pointerEvents = saved.pointerEvents
  surface.style.opacity = saved.opacity
  if (saved.ariaHidden === null) surface.removeAttribute('aria-hidden'); else surface.setAttribute('aria-hidden', saved.ariaHidden)
  if (saved.exit === null) surface.removeAttribute('data-ui-popover-exit'); else surface.setAttribute('data-ui-popover-exit', saved.exit)
}
function nativePopoverState(details: HTMLDetailsElement): UiNativePopoverState {
  let state = uiNativePopovers.get(details)
  if (!state) {
    const summary = details.querySelector<HTMLElement>(':scope > summary')
    state = { desired: details.open, generation: 0, running: false, expectedOpen: null, order: 0, summary, ariaExpanded: summary?.getAttribute('aria-expanded') ?? null, surfaces: new Map(), geometryObserver: null }
    uiNativePopovers.set(details, state)
    details.dataset.uiPopoverControlled = 'true'
  }
  for (const [surface, saved] of state.surfaces) if (surface.parentElement !== details) {
    cancelMotion(surface); interruptedPresentation.delete(surface)
    restoreNativePopoverSurface(surface, saved); restoreNativePopoverLayer(surface, saved.layer, true); state.surfaces.delete(surface)
  }
  for (const child of Array.from(details.children)) {
    if (!(child instanceof HTMLElement) || child.tagName === 'SUMMARY' || state.surfaces.has(child)) continue
    state.surfaces.set(child, { inert: child.inert, pointerEvents: child.style.pointerEvents, opacity: child.style.opacity, ariaHidden: child.getAttribute('aria-hidden'), exit: child.getAttribute('data-ui-popover-exit'), layer: nativePopoverLayer(child) })
  }
  return state
}
function stopNativePopoverGeometry(state: UiNativePopoverState) {
  state.geometryObserver?.disconnect()
  state.geometryObserver = null
}
function observeNativePopoverGeometry(details: HTMLDetailsElement, state: UiNativePopoverState) {
  stopNativePopoverGeometry(state)
  if (!state.desired || !details.isConnected || typeof ResizeObserver === 'undefined') return
  const observer = new ResizeObserver(() => {
    if (!state.desired || !details.isConnected || uiNativePopovers.get(details) !== state) return
    for (const [surface, saved] of state.surfaces) positionNativePopoverLayer(details, surface, saved.layer)
  })
  state.geometryObserver = observer
  if (state.summary) observer.observe(state.summary)
  for (const surface of state.surfaces.keys()) observer.observe(surface)
}
function writeNativePopoverOpen(details: HTMLDetailsElement, state: UiNativePopoverState, open: boolean) {
  if (details.open === open) return
  state.expectedOpen = open
  details.open = open
}
function applyNativePopoverState(details: HTMLDetailsElement, state: UiNativePopoverState) {
  details.dataset.uiPopoverOpen = String(state.desired)
  state.summary?.setAttribute('aria-expanded', String(state.desired))
  if (!state.desired && state.summary && [...state.surfaces.keys()].some(surface => surface.contains(document.activeElement))) state.summary.focus({ preventScroll: true })
  for (const [surface, saved] of state.surfaces) {
    restoreNativePopoverSurface(surface, saved)
    if (!state.desired) {
      surface.inert = true; surface.style.pointerEvents = 'none'
      surface.setAttribute('aria-hidden', 'true'); surface.dataset.uiPopoverExit = 'true'
    }
  }
}
function settleNativePopover(details: HTMLDetailsElement, state: UiNativePopoverState) {
  ++state.generation
  for (const surface of state.surfaces.keys()) { cancelMotion(surface); interruptedPresentation.delete(surface) }
  state.running = false
  writeNativePopoverOpen(details, state, state.desired)
  applyNativePopoverState(details, state)
  if (!state.desired) stopNativePopoverGeometry(state)
  if (!state.desired) for (const [surface, saved] of state.surfaces) restoreNativePopoverLayer(surface, saved.layer)
}
function releaseNativePopover(details: HTMLDetailsElement, state: UiNativePopoverState) {
  ++state.generation
  stopNativePopoverGeometry(state)
  for (const [surface, saved] of state.surfaces) {
    cancelMotion(surface); interruptedPresentation.delete(surface)
    restoreNativePopoverSurface(surface, saved); restoreNativePopoverLayer(surface, saved.layer, true)
  }
  details.open = state.desired
  delete details.dataset.uiPopoverControlled; delete details.dataset.uiPopoverOpen
  if (state.ariaExpanded === null) state.summary?.removeAttribute('aria-expanded'); else state.summary?.setAttribute('aria-expanded', state.ariaExpanded)
  uiNativePopovers.delete(details)
}
/** Explicit native menus animate their inner surfaces; absolute positions and trigger geometry are unchanged. */
export function animateNativePopover(details: HTMLDetailsElement, open: boolean, force = false): MotionHandle {
  const state = nativePopoverState(details)
  if (!force && state.running && state.desired === open) {
    writeNativePopoverOpen(details, state, true)
    const current = state.generation
    return { cancel: () => { if (uiNativePopovers.get(details) === state && state.generation === current) settleNativePopover(details, state) } }
  }
  const generation = ++state.generation
  state.desired = open; state.running = true; if (open) state.order = ++nativePopoverOrder
  if (!open) stopNativePopoverGeometry(state)
  applyNativePopoverState(details, state)
  details.dispatchEvent(new CustomEvent('ui-popover-change', { detail: { open } }))
  // Keep native details open only while outgoing content must remain visible.
  writeNativePopoverOpen(details, state, true)
  for (const [surface, saved] of state.surfaces) showNativePopoverLayer(details, surface, saved.layer)
  if (open) observeNativePopoverGeometry(details, state)
  let remaining = state.surfaces.size
  const complete = () => {
    if (state.generation !== generation || uiNativePopovers.get(details) !== state) return
    if (--remaining > 0) return
    state.running = false
    writeNativePopoverOpen(details, state, state.desired)
    applyNativePopoverState(details, state)
    if (!state.desired) for (const [surface, saved] of state.surfaces) restoreNativePopoverLayer(surface, saved.layer)
  }
  if (!remaining) { remaining = 1; complete() }
  else for (const surface of state.surfaces.keys()) animatePresence(surface, open ? 'enter' : 'leave', () => {
    if (state.generation === generation && !state.desired) surface.style.opacity = '0'
    complete()
  }, {
    preset: open ? 'smooth' : 'snappy', duration: open ? 'standard' : 'fast', distance: open ? 6 : 4, scale: .985
  })
  return { cancel: () => { if (uiNativePopovers.get(details) === state && state.generation === generation) settleNativePopover(details, state) } }
}
function observeNativePopoverOpen(details: HTMLDetailsElement, fromToggle = false) {
  if (!details.isConnected || !isEditorUi(details)) return
  const previous = uiNativePopovers.get(details), state = previous ?? nativePopoverState(details), open = details.open
  if (!previous) { applyNativePopoverState(details, state); if (open) animateNativePopover(details, true); return }
  // Attribute records run before paint; a later coalesced toggle must not reverse our retained open write.
  if (state.expectedOpen !== null && open === state.expectedOpen) {
    if (fromToggle) state.expectedOpen = null
    return
  }
  state.expectedOpen = null
  if (state.desired === open && !state.running) return
  if (state.running && state.desired === open) { if (!open) writeNativePopoverOpen(details, state, true); return }
  animateNativePopover(details, open)
}
function mountNativePopover(details: HTMLDetailsElement) {
  if (!isEditorUi(details) || uiNativePopovers.has(details)) return
  const state = nativePopoverState(details)
  applyNativePopoverState(details, state)
  if (state.desired) animateNativePopover(details, true)
}

function installMotionInteractions():()=>void{
  if(typeof document==='undefined')return()=>{}
  let alive=true,dragElement:HTMLElement|null=null,dragStart:DOMRect|null=null
  const pressed=new Set<HTMLElement>(),ranges=new Set<HTMLInputElement>(),listeners:Array<[EventTarget,string,EventListener,boolean]>=[]
  const bind=(el:EventTarget,name:string,fn:EventListener,capture=true)=>{el.addEventListener(name,fn,capture);listeners.push([el,name,fn,capture])}
  const target=(event:Event)=>event.target instanceof Element?event.target:null
  const action=(event:Event)=>{
    const el=target(event)?.closest<HTMLElement>('button,[role="button"],[role="tab"],summary')
    if(!el||!isEditorUi(el)||el.matches(':disabled,[aria-disabled="true"],[data-ui-precision],.panel-resize-handle,.resize-handle')||el.matches('[draggable="true"]')||el.closest('[data-ui-dragging="true"]'))return null
    return el
  }
  const press=(el:HTMLElement)=>{cancelMotion(el);pressed.add(el);el.classList.add('ui-motion-action');el.dataset.uiPressed='true'}
  const release=(el:HTMLElement)=>{
    if(!pressed.delete(el))return
    const displayed=Number.parseFloat(getComputedStyle(el).scale);el.removeAttribute('data-ui-pressed')
    const from=Number.isFinite(displayed)?displayed:.975
    run(el,sampleSpring('snappy').frames.map(({offset,progress})=>({offset,scale:String(from+(1-from)*progress)})),'fast')
  }
  const releaseAll=()=>{for(const el of[...pressed])release(el);for(const input of ranges)input.removeAttribute('data-ui-range-dragging');ranges.clear()}
  bind(document,'pointerdown',event=>{
    const input=target(event)?.closest<HTMLInputElement>('input[type="range"]')
    if(input&&isEditorUi(input)){ranges.add(input);input.dataset.uiRangeDragging='true';return}
    const el=action(event);if(el&&(event as PointerEvent).button===0)press(el)
  })
  bind(document,'pointerup',releaseAll);bind(document,'pointercancel',releaseAll);bind(window,'blur',releaseAll)
  bind(document,'keydown',event=>{const e=event as KeyboardEvent;if(!e.repeat&&(e.key===' '||e.key==='Enter')){const el=action(event);if(el)press(el)}})
  bind(document,'keyup',event=>{const e=event as KeyboardEvent;if(e.key===' '||e.key==='Enter')releaseAll()})
  bind(document,'change',event=>{
    const input=target(event)
    if(!(input instanceof HTMLInputElement)||!isEditorUi(input)||input.getAttribute('role')==='switch'||!['checkbox','radio'].includes(input.type))return
    run(input,sampleSpring('snappy').frames.map(({offset,progress})=>({offset,scale:String(.9+.1*progress)})),'fast')
  })

  const repositionPopovers=()=>{for(const[details,state]of uiNativePopovers)if(details.isConnected&&(state.desired||state.running))for(const[surface,saved]of state.surfaces)positionNativePopoverLayer(details,surface,saved.layer)}
  bind(window,'resize',repositionPopovers);bind(document,'scroll',repositionPopovers)
  if(window.visualViewport){bind(window.visualViewport,'resize',repositionPopovers);bind(window.visualViewport,'scroll',repositionPopovers)}
  bind(document,'pointerdown',event=>{
    const el=target(event)
    for(const[details,state]of uiNativePopovers)if(state.desired&&el&&!details.contains(el))animateNativePopover(details,false)
  })
  bind(document,'focusin',event=>{
    const el=target(event)
    for(const[details,state]of uiNativePopovers)if(state.desired&&el&&!details.contains(el))animateNativePopover(details,false)
  })
  bind(document,'keydown',event=>{
    const key=event as KeyboardEvent
    if(key.key!=='Escape'||key.defaultPrevented)return
    const latest=[...uiNativePopovers].filter(([details,state])=>details.isConnected&&state.desired).sort((a,b)=>b[1].order-a[1].order)[0]
    if(!latest)return
    key.preventDefault();key.stopPropagation()
    animateNativePopover(latest[0],false);latest[1].summary?.focus({preventScroll:true})
  })

  bind(document,'click',event=>{
    const el=target(event),summary=el?.closest<HTMLElement>('summary'),details=summary?.parentElement
    if(!(details instanceof HTMLDetailsElement)||!isEditorUi(details)||event.defaultPrevented)return
    const nested=el?.closest('button,a,input,select,textarea,[role="button"]');if(nested&&nested!==summary)return
    if(details.matches(nativePopoverSelector)){event.preventDefault();animateNativePopover(details,!nativePopoverState(details).desired);return}
    if(!details.matches(disclosureSelector))return
    event.preventDefault();animateDisclosure(details,!disclosureState(details).desired)
  },false)
  bind(document,'toggle',event=>{
    const details=target(event)
    if(!(details instanceof HTMLDetailsElement)||!isEditorUi(details))return
    if(details.matches(nativePopoverSelector)){observeNativePopoverOpen(details,true);return}
    if(!details.matches(disclosureSelector))return
    const state=uiDisclosures.get(details)
    if(state?.running){if(!details.open)animateDisclosure(details,false);return}
    if(state?.desired===details.open)return
    animateDisclosure(details,details.open)
  })
  bind(window,'resize',()=>{for(const[details,state]of uiDisclosures)if(state.running&&details.isConnected)animateDisclosure(details,state.desired)})
  bind(document,'dragstart',event=>{
    const el=target(event)?.closest<HTMLElement>('[draggable="true"],[data-ui-dragging="true"]')
    dragElement=el&&isEditorUi(el)?el:null;dragStart=dragElement?.getBoundingClientRect()??null
    if(dragElement)releaseAll()
  })
  const finishDrag=(event:Event)=>{
    const source=dragElement,start=dragStart;dragElement=null;dragStart=null;if(!source&&!start)return
    const effect=(event as DragEvent).dataTransfer?.dropEffect,outcome=event.type==='drop'||(effect&&effect!=='none')?'drop':'cancel'
    const dest=target(event)?.closest<HTMLElement>('[data-ui-drop="valid"],[data-ui-drop="before"]'),dropRect=dest&&isEditorUi(dest)?dest.getBoundingClientRect():null
    queueMicrotask(()=>{
      if(!alive||isMotionReduced())return
      const sourceRect=source?.isConnected?source.getBoundingClientRect():null,rect=outcome==='drop'?dropRect??sourceRect??start:sourceRect??start
      if(!rect?.width||!rect.height)return
      const ring=document.createElement('div');ring.className='ui-drag-settle';ring.dataset.uiDragOutcome=outcome;ring.setAttribute('aria-hidden','true')
      Object.assign(ring.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'})
      document.body.append(ring);uiDragFeedback.add(ring)
      animatePresence(ring,'leave',()=>{uiDragFeedback.delete(ring);ring.remove()},{preset:'elastic',duration:'emphasized',distance:0,scale:1.04})
    })
  }
  bind(document,'drop',finishDrag);bind(document,'dragend',finishDrag);bind(window,'blur',()=>{dragElement=null;dragStart=null})
  const enter=(el:HTMLElement)=>{
    if(!el.isConnected||!isEditorUi(el)||el.hidden||active.has(el)||el.dataset.uiMotionOwner==='component'||getComputedStyle(el).display==='none')return
    animatePresence(el,'enter',undefined,{preset:el.dataset.uiMotionSurface==='elastic'?'elastic':'smooth',duration:'standard',distance:8,scale:1,preserveOpacity:el.dataset.uiMotionOpacity==='preserve'})
  }
  const mount=(node:Node)=>{
    if(!(node instanceof HTMLElement))return
    if(node instanceof HTMLDetailsElement&&node.matches(disclosureSelector)&&!node.matches(nativePopoverSelector)&&isEditorUi(node))disclosureState(node)
    if(node instanceof HTMLDetailsElement&&node.matches(nativePopoverSelector))mountNativePopover(node)
    for(const details of Array.from(node.querySelectorAll<HTMLDetailsElement>(disclosureSelector)).slice(0,80))if(!details.matches(nativePopoverSelector)&&isEditorUi(details))disclosureState(details)
    for(const details of Array.from(node.querySelectorAll<HTMLDetailsElement>(nativePopoverSelector)).slice(0,80))mountNativePopover(details)
    if(node.matches('[data-ui-motion-surface]'))enter(node)
    for(const el of Array.from(node.querySelectorAll<HTMLElement>('[data-ui-motion-surface]')).slice(0,80))enter(el)
  }
  const tree=new MutationObserver(records=>{
    if(!alive)return
    for(const record of records){
      if(record.type==='attributes'){const el=record.target as HTMLElement;if(el instanceof HTMLDetailsElement&&el.matches(nativePopoverSelector)&&record.attributeName==='open')observeNativePopoverOpen(el);else if(el.matches('[data-ui-motion-surface]'))enter(el);continue}
      for(const node of record.addedNodes)mount(node)
      for(const node of record.removedNodes){
        if(!(node instanceof HTMLElement)||node.isConnected)continue
        for(const el of[...active.keys()])if(node===el||node.contains(el))cancelMotion(el)
        for(const[details,state]of uiDisclosures)if(node===details||node.contains(details))releaseDisclosure(details,state)
        for(const[details,state]of uiNativePopovers)if(node===details||node.contains(details))releaseNativePopover(details,state)
        for(const el of pressed)if(node===el||node.contains(el)){pressed.delete(el);el.removeAttribute('data-ui-pressed')}
        for(const el of ranges)if(node===el||node.contains(el)){ranges.delete(el);el.removeAttribute('data-ui-range-dragging')}
        if(dragElement&&(node===dragElement||node.contains(dragElement))){dragElement=null;dragStart=null;endNativeDrag()}
        if(node.matches('.editor-root,.project-manager'))for(const ring of uiDragFeedback){cancelMotion(ring);ring.remove();uiDragFeedback.delete(ring)}
      }
      if(record.target instanceof HTMLDetailsElement&&record.target.matches(nativePopoverSelector)&&record.target.isConnected){
        const state=uiNativePopovers.get(record.target);if(state)animateNativePopover(record.target,state.desired,true)
      }
    }
  })
  tree.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-ui-motion-key','open']});mount(document.body)
  const policy=new MutationObserver(()=>{if(isMotionReduced()){for(const job of[...active.values()])job.finish();releaseAll()}})
  policy.observe(document.documentElement,{attributes:true,attributeFilter:['data-ui-motion']});uiInteractionBindings+=listeners.length
  return()=>{
    alive=false;tree.disconnect();policy.disconnect()
    for(const[el,name,fn,capture]of listeners)el.removeEventListener(name,fn,capture);uiInteractionBindings-=listeners.length
    for(const el of pressed)el.removeAttribute('data-ui-pressed');for(const el of ranges)el.removeAttribute('data-ui-range-dragging')
    pressed.clear();ranges.clear()
    for(const[details,state]of uiDisclosures)releaseDisclosure(details,state)
    for(const[details,state]of uiNativePopovers)releaseNativePopover(details,state)
    for(const ring of uiDragFeedback){cancelMotion(ring);ring.remove()}
    uiDragFeedback.clear();dragElement=null;dragStart=null
  }
}
