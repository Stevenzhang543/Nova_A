/** 验证设置页分类页签是否真的收窄内容范围。 */
import { readFile } from 'node:fs/promises'
import { withBrowserAudit } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const packageVersion = JSON.parse(await readFile('package.json', 'utf8')).version
const release = packageVersion.replace(/\.0$/, '')
const out = {}

await withBrowserAudit({ release, name: 'settings-scope-2640', width: 1600, height: 1000 }, async a => {
  const u = worldUserControls17(a)
  await a.until("!!document.querySelector('.project-manager')", 30000)
  await a.click('.quick-actions .new-project'); await a.until("!!document.querySelector('.creation-card')")
  await a.fill('.creation-card header input', 'Settings scope')
  await a.click('[data-template-id="empty"]'); await a.click('.create-button')
  await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000)
  if (await a.evaluate("!!document.querySelector('.onboarding-scrim')")) {
    await a.evaluate("document.querySelector('.onboarding-scrim').focus()"); await a.press('Escape')
    await a.until("!document.querySelector('.onboarding-scrim')")
  }
  await u.workspace('Manage')
  await new Promise(resolve => setTimeout(resolve, 600))
  const snap = () => a.evaluate("(()=>{const p=document.querySelector('.settings-page');const vis=[...document.querySelectorAll('.settings-page .ui-property-section')].filter(s=>s.offsetParent!==null);return {scrollH:p.scrollHeight,visibleSections:vis.length,totalSections:document.querySelectorAll('.settings-page .ui-property-section').length,activeTab:document.querySelector('.settings-search nav button.active')?.textContent?.trim()??null}})()")
  out.all = await snap()
  const tabs = await a.evaluate("[...document.querySelectorAll('.settings-search nav button')].map(b=>b.textContent.trim())")
  out.tabs = tabs
  for (const label of tabs.slice(1, 4)) {
    await a.clickText('.settings-search nav button', label, true)
    await new Promise(resolve => setTimeout(resolve, 450))
    out['scope_' + label] = await snap()
  }
  console.log(JSON.stringify(out, null, 1))
})
