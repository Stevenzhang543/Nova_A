import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/script-hot-reload-owner-transform-v1.json',import.meta.url),'utf8')),sha=value=>createHash('sha256').update(value).digest('hex'),rows=new Map(fixture.files.map(row=>[row.path,row]))
export function validateScriptHotReloadOwnerSources(readLinkedSource){
 if(typeof readLinkedSource!=='function')throw new Error('HOT_RELOAD_LINKED_PROVIDER_REQUIRED')
 for(const row of rows.values()){let source;try{source=readLinkedSource(row.path)}catch{throw new Error('HOT_RELOAD_LINKED_SOURCE_REQUIRED: '+row.path)}if(typeof source!=='string'||sha(source)!==row.sha256)throw new Error('HOT_RELOAD_LINKED_SOURCE_MISMATCH: '+row.path)}
 return {files:rows.size,originalAlgorithms:fixture.algorithmNames.length,initialFields:fixture.initialFields.length}
}
export function canonicalBeforeScriptHotReloadOwner(path,source,readLinkedSource){
 const row=rows.get(path);if(!row)return source
 if(!row.new&&row.approvedHistoricalBeforeSha256.includes(sha(source)))return source
 if(sha(source)!==row.sha256)throw new Error('HOT_RELOAD_SELECTED_SOURCE_MISMATCH: '+path)
 validateScriptHotReloadOwnerSources(readLinkedSource)
 if(row.new)return source
 let result=source;for(const step of [...row.steps].reverse()){assert.equal(result.split(step.to).length-1,step.count,'HOT_RELOAD_EXACT_INVERSE_REQUIRED: '+step.label);result=result.replaceAll(step.to,step.from)}assert.equal(sha(result),row.beforeSha256,'HOT_RELOAD_WHOLE_BEFORE_MISMATCH: '+path);return result
}
/** UI normalization is independently guarded; it does not widen the seven-source owner whitelist. */
export function validateScriptHotReloadUiSource(readLinkedSource){
 validateScriptHotReloadOwnerSources(readLinkedSource)
 let source;try{source=readLinkedSource(fixture.ui.path)}catch{throw new Error('HOT_RELOAD_UI_SOURCE_REQUIRED')}
 if(typeof source!=='string'||sha(source)!==fixture.ui.sha256)throw new Error('HOT_RELOAD_UI_SOURCE_MISMATCH')
 return {files:1,wholeInverse:true}
}
export function canonicalBeforeScriptHotReloadUi(path,source,readLinkedSource){
 if(path!==fixture.ui.path)return source
 if(fixture.ui.approvedHistoricalBeforeSha256.includes(sha(source)))return source
 if(sha(source)!==fixture.ui.sha256)throw new Error('HOT_RELOAD_UI_SELECTED_SOURCE_MISMATCH')
 validateScriptHotReloadUiSource(readLinkedSource)
 let result=source;for(const step of [...fixture.ui.steps].reverse()){assert.equal(result.split(step.to).length-1,1,'HOT_RELOAD_UI_EXACT_INVERSE_REQUIRED');result=result.replace(step.to,step.from)}assert.equal(sha(result),fixture.ui.beforeSha256,'HOT_RELOAD_UI_WHOLE_BEFORE_MISMATCH');return result
}
export const qualifiedScriptHotReloadUiSourceRow=Object.freeze(fixture.ui)
export function createVerifiedScriptHotReloadSourceReader(readSource){validateScriptHotReloadOwnerSources(readSource);validateScriptHotReloadUiSource(readSource);return path=>path===fixture.ui.path?canonicalBeforeScriptHotReloadUi(path,readSource(path),readSource):canonicalBeforeScriptHotReloadOwner(path,readSource(path),readSource)}
export const qualifiedScriptHotReloadSourceRows=Object.freeze([...rows.values()].map(Object.freeze))
