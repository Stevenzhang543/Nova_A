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
    <section v-else-if="activeTab==='dependencies'" class="content-pane dependency-pane">
      <header><strong>{{ t('assetDependencyGraph') }}</strong><span>{{ dependencyView.nodes.length }} {{ t('nodes') }} · {{ dependencyView.edges.length }} {{ t('connections') }}</span></header>
      <div class="graph-summary"><span>↓ {{ t('dependencies') }} <b>{{ dependencyView.transitiveDependencies }}</b></span><span>↑ {{ t('dependents') }} <b>{{ dependencyView.transitiveDependents }}</b></span><span :class="{danger:dependencyView.missing}">{{ t('missingReferences') }} <b>{{ dependencyView.missing }}</b></span></div>
      <p v-if="dependencyView.truncated" class="content-diagnostic warning">{{ t('dependencyGraphTruncated') }}</p>
      <article v-for="cycle in dependencyView.cycles" :key="cycle.join('>')" class="content-diagnostic error"><b>{{ t('dependencyCycle') }}</b><span>{{ cycle.map(dependencyName).join(' → ') }}</span></article>
      <div class="dependency-lanes">
        <section><strong>{{ t('dependents') }}</strong><button v-for="node in dependentNodes" :key="node.id" :class="['dependency-node',node.direction,{cyclic:node.cyclic}]" @click="selectDependency(node.uuid)"><span>{{ node.name }}</span><small>{{ node.path }}</small><i>↑ {{ node.depth }}</i></button><p v-if="!dependentNodes.length">{{ t('noDependents') }}</p></section>
        <section class="selected-lane"><strong>{{ t('selectedAsset') }}</strong><button class="dependency-node selected" disabled><span>{{ asset.name }}</span><small>{{ asset.path }}</small></button></section>
        <section><strong>{{ t('dependencies') }}</strong><button v-for="node in dependencyNodes" :key="node.id" :disabled="node.direction==='missing'" :class="['dependency-node',node.direction,{cyclic:node.cyclic}]" @click="selectDependency(node.uuid)"><span>{{ node.name }}</span><small>{{ node.path }}</small><i>↓ {{ node.depth }}</i></button><p v-if="!dependencyNodes.length">{{ t('noDependencies') }}</p></section>
      </div>
    </section>
    <section v-else-if="activeTab==='pipeline'" class="content-pane pipeline-pane">
      <header><strong>{{ t('contentProductionProfile') }}</strong><span>{{ asset.pipeline?.reproducible ? t('reproducible') : t('attentionRequired') }}</span></header>
      <article v-for="feature in productionProfile" :key="feature.id" :class="['production-feature',feature.state]"><span><strong>{{ feature.label }}</strong><small>{{ feature.value }}</small></span><i>{{ feature.state==='ready' ? '✓' : feature.state==='attention' ? '!' : '○' }}</i></article>
      <p>{{ t('contentProfileHint') }}</p>
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
      <label><span>{{ t('resourceVariant') }}</span><select v-model="resourceVariant" @change="loadVariantEditor"><option v-for="variant in resourceVariants" :key="variant">{{ variant }}</option></select></label>
      <label v-if="resourceVariant!=='Default'" class="data-editor"><span>{{ t('variantOverrides') }}</span><textarea v-model="resourceVariantData"></textarea></label>
      <div class="variant-creator"><input v-model="newVariantName" :placeholder="t('newResourceVariant')" @keydown.enter="createVariant"><button @click="createVariant">＋ {{ t('addVariant') }}</button></div>
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
import { assetContentProfile, buildAssetDependencyView } from '../assets/contentLibrary26'
import type { AssetRecord } from '../assets/types'
import { t } from '../i18n'
import { addEditorLog } from '../store/editor'
import { pushHistory } from '../store/physics'
import { createResourceOverride, normalizeResource, readResource, resolveResource, resourceVariantNames, saveResource, setResourceVariantData, type NovaResourceDocument, type ResourceKind } from '../runtime/resources'

