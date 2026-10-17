/** 在 Windows 仓库内使用隔离的 Tauri 构建缓存，成功后发布原始可执行文件与安装包。 */
import { spawn } from 'node:child_process'
import { cp, mkdir, realpath } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root=dirname(dirname(fileURLToPath(import.meta.url))),args=process.argv.slice(2),command=args[0]??''
const managedTarget=process.platform==='win32'&&!process.env.CARGO_TARGET_DIR&&(command==='build'||command==='dev')?join(root,'.cache','tauri-target'):''
if(managedTarget&&!resolve(managedTarget).startsWith(`${resolve(root)}${sep}`))throw new Error(`Unsafe managed Tauri target: ${managedTarget}`)

if(managedTarget){
  await mkdir(managedTarget,{recursive:true})
  const [actualRoot,actualTarget]=await Promise.all([realpath(root),realpath(managedTarget)])
  if(!actualTarget.startsWith(`${actualRoot}${sep}`))throw new Error(`Managed Tauri cache escapes the repository: ${actualTarget}`)
}
const environment=managedTarget?{...process.env,CARGO_TARGET_DIR:managedTarget}:process.env
const exitCode=await run(process.execPath,[join(root,'node_modules/@tauri-apps/cli/tauri.js'),...args],environment)
if(exitCode===0&&managedTarget&&command==='build')await publishWindowsArtifacts(managedTarget)
process.exitCode=exitCode

/** 启动实际 Tauri 命令并继承输出；启动失败拒绝，退出时返回其退出码。 */
function run(executable,arguments_,env){return new Promise(/** 监听子进程启动错误和退出，避免把失败构建当作成功发布。 */ (resolveRun,reject)=>{const child=spawn(executable,arguments_,{cwd:root,env,stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',/* 调用 resolveRun(code??1) 并返回调用结果。 */ code=>resolveRun(code??1))})}
/** 仅在构建成功后，将托管缓存中的可执行文件与安装包复制到约定发布目录。 */
async function publishWindowsArtifacts(target){
  const source=join(target,'release'),destination=join(root,'src-tauri/target/release')
  await mkdir(destination,{recursive:true})
  await cp(join(source,'nova_a.exe'),join(destination,'nova_a.exe'),{force:true})
  await cp(join(source,'bundle'),join(destination,'bundle'),{recursive:true,force:true})
  console.log(`Published Windows artifacts to ${destination}`)
}
