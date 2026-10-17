<!-- 对象蓝图编辑器：校验结构与依赖，维护可恢复草稿，协调保存冲突和关闭选择。 -->
<template>
  <Teleport to="body">
    <UiDialog :title="`${labels.blueprint} · ${document?.name ?? activeRecord?.name ?? ''}`" class="blueprint-dialog" @close="requestClose">
      <section ref="editorElement" class="blueprint-editor">
        <p class="blueprint-path">{{ activeRecord?.path }}<template v-if="dirty"> · {{ labels.pending }}</template></p>
        <StudioDraftConflict v-if="conflict" format="json" :saved-source="savedSource" :draft-source="draftJson" @keep="keepDraft" @discard="discardDraft" />
        <p v-if="status" class="blueprint-status" role="status">{{ status }}</p>
        <p v-if="!canEdit" class="blueprint-status">{{ labels.disabledDuringPlay }}</p>
        <div v-if="document" class="blueprint-form">
          <fieldset :disabled="!canEdit || pending">
            <div class="blueprint-fields">
              <label><span>{{ labels.name }}</span><input v-model="document.name" maxlength="120"></label>
<!-- 基础蓝图候选过滤回调排除当前编辑蓝图。 -->              <label><span>{{ labels.base }}</span><select data-blueprint-field="base" v-model="document.baseBlueprintAsset"><option :value="null">—</option><option v-for="asset in assetsOf('objectBlueprint').filter(asset=>asset.uuid!==assetUuid)" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
              <label><span>{{ labels.prefab }}</span><select data-blueprint-field="prefab" v-model="document.prefabAsset"><option :value="null">{{ labels.inherited }} / —</option><option v-for="asset in assetsOf('prefab')" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
              <label><span>{{ labels.eventSheet }}</span><select data-blueprint-field="events" v-model="document.eventSheetAsset"><option :value="null">{{ labels.inherited }} / —</option><option v-for="asset in assetsOf('eventSheet')" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
              <label><span>{{ labels.tags }}</span><textarea :value="document.tags.join('\n')" rows="3" @input="setMembers('tags',$event)"></textarea></label>
              <label><span>{{ labels.groups }}</span><textarea :value="document.groups.join('\n')" rows="3" @input="setMembers('groups',$event)"></textarea></label>
            </div>
            <details data-ui-motion-disclosure data-blueprint-field="composition" class="blueprint-composition"><summary>{{ labels.composition }}</summary><p>{{ labels.componentDefaults }}</p><div class="component-columns"><fieldset><legend>{{ labels.required }}</legend><label v-for="kind in componentKinds" :key="kind"><input v-model="document.requiredComponents" type="checkbox" :value="kind"><span>{{ kind }}</span></label></fieldset><fieldset><legend>{{ labels.excluded }}</legend><label v-for="kind in componentKinds" :key="kind"><input v-model="document.excludedComponents" type="checkbox" :value="kind"><span>{{ kind }}</span></label></fieldset></div></details>
          </fieldset>
          <details data-ui-motion-disclosure class="blueprint-provenance" open><summary>{{ provenanceCopy.provenance }}</summary>
            <ol><li v-for="source in provenance" :key="source.uuid"><strong>{{ source.name }}</strong><small>{{ source.path }}</small><span>{{ provenanceCopy.prefab }}: {{ source.prefab }}</span><span>{{ provenanceCopy.events }}: {{ source.events }}</span><span>{{ provenanceCopy.components }}: {{ source.components }}</span><span>{{ provenanceCopy.members }}: {{ source.members }}</span></li></ol>
          </details>
          <ul v-if="diagnostics.length" class="blueprint-diagnostics"><li v-for="(issue,index) in diagnostics" :key="index"><b>{{ issue.code }}</b> {{ issue.message }} <button @click="focusIssue(issue.code)">{{ provenanceCopy.focus }}</button></li></ul>
        </div>
        <footer><button :disabled="!canEdit||pending||dirty" @click="derive">{{ labels.derive }}</button><button :disabled="!canEdit||pending||dirty" @click="instantiate">{{ labels.instantiate }}</button><button :disabled="!canEdit||pending||!dirty" class="primary" @click="save">{{ labels.save }}</button><button :disabled="pending" @click="requestClose">{{ labels.close }}</button></footer>
      </section>
    </UiDialog>
  </Teleport>
</template>

