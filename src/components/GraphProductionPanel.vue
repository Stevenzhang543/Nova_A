<template>
  <section class="production-panel">
    <nav class="production-tabs" role="tablist" :aria-label="t('graphProductionTools')">
      <button v-for="item in tabs" :key="item.id" :class="{ active: tab === item.id }" @click="tab = item.id">{{ t(item.label) }}</button>
    </nav>

    <div v-if="tab === 'structure'" class="production-content">
      <header><strong>{{ t('routines') }}</strong><span>{{ graph.routines.length }}</span></header>
      <div class="action-grid three"><button @click="addRoutine('function')">＋ {{ t('graphFunction') }}</button><button @click="addRoutine('macro')">＋ {{ t('graphMacro') }}</button><button @click="addRoutine('subgraph')">＋ {{ t('graphSubgraph') }}</button></div>
      <article v-for="routine in graph.routines" :key="routine.uuid" class="production-card" :class="{ active: scopeUuid === routine.uuid }">
        <div class="card-title"><button class="name" @click="emit('scope', routine.uuid)">{{ routine.name }}</button><small>{{ routine.kind }}</small><button class="danger" :title="t('remove')" @click="removeRoutine(routine)">×</button></div>
        <textarea v-model="routine.description" :placeholder="t('description')" maxlength="512" rows="2" @change="changed"></textarea>
        <div class="checks"><label><input v-model="routine.pure" type="checkbox" @change="signaturesChanged">{{ t('pureFunction') }}</label><label><input v-model="routine.inline" type="checkbox" @change="changed">{{ t('inlineMacro') }}</label></div>
        <select v-model="routine.interfaceUuid" @change="changed"><option :value="null">{{ t('noInterface') }}</option><option v-for="contract in graph.interfaces" :key="contract.uuid" :value="contract.uuid">{{ t('implements') }} {{ contract.name }}</option></select>
        <template v-if="scopeUuid === routine.uuid">
          <div class="subhead"><strong>{{ t('parametersAndLocals') }}</strong></div>
          <div class="action-grid three"><button @click="addParameter(routine,'input')">＋ {{ t('input') }}</button><button @click="addParameter(routine,'output')">＋ {{ t('output') }}</button><button @click="addLocal(routine)">＋ {{ t('localVariable') }}</button></div>
          <div v-for="parameter in [...routine.inputs,...routine.outputs]" :key="parameter.uuid" class="symbol-row"><span>{{ routine.inputs.includes(parameter) ? '→' : '←' }}</span><input v-model="parameter.name" maxlength="80" @change="signaturesChanged"><select v-model="parameter.valueType" @change="parameterTypeChanged(parameter)"><option v-for="type in valueTypes" :key="type">{{ type }}</option></select><button class="danger" @click="removeParameter(routine,parameter.uuid)">×</button></div>
          <div v-for="local in routine.locals" :key="local.uuid" class="symbol-row"><span>◆</span><input v-model="local.name" maxlength="80" @change="changed"><select v-model="local.valueType" @change="localTypeChanged(local)"><option v-for="type in valueTypes" :key="type">{{ type }}</option></select><button class="danger" @click="removeLocal(routine,local.uuid)">×</button></div>
        </template>
      </article>
      <p v-if="!graph.routines.length" class="hint">{{ t('noGraphRoutines') }}</p>

      <header><strong>{{ t('customEvents') }}</strong><button @click="addEvent">＋</button></header>
      <article v-for="event in graph.customEvents" :key="event.uuid" class="production-card"><div class="symbol-row"><span>⚡</span><input v-model="event.name" maxlength="80" @change="signaturesChanged"><small>{{ event.parameters.length }} {{ t('parameters') }}</small><button @click="addEventParameter(event)">＋</button><button class="danger" @click="removeEvent(event.uuid)">×</button></div><div v-for="parameter in event.parameters" :key="parameter.uuid" class="symbol-row"><span>→</span><input v-model="parameter.name" maxlength="80" @change="signaturesChanged"><select v-model="parameter.valueType" @change="parameterTypeChanged(parameter)"><option v-for="type in valueTypes" :key="type">{{ type }}</option></select><button class="danger" @click="removeEventParameter(event,parameter.uuid)">×</button></div></article>

      <header><strong>{{ t('graphInterfaces') }}</strong><button @click="addInterface">＋</button></header>
      <article v-for="contract in graph.interfaces" :key="contract.uuid" class="production-card"><div class="symbol-row"><span>◇</span><input v-model="contract.name" maxlength="80" @change="changed"><small>{{ contract.methods.length }} {{ t('methods') }}</small><button @click="addInterfaceMethod(contract)">＋</button><button class="danger" :title="t('remove')" @click="removeInterface(contract.uuid)">×</button></div><div v-for="method in contract.methods" :key="method.uuid" class="interface-method"><div class="symbol-row"><span>ƒ</span><input v-model="method.name" maxlength="80" @change="changed"><button @click="addInterfaceParameter(method,'input')">＋ {{ t('input') }}</button><button @click="addInterfaceParameter(method,'output')">＋ {{ t('output') }}</button><button class="danger" :title="t('remove')" @click="removeInterfaceMethod(contract,method.uuid)">×</button></div><div v-for="parameter in [...method.inputs,...method.outputs]" :key="parameter.uuid" class="symbol-row interface-parameter"><span>{{ method.inputs.includes(parameter) ? '→' : '←' }}</span><input v-model="parameter.name" maxlength="80" @change="changed"><select v-model="parameter.valueType" @change="parameterTypeChanged(parameter)"><option v-for="type in valueTypes" :key="type">{{ type }}</option></select><button class="danger" :title="t('remove')" @click="removeInterfaceParameter(method,parameter.uuid)">×</button></div></div></article>

      <header><strong>{{ t('graphLibraries') }}</strong><span>{{ graph.libraries.length }}</span></header>
      <select v-model="libraryCandidate"><option value="">{{ t('selectPackageLibrary') }}</option><option v-for="item in availableLibraries" :key="item.manifest.id" :value="item.manifest.id">{{ item.manifest.name }} · {{ item.manifest.visualNodes.length }} {{ t('nodes') }}</option></select>
      <button :disabled="!libraryCandidate" @click="addLibrary">＋ {{ t('addLibrary') }}</button>
      <div v-for="library in graph.libraries" :key="library.uuid" class="symbol-row"><input v-model="library.enabled" type="checkbox" @change="changed"><span class="grow">{{ library.packageId }}</span><small>{{ library.version }}</small><button class="danger" @click="removeLibrary(library.uuid)">×</button></div>
    </div>

    <div v-else-if="tab === 'debug'" class="production-content">
      <header><strong>{{ t('visualDebugger') }}</strong><span :class="graphDebugState.paused ? 'paused' : 'live'">{{ graphDebugState.paused ? t('paused') : t('live') }}</span></header>
      <p class="debug-reason">{{ graphDebugState.reason || t('visualDebuggerIdle') }}</p>
      <div class="action-grid four"><button @click="gameplayRuntime.debugContinue">▶ {{ t('continue') }}</button><button @click="gameplayRuntime.debugStep('into')">↓ {{ t('stepInto') }}</button><button @click="gameplayRuntime.debugStep('over')">↷ {{ t('stepOver') }}</button><button @click="gameplayRuntime.debugStep('out')">↑ {{ t('stepOut') }}</button></div>
      <div class="metric-grid"><span><strong>{{ coverage.covered }}/{{ coverage.total }}</strong>{{ t('coverage') }} {{ Math.round(coverage.rate * 100) }}%</span><span><strong>{{ graphTrace.length }}</strong>{{ t('traceEvents') }}</span><span><strong>{{ graphErrors.length }}</strong>{{ t('nodeErrors') }}</span></div>
      <header><strong>{{ t('watches') }}</strong><button @click="addWatch">＋</button></header>
      <div v-for="(watch,index) in graph.debug.watches" :key="`${watch}:${index}`" class="watch-row"><input :value="watch" @change="updateWatch(index,$event)"><code>{{ graphDebugState.watches[index]?.error || graphDebugState.watches[index]?.value || '—' }}</code><button class="danger" @click="graph.debug.watches.splice(index,1);changed()">×</button></div>
      <header><strong>{{ t('breakpoints') }}</strong><span>{{ graph.debug.breakpoints.length }}</span></header>
      <article v-for="point in graph.debug.breakpoints" :key="point.nodeUuid" class="breakpoint-card"><div><input v-model="point.enabled" type="checkbox" @change="changed"><button @click="focusNode(point.nodeUuid)">{{ nodeName(point.nodeUuid) }}</button><small>#{{ graphDebugState.breakpointHits[point.nodeUuid] || 0 }}</small></div><input v-model="point.condition" :placeholder="t('breakpointCondition')" maxlength="512" @change="changed"><input v-model.number="point.hitCondition" type="number" min="0" :placeholder="t('hitCondition')" @change="changed"><input v-model="point.logMessage" :placeholder="t('logpointMessage')" maxlength="1024" @change="changed"></article>
      <header><strong>{{ t('callStack') }}</strong><span>{{ graphDebugState.callStack.length }}</span></header>
      <button v-for="frame in graphDebugState.callStack" :key="`${frame.scopeUuid}:${frame.nodeUuid}:${frame.depth}`" class="trace-row" @click="focusNode(frame.nodeUuid)"><span>#{{ frame.depth }}</span><strong>{{ nodeName(frame.nodeUuid) }}</strong><small>{{ scopeName(frame.scopeUuid) }}</small></button>
      <header><strong>{{ t('nodeTimings') }}</strong><span>µs</span></header>
      <button v-for="timing in graphTimings" :key="timing.nodeUuid" class="trace-row" @click="focusNode(timing.nodeUuid)"><strong>{{ nodeName(timing.nodeUuid) }}</strong><small>{{ timing.calls }}× · {{ Math.round(timing.lastMicros) }} / max {{ Math.round(timing.maximumMicros) }}</small></button>
      <header><strong>{{ t('nodeErrors') }}</strong><span>{{ graphErrors.length }}</span></header>
      <button v-for="error in graphErrors" :key="`${error.nodeUuid}:${error.message}`" class="error-row" @click="focusNode(error.nodeUuid)"><strong>{{ nodeName(error.nodeUuid) }}</strong><small>{{ error.message }}</small></button>
    </div>

    <div v-else-if="tab === 'refactor'" class="production-content">
      <header><strong>{{ t('graphRefactoring') }}</strong><span>{{ graph.migrations.length }} {{ t('migrations') }}</span></header>
      <select v-model="symbolUuid"><option value="">{{ t('selectSymbol') }}</option><option v-for="symbol in symbols" :key="symbol.uuid" :value="symbol.uuid">{{ symbol.kind }} · {{ symbol.name }}</option></select>
      <div class="inline-action"><input v-model="renameValue" :placeholder="t('newName')" maxlength="80"><button :disabled="!symbolUuid || !renameValue.trim()" @click="renameSymbol">{{ t('rename') }}</button></div>
      <div class="reference-list"><button v-for="reference in references" :key="`${reference.scopeUuid}:${reference.nodeUuid}`" @click="emit('scope', reference.scopeUuid === graph.uuid ? 'main' : reference.scopeUuid)"><strong>{{ reference.kind }}</strong><small>{{ reference.label }}</small></button><p v-if="symbolUuid && !references.length" class="hint">{{ t('noReferences') }}</p></div>
      <header><strong>{{ t('extractFunction') }}</strong><span>{{ selectedNodeUuids.length }} {{ t('selected') }}</span></header>
      <div class="inline-action"><input v-model="extractName" maxlength="80"><button :disabled="scopeUuid !== 'main' || !selectedNodeUuids.length" @click="extractFunction">{{ t('extract') }}</button></div>
      <header><strong>{{ t('replaceNode') }}</strong><span>{{ selectedNodeUuids.length === 1 ? nodeName(selectedNodeUuids[0]) : '—' }}</span></header>
      <div class="inline-action"><input v-model="replacementType" placeholder="api.log_info" maxlength="160"><button :disabled="selectedNodeUuids.length !== 1 || !replacementType" @click="replaceNode">{{ t('replace') }}</button></div>
      <button @click="migrateDeprecated">{{ t('migrateDeprecatedNodes') }}</button>
      <ol class="migration-list"><li v-for="migration in graph.migrations.slice().reverse().slice(0,20)" :key="migration.uuid"><strong>{{ migration.kind }}</strong> {{ migration.from }} → {{ migration.to }}</li></ol>
    </div>

    <div v-else-if="tab === 'merge'" class="production-content">
      <header><strong>{{ t('semanticGraphDiff') }}</strong><span>{{ diff.length }}</span></header>
      <button @click="captureBase">{{ t('captureMergeBase') }}</button>
      <textarea v-model="baseSource" :placeholder="t('mergeBaseJson')" rows="5"></textarea>
      <textarea v-model="theirsSource" :placeholder="t('incomingGraphJson')" rows="5"></textarea>
      <div class="action-grid"><button :disabled="!baseSource" @click="refreshDiff">{{ t('compare') }}</button><button :disabled="!baseSource || !theirsSource" @click="performMerge">{{ t('merge') }}</button></div>
      <p v-if="mergeError" class="merge-error">{{ mergeError }}</p>
      <button v-for="change in diff.slice(0,100)" :key="`${change.identity}:${change.path}`" class="trace-row"><strong>{{ change.kind }}</strong><small>{{ change.path }}</small></button>
      <article v-for="conflict in mergeResult?.conflicts" :key="conflict.id" class="conflict-card"><strong>{{ conflict.path }}</strong><small>{{ t('mergeConflict') }}</small><div><button :class="{ active: conflict.resolution === 'ours' }" @click="resolveConflict(conflict.id,'ours')">{{ t('keepOurs') }}</button><button :class="{ active: conflict.resolution === 'theirs' }" @click="resolveConflict(conflict.id,'theirs')">{{ t('keepTheirs') }}</button></div></article>
      <button v-if="mergeResult" :disabled="mergeResult.conflicts.some(item=>item.resolution==='unresolved')" class="primary" @click="applyMerge">{{ t('applyResolvedMerge') }}</button>
    </div>

    <div v-else class="production-content code-view">
      <header><strong>{{ t('generatedRhai') }}</strong><span>{{ linkedSource.split('\n').length }} {{ t('lines') }}</span></header>
      <p class="hint">{{ t('oneWayCodeGenerationNotice') }}</p>
      <div class="conversion-coverage"><strong>{{ Math.round(conversionCoverage.percent * 100) }}%</strong><span>{{ t('structuralConversionCoverage') }}</span><small>{{ conversionCoverage.native }} {{ t('nativeBlocks') }} · {{ conversionCoverage.escaped }} {{ t('executeRhaiBlocks') }}</small></div>
      <p class="hint">{{ t('executeRhaiSafetyHint') }}</p>
      <article v-for="item in conversionCoverage.escapeBlocks" :key="item.nodeUuid" class="escape-block"><strong>{{ item.title }}</strong><small>{{ item.kind }} · {{ item.scopeUuid.slice(0,8) }}</small><code>{{ item.source || t('moduleScope') }}</code></article>
      <p v-if="linkedScripts.length" class="link-status">↔ {{ linkedScripts.map(asset => asset.name).join(', ') }}</p>
      <button :disabled="!linkedSource" @click="generateRhaiAsset">{{ t('generateNewRhaiAsset') }}</button>
      <pre>{{ linkedSource }}</pre>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { assetState, createTextAsset } from '../assets/AssetDatabase'
