/** Strict Particle ownership inverse. No previous contract/helper imports or mutable registry. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {canonicalBeforeNetworkSources} from './networkSourceProjection.mjs'
import {createHash} from 'node:crypto'
import ts from 'typescript'
import {canonicalBeforeGraphDebugOwner} from './graphDebugOwnerContract.mjs'
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/particle-owner-transform-v1.json',import.meta.url),'utf8'))
assert.equal(fixture.schema,'nova-particle-owner-transform-v1');assert.equal(fixture.files.length,11)
const hash=value=>createHash('sha256').update(value).digest('hex'),pathKey=p=>p.replaceAll('\\','/'),actual=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8'),readRaw=(p,provider)=>{const value=typeof provider==='function'?provider(p):provider[p];assert.equal(typeof value,'string',p+': actual synchronous linked source required');return value},read=(p,provider)=>canonicalBeforeGraphDebugOwner(p,canonicalBeforeNetworkSources(p,readRaw(p,provider),q=>readRaw(q,provider)),q=>readRaw(q,provider))
const parse=(p,text)=>{const tree=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true);assert.equal(tree.parseDiagnostics.length,0,p+': actual source parse');return tree}
const replace=(text,from,to,count)=>{assert(from.length>0);assert.equal(text.split(from).length-1,count,'Exact Particle inverse anchor '+from.slice(0,80));return text.split(from).join(to)}
function modeFor(provider){const digest=hash(read('src/runtime/GameplayRuntimeCore.ts',provider)),row=fixture.files.find(r=>r.path==='src/runtime/GameplayRuntimeCore.ts');if(digest===row.afterSha256)return 'merged';if(digest===row.standalone.afterSha256)return 'standalone';assert.fail('Unapproved actual linked Particle Core cohort')}
function view(row,mode){return mode==='merged'?row:row.standalone}
function wiringInverse(text,row,mode){const selected=view(row,mode);for(const step of [...selected.steps].reverse())text=replace(text,step.to,step.from,step.count);assert.equal(text,selected.before,row.path+': whole original file inverse');assert.equal(hash(text),selected.beforeSha256);return text}
function proof(provider,selectedMode){
 const mode=selectedMode??modeFor(provider),sources=new Map(fixture.files.map(row=>{const text=read(row.path,provider);assert.equal(hash(text),view(row,mode).afterSha256,'Unapproved actual Particle source '+row.path);return[row.path,text]})),owner=sources.get('src/runtime/particleOwner.ts'),tree=parse('particleOwner.ts',owner),algorithmInverse=new Map(),algorithmProof=[]
 for(const row of fixture.algorithmSpans){let expected=row.original;for(const step of row.steps)expected=replace(expected,step.from,step.to,step.count);assert.equal(owner.split(expected).length,2,'Unique actual complete original declaration '+row.name);let inverse=owner.slice(owner.indexOf(expected),owner.indexOf(expected)+expected.length);for(const step of [...row.steps].reverse())inverse=replace(inverse,step.to,step.from,step.count);assert.equal(inverse,row.original,'Complete original declaration and defaults '+row.name);assert.equal(hash(inverse),row.originalSha256);algorithmInverse.set(row.name,inverse);algorithmProof.push({name:row.name,originalSha256:hash(inverse),actualSha256:hash(expected)})}
 assert.equal(algorithmProof.length,14)
 const originalParticles=fixture.originalSegments.map(row=>row.algorithm?algorithmInverse.get(row.algorithm):row.literal).join('');assert.equal(hash(originalParticles),fixture.originalParticlesSha256,'Entire original module reconstructed from actual fourteen declarations and unchanged original remainder')
 const valueImports=tree.statements.filter(ts.isImportDeclaration).filter(n=>!n.importClause?.isTypeOnly).map(n=>n.moduleSpecifier.text);assert.deepEqual(valueImports,['./particleEmitterValues','../world/hierarchy']);assert(!/\bimport\s*\(|\brequire\s*\(/.test(owner),'No hidden value import')
 const facade=sources.get('src/runtime/particles.ts'),adapter=sources.get('src/editor/particleAdapter.ts'),renderer=sources.get('src/editor/rendererAdapter.ts'),canvas=sources.get('src/components/WorldCanvas.vue'),core=sources.get('src/runtime/GameplayRuntimeCore.ts')
 assert(owner.includes('private readonly states=new Map<string,EmitterState>()'));assert(owner.includes('this.requireActive()'));assert(owner.includes('Object.freeze({resources:ports.resources'));assert(!owner.includes('performance.now()'))
 assert(facade.includes('next.unwrap(next.diagnostics)!==raw'));assert(facade.includes('owner.diagnostics!==particleDiagnostics'));assert(facade.includes('entities!==owner.world.entities'))
 assert(adapter.includes('new WeakMap<ParticleWorld,RuntimeParticleOwner>()'));assert(adapter.includes('if(options.legacyRoot&&legacy&&legacy.world!==world)legacy.dispose()'));assert(adapter.includes('get generation(){return assetState.generation},resolveTexture'));assert(adapter.includes('reactive(createInitialParticleDiagnostics())'))
 assert(core.includes('createParticleOwner: worldHost.createParticleOwner.bind(worldHost)'));assert(core.includes('particleOwner.world!==this.worldHost.state.world'));assert.equal(core.split('this.particles.update(').length-1,3);assert.equal(core.split('this.particles.reset()').length-1,1)
 assert.equal(renderer.split("throw new Error('PARTICLE_RENDER_WORLD_MISMATCH')").length-1,2);assert(renderer.includes("throw new Error('PARTICLE_LIGHTING_WORLD_MISMATCH')"));assert(renderer.includes(mode==='merged'?'const sceneParticleOwners=new WeakMap<SceneRendererEnvironment,()=>RuntimeParticleOwner>()':'const sceneParticleOwners=new WeakMap<SceneRendererEnvironment,RuntimeParticleOwner>()'))
 assert(sources.get('src/renderer/sceneRenderer.ts').includes('environment.submitParticles(renderer, visible, entities)'));assert(sources.get('src/renderer/SceneRendererEnvironment.ts').includes('sourceEntities?: Entity[]'));if(mode==='merged'){assert(renderer.includes('tile?:()=>TileMapOwner,particles?:()=>RuntimeParticleOwner'));assert(renderer.includes("tile().tileChunkCommands(...args)"));assert(renderer.includes('const owner=particles()'));assert(canvas.includes('const sceneParticleOwner = createEditorParticleOwner(world,{legacyRoot:true})'));assert(canvas.includes('editorSceneRendererEnvironment(()=>getEditorTileMapOwner(world),()=>sceneParticleOwner)'))}else{assert(canvas.includes('editorSceneRendererEnvironment(createEditorParticleOwner(world,{legacyRoot:true}))'))};assert(canvas.includes('editorLightingEnvironment(sceneRendererEnvironment,world)'));assert(!canvas.includes('editorSceneRendererEnvironment(gameplayRuntime.particles)'))
 const wholeInverse=fixture.files.filter(row=>view(row,mode).beforeSha256).map(row=>{const original=row.path==='src/runtime/particles.ts'?originalParticles:wiringInverse(sources.get(row.path),row,mode);assert.equal(hash(original),view(row,mode).beforeSha256);return{path:row.path,beforeSha256:hash(original),afterSha256:hash(sources.get(row.path))}})
 return {mode,sourceFiles:11,newModules:2,algorithmProof,wholeOriginalParticlesSha256:hash(originalParticles),wholeInverse,valueImports,linkedActual11:true,coreOriginalCalls:4,sourceIdentity:'O(1) original full array, distinct from visible',world:'Canvas actual physicsState.world retained',noPreviousHelperImports:true}
}
export function validateParticleOwner(sourceFor=actual){return proof(sourceFor)}
export function canonicalBeforeParticleOwner(source,p,sourceFor=actual){
 p=pathKey(p);source=canonicalBeforeNetworkSources(p,source,q=>readRaw(q,sourceFor));const row=fixture.files.find(r=>r.path===p)
 assert.equal(typeof source,'string',p+': actual canonical source required');const prior=hash(source)
 if(!row||row.acceptedBefore.some(r=>r.sha256===prior))return source
 const raw=q=>readRaw(q,sourceFor),graph=q=>canonicalBeforeGraphDebugOwner(q,raw(q),raw)
 source=canonicalBeforeGraphDebugOwner(p,source,raw);const digest=hash(source)
 assert(digest===row.afterSha256||digest===row.standalone.afterSha256,'Unapproved known Particle source '+p)
 const provider=q=>q===p?source:graph(q),mode=modeFor(provider),result=proof(provider,mode)
 if(!view(row,mode).beforeSha256)return source
 if(p==='src/runtime/particles.ts'){assert.equal(result.wholeOriginalParticlesSha256,view(row,mode).beforeSha256);return fixture.originalSegments.map(r=>r.algorithm?fixture.algorithmSpans.find(a=>a.name===r.algorithm).original:r.literal).join('')}
 return wiringInverse(source,row,mode)
}
