import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {readFileSync} from 'node:fs'
import {canonicalBeforePresentationOwner,validatePresentationOwnerMigration} from './lib/presentationOwnerContract.mjs'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {resolve,join} from 'node:path'
import {validateAudioOwnerMigration,canonicalBeforeAudioOwner} from './lib/audioOwnerContract.mjs'
const root=fileURLToPath(new URL('../',import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex'),fixture=JSON.parse(await readFile(new URL('./fixtures/audio-owner-transform-v1.json',import.meta.url),'utf8'))
const actualSources=Object.fromEntries(await Promise.all(fixture.files.map(async r=>[r.path,await readFile(join(root,r.path),'utf8')]))),readActual=p=>actualSources[p]??readFileSync(join(root,p),'utf8')
// Validate the actual linked Presentation9 and original Audio16 first using the actual source provider.
const actualPresentationQualification=validatePresentationOwnerMigration(readActual),actualAudioQualification=validateAudioOwnerMigration(readActual)
// Exact Presentation inverse is static source normalization. All original Audio assertions see the approved Audio16 preimage.
const sources=Object.fromEntries(Object.entries(actualSources).map(([p,text])=>[p,canonicalBeforePresentationOwner(text,p,readActual)])),provider=p=>sources[p],checks=[]
const check=(name,fn)=>{fn();checks.push({name,status:'PASS'})}
check('all-16-actual-sources-full-Audio-Buffered-GameUI-algorithms-and-wiring',()=>{const proof=validateAudioOwnerMigration(provider);assert.equal(proof.sourceFiles,16);assert.equal(proof.audio.methods,44);assert.equal(proof.audio.fields,30);assert.equal(proof.audio.valueFunctions.length,8)})
for(const row of fixture.files)check('reject-unreviewed-entire-source-'+row.path,()=>assert.throws(()=>validateAudioOwnerMigration(p=>p===row.path?sources[p]+'\n// unknown change\n':provider(p))))
for(const row of fixture.files.filter(r=>r.originalSha256))check('whole-previous-source-inverse-'+row.path,()=>assert.equal(sha(canonicalBeforeAudioOwner(sources[row.path],row.path,provider)),row.originalSha256))
for(const [name,path,from,to] of [
 ['same-context-active-slot','src/runtime/audioRuntime.ts','this.cancelPendingOutputDeviceRoute(true);','this.cancelPendingOutputDeviceRoute();'],
 ['latest-request-generation','src/runtime/audioRuntime.ts','request.generation===this.lifecycleGeneration','true'],
 ['latest-request-order','src/runtime/audioRuntime.ts','request.serial===this.outputDeviceRequestSerial','true'],
 ['single-shared-Core-Timeline-audio','src/runtime/GameplayRuntimeCore.ts','createAnimationTimelineOwner(this.scriptServices,audioOwner)','createAnimationTimelineOwner(this.scriptServices,this.worldHost.createAudioOwner(this.scriptServices))'],
 ['actual-Player-controller-audio','src/components/WorldCanvas.vue','new GameUiRuntime(gameplayRuntime.audio)','new GameUiRuntime()']
])check('reject-real-regression-'+name,()=>{assert(sources[path].includes(from),'Real mutation anchor '+name);assert.throws(()=>validateAudioOwnerMigration(p=>p===path?sources[p].replace(from,to):provider(p)))})
// Restore actual-source values solely for the original end-of-test byte guard and actual SHA report.
Object.assign(sources,actualSources)
for(const r of fixture.files)assert.equal(await readFile(join(root,r.path),'utf8'),sources[r.path],'Tests must not change actual source')
const option=process.argv.find(a=>a.startsWith('--report-dir=')),dir=resolve(root,option?option.slice('--report-dir='.length):'.cache/engine-overhaul/formal-audio-owner');await mkdir(dir,{recursive:true})
const report={schema:'nova-audio-owner-installed-whole-source-contract-v1',status:'PASS',checks,sourceFiles:fixture.files.map(r=>({path:r.path,sha256:sha(sources[r.path])})),sourceWrites:0,actualQualification:{presentation:actualPresentationQualification,audio:actualAudioQualification},limits:['Whole-source algorithm, connection and guarded regression qualification only','Actual Core/Rhai/WASM and lifecycle12 evidence are separate; no PCM/hardware/performance/complete M1 claim']};await writeFile(join(dir,'source-contract.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:checks.length,report:join(dir,'source-contract.json')}))
