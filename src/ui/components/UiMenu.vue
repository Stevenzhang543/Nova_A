<template><div ref="menu" class="ui-menu" role="menu" tabindex="-1" @keydown="navigate"><slot /></div></template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
const menu = ref<HTMLElement>()
const emit = defineEmits<{ close: [] }>()
function entries() { return [...(menu.value?.querySelectorAll<HTMLElement>('button:not(:disabled),[role="menuitem"]:not([aria-disabled="true"])') ?? [])] }
onMounted(() => { for (const item of entries()) { item.setAttribute('role', 'menuitem'); item.tabIndex = -1 } entries()[0]?.focus() })
function navigate(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); emit('close'); return }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const items = entries(); if (!items.length) return
  event.preventDefault()
  const current = items.indexOf(document.activeElement as HTMLElement)
  items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
}
</script>
