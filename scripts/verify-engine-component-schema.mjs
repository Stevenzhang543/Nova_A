/** N1 契约层基线校验：证明登记表、生成式字段契约、组件声明与 Inspector 分支四者不漂移。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
const checks = []
async function test(name, run) {
  try { await run(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error && error.message || error) }); console.error('FAIL ' + name + ' :: ' + (error && error.message || error)) }
}

const registrySource = read('src/world/componentRegistry.ts')
const generatedSource = read('src/world/componentPrimitiveTypes.ts')
const componentsSource = read('src/world/components.ts')
const worldSource = fs.readdirSync('src/world').filter(f => f.endsWith('.ts')).map(f => read('src/world/' + f)).join('\n')
const configPanelSource = read('src/components/ConfigPanel.vue')

const registryVersion = /STABLE_COMPONENT_API_VERSION\s*=\s*'([^']+)'/.exec(registrySource)?.[1]
const descriptorKinds = [...registrySource.matchAll(/\{\s*kind:\s*'([A-Za-z0-9]+)'/g)].map(m => m[1])
const descriptorCategories = [...registrySource.matchAll(/category:\s*'([A-Za-z]+)'/g)].map(m => m[1])
const generatedKinds = [...generatedSource.matchAll(/^  "([A-Za-z0-9]+)": \{/gm)].map(m => m[1])
const classNames = [...componentsSource.matchAll(/^export class ([A-Za-z0-9]+)/gm)].map(m => m[1])
const declaredKindLiterals = [...componentsSource.matchAll(/readonly kind(?::\s*[A-Za-z]+)?\s*=\s*'([A-Za-z0-9]+)'/g)].map(m => m[1])
const inspectorKinds = [...configPanelSource.matchAll(/kind === '([A-Za-z0-9]+)'/g)].map(m => m[1])
const allowedCategories = new Set(['Core', 'Rendering', 'Physics', 'Gameplay', 'Audio', 'UI', 'World'])

await test('Registry exists with a declared stable API version and no duplicate kind', () => {
  assert.ok(registryVersion, 'componentRegistry must declare STABLE_COMPONENT_API_VERSION')
  assert.ok(descriptorKinds.length >= 40, 'registry must describe the full component set, saw ' + descriptorKinds.length)
  assert.equal(new Set(descriptorKinds).size, descriptorKinds.length, 'duplicate kind in STABLE_COMPONENTS')
})

await test('Every registry descriptor carries an allowed category and a non-empty summary', () => {
  const entries = [...registrySource.matchAll(/\{ kind: '([A-Za-z0-9]+)', category: '([A-Za-z]+)', unique: (true|false), summary: '([^']*)'/g)]
  assert.equal(entries.length, descriptorKinds.length, 'descriptor shape changed; update this verifier deliberately')
  for (const [, kind, category, , summary] of entries) {
    assert.ok(allowedCategories.has(category), kind + ' has an unknown category ' + category)
    assert.ok(summary.trim().length >= 8, kind + ' summary is too short to explain normal use')
  }
})

await test('Generated field-type contract covers only registered kinds', () => {
  const registered = new Set(descriptorKinds)
  const orphans = generatedKinds.filter(kind => !registered.has(kind))
  assert.deepEqual(orphans, [], 'generated contract contains kinds absent from the registry: ' + orphans.join(', '))
})

await test('Generated field-type contract entries come from real world declarations', () => {
  // Joints and colliders are declared outside components.ts, so the requirement is that each
  // generated kind is declared somewhere under src/world, not that it is a components.ts class.
  const declared = new Set([...classNames, ...declaredKindLiterals])
  const orphans = generatedKinds.filter(kind => !declared.has(kind) && !worldSource.includes("'" + kind + "'"))
  assert.deepEqual(orphans, [], 'generated contract contains entries with no world declaration: ' + orphans.join(', '))
})

await test('Field entries are unique within each generated kind', () => {
  const blocks = [...generatedSource.matchAll(/^  "([A-Za-z0-9]+)": \{([\s\S]*?)^  \},?$/gm)]
  assert.ok(blocks.length >= 40, 'expected per-kind blocks, saw ' + blocks.length)
  let total = 0
  for (const [, kind, body] of blocks) {
    const fields = [...body.matchAll(/^    "([A-Za-z0-9_]+)": \[/gm)].map(m => m[1])
    assert.equal(new Set(fields).size, fields.length, 'duplicate field name inside ' + kind)
    total += fields.length
  }
  assert.ok(total >= 400, 'generated contract shrank unexpectedly: ' + total + ' fields')
})

await test('Inspector branches reference only known world kinds', () => {
  // A branch may target a component kind, an entity kind declared in the world module, or a
  // collider shape kind; it must not be a name that exists nowhere in src/world.
  const registered = new Set(descriptorKinds)
  const unknown = [...new Set(inspectorKinds.filter(kind => !registered.has(kind) && !worldSource.includes("'" + kind + "'")))].sort()
  assert.deepEqual(unknown, [], 'ConfigPanel branches reference unknown kinds: ' + unknown.join(', '))
})

await test('Registry gap is recorded for kinds the Inspector supports but STABLE_COMPONENTS omits', () => {
  const registered = new Set(descriptorKinds)
  globalThis.__registryGap = [...new Set(inspectorKinds.filter(kind => !registered.has(kind)))].sort()
  assert.ok(Array.isArray(globalThis.__registryGap), 'gap must be recorded')
})

await test('Schema coverage is reported per registered kind', () => {
  const generated = new Set(generatedKinds)
  const missing = descriptorKinds.filter(kind => !generated.has(kind)).sort()
  const covered = descriptorKinds.length - missing.length
  assert.ok(covered > 0, 'no registry kind has a generated field contract')
  globalThis.__coverage = { registry: descriptorKinds.length, generated: generatedKinds.length, covered, withoutFieldContract: missing }
})

const out = process.env.NOVA_COMPONENT_SCHEMA_REPORT || 'reports/phase2/component-schema-baseline.json'
fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true })
fs.writeFileSync(out, JSON.stringify({
  generatedAt: new Date().toISOString(),
  registryApiVersion: registryVersion,
  counts: {
    registryKinds: descriptorKinds.length,
    generatedKinds: generatedKinds.length,
    componentClasses: classNames.length,
    declaredKindLiterals: declaredKindLiterals.length,
    inspectorKindBranches: inspectorKinds.length,
    inspectorDistinctKinds: new Set(inspectorKinds).size,
  },
  coverage: globalThis.__coverage,
  registryGap: globalThis.__registryGap,
  checks,
  status: checks.some(c => c.status === 'failed') ? 'failed' : 'passed',
}, null, 2) + '\n')
console.log('component schema baseline -> ' + out)
if (checks.some(c => c.status === 'failed')) process.exitCode = 1
