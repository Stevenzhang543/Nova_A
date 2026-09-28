<template>
  <span class="ui-slider" :class="{ 'ui-slider--track-only': !precise }" :data-resource-key="resolvedKey">
    <input v-bind="$attrs" ref="range" type="range" :value="current" :min="min" :max="max" :step="step" :disabled="disabled" @input="input" @change="change">
    <span v-if="precise" class="ui-slider-value" @change.stop>
      <NumericExpressionInput :model-value="current" :resource-key="resolvedKey" :minimum="Number(min)" :maximum="Number(max)" :step="step === 'any' ? 0 : Number(step)" :disabled="disabled" :aria-label="String($attrs['aria-label'] || label || 'Value')" :aria-labelledby="$attrs['aria-labelledby'] as string | undefined" :aria-describedby="$attrs['aria-describedby'] as string | undefined" @update:model-value="preciseChange" />
    </span>
  </span>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, useAttrs, useId } from 'vue'
import NumericExpressionInput from '../../components/NumericExpressionInput.vue'
defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  modelValue?: number | string; value?: number | string; min?: number | string; max?: number | string;
  step?: number | string; disabled?: boolean; precise?: boolean; resourceKey?: string;
  modelModifiers?: { lazy?: boolean; number?: boolean }; lazy?: boolean;
}>(), { min: 0, max: 100, step: 1, precise: true, disabled: false })
const emit = defineEmits<{ 'update:modelValue': [value: number]; input: [event: Event]; change: [event: Event] }>()
const range = ref<HTMLInputElement>(), label = ref(''), fallbackKey = useId()
const attrs = useAttrs()
const resolvedKey = computed(() => props.resourceKey || String(attrs['data-resource-key'] || fallbackKey))
const current = computed(() => Number(props.modelValue ?? props.value ?? 0))
const deferred = computed(() => props.lazy || props.modelModifiers?.lazy)
function update(event: Event) {
  const value = (event.target as HTMLInputElement).valueAsNumber
  if (Number.isFinite(value)) emit('update:modelValue', value)
}
function input(event: Event) { if (!deferred.value) update(event); emit('input', event) }
function change(event: Event) { if (deferred.value) update(event); emit('change', event) }
function preciseChange(value: number) {
  if (!range.value || props.disabled) return
  // Route precise edits through the same real range as pointer/keyboard edits.
  // Existing event.target.value callbacks and one bubbling history boundary survive.
  range.value.value = String(value)
  range.value.dispatchEvent(new Event('input', { bubbles: true }))
  range.value.dispatchEvent(new Event('change', { bubbles: true }))
}
onMounted(() => { label.value = range.value?.labels?.[0]?.textContent?.trim() || '' })
</script>
