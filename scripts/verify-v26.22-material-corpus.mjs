import assert from 'node:assert/strict'
import {propertyAudit22} from './lib/propertyAudit22.mjs'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
const audit=await propertyAudit22('material-corpus')
const opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',templates:'projects/templates',assets:'assets/AssetDatabase',materials:'renderer/materials',graph:'renderer/materialGraph',pak:'runtime/novaPak'})
try{
 const {physics:p,templates,assets,materials:m,graph:g,pak}=opened.modules,wasm=await opened.wasm()
 assert.ok(p.loadProject(wasm.module.migrate_project_json(templates.createTemplateProjectJson('empty','Material lifecycle'))))
 const parent=assets.createTextAsset('Parent material','material',m.serializeMaterial(m.defaultMaterial('Parent')),'Assets'),parentRef='asset://'+parent.uuid
 const material=m.defaultMaterial('Audit material');material.parentMaterial=parentRef;material.graph=g.defaultMaterialGraph();material.graph.nodes[0].values={amount:.5,label:'sample',enabled:true,color:[1,.5,0,1]};material.layers=[g.defaultMaterialLayer('Tint')];material.uniforms={amount:.5,toggle:true,vector:[1,2,3,4]};material.textures={image:null};material.uniformSchema=[{name:'amount',type:'range',label:'Amount',minimum:0,maximum:10,step:.1,options:['One','Two']}];material.includes=['nova/color'];material.variants={audit:'#define AUDIT 1',alternate:'#define AUDIT 2'};material.activeVariant='audit'
 const baseline=m.normalizeMaterial(material),record=assets.createTextAsset('Audit material','material',m.serializeMaterial(baseline),'Assets'),project=p.getSceneJSON(),cases=[],inventory=[]
 const enums={target:['Sprite','UI','Light'],blendMode:['Alpha','Additive','Multiply','Screen'],sampling:['Nearest','Linear'],colorSpace:['sRGB','Linear'],'uniformSchema.*.type':['number','integer','vector2','vector3','vector4','color','texture','enum','range','toggle'],'layers.*.kind':['Tint','Mask','Gradient','Palette','Outline','Dissolve','Distortion'],'graph.nodes.*.kind':['SpriteTexture','UITexture','LightColor','UV','Time','Color','Number','Gradient','Palette','Mask','Outline','Dissolve','Distortion','Multiply','Add','Blend','Output']}
 const get=(root,path)=>path.reduce((v,k)=>v[k],root),set=(root,path,value)=>{get(root,path.slice(0,-1))[path.at(-1)]=value}
 async function visit(value,path){
  if(value&&typeof value==='object'){for(const key of Object.keys(value))await visit(value[key],[...path,Array.isArray(value)?Number(key):key]);return}
  const id=path.map(k=>typeof k==='number'?'*':k).join('.'),field=path.at(-1)
  const row={id,path,owner:'normalizeMaterial / serializeMaterial / updateTextAssetTransactional',history:'Named material asset transaction / complete source Undo / field Redo; GUI interaction remains separate',runtime:'pending render effect or explicit editor-only classification',cases:[]};inventory.push(row)
  if(field==='version'||field==='format'){row.disposition='Fixed document format identity; not an editable value';return}
  let values=enums[id]||enums[field]||(typeof value==='boolean'?[!value]:typeof value==='number'?[value===0?.25:value*.75]:typeof value==='string'?[value+' audit']:[null])
  if(['uuid','id','fromNode','toNode','fromPin','toPin'].includes(field)){row.disposition='Identity/link field; tested by linked rename case below, not arbitrary invalid-reference replacement';return}
  if(id==='includes.*')values=['nova/noise','nova/shapes']
  if(id==='activeVariant')values=['alternate','']
  if(id==='parentMaterial')values=[null,parentRef]
  if(id==='uniformSchema.*.name')values=['other_amount']
  for(const candidate of values){
   assert.ok(p.loadProject(project));const next=structuredClone(baseline);set(next,path,candidate);const serialized=m.serializeMaterial(next),normalized=JSON.parse(serialized);assert.deepEqual(get(normalized,path),candidate,id+' normalization')
   const before=assets.readTextAsset(record.uuid);p.clearEditorHistory('material-corpus');assert.ok(p.beginHistoryTransaction('Edit material '+id,null,record.uuid+':'+id));assert.ok(assets.updateTextAssetTransactional(record.uuid,serialized));p.commitHistoryTransaction();assert.equal(assets.readTextAsset(record.uuid),serialized);if(before!==serialized){p.undo();assert.equal(assets.readTextAsset(record.uuid),before,id+' undo');p.redo();assert.equal(assets.readTextAsset(record.uuid),serialized,id+' redo')}
   assert.ok(p.loadProject(wasm.module.migrate_project_json(p.getSceneJSON())));assert.deepEqual(get(JSON.parse(assets.readTextAsset(record.uuid)),path),candidate,id+' native')
   const bytes=await pak.createNovaPak(p.getSceneJSON(),assets.assetState.records,p.sceneManager.activeSceneUuid,{compression:'balanced',deterministic:true});assert.ok(p.loadProject(wasm.module.migrate_project_json(await pak.projectJsonFromNovaPak(bytes))));assert.deepEqual(get(JSON.parse(assets.readTextAsset(record.uuid)),path),candidate,id+' export')
   row.cases.push(cases.length);cases.push({field:id,input:candidate,status:'passed',native:true,novaPak:true})
  }
 }
 await visit(baseline,[])
 const linked=structuredClone(baseline);linked.graph.nodes.find(n=>n.uuid==='input').uuid='renamed-input';linked.graph.edges[0].fromNode='renamed-input';linked.graph.edges[0].uuid='renamed-edge';linked.layers[0].id='renamed-layer';const renamed=m.normalizeMaterial(linked);assert.equal(renamed.graph.edges[0].fromNode,'renamed-input');assert.ok(renamed.graph.nodes.some(node=>node.uuid==='renamed-input'));assert.equal(renamed.layers[0].id,'renamed-layer');assert.ok(!g.validateMaterialGraph(linked.graph).some(d=>d.severity==='error'))
 await audit.write([{name:'Populated material fields and scalar enums persist through native and NovaPak asset owners',status:'passed',fields:inventory.length,cases:cases.length},{name:'Linked graph identity rename preserves valid connections',status:'passed'}],'Field persistence only: graph kind alternatives are not claimed as semantically valid render programs. Named asset history is checked per candidate; actual render/UI and additional nullable texture references remain separate.',{inventory,cases});console.log(JSON.stringify({fields:inventory.length,cases:cases.length,status:'passed'}))
}finally{await opened.close()}