const props=defineProps<{asset:AssetRecord}>(),emit=defineEmits<{(event:'open-animation',uuid:string):void;(event:'select-asset',uuid:string):void}>()
type ContextTab='overview'|'dependencies'|'pipeline'|'slices'|'resource'|'animation'
const activeTab=ref<ContextTab>('overview'),sliceSearch=ref(''),resourceDocument=ref<NovaResourceDocument|null>(null),resourceData=ref('{}'),resourceError=ref(''),resourceVariant=ref('Default'),resourceVariantData=ref('{}'),newVariantName=ref('')
const resourceKinds:ResourceKind[]=['Material','AnimationLibrary','InputMap','PhysicsMaterial','Theme','DataTable']
const animationAsset=computed(()=>['animation','controller','animationMask','rig','skin','timeline'].includes(props.asset.assetType))
const visible=computed(()=>true)
const tabs=computed<ContextTab[]>(()=>['overview','dependencies','pipeline',...(props.asset.interchange?['slices' as const]:[]),...(props.asset.assetType==='resource'?['resource' as const]:[]),...(animationAsset.value?['animation' as const]:[])])
const contextLabel=computed(()=>props.asset.interchange?.format??resourceDocument.value?.kind??props.asset.assetType)
const compatibleParents=computed(()=>assetState.records.filter(candidate=>candidate.assetType==='resource'&&candidate.uuid!==props.asset.uuid&&readResource(candidate.uuid)?.kind===resourceDocument.value?.kind))
const resolvedResource=computed(()=>props.asset.assetType==='resource'?resolveResource(props.asset.uuid,resourceVariant.value):null)
const resourceVariants=computed(()=>resourceVariantNames(resourceDocument.value))
const dependencyView=computed(()=>buildAssetDependencyView(props.asset.uuid,assetState.records))
const dependencyNodes=computed(()=>dependencyView.value.nodes.filter(node=>node.direction==='dependency'||node.direction==='both'||node.direction==='missing'))
const dependentNodes=computed(()=>dependencyView.value.nodes.filter(node=>node.direction==='dependent'||node.direction==='both'))
const productionProfile=computed(()=>assetContentProfile(props.asset))
const visibleSlices=computed(()=>{const search=sliceSearch.value.trim().toLowerCase();return(props.asset.interchange?.slices??[]).filter(slice=>!search||`${slice.name} ${slice.tags.join(' ')}`.toLowerCase().includes(search)).slice(0,1_000)})
watch(()=>props.asset.uuid,()=>{activeTab.value='overview';sliceSearch.value='';resourceDocument.value=props.asset.assetType==='resource'?readResource(props.asset.uuid):null;resourceData.value=JSON.stringify(resourceDocument.value?.data??{},null,2);resourceVariant.value=resourceDocument.value?.activeVariant??'Default';loadVariantEditor();resourceError.value=''},{immediate:true})
function dependencyName(uuid:string){return assetState.records.find(asset=>asset.uuid.toLowerCase()===uuid.toLowerCase())?.name??uuid.slice(0,12)}
function selectDependency(uuid:string){const match=assetState.records.find(asset=>asset.uuid.toLowerCase()===uuid.toLowerCase());if(match)emit('select-asset',match.uuid)}
function loadVariantEditor(){resourceVariantData.value=JSON.stringify(resourceVariant.value==='Default'?{}:resourceDocument.value?.variants?.[resourceVariant.value]??{},null,2)}
function createVariant(){if(!resourceDocument.value)return;try{resourceDocument.value=setResourceVariantData(resourceDocument.value,newVariantName.value,{});resourceVariant.value=resourceDocument.value.activeVariant??'Default';newVariantName.value='';loadVariantEditor();resourceError.value=''}catch(error){resourceError.value=error instanceof Error?error.message:String(error)}}
function saveResourceDocument(){if(!resourceDocument.value)return;try{const data=JSON.parse(resourceData.value);let document=normalizeResource({...resourceDocument.value,data,activeVariant:resourceVariant.value});if(resourceVariant.value!=='Default')document=setResourceVariantData(document,resourceVariant.value,JSON.parse(resourceVariantData.value));resourceDocument.value=document;if(!saveResource(props.asset.uuid,document))throw new Error('The Resource could not be saved.');resourceData.value=JSON.stringify(document.data,null,2);loadVariantEditor();resourceError.value='';pushHistory('Edit shared resource',`resource:${props.asset.uuid}`);addEditorLog(t('resourceSaved',{name:props.asset.name}),'Assets')}catch(error){resourceError.value=error instanceof Error?error.message:String(error)}}
function makeOverride(){try{const created=createResourceOverride(props.asset.uuid,`${props.asset.name} Override`);pushHistory('Create resource override',`resource:${created.uuid}`);emit('select-asset',created.uuid)}catch(error){resourceError.value=error instanceof Error?error.message:String(error)}}
</script>