import { t } from '../i18n'
import { gameplayRuntime } from '../runtime/GameplayRuntime'
import { packageState } from '../runtime/packages'
import { requestConfirmation } from '../store/dialog'
import { addEditorLog } from '../store/editor'
import { pushHistory } from '../store/physics'
import { graphCoverage, graphDebugState } from '../visual/graphDebugger'
import { createLinkedRhaiSource, createLinkedScriptName, graphConversionCoverage, linkedScriptGraphUuid, linkScriptToGraph, synchronizeLinkedScriptsForGraph } from '../visual/graphCodeSync'
import { addRoutineParameter, applyGraphConflict, createGraphCustomEvent, createGraphInterface, createGraphRoutine, extractGraphFunction, findGraphReferences, mergeGraphs, migrateDeprecatedGraphNodes, renameGraphSymbol, replaceGraphNodeType, semanticGraphDiff, synchronizeGraphSignatures, type GraphMergeResult, type GraphSemanticChange } from '../visual/graphProduction'
import { defaultGraphValue, graphUuid, parseGraphDocument, serializeGraphDocument, type GraphCustomEvent, type GraphInterface, type GraphInterfaceMethod, type GraphParameter, type GraphRoutine, type GraphRoutineKind, type GraphValueType, type GraphVariable, type NovaGraphDocument } from '../visual/graphTypes'

