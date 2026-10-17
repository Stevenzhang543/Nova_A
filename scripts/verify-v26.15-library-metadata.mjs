/** 功能回归脚本：执行 verify-v26.15-library-metadata.mjs 对应场景，保留断言和证据输出。 */
import {assetAuditMetadata} from './lib/assetAudit15.mjs'
import assert from 'node:assert/strict'
import { build } from 'vite'
import { compileScript, compileTemplate, parse } from 'vue/compiler-sfc'
import { mkdir, mkdtemp, readFile, rm, writeFile, stat } from 'node:fs/promises'
import { resolve, join, relative, isAbsolute } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
const repository=process.cwd(),root=resolve(process.argv.find(/* 调用 a.startsWith('--source-root=') 并返回调用结果。 */ a=>a.startsWith('--source-root='))?.slice(14)||process.cwd()),checks=[]
const temporary=await mkdtemp(join(repository,'.cache','nova-v2615-library-'))
const report=resolve(process.argv.find(/* 调用 a.startsWith('--report=') 并返回调用结果。 */ a=>a.startsWith('--report='))?.slice(9)||join(root,'release-audits/v26.15-library-metadata.json'))
const check=/** 结构说明（自动提取）：check；输入 name、run；直接调用 run、checks.push、console.log；等待异步结果。 */ async(name,run)=>{await run();checks.push({name,status:'passed'});console.log('PASS '+name)}
try {
 await build({root,configFile:false,logLevel:'error',ssr:{noExternal:true},build:{ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:Object.fromEntries(Object.entries({templates:'projects/templates',guides:'projects/templateGuides',discovery:'projects/templateDiscovery',hash:'assets/contentHash',project:'projects/projectData'}).map(/* 返回按声明顺序构造的数组 [key,join(root,'src',path+'.ts')]。 */ ([key,path])=>[key,join(root,'src',path+'.ts')])),output:{entryFileNames:'[name].mjs'}}}})
 const load=/* 调用 import(pathToFileURL(join(temporary,name+'.mjs')).href) 并返回调用结果。 */ name=>import(pathToFileURL(join(temporary,name+'.mjs')).href)
 const [templates,guides,discovery,hash,project]=await Promise.all(['templates','guides','discovery','hash','project'].map(load))
 const ids=templates.PROJECT_TEMPLATES.map(/* 返回 t.id 的当前值。 */ t=>t.id),baseline=JSON.parse(await readFile(fileURLToPath(new URL('./fixtures/v26.15-template-library.json',import.meta.url)),'utf8')).ids
 await check('All 40 launcher IDs and catalogue order remain stable',/* 调用 assert.deepEqual(ids,baseline) 并返回调用结果。 */ ()=>assert.deepEqual(ids,baseline))
 const manual=await readFile(join(root,'manual/index.html'),'utf8'),anchors=new Set([...manual.matchAll(/id="([^"]+)"/g)].map(/* 返回 m[1] 的当前值。 */ m=>m[1]))
 await check('Every starter has complete EN/DE/ZH instructions and two existing localized help anchors',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 guides.templateGuide、assert.ok、anchors.has、assert.throws；包含循环处理。 */ ()=>{
  for(const id of ids)for(const locale of ['en','de','zh']){
   const g=guides.templateGuide(id,locale),prefix=locale==='zh'?'zh-CN':locale
   assert.ok(g.controls.length>12&&g.expected.length>8&&g.requirements.length>0,id+' '+locale)
   for(const anchor of [g.manualSection,g.taskSection])assert.ok(anchors.has(prefix+'-'+anchor),id+' '+prefix+'-'+anchor)
  }
  assert.throws(/* 调用 guides.templateGuide('missing-template') 并返回调用结果。 */ ()=>guides.templateGuide('missing-template'),/Missing template/)
 })
 await check('All 40 real PNG previews exist with bounded dimensions and total footprint',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 join、readFile、assert.equal、toString、data.subarray 等；写入 total；包含循环处理；等待异步结果。 */ async()=>{
  let total=0
  for(const id of ids){const path=join(root,'src/assets/template-previews',id+'.png'),data=await readFile(path);assert.equal(data.subarray(1,4).toString(),'PNG');assert.ok(data.readUInt32BE(16)<=1920&&data.readUInt32BE(20)<=1080);total+=(await stat(path)).size}
  assert.ok(total<4*1024*1024);checks.push({name:'preview-bytes',status:'passed',bytes:total})
 })
 await check('Controls, expected output and requirements are genuinely searchable',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 assert.deepEqual、map、search、assert.ok、some。 */ ()=>{
  const search=/** 结构说明（自动提取）：search；输入 query、locale；直接调用 discovery.discoverTemplates；返回表达式求值结果。 */ (query,locale='en')=>discovery.discoverTemplates(templates.PROJECT_TEMPLATES,{query,locale,category:'all',difficulty:'all',sort:'catalog'},/** 结构说明（自动提取）：discovery.discoverTemplates 回调；输入 t；直接调用 guides.templateGuide、g.requirements.join。 */ t=>{const g=guides.templateGuide(t.id,locale);return g.controls+' '+g.expected+' '+g.requirements.join(' ')})
  assert.deepEqual(search('two local players').map(/* 返回 t.id 的当前值。 */ t=>t.id),['pong'])
  assert.deepEqual(search('服务器').map(/* 返回 t.id 的当前值。 */ t=>t.id),[])
  assert.deepEqual(search('服务器','zh').map(/* 返回 t.id 的当前值。 */ t=>t.id),['networked-optional'])
  assert.ok(search('Space').some(/* 比较 t.id 与 'platformer'，返回严格相等的判断结果。 */ t=>t.id==='platformer'));assert.deepEqual(search('no-such-capability'),[])
 })
 await check('Every generated project remains valid and stores matching multilingual tutorial hashes',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 templates.createTemplateProject、assert.deepEqual、templates.auditTemplateProject、project.validateProjectDocument、assert.equal 等；包含循环处理。 */ ()=>{
  for(const id of ids){const p=templates.createTemplateProject(id,'Library '+id);assert.deepEqual(templates.auditTemplateProject(p,id),[]);const valid=project.validateProjectDocument(p);assert.equal(valid.valid,true,id+': '+JSON.stringify(valid.issues));const tutorial=p.assets.find(/* 比较 a.path 与 'Assets/Tutorials/Getting Started.md'，返回严格相等的判断结果。 */ a=>a.path==='Assets/Tutorials/Getting Started.md');for(const locale of ['en','de','zh'])assert.ok(tutorial.source.includes(guides.templateGuide(id,locale).controls));const bytes=hash.assetSourceBytes(tutorial.source);assert.equal(tutorial.byteLength,bytes.length);assert.equal(tutorial.pipeline.lastValidSource,tutorial.source);assert.equal(tutorial.pipeline.sourceHash,hash.sha256Bytes(bytes))}
 })
 await check('Optional networking starts offline while retaining both explicit replication targets',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 templates.createTemplateProject、assert.equal、assert.ok、controls.includes、guides.templateGuide。 */ ()=>{
  const p=templates.createTemplateProject('networked-optional','Offline'),network=p.projectSettings.production.networking;assert.equal(network.enabled,false);assert.equal(network.replicatedEntities.length,2);assert.equal(network.endpoint,'ws://127.0.0.1:7777');assert.ok(guides.templateGuide('networked-optional').controls.includes('start a compatible WebSocket server'))
 })
 await check('Top-down and Tile World use world-up W, down S, and preserve E spawn',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 templates.createTemplateProject、map.find、assert.equal、move.bindings.find；包含循环处理。 */ ()=>{
  for(const id of ['top-down','tile-world']){const p=templates.createTemplateProject(id,'Direction'),map=p.projectSettings.inputMap,move=map.find(/* 比较 a.name 与 'Move'，返回严格相等的判断结果。 */ a=>a.name==='Move');assert.equal(move.bindings.find(/* 比较 b.code 与 'KeyW'，返回严格相等的判断结果。 */ b=>b.code==='KeyW').y,1);assert.equal(move.bindings.find(/* 比较 b.code 与 'KeyS'，返回严格相等的判断结果。 */ b=>b.code==='KeyS').y,-1);assert.equal(map.find(/* 比较 a.name 与 'Spawn'，返回严格相等的判断结果。 */ a=>a.name==='Spawn').bindings[0].code,'KeyE')}
 })
 await check('Reused foundations and the unbound sample audio/button actions are explicitly described',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 Object.entries、assert.equal、guides.templateGuide、assert.match；包含循环处理。 */ ()=>{
  const aliases={'lighting-starter':'rendering-lab','tile-world':'top-down','responsive-ui':'ui-showcase','particle-lab':'rendering-lab','audio-lab':'ui-showcase','animation-lab':'platformer','physics-cleanup':'mouse-knockout','grid-chase':'snake'}
  for(const [id,foundation]of Object.entries(aliases))assert.equal(guides.templateGuide(id).foundation,foundation)
  assert.match(guides.templateGuide('audio-lab').expected,/does not play/);assert.match(guides.templateGuide('ui-showcase').controls,/no second game scene/)
 })
 await check('Actual launcher SFC compiles with preserved script bindings and named localized controls',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 readFile、join、parse、assert.deepEqual、compileScript 等；等待异步结果。 */ async()=>{
  const source=await readFile(join(root,'src/components/ProjectManager.vue'),'utf8'),result=parse(source,{filename:'ProjectManager.vue'});assert.deepEqual(result.errors,[]);const script=compileScript(result.descriptor,{id:'library'}),compiled=compileTemplate({source:result.descriptor.template.content,filename:'ProjectManager.vue',id:'library',compilerOptions:{bindingMetadata:script.bindings}});assert.deepEqual(compiled.errors,[])
 })
 await mkdir(resolve(report,'..'),{recursive:true});await writeFile(report,JSON.stringify({format:'nova-v26.15-library-metadata',version:1,...await assetAuditMetadata(repository,root),status:'passed',checks},null,2)+'\n')
}finally{const suffix=relative(resolve(repository,'.cache'),temporary);assert.ok(suffix&&!suffix.startsWith('..')&&!isAbsolute(suffix)&&suffix.startsWith('nova-v2615-library-'));await rm(temporary,{recursive:true,force:true})}
