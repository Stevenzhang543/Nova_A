import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve,dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {validateM1OwnerIntegration} from './lib/m1OwnerIntegrationContract.mjs'
import {canonicalBeforePluginApiContract,validatePluginApiContractValue} from './lib/pluginApiContractMigration.mjs'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const suffix=process.argv.find(value=>value.startsWith('--report-dir='))?.slice('--report-dir='.length)??'.cache/engine-overhaul/m1-owner-contract'
assert(suffix.startsWith('.cache/engine-overhaul/')&&!suffix.includes('..')&&!suffix.includes('\\'), 'Keep reports in the audit workspace')
const directory=join(root,suffix),sha=value=>createHash('sha256').update(value).digest('hex')
const fixture=JSON.parse(await readFile(join(root,'scripts/fixtures/m1-owner-integration-transform-v1.json'),'utf8'))
const addon=JSON.parse(await readFile(join(root,'scripts/fixtures/plugin-api-pure-import-transform-v1.json'),'utf8'))
const paths=[...new Set([...fixture.rows,...fixture.newModules,...addon.changes].map(row=>row.path).concat('src/runtime/pluginApiContract.ts'))]
const sources=Object.fromEntries(await Promise.all(paths.map(async path=>[path,await readFile(join(root,path),'utf8')])))
const sourceHashes=Object.fromEntries(paths.map(path=>[path,sha(sources[path])]))
const report={schema:'nova-installed-m1-owner-contract-v1',status:'RUNNING',scope:'STATIC_WHOLE_SOURCE_AND_REJECTED_MUTATIONS',checks:[],sourceHashes,sourceWrites:0,limits:['Does not qualify gameplay, GUI, native Player, performance, Rust authority or complete M1 isolation.']}
async function check(name,body){const value=await body();report.checks.push({name,status:'PASS',value})}
try{
  await check('all-actual-relocated-functions-and-new-owner-skeletons',()=>validateM1OwnerIntegration(sources))
  await check('plugin-api-entire-inverse-and-original-version',()=>{
    const result=addon.changes.map(row=>{assert.equal(sha(sources[row.path]),row.afterSha256);assert.equal(sha(canonicalBeforePluginApiContract(sources[row.path],row.path)),row.beforeSha256);return {path:row.path,beforeSha256:row.beforeSha256,afterSha256:row.afterSha256}})
    assert.equal(validatePluginApiContractValue(sources['src/runtime/pluginApiContract.ts']),true);return result
  })
  for(const row of [...fixture.rows,...fixture.newModules])await check('reject-unreviewed-whole-source-'+row.path,()=>{
    const modified=sources[row.path]+'\n// unreviewed mutation must be rejected\n'
    assert.throws(()=>validateM1OwnerIntegration({...sources,[row.path]:modified}), undefined, row.path)
    return {path:row.path,mutationSha256:sha(modified)}
  })
  for(const[path,from,to]of [
    ['src/runtime/entityLifetimes.ts','0xffff_ffff','0xffff_fffe'],
    ['src/runtime/streamLifecycle.ts','this.registration !== registration','this.registration === registration'],
    ['src/runtime/GameplayRuntimeCore.ts','this.active = false','this.active = true'],
    ['src/runtime/pluginRuntimeOwner.ts','this.generation++','this.generation--'],
    ['src/runtime/runtimeAssetRecordContracts.ts','export interface','interface']
  ])await check('reject-actual-body-or-default-'+path,()=>{
    assert(sources[path].includes(from),'Real reviewed implementation target exists');const modified=sources[path].replace(from,to)
    assert.notEqual(modified,sources[path]);assert.throws(()=>validateM1OwnerIntegration({...sources,[path]:modified}),undefined,path)
    return {path,from,to,mutationSha256:sha(modified)}
  })
  for(const row of addon.changes)await check('reject-plugin-dependency-mutation-'+row.path,()=>assert.throws(()=>canonicalBeforePluginApiContract(sources[row.path]+'\n',row.path)))
  await check('reject-plugin-version-mutation',()=>assert.throws(()=>validatePluginApiContractValue(sources['src/runtime/pluginApiContract.ts'].replace('= 2','= 3'))))
  await check('all-actual-sources-unchanged-after-tests',async()=>{for(const path of paths)assert.equal(sha(await readFile(join(root,path))),sourceHashes[path],path);return {files:paths.length}})
  report.status='VERIFIED_STATIC_CONTRACTS';console.log(`M1 Owner installed source contracts: ${report.checks.length} passed`)
}catch(error){report.status='FAILED';report.error={message:error.message,stack:error.stack};throw error}
finally{await mkdir(directory,{recursive:true});await writeFile(join(directory,'source-contract.json'),JSON.stringify(report,null,2))}
