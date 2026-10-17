import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {resolve,join} from 'node:path'
import {validatePresentationOwnerMigration,canonicalBeforePresentationOwner} from './lib/presentationOwnerContract.mjs'
const root=fileURLToPath(new URL('../',import.meta.url)),fixture=JSON.parse(await readFile(new URL('./fixtures/presentation-owner-transform-v1.json',import.meta.url),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex'),checks=[]
const sources=Object.fromEntries(await Promise.all(fixture.files.map(async row=>[row.path,await readFile(join(root,row.path),'utf8')]))),provider=p=>sources[p]??readFileSync(join(root,p),'utf8'),check=(name,fn)=>{fn();checks.push({name,status:'PASS'})}
check('actual-nine-source-eleven-original-functions-whole-scaffolds-and-six-wirings',()=>{const proof=validatePresentationOwnerMigration();assert.equal(proof.sourceFiles,9);assert.equal(proof.functions.length,11);assert.equal(proof.wiring.length,6)})
for(const row of fixture.files)check('reject-unreviewed-entire-source-'+row.path,()=>assert.throws(()=>validatePresentationOwnerMigration(p=>p===row.path?sources[p]+'\n// unknown source\n':provider(p))))
for(const row of fixture.files.filter(x=>x.beforeSha256))check('whole-Audio16-before-source-inverse-'+row.path,()=>assert.equal(sha(canonicalBeforePresentationOwner(sources[row.path],row.path,provider)),row.beforeSha256))
for(const path of fixture.createdFiles)check('missing-actual-required-module-rejected-'+path,()=>assert.throws(()=>validatePresentationOwnerMigration(p=>p===path?undefined:provider(p))))
for(const[path,from,to]of [['src/runtime/presentationOwner.ts','runtimeCaptions.length > 32','runtimeCaptions.length > 31'],['src/runtime/presentationOwner.ts',"throw new Error('PRESENTATION_OWNER_RETIRED: Recreate the Owner for its current World.')","return"]])check('reject-actual-limit-or-retired-guard-'+from,()=>{assert(sources[path].includes(from));assert.throws(()=>validatePresentationOwnerMigration(p=>p===path?sources[p].replace(from,to):provider(p)))})
check('all-actual-sources-remain-byte-exact',()=>{for(const row of fixture.files)assert.equal(readFileSync(join(root,row.path),'utf8'),sources[row.path])})
const suffix=process.argv.find(x=>x.startsWith('--report-dir='))?.slice('--report-dir='.length)??'.cache/engine-overhaul/formal-presentation-owner',dir=resolve(root,suffix);await mkdir(dir,{recursive:true});const report={schema:'nova-presentation-owner-installed-contract-v1',status:'PASS',checks,sourceFiles:fixture.files.map(x=>({path:x.path,sha256:sha(sources[x.path])})),sourceWrites:0,limits:['Static full-source/default/body/guard proof; real 21 scoped Core/Rhai/WASM/Vue/UI checks are separately frozen.','No GUI/GPU/performance/whole M1 qualification.']};await writeFile(join(dir,'source-contract.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({checks:checks.length,report:join(dir,'source-contract.json')}))
