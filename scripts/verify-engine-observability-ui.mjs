/** Public production controls and DOM evidence; software SHORT_SMOKE only. No private store writes. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const root = resolve(process.env.NOVA_AUDIT_ROOT || process.cwd())
const dist = resolve(root, process.env.NOVA_AUDIT_DIST_DIRECTORY || '.cache/engine-overhaul/profile-dist')
const manifestPath = resolve(dist, 'engine-build-manifest.json')
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const manifestBytes = await readFile(manifestPath), manifest = JSON.parse(manifestBytes)
assert.equal(manifest.mode, 'optimized-profiling'); assert.equal(manifest.profilingApiEnabled, true)
for (const artifact of manifest.artifacts) assert.equal(sha256(await readFile(resolve(dist, artifact.path))), artifact.sha256, 'Frozen artifact changed: ' + artifact.path)
const fixture = resolve(root, 'reference-projects/projects/physics-v2617-platformer/project.nova')
const fixtureSourceSha256 = sha256(await readFile(fixture))
const reportDirectory = process.argv.find(value=>value.startsWith('--output='))?.slice(9) || '.cache/engine-overhaul/ui-smoke'
process.env.NOVA_AUDIT_REPORT_DIRECTORY = reportDirectory
const evidence = { scope: 'SHORT_SMOKE', kind: 'UI_CONTROL_AND_LAYOUT_OBSERVATION', buildId: manifest.buildId,
  manifestPath, manifestSha256: sha256(manifestBytes), artifactSourceHash: manifest.sourceHash,
  fixture, fixtureSourceSha256, graphicsEvidence: 'HEADLESS_EDGE_SWIFTSHADER_SOFTWARE', recordingEnabled: false, paintProgressProbes:process.argv.includes('--paint-progress'),
  caveats: ['Separate from performance collection; screenshots and DOM reads perturb this UI session.',
    'Physical monitor DPI, physical assistive technology, photon latency, target Tauri/Linux and formal B/X/H matrices are NOT_TESTED.',
    'The frozen artifact is identified by its own manifest, rather than later workspace hashes.'], phases: [] }

await withBrowserAudit({ root, release: '26.37', name: 'engine-observability-ui', width: 1600, height: 900,
  development: true, expectedRelease: '26.37', qualifyRelease: false }, async a => {
  const ui = worldUserControls17(a), policy = '[data-performance-policy="v1"]'
  const metadata = () => a.evaluate('window.novaPerformanceDiagnosticsV1.metadata()')
  const motion = () => a.evaluate(`(()=>{const identities=window.__novaUiAuditAnimationIdentities??=( {ids:new WeakMap(),next:0} );return { atMs: performance.now(), timelineMs:document.timeline.currentTime, reduced: document.documentElement.dataset.reduceMotion,
    effective: document.documentElement.dataset.uiMotion, density: document.documentElement.dataset.density,
    uiScale: getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim(),
    systemReduced:matchMedia('(prefers-reduced-motion:reduce)').matches, focus:{tag:document.activeElement?.tagName,className:document.activeElement?.className,ariaLabel:document.activeElement?.getAttribute('aria-label')},
    libraryDiagnostics:{status:'unavailable',reason:'The frozen production artifact does not expose the Motion System private active Map or diagnostics export.'},
    animations: document.getAnimations().filter(x=>x.playState==='running').map(x=>{if(!identities.ids.has(x))identities.ids.set(x,++identities.next);return {auditIdentity:identities.ids.get(x),constructor:x.constructor.name,animationName:x.animationName,id:x.id,startTime:x.startTime,pending:x.pending,playState:x.playState,target: x.effect?.target?.className,
      tag: x.effect?.target?.tagName, text: x.effect?.target?.textContent?.slice(0,160), currentTime: x.currentTime,
      timing: x.effect?.getTiming(), keyframes: x.effect?.getKeyframes() }}) }})()`)
  const geometry = () => a.evaluate(`(()=>{const panel=document.querySelector(${JSON.stringify(policy)});
    const s=getComputedStyle(panel),box=panel.getBoundingClientRect();return {
      viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio}, bodyFontPx:parseFloat(getComputedStyle(document.body).fontSize),
      panel:{x:box.x,y:box.y,width:box.width,height:box.height,padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft],radius:s.borderRadius,gap:s.gap,margin:[s.marginTop,s.marginRight,s.marginBottom,s.marginLeft]},
      pageHorizontalOverflow:document.documentElement.scrollWidth>innerWidth,
      header:{display:getComputedStyle(panel.querySelector('header')).display,gap:getComputedStyle(panel.querySelector('header')).gap,text:panel.querySelector('header').textContent},
      tabs:[...document.querySelectorAll('.production-panel>.ui-tabs button')].map(e=>({label:e.textContent,selected:e.getAttribute('aria-selected'),focused:document.activeElement===e})),
      controls:[...panel.querySelectorAll('input,select')].map(e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);return{
        label:e.getAttribute('aria-label'),value:e.value,width:r.width,height:r.height,fontPx:parseFloat(c.fontSize),lineHeight:c.lineHeight,
        padding:[c.paddingTop,c.paddingRight,c.paddingBottom,c.paddingLeft],radius:c.borderRadius,
        outsidePanel:r.left<box.left-1||r.right>box.right+1,disabled:e.disabled}})}})()`)
  const floor = value => {
    assert.equal(value.controls.length, 6); assert.ok(value.bodyFontPx >= 16)
    for (const control of value.controls) { assert.ok(control.height >= 43.9, control.label + ' Comfortable height'); assert.ok(control.fontPx >= 16, control.label + ' Comfortable type'); assert.equal(control.outsidePanel, false, control.label + ' width containment') }
    if(process.argv.includes('--expect-policy-floor')){
      const scale=value.bodyFontPx/16
      assert.deepEqual(value.panel.padding,Array(4).fill(20*scale+'px'));assert.equal(value.panel.radius,16*scale+'px');assert.deepEqual(value.panel.margin,Array(4).fill(8*scale+'px'))
      assert.equal(value.header.display,'flex');assert.equal(value.header.gap,12*scale+'px')
    }
  }
  const settleAnimations=async name=>{
    if(!process.argv.includes('--paint-progress'))return a.until("document.getAnimations().filter(x=>x.playState==='running').length===0",3000)
    const deadline=performance.now()+3000, probes=[]; (evidence.paintProgressObservations??=[]).push({name,probes})
    for(let n=0;n<8&&performance.now()<deadline;n++){
      const state=await motion();probes.push(state);if(!state.animations.length)return
      // A real paint request diagnoses a stalled headless document timeline; no animation is finished/cancelled by the driver.
      await a.capture('compositor-'+name+'-'+n);await wait(75)
    }
    assert.equal((await motion()).animations.length,0,'Actual animations must settle within the unchanged3s deadline and bounded8 real paint probes')
    assert.ok(performance.now()<=deadline,'The existing3s cleanup deadline was exceeded')
  }
  const panel = async () => {
    await ui.workspace('Debug'); await ui.bottom('profiler', 'Profiler')
    await a.clickText('.production-panel > .ui-tabs button', 'Jobs', true)
    await a.until(`!!document.querySelector(${JSON.stringify(policy)})`)
    if (await a.evaluate("document.querySelector('button[data-panel-maximize=bottom]')?.getAttribute('aria-pressed')!=='true'")) await a.click('button[data-panel-maximize="bottom"]')
    await a.evaluate(`document.querySelector(${JSON.stringify(policy)}).scrollIntoView({block:'start'})`); await wait(250)
  }
  const settings = async () => { await ui.workspace('Manage'); await a.click('.manage-body > nav button', 1); await a.until("!!document.querySelector('.settings-page')") }
  const snapshot = async name => {
    const g=await geometry(),m=await motion(); floor(g); evidence.phases.push({name,geometry:g,motion:m,metadata:await metadata()}); await a.capture(name)
    await a.evaluate(`document.querySelector(${JSON.stringify(policy+' input[aria-label="GPU submissions in flight"]')}).scrollIntoView({block:'center'})`)
    await a.capture(name+'-bottom');await a.evaluate(`document.querySelector(${JSON.stringify(policy)}).scrollIntoView({block:'start'})`);return g
  }
  let reducedCleanupFailure=null
  try {
  await ui.open(fixture)
  await a.check('real profiling metadata is cloneable and tied to frozen build', async () => {
    await a.until('!!window.novaPerformanceDiagnosticsV1'); const value=await metadata()
    assert.equal(value.buildId,manifest.buildId); assert.equal(value.actualBenchmarkMode,'off'); evidence.initialMetadata=value
  })
  await a.capture('real-project')
  await ui.workspace('Debug'); await ui.bottom('profiler','Profiler')
  await a.check('Profiler reads actual submitted renderer backend', async () => {
    const values=await a.evaluate("[...document.querySelectorAll('.presentation-diagnostics dl>div')].map(e=>({label:e.querySelector('dt')?.textContent,value:e.querySelector('dd')?.textContent}))")
    // This DOM comes from RendererStats, rather than the independent capability-probe report.
    assert.ok(values.some(x=>x.value==='WebGL2'||x.value==='Canvas2D'), 'Published renderer backend must be present')
    evidence.submittedRendererStats=values
  })
  await panel()
  let wide
  await a.check('six performance policy controls retain Comfortable geometry',async()=>{wide=await snapshot('comfortable-wide')})
  await a.check('public controls save independent policy preferences',async()=>{
    await a.select(policy+' select[aria-label="Experience"]','quiet')
    await ui.field(policy+' input[aria-label="Total auxiliary CPU limit"]',2)
    await ui.field(policy+' input[aria-label="GPU submissions in flight"]',1)
    const stored=await a.evaluate("JSON.parse(localStorage.getItem('nova-a.performance-policy.v1'))")
    assert.equal(stored.experienceMode,'quiet'); assert.equal(stored.maxAuxiliaryHeavyJobs,2); assert.equal(stored.maxSubmissionCredits,1)
    assert.equal(stored.benchmarkMode,'off'); assert.equal(stored.adaptiveQuality,false)
    assert.ok(await a.evaluate(`document.querySelector(${JSON.stringify(policy+' [role="status"]')}).textContent.includes('saved')`))
    evidence.savedPolicy=stored
  })
  await a.check('normal tab motion uses finite active work and cleans up',async()=>{
    const at=await a.point('.production-panel>.ui-tabs button',1)
    await a.client.send('Input.dispatchMouseEvent',{type:'mousePressed',...at,button:'left',clickCount:1})
    await a.client.send('Input.dispatchMouseEvent',{type:'mouseReleased',...at,button:'left',clickCount:1})
    const samples=[];for(let n=0;n<8;n++){samples.push(await motion());await wait(45)}
    try { await settleAnimations('normal') }
    catch(error) { evidence.normalTabMotionFailure=await motion(); throw error }
    evidence.normalTabMotion={samples,settled:await motion(), observedActive:samples.some(x=>x.animations.length>0)}
    assert.equal(evidence.normalTabMotion.observedActive,true,'Real ordinary tab animation must be observed')
  })
  await panel()
  await a.check('narrow viewport wraps controls without lowering Comfortable size',async()=>{
    await a.viewport(540,900); await a.evaluate(`document.querySelector(${JSON.stringify(policy)}).scrollIntoView({block:'start'})`)
    const narrow=await snapshot('comfortable-narrow')
    for(let n=0;n<6;n++){assert.equal(narrow.controls[n].fontPx,wide.controls[n].fontPx);assert.equal(narrow.controls[n].height,wide.controls[n].height);assert.deepEqual(narrow.controls[n].padding,wide.controls[n].padding);assert.equal(narrow.controls[n].radius,wide.controls[n].radius)}
  })
  await a.viewport(1600,900)
  // Restore the public dock before entering Manage so the central workspace remains reachable.
  if(await a.evaluate("document.querySelector('button[data-panel-maximize=bottom]')?.getAttribute('aria-pressed')==='true'"))await a.click('button[data-panel-maximize="bottom"]')
  await settings()
  await a.check('public interface scale enlarges policy type and controls without page zoom',async()=>{
    const range='.settings-page input[type="range"][aria-label="Interface scale"]'
    await a.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(range)});if(!e)throw Error('Missing public scale');e.scrollIntoView({block:'center'});e.focus()})()`)
    await a.press('Home');for(let n=0;n<5;n++)await a.press('ArrowRight')
    await a.until("getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim()==='1.25'")
    await panel();const scaled=await snapshot('comfortable-scale-125')
    for(let n=0;n<6;n++){assert.ok(scaled.controls[n].fontPx>=wide.controls[n].fontPx*1.25);assert.ok(scaled.controls[n].height>=wide.controls[n].height*1.25-.1)}
    assert.equal(await a.evaluate("getComputedStyle(document.documentElement).zoom"),'1')
    await a.click('button[data-panel-maximize="bottom"]');await settings()
    await a.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(range)});e.scrollIntoView({block:'center'});e.focus()})()`);await a.press('Home')
    await a.until("getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim()==='1'")
  })
  await a.check('system Reduced Motion changes presentation without changing user preference',async()=>{
    assert.equal(await a.evaluate("JSON.parse(localStorage.getItem('nova_a.preferences.v1')).reduceMotion"),false)
    await a.client.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
    await a.until("document.documentElement.dataset.uiMotion==='reduced'")
    evidence.systemReducedMotion=await motion();assert.equal(evidence.systemReducedMotion.reduced,'false')
    await a.client.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]})
    await a.until("document.documentElement.dataset.uiMotion==='on'")
  })
  await a.check('manual Reduced Motion persists independently of experience policy',async()=>{
    const toggle='.settings-page input[role="switch"][aria-label="Reduce motion"]'
    await a.until(`!!document.querySelector(${JSON.stringify(toggle)})`)
    if(!await a.evaluate(`document.querySelector(${JSON.stringify(toggle)}).checked`))await a.click(toggle)
    await a.until("document.documentElement.dataset.uiMotion==='reduced'")
    const prefs=await a.evaluate("JSON.parse(localStorage.getItem('nova_a.preferences.v1'))")
    assert.equal(prefs.reduceMotion,true);assert.equal(prefs.uiScale,1);assert.equal(prefs.compactMode,false)
    assert.equal(JSON.parse(await a.evaluate("localStorage.getItem('nova-a.performance-policy.v1')")).experienceMode,'quiet')
    evidence.reducedPreference=prefs
  })
  await panel()
  try { await a.check('Reduced Motion preserves field geometry and cancels transient tab work',async()=>{
    const reduced=await snapshot('reduced-wide')
    for(let n=0;n<6;n++){assert.equal(reduced.controls[n].fontPx,wide.controls[n].fontPx);assert.equal(reduced.controls[n].height,wide.controls[n].height);assert.deepEqual(reduced.controls[n].padding,wide.controls[n].padding);assert.equal(reduced.controls[n].radius,wide.controls[n].radius)}
    await a.click('.production-panel>.ui-tabs button',1);await a.clickText('.production-panel>.ui-tabs button','Jobs',true)
    try { await settleAnimations('reduced') }
    catch(error) { evidence.reducedTabMotionFailure=await motion(); throw error }
    evidence.reducedTabMotion=await motion();assert.equal(evidence.reducedTabMotion.effective,'reduced')
  }) } catch(error) { reducedCleanupFailure=error; evidence.reducedCleanupFailure=String(error.stack); evidence.reducedFailureFollowup=[]; for(let n=0;n<8;n++){evidence.reducedFailureFollowup.push(await motion());await wait(80)} }
  await a.check('reload restores policy controls and accessibility preference',async()=>{
    await ui.open(fixture);await panel()
    assert.equal(await a.evaluate(`document.querySelector(${JSON.stringify(policy+' select[aria-label="Experience"]')}).value`),'quiet')
    assert.equal(await a.evaluate(`document.querySelector(${JSON.stringify(policy+' input[aria-label="Total auxiliary CPU limit"]')}).value`),'2')
    assert.equal(await a.evaluate(`document.querySelector(${JSON.stringify(policy+' input[aria-label="GPU submissions in flight"]')}).value`),'1')
    assert.equal((await motion()).effective,'reduced');await snapshot('reloaded-saved')
  })
  await a.check('trace queue remains bounded during independent UI observation',async()=>{
    const queue=await a.evaluate('window.novaPerformanceDiagnosticsV1.snapshot()');assert.ok(queue.queuedSamples<=8192&&queue.queuedBytes<=1048576);evidence.finalQueue=queue
  })
  evidence.browser=await a.client.send('Browser.getVersion');evidence.completedAt=new Date().toISOString()
  if(reducedCleanupFailure)throw reducedCleanupFailure
  } finally { await writeFile(resolve(a.evidence,'engine-observability-ui-raw.json'),JSON.stringify(evidence,null,2)+'\n') }
})
assert.equal(sha256(await readFile(manifestPath)),evidence.manifestSha256,'Frozen manifest changed during observation')
console.log(JSON.stringify({status:'verified',scope:'SHORT_SMOKE',buildId:manifest.buildId,evidence:resolve(root,reportDirectory)}))
