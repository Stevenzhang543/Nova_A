/** 功能回归脚本：执行 verify-v26.15-focus.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import{dirname,join}from'node:path'
import{fileURLToPath}from'node:url'
import{readFile}from'node:fs/promises'
import{runAudit,writeAuditBundle}from'./lib/milestoneAuditBundle.mjs'
import{activeMilestoneBuild}from'./lib/milestoneBuildReceipt.mjs'
const root=dirname(dirname(fileURLToPath(import.meta.url))),executions=[],build=await activeMilestoneBuild(root,'26.15')
assert.equal(JSON.parse(await readFile(join(root,'package.json'),'utf8')).version,'26.15.0')
for(const [name,report]of [['assets','v26.15-assets'],['sprites','v26.15-sprites'],['tiled','v26.15-tiled'],['batches','v26.15-batches'],['resource-handlers','v26.15-resource-handlers'],['library-metadata','v26.15-library-metadata'],['template-ui','v26.15-template-ui'],['web-export','v26.15-web-export'],['audit-attachments','v26.15-audit-attachments'],['headless-diagnostics','v26.15-headless-diagnostics'],['renderer-native-guards','renderer-native-guards'],['native-consumer-guards','v26.15-native-consumer-guards']]){const execution=await runAudit(root,'scripts/verify-v26.15-'+name+'.mjs');execution.reports=['release-audits/'+report+'.json'];executions.push(execution)}
for(const [script,args,reports]of [['verify-v26.14-runtime-stage.mjs',['--native'],['v26.14-runtime-native.json']],['verify-v26.14-runtime-stage.mjs',[],['v26.14-runtime-wasm.json']],['verify-v26.14-project-roundtrip.mjs',[],['v26.14-project-roundtrip.json']],['verify-v26.12-typed-graphs.mjs',[],[]],['generate-v26.15-reference-projects.mjs',['--verify-only'],[]],['audit-v26.13-panels.mjs',[],['panel-source-inventory.json']]]){const execution=await runAudit(root,'scripts/'+script,args);execution.reports=reports.map(/* 计算表达式 'release-audits/'+name 并返回结果，沿用操作数的原有类型规则。 */ name=>'release-audits/'+name);executions.push(execution)}
const browser=await runAudit(root,'scripts/verify-v26.15-renderer.mjs',['--snapshot='+build.snapshotPath]);browser.reports=['release-audits/renderer-staged.json'];executions.push(browser)
const native=await runAudit(root,'scripts/verify-v26.15-renderer.mjs',['--snapshot='+build.snapshotPath,'--native-exe='+join(root,'src-tauri/target/release/nova_a.exe'),'--build-receipt='+build.receiptPath,'--compare='+join(root,'release-audits/renderer-staged.json')]);native.reports=['release-audits/renderer-native.json'];executions.push(native)
await writeAuditBundle(root,'26.15','focus',executions)
