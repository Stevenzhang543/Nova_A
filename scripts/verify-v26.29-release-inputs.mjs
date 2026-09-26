/** 发布输入预检：在冻结和长构建前验证版本、部署指南及逐文件清单格式。 */
import assert from 'node:assert/strict'
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises'
import {assertReleaseSourceVersions} from './release-source-snapshot.mjs'
import {validateQualificationPlan} from './release-qualification.mjs'
await assertReleaseSourceVersions(process.cwd(),'26.29')
const ledger=await readFile('docs/EDIT_LEDGER_26_29.md','utf8'),notes=await readFile('docs/RELEASE_NOTES_26_29.md','utf8'),guide=await readFile('docs/WEB_HOSTING_26_29.md','utf8')
for(const text of [ledger,notes,guide]){assert.ok(text.includes('26.29'));assert.ok(text.includes('26.29.0'))}
assert.match(ledger,/Files (changed|added)/);assert.ok(ledger.includes('deterministic path-level manifest'))
const paths=[...ledger.matchAll(/^- `([^`]+)` — /gm)].map(/* 提取归档器要求的精确路径。 */ match=>match[1])
assert.ok(paths.length>=20);assert.equal(paths.length,new Set(paths).size)
for(const path of paths)await readFile(path)
// 在长构建之前检查与发布归档一致的当前参考说明、版本及操作矩阵。
for(const entry of await readdir('reference-projects/projects',{withFileTypes:true})){
 if(!entry.isDirectory())continue
 const base='reference-projects/projects/'+entry.name
 const project=JSON.parse(await readFile(base+'/project.nova','utf8'))
 if(project.engineVersion!=='26.29.0')continue
 const readme=await readFile(base+'/README.md','utf8'),expected=JSON.parse(await readFile(base+'/expected-output.json','utf8')),controls=JSON.parse(await readFile(base+'/test-controls.json','utf8'))
 assert.ok(readme.includes('Engine **26.29.0**')&&/Project Format 2.*schema 29/.test(readme),entry.name)
 assert.equal(project.projectFormatMajor,2);assert.equal(project.formatVersion,29)
 for(const value of [expected,controls]){assert.equal(value.release,'26.29');assert.equal(value.engineVersion,'26.29.0');assert.equal(value.reference,entry.name);assert.ok(value.authoring)}
 assert.equal(expected.projectFormat,2);assert.equal(expected.schema,29);assert.equal(controls.authoring,expected.authoring)
 assert.ok(controls.classification?.length&&controls.actions?.length);for(const action of controls.actions)assert.ok(action.action?.trim()&&action.expected?.trim())
}
const plan=validateQualificationPlan(JSON.parse(await readFile('release-audits/v26.29-qualification-plan.json','utf8')))
assert.ok(plan.gates.some(/* 实际世界联网编辑与导出流程是本版明确要求。 */ gate=>gate.id==='user-interactions'))
assert.ok(plan.gates.find(/** 查找本版定向运行时门禁。 */ gate=>gate.id==='focus')?.reports.some(/** 原生无窗口物理证据单独归档，不与 WebView 玩家混用。 */ report=>report.target==='runtime/native-headless.json'&&report.format==='nova-native-headless-verification'))
for(const required of ['docs/WORLD_26_29.md','docs/NETWORK_26_29.md','docs/PLATFORM_26_29.md','docs/NATIVE_HEADLESS_26_29.md'])assert.ok(plan.documentation.includes(required),required)
await mkdir('release-audits',{recursive:true})
await writeFile('release-audits/v26.29-release-inputs.json',JSON.stringify({format:'nova-release-input-verification',version:1,release:'26.29',engineVersion:'26.29.0',generatedAt:new Date().toISOString(),status:'passed',ledgerPaths:paths.length,gates:plan.gates.length,scope:'Release input/schema checks only; no build or behavior success is inferred.'}))
console.log('Release inputs verified: '+paths.length+' ledger paths')
