import assert from 'node:assert/strict'
import{dirname,join}from'node:path'
import{fileURLToPath}from'node:url'
import{readFile}from'node:fs/promises'
import{runAudit,writeAuditBundle}from'./lib/milestoneAuditBundle.mjs'
const root=dirname(dirname(fileURLToPath(import.meta.url))),executions=[];assert.equal(JSON.parse(await readFile(join(root,'package.json'),'utf8')).version,'26.18.0');
for(const[name,minimum]of[['network-user',4],['network-export-user',3],['network-layout',3]]){const run=await runAudit(root,'scripts/verify-v26.18-'+name+'.mjs');run.reports=['release-audits/v26.18-'+name+'.json'];const report=JSON.parse(await readFile(join(root,run.reports[0]),'utf8'));assert.ok(report.checks.length>=minimum,name);if(name==='network-layout')assert.equal(report.observations.length,432,'8surfaces ×3locales ×3text scales ×2themes ×3viewports');executions.push(run)}
await writeAuditBundle(root,'26.18','authoring',executions);
