/** Populated animation UI regression for migrated clip/controller/rig/skin/timeline panes. */
import assert from 'node:assert/strict'
import {join} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
await withBrowserAudit({release:'26.32',qualifyRelease:false,name:'ui-rebuild-animation',width:1366,height:768},async a=>{
 const u=worldUserControls17(a),routes=[]
 for(const fixture of ['animation-v47-rig-sprite','cinematic-v56-nested-subtitles']){
  await u.open(join(process.cwd(),'reference-projects/projects',fixture,'project.nova'))
  if(fixture==='animation-v47-rig-sprite')await u.entity('Player')
  await u.workspace('Animation');await u.bottom('animation','Animation');await u.activate('[data-panel-maximize="bottom"]')
  const assets=await a.evaluate("[...document.querySelectorAll('.animation-studio .asset-select option')].filter(e=>e.value).map(e=>({id:e.value,name:e.textContent}))")
  assert.ok(assets.length>=4)
  for(const asset of assets){
   await a.select('.animation-studio .asset-select',asset.id)
   const modes=await a.evaluate("document.querySelectorAll('.animation-studio .studio-modes button').length")
   for(let i=0;i<modes;i++){
    await u.activate('.animation-studio .studio-modes button',i)
    const result=await a.evaluate(`(()=>{const root=document.querySelector('.animation-studio'),r=root.getBoundingClientRect();return{asset:${JSON.stringify(asset.name)},mode:root.querySelector('.studio-modes button[aria-selected=true]')?.textContent,rect:{left:r.left,right:r.right,bottom:r.bottom},viewport:[innerWidth,innerHeight],collapsed:[...root.querySelectorAll('input,select,textarea')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&!['checkbox','radio','range','file','hidden','color'].includes(e.type)&&r.width<40}).map(e=>({label:e.getAttribute('aria-label'),width:e.getBoundingClientRect().width}))}})()`)
    assert.deepEqual(result.collapsed,[],JSON.stringify(result));assert.ok(result.rect.left>=0&&result.rect.right<=1367&&result.rect.bottom<=769)
    const oversizedIcons=await a.evaluate("[...document.querySelectorAll('.animation-studio .editor-icon')].filter(e=>{const r=e.getBoundingClientRect();return r.width>33||r.height>33}).length")
    assert.equal(oversizedIcons,0,'Command icons must not inherit canvas dimensions: '+asset.name)
    result.capture=await a.capture('populated-'+routes.length);routes.push(result)
    if(await a.evaluate("!!document.querySelector('.timeline-inspector')")){
     await u.activate('.sequence-lane button')
     const inspector=await a.evaluate("(()=>{const e=document.querySelector('.timeline-inspector');return{width:e.clientWidth,scroll:e.scrollWidth}})()")
     assert.ok(inspector.scroll<=inspector.width+2,'Timeline property pane must not scroll horizontally: '+JSON.stringify(inspector))
     await a.capture('timeline-selected-clip')
    }
   }
  }
  await u.activate('[data-panel-maximize="bottom"]')
  await a.capture('populated-docked-'+fixture)
  if(fixture==='animation-v47-rig-sprite'){
   const clip=assets.find(x=>x.name.endsWith('.nova-anim'));assert.ok(clip);await a.select('.animation-studio .asset-select',clip.id);await u.activate('.studio-modes button',0)
   await a.check('Populated clip numeric edit saves through the real asset and project commands',async()=>{
    const field=await a.evaluate("[...document.querySelectorAll('.transport label')].find(e=>e.textContent.includes('Frame rate'))?.querySelector('input')?.getAttribute('type')");assert.equal(field,'number')
    await u.field('.transport label:has(input[type=number][max="240"]) input',25)
    await u.activate('.animation-studio .studio-toolbar>button');await a.until("document.querySelector('.authoring-status').dataset.draftDirty==='false'")
    const saved=await u.save('ui-rebuild-animation'),record=saved.document.assets.find(x=>x.uuid===clip.id);assert.ok(record)
    const source=record.source.startsWith('data:')?(record.source.slice(0,record.source.indexOf(',')).includes(';base64')?Buffer.from(record.source.slice(record.source.indexOf(',')+1),'base64').toString():decodeURIComponent(record.source.slice(record.source.indexOf(',')+1))):record.source
    assert.equal(JSON.parse(source).frameRate,25)
   })
   await a.check('Animation preview stops safely when its cached workspace is hidden',async()=>{
    await a.clickText('.authoring-status>button','Preview saved asset',true);await a.until("document.querySelector('.animation-studio').dataset.previewActive==='true'")
    await u.workspace('Script');await u.workspace('Animation');await u.bottom('animation','Animation');await a.until("document.querySelector('.animation-studio').dataset.previewActive==='false'")
    await a.capture('preview-stopped-on-navigation')
   })
  }
 }
 a.observations.push({name:'populated-animation-routes',routes})
 await a.check('Populated clip controller rig skin and timeline modes have usable bounded controls',async()=>assert.ok(routes.length>=10))
 await wait(100)
})
