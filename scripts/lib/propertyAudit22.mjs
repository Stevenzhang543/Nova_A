/** 导出与审计报告辅助库，保留真实下载及执行证据。 */
import {startNodeOperationTrace22} from './nodeOperationTrace22.mjs'
import assert from 'node:assert/strict'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
/** New suites require an explicit development flag until the actual engine is 26.22.0. */
/** 校验目标版本后先写入未完成报告并启动可选追踪，返回最终证据写入入口。 */ export async function propertyAudit22(name){
 assert.match(name,/^[a-z0-9-]+$/)
 const target=process.argv.find(/* 调用 value.startsWith('--qualification-release=') 并返回调用结果。 */ value=>value.startsWith('--qualification-release='))?.split('=')[1]??'26.22'
 assert.match(target,/^26\.(?:2[2-9]|30)$/,'Explicit integrated target is 26.22 through 26.30')
 const engineVersion=JSON.parse(await readFile('package.json','utf8')).version,development=process.argv.includes('--development')
 if(!development)assert.equal(engineVersion,target+'.0','Qualification requires the actual requested engine; use --development only for exploratory checks')
 await mkdir('release-audits',{recursive:true});await writeFile('release-audits/v'+target+'-'+name+'.json',JSON.stringify({format:'nova-v'+target+'-'+name,version:1,release:target,regressionOrigin:'26.22',engineVersion,development,qualifiedRelease:null,generatedAt:new Date().toISOString(),status:'incomplete',scope:'Audit started but has not completed. A previous passing result does not apply to this invocation.',checks:[]},null,2)+'\n')
 const trace=await startNodeOperationTrace22(name)
 return{/** 结束追踪并按非空全部通过断言生成最终报告；失败或缺少用例时写入失败后抛错。 */ async write(checks,scope,details={}){const traceEvidence=trace?await trace.finish():{};const passed=checks.length>0&&checks.every(/* 比较 check.status 与 'passed'，返回严格相等的判断结果。 */ check=>check.status==='passed');if(traceEvidence.nodeOperationCoverage?.length){traceEvidence.nodeOperationCoverageCase=name+' complete suite including fixture setup';traceEvidence.nodeOperationCoverageAssertion={name:traceEvidence.nodeOperationCoverageCase,status:passed?'passed':'failed'}}await mkdir('release-audits',{recursive:true});const report={...details,...traceEvidence,format:'nova-v'+target+'-'+name,version:1,release:target,regressionOrigin:'26.22',engineVersion,expectedRelease:development?engineVersion.split('.').slice(0,2).join('.'):target,development,qualifiedRelease:development||!passed?null:target,generatedAt:new Date().toISOString(),status:passed?'passed':'failed',scope,checks};await writeFile('release-audits/v'+target+'-'+name+'.json',JSON.stringify(report,null,2)+'\n');if(traceEvidence.nodeOperationCoverage?.length){await mkdir('reports',{recursive:true});await writeFile('reports/v26.22-trace-'+name+'.json',JSON.stringify({...report,development:true,qualifiedRelease:null,scope:'Supplemental source-hashed execution evidence. '+scope},null,2)+'\n')}if(!passed)throw new Error(name+' audit has failed or missing cases')}}
}
