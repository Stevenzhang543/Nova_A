/** Strict GraphDebug normalization; independent of all older migration helpers and production getters. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {canonicalBeforeNetworkSources} from './networkSourceProjection.mjs'
import {createHash} from 'node:crypto'
import ts from 'typescript'
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/graph-debug-owner-transform-v1.json',import.meta.url),'utf8'))
assert.equal(fixture.schema,'nova-graph-debug-owner-transform-v1');assert.equal(fixture.files.length,9)
const hash=v=>createHash('sha256').update(v).digest('hex'),key=p=>p.replaceAll('\\','/'),row=p=>fixture.files.find(r=>r.path===key(p))
const parse=(p,text)=>{const a=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true);assert.equal(a.parseDiagnostics.length,0,p);return a}
const requiredRead=(provider,path)=>{assert.equal(typeof provider,'function','Explicit synchronous linked-source provider required');const text=provider(path);assert.equal(typeof text,'string',path+': actual synchronous linked source required');return canonicalBeforeNetworkSources(path,text,provider)}
function inverse(source,record){
 if(record.created)return source
 for(const step of [...record.steps].reverse())for(const offset of [...step.offsets].reverse()){
  assert.equal(source.slice(offset,offset+step.to.length),step.to,record.path+': exact whole-source inverse anchor')
  source=source.slice(0,offset)+step.from+source.slice(offset+step.to.length)
 }
 assert.equal(source,record.before,record.path+': entire original source, no ignored methods or imports')
 assert.equal(hash(source),record.beforeSha256,record.path+': exact entire before SHA')
 return source
}
function validate(readLinkedSource){
 const sources=new Map(fixture.files.map(record=>{const source=requiredRead(readLinkedSource,record.path);assert.equal(hash(source),record.afterSha256,record.path+': unapproved linked actual GraphDebug source');return[record.path,source]}))
 const original=parse('originalGraphDebugger.ts',fixture.originalSource),owner=parse('graphDebugOwner.ts',sources.get('src/runtime/graphDebugOwner.ts'))
 const originalFunctions=original.statements.filter(ts.isFunctionDeclaration);assert.equal(originalFunctions.length,15)
 const proof=[]
 for(const record of fixture.originalFunctions){
  const matches=[];function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===record.name)matches.push(node);ts.forEachChild(node,visit)}visit(owner)
  assert.equal(matches.length,1,record.name+': one actual implementation')
  const before=originalFunctions.find(n=>n.name?.text===record.name),current=matches[0]
  assert.equal(current.getText(owner),before.getText(original).replace(/^export /,''),record.name+': original entire declaration, parameters/defaults/body')
  assert.equal(hash(current.body.getText(owner)),record.bodySha256,record.name+': original formula bytes')
  proof.push({name:record.name,bodySha256:record.bodySha256})
 }
 const initializer=owner.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='createInitialGraphDebugState').body.statements[0].expression
 assert.equal(hash(initializer.getText(owner)),fixture.initializerSha256);assert.equal(initializer.properties.length,19);assert.equal(fixture.originalFields.length,19)
 const whole=fixture.files.filter(r=>!r.created).map(record=>({path:record.path,sha256:hash(inverse(sources.get(record.path),record))}))
 assert.equal(whole.length,7)
 return{schema:fixture.schema,sourceFiles:9,newFiles:2,originalFunctions:proof,originalFields:fixture.originalFields,initializerSha256:fixture.initializerSha256,wholeInverse:whole,allNineActualLinkedSourcesVerified:true,noOldHelperImports:true,sealedEvidenceOptional:fixture.sealedFunctionalEvidence}
}
/** Requires all nine actual current source strings, including both new Owner and Editor adapter. */
export function assertGraphDebugOwnerQualification(readLinkedSource){return validate(readLinkedSource)}
/** Exact approved before SHA may return early. Every actual post image requires an explicit complete linked provider. */
export function canonicalBeforeGraphDebugOwner(path,source,readLinkedSource){
 assert.equal(typeof source,'string');path=key(path);source=canonicalBeforeNetworkSources(path,source,readLinkedSource);const record=row(path);if(!record)return source
 if(record.beforeSha256&&hash(source)===record.beforeSha256)return source
 assert.equal(hash(source),record.afterSha256,path+': unapproved GraphDebug image')
 validate(linkedPath=>linkedPath===path?source:requiredRead(readLinkedSource,linkedPath))
 return inverse(source,record)
}
export function canonicalCoreBeforeGraphDebugOwner(source,readLinkedSource){return canonicalBeforeGraphDebugOwner('src/runtime/GameplayRuntimeCore.ts',source,readLinkedSource)}
export function canonicalWorldGameplayBeforeGraphDebugOwner(source,readLinkedSource){return canonicalBeforeGraphDebugOwner('src/runtime/worldGameplayOwner.ts',source,readLinkedSource)}
export function canonicalEditorWorldGameplayBeforeGraphDebugOwner(source,readLinkedSource){return canonicalBeforeGraphDebugOwner('src/editor/worldGameplayAdapter.ts',source,readLinkedSource)}
export function canonicalAiAdapterBeforeGraphDebugOwner(source,readLinkedSource){return canonicalBeforeGraphDebugOwner('src/editor/aiAdapter.ts',source,readLinkedSource)}
export function canonicalGameplayWorldHostBeforeGraphDebugOwner(source,readLinkedSource){return canonicalBeforeGraphDebugOwner('src/runtime/gameplayWorldHost.ts',source,readLinkedSource)}
export function canonicalEditorGameplayWorldHostBeforeGraphDebugOwner(source,readLinkedSource){return canonicalBeforeGraphDebugOwner('src/editor/gameplayWorldHost.ts',source,readLinkedSource)}
export function canonicalGraphDebuggerBeforeGraphDebugOwner(source,readLinkedSource){return canonicalBeforeGraphDebugOwner('src/visual/graphDebugger.ts',source,readLinkedSource)}
