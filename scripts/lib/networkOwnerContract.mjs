import fs from 'node:fs'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import {canonicalBeforeScriptDebugHotReloadSources,createScriptDebugHotReloadSourceReader} from './scriptDebugHotReloadSourceProjection.mjs'
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/network-owner-transform-v1.json',import.meta.url),'utf8'))
const sha=value=>crypto.createHash('sha256').update(value).digest('hex')
const rows=new Map(fixture.rows.map(row=>[row.path,row]))
const actualSource=path=>fs.readFileSync(path,'utf8')
export function validateNetworkOwner(sourceFor=actualSource){
 sourceFor=createScriptDebugHotReloadSourceReader(sourceFor)
 const proof=[]
 for(const row of fixture.rows){const value=sourceFor(row.path);assert.equal(typeof value,'string','Required linked network source '+row.path);assert.equal(sha(value),row.afterSha256,'Strict complete network candidate '+row.path);proof.push({path:row.path,sha256:sha(value)})}
 return {schema:fixture.schema,productionSources:proof,algorithmScopes:fixture.originalScopes,mechanicalDeclarations:fixture.algorithmInventory.length,exactWholeSourceInverse:fixture.rows.filter(row=>row.beforeText!==null).length}
}
export function canonicalBeforeNetworkOwner(value,path,sourceFor=actualSource){
 value=canonicalBeforeScriptDebugHotReloadSources(path,value,sourceFor)
 const row=rows.get(path)
 if(!row)return value
 assert.equal(typeof value,'string','Network canonical input '+path)
 if(row.beforeSha256&&sha(value)===row.beforeSha256)return value
 assert.equal(sha(value),row.afterSha256,'Unknown network migration source '+path)
 sourceFor=createScriptDebugHotReloadSourceReader(sourceFor)
 validateNetworkOwner(sourceFor)
 if(row.beforeText===null)return value // New strict Owner has no old implementation; old imports are removed by their exact inverse.
 assert.equal(sha(row.beforeText),row.beforeSha256,'Frozen exact network before '+path)
 return row.beforeText
}
export function networkOwnerMigrationFixture(){return fixture}
