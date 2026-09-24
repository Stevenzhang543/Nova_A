/** 编辑器自动化入口：定义可调用的编辑操作并组织执行及反馈。 */
import { reactive } from 'vue'
import { WasmScriptRuntime } from '../../nova_core/pkg/nova_core.js'
import { createTextAsset } from '../assets/AssetDatabase'
import type { TextAssetType } from '../assets/types'
import { addEditorLog } from '../store/editor'
import { beginHistoryTransaction, cancelHistoryTransaction, commitHistoryTransaction, deleteEntity, physicsState, selectEntities, undo } from '../store/physics'

export type EditorAutomationPermission = 'selection.read' | 'selection.write' | 'scene.read' | 'scene.write' | 'assets.read' | 'assets.write'
export const EDITOR_AUTOMATION_PERMISSIONS: readonly EditorAutomationPermission[] = Object.freeze(['selection.read','selection.write','scene.read','scene.write','assets.read','assets.write'])
export const MAX_AUTOMATION_COMMANDS = 1_000
export const MAX_AUTOMATION_SOURCE_BYTES = 256 * 1024
export const MAX_AUTOMATION_RUN_MS = 250

export interface AutomationDiffEntry { id: string; kind: 'selection'|'scene'|'asset'; action: 'select'|'rename'|'create'|'update'|'delete'; target: string; before: string; after: string }
export interface AutomationTraceEntry { at: string; phase: 'validate'|'compile'|'execute'|'preview'|'apply'|'rollback'; message: string; durationMs: number }
export interface AutomationPlan { sourceHash: string; requested: EditorAutomationPermission[]; commands: AutomationCommand[]; diff: AutomationDiffEntry[]; logs: Array<{level:string;message:string}>; elapsedMs: number }

type AutomationCommand =
  | { type:'editorSelect';target:string;generation:number }
  | { type:'editorRename';target:string;generation:number;name:string }
  | { type:'editorCreateEntity';shape:'Box'|'Circle'|'Triangle';name:string;x:number;y:number;width:number;height:number }
  | { type:'editorCreateTextAsset';path:string;assetType:string;source:string }
  | { type:'targetSetPosition';target:string;generation:number;x:number;y:number }
  | { type:'targetSetRotation';target:string;generation:number;radians:number }
  | { type:'targetSetScale';target:string;generation:number;x:number;y:number }
  | { type:'targetSetEnabled';target:string;generation:number;enabled:boolean }
  | { type:'targetAddTag'|'targetRemoveTag';target:string;generation:number;tag:string }
  | { type:'targetAddGroup'|'targetRemoveGroup';target:string;generation:number;group:string }
  | { type:'targetDestroy';target:string;generation:number }

const SAFE_CALLS = new Set([
  'run','print','debug','info','warn','error','expect','entity_handle','find_entity_handle','query_tag','query_group','query_component',
  'entity_name_on','entity_enabled_on','entity_position_x_on','entity_position_y_on','editor_automation','editor_selected','editor_selected_count',
  'editor_select','editor_rename','editor_create_box','editor_create_circle','editor_create_triangle','editor_create_text_asset',
  'entity_set_position','entity_set_rotation','entity_set_scale','entity_set_enabled','entity_add_tag','entity_remove_tag','entity_add_group','entity_remove_group','entity_destroy',
  'len','push','pop','to_string','type_of'
])
const COMMAND_TYPES = new Set(['editorSelect','editorRename','editorCreateEntity','editorCreateTextAsset','targetSetPosition','targetSetRotation','targetSetScale','targetSetEnabled','targetAddTag','targetRemoveTag','targetAddGroup','targetRemoveGroup','targetDestroy'])

export const automationState = reactive({
  source: `// @nova-editor-automation selection.read selection.write scene.read scene.write\nfn run() {\n  let selected = editor_selected();\n  if selected.len > 0 {\n    let object = selected[0];\n    editor_rename(object, "Automated object");\n    entity_set_position(object, 4.0, 2.0);\n    editor_select(object);\n  }\n}\n`,
  granted: ['selection.read','selection.write','scene.read','scene.write'] as EditorAutomationPermission[],
  phase: 'idle' as 'idle'|'validating'|'previewed'|'applying'|'applied'|'cancelled'|'failed',
  diff: [] as AutomationDiffEntry[], trace: [] as AutomationTraceEntry[], logs: [] as Array<{level:string;message:string}>,
  error: '', lastRunAt: '', lastApplied: false, origin: 'Project automation', busy: false
})

