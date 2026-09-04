#!/usr/bin/env node
import { createInterface } from 'node:readline'
import { createServer } from 'vite'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot=dirname(dirname(fileURLToPath(import.meta.url))),machineVersion=String(JSON.parse(await readFile(join(repositoryRoot,'package.json'),'utf8')).version??''),versionParts=machineVersion.split('.'),releaseName=versionParts.length===3?`${versionParts[0]}.${versionParts[1].padStart(2,'0')}${versionParts[2]==='0'?'':`.${versionParts[2]}`}`:machineVersion
const vite=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'silent'}),language=await vite.ssrLoadModule('/src/editor/scriptLanguage.ts'),index=new language.ScriptWorkspaceIndex(),documents=new Map(),cancelled=new Set()
const legacy=process.argv.includes('--legacy-jsonl'),indexArgument=process.argv.indexOf('--index'),indexPath=indexArgument>=0&&process.argv[indexArgument+1]?resolve(process.argv[indexArgument+1]):null
if(indexPath)try{index.restore(await readFile(indexPath,'utf8'))}catch{/* A missing/corrupt cache is rebuilt from client documents. */}

const zeroPosition=position=>({line:Math.max(0,(position?.line??1)-1),character:Math.max(0,(position?.column??1)-1)})
const zeroRange=item=>({start:zeroPosition(item.range?.start??item),end:zeroPosition(item.range?.end??{line:item.endLine,column:item.endColumn})})
const location=(uri,item)=>({uri,range:{start:{line:Math.max(0,item.line-1),character:Math.max(0,item.column-1)},end:{line:Math.max(0,(item.endLine??item.line)-1),character:Math.max(0,(item.endColumn??item.column+item.name.length)-1)}}})
const wordAt=(source,position)=>{const line=source.split(/\r?\n/)[Math.max(0,position?.line??0)]??'',column=Math.min(line.length,Math.max(0,position?.character??0)),before=line.slice(0,column).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0]??'',after=line.slice(column).match(/^[A-Za-z0-9_]*/)?.[0]??'';return`${before}${after}`}
const prefixAt=(source,position)=>{const line=source.split(/\r?\n/)[Math.max(0,position?.line??0)]??'';return line.slice(0,Math.max(0,position?.character??0)).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0]??''}
const diagnostics=analysis=>analysis.diagnostics.map(item=>({range:zeroRange(item),severity:item.severity==='error'?1:item.severity==='warning'?2:3,code:item.code,source:item.source,message:item.message,codeDescription:{href:item.documentation}}))
const textDocument=params=>params?.textDocument??{},uriOf=params=>String(textDocument(params).uri??'').slice(0,2048)
const publish=uri=>send({jsonrpc:'2.0',method:'textDocument/publishDiagnostics',params:{uri,version:documents.get(uri)?.version??null,diagnostics:diagnostics(index.document(uri)?.analysis??language.analyzeScript(''))}})
const saveIndex=async()=>{if(indexPath)await writeFile(indexPath,`${index.snapshot()}\n`,'utf8')}

