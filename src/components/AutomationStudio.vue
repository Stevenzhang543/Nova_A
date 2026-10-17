<!-- 自动化工作室：选择模板及权限，预览和执行可取消计划，支持回滚。 -->
<template>
  <section class="automation-studio" data-control-scope="automation-studio">
    <UiPanelHeader class="studio-header" :title="t('automationStudio')" :description="t('automationSandbox')"><template #actions><UiButton icon="search" :label="t('dryRunPreview')" :disabled="state.busy" @click="preview" /><UiButton icon="play" :label="t('applyTransaction')" :disabled="state.busy || !plan || state.phase !== 'previewed'" @click="apply">{{ t('applyTransaction') }}</UiButton><UiButton icon="stop" :label="t('cancel')" :disabled="!state.busy" @click="cancel" /><UiButton icon="undo" :label="t('rollbackAutomation')" :disabled="!state.lastApplied" @click="rollback" /></template></UiPanelHeader>
    <div class="studio-grid">
      <section class="authoring">
        <header><strong>{{ t('automationSource') }}</strong><select v-model="template" :aria-label="t('automationSource')" @change="applyTemplate"><option v-for="item in templates" :key="item.id" :value="item.id">{{ t(item.label) }}</option></select></header>
        <UiPropertyRow :label="t('automationName')"><input v-model="state.origin" maxlength="120" :placeholder="t('automationName')"></UiPropertyRow>
        <textarea v-model="state.source" :aria-label="t('automationSource')" spellcheck="false" autocomplete="off" @input="invalidate"></textarea>
        <details data-ui-motion-disclosure class="permissions" open><summary>{{ t('permissionReview') }}</summary><label v-for="permission in permissions" :key="permission"><input v-model="state.granted" type="checkbox" :value="permission" @change="invalidate"><span>{{ permission }}</span></label></details>
        <p v-if="state.error" class="error" role="alert">{{ state.error }}</p><p v-else class="status" role="status">{{ t(`automationPhase_${state.phase}` as Parameters<typeof t>[0]) }}<template v-if="state.lastRunAt"> · {{ state.lastRunAt }}</template></p>
      </section>
      <aside class="automation-results"><UiTabs v-model="resultsView" :items="[{ id: 'preview', label: t('transactionDiff') }, { id: 'trace', label: t('automationTrace') }]" />
      <section v-show="resultsView === 'preview'" class="preview">
        <header><strong>{{ t('transactionDiff') }}</strong><span>{{ state.diff.length }} {{ t('changes') }}</span></header>
        <p v-if="!state.diff.length" class="empty">{{ t('automationPreviewEmpty') }}</p>
        <article v-for="entry in state.diff" :key="entry.id" :class="entry.action"><EditorIcon :name="entry.action === 'create' ? 'plus' : entry.action === 'delete' ? 'clear' : 'edit'" /><div><strong>{{ entry.target }}</strong><small>{{ entry.kind }} · {{ entry.action }}</small></div><code>{{ entry.before }}</code><EditorIcon name="forward" /><code>{{ entry.after }}</code></article>
      </section>
      <section v-show="resultsView === 'trace'" class="trace">
        <header><strong>{{ t('automationTrace') }}</strong><span>{{ state.trace.length }}</span></header>
        <p v-if="!state.trace.length" class="empty">{{ t('automationTraceEmpty') }}</p>
        <article v-for="(entry,index) in state.trace" :key="`${entry.at}:${index}`"><span>{{ entry.phase }}</span><strong>{{ entry.message }}</strong><small>{{ entry.durationMs.toFixed(1) }} ms</small></article>
      </section>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import EditorIcon from './EditorIcon.vue'
import { t } from '../i18n'
import { EDITOR_AUTOMATION_PERMISSIONS as permissions, applyEditorAutomation, automationState as state, planEditorAutomation, rollbackLastAutomation, type AutomationPlan } from '../runtime/editorAutomation'
import { addEditorLog } from '../store/editor'

