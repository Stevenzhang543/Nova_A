import { canonicalBeforeM1OwnerIntegration } from './m1OwnerIntegrationContract.mjs'
/** Synchronous exact migration proof: all moved algorithms and surrounding declarations participate. */
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import ts from 'typescript'
import { canonicalWorldGameplayBeforeAi } from './aiIntegrationContract.mjs'
import { canonicalPhysicsBeforeEntityRemoval } from './entityRemovalContract.mjs'

const hash=value=>createHash('sha256').update(value).digest('hex')
const fixture=JSON.parse(readFileSync(new URL('../fixtures/runtime-objects-owner-transform-v1.json',import.meta.url),'utf8'))
assert.equal(fixture.schema,'nova-runtime-objects-transform-v1')
assert.equal(fixture.bodies.length,21)
assert.equal(Object.keys(fixture.ownerSkeletons).length,4)
for(const row of Object.values(fixture.files))assert.equal(hash(row.original),row.originalSha256)

function implementations(path,source){
  const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true),result=new Map()
  const add=node=>{if(!node.body)return;const originalName=node.name.getText(file),name=originalName==='instantiateEntityBundleInWorld'?'instantiateEntityBundle':originalName;assert(!result.has(name),path+': duplicate algorithm '+name);result.set(name,node.body)}
  for(const node of file.statements){
    if(ts.isFunctionDeclaration(node)&&node.name)add(node)
    if(ts.isClassDeclaration(node))for(const method of node.members){if(!ts.isMethodDeclaration(method))continue;if(node.name?.text==='DynamicObjectsOwner'&&method.name.getText(file)==='runtimeSceneEntitySnapshots')continue;add(method)}
  }
  return{file,result}
}

function inverseBody(body,row){
  let expected=row.originalBody
  const stages=[]
  for(const edit of row.edits){
    assert(edit.after,'No empty-token algorithm inverse is allowed')
    const previous=expected
    if(edit.prefix){assert(expected.startsWith(edit.before));expected=edit.after+expected.slice(edit.before.length)}
    else{assert.equal(expected.split(edit.before).length-1,edit.count,row.name+': exact approved input delta '+edit.before);expected=expected.replaceAll(edit.before,edit.after)}
    stages.push({before:previous,after:expected})
  }
  assert.equal(body,expected,row.name+': complete algorithm differs from explicit mechanical deltas')
  // Whole-stage reversal disambiguates identical tokens inserted by earlier explicit deltas.
  let restored=body
  for(const stage of stages.reverse()){assert.equal(restored,stage.after);restored=stage.before}
  assert.equal(restored,row.originalBody,row.name+': original algorithm changed')
  assert.equal(hash(restored),row.originalBodySha256)
  return restored
}

function proof(ownerSources){
  const restored=new Map(),moduleHashes={}
  for(const[path,contract]of Object.entries(fixture.ownerSkeletons)){
    const source=ownerSources?.[path]??readFileSync(new URL('../../'+path,import.meta.url),'utf8'),{file,result}=implementations(path,source),selected=contract.bodyNames.map(name=>({name,body:result.get(name)}))
    assert(selected.every(row=>row.body),path+': every original implementation is required')
    let skeleton=source
    for(const{name,body}of [...selected].sort((a,b)=>b.body.getStart(file)-a.body.getStart(file)))skeleton=skeleton.slice(0,body.getStart(file))+`/* ORIGINAL_BODY:${name} */`+skeleton.slice(body.end)
    assert.equal(skeleton,contract.skeleton,path+': exact declarations, wrappers, signatures and ownership guards changed')
    for(const{name,body}of selected){const row=fixture.bodies.find(item=>item.name===name);assert(row);assert(!restored.has(name),name+': duplicated original implementation');restored.set(name,inverseBody(body.getText(file),row))}
    moduleHashes[path]=hash(source)
  }
  assert.equal(restored.size,21,'Exactly all 21 original implementations must participate')
  return{restored,moduleHashes}
}

