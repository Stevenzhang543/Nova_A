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

function run(executable,arguments_,env){return new Promise((resolveRun,reject)=>{const child=spawn(executable,arguments_,{cwd:root,env,stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',code=>resolveRun(code??1))})}
async function publishWindowsArtifacts(target){
  const source=join(target,'release'),destination=join(root,'src-tauri/target/release')
  await mkdir(destination,{recursive:true})
  await cp(join(source,'nova_a.exe'),join(destination,'nova_a.exe'),{force:true})
  await cp(join(source,'bundle'),join(destination,'bundle'),{recursive:true,force:true})
  console.log(`Published Windows artifacts to ${destination}`)
}
