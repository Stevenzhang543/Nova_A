import { resolveMilestoneAuditContext } from './lib/milestoneAuditContext.mjs'
import assert from 'node:assert/strict'
import { build } from 'vite'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { spawn } from 'node:child_process'
import { resolve, join, dirname, sep, relative, isAbsolute } from 'node:path'
const auditContext=resolveMilestoneAuditContext(import.meta.url,{release:'26.16',reportName:'audio-pcm'}),root=auditContext.repository,stage=auditContext.sourceRoot,bases=auditContext.bases
await mkdir(join(root,'.cache'),{recursive:true})
const wait=ms=>new Promise(done=>setTimeout(done,ms)),temporary=await mkdtemp(join(root,'.cache','nova-v2616-pcm-')),profile=join(temporary,'edge-profile')
const overlay={name:'media-pcm-overlay',enforce:'pre',resolveId(source,importer){const raw=importer&&source.startsWith('.')?resolve(dirname(importer.split('?')[0]),source):isAbsolute(source)?resolve(source):null;if(!raw)return null;const prefix=bases.map(base=>join(base,'src')).find(prefix=>raw.startsWith(prefix+sep));if(!prefix)return null;for(const base of bases)for(const ext of ['','.ts','.json','.js','/index.ts']){const file=join(base,'src',raw.slice(prefix.length+1)+ext);if(existsSync(file))return file.replaceAll('\\','/')}return null}}
let server,edge,socket,report
try{
  const fixture=join(temporary,'fixture.mjs'),fixtureSource=await readFile(join(auditContext.scriptRoot,'scripts/fixtures/v26.16-media-browser.mjs'),'utf8');await writeFile(fixture,fixtureSource.replace(/from '\.\.\/\.\.\/src\/([^']+)'/g,(_,relativePath)=>{const selected=bases.map(base=>join(base,'src',relativePath)).find(existsSync);assert.ok(selected,`Missing actual selected source ${relativePath}`);return 'from '+JSON.stringify(selected.replaceAll('\\','/'))}))
  await build({configFile:false,root,plugins:[overlay],worker:{plugins:()=>[{...overlay}]},logLevel:'error',define:{'process.env.NODE_ENV':JSON.stringify('production')},build:{outDir:temporary,emptyOutDir:false,minify:false,lib:{entry:fixture,formats:['iife'],name:'NovaMediaProbe',fileName:()=> 'probe.js'}}})
  server=createServer(async(request,response)=>{try{response.setHeader('Content-Type',request.url==='/probe.js'?'text/javascript':'text/html');response.end(request.url==='/probe.js'?await readFile(join(temporary,'probe.js')):'<!doctype html><title>Nova_A isolated Web Audio programmer audit</title><script src="/probe.js"></script>')}catch(error){response.statusCode=500;response.end(String(error))}})
  await new Promise(done=>server.listen(0,'127.0.0.1',done));const port=server.address().port,reservation=createNetServer();await new Promise(done=>reservation.listen(0,'127.0.0.1',done));const debug=reservation.address().port;await new Promise(done=>reservation.close(done))
  const executable=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);assert.ok(executable,'Edge is required for real PCM verification')
  edge=spawn(executable,['--headless=new','--no-first-run','--disable-extensions','--autoplay-policy=no-user-gesture-required',`--remote-debugging-port=${debug}`,`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/`],{stdio:'ignore',windowsHide:true})
  let target;for(let attempt=0;attempt<200&&!target;attempt++){try{target=(await fetch(`http://127.0.0.1:${debug}/json/list`).then(response=>response.json())).find(item=>item.type==='page')}catch{}if(!target)await wait(100)}assert.ok(target,'Edge page did not start')
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((done,reject)=>{socket.addEventListener('open',done,{once:true});socket.addEventListener('error',reject,{once:true})});const pending=new Map();let sequence=0
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data),entry=pending.get(message.id);if(entry){pending.delete(message.id);clearTimeout(entry.timer);message.error?entry.reject(Error(message.error.message)):entry.done(message.result)}})
  const send=(method,params={})=>new Promise((done,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'))},60000);pending.set(id,{done,reject,timer});socket.send(JSON.stringify({id,method,params}))})
  for(let attempt=0;attempt<100;attempt++){const result=await send('Runtime.evaluate',{expression:'typeof runNovaMediaPcm === "function"',returnByValue:true});if(result.result.value)break;await wait(100)}
  const result=await send('Runtime.evaluate',{expression:'runNovaMediaPcm()',awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text)
  report={...result.result.value,browser:await send('Browser.getVersion'),generatedAt:new Date().toISOString()};await send('Browser.close').catch(()=>undefined)
}catch(error){report={status:'failed',error:error.stack??String(error)}}finally{
  socket?.close();edge?.kill();if(server)await new Promise(done=>server.close(done));const suffix=relative(join(root,'.cache'),temporary);assert.ok(suffix&&!suffix.startsWith('..')&&!isAbsolute(suffix)&&suffix.startsWith('nova-v2616-pcm-'));await wait(200);await rm(temporary,{recursive:true,force:true,maxRetries:10,retryDelay:100})
}
report={...report,...auditContext.metadata()};const output=auditContext.reportPath;await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks?.length,failed:report.checks?.filter(value=>value.status==='failed'),error:report.error,output}));if(report.status!=='passed')process.exitCode=1
