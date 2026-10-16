/** 只读审计：仓库内自带项目/场景文档中是否真的存在层级环。
 * 用于为"环状层级策略"提供事实依据，而不是先决定策略再找理由。 */
import fs from 'node:fs'
import path from 'node:path'

const roots = ['reference-projects', 'src/referenceProjects', 'public/reference-projects']
const files = []
const walk = (dir) => {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(json|nova|nova-graph)$/.test(entry.name)) files.push(full)
  }
}
for (const root of roots) walk(root)
for (const dir of ['reports', 'release-audits']) walk(dir)

/** 在任意 JSON 结构里找出所有"同时含 uuid 与 parentUuid"的对象数组，逐组检测环。 */
function findEntityArrays(node, out, trail = '') {
  if (Array.isArray(node)) {
    // Entities always carry a uuid; parentUuid only appears on children, so requiring it on every
    // item would miss arrays whose roots omit it.
    const looksLikeEntities = node.length > 0 && node.every(/** 判定是否为实体数组。 */ item => item && typeof item === 'object' && typeof item.uuid === 'string') && node.some(/** 至少有一项声明父级，避免把无关的 uuid 列表当实体。 */ item => 'parentUuid' in item)
    if (looksLikeEntities) out.push({ trail, items: node })
    for (const item of node) findEntityArrays(item, out, trail)
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) findEntityArrays(value, out, trail ? trail + '.' + key : key)
  }
  return out
}

let scanned = 0, entityArrays = 0, cyclic = 0, totalEntities = 0
const findings = []
for (const file of files) {
  let parsed
  try { parsed = JSON.parse(fs.readFileSync(file, 'utf8')) } catch { continue }
  scanned++
  for (const group of findEntityArrays(parsed, [])) {
    entityArrays++
    totalEntities += group.items.length
    const byUuid = new Map(group.items.map(/** 建立 uuid 索引。 */ item => [item.uuid, item]))
    let hasCycle = false
    for (const start of group.items) {
      const seen = new Set()
      let current = start
      while (current && byUuid.has(current.uuid)) {
        if (seen.has(current.uuid)) { hasCycle = true; break }
        seen.add(current.uuid)
        current = current.parentUuid ? byUuid.get(current.parentUuid) : undefined
      }
      if (hasCycle) break
    }
    if (hasCycle) { cyclic++; findings.push({ file, trail: group.trail, entities: group.items.length }) }
  }
}

console.log('json files scanned      :', scanned)
console.log('entity arrays found     :', entityArrays)
console.log('entities inspected      :', totalEntities)
console.log('arrays containing cycles:', cyclic)
for (const f of findings.slice(0, 10)) console.log('  CYCLE ' + f.file + ' @' + f.trail + ' (' + f.entities + ' entities)')

const out = 'reports/phase2/hierarchy-cycle-audit.json'
fs.mkdirSync('reports/phase2', { recursive: true })
fs.writeFileSync(out, JSON.stringify({
  generatedAt: new Date().toISOString(),
  roots,
  scanned, entityArrays, totalEntities, cyclic, findings,
  note: 'Read-only audit of in-repo project and scene documents; absence of cycles here does not prove none can be authored or hand-edited.',
}, null, 2) + '\n')
console.log('report -> ' + out)
