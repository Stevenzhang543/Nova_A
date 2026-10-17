/** 26.30 定向门禁：执行相关行为与交付验证，完整保留当前实际报告。 */
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const gate=process.argv.find(/** 读取明确门禁，不推断已通过状态。 */ arg=>arg.startsWith('--gate='))?.slice(7)
const root=process.cwd(),release='26.30',engineVersion=JSON.parse(await readFile('package.json','utf8')).version
assert.equal(engineVersion,'26.30.0')
/** 读取固定包管理器入口，仅传给实际需要该工具的验证。 */
const pnpmEntry=process.argv.find(/** 匹配显式固定工具路径。 */ arg=>arg.startsWith('--pnpm-entry='))?.slice(13)??process.env.NOVA_PNPM_ENTRY
const selections={
 focus:[['verify-v26.30-release-inputs',['v26.30-release-inputs']],['generate-panel-inventory-26.30',['v26.30-panel-inventory'],['--check']],['verify-v26.29-world',['v26.30-world']],['verify-v26.30-network',['v26.30-network']],['verify-v26.30-stream-build',['v26.30-stream-build']],['verify-v26.30-native-headless',['v26.30-native-headless']],['verify-v26.17-bindings',['v26.30-bindings']],['verify-v26.17-queries',['v26.30-queries']],['verify-v26.17-world-roundtrip',['v26.30-world-roundtrip']],['verify-v26.18-network-process',['v26.30-network-process']]],
 'browser-layout':[['verify-v26.30-layout-user',['v26.30-layout-user']]],
 'user-interactions':[['verify-v26.30-static-host-user',['v26.30-static-host-user']]],
 'clean-moved':[['verify-v26.21-reproducibility',['v26.30-reproducibility'],['--pnpm-entry='+pnpmEntry]]],
 templates:[['verify-v26.30-template-output',['v26.30-template-output']]],
 performance:[['verify-v26.30-performance-user',['v26.30-performance-user']]],
 security:[['audit-dependencies-v26.30',['v26.30-dependency-audit'],['--pnpm-entry='+pnpmEntry]]]
}
if(['clean-moved','security'].includes(gate))assert.ok(pnpmEntry,'Provide pinned --pnpm-entry')
if(selections[gate]){
 const executions=[]
 for(const [script,reports,extra=[]] of selections[gate]){const run=await runAudit(root,'scripts/'+script+'.mjs',['--qualification-release=26.30',...extra]);run.reports=reports.map(/** 每份报告绑定当前实际命令的开始时间。 */ report=>'release-audits/'+report+'.json');executions.push(run)}
 await writeAuditBundle(root,release,gate,executions)
}else if(gate==='product'){
 const paths=['focus-bundle','browser-layout-bundle','user-interactions-bundle','verification','native-build','rust','native-rust','wasm','web','history-verification','windows-smoke','headless-smoke','manual-audit','clean-moved-bundle','templates-bundle','performance-bundle','security-bundle'].map(/** 各前置门禁都必须是本版真实通过报告。 */ name=>'v26.30-'+name)
 const reports=[]
 for(const path of paths){const value=JSON.parse(await readFile('release-audits/'+path+'.json','utf8'));assert.equal(value.status,'passed',path);assert.equal(value.engineVersion,engineVersion,path);reports.push({path,status:value.status,generatedAt:value.generatedAt})}
 await writeFile('release-audits/v26.30-product-audit.json',JSON.stringify({format:'nova-release-product-audit',version:1,release,engineVersion,generatedAt:new Date().toISOString(),status:'passed',reports,scope:'Current scoped prerequisites, with explicit unavailable external devices and unexecuted unrelated matrices. Source/build/archive integrity checked independently.',globalDefectCount:null,externalCertificationComplete:false}))
}else throw Error('Unknown scoped gate '+gate)
