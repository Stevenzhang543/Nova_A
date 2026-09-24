/** 版本26.14：组织教学步骤与示例说明，生成版本教程和用户操作文档。 */
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=dirname(dirname(fileURLToPath(import.meta.url))),release='26.14',engine='26.14.0',escape=/* 调用 value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;') 并返回调用结果。 */ value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
assert.equal(JSON.parse(await readFile(join(root,'package.json'),'utf8')).version,engine)
let html=await readFile(join(root,'manual/index.html'),'utf8'),supplement='<!-- NOVA_V2614_START -->\n<div class="release-supplement">'
for(const [language,sourceLanguage]of [['en','en'],['de','de'],['zh-CN','zh']]){
 const lesson=(await readFile(join(root,'docs','OBJECT_FAMILY_LESSON_26_14.'+sourceLanguage+'.md'),'utf8')).replaceAll('\r\n','\n'),path=join(root,'manual','MANUAL.'+language+'.md'),before=await readFile(path,'utf8')
 const chapter='<!-- NOVA_V2614_START -->\n## 26.14 — '+lesson.replace(/^# /,'').split('\n')[0]+'\n\nEngine: **26.14.0** · Project Format 2/schema 29.\n\n'+lesson.slice(lesson.indexOf('\n')+1)+'\n<!-- NOVA_V2614_END -->\n'
 const updated=before.replace(/^# Nova_A 26\.\d+/,'# Nova_A 26.14').replace(/<!-- NOVA_V2614_START -->[\s\S]*?<!-- NOVA_V2614_END -->\r?\n?/,'');const split=updated.indexOf('\n');await writeFile(path,updated.slice(0,split)+'\n\n'+chapter+'\n'+updated.slice(split+1))
 const paragraphs=lesson.trim().split(/\n\s*\n/).map(/* 根据 block.startsWith('# ') 的真假，分别返回 '<h2>26.14 — '+escape(block.slice(2))+'</h2>' 或 '<p>'+escape(block).replaceAll('\n','<br>')+'</p>'。 */ block=>block.startsWith('# ')?'<h2>26.14 — '+escape(block.slice(2))+'</h2>':'<p>'+escape(block).replaceAll('\n','<br>')+'</p>').join('')
 supplement+='<article data-lang="'+language+'"><section id="'+language+'-v2614-objects"><p>Engine 26.14.0 · Project Format 2/schema 29.</p>'+paragraphs+'</section></article>'
}
supplement+='</div>\n<!-- NOVA_V2614_END -->\n'
html=html.replace(/<!-- NOVA_V2614_START -->[\s\S]*?<!-- NOVA_V2614_END -->\r?\n?/,'').replace(/<title>Nova_A 26\.\d+ Manual<\/title>/,'<title>Nova_A 26.14 Manual</title>').replace(/26\.\d+ Offline Teaching Manual/g,'26.14 Offline Teaching Manual').replace(/(<meta name="description" content="Complete Nova_A )26\.\d+( \(engine )26\.\d+\.0/,'$126.14$226.14.0')
const at=html.indexOf('<script>');assert.ok(at>=0);await writeFile(join(root,'manual/index.html'),html.slice(0,at)+supplement+html.slice(at))
