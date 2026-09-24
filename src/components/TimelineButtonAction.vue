<!-- 按钮时间轴动作设置：切换标准时间轴命令和自定义回调。 -->
<template>
  <details class="timeline-button-action" open><summary>{{ copy.title }}</summary>
    <label><span>{{ copy.title }}</span><select :value="action" @change="changeAction"><option value="">{{ copy.custom }}</option><option v-for="kind in timelineUiActions" :key="kind" :value="kind">{{ copy[kind] }}</option></select></label>
    <p>{{ copy.hint }}</p><p v-if="action"><strong>{{ copy.owner }}:</strong> {{ owner.owner?.name || copy.missing }}</p><p v-else>{{ copy.callback }}</p>
  </details>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Entity } from '../world/Entity'
import type { Button } from '../world/components'
import { physicsState } from '../store/physics'
import { preferencesState } from '../store/preferences'
import { timelineUiActionCopy } from '../editor/timelineUiActionCopy'
import { parseTimelineUiAction, timelineUiActions, timelineUiOwner } from '../runtime/timelineUiActions'
const props = defineProps<{ entity: Entity; button: Button }>()
const copy = computed(/* 返回 timelineUiActionCopy[preferencesState.locale] 的当前值。 */ () => timelineUiActionCopy[preferencesState.locale]), action = computed(/** 解析按钮时间轴命令，非内置动作返回空选择。 */ () => parseTimelineUiAction(props.button.onPressed) ?? ''), owner = computed(/** 查找当前实体的时间轴拥有者。 */ () => timelineUiOwner(props.entity, physicsState.world.entities)), custom = ref('on_pressed')
watch(/* 返回 props.button.onPressed 的当前值。 */ () => props.button.onPressed, /** 当前动作不是时间轴命令时保存为可恢复自定义动作。 */ value => { if (!value.startsWith('@timeline:')) custom.value = value }, { immediate: true })
/** 合法内置选项写为时间轴命令，其他选择恢复记忆的自定义动作。 */ function changeAction(event: Event) { const value = (event.target as HTMLSelectElement).value; props.button.onPressed = timelineUiActions.some(/* 比较 action 与 value，返回严格相等的判断结果。 */ action => action === value) ? '@timeline:' + value : custom.value }
</script>
<style scoped>
.timeline-button-action{min-width:0;margin:8px 0;padding:8px;border:1px solid var(--border);border-radius:6px}.timeline-button-action p{white-space:normal;overflow-wrap:anywhere;font-size:12px;line-height:1.5}.timeline-button-action label{display:grid;gap:5px}.timeline-button-action select{min-width:0;width:100%}
</style>
