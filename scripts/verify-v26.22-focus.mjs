// Retained 26.20 regression implementation, executed against actual 26.22 source.
import assert from 'node:assert/strict'
import{dirname,join}from'node:path'
import{fileURLToPath}from'node:url'
import{readFile,readdir}from'node:fs/promises'
import{runAudit,writeAuditBundle}from'./lib/milestoneAuditBundle.mjs'
const root=dirname(dirname(fileURLToPath(import.meta.url))),executions=[];assert.equal(JSON.parse(await readFile(join(root,'package.json'),'utf8')).version,'26.22.0');
// Match both existing packaging validators before running the expensive browser matrix.
let referenceCount=0,currentReferenceCount=0;
for(const entry of await readdir(join(root,'reference-projects/projects'),{withFileTypes:true})){if(!entry.isDirectory())continue;const directory=join(root,'reference-projects/projects',entry.name);let project;try{project=JSON.parse(await readFile(join(directory,'project.nova'),'utf8'))}catch(error){if(error.code==='ENOENT')continue;throw error}const parts=String(project.engineVersion).split('.').map(Number);if(parts[0]>26||parts[0]===26&&(parts[1]>22||parts[1]===22&&parts[2]>0))continue;const text=await readFile(join(directory,'README.md'),'utf8'),engine=/Engine \*\*(\d+\.\d+\.\d+)\*\*/.exec(text);assert.ok(engine,entry.name+' packaged README needs a bold engine authority');assert.match(text,/Project Format 2.*schema 29/,entry.name+' packaged README needs format/schema metadata');assert.equal(engine[1]==='26.22.0',project.engineVersion==='26.22.0',entry.name+' current reference authority');referenceCount++;if(project.engineVersion==='26.22.0')currentReferenceCount++}
assert.equal(currentReferenceCount,6,'All six 26.22 references must satisfy packaging metadata');console.log(JSON.stringify({check:'Both packaging README contracts',status:'passed',references:referenceCount,currentReferences:currentReferenceCount}));
for(const name of ['foundations','transactions','delivery','lsp','save-recovery','reproducibility']){const run=await runAudit(root,'scripts/verify-v26.22-'+name+'.mjs');run.reports=['release-audits/v26.22-'+(name==='foundations'?'foundations-regressions':name==='transactions'?'transactions-bundle':name)+'.json'];executions.push(run)}
for(const [script,args,reports] of [
 ['audit-v26.22-reference-imports.mjs',[],['v26.22-reference-imports.json']],
 ['verify-v26.14-runtime-stage.mjs',['--native'],['v26.14-runtime-native.json']],
 ['verify-v26.14-runtime-stage.mjs',[],['v26.14-runtime-wasm.json']],
 ['verify-v26.14-project-roundtrip.mjs',[],['v26.14-project-roundtrip.json']],
 ['verify-v26.12-typed-graphs.mjs',[],[]],
 ['verify-v26.12-language.mjs',['--report=release-audits/v26.22-language.json'],['v26.22-language.json']],
 ['verify-v26.12-api-signatures.mjs',['--report=release-audits/v26.22-api-signatures.json'],['v26.22-api-signatures.json']],
 ['verify-v26.12-syntax-slots.mjs',[],['v26.12-syntax-slots.json']],
 ['verify-v26.12-script-modules.mjs',[],['v26.12-script-modules.json']],
 ['verify-v26.11-templates.mjs',[],['v26.11-template-behavior.json']],
 ...['references','teaching','template-walkthroughs'].map(name=>['generate-v26.22-'+name+'.mjs',['--verify-only'],[]]),
 ['audit-v26.13-panels.mjs',[],['panel-source-inventory.json']]
]){const run=await runAudit(root,'scripts/'+script,args);run.reports=reports.map(name=>'release-audits/'+name);executions.push(run)}
for(const [version,names] of [['26.16',['animation-audio','animation-authoring','animation-ui','audio-pcm','interface','media-roundtrip','timeline-actions','media-performance']],['26.17',['queries','navigation','world-streaming','bindings','world-roundtrip']],['26.18',['networking','network-process']]])for(const name of names){const run=await runAudit(root,'scripts/verify-v'+version+'-'+name+'.mjs',['--qualification-release=26.22']);run.reports=['release-audits/v26.22-'+name+'.json'];executions.push(run)}
const renderer=await runAudit(root,'scripts/verify-v26.22-renderer.mjs',['--qualification','--report-dir=release-audits/v26.22-renderer']);renderer.reports=['release-audits/v26.22-renderer/renderer-staged.json'];executions.push(renderer)
const templates=await runAudit(root,'scripts/verify-v26.22-template-output.mjs');templates.reports=['release-audits/v26.22-template-output.json'];executions.push(templates)
await writeAuditBundle(root,'26.22','focus',executions);
