/** Real browser wheel ownership through a normal authored project and public Rhai input APIs. */
import assert from 'node:assert/strict'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {openMediaAuditModules, mediaUuid} from './lib/mediaAudit16.mjs'
import {withBrowserAudit, wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'

const fixture = join(process.cwd(), '.cache/v2634-input-ownership.nova')
const ids = {root:mediaUuid(263401),panel:mediaUuid(263402),marker:mediaUuid(263403),counter:mediaUuid(263404),input:mediaUuid(263405),controller:mediaUuid(263406)}
const opened = await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',templates:'projects/templates',box:'world/BoxEntity',components:'world/components',assets:'assets/AssetDatabase',input:'runtime/input',projectData:'projects/projectData'})
try {
  const {physics:p,templates,box,components:c,assets,input}=opened.modules, wasm=await opened.wasm()
  assert.ok(p.loadProject(wasm.module.migrate_project_json(templates.createTemplateProjectJson('empty','Wheel ownership acceptance'))))
  let sequence=263401
  function entity(key,name,kind,parent,position={x:0,y:0},size={x:100,y:40}) {
    const e=new box.BoxEntity(sequence++,{x:0,y:0},{x:1,y:1},ids[key]);e.name=name;e.parentUuid=parent?.uuid??null
    e.removeComponent('ShapeRenderer2D');e.removeComponent('RigidBody2D');const collider=e.getCollider();if(collider)e.removeComponent(collider.kind)
    const rect=e.addComponent(new c.RectTransform());Object.assign(rect,{anchorPreset:'top-left',pivot:{x:0,y:0},position,size})
    if(kind)e.addComponent(new c[kind]());p.physicsState.world.entities.push(e);return e
  }
  const root=entity('root','Input Canvas','Canvas');root.getComponent('Canvas').referenceSize={x:1000,y:500}
  const panel=entity('panel','Scrollable ownership panel','Panel',root,{x:60,y:60},{x:320,y:180})
  Object.assign(panel.getComponent('Panel'),{scrollVertical:true,contentSize:{x:320,y:700},scrollSpeed:42,clipChildren:true})
  const marker=entity('marker','Scroll marker','Text',panel,{x:10,y:90},{x:250,y:35});marker.getComponent('Text').text='Scroll marker'
  const counter=entity('counter','Wheel Readout','Text',root,{x:430,y:40},{x:540,y:45});counter.getComponent('Text').text='Wheel 0 Key 0 Tick 0'
  const textInput=entity('input','Native ownership input','TextInput',root,{x:450,y:150},{x:300,y:50});textInput.getComponent('RectTransform').focusable=true;textInput.getComponent('RectTransform').skipNavigation=false
  const controller=new box.BoxEntity(sequence++,{x:0,y:0},{x:1,y:1},ids.controller);controller.name='Wheel Controller'
  const source='@export(type="int") let wheel_count = 0;\n@export(type="int") let key_count = 0;\n@export(type="int") let tick_count = 0;\nfn update(dt) {\n  tick_count += 1;\n  if input_axis("OwnedWheel") != 0.0 { wheel_count += 1; }\n  if input_pressed("OwnedKey") { key_count += 1; }\n  ui_set_text_on(find_entity_handle("Wheel Readout"), `Wheel ${wheel_count} Key ${key_count} Tick ${tick_count}`);\n}\n'
  const runtime=new wasm.module.WasmScriptRuntime();try{const validation=JSON.parse(runtime.validate(source));assert.ok(Array.isArray(validation)&&validation.length===3,JSON.stringify(validation))}finally{runtime.free()}
  controller.addComponent(new c.Script2D()).scriptAsset='asset://'+assets.createTextAsset('Wheel ownership script','script',source,'Assets/Scripts').uuid
  p.physicsState.world.entities.push(controller)
  const fontBytes=await readFile('node_modules/@fontsource-variable/nunito-sans/files/nunito-sans-latin-wght-normal.woff2'),font=assets.createTextAsset('Ownership font','resource','{}','Assets')
  Object.assign(font,{assetType:'font',path:'Assets/Ownership font.woff2',mimeType:'font/woff2',source:'data:font/woff2;base64,'+fontBytes.toString('base64'),byteLength:fontBytes.length,fontFamily:'Ownership audit font'})
  p.physicsState.inputMap.push(input.createInputAction('OwnedWheel','axis',[input.createInputBinding('mouse-wheel','y')]),input.createInputAction('OwnedKey','button',[input.createInputBinding('physical-key','KeyJ')]))
  const document=p.getSceneJSON(),validation=opened.modules.projectData.validateProjectDocument(document);assert.equal(validation.valid,true,JSON.stringify(validation.issues))
  await mkdir(join(process.cwd(),'.cache'),{recursive:true});await writeFile(fixture,document)
} finally {await opened.close()}
if(process.argv.includes('--fixture-only')) process.exit(0)

await withBrowserAudit({release:'26.34',name:'input-user',qualifyRelease:false,expectedRelease:JSON.parse(await readFile('package.json','utf8')).version.split('.').slice(0,2).join('.'),width:1600,height:1000},async a=>{
  const u=worldUserControls17(a),node=key=>`[data-ui-uuid="${ids[key]}"]`
  const read=async()=>{
    const label=await a.evaluate(`document.querySelector(${JSON.stringify(node('counter'))})?.getAttribute('aria-label')`)
    assert.match(label??'',/^Wheel \d+ Key \d+ Tick \d+$/,'Authored Rhai readout must be present')
    const [wheel,key,tick]=label.match(/\d+/g).map(Number);return{wheel,key,tick}
  }
  const aliveAfter=async before=>{await a.until(`Number(document.querySelector(${JSON.stringify(node('counter'))})?.getAttribute('aria-label')?.match(/Tick (\\d+)/)?.[1])>${before.tick+2}`,20000);return read()}
  const wheel=async at=>{await a.client.send('Input.dispatchMouseEvent',{type:'mouseWheel',...at,deltaX:0,deltaY:120});await wait(100)}
  const bare=async()=>a.evaluate("(()=>{const r=document.querySelector('.overlay-canvas').getBoundingClientRect();return{x:r.x+r.width*.92,y:r.y+r.height*.85}})()")
  const clickPoint=async at=>{await a.client.send('Input.dispatchMouseEvent',{type:'mousePressed',...at,button:'left',clickCount:1});await a.client.send('Input.dispatchMouseEvent',{type:'mouseReleased',...at,button:'left',clickCount:1});await wait(100)}
  const evidenceFixture=join(a.evidence,'v26.34-input-ownership-fixture.nova');await writeFile(evidenceFixture,await readFile(fixture))
  await u.open(evidenceFixture);await u.entity('Wheel Controller');await u.workspace('Debug')
  await a.check('Authored project starts real Rhai input counters through normal Play',async()=>{
    await a.click('.actionbar button',0);await a.until(`Number(document.querySelector(${JSON.stringify(node('counter'))})?.getAttribute('aria-label')?.match(/Tick (\\d+)/)?.[1])>3`,30000)
    const current=await read();assert.equal(current.wheel,0);assert.equal(current.key,0);await a.capture('running-counter')
    a.observations.push({name:'fixture',file:evidenceFixture,scope:'Normal project chooser, authored Canvas/scrollable Panel/TextInput and Rhai input_axis/input_pressed callbacks',initial:current})
  })
  await a.check('Scrollable game Panel moves its child without activating gameplay wheel',async()=>{
    const before=await read(),top=await a.evaluate(`document.querySelector(${JSON.stringify(node('marker'))}).getBoundingClientRect().top`)
    await wheel(await a.point(node('panel')));const after=await aliveAfter(before),nextTop=await a.evaluate(`document.querySelector(${JSON.stringify(node('marker'))}).getBoundingClientRect().top`)
    assert.ok(nextTop<top-1,JSON.stringify({top,nextTop}));assert.equal(after.wheel,before.wheel);assert.equal(after.key,before.key)
    a.observations.push({name:'consumed-panel-wheel',before,after,markerTopBefore:top,markerTopAfter:nextTop});await a.capture('panel-wheel-consumed')
  })
  await a.check('Bare Game canvas wheel reaches the named action exactly once',async()=>{
    const before=await read();await wheel(await bare());await a.until(`Number(document.querySelector(${JSON.stringify(node('counter'))})?.getAttribute('aria-label')?.match(/Wheel (\\d+)/)?.[1])===${before.wheel+1}`)
    const after=await aliveAfter(before);assert.equal(after.wheel,before.wheel+1);a.observations.push({name:'bare-canvas-wheel',before,after})
  })
  await a.check('Native game TextInput owns wheel and typed keys',async()=>{
    await clickPoint(await a.point(node('input')));await a.until("!!document.querySelector('.native-ui-input')")
    const before=await read();await wheel(await a.point('.native-ui-input'));await a.press('j',0,100);const after=await aliveAfter(before)
    assert.equal(after.wheel,before.wheel);assert.equal(after.key,before.key)
    await a.client.send('Input.insertText',{text:'Owned native field'});assert.ok((await a.evaluate("document.querySelector('.native-ui-input').value")).includes('Owned native field'))
    await a.capture('native-input-owned');await clickPoint(await bare());await a.until("!document.querySelector('.native-ui-input')")
  })
  await a.check('Inspector and Design canvas wheel remain excluded while Play continues',async()=>{
    const before=await read();await u.entity('Wheel Controller');await u.expandInspector()
    const numeric='[data-property-path="Transform.position"] input';await a.until(`!!document.querySelector(${JSON.stringify(numeric)})`)
    await wheel(await a.point(numeric));await wheel(await a.point('.workspace-list button svg'));await wheel(await bare());await u.workspace('Debug');await a.until(`!!document.querySelector(${JSON.stringify(node('counter'))})`)
    const after=await aliveAfter(before);assert.equal(after.wheel,before.wheel);assert.equal(after.key,before.key)
    a.observations.push({name:'design-editor-wheel-excluded',before,after})
  })
  await a.check('Returning to Game restores bare wheel and leaves keyboard gameplay unchanged',async()=>{
    await clickPoint(await bare());const before=await read();await wheel(await bare());await a.press('j',0,120)
    await a.until(`Number(document.querySelector(${JSON.stringify(node('counter'))})?.getAttribute('aria-label')?.match(/Key (\\d+)/)?.[1])===${before.key+1}`)
    const after=await aliveAfter(before);assert.equal(after.wheel,before.wheel+1);assert.equal(after.key,before.key+1)
    a.observations.push({name:'game-design-game-routing',before,after,surfaces:await a.evaluate("[...document.querySelectorAll('[data-game-input-surface]')].map(e=>({label:e.getAttribute('aria-label'),visible:!!e.getBoundingClientRect().width&&!!e.getBoundingClientRect().height}))")});await a.capture('returned-game-wheel-and-key')
  })
  await a.click('.actionbar button',3);await a.until("document.querySelector('.actionbar button:nth-child(4)').disabled")
  await a.check('Profiler evidence visibly separates estimates from measured budgets',async()=>{
    await a.click('[data-panel-maximize="bottom"]');await a.until("document.querySelector('[data-panel-maximize=bottom]')?.getAttribute('aria-pressed')==='true'")
    await a.until("!!document.querySelector('.production-panel .settings-card')")
    await a.evaluate("document.querySelector('.production-panel .settings-card').scrollIntoView({block:'center'})")
    const traceText=await a.evaluate("document.querySelector('.production-panel').innerText");assert.ok(traceText.includes('Estimated profiler overhead'));assert.ok(traceText.includes('Planning estimate only'))
    assert.ok(traceText.includes('Input to CPU submission'));await a.capture('profiler-estimate-and-cpu-scope')
    await a.click('.production-panel .metrics-card button[aria-label="Capture"]');await a.clickText('.production-panel .ui-tabs button','Memory & lifetimes',true)
    await a.until("!!document.querySelector('[data-audit=performance-evidence]')")
    await a.evaluate("document.querySelector('[data-audit=performance-evidence]').scrollIntoView({block:'center'})")
    const evidence=await a.evaluate("document.querySelector('[data-audit=performance-evidence]').innerText")
    assert.ok(evidence.includes('unavailable telemetry and estimates are not certified'));assert.match(evidence,/profiler\.overhead · Estimated/)
    const geometry=await a.evaluate("(()=>{const e=document.querySelector('[data-audit=performance-evidence]'),r=e.getBoundingClientRect(),p=e.closest('.card').getBoundingClientRect();return{left:r.left,right:r.right,hostLeft:p.left,hostRight:p.right,width:r.width,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}})()")
    assert.ok(geometry.left>=geometry.hostLeft-2&&geometry.right<=geometry.hostRight+2&&geometry.scrollWidth<=geometry.clientWidth+2,JSON.stringify(geometry));a.observations.push({name:'profiler-current-evidence',text:evidence,geometry});await a.capture('profiler-capture-status')
  })
  await a.check('Imported font availability note is visible beside supported and metadata controls',async()=>{
    await u.bottom('assets','Assets');await a.clickText('.asset-grid article','Ownership font')
    if(await a.evaluate("!!document.querySelector('.asset-detail-toggle')?.getBoundingClientRect().width"))await a.click('.asset-detail-toggle')
    await a.clickText('.importer-tabs button','Import',true);await a.until("!!document.querySelector('[data-audit=font-rendering-availability]')")
    await a.evaluate("document.querySelector('[data-audit=font-rendering-availability]').scrollIntoView({block:'center'})")
    const notice=await a.evaluate("document.querySelector('[data-audit=font-rendering-availability]').innerText");assert.ok(notice.includes('saved import metadata'));assert.ok(notice.includes('do not change rendering yet'))
    const geometry=await a.evaluate("(()=>{const e=document.querySelector('[data-audit=font-rendering-availability]'),r=e.getBoundingClientRect(),p=e.closest('.asset-inspector').getBoundingClientRect();return{left:r.left,right:r.right,hostLeft:p.left,hostRight:p.right,width:r.width,height:r.height,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}})()")
    assert.ok(geometry.width>100&&geometry.height>12&&geometry.left>=geometry.hostLeft-2&&geometry.right<=geometry.hostRight+2&&geometry.scrollWidth<=geometry.clientWidth+2,JSON.stringify(geometry));a.observations.push({name:'font-availability-note',text:notice,geometry});await a.capture('font-metadata-availability')
  })
})
