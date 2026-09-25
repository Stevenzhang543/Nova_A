<!-- 对象蓝图编辑器：校验结构与依赖，维护可恢复草稿，协调保存冲突和关闭选择。 -->
<template>
  <Teleport to="body">
    <div class="blueprint-scrim" @keydown.escape.stop.prevent="requestClose">
      <section ref="editorElement" class="blueprint-editor" role="dialog" aria-modal="true" v-modal-focus :aria-label="labels.blueprint">
        <header><div><h3>{{ labels.blueprint }} · {{ document?.name ?? activeRecord?.name }}</h3><small>{{ activeRecord?.path }}<template v-if="dirty"> · {{ labels.pending }}</template></small></div><button :aria-label="labels.close" @click="requestClose">×</button></header>
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
            <details data-blueprint-field="composition" class="blueprint-composition"><summary>{{ labels.composition }}</summary><p>{{ labels.componentDefaults }}</p><div class="component-columns"><fieldset><legend>{{ labels.required }}</legend><label v-for="kind in componentKinds" :key="kind"><input v-model="document.requiredComponents" type="checkbox" :value="kind"><span>{{ kind }}</span></label></fieldset><fieldset><legend>{{ labels.excluded }}</legend><label v-for="kind in componentKinds" :key="kind"><input v-model="document.excludedComponents" type="checkbox" :value="kind"><span>{{ kind }}</span></label></fieldset></div></details>
          </fieldset>
          <details class="blueprint-provenance" open><summary>{{ provenanceCopy.provenance }}</summary>
            <ol><li v-for="source in provenance" :key="source.uuid"><strong>{{ source.name }}</strong><small>{{ source.path }}</small><span>{{ provenanceCopy.prefab }}: {{ source.prefab }}</span><span>{{ provenanceCopy.events }}: {{ source.events }}</span><span>{{ provenanceCopy.components }}: {{ source.components }}</span><span>{{ provenanceCopy.members }}: {{ source.members }}</span></li></ol>
          </details>
          <ul v-if="diagnostics.length" class="blueprint-diagnostics"><li v-for="(issue,index) in diagnostics" :key="index"><b>{{ issue.code }}</b> {{ issue.message }} <button @click="focusIssue(issue.code)">{{ provenanceCopy.focus }}</button></li></ul>
        </div>
        <footer><button :disabled="!canEdit||pending||dirty" @click="derive">{{ labels.derive }}</button><button :disabled="!canEdit||pending||dirty" @click="instantiate">{{ labels.instantiate }}</button><button :disabled="!canEdit||pending||!dirty" class="primary" @click="save">{{ labels.save }}</button><button :disabled="pending" @click="requestClose">{{ labels.close }}</button></footer>
      </section>
    </div>
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
import { vModalFocus } from '../editor/modalFocus'
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

<style scoped>
.blueprint-scrim{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:16px;background:#0009}.blueprint-editor{width:min(880px,100%);max-height:calc(100dvh - 32px);min-width:0;display:flex;flex-direction:column;overflow:hidden;background:var(--surface-1);border:1px solid var(--border-strong);border-radius:12px;color:var(--text-primary);box-shadow:var(--shadow-lg)}header{display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid var(--border-subtle)}header>div{min-width:0;flex:1}h3{margin:0;font-size:16px;overflow-wrap:anywhere}small{display:block;overflow-wrap:anywhere;color:var(--text-muted)}header>button{flex-shrink:0;min-width:32px;min-height:32px}.blueprint-status{margin:0;padding:8px 12px;flex:0 0 auto;overflow-wrap:anywhere}.blueprint-form{min-height:0;overflow:auto;padding:12px;flex:1}fieldset{min-width:0;border:0;padding:0;margin:0}.blueprint-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:12px}.blueprint-fields label{display:grid;gap:5px;min-width:0}input:not([type=checkbox]),select,textarea{min-width:0;width:100%;max-width:100%;min-height:34px;box-sizing:border-box}textarea{resize:vertical}.blueprint-composition{margin-top:14px}.blueprint-composition summary{padding:8px 0;font-weight:650;cursor:pointer}.blueprint-composition p{line-height:1.5;overflow-wrap:anywhere}.component-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.component-columns fieldset{border:1px solid var(--border-subtle);padding:8px}.component-columns label{display:flex;gap:8px;align-items:start;min-height:30px;padding:3px}.component-columns input{flex:0 0 16px;width:16px;height:16px}.component-columns span{min-width:0;overflow-wrap:anywhere}.blueprint-diagnostics{margin:12px 0;padding-left:20px;color:var(--danger)}.blueprint-diagnostics li{margin-top:7px;overflow-wrap:anywhere}footer{display:flex;flex-wrap:wrap;gap:8px;padding:12px;border-top:1px solid var(--border-subtle);flex:0 0 auto}footer button{flex:1 1 150px;min-height:34px;height:auto;white-space:normal;overflow-wrap:anywhere}@media(max-width:600px){.blueprint-scrim{padding:8px}.blueprint-editor{max-height:calc(100dvh - 16px)}.component-columns{grid-template-columns:1fr}}
/* 来源卡片允许长资源路径换行，避免继承字段被窄对话框截断。 */
.blueprint-provenance{padding:12px;border:1px solid var(--border-subtle);border-radius:8px}.blueprint-provenance ol{display:grid;gap:10px;padding-left:24px}.blueprint-provenance li>*{display:block;overflow-wrap:anywhere;margin:4px 0}.blueprint-diagnostics button{min-height:32px}
</style>
