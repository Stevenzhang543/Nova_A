/** 26.28 定向门禁：执行相关行为与交付验证，完整保留当前实际报告。 */
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const gate=process.argv.find(/** 读取明确门禁，不推断已通过状态。 */ arg=>arg.startsWith('--gate='))?.slice(7)
const root=process.cwd(),release='26.28',engineVersion=JSON.parse(await readFile('package.json','utf8')).version
assert.equal(engineVersion,'26.28.0')
const selections={
 focus:[['verify-v26.28-release-inputs',['v26.28-release-inputs']],['verify-v26.28-media',['v26.28-media']],['verify-v26.28-game-ui',['v26.28-game-ui']],['verify-v26.28-media-bindings',['v26.28-media-bindings']],['verify-v26.28-localization',['v26.28-localization']],['verify-v26.16-animation-audio',['v26.28-animation-audio']],['verify-v26.16-audio-pcm',['v26.28-audio-pcm']],['verify-v26.16-media-roundtrip',['v26.28-media-roundtrip']]],
 'browser-layout':[['verify-v26.28-media-layout',['v26.28-media-layout']]],
 'user-interactions':[['verify-v26.28-menu-user',['v26.28-menu-user']],['verify-v26.28-animation-authoring-user',['v26.28-animation-authoring-user']]]
}
if(selections[gate]){
 const executions=[]
 for(const [script,reports,extra=[]] of selections[gate]){const run=await runAudit(root,'scripts/'+script+'.mjs',['--qualification-release=26.28',...extra]);run.reports=reports.map(/** 每份报告绑定当前实际命令的开始时间。 */ report=>'release-audits/'+report+'.json');executions.push(run)}
 await writeAuditBundle(root,release,gate,executions)
}else if(gate==='product'){
 const paths=['v26.28-focus-bundle','v26.28-browser-layout-bundle','v26.28-user-interactions-bundle','v26.28-verification','v26.28-native-build','v26.28-web','v26.28-history-verification','v26.28-windows-smoke','v26.28-headless-smoke','v26.28-manual-audit']
 const reports=[]
 for(const path of paths){const value=JSON.parse(await readFile('release-audits/'+path+'.json','utf8'));assert.equal(value.status,'passed',path);assert.equal(value.engineVersion,engineVersion,path);reports.push({path,status:value.status,generatedAt:value.generatedAt})}
 await writeFile('release-audits/v26.28-product-audit.json',JSON.stringify({format:'nova-release-product-audit',version:1,release,engineVersion,generatedAt:new Date().toISOString(),status:'passed',reports,scope:'Current scoped prerequisites, with explicit unavailable external devices and unexecuted unrelated matrices. Source/build/archive integrity checked independently.',globalDefectCount:null,externalCertificationComplete:false}))
}else throw Error('Unknown scoped gate '+gate)
