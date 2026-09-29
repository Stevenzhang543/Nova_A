/** Execute relevant retained production-module regressions with separate Phase II evidence. */
import fs from 'node:fs'
import crypto from 'node:crypto'
import {spawnSync,execFileSync} from 'node:child_process'
const names=['identity','entity-api','component-primitives','component-order','history-core','pending-drafts','document-boundaries','scene-ownership','reference-ownership','tilemap-bake','audio-import-boundaries','rendering-recovery','event-validation','studio-save-boundary','nested-component-corpus','resource-actions']
const directory='reports/phase2/retained';fs.mkdirSync(directory,{recursive:true})
const results=[]
const source=execFileSync('git',['ls-files','src','crates','src-tauri/src'],{encoding:'utf8'}).trim().split(/\r?\n/).sort()
const sourceHash=crypto.createHash('sha256');for(const file of source)if(fs.existsSync(file)){sourceHash.update(file);sourceHash.update(fs.readFileSync(file))}
const fingerprint=sourceHash.digest('hex')
for(const name of names){
 const file=`scripts/verify-v26.22-${name}.mjs`,start=Date.now()
 const result=spawnSync(process.execPath,[file,'--development'],{encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024,env:{...process.env,NOVA_AUDIT_REPORT_DIRECTORY:directory}})
 fs.writeFileSync(`${directory}/${name}.log`,(result.stdout||'')+(result.stderr||'')+(result.error?String(result.error):''))
 results.push({name,command:[process.execPath,file,'--development'],exitCode:result.status,signal:result.signal,elapsedMs:Date.now()-start,status:result.status===0?'passed':'failed'})
 console.log(results.at(-1).status.toUpperCase()+' '+name)
 fs.writeFileSync(`${directory}/summary.json`,JSON.stringify({format:'nova-phase2-retained-tests',version:1,scope:'Retained assertions executed against current source with development qualification; not legacy release qualification.',sourceFingerprint:fingerprint,status:results.length===names.length&&results.every(r=>r.status==='passed')?'passed':'incomplete-or-failed',results},null,2)+'\n')
}
if(results.some(r=>r.status==='failed'))process.exitCode=1
