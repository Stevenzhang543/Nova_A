#!/usr/bin/env node
/** Rhai 语言服务器：通过 LSP 或兼容 JSON 行协议提供工作区分析，使用隔离转换服务且不启动编辑器。 */
import { createInterface } from 'node:readline'
import { createServer } from 'vite'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot=dirname(dirname(fileURLToPath(import.meta.url))),machineVersion=String(JSON.parse(await readFile(join(repositoryRoot,'package.json'),'utf8')).version??''),versionParts=machineVersion.split('.'),releaseName=versionParts.length===3?`${versionParts[0]}.${versionParts[1].padStart(2,'0')}${versionParts[2]==='0'?'':`.${versionParts[2]}`}`:machineVersion
// The language server needs TypeScript transformation, not the editor's HTML
// discovery, file watchers or browser HMR. Isolating it also avoids startup
// waiting on the application's dependency optimizer in large workspaces.
const vite=await createServer({root:repositoryRoot,configFile:false,server:{middlewareMode:true,watch:null,hmr:false},optimizeDeps:{noDiscovery:true},appType:'custom',logLevel:'silent'}),language=await vite.ssrLoadModule('/src/editor/scriptLanguage.ts'),index=new language.ScriptWorkspaceIndex(),documents=new Map(),cancelled=new Set()
const legacy=process.argv.includes('--legacy-jsonl'),indexArgument=process.argv.indexOf('--index'),indexPath=indexArgument>=0&&process.argv[indexArgument+1]?resolve(process.argv[indexArgument+1]):null
if(indexPath)try{index.restore(await readFile(indexPath,'utf8'))}catch{/* A missing/corrupt cache is rebuilt from client documents. */}

const zeroPosition=/** 把分析器的一基行列转为 LSP 零基坐标，下界限制为零。 */ position=>({line:Math.max(0,(position?.line??1)-1),character:Math.max(0,(position?.column??1)-1)})
const zeroRange=/** 将诊断起止位置转为 LSP 范围，兼容旧的平铺位置字段。 */ item=>({start:zeroPosition(item.range?.start??item),end:zeroPosition(item.range?.end??{line:item.endLine,column:item.endColumn})})
const location=/** 组合文档 URI 和零基符号范围，缺少结束位置时按符号名补齐。 */ (uri,item)=>({uri,range:{start:{line:Math.max(0,item.line-1),character:Math.max(0,item.column-1)},end:{line:Math.max(0,(item.endLine??item.line)-1),character:Math.max(0,(item.endColumn??item.column+item.name.length)-1)}}})
const wordAt=/** 在光标所在行向左右提取标识符，并约束读取位置。 */ (source,position)=>{const line=source.split(/\r?\n/)[Math.max(0,position?.line??0)]??'',column=Math.min(line.length,Math.max(0,position?.character??0)),before=line.slice(0,column).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0]??'',after=line.slice(column).match(/^[A-Za-z0-9_]*/)?.[0]??'';return`${before}${after}`}
const offsetAt=/** 将 UTF-16 行列位置转换为源码偏移，处理 CRLF 并限制在行末。 */ (source,position)=>{let offset=0,line=0;const target=Math.max(0,Math.trunc(position?.line??0));while(line<target){const next=source.indexOf('\n',offset);if(next<0)return source.length;offset=next+1;line++}const end=source.indexOf('\n',offset),limit=end<0?source.length:end>offset&&source[end-1]==='\r'?end-1:end;return Math.min(limit,offset+Math.max(0,Math.trunc(position?.character??0)))}
const prefixAt=/** 提取光标前的标识符前缀，用于补全。 */ (source,position)=>{const line=source.split(/\r?\n/)[Math.max(0,position?.line??0)]??'';return line.slice(0,Math.max(0,position?.character??0)).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0]??''}
const diagnostics=/** 把分析器诊断列表转换为 LSP 的范围、级别和文档链接。 */ analysis=>analysis.diagnostics.map(/** 转换单条诊断的零基范围、严重性、来源及文档链接。 */ item=>({range:zeroRange(item),severity:item.severity==='error'?1:item.severity==='warning'?2:3,code:item.code,source:item.source,message:item.message,codeDescription:{href:item.documentation}}))
const textDocument=/* 当 params?.textDocument 为 null 或 undefined 时返回 {}，否则保留左侧值。 */ params=>params?.textDocument??{},uriOf=/* 调用 String(textDocument(params).uri??'').slice(0,2048) 并返回调用结果。 */ params=>String(textDocument(params).uri??'').slice(0,2048)
const publish=/** 发布指定文档当前版本的诊断，缺少分析时使用空脚本结果。 */ uri=>send({jsonrpc:'2.0',method:'textDocument/publishDiagnostics',params:{uri,version:documents.get(uri)?.version??null,diagnostics:diagnostics(index.document(uri)?.analysis??language.analyzeScript(''))}})
const saveIndex=/** 仅在配置缓存路径时保存工作区索引快照。 */ async()=>{if(indexPath)await writeFile(indexPath,`${index.snapshot()}\n`,'utf8')}

