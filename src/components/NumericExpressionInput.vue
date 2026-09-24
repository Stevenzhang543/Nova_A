<!-- 数值表达式输入：保留编辑草稿，校验范围与整数要求，支持步进提交。 -->
<template>
  <span class="numeric-draft">
    <span class="numeric-value-row"><input v-bind="$attrs" ref="input" :value="draft" type="text" inputmode="decimal" :min="Number.isFinite(minimum) ? minimum : undefined" :max="Number.isFinite(maximum) ? maximum : undefined" :step="step" :placeholder="mixed ? copy.mixed : undefined" :data-numeric-expression="draft" :data-resource-key="resourceKey" :data-nova-invalid="error ? 'true' : undefined" :aria-invalid="error ? 'true' : undefined" :aria-describedby="[$attrs['aria-describedby'], error ? errorId : ''].filter(Boolean).join(' ') || undefined" :title="t('numericExpressionHelp')" @input="edit" @change="changed" @blur="commit" @keydown.up="stepBy(1,$event)" @keydown.down="stepBy(-1,$event)" @keydown.enter.prevent="commit" @keydown.esc.stop.prevent="reset" /><span v-if="step" class="numeric-steppers"><button type="button" :aria-label="`${$attrs['aria-label'] || ''}: ${copy.decrease}`" @click.prevent="stepBy(-1)">−</button><button type="button" :aria-label="`${$attrs['aria-label'] || ''}: ${copy.increase}`" @click.prevent="stepBy(1)">+</button></span></span>
    <small v-if="error" :id="errorId" role="alert">{{ error }}</small>
  </span>
</template>
<script setup lang="ts">
import {computed,onUnmounted,ref,useId,watch} from 'vue'
import {evaluateNumericExpression} from '../editor/sceneAuthoring'
import {preferencesState as prefs} from '../store/preferences'
import {t} from '../i18n'
import {registerEditorDraft} from '../editor/pendingDrafts'
defineOptions({inheritAttrs:false})
const props=withDefaults(defineProps<{modelValue:number;resourceKey:string;minimum?:number;maximum?:number;mixed?:boolean;step?:number;integer?:boolean}>(),{minimum:Number.NEGATIVE_INFINITY,maximum:Number.POSITIVE_INFINITY,mixed:false,step:1,integer:false})
const emit=defineEmits<{'update:modelValue':[value:number];change:[event:Event]}>()
const messages={en:{invalid:'Enter a finite number or expression. Escape restores the saved value.',range:'Value is outside the allowed range.',integer:'Enter a whole number.',mixed:'Mixed',increase:'Increase',decrease:'Decrease'},de:{invalid:'Endliche Zahl oder Ausdruck eingeben. Escape stellt den gespeicherten Wert wieder her.',range:'Wert liegt außerhalb des zulässigen Bereichs.',integer:'Eine ganze Zahl eingeben.',mixed:'Gemischt',increase:'Erhöhen',decrease:'Verringern'},zh:{invalid:'请输入有限数值或表达式。按 Escape 恢复原值。',range:'数值超出允许范围。',integer:'请输入整数。',mixed:'混合值',increase:'增加',decrease:'减少'}}
const copy=computed(/* 返回 messages[prefs.locale] 的当前值。 */ ()=>messages[prefs.locale]),input=ref<HTMLInputElement|null>(null),errorId=useId(),draft=ref(''),error=ref('');let dirty=false
/** 从模型重建草稿，混合值显示为空，清除修改和表单错误状态。 */ function reset(){draft.value=props.mixed?'':String(props.modelValue);error.value='';dirty=false;input.value?.setCustomValidity('')}
/** 接收输入并标脏，同时清除上次校验错误。 */ function edit(event:Event){draft.value=(event.target as HTMLInputElement).value;dirty=true;error.value='';input.value?.setCustomValidity('')}
/** 计算已修改表达式，检查有限值、整数要求和范围，并设置原生表单有效性。 */ function validate(): boolean {
  if (!dirty) return true
  const value = evaluateNumericExpression(draft.value, props.modelValue)
  error.value = value === null || !Number.isFinite(value) ? copy.value.invalid
    : props.integer && !Number.isInteger(value) ? copy.value.integer
    : value < props.minimum || value > props.maximum ? copy.value.range : ''
  input.value?.setCustomValidity(error.value)
  return !error.value
}
/** 校验后提交数值；失败阻止变更传播，成功在必要时派发变更事件以到达历史与归一化处理。 */ function commit(event?: Event): boolean {
  if (!dirty) return true
  if (!validate()) { event?.stopPropagation(); return false }
  const value = evaluateNumericExpression(draft.value, props.modelValue)!
  dirty = false
  draft.value = String(value)
  emit('update:modelValue', value)
  // Boundary commits must also reach the inspector's normalization/prefab/history owner.
  if (!event || event.type !== 'change') input.value?.dispatchEvent(new Event('change', {bubbles:true}))
  return true
}
/** 仅在提交成功后向父组件转发变更事件。 */ function changed(event: Event): void { if (commit(event)) emit('change', event) }
/** 按合法步长计算下一刻度，控制精度并钳制范围后提交。 */ function stepBy(direction: number, event?: KeyboardEvent): void {
  const step=props.step
  if (!step || !Number.isFinite(step) || step <= 0) return
  event?.preventDefault()
  if (!validate()) return
  const value=dirty?evaluateNumericExpression(draft.value,props.modelValue)!:props.modelValue
  const base=Number.isFinite(props.minimum)?props.minimum:0
  const quotient=(value-base)/step
  const count=direction>0?Math.floor(quotient+1e-9)+1:Math.ceil(quotient-1e-9)-1
  const precision=/** 根据尾数小数位和科学计数指数计算所需小数精度。 */ (number:number)=>{const [mantissa,exponent='0']=String(number).split('e');return Math.max(0,(mantissa.split('.')[1]?.length ?? 0)-Number(exponent))}
  const decimals=Math.max(precision(step),precision(base))
  const next=Math.min(props.maximum,Math.max(props.minimum,Number((base+count*step).toFixed(Math.min(15,decimals)))))
  if (!Number.isFinite(next)) return
  draft.value=String(next);dirty=true;commit()
}
onUnmounted(registerEditorDraft({validate, commit:/** 在外部保存边界尝试提交当前草稿。 */ ()=>commit(), cancel:reset}))
watch(/** 监听模型值、资源标识和混合状态以同步编辑上下文。 */ ()=>[props.modelValue,props.resourceKey,props.mixed],reset,{immediate:true,flush:'sync'})
</script>
<style scoped>
.numeric-draft{font-family:var(--font-ui);font-size:var(--type-dense);display:flex;flex-direction:column;gap:4px;min-width:min(100%,10ch);max-width:100%;flex:1 1 10ch}.numeric-draft:has(.numeric-steppers){min-width:min(100%,calc(10ch + 64px));flex-basis:calc(10ch + 64px)}.numeric-value-row{display:flex;align-items:center;gap:4px;min-width:0}.numeric-draft input{width:100%;min-width:0;flex:1}.numeric-steppers{display:flex;gap:2px;flex:none}.numeric-steppers button{width:28px;min-width:28px;height:28px;padding:0}.numeric-draft small{color:var(--danger);font-size:var(--type-caption);white-space:normal;overflow-wrap:anywhere}.numeric-draft input[aria-invalid=true]{border-color:var(--danger)}
</style>

