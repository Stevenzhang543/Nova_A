/** 原生物理宿主发布验证：启动真实独立进程、重放与有界失败，不创建浏览器替身。 */
import assert from 'node:assert/strict'
import {spawn,spawnSync} from 'node:child_process'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {verifyNativeHeadless} from './lib/nativeHeadlessChecks.mjs'
const exe='target/release/nova_headless.exe',checks=[]
/** 构建与当前锁文件一致的真实发布二进制。 */
const build=spawnSync('cargo',['build','-p','nova_headless','--release','--locked'],{encoding:'utf8',windowsHide:true,timeout:180000,env:{...process.env,CARGO_NET_OFFLINE:'true',CARGO_BUILD_JOBS:'2'}})
assert.equal(build.status,0,build.stderr)
checks.push(...verifyNativeHeadless(exe,'26.30.0'))
/** 编码发布门禁的实时关闭请求。 */
function encode(commands){return commands.map(command=>JSON.stringify(command)).join('\n')+'\n'}
// 保持真实宿主存活并检查操作系统窗口句柄与子进程，再通过协议关闭。
let live
try{
 live=spawn(exe,['--stdio'],{windowsHide:true,stdio:['pipe','pipe','pipe']})
 await new Promise(/** 等待真实进程启动，启动错误直接失败。 */ (resolve,reject)=>{live.once('spawn',resolve);live.once('error',reject)})
 const probe=spawnSync('powershell.exe',['-NoProfile','-Command',`$p=Get-Process -Id ${live.pid} -ErrorAction Stop; $c=@(Get-CimInstance Win32_Process -Filter "ParentProcessId = ${live.pid}"); [PSCustomObject]@{window=[long]$p.MainWindowHandle;children=@($c | ForEach-Object Name)}|ConvertTo-Json -Compress`],{encoding:'utf8',windowsHide:true,timeout:20000})
 assert.equal(probe.status,0,probe.stderr);const observed=JSON.parse(probe.stdout);assert.equal(observed.window,0);assert.ok(observed.children.every(/** Windows 控制台基础设施不属于 WebView；禁止任何应用子进程。 */ name=>name.toLowerCase()==='conhost.exe'),JSON.stringify(observed))
 const exit=new Promise(/** 记录真实退出并设置截止时间，故障时进入 finally 回收进程。 */ (resolve,reject)=>{const timer=setTimeout(/** 超时不能继续等待或伪造成功。 */ ()=>reject(Error('Native shutdown timed out')),10000);live.once('exit',/** 正常退出释放截止计时器。 */ code=>{clearTimeout(timer);resolve(code)});live.once('error',/** 启动后故障同样释放计时器。 */ error=>{clearTimeout(timer);reject(error)})})
 live.stdin.end(encode([{id:1,command:{op:'shutdown'}}]));assert.equal(await exit,0)
 checks.push({name:'Live native process has no window or WebView child and exits on shutdown',status:'passed',observed})
}catch(e){checks.push({name:'Live native no-window startup/shutdown',status:'failed',error:String(e.stack)})}finally{if(live&&live.exitCode===null)live.kill()}
const bytes=readFileSync(exe),report={format:'nova-native-headless-verification',version:1,release:'26.30',engineVersion:'26.30.0',generatedAt:new Date().toISOString(),status:checks.every(/** 所有检查共同决定资格。 */ x=>x.status==='passed')?'passed':'failed',checks,artifact:{path:exe,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')},scope:'Real native physics stdio processes; same-host command replay, bounded rejection and disposal. No project loader, Rhai VM, full-state rollback or network listener.'};mkdirSync('release-audits',{recursive:true});writeFileSync('release-audits/v26.30-native-headless.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.status!=='passed')process.exitCode=1
