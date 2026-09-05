import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'

await withBrowserAudit({release:'26.13',name:'project-authoring'},async audit=>{
  const {click,clickText,fill,press,until,evaluate,client,check,capture,observations,evidence}=audit
  const eventName='Retained project event 中文',artifact=join(evidence,'v26.13-authoring-project.nova')
  const fileMenu=async label=>{await click('.menu-item>button',0);await clickText('.menu-item .dropdown button',label)}
  const launcher=async()=>{await fileMenu('Project Manager');await until("!!document.querySelector('.project-manager')");await wait(150)}
  const events=async()=>{await clickText('.workspace-list button','Script');await until("!!document.querySelector('.script-workspace')");await click('#logic-events-tab');await until("!!document.querySelector('.event-studio')");await wait(200)}
  const newProject=async name=>{await fill('.creation-card header input',name);await click('[data-template-id="empty"]');await click('.create-button')}
  await check('Create an Event Sheet and edit a named handler through visible controls',async()=>{
    assert.ok(await evaluate(`document.body.innerText.includes(${JSON.stringify(audit.expectedRelease)})`));await newProject('26.13 Draft Departure');await until("!!document.querySelector('.editor-root')",30000)
    if(await evaluate("!!document.querySelector('.onboarding-scrim')")){await clickText('button','Skip for now');await until("!document.querySelector('.onboarding-scrim')")}
    await events();await click('.sheet-browser>header button');await until("document.querySelectorAll('.event-list article').length>0");await fill('.event-copy input',eventName);await until("!document.querySelector('.sheet-toolbar button.primary').disabled");await capture('dirty-events')
  })
  await check('The launcher retains the draft and shows a real replacement decision',async()=>{
    await launcher();await newProject('Replacement must wait');await until("!!document.querySelector('.confirm-card')");assert.ok((await evaluate("document.querySelector('.confirm-card').innerText")).includes('Unsaved authoring drafts'))
    for(let n=0;n<12;n++){await press('Tab',n%2?8:0);assert.equal(await evaluate("!!document.activeElement.closest('.confirm-card')"),true,'Confirmation contains both Tab directions')}
    await capture('replacement-decision');await click('.confirm-actions .secondary');await until("!document.querySelector('.confirm-card')&&!document.querySelector('.create-button').disabled");assert.ok(await evaluate("!!document.querySelector('.project-manager')"))
  })
  await check('Cancel and Continue current project restore the exact unsaved handler',async()=>{
    await clickText('.quick-actions button','Continue');await until("!!document.querySelector('.editor-root')");await events();await until(`document.querySelector('.event-copy input')?.value===${JSON.stringify(eventName)}`);assert.equal(await evaluate("document.querySelector('.sheet-toolbar button.primary').disabled"),false);await click('.sheet-toolbar button.primary');await until("document.querySelector('.sheet-toolbar button.primary').disabled");await capture('saved-events')
  })
  await check('Save Project downloads the validated Event Sheet and its exact handler name',async()=>{
    const downloads=join(audit.profile,'downloads');await mkdir(downloads,{recursive:true});await client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true});await fileMenu('Save Project')
    let saved;const deadline=Date.now()+30000;while(!saved&&Date.now()<deadline){try{saved=await readFile(join(downloads,'project.nova'));JSON.parse(saved.toString())}catch{saved=null;await wait(100)}}assert.ok(saved,'Save Project must deliver parseable bytes');await writeFile(artifact,saved)
    const project=JSON.parse(saved.toString()),sheet=project.assets.find(value=>value.assetType==='eventSheet');assert.ok(sheet);const comma=sheet.source.indexOf(','),source=sheet.source.slice(0,comma).includes(';base64')?Buffer.from(sheet.source.slice(comma+1),'base64').toString():decodeURIComponent(sheet.source.slice(comma+1));assert.ok(JSON.parse(source).handlers.some(value=>value.name===eventName));observations.push({artifact,bytes:saved.length,sha256:createHash('sha256').update(saved).digest('hex'),eventName})
  })
  await check('Reload and reopen the actual downloaded project through the file picker',async()=>{
    await client.send('Page.reload');await until("!!document.querySelector('.project-manager')",30000);let chooser;const stop=client.on('Page.fileChooserOpened',event=>chooser=event);await client.send('Page.setInterceptFileChooserDialog',{enabled:true});await clickText('.quick-actions button','Open Project');const deadline=Date.now()+10000;while(!chooser&&Date.now()<deadline)await wait(50);assert.ok(chooser,'Open Project must open its file picker');await client.send('DOM.setFileInputFiles',{files:[artifact],backendNodeId:chooser.backendNodeId});stop();await until("!!document.querySelector('.upgrade-dialog')",30000);await click('.upgrade-dialog footer button.primary');await until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')",30000);await events();await until(`document.querySelector('.event-copy input')?.value===${JSON.stringify(eventName)}`);assert.equal(await evaluate("document.querySelector('.sheet-toolbar button.primary').disabled"),true);await capture('reopened-events')
  })
  await check('Explicit discard replaces the project and cannot resurrect its old Event Sheet',async()=>{
    await fill('.event-copy input','Discard this pending change');await until("!document.querySelector('.sheet-toolbar button.primary').disabled");await launcher();await newProject('Fresh project after discard');await until("!!document.querySelector('.confirm-card')");await click('.confirm-actions .danger');await until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')",30000);await events();assert.equal(await evaluate("document.querySelectorAll('.sheet-browser>button').length"),0);assert.equal(await evaluate("document.body.innerText.includes('Discard this pending change')"),false);await capture('discarded-new-project')
  })
})
