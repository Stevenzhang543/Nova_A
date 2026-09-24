/** 功能回归脚本：执行 verify-v26.16-authoring.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import{dirname,join}from'node:path'
import{fileURLToPath}from'node:url'
import{readFile}from'node:fs/promises'
import{runAudit,writeAuditBundle}from'./lib/milestoneAuditBundle.mjs'
const root=dirname(dirname(fileURLToPath(import.meta.url))),executions=[]
assert.equal(JSON.parse(await readFile(join(root,'package.json'),'utf8')).version,'26.16.0')
for(const[name,minimum]of [['interface-user',11],['animation-authoring-user',9],['menu-user',12],['media-layout',1]]){const execution=await runAudit(root,'scripts/verify-v26.16-'+name+'.mjs');execution.reports=['release-audits/v26.16-'+name+'.json'];const report=JSON.parse(await readFile(join(root,execution.reports[0]),'utf8'));assert.ok(report.checks.length>=minimum,name+' actual workflow groups');if(name==='media-layout')assert.equal(report.observations.length,54,'Three media surfaces across18 locale/scale/theme combinations');executions.push(execution)}
await writeAuditBundle(root,'26.16','authoring',executions)
