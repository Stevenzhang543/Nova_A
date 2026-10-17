/** Exact package-ID WorldHost connection, including admission and frozen receiver binding. */
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {canonicalBeforeAudioOwner} from './audioOwnerContract.mjs'
const fixture=JSON.parse(readFileSync(new URL('../fixtures/package-contract-host-transform-v1.json',import.meta.url),'utf8'))
const sha=b=>createHash('sha256').update(b).digest('hex'),key=p=>p.replaceAll('\\','/')
const actual=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8')
export function canonicalBeforePackageContractHost(source,path){
 source=canonicalBeforeAudioOwner(source,path)
 const row=fixture.rows.find(r=>r.path===key(path));if(!row)return source
 const digest=sha(source);if(digest===row.beforeSha256)return source
 assert.equal(digest,row.afterSha256,row.path+': exact reviewed package port source')
 for(const e of [...row.edits].reverse()){
  if(e.to==='')source=source.slice(0,e.position)+e.from+source.slice(e.position)
  else{assert.equal(source.split(e.to).length-1,e.count);source=source.split(e.to).join(e.from)}
 }
 assert.equal(sha(source),row.beforeSha256,row.path+': entire previous source inverse');return source
}
export function validatePackageContractHost(sourceFor=actual,linkedSourceFor=actual){
 const linkedSource=p=>fixture.rows.some(row=>row.path===key(p))?sourceFor(p):linkedSourceFor(p)
 return fixture.rows.map(row=>{
 let source=sourceFor(row.path);assert.equal(typeof source,'string');source=canonicalBeforeAudioOwner(source,row.path,linkedSource);assert.equal(sha(source),row.afterSha256,row.path+': actual full installed post source required')
 const before=canonicalBeforePackageContractHost(source,row.path);return {path:row.path,beforeSha256:sha(before),afterSha256:sha(source),mechanicalChanges:row.edits.length}
})}
