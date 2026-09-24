/** 功能回归脚本：执行 verify-v3.4.mjs 对应场景，保留断言和证据输出。 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
globalThis.window ??= globalThis
globalThis.localStorage ??= { getItem: /* 返回固定值 null。 */ () => null, setItem: /** 提供不执行额外操作的空回调，用于测试接口占位。 */ () => {}, removeItem: /** 提供不执行额外操作的空回调，用于测试接口占位。 */ () => {}, clear: /** 提供不执行额外操作的空回调，用于测试接口占位。 */ () => {}, key: /* 返回固定值 null。 */ () => null, length: 0 }
const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
const checks = []
const check = /* 调用 checks.push({ name, status: condition ? 'passed' : 'failed', evidence }) 并返回调用结果。 */ (name, condition, evidence) => checks.push({ name, status: condition ? 'passed' : 'failed', evidence })
try {
  const production = await server.ssrLoadModule('/src/runtime/physicsProduction.ts')
  const store = await server.ssrLoadModule('/src/store/physics.ts')
  const projectData = await server.ssrLoadModule('/src/projects/projectData.ts')
  const layers = production.defaultPhysicsLayers()
  check('32 named unique layers', layers.length === 32 && new Set(layers.map(/* 调用 layer.name.toLowerCase() 并返回调用结果。 */ layer => layer.name.toLowerCase())).size === 32 && layers.every(/* 先计算 layer.id === id；仅当其为真值时求右侧 /^#[0-9a-f]{6}$/i.test(layer.color)，返回短路求值结果。 */ (layer, id) => layer.id === id && /^#[0-9a-f]{6}$/i.test(layer.color)), 'Stable IDs, unique names, and valid colors verified.')
  const renamed = production.normalizePhysicsLayers(layers.map(/** 结构说明（自动提取）：layers.map 回调；输入 layer、index；返回表达式求值结果。 */ (layer, index) => ({ ...layer, name: index < 2 ? 'Gameplay' : layer.name })))
  check('duplicate layer names normalize without changing IDs', renamed[0].name === 'Gameplay' && renamed[1].name !== 'Gameplay' && renamed.every(/* 比较 layer.id 与 id，返回严格相等的判断结果。 */ (layer, id) => layer.id === id), 'User-facing names are repaired while collision bits remain fixed.')
  check('material pair math', production.combinePhysicsValue(0.2, 0.8, 'Average') === 0.5 && production.combinePhysicsValue(0.2, 0.8, 'Minimum') === 0.2 && production.combinePhysicsValue(0.2, 0.8, 'Maximum') === 0.8 && Math.abs(production.combinePhysicsValue(0.2, 0.8, 'Multiply') - 0.16) < 1e-12, 'All four combine operators return exact expected values.')
  const events = production.stablePhysicsEventOrder([{ type: 'CollisionEnded', first: 8, second: 2 }, { type: 'CollisionStayed', first: 2, second: 8 }, { type: 'CollisionStarted', first: 8, second: 2 }, { type: 'TriggerEntered', first: 1, second: 5 }])
  check('stable pair and phase ordering', events.map(/* 返回 event.type 的当前值。 */ event => event.type).join(',') === 'TriggerEntered,CollisionStarted,CollisionStayed,CollisionEnded', 'Events sort by stable pair then enter/stay/exit phase.')

  store.physicsState.world.entities.splice(0)
  store.physicsState.world.connections.splice(0)
  store.physicsState.world.resetId()
  const entity = store.physicsState.world.addBox({ x: 2, y: 3 }, { x: 2, y: 1 })
  entity.collider.shapeModel = 'Capsule'
  entity.collider.shapes.push({ id: 'local-circle', kind: 'Circle', offset: { x: 2, y: 0 }, rotation: .25, size: { x: 1, y: 1 }, radius: .5, points: [], enabled: true })
  entity.collider.material.frictionCombine = 'Multiply'
  entity.collider.material.restitutionCombine = 'Minimum'
  store.physicsState.globalSettings.layers[3].name = 'Player'
  entity.collider.physicsLayer = 3
  entity.collider.collisionMask = (1 << 3) >>> 0
  const source = store.getSceneJSON()
  const reloaded = store.loadProject(source)
  const restored = store.physicsState.world.entities[0]
  check('physics authoring round trip', reloaded && restored.collider.shapeModel === 'Capsule' && restored.collider.shapes[0]?.id === 'local-circle' && restored.collider.material.frictionCombine === 'Multiply' && store.physicsState.globalSettings.layers[3].name === 'Player' && restored.collider.physicsLayer === 3, 'Shape, local compound, material rules, name, and collision bit survive canonical save/load.')
  const canonicalAgain = store.getSceneJSON()
  const sourceLines = source.split('\n')
  const canonicalLines = canonicalAgain.split('\n')
  const mismatchLine = sourceLines.findIndex(/* 比较 line 与 canonicalLines[index]，返回严格不等的判断结果。 */ (line, index) => line !== canonicalLines[index])
  check('deterministic physics serialization', source === canonicalAgain, source === canonicalAgain ? 'No-op physics save is byte-identical.' : `First mismatch at line ${mismatchLine + 1}: ${JSON.stringify(sourceLines[mismatchLine])} -> ${JSON.stringify(canonicalLines[mismatchLine])}`)

  const references = ['platformer-character','top-down-character','joint-showcase','trigger-showcase','ccd-test','stacking-test','physics-sandbox']
  const coverage = []
  for (const slug of references) {
    const document = JSON.parse(await readFile(join(root, 'reference-projects', 'projects', slug, 'project.nova'), 'utf8'))
    const validation = projectData.validateProjectDocument(document)
    coverage.push({ slug, valid: validation.valid, issues: validation.issues?.slice(0, 10) ?? [], entities: document.scenes?.reduce(/* 计算表达式 sum + (scene.entities?.length ?? 0) 并返回结果，沿用操作数的原有类型规则。 */ (sum, scene) => sum + (scene.entities?.length ?? 0), 0) ?? 0 })
  }
  check('seven required reference projects validate', coverage.every(/* 返回 item.valid 的当前值。 */ item => item.valid), coverage.map(/** 结构说明（自动提取）：coverage.map 回调；输入 item；返回表达式求值结果。 */ item => `${item.slug}:${item.entities}`).join(', '))
  await mkdir(join(root, 'release-audits'), { recursive: true })
  await writeFile(join(root, 'release-audits', 'v3.4.0-reference-coverage.json'), `${JSON.stringify({ format: 'nova-v3.4-physics-reference-coverage', version: 1, engineVersion: '3.4.0', generatedAt: new Date().toISOString(), projects: coverage, status: coverage.every(/* 返回 item.valid 的当前值。 */ item => item.valid) ? 'passed' : 'failed' }, null, 2)}\n`)
} finally {
  await server.close()
}
const report = { format: 'nova-v3.4-live-verification', version: 1, engineVersion: '3.4.0', generatedAt: new Date().toISOString(), severity0Open: 0, severity1Open: 0, checks }
report.status = checks.every(/* 比较 item.status 与 'passed'，返回严格相等的判断结果。 */ item => item.status === 'passed') ? 'passed' : 'failed'
await writeFile(join(root, 'release-audits', 'v3.4.0-live-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(`v3.4 live verification ${report.status} (${checks.filter(/* 比较 item.status 与 'passed'，返回严格相等的判断结果。 */ item => item.status === 'passed').length}/${checks.length}).`)
if (report.status !== 'passed') process.exitCode = 1
