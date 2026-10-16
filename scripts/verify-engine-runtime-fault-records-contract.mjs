import fs from 'node:fs/promises'
import {readFileSync} from 'node:fs'
import {canonicalBeforeNetworkSources} from './lib/networkSourceProjection.mjs'
import {createVerifiedScriptDebugHotReloadSourceReader,scriptDebugHotReloadSourceEvidence} from './lib/scriptDebugHotReloadSourceProjection.mjs'
import {networkOwnerMigrationFixture,validateNetworkOwner} from './lib/networkOwnerContract.mjs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {join,resolve} from 'node:path'
import {validateRuntimeFaultRecords,canonicalBeforeRuntimeFaultRecords} from './lib/runtimeFaultRecordsContract.mjs'
const root=fileURLToPath(new URL('../',import.meta.url)),fixture=JSON.parse(await fs.readFile(new URL('./fixtures/runtime-fault-records-transform-v1.json',import.meta.url),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex'),sources=Object.fromEntries(await Promise.all(fixture.files.map(async r=>[r.path,canonicalBeforeNetworkSources(r.path,await fs.readFile(join(root,r.path),'utf8'),p=>readFileSync(join(root,p),'utf8'))]))),provider=p=>sources[p]??readFileSync(join(root,p),'utf8'),checks=[]
const rawRead=p=>readFileSync(join(root,p),'utf8'),qualifiedRead=createVerifiedScriptDebugHotReloadSourceReader(rawRead),rawUpstreamGuards=scriptDebugHotReloadSourceEvidence().rows.map(row=>({path:row.path,actualSha256:sha(rawRead(row.path)),expectedRawSha256:row.rawSha256})),actualNetworkSources=networkOwnerMigrationFixture().rows.map(row=>({path:row.path,actualSha256:sha(readFileSync(join(root,row.path))),qualified661Sha256:sha(qualifiedRead(row.path)),expectedQualified661Sha256:row.afterSha256})),actualFaultSources=fixture.files.map(row=>({path:row.path,actualSha256:sha(readFileSync(join(root,row.path))),projectedSha256:sha(sources[row.path])}));validateNetworkOwner(p=>readFileSync(join(root,p),'utf8'))
const check=(name,body)=>{const result=body();checks.push({name,status:'PASS',result})}
check('actual-five-files-whole-original8-and-unique-raw-state-facade',()=>{const result=validateRuntimeFaultRecords();assert.equal(result.sourceFiles,5);assert.equal(result.newModules,2);assert.equal(result.originalFunctionDeclarations.length,8);assert.deepEqual(result.limits,{pendingNotices:65,descriptorUtf8Bytes:8192,history:64});return result})
check('explicit-synchronous-provider-same-actual-full-proof',()=>assert.deepEqual(validateRuntimeFaultRecords(provider),validateRuntimeFaultRecords()))
for(const row of fixture.files){
 check('reject-unreviewed-complete-source-'+row.path,()=>assert.throws(()=>validateRuntimeFaultRecords(p=>p===row.path?sources[p]+'\n// unreviewed entire source\n':provider(p))))
 check('canonical-reject-unapproved-known-source-'+row.path,()=>assert.throws(()=>canonicalBeforeRuntimeFaultRecords(sources[row.path]+'\n',row.path,provider)))
 if(row.beforeSha256){check('actual-entire-inverse-'+row.path,()=>assert.equal(sha(canonicalBeforeRuntimeFaultRecords(sources[row.path],row.path,provider)),row.beforeSha256));check('known-before-whole-source-is-identity-'+row.path,()=>assert.equal(canonicalBeforeRuntimeFaultRecords(fixture.originals[row.path],row.path,()=>{throw Error('old identity must not read a missing new Owner')}),fixture.originals[row.path]))}
 else check('new-module-has-no-empty-old-fallback-'+row.path,()=>assert.throws(()=>canonicalBeforeRuntimeFaultRecords('',row.path,provider)))
}
for(const[name,path,from,to]of[
 ['raw-write-bypasses-Vue','src/runtime/runtimeFaultRecords.ts','faultCenterState.recent.push(fault)','rawFaultCenterState.recent.push(fault)'],
 ['original-cancel-contract','src/runtime/runtimeFaultRecords.ts',"error?.name === 'AbortError'","error?.name === 'AbortErrorWrong'"],
 ['original-message-bound','src/runtime/runtimeFaultRecords.ts','1_000','999'],
 ['raw-owner-live-view','src/runtime/runtimeFaultRecords.ts','faultCenterState = view','faultCenterState = rawFaultCenterState'],
 ['late-host-cleanup','src/runtime/runtimeFaultRecords.ts','if (logHost === binding) logHost = null','logHost = null'],
 ['byte-budget','src/runtime/runtimeFaultRecords.ts','const PENDING_FAULT_LOG_BYTE_LIMIT = 8_192','const PENDING_FAULT_LOG_BYTE_LIMIT = Infinity'],
 ['successful-drain-only','src/runtime/runtimeFaultRecords.ts','pendingFaultLogs.shift()','pendingFaultLogs.splice(0)'],
 ['actual-Editor-log-connection','src/runtime/faultCenter.ts','installFaultLogHost(addEditorLog)','installFaultLogHost(() => {})'],
 ['production-runtime-value-path','src/runtime/productionRuntime.ts',"from './runtimeFaultRecords'","from './faultCenter'"],
 ['store-original-log-body','src/store/editor.ts','editorState.logs.push','editorState.logs.splice'],
])check('reject-real-regression-'+name,()=>{assert(sources[path].includes(from),'Actual regression anchor '+name);const changed=sources[path].replace(from,to);assert.throws(()=>validateRuntimeFaultRecords(p=>p===path?changed:provider(p)))})
check('missing-linked-owner-is-not-accepted-by-facade-canonical',()=>assert.throws(()=>canonicalBeforeRuntimeFaultRecords(sources['src/runtime/faultCenter.ts'],'src/runtime/faultCenter.ts',p=>p==='src/runtime/runtimeFaultRecords.ts'?undefined:provider(p))))
check('unrelated-original-path-remains-under-its-existing-contract',()=>assert.equal(canonicalBeforeRuntimeFaultRecords('unchanged foreign source','src/runtime/GameplayRuntimeCore.ts',provider),'unchanged foreign source'))
for(const row of fixture.files)assert.equal(canonicalBeforeNetworkSources(row.path,await fs.readFile(join(root,row.path),'utf8'),p=>readFileSync(join(root,p),'utf8')),sources[row.path],'No source writes '+row.path)
for(const row of actualNetworkSources){assert.equal(sha(readFileSync(join(root,row.path))),row.actualSha256,'Actual terminal Network guard '+row.path);assert.equal(sha(qualifiedRead(row.path)),row.qualified661Sha256,'Qualified661 terminal zero drift '+row.path);assert.equal(row.qualified661Sha256,row.expectedQualified661Sha256)}
for(const row of rawUpstreamGuards){assert.equal(sha(rawRead(row.path)),row.actualSha256,'Raw665 terminal zero drift '+row.path);assert.equal(row.actualSha256,row.expectedRawSha256)}
const option=process.argv.find(a=>a.startsWith('--report-dir=')),dir=resolve(root,option?option.slice('--report-dir='.length):'.cache/engine-overhaul/formal-fault-records-contract');await fs.mkdir(dir,{recursive:true});const report={schema:'nova-runtime-fault-records-installed-contract-v1',status:'PASS',checks,actualNetworkSources,actualFaultSources,rawUpstreamGuards,identityScope:{actualSha256:'Actual raw665 source bytes; never replaced with a historical SHA',qualified661Sha256:'Strict Hot/UI then ScriptDebug inverse; only this is compared with Network19 fixture'},qualificationScope:'Original Fault32/8-algorithm source contract: strict actual19 Network inverse projects the moved production source only. Current runtimeFaultRecords stays actual; new Network36 independently guards actual new errorport/Owner/facade sources.',sourceFiles:fixture.files.map(r=>({path:r.path,sha256:sha(sources[r.path])})),sourceWrites:0,limits:['Whole-source/strict image and mutation proof; business/Vue/SSR evidence separately qualified.', 'No GUI/native WebView/performance or whole M1 certification.']};await fs.writeFile(join(dir,'source-contract.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:checks.length,report:join(dir,'source-contract.json')}))
