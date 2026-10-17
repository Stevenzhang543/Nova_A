/** Strict virtual-control input binding inverse. This layer never imports Presentation or other migration helpers. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import ts from 'typescript'
import {canonicalBeforeTileMapOwner} from './tileMapOwnerContract.mjs'
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/virtual-controls-input-owner-transform-v1.json',import.meta.url),'utf8'))
assert.equal(fixture.schema,'nova-virtual-controls-input-owner-transform-v1');assert.equal(fixture.files.length,3)
const hash=b=>createHash('sha256').update(b).digest('hex'),actual=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8'),readRaw=(p,provider)=>{const text=typeof provider==='function'?provider(p):provider[p];assert.equal(typeof text,'string',p+': synchronous actual source required');return text},read=(p,provider)=>canonicalBeforeTileMapOwner(p,readRaw(p,provider),q=>readRaw(q,provider)),pathKey=p=>p.replaceAll('\\','/')
const parse=(p,text)=>{const tree=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true);assert.equal(tree.parseDiagnostics.length,0,p);return tree}
function script(text){const start=text.indexOf('<script setup lang="ts">')+'<script setup lang="ts">'.length,end=text.indexOf('</script>',start);assert(start>=23&&end>start);return text.slice(start,end)}
function functions(p,text){const tree=parse(p,text),result=new Map();function visit(node){if(ts.isFunctionDeclaration(node)&&node.name&&node.body){assert(!result.has(node.name.text));result.set(node.name.text,{body:node.body.getText(tree),declaration:node.getText(tree)})}ts.forEachChild(node,visit)}visit(tree);return result}
function block(text,name){const start=text.indexOf('<'+name),open=text.indexOf('>',start),end=text.indexOf('</'+name+'>',open);assert(start>=0&&open>=start&&end>open);return text.slice(open+1,end)}
function inverse(text,p){for(const step of [...fixture.steps].reverse())if(step.path===p){assert.equal(text.split(step.newText).length,2,'unique Virtual inverse '+p);text=text.replace(step.newText,step.oldText)}const row=fixture.files.find(r=>r.path===p);assert.equal(text,row.before,'complete actual file inverse '+p);assert.equal(hash(text),row.beforeSha256);return text}
function proof(provider){
 const current=new Map(fixture.files.map(row=>{const text=read(row.path,provider);assert.equal(hash(text),row.afterSha256,'Unapproved actual Virtual source '+row.path);return[row.path,text]})),overlayPath='src/components/VirtualControlsOverlay.vue',ownerPath='src/runtime/virtualControlsInputOwner.ts',canvasPath='src/components/WorldCanvas.vue',overlay=current.get(overlayPath),owner=current.get(ownerPath),old=fixture.files.find(r=>r.path===overlayPath).before
 assert.equal(block(overlay,'template'),block(old,'template'),'Entire visual template unchanged');assert.equal(block(overlay,'style'),block(old,'style'),'Entire styles/normal and Reduced CSS unchanged')
 const previous=functions('oldOverlay.ts',script(old)),next=functions('actualOverlay.ts',script(overlay)),fresh=functions(ownerPath,owner),preserved=[]
 for(const row of fixture.preservedFunctions){assert.equal(next.get(row.name).declaration,previous.get(row.name).declaration,'Entire original event/math declaration '+row.name);assert.equal(hash(next.get(row.name).declaration),row.beforeSha256);preserved.push({name:row.name,sha256:row.beforeSha256})}
 assert.equal(previous.size,12);assert.equal(preserved.length,10);assert.equal(fresh.get('recomputeAction').declaration,previous.get('recomputeAction').declaration,'Actual unique complete original recompute algorithm')
 const algorithm=old.slice(old.indexOf('/** 累加同动作控件'),old.indexOf('/** 记录控件值'));assert.equal(hash(algorithm),fixture.algorithmSha256);assert.equal(owner.split(algorithm).length,2,'Unique original algorithm body')
 const tree=parse(ownerPath,owner);assert.equal(tree.statements.filter(ts.isImportDeclaration).length,0,'Pure structural module has no imports');assert(!/\bimport\s*\(|\brequire\s*\(/.test(owner),'No hidden value import')
 assert(owner.includes('for (const action of ownedActions) input.releaseVirtualAction(action)'));assert(owner.includes('previous?.dispose()'));assert(owner.includes('if (bindings.get(input) === result) bindings.delete(input)'));assert(overlay.includes("{ flush: 'pre' }"),'Bind complete prop tuple before update')
 return{sourceFiles:3,preservedFunctionDeclarations:preserved,originalRecomputeBodySha256:hash(fresh.get('recomputeAction').body),wholeInverse:[overlayPath,canvasPath].map(p=>({path:p,beforeSha256:hash(inverse(current.get(p),p))})),pureValueImports:0,templateSha256:hash(block(overlay,'template')),styleSha256:hash(block(overlay,'style'))}
}
export function validateVirtualControlsInputOwner(provider=actual){return proof(provider)}
export function canonicalBeforeVirtualControlsInputOwner(text,p,provider=actual){
 p=pathKey(p);const row=fixture.files.find(r=>r.path===p);if(!row)return text
 if(row.beforeSha256&&hash(text)===row.beforeSha256)return text
 text=canonicalBeforeTileMapOwner(p,text,q=>readRaw(q,provider))
 assert.equal(hash(text),row.afterSha256,'Unapproved known Virtual source '+p)
 const scoped=name=>name===p?text:read(name,provider);proof(scoped)
 return row.beforeSha256?inverse(text,p):text
}
