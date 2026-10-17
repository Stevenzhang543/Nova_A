/** Inspect offscreen selected-clip properties and diagnostic wrapping through real controls. */
import assert from 'node:assert/strict'
import {join} from 'node:path'
import {withBrowserAudit} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
await withBrowserAudit({release:'26.32',qualifyRelease:false,name:'ui-rebuild-timeline-details',width:1366,height:768},async a=>{
 const u=worldUserControls17(a)
 await u.open(join(process.cwd(),'reference-projects/projects/cinematic-v56-nested-subtitles/project.nova'))
 await u.workspace('Animation');await u.bottom('animation','Animation');await u.activate('[data-panel-maximize="bottom"]')
 const id=await a.evaluate("[...document.querySelectorAll('.asset-select option')].find(e=>e.textContent.endsWith('.nova-timeline')).value")
 await a.select('.asset-select',id);await u.activate('.sequence-lane button')
 await a.check('Selected clip properties and diagnostics fit the inspector without horizontal overflow',async()=>{
  for(const [label,selector] of [['clip-properties','.timeline-inspector>.ui-property-row:last-of-type'],['diagnostics','.timeline-diagnostics']]){
   await a.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'end'})`)
   const geometry=await a.evaluate("(()=>{const e=document.querySelector('.timeline-inspector');return{width:e.clientWidth,scroll:e.scrollWidth,rows:e.querySelectorAll('.ui-property-row').length}})()")
   assert.ok(geometry.rows>=12);assert.ok(geometry.scroll<=geometry.width+2,JSON.stringify(geometry));await a.capture(label)
  }
 })
})
