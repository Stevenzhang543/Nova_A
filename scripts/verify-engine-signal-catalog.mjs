/** 信号目录与真实发射点的一致性校验（主指令 §5.3/§23.4）。
 * 目录不允许凭想象登记：每条静态信号必须有真实 emitSignal 字面量，且源码中的每个字面量都必须被登记。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const checks = []
async function test(name, run) {
  try { await run(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error && error.message || error) }); console.error('FAIL ' + name + ' :: ' + (error && error.message || error)) }
}

const opened = await openMediaAuditModules({ repository: process.cwd(), bases: [process.cwd()] }, { signals: 'world/componentSignals' })
const { COMPONENT_SIGNALS, signalsForComponent, signalsForEntity, signalsByScope, SIGNAL_SCOPE_KINDS } = opened.modules.signals

/** 递归收集 src 下的源码文本。 */
function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) sourceFiles(full, out)
    else if (/\.(ts|vue)$/.test(entry.name)) out.push(full)
  }
  return out
}
const files = sourceFiles('src')
const texts = new Map(files.map(/** 读取每个源文件并去掉行尾差异。 */ file => [file.replaceAll('\\', '/'), fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n')]))
const allSource = [...texts.values()].join('\n')

await test('Every static catalogued signal has a real emission site', () => {
  const staticSignals = COMPONENT_SIGNALS.filter(/** 动态族用模板，不参与字面量核对。 */ signal => !signal.dynamic)
  assert.ok(staticSignals.length >= 8, 'expected a meaningful catalog, saw ' + staticSignals.length)
  for (const signal of staticSignals) {
    assert.ok(allSource.includes("emitSignal('" + signal.id + "'"), 'catalogued signal has no emitSignal literal: ' + signal.id)
    const file = texts.get(signal.emittedAt)
    assert.ok(file, 'recorded emission file must exist: ' + signal.emittedAt)
    assert.ok(file.includes("'" + signal.id + "'"), 'recorded emission file does not mention ' + signal.id)
  }
})

await test('Every literal emitted signal in the source is catalogued', () => {
  const emitted = new Set()
  for (const match of allSource.matchAll(/emitSignal\(\s*'([^']+)'/g)) emitted.add(match[1])
  const catalogued = new Set(COMPONENT_SIGNALS.filter(/** 只比较静态信号。 */ signal => !signal.dynamic).map(/** 取信号名。 */ signal => signal.id))
  const missing = [...emitted].filter(/** 找出源码中发射但目录未登记的信号。 */ name => !catalogued.has(name)).sort()
  assert.deepEqual(missing, [], 'emitted but not catalogued: ' + missing.join(', '))
  globalThis.__emittedCount = emitted.size
})

await test('Dynamic signal families are declared with a template and a real prefix', () => {
  const dynamic = COMPONENT_SIGNALS.filter(/** 只看动态族。 */ signal => signal.dynamic)
  assert.ok(dynamic.length >= 1, 'the input action family must be declared as dynamic')
  for (const signal of dynamic) {
    if (signal.id.includes('<')) {
      // 模板族：前缀必须真实出现在源码里。
      const prefix = signal.id.slice(0, signal.id.indexOf('<'))
      assert.ok(allSource.includes("'" + prefix), 'the template prefix must appear in the source: ' + prefix)
    } else {
      // 可覆盖名称：默认字面量必须存在于源码，且必须靠近一次 emitSignal 调用。
      // Look only inside the recorded emission file: the catalog itself also contains the literal.
      const fileText = texts.get(signal.emittedAt) ?? ''
      const index = fileText.indexOf("'" + signal.id + "'")
      assert.ok(index >= 0, 'a dynamic default name must appear in its emission file: ' + signal.id)
      assert.ok(fileText.slice(Math.max(0, index - 160), index).includes('emitSignal('), 'the default name must be used by an emitSignal call: ' + signal.id)
    }
  }
})

await test('Descriptors are well formed', () => {
  const scopes = new Set(['entity', 'scene', 'input', 'ui', 'network', 'animation'])
  const paramTypes = new Set(['entity', 'number', 'string', 'vector2', 'object'])
  const ids = new Set()
  for (const signal of COMPONENT_SIGNALS) {
    assert.ok(!ids.has(signal.id), 'duplicate signal id: ' + signal.id)
    ids.add(signal.id)
    assert.ok(scopes.has(signal.scope), signal.id + ' has an unknown scope ' + signal.scope)
    assert.ok(signal.summaryKey.startsWith('signal.'), signal.id + ' must carry an i18n summary key')
    assert.ok(signal.emittedAt.startsWith('src/'), signal.id + ' must record a repo-relative emission file')
    for (const param of signal.params) {
      assert.ok(param.id && param.summaryKey.startsWith('signal.'), signal.id + ' param ' + param.id + ' must be described')
      assert.ok(paramTypes.has(param.type), signal.id + ' param ' + param.id + ' has an unknown type ' + param.type)
    }
  }
})

await test('Lookup helpers answer for components, nodes and scopes', () => {
  assert.ok(signalsForComponent('Area2D').some(/** 区域进入信号必须可用。 */ s => s.id === 'area.entered'))
  assert.deepEqual(signalsForComponent('NoSuchComponent2D'), [], 'an unknown component must yield an empty list')
  const nodeSignals = signalsForEntity(['Area2D', 'Portal2D', 'CharacterBody2D'])
  const nodeIds = nodeSignals.map(/** 取信号名。 */ s => s.id).sort()
  assert.deepEqual(nodeIds, ['area.damage', 'area.entered', 'area.exited', 'portal.entered'], 'a node exposes only the signals of the components it owns')
  assert.ok(!nodeIds.includes('scene.started'), 'scene-scoped signals must not leak into a node list')
  assert.equal(signalsByScope('scene').length, 3)
  assert.ok(signalsByScope('input').every(/** 输入族必须标注动态。 */ s => s.dynamic))
  assert.ok(SIGNAL_SCOPE_KINDS.scene.startsWith('@'), 'pseudo kinds use an @ prefix so they cannot collide with component kinds')
})

const out = process.env.NOVA_SIGNAL_CATALOG_REPORT || 'reports/phase2/signal-catalog.json'
fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true })
fs.writeFileSync(out, JSON.stringify({
  generatedAt: new Date().toISOString(),
  catalogued: COMPONENT_SIGNALS.length,
  emittedLiterals: globalThis.__emittedCount,
  byScope: { entity: signalsByScope('entity').length, scene: signalsByScope('scene').length, input: signalsByScope('input').length, network: signalsByScope('network').length },
  checks,
  status: checks.some(/** 任一失败即整体失败。 */ c => c.status === 'failed') ? 'failed' : 'passed',
}, null, 2) + '\n')
console.log('signal catalog report -> ' + out)
if (checks.some(/** 任一失败即非零退出。 */ c => c.status === 'failed')) process.exitCode = 1
