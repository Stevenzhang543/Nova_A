/** 26.25 语言回复身份回归：同一请求编号也不能接受错误修订或 API 的诊断。 */
import assert from 'node:assert/strict'
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'vite'
const temporary=await mkdtemp(join(tmpdir(),'nova-lsp25-')),originalWorker=globalThis.Worker
class WorkerProbe{
 static instance
 /** 记录发送数据，由测试注入错误修订的回复。 */ constructor(){WorkerProbe.instance=this}
 /** 保存服务实际发送的身份。 */ postMessage(value){this.sent=value}
 /** 测试线程无需创建真实后台资源。 */ terminate(){}
}
try{
 await build({configFile:false,logLevel:'error',build:{ssr:true,outDir:temporary,rollupOptions:{input:resolve('src/editor/scriptLanguage.ts'),output:{entryFileNames:'language.mjs'}}}})
 globalThis.Worker=WorkerProbe
 const {ScriptLanguageService,analyzeScript}=await import(pathToFileURL(join(temporary,'language.mjs'))),checks=[]
 for(const mismatch of ['revision','api','externals']){
  const service=new ScriptLanguageService(),promise=service.analyze('fn current(){helper();}',{revision:25,apiVersion:2,externalFunctions:['helper']}),worker=WorkerProbe.instance
  const stale=analyzeScript('fn stale(){}',mismatch==='api'?1:2,mismatch==='revision'?24:25,mismatch==='externals'?[]:['helper'])
  worker.onmessage({data:{id:worker.sent.id,analysis:stale}})
  const actual=await promise;assert.ok(actual.functions.current);assert.equal(actual.functions.stale,undefined);assert.equal(actual.revision,25);service.dispose();checks.push(mismatch)
 }
 const report={format:'nova-v26.25-language-replies',version:1,targetRelease:'26.25',generatedAt:new Date().toISOString(),status:'passed',checks}
 await mkdir('release-audits',{recursive:true});await writeFile('release-audits/v26.25-language-replies.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
}finally{globalThis.Worker=originalWorker;await rm(temporary,{recursive:true,force:true})}
