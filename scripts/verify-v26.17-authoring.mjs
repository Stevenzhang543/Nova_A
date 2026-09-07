import assert from 'node:assert/strict'
import{dirname,join}from'node:path'
import{fileURLToPath}from'node:url'
import{readFile}from'node:fs/promises'
import{runAudit,writeAuditBundle}from'./lib/milestoneAuditBundle.mjs'
const root=dirname(dirname(fileURLToPath(import.meta.url))),executions=[];assert.equal(JSON.parse(await readFile(join(root,'package.json'),'utf8')).version,'26.17.0');
for(const[name,minimum]of[['physics-world-user',9],['physics-operations-user',4],['physics-export-user',6],['physics-world-layout',1]]){const run=await runAudit(root,'scripts/verify-v26.17-'+name+'.mjs');run.reports=['release-audits/v26.17-'+name+'.json'];const report=JSON.parse(await readFile(join(root,run.reports[0]),'utf8'));assert.ok(report.checks.length>=minimum,name);if(name==='physics-world-layout')assert.equal(report.observations.length,1134,'21surfaces ×3locales ×3text scales ×2themes ×3viewports');executions.push(run)}
await writeAuditBundle(root,'26.17','authoring',executions);
