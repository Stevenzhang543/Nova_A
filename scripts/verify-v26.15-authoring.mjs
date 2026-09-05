import assert from 'node:assert/strict'
import{readFile}from'node:fs/promises'
import{dirname,join}from'node:path'
import{fileURLToPath}from'node:url'
import{runAudit,writeAuditBundle}from'./lib/milestoneAuditBundle.mjs'
import{activeMilestoneBuild}from'./lib/milestoneBuildReceipt.mjs'
const root=dirname(dirname(fileURLToPath(import.meta.url))),executions=[],build=await activeMilestoneBuild(root,'26.15')
for(const [script,reports]of [['asset-authoring',['v26.15-asset-authoring.json']],['asset-layout',['v26.15-asset-layout.json','v26.15-asset-layout-matrix.json']],['template-library',['v26.15-template-library.json']],['template-ui-user',['v26.15-template-ui-user.json']],['rendering-authoring',['v26.15-rendering-authoring.json']]]){const execution=await runAudit(root,'scripts/verify-v26.15-'+script+'.mjs');execution.reports=reports.map(name=>'release-audits/'+name);if(script==='template-library'){const report=JSON.parse(await readFile(join(root,execution.reports[0]),'utf8'));assert.equal(report.checks.length,41);assert.equal(new Set(report.observations.filter(v=>v.preview).map(v=>v.id)).size,40);assert.equal(report.captures.filter(v=>v.includes('-runtime-')).length,40)}executions.push(execution)}
const native=await runAudit(root,'scripts/verify-v26.15-rendering-native-consumer.mjs',['--native-exe='+join(root,'src-tauri/target/release/nova_a.exe'),'--snapshot='+build.snapshotPath,'--build-receipt='+build.receiptPath,'--compare='+join(root,'release-audits/renderer-staged.json')]);native.reports=['release-audits/v26.15-rendering-native-consumer.json'];executions.push(native)
await writeAuditBundle(root,'26.15','authoring',executions)
