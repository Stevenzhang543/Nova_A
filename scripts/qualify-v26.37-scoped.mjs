/** Execute only linked UI/motion/data/delivery risks, retaining fresh raw reports. */
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {runAudit,writeAuditBundle} from './lib/milestoneAuditBundle.mjs'
const gate=process.argv.find(a=>a.startsWith('--gate='))?.slice(7),root=process.cwd(),release='26.37',engineVersion=JSON.parse(await readFile('package.json','utf8')).version
assert.equal(engineVersion,release+'.0')
const target=['--qualification-release=26.37'],selections={
 focus:[['scripts/verify-ci-environment.mjs',[],'v26.37-ci-environment'],['scripts/verify-v26.36-branding-assets.mjs',target,'v26.37-branding-assets'],['scripts/verify-v26.34-native-headless.mjs',target,'v26.37-native-headless']],
 'motion-logic':[['scripts/verify-v26.37-motion.mjs',[],'v26.37-motion-unit']],
 'browser-layout':[['scripts/verify-ui-rebuild-layout-user.mjs',[...target,'--final'],'v26.37-ui-rebuild-layout-final'],['scripts/verify-ui-rebuild-navigation-user.mjs',target,'v26.37-ui-rebuild-navigation']],
 'user-interactions':[['scripts/verify-v26.34-authoring-user.mjs',target,'v26.37-authoring-user'],['scripts/verify-v26.34-input-user.mjs',target,'v26.37-input-user'],['scripts/verify-v26.34-reference-game.mjs',target,'v26.37-reference-game'],['scripts/verify-v26.34-static-host-user.mjs',target,'v26.37-static-host-user']],
 performance:[['scripts/verify-v26.37-comfortable-user.mjs',target,'v26.37-comfortable-user'],['scripts/verify-v26.37-native-disclosures-user.mjs',target,'v26.37-native-disclosures-user'],['scripts/verify-v26.37-select-tooltip-user.mjs',target,'v26.37-select-tooltip-user']]
}
if(selections[gate]){const runs=[];for(const[s,args,report]of selections[gate]){const execution=await runAudit(root,s,args);execution.reports=['release-audits/'+report+'.json'];runs.push(execution)}await writeAuditBundle(root,release,gate,runs)}
else if(gate==='product'){const reports=[];for(const name of ['focus-bundle','motion-logic-bundle','browser-layout-bundle','user-interactions-bundle','performance-bundle','verification','native-build','wasm','web','windows-smoke','headless-smoke','manual-audit']){const path='release-audits/v'+release+'-'+name+'.json',report=JSON.parse(await readFile(path,'utf8'));assert.equal(report.status,'passed',path);assert.equal(report.engineVersion,engineVersion,path);reports.push({path,status:report.status,generatedAt:report.generatedAt})}await writeFile('release-audits/v'+release+'-product-audit.json',JSON.stringify({format:'nova-release-product-audit',version:1,release,engineVersion,generatedAt:new Date().toISOString(),status:'passed',reports,globalDefectCount:null,externalCertificationComplete:false,scope:'Source-bound comfortable UI, production finite motion and retained actual authoring/navigation/input/export/native identity delivery. Physical GPU/OS latency, signing and clean installation are not certified.'})+'\n')}
else throw Error('Unknown linked gate: '+gate)
