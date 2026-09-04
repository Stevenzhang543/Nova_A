import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const release = process.argv.find(value => value.startsWith('--release='))?.slice('--release='.length)
const mapping = new Map([['26.08', '26.8.0'], ['26.09', '26.9.0'], ['26.10', '26.10.0']])
const engineVersion = mapping.get(release)
if (!engineVersion) throw new Error('Use --release=26.08, --release=26.09, or --release=26.10.')

const replaceJsonVersion = source => source.replace(/("version"\s*:\s*")26\.(?:7|8|9|10)\.0("\s*,)/, `$1${engineVersion}$2`)
const definitions = [
  ['package.json', replaceJsonVersion, source => JSON.parse(source).version === engineVersion],
  ['nova_core/pkg/package.json', replaceJsonVersion, source => JSON.parse(source).version === engineVersion],
  ['src-tauri/tauri.conf.json', replaceJsonVersion, source => JSON.parse(source).version === engineVersion],
  ['Cargo.toml', source => source.replace(/(\[workspace\.package\][\s\S]*?version\s*=\s*")26\.(?:7|8|9|10)\.0("\s*)/, `$1${engineVersion}$2`), source => new RegExp(`\\[workspace\\.package\\][\\s\\S]*?version\\s*=\\s*"${engineVersion.replaceAll('.', '\\.')}"`).test(source)],
  ['src-tauri/Cargo.toml', source => source.replace(/(\[package\][\s\S]*?version\s*=\s*")26\.(?:7|8|9|10)\.0("\s*)/, `$1${engineVersion}$2`), source => new RegExp(`\\[package\\][\\s\\S]*?version\\s*=\\s*"${engineVersion.replaceAll('.', '\\.')}"`).test(source)],
  ['Cargo.lock', source => source.replace(/version = "26\.(?:7|8|9|10)\.0"/g, `version = "${engineVersion}"`), source => source.includes(`version = "${engineVersion}"`) && !/version = "26\.(?:7|8|9|10)\.0"/.test(source.replaceAll(`version = "${engineVersion}"`, ''))],
  ['src-tauri/Cargo.lock', source => source.replace(/(name = "nova_a"\r?\nversion = ")26\.(?:7|8|9|10)\.0("\r?\n)/, `$1${engineVersion}$2`), source => source.includes(`name = "nova_a"\nversion = "${engineVersion}"`) || source.includes(`name = "nova_a"\r\nversion = "${engineVersion}"`)],
  ['src/projects/projectFormat.ts', source => source.replace(/NOVA_ENGINE_VERSION = '26\.(?:7|8|9|10)\.0'/, `NOVA_ENGINE_VERSION = '${engineVersion}'`).replace(/NOVA_RELEASE_NAME = '26\.(?:07|08|09|10)'/, `NOVA_RELEASE_NAME = '${release}'`), source => source.includes(`NOVA_ENGINE_VERSION = '${engineVersion}'`) && source.includes(`NOVA_RELEASE_NAME = '${release}'`)],
  ['crates/nova_format/src/lib.rs', source => source.replace(/CURRENT_ENGINE_VERSION: &str = "26\.(?:7|8|9|10)\.0"/, `CURRENT_ENGINE_VERSION: &str = "${engineVersion}"`), source => source.includes(`CURRENT_ENGINE_VERSION: &str = "${engineVersion}"`)],
  ['tests/fixtures/migrations/public-schema-expected.json', source => source.replace(/("targetEngine"\s*:\s*")26\.(?:7|8|9|10)\.0("\s*,)/, `$1${engineVersion}$2`), source => JSON.parse(source).targetEngine === engineVersion],
  ['src/i18n.ts', source => source.replace(/Nova_A v26\.(?:07|08|09|10)/g, `Nova_A v${release}`), source => source.includes(`Nova_A v${release}`)]
]

// Preflight every authority before changing any file. The transaction is
// idempotent, and rollback backups make a partial filesystem failure recoverable.
const changes = []
for (const [path, transform, valid] of definitions) {
  const absolute = join(root, path), before = await readFile(absolute, 'utf8'), after = transform(before)
  if (!valid(after)) throw new Error(`${path} cannot be transformed to ${release} / ${engineVersion}. No files were changed.`)
  changes.push({ path, absolute, before, after, changed: before !== after, temporary: `${absolute}.nova-version-${process.pid}.tmp`, backup: `${absolute}.nova-version-${process.pid}.bak` })
}
const pending = changes.filter(item => item.changed), committed = []
try {
  for (const item of pending) { await rm(item.temporary, { force: true }); await rm(item.backup, { force: true }); await writeFile(item.temporary, item.after, 'utf8') }
  for (const item of pending) {
    await rename(item.absolute, item.backup)
    try { await rename(item.temporary, item.absolute) } catch (error) { await rename(item.backup, item.absolute); throw error }
    committed.push(item)
  }
  for (const item of committed) await rm(item.backup, { force: true })
} catch (error) {
  for (const item of [...committed].reverse()) {
    await rm(item.absolute, { force: true })
    await rename(item.backup, item.absolute)
  }
  for (const item of pending) { await rm(item.temporary, { force: true }); if (!committed.includes(item)) await rm(item.backup, { force: true }) }
  throw error
}

const authorities = {
  release,
  engineVersion,
  package: JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version,
  tauri: JSON.parse(await readFile(join(root, 'src-tauri/tauri.conf.json'), 'utf8')).version,
  wasm: JSON.parse(await readFile(join(root, 'nova_core/pkg/package.json'), 'utf8')).version
}
if ([authorities.package, authorities.tauri, authorities.wasm].some(value => value !== engineVersion)) throw new Error(`Version authority mismatch: ${JSON.stringify(authorities)}`)
for (const [path, , valid] of definitions) if (!valid(await readFile(join(root, path), 'utf8'))) throw new Error(`Post-commit authority validation failed for ${path}.`)
console.log(`Nova_A version authorities now identify ${release} / ${engineVersion}; ${pending.length} files changed, ${changes.length - pending.length} already current.`)
