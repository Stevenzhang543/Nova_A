<!-- 分段控件（单选组）：少量互斥选项并排显示，选中段为凸起滑块；方向键切换。 -->
<template>
  <div ref="root" class="ui-segmented" role="radiogroup" :aria-label="label" @keydown="navigate">
    <button v-for="item in items" :key="item.value" type="button" role="radio" :aria-checked="modelValue === item.value" :tabindex="modelValue === item.value ? 0 : -1" :disabled="disabled || item.disabled" :class="{ active: modelValue === item.value }" :title="item.title ?? item.label" @click="select(item.value)">{{ item.label }}</button>
  </div>
</template>
<script setup lang="ts" generic="T extends string">
import { nextTick, ref } from 'vue'
const root = ref<HTMLElement>()
const props = defineProps<{ modelValue: T; items: ReadonlyArray<{ value: T; label: string; title?: string; disabled?: boolean }>; label: string; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
// Like a native control, a committed choice also fires a bubbling `change`, so forms that record
// history or validation on change (the Inspector) treat it like a select.
function select(value: T): void { if (value === props.modelValue) return; emit('update:modelValue', value); void nextTick(() => root.value?.dispatchEvent(new Event('change', { bubbles: true }))) }
function navigate(event: KeyboardEvent): void {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  const enabled = props.items.filter(item => !item.disabled)
  if (!enabled.length || props.disabled) return
  event.preventDefault()
  const current = Math.max(0, enabled.findIndex(item => item.value === props.modelValue))
  const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : (current + step + enabled.length) % enabled.length
  select(enabled[next].value)
  const root = event.currentTarget as HTMLElement
  requestAnimationFrame(() => root.querySelector<HTMLElement>('button.active')?.focus())
}
</script>
<style scoped>
.ui-segmented { display: flex; min-width: 0; padding: 2px; gap: 2px; border-radius: calc(var(--radius-control) + 2px); background: var(--surface-inset); box-shadow: inset 0 0 0 var(--ui-border-width) var(--border-separator); }
.ui-segmented > button { flex: 1 1 0; min-width: 0; min-height: calc(var(--ui-control-height) - 4px); padding: 0 var(--space-2); overflow: hidden; border: 0; border-radius: var(--radius-control); background: transparent; color: var(--text-secondary); font-size: var(--type-dense); font-weight: var(--weight-medium); text-overflow: ellipsis; white-space: nowrap; transition: background-color var(--motion-fast) var(--ease-standard), color var(--motion-fast) var(--ease-standard), box-shadow var(--motion-fast) var(--ease-standard); }
.ui-segmented > button:hover:not(:disabled):not(.active) { color: var(--text-primary); background: var(--surface-hover); }
.ui-segmented > button.active { color: var(--text-primary); background: var(--surface-raised); box-shadow: var(--shadow-xs), var(--hairline-highlight); }
.ui-segmented > button:focus-visible { outline: none; box-shadow: var(--focus-shadow, 0 0 0 3px color-mix(in srgb, var(--accent) 45%, transparent)); }
.ui-segmented > button:disabled { opacity: .45; }
@media (prefers-reduced-motion: reduce) { .ui-segmented > button { transition: none; } }
</style>
