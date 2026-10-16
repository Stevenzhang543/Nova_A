import { canonicalBeforeM1OwnerIntegration } from './m1OwnerIntegrationContract.mjs'
/** Cache proposal. Root may install this helper/fixture only after review.
 * Strict final sources and all 121 original bodies, not a relaxed source filter. */
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {resolve} from 'node:path'
import ts from 'typescript'

const sha=value=>createHash('sha256').update(value).digest('hex')
// When installed, Root changes this one data URL to scripts/fixtures.
const contract=JSON.parse(readFileSync(new URL('../fixtures/navigation-owner-transform-v1.json',import.meta.url),'utf8'))
assert.equal(contract.schema,'NovaNavigationWholeOwnerContractV1')
assert.equal(Object.keys(contract.files).length,6)
assert.equal(contract.originalBodies.length,121)
function undo(source,edits){
  for(const edit of [...edits].reverse()){
    assert.equal(sha(source),edit.afterSourceSha256,'Every whole-stage final hash is required')
    assert.equal(source.slice(edit.atUtf16,edit.atUtf16+edit.after.length),edit.after,'Exact approved boundary')
    source=source.slice(0,edit.atUtf16)+edit.before+source.slice(edit.atUtf16+edit.after.length)
    assert.equal(sha(source),edit.beforeSourceSha256,'Exact whole-stage previous hash')
  }
  return source
}
/** Optional explicit sources are for rejected-change proof fixtures, never fallback modules. */
export function validateNavigationOwnerMigration(sourceSet){
  const moduleHashes={},available=[],wholeInverse=[]
  for(const [path,row] of Object.entries(contract.files)){
    const source=canonicalBeforeM1OwnerIntegration(sourceSet?.[path]??readFileSync(resolve(path),'utf8'),path)
    assert.equal(source,row.after,path+': complete reviewed source/skeleton changed')
    assert.equal(sha(source),row.afterSha256)
    let restored=source,actualMechanical=source
    for(let index=row.phases.length-1;index>=0;index--){
      restored=undo(restored,row.phases[index].edits)
      if(index===1)actualMechanical=restored
    }
    if(row.phases.length===1)actualMechanical=source
    assert.equal(restored,row.before,path+': complete source inverse changed')
    assert.equal(sha(restored),row.beforeSha256)
    moduleHashes[path]=sha(source)
    wholeInverse.push({path,beforeSha256:sha(restored),afterSha256:sha(source)})
    assert.equal(actualMechanical,contract.mechanicalBodySources[path],path+': mechanical implementation must recover from actual final source')
    const originalAlgorithmSource=actualMechanical
    const file=ts.createSourceFile(path,originalAlgorithmSource,ts.ScriptTarget.Latest,true)
    const visit=node=>{if(ts.isFunctionLike(node)&&node.body)available.push(sha(originalAlgorithmSource.slice(node.body.getStart(file),node.body.end)));ts.forEachChild(node,visit)}
    visit(file)
  }
  for(const fn of contract.originalBodies){const index=available.indexOf(fn.bodySha256);assert(index>=0,'Original body missing: '+fn.name);available.splice(index,1)}
  return {originalBodies:121,completeSkeletons:6,wholeInverse,moduleHashes,explicitNonMechanicalLifecycleDelta:true,defaultMathClock:'Recovered exactly; no timing/default/geometry/physical algorithm repair.'}
}
function canonical(path,source,sourceSet){
  source=canonicalBeforeM1OwnerIntegration(source,path)
  const row=contract.files[path];assert(row)
  validateNavigationOwnerMigration(sourceSet)
  const digest=sha(source)
  if(digest===row.beforeSha256||(contract.allowedEarlier[path]??[]).includes(digest))return source
  assert.equal(source,row.after,path+': full Navigation migration must be present')
  let restored=source
  for(const phase of [...row.phases].reverse())restored=undo(restored,phase.edits)
  assert.equal(restored,row.before)
  assert.equal(sha(restored),row.beforeSha256)
  return restored
}
export const canonicalWorldGameplayBeforeNavigation=(source,sourceSet)=>canonical('src/runtime/worldGameplayOwner.ts',source,sourceSet)
export const canonicalEditorWorldGameplayBeforeNavigation=(source,sourceSet)=>canonical('src/editor/worldGameplayAdapter.ts',source,sourceSet)
export const canonicalNavigation2dBeforeOwner=(source,sourceSet)=>canonical('src/runtime/navigation2d.ts',source,sourceSet)
export const canonicalNavigationGeometryBeforeOwner=(source,sourceSet)=>canonical('src/runtime/navigationGeometry.ts',source,sourceSet)
