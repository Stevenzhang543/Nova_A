/** Exact whole-source inverse for the reviewed Runtime Save Owner composition.
 * All linked sources are actual synchronous inputs; defaults read installed files.
 * No mutable normalizer registry and no replacement old-algorithm snapshot. */
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import ts from 'typescript'
import {canonicalBeforePackageContractHost} from './packageContractHostContract.mjs'
const fixture=JSON.parse(readFileSync(new URL('../fixtures/runtime-save-owner-transform-v1.json',import.meta.url),'utf8'))
const sha=value=>createHash('sha256').update(value).digest('hex'),key=path=>path.replaceAll('\\','/')
assert.equal(fixture.schema,'nova-runtime-save-owner-whole-inverse-v1')
assert.equal(fixture.rows.length,6);assert.equal(fixture.owner.originalFunctionCount,37);assert.equal(fixture.actualCalls.length,7)
const rows=new Map(fixture.rows.map(row=>[row.path,row]))
/** Existing closed Save states may be supplied twice by the old chained contracts. */
function beforePackageForSave(source,path){const row=rows.get(key(path)),digest=sha(source);if(row&&(digest===row.beforeSha256||digest===row.afterSha256||row.acceptedEarlierSha256.includes(digest)))return source;return canonicalBeforePackageContractHost(source,path)}
function actualSource(path,sourceFor){const supplied=typeof sourceFor==='function'?sourceFor(path):sourceFor?.[path];const source=supplied??readFileSync(new URL('../../'+path,import.meta.url),'utf8');assert.equal(typeof source,'string',path+': actual synchronous source required');return beforePackageForSave(source,path)}
function functions(source,path){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0,path+': actual source must parse');const result=[];const visit=node=>{if(ts.isFunctionDeclaration(node)&&node.name&&node.body)result.push({key:node.name.text,start:node.body.getStart(file),end:node.body.end,body:node.body.getText(file),declaration:node.getText(file)});ts.forEachChild(node,visit)};visit(file);return result}
function positionedInverse(source,changes,label){for(const edit of [...changes].sort((a,b)=>b.outputOffset-a.outputOffset||b.start-a.start)){assert.equal(source.slice(edit.outputOffset,edit.outputOffset+edit.after.length),edit.after,label+': precise inverse position '+edit.outputOffset);source=source.slice(0,edit.outputOffset)+edit.before+source.slice(edit.outputOffset+edit.after.length)}return source}
function exactPost(source,row){assert.equal(sha(source),row.afterSha256,row.path+': complete reviewed post source required')}
function inverseAdoption(source,row){exactPost(source,row);for(const stage of [...row.mechanicalStages].reverse()){
 assert.equal(sha(source),stage.afterSha256,row.path+': exact whole adoption stage output')
 if(stage.positionedEdits)source=positionedInverse(source,stage.positionedEdits,row.path)
 else for(const [before,after] of [...stage.edits].reverse()){assert.equal(source.split(after).length-1,1,row.path+': unique mechanical inverse boundary');source=source.replace(after,before)}
 assert.equal(sha(source),stage.beforeSha256,row.path+': exact prior adoption stage')
 }return source}
