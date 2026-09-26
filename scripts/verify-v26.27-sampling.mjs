/** 26.27 性能采样回归：实际模块以墙钟估算堆增长，不以显示帧号推断时间。 */
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
const opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{tools:'runtime/performanceTools',production:'runtime/production'})
const original=globalThis.performance,observations=[]
try {
 const {tools,production}=opened.modules
 production.productionSettings.performance.leakWindowFrames=60
 for(const frameStep of [1,30,120]){
  tools.clearPerformanceTools()
  let time=0,heap=0
  Object.defineProperty(globalThis,'performance',{configurable:true,value:{/** 返回可控的单调采样时间。 */ now:()=>time,/** 暴露实测接口形状，避免依赖 Node 的浏览器扩展。 */ get memory(){return{usedJSHeapSize:heap}}}})
  for(let sample=0;sample<60;sample++){time=sample*1000;heap=(100+sample/60)*1048576;tools.samplePerformanceTools(sample*frameStep,[],{renderTargets:0})}
  assert.ok(Math.abs(tools.performanceToolsState.leakSlopeMbPerMinute-1)<1e-8)
  observations.push({frameStep,slope:tools.performanceToolsState.leakSlopeMbPerMinute,elapsedMs:time})
 }
 tools.clearPerformanceTools();assert.equal(tools.performanceToolsState.leakSlopeMbPerMinute,0);assert.equal(tools.performanceToolsState.lifetimeEvents.length,0)
} finally {Object.defineProperty(globalThis,'performance',{configurable:true,value:original});await opened.close()}
await mkdir('release-audits',{recursive:true})
await writeFile('release-audits/v26.27-sampling.json',JSON.stringify({format:'nova-performance-sampling',version:1,release:'26.27',engineVersion:'26.27.0',generatedAt:new Date().toISOString(),status:'passed',observations,scope:'Actual module with controlled clock/heap host observations; no physical memory leak certification.'},null,2))
console.log('PASS sampling wall-clock invariance and reset')
