import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/script-debug-owner-transform-v1.json',import.meta.url),'utf8')),sha=x=>createHash('sha256').update(x).digest('hex'),rows=new Map(fixture.files.map(r=>[r.path,r]))
export function validateScriptDebugOwnerSources(readLinkedSource){
 if(typeof readLinkedSource!=='function')throw new Error('SCRIPT_DEBUG_LINKED_PROVIDER_REQUIRED')
 for(const r of rows.values()){let text;try{text=readLinkedSource(r.path)}catch{throw new Error('SCRIPT_DEBUG_LINKED_SOURCE_REQUIRED: '+r.path)}if(typeof text!=='string'||sha(text)!==r.sha256)throw new Error('SCRIPT_DEBUG_LINKED_SOURCE_MISMATCH: '+r.path)}
 return {files:rows.size,originalFunctions:fixture.originalFunctions.length,initialFields:fixture.originalFields.length}
}
export function canonicalBeforeScriptDebugOwner(path,source,readLinkedSource){
 const row=rows.get(path);if(!row)return source
 if(!row.new&&row.approvedHistoricalBeforeSha256.includes(sha(source)))return source
 if(sha(source)!==row.sha256)throw new Error('SCRIPT_DEBUG_SELECTED_SOURCE_MISMATCH: '+path)
 validateScriptDebugOwnerSources(readLinkedSource)
 if(row.new)return source
 let result=source;for(const step of [...row.steps].reverse()){assert.equal(result.split(step.to).length-1,1,'SCRIPT_DEBUG_EXACT_INVERSE_REQUIRED: '+step.label);result=result.replace(step.to,step.from)}assert.equal(sha(result),row.beforeSha256,'SCRIPT_DEBUG_WHOLE_BEFORE_MISMATCH: '+path);return result
}
export function createVerifiedScriptDebugSourceReader(readSource){validateScriptDebugOwnerSources(readSource);return path=>canonicalBeforeScriptDebugOwner(path,readSource(path),readSource)}
export const qualifiedScriptDebugSourceRows=Object.freeze([...rows.values()].map(Object.freeze))
