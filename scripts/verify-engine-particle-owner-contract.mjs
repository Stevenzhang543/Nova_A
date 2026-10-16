import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {validateParticleOwner,canonicalBeforeParticleOwner} from './lib/particleOwnerContract.mjs'
const root=fileURLToPath(new URL('../',import.meta.url)),fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/particle-owner-transform-v1.json',import.meta.url),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex'),actual=p=>fs.readFileSync(path.join(root,p),'utf8'),sources=Object.fromEntries(fixture.files.map(r=>[r.path,actual(r.path)])),provider=p=>sources[p]??actual(p),checks=[]
const check=(name,fn)=>{const value=fn();checks.push({name,status:'PASS',value})}
check('actual-eleven-before-any-static-normalization',()=>{const p=validateParticleOwner();assert.equal(p.sourceFiles,11);assert.equal(p.algorithmProof.length,14);assert.equal(p.wholeInverse.length,9);assert.equal(p.coreOriginalCalls,4);assert.equal(p.mode,'merged');return p})
for(const row of fixture.files){
 check('reject-unknown-entire-'+row.path,()=>assert.throws(()=>validateParticleOwner(p=>p===row.path?sources[p]+'\n// changed\n':provider(p))))
 check('reject-missing-linked-'+row.path,()=>assert.throws(()=>validateParticleOwner(p=>p===row.path?undefined:provider(p))))
 check('canonical-rejects-unknown-known-'+row.path,()=>assert.throws(()=>canonicalBeforeParticleOwner(sources[row.path]+'\n',row.path,provider)))
}
for(const row of fixture.files.filter(r=>r.beforeSha256)){
 check('whole-exact-original-inverse-'+row.path,()=>assert.equal(sha(canonicalBeforeParticleOwner(sources[row.path],row.path,provider)),row.beforeSha256))
 check('historical-before-identity-'+row.path,()=>assert.equal(canonicalBeforeParticleOwner(row.before,row.path,()=>{throw new Error('Historical exact source must not read unavailable Owner')}),row.before))
}
for(const [name,p,from,to]of [
 ['seed-LCG','src/runtime/particleOwner.ts','Math.imul(state.seed, 1_664_525)','Math.imul(state.seed, 1_664_526)'],
 ['dt-cap','src/runtime/particleOwner.ts','clamp(delta, 0, 0, .25)','clamp(delta, 0, 0, .26)'],
 ['budget-floor','src/runtime/particleOwner.ts','Math.max(100, Math.floor','Math.max(101, Math.floor'],
 ['trail-order','src/runtime/particleOwner.ts','component.orderInLayer - .001','component.orderInLayer + .001'],
 ['private-reset','src/runtime/particleOwner.ts','this.states.clear()','this.states.clear(); this.diagnostics.activeParticles=0'],
 ['resource-port','src/runtime/particleOwner.ts','resources:ports.resources','resources:{...ports.resources}'],
 ['dispose-guard','src/runtime/particleOwner.ts',"throw new Error('PARTICLE_OWNER_DISPOSED')",'return'],
 ['Core-bound-World','src/runtime/GameplayRuntimeCore.ts','particleOwner.world!==this.worldHost.state.world','false'],
 ['required-Host','src/runtime/GameplayRuntimeCore.ts',"'createParticleOwner', ",''],
 ['source-guard','src/editor/rendererAdapter.ts','(sourceEntities??entities)!==owner.world.entities','false'],
 ['Lighting-World','src/editor/rendererAdapter.ts','particles.world!==world','false'],
 ['full-source-port','src/renderer/sceneRenderer.ts','submitParticles(renderer, visible, entities)','submitParticles(renderer, visible)'],
 ['Canvas-rendered-World','src/components/WorldCanvas.vue','editorSceneRendererEnvironment(()=>getEditorTileMapOwner(world),()=>sceneParticleOwner)','editorSceneRendererEnvironment(gameplayRuntime.particles)'],
 ['same-proxy','src/runtime/particles.ts','next.unwrap(next.diagnostics)!==raw','false'],
 ['root-retire','src/editor/particleAdapter.ts','legacy.dispose()','legacy.reset()']
 ])check('reject-real-algorithm-or-required-guard-'+name,()=>{assert(sources[p].includes(from),name+': actual mutation anchor');assert.throws(()=>validateParticleOwner(q=>q===p?sources[p].replace(from,to):provider(q)))})
check('all-actual-eleven-sources-terminal-unchanged',()=>{for(const row of fixture.files)assert.equal(actual(row.path),sources[row.path])})
const reportDir=path.resolve(root,process.argv.find(s=>s.startsWith('--report-dir='))?.slice('--report-dir='.length)??'.cache/engine-overhaul/particle-owner-contract');fs.mkdirSync(reportDir,{recursive:true});const report={schema:'nova-particle-owner-installed-contract-v1',status:'PASS',checks,sources:fixture.files.map(r=>({path:r.path,sha256:sha(sources[r.path])})),limits:['Static proof is independent of old helpers; Root must add Particle normalization before older precise SHA gates.','Real original10/after23 and ordinaryWASM/Rhai qualification is separate, retained with firstfailures.','No GUI/GPU/hardware/performance/whole M1 qualification.'],formalWrites:0};fs.writeFileSync(path.join(reportDir,'source-contract.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'PASS',checks:checks.length,report:path.join(reportDir,'source-contract.json')}))
