<template>
  <button type="button" class="ui-button" :class="[`ui-button--${variant}`, { 'ui-icon-button': icon && !$slots.default }]" :title="label || String($attrs['aria-label'] || $attrs.title || '') || undefined" :aria-label="icon && !$slots.default ? label || String($attrs['aria-label'] || $attrs.title || '') || undefined : undefined">
    <EditorIcon v-if="icon" :name="icon" /><slot />
  </button>
</template>
<script setup lang="ts">
import EditorIcon, { type EditorIconName } from '../../components/EditorIcon.vue'
withDefaults(defineProps<{ icon?: EditorIconName; label?: string; variant?: 'default' | 'primary' | 'danger' | 'quiet' }>(), { variant: 'default' })
</script>
