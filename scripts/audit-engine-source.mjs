/** Reproducible Phase II source map. Declarations and imports are not proof of working features. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {execFileSync} from 'node:child_process'
import ts from 'typescript'
const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{encoding:'utf8'}).trim().split(/\r?\n/).sort()
const owned=paths.filter(p=>/^(src\/|crates\/|nova_core\/src\/|src-tauri\/src\/)/.test(p)&&/\.(ts|vue|rs|css)$/.test(p))
const files=owned.map(file=>{
 const source=fs.readFileSync(file,'utf8'),imports=[],symbols=[]
 if(/\.(ts|vue)$/.test(file)){
  const script=file.endsWith('.vue')?[...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'):source
  const ast=ts.createSourceFile(file,script,ts.ScriptTarget.Latest,true)
  for(const n of ast.statements){
   if(ts.isImportDeclaration(n)&&ts.isStringLiteral(n.moduleSpecifier))imports.push(n.moduleSpecifier.text)
   if(ts.isVariableStatement(n))for(const declaration of n.declarationList.declarations)if(ts.isIdentifier(declaration.name))symbols.push({name:declaration.name.text,kind:'VariableDeclaration',exported:!!n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)})
   if(n.name&&ts.isIdentifier(n.name))symbols.push({name:n.name.text,kind:ts.SyntaxKind[n.kind],exported:!!n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)})
  }
 }else if(file.endsWith('.rs')){
  for(const m of source.matchAll(/^\s*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(fn|struct|enum|trait|mod)\s+(\w+)/gm))symbols.push({name:m[2],kind:m[1]})
 }
 return {file,sha256:crypto.createHash('sha256').update(source).digest('hex'),lines:source.split('\n').length,imports,symbols}
})
const tests=paths.filter(p=>/^scripts\/(verify|audit|qualify|benchmark|test)[^/]*\.mjs$/.test(p)).map(file=>{
 const source=fs.readFileSync(file,'utf8')
 return{file,sourceReferences:[...new Set([...source.matchAll(/(?:src|crates|nova_core)\/[A-Za-z0-9_./-]+\.(?:ts|vue|rs)/g)].map(m=>m[0]))],usesBrowser:/withBrowserAudit|startBrowser|launchBrowser|connectToBrowser/.test(source)}
})
const root='docs/engine';fs.mkdirSync(root,{recursive:true})
const output={format:'nova-engine-source-inventory',version:1,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Owned implementation source, excluding generated WASM, vendored Godot, dependencies, build products and historical release copies. Static declarations are discovery evidence only.',fileCount:files.length,lines:files.reduce((n,f)=>n+f.lines,0),files,tests}
fs.writeFileSync(path.join(root,'SOURCE_INVENTORY.json'),JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({files:output.fileCount,lines:output.lines,testEntrypoints:tests.length,commit:output.commit}))
