/** 26.30 依赖范围审计：本地锁文件检查与实际 npm 公告查询分开记录，不声称 Rust 公告覆盖。 */
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
const entry=process.argv.find(/** 读取调用方固定的包管理器入口。 */ x=>x.startsWith('--pnpm-entry='))?.slice(13)??process.env.NOVA_PNPM_ENTRY
assert.ok(entry,'Provide pinned --pnpm-entry')
process.env.NOVA_DEPENDENCY_AUDIT_VERSION='26.30.0'
await import('./audit-dependencies-v6.9.0.mjs')
const local=JSON.parse(await readFile('release-audits/v26.30.0-dependency-audit.json','utf8'))
const audit=spawnSync(process.execPath,[entry,'audit','--json'],{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:16*1024*1024})
await mkdir('release-audits',{recursive:true});await writeFile('release-audits/v26.30-npm-advisories-raw.json',audit.stdout||JSON.stringify({error:audit.error?.message,stderr:audit.stderr}))
let response;try{response=JSON.parse(audit.stdout)}catch{}
const queried=!!response?.metadata?.vulnerabilities&&!response.error,counts=response?.metadata?.vulnerabilities??null
const locks=[];for(const path of ['Cargo.lock','src-tauri/Cargo.lock']){const bytes=await readFile(path);assert.match(bytes.toString(),/checksum = "[a-f0-9]{64}"/);locks.push({path,sha256:createHash('sha256').update(bytes).digest('hex'),scope:'Registry checksums present; locked native builds enforce dependency selection. Not a live RustSec advisory query.'})}
const report={format:'nova-v26.30-dependency-audit',version:1,release:'26.30',engineVersion:'26.30.0',generatedAt:new Date().toISOString(),status:local.status==='passed'&&queried&&(counts.high??0)===0&&(counts.critical??0)===0?'passed':'failed',checks:local.checks,lockfileSha256:local.lockfileSha256,rustLocks:locks,registryAdvisories:{status:queried?'queried':'unavailable',exitCode:audit.status,counts,metadata:response?.metadata??null,rawSha256:createHash('sha256').update(audit.stdout||'').digest('hex'),error:audit.error?.message??response?.error??null},rustSecAdvisories:{status:'not-queried',reason:'No live RustSec coverage is inferred from npm or lock checksums; external advisory coverage remains explicit.'},scope:'Current npm registry response for the locked project; not independent security certification or proof of absence of vulnerabilities.'}
await writeFile('release-audits/v26.30-dependency-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.status!=='passed')process.exitCode=1
