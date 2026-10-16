/** N1 契约层基线校验：证明登记表、生成式字段契约、组件声明与 Inspector 分支四者不漂移。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const read = path => fs.readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
// Load the real module the same way the other engine verifiers do, so this contract test can
// never pass against a stale hand-copied snapshot of the source.
const opened = await openMediaAuditModules({ repository: process.cwd(), bases: [process.cwd()] }, { fieldSchema: 'world/componentFieldSchema', descriptions: 'world/componentFieldDescriptions', primitives: 'world/componentPrimitiveTypes' })
globalThis.__fieldSchema = opened.modules.fieldSchema
globalThis.__descriptions = opened.modules.descriptions
globalThis.__primitives = opened.modules.primitives
const checks = []
async function test(name, run) {
  try { await run(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error && error.message || error) }); console.error('FAIL ' + name + ' :: ' + (error && error.message || error)) }
}

const fieldSchemaSource = read('src/world/componentFieldSchema.ts')
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
// Only component-kind branches belong to this contract. `authoring.kind` and `collider.kind`
// are different unions (AuthoringObjectKind, shape models) and must not be counted here.
const componentKindBranches = [...configPanelSource.matchAll(/(?:^|[^.\w])kind === '([A-Za-z0-9]+)'/g)].map(m => m[1])
const authoringKindBranches = [...configPanelSource.matchAll(/authoring\.kind === '([A-Za-z0-9]+)'/g)].map(m => m[1])
const inspectorKinds = componentKindBranches
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

await test('Single field-level entry point stays derived from the generated contract', () => {
  const opened = globalThis.__fieldSchema
  assert.ok(opened, 'componentFieldSchema module must load')
  const { componentFields, componentField, componentFieldKindCount } = opened
  const blocks = [...generatedSource.matchAll(/^  "([A-Za-z0-9]+)": \{([\s\S]*?)^  \},?$/gm)]
  let kinds = 0
  let fields = 0
  for (const [, kind, body] of blocks) {
    const declared = [...body.matchAll(/^    "([A-Za-z0-9_]+)": \[/gm)].map(m => m[1]).sort()
    const described = componentFields(kind)
    assert.deepEqual(described.map(f => f.id), declared, kind + ' field ids diverge from the generated contract')
    for (const field of described) {
      assert.ok(field.types.length > 0, kind + '.' + field.id + ' declares no primitive type')
      assert.equal(field.kind, kind, 'field descriptor carries the wrong kind')
      assert.ok(Object.isFrozen(field), 'field descriptors must be frozen')
      assert.equal(componentField(kind, field.id), field, 'single-field lookup disagrees with the list')
    }
    kinds++
    fields += described.length
  }
  assert.equal(componentFieldKindCount(), kinds, 'entry point exposes a different kind count than the contract')
  assert.deepEqual(componentFields('NoSuchKind2D'), [], 'unknown kinds must resolve to an empty list, never throw')
  assert.equal(componentField('SpriteRenderer2D', 'NoSuchField'), undefined, 'unknown fields must resolve to undefined')
  globalThis.__fieldSchemaCoverage = { kinds, fields }
})

await test('Schema coverage is reported per registered kind', () => {
  const generated = new Set(generatedKinds)
  const missing = descriptorKinds.filter(kind => !generated.has(kind)).sort()
  const covered = descriptorKinds.length - missing.length
  assert.ok(covered > 0, 'no registry kind has a generated field contract')
  globalThis.__coverage = { registry: descriptorKinds.length, generated: generatedKinds.length, covered, withoutFieldContract: missing }
})

await test('The field entry point exposes optionality and defaults derived from the generated descriptions', () => {
  const { componentFields } = globalThis.__fieldSchema
  const descriptions = globalThis.__descriptions.componentFieldDescriptions
  let withDefault = 0
  for (const kind of Object.keys(descriptions)) {
    const described = componentFields(kind)
    assert.equal(described.length, Object.keys(descriptions[kind]).length, kind + ' field count must match the generated description')
    for (const field of described) {
      const source = descriptions[kind][field.id]
      assert.ok(source, kind + '.' + field.id + ' must exist in the generated description')
      assert.equal(field.optional, source.optional, kind + '.' + field.id + ' optional must come from the source')
      assert.equal(field.defaultValue, source.default, kind + '.' + field.id + ' default must come from the source')
      if (Object.prototype.hasOwnProperty.call(source, 'default')) withDefault += 1
    }
  }
  assert.ok(withDefault > 0, 'at least some fields must expose a static default')
  globalThis.__entryPointDefaults = withDefault
})

await test('Generated field descriptions agree exactly with the primitive contract', () => {
  const descriptions = globalThis.__descriptions?.componentFieldDescriptions
  const primitives = globalThis.__primitives?.componentPrimitiveTypes
  assert.ok(descriptions, 'componentFieldDescriptions must load')
  assert.ok(primitives, 'componentPrimitiveTypes must load')
  assert.deepEqual(Object.keys(descriptions).sort(), Object.keys(primitives).sort(), 'both artifacts must cover the same kinds')
  for (const kind of Object.keys(primitives)) {
    assert.deepEqual(Object.keys(descriptions[kind]).sort(), Object.keys(primitives[kind]).sort(), kind + ' must describe exactly the contracted fields')
    for (const field of Object.keys(primitives[kind])) {
      const described = descriptions[kind][field]
      assert.deepEqual([...described.types], [...primitives[kind][field]], kind + '.' + field + ' types must match the primitive contract')
      assert.equal(typeof described.optional, 'boolean', kind + '.' + field + ' optional must be a boolean')
    }
  }
})

await test('Every generated static default is compatible with its declared types', () => {
  const descriptions = globalThis.__descriptions.componentFieldDescriptions
  const kindOf = (/** 把 JS 值映射到契约使用的基础类型名。 */ value) =>
    value === null ? 'null' : typeof value === 'number' ? 'number' : typeof value === 'string' ? 'string' : typeof value === 'boolean' ? 'boolean' : 'other'
  let withDefault = 0
  for (const kind of Object.keys(descriptions)) {
    for (const field of Object.keys(descriptions[kind])) {
      const described = descriptions[kind][field]
      if (!Object.prototype.hasOwnProperty.call(described, 'default')) continue
      withDefault += 1
      const actual = kindOf(described.default)
      assert.notEqual(actual, 'other', kind + '.' + field + ' has a non-scalar default, which this generator must not emit')
      assert.ok(described.types.includes(actual), kind + '.' + field + ' default is ' + actual + ' but declared types are ' + described.types.join('/'))
    }
  }
  assert.ok(withDefault > 0, 'the generator must extract at least some static defaults')
  globalThis.__descriptionStats = { kinds: Object.keys(descriptions).length, withDefault }
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
  fieldSchema: globalThis.__fieldSchemaCoverage,
  fieldDescriptions: globalThis.__descriptionStats,
  entryPointDefaults: globalThis.__entryPointDefaults,
  registryGap: globalThis.__registryGap,
  branchScope: { componentKind: componentKindBranches.length, authoringKind: authoringKindBranches.length },
  checks,
  status: checks.some(c => c.status === 'failed') ? 'failed' : 'passed',
}, null, 2) + '\n')
console.log('component schema baseline -> ' + out)
if (checks.some(c => c.status === 'failed')) process.exitCode = 1
