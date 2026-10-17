/** 功能回归脚本：执行 verify-v4.8-windows.mjs 对应场景，保留断言和证据输出。 */
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), generatedAt = new Date().toISOString()
const paths = { portable: join(root,'src-tauri','target','release','nova_a.exe'), msi: join(root,'src-tauri','target','release','bundle','msi','Nova_A_4.8.0_x64_en-US.msi'), setup: join(root,'src-tauri','target','release','bundle','nsis','Nova_A_4.8.0_x64-setup.exe') }, artifacts = {}
for (const [name,path] of Object.entries(paths)) { const [metadata,source] = await Promise.all([stat(path),readFile(path)]); artifacts[name] = { path: path.slice(root.length + 1).replaceAll('\\','/'), bytes: metadata.size, sha256: createHash('sha256').update(source).digest('hex') } }
const profile = await mkdtemp(join(tmpdir(),'nova-a-v48-native-smoke-')); let child, earlyExit = null
try {
  const env = { ...process.env, APPDATA: join(profile,'AppData','Roaming'), LOCALAPPDATA: join(profile,'AppData','Local'), WEBVIEW2_USER_DATA_FOLDER: join(profile,'WebView2') }
  await Promise.all([mkdir(env.APPDATA,{recursive:true}),mkdir(env.LOCALAPPDATA,{recursive:true})])
  child = spawn(paths.portable,[],{cwd:root,env,windowsHide:true,stdio:'ignore'}); child.once('exit',/** 结构说明（自动提取）：child.once 回调；输入 code、signal；写入 earlyExit。 */ (code,signal)=>{earlyExit={code,signal}})
  await new Promise(/* 调用 setTimeout(resolve,10_000) 并返回调用结果。 */ resolve=>setTimeout(resolve,10_000))
  const stayedAlive = earlyExit === null, checks = [...Object.entries(artifacts).map(/** 结构说明（自动提取）：map 回调；输入 [name,artifact]；直接调用 test；返回表达式求值结果。 */ ([name,artifact])=>({id:`artifact-${name}`,status:artifact.bytes>100_000&&/^[a-f0-9]{64}$/.test(artifact.sha256)?'passed':'failed',detail:artifact})),{id:'portable-isolated-startup',status:stayedAlive?'passed':'failed',detail:{launchSeconds:10,stayedAlive,earlyExit}}]
  const status = checks.every(/* 比较 item.status 与 'passed'，返回严格相等的判断结果。 */ item=>item.status==='passed')?'passed':'failed', report = { format:'nova-v4.8-windows-smoke',version:1,engineVersion:'4.8.0',generatedAt,host:`${process.platform}-${process.arch}`,isolatedProfile:true,artifacts,checks,rendererDeviceCapture:'reported by in-app capability page; representative Intel/AMD/NVIDIA runs remain external',audioDeviceMatrix:'default host output smoke; disconnect/sample-rate/24-hour matrix remains external',cleanMachineLifecycle:'pending external disposable-VM gate',publisherSigning:'pending signing identity',systemMutationPerformedByAudit:false,status }
  await mkdir(join(root,'release-audits'),{recursive:true}); await writeFile(join(root,'release-audits','v4.8.0-windows-smoke.json'),`${JSON.stringify(report,null,2)}\n`); if(status!=='passed')process.exitCode=1; console.log(`Nova_A v4.8 Windows smoke ${status}.`)
} finally { if(child&&earlyExit===null){child.kill();await new Promise(/** 结构说明（自动提取）：匿名回调；输入 resolve；直接调用 child.once、setTimeout。 */ resolve=>{child.once('exit',resolve);setTimeout(resolve,3000)})} await rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:150}) }
