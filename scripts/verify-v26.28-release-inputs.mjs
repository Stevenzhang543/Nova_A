/** 发布输入预检：在冻结和长构建前验证版本、部署指南及逐文件清单格式。 */
import assert from 'node:assert/strict'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {assertReleaseSourceVersions} from './release-source-snapshot.mjs'
import {validateQualificationPlan} from './release-qualification.mjs'
await assertReleaseSourceVersions(process.cwd(),'26.28')
const ledger=await readFile('docs/EDIT_LEDGER_26_28.md','utf8'),notes=await readFile('docs/RELEASE_NOTES_26_28.md','utf8'),guide=await readFile('docs/WEB_HOSTING_26_28.md','utf8')
for(const text of [ledger,notes,guide]){assert.ok(text.includes('26.28'));assert.ok(text.includes('26.28.0'))}
assert.match(ledger,/Files (changed|added)/);assert.ok(ledger.includes('deterministic path-level manifest'))
const paths=[...ledger.matchAll(/^- `([^`]+)` — /gm)].map(/* 提取归档器要求的精确路径。 */ match=>match[1])
assert.ok(paths.length>=20);assert.equal(paths.length,new Set(paths).size)
for(const path of paths)await readFile(path)
const plan=validateQualificationPlan(JSON.parse(await readFile('release-audits/v26.28-qualification-plan.json','utf8')))
assert.ok(plan.gates.some(/* 实际媒体制作与导出流程是本版明确要求。 */ gate=>gate.id==='user-interactions'))
await mkdir('release-audits',{recursive:true})
await writeFile('release-audits/v26.28-release-inputs.json',JSON.stringify({format:'nova-release-input-verification',version:1,release:'26.28',engineVersion:'26.28.0',generatedAt:new Date().toISOString(),status:'passed',ledgerPaths:paths.length,gates:plan.gates.length,scope:'Release input/schema checks only; no build or behavior success is inferred.'}))
console.log('Release inputs verified: '+paths.length+' ledger paths')
