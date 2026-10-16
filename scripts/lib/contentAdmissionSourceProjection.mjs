/** Strict complete Content2 proof. Historical qualification only; actual compilation stays current. */
import assert from 'node:assert/strict'
import {canonicalBeforeRuntimeWorldAdoption} from './runtimeWorldAdoptionSourceProjection.mjs'
import {readFileSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),fixture=JSON.parse(readFileSync(resolve(root,'scripts/fixtures/content-admission-transform-v1.json'),'utf8')),sha=s=>createHash('sha256').update(s).digest('hex')
export const contentAdmissionRows=Object.freeze(fixture.files.map(r=>Object.freeze({...r})))
export function validateContentAdmissionSources(readSource){
 const rows=fixture.files.map(r=>({...r,actualSha256:sha(canonicalBeforeRuntimeWorldAdoption(r.path,readSource(r.path),readSource))}));const after=rows.every(r=>r.actualSha256===r.afterSha256),before=rows.every(r=>r.actualSha256===r.beforeSha256)
 assert(after||before,'Content2: complete approved before or after; missing, unknown and partial states rejected')
 return {status:after?'APPROVED_AFTER':'APPROVED_BEFORE',rows:rows.map(r=>({path:r.path,actualSha256:r.actualSha256,beforeSha256:r.beforeSha256,afterSha256:r.afterSha256}))}
}
export function canonicalBeforeContentAdmission(file,source,readSource,allowQualifiedBefore=false){
 const row=fixture.files.find(r=>r.path===file);if(!row)return source
 source=canonicalBeforeRuntimeWorldAdoption(file,source,readSource)
 const proof=validateContentAdmissionSources(readSource);if(allowQualifiedBefore&&sha(source)===row.beforeSha256)return source;assert.equal(sha(source),proof.rows.find(r=>r.path===file).actualSha256,file+': selected and linked source agree')
 if(proof.status==='APPROVED_BEFORE')return source
 for(const stage of [...row.stages].reverse()){assert.equal(sha(source),stage.afterSha256);for(const op of [...stage.operations].reverse()){assert.equal(source.split(op.after).length-1,1,file+': unique inverse');source=source.replace(op.after,op.before)}assert.equal(sha(source),stage.beforeSha256)}
 assert.equal(sha(source),row.beforeSha256,file+': full old inverse');return source
}
