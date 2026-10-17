/** 26.25 调试器回归：验证真实宿主分派、权限、会话、快照隔离与观察无副作用。 */
import assert from 'node:assert/strict'
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'vite'
const temporary=await mkdtemp(join(tmpdir(),'nova-debug25-'))
try{
 await build({configFile:false,logLevel:'error',ssr:{noExternal:true},build:{ssr:true,outDir:temporary,rollupOptions:{input:resolve('src/runtime/scriptDebug.ts'),output:{entryFileNames:'debug.mjs'}}}})
 const d=await import(pathToFileURL(join(temporary,'debug.mjs')))
 const policy={enabled:true,allowExportedPlayers:true,expectedTokenHash:'a'.repeat(64)},checks=[]
 let continued=0,stepped='',cancelled=''
 d.beginDebugSession()
 d.bindDebugHost({/** 记录真实继续调用。 */ continue(){continued++},/** 记录真实边界步进。 */ step(mode){stepped=mode},/** 模拟真实计时任务取消。 */ cancelTask(id){cancelled=id;return Boolean(d.markDebugTaskCancelled(id))}})
 /** 用当前令牌初始化测试协议会话。 */
 const init=()=>d.handleDebugProtocol({id:'init',method:'initialize',address:'localhost',tokenHash:policy.expectedTokenHash,playerVersion:'26.25'},policy)
 assert.equal(init().result.capabilities.vmSuspension,false)
 assert.equal(init().result.capabilities.callbackStep,true)
 const frame={entityUuid:'entity',entityName:'runtime-created',scriptUuid:'script',functionName:'update',line:2,sourceRevision:d.debugSourceRevision('fn update(){}')}
 d.pauseScriptDebugger(frame,{score:4},'callback boundary')
 d.pauseScriptDebugger({...frame,functionName:'signal'},{score:5},'later callback')
 assert.equal(d.scriptDebugState.callStack.length,1,'old callbacks are not VM frames')
 /** 每次请求携带实际会话与暂停身份。 */
 const request=(method,extra={})=>d.handleDebugProtocol({id:method,method,sessionRevision:d.scriptDebugState.sessionRevision,pauseId:d.scriptDebugState.pauseCount,...extra},policy)
 assert.equal(request('evaluate',{frame:0,expression:'score'}).result,5)
 assert.equal(request('evaluate',{frame:1,expression:'score'}).error.code,'NOVA-DEBUG-FRAME')
 assert.equal(request('next',{pauseId:1}).error.code,'NOVA-DEBUG-STALE')
 assert.equal(request('next').result.accepted,true);assert.equal(stepped,'over')
 assert.equal(request('continue').result.accepted,true);assert.equal(continued,1)
 checks.push('truthful-capabilities','single-host-frame','pause-and-frame-binding','actual-host-continue-step')
 let sideEffects=0
 const context={score:8,/** 访问器执行即说明只读观察失败。 */ get danger(){sideEffects++;return 1},object:{/** 不应在预览中执行自定义序列化。 */ toJSON(){sideEffects++;return 'bad'}}}
 assert.throws(/** 验证观察表达式拒绝可能产生副作用的属性访问器。 */ ()=>d.evaluateDebugExpression('danger',context));assert.throws(/** 验证只读观察拒绝赋值表达式。 */ ()=>d.evaluateDebugExpression('score = 9',context));assert.throws(/** 验证观察表达式拒绝函数调用。 */ ()=>d.evaluateDebugExpression('danger()',context))
 d.pauseScriptDebugger(frame,context,'watch');d.addDebugWatch('object');assert.equal(sideEffects,0)
 checks.push('readonly-watch-accessor-call-assignment-json')
 d.updateDebugTask({id:'timer',name:'timer',state:'waiting',entityUuid:'entity',detail:''})
 assert.equal(request('cancelTask',{taskId:'timer'}).result.accepted,true);assert.equal(cancelled,'timer');assert.equal(d.scriptDebugState.tasks[0].state,'cancelled')
 assert.equal(request('cancelTask',{taskId:'timer'}).error.code,'NOVA-DEBUG-TASK')
 checks.push('actual-task-cancellation')
 const oldSession=d.scriptDebugState.sessionRevision;d.beginDebugSession();assert.equal(d.scriptDebugState.tasks.length,0);assert.equal(d.scriptDebugState.remotePeer,null)
 assert.equal(request('threads',{sessionRevision:oldSession}).error.code,'NOVA-DEBUG-STALE');init()
 policy.enabled=false;assert.equal(request('threads').error.code,'NOVA-DEBUG-AUTH');assert.equal(d.scriptDebugState.remotePeer,null)
 d.bindDebugHost(null);checks.push('session-disposal','permission-revocation')
 const report={format:'nova-v26.25-debugger',version:1,targetRelease:'26.25',generatedAt:new Date().toISOString(),status:'passed',checks,scope:'Actual debugger module with instrumented execution host; callback/command boundary capability, not VM suspension certification.'}
 await mkdir('release-audits',{recursive:true});await writeFile('release-audits/v26.25-debugger.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
}finally{await rm(temporary,{recursive:true,force:true})}
