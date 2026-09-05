<template>
  <section class="studio-draft-conflict" role="alert">
    <strong>{{ labels.title }}</strong><p>{{ labels.message }}</p>
    <details><summary>{{ labels.review }}</summary><div class="versions"><label>{{ labels.saved }}<pre>{{ previews.saved }}</pre></label><label>{{ labels.draft }}<pre>{{ previews.draft }}</pre></label></div></details>
    <div class="actions"><button @click="$emit('keep')">{{ labels.keep }}</button><button @click="$emit('discard')">{{ labels.discard }}</button></div>
  </section>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import {preferencesState} from '../store/preferences'
const props=defineProps<{savedSource:string|null;draftSource:string;format?:'json'}>()
defineEmits<{keep:[];discard:[]}>()
const copy={
  en:{title:'The saved asset changed while this draft was open',message:'Compare both versions. Keeping your draft enables the next Save to replace the saved content.',review:'Review both versions',saved:'Current saved version',draft:'Your unsaved draft',keep:'Use my draft for the next save',discard:'Discard draft and reload',preview:'Preview limited to the first 20,000 characters.',missing:'The saved asset is unavailable.'},
  de:{title:'Die gespeicherte Datei wurde während der Bearbeitung geändert',message:'Vergleichen Sie beide Versionen. Wenn Sie Ihren Entwurf behalten, ersetzt das nächste Speichern den gespeicherten Inhalt.',review:'Beide Versionen prüfen',saved:'Aktuell gespeicherte Version',draft:'Ihr ungespeicherter Entwurf',keep:'Meinen Entwurf beim nächsten Speichern verwenden',discard:'Entwurf verwerfen und neu laden',preview:'Vorschau auf die ersten 20.000 Zeichen begrenzt.',missing:'Die gespeicherte Datei ist nicht verfügbar.'},
  zh:{title:'编辑草稿期间，已保存的资源发生了变化',message:'请比较两个版本。选择保留草稿后，下次保存会替换当前已保存的内容。',review:'查看两个版本',saved:'当前已保存版本',draft:'尚未保存的草稿',keep:'下次保存使用我的草稿',discard:'放弃草稿并重新加载',preview:'预览仅显示前 20,000 个字符。',missing:'已保存的资源不可用。'},
}
const labels=computed(()=>copy[preferencesState.locale])
function preview(value:string|null){if(value!==null&&props.format==='json'&&value.length<=1000000){try{value=JSON.stringify(JSON.parse(value),null,2)}catch{/* Invalid source remains visible verbatim. */}}return value===null?labels.value.missing:value.length>20000?value.slice(0,20000)+'\n…\n'+labels.value.preview:value}
const previews=computed(()=>({saved:preview(props.savedSource),draft:preview(props.draftSource)}))
</script>
<style scoped>
.studio-draft-conflict{flex:0 0 auto;max-height:45%;overflow:hidden;padding:10px 12px;display:flex;flex-direction:column;gap:7px;border-block:1px solid var(--warning);color:var(--text-primary);background:var(--surface-2);font-size:var(--type-dense)}strong,p,.actions{flex:0 0 auto}details{min-height:0;overflow:auto;flex:0 1 auto}p{margin:0;line-height:1.5;overflow-wrap:anywhere}summary{cursor:pointer;padding-block:5px}.versions{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:10px}.versions label{min-width:0;display:grid;align-content:start;gap:5px}pre{min-width:0;max-height:180px;overflow:auto;margin:0;padding:8px;border:1px solid var(--border-subtle);background:var(--bg-canvas);font:12px/1.5 var(--font-mono);white-space:pre}.actions{display:flex;gap:8px;flex-wrap:wrap}button{min-height:32px;height:auto;padding:6px 9px;white-space:normal;overflow-wrap:anywhere;border:1px solid var(--border-strong);border-radius:7px;color:var(--text-primary);background:var(--surface-3)}
</style>
