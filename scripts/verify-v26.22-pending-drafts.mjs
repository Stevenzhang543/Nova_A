import {propertyAudit22} from './lib/propertyAudit22.mjs'
const audit=await propertyAudit22('pending-drafts')
import assert from 'node:assert/strict'
import ts from 'typescript'
import {readFile,writeFile} from 'node:fs/promises'
const source=await readFile('src/editor/pendingDrafts.ts','utf8')
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
const {registerEditorDraft,settleEditorDrafts,cancelEditorDrafts}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const checks=[]
function test(name,fn){fn();checks.push({name,status:'passed'});console.log('PASS '+name)}
test('Invalid drafts block all commits and remain available for correction',()=>{const events=[];let valid=false;const a=registerEditorDraft({validate:()=>true,commit:()=>events.push('a'),cancel(){}}),b=registerEditorDraft({validate:()=>valid,commit:()=>events.push('b'),cancel(){}});assert.equal(settleEditorDrafts(),false);assert.deepEqual(events,[]);valid=true;assert.equal(settleEditorDrafts(),true);assert.deepEqual(events,['a','b']);a();b()})
test('Unmounted owners cannot commit and cancellation reaches every live owner',()=>{let a=0,b=0;const remove=registerEditorDraft({validate:()=>true,commit:()=>a++,cancel:()=>a++});const keep=registerEditorDraft({validate:()=>true,commit:()=>b++,cancel:()=>b++});remove();settleEditorDrafts();cancelEditorDrafts();assert.equal(a,0);assert.equal(b,2);keep()})
test('Nested boundary calls do not duplicate a commit',()=>{let count=0;const remove=registerEditorDraft({validate:()=>true,commit:()=>{count++;assert.equal(settleEditorDrafts(),true)},cancel(){}});assert.equal(settleEditorDrafts(),true);assert.equal(count,1);remove()})
test('A failed commit releases the settlement guard for recovery',()=>{let fail=true,count=0;const remove=registerEditorDraft({validate:()=>true,commit:()=>{if(fail)throw Error('failed');count++},cancel(){}});assert.throws(settleEditorDrafts,/failed/);fail=false;assert.equal(settleEditorDrafts(),true);assert.equal(count,1);remove()})
await audit.write(checks,'Executed actual source modules; targeted programmer regressions, not full UI/platform qualification.')
