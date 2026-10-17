/** 诊断：Script 工作区的 graph-editor 在交互序列中为何消失。 */
import { readFile } from 'node:fs/promises'
import { withBrowserAudit } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const packageVersion = JSON.parse(await readFile('package.json', 'utf8')).version
const release = packageVersion.replace(/\.0$/, '')
const out = {}

await withBrowserAudit({ release, name: 'graph-unmount-2640', width: 1600, height: 1000 }, async a => {
  const u = worldUserControls17(a)
  await a.until("!!document.querySelector('.project-manager')", 30000)
  await a.click('.quick-actions .new-project'); await a.until("!!document.querySelector('.creation-card')")
  await a.fill('.creation-card header input', 'Graph unmount probe')
  await a.click('[data-template-id="empty"]'); await a.click('.create-button')
  await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000)
  if (await a.evaluate("!!document.querySelector('.onboarding-scrim')")) {
    await a.evaluate("document.querySelector('.onboarding-scrim').focus()"); await a.press('Escape')
    await a.until("!document.querySelector('.onboarding-scrim')")
  }
  await u.workspace('Script')
  await a.until("!!document.querySelector('.logic-tabs')", 20000)

  // 安装移除观察器，记录 graph-editor 被移除的时刻与当时的工作区/页面状态。
  await a.evaluate(`(() => {
    window.__graphLog = []
    const state = () => ({
      t: Math.round(performance.now()),
      workspace: document.querySelector('.workspace-list .active .label')?.textContent?.trim() ?? null,
      page: document.querySelector('.persistent-viewport')?.className ?? null,
      graph: !!document.querySelector('.graph-editor'),
      logicTab: document.querySelector('.logic-tabs button.active')?.textContent?.trim() ?? null
    })
    window.__graphState = state
    const observer = new MutationObserver(records => {
      for (const r of records) for (const n of r.removedNodes) {
        if (!(n instanceof Element)) continue
        if (n.matches('.graph-editor') || n.querySelector?.('.graph-editor')) window.__graphLog.push({ event: 'removed', ...state() })
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    window.__graphObserver = observer
    return true
  })()`)

  await u.activate('.logic-tabs button', 1)
  if (await a.evaluate("!!document.querySelector('.conversion-review-actions button')")) await u.activate('.conversion-review-actions button')
  await a.until("!!document.querySelector('.graph-editor')", 20000)
  out.afterOpen = await a.evaluate("window.__graphState()")
  await a.fill('.graph-palette input[type=search]', 'number')
  await a.click('.canvas-controls input[type=range]')
  await a.press('Home'); await a.press('ArrowRight'); await a.press('ArrowRight'); await a.press('Tab')
  await new Promise(resolve => setTimeout(resolve, 400))
  out.afterInputs = await a.evaluate("window.__graphState()")
  out.removals = await a.evaluate("window.__graphLog")
  console.log(JSON.stringify(out, null, 1))
})
