/** Strict Presentation closure migration. Independent of Audio/Save/Animation contracts. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import ts from 'typescript'
import {canonicalBeforeVirtualControlsInputOwner} from './virtualControlsInputOwnerContract.mjs'
import {canonicalBeforeReplayOwner} from './replayOwnerContract.mjs'
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/presentation-owner-transform-v1.json',import.meta.url),'utf8'))
const hash=b=>createHash('sha256').update(b).digest('hex'),actual=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8'),read=(p,provider)=>{const text=typeof provider==='function'?provider(p):provider[p];assert.equal(typeof text,'string',p+': synchronous real source required');return canonicalBeforeVirtualControlsInputOwner(canonicalBeforeReplayOwner(text,p,provider),p,provider)}
const once=(text,from,to,count)=>{assert(from.length>0);assert.equal(text.split(from).length-1,count,'Exact Presentation anchor '+from.slice(0,80));return text.split(from).join(to)}
const sf=(p,t)=>{const tree=ts.createSourceFile(p,t,ts.ScriptTarget.Latest,true);assert.equal(tree.parseDiagnostics.length,0);return tree}
function declaredFunctions(tree){const result=new Map();function visit(n){if(ts.isFunctionDeclaration(n)&&n.name&&n.body){assert(!result.has(n.name.text));result.set(n.name.text,n)}ts.forEachChild(n,visit)}visit(tree);return result}
function unqualify(p,text){for(const step of [...fixture.qualificationChanges].reverse())if(step.path===p)text=once(text,step.to,step.from,step.count);return text}
function wiringInverse(p,text){text=unqualify(p,text);const row=fixture.existingEdits.find(x=>x.path===p);assert(row,p);assert.equal(hash(text),row.afterSha256);for(const step of [...row.steps].reverse())text=once(text,step.to||step.inverseFrom,step.to?step.from:step.inverseTo,step.count);assert.equal(text,fixture.originals[p],p+': complete file/whole class inverse');return text}
function presentationProof(provider){
 const path='src/runtime/presentation.ts',original=fixture.originals[path],old=sf(path,original),currentText=read('src/runtime/presentationOwner.ts',provider),tree=sf('presentationOwner.ts',currentText),functions=declaredFunctions(tree),previous=declaredFunctions(old),proof=[]
 const initialText=unqualify('src/runtime/presentationOwner.ts',currentText);assert.equal(hash(initialText),fixture.owner.afterSha256,'Entire Owner scaffold including all wrappers/lifecycle and guards')
 const start=initialText.indexOf(fixture.owner.implementation),end=start+fixture.owner.implementation.length;assert(start>=0);assert.equal(initialText.split(fixture.owner.implementation).length-1,1);assert.equal(initialText.slice(start,end),fixture.owner.implementation)
 let expected=fixture.owner.originalImplementation
 for(const step of fixture.owner.implementationSteps){assert.equal(expected.split(step.from).length-1,step.count);expected=expected.split(step.from).join(step.to)}
 expected=expected.replaceAll('export function ','function ');assert.equal(expected,fixture.owner.implementation,'Complete original implementation with enumerated clock host and declaration moves only')
 for(const row of fixture.owner.originalNamedFunctions){const oldFn=previous.get(row.name),fn=functions.get(row.name);assert(oldFn&&fn,row.name);let body=fn.body.getText(tree);if(row.name==='captionNow')body=once(body,'host.nowMilliseconds()',"(typeof performance === 'undefined' ? Date.now() : performance.now())",1);assert.equal(body,oldFn.body.getText(old));assert.equal(hash(body),row.bodySha256);proof.push({name:row.name,sha256:hash(body)})}
 for(const text of fixture.owner.normalizerTexts)assert(currentText.includes(text),'One unchanged original normalizer declaration');assert(currentText.includes(fixture.owner.types),'All original public types exact')
 assert(currentText.includes('return '+fixture.owner.accessibilityLiteral+' }'));assert(currentText.includes('return '+fixture.owner.audioLiteral+' }'))
 const facade=read(path,provider),facadeFns=declaredFunctions(sf(path,facade))
 for(const name of ['loadRuntimeAccessibilitySettings','serializeRuntimeAccessibilitySettings','loadUiAudioSettings','serializeUiAudioSettings'])assert.equal(facadeFns.get(name).getText(),previous.get(name).getText(),'Original global configuration function '+name)
 const prefix=original.slice(0,original.indexOf('let captionClockSeconds')),restored=prefix+fixture.owner.originalImplementation;assert.equal(restored,original,'Complete presentation file (original header/types/Vue initializers + validated original implementation)')
 return {original:restored,functions:proof,clockChange:'Injected original monotonic fallback capability; no new clock/timer.',defaults:'Original accessibility/audio object literals exact; caption limits/duration math in original bodies.'}
}
export function validatePresentationOwnerMigration(provider=actual){
 for(const row of fixture.files)assert.equal(hash(read(row.path,provider)),row.sha256,'Unapproved actual Presentation source '+row.path)
 const p=presentationProof(provider),wiring=fixture.existingEdits.map(x=>({path:x.path,sha256:hash(wiringInverse(x.path,read(x.path,provider)))}))
 return {sourceFiles:fixture.files.length,createdFiles:fixture.createdFiles,functions:p.functions,wholePresentationSha256:hash(p.original),wiring,qualifiedDeltas:fixture.qualificationChanges.map(x=>({path:x.path,beforeSha256:x.beforeSha256,afterSha256:x.afterSha256,reason:x.reason}))}
}
export function canonicalBeforePresentationOwner(text,p,provider=actual){
 p=p.replaceAll('\\','/');const row=fixture.files.find(x=>x.path===p);if(!row)return canonicalBeforeReplayOwner(text,p,provider)
 if(row.beforeSha256&&hash(text)===row.beforeSha256)return text
 text=canonicalBeforeVirtualControlsInputOwner(canonicalBeforeReplayOwner(text,p,provider),p,provider)
 assert.equal(hash(text),row.sha256,'Unapproved known Presentation source '+p)
 if(p==='src/runtime/presentation.ts'){const scoped=name=>name===p?text:read(name,provider);validatePresentationOwnerMigration(scoped);return presentationProof(scoped).original}
 if(fixture.existingEdits.some(x=>x.path===p))return wiringInverse(p,text)
 // New Owner and Editor adapter have no previous file. Their complete bytes are guarded; old-source consumers never import them.
 return text
}
