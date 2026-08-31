<template>
  <section class="automation-studio" data-control-scope="automation-studio">
    <header class="studio-header"><div><span>{{ t('automationStudio') }}</span><h2>{{ t('automationStudioTitle') }}</h2><p>{{ t('automationStudioHint') }}</p></div><span class="sandbox">{{ t('automationSandbox') }}</span></header>
    <div class="studio-grid">
      <section class="authoring card">
        <header><strong>{{ t('automationSource') }}</strong><select v-model="template" @change="applyTemplate"><option v-for="item in templates" :key="item.id" :value="item.id">{{ t(item.label) }}</option></select></header>
        <input v-model="state.origin" maxlength="120" :placeholder="t('automationName')">
        <textarea v-model="state.source" spellcheck="false" autocomplete="off" @input="invalidate"></textarea>
        <div class="permissions"><strong>{{ t('permissionReview') }}</strong><label v-for="permission in permissions" :key="permission"><input v-model="state.granted" type="checkbox" :value="permission" @change="invalidate"><span>{{ permission }}</span></label></div>
        <div class="actions"><button :disabled="state.busy" @click="preview">◇ {{ t('dryRunPreview') }}</button><button class="primary" :disabled="state.busy || !plan || state.phase !== 'previewed'" @click="apply">▶ {{ t('applyTransaction') }}</button><button :disabled="!state.busy" @click="cancel">■ {{ t('cancel') }}</button><button :disabled="!state.lastApplied" @click="rollback">↶ {{ t('rollbackAutomation') }}</button></div>
        <p v-if="state.error" class="error" role="alert">{{ state.error }}</p><p v-else class="status" role="status">{{ t(`automationPhase_${state.phase}` as Parameters<typeof t>[0]) }}<template v-if="state.lastRunAt"> · {{ state.lastRunAt }}</template></p>
      </section>
      <section class="preview card">
        <header><strong>{{ t('transactionDiff') }}</strong><span>{{ state.diff.length }} {{ t('changes') }}</span></header>
        <p v-if="!state.diff.length" class="empty">{{ t('automationPreviewEmpty') }}</p>
        <article v-for="entry in state.diff" :key="entry.id" :class="entry.action"><i>{{ glyph(entry.action) }}</i><div><strong>{{ entry.target }}</strong><small>{{ entry.kind }} · {{ entry.action }}</small></div><code>{{ entry.before }}</code><span>→</span><code>{{ entry.after }}</code></article>
      </section>
      <section class="trace card">
        <header><strong>{{ t('automationTrace') }}</strong><span>{{ state.trace.length }}</span></header>
        <p v-if="!state.trace.length" class="empty">{{ t('automationTraceEmpty') }}</p>
        <article v-for="(entry,index) in state.trace" :key="`${entry.at}:${index}`"><span>{{ entry.phase }}</span><strong>{{ entry.message }}</strong><small>{{ entry.durationMs.toFixed(1) }} ms</small></article>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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
function invalidate(){plan.value=null;if(state.phase==='previewed')state.phase='idle'}
function applyTemplate(){const item=templates.find(candidate=>candidate.id===template.value);if(!item)return;state.source=item.source;const requested=item.source.match(/@nova-editor-automation ([^\n]+)/)?.[1].split(/\s+/)??[];state.granted.splice(0,state.granted.length,...permissions.filter(permission=>requested.includes(permission)));invalidate()}
async function preview(){controller?.abort();controller=new AbortController();try{plan.value=await planEditorAutomation(state.source,state.granted,controller.signal)}catch(error){addEditorLog(error instanceof Error?error.message:String(error),'Editor','error')}finally{controller=null}}
async function apply(){if(!plan.value)return;controller?.abort();controller=new AbortController();try{await applyEditorAutomation(plan.value,controller.signal);plan.value=null}catch(error){addEditorLog(error instanceof Error?error.message:String(error),'Editor','error')}finally{controller=null}}
function cancel(){controller?.abort()}
function rollback(){rollbackLastAutomation()}
function glyph(action:string){return action==='create'?'+':action==='delete'?'×':action==='rename'?'Aa':action==='select'?'◎':'↺'}
</script>

