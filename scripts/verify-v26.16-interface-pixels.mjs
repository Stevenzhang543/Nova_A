/** 功能回归脚本：执行 verify-v26.16-interface-pixels.mjs 对应场景，保留断言和证据输出。 */
import { resolveMilestoneAuditContext, runMilestoneBrowserAudit } from './lib/milestoneAuditContext.mjs'
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { transformWithEsbuild } from 'vite'
const auditContext=resolveMilestoneAuditContext(import.meta.url,{release:'26.16',reportName:'interface-pixels'}),stage=auditContext.sourceRoot,root=auditContext.buildRoot,probe=join(root,'dist','interface-programmer-probe')
await mkdir(probe,{recursive:true})
try{
 for(const name of ['uiImageTint','uiTextLayout']){const source=await readFile(join(stage,'src/runtime',name+'.ts'),'utf8'),result=await transformWithEsbuild(source,name+'.ts',{loader:'ts',target:'es2022'});await writeFile(join(probe,name+'.mjs'),result.code)}
 await writeFile(join(probe,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Interface programmer pixel probe</title></head><body style="background:#20242a;color:white;font:16px sans-serif"><h1>Programmer pixel fixture · actual Canvas2D</h1><p>Isolated image tint and measured Unicode text; not an editor authoring workflow.</p><canvas id="pixels" width="600" height="220" style="border:1px solid gray"></canvas><pre id="result">Running</pre><script type="module">
 import {UiImageTintCache} from './uiImageTint.mjs';import {layoutUiText} from './uiTextLayout.mjs';
 const checks=[],check=(name,ok,detail)=>{checks.push({name,status:ok?'passed':'failed',detail});if(!ok)throw Error(name+': '+JSON.stringify(detail))};
 try{const surface=document.getElementById('pixels'),context=surface.getContext('2d'),source=document.createElement('canvas');source.width=source.height=4;const draw=source.getContext('2d');draw.fillStyle='white';draw.fillRect(0,0,2,4);draw.fillStyle='rgba(255,255,255,.5)';draw.fillRect(2,0,1,4);
 const cache=new UiImageTintCache(),tinted=cache.resolve('source',source,{x:0,y:0,width:4,height:4},{r:0,g:255,b:0});context.fillStyle='#ff0000';context.fillRect(0,0,600,220);context.imageSmoothingEnabled=false;context.drawImage(tinted.source,20,20,80,80);
 const pixel=(x,y)=>[...context.getImageData(x,y,1,1).data];check('Tint preserves every pixel outside its destination',JSON.stringify(pixel(150,30))==='[255,0,0,255]',pixel(150,30));check('Opaque white source tints to green',JSON.stringify(pixel(30,30))==='[0,255,0,255]',pixel(30,30));check('Transparent source preserves earlier scene pixels',JSON.stringify(pixel(90,30))==='[255,0,0,255]',pixel(90,30));const semi=pixel(70,30);check('Partial alpha blends without clearing prior scene',semi[0]>100&&semi[0]<150&&semi[1]>100&&semi[1]<150&&semi[3]===255,semi);
 const changed=cache.resolve('source',source,{x:0,y:0,width:4,height:4},{r:0,g:0,b:255});check('Tint color invalidates derived source',changed.source!==tinted.source,cache.inspect());context.drawImage(changed.source,120,20,80,80);
 context.fillStyle='#ffffff';context.font='24px "Noto Sans SC Variable", sans-serif';context.textBaseline='top';const value='Unicode 中文 é 👩‍💻 wrapping preserves glyph shape',layout=layoutUiText(value,{width:290,height:130,lineHeight:32,wrap:'Word',overflow:'Ellipsis',measure:value=>context.measureText(value).width});layout.lines.forEach((line,index)=>context.fillText(line,250,20+32*index));check('Actual canvas measures and wraps Unicode without squeeze',layout.lines.length>1&&layout.lines.every(line=>context.measureText(line).width<=291),layout);
 check('Cache releases owned pixels',(()=>{cache.clear();return cache.inspect().bytes===0})(),cache.inspect());document.getElementById('result').textContent=JSON.stringify({status:'passed',scope:'Actual browser Canvas2D programmer fixture; no editor or physical-device claim',checks});}catch(error){document.getElementById('result').textContent=JSON.stringify({status:'failed',checks,error:String(error)})}
 </script></body></html>`)
 await runMilestoneBrowserAudit(auditContext,{name:'interface-pixels'},/** 结构说明（自动提取）：runMilestoneBrowserAudit 回调；输入 audit；直接调用 audit.evaluate、audit.client.send、audit.until、assert.equal、JSON.stringify 等；包含循环处理；等待异步结果。 */ async audit=>{
  const origin=await audit.evaluate('location.origin');await audit.client.send('Page.navigate',{url:origin+'/interface-programmer-probe/index.html'});await audit.until("document.querySelector('#result')?.textContent.startsWith('{')")
  const result=await audit.evaluate("JSON.parse(document.querySelector('#result').textContent)");assert.equal(result.status,'passed',JSON.stringify(result));for(const entry of result.checks)await audit.check(entry.name,/* 调用 assert.equal(entry.status,'passed') 并返回调用结果。 */ async()=>assert.equal(entry.status,'passed'));audit.observations.push(result);await audit.capture('real-canvas-pixels')
 })
}finally{assert.ok(probe.startsWith(resolve(root,'dist')+'\\')||probe.startsWith(resolve(root,'dist')+'/'));await rm(probe,{recursive:true,force:true})}
