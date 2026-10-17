/** 审计基础辅助库，校验上下文、声明身份和执行证据。 */
import {Session} from 'node:inspector/promises'
import {readFile,mkdir,copyFile} from 'node:fs/promises'
import {resolve,relative,isAbsolute,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createOperationCoverageMapper22} from './operationCoverage22.mjs'
let active=null
/** 按环境开关启动唯一 Node 精确函数覆盖会话并返回结束入口。 */ export async function startNodeOperationTrace22(name){
 if(process.env.NOVA_AUDIT_NODE_OPERATION_COVERAGE!=='1')return null
 if(active)throw Error('A node operation trace is already active')
 const root=process.cwd(),session=new Session();session.connect();await session.post('Profiler.enable');await session.post('Profiler.startPreciseCoverage',{callCount:true,detailed:true});
 const state={root,name,session,operations:[],sequence:0,directories:new Set()};active=state
 return{/** 采集已登记产物后停止覆盖，始终断开调试会话并清除活动状态。 */ async finish(){try{for(const directory of [...state.directories])await captureNodeBundle22(directory);await session.post('Profiler.stopPreciseCoverage');return{nodeOperationCoverage:state.operations,tracingScope:'Positive V8 function entries during the complete passing programmer suite, including fixture setup. Not per-assertion isolation, exhaustive domain coverage or performance qualification.'}}finally{session.disconnect();active=null}}}
}
/** 把产物目录加入当前追踪会话的待采集集合。 */ export function registerNodeBundle22(directory){active?.directories.add(resolve(directory))}
/** 采集限定目录的函数覆盖，映射操作并复制实际执行产物及源码映射为证据。 */ export async function captureNodeBundle22(directory){
 if(!active)return
 active.directories.delete(resolve(directory))
 const {root,name,session}=active,dist=resolve(directory),inventory=JSON.parse(await readFile(resolve(root,'reports/v26.22-public-operations.json'),'utf8')),mapper=await createOperationCoverageMapper22({root,dist,operations:inventory.operations}),sample=await session.post('Profiler.takePreciseCoverage');
 const destination=resolve(root,'.cache/v2622-node-execution-v2',name,String(++active.sequence));const within=relative(root,destination);if(!within||within.startsWith('..')||isAbsolute(within))throw Error('Trace destination outside repository')
 for(const script of sample.result){
  if(!script.url.startsWith('file:'))continue
  const full=fileURLToPath(script.url),path=relative(dist,full);if(!path||path.startsWith('..')||isAbsolute(path)||!path.endsWith('.mjs'))continue
  const entries=await mapper.mapScript(path,script.functions);if(!entries.length)continue
  const output=resolve(destination,path),suffix=relative(destination,output);if(!suffix||suffix.startsWith('..')||isAbsolute(suffix))throw Error('Trace file outside destination');await mkdir(dirname(output),{recursive:true});await copyFile(full,output);await copyFile(full+'.map',output+'.map');
  active.operations.push(...entries.map(/** 复制入口证据并将执行产物路径改为仓库内归档路径。 */ entry=>({...entry,generatedFile:relative(root,output).replaceAll('\\','/')})))
 }
}
