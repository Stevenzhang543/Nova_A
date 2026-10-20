/** 26.44: transform sine/cosine are engine-independent. stableSin/stableCos must reproduce, bit for
 * bit, the musl/fdlibm results that Rust's libm (used by the WASM physics core) gives for 1,010 angles
 * (scripts/fixtures/stable-trig-2644.json), and quarter turns stay exact.
 *
 * Usage: node scripts/verify-2644-trig.mjs. Results: .cache/verify/trig-2644.json */
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = process.cwd()
const out = await mkdtemp(join(tmpdir(), 'nova-trig-2644-'))
const results = [], observations = {}
const check = async (name, run) => { try { await run(); results.push({ name, ok: true }); console.log('PASS', name) } catch (error) { results.push({ name, ok: false, error: String(error?.stack ?? error) }); console.log('FAIL', name, '\n   ', String(error?.message ?? error)) } }
try {
  await build({ configFile: false, root, logLevel: 'error', build: { ssr: true, outDir: join(out, 'build'), emptyOutDir: false, rollupOptions: { input: { trig: join(root, 'src/world/stableTrig.ts') }, output: { entryFileNames: '[name].mjs' } } } })
  await writeFile(join(out, 'build', 'package.json'), '{"type":"module"}\n')
  const api = await import(pathToFileURL(join(out, 'build', 'trig.mjs')).href)
  const view = new DataView(new ArrayBuffer(8))
  const fromHex = hex => { view.setBigUint64(0, BigInt(`0x${hex}`)); return view.getFloat64(0) }
  const toHex = value => { view.setFloat64(0, value); return view.getBigUint64(0).toString(16).padStart(16, '0') }

  await check('sine and cosine match the musl/fdlibm results of the WASM core bit for bit', async () => {
    const { cases } = JSON.parse(await readFile(join(root, 'scripts/fixtures/stable-trig-2644.json'), 'utf8'))
    let differsFromMath = 0
    for (const [x, sine, cosine] of cases) {
      const angle = fromHex(x)
      assert.equal(toHex(api.stableSin(angle)), sine, `sin(${angle})`)
      assert.equal(toHex(api.stableCos(angle)), cosine, `cos(${angle})`)
      if (api.stableSin(angle) !== Math.sin(angle) || api.stableCos(angle) !== Math.cos(angle)) differsFromMath++
    }
    observations.cases = cases.length
    observations.differFromThisEnginesMath = differsFromMath
  })

  await check('quarter turns are exact; special values behave like Math', () => {
    assert.deepEqual(api.stableSinCos(Math.PI / 2), { sine: 1, cosine: 0 })
    assert.deepEqual(api.stableSinCos(-Math.PI), { sine: 0, cosine: -1 })
    assert.deepEqual(api.stableSinCos(3 * Math.PI / 2), { sine: -1, cosine: 0 })
    assert.ok(Number.isNaN(api.stableSin(Number.NaN)) && Number.isNaN(api.stableCos(Number.POSITIVE_INFINITY)))
    assert.ok(Object.is(api.stableSin(-0), -0))
    for (const angle of [0.1, 1, 2, 3, 10, 100, 12345.678]) {
      assert.ok(Math.abs(api.stableSin(angle) - Math.sin(angle)) <= 2e-16 * Math.max(1, Math.abs(Math.sin(angle))), `sin(${angle})`)
      assert.ok(Math.abs(api.stableCos(angle) ** 2 + api.stableSin(angle) ** 2 - 1) < 1e-15)
    }
  })
} catch (error) {
  results.push({ name: 'setup', ok: false, error: String(error?.stack ?? error) }); console.log('FAIL setup\n   ', String(error?.stack ?? error))
} finally {
  await rm(out, { recursive: true, force: true })
}
await mkdir(join(root, '.cache', 'verify'), { recursive: true })
await writeFile(join(root, '.cache', 'verify', 'trig-2644.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results, observations }, null, 2))
const passed = results.filter(result => result.ok).length
console.log(`\n${passed}/${results.length} checks passed`)
process.exitCode = passed === results.length ? 0 : 1
