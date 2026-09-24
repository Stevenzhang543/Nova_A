<!-- 数量上限输入：在有限数值与无限制之间切换，并记忆当前资源的最近有限值。 -->
<template>
  <span ref="root" class="limit-number-control" :data-resource-key="resourceKey">
    <button type="button" role="switch" :aria-checked="unlimited" :aria-label="`${label}: ${copy}`" :class="{active:unlimited}" @click.prevent="toggle">{{ copy }} <span v-if="unlimited" aria-hidden="true">∞</span></button>
    <NumericExpressionInput v-if="!unlimited" :model-value="modelValue" :resource-key="resourceKey" :minimum="0" :aria-label="label" @update:model-value="emit('update:modelValue',$event)" />
  </span>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import NumericExpressionInput from './NumericExpressionInput.vue'
import {preferencesState} from '../store/preferences'
const props=defineProps<{modelValue:number;resourceKey:string;label:string}>()
const emit=defineEmits<{'update:modelValue':[value:number]}>()
const root=ref<HTMLElement|null>(null),lastFinite=ref(1000)
const unlimited=computed(/* 比较 props.modelValue 与 Number.POSITIVE_INFINITY，返回严格相等的判断结果。 */ ()=>props.modelValue===Number.POSITIVE_INFINITY)
const copy=computed(/* 返回 ({en:'Unlimited',de:'Unbegrenzt',zh:'无限制'})[preferencesState.locale] 的当前值。 */ ()=>({en:'Unlimited',de:'Unbegrenzt',zh:'无限制'})[preferencesState.locale])
watch(/** 同时监听上限值和资源标识，以区分同一资源编辑与切换资源。 */ ()=>[props.modelValue,props.resourceKey] as const,/** 切换资源时重置有限值记忆；收到有效非负有限值时保存该值。 */ ([value,resource],old)=>{if(old&&old[1]!==resource)lastFinite.value=1000;if(Number.isFinite(value)&&value>=0)lastFinite.value=value},{immediate:true,flush:'sync'})
/** 在无限制与记忆的有限值之间切换，发出模型更新和可冒泡的变更事件。 */ function toggle(){emit('update:modelValue',unlimited.value?lastFinite.value:Number.POSITIVE_INFINITY);root.value?.dispatchEvent(new Event('change',{bubbles:true}))}
</script>
<style scoped>
.limit-number-control{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0;width:100%}.limit-number-control button{flex:0 1 auto;white-space:normal;min-height:30px}.limit-number-control button.active{color:var(--accent-contrast);background:var(--accent);border-color:var(--accent)}
</style>
