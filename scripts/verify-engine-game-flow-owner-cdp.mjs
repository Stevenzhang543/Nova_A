/** Real public Editor GameFlow commands and lifecycle against an immutable profiling artifact. Functional SHORT_SMOKE only. */
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {join,resolve,relative,isAbsolute} from 'node:path'
import {withBrowserAudit} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'

const arg=name=>{const value=process.argv.find(s=>s.startsWith(`--${name}=`))?.slice(name.length+3);assert.ok(value,`Explicit --${name} is required`);return value}
const root=resolve(process.cwd()),dist=resolve(root,arg('dist')),output=resolve(root,arg('output')),sha=value=>createHash('sha256').update(value).digest('hex')
const supplement=process.argv.includes('--supplement=reload-reopen')
for(const path of [dist,output]){const suffix=relative(root,path);assert.ok(suffix&&!suffix.startsWith('..')&&!isAbsolute(suffix))}
assert.ok(relative(root,output).replaceAll('\\','/').startsWith('.cache/engine-overhaul/game-flow/gui/'))
const manifestBytes=await readFile(join(dist,'engine-build-manifest.json')),manifest=JSON.parse(manifestBytes)
assert.equal(sha(manifestBytes),arg('manifest-sha'));assert.equal(manifest.buildId,arg('build-id'));assert.equal(manifest.sourceHash,arg('source-hash'));assert.equal(manifest.mode,'optimized-profiling');assert.equal(manifest.profilingApiEnabled,true)
for(const file of manifest.artifacts)assert.equal(sha(await readFile(join(dist,file.path))),file.sha256)
const receiptPath=join(root,'.cache/engine-overhaul/game-flow-integration-9c0eb59498a2/integration-receipt.json'),receiptBytes=await readFile(receiptPath),receipt=JSON.parse(receiptBytes)
assert.equal(sha(receiptBytes),'978facfb168b3eace1bb750bdb3f57035e376f21bd592fe955efd83eead1e8ae');assert.equal(receipt.buildId,manifest.buildId)
const project=join(root,'.cache/engine-overhaul/device-comfortable-ui-a4211-attempt1/v26.17-device-comfortable.nova'),originalBytes=await readFile(project),original=JSON.parse(originalBytes)
assert.equal(sha(originalBytes),'aba83b30b8fc5563bdd82fb73268c0642774769210f6d6051504486578a470ec')
const referencePath=join(root,'reference-projects/projects/physics-v2617-platformer/project.nova'),referenceHash=sha(await readFile(referencePath));assert.equal(referenceHash,'9b070ae2eb8cff968f0735eec07aae99807df32b864a5090b737c55a360530ba')
const fixture=structuredClone(original),asset=fixture.assets.find(value=>value.uuid==='f239103a-24ff-4666-8239-103a24ff5666')
assert.equal(asset.name,'PlayerController.rhai');assert.equal(asset.assetType,'script');assert.ok(asset.source.includes('fn update(dt) {'));assert.ok(!asset.source.includes('fn awake('))
const originalSource=asset.source
// Reads occur in a later real update callback: a callback's gameFlow context is a snapshot made before its commands execute.
const probe=`
// Ephemeral public-API GUI audit. Original movement/readout code remains below.
let audit_stage = 0;
let audit_pending = "";
fn awake() { audit_stage = 0; audit_pending = "boot"; }
fn audit_snapshot(label) {
  let score = score_get();
  let session = session_get("owner-probe", "__missing__");
  let paused = game_paused();
  let checkpoint = checkpoint_has("owner-probe");
  let scale = time_scale();
  print(\`NOVA_GAMEFLOW_OWNER|snapshot|label=\${label}|score=\${score}|session=\${session}|paused=\${paused}|checkpoint=\${checkpoint}|scale=\${scale}\`);
}
`
// Rhai's host-entered update receives instance scope; nested script helpers do not capture its mutable globals.
// Keep mutable audit state in the existing host callback. No production scope/engine change is made for this fixture.
const updateProbe=`
  if audit_pending != "" { audit_snapshot(audit_pending); audit_pending = ""; }
  if input_pressed("Jump") {
  audit_stage += 1;
  if audit_stage == 1 {
    print("NOVA_GAMEFLOW_OWNER|command|step=1|score_set(101);session_set(one);checkpoint_set(owner-probe)");
    score_set(101.0); session_set("owner-probe", "one"); checkpoint_set("owner-probe"); audit_pending = "checkpoint";
  } else if audit_stage == 2 {
    print("NOVA_GAMEFLOW_OWNER|command|step=2|score_add(22);session_set(changed);game_pause(true)");
    score_add(22.0); session_set("owner-probe", "changed"); game_pause(true); audit_pending = "paused";
  } else if audit_stage == 3 {
    print("NOVA_GAMEFLOW_OWNER|command|step=3|game_pause(false)");
    game_pause(false); audit_pending = "resumed";
  } else if audit_stage == 4 {
    print("NOVA_GAMEFLOW_OWNER|command|step=4|checkpoint_restore(owner-probe)");
    checkpoint_restore("owner-probe"); audit_pending = "restored";
  } else if audit_stage == 5 {
    print("NOVA_GAMEFLOW_OWNER|command|step=5|scene_reload()"); scene_reload();
  }
  }
`
asset.source=probe+originalSource.replace('fn update(dt) {','fn update(dt) {\n'+updateProbe)
asset.byteLength=Buffer.byteLength(asset.source)
const sourceHash=sha(asset.source)
// Existing inline/legacy pipeline uses source bytes for these six hashes. Retain all importer/settings/dependency identity.
for(const key of ['sourceHash','artifactHash','contentHash','cacheKey','settingsHash','artifactSettingsHash'])asset.pipeline[key]=sourceHash
asset.pipeline.lastValidSource=asset.source
const diff=(before,after,path='$',changes=[])=>{if(Object.is(before,after))return changes;if(before&&after&&typeof before==='object'&&typeof after==='object'&&Array.isArray(before)===Array.isArray(after)){for(const key of new Set([...Object.keys(before),...Object.keys(after)]))diff(before[key],after[key],`${path}.${key}`,changes)}else changes.push({path,before,after});return changes}
const fixtureChanges=diff(original,fixture)
assert.equal(fixtureChanges.length,9);assert.ok(fixtureChanges.every(change=>change.path.startsWith(`$.assets.${fixture.assets.indexOf(asset)}.`)))
assert.deepEqual(fixture.scenes,original.scenes);assert.deepEqual(fixture.projectSettings,original.projectSettings)
const components=fixture.scenes[0].entities.flatMap(entity=>entity.components)
assert.equal(fixture.scenes[0].entities.length,11);assert.equal(components.length,59);assert.equal(components.filter(component=>!component.removed).length,41)
await mkdir(join(output,'..'),{recursive:true});await mkdir(output)
const fixturePath=join(output,'ephemeral-game-flow-owner.nova'),fixtureBytes=Buffer.from(JSON.stringify(fixture,null,2)+'\n')
await writeFile(fixturePath,fixtureBytes);await writeFile(join(output,'profile-build-manifest.json'),manifestBytes);await writeFile(join(output,'integration-receipt.json'),receiptBytes);await writeFile(join(output,'driver-source.mjs'),await readFile(new URL(import.meta.url)))
await writeFile(join(output,'fixture-changes.json'),JSON.stringify({originalProject:project,originalSha256:sha(originalBytes),referencePath,referenceSha256:referenceHash,ephemeralProject:fixturePath,ephemeralSha256:sha(fixtureBytes),originalSourceSha256:sha(originalSource),ephemeralSourceSha256:sourceHash,changes:fixtureChanges},null,2)+'\n')
process.env.NOVA_AUDIT_DIST_DIRECTORY=relative(root,dist);process.env.NOVA_AUDIT_REPORT_DIRECTORY=relative(root,output)
const raw={scope:'SHORT_SMOKE_PUBLIC_GAME_FLOW_OWNER_LIFECYCLE',supplement: supplement?'scene-reload-compatible-state-and-fresh-reopen-only':null,buildId:manifest.buildId,artifactSourceHash:manifest.sourceHash,manifestSha256:sha(manifestBytes),receiptSha256:sha(receiptBytes),projectSha256:sha(originalBytes),fixtureSha256:sha(fixtureBytes),counts:{entities:11,serializedComponents:59,notRemovedComponents:41},snapshots:[],commands:[],operations:[],screenshots:[],checks:[],notTested:['Direct Runtime World identity and concurrent independent Worlds are not exposed by this public GUI observation.','Native Tauri/WebView, physical foreground input/display, hardware GPU, formal QualityLocked/AdaptiveExperience/performance gates and old Reduced Motion strict3s FAIL are outside this functional smoke.']}
const persist=()=>writeFile(join(output,'game-flow-owner-gui-raw.json'),JSON.stringify(raw,null,2)+'\n')
try{
 await withBrowserAudit({root,release:'26.37',name:'engine-game-flow-owner',width:1600,height:900,development:true,expectedRelease:'26.37',qualifyRelease:false},async a=>{
  const ui=worldUserControls17(a),rows=()=>a.evaluate("[...document.querySelectorAll('.console-list .log-entry')].map(e=>({message:e.querySelector('span')?.textContent,level:e.querySelector('b')?.textContent,category:e.querySelector('strong')?.textContent,source:e.querySelector('code')?.textContent}))")
  const prepareConsole=async()=>{await ui.workspace('Debug');await ui.bottom('console','Console');await a.fill('.console-filters input[type=search]','');await a.until("document.querySelector('.console-filters input[type=search]').value===''")}
  const snapshots=async()=>{const entries=(await rows()).filter(row=>row.message?.includes('NOVA_GAMEFLOW_OWNER|snapshot|'));return entries.map(row=>{const message=row.message.slice(row.message.indexOf('NOVA_GAMEFLOW_OWNER|'));const fields=Object.fromEntries(message.split('|').slice(2).map(field=>{const split=field.indexOf('=');return[field.slice(0,split),field.slice(split+1)]}));return{...row,label:fields.label,score:Number(fields.score),session:fields.session,paused:fields.paused==='true',checkpoint:fields.checkpoint==='true',scale:Number(fields.scale)}})}
  const observe=async(label,expected,index=0)=>{await a.until(`document.querySelectorAll('.console-list .log-entry>span').length>0`);const deadline=Date.now()+20000;let snapshot;while(Date.now()<deadline){const actualRows=await rows(),scriptError=actualRows.find(row=>row.category==='Script'&&/error|fatal/i.test(row.level));if(scriptError)throw Error(`Actual production Script error: ${scriptError.message}`);snapshot=(await snapshots()).filter(row=>row.label===label)[index];if(snapshot)break;await new Promise(done=>setTimeout(done,75))}assert.ok(snapshot,`Missing actual next-callback ${label} #${index}`);for(const [key,value]of Object.entries(expected))assert.equal(snapshot[key],value,`${label}.${key}`);raw.snapshots.push({...snapshot,observedAt:new Date().toISOString(),run:raw.run,scope:'Production script context in a later real update callback; CPU/GPU/display times are not measured.'});raw.commands=(await rows()).filter(row=>row.message?.includes('NOVA_GAMEFLOW_OWNER|command|'));await persist();return snapshot}
  const play=async()=>{await a.click('.sidebar nav button',0);await a.click('.actionbar button',0);await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='true'");raw.operations.push({action:'public-toolbar-play',run:raw.run,at:new Date().toISOString()})}
  const stop=async()=>{await a.click('.actionbar button',3);await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='false'");raw.operations.push({action:'public-toolbar-stop',run:raw.run,at:new Date().toISOString()})}
  const pulse=async(label)=>{await a.click('canvas.overlay-canvas[data-game-input-surface]');const focused=await a.evaluate("({tag:document.activeElement?.tagName,className:document.activeElement?.className,gameSurface:document.activeElement?.matches('canvas[data-game-input-surface]')})");assert.equal(focused.gameSurface,true);raw.operations.push({action:'real-Space-down-up',label,run:raw.run,focus:focused,at:new Date().toISOString()});await a.press('Space',0,80)}
  const shot=async label=>{await a.evaluate("document.querySelector('.console-list .log-entry:last-child')?.scrollIntoView({block:'nearest'})");const rowsBefore=await rows(),file=await a.capture(label);raw.screenshots.push({file,rowsBefore,scope:'Static Console and scene evidence only; no performance/motion claim.'})}
  const boot={score:0,session:'__missing__',paused:false,checkpoint:false,scale:1}
  try{
   await ui.open(fixturePath);raw.metadata=await a.evaluate('window.novaPerformanceDiagnosticsV1.metadata()');assert.equal(raw.metadata.buildId,manifest.buildId)
   raw.actualContext=await a.evaluate("(()=>{const c=document.querySelector('canvas.render-canvas'),g=c.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return {backend:'WebGL2',contextLost:g.isContextLost(),renderer:g.getParameter(e?e.UNMASKED_RENDERER_WEBGL:g.RENDERER),dpr:devicePixelRatio,cssWidth:c.getBoundingClientRect().width,cssHeight:c.getBoundingClientRect().height,backingWidth:c.width,backingHeight:c.height,physicalMonitorDpi:null,physicalForegroundObserved:false}})()");assert.match(raw.actualContext.renderer,/SwiftShader/)
   const baseline=await ui.save('game-flow-before-play');raw.beforePlaySave={file:baseline.file,sha256:sha(await readFile(baseline.file))}
   await prepareConsole();raw.run='first-play'
   if(supplement){
    // Prerequisites reproduce nonempty state through the same real commands; prior seven checks are not rerun/recounted.
    await play();await observe('boot',boot)
    await pulse('checkpoint');await observe('checkpoint',{score:101,session:'one',paused:false,checkpoint:true,scale:1})
    await pulse('paused');await observe('paused',{score:123,session:'changed',paused:true,checkpoint:true,scale:0})
    await pulse('resumed');await observe('resumed',{score:123,session:'changed',paused:false,checkpoint:true,scale:1})
    await pulse('restored');await observe('restored',{score:101,session:'one',paused:false,checkpoint:true,scale:1})
    await a.check('scene_reload preserves existing score/session/checkpoints while the actual awake and later update run again',async()=>{
     await pulse('scene-reload');await observe('boot',{score:101,session:'one',paused:false,checkpoint:true,scale:1},1)
     const actualRows=await rows();assert.ok(actualRows.some(row=>row.message?.includes('Runtime scene reloaded')));assert.ok(actualRows.some(row=>row.message?.includes('NOVA_GAMEFLOW_OWNER|command|step=5|scene_reload()')))
     raw.sceneReloadCompatibility={statePreserved:true,awakeEvidence:'Only the actual awake function assigns audit_pending="boot"; a second boot snapshot follows the real reload command and Runtime scene reloaded log.',worldIdentity:'NOT_TESTED',retainedFailure:'9c0e-attempt3 asserted boot score 0 incorrectly; its actual 101 assertion FAIL/raw/PNG remain unchanged.'};await shot('actual-reload-compatible-state')
    })
    await stop();const after=await ui.save('game-flow-after-stop');raw.afterStopSave={file:after.file,sha256:sha(await readFile(after.file)),differencesFromBeforePlay:diff(baseline.document,after.document)};assert.deepEqual(after.document.scenes,baseline.document.scenes);assert.deepEqual(after.document.projectSettings,baseline.document.projectSettings);assert.deepEqual(after.document.assets,baseline.document.assets)
    raw.run='fresh-chooser-reopen'
    await a.check('fresh public chooser reopen and new Play start empty GameFlow and preserve authoring after Stop/Save',async()=>{
     await ui.open(after.file);await prepareConsole();await play();await observe('boot',boot);await shot('actual-fresh-reopen-empty-flow');await stop();const saved=await ui.save('game-flow-after-fresh-reopen');raw.afterReopenSave={file:saved.file,sha256:sha(await readFile(saved.file)),differencesFromBeforePlay:diff(baseline.document,saved.document)};assert.deepEqual(saved.document.scenes,baseline.document.scenes);assert.deepEqual(saved.document.projectSettings,baseline.document.projectSettings);assert.deepEqual(saved.document.assets,baseline.document.assets)
    })
    raw.browser=await a.client.send('Browser.getVersion');raw.completedAt=new Date().toISOString();raw.status='VERIFIED_LOCAL_FUNCTIONAL_SUPPLEMENT';return
   }
   await a.check('real Play starts with empty score/session/checkpoints and resumed time scale',async()=>{await play();await observe('boot',boot)})
   await a.check('real script score/session/checkpoint commands appear in the next update snapshot',async()=>{await pulse('checkpoint');await observe('checkpoint',{score:101,session:'one',paused:false,checkpoint:true,scale:1})})
   await a.check('real script pause changes only runtime time scale and preserves update/input observation',async()=>{await pulse('paused');await observe('paused',{score:123,session:'changed',paused:true,checkpoint:true,scale:0});assert.equal(await a.evaluate("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')"),'true')})
   await a.check('real Space action resumes script-paused runtime without a hidden state write',async()=>{await pulse('resumed');await observe('resumed',{score:123,session:'changed',paused:false,checkpoint:true,scale:1})})
   await a.check('checkpoint restore recovers captured score and session through the production command',async()=>{await pulse('restored');await observe('restored',{score:101,session:'one',paused:false,checkpoint:true,scale:1});await shot('actual-restored-score-session')})
   await a.check('Stop preserves the saved authoring scene, settings and resource content',async()=>{await stop();const saved=await ui.save('game-flow-after-stop');raw.afterStopSave={file:saved.file,sha256:sha(await readFile(saved.file)),differencesFromBeforePlay:diff(baseline.document,saved.document)};assert.deepEqual(saved.document.scenes,baseline.document.scenes);assert.deepEqual(saved.document.projectSettings,baseline.document.projectSettings);assert.deepEqual(saved.document.assets,baseline.document.assets);raw.reopenFile=saved.file})
   raw.run='second-play';await a.check('second Play resets score/session/checkpoints rather than retaining the previous run',async()=>{await play();await observe('boot',boot,1)})
   // Mutate again before reload; an empty-to-empty reload alone would not establish state reset.
   await pulse('second-checkpoint');await observe('checkpoint',{score:101,session:'one',paused:false,checkpoint:true,scale:1},1)
   await pulse('second-paused');await observe('paused',{score:123,session:'changed',paused:true,checkpoint:true,scale:0},1)
   await pulse('second-resumed');await observe('resumed',{score:123,session:'changed',paused:false,checkpoint:true,scale:1},1)
   await pulse('second-restored');await observe('restored',{score:101,session:'one',paused:false,checkpoint:true,scale:1},1)
   await a.check('actual scene_reload command retains score/session/checkpoints while awake and update restart',async()=>{await pulse('scene-reload');await observe('boot',{score:101,session:'one',paused:false,checkpoint:true,scale:1},2);await shot('actual-scene-reload-compatible-boot')})
   await stop();raw.run='fresh-chooser-reopen'
   await a.check('fresh public file chooser reopen and Play retain the original authoring values and start empty GameFlow',async()=>{await ui.open(raw.reopenFile);await prepareConsole();await play();await observe('boot',boot);const saved=await stopAndSave();assert.deepEqual(saved.document.scenes,baseline.document.scenes);assert.deepEqual(saved.document.projectSettings,baseline.document.projectSettings);assert.deepEqual(saved.document.assets,baseline.document.assets)})
   async function stopAndSave(){await stop();const saved=await ui.save('game-flow-after-fresh-reopen');raw.afterReopenSave={file:saved.file,sha256:sha(await readFile(saved.file)),differencesFromBeforePlay:diff(baseline.document,saved.document)};return saved}
   raw.browser=await a.client.send('Browser.getVersion');raw.completedAt=new Date().toISOString();raw.status='VERIFIED_LOCAL_FUNCTIONAL_SCOPE'
  }catch(error){raw.failure={message:error.message,stack:error.stack,consoleRows:await rows().catch(()=>[])};throw error}
  finally{try{if(await a.evaluate("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='true'"))await stop()}catch(error){raw.stopCleanupFailure=String(error)}raw.checks=a.checks;await persist()}
 })
}finally{
 raw.originalProjectPreserved=sha(await readFile(project))===raw.projectSha256;raw.referenceProjectPreserved=sha(await readFile(referencePath))===referenceHash;raw.manifestPreserved=sha(await readFile(join(dist,'engine-build-manifest.json')))===raw.manifestSha256;raw.driverSha256=sha(await readFile(new URL(import.meta.url)));await persist();assert.ok(raw.originalProjectPreserved&&raw.referenceProjectPreserved&&raw.manifestPreserved)
}
console.log(JSON.stringify({scope:raw.scope,buildId:raw.buildId,output,status:raw.status,checks:raw.checks.length}))
