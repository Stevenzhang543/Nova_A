import assert from 'node:assert/strict'
import {spawn,spawnSync} from 'node:child_process'
import {mkdir,mkdtemp,readFile,writeFile,copyFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createServer} from 'node:net'
import {dirname,join,resolve,relative,isAbsolute} from 'node:path'
import {fileURLToPath} from 'node:url'
import {qualifyNativeRendererInput} from './lib/rendererNativeAudit.mjs'
import {inspectRenderingGame,validateRenderingUserEvidence,selectRenderingExecutable} from './lib/nativeRenderingConsumer.mjs'
import {decodeAuditPng,auditPixel} from './lib/renderingUserPixels.mjs'
const option=name=>process.argv.find(value=>value.startsWith('--'+name+'='))?.slice(name.length+3),root=process.cwd(),home=dirname(dirname(fileURLToPath(import.meta.url)))
const evidence=join(root,'release-audits'),reportPath=join(evidence,'v26.15-rendering-native-consumer.json'),checks=[],observations=[],captures=[],errors=[],sha=bytes=>createHash('sha256').update(bytes).digest('hex'),wait=ms=>new Promise(done=>setTimeout(done,ms))
let child,client,failure,nativeInput
async function freePort(){const server=createServer();await new Promise(done=>server.listen(0,'127.0.0.1',done));const port=server.address().port;await new Promise(done=>server.close(done));return port}
async function connect(url){const socket=new WebSocket(url),pending=new Map();let id=0;await new Promise((done,reject)=>{socket.addEventListener('open',done,{once:true});socket.addEventListener('error',reject,{once:true})});socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails?.exception?.description??message.params.exceptionDetails?.text);const item=pending.get(message.id);if(!item)return;pending.delete(message.id);clearTimeout(item.timer);message.error?item.reject(Error(message.error.message)):item.done(message.result)});return{send(method,params={}){return new Promise((done,reject)=>{const key=++id,timer=setTimeout(()=>{pending.delete(key);reject(Error('Native CDP timeout: '+method))},30000);pending.set(key,{done,reject,timer});socket.send(JSON.stringify({id:key,method,params}))})},close(){socket.close()}}}
const check=async(name,run)=>{await run();checks.push({name,status:'passed'});console.log('PASS '+name)}
try{
 await mkdir(evidence,{recursive:true})
 if(existsSync(reportPath)){const old=JSON.parse(await readFile(reportPath,'utf8')),history=join(evidence,'rendering-history','native-'+Date.now());await mkdir(history,{recursive:true});for(const file of['v26.15-rendering-native-consumer.json',...(old.captures??[])]){assert.ok(typeof file==='string'&&!file.includes('/')&&!file.includes('\\'));if(existsSync(join(evidence,file)))await copyFile(join(evidence,file),join(history,file))}}
 assert.equal(resolve(home),resolve(root),'Native consumer requires promoted frozen source')
 const executable=option('native-exe');assert.ok(executable,'--native-exe is required')
 nativeInput=await qualifyNativeRendererInput(root,root,resolve(executable),option('snapshot'),option('compare')??join(evidence,'renderer-staged.json'),option('build-receipt'))
 const receipt=JSON.parse(await readFile(nativeInput.buildReceipt,'utf8')),build=receipt.gates.find(gate=>gate.id==='native-build')
 const userPath=resolve(option('user-report')??join(evidence,'v26.15-rendering-authoring.json')),userRelative=relative(evidence,userPath);assert.ok(userRelative&&!isAbsolute(userRelative)&&!userRelative.startsWith('..'),'User evidence remains in release-audits')
 const userBytes=await readFile(userPath),user=JSON.parse(userBytes.toString()),input=validateRenderingUserEvidence(user,build.generatedAt)
 const projectPath=resolve(root,input.project.artifact),projectRelative=relative(evidence,projectPath);assert.ok(projectRelative&&!isAbsolute(projectRelative)&&!projectRelative.startsWith('..')&&projectRelative.endsWith('.nova'),'Actual saved project remains inside evidence')
 const projectBytes=await readFile(projectPath);assert.equal(projectBytes.length,input.project.bytes);assert.equal(sha(projectBytes),input.project.sha256);const project=JSON.parse(projectBytes.toString());assert.equal(project.engineVersion,'26.15.0')
 await mkdir(join(root,'.cache'),{recursive:true});const temporary=await mkdtemp(join(root,'.cache/native-rendering-consumer-')),output=join(temporary,'game');await mkdir(output)
 let game,exportReport,gameEvidence
 await check('Actual SDK exports the exact visibly saved lit project with the qualified Windows player',async()=>{
  const args=[join(root,'scripts/nova-export.mjs'),'--project',projectPath,'--target','windows','--output',output,'--profile','release','--architecture','x86_64','--runtime','game','--single-file','--player',nativeInput.executable]
  const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:120000});const log=(result.stdout??'')+(result.stderr??'');await writeFile(join(evidence,'v26.15-rendering-native-export.log'),log);assert.equal(result.status,0,result.error?.message??log)
  exportReport=JSON.parse(await readFile(join(output,'nova-build-report.json'),'utf8'));assert.equal(exportReport.format,'nova-build-report');assert.equal(exportReport.version,2);assert.equal(exportReport.engineVersion,'26.15.0');assert.equal(exportReport.target,'windows');assert.equal(exportReport.runtimeMode,'game')
  assert.equal(exportReport.playerTemplate.sha256,nativeInput.sha256);assert.equal(exportReport.playerTemplate.bytes,nativeInput.bytes)
  for(const file of exportReport.files){const path=resolve(output,file.path),local=relative(output,path);assert.ok(local&&!isAbsolute(local)&&!local.startsWith('..'));const bytes=await readFile(path);assert.equal(bytes.length,file.bytes);assert.equal(sha(bytes),file.sha256)}
  const executableRecord=selectRenderingExecutable(exportReport);game=join(output,executableRecord.path);gameEvidence=inspectRenderingGame(await readFile(game),nativeInput,project)
  observations.push({name:'actual-saved-native-input',artifact:projectPath,bytes:projectBytes.length,sha256:sha(projectBytes),userReport:{path:userPath,sha256:sha(userBytes)},nativeTemplate:{...nativeInput,browser:undefined},sdk:{command:args,stdout:result.stdout,stderr:result.stderr,exitCode:result.status,buildReport:exportReport},game:{...executableRecord,path:game,...gameEvidence}})
 })
 await check('The exported native game boots its own packaged Player and matches browser lit output',async()=>{
  const debug=await freePort(),env={...process.env,APPDATA:join(temporary,'profile','AppData','Roaming'),LOCALAPPDATA:join(temporary,'profile','AppData','Local'),WEBVIEW2_USER_DATA_FOLDER:join(temporary,'profile','WebView2'),WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port='+debug};await mkdir(env.APPDATA,{recursive:true});await mkdir(env.LOCALAPPDATA,{recursive:true})
  let exited=null,launchError=null;child=spawn(game,[],{cwd:dirname(game),env,windowsHide:true,stdio:'ignore'});child.once('exit',(code,signal)=>{exited={code,signal}});child.once('error',error=>{launchError=error})
  let target;for(let n=0;n<300&&!target;n++){if(exited||launchError)throw launchError??Error('Exported game exited: '+JSON.stringify(exited));try{target=(await fetch('http://127.0.0.1:'+debug+'/json/list').then(response=>response.json())).find(item=>item.type==='page')}catch{}if(!target)await wait(100)}assert.ok(target,'Actual exported WebView2 debugger must start')
  client=await connect(target.webSocketDebuggerUrl);await client.send('Runtime.enable');await client.send('Page.enable');// WebView2 uses its actual native viewport; pixel sampling below accounts for host DPI.

  const evaluate=async expression=>{const result=await client.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);return result.result.value}
  let ready=false;for(let n=0;n<400&&!ready;n++){const error=await evaluate('document.querySelector(".player-status.error")?.textContent');if(error)throw Error(error);ready=await evaluate('!!document.querySelector(".player-root .render-canvas")');if(!ready)await wait(100)}assert.ok(ready,'Embedded package must reach the actual Player canvas')
  const location=await evaluate('location.href'),url=new URL(location);assert.ok((url.protocol==='tauri:'&&url.hostname==='localhost')||(['http:','https:'].includes(url.protocol)&&url.hostname==='tauri.localhost'&&!url.port),'Player must use its packaged native application origin')
  assert.equal(await evaluate('document.title'),project.projectSettings.build.gameName);await wait(750)
  let frame,image,box,drawn=false
  const nativePixel=(image,x,y)=>auditPixel(image,x*image.width/box.viewportWidth,y*image.height/box.viewportHeight)
  for(let attempt=0;attempt<100&&!drawn;attempt++){box=await evaluate('(()=>{const r=document.querySelector(".render-canvas").getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight,devicePixelRatio}})()');frame=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});image=decodeAuditPng(Buffer.from(frame.data,'base64'));const pixel=nativePixel(image,box.x+box.width/2-4.8*box.height/12,box.y+box.height/2-1.5*box.height/12);drawn=pixel[2]>pixel[0]+30;if(!drawn)await wait(100)}assert.ok(drawn,'Native game must finish drawing its known blue rectangle')
  const file='v26.15-rendering-native-consumer-player.png';await writeFile(join(evidence,file),Buffer.from(frame.data,'base64'));captures.push(file)
  const pixels=[-4.8,-1.6,1.6].map(x=>nativePixel(image,box.x+box.width/2+x*box.height/12,box.y+box.height/2-1.5*box.height/12))
  const errorsByPixel=pixels.map((pixel,index)=>pixel.map((value,channel)=>Math.abs(value-input.web.pixels[index][channel])));assert.ok(errorsByPixel.every(pixel=>pixel.every(value=>value<=8)),'Native lit pixels differ from actual browser player beyond8 channel values: '+JSON.stringify({pixels,expected:input.web.pixels,errorsByPixel}))
  assert.deepEqual(errors,[],'No observed native bootstrap/render exceptions')
  observations.push({name:'actual-native-packaged-player',url:location,browser:await client.send('Browser.getVersion'),canvas:box,pixels,browserPixels:input.web.pixels,errorsByPixel,tolerance:8,packageSha256:gameEvidence.packageSha256,scope:'The SDK-exported EXE starts its own embedded Player and package. No Page.navigate, fixture URL, app-module imports or runtime state injection. Actual native viewport and screenshot dimensions determine DPI-aware pixel coordinates; DOM is read-only.'})
 })
}catch(error){failure=error;process.exitCode=1;console.error(error)}
finally{
 if(client){try{const frame=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});if(failure){const file='v26.15-rendering-native-consumer-failure.png';await writeFile(join(evidence,file),Buffer.from(frame.data,'base64'));captures.push(file)}}catch{}client.close()}child?.kill()
 await mkdir(evidence,{recursive:true});await writeFile(reportPath,JSON.stringify({format:'nova-v26.15-rendering-native-consumer',version:1,release:'26.15',engineVersion:'26.15.0',sourceInputDigest:nativeInput?.sourceInputDigest??null,generatedAt:new Date().toISOString(),status:failure?'failed':'passed',checks,observations,captures,consoleErrors:errors,error:failure?.stack,scope:'Programmer-assisted SDK Windows export and actual packaged native Player continuation of a separately recorded real browser-authoring workflow. Requires exact15 frozen source/native build and matching browser evidence; no native OS picker or manual installation claim.'},null,2)+'\n')
}
