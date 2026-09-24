/** 生态审核摘要回归：缺少执行证据时不得显示通过；只允许完整的非执行部署计划通过其透明度检查。 */
import assert from 'node:assert/strict'
import {mkdtemp,rm,mkdir,writeFile,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'vite'
const temporary=await mkdtemp(join(tmpdir(),'nova-ecosystem24-'))
try{
  await build({configFile:false,logLevel:'error',build:{ssr:true,outDir:temporary,rollupOptions:{input:resolve('src/editor/ecosystemAuditSummary.ts'),output:{entryFileNames:'summary.mjs'}}}})
  const {ecosystemAuditSummary}=await import(pathToFileURL(join(temporary,'summary.mjs')))
  const input={apiCount:10,isolatedFailures:0,offlineMode:true,plan:null}
  const baseline=ecosystemAuditSummary(input),byId=new Map(baseline.map(/** 按稳定编号核对各审核项目。 */ item=>[item.id,item]))
  assert.equal(baseline.length,6)
  assert.equal(byId.size,6)
  for(const id of ['malicious','lifecycle','offline','network'])assert.equal(byId.get(id).status,'notRun',id)
  assert.equal(byId.get('api').status,'local-ready')
  assert.equal(byId.get('hosts').status,'pending-external')
  assert.ok(baseline.every(/** 未执行任何计划时，不允许任意项目显示通过。 */ item=>item.status!=='passed'))
  let plans=0
  for(const implicitNetworkOperation of [false,true])for(const executableAction of [false,true])for(const explicitConfirmationRequired of [false,true]){
    const plan={implicitNetworkOperation,executableAction,explicitConfirmationRequired},before=JSON.stringify(plan)
    const summary=ecosystemAuditSummary({...input,plan})
    assert.equal(summary.find(/** 定位现有计划的透明度检查。 */ item=>item.id==='network').status,!implicitNetworkOperation&&!executableAction&&explicitConfirmationRequired?'passed':'blocked')
    assert.equal(summary.find(/** 部署计划不会替代恶意包语料测试。 */ item=>item.id==='malicious').status,'notRun')
    assert.equal(JSON.stringify(plan),before);plans++
  }
  const blocked=ecosystemAuditSummary({...input,apiCount:9,isolatedFailures:1,offlineMode:false})
  for(const id of ['api','lifecycle','offline'])assert.equal(blocked.find(/** 当前条件不满足时准确指出阻断项。 */ item=>item.id===id).status,'blocked')
  const source=await readFile('src/components/EcosystemStudioPanel.vue','utf8')
  assert.ok(source.includes('ecosystemAuditSummary({apiCount:PLUGIN_API_MATRIX.length'))
  assert.ok(source.includes('{{ t(audit.status) }}'),'Status text must be visible, not only a colored glyph')
  await mkdir('release-audits',{recursive:true})
  const report={format:'nova-v26.24-ecosystem-audit-status',version:1,targetRelease:'26.24',generatedAt:new Date().toISOString(),status:'passed',baseline,planCombinations:plans,scope:'Pure state truthfulness and UI binding; no package corpus, host build or network execution certified.'}
  await writeFile('release-audits/v26.24-ecosystem-audit-status.json',JSON.stringify(report)+'\n')
  console.log(JSON.stringify({status:'passed',planCombinations:plans,unexecutedChecksRemainPending:true}))
}finally{await rm(temporary,{recursive:true,force:true})}
