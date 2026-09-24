/** 26.24 保留功能门禁：实际重跑历史实现，使用其明确支持的当前版本参数，不重标旧报告。 */
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
assert.equal(JSON.parse(await readFile('package.json','utf8')).version,'26.24.0')
const tasks=[
 ['verify-v26.24-renderer.mjs',['--qualification','--report-dir=release-audits/v26.24-renderer'],['v26.24-renderer/renderer-staged.json']],
 ['verify-v26.24-template-output.mjs',[],['v26.24-template-output.json']],
 ['verify-v26.24-runtime-regressions.mjs',[],['v26.24-runtime-regressions.json']],
 ['verify-v26.22-foundations.mjs',['--qualification-release=26.24'],['v26.24-foundations-regressions.json']],
 ['verify-v26.14-runtime-stage.mjs',['--native'],['v26.14-runtime-native.json']],
 ['verify-v26.14-runtime-stage.mjs',[],['v26.14-runtime-wasm.json']],
 ['verify-v26.14-project-roundtrip.mjs',[],['v26.14-project-roundtrip.json']],
 ['verify-v26.12-script-modules.mjs',['--qualification-release=26.24'],['v26.12-script-modules.json']],
 ['verify-v26.12-language.mjs',['--qualification-release=26.24','--report=release-audits/v26.24-legacy-language.json'],['v26.24-legacy-language.json']],
 ['verify-v26.12-api-signatures.mjs',['--qualification-release=26.24','--report=release-audits/v26.24-api-signatures.json'],['v26.24-api-signatures.json']],
]
for(const name of ['references','inventory-reference','teaching'])tasks.push(['generate-v26.24-'+name+'.mjs',['--verify-only'],[]])
for(const [version,names] of [['26.16',['animation-audio','animation-authoring','animation-ui','audio-pcm','interface','media-roundtrip','timeline-actions','media-performance']],['26.17',['queries','navigation','world-streaming','bindings','world-roundtrip']],['26.18',['networking','network-process']]])for(const name of names)tasks.push(['verify-v'+version+'-'+name+'.mjs',['--qualification-release=26.24'],['v26.24-'+name+'.json']])
for(const name of ['history-core','pending-drafts','control-order','numeric-expressions','entity-api','script-assets-corpus','package-lifecycle','tilemap-bake','component-history','media-history'])tasks.push(['verify-v26.22-'+name+'.mjs',['--qualification-release=26.24'],['v26.24-'+name+'.json']])
const executions=[]
for(const [script,args,reports] of tasks){
 const run=await runAudit(process.cwd(),'scripts/'+script,args)
 run.reports=reports.map(/** 保持每项原始报告路径供完整性收集。 */ name=>'release-audits/'+name)
 executions.push(run)
}
await writeAuditBundle(process.cwd(),'26.24','retained-regressions',executions)
