<template>
  <Transition appear :css="false" @before-enter="restore" @enter="enter" @before-leave="deactivate" @leave="leave" @enter-cancelled="cancel" @leave-cancelled="cancel" @after-leave="restore"><slot /></Transition>
</template>
<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { animatePresence, cancelMotion, deactivateMotionSurface, type SpringPreset } from '../motion'
const props = withDefaults(defineProps<{ preset?: SpringPreset; distance?: number; modal?: boolean }>(), { preset: 'smooth', distance: 8, modal: false })
const exiting = new Map<HTMLElement, () => void>()
const mounted = new Set<HTMLElement>()
const generations = new WeakMap<HTMLElement, number>()
const surfaces = new Map<HTMLElement, HTMLElement>()
function restore(element: Element) {
  const el = element as HTMLElement
  exiting.get(el)?.()
  exiting.delete(el)
}
function deactivate(element: Element) {
  const el = element as HTMLElement
  restore(el)
  exiting.set(el, deactivateMotionSurface(el, props.modal))
}
function surface(el: HTMLElement) {
  const next = props.modal ? el.querySelector<HTMLElement>('.ui-dialog,[role="dialog"],[role="alertdialog"]') : null
  const previous = surfaces.get(el)
  if (previous && previous !== next) { cancelMotion(previous); mounted.delete(previous) }
  if (next) surfaces.set(el, next); else surfaces.delete(el)
  return next
}
function enter(element: Element, done: () => void) {
  const el = element as HTMLElement, generation = (generations.get(el) ?? 0) + 1
  generations.set(el, generation)
  const inner = surface(el)
  mounted.add(el)
  // A modal scrim always covers the viewport; only the inner surface can move.
  animatePresence(el, 'enter', () => { mounted.delete(el); if (!inner && generations.get(el) === generation) done() }, { preset: props.preset, duration: 'standard', distance: props.modal ? 0 : props.distance, scale: 1 })
  if (inner) {
    mounted.add(inner)
    animatePresence(inner, 'enter', () => { mounted.delete(inner); if (generations.get(el) !== generation) return; surfaces.delete(el); done() }, { preset: props.preset, duration: 'emphasized', distance: props.distance, scale: .985 })
  }
}
function leave(element: Element, done: () => void) {
  const el = element as HTMLElement, generation = (generations.get(el) ?? 0) + 1
  generations.set(el, generation)
  const inner = surface(el)
  if (inner) {
    mounted.add(inner)
    animatePresence(inner, 'leave', () => mounted.delete(inner), { preset: 'snappy', duration: 'standard', distance: props.distance, scale: .985 })
  }
  mounted.add(el)
  animatePresence(el, 'leave', () => {
    mounted.delete(el)
    if (generations.get(el) !== generation) return
    if (inner) { cancelMotion(inner); mounted.delete(inner) }
    surfaces.delete(el)
    done()
  }, { preset: 'snappy', duration: 'fast', distance: props.modal ? 0 : props.distance, scale: 1 })
}
function cancel(element: Element) {
  const el = element as HTMLElement
  generations.set(el, (generations.get(el) ?? 0) + 1)
  cancelMotion(el)
  mounted.delete(el)
  const inner = surfaces.get(el)
  if (inner) { cancelMotion(inner); mounted.delete(inner) }
  surfaces.delete(el)
  restore(el)
}
onBeforeUnmount(() => {
  for (const el of mounted) cancelMotion(el)
  mounted.clear()
  for (const restoreExit of exiting.values()) restoreExit()
  exiting.clear()
  surfaces.clear()
})
</script>
