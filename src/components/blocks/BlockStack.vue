<!-- 积木堆叠：一列可拖动的积木；“如果/重复/等待”在内部嵌套自己的堆叠。 -->
<template>
  <div class="block-stack" :data-stack-key="listKey">
    <template v-for="(node, index) in list" :key="node.id">
      <div v-if="marker(index)" class="block-marker" :class="marker(index)" aria-hidden="true"></div>
      <div class="block-row" :data-list-key="listKey" :data-index="index" :data-block-id="node.id"
        :class="{ selected: editor.selectedId.value === node.id, disabled: node.disabled, dragging: editor.draggingId.value === node.id, container: !!node.children, invalid: errorsOf(node).length }"
        :style="blockStyle(node)" @click.stop="editor.select(node, listKey, index)">
        <div class="block-face">
          <button type="button" class="block-grip" :aria-label="`${editor.copy.value.ui.moveUp} / ${editor.copy.value.ui.moveDown}`" :title="editor.copy.value.ui.moveUp + ' / ' + editor.copy.value.ui.moveDown" @pointerdown="editor.startDrag($event, { kind: 'move', id: node.id })" @click.stop="editor.select(node, listKey, index)"><span></span><span></span><span></span></button>
          <span class="block-label">
            <template v-for="(part, partIndex) in labelParts(statementLabel(node.type))" :key="partIndex">
              <span v-if="'text' in part" class="block-text">{{ part.text }}</span>
              <BlockFieldInput v-else-if="fieldSpec(node.type, part.field)" :spec="fieldSpec(node.type, part.field)!" :label="part.field" :model-value="node.fields[part.field]" @update:model-value="setField(node, part.field, $event)" />
            </template>
          </span>
          <details class="block-menu" @click.stop>
            <summary :aria-label="editor.copy.value.ui.remove">⋯</summary>
            <div class="block-menu-list">
              <button type="button" @click="close($event); editor.duplicate(node.id)">{{ editor.copy.value.ui.duplicate }}</button>
              <button type="button" :disabled="index === 0" @click="close($event); editor.moveRelative(node.id, -1)">{{ editor.copy.value.ui.moveUp }}</button>
              <button type="button" :disabled="index === list.length - 1" @click="close($event); editor.moveRelative(node.id, 1)">{{ editor.copy.value.ui.moveDown }}</button>
              <button type="button" @click="close($event); editor.toggleDisabled(node)">{{ node.disabled ? editor.copy.value.ui.enable : editor.copy.value.ui.disable }}</button>
              <button type="button" class="danger" @click="close($event); editor.remove(node.id)">{{ editor.copy.value.ui.remove }}</button>
            </div>
          </details>
        </div>
        <div v-if="node.type === 'if'" class="block-conditions" @click.stop>
          <div v-for="condition in node.conditions" :key="condition.id" class="block-condition">
            <label class="block-not"><input type="checkbox" :checked="condition.negate" @change="editor.mutate(() => { condition.negate = ($event.target as HTMLInputElement).checked })"><span>{{ editor.copy.value.ui.not }}</span></label>
            <label class="block-condition-kind" :title="conditionTitle(condition.type)"><span aria-hidden="true">⇅</span>
              <select :value="condition.type" :aria-label="conditionTitle(condition.type)" @change="changeCondition(condition, ($event.target as HTMLSelectElement).value)" @pointerdown.stop>
                <option v-for="spec in BLOCK_CONDITIONS" :key="spec.type" :value="spec.type">{{ conditionTitle(spec.type) }}</option>
              </select>
            </label>
            <template v-for="(part, partIndex) in labelParts(conditionLabel(condition.type))" :key="partIndex">
              <span v-if="'text' in part" class="block-text">{{ part.text }}</span>
              <BlockFieldInput v-else-if="'field' in part && conditionField(condition.type, part.field)" :spec="conditionField(condition.type, part.field)!" :label="part.field" :model-value="condition.fields[part.field]" @update:model-value="setConditionField(condition, part.field, $event)" />
            </template>
            <button v-if="(node.conditions?.length ?? 0) > 1" type="button" class="block-chip-remove" :aria-label="editor.copy.value.ui.remove" @click="editor.removeCondition(node, condition)">×</button>
          </div>
          <div class="block-condition-actions">
            <button type="button" class="block-chip" @click="editor.addCondition(node)">+ {{ editor.copy.value.ui.addCondition }}</button>
            <button v-if="(node.conditions?.length ?? 0) > 1" type="button" class="block-chip" :aria-pressed="node.mode === 'any'" @click="editor.mutate(() => { node.mode = node.mode === 'any' ? 'all' : 'any' })">{{ node.mode === 'any' ? editor.copy.value.ui.any : editor.copy.value.ui.all }}</button>
            <span class="block-text">{{ editor.copy.value.ui.then }}</span>
          </div>
        </div>
        <p v-for="problem in errorsOf(node)" :key="problem.message" class="block-problem" :class="problem.severity">{{ editor.problemText(problem) }}</p>
        <template v-if="node.children">
          <div class="block-mouth"><BlockStack :list="node.children" :list-key="`${node.id}:children`" /></div>
          <template v-if="node.otherwise">
            <div class="block-else"><span class="block-text">{{ editor.copy.value.ui.else }}</span></div>
            <div class="block-mouth"><BlockStack :list="node.otherwise" :list-key="`${node.id}:otherwise`" /></div>
          </template>
          <div class="block-foot"></div>
        </template>
      </div>
    </template>
    <div v-if="marker(list.length)" class="block-marker" :class="marker(list.length)" aria-hidden="true"></div>
    <button type="button" class="block-slot" :data-list-key="listKey" :data-index="list.length" :data-slot="true" :class="{ empty: !list.length, active: isCursor(list.length) }" @click.stop="editor.setCursor(listKey, list.length)">
      {{ list.length ? '+' : editor.copy.value.ui.empty }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import BlockFieldInput from './BlockFieldInput.vue'
import { BLOCK_EDITOR, type BlockEditorContext } from './blockEditorContext'
import { BLOCK_CATEGORY_COLORS, BLOCK_CONDITIONS, conditionSpec, createCondition, statementSpec, type BlockCondition, type BlockFieldValue, type BlockNode } from '../../visual/blockScript'
import { labelParts } from '../../visual/blockScriptCopy'

defineOptions({ name: 'BlockStack' })
const props = defineProps<{ list: BlockNode[]; listKey: string }>()
const editor = inject(BLOCK_EDITOR) as BlockEditorContext

const statementLabel = (type: string) => editor.copy.value.statements[type] ?? type
const conditionLabel = (type: string) => editor.copy.value.conditions[type] ?? type
/** The condition picker shows the sentence with “…” in place of its fields. */
const conditionTitle = (type: string) => conditionLabel(type).replace(/\{[A-Za-z]+\}/g, '…')
const fieldSpec = (type: string, key: string) => statementSpec(type)?.fields.find(field => field.key === key)
const conditionField = (type: string, key: string) => conditionSpec(type)?.fields.find(field => field.key === key)
const errorsOf = (node: BlockNode) => editor.diagnostics.value.get(node.id) ?? []
function blockStyle(node: BlockNode) {
  const color = BLOCK_CATEGORY_COLORS[statementSpec(node.type)?.category ?? 'control']
  return { '--block-fill': color.fill, '--block-ink': color.ink }
}
const isCursor = (index: number) => !editor.drop.value && editor.cursor.value?.key === props.listKey && editor.cursor.value.index === index
/** Drop target (while dragging) or insertion cursor marker before the row at `index`. */
function marker(index: number): string {
  const drop = editor.drop.value
  if (drop) return drop.key === props.listKey && drop.index === index ? 'drop' : ''
  return isCursor(index) && index < props.list.length ? 'cursor' : ''
}
function setField(node: BlockNode, key: string, value: BlockFieldValue) { editor.mutate(() => { node.fields[key] = value }) }
function setConditionField(condition: BlockCondition, key: string, value: BlockFieldValue) { editor.mutate(() => { condition.fields[key] = value }) }
function changeCondition(condition: BlockCondition, type: string) {
  editor.mutate(() => { const fresh = createCondition(type); condition.type = fresh.type; condition.fields = fresh.fields })
}
function close(event: Event) { (event.target as HTMLElement).closest('details')?.removeAttribute('open') }
</script>
