import assert from 'node:assert/strict'
import {build} from 'vite'
import {existsSync} from 'node:fs'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {assetAuditMetadata} from './lib/assetAudit15.mjs'
const option=name=>process.argv.find(value=>value.startsWith('--'+name+'='))?.slice(name.length+3),home=dirname(dirname(fileURLToPath(import.meta.url))),root=existsSync(join(home,'package.json'))?home:resolve(home,'../..'),sourceRoot=resolve(option('source-root')??(home===root?root:join(root,'.cache/development-v26.15-render-user-check'))),out=join(root,'.cache/verify-v26.15-template-ui'),reportPath=resolve(option('report')??join(home,home===root?'release-audits':'reports','v26.15-template-ui.json'))
const checks=[],observations=[]
await build({configFile:false,root:sourceRoot,logLevel:'error',ssr:{noExternal:true},build:{ssr:true,outDir:out,emptyOutDir:true,rollupOptions:{input:Object.fromEntries(Object.entries({templates:'projects/templates',physics:'store/physics',assets:'assets/AssetDatabase',pak:'runtime/novaPak',localization:'runtime/localization'}).map(([name,path])=>[name,join(sourceRoot,'src',path+'.ts')])),output:{entryFileNames:'[name].mjs'}}}})
const load=name=>import(pathToFileURL(join(out,name+'.mjs'))),[templates,physics,assets,pak,localization]=await Promise.all(['templates','physics','assets','pak','localization'].map(load))
globalThis.window={setTimeout:()=>0,clearTimeout:()=>{}}
const wasm=await import(pathToFileURL(join(sourceRoot,'nova_core/pkg/nova_core.js')));wasm.initSync({module:await readFile(join(sourceRoot,'nova_core/pkg/nova_core_bg.wasm'))})
const check=async(name,fn)=>{try{await fn();checks.push({name,status:'passed'});console.log('PASS '+name)}catch(error){checks.push({name,status:'failed',error:error.stack??String(error)});console.error('FAIL '+name+': '+error.message)}}
function current(){
 const find=name=>{const entity=physics.physicsState.world.entities.find(entity=>entity.name===name);assert.ok(entity,name);return entity},button=find('Play Button'),progress=find('Loading Progress').getComponent('ProgressBar'),panel=find('Menu Panel').getComponent('Panel'),text=button.getComponent('Text')
 return{caption:text?localization.localize(text.localizationKey,text.localizationVariables,text.text):null,localizationKey:text?.localizationKey,buttonHasFakeText:Object.hasOwn(button.getComponent('Button'),'text'),placeholder:find('Player Name').getComponent('TextInput').placeholder,checkbox:{label:localization.localize(find('Options Toggle').getComponent('Checkbox').localizationKey,{},find('Options Toggle').getComponent('Checkbox').label),localizationKey:find('Options Toggle').getComponent('Checkbox').localizationKey},progress:{min:progress.min,max:progress.max,value:progress.value},panelLayout:panel.layout,positions:Object.fromEntries(['Localized Title','Player Name','Play Button','Options Toggle','Loading Progress','News Scroll View'].map(name=>[name,{...find(name).getComponent('RectTransform').position}]))}
}
const expected={caption:'Play',localizationKey:'menu.play',buttonHasFakeText:false,placeholder:'Player name',checkbox:{label:'Sound enabled',localizationKey:'menu.sound'},progress:{min:0,max:100,value:68},panelLayout:'None',positions:{'Localized Title':{x:0,y:-220},'Player Name':{x:0,y:-110},'Play Button':{x:0,y:-20},'Options Toggle':{x:0,y:70},'Loading Progress':{x:0,y:160},'News Scroll View':{x:0,y:245}}}
for(const id of['ui-showcase','responsive-ui','audio-lab']){
 let authored,hydrated
 await check(id+': actual factory and WASM migration hydrate real localized Text,68/100 progress and authored positions',()=>{
  authored=templates.createTemplateProject(id,'UI Semantics '+id);const raw=authored.scenes.flatMap(scene=>scene.entities),button=raw.find(entity=>entity.name==='Play Button');assert.ok(button.components.some(component=>component.kind==='Text'&&component.data.localizationKey==='menu.play'));assert.equal(Object.hasOwn(button.components.find(component=>component.kind==='Button').data,'text'),false)
  assert.equal(physics.loadProject(wasm.migrate_project_json(JSON.stringify(authored))),true);hydrated=current();assert.deepEqual(hydrated,expected);observations.push({id,phase:'factory-WASM-hydration',values:hydrated})
 })
 await check(id+': actual NovaPak encode/decode/player-project reopening preserves the same semantics',async()=>{
  const snapshot=physics.getSceneJSON(),document=JSON.parse(snapshot),bytes=await pak.createNovaPak(snapshot,assets.assetState.records,document.activeSceneUuid,{deterministic:true,compression:'balanced'}),decoded=await pak.parseNovaPak(bytes);assert.ok(decoded.files.has('project.nova'));const reopened=await pak.projectJsonFromNovaPak(bytes);assert.equal(physics.loadProject(wasm.migrate_project_json(reopened)),true);assert.deepEqual(current(),expected);observations.push({id,phase:'NovaPak-reopen',packageBytes:bytes.length,entries:decoded.index.entries.length,engineVersion:decoded.index.engineVersion})
 })
}
await check('old unsupported Button.text and implicit max1 reproduce missing caption and saturated progress under real hydration',()=>{
 const broken=templates.createTemplateProject('ui-showcase','Prior shape'),entities=broken.scenes[0].entities,button=entities.find(entity=>entity.name==='Play Button'),progress=entities.find(entity=>entity.name==='Loading Progress').components.find(component=>component.kind==='ProgressBar')
 button.components=button.components.filter(component=>component.kind!=='Text');button.components.find(component=>component.kind==='Button').data.text='{menu.play}';delete progress.data.min;delete progress.data.max
 assert.equal(physics.loadProject(wasm.migrate_project_json(JSON.stringify(broken))),true);const observed=current();assert.equal(observed.caption,null);assert.equal(observed.progress.max,1);assert.equal(observed.progress.value,1);observations.push({phase:'negative-legacy-reproduction',observed})
})
const metadata=await assetAuditMetadata(root,sourceRoot),status=checks.every(check=>check.status==='passed')?'passed':'failed';await mkdir(dirname(reportPath),{recursive:true});await writeFile(reportPath,JSON.stringify({format:'nova-v26.15-template-ui',version:1,...metadata,status,checks,observations,scope:'Actual template factory, native WASM format migration, production component hydration/localization and NovaPak/player-project reopening. Separate browser audit proves visible pixels and Inspector layout; no descriptor-only or user-click claim here.'},null,2)+'\n');if(status!=='passed')process.exitCode=1
