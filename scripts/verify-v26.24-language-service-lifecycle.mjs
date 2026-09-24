/** 语言工作线程生命周期回归：验证成功、取消、替代、销毁及异常都结算 Promise 并释放中止监听器。 */
import assert from 'node:assert/strict'
import {getEventListeners} from 'node:events'
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'vite'
const temporary=await mkdtemp(join(tmpdir(),'nova-language-life24-')),originalWorker=globalThis.Worker
class TestWorker{
  static instances=[]
  static failSend=false
  /** 保存独立实例与真实发送消息，测试可显式触发线程事件。 */
  constructor(){this.sent=[];this.terminated=false;TestWorker.instances.push(this)}
  /** 按需模拟结构化克隆/线程发送失败，否则记录消息。 */
  postMessage(message){if(TestWorker.failSend)throw Error('send failed');this.sent.push(message)}
  /** 记录线程是否被服务释放，不产生任何后台任务。 */
  terminate(){this.terminated=true}
}
/** 给异步结算设置有界超时，悬挂 Promise 必须使回归失败。 */
async function settled(promise){let timer;try{return await Promise.race([promise,new Promise(/** 若结算缺失，返回可定位的失败而不是让测试无限等待。 */ (_,reject)=>{timer=setTimeout(/** 报告未被结算的分析请求。 */ ()=>reject(Error('Analysis remained pending')),5000)})])}finally{clearTimeout(timer)}}
try{
  await build({configFile:false,logLevel:'error',build:{ssr:true,outDir:temporary,rollupOptions:{input:resolve('src/editor/scriptLanguage.ts'),output:{entryFileNames:'language.mjs'}}}})
  globalThis.Worker=TestWorker
  const {ScriptLanguageService,analyzeScript}=await import(pathToFileURL(join(temporary,'language.mjs')))
  const source='fn start(){ shared_helper(); }',checks=[]
  for(const mode of ['reply','abort','dispose','error','messageerror','send-failure']){
    TestWorker.failSend=mode==='send-failure'
    const service=new ScriptLanguageService(),worker=TestWorker.instances.at(-1),controller=new AbortController()
    const result=service.analyze(source,{revision:17,apiVersion:2,externalFunctions:['shared_helper'],signal:controller.signal})
    const lateReply=worker.onmessage,expected=analyzeScript(source,2,17,['shared_helper'])
    if(mode==='reply')worker.onmessage({data:{id:worker.sent[0].id,analysis:expected}})
    if(mode==='abort')controller.abort()
    if(mode==='dispose')service.dispose()
    if(mode==='error'){let prevented=false;worker.onerror({/** 结构说明（自动提取）：preventDefault；无显式参数；写入 prevented。 */ preventDefault(){prevented=true}});assert.equal(prevented,true)}
    if(mode==='messageerror')worker.onmessageerror({})
    const actual=await settled(result)
    assert.equal(actual.revision,17);assert.deepEqual(actual.externalFunctions,['shared_helper'])
    assert.deepEqual(actual.diagnostics,expected.diagnostics)
    assert.equal(getEventListeners(controller.signal,'abort').length,0,'Listener released after '+mode)
    if(mode==='dispose'||mode==='error'||mode==='messageerror'||mode==='send-failure'){assert.equal(worker.terminated,true);assert.equal(worker.onmessage,null);assert.equal(worker.onerror,null);assert.equal(worker.onmessageerror,null)}
    if(lateReply)lateReply({data:{id:worker.sent[0]?.id??1,analysis:analyzeScript('fn stale(){}',2,0)}})
    service.dispose();service.dispose()
    assert.equal((await settled(service.analyze('fn local(){}',{revision:18}))).revision,18)
    checks.push(mode)
  }
  TestWorker.failSend=false
  const service=new ScriptLanguageService(),worker=TestWorker.instances.at(-1),firstController=new AbortController()
  const first=service.analyze('fn first(){}',{revision:1,signal:firstController.signal}),second=service.analyze('fn second(){}',{revision:2})
  assert.equal((await settled(first)).revision,1)
  assert.equal(getEventListeners(firstController.signal,'abort').length,0)
  worker.onmessage({data:{id:worker.sent.at(-1).id,analysis:analyzeScript('fn second(){}',2,2)}})
  assert.equal((await settled(second)).revision,2);service.dispose();checks.push('superseded')
  await mkdir('release-audits',{recursive:true})
  const report={format:'nova-v26.24-language-service-lifecycle',version:1,targetRelease:'26.24',generatedAt:new Date().toISOString(),status:'passed',checks,scope:'Observable mock Worker transport with actual syntax analysis; verifies request settlement, revisions, external functions, late replies and AbortSignal listener disposal.'}
  await writeFile('release-audits/v26.24-language-service-lifecycle.json',JSON.stringify(report)+'\n');console.log(JSON.stringify(report))
}finally{globalThis.Worker=originalWorker;await rm(temporary,{recursive:true,force:true})}
