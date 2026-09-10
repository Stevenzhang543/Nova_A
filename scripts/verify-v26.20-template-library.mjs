import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
const { withBrowserAudit, wait } = await import(pathToFileURL(resolve('scripts/lib/browserUserAudit.mjs')).href)
const root = resolve(process.env.NOVA_AUDIT_ROOT || process.cwd())
const captureRoot = resolve(process.env.NOVA_TEMPLATE_PREVIEWS || join(root,'release-audits/v26.20-template-previews'))
const only = process.env.NOVA_TEMPLATE_IDS?.split(',')
const discoveryOnly = process.env.NOVA_TEMPLATE_DISCOVERY_ONLY === '1'
if(process.argv.includes('--qualification'))assert.ok(!only&&!discoveryOnly,'Qualification must execute all40 starters')
await mkdir(captureRoot, { recursive: true })
await withBrowserAudit({release:'26.20',name:'template-library',root,development:process.env.NOVA_AUDIT_DEVELOPMENT==='1',expectedRelease:process.env.NOVA_AUDIT_EXPECTED_RELEASE || '26.20',width:1600,height:1000}, async audit => {
  const {evaluate,until,click,clickText,client,observations,check} = audit
  const fill=async(selector,value)=>{await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);await wait(60);await audit.fill(selector,value)}
  const webSockets=[]; client.on('Network.webSocketCreated',e=>webSockets.push(e.url)); await client.send('Network.enable')
  await until("document.querySelectorAll('[data-template-id]').length===40")
  const ids=await evaluate("[...document.querySelectorAll('[data-template-id]')].map(e=>e.dataset.templateId)")
  await check('Localized requirements, controls/results, search reset, preview and real help navigation',async()=>{
    for(const locale of ['en','de','zh']){
      await audit.select('.manager-header select',locale)
      await click('[data-template-id="networked-optional"]')
      const text=await evaluate("document.querySelector('.template-details').innerText")
      assert.match(text,/WebSocket/);assert.match(text,/127\.0\.0\.1:7777/)
      for(let index=0;index<2;index++){
        await click('.template-help button',index);await until("!!document.querySelector('.manual-viewer iframe')")
        await until("(()=>{const f=document.querySelector('.manual-viewer iframe');try{const d=f.contentDocument,id=decodeURIComponent(f.contentWindow.location.hash.slice(1)),e=d?.getElementById(id);return !!e&&e.getBoundingClientRect().height>0}catch{return false}})()",20000)
        const target=await evaluate("(()=>{const f=document.querySelector('.manual-viewer iframe');return{hash:f.contentWindow.location.hash,lang:f.contentDocument.documentElement.lang}})()")
        assert.equal(target.lang,locale==='zh'?'zh-CN':locale);observations.push({manual:target,locale,index})
        await click('.manual-viewer button.close');await until("!document.querySelector('.manual-viewer')")
      }
      const term=locale==='de'?'Zwei lokale Spieler':locale==='zh'?'本地双人':'two local players'
      await fill('.template-library-tools input[type="search"]',term)
      assert.deepEqual(await evaluate("[...document.querySelectorAll('[data-template-id]')].map(e=>e.dataset.templateId)"),['pong'])
      await fill('.template-library-tools input[type="search"]','no-such-capability-2615')
      assert.equal(await evaluate("document.querySelector('.create-button').disabled"),true)
      assert.equal(await evaluate("document.querySelectorAll('[data-template-id]').length"),0)
      await click('.template-results button');await until("document.querySelectorAll('[data-template-id]').length===40")
      await click('[data-template-id="platformer"]')
      await until("document.querySelector('[data-template-id=platformer] img').naturalWidth>0")
      for(const width of [720,390]){
        await audit.viewport(width,900)
        await click('[data-template-id="platformer"]')
        const layout=await evaluate("(()=>{const root=document.querySelector('.project-manager'),elements=[...document.querySelectorAll('.template-details,.template-instructions p,.template-help button,.template-library-tools input,.template-library-tools select')];return{viewport:innerWidth,pageWidth:root.scrollWidth,bad:elements.filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>({tag:e.tagName,text:e.innerText,width:e.clientWidth,scroll:e.scrollWidth}))}})()")
        assert.ok(layout.pageWidth<=layout.viewport+2,JSON.stringify(layout));assert.deepEqual(layout.bad,[],JSON.stringify(layout))
        observations.push({locale,width,layout})
      }
      await audit.viewport(1600,1000)
    }
    await audit.select('.manager-header select','en');await click('.template-results button');await audit.capture('library-discovery')
  })
  if(discoveryOnly)return

  assert.equal(new Set(ids).size,40)
  for (const id of ids.filter(id=>!only||only.includes(id))) {
    await check(`${id}: select visible launcher card, create, Play, rendered output, Console, Stop`,async()=>{
      await until("!!document.querySelector('.project-manager')")
      await fill('.creation-card header input',`Library ${id}`)
      await click(`[data-template-id="${id}"]`)
      assert.equal(await evaluate(`document.querySelector('[data-template-id="${id}"]').getAttribute('aria-pressed')`),'true')
      const title=await evaluate(`document.querySelector('[data-template-id="${id}"] strong').textContent`)
      await until(`document.querySelector('[data-template-id="${id}"] img').naturalWidth>0`)
      const instructions=await evaluate("[...document.querySelectorAll('.template-instructions p')].map(e=>e.textContent)")
      assert.equal(instructions.length,2);assert.ok(instructions.every(text=>text.length>10))
      await click('.create-button'); await until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')",30000)
      await wait(320)
      if(await evaluate("!!document.querySelector('.onboarding-scrim')")){await clickText('button','Skip for now');await until("!document.querySelector('.onboarding-scrim')")}
      await clickText('.workspace-list button','Debug'); await until("!!document.querySelector('.game-view .canvas-container')")
      await clickText('.panel-tabs .panel-tab','Console'); await until("!!document.querySelector('.console-panel')")
      const socketBefore=webSockets.length
      await click('.actionbar button',0);await until("document.querySelector('.actionbar button').classList.contains('active')",15000)
      await click('.actionbar .mode-label');await wait(1500)
      const errors=await evaluate("[...document.querySelectorAll('.console-panel .log-entry.error,.console-panel .log-entry.fatal')].map(e=>e.textContent)")
      const output=await evaluate("[...document.querySelectorAll('.console-panel .log-entry')].map(e=>e.textContent)")
      assert.deepEqual(errors,[],`${id} runtime Console errors`)
      assert.ok(output.some(text=>/running/i.test(text)),`${id} must report actual running simulation`)
      if(id==='networked-optional')assert.deepEqual(webSockets.slice(socketBefore),[],'Offline default must not open a hidden server connection')
      const clip=await evaluate("(()=>{const e=document.querySelector('.game-view .canvas-container'),r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()")
      assert.ok(clip.width>200&&clip.height>150,'Game output must have a usable visible area')
      const frame=await client.send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:false})
      const pixels=await evaluate(`(async()=>{const image=await createImageBitmap(await(await fetch('data:image/png;base64,${frame.data}')).blob()),canvas=new OffscreenCanvas(image.width,image.height),context=canvas.getContext('2d');context.drawImage(image,0,0);const data=context.getImageData(0,0,image.width,image.height).data,counts=new Map();let dominant=0;for(let at=0;at<data.length;at+=4){const color=(data[at]<<16)|(data[at+1]<<8)|data[at+2],count=(counts.get(color)||0)+1;counts.set(color,count);if(count>dominant)dominant=count}image.close();return{nonDominant:canvas.width*canvas.height-dominant,colors:counts.size}})()`)
      if(id==='empty')assert.equal(pixels.nonDominant,0,'The blank starter intentionally has empty Game output')
      else assert.ok(pixels.nonDominant>500,`${id} must render visible starter content, not just allocate a canvas`)

      await writeFile(join(captureRoot,`${id}.png`),Buffer.from(frame.data,'base64'))
      await audit.capture('runtime-'+id)
      const rendered=await evaluate("(()=>{const c=document.querySelector('.game-view .render-canvas');return{width:c.width,height:c.height}})()")
      assert.ok(rendered.width>0&&rendered.height>0)
      observations.push({id,title,instructions,preview:`${id}.png`,capture:'Actual visible running Game viewport; no generated artwork or application-state injection',rendered,pixels,output,webSockets:webSockets.slice(socketBefore)})
      if(id==='top-down'||id==='tile-world'){
        await clickText('.workspace-list button','Design');await wait(250);await clickText('.entity-list .entity-item .name','Player')
        const positions=()=>evaluate("[...document.querySelectorAll('[data-property-path=\"Transform.position\"] input')].map(e=>Number(e.value))")
        await until("document.querySelectorAll('[data-property-path=\"Transform.position\"] input').length===2")
        await click('.actionbar .mode-label');const before=await positions();await audit.press('w',0,240);const up=await positions();assert.ok(up[1]>before[1]+.3,`${id}: W must move up`)
        await audit.press('s',0,240);const down=await positions();assert.ok(down[1]<up[1]-.3,`${id}: S must move down`)
        observations.push({id,input:'actual W/S with live Inspector',before,up,down})
        await click('.actionbar button',3);await until("document.querySelectorAll('.actionbar button')[3].disabled");assert.deepEqual(await positions(),[0,0],'Stop restores authored position')
      }else{await click('.actionbar button',3);await until("document.querySelectorAll('.actionbar button')[3].disabled")}
      await clickText('.menu-container>.menu-item>button','File',true);await clickText('.dropdown button','Project Manager',true)
      await until("!!document.querySelector('.project-manager')")
    })
  }
})
