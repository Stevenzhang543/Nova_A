<!-- 导入资源依赖面板：显示依赖槽，绑定来源并记录资源历史。 -->
<template>
  <section class="imported-bindings" @change.stop>
    <strong>{{ copy('sourceBindings') }}</strong>
    <UiPropertyRow v-for="slot in slots" :key="slot.id" :label="copy(slot.kind==='image'?'imageSource':'tilesetSource') + ' · ' + slot.name" stacked><select :value="slot.reference??''" @change="choose(slot.id,($event.target as HTMLSelectElement).value)"><option value="" disabled>{{ copy('chooseSource') }}</option><option v-for="candidate in candidates(slot.kind)" :key="candidate.uuid" :value="'asset://'+candidate.uuid">{{ candidate.path }}</option></select><UiButton icon="open" :label="copy('openSource')" v-if="resolveAsset(slot.reference)" @click="$emit('select-asset',resolveAsset(slot.reference)!.uuid)"></UiButton></UiPropertyRow>
    <p v-if="error || slotResult.error" role="alert">{{ error || slotResult.error }}</p>
  </section>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import type {AssetRecord} from '../assets/types'
import {assetState,resolveAsset} from '../assets/AssetDatabase'
import {importedDependencySlots,setImportedDependency} from '../assets/interchangeAuthoring'
import {assetWorkflowCopy as copy} from '../assets/assetWorkflowCopy'
import {pushHistory} from '../store/physics'
const props=defineProps<{asset:AssetRecord}>()
defineEmits<{(event:'select-asset',uuid:string):void}>()
const error=ref(''),slotResult=computed(/** 读取导入资源依赖槽，失败返回空槽列表和错误信息。 */ ()=>{try{return {slots:importedDependencySlots(props.asset),error:''}}catch(value){return {slots:[],error:value instanceof Error?value.message:String(value)}}}),slots=computed(/* 返回 slotResult.value.slots 的当前值。 */ ()=>slotResult.value.slots)
watch(/* 返回 props.asset.uuid 的当前值。 */ ()=>props.asset.uuid,/** 资源变化时清除旧绑定错误。 */ ()=>error.value='')
const candidates=/** 按图片或图集类型筛选依赖候选，排除自身与派生精灵。 */ (kind:'image'|'tileset')=>assetState.records.filter(/** 判断候选是否属于要求类型且不是自身或派生精灵。 */ asset=>asset!==props.asset&&asset.assetType===kind&&!asset.derivedSprite)
/** 写入依赖绑定并记录资源历史，失败时保留可见错误。 */ function choose(id:string,reference:string){error.value='';try{setImportedDependency(props.asset,id,reference);pushHistory('Assign imported source','asset:'+props.asset.uuid)}catch(value){error.value=value instanceof Error?value.message:String(value)}}
</script>
<style scoped>
.imported-bindings{display:grid;gap:var(--space-2);padding-block:var(--space-2);border-top:1px solid var(--border-subtle)}.imported-bindings p{overflow-wrap:anywhere;color:var(--danger)}
</style>
