import {propertyAudit22} from './lib/propertyAudit22.mjs'
const audit=await propertyAudit22('control-order')
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
const text=await readFile('src/runtime/projectMutationRouter.ts','utf8'),js=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
let generation=1,next=0,documentValue='initial';const timers=new Map(),listeners=new Map(),records=[],checks=[]
class Control{constructor(resource='entity-a'){this.resource=resource;this.isConnected=true;this.disabled=false;this.readOnly=false;this.dataset={};this.id='';this.name='';this.type='text';this.labels=[]}closest(selector){if(selector.includes('data-non-project-control'))return null;if(selector.includes('data-resource-key'))return{dataset:{resourceKey:this.resource}};return{dataset:{surface:'inspector'}}}getAttribute(){return null}}
const exports={};vm.runInNewContext(js,{exports,require:id=>{assert.equal(id,'../projects/projectSession');return{getProjectSessionGeneration:()=>generation}},console,HTMLInputElement:Control,HTMLTextAreaElement:class{},HTMLSelectElement:class{},document:{addEventListener:(type,callback)=>listeners.set(type,callback),removeEventListener:type=>listeners.delete(type)},window:{setTimeout:callback=>{timers.set(++next,callback);return next},clearTimeout:id=>timers.delete(id)}})
exports.setProjectMutationRecorder((label,key,resource)=>records.push({label,key,resource,value:documentValue}));exports.installProjectMutationRouter()
const event=target=>listeners.get('input')({type:'input',target}),test=(name,fn)=>{fn();checks.push({name,status:'passed'});console.log('PASS '+name)}
test('Capture of the next control flushes the prior authored value before its model changes',()=>{const a=new Control(),b=new Control();event(a);documentValue='A changed';event(b);assert.equal(records.at(-1).value,'A changed');documentValue='B changed';exports.flushPendingProjectMutations();assert.equal(records.at(-1).value,'B changed');assert.notEqual(records.at(-1).key,records.at(-2).key);assert.equal(timers.size,0)})
test('Repeated input coalesces while a different resource invalidates stale work',()=>{const before=records.length,a=new Control();event(a);event(a);assert.equal(timers.size,1);a.resource='entity-b';exports.flushPendingProjectMutations();assert.equal(records.length,before);event(a);exports.flushPendingProjectMutations();assert.equal(records.length,before+1);assert.ok(records.at(-1).resource.includes('entity-b'))})
test('Boundary cancellation rejects even previously captured callbacks',()=>{const before=records.length;event(new Control());const callbacks=[...timers.values()];exports.cancelPendingProjectMutations();callbacks.forEach(fn=>fn());assert.equal(records.length,before);assert.equal(timers.size,0)})
test('Project lifetime change cannot record into the replacement',()=>{const before=records.length;event(new Control());generation++;exports.flushPendingProjectMutations();assert.equal(records.length,before)})
test('Disposal clears listeners and the pending queue',()=>{event(new Control());exports.disposeProjectMutationRouter();assert.equal(timers.size,0);assert.equal(listeners.size,0);const before=records.length;exports.flushPendingProjectMutations();assert.equal(records.length,before)})
await audit.write(checks,'Executed actual source modules; targeted programmer regressions, not full UI/platform qualification.')
