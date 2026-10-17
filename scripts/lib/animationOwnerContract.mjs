/** Exact cache/production proof helper. Source APIs are explicit and original algorithm bodies are reconstructed from the actual migration leaves. */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import ts from 'typescript'
import {canonicalBeforeRuntimeSaveOwner} from './runtimeSaveOwnerContract.mjs'
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/animation-owner-transform-v1.json',import.meta.url),'utf8')),hash=x=>createHash('sha256').update(x).digest('hex'),parse=(name,text)=>ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true)
const classNode=(sf,name)=>sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text===name),functionNode=(sf,name)=>sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name)
const once=(text,from,to)=>{assert.equal(text.split(from).length-1,1,'Exact unique anchor '+from.slice(0,70));return text.replace(from,to)}
const sourceDefault=relative=>fs.readFileSync(new URL('../../'+relative,import.meta.url),'utf8')
const rawSource=(relative,sourceFor=sourceDefault)=>{const text=typeof sourceFor==='function'?sourceFor(relative):sourceFor?.[relative]??sourceDefault(relative);assert.equal(typeof text,'string',relative+': actual synchronous source required');return text}
const normalizedSourceFor=(sourceFor=sourceDefault)=>relative=>canonicalBeforeRuntimeSaveOwner(rawSource(relative,sourceFor),relative,name=>rawSource(name,sourceFor))
function classInverse(source,name,contract){let text=classNode(parse(name,source),name).getText();for(const[from,to]of contract.guards)text=once(text,to,from);text=once(text,contract.extra,'');for(const[from,to]of [...contract.replacements].reverse())text=to==='this.animation'?text.replace(/this\.animation\b/g,from):text.replaceAll(to,from);return text}
const readerInverse=[['this.resources.resolveAsset(','resolveAsset('],['this.resources.readSource(','readTextAsset('],['this.resources.revision()','assetState.generation'],['this.animationCacheGeneration','animationCacheGeneration'],['this.cacheGeneration','cacheGeneration'],['this.clipCache','clipCache'],['this.controllerCache','controllerCache'],['this.maskCache','maskCache'],['this.cache','cache'],['this.refreshAnimationCaches(','refreshAnimationCaches('],['this.parseAsset(','parseAsset(']]
const authoringInverse=[['legacyAnimationAuthoring().createText(','createTextAsset('],['legacyAnimationAuthoring().writeText(','updateTextAsset('],['legacyAnimationAuthoring().assetReference(','assetReference('],['legacyAnimationDocuments().resources.resolveAsset(','resolveAsset(']]
const inverseReplacements=(text,rules)=>{for(const[from,to]of rules)text=text.replaceAll(from,to);return text}
function canonicalModule(relative,sourceFor){
 const before=fixture.originals[relative],sf=parse(relative,before),reader=classNode(parse('reader',sourceFor('src/runtime/animationTimelineDocumentReader.ts')),'AnimationTimelineDocumentReader'),ownerFile=relative.endsWith('/animation.ts')?'src/runtime/animationOwner.ts':'src/runtime/timelineOwner.ts',owner=parse(ownerFile,sourceFor(ownerFile)),facade=parse(relative,sourceFor(relative)),docs=parse('documents',sourceFor(relative.endsWith('/animation.ts')?'src/runtime/animationDocuments.ts':'src/runtime/timelineDocuments.ts'))
 const className=relative.endsWith('/animation.ts')?'AnimationRuntime':'TimelineRuntime',targetName=relative.endsWith('/animation.ts')?'AnimationOwner':'TimelineOwner',contract=relative.endsWith('/animation.ts')?fixture.mechanical.animation:fixture.mechanical.timeline,proof=[]
 const ranges=[]
 for(const node of sf.statements){let reconstructed=null
  if(ts.isClassDeclaration(node)&&node.name.text===className){reconstructed=classInverse(sourceFor(ownerFile),targetName,contract);assert.equal(reconstructed,node.getText(sf));proof.push({name:className,kind:'whole-class',sha256:hash(reconstructed)})}
  else if(ts.isFunctionDeclaration(node)&&node.body){const name=node.name.text,readMethod=reader.members.find(n=>ts.isMethodDeclaration(n)&&n.name.getText()===name),authoring=functionNode(facade,name),document=functionNode(docs,name)
   if(readMethod){const body=inverseReplacements(readMethod.body.getText(),readerInverse);assert.equal(body,node.body.getText());reconstructed=node.getText(sf).slice(0,node.body.getStart(sf)-node.getStart(sf))+body}
   else if(name==='setAnimatorParameter'){const parameter=functionNode(owner,'applyAnimatorParameterFromDocuments'),body=parameter.body.getText().replaceAll('documents.readAnimatorController(','readAnimatorController(');assert.equal(body,node.body.getText());reconstructed=node.getText(sf).slice(0,node.body.getStart(sf)-node.getStart(sf))+body}
   else if(authoring&&name!=='readTimeline'&&name!=='readAnimationClip'&&name!=='readAnimatorController'&&name!=='readAnimationMask'){reconstructed=inverseReplacements(authoring.getText(facade),authoringInverse);assert.equal(reconstructed,node.getText(sf))}
   else if(document){const body=document.body.getText();assert.equal(body,node.body.getText());reconstructed=node.getText(sf).slice(0,node.body.getStart(sf)-node.getStart(sf))+body}
   else throw new Error('ORIGINAL_ALGORITHM_NOT_ACCOUNTED '+relative+' '+name)
   proof.push({name,kind:'function',sha256:hash(reconstructed)})
  }
  if(reconstructed!==null)ranges.push({start:node.getStart(sf),end:node.end,text:reconstructed})
 }
 let rebuilt=before;for(const range of ranges.sort((a,b)=>b.start-a.start))rebuilt=rebuilt.slice(0,range.start)+range.text+rebuilt.slice(range.end)
 assert.equal(rebuilt,before);return{source:rebuilt,proof,scope:'All original top-level function bodies and complete Runtime classes; import/global-state skeleton changes explicitly frozen.'}
}
function canonicalUi(source){let text=source;text=once(text,"import {legacyAnimationUnwrap,requireLegacyAnimationTimelineOwner} from './animationTimelineLegacy'\nimport type {AnimationTimelineOwner} from './animationTimelineOwner'","import { toRaw } from 'vue'");const original=fixture.originals['src/runtime/timelineUiActions.ts'],sf=parse('ui',original),missing=sf.statements.find(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='./timeline').getText(),offset=original.indexOf(missing)
 text=text.replace('timelineUiOwner(sender: Entity, entities: Entity[], unwrap:(value:unknown)=>unknown=legacyAnimationUnwrap):','timelineUiOwner(sender: Entity, entities: Entity[]):').replaceAll('unwrap(','toRaw(')
 text=text.replace('dispatchTimelineUiAction(sender: Entity, value: string, entities: Entity[], suppliedRuntime?:AnimationTimelineOwner):','dispatchTimelineUiAction(sender: Entity, value: string, entities: Entity[]):')
 text=once(text,'  const runtime=suppliedRuntime??requireLegacyAnimationTimelineOwner();runtime.assertEntities(entities)\n  const result = timelineUiOwner(sender, entities,value=>runtime.toRaw(value)),','  const result = timelineUiOwner(sender, entities),')
 text=text.replaceAll('runtime.documents.readTimeline(','readTimeline(').replaceAll('runtime.timeline.','timelineRuntime.')
 assert.equal(text,original.slice(0,offset)+original.slice(offset+missing.length));text=text.slice(0,offset)+missing+text.slice(offset);assert.equal(text,original);return text
}
export function validateAnimationOwnerMigration(sourceFor=sourceDefault){sourceFor=normalizedSourceFor(sourceFor);for(const entry of fixture.files)assert.equal(hash(sourceFor(entry.path)),entry.sha256,'Unapproved candidate source '+entry.path);const animation=canonicalModule('src/runtime/animation.ts',sourceFor),timeline=canonicalModule('src/runtime/timeline.ts',sourceFor),ui=canonicalUi(sourceFor('src/runtime/timelineUiActions.ts'));return{animation:{sha256:hash(animation.source),proof:animation.proof},timeline:{sha256:hash(timeline.source),proof:timeline.proof},ui:{sha256:hash(ui)},sourceFiles:fixture.files.length}}
export function canonicalAnimationBeforeOwner(source,sourceFor=sourceDefault){const provider=file=>file==='src/runtime/animation.ts'?source:sourceFor(file);validateAnimationOwnerMigration(provider);return canonicalModule('src/runtime/animation.ts',provider).source}
export function canonicalTimelineBeforeOwner(source,sourceFor=sourceDefault){const provider=file=>file==='src/runtime/timeline.ts'?source:sourceFor(file);validateAnimationOwnerMigration(provider);return canonicalModule('src/runtime/timeline.ts',provider).source}
export function canonicalTimelineUiBeforeOwner(source){assert.equal(hash(source),fixture.files.find(x=>x.path==='src/runtime/timelineUiActions.ts').sha256);return canonicalUi(source)}
export function canonicalAnimationWiringBefore(relative,source,sourceFor=sourceDefault){source=canonicalBeforeRuntimeSaveOwner(source,relative,name=>rawSource(name,sourceFor));const delta=fixture.wiring.find(x=>x.path===relative);assert(delta);assert.equal(hash(source),delta.afterSha256);let text=source;for(const step of [...delta.steps].reverse()){if(step.to===''){assert.equal(step.count,1);text=text.slice(0,step.offset)+step.from+text.slice(step.offset)}else{assert.equal(text.split(step.to).length-1,step.count);text=text.replaceAll(step.to,step.from)}}assert.equal(hash(text),delta.beforeSha256);return text}

/** Path-aware static inverse. Historical compatibility is a closed set of complete verified source hashes.
 * Separate validateAnimationOwnerMigration always requires all 17 actual reviewed post sources. */
export function canonicalBeforeAnimationTimelineOwner(source,relative,sourceFor=sourceDefault){
 relative=relative.replaceAll('\\','/');source=canonicalBeforeRuntimeSaveOwner(source,relative,name=>rawSource(name,sourceFor));const row=fixture.files.find(value=>value.path===relative);if(!row)return source
 const digest=hash(source),earlier=fixture.acceptedEarlier.find(value=>value.path===relative)?.sha256??[]
 if(row.originalSha256&&(digest===row.originalSha256||earlier.includes(digest)))return source
 assert.equal(digest,row.sha256,'Unapproved Animation known source '+relative)
 if(fixture.wiring.some(value=>value.path===relative))return canonicalAnimationWiringBefore(relative,source)
 if(relative==='src/runtime/animation.ts')return canonicalAnimationBeforeOwner(source,sourceFor)
 if(relative==='src/runtime/timeline.ts')return canonicalTimelineBeforeOwner(source,sourceFor)
 if(relative==='src/runtime/timelineUiActions.ts')return canonicalTimelineUiBeforeOwner(source)
 return source
}