type TranslationKey=Parameters<typeof t>[0]
const templates:ReadonlyArray<{id:string;label:TranslationKey;source:string}>=[
  {id:'selection',label:'automationTemplateSelection',source:`// @nova-editor-automation selection.read selection.write scene.read scene.write\nfn run() {\n  let selected = editor_selected();\n  if selected.len > 0 {\n    let object = selected[0];\n    editor_rename(object, "Automated object");\n    entity_set_position(object, 4.0, 2.0);\n    editor_select(object);\n  }\n}\n`},
  {id:'batch',label:'automationTemplateBatch',source:`// @nova-editor-automation scene.read scene.write\nfn run() {\n  let enemies = query_group("Enemies", 256);\n  for object in enemies {\n    entity_add_tag(object, "Reviewed");\n  }\n}\n`},
  {id:'create',label:'automationTemplateCreate',source:`// @nova-editor-automation scene.write\nfn run() {\n  editor_create_box("Platform", 0.0, 3.0, 8.0, 0.5);\n  editor_create_circle("Marker", 0.0, 1.5, 1.0, 1.0);\n}\n`},
  {id:'asset',label:'automationTemplateAsset',source:`// @nova-editor-automation assets.write\nfn run() {\n  editor_create_text_asset("Assets/Scripts/Generated/Hello.rhai", "script", "fn start() { log_info(\\\"Hello from automation\\\"); }");\n}\n`}
]
const template=ref('selection'),plan=ref<AutomationPlan|null>(null);let controller:AbortController|null=null
const resultsView = ref('preview')
onBeforeUnmount(() => controller?.abort())
/** 清空旧计划，并将已预览状态退回空闲。 */ function invalidate(){plan.value=null;if(state.phase==='previewed')state.phase='idle'}
/** 载入所选模板，筛选其声明的支持权限并使旧计划失效。 */ function applyTemplate(){const item=templates.find(/* 比较 candidate.id 与 template.value，返回严格相等的判断结果。 */ candidate=>candidate.id===template.value);if(!item)return;state.source=item.source;const requested=item.source.match(/@nova-editor-automation ([^\n]+)/)?.[1].split(/\s+/)??[];state.granted.splice(0,state.granted.length,...permissions.filter(/** 仅保留模板声明中请求的权限。 */ permission=>requested.includes(permission)));invalidate()}
/** 中止旧请求后生成可取消预览；失败记录日志，结束释放控制器引用。 */ async function preview(){controller?.abort();controller=new AbortController();try{plan.value=await planEditorAutomation(state.source,state.granted,controller.signal)}catch(error){addEditorLog(error instanceof Error?error.message:String(error),'Editor','error')}finally{controller=null}}
/** 执行已预览计划；成功清空计划，失败记录日志，结束释放控制器引用。 */ async function apply(){if(!plan.value)return;controller?.abort();controller=new AbortController();try{await applyEditorAutomation(plan.value,controller.signal);plan.value=null}catch(error){addEditorLog(error instanceof Error?error.message:String(error),'Editor','error')}finally{controller=null}}
/** 中止当前预览或执行请求。 */ function cancel(){controller?.abort()}
/** 回滚最近一次自动化操作。 */ function rollback(){rollbackLastAutomation()}
</script>

<style scoped>
.automation-studio { position:absolute; inset:0; display:flex; flex-direction:column; min-width:0; min-height:0; background:var(--bg-base); }
.studio-grid { display:grid; grid-template-columns:minmax(0,3fr) minmax(0,2fr); flex:1; min-height:0; }
.authoring { display:flex; flex-direction:column; gap:var(--space-2); min-width:0; min-height:0; padding:var(--space-2); overflow:auto; border-inline-end:var(--ui-border-width) solid var(--border-subtle); }
.authoring > header { display:flex; align-items:center; justify-content:space-between; gap:var(--space-2); }
.authoring textarea { min-height:calc(8 * var(--ui-input-height)); flex:1; resize:none; line-height:var(--line-body); tab-size:2; }
.permissions > label { display:flex; align-items:center; gap:var(--space-2); min-height:var(--ui-control-height); padding-inline:var(--space-2); }
.automation-results { display:flex; flex-direction:column; min-width:0; min-height:0; }
.preview,.trace { padding:var(--space-2); overflow:auto; min-height:0; }
.preview > header,.trace > header { display:flex; justify-content:space-between; gap:var(--space-2); padding-block:var(--space-2); border-bottom:var(--ui-border-width) solid var(--border-subtle); }
.preview > article { display:grid; grid-template-columns:var(--ui-icon-size) minmax(0,1fr); gap:var(--space-2); padding-block:var(--space-2); border-bottom:var(--ui-border-width) solid var(--border-subtle); }
.preview code { grid-column:2; white-space:pre-wrap; overflow-wrap:anywhere; }
.preview small,.trace small,.empty,.status { display:block; color:var(--text-muted); font-size:var(--type-caption); }
.trace > article { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:var(--space-1); padding-block:var(--space-2); border-bottom:var(--ui-border-width) solid var(--border-subtle); }
.trace > article strong { grid-column:1/-1; overflow-wrap:anywhere; }
.error { color:var(--danger); }
@media(max-width:800px) { .studio-grid { grid-template-columns:minmax(0,1fr); overflow:auto; } .authoring,.automation-results { min-height:calc(10 * var(--ui-control-height)); } }
</style>