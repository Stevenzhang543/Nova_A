import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdir,writeFile} from 'node:fs/promises'
import {dirname,join} from 'node:path'
import {resolveMilestoneAuditContext} from './lib/milestoneAuditContext.mjs'
const context=resolveMilestoneAuditContext(import.meta.url,{release:'26.19',reportName:'lsp'})
const child=spawn(process.execPath,[join(context.sourceRoot,'scripts/nova-rhai-language-server.mjs'),'--stdio'],{cwd:context.sourceRoot,windowsHide:true,stdio:['pipe','pipe','pipe']})
const messages=[],checks=[];let buffer=Buffer.alloc(0),stderr=''
child.stdout.on('data',chunk=>{buffer=Buffer.concat([buffer,chunk]);for(;;){const split=buffer.indexOf('\r\n\r\n');if(split<0)break;const length=Number(buffer.subarray(0,split).toString().match(/Content-Length: (\d+)/)?.[1]);if(buffer.length<split+4+length)break;messages.push(JSON.parse(buffer.subarray(split+4,split+4+length)));buffer=buffer.subarray(split+4+length)}})
child.stderr.on('data',data=>stderr+=data)
const send=value=>{const body=JSON.stringify({jsonrpc:'2.0',...value});child.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`)}
const waitFor=async predicate=>{for(let i=0;i<400;i++){const value=messages.find(predicate);if(value)return value;if(child.exitCode!==null)throw Error('LSP exited '+stderr);await new Promise(done=>setTimeout(done,25))}throw Error('LSP timed out '+stderr)}
let failure
try{
 send({id:1,method:'initialize'});assert.equal((await waitFor(m=>m.id===1)).result.capabilities.textDocumentSync.change,1)
 const uri='file:///nova-audit.rhai';send({method:'textDocument/didOpen',params:{textDocument:{uri,languageId:'rhai',version:1,text:'let original = 1;'}}});send({method:'textDocument/didChange',params:{textDocument:{uri,version:3},contentChanges:[{text:'let newest = 3;'}]}});send({method:'textDocument/didChange',params:{textDocument:{uri,version:2},contentChanges:[{text:'let stale = 2;'}]}});send({id:2,method:'textDocument/documentSymbol',params:{textDocument:{uri}}});const symbols=(await waitFor(m=>m.id===2)).result.map(x=>x.name);assert.ok(symbols.includes('newest'));assert.ok(!symbols.includes('stale'));checks.push({name:'stdio-stale-change-does-not-overwrite-newer-document',status:'passed',symbols})
 child.stdin.write('X'.repeat(8193));assert.match((await waitFor(m=>m.error?.message?.includes('8192'))).error.message,/header/);send({id:3,method:'textDocument/documentSymbol',params:{textDocument:{uri}}});assert.ok((await waitFor(m=>m.id===3)).result.some(x=>x.name==='newest'));checks.push({name:'bounded-header-error-and-subsequent-frame-recovery',status:'passed'})
 send({method:'textDocument/didClose',params:{textDocument:{uri}}});send({id:4,method:'textDocument/documentSymbol',params:{textDocument:{uri}}});assert.deepEqual((await waitFor(m=>m.id===4)).result,[]);send({id:5,method:'shutdown'});assert.equal((await waitFor(m=>m.id===5)).result,null);send({method:'exit'});child.stdin.end();await new Promise((done,reject)=>{const timer=setTimeout(()=>reject(Error('Shutdown timed out')),5000);child.once('exit',code=>{clearTimeout(timer);code===0?done():reject(Error('Exit '+code))})});checks.push({name:'close-removes-document-and-ordered-shutdown-exits',status:'passed'})
}catch(error){failure=error;checks.push({name:'lsp-transport',status:'failed',error:error.stack})}finally{if(child.exitCode===null)child.kill()}
const report={...context.metadata(),status:failure?'failed':'passed',checks,stderr,scope:'Actual local language-server child process over Content-Length stdio, no external editor GUI claim.'};await mkdir(dirname(context.reportPath),{recursive:true});await writeFile(context.reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks}));if(failure)process.exitCode=1
