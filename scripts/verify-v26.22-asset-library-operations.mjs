/** 功能回归脚本：执行 verify-v26.22-asset-library-operations.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import {propertyAudit22} from './lib/propertyAudit22.mjs'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
const audit=await propertyAudit22('asset-library-operations'),opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',templates:'projects/templates',assets:'assets/AssetDatabase'}),checks=[]
try{
 const {physics:p,templates,assets:a}=opened.modules,wasm=await opened.wasm();assert.ok(p.loadProject(wasm.module.migrate_project_json(templates.createTemplateProjectJson('empty','Asset library operations'))));
 const first=a.createTextAsset('Library source','script','fn start() {}','Assets/Scripts'),second=a.createTextAsset('Library other','script','fn update(dt) {}','Assets/Scripts'),id=first.uuid,otherId=second.uuid,baseline=p.getSceneJSON();
 /** 结构说明（自动提取）：check；输入 name、fn；直接调用 assert.ok、p.loadProject、p.clearEditorHistory、fn、checks.push 等；等待异步结果。 */ async function check(name,fn){assert.ok(p.loadProject(baseline));p.clearEditorHistory(name);await fn();checks.push({name,status:'passed'});console.log('PASS '+name)}
 /** 结构说明（自动提取）：history；输入 label、change；直接调用 p.getSceneJSON、assert.ok、p.beginHistoryTransaction、change、p.commitHistoryTransaction 等。 */ function history(label,change){const before=p.getSceneJSON();assert.ok(p.beginHistoryTransaction(label,null,'asset-library:'+id));change();assert.ok(p.commitHistoryTransaction());const after=p.getSceneJSON();assert.notEqual(after,before);p.undo();assert.equal(p.getSceneJSON(),before,label+' whole-document Undo');p.redo();assert.equal(p.getSceneJSON(),after,label+' whole-document Redo')}
 await check('Folder creation and asset moves retain source bytes and stable identity through history',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 a.readTextAsset、history、assert.equal、a.createAssetFolder、a.resolveAsset 等。 */ ()=>{
  const source=a.readTextAsset(id);history('Create folder',/* 调用 assert.equal(a.createAssetFolder('Assets','Library'),'Assets/Library') 并返回调用结果。 */ ()=>assert.equal(a.createAssetFolder('Assets','Library'),'Assets/Library'));
  assert.equal(a.createAssetFolder('Assets','library'),null);
  history('Move asset',/* 调用 assert.equal(a.moveAsset(id,'Assets/Library'),true) 并返回调用结果。 */ ()=>assert.equal(a.moveAsset(id,'Assets/Library'),true));assert.equal(a.resolveAsset(id).path,'Assets/Library/Library source.rhai');assert.equal(a.readTextAsset(id),source);assert.equal(a.moveAsset('missing','Assets'),false);
 });
 await check('Collection membership updates both owners and restores each toggle through history',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 history、assert.deepEqual、a.resolveAsset、a.assetState.collections.find、assert.equal 等。 */ ()=>{
  let collection;history('Create collection',/** 结构说明（自动提取）：history 回调；无显式参数；直接调用 a.createAssetCollection、assert.equal；写入 collection。 */ ()=>{collection=a.createAssetCollection(' Favorites ','invalid');assert.equal(collection.name,'Favorites');assert.equal(collection.color,'#6ea8fe')});
  history('Add collection member',/* 调用 assert.equal(a.toggleAssetInCollection(id,collection.id),true) 并返回调用结果。 */ ()=>assert.equal(a.toggleAssetInCollection(id,collection.id),true));assert.deepEqual(a.resolveAsset(id).collectionIds,[collection.id]);assert.deepEqual(a.assetState.collections.find(/* 比较 c.id 与 collection.id，返回严格相等的判断结果。 */ c=>c.id===collection.id).assetUuids,[id]);
  history('Remove collection member',/* 调用 assert.equal(a.toggleAssetInCollection(id,collection.id),false) 并返回调用结果。 */ ()=>assert.equal(a.toggleAssetInCollection(id,collection.id),false));assert.deepEqual(a.resolveAsset(id).collectionIds,[]);assert.equal(a.toggleAssetInCollection('missing',collection.id),false);assert.equal(a.createAssetCollection(' '),null);
 });
 await check('Favorites toggle reversibly and missing assets cannot be added',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 history、assert.ok、a.assetState.favorites.includes、p.getSceneJSON、a.toggleAssetFavorite 等。 */ ()=>{
  history('Favorite asset',/* 调用 assert.equal(a.toggleAssetFavorite(id),true) 并返回调用结果。 */ ()=>assert.equal(a.toggleAssetFavorite(id),true));assert.ok(a.assetState.favorites.includes(id));history('Unfavorite asset',/* 调用 assert.equal(a.toggleAssetFavorite(id),false) 并返回调用结果。 */ ()=>assert.equal(a.toggleAssetFavorite(id),false));const before=p.getSceneJSON();a.toggleAssetFavorite('missing');assert.equal(p.getSceneJSON(),before);
 });
 await check('Saved filters retain authored fields and apply their transient browsing selection',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 history、assert.equal、a.applyAssetFilter、a.deleteAssetFilter、a.saveCurrentAssetFilter；写入 a.assetState.search、a.assetState.currentFolder、a.assetState.typeFilter、a.assetState.tagFilter。 */ ()=>{
  a.assetState.search='Library';a.assetState.currentFolder='Assets/Scripts';a.assetState.typeFilter='script';a.assetState.tagFilter='test';let filter;
  history('Save filter',/** 结构说明（自动提取）：history 回调；无显式参数；直接调用 a.saveCurrentAssetFilter、assert.equal；写入 filter。 */ ()=>{filter=a.saveCurrentAssetFilter(' Scripts ');assert.equal(filter.name,'Scripts')});a.assetState.search='other';assert.equal(a.applyAssetFilter(filter.id),true);assert.equal(a.assetState.search,'Library');assert.equal(a.assetState.typeFilter,'script');assert.equal(a.assetState.tagFilter,'test');
  history('Delete filter',/* 调用 assert.equal(a.deleteAssetFilter(filter.id),true) 并返回调用结果。 */ ()=>assert.equal(a.deleteAssetFilter(filter.id),true));assert.equal(a.applyAssetFilter(filter.id),false);assert.equal(a.deleteAssetFilter(filter.id),false);assert.equal(a.saveCurrentAssetFilter(' '),null);
 });
 await check('Import presets clone settings and reject incompatible types without mutation',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 JSON.parse、JSON.stringify、a.resolveAsset、history、assert.equal 等；写入 settings.pixelsPerUnit。 */ ()=>{
  const settings=JSON.parse(JSON.stringify(a.resolveAsset(id).settings));settings.pixelsPerUnit=200;let preset;
  history('Save import preset',/** 结构说明（自动提取）：history 回调；无显式参数；直接调用 a.saveImportPreset；写入 preset。 */ ()=>{preset=a.saveImportPreset(' Script import ','script',settings)});settings.pixelsPerUnit=100;
  history('Apply import preset',/* 调用 assert.equal(a.applyImportPreset(preset.id,a.resolveAsset(otherId)),true) 并返回调用结果。 */ ()=>assert.equal(a.applyImportPreset(preset.id,a.resolveAsset(otherId)),true));assert.equal(a.resolveAsset(otherId).settings.pixelsPerUnit,200);assert.equal(a.resolveAsset(id).settings.pixelsPerUnit,100);
  const incompatible=a.saveImportPreset('Audio only','audio',settings),before=JSON.stringify(a.resolveAsset(id));assert.equal(a.applyImportPreset(incompatible.id,a.resolveAsset(id)),false);assert.equal(JSON.stringify(a.resolveAsset(id)),before);assert.equal(a.saveImportPreset(' ','all',settings),null);
 });
 await check('Asset removal and trash restoration preserve exact records and prevent duplicate identities',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 JSON.parse、JSON.stringify、a.resolveAsset、history、assert.equal 等。 */ ()=>{
  const record=JSON.parse(JSON.stringify(a.resolveAsset(id)));history('Delete library asset',/* 调用 assert.equal(a.deleteAsset(id),true) 并返回调用结果。 */ ()=>assert.equal(a.deleteAsset(id),true));assert.equal(a.resolveAsset(id),null);assert.equal(a.deleteAsset(id),false);
  history('Restore library asset',/* 调用 assert.equal(a.restoreAssetRecord(record),true) 并返回调用结果。 */ ()=>assert.equal(a.restoreAssetRecord(record),true));assert.deepEqual(JSON.parse(JSON.stringify(a.resolveAsset(id))),record);assert.equal(a.restoreAssetRecord(record),false);
 });
 await audit.write(checks,'Actual asset library operations with complete-document Undo/Redo; filter application is transient UI selection. This does not assert import codec execution or renderer effects.');
}finally{await opened.close()}
