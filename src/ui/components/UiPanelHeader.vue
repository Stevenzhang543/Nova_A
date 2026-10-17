<template>
  <header class="ui-panel-header"><div class="ui-panel-heading"><strong :title="title">{{ title }}</strong><small v-if="description" :title="description">{{ description }}</small></div><slot /><div v-if="$slots.actions" class="ui-panel-actions"><slot name="actions" /></div></header>
</template>
<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>
