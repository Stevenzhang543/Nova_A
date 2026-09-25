/** 26.25 事件继承回归：执行真实解析、保存及调度模块，保留版本化证据。 */
import assert from 'node:assert/strict'
import { propertyAudit22 } from './lib/propertyAudit22.mjs'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'
const audit=await propertyAudit22('events'),opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',templates:'projects/templates',assets:'assets/AssetDatabase',events:'runtime/eventSheets',blueprints:'runtime/objectBlueprints'})
try{
 const {physics:p,templates,assets:a,events:e,blueprints:b}=opened.modules,wasm=await opened.wasm(),checks=[]
 assert.ok(p.loadProject(wasm.module.migrate_project_json(templates.createTemplateProjectJson('empty','Event inheritance'))))
 /** 在真实模块断言全部完成后记录该组通过状态。 */ function check(name,operation){operation();checks.push({name,status:'passed'})}
 const logic=a.createTextAsset('Logic','script','fn start() {} fn on_signal(name,payload,source) {}','Assets')
 const base=e.createEventSheetAsset('Base',a.assetReference(logic.uuid)),child=e.createEventSheetAsset('Child',a.assetReference(logic.uuid))
 const root=e.readEventSheet(base.uuid),draft=e.readEventSheet(child.uuid)
 root.handlers=[{...e.defaultEventHandler('signal'),uuid:base.uuid.localeCompare(child.uuid)<0?'z-base':'a-base',selector:'score',callback:'on_signal',overrideInherited:false}]
 draft.handlers=[{...e.defaultEventHandler('signal'),uuid:base.uuid.localeCompare(child.uuid)<0?'a-child':'z-child',selector:'score',callback:'on_signal',overrideInherited:false}];draft.baseSheetAsset=a.assetReference(base.uuid)
 assert.equal(e.saveEventSheetAsset(base.uuid,root),true);assert.equal(e.saveEventSheetAsset(child.uuid,draft),true)
 check('Planner preserves runtime inheritance order for equal priority',/** 比较运行时解析结果与调度器顺序，避免随机处理器标识二次排序。 */ ()=>{
  const expected=e.resolveEventHandlers(a.assetReference(child.uuid)).map(/** 提取解析后的处理器身份以比较执行顺序。 */ item=>item.uuid),entity={uuid:'entity',enabled:true,script2D:{enabled:true,eventSheetAsset:a.assetReference(child.uuid)}}
  assert.equal(expected.length,2)
  assert.deepEqual(e.scheduleObjectEvents([entity],'signal','score').map(/** 提取调度任务的处理器身份以核对解析顺序。 */ item=>item.handlerUuid),expected)
 })
 check('Unsaved override preview matches later save without mutating source',/** 草稿禁用覆盖应移除继承处理器，预览不能提前保存。 */ ()=>{
  const before=a.readTextAsset(child.uuid),preview=structuredClone(draft);preview.handlers[0].overrideInherited=true;preview.handlers[0].enabled=false
  assert.deepEqual(e.resolveEventHandlers(a.assetReference(child.uuid),new Set(),preview),[]);assert.equal(a.readTextAsset(child.uuid),before)
  assert.equal(e.saveEventSheetAsset(child.uuid,preview),true);assert.deepEqual(e.resolveEventHandlers(a.assetReference(child.uuid)),[])
  assert.equal(e.saveEventSheetAsset(child.uuid,draft),true)
 })
 check('Event cyclic inheritance and identity edits never mutate project',/** 保存失败必须保留项目源以及资源代次。 */ ()=>{
  for(const candidate of [{...root,baseSheetAsset:a.assetReference(child.uuid)},{...root,uuid:'replaced-identity'}]){
   const before=p.getSceneJSON(),generation=a.assetState.generation;assert.equal(e.saveEventSheetAsset(base.uuid,candidate),false);assert.equal(p.getSceneJSON(),before);assert.equal(a.assetState.generation,generation)
  }
 })
 check('Corrupt imported chain cannot execute a partial handler list',/** 导入的循环链由解析器整体拒绝，不运行局部继承结果。 */ ()=>{
  a.updateTextAssetTransactional(base.uuid,e.serializeEventSheet({...root,baseSheetAsset:a.assetReference(child.uuid)}))
  assert.deepEqual(e.resolveEventHandlers(a.assetReference(child.uuid)),[]);a.updateTextAssetTransactional(base.uuid,e.serializeEventSheet(root))
 })
 check('Blueprint cycle and wrong destination are rejected at persistence boundary',/** 不依赖界面校验也禁止蓝图保存破坏资源身份或建立循环。 */ ()=>{
  const parent=b.createObjectBlueprintAsset(b.defaultObjectBlueprint('Parent')),derivedDoc=b.defaultObjectBlueprint('Derived');derivedDoc.baseBlueprintAsset=a.assetReference(parent.uuid)
  const derived=b.createObjectBlueprintAsset(derivedDoc),candidate=b.readObjectBlueprint(parent.uuid);candidate.baseBlueprintAsset=a.assetReference(derived.uuid)
  const before=p.getSceneJSON();assert.equal(b.saveObjectBlueprintAsset(parent.uuid,candidate),false);assert.equal(b.saveObjectBlueprintAsset(logic.uuid,candidate),false);assert.equal(p.getSceneJSON(),before)
 })
 await audit.write(checks,'Production event resolver, planner and event/blueprint persistence. Covers inheritance order, unsaved preview parity, disabled overrides, identity/cycle rejection and fail-closed imported chains. No browser or suspended VM claim.')
 console.log(`PASS ${checks.length} event inheritance groups`)
}finally{await opened.close()}
