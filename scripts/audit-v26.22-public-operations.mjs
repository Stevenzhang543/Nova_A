import {linkOperationDispositions22} from './lib/operationDispositions22.mjs'
import {linkNodeOperationCoverage22} from './lib/nodeOperationEvidence22.mjs'
import {linkBrowserOperationCoverage22} from './lib/browserOperationEvidence22.mjs'
import {linkRetainedOperations22} from './lib/operationEvidence22.mjs'
import ts from 'typescript'
import {execFileSync} from 'node:child_process'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
const report=JSON.parse(await readFile('release-audits/v26.22-document-boundaries.json','utf8'))
if(report.status!=='passed')throw Error('Document-boundary evidence must pass before linking it')
const tested=new Map(),aliases={p:'src/store/physics.ts',d:'src/editor/pendingDrafts.ts',f:'src/runtime/prefabs.ts',c:'src/world/components.ts',team:'src/runtime/teamWorkflow.ts',merge:'src/editor/semanticMergeCommand.ts',projectTests:'src/runtime/testRunner.ts',assets:'src/assets/AssetDatabase.ts',manager:'src/projects/projectManager.ts',connection:'src/world/Connection.ts'}
const suitePath='scripts/verify-v26.22-document-boundaries.mjs',suite=ts.createSourceFile(suitePath,await readFile(suitePath,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
function scanTests(node){
 if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='test'&&ts.isStringLiteral(node.arguments[0])){
  const name=node.arguments[0].text;if(!report.checks.some(check=>check.name===name&&check.status==='passed'))throw Error('Unexecuted case: '+name)
  function calls(child){if(ts.isCallExpression(child)&&ts.isPropertyAccessExpression(child.expression)){const receiver=child.expression.expression;const alias=ts.isIdentifier(receiver)?receiver.text:ts.isPropertyAccessExpression(receiver)&&receiver.expression.getText(suite)==='opened.modules'?receiver.name.text:'';const source=aliases[alias];if(source){const id=source+'#'+child.expression.name.text,list=tested.get(id)||[];if(!list.some(item=>item.case===name))list.push({suite:suitePath,report:'release-audits/v26.22-document-boundaries.json',case:name});tested.set(id,list)}}ts.forEachChild(child,calls)}calls(node.arguments[1])
 }ts.forEachChild(node,scanTests)
}scanTests(suite)
// Link additional executed named regressions, preserving pending entries elsewhere.
for (const spec of [
 {suite:'scripts/verify-v26.22-history-core.mjs',report:'release-audits/v26.22-history-core.json',test:'check',source:'src/editor/commands.ts',classes:{h:'CommandHistory',single:'DocumentMutationCommand',group:'CompositeCommand'},functions:{},constructors:['CommandHistory','DocumentMutationCommand','CompositeCommand']},
 {suite:'scripts/verify-v26.22-pending-drafts.mjs',report:'release-audits/v26.22-pending-drafts.json',test:'test',source:'src/editor/pendingDrafts.ts',classes:{},functions:{registerEditorDraft:'registerEditorDraft',settleEditorDrafts:'settleEditorDrafts',cancelEditorDrafts:'cancelEditorDrafts'},constructors:[]}
]) {
 const evidence=JSON.parse(await readFile(spec.report,'utf8'));if(evidence.status!=='passed')throw Error('Unpassed operation evidence '+spec.report)
 const source=ts.createSourceFile(spec.suite,await readFile(spec.suite,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
 function visit(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text===spec.test&&ts.isStringLiteral(node.arguments[0])){
  const name=node.arguments[0].text;if(!evidence.checks.some(row=>row.name===name&&row.status==='passed'))throw Error('Missing executed case '+name)
  const add=operation=>{const id=spec.source+'#'+operation,list=tested.get(id)||[];if(!list.some(row=>row.case===name&&row.suite===spec.suite))list.push({suite:spec.suite,report:spec.report,case:name});tested.set(id,list)}
  function inspect(child){if(ts.isCallExpression(child)&&ts.isIdentifier(child.expression)&&spec.functions[child.expression.text])add(spec.functions[child.expression.text]);if(ts.isPropertyAccessExpression(child)&&ts.isIdentifier(child.expression)&&spec.classes[child.expression.text])add(spec.classes[child.expression.text]+'.'+child.name.text);if(ts.isNewExpression(child)&&ts.isIdentifier(child.expression)&&spec.constructors.includes(child.expression.text))add(child.expression.text+'.constructor');ts.forEachChild(child,inspect)}inspect(node.arguments[1])
 }ts.forEachChild(node,visit)}visit(source)
}

await linkRetainedOperations22(tested)
const bakePath='release-audits/v26.22-tilemap-bake.json',bake=JSON.parse(await readFile(bakePath,'utf8'));
if(bake.status!=='passed'||!bake.checks.length)throw Error('Unpassed tile bake evidence');
for(const check of bake.checks){if(check.status!=='passed'||!check.covers.length)throw Error('Missing tile bake case');for(const id of check.covers){if(!['src/runtime/tilemap.ts#requestTileMapBake','src/runtime/tilemap.ts#cancelTileMapBake'].includes(id))throw Error('Unexpected tile bake operation');const cases=tested.get(id)||[];cases.push({suite:'scripts/verify-v26.22-tilemap-bake.mjs',report:bakePath,case:check.name});tested.set(id,cases)}}
const recoveryPath='release-audits/v26.22-rendering-recovery.json',recovery=JSON.parse(await readFile(recoveryPath,'utf8'));
if(recovery.status!=='passed'||!recovery.checks.length)throw Error('Unpassed rendering recovery evidence');
for(const check of recovery.checks){if(check.status!=='passed'||!check.covers.length)throw Error('Missing rendering recovery case');for(const id of check.covers){if(!id.startsWith('src/editor/studioDraftRetention.ts#'))throw Error('Unexpected recovery operation');const cases=tested.get(id)||[];cases.push({suite:'scripts/verify-v26.22-rendering-recovery.mjs',report:recoveryPath,case:check.name,link:'Direct calls recorded while executing the asserted recovery case; no full input-domain claim.'});tested.set(id,cases)}}
const identityReportPath='release-audits/v26.22-identity.json',identityReport=JSON.parse(await readFile(identityReportPath,'utf8'));
if(identityReport.status!=='passed'||!identityReport.checks.length)throw Error('Unpassed identity evidence');
for(const check of identityReport.checks){if(check.status!=='passed'||!check.covers.length)throw Error('Unpassed identity case');for(const id of check.covers){if(!['src/world/identity.ts#createUuid','src/world/identity.ts#normalizeUuid'].includes(id))throw Error('Unexpected identity operation '+id);const cases=tested.get(id)||[];cases.push({suite:'scripts/verify-v26.22-identity.mjs',report:identityReportPath,case:check.name});tested.set(id,cases)}}
const eventEvidencePath='release-audits/v26.22-event-validation.json',eventEvidence=JSON.parse(await readFile(eventEvidencePath,'utf8'));
if(eventEvidence.status!=='passed'||!eventEvidence.checks.length||eventEvidence.checks.some(check=>check.status!=='passed'))throw Error('Unpassed event-save evidence');
const eventOperation='src/runtime/eventSheets.ts#saveEventSheetAsset',eventCases=tested.get(eventOperation)||[];
for(const check of eventEvidence.checks)eventCases.push({suite:'scripts/verify-v26.22-event-validation.mjs',report:eventEvidencePath,case:check.name,link:'Actual saveEventSheetAsset return and whole-project/asset-generation assertions; import normalization is separate.'});
tested.set(eventOperation,eventCases);
const entityApi=JSON.parse(await readFile('release-audits/v26.22-entity-api.json','utf8'));if(entityApi.status!=='passed')throw Error('Entity API evidence must pass');for(const check of entityApi.checks){if(check.status!=='passed')throw Error('Entity API case must pass');for(const id of check.covers){if(!id.startsWith('src/world/Entity.ts#Entity.')&&id!=='src/world/TriangleEntity.ts#TriangleEntity.vertices')throw Error('Unexpected operation evidence '+id);const list=tested.get(id)||[];list.push({suite:'scripts/verify-v26.22-entity-api.mjs',report:'release-audits/v26.22-entity-api.json',case:check.name});tested.set(id,list)}}
const pathDraftReport='release-audits/v26.22-path-drafts.json',pathDraftEvidence=JSON.parse(await readFile(pathDraftReport,'utf8'));if(pathDraftEvidence.status!=='passed')throw Error('Unpassed path draft evidence');for(const check of pathDraftEvidence.checks){if(check.status!=='passed')throw Error('Unpassed path parser case');for(const id of check.covers||[]){if(id!=='src/editor/pathTextDraft.ts#parsePathText')throw Error('Unexpected path parser operation');const cases=tested.get(id)||[];cases.push({suite:'scripts/verify-v26.22-path-drafts.mjs',report:pathDraftReport,case:check.name});tested.set(id,cases)}}
const paths=execFileSync('rg',['--files','src','-g','*.ts'],{encoding:'utf8'}).trim().split(/\r?\n/).map(path=>path.replaceAll('\\','/')).sort(),operations=[]
for(const path of paths){
 const source=ts.createSourceFile(path,await readFile(path,'utf8'),ts.ScriptTarget.Latest,true),localExports=new Set();
 for(const node of source.statements)if(ts.isExportDeclaration(node)&&!node.moduleSpecifier&&node.exportClause&&ts.isNamedExports(node.exportClause))for(const element of node.exportClause.elements)localExports.add(element.propertyName?.text||element.name.text)
 const exported=node=>node.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword)||node.name&&localExports.has(node.name.getText(source));
 const add=(name,node,kind)=>{const id=path+'#'+name,cases=tested.get(id)||[];operations.push({id,source:path,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,operation:name,kind,disposition:cases.length?'Executed named regression cases; full input-domain coverage is not implied.':'Pending named case or explicit non-authored exclusion',cases})}
 for(const node of source.statements){
  if(ts.isFunctionDeclaration(node)&&node.body&&exported(node))add(node.name?.text||'default',node,'exported function')
  if(ts.isClassDeclaration(node)&&exported(node))for(const member of node.members){if(member.modifiers?.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword||m.kind===ts.SyntaxKind.ProtectedKeyword))continue;if((ts.isMethodDeclaration(member)||ts.isGetAccessorDeclaration(member)||ts.isSetAccessorDeclaration(member)||ts.isConstructorDeclaration(member))&&member.body)add((node.name?.text||'default')+'.'+(ts.isConstructorDeclaration(member)?'constructor':member.name.getText(source)),member,ts.isGetAccessorDeclaration(member)?'getter':ts.isSetAccessorDeclaration(member)?'setter':'public class operation')}
  if(ts.isVariableStatement(node)&&exported(node))for(const item of node.declarationList.declarations){if(item.initializer&&(ts.isArrowFunction(item.initializer)||ts.isFunctionExpression(item.initializer)))add(item.name.getText(source),item,'exported function value');if(item.initializer&&ts.isObjectLiteralExpression(item.initializer))for(const member of item.initializer.properties)if(ts.isMethodDeclaration(member)||ts.isPropertyAssignment(member)&&(ts.isArrowFunction(member.initializer)||ts.isFunctionExpression(member.initializer)))add(item.name.getText(source)+'.'+member.name.getText(source),member,'exported object operation')}
 }
}
const nodeExecutionLinks=await linkNodeOperationCoverage22(operations);
const browserExecutionLinks=await linkBrowserOperationCoverage22(operations);
const explicitExclusions=await linkOperationDispositions22(operations,JSON.parse(await readFile('scripts/fixtures/v26.22-operation-dispositions.json','utf8')));
await mkdir('reports',{recursive:true});await writeFile('reports/v26.22-public-operations.json',JSON.stringify({release:'26.22',development:true,status:'incomplete',generatedAt:new Date().toISOString(),scope:'Implemented exported functions, function values, direct exported-object methods and public exported-class operations across src TypeScript files. Dynamic registrations, re-export aliases and Vue setup handlers require separate owner review. Executed cases link actual named passed regressions; unresolved operations are not a pass.',sourceFiles:paths.length,explicitExclusions,browserExecutionLinks,nodeExecutionLinks,operations},null,2)+'\n');console.log(JSON.stringify({sourceFiles:paths.length,operations:operations.length,withExecutedCases:operations.filter(row=>row.cases.length).length,explicitExclusions,pending:operations.filter(row=>!row.cases.length&&!row.scopeExclusion).length}))