const props = defineProps<{ graph: NovaGraphDocument; scopeUuid: string; selectedNodeUuids: string[]; compiledSource: string }>()
const emit = defineEmits<{ dirty: []; scope: [uuid: string]; replaceGraph: [graph: NovaGraphDocument] }>()
const tabs = [{id:'structure',label:'graphStructure'},{id:'debug',label:'debug'},{id:'refactor',label:'refactor'},{id:'merge',label:'diffAndMerge'},{id:'code',label:'generatedRhai'}] as const
const tab = ref<(typeof tabs)[number]['id']>('structure'), libraryCandidate = ref(''), symbolUuid = ref(''), renameValue = ref(''), extractName = ref('extracted_function'), replacementType = ref(''), baseSource = ref(''), theirsSource = ref(''), mergeError = ref(''), diff = ref<GraphSemanticChange[]>([]), mergeResult = shallowRef<GraphMergeResult | null>(null)
const valueTypes: GraphValueType[] = ['Boolean','Number','String','Vec2','Entity','Resource','Data']
const availableLibraries = computed(() => packageState.installed.filter(item => item.enabled && item.project && item.manifest.visualNodes.length && !props.graph.libraries.some(library => library.packageId === item.manifest.id)))
const allNodes = computed(() => [props.graph.nodes,...props.graph.routines.map(item=>item.nodes)].flat())
const graphTrace = computed(() => graphDebugState.trace.filter(item => item.graphUuid === props.graph.uuid))
const graphErrors = computed(() => graphDebugState.errors.filter(item => item.graphUuid === props.graph.uuid))
const linkedSource = computed(() => createLinkedRhaiSource(props.graph))
const linkedScripts = computed(() => {
  void assetState.generation
  return assetState.records.filter(asset => asset.assetType === 'script' && linkedScriptGraphUuid(asset.uuid) === props.graph.uuid)
})
const graphTimings = computed(() => Object.values(graphDebugState.timings).filter(item => allNodes.value.some(node=>node.uuid===item.nodeUuid)).sort((a,b)=>b.totalMicros-a.totalMicros))
const coverage = computed(() => graphCoverage(props.graph))
const conversionCoverage = computed(() => graphConversionCoverage(props.graph))
const symbols = computed(() => [
  ...props.graph.variables.map(item=>({uuid:item.uuid,name:item.name,kind:'variable'})),
  ...props.graph.routines.map(item=>({uuid:item.uuid,name:item.name,kind:item.kind})),
  ...props.graph.routines.flatMap(routine=>routine.locals.map(item=>({uuid:item.uuid,name:`${routine.name}.${item.name}`,kind:'local'}))),
  ...props.graph.customEvents.map(item=>({uuid:item.uuid,name:item.name,kind:'event'})),
  ...props.graph.interfaces.map(item=>({uuid:item.uuid,name:item.name,kind:'interface'}))
])
const references = computed(() => symbolUuid.value ? findGraphReferences(props.graph,symbolUuid.value) : [])

