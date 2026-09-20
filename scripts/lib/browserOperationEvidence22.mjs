import {readFile,readdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {resolve,relative,isAbsolute} from 'node:path'
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
/** Validate each named browser execution independently; never promote call coverage to domain correctness. */
export async function linkBrowserOperationCoverage22(operations,{root=process.cwd()}={}){
 const sourceHashes=new Map(),artifactHashes=new Map();let links=0
 const checkedPath=path=>{const full=resolve(root,path),part=relative(root,full);if(!part||part.startsWith('..')||isAbsolute(part))throw Error('Coverage artifact outside repository');return full}
 async function digest(path,cache){const full=checkedPath(path);if(!cache.has(full))cache.set(full,hash(await readFile(full)));return cache.get(full)}
 for(const directory of ['reports','.cache/v2622-execution/release-audits','.cache/v2622-execution-v2/release-audits','.cache/v2622-execution-v3/release-audits','.cache/v2622-execution-v4/release-audits'])for(const file of await readdir(resolve(root,directory)).catch(error=>{if(error.code==='ENOENT')return [];throw error})){
  if(!/^v26\.22-.*\.json$/.test(file))continue
  const path=directory+'/'+file,report=JSON.parse(await readFile(resolve(root,path),'utf8'));if(!report.executionTracing)continue
  if(report.status!=='passed')continue
  for(const sample of report.operationCoverage||[]){
   if(!report.checks.some(check=>check.name===sample.case&&check.status==='passed'))throw Error('Coverage without a passed named assertion: '+path)
   for(const entry of sample.operations){
    if(entry.mappingVersion!==2)continue;
    if(!Number.isFinite(entry.entryCount)||entry.entryCount<=0)throw Error('Nonpositive function entry evidence')
    const matches=operations.filter(operation=>operation.id===entry.id&&operation.source===entry.source&&operation.line===entry.line&&operation.kind===entry.kind)
    if(matches.length!==1)continue // A changed declaration remains pending until re-executed.
    if(await digest(entry.source,sourceHashes)!==entry.sourceSha256)continue
    const generated=resolve(root,report.buildRoot??resolve(root,directory,'..'),'dist',entry.generatedFile)
    if(await digest(generated,artifactHashes)!==entry.generatedSha256||await digest(generated+'.map',artifactHashes)!==entry.mapSha256)throw Error('Browser coverage artifact changed: '+path)
    if(matches[0].cases.some(item=>item.case===sample.case&&item.sourceSha256===entry.sourceSha256))continue;
    matches[0].cases.push({report:path,case:sample.case,link:'Observed positive V8 function entry during named passing browser assertions; not exhaustive input-domain or isolated operation correctness.',mappingVersion:entry.mappingVersion,sourceSha256:entry.sourceSha256,generatedSha256:entry.generatedSha256,mapSha256:entry.mapSha256,entryCount:entry.entryCount});links++
   }
  }
 }
 return links
}
