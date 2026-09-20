<template>
  <section class="event-studio">
    <ObjectBlueprintEditor v-if="blueprintEditorUuid" :key="blueprintEditorUuid" :asset-uuid="blueprintEditorUuid" @close="blueprintEditorUuid=null" @derive="deriveBlueprint" />
    <StudioDraftConflict format="json" v-if="eventDraftConflict" :saved-source="savedEventSource" :draft-source="JSON.stringify(document)" @keep="acceptEventDraftBase" @discard="restoreDiscardedDraft" />
    <div class="event-layout">
    <aside class="sheet-browser">
      <header><strong>{{ t('eventSheets') }}</strong><button :aria-label="t('newEventSheet')" class="primary" @click="createForSelection">＋</button></header>
      <input :aria-label="t('searchEventSheets')" v-model="assetSearch" type="search" :placeholder="t('searchEventSheets')">
      <button v-for="asset in filteredAssets" :key="asset.uuid" :class="{ active: asset.uuid === activeAsset?.uuid }" @click="open(asset.uuid)"><i>⚡</i><span><strong>{{ asset.name }}</strong><small>{{ asset.path }}</small></span></button>
      <p v-if="!filteredAssets.length" class="empty">{{ t('noEventSheets') }}</p>
      <section class="quick-flow">
        <strong>{{ t('quickObjectWorkflow') }}</strong>
        <p>{{ t('quickObjectWorkflowHint') }}</p>
        <div><button @click="quickObject('Rectangle')">▭ {{ t('rectangle') }}</button><button @click="quickObject('Sprite')">▧ Sprite</button></div>
      </section>
    </aside>

    <main class="sheet-main">
      <header class="sheet-toolbar">
        <div><strong>{{ document.name }}</strong><span>{{ activeAsset?.path ?? t('unsaved') }}</span></div>
        <button :disabled="!selectedEntity || !activeAsset" @click="attachToSelection">{{ attached ? t('attached') : t('attachToSelected') }}</button>
        <button :disabled="!activeAsset" class="primary" @click="save">{{ t('saveAsset') }}</button>
      </header>

      <section class="object-context">
        <div><span>{{ t('selectedObject') }}</span><strong>{{ selectedEntity?.name ?? t('none') }}</strong><small>{{ selectedEntity ? `${selectedEntity.components.length} ${t('components')}` : t('selectObjectForEvents') }}</small></div>
        <label><span>{{ t('eventOwner') }}</span><select v-model="document.ownerComponent" @change="markDirty"><option value="Entity">{{ t('entity') }}</option><option v-for="component in selectedEntity?.components ?? []" :key="component.uuid" :value="component.kind">{{ component.kind }}</option></select></label>
        <label><span>{{ t('logicAsset') }}</span><select v-model="document.logicAsset" @change="logicChanged"><option :value="null">{{ t('none') }}</option><option v-for="asset in logicAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }} · {{ asset.assetType === 'script' ? 'Rhai' : t('visualGraph') }}</option></select></label>
        <label><span>{{ t('inheritsFrom') }}</span><select v-model="document.baseSheetAsset" @change="markDirty"><option :value="null">{{ t('none') }}</option><option v-for="asset in sheetAssets.filter(item => item.uuid !== activeAsset?.uuid)" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
      </section>

      <section class="event-list">
        <header><div><strong>{{ t('objectEvents') }}</strong><span>{{ visibleHandlers.length }} / {{ document.handlers.length }}</span></div><input :aria-label="t('searchEvents')" v-model="eventSearch" type="search" :placeholder="t('searchEvents')"><button class="primary" @click="addHandler">＋ {{ t('addEvent') }}</button></header>
        <article v-for="handler in visibleHandlers" :key="handler.uuid" :class="{ disabled: !handler.enabled }">
          <label class="enabled"><input :aria-label="t('enabled') + ' · ' + handler.name" v-model="handler.enabled" type="checkbox" @change="markDirty"><span></span></label>
          <select :aria-label="panelControlLabel('eventKind')" v-model="handler.kind" class="event-kind" @change="eventKindChanged(handler)"><option v-for="kind in eventKinds" :key="kind" :value="kind">{{ eventKindLabel(kind) }}</option></select>
          <div class="event-copy"><input :aria-label="t('eventName')" v-model="handler.name" maxlength="120" :placeholder="t('eventName')" @change="markDirty"><small>{{ eventDescription(handler.kind) }}</small></div>
          <label v-if="needsSelector(handler.kind)" class="selector"><span>{{ selectorLabel(handler.kind) }}</span><input v-model="handler.selector" maxlength="256" @change="markDirty"></label>
          <label class="callback"><span>{{ t('callback') }}</span><input v-model="handler.callback" list="event-callbacks" maxlength="120" @change="markDirty"></label>
          <label class="priority"><span>{{ t('priority') }}</span><NumericExpressionInput v-model="handler.priority" :resource-key="`${activeUuid}:${handler.uuid}:priority`" :aria-label="t('priority')" :minimum="-1000000" :maximum="1000000" integer @change="markDirty" /></label>
          <label class="override"><input v-model="handler.overrideInherited" type="checkbox" @change="markDirty"><span>{{ t('overrideInherited') }}</span></label>
          <button class="danger" :title="t('remove')" @click="removeHandler(handler.uuid)">×</button>
        </article>
        <p v-if="!visibleHandlers.length" class="empty">{{ t('noMatchingEvents') }}</p>
        <datalist id="event-callbacks"><option v-for="name in callbacks" :key="name" :value="name"></option></datalist>
      </section>
    </main>

    <aside class="event-details">
      <section>
        <header><strong>{{ t('underlyingAssets') }}</strong></header>
        <button :disabled="!logicRecord" @click="openLogic"><i>{{ logicRecord?.assetType === 'visualScript' ? '⌘' : '{ }' }}</i><span><strong>{{ logicRecord?.name ?? t('none') }}</strong><small>{{ t('openWithoutHidingAsset') }}</small></span></button>
        <button v-if="activeAsset"><i>⚡</i><span><strong>{{ activeAsset.name }}</strong><small>{{ t('eventSheetAssetVisible') }}</small></span></button>
      </section>
      <section>
        <header><strong>{{ t('validation') }}</strong><span :class="{ valid: !errors.length }">{{ errors.length ? t('issueCount', { count: errors.length }) : `✓ ${t('valid')}` }}</span></header>
        <p v-for="issue in diagnostics" :key="`${issue.code}:${issue.handlerUuid}`" :class="issue.severity"><b>{{ issue.code }}</b>{{ issue.message }}</p>
        <p v-if="!diagnostics.length" class="valid">{{ t('eventSheetValid') }}</p>
      </section>
      <section class="blueprints">
        <header><strong>{{ t('objectBlueprints') }}</strong><button :aria-label="t('add') + ' · ' + t('objectBlueprints')" :disabled="!selectedEntity" @click="createBlueprint">＋</button></header>
        <article v-for="asset in blueprintAssets" :key="asset.uuid" class="blueprint-entry"><strong>{{ asset.name }}</strong><small>{{ asset.path }}</small><div><button @click="blueprintEditorUuid=asset.uuid">{{ ownershipLabels.editBlueprint }}</button><button :disabled="physicsState.playMode!=='editing'" @click="instantiateBlueprint(asset.uuid)">{{ t('instantiateToScene') }}</button></div></article>
        <p v-if="!blueprintAssets.length" class="empty">{{ t('noObjectBlueprints') }}</p>
      </section>
      <section class="seed"><label><span>{{ t('deterministicSeed') }}</span><NumericExpressionInput v-model="document.deterministicSeed" :resource-key="`${activeUuid}:deterministicSeed`" :aria-label="t('deterministicSeed')" :minimum="1" :maximum="2147483647" integer @change="markDirty" /></label><small>{{ t('deterministicSeedHint') }}</small></section>
    </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import NumericExpressionInput from './NumericExpressionInput.vue'