function changed(){emit('dirty')}
function signaturesChanged(){synchronizeGraphSignatures(props.graph);changed()}
function addRoutine(kind:GraphRoutineKind){const routine=createGraphRoutine(kind,`${kind}_${props.graph.routines.length+1}`);props.graph.routines.push(routine);emit('scope',routine.uuid);changed()}
async function removeRoutine(routine:GraphRoutine){if(!await requestConfirmation({title:t('removeRoutine'),message:t('removeRoutineConfirm',{name:routine.name}),confirmLabel:t('remove'),cancelLabel:t('cancel'),destructive:true}))return;props.graph.routines=props.graph.routines.filter(item=>item.uuid!==routine.uuid);for(const scope of [props.graph,...props.graph.routines]){const removed=new Set(scope.nodes.filter(node=>node.type===`routine.call.${routine.uuid}`).map(node=>node.uuid));scope.nodes=scope.nodes.filter(node=>!removed.has(node.uuid));scope.edges=scope.edges.filter(edge=>!removed.has(edge.from.nodeUuid)&&!removed.has(edge.to.nodeUuid))}emit('scope','main');changed()}
function addParameter(routine:GraphRoutine,direction:'input'|'output'){addRoutineParameter(routine,direction,`${direction}_${routine[direction==='input'?'inputs':'outputs'].length+1}`,'Number');signaturesChanged()}
function removeParameter(routine:GraphRoutine,uuid:string){routine.inputs=routine.inputs.filter(item=>item.uuid!==uuid);routine.outputs=routine.outputs.filter(item=>item.uuid!==uuid);signaturesChanged()}
function parameterTypeChanged(parameter:GraphParameter){parameter.defaultValue=defaultGraphValue(parameter.valueType);signaturesChanged()}
function addLocal(routine:GraphRoutine){routine.locals.push({uuid:graphUuid(),name:`local_${routine.locals.length+1}`,valueType:'Number',defaultValue:0,exposed:false,serialized:false,group:'Locals',tooltip:'',minimum:null,maximum:null,step:.01,resourceType:null});signaturesChanged()}
function removeLocal(routine:GraphRoutine,uuid:string){routine.locals=routine.locals.filter(item=>item.uuid!==uuid);const removed=new Set(routine.nodes.filter(node=>node.config.localUuid===uuid).map(node=>node.uuid));routine.nodes=routine.nodes.filter(node=>!removed.has(node.uuid));routine.edges=routine.edges.filter(edge=>!removed.has(edge.from.nodeUuid)&&!removed.has(edge.to.nodeUuid));changed()}
function localTypeChanged(local:GraphVariable){local.defaultValue=defaultGraphValue(local.valueType);for(const routine of props.graph.routines)for(const node of routine.nodes.filter(item=>item.config.localUuid===local.uuid))for(const pin of node.pins.filter(item=>item.kind==='data')){pin.valueType=local.valueType;pin.defaultValue=local.defaultValue}changed()}
function addEvent(){props.graph.customEvents.push(createGraphCustomEvent(`custom_event_${props.graph.customEvents.length+1}`));signaturesChanged()}
function addEventParameter(event:GraphCustomEvent){event.parameters.push({uuid:graphUuid(),name:`value_${event.parameters.length+1}`,valueType:'Data',defaultValue:null,tooltip:''});signaturesChanged()}
function removeEventParameter(event:GraphCustomEvent,uuid:string){event.parameters=event.parameters.filter(item=>item.uuid!==uuid);signaturesChanged()}
function removeEvent(uuid:string){props.graph.customEvents=props.graph.customEvents.filter(item=>item.uuid!==uuid);for(const scope of [props.graph,...props.graph.routines]){const removed=new Set(scope.nodes.filter(node=>node.type.endsWith(uuid)).map(node=>node.uuid));scope.nodes=scope.nodes.filter(node=>!removed.has(node.uuid));scope.edges=scope.edges.filter(edge=>!removed.has(edge.from.nodeUuid)&&!removed.has(edge.to.nodeUuid))}changed()}
function addInterface(){props.graph.interfaces.push(createGraphInterface(`interface_${props.graph.interfaces.length+1}`));changed()}
function addInterfaceMethod(contract:GraphInterface){contract.methods.push({uuid:graphUuid(),name:`method_${contract.methods.length+1}`,inputs:[],outputs:[]});changed()}
function addInterfaceParameter(method:GraphInterfaceMethod,direction:'input'|'output'){const target=method[direction==='input'?'inputs':'outputs'];target.push({uuid:graphUuid(),name:`${direction}_${target.length+1}`,valueType:'Data',defaultValue:null,tooltip:''});changed()}
function removeInterfaceMethod(contract:GraphInterface,uuid:string){contract.methods=contract.methods.filter(item=>item.uuid!==uuid);changed()}
function removeInterfaceParameter(method:GraphInterfaceMethod,uuid:string){method.inputs=method.inputs.filter(item=>item.uuid!==uuid);method.outputs=method.outputs.filter(item=>item.uuid!==uuid);changed()}
function removeInterface(uuid:string){props.graph.interfaces=props.graph.interfaces.filter(item=>item.uuid!==uuid);for(const routine of props.graph.routines)if(routine.interfaceUuid===uuid)routine.interfaceUuid=null;changed()}
function addLibrary(){const item=availableLibraries.value.find(candidate=>candidate.manifest.id===libraryCandidate.value);if(!item)return;props.graph.libraries.push({uuid:graphUuid(),packageId:item.manifest.id,libraryId:'visual-nodes',version:item.manifest.version,enabled:true});libraryCandidate.value='';changed()}
function removeLibrary(uuid:string){props.graph.libraries=props.graph.libraries.filter(item=>item.uuid!==uuid);changed()}
function addWatch(){if(props.graph.debug.watches.length>=128)return;props.graph.debug.watches.push('time.frame');changed()}
function updateWatch(index:number,event:Event){props.graph.debug.watches[index]=(event.target as HTMLInputElement).value.slice(0,512);changed()}
function nodeName(uuid:string){return allNodes.value.find(item=>item.uuid===uuid)?.title??uuid.slice(0,8)}
function scopeName(uuid:string){return uuid===props.graph.uuid?t('mainGraph'):props.graph.routines.find(item=>item.uuid===uuid)?.name??uuid.slice(0,8)}
function focusNode(uuid:string){const routine=props.graph.routines.find(item=>item.nodes.some(node=>node.uuid===uuid));emit('scope',routine?.uuid??'main')}
function renameSymbol(){try{renameGraphSymbol(props.graph,symbolUuid.value,renameValue.value);synchronizeGraphSignatures(props.graph);renameValue.value='';changed()}catch(error){addEditorLog(error instanceof Error?error.message:String(error),'Script','error')}}
function extractFunction(){try{const routine=extractGraphFunction(props.graph,new Set(props.selectedNodeUuids),extractName.value);emit('scope',routine.uuid);changed()}catch(error){addEditorLog(error instanceof Error?error.message:String(error),'Script','error')}}
function replaceNode(){try{replaceGraphNodeType(props.graph,props.selectedNodeUuids[0],replacementType.value);changed()}catch(error){addEditorLog(error instanceof Error?error.message:String(error),'Script','error')}}
function migrateDeprecated(){const count=migrateDeprecatedGraphNodes(props.graph);addEditorLog(t('nodesMigrated',{count}),'Script');if(count)changed()}
function captureBase(){baseSource.value=serializeGraphDocument(props.graph);diff.value=[];mergeResult.value=null;mergeError.value=''}
function refreshDiff(){try{diff.value=semanticGraphDiff(parseGraphDocument(baseSource.value),props.graph);mergeError.value=''}catch(error){mergeError.value=error instanceof Error?error.message:String(error)}}
function performMerge(){try{mergeResult.value=mergeGraphs(baseSource.value,serializeGraphDocument(props.graph),theirsSource.value);diff.value=mergeResult.value.changes;mergeError.value=''}catch(error){mergeResult.value=null;mergeError.value=error instanceof Error?error.message:String(error)}}
function resolveConflict(id:string,resolution:'ours'|'theirs'){if(mergeResult.value)mergeResult.value=applyGraphConflict(mergeResult.value,id,resolution)}
function applyMerge(){if(!mergeResult.value||mergeResult.value.conflicts.some(item=>item.resolution==='unresolved'))return;emit('replaceGraph',mergeResult.value.graph);mergeResult.value=null}
function generateRhaiAsset(){
  if(!linkedSource.value)return
  const existing=linkedScripts.value[0]
  if(existing){
    synchronizeLinkedScriptsForGraph(props.graph)
    pushHistory('Synchronize linked Rhai from visual graph')
    addEditorLog(t('generatedRhaiAsset',{name:existing.name}),'Script','info',existing.uuid)
    return
  }
  const asset=createTextAsset(createLinkedScriptName(props.graph),'script',linkedSource.value,'Assets/Scripts/Generated')
  linkScriptToGraph(asset.uuid,props.graph)
  pushHistory('Create linked Rhai for visual graph')
  addEditorLog(t('generatedRhaiAsset',{name:asset.name}),'Script','info',asset.uuid)
}
</script>