<script setup lang="ts">
import { eventProvenanceCopy } from '../editor/eventProvenanceCopy'
import { computed,onBeforeUnmount,ref,shallowRef,watch } from 'vue'
import { assetReference,assetState,readTextAsset,resolveAsset } from '../assets/AssetDatabase'
import type { AssetRecord,AssetType } from '../assets/types'
import { physicsState,pushHistory } from '../store/physics'
import { preferencesState } from '../store/preferences'
import { projectSessionState } from '../projects/projectSession'
import { requestConfirmation } from '../store/dialog'
import { STABLE_COMPONENT_KINDS } from '../world/componentRegistry'
import { readObjectBlueprint,saveObjectBlueprintAsset,validateObjectBlueprintDraft,type ObjectBlueprintDocument } from '../runtime/objectBlueprints'
import { clearStudioDraft,readStudioDraft,registerStudioDraftOwner,retainStudioDraft,type StudioDraftCandidate } from '../editor/studioDraftRetention'
import { validateObjectBlueprintFields } from '../editor/objectBlueprintFields'
import { authorBlueprintInstance } from '../editor/objectBlueprintAuthoring'
import { objectOwnershipCopy } from '../editor/objectOwnershipCopy'
import UiDialog from '../ui/components/UiDialog.vue'
import StudioDraftConflict from './StudioDraftConflict.vue'
const props=defineProps<{assetUuid:string}>(),emit=defineEmits<{close:[];derive:[uuid:string]}>()
const labels=computed(/* 返回 objectOwnershipCopy[preferencesState.locale] 的当前值。 */ ()=>objectOwnershipCopy[preferencesState.locale]),componentKinds=STABLE_COMPONENT_KINDS
const document=ref<ObjectBlueprintDocument|null>(null),activeRecord=shallowRef<AssetRecord|null>(null),baseSource=ref<string|null>(null),cleanJson=ref(''),status=ref(''),pending=ref(false),projectId=projectSessionState.id
const editorElement=ref<HTMLElement|null>(null)
const provenanceCopy=computed(/** 按界面语言显示继承来源标签。 */ ()=>eventProvenanceCopy[preferencesState.locale])
const provenance=computed(/** 从当前草稿逐层列出实际声明来源，遇到循环或缺失即停止并由诊断解释。 */ ()=>{
  void assetState.generation
  const rows:Array<{uuid:string;name:string;path:string;prefab:string;events:string;components:string;members:string}>=[],seen=new Set<string>()
  let current=document.value,record=activeRecord.value
  while(current&&record&&!seen.has(record.uuid)&&seen.size<64){
    seen.add(record.uuid);rows.push({uuid:record.uuid,name:current.name,path:record.path,prefab:resolveAsset(current.prefabAsset)?.path??labels.value.inherited,events:resolveAsset(current.eventSheetAsset)?.path??labels.value.inherited,components:`${current.requiredComponents.join(', ')||'—'} / ${current.excludedComponents.join(', ')||'—'}`,members:`${current.tags.join(', ')||'—'} / ${current.groups.join(', ')||'—'}`})
    record=resolveAsset(current.baseBlueprintAsset);current=readObjectBlueprint(current.baseBlueprintAsset)
  }
  return rows
})
/** 将继承、预制件、事件或组件错误定位到对应编辑字段，不改变草稿。 */ function focusIssue(code:string){
  const field=code.includes('PREFAB')?'prefab':code.includes('EVENT')?'events':code.includes('COMPONENT')||code.includes('EXCLUDED')?'composition':'base'
  const target=editorElement.value?.querySelector<HTMLElement>(`[data-blueprint-field="${field}"]`)
  if(target instanceof HTMLDetailsElement){target.open=true;target.querySelector('summary')?.focus()}else target?.focus()
  target?.scrollIntoView({block:'nearest'})
}
const canEdit=computed(/* 比较 physicsState.playMode 与 'editing'，返回严格相等的判断结果。 */ ()=>physicsState.playMode==='editing'),draftJson=computed(/** 将当前蓝图序列化为草稿 JSON。 */ ()=>JSON.stringify(document.value)),dirty=computed(/** 存在蓝图且序列化结果不同于干净版本时标记未保存。 */ ()=>Boolean(document.value)&&draftJson.value!==cleanJson.value)
const savedSource=computed(/** 依赖资源代次读取当前蓝图源内容。 */ ()=>{void assetState.generation;return readTextAsset(props.assetUuid)}),conflict=computed(/** 草稿已修改且保存源不同于草稿基线时判定外部冲突。 */ ()=>dirty.value&&savedSource.value!==baseSource.value)
const diagnostics=computed(/** 先校验字段和组件种类，字段通过后再校验蓝图与资源引用。 */ ()=>{void assetState.generation;if(!document.value)return[];const raw=validateObjectBlueprintFields(document.value,componentKinds);return raw.length?raw:validateObjectBlueprintDraft(props.assetUuid,document.value,assetState.records)})
/** 只有存在脏草稿和活动资源时才构造恢复候选。 */ function candidate():StudioDraftCandidate|null{return dirty.value&&activeRecord.value?{record:activeRecord.value,projectId,kind:'blueprint',source:draftJson.value,baseSource:baseSource.value}:null}
/** 存在候选时保留蓝图恢复草稿。 */ function retain(){const value=candidate();if(value)retainStudioDraft(value)}
const unregister=registerStudioDraftOwner({read:candidate,discard:/** 尝试放弃草稿，失败将当前状态作为错误抛出。 */ ()=>{if(!discardDraft())throw Error(status.value)}})
/** 解析并检查蓝图格式、版本、标识及必要数组，结构错误抛出缺失源提示。 */ function readDocument(source:string):ObjectBlueprintDocument {
  const value=JSON.parse(source)
  if(value?.format!=='nova-object-blueprint'||value.version!==1||typeof value.uuid!=='string'||!Array.isArray(value.tags)||!Array.isArray(value.groups)||!Array.isArray(value.requiredComponents)||!Array.isArray(value.excludedComponents))throw Error(labels.value.missingSource)
  return value
}
/** 载入蓝图及可恢复草稿，同步资源身份、保存基线和干净版本；异常保留错误状态。 */ function load(){
  try{const record=resolveAsset(props.assetUuid),source=readTextAsset(props.assetUuid);if(!record||record.assetType!=='objectBlueprint'||source===null)throw Error(labels.value.missingSource)
    const saved=readDocument(source),recovery=readStudioDraft(record,projectId,'blueprint',source),next=recovery?readDocument(recovery.entry.source):saved
    activeRecord.value=record;baseSource.value=recovery?recovery.entry.baseSource:source;cleanJson.value=JSON.stringify(saved);document.value=next;status.value=''
  }catch(error){status.value=error instanceof Error?error.message:String(error)}
}
watch(/* 返回 props.assetUuid 的当前值。 */ ()=>props.assetUuid,/** 切换编辑对象前保留旧草稿，再加载新对象。 */ ()=>{retain();load()},{immediate:true});watch(draftJson,retain)
watch(/* 返回 assetState.generation 的当前值。 */ ()=>assetState.generation,/** 只有无脏草稿、资源身份未变且保存源变化时自动重载。 */ ()=>{if(!dirty.value&&resolveAsset(props.assetUuid)===activeRecord.value&&savedSource.value!==baseSource.value)load()})
onBeforeUnmount(/** 卸载时保留草稿并解除保存边界注册。 */ ()=>{retain();unregister()})
/** 按类型筛选资源，并按路径排序。 */ function assetsOf(type:AssetType){return assetState.records.filter(/* 比较 record.assetType 与 type，返回严格相等的判断结果。 */ record=>record.assetType===type).sort(/** 以资源路径的本地比较顺序排序。 */ (a,b)=>a.path.localeCompare(b.path))}
/** 将标签或分组文本按换行保存，空文本对应空数组。 */ function setMembers(field:'tags'|'groups',event:Event){if(!document.value)return;const text=(event.target as HTMLTextAreaElement).value;document.value[field]=text===''?[]:text.split('\n')}
/** 接受当前外部保存源作为基线，同时保留用户草稿。 */ function keepDraft(){if(!activeRecord.value)return;baseSource.value=savedSource.value;status.value='';retain()}
/** 重读并验证保存版本，成功清除恢复草稿并更新基线，失败保留错误。 */ function discardDraft(){try{const source=readTextAsset(props.assetUuid);if(source===null)throw Error(labels.value.missingSource);const next=readDocument(source);if(activeRecord.value)clearStudioDraft(activeRecord.value,projectId);baseSource.value=source;cleanJson.value=JSON.stringify(next);document.value=next;status.value='';return true}catch(error){status.value=error instanceof Error?error.message:String(error);return false}}
/** 校验编辑权限、资源身份、冲突和诊断后保存蓝图；成功更新基线及历史，失败保留恢复草稿。 */ function save():boolean {
  if(!canEdit.value||!document.value||!activeRecord.value||resolveAsset(props.assetUuid)!==activeRecord.value){status.value=labels.value.missingSource;return false}
  if(conflict.value){status.value=labels.value.conflict;return false}
  if(diagnostics.value.some(/** 没有显式严重程度或严重程度为错误的诊断视为阻断项。 */ issue=>!('severity'in issue)||issue.severity==='error')){status.value=labels.value.invalid;retain();return false}
  try{if(!saveObjectBlueprintAsset(activeRecord.value.uuid,document.value))throw Error(labels.value.saveFailed);baseSource.value=readTextAsset(activeRecord.value.uuid);cleanJson.value=draftJson.value;clearStudioDraft(activeRecord.value,projectId);pushHistory('Save Object Blueprint',`blueprint:${activeRecord.value.uuid}`);status.value=labels.value.saved;return true}catch(error){status.value=error instanceof Error?error.message:String(error);retain();return false}
}
/** 避免重复关闭请求，先询问保存，再允许放弃；等待期间源变化则中止关闭以保护编辑。 */ async function requestClose(){
  if(pending.value)return
  if(!dirty.value){emit('close');return}
  pending.value=true;const original=draftJson.value,saved=savedSource.value
  try{const yes=await requestConfirmation({title:labels.value.confirmClose,message:labels.value.saveQuestion,confirmLabel:labels.value.save,cancelLabel:labels.value.otherChoices,destructive:false});if(original!==draftJson.value||saved!==savedSource.value){status.value=labels.value.sourceChanged;return}if(yes){if(save())emit('close');return}
    const discard=await requestConfirmation({title:labels.value.confirmClose,message:labels.value.discardQuestion,confirmLabel:labels.value.discard,cancelLabel:labels.value.cancel,destructive:true});if(original!==draftJson.value||saved!==savedSource.value){status.value=labels.value.sourceChanged;return}if(discard&&discardDraft())emit('close')
  }finally{pending.value=false}
}
/** 要求蓝图先保存，再创建实例并显示成功或异常。 */ function instantiate(){if(dirty.value){status.value=labels.value.saveFirst;return}try{authorBlueprintInstance(props.assetUuid);status.value=labels.value.instanceCreated}catch(error){status.value=error instanceof Error?error.message:labels.value.instantiateFailed}}
/** 草稿无修改时通知父组件派生蓝图，否则要求先保存。 */ function derive(){if(dirty.value){status.value=labels.value.saveFirst;return}emit('derive',props.assetUuid)}
defineExpose({requestClose,save})
</script>

