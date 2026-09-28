<template>
  <nav class="ui-tabs" role="tablist" @keydown="navigate">
    <button v-for="item in items" :key="item.id" :id="item.tabId" :aria-controls="item.controls" type="button" role="tab" :disabled="item.disabled" :aria-selected="modelValue === item.id" :tabindex="modelValue === item.id ? 0 : -1" :class="{ active: modelValue === item.id }" :title="item.label" @click="select(item.id)"><EditorIcon v-if="item.icon" :name="item.icon" /><span>{{ item.label }}</span></button>
  </nav>
</template>
<script setup lang="ts">
import EditorIcon, { type EditorIconName } from '../../components/EditorIcon.vue'
const props = withDefaults(defineProps<{ modelValue: string; items: ReadonlyArray<{ id: string; label: string; icon?: EditorIconName; disabled?: boolean; tabId?: string; controls?: string }>; activation?: 'automatic' | 'manual' }>(), { activation: 'manual' })
const emit = defineEmits<{ 'update:modelValue': [value: string]; change: [value: string] }>()
function select(value: string) { emit('update:modelValue', value); emit('change', value) }
function navigate(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  const items = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
  const current = items.indexOf(event.target as HTMLButtonElement)
  if (current < 0 || !items.length) return
  event.preventDefault()
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length
  items[next]?.focus()
  if (props.activation === 'automatic') {
    const enabled = props.items.filter(item => !item.disabled)
    if (enabled[next]) select(enabled[next].id)
  }
}
</script>
