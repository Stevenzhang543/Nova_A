<!-- 积木输入框：数字、文字、下拉（按键、资源、变量、总线）与开关，宽度随内容变化。 -->
<template>
  <select v-if="choices" class="block-field block-select" :value="String(modelValue)" :aria-label="label" @change="update(($event.target as HTMLSelectElement).value)" @pointerdown.stop>
    <option v-if="emptyChoice" value="">{{ emptyChoice }}</option>
    <option v-if="missing" :value="String(modelValue)">{{ String(modelValue) }}</option>
    <option v-for="option in choices" :key="option.value" :value="option.value">{{ option.label }}</option>
  </select>
  <label v-else-if="spec.kind === 'bool'" class="block-field block-toggle" @pointerdown.stop><input type="checkbox" :checked="modelValue === true" :aria-label="label" @change="update(($event.target as HTMLInputElement).checked)"><span aria-hidden="true"></span></label>
  <input v-else class="block-field" :class="`block-${spec.kind}`" :value="String(modelValue ?? '')" :size="size" :aria-label="label" :list="listId" :placeholder="placeholder" :inputmode="spec.kind === 'number' ? 'decimal' : undefined" spellcheck="false" autocomplete="off" autocapitalize="off"
    @pointerdown.stop @input="draft = ($event.target as HTMLInputElement).value" @change="update(($event.target as HTMLInputElement).value)" @keydown.enter="($event.target as HTMLInputElement).blur()">
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { BlockFieldSpec, BlockFieldValue } from '../../visual/blockScript'
import { BLOCK_EDITOR, type BlockEditorContext } from './blockEditorContext'

const props = defineProps<{ spec: BlockFieldSpec; modelValue: BlockFieldValue; label: string; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: BlockFieldValue] }>()
const editor = inject(BLOCK_EDITOR) as BlockEditorContext
const draft = ref<string | null>(null)

const OPERATORS = [{ value: '==', label: '=' }, { value: '!=', label: '≠' }, { value: '<', label: '<' }, { value: '>', label: '>' }, { value: '<=', label: '≤' }, { value: '>=', label: '≥' }]
/** Dropdown choices for enumerable kinds; free text kinds return null. */
const choices = computed(() => {
  const options = editor.options.value
  switch (props.spec.kind) {
    case 'action': return options.actions.map(value => ({ value, label: value }))
    case 'variable': return options.variables.map(value => ({ value, label: value }))
    case 'audio': return options.audio
    case 'video': return options.video
    case 'prefab': return options.prefabs
    case 'scene': return options.scenes
    case 'bus': return options.buses.map(value => ({ value, label: value }))
    case 'op': return OPERATORS
    default: return null
  }
})
const emptyChoice = computed(() => ['audio', 'video', 'prefab', 'scene', 'variable'].includes(props.spec.kind) ? editor.copy.value.ui.choose : '')
const missing = computed(() => !!choices.value && String(props.modelValue) !== '' && !choices.value.some(option => option.value === String(props.modelValue)))
const listId = computed(() => props.spec.kind === 'number' || props.spec.kind === 'text' || props.spec.kind === 'code' ? editor.valueListId : props.spec.kind === 'object' ? editor.objectListId : undefined)
const size = computed(() => Math.max(props.spec.kind === 'number' ? 3 : 5, Math.min(40, (draft.value ?? (String(props.modelValue ?? '') || props.placeholder || '')).length + 1)))
function update(value: BlockFieldValue) { draft.value = null; if (value !== props.modelValue) emit('update:modelValue', value) }
</script>