/** 分派标准语言请求和 Nova 扩展，返回补全、诊断、符号、格式化和重命名等结果。 */ async function standardResult(request){
  const method=request.method,params=request.params??{},uri=uriOf(params),document=documents.get(uri)??index.document(uri),source=document?.source??document?.text??''
  if(method==='initialize')return{capabilities:{positionEncoding:'utf-16',textDocumentSync:{openClose:true,change:1,save:{includeText:true}},completionProvider:{triggerCharacters:['.','_']},hoverProvider:true,signatureHelpProvider:{triggerCharacters:['(',',']},definitionProvider:true,referencesProvider:true,renameProvider:{prepareProvider:true},documentSymbolProvider:true,workspaceSymbolProvider:true,documentFormattingProvider:true,codeActionProvider:true,diagnosticProvider:{identifier:'nova-rhai',interFileDependencies:true,workspaceDiagnostics:true},experimental:{novaTypeAnalysis:true,novaModuleDiagnostics:true,novaStatementMap:true}},serverInfo:{name:'Nova Rhai Language Server',version:releaseName}}
  if(method==='shutdown'){await saveIndex();return null}
  if(method==='textDocument/completion')return language.completionDetails(prefixAt(source,params.position),index.document(uri)?.analysis).map(/** 将补全项映射为 LSP 插入文本、文档和弃用标签。 */ item=>({label:item.label,kind:3,detail:item.detail,documentation:{kind:'markdown',value:item.documentation},insertText:item.insertText,tags:item.deprecated?[1]:[]}))
  if(method==='textDocument/hover'){const value=language.hoverInfo(wordAt(source,params.position),index.document(uri)?.analysis);return value?{contents:{kind:'markdown',value:`\`${value.signature}\`\n\n${value.documentation}`}}:null}
  if(method==='textDocument/signatureHelp'){const line=source.split(/\r?\n/)[params.position?.line??0]??'',before=line.slice(0,params.position?.character??0),call=before.match(/([A-Za-z_][A-Za-z0-9_]*)\s*\(([^()]*)$/),value=call?language.parameterHint(call[1],call[2]?call[2].split(',').length-1:0):null;return value?{signatures:[{label:value.signature,documentation:value.documentation}],activeSignature:0,activeParameter:value.activeParameter}:null}
  if(method==='textDocument/definition'){const value=index.definition(wordAt(source,params.position));return value?location(value.uri,value):null}
  if(method==='textDocument/references')return index.references(wordAt(source,params.position)).map(/* 调用 location(item.uri,{...item,endLine:item.line,endColumn:item.column+item.name.length}) 并返回调用结果。 */ item=>location(item.uri,{...item,endLine:item.line,endColumn:item.column+item.name.length}))
  if(method==='textDocument/prepareRename'){const name=wordAt(source,params.position);if(!name)return null;index.rename(name,name,{uri,offset:offsetAt(source,params.position)});const line=source.split(/\r?\n/)[params.position.line]??'',before=line.slice(0,params.position.character).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0]??'',start=Math.max(0,params.position.character-before.length);return{range:{start:{line:params.position.line,character:start},end:{line:params.position.line,character:start+name.length}},placeholder:name}}
  if(method==='textDocument/rename'){const name=wordAt(source,params.position),updates=index.rename(name,String(params.newName??''),{uri,offset:offsetAt(source,params.position)});return{changes:Object.fromEntries([...updates].map(/** 把重命名后的每份完整文档转换为整文替换编辑。 */ ([target,text])=>[target,[{range:{start:{line:0,character:0},end:{line:(index.document(target)?.source.split(/\r?\n/).length??1)+1,character:0}},newText:text}]]))}}
  if(method==='textDocument/documentSymbol')return(index.document(uri)?.analysis.symbols??[]).map(/** 将文档符号映射为 LSP 符号类别和选区。 */ item=>({name:item.name,detail:item.signature,kind:item.kind==='function'||item.kind==='test'?12:13,range:location(uri,item).range,selectionRange:location(uri,item).range}))
  if(method==='workspace/symbol')return index.workspaceSymbols(String(params.query??'')).map(/** 将跨文档符号映射为名称、类别和定位信息。 */ item=>({name:item.name,kind:item.kind==='function'||item.kind==='test'?12:13,location:location(item.uri,item)}))
  if(method==='textDocument/formatting')return[{range:{start:{line:0,character:0},end:{line:source.split(/\r?\n/).length+1,character:0}},newText:language.formatScript(source,{indentSize:Number(params.options?.tabSize)===4?4:2})}]
  if(method==='textDocument/codeAction')return language.scriptCodeActions(index.document(uri)?.analysis??language.analyzeScript(source)).map(/** 组合快速修复标题、关联诊断及附加数据。 */ item=>({title:item.title,kind:'quickfix',diagnostics:diagnostics(index.document(uri)?.analysis??language.analyzeScript(source)).filter(/* 比较 value.code 与 item.code，返回严格相等的判断结果。 */ value=>value.code===item.code),data:item}))
  if(method==='textDocument/diagnostic')return{kind:'full',items:diagnostics(index.document(uri)?.analysis??language.analyzeScript(source))}
  if(method==='workspace/diagnostic')return{items:[...documents.keys()].map(/** 生成指定工作区文档当前版本的完整诊断结果。 */ target=>({uri:target,version:documents.get(target)?.version??null,kind:'full',items:diagnostics(index.document(target)?.analysis??language.analyzeScript(''))}))}
  if(method==='nova/moduleDiagnostics')return index.moduleDiagnostics()
  if(method==='nova/typeAnalysis'){const analysis=index.document(uri)?.analysis;return analysis?{types:analysis.types,structures:analysis.structures,genericHelpers:analysis.genericHelpers,statements:analysis.statements}:null}
  if(method==='nova/saveIndex'){await saveIndex();return{documents:index.size,saved:Boolean(indexPath)}}
  return null
}