<style scoped>.blueprint-dialog :deep(.ui-dialog){width:min(100ch,calc(100vw - var(--ui-space-xl)))}.blueprint-editor{min-width:0;display:grid;gap:var(--ui-space-sm)}.blueprint-path,.blueprint-status{margin:0;color:var(--text-muted);overflow-wrap:anywhere}.blueprint-form{min-width:0;display:grid;gap:var(--ui-space-sm)}fieldset{min-width:0;border:0;padding:0;margin:0}.blueprint-fields{display:grid;gap:var(--ui-space-sm)}.blueprint-fields label{display:grid;grid-template-columns:var(--ui-label-width) minmax(0,1fr);gap:var(--ui-space-sm);align-items:start}.blueprint-composition{border-top:1px solid var(--border-subtle);padding-top:var(--ui-space-sm)}.component-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--ui-space-lg)}.component-columns fieldset{border:1px solid var(--border-subtle);padding:var(--ui-space-sm)}.component-columns label{display:flex;gap:var(--ui-control-gap);align-items:center;min-height:var(--ui-tree-row-height)}.component-columns span{min-width:0;overflow-wrap:anywhere}.blueprint-diagnostics{color:var(--danger);padding-left:var(--ui-space-lg)}.blueprint-diagnostics li{margin-block:var(--ui-space-xs);overflow-wrap:anywhere}footer{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:var(--ui-space-xs);padding-top:var(--ui-space-sm);border-top:1px solid var(--border-subtle)}.blueprint-provenance{border-top:1px solid var(--border-subtle);padding-top:var(--ui-space-sm)}.blueprint-provenance li>*{display:block;overflow-wrap:anywhere;margin-block:var(--ui-space-xs)}.blueprint-provenance small{color:var(--text-muted)}@media(max-width:600px){.component-columns,.blueprint-fields label{grid-template-columns:minmax(0,1fr)}}</style>
