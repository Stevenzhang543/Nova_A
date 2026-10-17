import assert from 'node:assert/strict'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {resolve,join} from 'node:path'
import {validatePackageContractHost,canonicalBeforePackageContractHost} from './lib/packageContractHostContract.mjs'
const root=fileURLToPath(new URL('../',import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex')
const fixture=JSON.parse(await readFile(new URL('./fixtures/package-contract-host-transform-v1.json',import.meta.url),'utf8'))
const paths=fixture.rows.map(r=>r.path),sources=Object.fromEntries(await Promise.all(paths.map(async p=>[p,await readFile(join(root,p),'utf8')]))),provider=p=>sources[p],checks=[]
const check=(name,fn)=>{fn();checks.push({name,status:'PASS'})}
check('all-three-actual-installed-sources-and-full-previous-algorithms',()=>assert.equal(validatePackageContractHost(provider).length,3))
for(const row of fixture.rows){check('actual-entire-inverse-'+row.path,()=>assert.equal(sha(canonicalBeforePackageContractHost(sources[row.path],row.path)),row.beforeSha256));check('reject-unreviewed-source-'+row.path,()=>assert.throws(()=>validatePackageContractHost(p=>p===row.path?sources[p]+'\n// changed source\n':provider(p))))}
for(const [name,p,from,to] of [
 ['missing-frozen-receiver','src/runtime/GameplayRuntimeCore.ts','readEnabledPackageIds: worldHost.readEnabledPackageIds.bind(worldHost),',''],
 ['unbound-frozen-receiver','src/runtime/GameplayRuntimeCore.ts','readEnabledPackageIds: worldHost.readEnabledPackageIds.bind(worldHost),','readEnabledPackageIds: worldHost.readEnabledPackageIds,'],
 ['changed-enabled-project-filter','src/editor/gameplayWorldHost.ts','item.enabled && item.project','item.enabled || item.project']
])check('reject-'+name,()=>{assert(sources[p].includes(from),name+': real source mutation');assert.throws(()=>validatePackageContractHost(path=>path===p?sources[p].replace(from,to):provider(path)))})
for(const p of paths)assert.equal(await readFile(join(root,p),'utf8'),sources[p],'Test must not change source: '+p)
const arg=process.argv.find(a=>a.startsWith('--report-dir=')),dir=resolve(root,arg?arg.slice('--report-dir='.length):'.cache/engine-overhaul/formal-package-contract-host')
await mkdir(dir,{recursive:true});const report={schema:'nova-package-contract-world-host-installed-proof-v1',status:'PASS',checks,paths:paths.map(path=>({path,sha256:sha(sources[path])})),sourceWrites:0,limits:['Full source inverse and admission/binding/predicate regression only','Rhai/WASM isolation and full type/build/GUI evidence must be reported separately; this is not a performance claim']}
await writeFile(join(dir,'source-contract.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:checks.length,report:join(dir,'source-contract.json')}))
