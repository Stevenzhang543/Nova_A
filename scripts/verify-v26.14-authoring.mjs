/** 功能回归脚本：执行 verify-v26.14-authoring.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import {dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const root=dirname(dirname(fileURLToPath(import.meta.url))),executions=[]
assert.ok(!process.env.NOVA_AUDIT_ROOT&&!process.env.NOVA_AUDIT_EXPECTED_RELEASE)
for(const name of ['enemy-family','family-runtime-user']){const execution=await runAudit(root,'scripts/verify-v26.14-'+name+'.mjs');execution.reports=['release-audits/v26.14-'+(name==='family-runtime-user'?'family-runtime':name)+'.json'];executions.push(execution)}
await writeAuditBundle(root,'26.14','authoring',executions)
