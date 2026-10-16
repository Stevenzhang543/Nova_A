/** A/B 实测 Y-Sort 排序键修复：比较器内求值（修复前）对比每实体预计算（修复后）。
 * 只读基准，重建两种策略，不改产品代码。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const opened = await openMediaAuditModules({ repository: process.cwd(), bases: [process.cwd()] },
  { hierarchy: 'world/hierarchy', box: 'world/BoxEntity' })
const { hierarchy, box } = opened.modules

/** 建立 count 个 YSort 实体，组成若干条长度为 depth 的父子链。 */
function scene(count, depth) {
  const entities = []
  for (let i = 0; i < count; i++) {
    const entity = new box.BoxEntity(i + 1, { x: i % 37, y: i % 53 }, { x: 1, y: 1 })
    entity.authoring.sortMode = 'YSort'
    entity.authoring.zOrder = i % 5
    entity.renderer.orderInLayer = i % 7
    entities.push(entity)
    if (i % depth !== 0) hierarchy.setParent(entity, entities[i - 1].uuid, entities, false)
  }
  hierarchy.prepareHierarchyIndex(entities)
  return entities
}

/** 与 sceneRenderer.authoredOrder 同构的排序键。 */
const key = (entity, entities, worldY) =>
  entity.renderer.orderInLayer + entity.authoring.zOrder +
  (entity.authoring.sortMode === 'YSort' ? -(worldY ?? hierarchy.worldTransform(entity, entities).position.y) * 0.000001 : 0)

/** 本轮：排序键按拓扑序批量求解世界变换（每个祖先只算一次）。 */
const sortBatch = (entities) => {
  const worlds = hierarchy.worldTransformsFor(entities, entities)
  const keys = new Map()
  for (const entity of entities) keys.set(entity.id, key(entity, entities, worlds.get(entity.uuid).position.y))
  return [...entities].sort((first, second) => keys.get(first.id) - keys.get(second.id) || first.id - second.id)
}

/** 修复前：比较器每次比较都重新求键。 */
const sortBefore = (entities) => [...entities].sort((first, second) => key(first, entities) - key(second, entities) || first.id - second.id)
/** 修复后：每个实体只求一次键。 */
const sortAfter = (entities) => {
  const keys = new Map()
  for (const entity of entities) keys.set(entity.id, key(entity, entities))
  return [...entities].sort((first, second) => keys.get(first.id) - keys.get(second.id) || first.id - second.id)
}

/** 重复运行并返回中位耗时（毫秒）。 */
function bench(run, iterations) {
  run()
  const samples = []
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint()
    run()
    samples.push(Number(process.hrtime.bigint() - start) / 1e6)
  }
  samples.sort(/** 升序排列以取中位数。 */ (a, b) => a - b)
  return samples[Math.floor(samples.length / 2)]
}

const results = []
for (const [count, depth] of [[1000, 10], [1000, 50]]) {
  const entities = scene(count, depth)
  const before = bench(() => sortBefore(entities), 5)
  const after = bench(() => sortAfter(entities), 5)
  const batch = bench(() => sortBatch(entities), 5)
  const orderOf = (run) => JSON.stringify(run(entities).map(/** 取 id 以便比较顺序。 */ e => e.id))
  const same = orderOf(sortBefore) === orderOf(sortAfter) && orderOf(sortAfter) === orderOf(sortBatch)
  console.log('n=' + count + ' depth=' + depth + ' | before ' + before.toFixed(2) + ' ms | per-entity ' + after.toFixed(2) + ' ms | batch ' + batch.toFixed(2) + ' ms | total ' + (before / batch).toFixed(1) + 'x | order identical: ' + same)
  results.push({ count, depth, beforeMs: before, perEntityMs: after, batchMs: batch, speedupTotal: before / batch, orderIdentical: same })
  assert.ok(same, 'both strategies must produce the same order')
}

const out = process.env.NOVA_YSORT_REPORT || 'reports/phase2/ysort-sort-key.json'
fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true })
fs.writeFileSync(out, JSON.stringify({
  generatedAt: new Date().toISOString(),
  note: 'Median of 5 runs per strategy, reconstructed algorithms, synthetic scene, no GPU or frame pipeline involved.',
  results,
}, null, 2) + '\n')
console.log('report -> ' + out)
