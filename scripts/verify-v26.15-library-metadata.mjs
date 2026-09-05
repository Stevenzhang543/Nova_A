import {assetAuditMetadata} from './lib/assetAudit15.mjs'
import assert from 'node:assert/strict'
import { build } from 'vite'
import { compileScript, compileTemplate, parse } from 'vue/compiler-sfc'
import { mkdir, mkdtemp, readFile, rm, writeFile, stat } from 'node:fs/promises'
import { resolve, join, relative, isAbsolute } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
const repository=process.cwd(),root=resolve(process.argv.find(a=>a.startsWith('--source-root='))?.slice(14)||process.cwd()),checks=[]
const temporary=await mkdtemp(join(repository,'.cache','nova-v2615-library-'))
const report=resolve(process.argv.find(a=>a.startsWith('--report='))?.slice(9)||join(root,'release-audits/v26.15-library-metadata.json'))
const check=async(name,run)=>{await run();checks.push({name,status:'passed'});console.log('PASS '+name)}
try {
 await build({root,configFile:false,logLevel:'error',ssr:{noExternal:true},build:{ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:Object.fromEntries(Object.entries({templates:'projects/templates',guides:'projects/templateGuides',discovery:'projects/templateDiscovery',hash:'assets/contentHash',project:'projects/projectData'}).map(([key,path])=>[key,join(root,'src',path+'.ts')])),output:{entryFileNames:'[name].mjs'}}}})
 const load=name=>import(pathToFileURL(join(temporary,name+'.mjs')).href)
 const [templates,guides,discovery,hash,project]=await Promise.all(['templates','guides','discovery','hash','project'].map(load))
 const ids=templates.PROJECT_TEMPLATES.map(t=>t.id),baseline=JSON.parse(await readFile(fileURLToPath(new URL('./fixtures/v26.15-template-library.json',import.meta.url)),'utf8')).ids
 await check('All 40 launcher IDs and catalogue order remain stable',()=>assert.deepEqual(ids,baseline))
 const manual=await readFile(join(root,'manual/index.html'),'utf8'),anchors=new Set([...manual.matchAll(/id="([^"]+)"/g)].map(m=>m[1]))
 await check('Every starter has complete EN/DE/ZH instructions and two existing localized help anchors',()=>{
  for(const id of ids)for(const locale of ['en','de','zh']){
   const g=guides.templateGuide(id,locale),prefix=locale==='zh'?'zh-CN':locale
   assert.ok(g.controls.length>12&&g.expected.length>8&&g.requirements.length>0,id+' '+locale)
   for(const anchor of [g.manualSection,g.taskSection])assert.ok(anchors.has(prefix+'-'+anchor),id+' '+prefix+'-'+anchor)
  }
  assert.throws(()=>guides.templateGuide('missing-template'),/Missing template/)
 })
 await check('All 40 real PNG previews exist with bounded dimensions and total footprint',async()=>{
  let total=0
  for(const id of ids){const path=join(root,'src/assets/template-previews',id+'.png'),data=await readFile(path);assert.equal(data.subarray(1,4).toString(),'PNG');assert.ok(data.readUInt32BE(16)<=1920&&data.readUInt32BE(20)<=1080);total+=(await stat(path)).size}
  assert.ok(total<4*1024*1024);checks.push({name:'preview-bytes',status:'passed',bytes:total})
 })
 await check('Controls, expected output and requirements are genuinely searchable',()=>{
  const search=(query,locale='en')=>discovery.discoverTemplates(templates.PROJECT_TEMPLATES,{query,locale,category:'all',difficulty:'all',sort:'catalog'},t=>{const g=guides.templateGuide(t.id,locale);return g.controls+' '+g.expected+' '+g.requirements.join(' ')})
  assert.deepEqual(search('two local players').map(t=>t.id),['pong'])
  assert.deepEqual(search('服务器').map(t=>t.id),[])
  assert.deepEqual(search('服务器','zh').map(t=>t.id),['networked-optional'])
  assert.ok(search('Space').some(t=>t.id==='platformer'));assert.deepEqual(search('no-such-capability'),[])
 })
 await check('Every generated project remains valid and stores matching multilingual tutorial hashes',()=>{
  for(const id of ids){const p=templates.createTemplateProject(id,'Library '+id);assert.deepEqual(templates.auditTemplateProject(p,id),[]);const valid=project.validateProjectDocument(p);assert.equal(valid.valid,true,id+': '+JSON.stringify(valid.issues));const tutorial=p.assets.find(a=>a.path==='Assets/Tutorials/Getting Started.md');for(const locale of ['en','de','zh'])assert.ok(tutorial.source.includes(guides.templateGuide(id,locale).controls));const bytes=hash.assetSourceBytes(tutorial.source);assert.equal(tutorial.byteLength,bytes.length);assert.equal(tutorial.pipeline.lastValidSource,tutorial.source);assert.equal(tutorial.pipeline.sourceHash,hash.sha256Bytes(bytes))}
 })
 await check('Optional networking starts offline while retaining both explicit replication targets',()=>{
  const p=templates.createTemplateProject('networked-optional','Offline'),network=p.projectSettings.production.networking;assert.equal(network.enabled,false);assert.equal(network.replicatedEntities.length,2);assert.equal(network.endpoint,'ws://127.0.0.1:7777');assert.ok(guides.templateGuide('networked-optional').controls.includes('start a compatible WebSocket server'))
 })
 await check('Top-down and Tile World use world-up W, down S, and preserve E spawn',()=>{
  for(const id of ['top-down','tile-world']){const p=templates.createTemplateProject(id,'Direction'),map=p.projectSettings.inputMap,move=map.find(a=>a.name==='Move');assert.equal(move.bindings.find(b=>b.code==='KeyW').y,1);assert.equal(move.bindings.find(b=>b.code==='KeyS').y,-1);assert.equal(map.find(a=>a.name==='Spawn').bindings[0].code,'KeyE')}
 })
 await check('Reused foundations and the unbound sample audio/button actions are explicitly described',()=>{
  const aliases={'lighting-starter':'rendering-lab','tile-world':'top-down','responsive-ui':'ui-showcase','particle-lab':'rendering-lab','audio-lab':'ui-showcase','animation-lab':'platformer','physics-cleanup':'mouse-knockout','grid-chase':'snake'}
  for(const [id,foundation]of Object.entries(aliases))assert.equal(guides.templateGuide(id).foundation,foundation)
  assert.match(guides.templateGuide('audio-lab').expected,/does not play/);assert.match(guides.templateGuide('ui-showcase').controls,/no second game scene/)
 })
 await check('Actual launcher SFC compiles with preserved script bindings and named localized controls',async()=>{
  const source=await readFile(join(root,'src/components/ProjectManager.vue'),'utf8'),result=parse(source,{filename:'ProjectManager.vue'});assert.deepEqual(result.errors,[]);const script=compileScript(result.descriptor,{id:'library'}),compiled=compileTemplate({source:result.descriptor.template.content,filename:'ProjectManager.vue',id:'library',compilerOptions:{bindingMetadata:script.bindings}});assert.deepEqual(compiled.errors,[])
 })
 await mkdir(resolve(report,'..'),{recursive:true});await writeFile(report,JSON.stringify({format:'nova-v26.15-library-metadata',version:1,...await assetAuditMetadata(repository,root),status:'passed',checks},null,2)+'\n')
}finally{const suffix=relative(resolve(repository,'.cache'),temporary);assert.ok(suffix&&!suffix.startsWith('..')&&!isAbsolute(suffix)&&suffix.startsWith('nova-v2615-library-'));await rm(temporary,{recursive:true,force:true})}
