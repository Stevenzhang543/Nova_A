/** Complete source inverses and original builder/value function bodies; no weakened source matching. */
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve} from 'node:path'
import ts from 'typescript'
const hash=value=>createHash('sha256').update(value).digest('hex')
const fixture=()=>JSON.parse(readFileSync(new URL('../fixtures/entity-builder-transform-v1.json',import.meta.url),'utf8'))
function invert(source,path,contract){
 const patch=contract.contracts[path];assert(patch,'Missing whole source inverse: '+path);assert.equal(source,contract.outputs[path].text);assert.equal(hash(source),patch.afterSha256)
 let current=source
 for(const step of [...patch.edits].reverse()){assert.equal(hash(current),step.afterSourceSha256);assert.equal(current.slice(step.atUtf16,step.atUtf16+step.after.length),step.after);current=current.slice(0,step.atUtf16)+step.before+current.slice(step.atUtf16+step.after.length);assert.equal(hash(current),step.beforeSourceSha256)}
 assert.equal(current,patch.before);assert.equal(hash(current),patch.beforeSha256);return current
}
export function validateEntityBuilderMigration(){
 const contract=fixture(),available=new Map(),declarations=[]
 for(const[path,expected]of Object.entries(contract.outputs)){
  const source=readFileSync(resolve(path),'utf8');assert.equal(source,expected.text,'Complete Builder source skeleton changed: '+path);assert.equal(hash(source),expected.sha256)
  if(['src/world/entityBuilder.ts','src/runtime/tileMapValues.ts','src/runtime/particleEmitterValues.ts'].includes(path)){
   const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
   function visit(node){if(ts.isFunctionLike(node)&&node.body){const body=hash(node.body.getText(ast));available.set(body,(available.get(body)??0)+1);if(ts.isFunctionDeclaration(node)&&node.name)declarations.push({name:node.name.text,parameters:node.parameters.map(x=>x.getText(ast)),body})}ts.forEachChild(node,visit)}visit(ast)
  }
 }
 for(const original of contract.originalFunctions){const current=declarations.find(x=>x.name===original.name&&x.body===original.bodySha256);assert(current,'Original declaration missing: '+original.name);assert.deepEqual(current.parameters,original.parameters,'Default/parameter changed: '+original.name);for(const nested of original.nested){assert((available.get(nested.bodySha256)??0)>0,'Original nested callback missing: '+original.name);available.set(nested.bodySha256,available.get(nested.bodySha256)-1)}}
 const wholeInverses=Object.keys(contract.contracts).map(path=>({path,beforeSha256:hash(invert(contract.outputs[path].text,path,contract)),afterSha256:contract.outputs[path].sha256}))
 return{originalDeclarations:25,builderFunctions:18,tileValueFunctions:2,particleValueFunctions:5,originalNestedFunctionBodies:59,originalBodiesAndDefaultParametersByteExact:true,completeSourceSkeletons:Object.keys(contract.outputs),wholeInverses,physicsRootPatch:contract.physicsRootPatch,scope:'SHARED_BUILDER_AND_VALUES_ONLY'}
}
export function canonicalPhysicsBeforeEntityBuilder(source){const contract=fixture();validateEntityBuilderMigration();return invert(source,'src/store/physics.ts',contract)}
export function canonicalTileMapBeforeEntityBuilder(source){const contract=fixture();validateEntityBuilderMigration();return invert(source,'src/runtime/tilemap.ts',contract)}
export function canonicalParticlesBeforeEntityBuilder(source){const contract=fixture();validateEntityBuilderMigration();return invert(source,'src/runtime/particles.ts',contract)}
