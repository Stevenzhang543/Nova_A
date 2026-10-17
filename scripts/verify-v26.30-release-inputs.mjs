/** 发布输入预检：在冻结和长构建前验证版本、部署指南及逐文件清单格式。 */
import assert from 'node:assert/strict'
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises'
import {assertReleaseSourceVersions} from './release-source-snapshot.mjs'
import {validateQualificationPlan} from './release-qualification.mjs'
await assertReleaseSourceVersions(process.cwd(),'26.30')
const ledger=await readFile('docs/EDIT_LEDGER_26_30.md','utf8'),notes=await readFile('docs/RELEASE_NOTES_26_30.md','utf8'),guide=await readFile('docs/WEB_HOSTING_26_30.md','utf8')
for(const text of [ledger,notes,guide]){assert.ok(text.includes('26.30'));assert.ok(text.includes('26.30.0'))}
assert.match(ledger,/Files (changed|added)/);assert.ok(ledger.includes('deterministic path-level manifest'))
const paths=[...ledger.matchAll(/^- `([^`]+)` — /gm)].map(/* 提取归档器要求的精确路径。 */ match=>match[1])
assert.ok(paths.length>=20);assert.equal(paths.length,new Set(paths).size)
for(const path of paths)await readFile(path)
// 在长构建之前检查与发布归档一致的当前参考说明、版本及操作矩阵。
let currentReferences=0
for(const entry of await readdir('reference-projects/projects',{withFileTypes:true})){
 if(!entry.isDirectory())continue
 const base='reference-projects/projects/'+entry.name
 const project=JSON.parse(await readFile(base+'/project.nova','utf8'))
 const readme=await readFile(base+'/README.md','utf8'),expected=JSON.parse(await readFile(base+'/expected-output.json','utf8')),controls=JSON.parse(await readFile(base+'/test-controls.json','utf8'))
 const declared=readme.match(/Engine \*\*(\d+\.\d+\.\d+)\*\*/)?.[1]
 assert.ok(declared,entry.name+' README engine');assert.equal(declared=== '26.30.0',project.engineVersion==='26.30.0',entry.name+' README/project identity')
 assert.match(project.engineVersion,/^\d+\.\d+\.\d+$/);const parts=project.engineVersion.split('.').map(Number);assert.ok(parts[0]<26||(parts[0]===26&&(parts[1]<30||(parts[1]===30&&parts[2]===0))),entry.name+' future engine');assert.equal(project.projectFormatMajor,2);assert.equal(project.formatVersion,29)
 if(project.engineVersion!=='26.30.0')continue
 currentReferences++
 assert.ok(readme.includes('Engine **26.30.0**')&&/Project Format 2.*schema 29/.test(readme),entry.name)
 assert.equal(project.projectFormatMajor,2);assert.equal(project.formatVersion,29)
 for(const value of [expected,controls]){assert.equal(value.release,'26.30');assert.equal(value.engineVersion,'26.30.0');assert.equal(value.reference,entry.name);assert.ok(value.authoring)}
 assert.equal(expected.projectFormat,2);assert.equal(expected.schema,29);assert.equal(controls.authoring,expected.authoring)
 assert.ok(controls.classification?.length&&controls.actions?.length);for(const action of controls.actions)assert.ok(action.action?.trim()&&action.expected?.trim())
}
assert.ok(currentReferences>=1,'At least one complete current reference is required')
const plan=validateQualificationPlan(JSON.parse(await readFile('release-audits/v26.30-qualification-plan.json','utf8')))
assert.ok(plan.gates.some(/* 实际世界联网编辑与导出流程是本版明确要求。 */ gate=>gate.id==='user-interactions'))
assert.ok(plan.gates.find(/** 查找本版定向运行时门禁。 */ gate=>gate.id==='focus')?.reports.some(/** 原生无窗口物理证据单独归档，不与 WebView 玩家混用。 */ report=>report.target==='runtime/native-headless.json'&&report.format==='nova-native-headless-verification'))
for(const required of ['docs/FEATURE_INVENTORY_26_30.md','docs/PANEL_INVENTORY_26_30.md','docs/ISSUE_CLOSURE_26_30.md','docs/NATIVE_HEADLESS_26_30.md'])assert.ok(plan.documentation.includes(required),required)
// HTML 与 Markdown 当前身份同时检查，避免只有历史章节包含本版号码。
for(const locale of ['en','de','zh-CN']){const md=await readFile('manual/MANUAL.'+locale+'.md','utf8'),html=await readFile('manual/index.html','utf8');assert.ok(md.includes('26.30.0'),locale);assert.ok(html.includes('Nova_A 26.30')&&html.includes('26.30.0'),locale+' HTML identity')}
for(const id of ['rust','native-rust','templates','performance','security','clean-moved'])assert.ok(plan.gates.some(/** 最终收尾必须有实际构建、迁移与测量门禁。 */ gate=>gate.id===id),id)
await mkdir('release-audits',{recursive:true})
await writeFile('release-audits/v26.30-release-inputs.json',JSON.stringify({format:'nova-release-input-verification',version:1,release:'26.30',engineVersion:'26.30.0',generatedAt:new Date().toISOString(),status:'passed',ledgerPaths:paths.length,gates:plan.gates.length,scope:'Release input/schema checks only; no build or behavior success is inferred.'}))
console.log('Release inputs verified: '+paths.length+' ledger paths')
