<template><Transition appear :css="false" @enter="enter" @leave="leave" @enter-cancelled="cancel" @leave-cancelled="cancel"><div ref="menu" v-if="open" class="ui-menu" role="menu" tabindex="-1" @keydown="navigate"><slot /></div></Transition></template>
<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { animatePresence, cancelMotion } from '../motion'
const props=withDefaults(defineProps<{open?:boolean}>(),{open:true})
const menu = ref<HTMLElement>()
const emit = defineEmits<{ close: [] }>()
function enter(element: Element, done: () => void) { const root = element as HTMLElement; root.inert = false; root.removeAttribute('aria-hidden'); animatePresence(root, 'enter', done, { preset: 'snappy', distance: 4, duration: 'fast' }) }
function leave(element: Element, done: () => void) { const root = element as HTMLElement; root.inert = true; root.setAttribute('aria-hidden', 'true'); animatePresence(root, 'leave', done, { preset: 'snappy', distance: 4, duration: 'micro' }) }
function cancel(element: Element) { cancelMotion(element as HTMLElement) }
function entries() { return [...(menu.value?.querySelectorAll<HTMLElement>('button:not(:disabled),[role="menuitem"]:not([aria-disabled="true"])') ?? [])] }
function initialize(){for(const item of entries()){item.setAttribute('role','menuitem');item.tabIndex=-1}(entries()[0]??menu.value)?.focus()}
onMounted(initialize)
watch(()=>props.open,open=>{if(open)void nextTick(initialize)})
function navigate(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); emit('close'); return }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const items = entries(); if (!items.length) return
  event.preventDefault()
  const current = items.indexOf(document.activeElement as HTMLElement)
  items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
}
</script>
