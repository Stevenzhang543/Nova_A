/** 功能回归脚本：执行 verify-v26.13-authoring.mjs 对应场景，保留断言和证据输出。 */
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { runAudit, writeAuditBundle } from './lib/milestoneAuditBundle.mjs'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
assert.ok(!process.env.NOVA_AUDIT_ROOT && !process.env.NOVA_AUDIT_EXPECTED_RELEASE, 'Release authoring must use the current production build')
const executions = []
for (const name of ['workspace-authoring', 'studio-authoring', 'project-authoring', 'panels']) {
  const execution = await runAudit(root, `scripts/verify-v26.13-${name}.mjs`)
  execution.reports = [`release-audits/v26.13-${name}.json`, ...(name === 'panels' ? ['release-audits/v26.13-panel-matrix.json'] : [])]
  executions.push(execution)
}
await writeAuditBundle(root, '26.13', 'authoring', executions)