<style scoped>
.content-studio{margin:8px 0;min-width:0;border:1px solid var(--border-subtle);border-radius:10px;overflow:hidden;background:var(--surface-1)}.content-studio>header{min-height:46px;padding:7px 9px;display:flex;align-items:center;justify-content:space-between;gap:8px}.content-studio>header span{min-width:0;display:grid;gap:2px}.content-studio>header small{color:var(--text-muted);overflow-wrap:anywhere}.content-studio button,.content-studio select,.content-studio input,.content-studio textarea{min-width:0}.content-studio>nav{padding:3px;display:grid;grid-template-columns:repeat(auto-fit,minmax(74px,1fr));gap:3px;border-block:1px solid var(--border-subtle);background:var(--surface-2)}.content-studio>nav button{min-height:30px;border:0;border-radius:7px;background:transparent}.content-studio>nav button.active{color:var(--accent);background:var(--accent-soft)}.content-pane{max-height:330px;padding:9px;display:grid;gap:8px;overflow:auto}.content-pane label{display:grid;grid-template-columns:minmax(82px,.7fr) minmax(0,1.3fr);gap:7px;align-items:center}.content-pane code{overflow-wrap:anywhere;white-space:pre-wrap}.content-pane p{margin:0;color:var(--text-muted);overflow-wrap:anywhere}.content-diagnostic{padding:6px;display:grid;gap:2px;border-left:3px solid var(--accent);border-radius:6px;background:var(--surface-2)}.content-diagnostic.warning{border-color:var(--warning)}.content-diagnostic.error,.resource-error{border-color:var(--danger);color:var(--danger)}.slice-pane>header,.slice-pane article{display:flex;align-items:center;justify-content:space-between;gap:8px}.slice-pane article{padding:7px;align-items:flex-start;flex-wrap:wrap;border:1px solid var(--border-subtle);border-radius:8px}.slice-pane article>span:first-child{min-width:150px;display:grid}.slice-pane article code,.slice-pane article small{color:var(--text-muted)}.resource-pane .data-editor{display:grid}.resource-pane textarea{min-height:130px;resize:vertical;font-family:var(--font-mono)}.resource-pane>div{display:flex;gap:7px;flex-wrap:wrap}.resource-pane button,.animation-pane button{min-height:32px;padding:0 9px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}.resource-pane .primary,.animation-pane .primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}.resolved-resource{display:grid;gap:4px}.resolved-resource code{max-height:160px;padding:6px;overflow:auto;background:var(--bg-canvas)}
.dependency-pane>header,.pipeline-pane>header{display:flex;align-items:center;justify-content:space-between;gap:8px}.dependency-pane>header span,.pipeline-pane>header span{color:var(--text-muted)}.graph-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.graph-summary span{padding:6px;border-radius:7px;background:var(--surface-2);text-align:center}.graph-summary .danger{color:var(--danger)}.dependency-lanes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;align-items:start}.dependency-lanes>section{min-width:0;padding:6px;display:grid;gap:5px;border:1px solid var(--border-subtle);border-radius:8px}.dependency-lanes>section>p{font-size:11px}.dependency-node{position:relative;min-width:0;padding:7px;display:grid;gap:2px;border:1px solid transparent;border-radius:7px;text-align:left;background:var(--surface-2)}.dependency-node:hover:not(:disabled){border-color:var(--accent)}.dependency-node span,.dependency-node small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dependency-node small{color:var(--text-muted)}.dependency-node i{position:absolute;right:5px;top:5px;color:var(--text-muted);font-style:normal}.dependency-node.selected{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}.dependency-node.missing{color:var(--danger);border-color:var(--danger)}.dependency-node.cyclic{box-shadow:inset 3px 0 var(--warning)}.production-feature{padding:7px;display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}.production-feature>span{min-width:0;display:grid;gap:2px}.production-feature small{color:var(--text-muted);overflow-wrap:anywhere}.production-feature i{width:22px;height:22px;display:grid;place-items:center;border-radius:50%;font-style:normal;background:var(--surface-3)}.production-feature.ready i{color:var(--success)}.production-feature.attention i{color:var(--warning)}.variant-creator{display:grid!important;grid-template-columns:minmax(0,1fr) auto}.variant-creator button{white-space:nowrap}@media(max-width:760px){.dependency-lanes{grid-template-columns:1fr}.selected-lane{grid-row:1}.graph-summary{grid-template-columns:1fr}.content-pane label{grid-template-columns:1fr}}
</style>