<style scoped>
.production-panel{container:production-panel/inline-size;min-width:0;flex:0 0 auto;overflow:visible;border-bottom:1px solid var(--border-subtle)}
.production-panel,.production-panel *{box-sizing:border-box}
.production-tabs{position:sticky;top:0;z-index:3;padding:7px;display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:5px;border-bottom:1px solid var(--border-subtle);background:var(--surface-1)}
.production-tabs button{min-width:0;min-height:36px;height:auto;padding:5px 7px;overflow:hidden;border:1px solid transparent;border-radius:8px;color:var(--text-muted);background:transparent;font-size:var(--type-dense);line-height:1.3;overflow-wrap:anywhere}
.production-tabs button.active{border-color:var(--accent);color:var(--accent);background:var(--accent-soft)}
.production-content{min-width:0;padding:10px;display:grid;gap:10px}
.production-content>header,.subhead{min-width:0;min-height:30px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 10px}
.production-content>header strong,.subhead strong{min-width:0;font-size:11px;line-height:1.4;overflow-wrap:anywhere}.production-content>header span{color:var(--text-muted);font-size:var(--type-caption)}
.production-content button,.production-content input,.production-content select,.production-content textarea{max-width:100%;min-width:0;font:inherit}
.production-content>button,.action-grid button,.inline-action button,.symbol-row button,.conflict-card button{min-height:36px;padding:5px 8px;overflow:hidden;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-secondary);background:var(--surface-3);font-size:var(--type-dense);line-height:1.3;overflow-wrap:anywhere}
.production-content input,.production-content select,.production-content textarea{width:100%;font-size:var(--type-dense)}.production-content input,.production-content select{min-height:36px;text-align:center}.production-content select{text-align-last:center}.production-content textarea{min-height:64px;padding:7px;resize:vertical;line-height:1.5;text-align:left}
.action-grid{min-width:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(106px,1fr));gap:6px}.action-grid.three,.action-grid.four{grid-template-columns:repeat(auto-fit,minmax(88px,1fr))}
.production-card,.breakpoint-card,.conflict-card{min-width:0;padding:9px;display:grid;gap:7px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.production-card.active{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent-soft)}
.card-title,.checks,.breakpoint-card>div,.conflict-card>div{min-width:0;display:flex;flex-wrap:wrap;align-items:center;gap:6px}.card-title .name{min-width:96px;overflow:hidden;flex:1 1 120px;border:0;text-align:left;color:var(--text-primary);background:transparent;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.card-title small,.conflict-card small{min-width:0;color:var(--text-muted);font-size:var(--type-caption);overflow-wrap:anywhere}
.danger{width:32px;min-width:32px!important;flex:0 0 32px;border:0!important;color:var(--danger)!important;background:transparent!important}.checks label{min-width:0;display:flex;flex:1 1 120px;align-items:center;gap:6px;color:var(--text-muted);font-size:var(--type-caption);line-height:1.4;overflow-wrap:anywhere}.checks input[type=checkbox]{width:16px;height:16px;flex:0 0 auto}
.symbol-row{min-width:0;min-height:36px;display:flex;flex-wrap:wrap;align-items:center;gap:6px}.symbol-row>span:first-child{flex:0 0 auto;color:var(--accent);font-size:var(--type-caption)}.symbol-row input:not([type=checkbox]){min-width:96px;flex:1 1 120px}.symbol-row input[type=checkbox]{width:16px;height:16px;flex:0 0 auto}.symbol-row select{width:auto;min-width:86px;flex:0 1 106px}.symbol-row small{min-width:0;max-width:100%;color:var(--text-muted);font-size:var(--type-caption);line-height:1.35;overflow-wrap:anywhere}.grow{min-width:0;overflow:hidden;flex:1 1 100px;text-overflow:ellipsis;white-space:nowrap}
.interface-method{min-width:0;padding:7px;display:grid;gap:6px;border-radius:8px;background:var(--surface-3)}.interface-method .symbol-row button:not(.danger){flex:1 1 88px}.interface-parameter{padding-left:10px}
.hint,.debug-reason{min-width:0;margin:0;color:var(--text-muted);font-size:var(--type-caption);line-height:1.5;overflow-wrap:anywhere}.paused,.merge-error{color:var(--danger)!important}.live{color:var(--success)!important}
.metric-grid{min-width:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(82px,1fr));gap:6px}.metric-grid span{min-width:0;padding:8px;display:grid;gap:2px;border-radius:8px;color:var(--text-muted);background:var(--surface-3);font-size:var(--type-caption);line-height:1.35;overflow-wrap:anywhere}.metric-grid strong{color:var(--text-primary);font-size:12px}
.watch-row{min-width:0;display:grid;grid-template-columns:minmax(90px,1fr) minmax(70px,1fr) 32px;gap:6px;align-items:center}.watch-row code{min-width:0;overflow:hidden;color:var(--accent);font:var(--type-caption) var(--font-mono);text-overflow:ellipsis;white-space:nowrap}.breakpoint-card>div button{min-width:90px;overflow:hidden;flex:1 1 110px;border:0;text-align:left;background:transparent;text-overflow:ellipsis;white-space:nowrap}.breakpoint-card input[type=checkbox]{width:16px;height:16px;flex:0 0 auto}
.trace-row,.error-row,.reference-list button{width:100%;min-width:0;padding:7px;display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:6px;border:0;border-radius:7px;text-align:left;background:transparent}.trace-row:hover,.error-row:hover,.reference-list button:hover{background:var(--surface-3)}.trace-row strong,.error-row strong,.reference-list strong{min-width:0;font-size:var(--type-caption);overflow-wrap:anywhere}.trace-row small,.error-row small,.reference-list small{min-width:0;overflow:hidden;color:var(--text-muted);font-size:var(--type-caption);line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.error-row{color:var(--danger)}
.inline-action{min-width:0;display:grid;grid-template-columns:minmax(0,1fr);gap:6px}.inline-action button{width:100%}.reference-list{max-width:100%;max-height:150px;overflow:auto}.migration-list{max-width:100%;max-height:150px;margin:0;padding-left:22px;overflow:auto;color:var(--text-muted);font-size:var(--type-caption);line-height:1.5}.conflict-card button.active{border-color:var(--accent);color:var(--accent);background:var(--accent-soft)}
.code-view pre{max-width:100%;max-height:480px;margin:0;padding:9px;overflow:auto;border-radius:8px;color:var(--text-secondary);background:var(--bg-canvas);font:var(--type-caption)/1.5 var(--font-mono);white-space:pre}.primary{color:var(--accent-contrast)!important;background:var(--accent)!important}
.conversion-coverage{min-width:0;padding:10px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:3px 9px;align-items:center;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.conversion-coverage strong{grid-row:1/3;color:var(--accent);font-size:20px}.conversion-coverage span{min-width:0;color:var(--text-primary);font-weight:700;overflow-wrap:anywhere}.conversion-coverage small,.escape-block small{min-width:0;color:var(--text-muted);overflow-wrap:anywhere}.escape-block{min-width:0;padding:9px;display:grid;gap:5px;border-left:3px solid var(--warning);border-radius:8px;background:var(--surface-2)}.escape-block code{min-width:0;overflow:hidden;color:var(--text-muted);font:var(--type-caption) var(--font-mono);text-overflow:ellipsis;white-space:nowrap}.link-status{min-width:0;margin:0;padding:7px 9px;border:1px solid color-mix(in srgb,var(--accent) 35%,var(--border-subtle));border-radius:8px;color:var(--accent);background:var(--accent-soft);font-size:var(--type-caption);line-height:1.45;overflow-wrap:anywhere}
@container production-panel (max-width:300px){.action-grid,.action-grid.three,.action-grid.four,.metric-grid{grid-template-columns:minmax(0,1fr)}.symbol-row select{max-width:none;flex:1 1 100%}.watch-row{grid-template-columns:minmax(0,1fr) 32px}.watch-row code{grid-column:1/-1;grid-row:2}.conversion-coverage{grid-template-columns:minmax(0,1fr)}.conversion-coverage strong{grid-row:auto}.interface-parameter{padding-left:0}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
</style>
