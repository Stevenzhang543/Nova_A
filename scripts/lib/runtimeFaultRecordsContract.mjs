/** Strict application Fault5 relocation contract. One fixed fixture and synchronous actual sources; no mutable normalizer or registry. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {canonicalBeforeNetworkSources} from './networkSourceProjection.mjs'
import {createHash} from 'node:crypto'
import ts from 'typescript'
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/runtime-fault-records-transform-v1.json',import.meta.url),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex'),actual=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8'),rows=new Map(fixture.files.map(r=>[r.path,r]))
const source=(path,provider)=>{const text=typeof provider==='function'?provider(path):provider[path];assert.equal(typeof text,'string',path+': synchronous actual source required');return canonicalBeforeNetworkSources(path,text,p=>typeof provider==='function'?provider(p):provider[p])}
const once=(text,from,to)=>{assert.equal(text.split(from).length-1,1,'Exact Fault anchor '+from.slice(0,80));return text.replace(from,to)}
function ownerProof(text){
 const sf=ts.createSourceFile('runtimeFaultRecords.ts',text,ts.ScriptTarget.Latest,true),functions=new Map(sf.statements.filter(ts.isFunctionDeclaration).map(n=>[n.name.text,text.slice(n.getFullStart(),n.end)])),original=[]
 for(const row of fixture.originalEight){assert.equal(functions.get(row.name),row.text,'Entire original Fault declaration/default/body '+row.name);original.push({name:row.name,sha256:sha(functions.get(row.name))})}
 let inverse=once(text,fixture.v3ToV2.after,fixture.v3ToV2.before)
 for(const[before,after]of[...fixture.v2ToV1].reverse())inverse=once(inverse,after,before)
 inverse=once(inverse,fixture.imports.after,fixture.imports.before)
 inverse=once(inverse,fixture.statePort,fixture.stateBefore)
 assert.equal(inverse,fixture.originals['src/runtime/faultCenter.ts'],'Complete actual Owner inverse to original Fault source, including types/defaults/globals/comments')
 return{source:inverse,originalEight:original,wholeOriginalSha256:sha(inverse)}
}
function oldInverse(path,text,provider){
 if(path==='src/runtime/faultCenter.ts')return ownerProof(source('src/runtime/runtimeFaultRecords.ts',provider)).source
 if(path==='src/store/editor.ts'){const value=once(text,fixture.categoryAfter,fixture.category);assert.equal(value,fixture.originals[path],'Entire Editor log/type source inverse');return value}
 if(path==='src/runtime/productionRuntime.ts'){const value=once(text,"from './runtimeFaultRecords'","from './faultCenter'");assert.equal(value,fixture.originals[path],'Entire production networking/RPC/start/stop source inverse');return value}
 return text
}
export function validateRuntimeFaultRecords(provider=actual){
 const current=Object.fromEntries(fixture.files.map(r=>[r.path,source(r.path,provider)]))
 for(const row of fixture.files)assert.equal(sha(current[row.path]),row.sha256,'Unapproved entire actual Fault source '+row.path)
 const read=p=>current[p]??source(p,provider),owner=ownerProof(read('src/runtime/runtimeFaultRecords.ts'))
 assert.equal(read('src/contracts/applicationLog.ts'),fixture.category+'\n','Exact original finite category union')
 const restored=fixture.files.filter(r=>r.beforeSha256).map(row=>{const inverse=oldInverse(row.path,current[row.path],read);assert.equal(sha(inverse),row.beforeSha256);return{path:row.path,beforeSha256:row.beforeSha256,inverseSha256:sha(inverse)}})
 return{sourceFiles:fixture.files.length,newModules:fixture.files.filter(r=>r.beforeSha256===null).length,originalFunctionDeclarations:owner.originalEight,wholeOriginalFaultSha256:owner.wholeOriginalSha256,restored,limits:fixture.limits}
}
export function canonicalBeforeRuntimeFaultRecords(text,path,provider=actual){
 path=path.replaceAll('\\','/');const row=rows.get(path);if(!row)return text
 assert.equal(typeof text,'string',path+': explicit complete source required');let digest=sha(text)
 if(row.acceptedEarlierSha256.includes(digest))return text
 text=canonicalBeforeNetworkSources(path,text,p=>typeof provider==='function'?provider(p):provider[p]);digest=sha(text)
 assert.equal(digest,row.sha256,'Unapproved known Fault source '+path)
 const scoped=p=>p===path?text:source(p,provider)
 validateRuntimeFaultRecords(scoped)
 return oldInverse(path,text,scoped)
}
