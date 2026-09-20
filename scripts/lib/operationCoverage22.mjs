import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {resolve,relative,dirname,isAbsolute} from 'node:path'
import ts from 'typescript'
import {SourceMapConsumer} from 'source-map-js'
const hash=text=>createHash('sha256').update(text).digest('hex')
const portable=path=>path.replaceAll('\\','/')
function confined(root,path){const full=resolve(root,path),part=relative(root,full);if(!part||part.startsWith('..')||isAbsolute(part))throw Error('Coverage path leaves its root: '+path);return full}
/** Only positive function-entry counters map to declaration headers. Executed
 * nested callbacks must not be mistaken for invocation of their outer owner. */
export async function createOperationCoverageMapper22({root,dist,operations}){
 root=resolve(root);dist=resolve(dist);const bundles=new Map(),sources=new Map(),files=new Map()
 for(const operation of operations){const entries=files.get(operation.source)||[];entries.push(operation);files.set(operation.source,entries)}
 async function sourceInfo(path,content){
  const text=await readFile(confined(root,path),'utf8');if(text.replaceAll('\r\n','\n')!==content?.replaceAll('\r\n','\n'))throw Error('Coverage source differs from the source map: '+path)
  const digest=hash(text),known=sources.get(path);if(known){if(known.sha256!==digest)throw Error('Source changed during coverage: '+path);return known}
  const ast=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true),entries=files.get(path)||[],headers=[]
  function declaredOwner(node){
   if(ts.isFunctionDeclaration(node))return node.parent===ast;
   if(ts.isVariableDeclaration(node))return node.parent?.parent?.parent===ast;
   if(ts.isClassDeclaration(node.parent))return node.parent.parent===ast;
   if(ts.isObjectLiteralExpression(node.parent))return ts.isVariableDeclaration(node.parent.parent)&&node.parent.parent.parent?.parent?.parent===ast;
   return false;
  }
  function declarationIdentity(node){
   if(ts.isFunctionDeclaration(node))return {name:node.name?.text||'default',kind:'exported function'};
   if(ts.isVariableDeclaration(node))return {name:node.name.getText(ast),kind:'exported function value'};
   if(ts.isClassDeclaration(node.parent))return {name:(node.parent.name?.text||'default')+'.'+(ts.isConstructorDeclaration(node)?'constructor':node.name.getText(ast)),kind:ts.isGetAccessorDeclaration(node)?'getter':ts.isSetAccessorDeclaration(node)?'setter':'public class operation'};
   if(ts.isObjectLiteralExpression(node.parent)&&ts.isVariableDeclaration(node.parent.parent))return {name:node.parent.parent.name.getText(ast)+'.'+node.name.getText(ast),kind:'exported object operation'};
   return null;
  }
  function visit(node){let fn=node;if(ts.isVariableDeclaration(node)&&node.initializer&&(ts.isArrowFunction(node.initializer)||ts.isFunctionExpression(node.initializer)))fn=node.initializer;else if(ts.isPropertyAssignment(node)&&(ts.isArrowFunction(node.initializer)||ts.isFunctionExpression(node.initializer)))fn=node.initializer;
   if(fn.body&&ts.isFunctionLike(fn)&&declaredOwner(node)){const line=ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1,identity=declarationIdentity(node);for(const operation of entries.filter(entry=>entry.line===line&&entry.id===path+'#'+identity?.name&&entry.kind===identity?.kind)){const start=node.getStart(ast),end=fn.body.getStart(ast)+1;headers.push({operation,start,end})}}
   ts.forEachChild(node,visit)
  }visit(ast)
  const info={sha256:digest,ast,headers};sources.set(path,info);return info
 }
 return{async mapScript(path,functions){
  const full=confined(dist,path),code=await readFile(full,'utf8'),digest=hash(code);let bundle=bundles.get(path)
  if(!bundle){const raw=await readFile(full+'.map','utf8'),consumer=new SourceMapConsumer(JSON.parse(raw));const starts=[0];for(let i=0;i<code.length;i++)if(code.charCodeAt(i)===10)starts.push(i+1);bundle={consumer,starts,sha256:digest,mapSha256:hash(raw)};bundles.set(path,bundle)}
  if(bundle.sha256!==digest)throw Error('Bundle changed during coverage: '+path)
  if(hash(await readFile(full+'.map','utf8'))!==bundle.mapSha256)throw Error('Source map changed during coverage: '+path)
  const results=new Map()
  for(const fn of functions){const range=fn.ranges?.[0];if(!range||range.count<=0||range.startOffset<0||range.endOffset>code.length||range.startOffset===0&&range.endOffset===code.length&&!fn.functionName)continue;
   let line=0;while(line+1<bundle.starts.length&&bundle.starts[line+1]<=range.startOffset)line++;
   const mapped=bundle.consumer.originalPositionFor({line:line+1,column:range.startOffset-bundle.starts[line],bias:SourceMapConsumer.LEAST_UPPER_BOUND});if(!mapped.source||!mapped.line)continue;
   const original=portable(relative(root,resolve(dirname(full+'.map'),mapped.source)));if(!files.has(original))continue;
   const info=await sourceInfo(original,bundle.consumer.sourceContentFor(mapped.source,true)),position=info.ast.getPositionOfLineAndCharacter(mapped.line-1,mapped.column),matches=[...new Map(info.headers.filter(header=>position>=header.start&&position<=header.end).map(header=>[header.operation.id+':'+header.operation.line+':'+header.operation.kind,header])).values()];
   if(matches.length!==1)continue;
   const operation=matches[0].operation,key=operation.id+':'+operation.line+':'+operation.kind,previous=results.get(key);results.set(key,{mappingVersion:2,id:operation.id,source:operation.source,line:operation.line,kind:operation.kind,sourceSha256:info.sha256,generatedFile:portable(path),generatedSha256:bundle.sha256,mapSha256:bundle.mapSha256,entryCount:(previous?.entryCount||0)+range.count})
  }
  return [...results.values()]
 }}
}