/** An optional explicit source set is only for bad-change proof tests; production defaults read all four actual modules. */
export function validateRuntimeObjectsOwnerMigration(ownerSources){const{moduleHashes}=proof(ownerSources);return{schema:'nova-runtime-objects-migration-proof-v1',algorithms:21,ownerSkeletons:4,moduleHashes}}

function restoreFile(path,source,ownerSources){
  const contract=fixture.files[path]
  if(hash(source)===contract.originalSha256)return source
  assert.equal(hash(source),contract.currentSha256,path+': reviewed complete source differs')
  const{restored}=proof(ownerSources),{file,result}=implementations(path,contract.original),edits=[]
  for(const row of fixture.bodies.filter(row=>row.origin===path)){const body=result.get(row.name);assert(body);edits.push({body,restored:restored.get(row.name)})}
  // Authoring functions were not moved. Read their actual current bodies, never a replacement algorithm.
  if(path==='src/store/physics.ts'||path==='src/runtime/prefabs.ts'){
    const current=implementations(path,source),moved=new Set(edits.map(row=>row.body))
    for(const[name,body]of result){if(moved.has(body))continue;const actual=current.result.get(name);assert(actual,path+': original authoring function missing '+name);const actualBody=actual.getText(current.file);assert.equal(actualBody,body.getText(file),path+': original authoring body changed '+name);edits.push({body,restored:actualBody})}
  }
  let output=contract.original
  for(const{body,restored:actual}of edits.sort((a,b)=>b.body.getStart(file)-a.body.getStart(file)))output=output.slice(0,body.getStart(file))+actual+output.slice(body.end)
  assert.equal(hash(output),contract.originalSha256,path+': entire original file must roundtrip byte for byte')
  return output
}
export function canonicalPhysicsBeforeRuntimeObjects(source,ownerSources){if(hash(source)!==fixture.files['src/store/physics.ts'].originalSha256)source=canonicalPhysicsBeforeEntityRemoval(source);return restoreFile('src/store/physics.ts',source,ownerSources)}
export function canonicalPrefabsBeforeRuntimeObjects(source,ownerSources){return restoreFile('src/runtime/prefabs.ts',source,ownerSources)}
export function canonicalDynamicObjectsBeforeOwner(source,ownerSources){return restoreFile('src/runtime/dynamicObjects.ts',source,ownerSources)}
export function canonicalObjectPoolBeforeOwner(source,ownerSources){return restoreFile('src/runtime/objectPool.ts',source,ownerSources)}

export function canonicalWorldGameplayBeforeRuntimeObjects(source){
  source=canonicalBeforeM1OwnerIntegration(source,'src/runtime/worldGameplayOwner.ts')
  source=canonicalWorldGameplayBeforeAi(source)
  const path='src/runtime/worldGameplayOwner.ts',contract=fixture.files[path]
  if(hash(source)===contract.originalSha256)return source
  let expected=contract.original
  for(const edit of fixture.worldEdits){assert.equal(expected.split(edit.before).length-1,edit.count,path+': exact composition input');expected=expected.replaceAll(edit.before,edit.after)}
  assert.equal(hash(expected),contract.currentSha256)
  assert.equal(source,expected,path+': only explicit fixed-World composition edits are permitted')
  const before=implementations(path,contract.original),current=implementations(path,source),edits=[]
  assert.equal(current.result.size,before.result.size,'Original WorldGameplay method set must remain complete')
  for(const[name,body]of before.result){const actual=current.result.get(name);assert(actual);let restored=actual.getText(current.file);const old=body.getText(before.file),count=old.split('this.ports.pool').length-1;if(count){assert.equal(restored.split('this.objectPoolOwner').length-1,count,name+': exact original pool calls');restored=restored.replaceAll('this.objectPoolOwner','this.ports.pool')}assert.equal(restored,old,name+': original WorldGameplay algorithm changed');edits.push({body,restored})}
  let output=contract.original
  for(const{body,restored}of edits.sort((a,b)=>b.body.getStart(before.file)-a.body.getStart(before.file)))output=output.slice(0,body.getStart(before.file))+restored+output.slice(body.end)
  assert.equal(hash(output),contract.originalSha256,'Entire WorldGameplay source must restore exactly')
  return output
}
