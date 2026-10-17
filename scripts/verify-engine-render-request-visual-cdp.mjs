/** Bounded public-dock visual follow-up. No budget probes, benchmark sampling or state injection. */
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {join,resolve,relative} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const root=resolve(process.cwd()),dist=join(root,'.cache/engine-overhaul/profile-dist-0e471'),output=join(root,'.cache/engine-overhaul/render-request-visual-0e471')
const sha=b=>createHash('sha256').update(b).digest('hex')
const mb=await readFile(join(dist,'engine-build-manifest.json')),manifest=JSON.parse(mb)
assert.equal(manifest.buildId,'engine-profile-0e471944f69801413717');assert.equal(manifest.sourceHash,'0e471944f6980141371767bc0163f0d35dd84632357d17edd50f583cfc4149ec')
for(const f of manifest.artifacts)assert.equal(sha(await readFile(join(dist,f.path))),f.sha256)
await mkdir(output)
await writeFile(join(output,'profile-build-manifest.json'),mb);await writeFile(join(output,'driver-source.mjs'),await readFile(new URL(import.meta.url)))
const fixture=join(root,'reference-projects/projects/physics-v2617-platformer/project.nova'),fb=await readFile(fixture)
assert.equal(sha(fb),'9b070ae2eb8cff968f0735eec07aae99807df32b864a5090b737c55a360530ba')
const raw={scope:'SHORT_SMOKE_PUBLIC_DOCK_VISUAL_ONLY',buildId:manifest.buildId,artifactSourceHash:manifest.sourceHash,manifestSha256:sha(mb),fixtureSha256:sha(fb),entities:11,components:59,viewport:{width:1600,height:900,dpr:1},captures:[],notTested:['Native Tauri/WebView','Performance and physical display','Full motion; prior strict Reduced Motion 3s FAIL retained']}
process.env.NOVA_AUDIT_DIST_DIRECTORY=relative(root,dist);process.env.NOVA_AUDIT_REPORT_DIRECTORY=relative(root,output)
await withBrowserAudit({root,release:'26.37',name:'engine-render-request-visual',width:1600,height:900,development:true,expectedRelease:'26.37',qualifyRelease:false},async a=>{
 const ui=worldUserControls17(a)
 const snapshot=()=>a.evaluate(`(()=>{const status=document.querySelector('[data-audit=render-request-status]'),history=document.querySelector('[data-audit=render-historical-submission]');const rows=s=>[...document.querySelectorAll(s+' tbody tr')].map(e=>({name:e.querySelector('th')?.textContent,cpu:e.querySelector('td')?.textContent,draw:e.querySelector('td:last-child')?.textContent}));return {status:status?.textContent,current:rows('[data-audit=render-current-request]'),history:history?.textContent??null,historical:rows('[data-audit=render-historical-passes]'),visible:[status,history].map(e=>{if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,visible:r.top>=0&&r.bottom<=innerHeight}})}})()`)
 try{
  await ui.open(fixture);await ui.workspace('Debug');await ui.bottom('profiler','Profiler')
  raw.metadata=await a.evaluate('window.novaPerformanceDiagnosticsV1.metadata()');assert.equal(raw.metadata.buildId,manifest.buildId)
  await a.click('.bottom-panel .panel-controls>button',0)
  await a.until("!!document.querySelector('.bottom-panel.panel-maximized')")
  raw.publicLayoutChange='Clicked existing bottom-dock maximize control; original 1600×900/DPR1, no CSS/zoom/state injection.'
  await a.evaluate("document.querySelector('[data-audit=render-request-status]').scrollIntoView({block:'start'})")
  let found=false
  const deadline=Date.now()+10000
  for(let i=0;i<120&&Date.now()<deadline;i++){
   const before=await snapshot()
   if(before.status?.startsWith('This draw request was not submitted')&&before.history){
    found=true
    const file=await a.capture('current-not-submitted-and-independent-history'),after=await snapshot()
    const same=before.status===after.status&&before.history===after.history&&JSON.stringify(before.current)===JSON.stringify(after.current)&&JSON.stringify(before.historical)===JSON.stringify(after.historical)
    raw.captures.push({file,before,after,sameDiagnosticStateBeforeAndAfter:same})
    if(!same)raw.notTested.push('The exact transient was not stable across screenshot; before/after raw preserved, PNG is a later frame rather than atomic performance evidence.')
    break
   }
   await wait(65)
  }
  if(!found)raw.notTested.push('Natural current-not-submitted plus history did not occur in bounded 10s observation; no artificial failure generated.')
  await a.check('actual enlarged Profiler displays distinct current-request and historical-copy labels',async()=>{
   assert.ok(await a.evaluate("document.querySelector('[data-audit=render-current-request] caption')?.textContent==='Latest draw request'"))
   raw.currentLabel=await snapshot()
  })
  await a.click('.actionbar button',0);await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='true'")
  await a.clickText('.production-panel>.ui-tabs button','Scripts',true)
  await a.until("document.querySelectorAll('.script-profile-table .profile-row').length>0")
  await a.evaluate("document.querySelector('.script-profile-table').scrollIntoView({block:'start'})")
  raw.scriptRows=await a.evaluate("[...document.querySelectorAll('.script-profile-table .profile-row')].map(e=>({text:e.textContent,rect:{top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom}}))")
  raw.scriptScreenshot=await a.capture('readable-real-rhai-script-rows')
  await a.click('.actionbar button',3);await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='false'")
  await a.clickText('.production-panel>.ui-tabs button','Jobs',true)
  await a.evaluate("document.querySelector('[data-performance-policy=v1]').scrollIntoView({block:'start'})")
  raw.policyScreenshot=await a.capture('readable-comfortable-policy')
  raw.browser=await a.client.send('Browser.getVersion');raw.completedAt=new Date().toISOString()
 }finally{raw.checks=a.checks;await writeFile(join(output,'visual-raw.json'),JSON.stringify(raw,null,2)+'\n')}
})
assert.equal(sha(await readFile(fixture)),raw.fixtureSha256)
console.log(JSON.stringify({scope:raw.scope,buildId:raw.buildId,output,status:process.exitCode?'failed':'verified'}))
