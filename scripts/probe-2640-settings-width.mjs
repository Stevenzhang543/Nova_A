/** 测量设置页内容宽度与页面宽度，确认空间利用问题。 */
import { readFile } from 'node:fs/promises'
import { withBrowserAudit } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const packageVersion = JSON.parse(await readFile('package.json', 'utf8')).version
const release = packageVersion.replace(/\.0$/, '')

await withBrowserAudit({ release, name: 'settings-width-2640', width: 1600, height: 1000 }, async a => {
  const u = worldUserControls17(a)
  await a.until("!!document.querySelector('.project-manager')", 30000)
  await a.click('.quick-actions .new-project'); await a.until("!!document.querySelector('.creation-card')")
  await a.fill('.creation-card header input', 'Settings width')
  await a.click('[data-template-id="empty"]'); await a.click('.create-button')
  await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000)
  if (await a.evaluate("!!document.querySelector('.onboarding-scrim')")) {
    await a.evaluate("document.querySelector('.onboarding-scrim').focus()"); await a.press('Escape')
    await a.until("!document.querySelector('.onboarding-scrim')")
  }
  await u.workspace('Manage')
  await new Promise(resolve => setTimeout(resolve, 700))
  const out = await a.evaluate(`(() => {
    const q = (s) => document.querySelector(s)
    const box = (s) => { const el = q(s); if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), x: Math.round(r.x) } }
    const page = q('.settings-page')
    const sections = q('.settings-sections')
    const body = q('.settings-sections .ui-section-body')
    const row = q('.settings-sections .ui-property-row')
    const control = q('.settings-sections .ui-property-control')
    return {
      viewport: innerWidth,
      page: page ? { w: Math.round(page.getBoundingClientRect().width), scrollH: page.scrollHeight, clientH: page.clientHeight } : null,
      sections: box('.settings-sections'),
      body: body ? { w: Math.round(body.getBoundingClientRect().width) } : null,
      row: row ? { w: Math.round(row.getBoundingClientRect().width) } : null,
      control: box('.settings-sections .ui-property-control'),
      pageHeaderW: box('.settings-page .page-header'),
      manageHeaderW: box('.manage-workspace header'),
      emptyRightPx: page ? Math.round(page.getBoundingClientRect().width - (sections ? sections.getBoundingClientRect().width : 0)) : null
    }
  })()`)
  console.log(JSON.stringify(out, null, 1))
  await a.capture('settings-width')
})
