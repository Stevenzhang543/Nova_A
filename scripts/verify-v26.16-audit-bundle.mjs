import assert from 'node:assert/strict'
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises'
import {join,dirname} from 'node:path'
import {resolveMilestoneAuditContext} from './lib/milestoneAuditContext.mjs'
import {writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const context=resolveMilestoneAuditContext(import.meta.url,{release:'26.16',reportName:'audit-bundle'}),fixture=await mkdtemp(join(context.repository,'.cache/bundle-context-')),checks=[]
await mkdir(join(fixture,'release-audits'));await writeFile(join(fixture,'package.json'),JSON.stringify({version:'26.16.0'}))
const startedAt=Date.now(),path='release-audits/input.json',execution={startedAt,completedAt:startedAt,reports:[path]},base={status:'passed',generatedAt:new Date().toISOString(),release:'26.16',engineVersion:'26.16.0',buildEngineVersion:'26.16.0',expectedRelease:'26.16',qualificationTarget:'26.16',qualifiedRelease:null,development:false,sourceRoots:['.'],buildRoot:'.',baselineVersion:null,overlayVersion:null}
async function check(name,run){try{await run();checks.push({name,status:'passed'})}catch(error){checks.push({name,status:'failed',error:error.stack})}}
async function bundle(report){await writeFile(join(fixture,path),JSON.stringify(report));return writeAuditBundle(fixture,'26.16','test',[execution])}
await check('Actual integrated report identity is retained without declaring the entire release qualified',async()=>{const result=await bundle(base);assert.equal(result.reports[0].report.qualifiedRelease,null);assert.equal(result.reports[0].report.qualificationTarget,'26.16')})
for(const[key,value]of[['development',true],['qualificationTarget','26.15'],['release','26.15'],['expectedRelease','26.15'],['engineVersion','26.15.0'],['buildEngineVersion','26.15.0'],['qualifiedRelease','26.16'],['sourceRoots',['.cache/development-v26.16']],['buildRoot','.cache/preview'],['baselineVersion','26.15.0'],['overlayVersion','26.16.0']])await check('Refuse changed '+key,()=>assert.rejects(()=>bundle({...base,[key]:value})))
await check('Refuse stale completed raw report',()=>assert.rejects(()=>bundle({...base,generatedAt:'2000-01-01T00:00:00Z'})))
await check('Retain legacy exact-release metadata checks',async()=>{const legacy={...base,qualifiedRelease:'26.16'};delete legacy.qualificationTarget;await bundle(legacy);await assert.rejects(()=>bundle({...legacy,qualifiedRelease:null}))})
const report={...context.metadata(),status:checks.every(v=>v.status==='passed')?'passed':'failed',checks,scope:'Explicit fixture-only audit metadata boundary checks, without game/runtime qualification claims.'};await mkdir(dirname(context.reportPath),{recursive:true});await writeFile(context.reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:checks.length,failed:checks.filter(v=>v.status==='failed')}));if(report.status!=='passed')process.exitCode=1