/** 处理文档通知、递增版本和取消请求，维护索引并把请求异常转换为协议错误。 */ async function handle(request){
  if(!request||typeof request!=='object')return
  if(request.method==='$/cancelRequest'){cancelled.add(request.params?.id);return}
  if(request.method==='exit'){await close();return}
  if(request.method==='initialized')return
  if(request.method==='textDocument/didOpen'){const item=request.params?.textDocument;if(item?.uri&&typeof item.text==='string'){documents.set(item.uri,{source:item.text.slice(0,2_000_000),version:item.version??0});index.update(item.uri,item.text.slice(0,2_000_000));publish(item.uri)}return}
  if(request.method==='textDocument/didChange'){const uri=uriOf(request.params),change=request.params?.contentChanges?.at(-1),version=request.params?.textDocument?.version,current=documents.get(uri);if(current&&Number.isSafeInteger(version)&&version>current.version&&typeof change?.text==='string'&&!change.range){documents.set(uri,{source:change.text.slice(0,2_000_000),version});index.update(uri,change.text.slice(0,2_000_000),2,version);publish(uri)}return}
  if(request.method==='textDocument/didSave'){const uri=uriOf(request.params);if(uri&&typeof request.params?.text==='string'){documents.set(uri,{source:request.params.text.slice(0,2_000_000),version:documents.get(uri)?.version??0});index.update(uri,request.params.text.slice(0,2_000_000));publish(uri)}return}
  if(request.method==='textDocument/didClose'){const uri=uriOf(request.params);documents.delete(uri);index.remove(uri);send({jsonrpc:'2.0',method:'textDocument/publishDiagnostics',params:{uri,diagnostics:[]}});return}
  if(request.id===undefined)return
  if(cancelled.delete(request.id)){send({jsonrpc:'2.0',id:request.id,error:{code:-32800,message:'Request cancelled'}});return}
  try{send({jsonrpc:'2.0',id:request.id,result:await standardResult(request)})}catch(error){send({jsonrpc:'2.0',id:request.id,error:{code:-32603,message:error instanceof Error?error.message:String(error)}})}
}