/** 结构说明（自动提取）：finite；输入 value、label；直接调用 Number、Number.isFinite、Math.abs、Error；返回路径包含 number；包含显式抛错路径。 */ function finite(value: unknown, label: string): number { const number=Number(value);if(!Number.isFinite(number)||Math.abs(number)>1_000_000)throw new Error(`${label} must be finite and within ±1,000,000.`);return number }
/* 调用 String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,maximum) 并返回调用结果。 */ function cleanText(value: unknown, maximum: number): string { return String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,maximum) }
/** 结构说明（自动提取）：hash；输入 source；直接调用 encode、TextEncoder、Math.imul、padStart、value.toString；写入 value；包含循环处理。 */ function hash(source:string):string{let value=0x811c9dc5;for(const byte of new TextEncoder().encode(source))value=Math.imul(value^byte,0x01000193)>>>0;return value.toString(16).padStart(8,'0')}
/** 结构说明（自动提取）：handleGeneration；输入 id；直接调用 encode、TextEncoder、Math.imul；写入 value；返回路径包含 value；包含循环处理。 */ function handleGeneration(id:string):number{let value=2166136261>>>0;for(const byte of new TextEncoder().encode(id))value=(Math.imul(value,16777619)^byte)>>>0;return value}
/** 结构说明（自动提取）：entityFor；输入 target、generation；直接调用 physicsState.world.entities.find、handleGeneration、Error；返回路径包含 entity；包含显式抛错路径。 */ function entityFor(target:string,generation:number){const entity=physicsState.world.entities.find(/* 比较 item.uuid 与 target，返回严格相等的判断结果。 */ item=>item.uuid===target);if(!entity||handleGeneration(target)!==generation)throw new Error(`Automation target ${target||'(empty)'} is stale or missing.`);return entity}
/** 结构说明（自动提取）：trace；输入 phase、message、started；直接调用 automationState.trace.unshift、toISOString、Date、Math.max、performance.now 等。 */ function trace(phase:AutomationTraceEntry['phase'],message:string,started=performance.now()){automationState.trace.unshift({at:new Date().toISOString(),phase,message,durationMs:Math.max(0,performance.now()-started)});automationState.trace.splice(100)}

/** 结构说明（自动提取）：parseAutomationPermissions；输入 source；直接调用 source.match、Set、filter、line.split、Error；返回路径包含 values；包含显式抛错路径。 */ export function parseAutomationPermissions(source:string):EditorAutomationPermission[]{
  const line=source.match(/^\s*\/\/\s*@nova-editor-automation\s+([^\r\n]+)$/im)?.[1]??''
  const values=[...new Set(line.split(/[\s,]+/).filter(/* 调用 EDITOR_AUTOMATION_PERMISSIONS.includes(item as EditorAutomationPermission) 并返回调用结果。 */ (item):item is EditorAutomationPermission=>EDITOR_AUTOMATION_PERMISSIONS.includes(item as EditorAutomationPermission)))]
  if(!line)throw new Error('Add // @nova-editor-automation followed by the permissions this script requests.')
  if(line.split(/[\s,]+/).filter(Boolean).length!==values.length)throw new Error('The automation permission header contains an unknown or duplicate permission.')
  return values
}

