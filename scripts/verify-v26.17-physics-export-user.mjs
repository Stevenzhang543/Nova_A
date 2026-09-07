import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {join,dirname} from 'node:path'
import {resolveMilestoneAuditContext,runMilestoneBrowserAudit} from './lib/milestoneAuditContext.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
import {exportWorldUser17,runWorldPlayer17} from './lib/worldExportAudit17.mjs'
const context=resolveMilestoneAuditContext(import.meta.url,{release:'26.17',reportName:'physics-export-user'}),workflow=process.argv.find(v=>v.startsWith('--workflow='))?.slice(11),reports=[];assert.ok(!workflow||context.development,'Partial workflow selection is development only');
for(const [slug,file]of[['platformer','platformer-material-authored'],['navigation','navigation-authored'],['puzzle','puzzle-authored']])if(!workflow||workflow===slug)for(const phase of['download','player']){
 const name='physics-export-'+slug+'-'+phase+'-user',phaseContext=resolveMilestoneAuditContext(import.meta.url,{release:'26.17',reportName:name,argv:process.argv.slice(2).filter(v=>!v.startsWith('--report='))});
 await runMilestoneBrowserAudit(phaseContext,{name,width:1440,height:900},async a=>{const path=join(a.evidence,'v26.17-'+file+'.nova'),document=JSON.parse(await readFile(path,'utf8'));await a.check(phase==='download'?'Download and independently verify the exact edited '+slug+' player':'Run the exact downloaded '+slug+' in a fresh browser process',async()=>{if(phase==='download'){const u=worldUserControls17(a);await u.open(path);await exportWorldUser17(a,u,slug,{document})}else await runWorldPlayer17(a,slug,{document})})});
 reports.push(JSON.parse(await readFile(phaseContext.reportPath,'utf8')));
}
await mkdir(dirname(context.reportPath),{recursive:true});await writeFile(context.reportPath,JSON.stringify({...context.metadata(),status:'passed',checks:reports.flatMap(r=>r.checks),observations:reports.flatMap(r=>r.observations),captures:reports.flatMap(r=>r.captures),phases:reports.map(r=>({format:r.format,generatedAt:r.generatedAt,status:r.status,browser:r.browser})),scope:'Each actual UI download and each exact downloaded player use their own fresh Edge process. All authored scene data, package/file hashes and public coordinate readouts are checked; physical hardware and same-process post-export navigation remain separately unqualified.'},null,2)+'\n');
