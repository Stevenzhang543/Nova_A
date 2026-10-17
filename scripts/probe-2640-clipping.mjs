/** 精确定位被裁切的元素与其祖先链，避免猜类名。 */
import { readFile } from 'node:fs/promises'
import { withBrowserAudit } from './lib/browserUserAudit.mjs'

const packageVersion = JSON.parse(await readFile('package.json', 'utf8')).version
const release = packageVersion.replace(/\.0$/, '')
const out = {}

await withBrowserAudit({ release, name: 'clip-probe-2640', width: 1600, height: 1000 }, async a => {
  await a.until("!!document.querySelector('.project-manager')", 30000)
  await a.click('.quick-actions .new-project'); await a.until("!!document.querySelector('.creation-card')")
  await a.fill('.creation-card header input', 'Clip probe')
  await a.click('[data-template-id="top-down"]'); await a.click('.create-button')
  await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000)
  if (await a.evaluate("!!document.querySelector('.onboarding-scrim')")) {
    await a.evaluate("document.querySelector('.onboarding-scrim').focus()"); await a.press('Escape')
    await a.until("!document.querySelector('.onboarding-scrim')")
  }

  /** 找到文本匹配的叶子元素并回传其祖先链与裁切信息。 */
  const probe = (needle) => `(() => {
    const all = [...document.querySelectorAll('.editor-root *')]
    const hit = all.find(el => el.children.length === 0 && (el.textContent || '').trim().toLowerCase().startsWith(${JSON.stringify(needle)}))
    if (!hit) return { found: false }
    const chain = []
    let node = hit
    for (let i = 0; i < 5 && node; i++, node = node.parentElement) {
      const r = node.getBoundingClientRect()
      const cs = getComputedStyle(node)
      chain.push({ tag: node.tagName, cls: String(node.className).slice(0, 60), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), overflow: cs.overflowX + '/' + cs.overflowY, text: (node.textContent || '').trim().slice(0, 40) })
    }
    const r = hit.getBoundingClientRect()
    return { found: true, hit: { cls: String(hit.className).slice(0, 60), text: (hit.textContent || '').trim().slice(0, 40) }, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, chain }
  })()`
  out.canvasTopDown = await a.evaluate(probe('top-down'))
  out.canvasHud = await a.evaluate(probe('hud'))

  // 打开底栏 Assets：窄容器下已改为紧凑选择器，因此两种入口都要兼容。
  if (!(await a.evaluate("!!document.querySelector('.asset-browser')"))) {
    if (await a.evaluate("!!document.querySelector('.compact-tab-select')")) {
      await a.evaluate("(()=>{const s=document.querySelector('.compact-tab-select');const o=[...s.options].find(x=>/assets/i.test(x.textContent));if(o){s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}))}})()")
    } else {
      await a.clickText('.bottom-panel .panel-tab', 'Assets', true)
    }
    await a.until("!!document.querySelector('.asset-browser')", 10000)
  }
  await new Promise(resolve => setTimeout(resolve, 500))
  out.assetRailFirst = await a.evaluate(probe('project files'))
  out.assetRailLast = await a.evaluate(probe('animation'))
  out.horizontalScrolls = await a.evaluate(`[...document.querySelectorAll('.editor-root *')].filter(el => el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 40).slice(0, 10).map(el => ({ cls: String(el.className).slice(0, 50), clientW: el.clientWidth, scrollW: el.scrollWidth }))`)
})

console.log(JSON.stringify(out, null, 2))
