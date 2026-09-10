import assert from 'node:assert/strict'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {readFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const root=dirname(dirname(fileURLToPath(import.meta.url))),executions=[];assert.equal(JSON.parse(await readFile(join(root,'package.json'),'utf8')).version,'26.19.0');
for(const[name,args,reportName,minimum,surfaces]of[['delivery-user',[],'delivery-user',4,0],['package-user',[],'package-user',4,0],['delivery-user',['--layout'],'delivery-layout',2,54],['package-user',['--layout'],'package-layout',2,108]]){const run=await runAudit(root,'scripts/verify-v26.19-'+name+'.mjs',args);run.reports=['release-audits/v26.19-'+reportName+'.json'];const report=JSON.parse(await readFile(join(root,run.reports[0]),'utf8'));assert.ok(report.checks.length>=minimum,reportName);if(surfaces)assert.equal(report.observations.filter(x=>/^(en|de|zh)-/.test(x.name)).length,surfaces);executions.push(run)}
await writeAuditBundle(root,'26.19','authoring',executions);
