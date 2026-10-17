/** 26.29 平台前置条件布局：真实设置切换与刷新操作，限定新增长文本所在的构建面板。 */
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'
await withBrowserAudit({ release: '26.29', name: 'platform-layout', expectedRelease: '26.29' }, /** 在生产页面检查三语常规与大字布局，不触发构建或安装。 */ async a => {
  const u = worldUserControls17(a)
  await u.open(resolve('reference-projects/projects/scripting-v2624-inventory-callback/project.nova'))
  for (const locale of ['en', 'de', 'zh']) for (const scale of [1, 2]) await a.check(`${locale} platform prerequisites at ${scale * 100}%`, /** 使用真实控件改变语言和字号，检测新卡片的文本完整性与刷新可达性。 */ async () => {
    await a.viewport(1440, 900); await u.workspace('Manage'); await u.activate('.manage-body>nav button', 1); await a.until("!!document.querySelector('.settings-page')")
    await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])', locale)
    const slider = '.settings-page input[type="range"][min="1"][max="2"][step="0.05"]'
    await a.evaluate(`document.querySelector(${JSON.stringify(slider)}).focus()`); await a.press('Home'); for (let index = 0; index < (scale - 1) / .05; index++) await a.press('ArrowRight'); await a.press('Tab')
    await u.activate('.manage-body>nav button', 6); await a.until("!!document.querySelector('[data-audit=platform-prerequisites]')"); await a.select('.field-grid select', 'windows', 1)
    await a.viewport(scale === 2 ? 1024 : 1440, scale === 2 ? 640 : 900); await wait(120)
    const selector = '[data-audit=platform-prerequisites]'
    const metrics = await a.evaluate(`(()=>{const root=document.querySelector('${selector}'),elements=[...root.querySelectorAll('p,strong,button')];return {locale:document.documentElement.lang,scale:getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'),width:innerWidth,cardWidth:root.clientWidth,contentWidth:root.querySelector(':scope>div').clientWidth,clipped:elements.filter(e=>{const s=getComputedStyle(e);return e.scrollWidth>e.clientWidth+2&&['hidden','clip'].includes(s.overflowX)||e.scrollHeight>e.clientHeight+2&&['hidden','clip'].includes(s.overflowY)}).map(e=>e.textContent),paragraphs:elements.filter(e=>e.tagName==='P').map(e=>e.textContent)}})()`)
    assert.equal(metrics.locale, locale === 'zh' ? 'zh-CN' : locale); assert.deepEqual(metrics.clipped, []); assert.ok(metrics.contentWidth >= Math.min(240, metrics.cardWidth - 32), 'Prerequisite text must occupy the card rather than the 34px icon column: ' + JSON.stringify(metrics)); assert.ok(metrics.paragraphs.length >= 3); assert.ok(metrics.paragraphs.some(/** WebView2 名称必须保留，确保测试正在检查 Windows 前置条件。 */ text => text.includes('WebView2')))
    await a.evaluate(`document.querySelector('${selector} button').scrollIntoView({block:'center'})`); await wait(80)
    const reachable = await a.evaluate(`(()=>{const e=document.querySelector('${selector} button'),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return e===hit||e.contains(hit)})()`)
    assert.equal(reachable, true); await u.activate(selector + ' button'); a.observations.push(metrics); await a.capture(`platform-${locale}-${scale}`)
  })
})
