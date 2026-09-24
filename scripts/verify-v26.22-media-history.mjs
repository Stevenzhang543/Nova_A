/** 功能回归脚本：执行 verify-v26.22-media-history.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import {propertyAudit22} from './lib/propertyAudit22.mjs'
import {mediaFieldFixture} from './fixtures/v26.16-media-fields.mjs'
import {openMediaAuditModules,mediaUuid} from './lib/mediaAudit16.mjs'
const audit=await propertyAudit22('media-history'),opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',templates:'projects/templates',assets:'assets/AssetDatabase',authoring:'editor/animationAuthoring'})
try {
 const {physics:p,templates,assets,authoring:a}=opened.modules,wasm=await opened.wasm();assert.ok(p.loadProject(wasm.module.migrate_project_json(templates.createTemplateProjectJson('empty','Media history'))));const fixture=mediaFieldFixture(),checks=[]
 for(const [index,[type,document]]of Object.entries(fixture).entries()){const asset=assets.createTextAsset(type,type,JSON.stringify(document),'Assets');asset.uuid=mediaUuid(index+1)}
 const baseline=p.getSceneJSON()
 for(const [type,document]of Object.entries(fixture)){
  assert.ok(p.loadProject(baseline));const asset=assets.assetState.records.find(/* 比较 item.assetType 与 type，返回严格相等的判断结果。 */ item=>item.assetType===type),before=assets.readTextAsset(asset.uuid),edited=structuredClone(document);edited.name+=' edited';assert.deepEqual(a.inspectAnimationDraft(type,edited).issues,[]);const encoded=a.encodeAnimationDraft(edited);assert.deepEqual(a.decodeAnimationDraft(encoded),edited);p.clearEditorHistory('media-history');assert.ok(p.beginHistoryTransaction('Edit '+type+' document',null,'asset:'+asset.uuid));assert.ok(assets.updateTextAsset(asset.uuid,JSON.stringify(edited)));p.commitHistoryTransaction();assert.deepEqual(JSON.parse(assets.readTextAsset(asset.uuid)),edited);p.undo();assert.equal(assets.readTextAsset(asset.uuid),before);assert.deepEqual(JSON.parse(assets.readTextAsset(asset.uuid)),document);p.redo();assert.deepEqual(JSON.parse(assets.readTextAsset(asset.uuid)),edited);checks.push({name:type+': named asset edit restores the complete populated document through Undo/Redo',status:'passed'})
 }
 await audit.write(checks,'Whole populated animation/controller/mask/rig/skin/timeline document snapshots and their authored name edit. This is asset-owner history evidence, not independent mutation of each nested field or a runtime effect test.');console.log('PASS '+checks.length+' media history cases')
}finally{await opened.close()}
