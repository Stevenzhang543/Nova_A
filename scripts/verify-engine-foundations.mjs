/** Phase II foundations: actual production modules, with inert browser host surfaces in Node. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
const output=process.env.NOVA_FOUNDATIONS_REPORT||'reports/phase2/foundations.json',checks=[]
fs.mkdirSync('reports/phase2',{recursive:true})
const opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{box:'world/BoxEntity',hierarchy:'world/hierarchy',physics:'store/physics',prefabs:'runtime/prefabs'})
const {box:{BoxEntity},hierarchy:h,physics:p,prefabs}=opened.modules
const make=(id,x=0,uuid)=>new BoxEntity(id,{x,y:0},{x:1,y:1},uuid)
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)
function fixture(){h.invalidateHierarchyIndex();const first=make(100),parent=make(101,10),child=make(102,2),last=make(103);child.parentUuid=parent.uuid;return{parent,child,entities:[first,parent,child,last]}}
async function test(name,fn){try{await fn();checks.push({name,status:'passed'});console.log('PASS '+name)}catch(e){checks.push({name,status:'failed',error:String(e)});console.error('FAIL '+name+' '+e)}}
try{
 await test('Same-UUID middle replacement updates child transforms without changing array endpoints',()=>{
  const {parent,child,entities}=fixture();near(h.worldTransform(child,entities).position.x,12)
  entities.splice(1,1,make(parent.id,20,parent.uuid));near(h.worldTransform(child,entities).position.x,22)
 })
 await test('New parent UUID inserted in the middle is resolved; removed parents fall back locally',()=>{
  const {child,entities}=fixture();h.prepareHierarchyIndex(entities)
  const replacement=make(104,30);entities.splice(1,1,replacement);child.parentUuid=replacement.uuid
  near(h.worldTransform(child,entities).position.x,32)
  entities.splice(1,1,make(105,40));near(h.worldTransform(child,entities).position.x,2)
 })
 await test('World runtime invalidation cannot retain a replaced parent object',()=>{
  const {parent,child,entities}=fixture(),world=p.physicsState.world
  world.entities.splice(0,world.entities.length,...entities);near(h.worldTransform(child,world.entities).position.x,12)
  world.entities.splice(1,1,make(parent.id,50,parent.uuid));world.invalidateRuntime();near(h.worldTransform(child,world.entities).position.x,52)
 })
 await test('Reordering and cycle prevention use current parent membership',()=>{
  const {parent,child,entities}=fixture();h.prepareHierarchyIndex(entities)
  ;[entities[1],entities[2]]=[entities[2],entities[1]]
  near(h.worldTransform(child,entities).position.x,12);assert.equal(h.setParent(parent,child.uuid,entities),false)
 })
 await test('Mirrored hierarchy point conversions and reparenting preserve the existing TRS contract',()=>{
  const {parent,child,entities}=fixture();parent.transform.rotation=.7;parent.transform.scale={x:-2,y:2};child.transform.rotation=.3
  const point={x:3,y:-4},world=h.localPointToWorld(child,point,entities),local=h.worldPointToLocal(child,world,entities)
  near(local.x,point.x);near(local.y,point.y)
  const before=h.worldTransform(child,entities);assert.equal(h.setParent(child,null,entities),true);const after=h.worldTransform(child,entities)
  near(before.position.x,after.position.x);near(before.position.y,after.position.y);near(before.rotation,after.rotation);near(before.scale.x,after.scale.x)
 })
 await test('Unchanged parent lookups reuse the prepared index instead of scanning every entity',()=>{
  const {child,entities}=fixture();let maps=0
  entities.map=function(...args){maps++;return Array.prototype.map.apply(this,args)}
  for(let i=0;i<1000;i++)near(h.worldTransform(child,entities).position.x,12)
  assert.equal(maps,1)
 })
 await test('Actual prefab override reset updates children and survives undo/redo and serialization',()=>{
  const {parent,child,entities}=fixture(),world=p.physicsState.world
  world.entities.splice(0,world.entities.length,...entities);world.connections.splice(0);world.invalidateRuntime()
  const reference=prefabs.createPrefabFromEntities([parent.id,child.id],'Phase II hierarchy regression');assert.ok(reference)
  const root=world.entities.find(e=>e.id===parent.id),descendant=world.entities.find(e=>e.id===child.id)
  const base=h.worldTransform(descendant,world.entities).position.x
  root.transform.position.x+=20;p.pushHistory('Move prefab root')
  near(h.worldTransform(descendant,world.entities).position.x,base+20)
  const differences=prefabs.comparePrefabInstance(root),entry=differences.find(x=>x.path==='components')
  assert.ok(entry,JSON.stringify(differences));assert.equal(prefabs.resetPrefabOverride(root,entry.path),true)
  const current=()=>world.entities.find(e=>e.uuid===child.uuid)
  near(h.worldTransform(current(),world.entities).position.x,base)
  p.undo();near(h.worldTransform(current(),world.entities).position.x,base+20)
  p.redo();near(h.worldTransform(current(),world.entities).position.x,base)
  const saved=JSON.parse(p.getSceneJSON());assert.ok(saved.scenes.length)
  const hydrated=p.createEntityFromData(p.serializeEntity(current()));assert.equal(hydrated.parentUuid,current().parentUuid)
 })
}finally{
 const files=['src/world/hierarchy.ts','src/world/World.ts','src/runtime/prefabs.ts','src/store/physics.ts']
 fs.writeFileSync(output,JSON.stringify({format:'nova-phase2-foundations',version:1,generatedAt:new Date().toISOString(),engineVersion:JSON.parse(fs.readFileSync('package.json','utf8')).version,status:checks.length===7&&checks.every(c=>c.status==='passed')?'passed':'failed',scope:'Actual bundled production logic; browser services inert. Not a browser visual or native player qualification.',checks,sourceHashes:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]))},null,2)+'\n')
 await opened.close()
}
if(checks.some(c=>c.status==='failed'))process.exitCode=1
