/** 操作审计证据辅助库，保留证据来源与适用范围。 */
import {readFile,readdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {resolve,relative,isAbsolute} from 'node:path'
const hash=/* 调用 createHash('sha256').update(bytes).digest('hex') 并返回调用结果。 */ bytes=>createHash('sha256').update(bytes).digest('hex')
/** Validate each named browser execution independently; never promote call coverage to domain correctness. */
/** 核验已通过浏览器报告的命名断言、函数入口和源码及产物散列，再关联有限范围执行证据。 */ export async function linkBrowserOperationCoverage22(operations,{root=process.cwd()}={}){
 const sourceHashes=new Map(),artifactHashes=new Map();let links=0
 const checkedPath=/** 将证据路径解析到仓库内部，拒绝根目录及越界路径。 */ path=>{const full=resolve(root,path),part=relative(root,full);if(!part||part.startsWith('..')||isAbsolute(part))throw Error('Coverage artifact outside repository');return full}
 /** 在路径检查后缓存文件散列，避免重复读取同一证据产物。 */ async function digest(path,cache){const full=checkedPath(path);if(!cache.has(full))cache.set(full,hash(await readFile(full)));return cache.get(full)}
 for(const directory of ['reports','.cache/v2622-execution/release-audits','.cache/v2622-execution-v2/release-audits','.cache/v2622-execution-v3/release-audits','.cache/v2622-execution-v4/release-audits'])for(const file of await readdir(resolve(root,directory)).catch(/** 报告目录不存在时视为空目录，其他读取错误继续抛出。 */ error=>{if(error.code==='ENOENT')return [];throw error})){
  if(!/^v26\.22-.*\.json$/.test(file))continue
  const path=directory+'/'+file,report=JSON.parse(await readFile(resolve(root,path),'utf8'));if(!report.executionTracing)continue
  if(report.status!=='passed')continue
  for(const sample of report.operationCoverage||[]){
   if(!report.checks.some(/* 先计算 check.name===sample.case；仅当其为真值时求右侧 check.status==='passed'，返回短路求值结果。 */ check=>check.name===sample.case&&check.status==='passed'))throw Error('Coverage without a passed named assertion: '+path)
   for(const entry of sample.operations){
    if(entry.mappingVersion!==2)continue;
    if(!Number.isFinite(entry.entryCount)||entry.entryCount<=0)throw Error('Nonpositive function entry evidence')
    const matches=operations.filter(/* 先计算 operation.id===entry.id&&operation.source===entry.source&&operation.line===entry.line；仅当其为真值时求右侧 operation.kind===entry.kind，返回短路求值结果。 */ operation=>operation.id===entry.id&&operation.source===entry.source&&operation.line===entry.line&&operation.kind===entry.kind)
    if(matches.length!==1)continue // A changed declaration remains pending until re-executed.
    if(await digest(entry.source,sourceHashes)!==entry.sourceSha256)continue
    const generated=resolve(root,report.buildRoot??resolve(root,directory,'..'),'dist',entry.generatedFile)
    if(await digest(generated,artifactHashes)!==entry.generatedSha256||await digest(generated+'.map',artifactHashes)!==entry.mapSha256)throw Error('Browser coverage artifact changed: '+path)
    if(matches[0].cases.some(/* 先计算 item.case===sample.case；仅当其为真值时求右侧 item.sourceSha256===entry.sourceSha256，返回短路求值结果。 */ item=>item.case===sample.case&&item.sourceSha256===entry.sourceSha256))continue;
    matches[0].cases.push({report:path,case:sample.case,link:'Observed positive V8 function entry during named passing browser assertions; not exhaustive input-domain or isolated operation correctness.',mappingVersion:entry.mappingVersion,sourceSha256:entry.sourceSha256,generatedSha256:entry.generatedSha256,mapSha256:entry.mapSha256,entryCount:entry.entryCount});links++
   }
  }
 }
 return links
}
