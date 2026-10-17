/** 功能回归脚本：执行 verify-v26.22-component-history.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {propertyAudit22} from './lib/propertyAudit22.mjs'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
const audit=await propertyAudit22('component-history'),corpus=JSON.parse(await readFile('release-audits/v26.22-component-corpus.json','utf8'))
assert.equal(corpus.status,'passed')
const opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',components:'world/components',box:'world/BoxEntity',tilemap:'runtime/tilemap',templates:'projects/templates'})
try{
 const {physics:p,components:c,box,tilemap:t,templates}=opened.modules,wasm=await opened.wasm();assert.ok(p.loadProject(wasm.module.migrate_project_json(templates.createTemplateProjectJson('empty','Component history'))));const base=p.getSceneJSON(),cases=[]
 for(const [index,item]of corpus.cases.entries()){
  if(item.field==='@kind'||item.field==='@uuid'){cases.push({index,component:item.component,field:item.field,disposition:'Constructor identity; changing kind/UUID is component replacement, not an editable value. Creation/hydration retention is covered by the component corpus.'});continue}
  assert.ok(p.loadProject(base));const name=item.component,field=item.field.replace(/^@/,''),value=item.value,component=name==='ShapeRenderer2D'?new c[name]('Rectangle'):name==='Collider2D'?new c[name]('BoxCollider2D'):name==='Joint2D'?new c[name]('DistanceJoint2D'):new c[name](),entity=new box.BoxEntity(99001,{x:0,y:0},{x:2,y:2});if(name==='Collider2D')for(const kind of ['BoxCollider2D','EllipseCollider2D','PolygonCollider2D'])entity.removeComponent(kind);entity.componentMap.set(component.kind,component);p.physicsState.world.entities.push(entity)
  if(name==='Slider'&&field==='wholeNumbers')component.value=0
  if(name==='ShapeRenderer2D'&&field==='texture')component.textureAsset='asset://00009999-0000-4000-8000-000000000000'
  if(name==='RigidBody2D'&&field==='inertia')component.autoInertia=false
  if(name==='TileMap2D'&&field==='activeLayer')t.addTileLayer(component,'Audit layer')
  const snapshot=/** 结构说明（自动提取）：snapshot；无显式参数；直接调用 p.physicsState.world.entities.find、assert.ok、components.find、p.serializeEntity。 */ ()=>{const owner=p.physicsState.world.entities.find(/* 比较 e.uuid 与 entity.uuid，返回严格相等的判断结果。 */ e=>e.uuid===entity.uuid);assert.ok(owner);return p.serializeEntity(owner).components.find(/* 比较 row.uuid 与 component.uuid，返回严格相等的判断结果。 */ row=>row.uuid===component.uuid)},read=/** 结构说明（自动提取）：read；无显式参数；直接调用 snapshot。 */ ()=>{const row=snapshot();return field==='enabled'?row.enabled:row.data[field]},before=JSON.parse(JSON.stringify(snapshot())),previous=JSON.parse(JSON.stringify(read()));p.clearEditorHistory('component-history');assert.ok(p.beginHistoryTransaction('Edit '+name+'.'+field,null,entity.uuid+':'+component.uuid+':'+field))
  if(name==='TileMap2D'&&(field==='width'||field==='height'))t.resizeTileMap(component,field==='width'?value:component.width,field==='height'?value:component.height)
  else if(name==='TileMap2D'&&field==='tiles'){t.tilemapEditorState.tool='brush';t.tilemapEditorState.tileIndex=value[0];const stroke=t.beginTileStroke(component,{x:0,y:0});t.endTileStroke(component,stroke,{x:0,y:0})}
  else component[field]=structuredClone(value)
  p.commitHistoryTransaction();assert.deepEqual(JSON.parse(JSON.stringify(read())),value,name+'.'+field+' committed');if(JSON.stringify(previous)!==JSON.stringify(value)){p.undo();assert.deepEqual(JSON.parse(JSON.stringify(snapshot())),before,name+'.'+field+' undo whole component');p.redo();assert.deepEqual(JSON.parse(JSON.stringify(read())),value,name+'.'+field+' redo')}
  cases.push({index,component:name,field:item.field,status:'passed'});if(index%100===0)console.log('Component history '+index)
 }
 await audit.write([{name:'Canonical component values undo and redo through named document transactions',status:'passed',cases:cases.filter(/* 比较 row.status 与 'passed'，返回严格相等的判断结果。 */ row=>row.status==='passed').length}], 'Real component instances and document history. Constructor identities explicitly excluded from in-place editing; physical effects and GUI handlers remain separately qualified.',{cases});console.log('PASS '+cases.filter(/* 比较 row.status 与 'passed'，返回严格相等的判断结果。 */ row=>row.status==='passed').length+' component history cases')
}finally{await opened.close()}
