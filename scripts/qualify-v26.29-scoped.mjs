/** 26.29 定向门禁：执行相关行为与交付验证，完整保留当前实际报告。 */
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const gate=process.argv.find(/** 读取明确门禁，不推断已通过状态。 */ arg=>arg.startsWith('--gate='))?.slice(7)
const root=process.cwd(),release='26.29',engineVersion=JSON.parse(await readFile('package.json','utf8')).version
assert.equal(engineVersion,'26.29.0')
const selections={
 focus:[['verify-v26.29-release-inputs',['v26.29-release-inputs']],['verify-v26.29-world',['v26.29-world']],['verify-v26.29-network',['v26.29-network']],['verify-v26.29-stream-build',['v26.29-stream-build']],['verify-v26.29-platform',['v26.29-platform']],['verify-v26.29-native-headless',['v26.29-native-headless']],['verify-v26.17-bindings',['v26.29-bindings']],['verify-v26.17-queries',['v26.29-queries']],['verify-v26.17-world-roundtrip',['v26.29-world-roundtrip']],['verify-v26.18-network-process',['v26.29-network-process']]],
 'browser-layout':[['verify-v26.29-platform-layout',['v26.29-platform-layout']]],
 'user-interactions':[['verify-v26.29-stream-network-user',['v26.29-stream-network-user']],['verify-v26.29-static-host-user',['v26.29-static-host-user']]]
}
if(selections[gate]){
 const executions=[]
 for(const [script,reports,extra=[]] of selections[gate]){const run=await runAudit(root,'scripts/'+script+'.mjs',['--qualification-release=26.29',...extra]);run.reports=reports.map(/** 每份报告绑定当前实际命令的开始时间。 */ report=>'release-audits/'+report+'.json');executions.push(run)}
 await writeAuditBundle(root,release,gate,executions)
}else if(gate==='product'){
 const paths=['v26.29-focus-bundle','v26.29-browser-layout-bundle','v26.29-user-interactions-bundle','v26.29-verification','v26.29-native-build','v26.29-web','v26.29-history-verification','v26.29-windows-smoke','v26.29-headless-smoke','v26.29-manual-audit']
 const reports=[]
 for(const path of paths){const value=JSON.parse(await readFile('release-audits/'+path+'.json','utf8'));assert.equal(value.status,'passed',path);assert.equal(value.engineVersion,engineVersion,path);reports.push({path,status:value.status,generatedAt:value.generatedAt})}
 await writeFile('release-audits/v26.29-product-audit.json',JSON.stringify({format:'nova-release-product-audit',version:1,release,engineVersion,generatedAt:new Date().toISOString(),status:'passed',reports,scope:'Current scoped prerequisites, with explicit unavailable external devices and unexecuted unrelated matrices. Source/build/archive integrity checked independently.',globalDefectCount:null,externalCertificationComplete:false}))
}else throw Error('Unknown scoped gate '+gate)
