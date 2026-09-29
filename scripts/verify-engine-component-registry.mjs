/** Registry completeness must reach composition, runtime mutation and persistence. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
const opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',registry:'world/componentRegistry',contracts:'world/componentPrimitiveTypes',composition:'runtime/objectComposition',dynamic:'runtime/dynamicObjects',box:'world/BoxEntity',project:'projects/projectData'})
const {physics:p,registry:r,contracts:{componentPrimitiveTypes},composition:c,dynamic:d,box:{BoxEntity},project}=opened.modules,checks=[]
async function test(name,run){try{await run();checks.push({name,status:'passed'});console.log('PASS '+name)}catch(e){checks.push({name,status:'failed',error:String(e)});console.error('FAIL '+name+' '+e)}}
try{
 await test('Every persisted primitive component kind has shared registry metadata',()=>{assert.deepEqual(Object.keys(componentPrimitiveTypes).filter(kind=>!r.STABLE_COMPONENT_KINDS.includes(kind)),[]);assert.equal(new Set(r.STABLE_COMPONENT_KINDS).size,r.STABLE_COMPONENT_KINDS.length)})
 for(const [i,kind] of ['WeldJoint2D','MotorJoint2D','RopeJoint2D'].entries())await test(kind+' composes, toggles at runtime and roundtrips through project serialization',()=>{
  const entity=new BoxEntity(700+i,{x:0,y:0},{x:1,y:1});p.physicsState.world.entities.splice(0,p.physicsState.world.entities.length,entity);p.physicsState.world.invalidateRuntime()
  const plan=c.planObjectComposition(entity,[kind],[]);c.applyObjectComposition(entity,plan);assert.ok(entity.getComponent(kind));assert.equal(d.applyTargetMutation(entity,{type:'componentEnabled',component:kind,enabled:false}),true);assert.equal(entity.getComponent(kind,true).enabled,false)
  const serialized=p.serializeEntity(entity),restored=p.createEntityFromData(serialized,900+i);assert.equal(restored.getComponent(kind,true).enabled,false);assert.equal(d.applyTargetMutation(entity,{type:'componentEnabled',component:kind,enabled:true}),true)
  const saved=JSON.parse(p.getSceneJSON()),validation=project.validateProjectDocument(saved);assert.ok(saved.scenes.some(scene=>scene.entities.some(item=>item.components.some(component=>component.kind===kind))));assert.ok(!validation.issues.some(issue=>issue.code==='unknown-component'&&issue.message.includes(kind)),JSON.stringify(validation.issues))
 })
}finally{
 const file='src/world/componentRegistry.ts',out=process.env.NOVA_REGISTRY_REPORT||'reports/phase2/component-registry.json';fs.writeFileSync(out,JSON.stringify({generatedAt:new Date().toISOString(),status:checks.every(c=>c.status==='passed')?'passed':'failed',engineVersion:JSON.parse(fs.readFileSync('package.json')).version,checks,sourceHashes:{[file]:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')},scope:'Real component registry/composition/mutation/project modules. Solver behavior remains covered separately.'},null,2)+'\n');await opened.close()
}
if(checks.some(c=>c.status==='failed'))process.exitCode=1
