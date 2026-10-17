/** Strict original 209575 AI algorithms plus complete new source skeletons. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import ts from 'typescript'
const hash=value=>createHash('sha256').update(value).digest('hex')
const fixture=()=>JSON.parse(readFileSync(new URL('../fixtures/ai-owner-transform-v1.json',import.meta.url),'utf8'))
export function validateAiOwnerMigration() {
 const contract=fixture(), inventories=[]
 for(const[path,expected]of Object.entries(contract.outputs)){
  const current=readFileSync(resolve(path),'utf8');assert.equal(current,expected.text,'Complete AI source skeleton changed: '+path);assert.equal(hash(current),expected.sha256)
  if(path==='src/runtime/aiOwner.ts'||path==='src/runtime/aiDocuments.ts'){
   const ast=ts.createSourceFile(path,current,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
   const visit=node=>{if(ts.isFunctionLike(node)&&node.body)inventories.push(hash(node.body.getText(ast)));ts.forEachChild(node,visit)};visit(ast)
  }
 }
 const available=new Map();for(const body of inventories)available.set(body,(available.get(body)??0)+1)
 for(const original of contract.originalFunctions){assert((available.get(original.sha256)??0)>0,'Original AI body missing: '+original.name);available.set(original.sha256,available.get(original.sha256)-1)}
 assert.equal(hash(contract.originalSource),contract.originalSha256)
 return {originalSha256:contract.originalSha256,originalFunctionDeclarations:20,originalTopLevelArrows:2,allOriginalFunctionBodies:contract.originalFunctions.length,completeSkeletons:Object.keys(contract.outputs),originalBodyBytesPreserved:true}
}
export function canonicalAiToolsBeforeOwner(source) {const contract=fixture();assert.equal(source,contract.outputs['src/runtime/aiTools.ts'].text);validateAiOwnerMigration();return contract.originalSource}
