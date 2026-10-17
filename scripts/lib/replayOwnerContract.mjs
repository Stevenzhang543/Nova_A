/** Strict Replay migration. This module never imports Virtual/Presentation/older migration helpers. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import ts from 'typescript'
import {canonicalBeforeTileMapOwner} from './tileMapOwnerContract.mjs'
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/replay-owner-transform-v1.json',import.meta.url),'utf8'))
assert.equal(fixture.schema,'nova-replay-owner-transform-v1');assert.equal(fixture.files.length,6)
const hash=b=>createHash('sha256').update(b).digest('hex'),actual=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8'),readRaw=(p,provider)=>{const text=typeof provider==='function'?provider(p):provider[p];assert.equal(typeof text,'string',p+': synchronous real linked source required');return text},read=(p,provider)=>canonicalBeforeTileMapOwner(p,readRaw(p,provider),q=>readRaw(q,provider)),key=p=>p.replaceAll('\\','/')
const parse=(p,text)=>{const tree=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true);assert.equal(tree.parseDiagnostics.length,0,p);return tree}
const once=(text,from,to,count)=>{assert(from.length>0);assert.equal(text.split(from).length-1,count,'Exact Replay inverse anchor '+from.slice(0,80));return text.split(from).join(to)}
function wiringInverse(text,p){for(const step of [...fixture.wiringSteps].reverse())if(step.path===p)text=once(text,step.to,step.from,step.count);const row=fixture.files.find(r=>r.path===p);assert.equal(text,row.before,'Entire pre-Replay file exact '+p);assert.equal(hash(text),row.beforeSha256);return text}
function proof(provider){
 const sources=new Map(fixture.files.map(row=>{const text=read(row.path,provider);assert.equal(hash(text),row.afterSha256,'Unapproved actual Replay source '+row.path);return[row.path,text]}))
 const old=parse('originalReplay.ts',fixture.originalReplay),owner=parse('replayOwner.ts',sources.get('src/runtime/replayOwner.ts')),oldFunctions=old.statements.filter(ts.isFunctionDeclaration),ownerClass=owner.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='ReplayOwner'),names=oldFunctions.map(n=>n.name.text)
 assert.equal(old.statements.length,19);assert.equal(oldFunctions.length,10);assert(ownerClass)
 const reverse=text=>{for(const name of names)text=text.split('this.'+name+'(').join(name+'(');for(const[from,to]of [['this.host.readReplaySettings()','productionSettings.replay'],['this.state','replayState'],['this.pendingInput','pendingInput'],['this.randomState','randomState']])text=text.split(from).join(to);return text},bodyProof=[]
 for(const original of oldFunctions){const name=original.name.text,current=name==='cloneInput'?owner.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name):ownerClass.members.find(n=>ts.isMethodDeclaration(n)&&n.name.getText(owner)===name);assert(current,name);const body=reverse(current.body.getText(owner));assert.equal(body,original.body.getText(old),'Entire original algorithm '+name);assert.equal(reverse(current.parameters.map(p=>p.getText(owner)).join(',')),original.parameters.map(p=>p.getText(old)).join(','),'Complete original signature/defaults '+name);assert.equal(hash(body),fixture.originalFunctions.find(r=>r.name===name).bodySha256);bodyProof.push({name,bodySha256:hash(body)})}
 for(const text of fixture.originalTypes)assert(sources.get('src/runtime/replayOwner.ts').includes(text),'Original type declaration exact')
 const facade=parse('replay.ts',sources.get('src/runtime/replay.ts'));for(const name of names.filter(n=>n!=='cloneInput')){const wrapper=facade.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert(wrapper,name);assert.equal(wrapper.body.statements.length,1);assert(wrapper.body.getText(facade).includes('requireLegacyReplayOwner().'+name+'('))}
 assert.equal(hash(fixture.originalReplay),fixture.files.find(r=>r.path==='src/runtime/replay.ts').beforeSha256)
 const wholeInverse=fixture.files.filter(r=>r.beforeSha256).map(row=>({path:row.path,sha256:hash(row.path==='src/runtime/replay.ts'?fixture.originalReplay:wiringInverse(sources.get(row.path),row.path))}))
 const imports=owner.statements.filter(ts.isImportDeclaration);for(const node of imports)if(!node.importClause?.isTypeOnly)assert.equal(node.moduleSpecifier.text,'../projects/projectFormat','No Editor default or hidden gameplay import')
 return {sourceFiles:6,createdFiles:fixture.files.filter(r=>!r.beforeSha256).map(r=>r.path),originalDeclarations:19,originalFunctions:bodyProof,wholeInverse,originalBounds:fixture.originalBounds,allSixLinkedActualSourcesVerified:true,noHelperCycles:true}
}
export function validateReplayOwnerMigration(provider=actual){return proof(provider)}
export function canonicalBeforeReplayOwner(text,p,provider=actual){
 p=key(p);const row=fixture.files.find(r=>r.path===p);if(!row)return canonicalBeforeTileMapOwner(p,text,q=>readRaw(q,provider))
 if(row.beforeSha256&&hash(text)===row.beforeSha256)return text
 text=canonicalBeforeTileMapOwner(p,text,q=>readRaw(q,provider))
 assert.equal(hash(text),row.afterSha256,'Unapproved known Replay source '+p)
 const scoped=name=>name===p?text:read(name,provider);proof(scoped)
 if(!row.beforeSha256)return text
 return p==='src/runtime/replay.ts'?fixture.originalReplay:wiringInverse(text,p)
}
