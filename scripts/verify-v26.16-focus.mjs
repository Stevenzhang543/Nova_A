import assert from 'node:assert/strict'
import{dirname,join}from'node:path'
import{fileURLToPath}from'node:url'
import{readFile}from'node:fs/promises'
import{runAudit,writeAuditBundle}from'./lib/milestoneAuditBundle.mjs'
const root=dirname(dirname(fileURLToPath(import.meta.url))),executions=[]
assert.equal(JSON.parse(await readFile(join(root,'package.json'),'utf8')).version,'26.16.0')
for(const name of ['animation-audio','animation-authoring','animation-ui','audio-pcm','interface','interface-pixels','audit-context','audit-bundle','media-roundtrip','timeline-actions','media-performance','save-recovery']){const execution=await runAudit(root,'scripts/verify-v26.16-'+name+'.mjs');execution.reports=['release-audits/v26.16-'+name+'.json'];executions.push(execution)}
for(const[script,args,reports]of [['verify-v26.14-runtime-stage.mjs',['--native'],['v26.14-runtime-native.json']],['verify-v26.14-runtime-stage.mjs',[],['v26.14-runtime-wasm.json']],['verify-v26.14-project-roundtrip.mjs',[],['v26.14-project-roundtrip.json']],['verify-v26.12-typed-graphs.mjs',[],[]],['generate-v26.16-core-references.mjs',['--verify-only'],[]],['generate-v26.16-menu-reference.mjs',['--verify-only'],[]],['audit-v26.13-panels.mjs',[],['panel-source-inventory.json']]]){const execution=await runAudit(root,'scripts/'+script,args);execution.reports=reports.map(name=>'release-audits/'+name);executions.push(execution)}
await writeAuditBundle(root,'26.16','focus',executions)
