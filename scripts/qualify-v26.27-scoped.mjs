/** 26.27 定向门禁：执行相关行为与交付验证，完整保留当前实际报告。 */
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const gate=process.argv.find(/** 读取明确门禁，不推断已通过状态。 */ arg=>arg.startsWith('--gate='))?.slice(7)
const root=process.cwd(),release='26.27',engineVersion=JSON.parse(await readFile('package.json','utf8')).version
assert.equal(engineVersion,'26.27.0')
const selections={
 focus:[['verify-v26.27-release-inputs',['v26.27-release-inputs']],['verify-v26.27-editor-preferences',['v26.27-editor-preferences']],['verify-v26.27-sampling',['v26.27-sampling']],['verify-v26.27-renderer',['v26.27-renderer-final/renderer-staged'],['--report-dir=release-audits/v26.27-renderer-final']],['verify-v26.27-runtime-stage',['v26.27-runtime-native'],['--native']],['verify-v26.27-runtime-stage',['v26.27-runtime-wasm']],['verify-v26.16-media-performance',['v26.27-media-performance']]],
 'browser-layout':[['verify-v26.27-editor-preferences-user',['v26.27-editor-preferences-user']],['verify-v26.27-profiler-user',['v26.27-profiler-user']]],
 'user-interactions':[['verify-v26.27-quality-user',['v26.27-quality-user']]],
 performance:[['measure-v26.27-performance',['v26.27-performance-after-final'],['--run-label=final']]]
}
if(selections[gate]){
 const executions=[]
 for(const [script,reports,extra=[]] of selections[gate]){const run=await runAudit(root,'scripts/'+script+'.mjs',['--qualification-release=26.27',...extra]);run.reports=reports.map(/** 每份报告绑定当前实际命令的开始时间。 */ report=>'release-audits/'+report+'.json');executions.push(run)}
 await writeAuditBundle(root,release,gate,executions)
}else if(gate==='product'){
 const paths=['v26.27-performance-bundle','v26.27-focus-bundle','v26.27-browser-layout-bundle','v26.27-user-interactions-bundle','v26.27-verification','v26.27-native-build','v26.27-web','v26.27-history-verification','v26.27-windows-smoke','v26.27-headless-smoke','v26.27-manual-audit']
 const reports=[]
 for(const path of paths){const value=JSON.parse(await readFile('release-audits/'+path+'.json','utf8'));assert.equal(value.status,'passed',path);assert.equal(value.engineVersion,engineVersion,path);reports.push({path,status:value.status,generatedAt:value.generatedAt})}
 await writeFile('release-audits/v26.27-product-audit.json',JSON.stringify({format:'nova-release-product-audit',version:1,release,engineVersion,generatedAt:new Date().toISOString(),status:'passed',reports,scope:'Current scoped prerequisites, with explicit unavailable external devices and unexecuted unrelated matrices. Source/build/archive integrity checked independently.',globalDefectCount:null,externalCertificationComplete:false}))
}else throw Error('Unknown scoped gate '+gate)
