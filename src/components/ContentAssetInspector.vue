<template>
  <section v-if="visible" class="content-studio">
    <header><span><strong>{{ t('contentAssetStudio') }}</strong><small>{{ contextLabel }}</small></span><button v-if="animationAsset" @click="$emit('open-animation', asset.uuid)">{{ t('openAnimationWorkspace') }} ↗</button></header>
    <nav :aria-label="t('contentAssetTabs')"><button v-for="tab in tabs" :key="tab" :class="{active:activeTab===tab}" @click="activeTab=tab">{{ t(`contentTab_${tab}`) }}</button></nav>
    <section v-if="activeTab==='overview'" class="content-pane">
      <label><span>{{ t('contentFormat') }}</span><code>{{ asset.interchange?.format ?? (resourceDocument?.kind || asset.assetType) }}</code></label>
      <label v-if="asset.interchange"><span>{{ t('sourceIdentity') }}</span><code>{{ asset.interchange.sourceHash.slice(0,24) }}…</code></label>
      <label v-if="asset.interchange?.texturePath"><span>{{ t('texturePath') }}</span><code>{{ asset.interchange.texturePath }}</code></label>
      <p>{{ asset.interchange ? t('stableReimportHint') : resourceDocument ? t('sharedResourceHint') : t('animationContextHint') }}</p>
      <article v-for="diagnostic in asset.interchange?.diagnostics ?? []" :key="`${diagnostic.code}:${diagnostic.message}`" :class="['content-diagnostic',diagnostic.severity]"><b>{{ diagnostic.code }}</b><span>{{ diagnostic.message }}</span></article>
    </section>
    <section v-else-if="activeTab==='slices'" class="content-pane slice-pane">
      <header><strong>{{ t('stableSlices') }}</strong><span>{{ asset.interchange?.slices.length ?? 0 }}</span></header>
      <input v-model="sliceSearch" type="search" :placeholder="t('searchSlices')">
      <article v-for="slice in visibleSlices" :key="slice.id"><span><strong>{{ slice.name }}</strong><code>{{ slice.id }}</code></span><span>{{ slice.frame.x }},{{ slice.frame.y }} · {{ slice.frame.width }}×{{ slice.frame.height }}</span><span>{{ t('pivot') }} {{ slice.pivot.x.toFixed(3) }}, {{ slice.pivot.y.toFixed(3) }}</span><small>{{ slice.tags.join(', ') || t('noTags') }} · {{ slice.collider.length }} {{ t('colliderPoints') }}</small></article>
    </section>
    <section v-else-if="activeTab==='resource' && resourceDocument" class="content-pane resource-pane">
      <label><span>{{ t('resourceKind') }}</span><select v-model="resourceDocument.kind"><option v-for="kind in resourceKinds" :key="kind">{{ kind }}</option></select></label>
      <label><span>{{ t('resourceParent') }}</span><select v-model="resourceDocument.parent"><option :value="null">{{ t('none') }}</option><option v-for="candidate in compatibleParents" :key="candidate.uuid" :value="assetReference(candidate.uuid)">{{ candidate.name }}</option></select></label>
      <label class="data-editor"><span>{{ t('resourceOverrides') }}</span><textarea v-model="resourceData"></textarea></label>
      <p v-if="resourceError" class="resource-error">{{ resourceError }}</p>
      <div><button class="primary" @click="saveResourceDocument">{{ t('saveResource') }}</button><button @click="makeOverride">{{ t('createResourceOverride') }}</button></div>
      <section v-if="resolvedResource" class="resolved-resource"><strong>{{ t('resolvedResource') }}</strong><span>{{ resolvedResource.chain.length }} {{ t('inheritanceLevels') }}</span><code>{{ JSON.stringify(resolvedResource.data, null, 2) }}</code></section>
    </section>
    <section v-else class="content-pane animation-pane"><strong>{{ t('animationProduction') }}</strong><p>{{ t('animationContextHint') }}</p><ul><li>{{ t('animationContextCurves') }}</li><li>{{ t('animationContextRig') }}</li><li>{{ t('animationContextRetarget') }}</li></ul><button class="primary" @click="$emit('open-animation', asset.uuid)">{{ t('openAnimationWorkspace') }}</button></section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { assetReference, assetState } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import { t } from '../i18n'
import { addEditorLog } from '../store/editor'
import { pushHistory } from '../store/physics'
import { createResourceOverride, normalizeResource, readResource, resolveResource, saveResource, type NovaResourceDocument, type ResourceKind } from '../runtime/resources'

