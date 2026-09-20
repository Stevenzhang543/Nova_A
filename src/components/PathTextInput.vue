<template>
  <span class="path-text-draft">
    <textarea v-bind="$attrs" ref="input" :value="draft" :data-resource-key="resourceKey" :data-path-text="kind" :aria-invalid="error ? 'true' : undefined" :aria-describedby="error ? errorId : undefined" :data-nova-invalid="error ? 'true' : undefined" @input="edit" @change="commit" @blur="commit" @keydown.esc.stop.prevent="reset" />
    <small v-if="error" :id="errorId" role="alert">{{ error }}</small>
  </span>
</template>
<script setup lang="ts">
import {computed,onUnmounted,ref,useId,watch} from 'vue'
import {parsePathText,type ParsedPathText} from '../editor/pathTextDraft'
import {registerEditorDraft} from '../editor/pendingDrafts'
import {preferencesState} from '../store/preferences'
defineOptions({inheritAttrs:false})
const props=withDefaults(defineProps<{modelValue:string;resourceKey:string;kind:'points'|'tangents';maximum?:number}>(),{maximum:10_000})
const emit=defineEmits<{commit:[value:ParsedPathText,event?:Event]}>()
const input=ref<HTMLTextAreaElement|null>(null),draft=ref(''),error=ref(''),errorId=useId();let dirty=false
const copy=computed(()=>({en:{syntax:'Every entry must contain finite coordinates. Use x,y for points or x,y:x,y for tangents. Escape restores the value.',count:props.kind==='points'?'Enter 2–10,000 points.':'Use at most one tangent pair per point; blank uses automatic tangents.'},de:{syntax:'Jeder Eintrag muss endliche Koordinaten enthalten: x,y für Punkte oder x,y:x,y für Tangenten. Escape stellt den Wert wieder her.',count:props.kind==='points'?'2–10.000 Punkte eingeben.':'Höchstens ein Tangentenpaar je Punkt; leer verwendet automatische Tangenten.'},zh:{syntax:'每项必须包含有限坐标：点使用 x,y，切线使用 x,y:x,y。按 Escape 恢复原值。',count:props.kind==='points'?'请输入 2–10,000 个点。':'每个点最多一对切线；留空使用自动切线。'}})[preferencesState.locale])
function reset(){draft.value=props.modelValue;dirty=false;error.value='';input.value?.setCustomValidity('')}
function edit(event:Event){draft.value=(event.target as HTMLTextAreaElement).value;dirty=true;error.value='';input.value?.setCustomValidity('')}
function validate(){if(!dirty)return true;const result=parsePathText(draft.value,props.kind,props.maximum);error.value=result.issue?copy.value[result.issue]:'';input.value?.setCustomValidity(error.value);return !error.value}
function commit(event?:Event){if(!dirty)return true;if(!validate()){event?.stopPropagation();return false}const result=parsePathText(draft.value,props.kind,props.maximum);if(!result.value)return false;dirty=false;emit('commit',result.value,event);return true}
onUnmounted(registerEditorDraft({validate,commit:()=>commit(),cancel:reset}))
watch(()=>props.resourceKey,reset,{immediate:true,flush:'sync'})
watch(()=>props.modelValue,()=>{if(!dirty)reset()},{flush:'sync'})
</script>
<style scoped>
.path-text-draft{display:flex;flex-direction:column;gap:4px;min-width:0;width:100%}.path-text-draft textarea{width:100%;min-width:0;box-sizing:border-box;resize:vertical}.path-text-draft small{color:var(--danger);font-size:var(--type-caption);white-space:normal;overflow-wrap:anywhere}.path-text-draft textarea[aria-invalid=true]{border-color:var(--danger)}
</style>
