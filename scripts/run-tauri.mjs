import { spawn } from 'node:child_process'
import { cp, mkdir, rm } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const root=dirname(dirname(fileURLToPath(import.meta.url))),args=process.argv.slice(2),command=args[0]??''
const isolated=process.platform==='win32'&&!process.env.CARGO_TARGET_DIR&&(command==='build'||command==='dev')
const temporaryTarget=isolated?join(tmpdir(),`Nova_A_tauri_target_${process.pid}`):''
if(temporaryTarget&&(resolve(dirname(temporaryTarget))!==resolve(tmpdir())||!basename(temporaryTarget).startsWith('Nova_A_tauri_target_')))throw new Error(`Unsafe temporary Tauri target: ${temporaryTarget}`)

let exitCode=1
try{
  const environment=temporaryTarget?{...process.env,CARGO_TARGET_DIR:temporaryTarget}:process.env
  exitCode=await run(process.execPath,[join(root,'node_modules/@tauri-apps/cli/tauri.js'),...args],environment)
  if(exitCode===0&&temporaryTarget&&command==='build')await publishWindowsArtifacts(temporaryTarget)
}finally{
  if(temporaryTarget)await rm(temporaryTarget,{recursive:true,force:true,maxRetries:8,retryDelay:250})
}
process.exitCode=exitCode

function run(executable,arguments_,env){return new Promise((resolveRun,reject)=>{const child=spawn(executable,arguments_,{cwd:root,env,stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',code=>resolveRun(code??1))})}
async function publishWindowsArtifacts(target){
  const source=join(target,'release'),destination=join(root,'src-tauri/target/release')
  await mkdir(destination,{recursive:true})
  await cp(join(source,'nova_a.exe'),join(destination,'nova_a.exe'),{force:true})
  await cp(join(source,'bundle'),join(destination,'bundle'),{recursive:true,force:true})
  console.log(`Published Windows artifacts to ${destination}`)
}
