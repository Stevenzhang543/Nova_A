/* 用当前构建的 WASM 迁移全部参考项目并检查幂等性，记录耗时及输出哈希；不据此宣称玩法或导出已验证。 */
import {execFileSync} from 'node:child_process'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {resolveMilestoneAuditContext} from './lib/milestoneAuditContext.mjs'
const context=resolveMilestoneAuditContext(import.meta.url,{release:'26.21',reportName:'reference-imports'})
import * as wasm from '../nova_core/pkg/nova_core.js'
await wasm.default({module_or_path:await readFile('nova_core/pkg/nova_core_bg.wasm')})
assert.equal(wasm.engine_version(),context.engineVersion,'Audit the built current WASM');
const paths=execFileSync('rg',['--files','reference-projects/projects','-g','project.nova'],{encoding:'utf8'}).trim().split(/\r?\n/).sort(),checks=[]
for(const path of paths){const source=await readFile(path,'utf8'),start=performance.now();try{const result=wasm.migrate_project_json(source),project=JSON.parse(result);if(wasm.migrate_project_json(result)!==result)throw Error('Non-idempotent migration');checks.push({path:path.replaceAll('\\','/'),status:'passed',milliseconds:performance.now()-start,entities:project.scenes.reduce(/* 计算表达式 n+s.entities.length 并返回结果，沿用操作数的原有类型规则。 */ (n,s)=>n+s.entities.length,0),outputSha256:createHash('sha256').update(result).digest('hex')})}catch(error){checks.push({path:path.replaceAll('\\','/'),status:'failed',milliseconds:performance.now()-start,error:String(error)})}}
const failures=checks.filter(/* 比较 c.status 与 'passed'，返回严格不等的判断结果。 */ c=>c.status!=='passed');await mkdir('release-audits',{recursive:true});await writeFile('release-audits/v26.21-reference-imports.json',JSON.stringify({...context.metadata(),status:failures.length?'failed':'passed',scope:'Actual rebuilt WebAssembly migration and idempotence for every authored reference project. Does not load the editor, execute scripts or qualify gameplay/export.',checks},null,2)+'\n');console.log(JSON.stringify({projects:checks.length,failed:failures,largest:checks.filter(/* 比较 c.entities 与 5000，返回大于或等于的判断结果。 */ c=>c.entities>=5000)},null,2));if(failures.length)process.exitCode=1
