/** 生态面板审核摘要：只反映当前可观察条件，不以配置开关或没有报错代替实际测试证据。 */
export interface EcosystemAuditInputs {
  apiCount:number
  isolatedFailures:number
  offlineMode:boolean
  plan:null|{implicitNetworkOperation:boolean;executableAction:boolean;explicitConfirmationRequired:boolean}
}
export type EcosystemAuditStatus='notRun'|'local-ready'|'blocked'|'pending-external'|'passed'
/** 生成六项摘要；语料、卸载重载和干净安装没有本次执行记录时保持未运行，网络项只检查现有计划的显式约束。 */
export function ecosystemAuditSummary(input:EcosystemAuditInputs):Array<{id:string;label:string;detail:string;status:EcosystemAuditStatus}>{
  return [
    {id:'malicious',label:'maliciousPackageCorpus',detail:'maliciousPackageCorpusHint',status:'notRun'},
    {id:'api',label:'pluginApiMatrix',detail:'pluginApiAuditHint',status:input.apiCount===10?'local-ready':'blocked'},
    {id:'lifecycle',label:'unloadReloadAudit',detail:'unloadReloadAuditHint',status:input.isolatedFailures?'blocked':'notRun'},
    {id:'offline',label:'offlineInstallAudit',detail:'offlineInstallAuditHint',status:input.offlineMode?'notRun':'blocked'},
    {id:'hosts',label:'hostBuildAudit',detail:'hostBuildAuditHint',status:'pending-external'},
    {id:'network',label:'networkTransparencyAudit',detail:'networkTransparencyAuditHint',status:!input.plan?'notRun':input.plan.implicitNetworkOperation===false&&input.plan.executableAction===false&&input.plan.explicitConfirmationRequired===true?'passed':'blocked'},
  ]
}
