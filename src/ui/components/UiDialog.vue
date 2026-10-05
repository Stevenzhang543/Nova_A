<template>
  <Transition appear :css="false" @enter="enter" @leave="leave" @enter-cancelled="cancel" @leave-cancelled="cancel" @after-leave="restore">
    <div v-if="open" class="ui-dialog-overlay" @pointerdown.self="backdrop"><section v-modal-focus class="ui-dialog" :role="role" aria-modal="true" :aria-labelledby="$slots.header ? undefined : headingId" :aria-label="$slots.header ? title : undefined" @keydown.esc.stop.prevent="requestClose"><header class="ui-dialog-header"><slot name="header"><h2 :id="headingId">{{ title }}</h2></slot><UiButton icon="close" :label="closeLabel || t('close')" @click="requestClose" /></header><div class="ui-dialog-body"><slot /></div><footer v-if="$slots.footer" class="ui-dialog-footer"><slot name="footer" /></footer></section></div>
  </Transition>
</template>
<script setup lang="ts">
import { onBeforeUnmount, useId } from 'vue'
import { vModalFocus } from '../../editor/modalFocus'
import { t } from '../../i18n'
import UiButton from './UiButton.vue'
import { animatePresence, cancelMotion, deactivateMotionSurface } from '../motion'
const props = withDefaults(defineProps<{ title: string; closeLabel?: string; dismissOnBackdrop?: boolean; role?: 'dialog' | 'alertdialog'; open?: boolean; motionOwner?: 'self' | 'parent' }>(), { dismissOnBackdrop: false, role: 'dialog', open: true, motionOwner: 'self' })
const headingId = useId()
const emit = defineEmits<{ close: [] }>()
const activeNodes = new Set<HTMLElement>()
const exits = new Map<HTMLElement, () => void>()
const generations = new WeakMap<HTMLElement, number>()
function requestClose(event?: Event) {
  if (!props.open || (event?.currentTarget instanceof Element && event.currentTarget.closest('[data-ui-exit="true"]'))) return
  emit('close')
}
function backdrop(event: PointerEvent) { if (props.dismissOnBackdrop) requestClose(event) }
function restore(element: Element) {
  const root = element as HTMLElement
  exits.get(root)?.()
  exits.delete(root)
}
function cancel(element: Element) {
  if (props.motionOwner === 'parent') return
  const root = element as HTMLElement
  generations.set(root, (generations.get(root) ?? 0) + 1)
  cancelMotion(root)
  activeNodes.delete(root)
  const dialog = root.querySelector<HTMLElement>('.ui-dialog')
  if (dialog) { cancelMotion(dialog); activeNodes.delete(dialog) }
  restore(root)
}
function enter(element: Element, done: () => void) {
  if (props.motionOwner === 'parent') { done(); return }
  const root = element as HTMLElement
  cancel(root)
  const generation = generations.get(root)!
  const dialog = root.querySelector<HTMLElement>('.ui-dialog')
  activeNodes.add(root)
  animatePresence(root, 'enter', () => { activeNodes.delete(root); if (!dialog && generations.get(root) === generation) done() }, { distance: 0, scale: 1, duration: 'standard' })
  if (dialog) {
    activeNodes.add(dialog)
    animatePresence(dialog, 'enter', () => { activeNodes.delete(dialog); if (generations.get(root) === generation) done() }, { preset: 'smooth', duration: 'emphasized' })
  }
}
function leave(element: Element, done: () => void) {
  if (props.motionOwner === 'parent') { done(); return }
  const root = element as HTMLElement
  cancel(root)
  const generation = generations.get(root)!
  const dialog = root.querySelector<HTMLElement>('.ui-dialog')
  exits.set(root, deactivateMotionSurface(root, true))
  // The scrim owns removal; its inner surface stays animated until that removal.
  if (dialog) {
    activeNodes.add(dialog)
    animatePresence(dialog, 'leave', () => activeNodes.delete(dialog), { preset: 'snappy', duration: 'standard' })
  }
  activeNodes.add(root)
  animatePresence(root, 'leave', () => {
    activeNodes.delete(root)
    if (generations.get(root) !== generation) return
    if (dialog) { cancelMotion(dialog); activeNodes.delete(dialog) }
    done()
  }, { preset: 'snappy', distance: 0, scale: 1, duration: 'fast' })
}
onBeforeUnmount(() => {
  for (const node of activeNodes) cancelMotion(node)
  activeNodes.clear()
  for (const restoreExit of exits.values()) restoreExit()
  exits.clear()
})
</script>
