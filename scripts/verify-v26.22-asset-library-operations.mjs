import assert from 'node:assert/strict'
import {propertyAudit22} from './lib/propertyAudit22.mjs'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
const audit=await propertyAudit22('asset-library-operations'),opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',templates:'projects/templates',assets:'assets/AssetDatabase'}),checks=[]
try{
 const {physics:p,templates,assets:a}=opened.modules,wasm=await opened.wasm();assert.ok(p.loadProject(wasm.module.migrate_project_json(templates.createTemplateProjectJson('empty','Asset library operations'))));
 const first=a.createTextAsset('Library source','script','fn start() {}','Assets/Scripts'),second=a.createTextAsset('Library other','script','fn update(dt) {}','Assets/Scripts'),id=first.uuid,otherId=second.uuid,baseline=p.getSceneJSON();
 async function check(name,fn){assert.ok(p.loadProject(baseline));p.clearEditorHistory(name);await fn();checks.push({name,status:'passed'});console.log('PASS '+name)}
 function history(label,change){const before=p.getSceneJSON();assert.ok(p.beginHistoryTransaction(label,null,'asset-library:'+id));change();assert.ok(p.commitHistoryTransaction());const after=p.getSceneJSON();assert.notEqual(after,before);p.undo();assert.equal(p.getSceneJSON(),before,label+' whole-document Undo');p.redo();assert.equal(p.getSceneJSON(),after,label+' whole-document Redo')}
 await check('Folder creation and asset moves retain source bytes and stable identity through history',()=>{
  const source=a.readTextAsset(id);history('Create folder',()=>assert.equal(a.createAssetFolder('Assets','Library'),'Assets/Library'));
  assert.equal(a.createAssetFolder('Assets','library'),null);
  history('Move asset',()=>assert.equal(a.moveAsset(id,'Assets/Library'),true));assert.equal(a.resolveAsset(id).path,'Assets/Library/Library source.rhai');assert.equal(a.readTextAsset(id),source);assert.equal(a.moveAsset('missing','Assets'),false);
 });
 await check('Collection membership updates both owners and restores each toggle through history',()=>{
  let collection;history('Create collection',()=>{collection=a.createAssetCollection(' Favorites ','invalid');assert.equal(collection.name,'Favorites');assert.equal(collection.color,'#6ea8fe')});
  history('Add collection member',()=>assert.equal(a.toggleAssetInCollection(id,collection.id),true));assert.deepEqual(a.resolveAsset(id).collectionIds,[collection.id]);assert.deepEqual(a.assetState.collections.find(c=>c.id===collection.id).assetUuids,[id]);
  history('Remove collection member',()=>assert.equal(a.toggleAssetInCollection(id,collection.id),false));assert.deepEqual(a.resolveAsset(id).collectionIds,[]);assert.equal(a.toggleAssetInCollection('missing',collection.id),false);assert.equal(a.createAssetCollection(' '),null);
 });
 await check('Favorites toggle reversibly and missing assets cannot be added',()=>{
  history('Favorite asset',()=>assert.equal(a.toggleAssetFavorite(id),true));assert.ok(a.assetState.favorites.includes(id));history('Unfavorite asset',()=>assert.equal(a.toggleAssetFavorite(id),false));const before=p.getSceneJSON();a.toggleAssetFavorite('missing');assert.equal(p.getSceneJSON(),before);
 });
 await check('Saved filters retain authored fields and apply their transient browsing selection',()=>{
  a.assetState.search='Library';a.assetState.currentFolder='Assets/Scripts';a.assetState.typeFilter='script';a.assetState.tagFilter='test';let filter;
  history('Save filter',()=>{filter=a.saveCurrentAssetFilter(' Scripts ');assert.equal(filter.name,'Scripts')});a.assetState.search='other';assert.equal(a.applyAssetFilter(filter.id),true);assert.equal(a.assetState.search,'Library');assert.equal(a.assetState.typeFilter,'script');assert.equal(a.assetState.tagFilter,'test');
  history('Delete filter',()=>assert.equal(a.deleteAssetFilter(filter.id),true));assert.equal(a.applyAssetFilter(filter.id),false);assert.equal(a.deleteAssetFilter(filter.id),false);assert.equal(a.saveCurrentAssetFilter(' '),null);
 });
 await check('Import presets clone settings and reject incompatible types without mutation',()=>{
  const settings=JSON.parse(JSON.stringify(a.resolveAsset(id).settings));settings.pixelsPerUnit=200;let preset;
  history('Save import preset',()=>{preset=a.saveImportPreset(' Script import ','script',settings)});settings.pixelsPerUnit=100;
  history('Apply import preset',()=>assert.equal(a.applyImportPreset(preset.id,a.resolveAsset(otherId)),true));assert.equal(a.resolveAsset(otherId).settings.pixelsPerUnit,200);assert.equal(a.resolveAsset(id).settings.pixelsPerUnit,100);
  const incompatible=a.saveImportPreset('Audio only','audio',settings),before=JSON.stringify(a.resolveAsset(id));assert.equal(a.applyImportPreset(incompatible.id,a.resolveAsset(id)),false);assert.equal(JSON.stringify(a.resolveAsset(id)),before);assert.equal(a.saveImportPreset(' ','all',settings),null);
 });
 await check('Asset removal and trash restoration preserve exact records and prevent duplicate identities',()=>{
  const record=JSON.parse(JSON.stringify(a.resolveAsset(id)));history('Delete library asset',()=>assert.equal(a.deleteAsset(id),true));assert.equal(a.resolveAsset(id),null);assert.equal(a.deleteAsset(id),false);
  history('Restore library asset',()=>assert.equal(a.restoreAssetRecord(record),true));assert.deepEqual(JSON.parse(JSON.stringify(a.resolveAsset(id))),record);assert.equal(a.restoreAssetRecord(record),false);
 });
 await audit.write(checks,'Actual asset library operations with complete-document Undo/Redo; filter application is transient UI selection. This does not assert import codec execution or renderer effects.');
}finally{await opened.close()}
