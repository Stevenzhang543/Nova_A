<!-- 对象来源面板：展示蓝图、预制体、属性和事件来源，定位源资源及检查器字段。 -->
<template>
  <details class="object-ownership" @toggle="expanded=($event.target as HTMLDetailsElement).open" @change.stop>
    <summary>{{ labels.title }}</summary>
    <div v-if="expanded" class="ownership-body">
      <p class="ownership-mode">{{ view.runtime.active ? labels[view.runtime.authoredOrigin ?? 'scene'] : labels.inactive }}<template v-if="view.runtime.generation !== null"> · {{ labels.generation }} {{ view.runtime.generation }}</template></p>
      <p v-if="view.runtime.active">{{ labels.runtimeHint }}</p>
      <label class="ownership-search"><span>{{ labels.search }}</span><input v-model="query" type="search"></label>
      <div class="ownership-actions"><button @click="revision++">{{ labels.refresh }}</button><button :disabled="!canEdit" @click="$emit('create-blueprint')">{{ labels.newBlueprint }}</button></div>
      <p v-if="error" role="alert">{{ error }}</p>
      <p v-for="issue in view.diagnostics" :key="issue.code+issue.assetUuid+issue.message" class="ownership-error"><b>{{ issue.code }}</b> {{ issue.message }}</p>
      <details open><summary>{{ labels.sources }} · {{ view.sources.length }}</summary><article v-for="source in matchingSources" :key="source.asset.uuid+source.relationship" class="ownership-source"><strong>{{ source.asset.name }}</strong><small>{{ sourceLabel(source.relationship) }} · {{ source.asset.path }}</small><button @click="openSource(source.asset)">{{ source.asset.assetType==='objectBlueprint' ? labels.editBlueprint : labels.openSource }}</button></article></details>
      <details v-if="view.composition.length"><summary>{{ labels.composition }} · {{ view.composition.length }}</summary><p>{{ labels.componentDefaults }}</p><article v-for="(item,index) in view.composition" :key="index" class="ownership-source"><strong>{{ item.kind }} · {{ labels[item.policy] }}</strong><button @click="openSource(item.owner)">{{ item.owner.name }}</button></article></details>
      <details open><summary>{{ labels.properties }} · {{ matchingProperties.length }}</summary><p v-if="!matchingProperties.length">{{ labels.noRows }}</p><article v-for="row in matchingProperties" :key="row.path" class="ownership-property" :data-ownership-path="row.path" :data-origin="row.origin"><header><strong>{{ row.component }} · {{ row.label }}</strong><span class="origin" :class="row.origin">{{ labels[row.origin] }}</span></header><dl><dt>{{ labels.authored }}</dt><dd>{{ valueText(row.authored) }}</dd><template v-if="row.hasBaseline"><dt>{{ labels.baseline }}</dt><dd>{{ valueText(row.baseline) }}</dd></template><template v-if="row.hasRuntime"><dt>{{ labels.runtime }}</dt><dd :class="{changed:row.runtimeChanged}">{{ valueText(row.runtime) }}<small v-if="row.runtimeChanged">{{ labels.changed }}</small></dd></template></dl><div class="ownership-actions"><button v-if="row.owner" @click="openSource(row.owner)">{{ row.owner.name }}</button><button v-if="canLocate(row.path)" @click="locateProperty(row.path)">{{ labels.locateProperty }}</button></div></article></details>
      <details><summary>{{ labels.events }} · {{ matchingEvents.length }}</summary><article v-for="event in matchingEvents" :key="event.sheet?.uuid+event.uuid" class="ownership-source"><strong>{{ event.kind }} · {{ event.selector || labels.allSignals }} → {{ event.callback }}</strong><span>{{ labels[event.origin] }} · {{ event.priority }}</span><div class="ownership-actions"><button v-if="event.sheet" @click="openSource(event.sheet)">{{ labels.openEvents }} · {{ event.sheet.name }}</button><button v-if="event.logic" @click="openSource(event.logic,event.callback)">{{ labels.openLogic }} · {{ event.logic.name }}</button></div></article></details>
      <details v-if="view.runtime.active"><summary>{{ labels.runtime }}</summary><article v-for="behavior in view.runtime.behaviors" :key="behavior.scriptUuid" class="ownership-source"><strong>{{ behavior.primary?labels.primary:labels.behavior }} · {{ behavior.sourcePath }}</strong><dl><dt>{{ labels.authored }}</dt><dd>{{ valueText(behavior.authoredProperties) }}</dd><dt>{{ labels.current }}</dt><dd>{{ valueText(behavior.properties) }}</dd></dl><button @click="openRuntimeAuthor(behavior.scriptUuid)">{{ labels.openSource }}</button></article><h5>{{ labels.subscriptions }} · {{ view.runtime.subscriptions.length }}</h5><article v-for="(item,index) in view.runtime.subscriptions" :key="index" class="ownership-source"><strong>{{ item.signal || labels.allSignals }} → {{ item.callback }}</strong><small>{{ item.source || labels.anySource }} → {{ item.target }}</small><button @click="openRuntimeAuthor(item.sourceSheetAsset || item.scriptUuid,item.sourceSheetAsset ? undefined : item.callback)">{{ labels.openSource }}</button></article><h5>{{ labels.timers }} · {{ view.runtime.timers.length }}</h5><article v-for="(timer,index) in view.runtime.timers" :key="index" class="ownership-source"><strong>{{ timer.name }} · {{ timer.kind }}</strong><span>{{ timer.remaining.toFixed(3) }} s · {{ timer.paused ? 'Ⅱ' : '▶' }}</span></article></details>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { Entity } from '../world/Entity'