const props=defineProps<{asset:AssetRecord}>(),emit=defineEmits<{(event:'open-animation',uuid:string):void;(event:'select-asset',uuid:string):void}>()
type ContextTab='overview'|'slices'|'resource'|'animation'
const activeTab=ref<ContextTab>('overview'),sliceSearch=ref(''),resourceDocument=ref<NovaResourceDocument|null>(null),resourceData=ref('{}'),resourceError=ref('')
const resourceKinds:ResourceKind[]=['Material','AnimationLibrary','InputMap','PhysicsMaterial','Theme','DataTable']
const animationAsset=computed(()=>['animation','controller','animationMask','rig','skin','timeline'].includes(props.asset.assetType))
const visible=computed(()=>Boolean(props.asset.interchange)||props.asset.assetType==='resource'||animationAsset.value)
const tabs=computed<ContextTab[]>(()=>props.asset.interchange?['overview','slices']:props.asset.assetType==='resource'?['overview','resource']:['overview','animation'])
const contextLabel=computed(()=>props.asset.interchange?.format??resourceDocument.value?.kind??props.asset.assetType)
const compatibleParents=computed(()=>assetState.records.filter(candidate=>candidate.assetType==='resource'&&candidate.uuid!==props.asset.uuid&&readResource(candidate.uuid)?.kind===resourceDocument.value?.kind))
const resolvedResource=computed(()=>props.asset.assetType==='resource'?resolveResource(props.asset.uuid):null)
const visibleSlices=computed(()=>{const search=sliceSearch.value.trim().toLowerCase();return(props.asset.interchange?.slices??[]).filter(slice=>!search||`${slice.name} ${slice.tags.join(' ')}`.toLowerCase().includes(search)).slice(0,1_000)})
watch(()=>props.asset.uuid,()=>{activeTab.value='overview';sliceSearch.value='';resourceDocument.value=props.asset.assetType==='resource'?readResource(props.asset.uuid):null;resourceData.value=JSON.stringify(resourceDocument.value?.data??{},null,2);resourceError.value=''},{immediate:true})
function saveResourceDocument(){if(!resourceDocument.value)return;try{const data=JSON.parse(resourceData.value);resourceDocument.value=normalizeResource({...resourceDocument.value,data});if(!saveResource(props.asset.uuid,resourceDocument.value))throw new Error('The Resource could not be saved.');resourceData.value=JSON.stringify(resourceDocument.value.data,null,2);resourceError.value='';pushHistory('Edit shared resource',`resource:${props.asset.uuid}`);addEditorLog(t('resourceSaved',{name:props.asset.name}),'Assets')}catch(error){resourceError.value=error instanceof Error?error.message:String(error)}}
function makeOverride(){try{const created=createResourceOverride(props.asset.uuid,`${props.asset.name} Override`);pushHistory('Create resource override',`resource:${created.uuid}`);emit('select-asset',created.uuid)}catch(error){resourceError.value=error instanceof Error?error.message:String(error)}}
</script>

<style scoped>
.content-studio{margin:8px 0;min-width:0;border:1px solid var(--border-subtle);border-radius:10px;overflow:hidden;background:var(--surface-1)}.content-studio>header{min-height:46px;padding:7px 9px;display:flex;align-items:center;justify-content:space-between;gap:8px}.content-studio>header span{min-width:0;display:grid;gap:2px}.content-studio>header small{color:var(--text-muted);overflow-wrap:anywhere}.content-studio button,.content-studio select,.content-studio input,.content-studio textarea{min-width:0}.content-studio>nav{padding:3px;display:grid;grid-template-columns:repeat(auto-fit,minmax(74px,1fr));gap:3px;border-block:1px solid var(--border-subtle);background:var(--surface-2)}.content-studio>nav button{min-height:30px;border:0;border-radius:7px;background:transparent}.content-studio>nav button.active{color:var(--accent);background:var(--accent-soft)}.content-pane{max-height:330px;padding:9px;display:grid;gap:8px;overflow:auto}.content-pane label{display:grid;grid-template-columns:minmax(82px,.7fr) minmax(0,1.3fr);gap:7px;align-items:center}.content-pane code{overflow-wrap:anywhere;white-space:pre-wrap}.content-pane p{margin:0;color:var(--text-muted);overflow-wrap:anywhere}.content-diagnostic{padding:6px;display:grid;gap:2px;border-left:3px solid var(--accent);border-radius:6px;background:var(--surface-2)}.content-diagnostic.warning{border-color:var(--warning)}.content-diagnostic.error,.resource-error{border-color:var(--danger);color:var(--danger)}.slice-pane>header,.slice-pane article{display:flex;align-items:center;justify-content:space-between;gap:8px}.slice-pane article{padding:7px;align-items:flex-start;flex-wrap:wrap;border:1px solid var(--border-subtle);border-radius:8px}.slice-pane article>span:first-child{min-width:150px;display:grid}.slice-pane article code,.slice-pane article small{color:var(--text-muted)}.resource-pane .data-editor{display:grid}.resource-pane textarea{min-height:130px;resize:vertical;font-family:var(--font-mono)}.resource-pane>div{display:flex;gap:7px;flex-wrap:wrap}.resource-pane button,.animation-pane button{min-height:32px;padding:0 9px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}.resource-pane .primary,.animation-pane .primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}.resolved-resource{display:grid;gap:4px}.resolved-resource code{max-height:160px;padding:6px;overflow:auto;background:var(--bg-canvas)}
</style>
