/** Bounded child-process diagnostics; timeout/admission policy stays with the caller. */
/** 监听无界面对等进程的启动消息、退出和输出，保留有界诊断状态。 */ export function observeHeadlessPeer(peer){
 const state={exit:null,error:'',stdout:'',stderr:'',startup:[]}
 peer.on('message',/** 仅记录有效启动阶段消息，并限制名称和最近十六项记录。 */ message=>{if(message?.type==='startup'&&typeof message.name==='string'&&Number.isFinite(message.at)){state.startup.push({name:message.name.slice(0,80),at:message.at});if(state.startup.length>16)state.startup.shift()}})
 peer.on('exit',/** 保存进程退出码和信号。 */ (code,signal)=>{state.exit={code,signal}})
 peer.on('error',/** 把进程错误转换为可读诊断文本。 */ error=>{state.error=error instanceof Error?error.message:String(error)})
 peer.stdout?.on('data',/** 追加标准输出并只保留末尾八千字符。 */ bytes=>{state.stdout=(state.stdout+bytes.toString()).slice(-8000)})
 peer.stderr?.on('data',/** 追加标准错误并只保留末尾八千字符。 */ bytes=>{state.stderr=(state.stderr+bytes.toString()).slice(-8000)})
 return state
}
/** 轮询期望消息，提前退出或错误立即失败，超时则报告等待阶段。 */ export async function waitForHeadlessPeer(read,state,phase,timeout){
 const started=Date.now()
 while(Date.now()-started<timeout){
  const value=read();if(value)return value
  if(state.error||state.exit)throw Error('Peer '+phase+' failed before its expected IPC message: '+(state.error||JSON.stringify(state.exit)))
  await new Promise(/* 调用 setTimeout(resolve,25) 并返回调用结果。 */ resolve=>setTimeout(resolve,25))
 }
 throw Error('Peer '+phase+' timed out after '+timeout+' ms')
}
