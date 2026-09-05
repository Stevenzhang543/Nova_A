import assert from 'node:assert/strict'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'

await withBrowserAudit({release:'26.13',name:'studio-authoring'},async audit=>{
  const {evaluate,until,click,clickText,press,fill,capture,check,viewport,client,observations}=audit
  const source='// Retain this comment through layout and wiring.\nfn start() { let values = [1, 2]; if values[0] > 0 { log_info(values[1]); } }\n'
  const setCode=async text=>{await evaluate("(()=>{const e=document.querySelector('.editor-shell textarea');e.focus();e.select()})()");await client.send('Input.insertText',{text});await evaluate("document.querySelector('.editor-shell textarea').blur()");await wait(250)}
  const commands=async(label,graph=true)=>{const menu=graph?'.graph-more':'.studio-more';if(!await evaluate(`document.querySelector(${JSON.stringify(menu)}).open`))await click(menu+'>summary');await clickText(menu+' button',label);if(await evaluate(`document.querySelector(${JSON.stringify(menu)}).open`))await click(menu+'>summary')}
  const graphPositions=()=>evaluate("Object.fromEntries([...document.querySelectorAll('.graph-node')].map(e=>[e.dataset.nodeUuid,{x:parseFloat(e.style.left),y:parseFloat(e.style.top)}]))")
  const graphView=()=>evaluate("document.querySelector('.nodes-layer').style.transform")
  const showNode=async type=>{if(await evaluate("!!document.querySelector('.open-details')"))await click('.open-details');await fill('.graph-symbol-search input',type);await until("document.querySelectorAll('.graph-symbol-search button').length>0");await click('.graph-symbol-search button');await wait(180)}
  const focus=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).focus({preventScroll:true})`)
  const graphUndo=async()=>{await focus('.graph-editor');await press('z',2);await wait(350)}
  await check('Create a disposable project and source script through real controls',async()=>{
    await fill('.creation-card header input','26.13 Studio Development Audit');await click('[data-template-id="empty"]');await click('.create-button');await until("!!document.querySelector('.editor-root')",30000);await wait(300)
    if(await evaluate("!!document.querySelector('.onboarding-scrim')")){await evaluate("document.querySelector('.onboarding-scrim').focus()");await press('Escape');await until("!document.querySelector('.onboarding-scrim')")}
    await clickText('.workspace-list button','Script');await until("!!document.querySelector('.script-studio')");await evaluate("[...document.querySelectorAll('.toolbar-actions button')].find(e=>e.textContent.toLowerCase().includes('new script')).focus()");await press('Enter');await until("!!document.querySelector('.editor-shell textarea')");await setCode(source)
    assert.ok((await evaluate("document.querySelector('.editor-status').textContent")).includes(audit.expectedRelease))
  })
  await check('Unsaved source survives a real workspace unmount and return',async()=>{
    await clickText('.workspace-list button','Design');await until("!document.querySelector('.script-workspace')");await clickText('.workspace-list button','Script');await until("!!document.querySelector('.editor-shell textarea')");await wait(250)
    assert.equal(await evaluate("document.querySelector('.editor-shell textarea').value"),source);assert.equal(await evaluate("document.querySelector('.toolbar-actions>button.primary').disabled"),false)
  })
  await check('Narrow code view retains editor height and restores responsive explorer selection',async()=>{
    await viewport(1024,640)
    await until("document.querySelector('.editor-shell textarea').getBoundingClientRect().width>=350")
    const before=await evaluate("({height:document.querySelector('.editor-shell textarea').getBoundingClientRect().height,width:document.querySelector('.editor-shell textarea').getBoundingClientRect().width,toolbar:document.querySelector('.studio-toolbar').getBoundingClientRect().height})")
    assert.ok(before.height>=120,JSON.stringify(before));assert.ok(before.width>=350,JSON.stringify(before));observations.push({name:'code-1024x640',...before})
    await clickText('.toolbar-actions>button','Show explorer');await until("document.querySelector('.project-scripts').getBoundingClientRect().width>0")
    assert.equal(await evaluate("document.querySelector('.studio-inspector').getBoundingClientRect().width"),0)
    const separator='.project-scripts [role="separator"]',width=await evaluate("document.querySelector('.project-scripts').getBoundingClientRect().width")
    await focus(separator);await press('ArrowRight');await wait(150);assert.ok(await evaluate("document.querySelector('.project-scripts').getBoundingClientRect().width")>width)
    await viewport(1440,900);await until("document.querySelector('.studio-inspector').getBoundingClientRect().width>0")
    await capture('code-wide')
  })
  await check('Bottom inspector resizes by keyboard and code focus restores preferred panes',async()=>{
    await commands('Dock detail below',false);await until("document.querySelector('.studio-grid').classList.contains('detail-bottom')")
    const old=await evaluate("document.querySelector('.studio-inspector').getBoundingClientRect().height")
    await focus('.studio-inspector [role="separator"][aria-orientation="horizontal"]');await press('ArrowUp');await wait(150);assert.ok(await evaluate("document.querySelector('.studio-inspector').getBoundingClientRect().height")>old)
    await click('.toolbar-actions>button[aria-pressed]');assert.equal(await evaluate("document.querySelector('.studio-inspector').getBoundingClientRect().height"),0)
    await click('.toolbar-actions>button[aria-pressed]');assert.ok(await evaluate("document.querySelector('.studio-inspector').getBoundingClientRect().height")>old)
    await commands('Dock detail right',false);await viewport(1024,640);await capture('code-narrow');await viewport(1440,900)
  })
  await check('Convert source into typed cards with visible keyboard-accessible pins',async()=>{
    await click('.logic-mode button',1);await until("document.querySelectorAll('[data-node-type^=\"rhai.\"]').length>10")
    await until("document.querySelector('.graph-editor').dataset.initialLayout==='complete'");await until("document.querySelector('.graph-canvas').getAttribute('aria-busy')!=='true'");const overlaps=await evaluate("(()=>{const nodes=[...document.querySelectorAll('.graph-node')].map(e=>({uuid:e.dataset.nodeUuid,r:e.getBoundingClientRect()})),hits=[];for(let a=0;a<nodes.length;a++)for(let b=a+1;b<nodes.length;b++){const x=nodes[a].r,y=nodes[b].r;if(x.left<y.right-1&&x.right>y.left+1&&x.top<y.bottom-1&&x.bottom>y.top+1)hits.push([nodes[a].uuid,nodes[b].uuid])}return hits})()");assert.deepEqual(overlaps,[],'First measured arrangement must separate every rendered node')
    await showNode('FunctionDeclaration')
    const geometry=await evaluate("(()=>{const node=document.querySelector('[data-node-type=\"rhai.FunctionDeclaration\"]'),header=node.querySelector('header'),pin=node.querySelector('.pin-dot');return{radius:getComputedStyle(node).borderRadius,header:header.clientHeight,content:header.scrollHeight,pin:getComputedStyle(pin).display,pinWidth:pin.getBoundingClientRect().width}})()")
    assert.notEqual(geometry.radius,'999px');assert.ok(geometry.header>=geometry.content-1,JSON.stringify(geometry));assert.notEqual(geometry.pin,'none');assert.ok(geometry.pinWidth>0)
    observations.push({name:'typed-card',...geometry})
  })
  await check('Measured full layout preserves selected identity and viewport and is one Undo operation',async()=>{
    const moved=await audit.point('[data-node-type="rhai.FunctionDeclaration"] header strong');await client.send('Input.dispatchMouseEvent',{type:'mousePressed',...moved,button:'left',clickCount:1});await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:moved.x+35,y:moved.y+22,button:'left',buttons:1});await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:moved.x+35,y:moved.y+22,button:'left',clickCount:1});await wait(200)
    const positions=await graphPositions(),view=await graphView(),selected=await evaluate("[...document.querySelectorAll('.graph-node.selected')].map(e=>e.dataset.nodeUuid)")
    await commands('Arrange all nodes');await until("!document.querySelector('.graph-layout-status')?.textContent.includes('Arranging nodes')");await wait(700)
    const arranged=await graphPositions();assert.notDeepEqual(arranged,positions);assert.equal(await graphView(),view);assert.deepEqual(await evaluate("[...document.querySelectorAll('.graph-node.selected')].map(e=>e.dataset.nodeUuid)"),selected)
    await graphUndo();assert.deepEqual(await graphPositions(),positions)
    await focus('.graph-editor');await press('z',10);await wait(500);assert.deepEqual(await graphPositions(),arranged)
    await commands('Frame all');await wait(200);await capture('graph-wide')
  })
  await check('Selected layout leaves every unselected position unchanged',async()=>{
    const nodes=await evaluate("[...document.querySelectorAll('.graph-node')].slice(0,2).map(e=>e.dataset.nodeUuid)")
    for(let index=0;index<nodes.length;index++){const point=await audit.point(`[data-node-uuid="${nodes[index]}"] header strong`);await client.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1,modifiers:index?2:0});await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1,modifiers:index?2:0})}
    const selection=await evaluate("[...document.querySelectorAll('.graph-node.selected')].map(e=>e.dataset.nodeUuid)");assert.equal(selection.length,2)
    const before=await graphPositions(),view=await graphView();await commands('Arrange selected nodes');await wait(700);const after=await graphPositions()
    for(const [uuid,position] of Object.entries(before))if(!selection.includes(uuid))assert.deepEqual(after[uuid],position)
    assert.equal(await graphView(),view);assert.deepEqual(await evaluate("[...document.querySelectorAll('.graph-node.selected')].map(e=>e.dataset.nodeUuid)"),selection)
  })
  await check('Actual keyboard pin activation replaces a compatible structural connection',async()=>{
    await showNode('FunctionDeclaration');const total=await evaluate("document.querySelectorAll('.wire-hit').length")
    await focus('[data-node-type="rhai.FunctionDeclaration"] .node-pin.output .pin-dot');await press('Enter');await wait(200)
    const pinState=await evaluate("({active:document.activeElement?.outerHTML,pins:[...document.querySelectorAll('.pin-dot[aria-pressed=\"true\"]')].map(e=>e.outerHTML),message:document.querySelector('.wire-inspector')?.textContent})")
    assert.ok(pinState.pins.length>0,JSON.stringify(pinState))
    await showNode('rhai.Program');await focus('[data-node-type="rhai.Program"] .node-pin.input .pin-dot');await press('Enter');await wait(400)
    assert.equal(await evaluate("document.querySelectorAll('.wire-hit').length"),total);assert.ok((await evaluate("document.querySelector('.wire-inspector').textContent")).includes('Pins connected'))
  })
  let routeBeforeSave
  await check('Wire route edits affect real paths, reject invalid coordinates and undo precisely',async()=>{
    await clickText('.wire-inspector button','Add routing point');await until("!!document.querySelector('.reroute-row input')")
    const old=await evaluate("[...document.querySelectorAll('.reroute-row input')].map(e=>Number(e.value))"),changed=old[0]+75
    await fill('.reroute-row input',changed);assert.equal(await evaluate("Number(document.querySelector('.reroute-row input').value)"),changed)
    await graphUndo();assert.deepEqual(await evaluate("[...document.querySelectorAll('.reroute-row input')].map(e=>Number(e.value))"),old)
    await fill('.reroute-row input',1000001);assert.equal(await evaluate("Number(document.querySelector('.reroute-row input').value)"),old[0]);assert.ok((await evaluate("document.querySelector('.wire-inspector').textContent")).includes('finite'))
    await fill('.reroute-row input',changed);await focus('.wire-point');await press('ArrowRight');await wait(200);assert.equal(await evaluate("Number(document.querySelector('.reroute-row input').value)"),changed+8)
    routeBeforeSave=await evaluate("({uuid:document.querySelector('.wire-inspector select').value,points:[...document.querySelectorAll('.reroute-row input')].map(e=>Number(e.value))})")
  })
  await check('Dirty graph, selection, viewport, route edits and Undo survive workspace unmount',async()=>{
    const positions=await graphPositions(),view=await graphView(),selected=await evaluate("[...document.querySelectorAll('.graph-node.selected')].map(e=>e.dataset.nodeUuid)");await clickText('.workspace-list button','Design');await until("!document.querySelector('.script-workspace')");await clickText('.workspace-list button','Script');await until("!!document.querySelector('.graph-editor')");await wait(800)
    assert.deepEqual(await graphPositions(),positions);assert.equal(await graphView(),view);assert.deepEqual(await evaluate("[...document.querySelectorAll('.graph-node.selected')].map(e=>e.dataset.nodeUuid)"),selected);assert.deepEqual(await evaluate("[...document.querySelectorAll('.reroute-row input')].map(e=>Number(e.value))"),routeBeforeSave.points);assert.equal(await evaluate("document.querySelectorAll('.primary-actions>button')[2].disabled"),false)
    await graphUndo();assert.notDeepEqual(await evaluate("[...document.querySelectorAll('.reroute-row input')].map(e=>Number(e.value))"),routeBeforeSave.points);await focus('.graph-editor');await press('z',10);await wait(400);assert.deepEqual(await evaluate("[...document.querySelectorAll('.reroute-row input')].map(e=>Number(e.value))"),routeBeforeSave.points)
  })
  await check('Cancel an actual node drag without changing positions or selection',async()=>{
    await showNode('FunctionDeclaration');const positions=await graphPositions(),point=await audit.point('[data-node-type="rhai.FunctionDeclaration"] header strong')
    await client.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+45,y:point.y+30,button:'left',buttons:1});await wait(80);await press('Escape');await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x+45,y:point.y+30,button:'left',clickCount:1});await wait(200)
    assert.deepEqual(await graphPositions(),positions)
  })
  await check('Save and reopen graph authoring preserves manual points and regenerates fixed-node routes',async()=>{
    await clickText('.primary-actions button','Save');await until("!document.querySelector('.graph-save-error')");await click('.logic-mode button',0);await until("!!document.querySelector('.editor-shell textarea')")
    assert.ok((await evaluate("document.querySelector('.editor-shell textarea').value")).includes('Retain this comment'));await click('.logic-mode button',1);await until("!!document.querySelector('.graph-editor')");await wait(900)
    if(await evaluate("!!document.querySelector('.open-details')"))await click('.open-details');if(!await evaluate("document.querySelector('.wire-inspector').open"))await click('.wire-inspector>summary')
    await focus('.wire-inspector select');const index=await evaluate(`Array.from(document.querySelector('.wire-inspector select').options).findIndex(o=>o.value===${JSON.stringify(routeBeforeSave.uuid)})`);assert.ok(index>0);await press('Home');for(let at=0;at<index;at++)await press('ArrowDown');await press('Enter');await press('Tab');await wait(200)
    assert.deepEqual(await evaluate("[...document.querySelectorAll('.reroute-row input')].map(e=>Number(e.value))"),routeBeforeSave.points)
    await until("document.querySelector('.graph-canvas').getAttribute('aria-busy')!=='true'",20000);const paths=await evaluate("[...document.querySelectorAll('.wire-hit')].map(e=>e.getAttribute('d')).filter(Boolean)");assert.ok(paths.length>0);assert.ok(paths.every(path=>!path.includes('C')),paths.join('\n'))
  })
  await check('Narrow graph leaves useful canvas width and retains access to both pane controls',async()=>{
    await viewport(1024,640);const canvasWidth=await evaluate("document.querySelector('.graph-canvas').getBoundingClientRect().width");assert.ok(canvasWidth>=400,canvasWidth)
    await click('.open-palette');assert.equal(await evaluate("document.querySelector('.graph-details')?.getBoundingClientRect().width??0"),0)
    const paletteWidth=await evaluate("document.querySelector('.graph-palette').getBoundingClientRect().width"),separator='.graph-palette [role="separator"]';await focus(separator);await press('ArrowRight');await wait(200);assert.ok(await evaluate("document.querySelector('.graph-palette').getBoundingClientRect().width")>paletteWidth)
    await click('.open-details');await commands('Frame all');await capture('graph-narrow')
    const outer=await evaluate("({width:document.querySelector('.graph-editor').clientWidth,scroll:document.querySelector('.graph-editor').scrollWidth,height:document.querySelector('.graph-canvas').getBoundingClientRect().height})");assert.ok(outer.scroll<=outer.width+1,JSON.stringify(outer));assert.ok(outer.height>=120,JSON.stringify(outer));observations.push({name:'graph-1024x640',canvasWidth,...outer})
  })
  await check('Mode help remains fully readable through a reachable narrow disclosure',async()=>{
    await click('.logic-help>summary');const geometry=await evaluate("(()=>{const e=document.querySelector('.logic-help p'),r=e.getBoundingClientRect();return{height:e.clientHeight,scroll:e.scrollHeight,width:r.width,right:r.right,text:e.textContent}})()");assert.ok(geometry.width>150);assert.ok(geometry.right<=1024);assert.ok(geometry.height>=Math.min(geometry.scroll,300)-1);assert.ok(geometry.text.length>30);await click('.logic-help>summary')
  })
  await check('Saved-source changes expose a recovered graph conflict and require an explicit decision',async()=>{
    await viewport(1440,900);const commentViewBefore=await graphView(),commentPositionsBefore=await graphPositions(),commentCountBefore=await evaluate("document.querySelectorAll('.graph-comment').length");await commands('Comment');await until("!!document.querySelector('.graph-comment input')");assert.deepEqual(await graphPositions(),commentPositionsBefore);await graphUndo();assert.equal(await evaluate("document.querySelectorAll('.graph-comment').length"),commentCountBefore);assert.equal(await graphView(),commentViewBefore);await focus('.graph-editor');await press('z',10);await until("!!document.querySelector('.graph-comment input')");const commentHit=await evaluate("(()=>{const e=document.querySelector('.graph-comment input'),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{rect:{left:r.left,top:r.top,width:r.width,height:r.height},hit:hit?.outerHTML.slice(0,500),target:e.outerHTML,view:document.querySelector('.nodes-layer').style.transform}})()");observations.push({name:'comment-before-input',...commentHit});assert.ok(commentHit.rect.height>=24,JSON.stringify(commentHit));assert.equal(commentHit.hit,commentHit.target,'New comment must be reachable by a real click');await fill('.graph-comment input','Uncommitted graph note');const commentAfter=await evaluate("({value:document.querySelector('.graph-comment input').value,focus:document.activeElement?.outerHTML.slice(0,500)})");observations.push({name:'comment-after-input',...commentAfter});assert.equal(commentAfter.value,'Uncommitted graph note','The real input must accept the edit before testing recovery')
    await clickText('.workspace-list button','Design');await until("!document.querySelector('.script-workspace')");await clickText('.bottom-panel .panel-tab','Assets');await until("!!document.querySelector('.asset-browser')");await clickText('.folder-tree button','Assets/Scripts');await until("[...document.querySelectorAll('.asset-grid article')].some(e=>e.querySelector('small')?.textContent.startsWith('script'))")
    const index=await evaluate("[...document.querySelectorAll('.asset-grid article')].findIndex(e=>e.querySelector('small')?.textContent.startsWith('script'))"),at=await audit.point('.asset-grid article',index);await client.send('Input.dispatchMouseEvent',{type:'mousePressed',...at,button:'left',clickCount:2});await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',...at,button:'left',clickCount:2});await until("!!document.querySelector('.editor-shell textarea')")
    const edited=(await evaluate("document.querySelector('.editor-shell textarea').value"))+'\n// Saved through the linked source while graph draft was parked.\n';await setCode(edited);await click('.toolbar-actions>button.primary');await until("document.querySelector('.toolbar-actions>button.primary').disabled");await click('.logic-mode button',1);await until("!!document.querySelector('.studio-draft-conflict')")
    assert.equal(await evaluate("document.querySelector('.graph-comment input').value"),'Uncommitted graph note');await clickText('.primary-actions button','Save');assert.ok(await evaluate("!!document.querySelector('.studio-draft-conflict')"));assert.equal(await evaluate("document.querySelectorAll('.primary-actions>button')[2].disabled"),false)
    await click('.studio-draft-conflict summary');const versions=await evaluate("[...document.querySelectorAll('.studio-draft-conflict pre')].map(e=>e.textContent)");assert.equal(versions.length,2);assert.notEqual(versions[0],versions[1]);await capture('graph-draft-conflict');await clickText('.studio-draft-conflict button','Discard draft and reload');await until("!document.querySelector('.studio-draft-conflict')");assert.equal(await evaluate("document.querySelectorAll('.primary-actions>button')[2].disabled"),true);assert.equal(await evaluate("[...document.querySelectorAll('.graph-comment input')].some(e=>e.value==='Uncommitted graph note')"),false)
  })
  await check('Event Sheet changes survive workspace unmount and validated Save clears recovery',async()=>{
    await viewport(1440,900);await click('.logic-mode button',2);await until("!!document.querySelector('.event-studio')");await click('.sheet-browser>header button');await until("document.querySelectorAll('.event-list article').length>0")
    await fill('.event-copy input','Unsaved workspace event');await fill('.callback input','invalid callback!');await until("document.querySelector('.event-details').textContent.includes('EVENT-DRAFT-CALLBACK')");await until("!document.querySelector('.sheet-toolbar button.primary').disabled");await clickText('.workspace-list button','Design');await until("!document.querySelector('.script-workspace')");await clickText('.workspace-list button','Script');await until("!!document.querySelector('.event-studio')");await wait(300)
    assert.equal(await evaluate("document.querySelector('.event-copy input').value"),'Unsaved workspace event');assert.equal(await evaluate("document.querySelector('.sheet-toolbar button.primary').disabled"),false);assert.equal(await evaluate("document.querySelector('.callback input').value"),'invalid callback!');await click('.sheet-toolbar button.primary');assert.equal(await evaluate("document.querySelector('.sheet-toolbar button.primary').disabled"),false);await fill('.callback input','start')
    await click('.sheet-toolbar button.primary');await until("document.querySelector('.sheet-toolbar button.primary').disabled");await clickText('.workspace-list button','Design');await until("!document.querySelector('.script-workspace')");await clickText('.workspace-list button','Script');await until("!!document.querySelector('.event-studio')");await wait(300);assert.equal(await evaluate("document.querySelector('.event-copy input').value"),'Unsaved workspace event');assert.equal(await evaluate("document.querySelector('.sheet-toolbar button.primary').disabled"),true);await capture('events-recovered')
  })

})
