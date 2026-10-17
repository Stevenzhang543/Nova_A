/** Whole-source inverse of the reviewed asset/plugin/lifetime composition.
 * Existing contracts still receive their complete original inputs and assertions. */
import assert from 'node:assert/strict'
import { canonicalSelected as canonicalSceneSelected, sceneOwnerFixture } from './sceneOwnerSourceProjection.mjs'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import ts from 'typescript'
import { canonicalBeforePluginApiContract } from './pluginApiContractMigration.mjs'
import { canonicalBeforeContentAdmission } from './contentAdmissionSourceProjection.mjs'
import { canonicalBeforeRuntimeSaveOwner } from './runtimeSaveOwnerContract.mjs'
import { canonicalBeforeAnimationTimelineOwner } from './animationOwnerContract.mjs'
const fixture=JSON.parse(readFileSync(new URL('../fixtures/m1-owner-integration-transform-v1.json',import.meta.url),'utf8'))
const sha=value=>createHash('sha256').update(value).digest('hex')
// Only the exact latest Scene post-image is normalized here. Closed earlier
// inputs continue to their unchanged historical guards; this is not an installed-source gate.
const scenePostimages=new Map(sceneOwnerFixture.files.map(row=>[row.path,row.afterSha256]))
function beforeSceneForExistingContracts(source,path,read){if(scenePostimages.get(path)!==sha(source))return source;return canonicalSceneSelected(path,source,read)}

assert.equal(fixture.schema,'nova-m1-whole-owner-integration-transform-v1')
assert.equal(fixture.rows.length,16)
assert.equal(fixture.newModules.length,7)
const rows=new Map(fixture.rows.map(row=>[row.path,row])),fresh=new Map(fixture.newModules.map(row=>[row.path,row]))
const pathKey=path=>path.replaceAll('\\','/')
function actualSource(path,sources){const raw=file=>sources?.[file]??readFileSync(new URL('../../'+file,import.meta.url),'utf8');const provider=file=>canonicalBeforeContentAdmission(file,beforeSceneForExistingContracts(raw(file),file,raw),raw);const source=provider(path);return canonicalBeforePluginApiContract(canonicalBeforeAnimationTimelineOwner(canonicalBeforeRuntimeSaveOwner(source,path,provider),path,provider),path)}
function bodies(path,source){
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true),result=[]
 assert.equal(file.parseDiagnostics.length,0,path+': valid actual source required')
 const visit=node=>{
  if(ts.isFunctionDeclaration(node)&&node.name&&node.body)result.push({key:node.name.text,start:node.body.getStart(file),end:node.body.end,body:node.body.getText(file)})
  if(ts.isClassDeclaration(node)&&node.name)for(const member of node.members){if((ts.isMethodDeclaration(member)||ts.isGetAccessor(member)||ts.isSetAccessor(member)||ts.isConstructorDeclaration(member))&&member.body){const name=ts.isConstructorDeclaration(member)?'constructor':member.name.getText(file);result.push({key:node.name.text+'.'+name,start:member.body.getStart(file),end:member.body.end,body:member.body.getText(file)})}}
  ts.forEachChild(node,visit)
 };visit(file);return result
}
function skeleton(source,selected){for(const row of [...selected].sort((a,b)=>b.start-a.start))source=source.slice(0,row.start)+`/* ACTUAL_BODY:${row.key} */`+source.slice(row.end);return source}
function verifyNew(path,source){
 const row=fresh.get(path);assert(row,path+': registered new source required')
 assert.equal(sha(source),row.sha256,path+': complete reviewed new source changed')
 const all=bodies(path,source),selected=all.filter(body=>!all.some(other=>other!==body&&other.start>body.start&&other.end<body.end))
 assert.equal(selected.length,row.bodyRows.length,path+': complete implemented body set')
 assert.equal(skeleton(source,selected),row.skeleton,path+': declarations/ports/cleanup/skeleton changed')
 for(const original of row.bodyRows){const candidates=selected.filter(body=>body.key===original.key);assert.equal(candidates.length,1,path+': unique body '+original.key);assert.equal(candidates[0].body,original.body,path+': entire method body '+original.key);assert.equal(sha(candidates[0].body),original.bodySha256)}
 return {path,sha256:sha(source),skeletons:1,bodies:row.bodyRows.length}
}
function restoreActual(source,row,sources){
 assert.equal(sha(source),row.afterSha256,row.path+': exact reviewed whole source required')
 let restored=source
 if(row.kind==='mechanical'){
  for(const edit of [...row.edits].reverse()){
   assert.equal(sha(restored),edit.afterSourceSha256,row.path+': every actual whole-stage output')
   assert.equal(restored.slice(edit.offset,edit.offset+edit.after.length),edit.after,row.path+': exact inverse boundary '+edit.reason)
   restored=restored.slice(0,edit.offset)+edit.before+restored.slice(edit.offset+edit.after.length)
   assert.equal(sha(restored),edit.beforeSourceSha256,row.path+': exact previous whole-stage source')
  }
 }else if(row.kind==='method-relocation'){
  const actual=bodies(row.path,source),selected=row.methods.map(method=>{const matches=actual.filter(body=>body.key===method.actualName);assert.equal(matches.length,1,row.path+': original method required '+method.actualName);return matches[0]})
  assert.equal(skeleton(source,selected),row.actualSkeleton,row.path+': complete Owner/facade skeleton changed')
  restored=row.oldSkeleton
  for(const method of row.methods){let body=actual.find(value=>value.key===method.actualName).body
   for(const edit of method.edits){assert.equal(body.split(edit.after).length-1,edit.count,row.path+': exact body inverse '+method.originalName);body=body.replaceAll(edit.after,edit.before)}
   assert.equal(sha(body),method.originalBodySha256,row.path+': original full method body '+method.originalName)
   const marker=`/* ACTUAL_BODY:${method.originalName} */`;assert.equal(restored.split(marker).length-1,1);restored=restored.replace(marker,body)
  }
 }else if(row.kind==='declaration-relocation'){
  restored=row.oldSkeleton
  for(const link of row.links){const actual=link.target===row.path?source:actualSource(link.target,sources)
   if(fresh.has(link.target))verifyNew(link.target,actual)
   else assert.equal(sha(actual),rows.get(link.target).afterSha256,link.target+': entire actual facade required')
   assert.equal(actual.split(link.token).length-1,1,row.path+': unique actual moved declaration '+link.key)
   const start=actual.indexOf(link.token);let declaration=actual.slice(start,start+link.token.length)
   for(const edit of [...link.edits].reverse()){
    if(edit.prefix){assert.equal(edit.after,'');declaration=edit.before+declaration}
    else{assert.equal(declaration.split(edit.after).length-1,edit.count??1);declaration=declaration.replaceAll(edit.after,edit.before)}
   }
   assert.equal(sha(declaration),link.originalSha256,row.path+': whole original declaration '+link.key)
   const marker=`/* ACTUAL_DECL:${link.key} */`;assert.equal(restored.split(marker).length-1,1);restored=restored.replace(marker,declaration)
  }
 }else assert.fail(row.path+': unknown restoration mode')
 assert.equal(sha(restored),row.beforeSha256,row.path+': complete original must recover byte for byte')
 return restored
}
/** Synchronous path-aware adapter. Earlier phases are a closed set of actually verified
 * historical hashes; all existing downstream guards continue checking their full sources. */