async function standardResult(request){
  const method=request.method,params=request.params??{},uri=uriOf(params),document=documents.get(uri)??index.document(uri),source=document?.source??document?.text??''
  if(method==='initialize')return{capabilities:{positionEncoding:'utf-16',textDocumentSync:{openClose:true,change:1,save:{includeText:true}},completionProvider:{triggerCharacters:['.','_']},hoverProvider:true,signatureHelpProvider:{triggerCharacters:['(',',']},definitionProvider:true,referencesProvider:true,renameProvider:{prepareProvider:true},documentSymbolProvider:true,workspaceSymbolProvider:true,documentFormattingProvider:true,codeActionProvider:true,diagnosticProvider:{identifier:'nova-rhai',interFileDependencies:true,workspaceDiagnostics:true},experimental:{novaTypeAnalysis:true,novaModuleDiagnostics:true,novaStatementMap:true}},serverInfo:{name:'Nova Rhai Language Server',version:releaseName}}
  if(method==='shutdown'){await saveIndex();return null}
  if(method==='textDocument/completion')return language.completionDetails(prefixAt(source,params.position),index.document(uri)?.analysis).map(item=>({label:item.label,kind:3,detail:item.detail,documentation:{kind:'markdown',value:item.documentation},insertText:item.insertText,tags:item.deprecated?[1]:[]}))
  if(method==='textDocument/hover'){const value=language.hoverInfo(wordAt(source,params.position),index.document(uri)?.analysis);return value?{contents:{kind:'markdown',value:`\`${value.signature}\`\n\n${value.documentation}`}}:null}
  if(method==='textDocument/signatureHelp'){const line=source.split(/\r?\n/)[params.position?.line??0]??'',before=line.slice(0,params.position?.character??0),call=before.match(/([A-Za-z_][A-Za-z0-9_]*)\s*\(([^()]*)$/),value=call?language.parameterHint(call[1],call[2]?call[2].split(',').length-1:0):null;return value?{signatures:[{label:value.signature,documentation:value.documentation}],activeSignature:0,activeParameter:value.activeParameter}:null}
  if(method==='textDocument/definition'){const value=index.definition(wordAt(source,params.position));return value?location(value.uri,value):null}
  if(method==='textDocument/references')return index.references(wordAt(source,params.position)).map(item=>location(item.uri,{...item,endLine:item.line,endColumn:item.column+item.name.length}))
  if(method==='textDocument/prepareRename'){const name=wordAt(source,params.position);return name?{range:{start:{line:params.position.line,character:Math.max(0,params.position.character-name.length)},end:{line:params.position.line,character:params.position.character}},placeholder:name}:null}
  if(method==='textDocument/rename'){const name=wordAt(source,params.position),updates=index.rename(name,String(params.newName??''));return{changes:Object.fromEntries([...updates].map(([target,text])=>[target,[{range:{start:{line:0,character:0},end:{line:(index.document(target)?.source.split(/\r?\n/).length??1)+1,character:0}},newText:text}]]))}}
  if(method==='textDocument/documentSymbol')return(index.document(uri)?.analysis.symbols??[]).map(item=>({name:item.name,detail:item.signature,kind:item.kind==='function'||item.kind==='test'?12:13,range:location(uri,item).range,selectionRange:location(uri,item).range}))
  if(method==='workspace/symbol')return index.workspaceSymbols(String(params.query??'')).map(item=>({name:item.name,kind:item.kind==='function'||item.kind==='test'?12:13,location:location(item.uri,item)}))
  if(method==='textDocument/formatting')return[{range:{start:{line:0,character:0},end:{line:source.split(/\r?\n/).length+1,character:0}},newText:language.formatScript(source,{indentSize:Number(params.options?.tabSize)===4?4:2})}]
  if(method==='textDocument/codeAction')return language.scriptCodeActions(index.document(uri)?.analysis??language.analyzeScript(source)).map(item=>({title:item.title,kind:'quickfix',diagnostics:diagnostics(index.document(uri)?.analysis??language.analyzeScript(source)).filter(value=>value.code===item.code),data:item}))
  if(method==='textDocument/diagnostic')return{kind:'full',items:diagnostics(index.document(uri)?.analysis??language.analyzeScript(source))}
  if(method==='workspace/diagnostic')return{items:[...documents.keys()].map(target=>({uri:target,version:documents.get(target)?.version??null,kind:'full',items:diagnostics(index.document(target)?.analysis??language.analyzeScript(''))}))}
  if(method==='nova/moduleDiagnostics')return index.moduleDiagnostics()
  if(method==='nova/typeAnalysis'){const analysis=index.document(uri)?.analysis;return analysis?{types:analysis.types,structures:analysis.structures,genericHelpers:analysis.genericHelpers,statements:analysis.statements}:null}
  if(method==='nova/saveIndex'){await saveIndex();return{documents:index.size,saved:Boolean(indexPath)}}
  return null
}

async function handle(request){
  if(!request||typeof request!=='object')return
  if(request.method==='$/cancelRequest'){cancelled.add(request.params?.id);return}
  if(request.method==='exit'){await close();return}
  if(request.method==='initialized')return
  if(request.method==='textDocument/didOpen'){const item=request.params?.textDocument;if(item?.uri&&typeof item.text==='string'){documents.set(item.uri,{source:item.text.slice(0,2_000_000),version:item.version??0});index.update(item.uri,item.text.slice(0,2_000_000));publish(item.uri)}return}
  if(request.method==='textDocument/didChange'){const uri=uriOf(request.params),change=request.params?.contentChanges?.at(-1);if(uri&&typeof change?.text==='string'){documents.set(uri,{source:change.text.slice(0,2_000_000),version:request.params?.textDocument?.version??0});index.update(uri,change.text.slice(0,2_000_000),2,Math.max(0,request.params?.textDocument?.version??0));publish(uri)}return}
  if(request.method==='textDocument/didSave'){const uri=uriOf(request.params);if(uri&&typeof request.params?.text==='string'){documents.set(uri,{source:request.params.text.slice(0,2_000_000),version:documents.get(uri)?.version??0});index.update(uri,request.params.text.slice(0,2_000_000));publish(uri)}return}
  if(request.method==='textDocument/didClose'){const uri=uriOf(request.params);documents.delete(uri);index.remove(uri);send({jsonrpc:'2.0',method:'textDocument/publishDiagnostics',params:{uri,diagnostics:[]}});return}
  if(request.id===undefined)return
  if(cancelled.delete(request.id)){send({jsonrpc:'2.0',id:request.id,error:{code:-32800,message:'Request cancelled'}});return}
  try{send({jsonrpc:'2.0',id:request.id,result:await standardResult(request)})}catch(error){send({jsonrpc:'2.0',id:request.id,error:{code:-32603,message:error instanceof Error?error.message:String(error)}})}
}

let closing=false
async function close(){if(closing)return;closing=true;process.stdin.pause();await saveIndex().catch(()=>{});index.clear();await vite.close();process.exitCode=0}
function send(value){const body=JSON.stringify(value);if(legacy)process.stdout.write(`${body}\n`);else process.stdout.write(`Content-Length: ${Buffer.byteLength(body,'utf8')}\r\n\r\n${body}`)}

if(legacy){
  send({event:'ready',protocol:'nova-rhai-language/3',lsp:'3.17',apiVersion:2,indexDocuments:index.size})
  const input=createInterface({input:process.stdin,crlfDelay:Infinity,terminal:false})
  for await(const line of input){if(!line.trim())continue;try{const request=JSON.parse(line);if(request?.method==='workspace/saveIndex'){await saveIndex();send({id:request.id,result:{documents:index.size,saved:Boolean(indexPath)}});continue}if(request?.method==='shutdown'){await saveIndex();send({id:request.id,result:null});break}send(language.handleScriptProtocol(index,request))}catch(error){send({id:null,error:{code:'NOVA-PROTOCOL-002',message:error instanceof Error?error.message:String(error)}})}}
  await close()
}else{
  let buffer=Buffer.alloc(0)
  process.stdin.on('data',chunk=>{buffer=Buffer.concat([buffer,Buffer.from(chunk)]);for(;;){const headerEnd=buffer.indexOf('\r\n\r\n');if(headerEnd<0)break;const header=buffer.subarray(0,headerEnd).toString('ascii'),length=Number(header.match(/Content-Length:\s*(\d+)/i)?.[1]??-1);if(!Number.isFinite(length)||length<0||length>16_000_000){buffer=Buffer.alloc(0);send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid Content-Length'}});break}const end=headerEnd+4+length;if(buffer.length<end)break;const body=buffer.subarray(headerEnd+4,end).toString('utf8');buffer=buffer.subarray(end);try{void handle(JSON.parse(body))}catch(error){send({jsonrpc:'2.0',id:null,error:{code:-32700,message:error instanceof Error?error.message:String(error)}})}}})
  process.stdin.on('end',()=>void close())
}
