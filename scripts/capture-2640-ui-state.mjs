/** 抓取当前 UI 关键界面，用于 26.40 界面重构前的实际观察。 */
import { readFile } from 'node:fs/promises'
import { withBrowserAudit } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const packageVersion = JSON.parse(await readFile('package.json', 'utf8')).version
const release = packageVersion.replace(/\.0$/, '')
const shots = []

await withBrowserAudit({ release, name: 'ui-state-2640', width: 1600, height: 1000 }, async a => {
  const u = worldUserControls17(a)
  await a.until("!!document.querySelector('.project-manager')", 30000)
  shots.push(await a.capture('welcome'))

  await a.click('.quick-actions .new-project'); await a.until("!!document.querySelector('.creation-card')")
  await a.fill('.creation-card header input', 'UI state review')
  await a.click('[data-template-id="top-down"]')
  shots.push(await a.capture('new-project-dialog'))
  await a.click('.create-button')
  await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000)
  if (await a.evaluate("!!document.querySelector('.onboarding-scrim')")) {
    await a.evaluate("document.querySelector('.onboarding-scrim').focus()"); await a.press('Escape')
    await a.until("!document.querySelector('.onboarding-scrim')")
  }
  shots.push(await a.capture('editor-scene'))

  await u.entity('Player'); await u.expandInspector()
  shots.push(await a.capture('inspector'))

  await a.press('P', 10)
  await a.until("!!document.querySelector('.command-palette')", 15000)
  await a.fill('.command-palette input[type=search]', 'play')
  shots.push(await a.capture('command-palette'))
  // 遮罩在空白处 mousedown 会关闭面板；比 Esc 更可靠（焦点可能不在面板内）。
  for (const type of ['mousePressed', 'mouseReleased']) await a.client.send('Input.dispatchMouseEvent', { type, x: 30, y: 972, button: 'left', clickCount: 1 })
  await a.until("!document.querySelector('.command-palette')", 10000)

  await u.workspace('Manage')
  shots.push(await a.capture('manage'))
  await u.workspace('Design')

  await u.bottom('assets', 'Assets')
  shots.push(await a.capture('assets'))
})

console.log(JSON.stringify(shots, null, 2))
