<template>
  <div class="ui-dialog-overlay" @pointerdown.self="dismissOnBackdrop && emit('close')"><section v-modal-focus class="ui-dialog" :role="role" aria-modal="true" :aria-labelledby="$slots.header ? undefined : headingId" :aria-label="$slots.header ? title : undefined" @keydown.esc.stop.prevent="emit('close')"><header class="ui-dialog-header"><slot name="header"><h2 :id="headingId">{{ title }}</h2></slot><UiButton icon="close" :label="closeLabel || t('close')" @click="emit('close')" /></header><div class="ui-dialog-body"><slot /></div><footer v-if="$slots.footer" class="ui-dialog-footer"><slot name="footer" /></footer></section></div>
</template>
<script setup lang="ts">
import { useId } from 'vue'
import { vModalFocus } from '../../editor/modalFocus'
import { t } from '../../i18n'
import UiButton from './UiButton.vue'
withDefaults(defineProps<{ title: string; closeLabel?: string; dismissOnBackdrop?: boolean; role?: 'dialog' | 'alertdialog' }>(), { dismissOnBackdrop: false, role: 'dialog' })
const headingId = useId()
const emit = defineEmits<{ close: [] }>()
</script>
