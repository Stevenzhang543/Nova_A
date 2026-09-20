import {Session} from 'node:inspector/promises'
import {readFile,mkdir,copyFile} from 'node:fs/promises'
import {resolve,relative,isAbsolute,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createOperationCoverageMapper22} from './operationCoverage22.mjs'
let active=null
export async function startNodeOperationTrace22(name){
 if(process.env.NOVA_AUDIT_NODE_OPERATION_COVERAGE!=='1')return null
 if(active)throw Error('A node operation trace is already active')
 const root=process.cwd(),session=new Session();session.connect();await session.post('Profiler.enable');await session.post('Profiler.startPreciseCoverage',{callCount:true,detailed:true});
 const state={root,name,session,operations:[],sequence:0,directories:new Set()};active=state
 return{async finish(){try{for(const directory of [...state.directories])await captureNodeBundle22(directory);await session.post('Profiler.stopPreciseCoverage');return{nodeOperationCoverage:state.operations,tracingScope:'Positive V8 function entries during the complete passing programmer suite, including fixture setup. Not per-assertion isolation, exhaustive domain coverage or performance qualification.'}}finally{session.disconnect();active=null}}}
}
export function registerNodeBundle22(directory){active?.directories.add(resolve(directory))}
export async function captureNodeBundle22(directory){
 if(!active)return
 active.directories.delete(resolve(directory))
 const {root,name,session}=active,dist=resolve(directory),inventory=JSON.parse(await readFile(resolve(root,'reports/v26.22-public-operations.json'),'utf8')),mapper=await createOperationCoverageMapper22({root,dist,operations:inventory.operations}),sample=await session.post('Profiler.takePreciseCoverage');
 const destination=resolve(root,'.cache/v2622-node-execution-v2',name,String(++active.sequence));const within=relative(root,destination);if(!within||within.startsWith('..')||isAbsolute(within))throw Error('Trace destination outside repository')
 for(const script of sample.result){
  if(!script.url.startsWith('file:'))continue
  const full=fileURLToPath(script.url),path=relative(dist,full);if(!path||path.startsWith('..')||isAbsolute(path)||!path.endsWith('.mjs'))continue
  const entries=await mapper.mapScript(path,script.functions);if(!entries.length)continue
  const output=resolve(destination,path),suffix=relative(destination,output);if(!suffix||suffix.startsWith('..')||isAbsolute(suffix))throw Error('Trace file outside destination');await mkdir(dirname(output),{recursive:true});await copyFile(full,output);await copyFile(full+'.map',output+'.map');
  active.operations.push(...entries.map(entry=>({...entry,generatedFile:relative(root,output).replaceAll('\\','/')})))
 }
}