/** 结构说明（自动提取）：requiredPermissions；输入 source；直接调用 Set、test、required.add。 */ function requiredPermissions(source:string):EditorAutomationPermission[]{
  const required=new Set<EditorAutomationPermission>()
  if(/\beditor_selected(?:_count)?\s*\(/.test(source))required.add('selection.read')
  if(/\beditor_select\s*\(/.test(source))required.add('selection.write')
  if(/\b(?:find_entity_handle|query_(?:tag|group|component)|entity_(?:name|enabled|position_[xy])_on)\s*\(/.test(source))required.add('scene.read')
  if(/\b(?:editor_rename|editor_create_(?:box|circle|triangle)|entity_(?:set_|add_|remove_|destroy))/.test(source))required.add('scene.write')
  if(/\beditor_create_text_asset\s*\(/.test(source))required.add('assets.write')
  return [...required]
}

/** 结构说明（自动提取）：validateSource；输入 source、granted；直接调用 encode、TextEncoder、Error、MAX_AUTOMATION_SOURCE_BYTES.toLocaleString、test 等；返回路径包含 requested；包含循环处理；包含显式抛错路径。 */ function validateSource(source:string,granted:readonly EditorAutomationPermission[]):EditorAutomationPermission[]{
  if(new TextEncoder().encode(source).byteLength>MAX_AUTOMATION_SOURCE_BYTES)throw new Error(`Automation source exceeds ${MAX_AUTOMATION_SOURCE_BYTES.toLocaleString()} bytes.`)
  if(!/\bfn\s+run\s*\(\s*\)\s*\{/.test(source))throw new Error('Editor automation requires fn run() as its only entry point.')
  const requested=parseAutomationPermissions(source),required=requiredPermissions(source)
  for(const permission of required)if(!requested.includes(permission))throw new Error(`The script uses ${permission} but does not request it in @nova-editor-automation.`)
  for(const permission of requested)if(!granted.includes(permission))throw new Error(`Permission ${permission} is requested but not granted.`)
  const declarations=new Set([...source.matchAll(/\bfn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map(/* 返回 match[1] 的当前值。 */ match=>match[1]))
  for(const match of source.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)){const name=match[1];if(!SAFE_CALLS.has(name)&&!declarations.has(name)&&!['if','for','while','switch'].includes(name))throw new Error(`Automation callable ${name} is outside the reviewed editor sandbox.`)}
  return requested
}

/** 结构说明（自动提取）：scriptContext；无显式参数；直接调用 physicsState.world.entities.filter、primary.components.map、Object.fromEntries、physicsState.world.entities.map、selected.map。 */ function scriptContext(){
  const selected=physicsState.world.entities.filter(/* 调用 physicsState.selectedEntityIds.includes(entity.id) 并返回调用结果。 */ entity=>physicsState.selectedEntityIds.includes(entity.id)),primary=selected[0]??physicsState.world.entities[0]
  return {apiVersion:2,entity:primary?.uuid??'',entityName:primary?.name??'',components:primary?.components.map(/* 返回 component.kind 的当前值。 */ component=>component.kind)??[],entities:Object.fromEntries(physicsState.world.entities.map(/* 返回按声明顺序构造的数组 [entity.name,entity.uuid]。 */ entity=>[entity.name,entity.uuid])),sceneEntities:physicsState.world.entities.map(/** 结构说明（自动提取）：physicsState.world.entities.map 回调；输入 entity；直接调用 entity.components.map；返回表达式求值结果。 */ entity=>({uuid:entity.uuid,name:entity.name,enabled:entity.enabled,tags:[...entity.tags],groups:[...entity.groups],components:entity.components.map(/* 返回 component.kind 的当前值。 */ component=>component.kind),position:[entity.transform.position.x,entity.transform.position.y]})),transform:{position:[primary?.transform.position.x??0,primary?.transform.position.y??0],rotation:primary?.transform.rotation??0,scale:[primary?.transform.scale.x??1,primary?.transform.scale.y??1]},editorAutomation:true,editorSelection:selected.map(/* 返回 entity.uuid 的当前值。 */ entity=>entity.uuid)}
}

/** 结构说明（自动提取）：normalizeAutomationCommands；输入 value；直接调用 Array.isArray、Error、MAX_AUTOMATION_COMMANDS.toLocaleString、commands.map；包含显式抛错路径。 */ export function normalizeAutomationCommands(value:unknown):AutomationCommand[]{
  if(!value||typeof value!=='object'||!Array.isArray((value as {commands?:unknown}).commands))throw new Error('Automation runtime returned an invalid host result.')
  const commands=(value as {commands:unknown[]}).commands
  if(commands.length>MAX_AUTOMATION_COMMANDS)throw new Error(`Automation emitted more than ${MAX_AUTOMATION_COMMANDS.toLocaleString()} commands.`)
  return commands.map(/** 结构说明（自动提取）：commands.map 回调；输入 command、index；直接调用 COMMAND_TYPES.has、String、Error；包含显式抛错路径。 */ (command,index)=>{if(!command||typeof command!=='object'||!COMMAND_TYPES.has(String((command as {type?:unknown}).type)))throw new Error(`Automation command ${index+1} is unsupported.`);return command as AutomationCommand})
}

/** 结构说明（自动提取）：commandDiff；输入 command、index；直接调用 encode、TextEncoder、entityFor、physicsState.selectedEntityIds.includes、String 等。 */ function commandDiff(command:AutomationCommand,index:number):AutomationDiffEntry{
  const id=`${index+1}-${command.type}`
  if(command.type==='editorCreateEntity')return{id,kind:'scene',action:'create',target:command.name,before:'—',after:`${command.shape} @ (${command.x}, ${command.y}), ${command.width} × ${command.height}`}
  if(command.type==='editorCreateTextAsset')return{id,kind:'asset',action:'create',target:command.path,before:'—',after:`${command.assetType} · ${new TextEncoder().encode(command.source).byteLength} bytes`}
  const entity=entityFor(command.target,command.generation)
  if(command.type==='editorSelect')return{id,kind:'selection',action:'select',target:entity.name,before:physicsState.selectedEntityIds.includes(entity.id)?'selected':'not selected',after:'selected'}
  if(command.type==='editorRename')return{id,kind:'scene',action:'rename',target:entity.name,before:entity.name,after:command.name}
  if(command.type==='targetSetPosition')return{id,kind:'scene',action:'update',target:entity.name,before:`${entity.transform.position.x}, ${entity.transform.position.y}`,after:`${command.x}, ${command.y}`}
  if(command.type==='targetSetRotation')return{id,kind:'scene',action:'update',target:entity.name,before:String(entity.transform.rotation),after:String(command.radians)}
  if(command.type==='targetSetScale')return{id,kind:'scene',action:'update',target:entity.name,before:`${entity.transform.scale.x}, ${entity.transform.scale.y}`,after:`${command.x}, ${command.y}`}
  if(command.type==='targetSetEnabled')return{id,kind:'scene',action:'update',target:entity.name,before:String(entity.enabled),after:String(command.enabled)}
  if(command.type==='targetDestroy')return{id,kind:'scene',action:'delete',target:entity.name,before:'present',after:'deleted'}
  const key='tag' in command?command.tag:command.group,collection='tag' in command?entity.tags:entity.groups,adding=command.type==='targetAddTag'||command.type==='targetAddGroup'
  return{id,kind:'scene',action:'update',target:entity.name,before:collection.join(', ')||'—',after:adding?`${collection.join(', ')}${collection.length?', ':''}${key}`:collection.filter(/* 比较 item 与 key，返回严格不等的判断结果。 */ item=>item!==key).join(', ')||'—'}
}

/** 结构说明（自动提取）：planEditorAutomation；输入 source、granted、signal；直接调用 performance.now、automationState.diff.splice、automationState.logs.splice、DOMException、validateSource 等；写入 automationState.busy、automationState.phase、automationState.error、raw 等；返回路径包含 plan；包含显式抛错路径。 */ export async function planEditorAutomation(source=automationState.source,granted=automationState.granted,signal?:AbortSignal):Promise<AutomationPlan>{
  const started=performance.now();automationState.busy=true;automationState.phase='validating';automationState.error='';automationState.diff.splice(0);automationState.logs.splice(0)
  try{
    if(signal?.aborted)throw new DOMException('Automation cancelled before validation.','AbortError')
    const requested=validateSource(source,granted);trace('validate',`${requested.length} requested permission(s)`,started)
    const runtime=new WasmScriptRuntime() as unknown as {compile_cached(id:string,source:string):string;execute_cached_json(id:string,fn:string,context:string):string;remove_cached(id:string):boolean}
    const id=`automation-${hash(source)}`,compileStarted=performance.now();runtime.compile_cached(id,source);trace('compile','Rhai compiled inside the bounded WASM sandbox.',compileStarted)
    const executeStarted=performance.now();let raw=''
    try{raw=runtime.execute_cached_json(id,'run',JSON.stringify(scriptContext()))}finally{runtime.remove_cached(id)}
    const parsed=JSON.parse(raw) as {commands:unknown[];logs?:Array<{level:string;message:string}>},commands=normalizeAutomationCommands(parsed);trace('execute',`${commands.length} command(s) emitted.`,executeStarted)
    if(performance.now()-executeStarted>MAX_AUTOMATION_RUN_MS)throw new Error(`Automation exceeded the ${MAX_AUTOMATION_RUN_MS} ms editor budget.`)
    if(signal?.aborted)throw new DOMException('Automation cancelled before preview.','AbortError')
    const diff=commands.map(commandDiff),logs=(parsed.logs??[]).slice(0,512).map(/** 构造并返回记录 {level:cleanText(log.level,20),message:cleanText(log.message,4096)}，字段按当前实参及捕获状态求值。 */ log=>({level:cleanText(log.level,20),message:cleanText(log.message,4096)}))
    const plan={sourceHash:hash(source),requested,commands,diff,logs,elapsedMs:performance.now()-started};automationState.diff.splice(0,automationState.diff.length,...diff);automationState.logs.splice(0,automationState.logs.length,...logs);automationState.phase='previewed';automationState.lastRunAt=new Date().toISOString();trace('preview',`${diff.length} reversible change(s) prepared.`,started);return plan
  }catch(error){automationState.phase=error instanceof DOMException&&error.name==='AbortError'?'cancelled':'failed';automationState.error=error instanceof Error?error.message:String(error);throw error}finally{automationState.busy=false}
}

/** 结构说明（自动提取）：safeAssetPath；输入 path；直接调用 replace、path.replace、clean.startsWith、clean.includes、test 等；包含显式抛错路径。 */ function safeAssetPath(path:string):{folder:string;name:string}{const clean=path.replace(/\\/g,'/').replace(/^\/+|\/+$/g,'');if(!clean.startsWith('Assets/')||clean.includes('..')||/[\u0000-\u001f:*?"<>|]/.test(clean))throw new Error(`Unsafe automation asset path: ${path}`);const parts=clean.split('/'),name=parts.pop()??'';if(!name)throw new Error('Automation asset path needs a filename.');return{folder:parts.join('/'),name}}
/** 结构说明（自动提取）：applyCommand；输入 command、selection；直接调用 finite、Math.abs、physicsState.world.addCircle、physicsState.world.addTriangle、physicsState.world.addBox 等；写入 entity.name、entity.transform.position、entity.transform.rotation、entity.transform.scale 等。 */ function applyCommand(command:AutomationCommand,selection:Set<number>){
  if(command.type==='editorCreateEntity'){const x=finite(command.x,'X'),y=finite(command.y,'Y'),width=Math.abs(finite(command.width,'Width')),height=Math.abs(finite(command.height,'Height'));const entity=command.shape==='Circle'?physicsState.world.addCircle({x,y},width*.5,height*.5):command.shape==='Triangle'?physicsState.world.addTriangle({x,y},{x:width,y:height}):physicsState.world.addBox({x,y},{x:width,y:height});entity.name=cleanText(command.name,120)||command.shape;return}
  if(command.type==='editorCreateTextAsset'){const path=safeAssetPath(command.path),allowed=new Set<TextAssetType>(['script','visualScript','material','shader','localization','uiTheme','dataTable','dataSchema']),assetType=allowed.has(command.assetType as TextAssetType)?command.assetType as Exclude<TextAssetType,'other'>:'script';createTextAsset(path.name,assetType,command.source.slice(0,64_000),path.folder);return}
  const entity=entityFor(command.target,command.generation)
  if(command.type==='editorSelect'){selection.add(entity.id);return}
  if(command.type==='editorRename'){entity.name=cleanText(command.name,120)||entity.name;return}
  if(command.type==='targetSetPosition'){entity.transform.position={x:finite(command.x,'X'),y:finite(command.y,'Y')};return}
  if(command.type==='targetSetRotation'){entity.transform.rotation=finite(command.radians,'Rotation');return}
  if(command.type==='targetSetScale'){entity.transform.scale={x:finite(command.x,'Scale X'),y:finite(command.y,'Scale Y')};return}
  if(command.type==='targetSetEnabled'){entity.enabled=command.enabled===true;return}
  if(command.type==='targetAddTag'&&!entity.tags.includes(command.tag))entity.tags.push(cleanText(command.tag,80));else if(command.type==='targetRemoveTag')entity.tags=entity.tags.filter(/* 比较 item 与 command.tag，返回严格不等的判断结果。 */ item=>item!==command.tag)
  else if(command.type==='targetAddGroup'&&!entity.groups.includes(command.group))entity.groups.push(cleanText(command.group,80));else if(command.type==='targetRemoveGroup')entity.groups=entity.groups.filter(/* 比较 item 与 command.group，返回严格不等的判断结果。 */ item=>item!==command.group)
  else if(command.type==='targetDestroy')deleteEntity(entity.id)
}

/** 结构说明（自动提取）：applyEditorAutomation；输入 plan、signal；直接调用 hash、Error、performance.now、beginHistoryTransaction、Set 等；写入 automationState.busy、automationState.phase、automationState.error、automationState.lastApplied 等；包含循环处理；包含显式抛错路径。 */ export async function applyEditorAutomation(plan:AutomationPlan,signal?:AbortSignal):Promise<void>{
  if(plan.sourceHash!==hash(automationState.source))throw new Error('Automation source changed after preview; preview it again before applying.')
  const started=performance.now();automationState.busy=true;automationState.phase='applying';automationState.error='';automationState.lastApplied=false
  if(!beginHistoryTransaction(`Automation: ${automationState.origin}`)){automationState.busy=false;automationState.phase='failed';automationState.error='Editor automation requires edit mode and an available history transaction.';throw new Error(automationState.error)}
  try{const selection=new Set<number>();for(const command of plan.commands){if(signal?.aborted)throw new DOMException('Automation cancelled at a safe command boundary.','AbortError');applyCommand(command,selection)}if(selection.size)selectEntities([...selection],'replace');commitHistoryTransaction();automationState.phase='applied';automationState.lastApplied=true;automationState.lastRunAt=new Date().toISOString();trace('apply',`${plan.commands.length} command(s) committed as one undo step.`,started);addEditorLog(`Automation applied ${plan.commands.length} command(s) as one reversible transaction.`,'Editor','info')}
  catch(error){cancelHistoryTransaction();automationState.phase=error instanceof DOMException&&error.name==='AbortError'?'cancelled':'failed';automationState.error=error instanceof Error?error.message:String(error);trace('rollback',automationState.error,started);throw error}finally{automationState.busy=false}
}

/** 结构说明（自动提取）：rollbackLastAutomation；无显式参数；直接调用 undo、trace；写入 automationState.lastApplied、automationState.phase。 */ export function rollbackLastAutomation():boolean{if(!automationState.lastApplied)return false;undo();automationState.lastApplied=false;automationState.phase='idle';trace('rollback','The last automation transaction was undone.');return true}
/** 结构说明（自动提取）：serializeAutomationEvidence；无显式参数；直接调用 toISOString、Date、automationState.diff.map、automationState.trace.map。 */ export function serializeAutomationEvidence(){return{format:'nova-editor-automation-evidence',version:1,engineVersion:'6.7.0',generatedAt:new Date().toISOString(),phase:automationState.phase,origin:automationState.origin,permissions:[...automationState.granted],diff:automationState.diff.map(/** 构造并返回记录 {...item}，字段按当前实参及捕获状态求值。 */ item=>({...item})),trace:automationState.trace.map(/** 构造并返回记录 {...item}，字段按当前实参及捕获状态求值。 */ item=>({...item})),error:automationState.error}}
