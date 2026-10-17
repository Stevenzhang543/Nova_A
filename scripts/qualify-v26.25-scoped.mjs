/** 26.25 定向门禁：执行真实相关子测试并保留原始报告，不复跑未改动子系统矩阵。 */
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const gate=process.argv.find(/* 获取明确门禁名称。 */ arg=>arg.startsWith('--gate='))?.slice(7)
const root=process.cwd(),release='26.25',engineVersion=JSON.parse(await readFile('package.json','utf8')).version
assert.equal(engineVersion,'26.25.0')
const selections={
 focus:[['verify-v26.25-release-policy','v26.25-release-policy'],['verify-v26.25-debugger','v26.25-debugger'],['verify-v26.14-runtime-stage','v26.14-runtime-wasm'],['verify-v26.25-language-replies','v26.25-language-replies'],['verify-v26.24-language-service-lifecycle','v26.24-language-service-lifecycle'],['verify-v26.25-events','v26.25-events'],['verify-v26.22-event-validation','v26.25-event-validation'],['verify-v26.25-mobile-contract','v26.25-mobile-contract']],
 'browser-layout':[['verify-v26.25-mobile-user','v26.25-mobile-user']],
 'user-interactions':[['verify-v26.25-debugger-user','v26.25-debugger-user'],['verify-v26.25-event-user','v26.25-event-user'],['verify-v26.25-static-host-user','v26.25-static-host-user']]
}
if(selections[gate]){
 const executions=[]
 for(const [script,report] of selections[gate]){const run=await runAudit(root,'scripts/'+script+'.mjs',['--qualification-release=26.25']);run.reports=['release-audits/'+report+'.json'];executions.push(run)}
 await writeAuditBundle(root,release,gate,executions)
}else if(gate==='product'){
 const paths=['v26.25-focus-bundle','v26.25-browser-layout-bundle','v26.25-user-interactions-bundle','v26.25-verification','v26.25-native-build','v26.25-web','v26.25-history-verification','v26.25-windows-smoke','v26.25-headless-smoke','v26.25-manual-audit']
 const reports=[]
 for(const path of paths){const value=JSON.parse(await readFile('release-audits/'+path+'.json','utf8'));assert.equal(value.status,'passed',path);assert.equal(value.engineVersion,engineVersion,path);reports.push({path,status:value.status,generatedAt:value.generatedAt})}
 await writeFile('release-audits/v26.25-product-audit.json',JSON.stringify({format:'nova-release-product-audit',version:1,release,engineVersion,generatedAt:new Date().toISOString(),status:'passed',reports,scope:'Current scoped prerequisites only. Source/log/artifact integrity is independently checked by release qualification. Unchanged subsystems explicitly not re-audited.',globalDefectCount:null,externalCertificationComplete:false}))
}else throw Error('Unknown scoped gate '+gate)
