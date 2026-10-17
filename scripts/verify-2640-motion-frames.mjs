/** 帧级动效验证：确认面板打开过渡真实发生、能收敛，并在系统"减少动态效果"下被跳过。 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { withBrowserAudit } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const packageVersion = JSON.parse(await readFile('package.json', 'utf8')).version
const release = packageVersion.replace(/\.0$/, '')
const results = {}

/** 在页面内安装观察器：目标元素一出现就逐帧采样 transform/opacity。 */
const installSampler = (/** 选择器。 */ selector) => `(() => {
  window.__motion = { samples: [], startedAt: 0 }
  const sel = ${JSON.stringify(selector)}
  const begin = () => {
    const el = document.querySelector(sel)
    if (!el) return false
    window.__motion.startedAt = performance.now()
    const tick = () => {
      const cs = getComputedStyle(el)
      window.__motion.samples.push({ t: Math.round(performance.now() - window.__motion.startedAt), tr: cs.transform, op: cs.opacity })
      if (performance.now() - window.__motion.startedAt < 900) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return true
  }
  if (begin()) return true
  const observer = new MutationObserver(() => { if (begin()) observer.disconnect() })
  observer.observe(document.body, { childList: true, subtree: true })
  return true
})()`

await withBrowserAudit({ release, name: 'motion-frames-2640', width: 1600, height: 1000 }, async a => {
  const u = worldUserControls17(a)
  await a.until("!!document.querySelector('.project-manager')", 30000)
  await a.click('.quick-actions .new-project'); await a.until("!!document.querySelector('.creation-card')")
  await a.fill('.creation-card header input', 'Motion frames')
  await a.click('[data-template-id="empty"]'); await a.click('.create-button')
  await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000)
  if (await a.evaluate("!!document.querySelector('.onboarding-scrim')")) {
    await a.evaluate("document.querySelector('.onboarding-scrim').focus()"); await a.press('Escape')
    await a.until("!document.querySelector('.onboarding-scrim')")
  }

  /** 测量一次面板打开过渡，返回去重后的状态数与收敛情况。 */
  async function measurePaletteOpen(label) {
    await a.evaluate(installSampler('.command-palette'))
    await a.press('P', 10)
    await a.until("!!document.querySelector('.command-palette')", 10000)
    await new Promise(resolve => setTimeout(resolve, 1050))
    const data = await a.evaluate("window.__motion.samples")
    const distinct = new Set(data.map(/** 取变换值。 */ s => s.tr + '|' + s.op)).size
    // 以 600ms 之后的所有采样判断是否收敛，避免动画仍在进行时窗口截断造成误判。
    const tail = data.filter(/** 只取动画预期结束后的采样。 */ s => s.t >= 600)
    const settled = tail.length >= 3 && tail.every(/** 后段状态一致即视为收敛。 */ s => s.tr === tail[0].tr && s.op === tail[0].op)
    // 关闭面板，回到可再次打开的状态。
    for (const type of ['mousePressed', 'mouseReleased']) await a.client.send('Input.dispatchMouseEvent', { type, x: 30, y: 972, button: 'left', clickCount: 1 })
    await a.until("!document.querySelector('.command-palette')", 10000)
    return { label, samples: data.length, distinct, settled, first: data[0]?.tr, last: data[data.length - 1]?.tr }
  }

  results.normal = await measurePaletteOpen('normal')

  // 逻辑不等待动画：关闭必须立即生效，而不是等入场动画播完。
  await a.evaluate(installSampler('.command-palette'))
  await a.press('P', 10)
  await a.until("!!document.querySelector('.command-palette')", 10000)
  const closeStart = Date.now()
  for (const type of ['mousePressed', 'mouseReleased']) await a.client.send('Input.dispatchMouseEvent', { type, x: 30, y: 972, button: 'left', clickCount: 1 })
  await a.until("!document.querySelector('.command-palette')", 5000)
  results.closeLatencyMs = Date.now() - closeStart

  // 连续快速切换不应把界面卡在中间状态或残留遮罩。
  await a.evaluate(installSampler('.command-palette'))
  for (let i = 0; i < 3; i += 1) {
    await a.press('P', 10)
    await a.until("!!document.querySelector('.command-palette')", 10000)
    for (const type of ['mousePressed', 'mouseReleased']) await a.client.send('Input.dispatchMouseEvent', { type, x: 30, y: 972, button: 'left', clickCount: 1 })
    await a.until("!document.querySelector('.command-palette')", 10000)
  }
  results.rapidToggle = { paletteLeft: await a.evaluate("!!document.querySelector('.command-palette')"), scrimLeft: await a.evaluate("!!document.querySelector('.palette-scrim')") }

  // 系统级"减少动态效果"：通过 CDP 模拟媒体特性，应用应经 matchMedia 实时响应。
  await a.client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await new Promise(resolve => setTimeout(resolve, 350))
  results.systemPrefersReduced = await a.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")
  results.reduced = await measurePaletteOpen('reduced')

  await a.client.send('Emulation.setEmulatedMedia', { features: [] })

  console.log(JSON.stringify(results, null, 1))

  assert.ok(results.normal.samples >= 6, 'normal motion must produce multiple frames, saw ' + results.normal.samples)
  assert.ok(results.normal.distinct >= 3, 'normal motion must animate through several states, saw ' + results.normal.distinct)
  assert.ok(results.normal.settled, 'normal motion must settle at a final state')
  assert.equal(results.systemPrefersReduced, true, 'the page must observe the emulated system preference')
  assert.ok(results.closeLatencyMs < 500, 'closing must not wait for the entrance animation to finish, took ' + results.closeLatencyMs + 'ms')
  assert.equal(results.rapidToggle.paletteLeft, false, 'rapid toggling must not leave the palette open')
  assert.equal(results.rapidToggle.scrimLeft, false, 'rapid toggling must not leave a transparent click layer')
  assert.ok(results.reduced.distinct <= 2, 'reduced motion must not animate through multiple states, saw ' + results.reduced.distinct)
  a.observations.push({ id: 'motion-frames', ...results })
})
