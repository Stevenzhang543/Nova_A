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
})
