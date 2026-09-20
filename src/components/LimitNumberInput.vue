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
const unlimited=computed(()=>props.modelValue===Number.POSITIVE_INFINITY)
const copy=computed(()=>({en:'Unlimited',de:'Unbegrenzt',zh:'无限制'})[preferencesState.locale])
watch(()=>[props.modelValue,props.resourceKey] as const,([value,resource],old)=>{if(old&&old[1]!==resource)lastFinite.value=1000;if(Number.isFinite(value)&&value>=0)lastFinite.value=value},{immediate:true,flush:'sync'})
function toggle(){emit('update:modelValue',unlimited.value?lastFinite.value:Number.POSITIVE_INFINITY);root.value?.dispatchEvent(new Event('change',{bubbles:true}))}
</script>
<style scoped>
.limit-number-control{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0;width:100%}.limit-number-control button{flex:0 1 auto;white-space:normal;min-height:30px}.limit-number-control button.active{color:var(--accent-contrast);background:var(--accent);border-color:var(--accent)}
</style>
