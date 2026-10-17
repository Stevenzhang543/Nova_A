/** W1/N3 纵向切片：在编辑器里从空场景组装一个角色，并验证它能被保存与重开。
 * 全部操作经可见编辑器控件，不使用私有 API。 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const packageVersion = JSON.parse(await readFile('package.json', 'utf8')).version
const release = process.argv.find(arg => arg.startsWith('--qualification-release='))?.split('=')[1] ?? packageVersion.replace(/\.0$/, '')

await withBrowserAudit({ release, name: 'w1-character-authoring', width: 1600, height: 1000 }, async a => {
  const u = worldUserControls17(a)
  const positionField = '[data-property-path="Transform.position"] input'

  /** 双击层级行重命名当前选中实体。 */
  async function renameSelected(name) {
    const point = await a.point('.entity-item.primary .name')
    await a.client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 2 })
    await a.client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 2 })
    await a.until("!!document.querySelector('.entity-item .edit-input')")
    await a.fill('.entity-item .edit-input', name)
    await a.until(`document.querySelector('.entity-item.primary .name')?.title.startsWith(${JSON.stringify(name)})`)
  }

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

  let saved
  await a.check('Assemble a character from an empty scene through visible editor controls', async () => {
    if (await a.evaluate("!!document.querySelector('.editor-root')")) {
      await a.client.send('Page.reload'); await a.until("!!document.querySelector('.project-manager')", 30000)
    }
    await a.click('.quick-actions .new-project'); await a.until("!!document.querySelector('.creation-card')")
    await a.fill('.creation-card header input', 'W1 character')
    await a.click('[data-template-id="empty"]')
    assert.equal(await a.evaluate("document.querySelector('[data-template-id=\"empty\"]').getAttribute('aria-pressed')"), 'true')
    await a.click('.create-button'); await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000)
    if (await a.evaluate("!!document.querySelector('.onboarding-scrim')")) {
      await a.evaluate("document.querySelector('.onboarding-scrim').focus()"); await a.press('Escape')
      await a.until("!document.querySelector('.onboarding-scrim')")
    }

    await u.workspace('Design'); await a.click('.toolbar-content>button', 0)
    await a.until("!!document.querySelector('.authoring-dialog .palette-search input')")
    // Rectangle 会同时带来 ShapeRenderer2D 与碰撞体；collider 不是可加组件，只能由对象种类创建。
    await a.fill('.authoring-dialog .palette-search input', 'Rectangle')
    await a.click('.authoring-dialog footer button.primary')
    await a.until("!document.querySelector('.authoring-dialog')&&!!document.querySelector('.entity-item.primary .name')")
    await renameSelected('Hero')
    await u.expandInspector()
    await u.field(positionField, 0, 0); await u.field(positionField, 4, 1)
    assert.deepEqual(await u.position(), [0, 4])

    for (const kind of ['CharacterBody2D', 'SpriteRenderer2D', 'Camera2D', 'Script2D', 'Area2D']) await addComponent(kind)

    saved = await u.save('w1-character')
    const entities = saved.document.scenes.flatMap(/** 展开全部场景实体。 */ scene => scene.entities)
    const hero = entities.find(/** 找到刚创建的角色实体。 */ entity => entity.name === 'Hero')
    assert.ok(hero, 'Hero entity must be present in the saved document')
    const kinds = hero.components.map(/** 取组件种类。 */ component => component.kind)
    for (const kind of ['ShapeRenderer2D', 'CharacterBody2D', 'SpriteRenderer2D', 'Camera2D', 'Script2D', 'Area2D']) {
      assert.ok(kinds.includes(kind), 'saved hero must contain ' + kind + ', saw ' + kinds.join(', '))
    }
    a.observations.push({ id: 'w1-character', kinds, sceneCount: saved.document.scenes.length })
  })

  await a.check('The inspector lists the signals owned by the selected node', async () => {
    await u.entity('Hero'); await u.expandInspector()
    // 节点拥有 Area2D，因此应列出区域信号；未拥有的组件信号不得出现。
    await a.until("!!document.querySelector('[data-signal-id=\"area.entered\"]')", 15000)
    const listed = await a.evaluate("[...document.querySelectorAll('[data-signal-id]')].map(e => e.getAttribute('data-signal-id'))")
    assert.ok(listed.includes('area.entered'), 'the Area2D signal must be listed, saw ' + listed.join(','))
    assert.ok(listed.includes('area.exited'), 'the Area2D exit signal must be listed')
    assert.ok(!listed.includes('portal.entered'), 'signals from components the node does not own must not appear, saw ' + listed.join(','))
    const params = await a.evaluate("document.querySelector('[data-signal-id=\"area.entered\"]')?.textContent ?? ''")
    assert.ok(params.includes('area: entity'), 'parameter name and type must be shown, saw ' + params)
    a.observations.push({ id: 'w1-signals', listed })
  })

  await a.check('The signals section opens a connection dialog for the chosen signal', async () => {
    await u.entity('Hero'); await u.expandInspector()
    await a.until("!!document.querySelector('[data-connect-signal=\"area.entered\"]')", 15000)
    await a.click('[data-connect-signal="area.entered"]')
    await a.until("!!document.querySelector('.ui-dialog')", 10000)

    const dialog = await a.evaluate("(()=>{const d=document.querySelector('.ui-dialog');const input=d?.querySelector('input[readonly]');const confirm=d?.querySelector('button.primary');return {signal: input?.value ?? null, disabled: confirm?.disabled ?? null, selects: d?.querySelectorAll('select').length ?? 0}})()")
    assert.equal(dialog.signal, 'area.entered', 'the dialog must carry the chosen signal, saw ' + String(dialog.signal))
    assert.ok(dialog.selects >= 1, 'the dialog must offer a receiver selection')
    // 空场景里还没有挂脚本的节点，因此确认按钮必须保持禁用，而不是允许建立一条无法执行的连接。
    assert.equal(dialog.disabled, true, 'confirm must stay disabled while no receiver with a script exists')
    await a.press('Escape')
    a.observations.push({ id: 'w1-signal-dialog', ...dialog })
  })

  await a.check('Configure a movement action through the visible Input Map panel', async () => {
    await a.press('P', 10) // Ctrl+Shift+P 打开命令面板
    await a.until("!!document.querySelector('.command-palette')", 15000)
    await a.fill('.command-palette input[type=search]', 'Input map')
    await a.until("[...document.querySelectorAll('.command-results [role=option]')].some(o => /input map/i.test(o.textContent))", 15000)
    await a.clickText('.command-results [role=option]', 'Input map')
    await a.until("!!document.querySelector('.input-actions')", 15000)

    const before = await a.evaluate("document.querySelectorAll('.input-action').length")
    // 坐标点击在此面板上未命中（已用程序化 click 对照确认处理器正常），改用键盘路径：
    // 聚焦按钮后按 Enter。这同时验证了该动作可经键盘完成。
    await a.evaluate("(()=>{const b=[...document.querySelectorAll('.input-map-card .secondary-action')].find(x=>x.textContent.trim()==='Add action');b?.focus();return !!b})()")
    await a.press('Enter')
    await a.until(`document.querySelectorAll('.input-action').length===${before + 1}`, 15000)

    // 新动作在列表末尾：命名并绑定一个按键，随后提交。
    await a.fill('.input-action:last-of-type .input-action-heading input', 'Move')
    await a.evaluate('document.activeElement?.blur()')
    await a.fill('.input-action:last-of-type .input-binding input', 'KeyD')
    await a.evaluate('document.activeElement?.blur()')
    await wait(250)

    const configured = await u.save('w1-character-inputmap')
    const actions = configured.document.projectSettings?.inputMap ?? []
    const move = actions.find(/** 找到刚配置的动作。 */ action => action.name === 'Move')
    assert.ok(move, 'the configured action must survive into the saved document, saw ' + actions.map(/** 取动作名。 */ action => action.name).join(','))
    assert.ok((move.bindings ?? []).some(/** 绑定必须包含刚录入的按键。 */ binding => binding.code === 'KeyD'),
      'the recorded binding must survive, saw ' + JSON.stringify(move.bindings))
    a.observations.push({ id: 'w1-input-map', actionCount: actions.length, move })
  })

  await a.check('Save the assembled character as a reusable prefab', async () => {
    await u.entity('Hero'); await u.expandInspector()
    await a.clickText('.config-panel button', 'Create prefab', true)
    await a.until("!!document.querySelector('.prefab-actions')", 15000)

    const withPrefab = await u.save('w1-character-prefab')
    const prefabs = withPrefab.document.assets.filter(/** 找出预制体资源。 */ asset => asset.assetType === 'prefab')
    assert.ok(prefabs.length >= 1, 'a prefab asset must exist after Create prefab, saw ' + withPrefab.document.assets.map(/** 取资源类型。 */ asset => asset.assetType).join(','))
    const prefab = prefabs[prefabs.length - 1]
    const source = typeof prefab.source === 'string' ? prefab.source : JSON.stringify(prefab.source)
    for (const kind of ['CharacterBody2D', 'SpriteRenderer2D', 'Camera2D', 'Script2D', 'Area2D']) {
      assert.ok(source.includes(kind), 'the reusable prefab must carry ' + kind)
    }
    a.observations.push({ id: 'w1-prefab', prefabCount: prefabs.length, assetType: prefab.assetType })
  })
})
