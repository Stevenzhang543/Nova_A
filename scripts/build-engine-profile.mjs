/** Build an identified optimized diagnostic artifact without changing published releases. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'

const root = resolve(process.cwd())
const output = join(root, '.cache/engine-overhaul/profile-dist')
const inside = path => { const suffix = relative(root, path); return suffix && !suffix.startsWith('..') && !isAbsolute(suffix) }
assert.ok(inside(output), 'Diagnostic output must stay inside this workspace')
await mkdir(dirname(output), { recursive: true })
assert.ok(inside(await realpath(dirname(output))), 'Diagnostic parent must not resolve outside this workspace')
try { assert.ok(inside(await realpath(output)), 'Diagnostic output symlink must stay inside this workspace') } catch (error) { if (error.code !== 'ENOENT') throw error }

async function files(directory) {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert.ok(!entry.isSymbolicLink(), `Source/output symlink requires explicit review: ${join(directory, entry.name)}`)
    if (['target', 'node_modules', '.git'].includes(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) result.push(...await files(path))
    else if (entry.isFile()) result.push(path)
  }
  return result
}
const sourceRoots = ['src', 'crates', 'public', 'manual', 'nova_core/src', 'nova_core/pkg']
const configuration = ['package.json', 'pnpm-lock.yaml', 'Cargo.toml', 'Cargo.lock', 'nova_core/Cargo.toml', 'rust-toolchain.toml', 'vite.config.ts', 'tsconfig.json', 'tsconfig.node.json', 'index.html', 'player.html', 'scripts/build-engine-profile.mjs']
async function sourceManifest() {
  const paths = (await Promise.all(sourceRoots.map(path => files(join(root, path))))).flat()
  for (const path of configuration) try { if ((await stat(join(root, path))).isFile()) paths.push(join(root, path)) } catch (error) { if (error.code !== 'ENOENT') throw error }
  return Promise.all(paths.sort().map(async path => { const bytes = await readFile(path); return { path: relative(root, path).replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') } }))
}
const before = await sourceManifest()
const sourceHash = createHash('sha256').update(JSON.stringify(before)).digest('hex')
const buildId = `engine-profile-${sourceHash.slice(0, 20)}`
process.env.VITE_NOVA_PERFORMANCE_TRACE = '1'
process.env.VITE_NOVA_BUILD_ID = buildId
const started = new Date().toISOString()
const { build } = await import('vite')
const moduleId = id => {
  const normalized = id.replaceAll('\\', '/'), prefix = root.replaceAll('\\', '/') + '/'
  return normalized.toLowerCase().startsWith(prefix.toLowerCase()) ? normalized.slice(prefix.length) : normalized
}
await build({ root, mode: 'production', build: { outDir: output, emptyOutDir: true }, plugins: [{
  name: 'nova-engine-production-dependency-evidence',
  generateBundle(_options, bundle) {
    const modules = [...this.getModuleIds()].sort().map(id => {
      const info = this.getModuleInfo(id)
      return { id: moduleId(id), imports: (info?.importedIds ?? []).map(moduleId), dynamicImports: (info?.dynamicallyImportedIds ?? []).map(moduleId) }
    })
    const chunks = Object.values(bundle).filter(item => item.type === 'chunk').map(item => ({ file: item.fileName,
      entry: item.isEntry, facade: item.facadeModuleId ? moduleId(item.facadeModuleId) : null, imports: item.imports,
      dynamicImports: item.dynamicImports, modules: Object.entries(item.modules).filter(([, info]) => info.renderedLength > 0).map(([id]) => moduleId(id)) }))
    this.emitFile({ type: 'asset', fileName: 'engine-module-graph.json', source: JSON.stringify({ schemaVersion: 1, buildId, sourceHash, modules, chunks }, null, 2) + '\n' })
  }
}] })
const after = await sourceManifest()
assert.deepEqual(after, before, 'Source changed during compilation: diagnostic artifact is not qualified; rebuild from a stable slice')
const artifacts = await Promise.all((await files(output)).sort().map(async path => { const bytes = await readFile(path); return { path: relative(output, path).replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') } }))
await writeFile(join(output, 'engine-build-manifest.json'), JSON.stringify({ schemaVersion: 1, buildId, sourceHash, started, completed: new Date().toISOString(), node: process.version,
  mode: 'optimized-profiling', profilingApiEnabled: true, source: before, artifacts,
  limits: ['Not a published release or formal performance qualification.', 'Uses the existing ordinary optimized WASM/glue pair listed by hash. Rebuild WASM after changing Rust.', 'Editor and legacy Player remain in the existing shared build; this does not prove dependency separation.'] }, null, 2) + '\n')
console.log(JSON.stringify({ buildId, sourceHash, directory: output, sourceFiles: before.length, artifacts: artifacts.length }))
