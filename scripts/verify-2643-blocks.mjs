/** 26.43 Blocks: every block and event compiles to Rhai the static analyzer accepts, documents round
 * trip through the script header, edits keep the tree valid, and the checked-in engine fixture
 * (crates/nova_script/tests/fixtures/all-blocks.rhai, executed by `cargo test -p nova_script`) is
 * exactly what the compiler produces today.
 *
 * Usage: node scripts/verify-2643-blocks.mjs [--write-fixture]. Results: .cache/verify/blocks-2643.json */
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = process.cwd()
const out = await mkdtemp(join(tmpdir(), 'nova-blocks-'))
const fixturePath = join(root, 'crates/nova_script/tests/fixtures/all-blocks.rhai')
const results = []
const check = (name, run) => { try { run(); results.push({ name, ok: true }); console.log('PASS', name) } catch (error) { results.push({ name, ok: false, error: String(error?.message ?? error) }); console.log('FAIL', name, '\n   ', String(error?.message ?? error)) } }
const observed = {}
try {
  const entry = join(out, 'entry.ts')
  await writeFile(entry, [
    `export * from '${join(root, 'src/visual/blockScript.ts').replaceAll('\\', '/')}';`,
    `export { BLOCK_COPY, labelParts } from '${join(root, 'src/visual/blockScriptCopy.ts').replaceAll('\\', '/')}';`,
    `export { analyzeScript } from '${join(root, 'src/runtime/scriptAnalysis.ts').replaceAll('\\', '/')}';`
  ].join('\n'))
  await writeFile(join(out, 'package.json'), '{"type":"module"}\n')
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: join(out, 'build'), emptyOutDir: false, rollupOptions: { input: { blocks: entry }, output: { entryFileNames: '[name].mjs' } } } })
  const api = await import(pathToFileURL(join(out, 'build', 'blocks.mjs')).href)

  // A document with one handler per event; each holds every statement its scope allows, with
  // containers filled and every condition type used. Fields get deterministic sample values.
  const sample = { audio: 'Assets/Audio/hit.wav', video: 'Assets/Video/intro.webm', prefab: 'Assets/Prefabs/Coin.nova-prefab', scene: 'Level 2', object: 'ScoreLabel', variable: 'coins' }
  const fill = (fields, specs) => { for (const spec of specs) if (sample[spec.kind] !== undefined) fields[spec.key] = sample[spec.kind] }
  let serial = 0
  const stable = node => { node.id = `b${++serial}`; for (const child of [...(node.children ?? []), ...(node.otherwise ?? [])]) stable(child); for (const condition of node.conditions ?? []) condition.id = `c${++serial}`; return node }
  const document = { format: 'nova-blocks', version: 1, variables: [{ name: 'score', initial: '0' }, { name: 'coins', initial: '2' }, { name: 'label', initial: 'hi' }, { name: 'alive', initial: 'true' }], handlers: [] }
  for (const event of api.BLOCK_EVENTS) {
    const handler = api.createHandler(event.type); handler.id = `h${++serial}`
    if (event.type === 'function') { handler.fields.name = 'hit'; handler.fields.params = 'amount, kind' }
    for (const spec of api.BLOCK_STATEMENTS) {
      if (spec.needs?.some(need => !event.scope[need]) || spec.type === 'stop') continue
      const block = api.createBlock(spec.type); fill(block.fields, spec.fields)
      if (spec.type === 'if') {
        block.conditions = api.BLOCK_CONDITIONS.filter(condition => !condition.needs?.some(need => !event.scope[need])).map(condition => api.createCondition(condition.type))
        block.conditions[0].negate = true
        block.children = [api.createBlock('addScore')]; block.otherwise = [api.createBlock('log')]
      }
      if (spec.type === 'repeat' || spec.type === 'wait') { const inner = api.createBlock('changeVariable'); inner.fields.variable = 'coins'; block.children = [inner] }
      handler.blocks.push(stable(block))
    }
    document.handlers.push(handler)
  }
  const { source, diagnostics } = api.blockScriptSource(document)
  observed.diagnostics = diagnostics
  observed.lines = source.split('\n').length
  const code = api.blockScriptCode(source)
  const analysis = api.analyzeScript(code)
  observed.analysisErrors = analysis.diagnostics.filter(item => item.severity === 'error').map(item => `${item.code} line ${item.line}: ${item.message}`)
  const fixture = (await readFile(fixturePath, 'utf8').catch(() => '')).replace(/\r\n/g, '\n')
  if (process.argv.includes('--write-fixture')) { await mkdir(join(root, 'crates/nova_script/tests/fixtures'), { recursive: true }); await writeFile(fixturePath, code) }

  check('every event and block compiles without block diagnostics', () => assert.deepEqual(diagnostics, []))
  check('the generated Rhai has no analyzer errors (parse, unknown functions)', () => assert.deepEqual(observed.analysisErrors, []))
  check('the block document round-trips through the script header and recompiles identically', () => {
    const parsed = api.parseBlockScriptSource(source)
    assert.ok(parsed)
    assert.equal(api.compileBlockScript(parsed).code, code)
    assert.equal(api.isBlockScriptSource('fn start() {}'), false)
    assert.equal(api.parseBlockScriptSource('// @nova-blocks 1 {broken'), null)
  })
  check('the engine fixture matches the compiler output (run --write-fixture after intended changes)', () => assert.equal(fixture, code))
  check('values: numbers become floats, variables stay names, unknown names are reported', () => {
    const doc = api.createBlockScript(); const block = api.createBlock('setVelocity'); block.fields.x = '3'; block.fields.y = 'score * 2'; const bad = api.createBlock('goTo'); bad.fields.x = 'nope'
    doc.handlers[0].blocks.push(block, bad)
    const result = api.compileBlockScript(doc)
    assert.match(result.code, /set_velocity\(3\.0, \(score \* 2\)\);/)
    assert.deepEqual(result.diagnostics.map(item => [item.code, item.params?.name]), [['unknownVariable', 'nope']])
  })
  check('scope rules: frame blocks need a frame event, contact blocks need a touch event', () => {
    const doc = api.createBlockScript(); doc.handlers[0].blocks.push(api.createBlock('platformer'), api.createBlock('destroyOther'))
    assert.deepEqual(api.compileBlockScript(doc).diagnostics.map(item => item.code), ['needsFrame', 'needsContact'])
  })
  check('moving a block into its own body is refused; moving between stacks works', () => {
    const doc = api.createBlockScript(); const outer = api.createBlock('repeat'); const inner = api.createBlock('log'); outer.children.push(inner); const other = api.createBlock('addScore')
    doc.handlers[0].blocks.push(outer, other)
    const key = `${doc.handlers[0].id}:blocks`
    assert.equal(api.moveBlock(doc, outer.id, `${outer.id}:children`, 0), false)
    assert.equal(api.moveBlock(doc, other.id, `${outer.id}:children`, 0), true)
    assert.deepEqual(outer.children.map(node => node.type), ['addScore', 'log'])
    assert.equal(api.moveBlock(doc, inner.id, key, 0), true)
    assert.deepEqual(doc.handlers[0].blocks.map(node => node.type), ['log', 'repeat'])
  })
  check('every block, event, condition and problem has English, German and Chinese copy', () => {
    for (const locale of ['en', 'de', 'zh']) {
      const copy = api.BLOCK_COPY[locale]
      for (const spec of api.BLOCK_STATEMENTS) { assert.ok(copy.statements[spec.type], `${locale} ${spec.type}`); for (const part of api.labelParts(copy.statements[spec.type])) if ('field' in part) assert.ok(spec.fields.some(field => field.key === part.field), `${locale} ${spec.type} {${part.field}}`) }
      for (const spec of api.BLOCK_EVENTS) assert.ok(copy.events[spec.type], `${locale} event ${spec.type}`)
      for (const spec of api.BLOCK_CONDITIONS) assert.ok(copy.conditions[spec.type], `${locale} condition ${spec.type}`)
      for (const code of Object.keys(api.BLOCK_PROBLEM_MESSAGES)) assert.ok(copy.problems[code], `${locale} problem ${code}`)
    }
  })
} finally {
  await rm(out, { recursive: true, force: true })
}
await mkdir(join(root, '.cache', 'verify'), { recursive: true })
await writeFile(join(root, '.cache', 'verify', 'blocks-2643.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results, observed }, null, 2))
const failed = results.filter(item => !item.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
