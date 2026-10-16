/** worldTransform 的独立参考语义：为后续批量/缓存优化提供"必须逐个相等"的判定基准。
 * 独立实现组合公式，不复用产品代码，因此能捕获产品实现的回归。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const checks = []
async function test(name, run) {
  try { await run(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error && error.message || error) }); console.error('FAIL ' + name + ' :: ' + (error && error.message || error)) }
}

const opened = await openMediaAuditModules({ repository: process.cwd(), bases: [process.cwd()] },
  { hierarchy: 'world/hierarchy', box: 'world/BoxEntity' })
const { hierarchy, box } = opened.modules

/** 测试内独立实现的组合公式（与产品实现分开书写，用于交叉验证）。 */
function oracleCompose(parent, local) {
  const cos = Math.cos(parent.rotation), sin = Math.sin(parent.rotation)
  const ox = local.position.x * parent.scale.x, oy = local.position.y * parent.scale.y
  return {
    position: { x: parent.position.x + ox * cos - oy * sin, y: parent.position.y + ox * sin + oy * cos },
    rotation: parent.rotation + local.rotation * Math.sign(parent.scale.x * parent.scale.y),
    scale: { x: parent.scale.x * local.scale.x, y: parent.scale.y * local.scale.y },
  }
}
/** 对一条从根到叶的实体链，用测试内公式自顶向下推算世界变换。 */
function oracleChain(chain) {
  let world = { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } }
  let first = true
  for (const entity of chain) {
    const local = {
      position: { x: entity.transform.position.x, y: entity.transform.position.y },
      rotation: entity.transform.rotation,
      scale: {
        x: (entity.transform.scale.x < 0 ? -1 : 1) * Math.max(Math.abs(entity.transform.scale.x), 1e-6),
        y: (entity.transform.scale.y < 0 ? -1 : 1) * Math.max(Math.abs(entity.transform.scale.y), 1e-6),
      },
    }
    // The root has no parent, so its world transform is its own local transform.
    world = first ? { position: { ...local.position }, rotation: local.rotation, scale: { ...local.scale } } : oracleCompose(world, local)
    first = false
  }
  return world
}

/** 建立 root -> mid -> leaf 三层链，并施加旋转与负缩放。 */
function chain3() {
  const root = new box.BoxEntity(1, { x: 3, y: -2 }, { x: 2, y: 1.5 })
  const mid = new box.BoxEntity(2, { x: 4, y: 1 }, { x: 1, y: 1 })
  const leaf = new box.BoxEntity(3, { x: -2, y: 5 }, { x: 1, y: 1 })
  const entities = [root, mid, leaf]
  root.transform.rotation = 0.7
  mid.transform.rotation = -0.35
  mid.transform.scale = { x: -1, y: 2 }
  leaf.transform.rotation = 1.1
  hierarchy.prepareHierarchyIndex(entities)
  hierarchy.setParent(mid, root.uuid, entities, false)
  hierarchy.setParent(leaf, mid.uuid, entities, false)
  return { root, mid, leaf, entities }
}

const near = (a, b, tolerance = 1e-9) => Math.abs(a - b) <= tolerance
const compare = (actual, expected, label) => {
  assert.ok(near(actual.position.x, expected.position.x), label + ' position.x ' + actual.position.x + ' vs ' + expected.position.x)
  assert.ok(near(actual.position.y, expected.position.y), label + ' position.y ' + actual.position.y + ' vs ' + expected.position.y)
  assert.ok(near(actual.rotation, expected.rotation), label + ' rotation ' + actual.rotation + ' vs ' + expected.rotation)
  assert.ok(near(actual.scale.x, expected.scale.x), label + ' scale.x ' + actual.scale.x + ' vs ' + expected.scale.x)
  assert.ok(near(actual.scale.y, expected.scale.y), label + ' scale.y ' + actual.scale.y + ' vs ' + expected.scale.y)
}

await test('Product composition matches an independently written composition', () => {
  const { root, mid, leaf, entities } = chain3()
  compare(hierarchy.worldTransform(leaf, entities), oracleChain([root, mid, leaf]), 'leaf')
  compare(hierarchy.worldTransform(mid, entities), oracleChain([root, mid]), 'mid')
  compare(hierarchy.worldTransform(root, entities), oracleChain([root]), 'root')
})

await test('Repeated calls are stable, so a frame-scoped cache can be compared against them', () => {
  const { leaf, entities } = chain3()
  const first = hierarchy.worldTransform(leaf, entities)
  for (let i = 0; i < 5; i++) compare(hierarchy.worldTransform(leaf, entities), first, 'repeat ' + i)
})

await test('A parent edit is visible on the next call (the property a global cache would break)', () => {
  const { root, mid, leaf, entities } = chain3()
  const before = hierarchy.worldTransform(leaf, entities)
  root.transform.position = { x: 100, y: 100 }
  hierarchy.invalidateHierarchyIndex()
  const after = hierarchy.worldTransform(leaf, entities)
  assert.ok(!near(before.position.x, after.position.x), 'a parent edit must move the descendant world transform')
  compare(after, oracleChain([root, mid, leaf]), 'leaf after parent edit')
})