<style scoped>
.automation-studio{position:absolute;inset:0;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:auto;background:var(--bg-base)}.studio-header{min-height:86px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid var(--border-subtle);background:var(--surface-1)}.studio-header>div{min-width:0}.studio-header span{color:var(--accent);font-size:var(--type-caption);font-weight:700}.studio-header h2{margin:2px 0;font-size:var(--type-page)}.studio-header p{margin:0;color:var(--text-muted);font-size:var(--type-dense)}.studio-header .sandbox{max-width:260px;padding:7px 10px;border:1px solid color-mix(in srgb,var(--success) 45%,var(--border-subtle));border-radius:999px;color:var(--success);text-align:center;background:color-mix(in srgb,var(--success) 9%,var(--surface-2))}.studio-grid{padding:12px;display:grid;grid-template-columns:minmax(360px,1.2fr) minmax(320px,1fr);grid-template-areas:'author preview' 'author trace';gap:10px}.card{min-width:0;padding:10px;display:flex;flex-direction:column;gap:8px;border:1px solid var(--border-subtle);border-radius:var(--radius-card);background:var(--surface-1);box-shadow:var(--shadow-sm)}.card>header{min-height:31px;display:flex;align-items:center;justify-content:space-between;gap:8px}.card>header strong{font-size:var(--type-body)}.card>header span{color:var(--text-muted);font-size:var(--type-caption)}.authoring{grid-area:author}.preview{grid-area:preview}.trace{grid-area:trace}.authoring textarea{width:100%;min-height:330px;flex:1;resize:vertical;padding:12px;border:1px solid var(--border-strong);border-radius:10px;color:var(--text-primary);background:var(--bg-canvas);font:var(--type-dense)/1.55 var(--font-mono);tab-size:2}.authoring input,.authoring select{min-width:0}.permissions{padding:8px;display:flex;flex-wrap:wrap;gap:6px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-2)}.permissions>strong{width:100%;font-size:var(--type-dense)}.permissions label{min-height:28px;padding:3px 7px;display:flex;align-items:center;gap:5px;border-radius:999px;color:var(--text-secondary);background:var(--surface-3);font-size:var(--type-caption)}.permissions input{width:15px;height:15px}.actions{display:flex;flex-wrap:wrap;gap:6px}.actions button{min-height:34px;padding:0 11px;border:1px solid var(--border-subtle);border-radius:9px;color:var(--text-secondary);background:var(--surface-2)}.actions button.primary{border-color:var(--accent);color:var(--accent-contrast);background:var(--accent)}.error,.status,.empty{margin:0;font-size:var(--type-dense)}.error{color:var(--danger)}.status,.empty{color:var(--text-muted)}.preview>article{min-width:0;padding:7px;display:grid;grid-template-columns:26px minmax(90px,.8fr) minmax(90px,1fr) 14px minmax(90px,1fr);align-items:center;gap:6px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-2)}.preview>article>i{width:25px;height:25px;display:grid;place-items:center;border-radius:7px;color:var(--accent);background:var(--accent-soft);font-style:normal}.preview>article>div{min-width:0;display:grid}.preview strong,.preview small,.preview code{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.preview small{color:var(--text-muted);font-size:var(--type-caption)}.preview code{padding:4px 6px;border-radius:6px;background:var(--bg-canvas);font:var(--type-caption) var(--font-mono)}.preview .delete i{color:var(--danger);background:var(--danger-soft)}.trace>article{min-width:0;padding:6px 7px;display:grid;grid-template-columns:68px minmax(0,1fr) auto;gap:8px;border-radius:7px;background:var(--surface-2)}.trace>article span{color:var(--accent);font-size:var(--type-caption);text-transform:uppercase}.trace>article strong{min-width:0;overflow:hidden;font-size:var(--type-dense);text-overflow:ellipsis;white-space:nowrap}.trace>article small{color:var(--text-muted);font-size:var(--type-caption)}@media(max-width:980px){.studio-grid{grid-template-columns:1fr;grid-template-areas:'author' 'preview' 'trace'}.authoring textarea{min-height:260px}}@media(max-width:640px){.studio-header{align-items:flex-start}.studio-header .sandbox{display:none}.studio-grid{padding:7px}.preview>article{grid-template-columns:26px minmax(0,1fr) 14px minmax(0,1fr)}.preview>article>div{grid-column:2/-1}}
</style>
