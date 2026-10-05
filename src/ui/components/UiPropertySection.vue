<template>
  <details v-if="collapsible" ref="disclosure" class="ui-property-section" :open="open" @toggle="reveal">
    <summary><EditorIcon name="down" /><strong>{{ title }}</strong><span class="ui-section-actions"><slot name="actions" /></span></summary>
    <div class="ui-section-body"><slot /></div>
  </details>
  <section v-else class="ui-property-section">
    <header v-if="title || $slots.actions"><strong>{{ title }}</strong><span class="ui-section-actions"><slot name="actions" /></span></header>
    <div class="ui-section-body"><slot /></div>
  </section>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import EditorIcon from '../../components/EditorIcon.vue'
import { animatePresence, animateDisclosure, cancelMotion } from '../motion'
const props = withDefaults(defineProps<{ title?: string; collapsible?: boolean; open?: boolean }>(), { open: true, collapsible: false })
const disclosure = ref<HTMLDetailsElement | null>(null)
watch(() => props.open, open => { if (disclosure.value) animateDisclosure(disclosure.value, open) })
let content: HTMLElement | null = null
// Native details owns disclosure and keyboard semantics; only presentation settles.
function reveal(event: Event) {
  const root = event.currentTarget as HTMLDetailsElement
  if (root.dataset.uiDisclosureControlled === 'true') return
  content = root.querySelector<HTMLElement>('.ui-section-body')
  if (!content) return
  if (root.open) animatePresence(content, 'enter', undefined, { preset: 'snappy', distance: 2, scale: 1, duration: 'fast' })
  else cancelMotion(content)
}
onBeforeUnmount(() => { if (content) cancelMotion(content); if (disclosure.value) cancelMotion(disclosure.value) })
</script>
