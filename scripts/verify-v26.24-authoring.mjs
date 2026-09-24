/** 26.24 用户创作门禁：逐项执行真实浏览器输入，并保留每份新报告及其截图。 */
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
assert.equal(JSON.parse(await readFile('package.json','utf8')).version,'26.24.0','Release authoring requires actual 26.24 source')
const executions=[]
for(const name of ['graph-user','diagnostics-user','studio-authoring','bottom-dock','asset-window','large-graph-user','binding-user','creator-delivery-user','evidence-status-user']){
  const run=await runAudit(process.cwd(),'scripts/verify-v26.24-'+name+'.mjs')
  run.reports=['release-audits/v26.24-'+name+'.json'];executions.push(run)
}
const retained=await runAudit(process.cwd(),'scripts/verify-v26.24-retained-user.mjs');retained.reports=['release-audits/v26.24-retained-user-bundle.json'];executions.push(retained)
await writeAuditBundle(process.cwd(),'26.24','authoring',executions)
