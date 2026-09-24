/** 版本审计与用户夹具辅助库，区分开发证据和实际资格。 */
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {openMediaAuditModules} from './mediaAudit16.mjs'
import {populateImportProject22} from '../fixtures/v26.22-import-project.mjs'
/** 创建空白或导入项目夹具，写入缓存原生项目，并始终关闭临时模块环境。 */ export async function userFixture22(name,kind='empty'){
 assert.match(name,/^[a-z0-9-]+$/);assert.ok(['empty','imports'].includes(kind));
 const opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',templates:'projects/templates',assets:'assets/AssetDatabase'});
 try{const {physics:p,templates,assets}=opened.modules,wasm=await opened.wasm();let source;
 if(kind==='imports')source=(await populateImportProject22(p,templates,assets,wasm)).baseline;
 else{assert.ok(p.loadProject(wasm.module.migrate_project_json(templates.createTemplateProjectJson('empty','User audit '+name))));source=p.getSceneJSON()}
 const file=join(process.cwd(),'.cache','v2622-'+name+'.nova');await mkdir(join(process.cwd(),'.cache'),{recursive:true});await writeFile(file,source);return file;
 }finally{await opened.close()}
}

/** Actual menu input; a rejected studio Save must display its reason and write nothing. */
/** 通过实际保存菜单验证脏工作室阻止保存、显示提示且没有产生下载文件。 */ export async function blockedStudioSave22(a){
 const {readdir,mkdtemp}=await import('node:fs/promises'),{wait}=await import('./browserUserAudit.mjs');
 const folder=await mkdtemp(join(a.profile,'blocked-studio-'));
 await a.client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:folder,eventsEnabled:true});
 if(await a.evaluate("!!document.querySelector('.toast-stack article.error button')"))await a.click('.toast-stack article.error button');
 await a.click('.menu-item>button',0);await a.clickText('.menu-item .dropdown button','Save Project');
 await a.until("document.querySelector('.toast-stack article.error')?.textContent.includes('Save or discard')");
 await wait(350);assert.deepEqual(await readdir(folder),[],'Rejected Save must not download old asset sources');
 const message=await a.evaluate("document.querySelector('.toast-stack article.error').textContent");a.observations.push({name:'studio-save-rejected',message,files:0});
 await a.click('.toast-stack article.error button');return message;
}
