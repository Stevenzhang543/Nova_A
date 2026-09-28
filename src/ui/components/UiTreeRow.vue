<template>
  <div class="ui-tree-row" :class="{ selected }" :style="{ '--tree-depth': depth }"><span v-if="$slots.disclosure" class="ui-tree-disclosure"><slot name="disclosure" /></span><span v-if="$slots.icon" class="ui-tree-icon"><slot name="icon" /></span><slot><span class="ui-tree-label" :title="label">{{ label }}</span></slot><span v-if="$slots.actions" class="ui-tree-actions"><slot name="actions" /></span></div>
</template>
<script setup lang="ts">
withDefaults(defineProps<{ selected?: boolean; depth?: number; label?: string }>(), { depth: 0 })
</script>
