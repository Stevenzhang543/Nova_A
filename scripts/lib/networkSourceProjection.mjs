/** Exact Network -> actual652 projection; independent of all older migration helpers. */
import fs from 'node:fs'
import {canonicalBeforeRuntimeWorldAdoption} from './runtimeWorldAdoptionSourceProjection.mjs'
import assert from 'node:assert/strict'
import { canonicalSelected as canonicalSceneSelected, sceneOwnerFixture } from './sceneOwnerSourceProjection.mjs'
import {createHash} from 'node:crypto'
import {canonicalBeforeScriptDebugHotReloadSources,createScriptDebugHotReloadSourceReader} from './scriptDebugHotReloadSourceProjection.mjs'
import {canonicalBeforeNetworkOwner,networkOwnerMigrationFixture,validateNetworkOwner} from './networkOwnerContract.mjs'
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/network-source-projection-history-v1.json',import.meta.url),'utf8'))
assert.equal(fixture.schema,'nova-network-source-projection-history-v1')
const sha=value=>createHash('sha256').update(value).digest('hex'),key=p=>p.replaceAll('\\','/'),history=new Map(fixture.history.map(r=>[r.path,new Set(r.accepted.map(h=>h.sha256))])),rows=new Map(networkOwnerMigrationFixture().rows.map(r=>[r.path,r]))
// Only the exact latest Scene post-image is normalized here. Closed earlier
// inputs continue to their unchanged historical guards; this is not an installed-source gate.
const scenePostimages=new Map(sceneOwnerFixture.files.map(row=>[row.path,row.afterSha256]))
function beforeSceneForExistingContracts(source,path,read){if(scenePostimages.get(path)!==sha(source))return source;return canonicalSceneSelected(path,source,read)}

const read=(provider,p)=>{assert.equal(typeof provider,'function','NETWORK_LINKED_PROVIDER_REQUIRED');const value=provider(p);assert.equal(typeof value,'string',p+': synchronous full linked source required');return value}
export function networkSourceHistoricalEvidence(){return fixture}
export function canonicalBeforeNetworkSources(path,source,readLinkedSource){
 path=key(path);assert.equal(typeof source,'string',path+': full source required');source=canonicalBeforeRuntimeWorldAdoption(path,source,readLinkedSource);source=beforeSceneForExistingContracts(source,path,readLinkedSource);source=canonicalBeforeScriptDebugHotReloadSources(path,source,readLinkedSource)
 const row=rows.get(path);if(!row)return source
 if(history.get(path)?.has(sha(source)))return source
 readLinkedSource=createScriptDebugHotReloadSourceReader(readLinkedSource)
 const projected=canonicalBeforeNetworkOwner(source,path,readLinkedSource)
 assert.equal(sha(projected),row.beforeSha256??row.afterSha256,path+': exact Network inverse output')
 return projected
}
export function createNetworkSourceReader(readSource){assert.equal(typeof readSource,'function','NETWORK_LINKED_PROVIDER_REQUIRED');return path=>canonicalBeforeNetworkSources(path,read(readSource,path),readSource)}
/** Fresh actual19 source gate, separated from closed historical-input normalization. */
export function createVerifiedNetworkSourceReader(readSource){validateNetworkOwner(path=>read(readSource,path));return createNetworkSourceReader(readSource)}
