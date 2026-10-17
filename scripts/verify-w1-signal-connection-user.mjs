/** §23.4 连接闭环：建立 → 列表展示 → 回调缺失告警 → 保存 → 重开仍在。
 * 使用 top-down 模板，因为其中的节点已挂脚本资源，无需额外创建资产。 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const packageVersion = JSON.parse(await readFile('package.json', 'utf8')).version
const release = process.argv.find(arg => arg.startsWith('--qualification-release='))?.split('=')[1] ?? packageVersion.replace(/\.0$/, '')

await withBrowserAudit({ release, name: 'w1-signal-connection', width: 1600, height: 1000 }, async a => {
  const u = worldUserControls17(a)
  let saved

  /** 通过 Inspector 的添加组件按钮与选择器添加一个组件。 */
  async function addComponent(kind) {
    await u.expandInspector()
    await a.click('.add-component-trigger')
    await a.until("!!document.querySelector('.ui-dialog .component-picker-list')", 10000)
    await a.fill('.ui-dialog input[type=search]', kind)
    await a.until(`[...document.querySelectorAll('.ui-dialog .component-picker-list button.component-main')].some(b => b.textContent.includes(${JSON.stringify(kind)}))`, 10000)
    await a.click('.ui-dialog .component-picker-list button.component-main', 0)
    await a.until("!document.querySelector('.ui-dialog .component-picker-list')", 10000)
    await wait(220)
  }

  await a.check('Signal connections can be created, listed and persisted', async () => {
    if (await a.evaluate("!!document.querySelector('.editor-root')")) {
      await a.client.send('Page.reload'); await a.until("!!document.querySelector('.project-manager')", 30000)
    }
    await a.click('.quick-actions .new-project'); await a.until("!!document.querySelector('.creation-card')")
    await a.fill('.creation-card header input', 'Signal connection acceptance')
    await a.click('[data-template-id="top-down"]'); await a.click('.create-button')
    await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000)
    if (await a.evaluate("!!document.querySelector('.onboarding-scrim')")) {
      await a.evaluate("document.querySelector('.onboarding-scrim').focus()"); await a.press('Escape')
      await a.until("!document.querySelector('.onboarding-scrim')")
    }

    // 模板中的触发器只是 sensor collider，没有 Area2D 组件；先给 Player 添加 Area2D 才有区域信号。
    await u.entity('Player'); await u.expandInspector()
    await addComponent('Area2D')
    // 添加组件后 Inspector 会重组，折叠组需要重新展开；再滚动到视口内才可点击。
    await u.expandInspector()
    await a.until("!!document.querySelector('[data-connect-signal=\"area.entered\"]')", 15000)
    await a.evaluate("document.querySelector('[data-connect-signal=\"area.entered\"]')?.scrollIntoView({block:'center'})")
    await a.click('[data-connect-signal="area.entered"]')
    await a.until("!!document.querySelector('.ui-dialog')", 10000)

    // 接收方选 Enemy，回调故意用一个不存在的函数名，以验证缺失告警。
    const receiverOptions = await a.evaluate("[...document.querySelectorAll('.ui-dialog select option')].map(o => o.textContent.trim())")
    assert.ok(receiverOptions.length > 0, 'the dialog must offer receivers that own scripts, saw ' + receiverOptions.join(','))
    const enemyUuid = await a.evaluate("(()=>{const option=[...document.querySelectorAll('.ui-dialog select option')].find(item => item.textContent.trim() === 'Enemy');return option ? option.value : null})()")
    assert.ok(enemyUuid, 'Enemy must be offered as a receiver because it owns a script')
    await a.select('.ui-dialog select', enemyUuid)
    await a.fill('.ui-dialog input:not([readonly])', 'on_enemy_signal')
    await a.evaluate('document.activeElement?.blur()')
    await a.click('.ui-dialog button.primary')
    await a.until("!document.querySelector('.ui-dialog')", 10000)

    // 接收方视角：连接应出现在 Signal connections 区，并提示回调缺失。
    await u.entity('Enemy'); await u.expandInspector()
    await a.until("!!document.querySelector('[data-connection-signal=\"area.entered\"]')", 15000)
    const warning = await a.evaluate("document.querySelector('[data-missing-callback=\"on_enemy_signal\"]')?.textContent?.trim() ?? null")
    assert.ok(warning, 'a callback missing from the receiver script must be flagged, saw ' + String(warning))

    saved = await u.save('signal-connection')
    const assets = saved.document.assets.filter(/** 只取脚本资源。 */ asset => asset.script)
    const withConnection = assets.filter(/** 找出带该连接的脚本资源。 */ asset => (asset.script.signalConnections ?? []).some(/** 匹配刚建立的连接。 */ c => c.signal === 'area.entered' && c.callback === 'on_enemy_signal'))
    assert.equal(withConnection.length, 1, 'exactly one script asset must carry the new connection, saw ' + withConnection.length)
    const connection = withConnection[0].script.signalConnections.find(/** 取出该连接。 */ c => c.signal === 'area.entered' && c.callback === 'on_enemy_signal')
    assert.ok(connection.source, 'the connection must record the emitting entity uuid')
    assert.ok(connection.target, 'the connection must record the receiving entity uuid')
    assert.equal(connection.enabled, true, 'a freshly created connection is enabled')

    // 重开后再确认一次，证明它进入了持久化文档而不是仅存在于内存。
    await u.open(saved.file)
    const reopened = await u.save('signal-connection-reopened')
    const reopenedAssets = reopened.document.assets.filter(/** 只取脚本资源。 */ asset => asset.script)
    const stillThere = reopenedAssets.some(/** 连接仍然存在。 */ asset => (asset.script.signalConnections ?? []).some(/** 匹配同一连接。 */ c => c.signal === 'area.entered' && c.callback === 'on_enemy_signal'))
    assert.equal(stillThere, true, 'the connection must survive save and reopen')

    // 删除后必须从文档中消失，不能只移除 DOM。
    await u.entity('Enemy'); await u.expandInspector()
    await a.until("!!document.querySelector('[data-connection-signal=\"area.entered\"]')", 15000)
    await a.click('.signal-remove')
    await a.until("!document.querySelector('[data-connection-signal=\"area.entered\"]')", 15000)
    const afterRemove = await u.save('signal-connection-removed')
    const stillSaved = afterRemove.document.assets.some(/** 检查是否仍有该连接。 */ asset => (asset.script?.signalConnections ?? []).some(/** 匹配被删连接。 */ c => c.signal === 'area.entered' && c.callback === 'on_enemy_signal'))
    assert.equal(stillSaved, false, 'a removed connection must not remain in the saved document')

    a.observations.push({ id: 'w1-signal-connection', receiverOptions, warning, connection, removed: true })
  })
})