import { settleEditorDrafts } from '../editor/pendingDrafts'
import ObjectBlueprintEditor from './ObjectBlueprintEditor.vue'
import {authorBlueprintFromEntity,authorDerivedBlueprint,authorBlueprintInstance} from '../editor/objectBlueprintAuthoring'
import {objectOwnershipCopy} from '../editor/objectOwnershipCopy'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { assetReference, assetState, createTextAsset, readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import { openScriptAsset } from '../editor/scriptStudioState'
import { t } from '../i18n'
import { preferencesState } from '../store/preferences'
import { validateEventSheetDraft } from '../editor/eventSheetDraftValidation'
import { projectSessionState } from '../projects/projectSession'
import { clearStudioDraft, readStudioDraft, registerStudioDraftOwner, retainStudioDraft, type StudioDraftCandidate } from '../editor/studioDraftRetention'
import StudioDraftConflict from './StudioDraftConflict.vue'
import { panelControlLabel } from '../editor/panelControlCopy'
import { createEventSheetTransitionGuard } from '../editor/panelAuthoringGuards'
import { requestConfirmation } from '../store/dialog'
import { physicsState, pushHistory } from '../store/physics'
import { addEditorLog } from '../store/editor'
import { graphStudioState, openGraphAsset } from '../visual/graphStudioState'
import type { AuthoringObjectKind } from '../world/Entity'
import { OBJECT_EVENT_KINDS, resolveEventSheetPrimaryLogic, attachEventSheet, callbackNamesInLogic, createEventSheetAsset, defaultEventHandler, defaultEventSheet, parseEventSheet, saveEventSheetAsset, validateEventSheet, type EventSheetDocument, type ObjectEventHandler, type ObjectEventKind } from '../runtime/eventSheets'
import { createQuickObjectWorkflow } from '../runtime/objectBlueprints'

const assetSearch=ref(''),eventSearch=ref(''),dirty=ref(false),document=shallowRef<EventSheetDocument>(defaultEventSheet()),activeUuid=ref('')
const sheetAssets=computed(()=>{void assetState.generation;return assetState.records.filter(asset=>asset.assetType==='eventSheet').sort((a,b)=>a.path.localeCompare(b.path))})
const blueprintAssets=computed(()=>{void assetState.generation;return assetState.records.filter(asset=>asset.assetType==='objectBlueprint').sort((a,b)=>a.path.localeCompare(b.path))})
const logicAssets=computed(()=>{void assetState.generation;return assetState.records.filter(asset=>asset.assetType==='script'||asset.assetType==='visualScript').sort((a,b)=>a.path.localeCompare(b.path))})
const filteredAssets=computed(()=>{const query=assetSearch.value.trim().toLowerCase();return query?sheetAssets.value.filter(asset=>`${asset.name} ${asset.path}`.toLowerCase().includes(query)):sheetAssets.value})
const activeAsset=computed(()=>sheetAssets.value.find(asset=>asset.uuid===activeUuid.value)??null)
const draftProjectId=projectSessionState.id,loadedBaseSource=ref<string|null>(null)
const savedEventSource=computed(()=>{void assetState.generation;return activeAsset.value?readTextAsset(activeAsset.value.uuid):null})
const eventDraftConflict=computed(()=>dirty.value&&savedEventSource.value!==loadedBaseSource.value)
function eventDraftCandidate():StudioDraftCandidate|null{return dirty.value&&activeAsset.value?{record:activeAsset.value,projectId:draftProjectId,kind:'events',source:JSON.stringify(document.value),baseSource:loadedBaseSource.value}:null}
function retainEventDraft(){const candidate=eventDraftCandidate();if(candidate)retainStudioDraft(candidate)}
function acceptEventDraftBase(){loadedBaseSource.value=savedEventSource.value;retainEventDraft()}
const unregisterDraftOwner=registerStudioDraftOwner({read:eventDraftCandidate,discard:()=>{if(!restoreDiscardedDraft())throw Error(panelControlLabel('draftInvalid'))}})
const selectedEntity=computed(()=>physicsState.world.entities.find(entity=>entity.id===physicsState.selectedEntityId)??null)
const attached=computed(()=>!!activeAsset.value&&selectedEntity.value?.script2D?.eventSheetAsset===assetReference(activeAsset.value.uuid))
const logicRecord=computed(()=>resolveAsset(resolveEventSheetPrimaryLogic(document.value)))
const callbacks=computed(()=>[...callbackNamesInLogic(document.value)].sort())
const diagnostics=computed(()=>[...validateEventSheetDraft(document.value,preferencesState.locale),...validateEventSheet(document.value,assetState.records)])
const errors=computed(()=>diagnostics.value.filter(issue=>issue.severity==='error'))
const eventKinds=OBJECT_EVENT_KINDS
const visibleHandlers=computed(()=>{const query=eventSearch.value.trim().toLowerCase();return query?document.value.handlers.filter(handler=>`${handler.name} ${handler.kind} ${handler.selector} ${handler.callback}`.toLowerCase().includes(query)):document.value.handlers})

const transitions=createEventSheetTransitionGuard({
  snapshot:()=>({identity:activeUuid.value,source:JSON.stringify(document.value),dirty:dirty.value}),
  chooseSave:()=>requestConfirmation({title:panelControlLabel('draftTitle'),message:panelControlLabel('draftMessage'),confirmLabel:panelControlLabel('saveContinue'),cancelLabel:panelControlLabel('otherChoices'),destructive:false}),
  chooseDiscard:()=>requestConfirmation({title:panelControlLabel('discardTitle'),message:panelControlLabel('discardMessage'),confirmLabel:panelControlLabel('discard'),cancelLabel:t('cancel'),destructive:true}),
  save:()=>save(),
  report:(reason,error)=>addEditorLog(reason==='failed'?(error instanceof Error?error.message:String(error)):panelControlLabel(reason==='invalid'?'draftInvalid':'draftStale'),'Script','error',activeUuid.value)
})
function runSheetTransition(operation: () => boolean | void | Promise<boolean | void>): Promise<boolean> {
  return settleEditorDrafts() ? transitions.run(operation) : Promise.resolve(false)
}
function commitDocument(uuid:string,value:EventSheetDocument){const previous=activeAsset.value,previousDirty=dirty.value;const record=sheetAssets.value.find(asset=>asset.uuid===uuid),source=readTextAsset(uuid),recovery=record?readStudioDraft(record,draftProjectId,'events',source):null;const next=recovery?JSON.parse(recovery.entry.source) as EventSheetDocument:value;if(previousDirty&&previous&&previous.uuid!==uuid)clearStudioDraft(previous,draftProjectId);document.value=next;loadedBaseSource.value=recovery?recovery.entry.baseSource:source;activeUuid.value=uuid;assetState.selectedGuid=uuid;graphStudioState.activeEventSheetUuid=uuid;dirty.value=!!recovery}
async function open(uuid:string){
  if(uuid===activeUuid.value)return true
  const source=readTextAsset(uuid);if(!source){if(graphStudioState.activeEventSheetUuid===uuid)graphStudioState.activeEventSheetUuid=activeUuid.value;return false}
  try{
    const parsed=parseEventSheet(source)
    const accepted=await runSheetTransition(()=>{if(readTextAsset(uuid)!==source){addEditorLog(panelControlLabel('draftStale'),'Script','error',uuid);return false}commitDocument(uuid,parsed);return true})
    if(!accepted&&graphStudioState.activeEventSheetUuid===uuid)graphStudioState.activeEventSheetUuid=activeUuid.value
    return accepted
  }catch(error){addEditorLog(error instanceof Error?error.message:String(error),'Script','error',uuid);if(graphStudioState.activeEventSheetUuid===uuid)graphStudioState.activeEventSheetUuid=activeUuid.value;return false}
}
function restoreDiscardedDraft(){
  if(!dirty.value)return true
  const source=readTextAsset(activeUuid.value)
  if(!source){addEditorLog(panelControlLabel('draftInvalid'),'Script','error',activeUuid.value);return false}
  try{document.value=parseEventSheet(source);loadedBaseSource.value=source;dirty.value=false;if(activeAsset.value)clearStudioDraft(activeAsset.value,draftProjectId);return true}catch(error){addEditorLog(error instanceof Error?error.message:String(error),'Script','error',activeUuid.value);return false}
}
async function requestLeave(){return runSheetTransition(()=>restoreDiscardedDraft())}
defineExpose({requestLeave})
function markDirty(){dirty.value=true;document.value={...document.value};retainEventDraft()}
function logicTemplate(name:string){return `// ${name}\nfn awake() { }\nfn start() { }\nfn update(dt) { }\nfn fixed_update(dt) { }\nfn on_timer(name) { }\nfn on_task(name) { }\nfn on_destroy() { }\nfn on_signal(name, payload, source) { }\nfn on_collision_enter(other, px, py, nx, ny, rvx, rvy) { }\nfn on_trigger_enter(other, px, py, nx, ny, rvx, rvy) { }\n`}
async function createForSelection(){const expected=selectedEntity.value;return runSheetTransition(()=>{if(selectedEntity.value!==expected){addEditorLog(panelControlLabel('draftStale'),'Script','error');return false}const entity=selectedEntity.value,name=entity?`${entity.name} Events`:t('newEventSheet');let logic=entity?.script2D?.scriptAsset??null;if(!logic){const asset=createTextAsset(`${entity?.name??'Object'} Logic`,'script',logicTemplate(`${entity?.name??'Object'} Logic`),'Assets/Scripts');logic=assetReference(asset.uuid)}const asset=createEventSheetAsset(name,logic);commitDocument(asset.uuid,parseEventSheet(readTextAsset(asset.uuid)!));if(entity)attachToSelection();pushHistory('Create Event Sheet');return true})}
function attachToSelection(){if(!selectedEntity.value||!activeAsset.value)return;if(attachEventSheet(selectedEntity.value,assetReference(activeAsset.value.uuid))){physicsState.world.invalidateRuntime();pushHistory('Attach Event Sheet');addEditorLog(t('eventSheetAttached',{name:selectedEntity.value.name}),'Script')}}
function save():boolean{
  if(!settleEditorDrafts()||!activeAsset.value||errors.value.length)return false
  if(!dirty.value)return true
  if(eventDraftConflict.value){addEditorLog(panelControlLabel('draftStale'),'Script','error',activeUuid.value);return false}
  try{
    if(!saveEventSheetAsset(activeAsset.value.uuid,document.value)){addEditorLog(panelControlLabel('draftInvalid'),'Script','error',activeUuid.value);return false}
    if(attached.value&&selectedEntity.value)attachEventSheet(selectedEntity.value,assetReference(activeAsset.value.uuid))
    pushHistory('Save Event Sheet',`event-sheet:${activeAsset.value.uuid}`)
    addEditorLog(t('eventSheetSaved',{name:activeAsset.value.name}),'Script');dirty.value=false;loadedBaseSource.value=readTextAsset(activeAsset.value.uuid);clearStudioDraft(activeAsset.value,draftProjectId);return true
  }catch(error){addEditorLog(error instanceof Error?error.message:String(error),'Script','error',activeUuid.value);return false}
}
function addHandler(){document.value.handlers.push(defaultEventHandler('start'));markDirty()}
function removeHandler(uuid:string){document.value.handlers=document.value.handlers.filter(handler=>handler.uuid!==uuid);markDirty()}
function eventKindChanged(handler:ObjectEventHandler){const replacement=defaultEventHandler(handler.kind);handler.callback=replacement.callback;handler.name=replacement.name;handler.selector='';markDirty()}
function logicChanged(){markDirty()}
async function openLogic(){return runSheetTransition(()=>{if(!restoreDiscardedDraft())return false;const record=logicRecord.value;if(!record)return false;if(record.assetType==='visualScript')openGraphAsset(record.uuid);else{openScriptAsset(record.uuid);graphStudioState.mode='code'}return true})}
const blueprintEditorUuid=ref<string|null>(null),ownershipLabels=computed(()=>objectOwnershipCopy[preferencesState.locale])
async function createBlueprint(){const expected=selectedEntity.value;if(!expected)return;return runSheetTransition(()=>{if(selectedEntity.value!==expected)return false;try{blueprintEditorUuid.value=authorBlueprintFromEntity(expected,activeAsset.value?assetReference(activeAsset.value.uuid):null);return true}catch(error){addEditorLog(error instanceof Error?error.message:String(error),'Assets','error');return false}})}
function instantiateBlueprint(uuid:string){try{const values=authorBlueprintInstance(uuid);addEditorLog(t('objectBlueprintInstantiated',{count:values.length}),'Assets')}catch(error){addEditorLog(error instanceof Error?error.message:String(error),'Assets','error')}}
function deriveBlueprint(uuid:string){try{blueprintEditorUuid.value=authorDerivedBlueprint(uuid,ownershipLabels.value.deriveName)}catch(error){addEditorLog(error instanceof Error?error.message:String(error),'Assets','error')}}async function quickObject(kind:AuthoringObjectKind){return runSheetTransition(()=>{const result=createQuickObjectWorkflow(kind,kind==='Sprite'?t('spriteObject'):t('shapeObject'));if(!result)return false;const record=resolveAsset(result.eventSheetAsset);if(!record)return false;commitDocument(record.uuid,parseEventSheet(readTextAsset(record.uuid)!));pushHistory('Quick Object Workflow');return true})}
function needsSelector(kind:ObjectEventKind){return ['input-pressed','input-released','timer','task','signal','ui','animation','network'].includes(kind)}
function selectorLabel(kind:ObjectEventKind){if(kind==='task')return ownershipLabels.value.taskName;return t(kind.startsWith('input-')?'inputAction':kind==='timer'?'timerName':kind==='ui'?'uiEvent':kind==='animation'?'animationEvent':kind==='network'?'networkEvent':'signalName')}
function eventKindLabel(kind:ObjectEventKind){return kind==='destroy'?ownershipLabels.value.eventDestroy:kind==='task'?ownershipLabels.value.eventTask:t(`event_${kind}`)} 
function eventDescription(kind:ObjectEventKind){return kind==='destroy'?ownershipLabels.value.destroyHint:kind==='task'?ownershipLabels.value.taskHint:t(`event_${kind}_hint`)}

watch(savedEventSource,source=>{
  if(dirty.value||!source||source===loadedBaseSource.value)return
  try{document.value=parseEventSheet(source);loadedBaseSource.value=source}
  catch(error){addEditorLog(error instanceof Error?error.message:String(error),'Script','error',activeUuid.value)}
})
watch(()=>graphStudioState.activeEventSheetUuid,uuid=>{if(uuid&&uuid!==activeUuid.value)open(uuid)})
onBeforeUnmount(()=>{retainEventDraft();unregisterDraftOwner()})
onMounted(()=>{const selected=assetState.records.find(asset=>asset.uuid===graphStudioState.activeEventSheetUuid&&asset.assetType==='eventSheet')??assetState.records.find(asset=>asset.uuid===assetState.selectedGuid&&asset.assetType==='eventSheet')??sheetAssets.value[0];if(selected)open(selected.uuid)})
</script>

<style scoped>
.event-studio{position:absolute;inset:0;min-width:0;min-height:0;display:grid;grid-template-columns:238px minmax(420px,1fr) 284px;overflow:hidden;background:var(--bg-canvas)}button,input,select{font:inherit}.sheet-browser,.event-details{min-width:0;min-height:0;overflow:auto;background:var(--surface-1)}.sheet-browser{border-right:1px solid var(--border-subtle)}.event-details{border-left:1px solid var(--border-subtle)}.sheet-browser>header,.event-details section>header{min-height:38px;padding:6px 9px;display:flex;align-items:center;justify-content:space-between}.sheet-browser>input{width:calc(100% - 14px);margin:0 7px 7px}.sheet-browser>button,.event-details section>button{width:calc(100% - 12px);margin:2px 6px;padding:7px;display:flex;align-items:center;gap:8px;text-align:left;border:1px solid transparent;border-radius:8px;color:var(--text-secondary);background:transparent}.sheet-browser>button.active{border-color:var(--accent);background:var(--accent-soft)}.sheet-browser button i,.event-details button i{width:27px;height:27px;display:grid;place-items:center;flex:0 0 auto;border-radius:7px;color:var(--accent);background:var(--surface-3);font-style:normal}.sheet-browser button span,.event-details button span{min-width:0;display:grid}.sheet-browser button strong,.sheet-browser button small,.event-details button strong,.event-details button small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sheet-browser button small,.event-details button small{color:var(--text-muted);font-size:var(--type-caption)}.primary{color:var(--accent-contrast)!important;border-color:var(--accent)!important;background:var(--accent)!important}.quick-flow{margin:10px 7px;padding:9px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.quick-flow p{color:var(--text-muted);font-size:var(--type-caption)}.quick-flow div{display:flex;gap:5px}.quick-flow button{min-height:30px;flex:1;border:1px solid var(--border-subtle);border-radius:7px;background:var(--surface-3)}.sheet-main{min-width:0;min-height:0;display:flex;flex-direction:column}.sheet-toolbar{min-height:51px;padding:6px 10px;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--border-subtle);background:var(--surface-1)}.sheet-toolbar>div{min-width:0;display:grid;flex:1}.sheet-toolbar span{overflow:hidden;color:var(--text-muted);font-size:var(--type-caption);text-overflow:ellipsis;white-space:nowrap}.sheet-toolbar button{min-height:32px;padding:0 10px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2)}.object-context{padding:8px;display:grid;grid-template-columns:minmax(150px,1fr) repeat(3,minmax(135px,1fr));gap:7px;border-bottom:1px solid var(--border-subtle);background:var(--surface-2)}.object-context>div,.object-context label{min-width:0;display:grid;gap:3px}.object-context span,.object-context small,.event-list label span,.seed span{color:var(--text-muted);font-size:var(--type-caption)}.object-context strong,.object-context small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.event-list{min-height:0;padding:8px;overflow:auto}.event-list>header{position:sticky;z-index:2;top:-8px;min-height:46px;padding:6px 0;display:flex;align-items:center;gap:7px;background:var(--bg-canvas)}.event-list>header>div{min-width:120px;display:grid}.event-list>header span{color:var(--text-muted);font-size:var(--type-caption)}.event-list>header input{min-width:120px;flex:1}.event-list>header button{min-height:32px;border:1px solid var(--border-subtle);border-radius:8px}.event-list article{margin:5px 0;padding:7px;display:grid;grid-template-columns:22px minmax(125px,.8fr) minmax(145px,1.2fr) minmax(115px,1fr) minmax(110px,1fr) 78px 115px 28px;align-items:center;gap:6px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-1);box-shadow:var(--shadow-sm);transition:opacity var(--motion-fast),border-color var(--motion-fast),transform var(--motion-fast)}.event-list article:hover{border-color:var(--border-strong);transform:translateY(-1px)}.event-list article.disabled{opacity:.56}.event-list article label,.event-copy{min-width:0;display:grid;gap:2px}.event-copy small{overflow:hidden;color:var(--text-muted);font-size:var(--type-caption);text-overflow:ellipsis;white-space:nowrap}.event-list input,.event-list select{min-width:0;width:100%}.event-list .enabled input{width:16px}.event-list .override{display:flex;align-items:center;gap:4px}.event-list .override input{width:15px}.event-list .danger{width:28px;height:28px;border:0;border-radius:7px;color:var(--danger);background:transparent}.event-details section{padding-bottom:7px;border-bottom:1px solid var(--border-subtle)}.event-details section>header span{font-size:var(--type-caption)}.event-details section>p{margin:4px 8px;padding:7px;display:grid;gap:2px;border-radius:7px;color:var(--text-secondary);background:var(--surface-2);font-size:var(--type-caption)}.event-details p.error{border-left:3px solid var(--danger)}.event-details p.warning{border-left:3px solid var(--warning)}.event-details .valid{color:var(--success)}.seed{padding:9px!important}.seed label{display:grid;gap:4px}.seed small{display:block;margin-top:5px;color:var(--text-muted);font-size:var(--type-caption)}.empty{padding:12px;color:var(--text-muted);font-size:var(--type-caption)}
@container nova-events (max-width:1180px){.event-studio{grid-template-columns:210px minmax(360px,1fr)}.event-details{position:absolute;z-index:10;top:0;right:0;bottom:0;width:280px;box-shadow:var(--shadow-lg)}.event-list article{grid-template-columns:22px minmax(120px,1fr) minmax(140px,1.2fr) minmax(120px,1fr) minmax(110px,1fr) 28px}.event-list .priority,.event-list .override{display:none}.object-context{grid-template-columns:repeat(2,minmax(150px,1fr))}}
@container nova-events (max-width:760px){.event-studio{display:block}.sheet-browser{position:absolute;z-index:12;top:0;bottom:0;left:0;width:min(230px,78vw);box-shadow:var(--shadow-lg)}.sheet-main{height:100%;margin-left:46px}.event-details{display:none}.event-list article{grid-template-columns:22px minmax(120px,1fr) minmax(140px,1fr) 28px}.event-list .selector,.event-list .callback{grid-column:2/4}.object-context{grid-template-columns:1fr}.sheet-toolbar>button:not(.primary){display:none}}
/* 26.13: all panes and handler fields remain reachable inside narrow docks. */
.event-studio{container:nova-events/inline-size;display:flex;flex-direction:column}.event-layout{flex:1;min-width:0;min-height:0;display:grid;grid-template-columns:238px minmax(0,1fr) 284px;overflow:auto}.sheet-main{container:nova-event-main/inline-size}.sheet-toolbar,.event-list>header{flex-wrap:wrap}.sheet-toolbar>div,.event-list>header>div,.event-list>header input{min-width:0}.event-copy small,.object-context strong,.object-context small{white-space:normal;overflow:visible;overflow-wrap:anywhere}.event-studio :is(p,label,small,strong){overflow-wrap:anywhere}.sheet-toolbar button{white-space:normal;height:auto;padding-block:5px}.object-context{grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr))}.event-details section>header{flex-wrap:wrap}
@container nova-events (max-width:1180px){.event-layout{grid-template-columns:210px minmax(0,1fr);grid-template-rows:minmax(280px,1fr) auto}.event-details{position:static;width:auto;grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));box-shadow:none}.event-list .priority,.event-list .override{display:grid}}
@container nova-events (max-width:760px){.event-layout{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(350px,1fr) auto}.sheet-browser{position:static;width:auto;max-height:180px;box-shadow:none}.sheet-main{height:auto;margin-left:0}.event-details{display:grid;grid-column:auto}.sheet-toolbar>button:not(.primary){display:block}}
@container nova-event-main (max-width:1000px){.event-list article{grid-template-columns:22px minmax(0,1fr) minmax(0,1fr) 30px}.event-list .enabled{grid-column:1;grid-row:1}.event-list .event-kind{grid-column:2/4;grid-row:1}.event-list .danger{grid-column:4;grid-row:1}.event-copy,.event-list .selector,.event-list .callback,.event-list .priority,.event-list .override{grid-column:2/4;display:grid}.event-list .override{display:flex}.event-list>header input{flex-basis:140px}}
.blueprint-entry{margin:6px;padding:8px;min-width:0;border:1px solid var(--border-subtle);border-radius:8px}.blueprint-entry>strong,.blueprint-entry>small{display:block;white-space:normal;overflow-wrap:anywhere}.blueprint-entry>div{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.blueprint-entry button{min-width:0;min-height:32px;flex:1 1 110px;height:auto;white-space:normal;overflow-wrap:anywhere}
/* Keep scaled headers from consuming the event-list scroll viewport. */
.sheet-main{overflow:auto}.sheet-toolbar,.object-context{flex:0 0 auto}.event-list{flex:1 0 auto;overflow:visible}
@container nova-event-main (max-width:1000px){.event-list>header{position:static}}
</style>
