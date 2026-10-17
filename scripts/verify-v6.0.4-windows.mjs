/** 功能回归脚本：执行 verify-v6.0.4-windows.mjs 对应场景，保留断言和证据输出。 */
import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

if(process.platform!=='win32')throw new Error('The v6.0.4 Windows verifier must run on Windows.')
const root=dirname(dirname(fileURLToPath(import.meta.url))),editor=join(root,'src-tauri/target/release/nova_a.exe'),msi=join(root,'src-tauri/target/release/bundle/msi/Nova_A_6.0.4_x64_en-US.msi'),setup=join(root,'src-tauri/target/release/bundle/nsis/Nova_A_6.0.4_x64-setup.exe'),project=join(root,'reference-projects/projects/creator-v604-linked-build-performance/project.nova'),output=join(root,'release-audits/game-output-v6.0.4')
for(const path of [editor,msi,setup,project])await stat(path)
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true})

const lockTest=spawnSync('cargo',['test','--manifest-path',join(root,'src-tauri/Cargo.toml'),'--lib','tests::locked_windows_player_uses_a_versioned_fallback_instead_of_failing','--','--exact'],{cwd:root,encoding:'utf8'})
if(lockTest.status!==0)throw new Error(`Exclusive Windows player-lock regression failed: ${lockTest.stderr||lockTest.stdout}`)

const command=[join(root,'scripts/nova-export.mjs'),'--project',project,'--target','windows','--output',output,'--profile','release','--architecture','x86_64','--runtime','game','--single-file','--player',editor],exported=spawnSync(process.execPath,command,{cwd:root,encoding:'utf8'})
if(exported.status!==0)throw new Error(`Game export failed: ${exported.stderr||exported.stdout}`)
const game=join(output,'Mouse Knockout.exe'),bytes=await readFile(game),footerStart=bytes.length-48
if(footerStart<=0||bytes.subarray(footerStart,footerStart+8).toString('ascii')!=='NOVAPK2!')throw new Error('Exported game has no Nova embedded-package footer.')
const packageLength=Number(bytes.readBigUInt64LE(footerStart+8)),packageStart=footerStart-packageLength
if(packageStart<=0)throw new Error('Exported game reports an invalid embedded package length.')
const embedded=bytes.subarray(packageStart,footerStart),expectedHash=bytes.subarray(footerStart+16).toString('hex'),actualHash=createHash('sha256').update(embedded).digest('hex')
if(expectedHash!==actualHash)throw new Error('Exported game embedded-package SHA-256 does not match.')

const gameSmoke=await launchSmoke(game,5_000),editorSmoke=await launchSmoke(editor,3_000),artifacts=await Promise.all([['editor',editor],['game',game],['msi',msi],['setup',setup]].map(/** 结构说明（自动提取）：map 回调；输入 [name,path]；直接调用 readFile、digest、update、createHash；等待异步结果。 */ async([name,path])=>{const value=await readFile(path);return{name,path,bytes:value.length,sha256:createHash('sha256').update(value).digest('hex')}}))
const report={format:'nova-v6.0.4-windows-game-smoke',version:1,engineVersion:'6.0.4',generatedAt:new Date().toISOString(),host:{platform:process.platform,architecture:process.arch},lockedOutputRegression:{status:'passed',test:'locked_windows_player_uses_a_versioned_fallback_instead_of_failing',preservesRunningPlayer:true,versionedFallback:true},export:{command:command.slice(1),output:game,packageLength,footer:'NOVAPK2!',packageSha256:actualHash,singleFile:!await exists(join(output,'game.nova-pak'))},gameSmoke,editorSmoke,artifacts,externalGates:{signing:'pending-external',cleanMachineLifecycle:'pending-external',secondMachineReproducibility:'pending-external',soak72Hours:'pending-external'},status:gameSmoke.status==='passed'&&editorSmoke.status==='passed'?'passed':'failed'}
await writeFile(join(root,'release-audits/v6.0.4-windows-smoke.json'),`${JSON.stringify(report,null,2)}\n`)
if(report.status!=='passed')throw new Error('Windows editor/game launch smoke failed.')
console.log(`Nova_A v6.0.4 Windows smoke passed; lock fallback, editor and ${game} were verified.`)

/** 结构说明（自动提取）：launchSmoke；输入 path、duration；直接调用 spawn、dirname、Date.now、child.once、Promise 等；等待异步结果。 */ async function launchSmoke(path,duration){const child=spawn(path,[],{cwd:dirname(path),windowsHide:true,stdio:'ignore'}),startedAt=Date.now();let exit=null,error='';child.once('exit',/** 结构说明（自动提取）：child.once 回调；输入 code、signal；写入 exit。 */ (code,signal)=>{exit={code,signal}});child.once('error',/** 结构说明（自动提取）：child.once 回调；输入 value；直接调用 String；写入 error。 */ value=>{error=value instanceof Error?value.message:String(value)});await new Promise(/* 调用 setTimeout(resolve,duration) 并返回调用结果。 */ resolve=>setTimeout(resolve,duration));const stayedAlive=exit===null&&!error;if(stayedAlive){child.kill();await new Promise(/** 结构说明（自动提取）：匿名回调；输入 resolve；直接调用 child.once、setTimeout。 */ resolve=>{child.once('exit',resolve);setTimeout(resolve,2_000)})}return{path,durationMs:Date.now()-startedAt,stayedAlive,exit,error,status:stayedAlive?'passed':'failed'}}
/** 读取文件状态判断路径存在性，失败时返回假。 */ async function exists(path){try{await stat(path);return true}catch{return false}}
