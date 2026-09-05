import assert from 'node:assert/strict'
import {readFile,readdir,stat,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const root=dirname(dirname(fileURLToPath(import.meta.url))),executions=[]
assert.equal(JSON.parse(await readFile(join(root,'package.json'),'utf8')).version,'26.14.0')
for(const [script,args,reports] of [
 ['verify-v26.14-runtime-stage.mjs',['--native'],['v26.14-runtime-native.json']],
 ['verify-v26.14-runtime-stage.mjs',[],['v26.14-runtime-wasm.json']],
 ['verify-v26.14-native-tests.mjs',[],['v26.14-native-tests.json']],
 ['verify-v26.14-project-roundtrip.mjs',[],['v26.14-project-roundtrip.json']],
 ['verify-v26.14-ownership.mjs',[],['v26.14-ownership.json']],
 ['verify-v26.14-blueprint-handlers.mjs',[],['v26.14-blueprint-handlers.json']],
 ['verify-v26.12-typed-graphs.mjs',[],[]],
 ['verify-v26.13-studio-drafts.mjs',[],['v26.13-studio-drafts.json']],
 ['verify-v26.13-project-departure.mjs',[],['v26.13-project-departure.json']],
 ['generate-v26.14-release-references.mjs',['--verify-only'],[]],
 ['audit-v26.13-panels.mjs',[],['panel-source-inventory.json']],
]){
 const execution=await runAudit(root,'scripts/'+script,args);execution.reports=reports.map(name=>'release-audits/'+name)
 if(script==='verify-v26.14-native-tests.mjs'){
  const directory=join(root,'release-audits/v26.14-native-test-fixtures'),files=[]
  for(const name of(await readdir(directory)).sort()){assert.match(name,/^[a-z0-9-]+\.(rhai|json)$/);const path=join(directory,name),bytes=await readFile(path);assert.ok(bytes.length<1024*1024);assert.ok((await stat(path)).mtimeMs>=execution.startedAt-1000);files.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),text:bytes.toString()})}
  assert.ok(files.length>=20);const path='release-audits/v26.14-native-fixtures.json';await writeFile(join(root,path),JSON.stringify({format:'nova-native-test-fixtures',version:1,release:'26.14',engineVersion:'26.14.0',status:'passed',generatedAt:new Date().toISOString(),files,scope:'Exact inputs and raw actual CLI reports/coverage; expected failed cases remain failed in their raw JSON.'},null,2)+'\n');execution.reports.push(path)
 }
 executions.push(execution)
}
await writeAuditBundle(root,'26.14','focus',executions)
