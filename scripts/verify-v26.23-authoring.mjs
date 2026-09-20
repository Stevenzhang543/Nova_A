import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const root=process.cwd(),executions=[];assert.equal(JSON.parse(await readFile('package.json','utf8')).version,'26.23.0')
for(const [origin,name,args,report] of [
 ['26.23','launcher-advanced-user',[],'launcher-advanced-user'],['26.23','shell-user',[],'shell-user'],['26.23','inventory-user',[],'inventory-user'],['26.23','static-host-user',[],'static-host-user'],['26.23','idle-resume',[],'idle-resume'],['26.23','template-library',['--qualification'],'template-library'],
 ['26.22','layout-user',[],'layout-user'],['26.22','foundations-user',[],'foundations-user'],['26.22','hierarchy-user',[],'hierarchy-user'],['26.22','palettes-user',[],'palette-user'],['26.22','palettes-user',['--layout'],'palette-layout'],['26.22','quality-user',[],'quality-user'],['26.22','menu-user',[],'menu-user'],['26.23','delivery-user',[],'delivery-user'],['26.22','package-user',[],'package-user']
]){const run=await runAudit(root,'scripts/verify-v'+origin+'-'+name+'.mjs',[...args,...(origin==='26.23'?[]:['--qualification-release=26.23'])]);run.reports=['release-audits/v26.23-'+report+'.json'];executions.push(run)}
const properties=await runAudit(root,'scripts/verify-v26.23-property-authoring.mjs');properties.reports=['release-audits/v26.23-property-authoring-bundle.json'];executions.push(properties)
await writeAuditBundle(root,'26.23','authoring',executions)
