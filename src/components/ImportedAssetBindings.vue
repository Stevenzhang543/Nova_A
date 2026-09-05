<template>
  <section class="imported-bindings" @change.stop>
    <strong>{{ copy('sourceBindings') }}</strong>
    <label v-for="slot in slots" :key="slot.id"><span>{{ copy(slot.kind==='image'?'imageSource':'tilesetSource') }} · {{ slot.name }}</span><select :value="slot.reference??''" @change="choose(slot.id,($event.target as HTMLSelectElement).value)"><option value="" disabled>{{ copy('chooseSource') }}</option><option v-for="candidate in candidates(slot.kind)" :key="candidate.uuid" :value="'asset://'+candidate.uuid">{{ candidate.path }}</option></select><button v-if="resolveAsset(slot.reference)" type="button" @click="$emit('select-asset',resolveAsset(slot.reference)!.uuid)">{{ copy('openSource') }}</button></label>
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
const error=ref(''),slotResult=computed(()=>{try{return {slots:importedDependencySlots(props.asset),error:''}}catch(value){return {slots:[],error:value instanceof Error?value.message:String(value)}}}),slots=computed(()=>slotResult.value.slots)
watch(()=>props.asset.uuid,()=>error.value='')
const candidates=(kind:'image'|'tileset')=>assetState.records.filter(asset=>asset!==props.asset&&asset.assetType===kind&&!asset.derivedSprite)
function choose(id:string,reference:string){error.value='';try{setImportedDependency(props.asset,id,reference);pushHistory('Assign imported source','asset:'+props.asset.uuid)}catch(value){error.value=value instanceof Error?value.message:String(value)}}
</script>
<style scoped>
.imported-bindings{display:grid;gap:8px;padding:8px;border:1px solid var(--border-subtle);border-radius:8px}.imported-bindings label{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:6px}.imported-bindings label>span{overflow-wrap:anywhere;white-space:normal}.imported-bindings select,.imported-bindings button{width:100%;max-width:100%;min-width:0;min-height:32px;white-space:normal}.imported-bindings button{border:1px solid var(--border-subtle);border-radius:6px;background:var(--surface-2);color:var(--text-primary)}.imported-bindings p{overflow-wrap:anywhere;color:var(--danger)}
</style>
