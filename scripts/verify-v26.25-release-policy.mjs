/** 发布风险范围回归：只允许显式未执行项，不放宽构建身份和必需行为证据。 */
import assert from 'node:assert/strict'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {validateQualificationPlan,requiredGateIds,riskRequiredGateIds} from './release-qualification.mjs'
/** 根据门禁标识构造报告路径和版本约束测试数据。 */
const report = (id) => ({path:'release-audits/'+id+'.json',target:({focus:'runtime/focused-verification.json',typescript:'runtime/verification.json',web:'build/web.json','native-build':'build/native-build.json',product:'runtime/product-audit.json','browser-layout':'layout/layout-browser.json','user-interactions':'runtime/user-interactions.json',windows:'build/windows-smoke.json',headless:'build/headless-authority.json',hygiene:'security/repository-hygiene.json',manual:'manual/audit.json'})[id],format:'test',version:1,requireRelease:true,requireEngine:true})
const plan={format:'nova-release-qualification-plan',version:1,release:'26.25',machineVersion:'26.25.0',releaseNotes:'docs/RELEASE_NOTES_26_25.md',editLedger:'docs/EDIT_LEDGER_26_25.md',auditPolicy:{kind:'change-risk-v1',authorization:'User explicitly requested skipping unrelated checks.',omitted:requiredGateIds.filter(/* 仅为计划之外的可选检查提供理由。 */ id=>!riskRequiredGateIds.includes(id)).map(/* 保留未运行状态，不能写为通过。 */ id=>({id,status:'not-run',reason:'Unchanged subsystem; required build checks retained.'}))},gates:riskRequiredGateIds.map(/* 生成最小结构化计划，用于校验器边界而非冒充实际执行。 */ id=>({id,category:['browser-layout','user-interactions','windows','headless'].includes(id)?'user':'programmer',context:'Schema validation fixture only',command:{file:process.execPath,args:[]},reports:[report(id)]}))}
plan.gates[0].artifacts=['web-editor','web-player','windows-editor','windows-nsis','windows-msi','windows-headless-authority'].map(/* 仅供结构测试的产物路径。 */ name=>({name,path:'fixtures/'+name}))
assert.equal(validateQualificationPlan(plan),plan)
let checks=1
/** 独立复制测试计划，确认畸形范围不能通过发布校验。 */
function rejects(change){const copy=structuredClone(plan);change(copy);assert.throws(/** 执行被修改的计划校验，要求抛出拒绝错误。 */ ()=>validateQualificationPlan(copy));checks++}
rejects(/* 核心检查不可标为跳过。 */ p=>{p.gates=p.gates.filter(/** 从测试计划移除必需的聚焦检查以验证拒绝路径。 */ g=>g.id!=='focus');p.auditPolicy.omitted.push({id:'focus',status:'not-run',reason:'Skip'})})
rejects(/* 遗漏理由不完整应拒绝。 */ p=>p.auditPolicy.omitted.pop())
rejects(/* 无用户授权应拒绝。 */ p=>p.auditPolicy.authorization='')
rejects(/* 未执行不能声称通过。 */ p=>p.auditPolicy.omitted[0].status='passed')
rejects(/* 同一门禁不能既执行又省略。 */ p=>p.auditPolicy.omitted.push({id:'focus',status:'not-run',reason:'duplicate'}))
rejects(/* 旧版本继续使用原完整门禁。 */ p=>{p.release='26.24';p.machineVersion='26.24.0'})
rejects(/* 构建产物仍需完整。 */ p=>p.gates[0].artifacts.pop())
rejects(/* 未知策略不能绕过校验。 */ p=>p.auditPolicy.kind='skip-everything')
const engineVersion=JSON.parse(await readFile('package.json','utf8')).version
await mkdir('release-audits',{recursive:true})
await writeFile('release-audits/v26.25-release-policy.json',JSON.stringify({format:'nova-release-policy-regression',version:1,release:'26.25',engineVersion,generatedAt:new Date().toISOString(),status:'passed',checks}))
console.log('Release policy: '+checks+' checks passed')
