import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const root=process.cwd(),executions=[];assert.equal(JSON.parse(await readFile('package.json','utf8')).version,'26.20.0')
for(const [version,name,args,report] of [
 ['26.20','template-library',['--qualification'],'template-library'],
 ['26.20','palettes-user',[],'palette-user'],['26.20','palettes-user',['--layout'],'palette-layout'],['26.20','quality-user',[],'quality-user'],['26.20','menu-user',[],'menu-user'],
 ['26.20','delivery-user',[],'delivery-user'],['26.20','package-user',[],'package-user']
]){const run=await runAudit(root,'scripts/verify-v'+version+'-'+name+'.mjs',args);run.reports=['release-audits/v26.20-'+report+'.json'];executions.push(run)}
await writeAuditBundle(root,'26.20','authoring',executions)