import { assetState, resolveAsset } from '../assets/AssetDatabase'
import { preferencesState } from '../store/preferences'
import { physicsState } from '../store/physics'
import { editorState } from '../store/editor'
import { applyEditorWorkspace } from '../editor/workspaces'
import { openScriptAsset } from '../editor/scriptStudioState'
import { openEventSheetAsset, openGraphAsset } from '../visual/graphStudioState'
import { describeObjectProvenance, type OwnershipAsset, type ObjectSource } from '../editor/objectProvenance'
import { objectOwnershipCopy } from '../editor/objectOwnershipCopy'
const props=defineProps<{entity:Entity}>(),emit=defineEmits<{'edit-blueprint':[uuid:string];'create-blueprint':[];'open-callback':[uuid:string,callback:string]}>()
const expanded=ref(false),revision=ref(0),query=ref(''),error=ref(''),labels=computed(/* 返回 objectOwnershipCopy[preferencesState.locale] 的当前值。 */ ()=>objectOwnershipCopy[preferencesState.locale])
const canEdit=computed(/* 比较 physicsState.playMode 与 'editing'，返回严格相等的判断结果。 */ ()=>physicsState.playMode==='editing')
const view=computed(/** 依赖手动修订和资源代次计算对象来源。 */ ()=>{void revision.value;void assetState.generation;return describeObjectProvenance(props.entity)})
const matches=/** 搜索词为空时匹配全部，否则按大小写无关文本匹配。 */ (value:string)=>!query.value.trim()||value.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())
const matchingSources=computed(/** 按资源名称、路径及来源关系筛选源记录。 */ ()=>view.value.sources.filter(/** 判断源记录组合文本是否匹配搜索。 */ item=>matches(`${item.asset.name} ${item.asset.path} ${item.relationship}`)))
const matchingProperties=computed(/** 按属性路径、来源标签及拥有者名称筛选属性。 */ ()=>view.value.properties.filter(/** 判断属性来源组合文本是否匹配搜索。 */ row=>matches(`${row.path} ${labels.value[row.origin]} ${row.owner?.name??''}`)))
const matchingEvents=computed(/** 按事件种类、选择器、回调及事件表名称筛选事件。 */ ()=>view.value.events.filter(/** 判断事件来源组合文本是否匹配搜索。 */ row=>matches(`${row.kind} ${row.selector} ${row.callback} ${row.sheet?.name??''}`)))
const timer=setInterval(/** 面板展开且处于运行模式时增加修订号以刷新来源。 */ ()=>{if(expanded.value&&physicsState.playMode!=='editing')revision.value++},500)
onBeforeUnmount(/** 卸载时清除运行时来源刷新计时器。 */ ()=>clearInterval(timer))
/** 将来源关系映射为本地化来源标签。 */ function sourceLabel(relationship:ObjectSource['relationship']):string {const keys={blueprint:'blueprint','base-blueprint':'base',prefab:'prefab','prefab-layer':'prefabLayer',events:'eventSheet','base-events':'baseEvents',logic:'logicSource'} as const;return labels.value[keys[relationship]]}
/** 未定义显示占位符，字符串保留原文，其他值使用 JSON 显示。 */ function valueText(value:unknown):string {return value===undefined?'—':typeof value==='string'?value:JSON.stringify(value)}
/** 验证源资源身份后打开对应蓝图、事件表、图或脚本；其他资源定位到资源浏览器，逻辑源切换脚本工作区。 */ function openSource(source:OwnershipAsset,callback?:string){
  error.value='';const record=resolveAsset(source.uuid)
  if(!record||record.assetType!==source.assetType){error.value=labels.value.missingSource;return}
  if(record.assetType==='objectBlueprint'){emit('edit-blueprint',record.uuid);return}
  if(callback&&record.assetType==='script'){emit('open-callback',record.uuid,callback);return}
  if(record.assetType==='eventSheet')openEventSheetAsset(record.uuid)
  else if(record.assetType==='visualScript')openGraphAsset(record.uuid)
  else if(record.assetType==='script')openScriptAsset(record.uuid)
  else {assetState.currentFolder=record.path.slice(0,record.path.lastIndexOf('/'));assetState.selectedGuid=record.uuid;assetState.search='';assetState.typeFilter='all';assetState.favoritesOnly=false;assetState.tagFilter='';assetState.selectedCollectionId='';editorState.bottomPanelTab='assets';editorState.bottomPanelVisible=true;return}
  applyEditorWorkspace('script')
}
/** 根据运行时作者标识查找资源，缺失提示错误，否则打开其源内容。 */ function openRuntimeAuthor(uuid:string,callback?:string){const record=resolveAsset(uuid);if(!record){error.value=labels.value.missingSource;return}openSource(record,callback)}
const inspectorPath=/** 将运行时组件路径前缀转换为检查器所用路径。 */ (path:string)=>path.replace(/^Transform2D\./,'Transform.').replace(/^SpriteRenderer2D\./,'Sprite.').replace(/^Camera2D\./,'Camera.').replace(/^Path2D\./,'Path.')
const propertyElement=/** 在检查器的属性标记元素中查找对应路径。 */ (path:string)=>Array.from(document.querySelectorAll<HTMLElement>('.config-panel [data-property-path]')).find(/* 比较 element.dataset.propertyPath 与 inspectorPath(path)，返回严格相等的判断结果。 */ element=>element.dataset.propertyPath===inspectorPath(path))
/** 依赖修订号检测该属性是否已有可定位的检查器元素。 */ function canLocate(path:string){void revision.value;return Boolean(propertyElement(path))}
/** 清除检查器过滤后安排字段定位，以便目标重新出现在 DOM。 */ function locateProperty(path:string){editorState.inspectorCategory='all';editorState.inspectorSearch='';editorState.inspectorModifiedOnly=false;editorState.inspectorPinnedOnly=false;queueMicrotask(/** 寻找目标字段，展开祖先详情、居中滚动并聚焦首个输入控件。 */ ()=>{const element=propertyElement(path);if(!element)return;for(let parent:HTMLElement|null=element;parent;parent=parent.parentElement)if(parent instanceof HTMLDetailsElement)parent.open=true;element.scrollIntoView({block:'center'});element.querySelector<HTMLElement>('input,select,button,textarea')?.focus({preventScroll:true})})}
</script>

