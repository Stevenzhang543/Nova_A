/** 功能回归脚本：执行 verify-v26.22-authoring.mjs 对应场景，保留断言和证据输出。 */
// Retained 26.20 regression implementation, executed against actual 26.22 source.
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const root=process.cwd(),executions=[];assert.equal(JSON.parse(await readFile('package.json','utf8')).version,'26.22.0')
for(const [version,name,args,report] of [
 ['26.22','layout-user',[],'layout-user'],
 ['26.22','foundations-user',[],'foundations-user'],['26.22','hierarchy-user',[],'hierarchy-user'],
 ['26.22','template-library',['--qualification'],'template-library'],
 ['26.22','palettes-user',[],'palette-user'],['26.22','palettes-user',['--layout'],'palette-layout'],['26.22','quality-user',[],'quality-user'],['26.22','menu-user',[],'menu-user'],
 ['26.22','delivery-user',[],'delivery-user'],['26.22','package-user',[],'package-user']
]){const run=await runAudit(root,'scripts/verify-v'+version+'-'+name+'.mjs',args);run.reports=['release-audits/v26.22-'+report+'.json'];executions.push(run)}
const properties=await runAudit(root,'scripts/verify-v26.22-property-authoring.mjs');properties.reports=['release-audits/v26.22-property-authoring-bundle.json'];executions.push(properties)
await writeAuditBundle(root,'26.22','authoring',executions)