await test('Reparenting changes the composed result and matches the oracle', () => {
  const { root, mid, leaf, entities } = chain3()
  hierarchy.setParent(leaf, root.uuid, entities, false)
  compare(hierarchy.worldTransform(leaf, entities), oracleChain([root, leaf]), 'leaf reparented to root')
  hierarchy.setParent(leaf, null, entities, false)
  compare(hierarchy.worldTransform(leaf, entities), oracleChain([leaf]), 'leaf detached')
})

await test('The batch solver matches per-call results for every entity in a chain', () => {
  const { entities } = chain3()
  const batch = hierarchy.worldTransformsFor(entities, entities)
  for (const entity of entities) compare(batch.get(entity.uuid), hierarchy.worldTransform(entity, entities), 'batch entity ' + entity.id)
  compare(batch.get(entities[2].uuid), oracleChain(entities), 'batch leaf vs oracle')
})

await test('The batch solver matches per-call results on a long chain and on a subset', () => {
  const entities = []
  for (let i = 0; i < 60; i++) {
    const entity = new box.BoxEntity(i + 1, { x: i % 5 - 2, y: i % 7 - 3 }, { x: 1 + (i % 3), y: 1 })
    if (i % 4 === 1) entity.transform.scale = { x: -1.5, y: 0.5 }
    entity.transform.rotation = (i % 9) * 0.13
    entities.push(entity)
    if (i > 0) hierarchy.setParent(entity, entities[i - 1].uuid, entities, false)
  }
  hierarchy.prepareHierarchyIndex(entities)
  const batch = hierarchy.worldTransformsFor(entities, [entities[59]])
  for (const entity of entities) compare(batch.get(entity.uuid), hierarchy.worldTransform(entity, entities), 'long chain entity ' + entity.id)
  const subset = [entities[10], entities[30], entities[59]]
  const partial = hierarchy.worldTransformsFor(entities, subset)
  for (const entity of subset) compare(partial.get(entity.uuid), hierarchy.worldTransform(entity, entities), 'subset entity ' + entity.id)
})

await test('A cyclic parent chain terminates and stays finite in both paths', () => {
  // setParent rejects cycles, but a loaded or hand-edited document could still contain one.
  // A cycle has no valid world transform, and cycle breaking is order dependent: the recursive
  // path breaks at the queried entity while the batch path breaks where traversal first revisits
  // a node already being resolved. The two therefore disagree on cyclic input, and the recursive
  // path is not even self-consistent (a and b do not agree on each other's placement), so the
  // guarantee tested here is termination and finiteness, not agreement.
  const a = new box.BoxEntity(1, { x: 1, y: 0 }, { x: 1, y: 1 })
  const b = new box.BoxEntity(2, { x: 0, y: 2 }, { x: 1, y: 1 })
  const entities = [a, b]
  a.parentUuid = b.uuid
  b.parentUuid = a.uuid
  hierarchy.invalidateHierarchyIndex()
  const started = Date.now()
  const batch = hierarchy.worldTransformsFor(entities, entities)
  const elapsed = Date.now() - started
  assert.ok(elapsed < 2000, 'the batch solver must terminate on a cycle, took ' + elapsed + ' ms')
  const allFinite = (/** 检查世界变换各分量是否有限。 */ value) =>
    [value.position.x, value.position.y, value.rotation, value.scale.x, value.scale.y].every(Number.isFinite)
  for (const entity of entities) {
    const batched = batch.get(entity.uuid)
    assert.ok(batched, 'the batch path must still produce a value for ' + entity.id)
    assert.ok(allFinite(batched), 'batch value must be finite for ' + entity.id)
    assert.ok(allFinite(hierarchy.worldTransform(entity, entities)), 'per-call value must be finite for ' + entity.id)
  }
})

await test('Valid hierarchies still agree exactly, so the divergence is confined to invalid input', () => {
  const { entities } = chain3()
  const batch = hierarchy.worldTransformsFor(entities, entities)
  for (const entity of entities) compare(batch.get(entity.uuid), hierarchy.worldTransform(entity, entities), 'valid entity ' + entity.id)
})

await test('A missing parent falls back to the local transform in both paths', () => {
  const orphan = new box.BoxEntity(1, { x: 7, y: -3 }, { x: 2, y: 2 })
  orphan.parentUuid = 'uuid-that-does-not-exist'
  const entities = [orphan]
  hierarchy.invalidateHierarchyIndex()
  const batch = hierarchy.worldTransformsFor(entities, entities)
  compare(batch.get(orphan.uuid), hierarchy.worldTransform(orphan, entities), 'orphan batch vs per-call')
  assert.ok(near(batch.get(orphan.uuid).position.x, 7), 'a missing parent must fall back to the local transform')
})

const out = process.env.NOVA_WORLD_ORACLE_REPORT || 'reports/phase2/world-transform-oracle.json'
fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true })
fs.writeFileSync(out, JSON.stringify({
  generatedAt: new Date().toISOString(),
  purpose: 'Independent reference semantics that any batch or cached transform path must match exactly.',
  checks,
  status: checks.some(/** 任一失败即整体失败。 */ c => c.status === 'failed') ? 'failed' : 'passed',
}, null, 2) + '\n')
console.log('oracle report -> ' + out)
if (checks.some(/** 任一失败即非零退出。 */ c => c.status === 'failed')) process.exitCode = 1
