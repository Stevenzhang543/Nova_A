import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url), checks = []
const test = async (name, fn) => { await fn(); checks.push({ name, status: 'passed' }); console.log('PASS', name) }
function moduleAt(path, dependencies = {}, globals = {}, transform = s => s) {
  const source = ts.transpileModule(transform(readFileSync(path, 'utf8')), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(source, { exports, require: id => id in dependencies ? dependencies[id] : require(id), console, ...globals }, { filename: path })
  return exports
}
await test('Unbound shape groups avoid quadratic scans and preserve polygons, filtering and intact binding behavior',async()=>{
 let calls=0;const triangle=[{x:0,y:0},{x:1,y:0},{x:0,y:1}];
 const geometry=moduleAt('src/world/compoundGeometry.ts',{'./Connection':{boundCompoundEntityIds(id){calls++;return new Set([id,2])},entityBoundaryPoints(){return triangle}}});
 const entities=Array.from({length:5000},(_,id)=>({id,enabled:true,hasComponent:()=>true,shapeType:'Polygon'}));
 const groups=geometry.compoundGeometries(entities,[]);assert.equal(calls,0);assert.equal(groups.length,5000);assert.deepEqual([...groups[4999].memberIds],[4999]);assert.equal(groups[4999].members[0],entities[4999]);assert.equal(groups[4999].boundary.length,3);
 assert.equal(geometry.compoundGeometries(entities,[{binding:true,breakState:'broken'}]).length,5000);assert.equal(calls,0);
 const subset=[entities[1],entities[2],{...entities[3],enabled:false},{...entities[4],hasComponent:()=>false}];
 assert.equal(geometry.compoundGeometries(subset,[]).length,2);
 const bound=geometry.compoundGeometries(subset,[{binding:true,breakState:'intact'}]);assert.equal(calls,1);assert.equal(bound.length,1);assert.deepEqual([...bound[0].memberIds],[1,2]);assert.equal(bound[0].members.length,2);
})
await test('5,000 colliding structural control IDs use one document index and retain suffixes',async()=>{
 let indexes=0;class Node{};class Element extends Node{constructor(){super();this.dataset={};this.tagName='BUTTON';this.innerText='Control';this.isConnected=true;this.attributes=new Map([['aria-label','Control']])}matches(){return false}closest(selector){return selector.includes('data-feature-state')?null:this}getAttribute(key){return this.attributes.get(key)??null}setAttribute(key,value){this.attributes.set(key,value)}removeAttribute(key){this.attributes.delete(key)}}
 const controls=Array.from({length:5000},()=>new Element());controls[0].dataset.testid='nova-application-button-1';
 const document={documentElement:{},querySelector(){throw Error('Repeated document collision search')},querySelectorAll(selector){if(selector==='[data-testid]'){indexes++;return controls.filter(e=>e.dataset.testid)}return controls}};
 const registry=moduleAt('src/runtime/controlRegistry.ts',{}, {Node,HTMLElement:Element,SVGElement:class extends Node{},HTMLInputElement:class{},HTMLTextAreaElement:class{},HTMLSelectElement:class{},HTMLAnchorElement:class{},document,MutationObserver:class{observe(){}}});
 registry.installStableControlRegistry();assert.equal(indexes,1);assert.equal(new Set(controls.map(e=>e.dataset.testid)).size,5000);assert.equal(controls.at(-1).dataset.testid,'nova-application-button-1-5000');assert.equal(controls[0].dataset.testid,'nova-application-button-1');
})
await test('5,000 mutations of one select refresh its label only a bounded number of times',async()=>{
 let callback, reads=0, labelText='Initial options';class Node {};
 class Element extends Node { constructor(){super();this.dataset={testid:'existing-select',surface:'test'};this.attributes=new Map();this.isConnected=true;this.tagName='SELECT';this.textContent='';this.innerText='';this.disabled=false}matches(selector){return selector.includes('button,input')}closest(selector){return selector==='label'?label:selector.includes('data-control-scope')?{dataset:{controlScope:'test'}}:null}getAttribute(name){return this.attributes.get(name)??null}setAttribute(name,value){this.attributes.set(name,value)}removeAttribute(name){this.attributes.delete(name)}querySelectorAll(){return []} }
 class Select extends Element { get labels(){return [{get textContent(){reads++;return labelText}}]} }
 const select=new Select(),label={querySelectorAll(){return [select]}};
 const registry=moduleAt('src/runtime/controlRegistry.ts',{}, {Node,HTMLElement:Element,SVGElement:class extends Node{},HTMLSelectElement:Select,HTMLInputElement:class{},HTMLTextAreaElement:class{},HTMLAnchorElement:class{},document:{documentElement:{},querySelectorAll(){return [select]}},MutationObserver:class{constructor(fn){callback=fn}observe(){}}})
 registry.installStableControlRegistry();reads=0;labelText='Updated options';callback(Array.from({length:5000},()=>({type:'childList',target:select,addedNodes:[]})))
 assert.ok(reads<=4,'Repeated complete label reads: '+reads);assert.equal(select.getAttribute('aria-label'),'Updated options');assert.equal(select.dataset.testid,'existing-select')
 select.isConnected=false;reads=0;callback([{type:'childList',target:select,addedNodes:[]}]);assert.equal(reads,0)
})
const session = moduleAt('src/projects/projectSession.ts', { './projectFormat': { NOVA_PROJECT_FORMAT: 'Nova_A Project Format 2' } })
let pending = new Map(), nextTimer = 0, imports = [], history = [], listeners = new Map()
class Control { constructor() { this.isConnected=true; this.disabled=false; this.readOnly=false; this.dataset={}; this.id=''; this.name=''; this.type='number'; this.labels=[]; this.scope={dataset:{surface:'inspector'}} } closest(selector) { return selector.includes('data-non-project-control') ? (this.nonProject ? {} : null) : this.scope } getAttribute() { return null } }
const physics = { physicsState: { playMode: 'editing' }, pushHistory: (...args) => history.push(args) }
const router = moduleAt('src/runtime/projectMutationRouter.ts', { '../projects/projectSession': session }, {
  HTMLInputElement: Control, HTMLTextAreaElement: class {}, HTMLSelectElement: class {},
  document: { addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type) },
  window: { setTimeout: fn => { pending.set(++nextTimer,fn); return nextTimer }, clearTimeout: id => pending.delete(id) },
  __loadPhysics: () => new Promise(resolve => imports.push(resolve))
}, source => source.replace("import('../store/physics')", '__loadPhysics()'))
const event = (target,type='input') => listeners.get(type)?.({target,type})
async function flush() { const callbacks=[...pending.values()]; pending.clear(); callbacks.forEach(fn=>fn()); imports.splice(0).forEach(resolve=>resolve(physics)); await Promise.resolve(); await Promise.resolve() }
await test('Separate unnamed controls never share a merge key; repeated edits to one control do', async()=>{
 router.installProjectMutationRouter(); const a=new Control(), b=new Control(); event(a); await flush(); event(b); await flush(); event(a); await flush(); assert.notEqual(history[0][1],history[1][1]); assert.equal(history[0][1],history[2][1]); assert.equal(history[0][2],'inspector/control')
})
await test('Reloading the same project cancels delayed edits',async()=>{const before=history.length;event(new Control());session.hydrateProjectMetadata({...session.projectSessionState});await flush();assert.equal(history.length,before)})
await test('Project replacement during lazy import cannot append history',async()=>{const before=history.length;event(new Control());const callbacks=[...pending.values()];pending.clear();callbacks.forEach(fn=>fn());session.beginProjectSession(session.newProjectMetadata('Replacement'));await flush();assert.equal(history.length,before)})
await test('Detached, disabled, read-only and editor-only controls are ignored',async()=>{const before=history.length;for(const key of ['isConnected','disabled','readOnly','nonProject']){const c=new Control();event(c);c[key]=key==='isConnected'?false:true;await flush()}assert.equal(history.length,before)})
await test('Disposal cancels queued and importing callbacks and permits clean reinstall',async()=>{const before=history.length;event(new Control());[...pending.values()].forEach(fn=>fn());pending.clear();event(new Control());router.disposeProjectMutationRouter();router.installProjectMutationRouter();await flush();assert.equal(history.length,before);event(new Control());await flush();assert.equal(history.length,before+1);router.disposeProjectMutationRouter();assert.equal(listeners.size,0);assert.equal(pending.size,0)})
await test('Gameplay input never records an editor command',async()=>{router.installProjectMutationRouter();const before=history.length;physics.physicsState.playMode='playing';event(new Control());await flush();assert.equal(history.length,before);router.disposeProjectMutationRouter()})
const palettes=moduleAt('src/store/colorPalettes.ts'), vue=require('vue')
for (const value of [undefined,'stacked','invalid']) await test(`Preference normalization, DOM application, persistence and reset: ${value}`,async()=>{
 const storage=new Map([['nova_a.preferences.v1',JSON.stringify({formLabelLayout:value})]]), root={dataset:{},style:{setProperty(){}},lang:''}
 const preferences=moduleAt('src/store/preferences.ts',{'./colorPalettes':palettes},{document:{documentElement:root},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}})
 assert.equal(preferences.preferencesState.formLabelLayout,value==='stacked'?'stacked':'auto');assert.equal(root.dataset.formLabelLayout,preferences.preferencesState.formLabelLayout)
 preferences.preferencesState.formLabelLayout='stacked';await vue.nextTick();assert.equal(root.dataset.formLabelLayout,'stacked');assert.equal(JSON.parse(storage.get('nova_a.preferences.v1')).formLabelLayout,'stacked')
 preferences.resetPreferences();await vue.nextTick();assert.equal(root.dataset.formLabelLayout,'auto')
})
mkdirSync('release-audits',{recursive:true});writeFileSync('release-audits/v26.21-foundations-regressions.json',JSON.stringify({status:'passed',generatedAt:new Date().toISOString(),checks,scope:'Executed actual TypeScript modules with controlled DOM/timer/import boundaries. Not browser or full project workflow qualification.'},null,2)+'\n')
