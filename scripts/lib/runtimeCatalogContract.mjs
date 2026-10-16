/** Exact six-file resource catalog migration. Existing file inverses compose with Root-owned proofs. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import ts from 'typescript'
const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const fixture = JSON.parse(readFileSync(join(root,'scripts/fixtures/runtime-catalog-transform-v1.json'),'utf8'))
const sha = value => createHash('sha256').update(value).digest('hex'), norm = value => value.replaceAll('\\','/')
const exact = (source,from,to,label) => { assert.equal(source.split(from).length-1,1,`${label}: exact unique anchor`); return source.replace(from,to) }
function canonicalExisting(file,source) {
  const record=fixture.existingWholeFiles.find(item=>item.path===file);assert(record,`Unreviewed old file ${file}`);assert.equal(sha(source),record.afterSha256,`${file}: frozen approved after source`)
  for(const step of fixture.steps.filter(item=>item.path===file).reverse())source=exact(source,step.to,step.from,`${file}:${step.name}`)
  assert.equal(sha(source),record.sha256,`${file}: full exact uniform95da inverse`);return source
}
export const canonicalAssetDatabaseBeforeRuntimeCatalog = source => canonicalExisting('src/assets/AssetDatabase.ts',source)
export const canonicalAssetReferencesBeforeRuntimeCatalog = source => canonicalExisting('src/assets/assetReferences.ts',source)
export const canonicalRuntimeResourcesBeforeRuntimeCatalog = source => canonicalExisting('src/runtime/resources.ts',source)
export const canonicalEditorScriptServicesBeforeRuntimeCatalog = source => canonicalExisting('src/editor/gameplayScriptServices.ts',source)
const sourceFile=(file,text)=>ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
const functions=(file,text)=>{const source=sourceFile(file,text);return source.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name&&node.body).map(node=>({name:node.name.text,body:node.body.getText(source)}))}
function imports(file,text){const source=sourceFile(file,text),edges=[];const walk=node=>{
  if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier))edges.push({reference:node.moduleSpecifier.text,typeOnly:!!node.importClause?.isTypeOnly||!!node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.every(part=>part.isTypeOnly)})
  if(ts.isExportDeclaration(node)&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))edges.push({reference:node.moduleSpecifier.text,typeOnly:!!node.isTypeOnly})
  if(ts.isImportTypeNode(node)&&ts.isLiteralTypeNode(node.argument)&&ts.isStringLiteral(node.argument.literal))edges.push({reference:node.argument.literal.text,typeOnly:true})
  if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&ts.isStringLiteral(node.arguments[0]))edges.push({reference:node.arguments[0].text,typeOnly:false})
  ts.forEachChild(node,walk)
};walk(source);return edges}
export function validateRuntimeCatalogMigration(options={}) {
  const overrides=options.sources??{},get=file=>overrides[file]??readFileSync(join(root,file),'utf8'),oldFiles=[]
  let totalBodies=0,changedBodies=0
  for(const record of fixture.existingWholeFiles){const actual=get(record.path),before=canonicalExisting(record.path,actual),original=functions(record.path,before),after=functions(record.path,actual);assert.equal(after.length,original.length,`${record.path}: original top-level function count`)
    for(const item of original){const known=fixture.originalBodyInventory.find(value=>value.path===record.path&&value.name===item.name);assert(known);assert.equal(sha(item.body),known.originalBodySha256);const target=after.find(value=>value.name===item.name);assert(target);if(known.expectedChanged)changedBodies++;else assert.equal(target.body,item.body,`${record.path}:${item.name}: untouched full body`);totalBodies++}
    oldFiles.push({path:record.path,afterSha256:sha(actual),inverseSha256:sha(before)})
  }
  for(const file of fixture.newWholeFiles)assert.equal(sha(get(file.path)),file.sha256,`${file.path}: approved new complete implementation`)
  const values=get('src/runtime/runtimeAssetValues.ts'),pureFunctions=functions('src/runtime/runtimeAssetValues.ts',values)
  for(const proof of fixture.algorithmProof){const actual=pureFunctions.find(item=>item.name===proof.name);assert(actual,proof.name);assert.equal(actual.body,proof.expectedBody,`${proof.name}: original or explicit mechanical full body`);assert.equal(sha(actual.body),proof.originalOrMappedBodySha256)}
  const all6=fixture.existingWholeFiles.concat(fixture.newWholeFiles).map(item=>get(item.path)),allowlistCount=all6.reduce((count,text)=>count+text.split(fixture.originalAllowlist).length-1,0);assert.equal(allowlistCount,1,'Exactly one shared original read/write text allowlist literal')
  assert.equal(values.split('export const ASSET_REFERENCE_LIMITS = Object.freeze(').length-1,1,'Unique shared original dependency byte-limit object');assert(!get('src/assets/assetReferences.ts').includes('textBytes: 16 * 1024 * 1024'),'No second dependency text limit')
  const expected=new Map(fixture.typeClosure.files.map(item=>[item.path,item])),seen=new Set(),queue=['src/runtime/runtimeAssetValues.ts','src/runtime/runtimeProjectCatalog.ts'],edges=[]
  while(queue.length){const file=queue.shift();if(seen.has(file))continue;seen.add(file);assert(expected.has(file),`Pure full source closure is not approved: ${file}`);const text=get(file);assert.equal(sha(text),expected.get(file).sha256,`${file}: frozen complete type/runtime closure`)
    for(const edge of imports(file,text)){assert(edge.reference.startsWith('.'),`${file}: no unreviewed external capability dependency`);const base=norm(relative(root,resolve(dirname(join(root,file)),edge.reference))),target=[base,`${base}.ts`,`${base}.tsx`,`${base}/index.ts`].find(candidate=>expected.has(candidate));assert(target,`${file} -> ${edge.reference}: full closure target`);assert(!/^src\/(editor|store|renderer)\/|AssetDatabase|contentInteroperability|importRetention/.test(target),`${target}: forbidden runtime/type dependency`);edges.push({from:file,...edge,target});queue.push(target)}
  }
  assert.equal(seen.size,fixture.typeClosure.files.length,'No missing full type source dependency')
  return {status:'PASSED',oldFiles,newFiles:fixture.newWholeFiles,totalOriginalBodies:totalBodies,changedBodyWhitelist:changedBodies,untouchedFullBodies:totalBodies-changedBodies,sharedOriginalAlgorithms:fixture.algorithmProof.length,uniqueAllowlistCount:allowlistCount,typeClosure:[...seen],runtimeClosure:fixture.runtimeClosure.files.map(item=>item.path),scope:fixture.scope,edges}
}