<style scoped>
.object-ownership{container-type:inline-size;pointer-events:auto;min-width:0;border:1px solid var(--border-subtle);border-radius:9px;margin:8px 0;background:var(--surface-1);font-size:var(--type-dense)}summary{cursor:pointer;padding:9px;font-weight:650;white-space:normal;overflow-wrap:anywhere}.ownership-body{padding:0 8px 8px;display:flex;flex-direction:column;gap:8px;min-width:0}.ownership-body p{margin:0;line-height:1.5;overflow-wrap:anywhere}.ownership-search{display:grid;gap:5px}.ownership-body input,.ownership-body button{min-width:0;max-width:100%;height:auto;min-height:32px;white-space:normal;overflow-wrap:anywhere}.ownership-actions{display:flex;flex-wrap:wrap;gap:5px}.ownership-actions>*{flex:1 1 115px}.ownership-body details{min-width:0;border-top:1px solid var(--border-subtle)}.ownership-source,.ownership-property{min-width:0;display:grid;gap:6px;padding:9px 0;border-top:1px solid var(--border-subtle)}strong,small,span{overflow-wrap:anywhere}small{display:block;color:var(--text-muted)}.ownership-property header{display:flex;gap:7px;flex-wrap:wrap;align-items:center}.origin{padding:2px 6px;border:1px solid var(--border-subtle);border-radius:5px}.overridden,.changed{color:var(--warning)}.inherited{color:var(--accent)}.unresolved,.ownership-error{color:var(--danger)}dl{display:grid;grid-template-columns:minmax(0,1fr);gap:4px 7px;margin:0}dt{margin-top:6px;color:var(--text-muted);overflow-wrap:anywhere}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;max-height:220px;overflow:auto}.ownership-mode{font-weight:600}h5{margin:8px 0 0}
@container (min-width:420px){dl{grid-template-columns:minmax(110px,.6fr) minmax(0,1fr)}dt{margin-top:0}}
</style>
