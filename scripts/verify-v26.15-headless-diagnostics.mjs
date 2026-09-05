import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdir,writeFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {observeHeadlessPeer,waitForHeadlessPeer} from './lib/headlessPeerDiagnostics.mjs'
const home=dirname(dirname(fileURLToPath(import.meta.url))),checks=[]
async function check(name,fn){await fn();checks.push({name,status:'passed'});console.log('PASS '+name)}
await check('real failed peer reports its exit and retains bounded stdout/stderr instead of a generic15-second wait',async()=>{
 const peer=spawn(process.execPath,['-e','process.stdout.write("o".repeat(20000));process.stderr.write("e".repeat(24000));process.exitCode=3'],{windowsHide:true,stdio:['ignore','pipe','pipe']}),state=observeHeadlessPeer(peer)
 await assert.rejects(()=>waitForHeadlessPeer(()=>null,state,'first-connect:ready',15000),/first-connect:ready.*code.*3/)
 assert.equal(state.stdout.length,8000);assert.equal(state.stderr.length,8000);assert.deepEqual(state.exit,{code:3,signal:null})
})
await check('already delivered IPC evidence is preserved even if a child subsequently exits',async()=>{const ready={type:'ready'};assert.equal(await waitForHeadlessPeer(()=>ready,{exit:{code:0,signal:null},error:''},'ready',15000),ready)})
await check('an alive but silent peer retains the caller timeout and exact phase',async()=>{await assert.rejects(()=>waitForHeadlessPeer(()=>null,{exit:null,error:''},'late-reconnect:report',30),/late-reconnect:report timed out after 30 ms/)})
const reports=join(home,existsSync(join(home,'package.json'))?'release-audits':'reports');await mkdir(reports,{recursive:true});await writeFile(join(reports,'v26.15-headless-diagnostics.json'),JSON.stringify({release:'26.15',generatedAt:new Date().toISOString(),status:'passed',checks,scope:'Actual child exit/output and bounded wait policy fixtures; no authority/network traffic claim.'},null,2)+'\n')
