/** 资源窗口真实浏览器审计：600 个本地文本资源验证虚拟化、滚动及标签重建后的尺寸。 */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'
const expectedRelease=JSON.parse(await readFile('package.json','utf8')).version.replace(/\.0$/,'')
const project=JSON.parse(await readFile('reference-projects/projects/creator-v2624-code-game/project.nova','utf8'))
const prototype=project.assets.find(/* 比较 asset.assetType 与 'other'，返回严格相等的判断结果。 */ asset=>asset.assetType==='other'),source='资源虚拟窗口审计\n',hash=createHash('sha256').update(source).digest('hex')
for(let index=0;index<600;index++){
  const id=createHash('sha256').update('asset-window24-'+index).digest('hex'),name='Audit-'+String(index).padStart(4,'0')+'.txt'
  project.assets.push({...structuredClone(prototype),uuid:`${id.slice(0,8)}-${id.slice(8,12)}-4${id.slice(13,16)}-8${id.slice(17,20)}-${id.slice(20,32)}`,name,path:'Assets/'+name,mimeType:'text/plain',source,byteLength:Buffer.byteLength(source),pipeline:{...prototype.pipeline,sourceHash:hash,artifactHash:hash,contentHash:hash,cacheKey:hash}})
}
const fixture=resolve('.cache/v2624-asset-window-project.nova')
await mkdir('.cache',{recursive:true});await writeFile(fixture,JSON.stringify(project))
await withBrowserAudit({release:'26.24',name:'asset-window',expectedRelease,development:expectedRelease!=='26.24'},/** 结构说明（自动提取）：withBrowserAudit 回调；输入 a；直接调用 worldUserControls17、user.open、tab、a.fill、a.click 等；等待异步结果。 */ async a=>{
  const user=worldUserControls17(a);await user.open(fixture)
  /** 在紧凑和普通底栏都通过实际可见控件切换标签。 */
  async function tab(id,label){
    if(await a.evaluate("document.querySelector('.compact-tab-select').getBoundingClientRect().width>0"))await a.select('.compact-tab-select',id)
    else await a.clickText('.panel-tab-strip .panel-tab',label,true)
    if(!await a.evaluate("!!document.querySelector('.panel-content')"))await a.click('.panel-controls > button:last-child')
    await wait(200)
  }
  await tab('assets','Assets')
  await a.fill('.asset-toolbar input[type=search]','Audit-')
  await a.click('[data-panel-maximize=bottom]')
  await wait(300)
  await a.check('Large resource list retains a bounded viewport and a partial rendered window',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 a.evaluate、a.observations.push、a.capture、assert.ok、JSON.stringify；等待异步结果。 */ async()=>{
    const value=await a.evaluate("(()=>{const grid=document.querySelector('.asset-grid'),work=document.querySelector('.asset-workspace');return{height:grid.clientHeight,workspaceHeight:work.clientHeight,rendered:grid.querySelectorAll('article').length,scrollHeight:grid.scrollHeight}})()")
    a.observations.push({name:'large-list-window',...value});await a.capture('asset-window-initial')
    assert.ok(value.height<=value.workspaceHeight+2,JSON.stringify(value))
    assert.ok(value.rendered>0&&value.rendered<200,JSON.stringify(value))
    assert.ok(value.scrollHeight>value.height)
  })
  await a.check('End-of-list position survives leaving Assets and returning at a changed width',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 a.evaluate、a.until、assert.ok、tab、a.viewport 等；等待异步结果。 */ async()=>{
    await a.evaluate("document.querySelector('.asset-grid').scrollTop=document.querySelector('.asset-grid').scrollHeight")
    await a.until("[...document.querySelectorAll('.asset-grid article strong')].some(e=>e.textContent==='Audit-0599.txt')")
    const before=await a.evaluate("document.querySelector('.asset-grid').scrollTop")
    assert.ok(before>0)
    await tab('console','Console');await a.viewport(1024,900);await tab('assets','Assets')
    await a.until("document.querySelectorAll('.asset-grid article').length>0")
    const after=await a.evaluate("({scrollTop:document.querySelector('.asset-grid').scrollTop,rendered:document.querySelectorAll('.asset-grid article').length,height:document.querySelector('.asset-grid').clientHeight,workspaceHeight:document.querySelector('.asset-workspace').clientHeight})")
    assert.ok(after.scrollTop>0)
    assert.ok(after.rendered<200&&after.height<=after.workspaceHeight+2,JSON.stringify(after))
    a.observations.push({name:'reopened-window',before,...after})
    await a.capture('asset-window-reopened')
  })
  await a.check('List view keeps a bounded window and reaches the last resource',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 a.clickText、a.until、wait、a.evaluate、assert.equal 等；等待异步结果。 */ async()=>{
    await a.clickText('.asset-actions-row button','☷',true)
    await a.until("!!document.querySelector('.asset-grid.asset-list')")
    await wait(200)
    const first=await a.evaluate("({top:document.querySelector('.asset-grid').scrollTop,count:document.querySelectorAll('.asset-grid article').length,columns:getComputedStyle(document.querySelector('.asset-grid-window')).gridTemplateColumns})")
    assert.equal(first.top,0)
    assert.ok(first.count>0&&first.count<40,JSON.stringify(first))
    await a.evaluate("document.querySelector('.asset-grid').scrollTop=document.querySelector('.asset-grid').scrollHeight")
    await a.until("[...document.querySelectorAll('.asset-grid article strong')].some(e=>e.textContent==='Audit-0599.txt')")
    await a.clickText('.asset-grid article strong','Audit-0599.txt',true)
    await a.until("document.querySelector('.asset-grid article.selected strong')?.textContent==='Audit-0599.txt'")
    a.observations.push({name:'list-view-window',...first})
    await a.capture('asset-list-end-selected')
  })

})
