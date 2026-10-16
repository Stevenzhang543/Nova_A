/** Complete source inverse and extra plain-record contracts. Does not build the Editor/Player. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { build } from 'vite'
import { validateRuntimeCatalogMigration } from './lib/runtimeCatalogContract.mjs'
const root=dirname(dirname(fileURLToPath(import.meta.url))),cache=join(root,'.cache/engine-overhaul/runtime-catalog'),output=await mkdtemp(join(cache,'contract-')),sha=x=>createHash('sha256').update(x).digest('hex')
const checks=[],sourceBefore={};let api
for(const file of ['src/runtime/runtimeAssetValues.ts','src/runtime/runtimeProjectCatalog.ts','src/assets/AssetDatabase.ts','src/assets/assetReferences.ts','src/runtime/resources.ts','src/editor/gameplayScriptServices.ts'])sourceBefore[file]=sha(await readFile(join(root,file)))
const run=async(id,operation)=>{try{checks.push({id,status:'PASSED',value:await operation()})}catch(error){checks.push({id,status:'FAILED',error:error.stack??String(error)})}}
await run('G01-exact-four-file-inverse-95-bodies-seven-shared-algorithms-one-allowlist',()=>validateRuntimeCatalogMigration())
await run('G02-unreviewed-body-and-new-Editor-type-import-negative-guards',async()=>{const old='src/assets/AssetDatabase.ts',fresh='src/runtime/runtimeAssetValues.ts',oldText=await readFile(join(root,old),'utf8'),newText=await readFile(join(root,fresh),'utf8');assert.throws(()=>validateRuntimeCatalogMigration({sources:{[old]:oldText.replace('Math.min(1_000_000_000','Math.min(9_999_999_999')}}));assert.throws(()=>validateRuntimeCatalogMigration({sources:{[fresh]:"import type { AssetRecord } from '../assets/AssetDatabase'\n"+newText}}));assert.throws(()=>validateRuntimeCatalogMigration({sources:{[fresh]:newText.replace("{ fatal: true }","{ fatal: false }")}}));return{rejected:3}})
await run('G03-plain-clone-additional-supported-and-rejected-inputs',async()=>{
  const normalize=value=>value.replaceAll('\\','/'),entry=join(output,'pure-entry.ts'),pure=join(output,'pure'),loaded={}
  await writeFile(entry,`export * from '${normalize(join(root,'src/runtime/runtimeProjectCatalog.ts'))}';`,{flag:'wx'})
  await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},plugins:[{name:'runtime-catalog-extra-final-source',enforce:'pre',async load(id){const file=normalize(id.split('?')[0]);if(!file.startsWith(normalize(root)+'/src/'))return;const key=file.slice(normalize(root).length+1);assert(['src/runtime/runtimeProjectCatalog.ts','src/runtime/runtimeAssetValues.ts','src/assets/contentHash.ts'].includes(key),`Unreviewed pure runtime import ${key}`);const bytes=await readFile(file);loaded[key]=sha(bytes);return bytes.toString('utf8')}}],build:{ssr:true,outDir:pure,emptyOutDir:false,rollupOptions:{input:entry,output:{entryFileNames:'pure.mjs',inlineDynamicImports:true}}}})
  const pureBundle=join(pure,'pure.mjs');api=await import(pathToFileURL(pureBundle).href)
  const item={uuid:'x',name:'plain',path:'Assets/plain',assetType:'script',mimeType:'text/plain',source:'source'},construct=extra=>new api.RuntimeProjectCatalog([{...item,extra}],{projectId:'plain',revision:0})
  const plain=Object.create(null);plain['__proto__']='own-data';plain.value=-0;plain.optional=undefined
  const owner=construct(plain),cloned=owner.resolveAsset('x').extra;assert.equal(Object.getPrototypeOf(cloned),null);assert.equal(cloned['__proto__'],'own-data');assert(Object.is(cloned.value,-0));assert.equal(cloned.optional,undefined);assert(Object.isFrozen(cloned))
  const cycle={};cycle.self=cycle;const sparse=Array(2),symbol={[Symbol('key')]:1},hidden={};Object.defineProperty(hidden,'key',{value:1});class PlainClass{value=1}class ArrayClass extends Array{}
  const cases=[['cycle',cycle],['sparse',sparse],['symbol',symbol],['hidden',hidden],['class',new PlainClass()],['buffer',new ArrayBuffer(4)],['bigint',1n],['array-subclass',new ArrayClass(1,2)]]
  for(const[name,input]of cases)assert.throws(()=>construct(input),/RUNTIME_CATALOG_RECORD_INVALID/,name)
  return{supportedNullPrototype:true,unsupported:cases.map(([name])=>name),loaded,bundleSha256:sha(await readFile(pureBundle)),scope:'Explicit Node SSR pure compilation only, not formal emitted Editor/Player catalog.'}
})
const sourceChanges=[];for(const[file,hash]of Object.entries(sourceBefore))if(sha(await readFile(join(root,file)))!==hash)sourceChanges.push(file)
const report={schema:'nova-runtime-catalog-source-contract-v1',generatedAt:new Date().toISOString(),status:checks.every(check=>check.status==='PASSED')&&!sourceChanges.length?'PASSED':'FAILED',checks,sourceHashes:sourceBefore,sourceChanges,scope:{formalProductionBundle:'NOT_TESTED',immutableCatalog:'IMPLEMENTED; VERIFIED_NODE_ONLY; no formal production caller',pureCompilation:'Only the explicit scoped SSR entry in prior actual after report'},driverSha256:sha(await readFile(fileURLToPath(import.meta.url)))}
await writeFile(join(output,'report.json'),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({status:report.status,checks:checks.length,passed:checks.filter(item=>item.status==='PASSED').length,sourceChanges,report:join(output,'report.json')}));if(report.status==='FAILED')process.exitCode=1
