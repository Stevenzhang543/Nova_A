/** 大图真实输入审计：通过代码编辑创建图，记录滚轮输入到后续帧的延迟与挂载节点数；不把软件渲染结果声称为硬件 FPS。 */
import assert from 'node:assert/strict'
import {resolve} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
/** 按排序样本的最近秩计算百分位，同时保留所有原始观测。 */
function percentile(values,p){const sorted=[...values].sort(/** 数值升序用于最近秩。 */ (a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(p*sorted.length)-1))]}
await withBrowserAudit({release:'26.24',name:'large-graph-user',width:1920,height:1080},/** 使用真实编辑、切换和滚轮操作，不修改应用内部图状态。 */ async a=>{
 const user=worldUserControls17(a)
 await user.open(resolve('reference-projects/projects/creator-v2624-code-game/project.nova'))
 const source='// 大图输入回归：每条语句均保留。\nfn start(){\n'+Array.from({length:500},/** 生成可编译且结果确定的真实语句。 */ (_,i)=>'print('+i+');').join('\n')+'\n}\n'
 await a.check('A 500-statement source opens a complete graph with a bounded visible node window',/** 从源码编辑器转换，不用注入预建图绕开转换流程。 */ async()=>{
  await user.workspace('Script');await a.clickText('.toolbar-actions button','New script')
  await a.evaluate("(()=>{const editor=document.querySelector('.editor-shell textarea');editor.focus();editor.select()})()")
  await a.client.send('Input.insertText',{text:source})
  await a.evaluate("document.querySelector('.editor-shell textarea').blur()")
  await a.click('.logic-mode button',1)
  await a.until("document.querySelectorAll('.graph-node').length>5",60000)
  await a.until("!document.querySelector('.graph-editor[data-initial-layout=running]')",60000)
  await wait(500)
  const counts=await a.evaluate("({visible:document.querySelectorAll('.graph-node').length,total:document.querySelectorAll('.minimap rect:not(.viewport)').length})")
  assert.ok(counts.total>=1500,JSON.stringify(counts));assert.ok(counts.visible>0&&counts.visible<counts.total,JSON.stringify(counts))
  a.observations.push({name:'large-graph-node-window',...counts,sourceStatements:500})
  await a.capture('large-graph-open')
 })
 await a.check('Forty real zoom inputs update the viewport and produce bounded frame samples',/** DOM 监听器只记录事件和帧；所有缩放均来自实际浏览器输入。 */ async()=>{
  await a.evaluate(`(()=>{window.__novaLargeGraphSamples=[];const canvas=document.querySelector('.graph-canvas');canvas.addEventListener('wheel',()=>{const start=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>window.__novaLargeGraphSamples.push({latency:performance.now()-start,nodes:document.querySelectorAll('.graph-node').length,zoom:document.querySelector('.zoom-value')?.textContent})))},{capture:true});return true})()`)
  const at=await a.point('.graph-canvas')
  for(let i=0;i<40;i++){
   await a.client.send('Input.dispatchMouseEvent',{type:'mouseWheel',...at,deltaX:0,deltaY:i%2?35:-35})
   await a.until('window.__novaLargeGraphSamples.length>='+String(i+1),10000)
  }
  const samples=await a.evaluate('window.__novaLargeGraphSamples')
  assert.equal(samples.length,40)
  assert.ok(new Set(samples.map(/** 读取每次事件后的实际缩放显示，证明输入改变了视口。 */ sample=>sample.zoom)).size>1,'Zoom inputs must change the actual viewport scale')
  assert.ok(samples.every(/** 这里只要求可交互完成且采样有限，不设通用硬件帧率保证。 */ sample=>Number.isFinite(sample.latency)&&sample.latency>=0&&sample.latency<10000&&sample.nodes>0))
  const latencies=samples.map(/** 提取输入后两个动画帧的观测延迟。 */ sample=>sample.latency)
  a.observations.push({name:'input-to-two-animation-frames',unit:'ms',samples,p50:percentile(latencies,.5),p95:percentile(latencies,.95),p99:percentile(latencies,.99),scope:'Actual wheel input in software-rendered headless Edge; two requestAnimationFrame callbacks approximate responsiveness, not compositor presentation time or hardware FPS. Default editor animations retained.'})
 })
 await a.check('Returning to code preserves all 500 authored statements',/** 精确核对长源码，防止大图窗口化被误用于裁剪保存内容。 */ async()=>{
  await a.click('.logic-mode button',0);await a.until("!!document.querySelector('.editor-shell textarea')")
  const returned=await a.evaluate("document.querySelector('.editor-shell textarea').value")
  const header=returned.match(/^\/\/ @nova-graph-link [0-9a-f-]{36}\n\/\/ Rhai structure IR 1: code and typed nodes share the same program\.\n/)
  assert.equal(header?returned.slice(header[0].length):returned,source)
  a.observations.push({name:'authored-source-preservation',exactAuthoredSource:true,generatedLinkHeader:Boolean(header),statements:500})
 })
})
