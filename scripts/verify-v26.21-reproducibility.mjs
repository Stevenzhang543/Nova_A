/** 功能回归脚本：执行 verify-v26.21-reproducibility.mjs 对应场景，保留断言和证据输出。 */
// Retained 26.20 regression implementation, executed against actual 26.21 source.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {randomUUID,createHash} from 'node:crypto'
import {mkdir,readFile,writeFile,copyFile,rename,realpath,readdir} from 'node:fs/promises'
import {dirname,join,resolve,relative,isAbsolute} from 'node:path'
import {releaseSourceInventory,sourceDigest} from './release-source-snapshot.mjs'
import {resolveMilestoneAuditContext} from './lib/milestoneAuditContext.mjs'
const context=resolveMilestoneAuditContext(import.meta.url,{release:'26.21',reportName:'reproducibility'})
const pnpmEntry=process.env.NOVA_PNPM_ENTRY??process.argv.find(/* 调用 x.startsWith('--pnpm-entry=') 并返回调用结果。 */ x=>x.startsWith('--pnpm-entry='))?.slice(13)
assert.ok(pnpmEntry,'Set NOVA_PNPM_ENTRY to the installed pnpm 10.30.0 CLI entry; this audit never downloads a package manager.')
const root=await realpath(context.sourceRoot),run=join(root,'.cache','qualification-'+context.metadata().release+'-builds',randomUUID()),clean=join(run,'clean-source'),moved=join(run,'moved checkout with spaces'),executions=[]
await mkdir(clean,{recursive:true})
const inside=/** 确认解析后的临时构建目录严格位于工作区内，避免操作外部路径。 */ async path=>{const local=relative(root,await realpath(path));assert.ok(local&&!local.startsWith('..')&&!isAbsolute(local),'All disposable build paths stay in the workspace')}
await inside(clean)
const inputs=await releaseSourceInventory(root)
for(const item of inputs){const target=join(clean,item.path);await mkdir(dirname(target),{recursive:true});await copyFile(join(root,item.path),target)}
const invoke=/** 结构说明（自动提取）：invoke；输入 name、cmd、args、cwd、env；直接调用 join、context.metadata、toISOString、Date、console.log 等；等待异步结果。 */ async(name,cmd,args,cwd,env={})=>{const output=join(root,'release-audits','v'+context.metadata().release+'-repro-'+name+'.log'),chunks=[],start=new Date().toISOString();console.log('START '+name);const code=await new Promise(/** 以离线 Cargo 环境启动隐藏构建子进程，收集输出并等待关闭或启动错误。 */ (done,reject)=>{const child=spawn(cmd,args,{cwd,windowsHide:true,env:{...process.env,CARGO_NET_OFFLINE:'true',CARGO_BUILD_JOBS:'4',...env},stdio:['ignore','pipe','pipe']});child.stdout.on('data',/* 调用 chunks.push(data) 并返回调用结果。 */ data=>chunks.push(data));child.stderr.on('data',/* 调用 chunks.push(data) 并返回调用结果。 */ data=>chunks.push(data));child.on('error',reject);child.on('close',done)});await writeFile(output,Buffer.concat(chunks));executions.push({name,cmd,args,environment:{CARGO_NET_OFFLINE:'true',CARGO_BUILD_JOBS:'4',...env},cwd:relative(root,cwd),startedAt:start,completedAt:new Date().toISOString(),exitCode:code,log:relative(root,output),logText:Buffer.concat(chunks).toString('utf8').slice(-2*1024*1024),sha256:createHash('sha256').update(Buffer.concat(chunks)).digest('hex')});assert.equal(code,0,name+' failed; inspect '+output);console.log('PASS '+name)}
const inventory=/** 递归收集目录文件的大小和摘要，并按路径排序供可复现构建比较。 */ async dir=>{const result=[];/** 遍历构建输出目录，为每个文件记录相对路径、字节数和 SHA-256 摘要。 */ async function walk(path,prefix=''){for(const item of await readdir(path,{withFileTypes:true})){const local=prefix+item.name;if(item.isDirectory())await walk(join(path,item.name),local+'/');else{const bytes=await readFile(join(path,item.name));result.push({path:local,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})}}}await walk(dir);return result.sort(/* 调用 a.path.localeCompare(b.path) 并返回调用结果。 */ (a,b)=>a.path.localeCompare(b.path))}
let failure,webBefore,webAfter
try{
 assert.equal(process.version,'v22.22.2','Use the .node-version toolchain')
 await invoke('pnpm-version',process.execPath,[pnpmEntry,'--version'],clean)
 assert.equal((await readFile(join(root,'release-audits','v'+context.metadata().release+'-repro-pnpm-version.log'),'utf8')).trim(),'10.30.0')
 await invoke('offline-install',process.execPath,[pnpmEntry,'install','--offline','--frozen-lockfile','--ignore-scripts'],clean)
 await invoke('offline-wasm','wasm-pack',['build','crates/nova_wasm','--target','web','--out-dir','../../nova_core/pkg','--out-name','nova_core','--release','--mode','no-install','--','--locked','--offline'],clean)
 await invoke('clean-web',process.execPath,['node_modules/vite/bin/vite.js','build'],clean)
 await invoke('clean-native-check','cargo',['check','--manifest-path','src-tauri/Cargo.toml','--locked','--offline'],clean)
 webBefore=await inventory(join(clean,'dist'))
 await inside(clean);await inside(run);assert.equal(resolve(moved),join(await realpath(run),'moved checkout with spaces'));await rename(clean,moved);await inside(moved)
 // Windows pnpm junctions bind the install path. Repair explicitly from the offline store after moving.
 await invoke('moved-offline-repair',process.execPath,[pnpmEntry,'install','--offline','--frozen-lockfile','--ignore-scripts','--force'],moved,{CI:'true'})
 await invoke('moved-web',process.execPath,['node_modules/vite/bin/vite.js','build'],moved)
 // Tauri generated permission metadata embeds absolute cache paths. Rebuild in a fresh target after moving.
 await invoke('moved-native-check','cargo',['check','--manifest-path','src-tauri/Cargo.toml','--target-dir','src-tauri/target/relocated','--locked','--offline'],moved)
 webAfter=await inventory(join(moved,'dist'));assert.deepEqual(webAfter,webBefore,'Web output bytes must survive moving the complete checkout')
 assert.equal(sourceDigest(await releaseSourceInventory(moved)),sourceDigest(inputs),'Builds do not modify authored source or lockfiles')
}catch(error){failure=error}
const report={...context.metadata(),status:failure?'failed':'passed',sourceInputDigest:sourceDigest(inputs),sourceFiles:inputs.length,executions,webBefore,webAfter,error:failure?.stack,scope:'Fresh source copy and fresh offline pnpm installation; fresh optimized WASM/Web build, then rebuild after moving into a path with spaces and explicitly repairing pnpm links through an offline reinstall. Includes clean and moved native crate compile checks with four compiler jobs and a fresh moved native target to repair absolute Tauri cache paths (installer builds are a separate gate). Uses preinstalled Rust, wasm-pack/bindgen and cached dependency store; does not claim a machine with no prerequisites. Native installer lifecycle remains separate.'};await mkdir(dirname(context.reportPath),{recursive:true});await writeFile(context.reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,run,error:failure?.message}));if(failure)process.exitCode=1
