import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import {propertyAudit22} from './lib/propertyAudit22.mjs'
const audit=await propertyAudit22('rendering-recovery'),checks=[]
const source=await readFile('src/editor/studioDraftRetention.ts','utf8'),context={exports:{}}
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context)
let calls=new Set()
const api=new Proxy(context.exports,{get(target,name){const value=target[name];return typeof value==='function'?(...args)=>{calls.add('src/editor/studioDraftRetention.ts#'+String(name));return value(...args)}:value}})
for(const [kind,assetType] of [['material','material'],['particle','particleSystem']]){
 const record={uuid:kind,name:kind,assetType},source=JSON.stringify({raw:'{ malformed 🪐\r\n',values:[1,2,3]}),candidate={record,projectId:'project',kind,source,baseSource:'original'}
 function test(name,fn){calls=new Set();fn();checks.push({name:kind+': '+name,status:'passed',covers:[...calls].sort()});console.log('PASS '+kind+': '+name)}
 test('Recover exact draft and detect a changed saved asset',()=>{api.retainStudioDraft(candidate);const saved=api.readStudioDraft(record,'project',kind,'changed');assert.equal(saved.entry.source,source);assert.equal(saved.entry.baseSource,'original');assert.equal(saved.conflict,true)})
 test('Isolate replacement records, projects and kinds',()=>{assert.equal(api.readStudioDraft({...record},'project',kind,'original'),null);assert.equal(api.readStudioDraft(record,'different',kind,'original'),null);assert.throws(()=>api.retainStudioDraft({...candidate,record:{...record,assetType:'script'}}),/identity/)})
 test('Capture mounted drafts before departure and discard explicitly',()=>{let dirty=true;const remove=api.registerStudioDraftOwner({read:()=>dirty?candidate:null,discard:()=>{dirty=false}});try{const pending=api.listPendingAuthoringDrafts('project',[record]);assert.equal(pending.length,1);assert.equal(pending[0].active,true);assert.equal(pending[0].kind,kind);api.discardAuthoringDrafts('project',[record]);assert.equal(dirty,false);assert.equal(api.hasPendingAuthoringDrafts('project',[record]),false)}finally{remove()}})
 test('Clear only the intended project draft',()=>{api.retainStudioDraft(candidate);api.clearStudioDraft(record,'different');assert.equal(api.readStudioDraft(record,'project',kind,'original').entry.source,source);api.clearStudioDraft(record,'project');assert.equal(api.readStudioDraft(record,'project',kind,'original'),null)})
 test('Rollback recovery requires the exact saved source',()=>{api.retainStudioDraft(candidate);const snapshot=api.snapshotAuthoringDrafts('project',[record],()=> 'current saved');const replacement={...record};assert.equal(api.restoreAuthoringDrafts('project',[replacement],snapshot,()=> 'wrong').length,1);assert.equal(api.readStudioDraft(replacement,'project',kind,'wrong'),null);assert.equal(api.restoreAuthoringDrafts('project',[replacement],snapshot,()=> 'current saved').length,0);assert.equal(api.readStudioDraft(replacement,'project',kind,'current saved').entry.source,source)})
}
await audit.write(checks,'Actual session recovery store for material and particle asset identities; exact drafts, conflicts, departure and rollback. Browser adapters are tested separately. This does not assert global Save integration.')
