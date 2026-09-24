/** 测试夹具：为 v26.22-import-project.mjs 提供受控数据或执行环境，限定于对应验证场景。 */
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
/** Populated import fixture shared by independent programmer and user audits. */
/** 结构说明（自动提取）：populateImportProject22；输入 p、templates、assets、wasm；直接调用 assert.ok、p.loadProject、wasm.module.migrate_project_json、templates.createTemplateProjectJson、create 等；写入 ids.font、image.settings.platformVariants[…]、image.settings.platformOverrides[…]、font.settings.fontSettings.fallbackAssetUuids 等；包含循环处理；等待异步结果。 */ export async function populateImportProject22(p,templates,assets,wasm){
 assert.ok(p.loadProject(wasm.module.migrate_project_json(templates.createTemplateProjectJson('empty','Import lifecycle'))))
 const ids={}
 /** 结构说明（自动提取）：create；输入 type、mime、bytes、extra；直接调用 assets.createTextAsset、Object.assign、bytes.toString；写入 ids[…]；返回路径包含 record。 */ function create(type,mime,bytes,extra={}){const record=assets.createTextAsset('Import '+type,'resource','{}','Assets');Object.assign(record,{assetType:type,mimeType:mime,source:'data:'+mime+';base64,'+bytes.toString('base64'),byteLength:bytes.length,...extra});ids[type]=record.uuid;return record}
 const image=create('image','image/svg+xml',Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#369"/></svg>'),{width:16,height:16})
 const wave=Buffer.alloc(96044);wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(48000,24);wave.writeUInt32LE(96000,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(96000,40)
 const audio=create('audio','audio/wav',wave,{duration:1})
 const fontBytes=await readFile('node_modules/@fontsource-variable/nunito-sans/files/nunito-sans-latin-wght-normal.woff2')
 const font=create('font','font/woff2',fontBytes,{fontFamily:'Import audit font'}),fallback=create('font','font/woff2',fontBytes,{fontFamily:'Import fallback font'});ids.font=font.uuid
 create('script','text/plain',Buffer.from('fn update(dt) {}'))
 create('shader','text/plain',Buffer.from('void main() {}'))
 create('localization','application/json',Buffer.from('{"en":{"greeting":"Hello"},"de":{"greeting":"Hallo"}}'))
 Object.assign(image.settings,{spriteRegion:{x:0,y:0,width:4,height:4},polygonOutline:[{x:0,y:0},{x:8,y:0},{x:0,y:8}],extractedAnimationFrames:[{x:0,y:0,width:4,height:4}]})
 for(const platform of ['windows','linux','macos','web']){image.settings.platformVariants[platform]='Lossless';image.settings.platformOverrides[platform]={enabled:true,compression:'Lossless',maxSize:2048,format:'Auto'}}
 Object.assign(audio.settings.audioSettings,{loopRegions:[{id:'loop-a',name:'Loop A',start:.1,end:.4},{id:'loop-b',name:'Loop B',start:.5,end:.8}],activeLoopRegion:'loop-a',loopStart:.1,loopEnd:.4,trimStart:.05,trimEnd:.9})
 font.settings.fontSettings.fallbackAssetUuids=[fallback.uuid]
 const configured=JSON.parse(p.getSceneJSON());configured.projectSettings.presentation.localization.buildLocales=['en','de'];assert.ok(p.loadProject(JSON.stringify(configured)));const baseline=p.getSceneJSON();return {baseline,ids,image,fallback}
}
