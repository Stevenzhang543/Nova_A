<template>
  <details v-if="collapsible" class="ui-property-section" :open="open">
    <summary><EditorIcon name="down" /><strong>{{ title }}</strong><span class="ui-section-actions"><slot name="actions" /></span></summary>
    <div class="ui-section-body"><slot /></div>
  </details>
  <section v-else class="ui-property-section">
    <header v-if="title || $slots.actions"><strong>{{ title }}</strong><span class="ui-section-actions"><slot name="actions" /></span></header>
    <div class="ui-section-body"><slot /></div>
  </section>
</template>
<script setup lang="ts">
import EditorIcon from '../../components/EditorIcon.vue'
withDefaults(defineProps<{ title?: string; collapsible?: boolean; open?: boolean }>(), { open: true, collapsible: false })
</script>
