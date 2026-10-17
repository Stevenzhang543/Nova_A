/** 底栏真实浏览器回归：通过用户可见设置和标签，验证缩放后的操作区不会被挤出。 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'
const expectedRelease = JSON.parse(await readFile('package.json', 'utf8')).version.replace(/\.0$/, '')

/** 在真实浏览器中操作项目和设置；DOM 求值只读取尺寸、聚焦控件及采集帧时序。 */
await withBrowserAudit({ release:'26.24', name:'bottom-dock', expectedRelease, development:expectedRelease !== '26.24' }, /** 结构说明（自动提取）：withBrowserAudit 回调；输入 a；直接调用 worldUserControls17、user.open、resolve、a.viewport、user.workspace 等；包含循环处理；等待异步结果。 */ async a => {
  const user = worldUserControls17(a)
  await user.open(resolve('reference-projects/projects/creator-v2624-code-game/project.nova'))
  for (const scale of [1, 2]) {
    await a.viewport(1440, 1000)
    await user.workspace('Manage')
    await a.click('.manage-body>nav button', 1)
    await a.until("!!document.querySelector('[data-audit=color-palette]')")
    await a.click('.settings-search nav button', 0)
    await a.evaluate("document.querySelector('.settings-page input[type=range][min=\"1\"][max=\"2\"]').focus()")
    await a.press('Home')
    if (scale === 2) await a.press('End')
    await a.press('Tab')
    await user.workspace('Design')
    for (const width of [1024, 1440, 1920]) {
      await a.viewport(width, 1000)
      await wait(200)
      const options = await a.evaluate("[...document.querySelector('.compact-tab-select').options].map(o=>({value:o.value,label:o.textContent}))")
      for (const option of options) {
        /** 每个标签均经真实鼠标/键盘激活；检查可见操作控件的尺寸和命中目标。 */
        await a.check(`Bottom ${option.value}, width ${width}, scale ${scale}`, /** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 a.evaluate、a.select、a.clickText、a.click、a.until 等；等待异步结果。 */ async () => {
          const compact = await a.evaluate("document.querySelector('.compact-tab-select').getBoundingClientRect().width>0")
          if (compact) await a.select('.compact-tab-select', option.value)
          else await a.clickText('.panel-tab-strip .panel-tab', option.label)
          if(!await a.evaluate("!!document.querySelector('.bottom-panel .panel-content')"))await a.click('.panel-controls > button:last-child')
          await a.until("!!document.querySelector('.bottom-panel .panel-content')")
          await wait(180)
          const metrics = await a.evaluate(`(()=>{const header=document.querySelector('.panel-tabs'),r=header.getBoundingClientRect();return {width:r.width,height:r.height,overflow:header.scrollWidth-header.clientWidth,controls:[...header.querySelectorAll('.panel-controls button')].map(e=>{const b=e.getBoundingClientRect();return{text:e.title||e.textContent,width:b.width,height:b.height,contained:b.left>=r.left-1&&b.right<=r.right+1&&b.top>=r.top-1&&b.bottom<=r.bottom+1,reachable:e.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2))}})}})()`)
          assert.ok(metrics.overflow <= 2, JSON.stringify(metrics))
          assert.ok(metrics.controls.length >= 2)
          assert.ok(metrics.controls.every(/* 先计算 control.width >= 24 && control.height >= 24 && control.contained；仅当其为真值时求右侧 control.reachable，返回短路求值结果。 */ control => control.width >= 24 && control.height >= 24 && control.contained && control.reachable), JSON.stringify(metrics))
          a.observations.push({ name:`${option.value}-${width}-${scale}`, ...metrics })
          if(option.value==='assets'){
            const content=await a.evaluate(`(()=>{const toolbar=document.querySelector('.asset-toolbar'),grid=document.querySelector('.asset-grid'),r=toolbar.getBoundingClientRect(),g=grid.getBoundingClientRect();const visible=[...toolbar.querySelectorAll('button,input,select')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height);return{toolbarHeight:r.height,gridHeight:g.height,childrenBelowToolbar:visible.filter(e=>e.getBoundingClientRect().bottom>r.bottom+2).map(e=>({text:e.title||e.placeholder||e.textContent,bottom:e.getBoundingClientRect().bottom})),toolbarBottom:r.bottom,gridTop:g.top,items:grid.querySelectorAll('article').length}})()`)
            a.observations.push({name:`asset-content-${width}-${scale}`,...content})
            await a.capture(`assets-${width}-${scale}`)
            assert.deepEqual(content.childrenBelowToolbar,[],'Asset toolbar children must remain in their own row allocation')
          }

        })
      }
      /** 通过键盘控制实际分隔条与按钮，验证缩放后尺寸边界及折叠/展开状态。 */
      await a.check(`Bottom keyboard resize and expand/collapse ${width} scale ${scale}`,/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 a.evaluate、a.press、wait、assert.equal、a.until 等；等待异步结果。 */ async()=>{
        const separator='.bottom-panel > .panel-resize-handle'
        await a.evaluate(`document.querySelector('${separator}').focus()`)
        await a.press('Home');await wait(80)
        assert.equal(await a.evaluate(`document.querySelector('${separator}').getAttribute('aria-valuenow')`),'120')
        await a.press('End');await wait(80)
        assert.equal(await a.evaluate(`document.querySelector('${separator}').getAttribute('aria-valuenow')`),'520')
        await a.evaluate("document.querySelector('.bottom-panel .panel-controls > button:last-child').focus()")
        await a.press('Enter');await a.until("!document.querySelector('.bottom-panel .panel-content')")
        await a.press('Enter');await a.until("!!document.querySelector('.bottom-panel .panel-content')")
        assert.equal(await a.evaluate(`document.querySelector('${separator}').getAttribute('aria-valuenow')`),'520')
        await a.evaluate("document.querySelector('[data-panel-maximize=bottom]').focus()")
        await a.press('Enter');await a.until("!!document.querySelector('.bottom-panel.panel-maximized')")
        assert.equal(await a.evaluate(`document.querySelector('${separator}').getAttribute('aria-disabled')`),'true')
        const expanded=await a.evaluate("(()=>{const r=document.querySelector('.bottom-panel').getBoundingClientRect();return {height:r.height,top:r.top,bottom:r.bottom,viewport:innerHeight}})()")
        assert.ok(expanded.top>=0&&expanded.bottom<=expanded.viewport+2&&expanded.height>300,JSON.stringify(expanded))
        await a.press('Enter');await a.until("!document.querySelector('.bottom-panel.panel-maximized')")
        assert.equal(await a.evaluate(`document.querySelector('${separator}').getAttribute('aria-valuenow')`),'520')
        a.observations.push({name:`keyboard-expand-${width}-${scale}`,expanded})
      })
      await a.capture(`bottom-${width}-${scale}`)
    }
  }
})
