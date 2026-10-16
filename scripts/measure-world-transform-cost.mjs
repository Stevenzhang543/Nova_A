/** 判定 worldTransform 的单次复杂度：层级索引是否真的把它变成 O(1)。
 * 这决定 Y-Sort 排序键的真实代价，上一轮明确标注为"未测量"。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const opened = await openMediaAuditModules({ repository: process.cwd(), bases: [process.cwd()] },
  { hierarchy: 'world/hierarchy', box: 'world/BoxEntity' })
const { hierarchy, box } = opened.modules

/** 构造一条 depth 层父子链，返回实体数组与最深节点。 */
function chain(depth) {
  const entities = []
  let parentUuid = null
  let deepest = null
  for (let i = 0; i < depth; i++) {
    const entity = new box.BoxEntity(i + 1, { x: 1, y: 1 }, { x: 1, y: 1 })
    entities.push(entity)
    if (parentUuid !== null) hierarchy.setParent(entity, parentUuid, entities, false)
    parentUuid = entity.uuid
    deepest = entity
  }
  return { entities, deepest }
}

/** 以固定迭代次数测量单次 worldTransform 的纳秒成本。 */
function measure(depth, iterations) {
  const { entities, deepest } = chain(depth)
  hierarchy.prepareHierarchyIndex(entities)
  for (let i = 0; i < 200; i++) hierarchy.worldTransform(deepest, entities)
  const start = process.hrtime.bigint()
  for (let i = 0; i < iterations; i++) hierarchy.worldTransform(deepest, entities)
  const elapsed = Number(process.hrtime.bigint() - start)
  return elapsed / iterations
}

const shallow = measure(1, 20000)
const deep = measure(200, 20000)
const ratio = deep / shallow
console.log('depth 1   : ' + shallow.toFixed(1) + ' ns/call')
console.log('depth 200 : ' + deep.toFixed(1) + ' ns/call')
console.log('ratio     : ' + ratio.toFixed(2) + 'x')

const out = process.env.NOVA_WORLDTRANSFORM_REPORT || 'reports/phase2/world-transform-cost.json'
fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true })
fs.writeFileSync(out, JSON.stringify({
  generatedAt: new Date().toISOString(),
  nsPerCallDepth1: shallow,
  nsPerCallDepth200: deep,
  ratio,
  verdict: ratio < 1.5 ? 'flat-with-depth (indexed lookup)' : 'grows-with-depth (ancestor walk)',
  note: 'Measures worldTransform on the deepest node of a parent chain after prepareHierarchyIndex.',
}, null, 2) + '\n')
console.log('verdict   : ' + (ratio < 1.5 ? 'flat with depth -> indexed' : 'grows with depth -> ancestor walk'))
console.log('report    : ' + out)
assert.ok(Number.isFinite(shallow) && Number.isFinite(deep), 'both measurements must be finite')
assert.ok(shallow > 0 && deep > 0, 'both measurements must be positive')
