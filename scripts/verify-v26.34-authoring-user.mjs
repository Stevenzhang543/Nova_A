/** Visible editor authoring, nested reusable objects, history, and actual disk roundtrip. */
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const release = process.argv.find(arg => arg.startsWith('--qualification-release='))?.split('=')[1] ?? '26.34'
assert.match(release, /^26\.(?:34|35)$/)
assert.equal(JSON.parse(await readFile('package.json', 'utf8')).version, release + '.0')
const semanticAssets = assets => assets.map(asset => { let source = asset.source; try { source = JSON.parse(source) } catch {} return { ...asset, source } })
const activeEntities = document => document.scenes.find(scene => scene.uuid === document.activeSceneUuid).entities
const transform = entity => entity.components.find(component => component.kind === 'Transform2D').data

await withBrowserAudit({ release, name: 'authoring-user', width: 1600, height: 1000 }, async a => {
  const u = worldUserControls17(a), positionField = '[data-property-path="Transform.position"] input'
  const parentSelector = '.config-panel select[aria-label="Parent entity"]'
  let marker, nested, instantiated
  async function renameSelected(name) {
    const point = await a.point('.entity-item.primary .name')
    await a.client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 2 })
    await a.client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 2 })
    await a.until("!!document.querySelector('.entity-item .edit-input')")
    await a.fill('.entity-item .edit-input', name)
    await a.until(`document.querySelector('.entity-item.primary .name')?.title.startsWith(${JSON.stringify(name)})`)
  }
  async function create(kind, name, position) {
    await u.workspace('Design'); await a.click('.toolbar-content>button', 0)
    await a.until("!!document.querySelector('.authoring-dialog .palette-search input')")
    await a.fill('.authoring-dialog .palette-search input', kind)
    await a.click('.authoring-dialog footer button.primary')
    await a.until("!document.querySelector('.authoring-dialog')&&!!document.querySelector('.entity-item.primary .name')")
    await renameSelected(name); await u.expandInspector()
    await u.field(positionField, position[0], 0); await u.field(positionField, position[1], 1)
    assert.deepEqual(await u.position(), position)
  }
  async function parent(name) {
    const uuid = await a.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(parentSelector)});return [...e.options].find(option=>option.textContent.startsWith(${JSON.stringify(name + '_')}))?.value})()`)
    assert.ok(uuid, 'Visible parent option ' + name)
    await a.select(parentSelector, uuid)
    return uuid
  }
  async function history(key, selectionName) {
    await a.evaluate('document.activeElement?.blur()'); await a.press(key, 2); await wait(180)
    if (selectionName) { await u.entity(selectionName); await u.expandInspector() }
  }
  async function prefabAction(label, selectionName) {
    await u.expandInspector(); await a.clickText('.prefab-actions button', label, true); await wait(180)
    // Instance-wide actions intentionally select their affected subtree; inspect a member through the visible hierarchy.
    if (selectionName) { await u.entity(selectionName); await u.expandInspector() }
  }
  async function capture(label) {
    while (await a.evaluate("!!document.querySelector('.toast-stack article button:last-child')")) await a.click('.toast-stack article button:last-child')
    await a.evaluate("document.querySelector('[data-property-path=\"Transform.position\"]')?.scrollIntoView({block:'center'})")
    await a.capture(label)
  }

  await a.check('Fresh project and real imported SVG asset survive an actual Save Project download', async () => {
    assert.ok(await a.evaluate(`document.body.innerText.includes(${JSON.stringify(release)})`), 'Browser must show the current built release')
    await a.click('.quick-actions .new-project'); await a.until("!!document.querySelector('.creation-card')")
    await a.fill('.creation-card header input', 'Nova 26.34 Nested Authoring'); await a.click('[data-template-id="empty"]'); await a.click('.create-button')
    await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')", 30000)
    if (await a.evaluate("!!document.querySelector('.onboarding-scrim')")) { await a.evaluate("document.querySelector('.onboarding-scrim').focus()"); await a.press('Escape'); await a.until("!document.querySelector('.onboarding-scrim')") }
    await u.bottom('assets', 'Assets')
    const file = join(a.evidence, 'v26.34-authoring-marker.svg')
    await writeFile(file, '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" fill="#456c9e"/><path d="M6 16h20M16 6v20" stroke="#f4d278" stroke-width="4"/></svg>\n')
    let chooser
    const off = a.client.on('Page.fileChooserOpened', event => { chooser = event })
    try {
      await a.client.send('Page.setInterceptFileChooserDialog', { enabled: true }); await a.click('.asset-actions-row button.primary')
      const end = Date.now() + 10000; while (!chooser && Date.now() < end) await wait(50)
      assert.ok(chooser, 'Import assets opens a real file chooser'); await a.client.send('DOM.setFileInputFiles', { files: [file], backendNodeId: chooser.backendNodeId })
    } finally { off() }
    await a.until("[...document.querySelectorAll('.asset-grid article strong')].some(e=>e.textContent==='v26.34-authoring-marker.svg')", 30000)
    const saved = await u.save('26-34-authoring-imported')
    marker = saved.document.assets.find(asset => asset.name === 'v26.34-authoring-marker.svg')
    assert.ok(marker); assert.equal(marker.assetType, 'image'); assert.ok(marker.source.startsWith('data:image/'))
    await capture('imported-asset')
  })

  await a.check('Visible object creation and parent selection build nested prefabs with preserved local transforms and asset references', async () => {
    await create('Empty', 'OuterRoot', [10, 5])
    await create('Rectangle', 'InnerRoot', [2, 1])
    await create('Circle', 'Leaf', [4, 3])
    await a.select('.config-panel select[aria-label="Image texture"]', 'asset://' + marker.uuid)
    await parent('InnerRoot'); assert.deepEqual(await u.position(), [2, 2], 'Reparent preserves world position through a changed local transform')
    await u.entity('InnerRoot'); await u.expandInspector(); await a.clickText('.config-panel button', 'Create prefab', true); await a.until("!!document.querySelector('.prefab-actions')")
    await parent('OuterRoot'); assert.deepEqual(await u.position(), [-8, -4])
    await u.entity('OuterRoot'); await u.expandInspector(); await a.clickText('.config-panel button', 'Create prefab', true); await a.until("!!document.querySelector('.prefab-actions')")
    nested = await u.save('26-34-authoring-nested')
    const entities = activeEntities(nested.document), root = entities.find(entity => entity.name === 'OuterRoot'), inner = entities.find(entity => entity.name === 'InnerRoot'), leaf = entities.find(entity => entity.name === 'Leaf')
    assert.equal(transform(inner).parentUuid, root.uuid); assert.equal(transform(leaf).parentUuid, inner.uuid)
    assert.deepEqual(transform(inner).position, { x: -8, y: -4 }); assert.deepEqual(transform(leaf).position, { x: 2, y: 2 })
    assert.equal(inner.prefabAsset, root.prefabAsset); assert.equal(leaf.prefabAsset, root.prefabAsset)
    assert.equal(inner.prefabLayers.length, 1); assert.equal(leaf.prefabLayers.length, 1); assert.equal(inner.prefabLayers[0].asset, leaf.prefabLayers[0].asset)
    assert.notEqual(inner.prefabLayers[0].asset, root.prefabAsset)
    assert.equal(leaf.components.find(component => component.kind === 'ShapeRenderer2D').data.textureAsset, 'asset://' + marker.uuid)
    assert.equal(nested.document.assets.filter(asset => asset.assetType === 'prefab').length, 2)
    await capture('nested-prefab-hierarchy')
  })

  await a.check('Nested prefab revert, source apply, and independent position edits support real Undo and Redo', async () => {
    await u.entity('OuterRoot'); await u.expandInspector()
    await u.field(positionField, 17, 0); await u.field(positionField, 11, 1)
    await history('z'); assert.deepEqual(await u.position(), [17, 5], 'Y edit is independent')
    await history('y'); assert.deepEqual(await u.position(), [17, 11])
    await prefabAction('Revert', 'OuterRoot'); assert.deepEqual(await u.position(), [10, 5])
    await history('z', 'OuterRoot'); assert.deepEqual(await u.position(), [17, 11])
    await history('y', 'OuterRoot'); assert.deepEqual(await u.position(), [10, 5])
    await u.entity('Leaf'); await u.expandInspector(); assert.deepEqual(await u.position(), [2, 2])
    await u.field(positionField, 6, 0); await prefabAction('Revert', 'Leaf'); assert.deepEqual(await u.position(), [2, 2])
    await history('z', 'Leaf'); assert.deepEqual(await u.position(), [6, 2])
    await history('y', 'Leaf'); assert.deepEqual(await u.position(), [2, 2])
    await u.entity('OuterRoot'); await u.expandInspector(); await u.field(positionField, 14, 0)
    await prefabAction('Apply to prefab', 'OuterRoot'); await u.field(positionField, 18, 0); await prefabAction('Revert', 'OuterRoot')
    assert.deepEqual(await u.position(), [14, 5], 'Applying to the source changes the subsequent revert baseline')
    await capture('nested-prefab-history')
  })

  await a.check('Asset importer instantiates a separate nested reusable hierarchy with repaired UUID relationships', async () => {
    await u.entity('OuterRoot'); await prefabAction('Locate source'); await a.until("!!document.querySelector('.asset-inspector')")
    await u.activate('.asset-detail-toggle'); await a.clickText('.asset-inspector .importer-tabs button', 'Import', true)
    await a.clickText('.asset-inspector button', 'Instantiate in Scene', true)
    await a.until("Number(document.querySelector('.hierarchy-actions small').textContent)===7")
    instantiated = await u.save('26-34-authoring-instantiated')
    const entities = activeEntities(instantiated.document), original = entities.find(entity => entity.name === 'OuterRoot'), members = entities.filter(entity => entity.prefabAsset === original.prefabAsset)
    assert.equal(members.length, 6); assert.equal(new Set(members.map(entity => entity.uuid)).size, 6)
    const instances = Map.groupBy(members, entity => entity.prefabInstanceUuid)
    assert.equal(instances.size, 2)
    for (const group of instances.values()) {
      assert.equal(group.length, 3)
      const root = group.find(entity => !transform(entity).parentUuid), inner = group.find(entity => transform(entity).parentUuid === root.uuid), leaf = group.find(entity => transform(entity).parentUuid === inner.uuid)
      assert.ok(root && inner && leaf); assert.equal(inner.prefabLayers.length, 1); assert.equal(leaf.prefabLayers.length, 1)
      assert.deepEqual(transform(inner).position, { x: -8, y: -4 }); assert.deepEqual(transform(leaf).position, { x: 2, y: 2 })
      assert.equal(leaf.components.find(component => component.kind === 'ShapeRenderer2D').data.textureAsset, 'asset://' + marker.uuid)
    }
    await capture('nested-prefab-instantiated')
  })

  await a.check('Closing and reopening the actual downloaded project preserves nested identities, hierarchy, overrides, and imported source', async () => {
    await u.open(instantiated.file); const reopened = await u.save('26-34-authoring-reopened')
    assert.deepEqual(reopened.document.scenes, instantiated.document.scenes)
    assert.deepEqual(semanticAssets(reopened.document.assets), semanticAssets(instantiated.document.assets))
    await u.entity('OuterRoot'); await u.expandInspector(); assert.deepEqual(await u.position(), [14, 5])
    await capture('nested-prefab-reopened')
    a.observations.push({ name: 'nested-reusable-authoring', entities: activeEntities(reopened.document).length, prefabAssets: reopened.document.assets.filter(asset => asset.assetType === 'prefab').length, file: reopened.file, scope: 'Fresh visible creation, real SVG chooser import, parent editing, two prefab layers, reversible overrides, asset instantiation, actual disk save/reopen. Does not certify arbitrary nesting depth, prefab variants, every component override, affine shear, or native OS picker behavior.' })
  })
})