let closing=false
/** 只关闭一次：暂停输入、尝试保存缓存、清空索引并释放转换服务。 */ async function close(){if(closing)return;closing=true;process.stdin.pause();await saveIndex().catch(/** 关闭时忽略缓存写入失败，使资源清理仍可继续。 */ ()=>{});index.clear();await vite.close();process.exitCode=0}
/** 序列化协议消息；兼容模式使用 JSON 行，标准模式按 UTF-8 字节数写帧头。 */ function send(value){const body=JSON.stringify(value);if(legacy)process.stdout.write(`${body}\n`);else process.stdout.write(`Content-Length: ${Buffer.byteLength(body,'utf8')}\r\n\r\n${body}`)}

if(legacy){
  send({event:'ready',protocol:'nova-rhai-language/3',lsp:'3.17',apiVersion:2,indexDocuments:index.size})
  const input=createInterface({input:process.stdin,crlfDelay:Infinity,terminal:false})
  for await(const line of input){if(!line.trim())continue;try{const request=JSON.parse(line);if(request?.method==='workspace/saveIndex'){await saveIndex();send({id:request.id,result:{documents:index.size,saved:Boolean(indexPath)}});continue}if(request?.method==='shutdown'){await saveIndex();send({id:request.id,result:null});break}send(language.handleScriptProtocol(index,request))}catch(error){send({id:null,error:{code:'NOVA-PROTOCOL-002',message:error instanceof Error?error.message:String(error)}})}}
  await close()
}else{
  let buffer=Buffer.alloc(0), pending=Promise.resolve()
  process.stdin.on('data',/** 累积输入帧并检查头部及载荷大小；完整 JSON 请求按顺序处理，格式错误返回协议诊断。 */ chunk=>{buffer=Buffer.concat([buffer,Buffer.from(chunk)]);for(;;){const headerEnd=buffer.indexOf('\r\n\r\n');if(headerEnd<0){if(buffer.length>8192){buffer=Buffer.alloc(0);send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'LSP header exceeds 8192 bytes'}})}break;}const header=buffer.subarray(0,headerEnd).toString('ascii'),length=Number(header.match(/Content-Length:\s*(\d+)/i)?.[1]??-1);if(headerEnd>8192||(header.match(/Content-Length:/gi)?.length??0)!==1||!Number.isSafeInteger(length)||length<0||length>16_000_000){buffer=Buffer.alloc(0);send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid Content-Length'}});break}const end=headerEnd+4+length;if(buffer.length<end)break;const body=buffer.subarray(headerEnd+4,end).toString('utf8');buffer=buffer.subarray(end);try{const request=JSON.parse(body);pending=pending.then(/* 调用 handle(request) 并返回调用结果。 */ ()=>handle(request)).catch(/** 将排队处理中的异常编码为对应请求的内部错误响应。 */ error=>send({jsonrpc:'2.0',id:request?.id??null,error:{code:-32603,message:error instanceof Error?error.message:String(error)}}))}catch(error){send({jsonrpc:'2.0',id:null,error:{code:-32700,message:error instanceof Error?error.message:String(error)}})}}})
  process.stdin.on('end',/** 输入结束后等待已排队的请求，再关闭服务器。 */ ()=>void pending.then(/* 调用 close() 并返回调用结果。 */ ()=>close()))
}
