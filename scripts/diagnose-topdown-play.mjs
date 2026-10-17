/** 诊断：为什么 top-down 模板点击播放后按钮不进入 active。
 * 只取证据、不改产品代码；结论写入 reports/phase2/topdown-play-diagnosis.json。 */
import { withBrowserAudit } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const result = { steps: [], buttonsBefore: null, buttonsAfter: null, preflightText: null, consoleErrors: null, playDisabled: null }

const dumpButtons = `[...document.querySelectorAll('.actionbar button')].map((b, i) => ({
  index: i,
  text: (b.textContent || '').trim().slice(0, 40),
  title: b.getAttribute('title'),
  ariaLabel: b.getAttribute('aria-label'),
  ariaLive: b.getAttribute('aria-live'),
  disabled: b.disabled === true || b.getAttribute('disabled') !== null || b.getAttribute('aria-disabled') === 'true',
  className: b.className,
  active: b.classList.contains('active'),
}))`

await withBrowserAudit({ release: '26.38', name: 'topdown-play-diagnosis', qualifyRelease: false, width: 1600, height: 1000 }, async a => {
  const u = worldUserControls17(a)
  if (await a.evaluate("!!document.querySelector('.editor-root')")) {
    await a.client.send('Page.reload'); await a.until("!!document.querySelector('.project-manager')", 30000)
  }
  result.steps.push('launcher visible')

  await a.click('.quick-actions .new-project'); await a.until("!!document.querySelector('.creation-card')")
  await a.fill('.creation-card header input', 'Diagnosis top-down')
  await a.click('[data-template-id="top-down"]'); await a.click('.create-button')
  await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000)
  result.steps.push('top-down project created')

  if (await a.evaluate("!!document.querySelector('.onboarding-scrim')")) {
    await a.evaluate("document.querySelector('.onboarding-scrim').focus()"); await a.press('Escape')
    await a.until("!document.querySelector('.onboarding-scrim')")
  }

  await u.workspace('Debug'); await u.bottom('console', 'Console')
  result.steps.push('debug workspace open')

  result.buttonsBefore = await a.evaluate(dumpButtons)
  result.playDisabled = await a.evaluate("document.querySelectorAll('.actionbar button')[0].disabled")

  // Capture any preflight or blocking text that is already visible.
  result.preflightText = await a.evaluate(`[...document.querySelectorAll('.actionbar [role="alert"], .actionbar .issue, .actionbar .preflight, .statusbar [role="alert"], .status-bar [role="alert"]')].map(e => e.textContent.trim().slice(0, 160))`)

  await a.click('.actionbar button', 0)
  await new Promise(r => setTimeout(r, 3000))

  result.buttonsAfter = await a.evaluate(dumpButtons)
  result.consoleErrors = await a.evaluate(`[...document.querySelectorAll('.console-panel .log-entry.error,.console-panel .log-entry.fatal,.console-panel .log-entry.warning')].map(e => e.textContent.trim().slice(0, 200))`)

  a.observations.push({ id: 'topdown-play-diagnosis', ...result })
})

console.log(JSON.stringify(result, null, 2))
