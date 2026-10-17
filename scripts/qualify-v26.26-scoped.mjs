/** 26.26 定向门禁：执行真实相关子测试并保留原始报告，不复跑未改动子系统矩阵。 */
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const gate=process.argv.find(/* 获取明确门禁名称。 */ arg=>arg.startsWith('--gate='))?.slice(7)
const root=process.cwd(),release='26.26',engineVersion=JSON.parse(await readFile('package.json','utf8')).version
assert.equal(engineVersion,'26.26.0')
const selections={
 focus:[['verify-v26.26-release-inputs','v26.26-release-inputs'],['verify-v26.26-asset-production','v26.26-asset-production'],['verify-v26.26-library-regression','v26.26-library-regression'],['verify-v26.22-asset-library-operations','v26.26-asset-library-operations'],['verify-v26.22-package-lifecycle','v26.26-package-lifecycle'],['verify-v26.22-audio-import-boundaries','v26.26-audio-import-boundaries'],['generate-panel-inventory-26.26','v26.26-panel-inventory',['--check']]],
 'browser-layout':[['verify-v26.26-panel-layout-user','v26.26-panel-layout-user']],
 'user-interactions':[['verify-v26.26-library-user','v26.26-library-user'],['verify-v26.26-asset-production-user','v26.26-asset-production-user']],
 templates:[['verify-v26.26-template-output','v26.26-template-output'],['verify-v26.26-template-library','v26.26-template-library',['--qualification']]]
}
if(selections[gate]){
 const executions=[]
 for(const [script,report,extra=[]] of selections[gate]){const run=await runAudit(root,'scripts/'+script+'.mjs',['--qualification-release=26.26',...extra]);run.reports=['release-audits/'+report+'.json'];executions.push(run)}
 await writeAuditBundle(root,release,gate,executions)
}else if(gate==='product'){
 const paths=['v26.26-templates-bundle','v26.26-focus-bundle','v26.26-browser-layout-bundle','v26.26-user-interactions-bundle','v26.26-verification','v26.26-native-build','v26.26-web','v26.26-history-verification','v26.26-windows-smoke','v26.26-headless-smoke','v26.26-manual-audit']
 const reports=[]
 for(const path of paths){const value=JSON.parse(await readFile('release-audits/'+path+'.json','utf8'));assert.equal(value.status,'passed',path);assert.equal(value.engineVersion,engineVersion,path);reports.push({path,status:value.status,generatedAt:value.generatedAt})}
 await writeFile('release-audits/v26.26-product-audit.json',JSON.stringify({format:'nova-release-product-audit',version:1,release,engineVersion,generatedAt:new Date().toISOString(),status:'passed',reports,scope:'Current scoped prerequisites only. Source/log/artifact integrity is independently checked by release qualification. Unchanged subsystems explicitly not re-audited.',globalDefectCount:null,externalCertificationComplete:false}))
}else throw Error('Unknown scoped gate '+gate)
