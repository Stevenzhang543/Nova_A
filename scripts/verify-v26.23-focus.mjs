import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import {join} from 'node:path'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const root=process.cwd(),executions=[];assert.equal(JSON.parse(await readFile('package.json','utf8')).version,'26.23.0')
let current=0;for(const entry of await readdir('reference-projects/projects',{withFileTypes:true})){if(!entry.isDirectory())continue;const dir=join('reference-projects/projects',entry.name);let project;try{project=JSON.parse(await readFile(join(dir,'project.nova'),'utf8'))}catch(error){if(error.code==='ENOENT')continue;throw error}if(project.engineVersion!=='26.23.0')continue;const text=await readFile(join(dir,'README.md'),'utf8');assert.match(text,/Engine \*\*26\.23\.0\*\*/);assert.match(text,/Project Format 2.*schema 29/);const expected=JSON.parse(await readFile(join(dir,'expected-output.json'),'utf8')),controls=JSON.parse(await readFile(join(dir,'test-controls.json'),'utf8'));assert.equal(expected.projectFormat,2);assert.equal(expected.schema,29);assert.equal(expected.reference,entry.name);assert.ok(expected.authoring);assert.equal(controls.authoring,expected.authoring);assert.ok(controls.classification.length&&controls.actions.length);current++}assert.equal(current,7)
const tasks=[
 ['verify-v26.23-renderer.mjs',['--qualification','--report-dir=release-audits/v26.23-renderer'],['v26.23-renderer/renderer-staged.json']],['verify-v26.23-template-output.mjs',[],['v26.23-template-output.json']],
 ['verify-v26.23-language.mjs',[],['v26.23-language.json']],['verify-v26.23-runtime-regressions.mjs',[],['v26.23-runtime-regressions.json']],
 ...['delivery','lsp','save-recovery','reproducibility'].map(name=>['verify-v26.23-'+name+'.mjs',[],['v26.23-'+name+'.json']]),
 ['verify-v26.22-foundations.mjs',['--qualification-release=26.23'],['v26.23-foundations-regressions.json']],
 ['verify-v26.14-runtime-stage.mjs',['--native'],['v26.14-runtime-native.json']],['verify-v26.14-runtime-stage.mjs',[],['v26.14-runtime-wasm.json']],['verify-v26.14-project-roundtrip.mjs',[],['v26.14-project-roundtrip.json']],
 ...['typed-graphs','syntax-slots','script-modules'].map(name=>['verify-v26.12-'+name+'.mjs',['--qualification-release=26.23'],['v26.12-'+name+'.json']]),
 ['verify-v26.12-language.mjs',['--qualification-release=26.23','--report=release-audits/v26.23-legacy-language.json'],['v26.23-legacy-language.json']],['verify-v26.12-api-signatures.mjs',['--qualification-release=26.23','--report=release-audits/v26.23-api-signatures.json'],['v26.23-api-signatures.json']],
 ...['references','inventory-reference','teaching'].map(name=>['generate-v26.23-'+name+'.mjs',['--verify-only'],[]]),
 ['verify-v26.11-templates.mjs',[],['v26.11-template-behavior.json']],['audit-v26.13-panels.mjs',[],['panel-source-inventory.json']]
]
for(const [version,names] of [['26.16',['animation-audio','animation-authoring','animation-ui','audio-pcm','interface','media-roundtrip','timeline-actions','media-performance']],['26.17',['queries','navigation','world-streaming','bindings','world-roundtrip']],['26.18',['networking','network-process']]])for(const name of names)tasks.push(['verify-v'+version+'-'+name+'.mjs',['--qualification-release=26.23'],['v26.23-'+name+'.json']])
for(const name of ['history-core','pending-drafts','control-order','numeric-expressions','entity-api','script-assets-corpus','package-lifecycle','tilemap-bake','component-history','media-history'])tasks.push(['verify-v26.22-'+name+'.mjs',['--qualification-release=26.23'],['v26.23-'+name+'.json']])
for(const [script,args,reports]of tasks){const run=await runAudit(root,'scripts/'+script,args);run.reports=reports.map(name=>'release-audits/'+name);executions.push(run)}
await writeAuditBundle(root,'26.23','focus',executions)