function restoreOriginalSave(owner){const original=fixture.owner;assert.equal(sha(owner),original.sha256,'runtimeSaveOwner: complete Owner source changed')
 assert(owner.startsWith(original.wrapperBefore)&&owner.endsWith(original.wrapperAfter),'runtimeSaveOwner: exact declarations/defaults/ports/return wrapper required')
 const actual=functions(owner,original.path),leaf=actual.filter(body=>!actual.some(inner=>inner!==body&&inner.start>body.start&&inner.end<body.end))
 assert.equal(leaf.length,original.leafBodies.length,'runtimeSaveOwner: complete leaf function set')
 let skeleton=owner;for(const body of [...leaf].sort((a,b)=>b.start-a.start))skeleton=skeleton.slice(0,body.start)+`/* ACTUAL_BODY:${body.key} */`+skeleton.slice(body.end)
 assert.equal(skeleton,original.skeleton,'runtimeSaveOwner: declarations/state/defaults/cleanup skeleton changed')
 for(const body of original.originalBodies){const matches=actual.filter(row=>row.key===body.key);assert.equal(matches.length,1,'runtimeSaveOwner: actual original function '+body.key);assert.equal(matches[0].body,body.ownerBody,'runtimeSaveOwner: entire actual function body '+body.key);assert.equal(sha(matches[0].body),body.ownerBodySha256)}
 let restored=owner.slice(original.wrapperBefore.length,-original.wrapperAfter.length)
 for(const stage of [...original.stages].reverse()){assert.equal(sha(restored),stage.afterSha256,'runtimeSaveOwner: exact AST stage output');restored=positionedInverse(restored,stage.changes,'runtimeSaveOwner '+stage.reason);assert.equal(sha(restored),stage.beforeSha256,'runtimeSaveOwner: entire original AST stage')}
 assert.equal(sha(restored),original.originalSourceSha256,'runtimeSaveOwner: entire original save source inverse')
 const originalFunctions=functions(restored,'src/runtime/saveGame.ts');assert.equal(originalFunctions.length,37)
 for(const body of original.originalBodies){const matches=originalFunctions.filter(row=>row.key===body.key);assert.equal(matches.length,1);assert.equal(matches[0].body,body.originalBody,'saveGame: complete original body '+body.key);assert.equal(sha(matches[0].body),body.originalBodySha256);assert.equal(sha(matches[0].declaration),body.originalDeclarationSha256,'saveGame: original signature/default/export '+body.key)}
 return restored
}
function validateAdapter(source){exactPost(source,rows.get(fixture.adapter.path));const actual=functions(source,fixture.adapter.path);assert.equal(actual.length,fixture.adapter.functions.length);for(const original of fixture.adapter.functions){const matches=actual.filter(row=>row.key===original.key);assert.equal(matches.length,1);assert.equal(matches[0].declaration,original.declaration,original.key+': complete config snapshot and ports required')}return inverseAdoption(source,rows.get(fixture.adapter.path))}
function validateActualCalls(source){const file=ts.createSourceFile('GameplayRuntimeCore.ts',source,ts.ScriptTarget.Latest,true),actual=[];const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(file).startsWith('this.saves.'))actual.push({start:node.getStart(file),end:node.end,callee:node.expression.getText(file),source:node.getText(file)});ts.forEachChild(node,visit)};visit(file);assert.equal(actual.length,7,'Core: all seven actual save call sites, no extra or dropped call');for(const expected of fixture.actualCalls){const matches=actual.filter(row=>row.start===expected.start&&row.end===expected.end&&row.callee===expected.callee);assert.equal(matches.length,1,'Core: positioned actual save call '+expected.callee);assert.equal(matches[0].source,expected.source,'Core: original complete arguments '+expected.callee);assert.equal(sha(matches[0].source),expected.sha256)}return actual.length}
/** Known touched paths reject every unknown body. Unrelated paths remain inputs to
 * their existing whole-source contracts; this helper does not authorize them. */
export function canonicalBeforeRuntimeSaveOwner(source,path,sourceFor){path=key(path);source=beforePackageForSave(source,path);const row=rows.get(path);if(!row)return source
 const digest=sha(source)
 if(row.path===fixture.owner.path){restoreOriginalSave(source);return source}
 if(row.path===fixture.adapter.path){validateAdapter(source);return source}
 if(digest===row.beforeSha256||row.acceptedEarlierSha256.includes(digest))return source
 exactPost(source,row)
 if(row.path===fixture.links.facade){inverseAdoption(source,row);return restoreOriginalSave(actualSource(fixture.links.owner,sourceFor))}
 if(row.path==='src/runtime/GameplayRuntimeCore.ts')validateActualCalls(source)
 const restored=inverseAdoption(source,row);assert.equal(sha(restored),row.beforeSha256,row.path+': exact Animation wiring prior source');return restored
}
/** Full qualification reads every actual post module, including linked Owner
 * algorithm, adapter snapshots, facade getter and required Host/Core call sites. */
export function validateRuntimeSaveOwner(sourceFor){const actual=new Map(fixture.rows.map(row=>{const source=actualSource(row.path,sourceFor);exactPost(source,row);return[row.path,source]}))
 const original=restoreOriginalSave(actual.get(fixture.owner.path)),wholeFiles=[]
 for(const row of fixture.rows){let restored;if(row.path===fixture.owner.path)restored=original;else if(row.path===fixture.adapter.path)restored=validateAdapter(actual.get(row.path));else{if(row.path==='src/runtime/GameplayRuntimeCore.ts')validateActualCalls(actual.get(row.path));restored=inverseAdoption(actual.get(row.path),row);if(row.path===fixture.links.facade)restored=original;else assert.equal(sha(restored),row.beforeSha256)}wholeFiles.push({path:row.path,postSha256:sha(actual.get(row.path)),beforeSha256:sha(restored),adoptionStages:row.mechanicalStages.length})}
 return{schema:'nova-runtime-save-owner-whole-proof-v1',wholeFiles,originalFunctionBodies:37,entireOriginalSaveSourceSha256:sha(original),actualSaveCalls:7,newOwnerSkeletons:1,newAdapterFunctions:fixture.adapter.functions.length,sourceMode:sourceFor?'explicit actual synchronous sources':'installed root actual sources'}
}
