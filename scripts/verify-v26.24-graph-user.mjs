/** 图固定与页面切换的真实用户回归；仅使用可见控件，读出几何与浏览器帧时序。 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'
const expectedRelease=JSON.parse(await readFile('package.json','utf8')).version.replace(/\.0$/,'')
await withBrowserAudit({release:'26.24',name:'graph-user',expectedRelease,development:expectedRelease!=='26.24'},/** 结构说明（自动提取）：withBrowserAudit 回调；输入 a；直接调用 worldUserControls17、user.open、resolve、a.check；等待异步结果。 */ async a=>{
  const user=worldUserControls17(a)
  await user.open(resolve('reference-projects/projects/creator-v2624-code-game/project.nova'))
  /** 打开图命令后以真实点击执行，完成后收起命令区避免遮挡画布。 */
  async function command(label){
    if(!await a.evaluate("document.querySelector('.graph-more').open"))await a.click('.graph-more>summary')
    await a.clickText('.graph-more button',label,true)
    if(await a.evaluate("document.querySelector('.graph-more').open"))await a.click('.graph-more>summary')
  }
  await a.check('Create typed graph from a source draft through the linked workspace',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 user.workspace、a.clickText、a.until、a.evaluate、a.client.send 等；等待异步结果。 */ async()=>{
    await user.workspace('Script')
    await a.clickText('.toolbar-actions button','New script')
    await a.until("!!document.querySelector('.editor-shell textarea')")
    await a.evaluate("(()=>{const e=document.querySelector('.editor-shell textarea');e.focus();e.select()})()")
    await a.client.send('Input.insertText',{text:'// 中文保留注释\nfn start(){let value=2;if value>0{print(value);}}'})
    await a.evaluate("document.querySelector('.editor-shell textarea').blur()")
    await a.click('.logic-mode button',1)
    await a.until("document.querySelectorAll('.graph-node').length>5")
    await a.until("!document.querySelector('.graph-editor[data-initial-layout=running]')")
    await wait(300)
  })
  await a.check('Pin a node, arrange, undo and redo without changing its position',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 a.fill、a.until、a.click、a.evaluate、command 等；等待异步结果。 */ async()=>{
    await a.fill('.graph-symbol-search input','start')
    await a.until("document.querySelectorAll('.graph-symbol-search button').length>0")
    await a.click('.graph-symbol-search button',0)
    await a.until("!!document.querySelector('.graph-node.selected')")
    const selected=await a.evaluate("document.querySelector('.graph-node.selected').dataset.nodeUuid")
    const selector=`.graph-node[data-node-uuid="${selected}"]`
    await command('Pin selected positions')
    assert.ok(await a.evaluate(`!!document.querySelector(${JSON.stringify(selector)}).querySelector('[aria-label="Position pinned"]')`))
    const before=await a.evaluate(`({x:document.querySelector(${JSON.stringify(selector)}).style.left,y:document.querySelector(${JSON.stringify(selector)}).style.top})`)
    await command('Arrange all nodes')
    await a.until("![...document.querySelectorAll('.graph-more button')].some(e=>e.textContent==='Cancel layout')")
    const after=await a.evaluate(`({x:document.querySelector(${JSON.stringify(selector)}).style.left,y:document.querySelector(${JSON.stringify(selector)}).style.top})`)
    assert.deepEqual(after,before)
    await command('Unpin selected positions')
    assert.equal(await a.evaluate(`!!document.querySelector(${JSON.stringify(selector)}).querySelector('[aria-label="Position pinned"]')`),false)
    await a.evaluate("document.querySelector('.graph-editor').focus()")
    await a.press('z',2);await wait(200)
    assert.ok(await a.evaluate(`!!document.querySelector(${JSON.stringify(selector)}).querySelector('[aria-label="Position pinned"]')`))
    await a.capture('pinned-node-undo')
  })
  await a.check('Manual drag pins its committed position; cancelled drag preserves geometry',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 command、a.evaluate、a.point、a.client.send、wait 等；等待异步结果。 */ async()=>{
    await command('Unpin selected positions')
    const selector='.graph-node.selected',before=await a.evaluate("({x:document.querySelector('.graph-node.selected').style.left,y:document.querySelector('.graph-node.selected').style.top})")
    const at=await a.point(selector+' header strong')
    await a.client.send('Input.dispatchMouseEvent',{type:'mousePressed',...at,button:'left',buttons:1,clickCount:1})
    await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:at.x+45,y:at.y+25,button:'left',buttons:1})
    await wait(80)
    await a.client.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:at.x+45,y:at.y+25,button:'left',buttons:0,clickCount:1})
    await wait(150)
    const committed=await a.evaluate("({x:document.querySelector('.graph-node.selected').style.left,y:document.querySelector('.graph-node.selected').style.top})")
    assert.notDeepEqual(committed,before)
    assert.ok(await a.evaluate("!!document.querySelector('.graph-node.selected [aria-label=\"Position pinned\"]')"))
    await command('Unpin selected positions')
    const next=await a.point(selector+' header strong')
    await a.client.send('Input.dispatchMouseEvent',{type:'mousePressed',...next,button:'left',buttons:1,clickCount:1})
    await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:next.x-30,y:next.y-20,button:'left',buttons:1})
    await wait(80);await a.press('Escape')
    await a.client.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:next.x-30,y:next.y-20,button:'left',buttons:0,clickCount:1})
    await wait(150)
    assert.deepEqual(await a.evaluate("({x:document.querySelector('.graph-node.selected').style.left,y:document.querySelector('.graph-node.selected').style.top})"),committed)
    assert.equal(await a.evaluate("!!document.querySelector('.graph-node.selected [aria-label=\"Position pinned\"]')"),false)
  })
  await a.check('Repeated Script/Design switches retain a single canvas pair and bounded frame samples',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 a.client.send、user.workspace、a.evaluate、assert.equal、assert.ok 等；包含循环处理；等待异步结果。 */ async()=>{
    await a.client.send('Performance.enable')
    const before=await a.client.send('Performance.getMetrics')
    for(let index=0;index<12;index++){
      await user.workspace('Design')
      const sample=await a.evaluate(`new Promise(resolve=>{const frames=[];let last=performance.now();function record(now){frames.push(now-last);last=now;if(frames.length<12)requestAnimationFrame(record);else{const nodes=[...document.querySelectorAll('.persistent-viewport canvas')];resolve({frames,canvases:nodes.map(e=>({width:e.width,height:e.height,visible:e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility!=='hidden'}))})}}requestAnimationFrame(record)})`)
      assert.equal(sample.canvases.length,2)
      assert.ok(sample.canvases.every(/* 先计算 canvas.width>0&&canvas.height>0；仅当其为真值时求右侧 canvas.visible，返回短路求值结果。 */ canvas=>canvas.width>0&&canvas.height>0&&canvas.visible))
      a.observations.push({name:'design-switch-'+index,...sample})
      await user.workspace('Script')
    }
    const after=await a.client.send('Performance.getMetrics')
    a.observations.push({name:'switch-resource-metrics',before:before.metrics,after:after.metrics,context:'One browser measurement rAF chain per sample; software rendering. Heap observations are not proof of no leak or target-hardware FPS.'})
  })
  await a.check('Structural labels follow locale while authored source remains intact',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 user.workspace、a.click、a.until、a.select、a.fill 等；包含循环处理；等待异步结果。 */ async()=>{
    for(const [locale,expected] of [['zh','函数声明'],['de','Funktionsdeklaration'],['en','Function Declaration']]){
      await user.workspace('Manage');await a.click('.manage-body>nav button',1)
      await a.until("!!document.querySelector('[data-audit=color-palette]')")
      await a.click('.settings-search nav button',0)
      await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])',locale)
      await user.workspace('Script')
      await a.until("!!document.querySelector('.graph-editor')")
      await a.fill('.graph-symbol-search input','start')
      await a.until("document.querySelectorAll('.graph-symbol-search button').length>0")
      const title=await a.evaluate("document.querySelector('.graph-symbol-search button').textContent")
      assert.ok(title.includes(expected),title)
      assert.ok(title.includes('start'),title)
      const categories=await a.evaluate("[...document.querySelectorAll('.graph-node>header>small')].map(e=>e.textContent)")
      assert.ok(categories.length>0)
      if(locale==='zh')assert.ok(categories.every(/** 本夹具只有系统结构节点，卡片分类不应遗留英文。 */ text=>text==='语言控制流'||text==='语言数据'),JSON.stringify(categories))
      if(locale==='de')assert.ok(categories.every(/** 德语画布使用与节点库相同的分类词典。 */ text=>text==='Sprachkontrollfluss'||text==='Sprachwerte'),JSON.stringify(categories))

      await a.capture('graph-locale-'+locale)
    }
    await a.click('.logic-mode button',0)
    await a.until("!!document.querySelector('.editor-shell textarea')")
    const source=await a.evaluate("document.querySelector('.editor-shell textarea').value")
    assert.ok(source.includes('// 中文保留注释'))
    assert.ok(source.includes('fn start()'))
    assert.ok(source.includes('let value=2'))
  })

})
