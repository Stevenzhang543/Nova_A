/** 功能回归脚本：执行 verify-v26.20-focus.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import{dirname,join}from'node:path'
import{fileURLToPath}from'node:url'
import{readFile,readdir}from'node:fs/promises'
import{runAudit,writeAuditBundle}from'./lib/milestoneAuditBundle.mjs'
const root=dirname(dirname(fileURLToPath(import.meta.url))),executions=[];assert.equal(JSON.parse(await readFile(join(root,'package.json'),'utf8')).version,'26.20.0');
// Match both existing packaging validators before running the expensive browser matrix.
let referenceCount=0,currentReferenceCount=0;
for(const entry of await readdir(join(root,'reference-projects/projects'),{withFileTypes:true})){if(!entry.isDirectory())continue;const directory=join(root,'reference-projects/projects',entry.name);let project;try{project=JSON.parse(await readFile(join(directory,'project.nova'),'utf8'))}catch(error){if(error.code==='ENOENT')continue;throw error}const parts=String(project.engineVersion).split('.').map(Number);if(parts[0]>26||parts[0]===26&&(parts[1]>20||parts[1]===20&&parts[2]>0))continue;const text=await readFile(join(directory,'README.md'),'utf8'),engine=/Engine \*\*(\d+\.\d+\.\d+)\*\*/.exec(text);assert.ok(engine,entry.name+' packaged README needs a bold engine authority');assert.match(text,/Project Format 2.*schema 29/,entry.name+' packaged README needs format/schema metadata');assert.equal(engine[1]==='26.20.0',project.engineVersion==='26.20.0',entry.name+' current reference authority');referenceCount++;if(project.engineVersion==='26.20.0')currentReferenceCount++}
assert.equal(currentReferenceCount,6,'All six20 references must satisfy packaging metadata');console.log(JSON.stringify({check:'Both packaging README contracts',status:'passed',references:referenceCount,currentReferences:currentReferenceCount}));
for(const name of ['delivery','lsp','save-recovery','reproducibility']){const run=await runAudit(root,'scripts/verify-v26.20-'+name+'.mjs');run.reports=['release-audits/v26.20-'+name+'.json'];executions.push(run)}
for(const [script,args,reports] of [
 ['verify-v26.14-runtime-stage.mjs',['--native'],['v26.14-runtime-native.json']],
 ['verify-v26.14-runtime-stage.mjs',[],['v26.14-runtime-wasm.json']],
 ['verify-v26.14-project-roundtrip.mjs',[],['v26.14-project-roundtrip.json']],
 ['verify-v26.12-typed-graphs.mjs',[],[]],
 ['verify-v26.12-language.mjs',['--report=release-audits/v26.20-language.json'],['v26.20-language.json']],
 ['verify-v26.12-api-signatures.mjs',['--report=release-audits/v26.20-api-signatures.json'],['v26.20-api-signatures.json']],
 ['verify-v26.12-syntax-slots.mjs',[],['v26.12-syntax-slots.json']],
 ['verify-v26.12-script-modules.mjs',[],['v26.12-script-modules.json']],
 ['verify-v26.11-templates.mjs',[],['v26.11-template-behavior.json']],
 ...['references','teaching','template-walkthroughs'].map(/* 返回按声明顺序构造的数组 ['generate-v26.20-'+name+'.mjs',['--verify-only'],[]]。 */ name=>['generate-v26.20-'+name+'.mjs',['--verify-only'],[]]),
 ['audit-v26.13-panels.mjs',[],['panel-source-inventory.json']]
]){const run=await runAudit(root,'scripts/'+script,args);run.reports=reports.map(/* 计算表达式 'release-audits/'+name 并返回结果，沿用操作数的原有类型规则。 */ name=>'release-audits/'+name);executions.push(run)}
for(const [version,names] of [['26.16',['animation-audio','animation-authoring','animation-ui','audio-pcm','interface','media-roundtrip','timeline-actions','media-performance']],['26.17',['queries','navigation','world-streaming','bindings','world-roundtrip']],['26.18',['networking','network-process']]])for(const name of names){const run=await runAudit(root,'scripts/verify-v'+version+'-'+name+'.mjs',['--qualification-release=26.20']);run.reports=['release-audits/v26.20-'+name+'.json'];executions.push(run)}
const renderer=await runAudit(root,'scripts/verify-v26.20-renderer.mjs',['--qualification','--report-dir=release-audits/v26.20-renderer']);renderer.reports=['release-audits/v26.20-renderer/renderer-staged.json'];executions.push(renderer)
const templates=await runAudit(root,'scripts/verify-v26.20-template-output.mjs');templates.reports=['release-audits/v26.20-template-output.json'];executions.push(templates)
await writeAuditBundle(root,'26.20','focus',executions);
