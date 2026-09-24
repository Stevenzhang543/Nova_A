/** 26.24 程序员门禁：执行结构、布局、语言显示与报告完整性检查，旧套件保持其原始报告身份。 */
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
assert.equal(JSON.parse(await readFile('package.json','utf8')).version,'26.24.0','Release focus requires actual 26.24 source')
const executions=[]
for(const [script,report] of [
  ['audit-chinese-comments','v26.24-chinese-comments'],
  ['verify-v26.24-package-mirror','v26.24-package-mirror-regression'],
  ['verify-v26.09-runtime-performance','v26.09-runtime-performance'],
  ['benchmark-v26.24-graph-layout','v26.24-graph-layout-benchmarks'],
  ['verify-v26.24-linked-save','v26.24-linked-save'],
  ['verify-v26.24-graph-equivalence','v26.24-graph-equivalence'],
  ['verify-v26.24-structural-localization','v26.24-structural-localization'],
  ['verify-v26.24-report-writing',null],
  ['verify-v26.24-ecosystem-audit-status','v26.24-ecosystem-audit-status'],
  ['verify-v26.24-project-archive-bounds','v26.24-project-archive-bounds'],
  ['verify-v26.24-language-service-lifecycle','v26.24-language-service-lifecycle'],
  ['verify-v26.12-typed-graphs','v26.12-typed-graphs'],
  ['verify-v26.12-syntax-slots','v26.12-syntax-slots'],
  ['verify-v26.13-layout','v26.13-layout-engine'],
  ['verify-v26.13-studio-layout','v26.13-studio-layout'],
  ['verify-v26.12-release-tooling',null],
  ['verify-v26.11-templates','v26.11-template-behavior'],
]){
  const run=await runAudit(process.cwd(),'scripts/'+script+'.mjs',['--qualification-release=26.24'])
  run.reports=report?['release-audits/'+report+'.json']:[];executions.push(run)
}
const retained=await runAudit(process.cwd(),'scripts/verify-v26.24-regressions.mjs');retained.reports=['release-audits/v26.24-retained-regressions-bundle.json'];executions.push(retained)
await writeAuditBundle(process.cwd(),'26.24','focus',executions)
