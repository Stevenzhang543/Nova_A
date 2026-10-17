/** 发布证据显示的用户回归：通过设置、底栏和管理工作区真实操作，验证未执行项目不会显示通过或冻结快照声明。 */
import assert from 'node:assert/strict'
import {resolve} from 'node:path'
import {withBrowserAudit} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
await withBrowserAudit({release:'26.24',name:'evidence-status-user',width:1600,height:1000},/** 在独立浏览器中验证三语言可见状态与面板导航，不导入应用模块或设置内部状态。 */ async a=>{
  const u=worldUserControls17(a)
  await u.open(resolve('reference-projects/projects/creator-v2624-code-game/project.nova'))
  for(const locale of ['en','zh','de']){
    await u.workspace('Manage');await a.click('.manage-body>nav button',1)
    await a.until("!!document.querySelector('.settings-page select:has(option[value=de]):has(option[value=zh])')")
    await a.select('.settings-page select:has(option[value=de]):has(option[value=zh])',locale)
    await u.workspace('Design');await u.bottom('ecosystem',await a.evaluate("document.querySelector('.compact-tab-select option[value=ecosystem]').textContent"))
    if(await a.evaluate("document.querySelector('[data-panel-maximize=bottom]').getAttribute('aria-pressed')!=='true'"))await a.click('[data-panel-maximize=bottom]')
    await a.until("!!document.querySelector('.ecosystem-studio .studio-header nav')")
    // 导航顺序来自组件公开的 extensions/package/templates/delivery/shipping/audit 六项。
    await a.click('.ecosystem-studio .studio-header nav button',5)
    await a.check('Unexecuted ecosystem checks have visible honest status: '+locale,/** 核对真实 DOM 状态和文字，再检查窄视口中状态仍有可见宽度。 */ async()=>{
      await a.until("document.querySelectorAll('.ecosystem-studio .audit-cards article').length===6")
      const rows=await a.evaluate("[...document.querySelectorAll('.ecosystem-studio .audit-cards article')].map(e=>({status:e.querySelector('b').className,glyph:e.querySelector('b').textContent,label:e.querySelector('small')?.textContent}))")
      for(const index of [0,2,3,5])assert.equal(rows[index].status,'notRun')
      assert.equal(rows[1].status,'local-ready');assert.equal(rows[4].status,'pending-external')
      assert.ok(rows.every(/** 没有本次通过证据时，任何项目都不应显示通过勾号。 */ row=>row.glyph!=='✓'&&row.label.trim()&&row.label!=='notRun'))
      for(const width of [1024,1600]){
        await a.viewport(width,1000)
        const widths=await a.evaluate("[...document.querySelectorAll('.audit-cards article small')].map(e=>({width:e.getBoundingClientRect().width,overflow:e.scrollWidth-e.clientWidth}))")
        assert.ok(widths.every(/** 状态文字可以换行，但不能超出其内容列宽度。 */ row=>row.width>0&&row.overflow<=2),JSON.stringify(widths))
        await a.capture('ecosystem-'+locale+'-'+width)
      }
    })
    await a.click('[data-panel-maximize=bottom]');await u.workspace('Manage');await a.click('.manage-body>nav button',4)
    await a.check('Project health does not invent documentation or platform qualification: '+locale,/** 验证未绑定的文档与平台证据，以及汇总的外部待验收标识。 */ async()=>{
      await a.until("document.querySelectorAll('.release-gate-grid article').length===9")
      const gates=await a.evaluate("[...document.querySelectorAll('.release-gate-grid article')].map(e=>({status:e.className,text:e.querySelector('p').textContent}))")
      for(const index of [4,5,6]){assert.equal(gates[index].status,'external');assert.ok(gates[index].text.includes('26.24.0'));assert.ok(!gates[index].text.includes('Offline manual 5.0'))}
      assert.equal(await a.evaluate("document.querySelector('.release-gate').textContent.includes('frozen baseline')"),false)
      await a.evaluate("document.querySelector('.release-gate').scrollIntoView({block:'center'})")
      await a.capture('health-'+locale)
    })
  }
})
