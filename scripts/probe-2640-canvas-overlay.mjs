/** 枚举画布视口顶部附近的覆盖元素，定位被裁切的标签来源。 */
import { readFile } from 'node:fs/promises'
import { withBrowserAudit } from './lib/browserUserAudit.mjs'

const packageVersion = JSON.parse(await readFile('package.json', 'utf8')).version
const release = packageVersion.replace(/\.0$/, '')

await withBrowserAudit({ release, name: 'canvas-overlay-probe', width: 1600, height: 1000 }, async a => {
  await a.until("!!document.querySelector('.project-manager')", 30000)
  await a.click('.quick-actions .new-project'); await a.until("!!document.querySelector('.creation-card')")
  await a.fill('.creation-card header input', 'Overlay probe')
  await a.click('[data-template-id="top-down"]'); await a.click('.create-button')
  await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000)
  if (await a.evaluate("!!document.querySelector('.onboarding-scrim')")) {
    await a.evaluate("document.querySelector('.onboarding-scrim').focus()"); await a.press('Escape')
    await a.until("!document.querySelector('.onboarding-scrim')")
  }
  const out = await a.evaluate(`(() => {
    const canvas = document.querySelector('.persistent-viewport')
    if (!canvas) return { error: 'no viewport' }
    const box = canvas.getBoundingClientRect()
    const rows = []
    for (const el of canvas.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      // 只关注与画布上边缘重叠或紧邻的覆盖元素
      if (r.top < box.top + 30 && r.bottom > box.top - 10) {
        const cs = getComputedStyle(el)
        rows.push({ tag: el.tagName, cls: String(el.className).slice(0, 50), text: (el.textContent || '').trim().slice(0, 30), top: Math.round(r.top - box.top), left: Math.round(r.left - box.left), h: Math.round(r.height), pos: cs.position, overflow: cs.overflow })
      }
    }
    return { viewport: { top: Math.round(box.top), left: Math.round(box.left), h: Math.round(box.height) }, rows: rows.slice(0, 20) }
  })()`)
  console.log(JSON.stringify(out, null, 1))
  await a.capture('canvas-overlay-top')
})