export function canonicalBeforeM1OwnerIntegration(source,path,sources){
 path=pathKey(path);const raw=file=>sources?.[file]??readFileSync(new URL('../../'+file,import.meta.url),'utf8');const provider=file=>canonicalBeforeContentAdmission(file,beforeSceneForExistingContracts(raw(file),file,raw),raw);source=beforeSceneForExistingContracts(source,path,raw);if(!(path==='src/assets/AssetDatabase.ts'&&(sha(source)===rows.get(path)?.beforeSha256||rows.get(path)?.allowedEarlierSha256.includes(sha(source)))))source=canonicalBeforeContentAdmission(path,source,raw,true);source=canonicalBeforeRuntimeSaveOwner(source,path,provider);source=canonicalBeforeAnimationTimelineOwner(source,path,provider);source=canonicalBeforePluginApiContract(source,path);const row=rows.get(path)
 if(!row){if(fresh.has(path))verifyNew(path,source);return source}
 const digest=sha(source)
 if(digest===row.beforeSha256||row.allowedEarlierSha256.includes(digest))return source
 return restoreActual(source,row,sources)
}
/** Full review/gate proof. Explicit source sets serve rejected-change fixtures only;
 * defaults always read every actual installed module including new Owner bodies. */
export function validateM1OwnerIntegration(sources){
 const wholeFiles=[],newModules=[]
 for(const row of fixture.rows){const source=actualSource(row.path,sources),restored=restoreActual(source,row,sources);wholeFiles.push({path:row.path,beforeSha256:sha(restored),afterSha256:sha(source),kind:row.kind,stages:row.edits?.length??null})}
 for(const row of fixture.newModules)newModules.push(verifyNew(row.path,actualSource(row.path,sources)))
 return {schema:'nova-m1-whole-owner-proof-v1',wholeFiles,newModules,wholeOriginalFiles:16,completeNewSkeletons:7,actualNewBodies:newModules.reduce((sum,row)=>sum+row.bodies,0),coreInverseSha256:wholeFiles.find(row=>row.path==='src/runtime/GameplayRuntimeCore.ts').beforeSha256}
}
