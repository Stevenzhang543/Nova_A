import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {dirname,resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {validateAnimationOwnerMigration} from './lib/animationOwnerContract.mjs'
import {validateRuntimeSaveOwner} from './lib/runtimeSaveOwnerContract.mjs'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const suffix=process.argv.find(v=>v.startsWith('--report-dir='))?.slice('--report-dir='.length)??'.cache/engine-overhaul/animation-save-owner-contract'
assert(suffix.startsWith('.cache/engine-overhaul/')&&!suffix.includes('..')&&!suffix.includes('\\'))
const animation=JSON.parse(await readFile(join(root,'scripts/fixtures/animation-owner-transform-v1.json'),'utf8'))
const save=JSON.parse(await readFile(join(root,'scripts/fixtures/runtime-save-owner-transform-v1.json'),'utf8'))
const sha=b=>createHash('sha256').update(b).digest('hex')
const paths=[...new Set([...animation.files,...save.rows].map(r=>r.path))]
const source=Object.fromEntries(paths.map(p=>[p,readFileSync(join(root,p),'utf8')]))
const hashes=Object.fromEntries(paths.map(p=>[p,sha(source[p])]))
const readActual=p=>source[p]??readFileSync(join(root,p),'utf8')
const report={schema:'nova-installed-animation-save-owner-contract-v1',status:'RUNNING',scope:'ACTUAL_INSTALLED_COMPLETE_SOURCES_AND_REJECTED_MUTATIONS',sourceHashes:hashes,checks:[],sourceWrites:0,limits:['Static relocation and wiring proof; not a substitute for GUI, storage, lifecycle contention, Rust authority, Worker or performance qualification.']}
const check=(name,fn)=>{const value=fn();report.checks.push({name,status:'PASS',value})}
try{
 check('actual-default-reader-all-animation-whole-classes-functions-and-wiring',()=>{const result=validateAnimationOwnerMigration();assert.equal(result.sourceFiles,17);return result})
 check('actual-default-reader-all-save-functions-config-snapshot-and-seven-Core-calls',()=>{const result=validateRuntimeSaveOwner();assert.equal(result.wholeFiles.length,6);assert.equal(result.originalFunctionBodies,37);assert.equal(result.actualSaveCalls,7);return result})
 for(const row of animation.files)check('reject-whole-animation-source-'+row.path,()=>{const changed=source[row.path]+'\n// unreviewed actual source mutation\n';assert.throws(()=>validateAnimationOwnerMigration(p=>p===row.path?changed:readActual(p)));return {path:row.path,mutationSha256:sha(changed)}})
 for(const row of save.rows)check('reject-whole-save-source-'+row.path,()=>{const changed=source[row.path]+'\n// unreviewed actual source mutation\n';assert.throws(()=>validateRuntimeSaveOwner(p=>p===row.path?changed:readActual(p)));return {path:row.path,mutationSha256:sha(changed)}})
 check('actual-sources-unchanged-after-rejected-mutations',()=>{for(const p of paths)assert.equal(sha(readFileSync(join(root,p))),hashes[p],p);return {uniqueFiles:paths.length}})
 report.status='VERIFIED_STATIC_CONTRACTS';console.log(`Animation/Save installed complete source contracts: ${report.checks.length} passed`)
}catch(error){report.status='NOT_PASSED';report.error=error?.stack??String(error);process.exitCode=1;console.error(report.error)}
finally{await mkdir(join(root,suffix),{recursive:true});await writeFile(join(root,suffix,'source-contract.json'),JSON.stringify(report,null,2)+'\n')}
