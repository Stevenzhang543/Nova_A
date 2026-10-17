/** C02：局部/世界变换、Keep World 重挂、负缩放、奇异矩阵与环检测。
 * 主指令 §28 将 C02 列为必须验证项，而仓库此前对 transform/reparent 的专项覆盖为 0。 */
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
const near = (a, b, tolerance = 1e-9) => Math.abs(a - b) <= tolerance
const worldOf = (entity, entities) => hierarchy.worldTransform(entity, entities)
const finite = value => Number.isFinite(value)

/** 建立一个父实体与一个子实体，返回数组与引用。 */
const scene = () => {
  const parent = new box.BoxEntity(1, { x: 10, y: 0 }, { x: 1, y: 1 })
  const child = new box.BoxEntity(2, { x: 5, y: 0 }, { x: 1, y: 1 })
  const entities = [parent, child]
  return { parent, child, entities }
}

await test('A child inherits its parent position when the local transform is kept', () => {
  const { parent, child, entities } = scene()
  hierarchy.setParent(child, parent.uuid, entities, false)
  const world = worldOf(child, entities)
  assert.ok(near(world.position.x, 15), 'child world x should be parent 10 plus local 5, saw ' + world.position.x)
  assert.ok(near(world.position.y, 0), 'child world y should stay 0, saw ' + world.position.y)
})

await test('Moving the parent moves the child world transform', () => {
  const { parent, child, entities } = scene()
  hierarchy.setParent(child, parent.uuid, entities, false)
  hierarchy.setWorldTransform(parent, { position: { x: -4, y: 7 }, rotation: 0, scale: { x: 1, y: 1 } }, entities)
  const world = worldOf(child, entities)
  assert.ok(near(world.position.x, 1), 'child world x should follow to 1, saw ' + world.position.x)
  assert.ok(near(world.position.y, 7), 'child world y should follow to 7, saw ' + world.position.y)
})

await test('Reparenting with preserve-world keeps the world transform', () => {
  const { parent, child, entities } = scene()
  hierarchy.setParent(child, parent.uuid, entities, false)
  const before = worldOf(child, entities)
  const other = new box.BoxEntity(3, { x: -100, y: -100 }, { x: 1, y: 1 })
  entities.push(other)
  hierarchy.setParent(child, other.uuid, entities, true)
  const after = worldOf(child, entities)
  assert.ok(near(after.position.x, before.position.x) && near(after.position.y, before.position.y),
    'preserve-world reparent must not move the object: ' + JSON.stringify(before.position) + ' -> ' + JSON.stringify(after.position))
})

await test('Reparenting without preserve-world keeps the local transform instead', () => {
  const { parent, child, entities } = scene()
  hierarchy.setParent(child, parent.uuid, entities, false)
  const other = new box.BoxEntity(3, { x: -100, y: -100 }, { x: 1, y: 1 })
  entities.push(other)
  hierarchy.setParent(child, other.uuid, entities, false)
  const after = worldOf(child, entities)
  assert.ok(near(after.position.x, -95), 'keeping local 5 under a parent at -100 gives -95, saw ' + after.position.x)
})

await test('A mirrored parent mirrors the child world position', () => {
  const { parent, child, entities } = scene()
  hierarchy.setParent(child, parent.uuid, entities, false)
  hierarchy.setWorldTransform(parent, { position: { x: 10, y: 0 }, rotation: 0, scale: { x: -1, y: 1 } }, entities)
  const world = worldOf(child, entities)
  assert.ok(near(world.position.x, 5), 'a parent mirrored about x should place the local +5 child at 5, saw ' + world.position.x)
})

await test('A degenerate parent scale never produces a non-finite world transform', () => {
  const { parent, child, entities } = scene()
  hierarchy.setParent(child, parent.uuid, entities, false)
  hierarchy.setWorldTransform(parent, { position: { x: 3, y: 4 }, rotation: 0, scale: { x: 0, y: 0 } }, entities)
  const world = worldOf(child, entities)
  for (const value of [world.position.x, world.position.y, world.rotation, world.scale.x, world.scale.y]) {
    assert.ok(finite(value), 'degenerate scale must stay finite, saw ' + value)
  }
})

await test('A parent cycle is rejected before it can be created', () => {
  const { parent, child, entities } = scene()
  hierarchy.setParent(child, parent.uuid, entities, false)
  assert.equal(hierarchy.wouldCreateParentCycle(parent, child.uuid, entities), true,
    'parenting a parent under its own descendant must be reported as a cycle')
  assert.equal(hierarchy.wouldCreateParentCycle(child, parent.uuid, entities), false,
    'an ordinary parent link is not a cycle')
})

await test('Descendants are reported for the whole subtree', () => {
  const { parent, child, entities } = scene()
  const grand = new box.BoxEntity(4, { x: 1, y: 1 }, { x: 1, y: 1 })
  entities.push(grand)
  hierarchy.setParent(child, parent.uuid, entities, false)
  hierarchy.setParent(grand, child.uuid, entities, false)
  const ids = hierarchy.descendantsOf(parent, entities).map(/** 取后代 id。 */ e => e.id).sort()
  assert.deepEqual(ids, [2, 4], 'both the child and the grandchild must be reported')
})

const out = process.env.NOVA_TRANSFORM_REPORT || 'reports/phase2/transform-hierarchy.json'
fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true })
fs.writeFileSync(out, JSON.stringify({
  generatedAt: new Date().toISOString(),
  covers: ['local/world composition', 'parent motion propagation', 'keep-world reparent', 'keep-local reparent', 'mirrored parent', 'degenerate scale finiteness', 'cycle rejection', 'subtree enumeration'],
  notCovered: ['interpolation history reset on reparent (runtime-side, not exercised here)'],
  checks,
  status: checks.some(/** 任一失败即整体失败。 */ c => c.status === 'failed') ? 'failed' : 'passed',
}, null, 2) + '\n')
console.log('transform report -> ' + out)
if (checks.some(/** 任一失败即非零退出。 */ c => c.status === 'failed')) process.exitCode = 1
