/** Pure independent newest-source projection: actual Hot/UI -> ScriptDebug -> Network661 view. */
import fs from 'node:fs'
import {canonicalBeforeRuntimeWorldAdoption} from './runtimeWorldAdoptionSourceProjection.mjs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {canonicalBeforeScriptHotReloadOwner,canonicalBeforeScriptHotReloadUi,validateScriptHotReloadOwnerSources,validateScriptHotReloadUiSource} from './scriptHotReloadOwnerContract.mjs'
import {canonicalBeforeScriptDebugOwner,validateScriptDebugOwnerSources} from './scriptDebugOwnerContract.mjs'
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/script-debug-hot-reload-projection-history-v1.json',import.meta.url),'utf8')),sha=value=>createHash('sha256').update(value).digest('hex'),key=p=>p.replaceAll('\\','/'),rows=new Map(fixture.rows.map(row=>[row.path,row]))
assert.equal(fixture.schema,'nova-script-debug-hot-reload-projection-history-v1');assert.equal(rows.size,12)
/** At most twelve registered paths. Only exact mathematical outputs are retained; no provider admission is cached. */
const mathMemo=new Map()
// Function identity only: each actual read still performs the complete current-source gate.
const newestReaders=new WeakSet()
// This is the immutable twelve-source mathematical closure, never a provider admission.
let exactMathProof=false
const guards=new Map((fixture.claimGuard?.rows??[]).map(row=>[row.path,row]))
const beforeClaimGuard=(p,source)=>{const row=guards.get(p);if(!row)return source;const digest=sha(source);if(digest===row.beforeSha256)return source;assert.equal(digest,row.afterSha256,'DEBUG_CLAIM_GUARD_CURRENT_SOURCE_MISMATCH: '+p);let result=source;for(const step of [...row.steps].reverse()){assert.equal(result.split(step.to).length-1,1,'DEBUG_CLAIM_GUARD_EXACT_INVERSE: '+p);result=result.replace(step.to,step.from)}assert.equal(sha(result),row.beforeSha256,'DEBUG_CLAIM_GUARD_WHOLE_BEFORE: '+p);return result}
const required=(provider,p)=>{assert.equal(typeof provider,'function','DEBUG_HOT_LINKED_PROVIDER_REQUIRED');const source=provider(p);assert.equal(typeof source,'string','DEBUG_HOT_LINKED_SOURCE_REQUIRED: '+p);return source}
const guardReader=provider=>p=>beforeClaimGuard(p,required(provider,p))
const hot=(p,source,provider)=>{const input=beforeClaimGuard(p,source),entry=mathMemo.get(p);if(rows.has(p)&&entry?.hotInput===input)return entry.hotOutput;const upstream=guardReader(provider),output=canonicalBeforeScriptHotReloadUi(p,canonicalBeforeScriptHotReloadOwner(p,input,upstream),upstream);if(rows.has(p)){mathMemo.set(p,{...entry,hotInput:input,hotOutput:output});assert(mathMemo.size<=12,'DEBUG_HOT_MATH_MEMO_BOUNDED')}return output}
export function validateScriptDebugHotReloadSources(readSource){
 const captured=new Map();for(const row of rows.values()){const value=required(readSource,row.path);assert.equal(sha(value),row.rawSha256,'DEBUG_HOT_CURRENT_SOURCE_MISMATCH: '+row.path);captured.set(row.path,value)}
 if(!exactMathProof){const exactSource=p=>{assert(captured.has(p),'DEBUG_HOT_MATH_CLOSURE_PATH_REQUIRED: '+p);return captured.get(p)};const unguarded=guardReader(exactSource);validateScriptHotReloadOwnerSources(unguarded);validateScriptHotReloadUiSource(unguarded);const upstream=p=>hot(p,required(exactSource,p),exactSource);validateScriptDebugOwnerSources(upstream);exactMathProof=true}
 return {actualFiles:12,HotOwner:7,Ui:1,ScriptDebug:8,qualifiedView:'Network661',rawView:'current665'}
}
export function canonicalBeforeScriptDebugHotReloadSources(path,source,readLinkedSource){
 path=key(path);assert.equal(typeof source,'string','DEBUG_HOT_SELECTED_SOURCE_REQUIRED: '+path)
 source=canonicalBeforeRuntimeWorldAdoption(path,source,readLinkedSource)
 const row=rows.get(path);if(!row)return source
 if(row.historical.some(item=>item.sha256===sha(source)))return source
 validateScriptDebugHotReloadSources(readLinkedSource)
 const entry=mathMemo.get(path);if(entry?.finalInput===source)return entry.finalOutput
 const upstream=p=>hot(p,required(readLinkedSource,p),readLinkedSource),selected=hot(path,source,readLinkedSource),result=canonicalBeforeScriptDebugOwner(path,selected,upstream)
 assert.equal(sha(result),row.qualified661Sha256??row.qualifiedCreatedSha256??row.rawSha256,'DEBUG_HOT_EXACT_QUALIFIED_OUTPUT: '+path)
 mathMemo.set(path,{...mathMemo.get(path),finalInput:source,finalOutput:result});assert(mathMemo.size<=12,'DEBUG_HOT_MATH_MEMO_BOUNDED')
 return result
}
export function createScriptDebugHotReloadSourceReader(readSource){assert.equal(typeof readSource,'function','DEBUG_HOT_LINKED_PROVIDER_REQUIRED');if(newestReaders.has(readSource))return readSource;const reader=p=>canonicalBeforeScriptDebugHotReloadSources(p,required(readSource,p),readSource);newestReaders.add(reader);return reader}
export function createVerifiedScriptDebugHotReloadSourceReader(readSource){validateScriptDebugHotReloadSources(readSource);return createScriptDebugHotReloadSourceReader(readSource)}
export function createVerifiedScriptDebugClaimGuardSourceReader(readSource){validateScriptDebugHotReloadSources(readSource);return guardReader(readSource)}
export function scriptDebugHotReloadSourceEvidence(){return fixture}
