/** Finite editor motion. Project/game data and direct pointer coordinates never enter this module. */
import { watch } from 'vue'
import { editorPerformancePreferences } from '../store/preferences'

export const MOTION_DURATIONS = Object.freeze({ micro: 80, fast: 140, standard: 200, emphasized: 280 })
export const SPRING_PRESETS = Object.freeze({
  snappy: Object.freeze({ stiffness: 700, damping: 48, mass: 1 }),
  smooth: Object.freeze({ stiffness: 360, damping: 36, mass: 1 }),
  elastic: Object.freeze({ stiffness: 480, damping: 32, mass: 1 })
})
export type SpringPreset = keyof typeof SPRING_PRESETS
export type MotionDuration = keyof typeof MOTION_DURATIONS
export interface MotionHandle { cancel: () => void }
export interface PresenceOptions { preset?: SpringPreset; duration?: MotionDuration; distance?: number; scale?: number }
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

export function isMotionReduced(): boolean { return !editorPerformancePreferences.value.decorativeMotion }

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

function run(element: HTMLElement, frames: Keyframe[], duration: MotionDuration, done?: () => void): MotionHandle {
  cancelMotion(element)
  interruptedPresentation.delete(element)
  if (isMotionReduced() || typeof element.animate !== 'function' || !element.isConnected) {
    done?.()
    return { cancel: () => {} }
  }
  let complete = false
  const animation = element.animate(frames, { duration: MOTION_DURATIONS[duration], easing: 'linear', fill: 'both' })
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
  const distance = Math.max(-32, Math.min(32, options.distance ?? 6)), scale = Math.max(.95, Math.min(1.05, options.scale ?? .985))
  const hidden = transformed(natural.transform, 0, distance, scale)
  const start = interrupted ? displayed : phase === 'enter' ? { opacity: 0, transform: hidden } : natural
  const end = phase === 'enter' ? natural : { opacity: 0, transform: hidden }
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
    cancelMotion(element)
    if (!previous || !element.isConnected || isMotionReduced()) continue
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
  const stop = watch(() => editorPerformancePreferences.value.decorativeMotion, enabled => {
    if (!enabled) for (const job of [...active.values()]) job.finish()
  }, { flush: 'sync' })
  const end = () => endNativeDrag()
  window.addEventListener('dragend', end)
  window.addEventListener('drop', end)
  window.addEventListener('blur', end)
  return () => {
    stop()
    window.removeEventListener('dragend', end)
    window.removeEventListener('drop', end)
    window.removeEventListener('blur', end)
    for (const element of [...active.keys()]) cancelMotion(element)
    endNativeDrag()
  }
}
