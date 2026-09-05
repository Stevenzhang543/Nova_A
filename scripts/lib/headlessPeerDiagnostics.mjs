/** Bounded child-process diagnostics; timeout/admission policy stays with the caller. */
export function observeHeadlessPeer(peer){
 const state={exit:null,error:'',stdout:'',stderr:'',startup:[]}
 peer.on('message',message=>{if(message?.type==='startup'&&typeof message.name==='string'&&Number.isFinite(message.at)){state.startup.push({name:message.name.slice(0,80),at:message.at});if(state.startup.length>16)state.startup.shift()}})
 peer.on('exit',(code,signal)=>{state.exit={code,signal}})
 peer.on('error',error=>{state.error=error instanceof Error?error.message:String(error)})
 peer.stdout?.on('data',bytes=>{state.stdout=(state.stdout+bytes.toString()).slice(-8000)})
 peer.stderr?.on('data',bytes=>{state.stderr=(state.stderr+bytes.toString()).slice(-8000)})
 return state
}
export async function waitForHeadlessPeer(read,state,phase,timeout){
 const started=Date.now()
 while(Date.now()-started<timeout){
  const value=read();if(value)return value
  if(state.error||state.exit)throw Error('Peer '+phase+' failed before its expected IPC message: '+(state.error||JSON.stringify(state.exit)))
  await new Promise(resolve=>setTimeout(resolve,25))
 }
 throw Error('Peer '+phase+' timed out after '+timeout+' ms')
}
