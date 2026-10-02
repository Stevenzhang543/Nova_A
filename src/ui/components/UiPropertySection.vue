<template>
  <details v-if="collapsible" class="ui-property-section" :open="open" @toggle="reveal">
    <summary><EditorIcon name="down" /><strong>{{ title }}</strong><span class="ui-section-actions"><slot name="actions" /></span></summary>
    <div class="ui-section-body"><slot /></div>
  </details>
  <section v-else class="ui-property-section">
    <header v-if="title || $slots.actions"><strong>{{ title }}</strong><span class="ui-section-actions"><slot name="actions" /></span></header>
    <div class="ui-section-body"><slot /></div>
  </section>
</template>
<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import EditorIcon from '../../components/EditorIcon.vue'
import { animatePresence, cancelMotion } from '../motion'
withDefaults(defineProps<{ title?: string; collapsible?: boolean; open?: boolean }>(), { open: true, collapsible: false })
let content: HTMLElement | null = null
// Native details owns disclosure and keyboard semantics; only presentation settles.
function reveal(event: Event) {
  const root = event.currentTarget as HTMLDetailsElement
  content = root.querySelector<HTMLElement>('.ui-section-body')
  if (!content) return
  if (root.open) animatePresence(content, 'enter', undefined, { preset: 'snappy', distance: 2, scale: 1, duration: 'fast' })
  else cancelMotion(content)
}
onBeforeUnmount(() => { if (content) cancelMotion(content) })
</script>
