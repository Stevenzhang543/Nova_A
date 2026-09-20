import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {withBrowserAudit} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const development=process.argv.includes('--development');
await withBrowserAudit({release:'26.22',name:'playback-stability-user',development,expectedRelease:JSON.parse(await readFile('package.json','utf8')).version.split('.').slice(0,2).join('.'),width:1366,height:900},async a=>{
 const u=worldUserControls17(a);await u.open(join(process.cwd(),'reference-projects/projects/creator-v2622-code-game/project.nova'));await u.workspace('Design');await u.entity('Player');const before=await u.save('playback-stability-before-22');
 await a.client.send('Performance.enable');const measurements=[];
 await a.check('Fifty actual Play Pause Stop cycles preserve the authored project',async()=>{
  for(let cycle=1;cycle<=50;cycle++){
   await u.activate('.actionbar>button:first-child');await a.until("!!document.querySelector('.config-panel.runtime')");await u.activate('.actionbar>button:nth-child(2)');await a.until("!!document.querySelector('.actionbar>button:nth-child(2).active')");await u.activate('.actionbar>button:nth-child(4)');await a.until("!!document.querySelector('.config-panel:not(.runtime)')");
   if(cycle%10===0){const state=await u.save('playback-stability-cycle-'+cycle+'-22');assert.deepEqual(state.document,before.document,'Authored project changed after cycle '+cycle);const metrics=await a.client.send('Performance.getMetrics');measurements.push({cycle,metrics:metrics.metrics.filter(x=>['JSHeapUsedSize','JSHeapTotalSize','Nodes','Documents','JSEventListeners'].includes(x.name))});console.log('CYCLE '+cycle)}
  }
  a.observations.push({name:'actual-editor-playback-smoke',cycles:50,measurements,performanceQualified:false,longDurationQualified:false});await a.capture('playback-stopped');
 });
 await a.check('Reopened project remains unchanged and playback controls still work after the cycle batch',async()=>{const saved=await u.save('playback-stability-final-22');await u.open(saved.file);await u.workspace('Design');await u.entity('Player');const reopened=await u.save('playback-stability-reopened-22');assert.deepEqual(reopened.document,before.document);await u.activate('.actionbar>button:first-child');await a.until("!!document.querySelector('.config-panel.runtime')");await u.activate('.actionbar>button:nth-child(4)');await a.until("!!document.querySelector('.config-panel:not(.runtime)')");await a.capture('playback-reopened')});
})
