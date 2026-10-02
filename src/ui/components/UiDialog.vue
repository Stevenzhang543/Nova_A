<template>
  <Transition appear :css="false" @enter="enter" @leave="leave" @enter-cancelled="cancel" @leave-cancelled="cancel">
    <div class="ui-dialog-overlay" @pointerdown.self="dismissOnBackdrop && emit('close')"><section v-modal-focus class="ui-dialog" :role="role" aria-modal="true" :aria-labelledby="$slots.header ? undefined : headingId" :aria-label="$slots.header ? title : undefined" @keydown.esc.stop.prevent="emit('close')"><header class="ui-dialog-header"><slot name="header"><h2 :id="headingId">{{ title }}</h2></slot><UiButton icon="close" :label="closeLabel || t('close')" @click="emit('close')" /></header><div class="ui-dialog-body"><slot /></div><footer v-if="$slots.footer" class="ui-dialog-footer"><slot name="footer" /></footer></section></div>
  </Transition>
</template>
<script setup lang="ts">
import { useId } from 'vue'
import { vModalFocus } from '../../editor/modalFocus'
import { t } from '../../i18n'
import UiButton from './UiButton.vue'
import { animatePresence, cancelMotion } from '../motion'
withDefaults(defineProps<{ title: string; closeLabel?: string; dismissOnBackdrop?: boolean; role?: 'dialog' | 'alertdialog' }>(), { dismissOnBackdrop: false, role: 'dialog' })
const headingId = useId()
const emit = defineEmits<{ close: [] }>()

// Focus is installed at mount; closing surfaces stop receiving input immediately.
function enter(element: Element, done: () => void) {
  const root = element as HTMLElement
  root.inert = false
  root.removeAttribute('aria-hidden')
  animatePresence(root, 'enter', undefined, { distance: 0, scale: 1, duration: 'standard' })
  const dialog = root.querySelector<HTMLElement>('.ui-dialog')
  if (dialog) animatePresence(dialog, 'enter', done, { preset: 'smooth', duration: 'emphasized' })
  else done()
}
function leave(element: Element, done: () => void) {
  const root = element as HTMLElement
  root.inert = true
  root.setAttribute('aria-hidden', 'true')
  const dialog = root.querySelector<HTMLElement>('.ui-dialog')
  // One completion owns removal. A child must not reset its opacity before the
  // backdrop finishes, or briefly reappear during the last closing frame.
  animatePresence(root, 'leave', () => { if (dialog) cancelMotion(dialog); done() }, { preset: 'snappy', distance: 0, scale: 1, duration: 'fast' })
  if (dialog) animatePresence(dialog, 'leave', undefined, { preset: 'snappy', duration: 'fast' })
}
function cancel(element: Element) {
  const root = element as HTMLElement
  cancelMotion(root)
  const dialog = root.querySelector<HTMLElement>('.ui-dialog')
  if (dialog) cancelMotion(dialog)
}
</script>
