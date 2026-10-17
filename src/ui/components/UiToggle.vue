<template><input v-bind="$attrs" class="ui-toggle" type="checkbox" role="switch" :checked="modelValue" :aria-label="String($attrs['aria-label'] || label || '') || undefined" @change="change"></template>
<script setup lang="ts">
import { inject, type Ref } from 'vue'
defineOptions({ inheritAttrs: false })
defineProps<{ modelValue: boolean }>()
const label = inject<Ref<string> | undefined>('ui-property-label', undefined)
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; change: [event: Event] }>()
function change(event: Event) { emit('update:modelValue', (event.target as HTMLInputElement).checked); emit('change', event) }
</script>
