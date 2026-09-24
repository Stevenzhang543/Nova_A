/** 同步日历发布版本到权威配置和文档，检查替换结果及实际改动路径。 */
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { releaseVersion } from './release-source-snapshot.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const release = process.argv.find(/* 调用 value.startsWith('--release=') 并返回调用结果。 */ value => value.startsWith('--release='))?.slice('--release='.length)
const engineVersion = releaseVersion(release)

const replaceJsonVersion = /* 调用 source.replace(/("version"\s*:\s*")[0-9]+\.[0-9]+\.[0-9]+("\s*,)/, `$1${engineVersion}$2`) 并返回调用结果。 */ source => source.replace(/("version"\s*:\s*")[0-9]+\.[0-9]+\.[0-9]+("\s*,)/, `$1${engineVersion}$2`)
const definitions = [
  ['package.json', replaceJsonVersion, /* 比较 JSON.parse(source).version 与 engineVersion，返回严格相等的判断结果。 */ source => JSON.parse(source).version === engineVersion],
  ['nova_core/pkg/package.json', replaceJsonVersion, /* 比较 JSON.parse(source).version 与 engineVersion，返回严格相等的判断结果。 */ source => JSON.parse(source).version === engineVersion],
  ['src-tauri/tauri.conf.json', replaceJsonVersion, /* 比较 JSON.parse(source).version 与 engineVersion，返回严格相等的判断结果。 */ source => JSON.parse(source).version === engineVersion],
  ['Cargo.toml', /* 调用 source.replace(/(\[workspace\.package\][\s\S]*?version\s*=\s*")[0-9]+\.[0-9]+\.[0-9]+("\s*)/, `$1${engineVersion}$2`) 并返回调用结果。 */ source => source.replace(/(\[workspace\.package\][\s\S]*?version\s*=\s*")[0-9]+\.[0-9]+\.[0-9]+("\s*)/, `$1${engineVersion}$2`), /* 调用 new RegExp(`\\[workspace\\.package\\][\\s\\S]*?version\\s*=\\s*"${engineVersion.replaceAll('.', '\\.')}"`).test(source) 并返回调用结果。 */ source => new RegExp(`\\[workspace\\.package\\][\\s\\S]*?version\\s*=\\s*"${engineVersion.replaceAll('.', '\\.')}"`).test(source)],
  ['src-tauri/Cargo.toml', /* 调用 source.replace(/(\[package\][\s\S]*?version\s*=\s*")[0-9]+\.[0-9]+\.[0-9]+("\s*)/, `$1${engineVersion}$2`) 并返回调用结果。 */ source => source.replace(/(\[package\][\s\S]*?version\s*=\s*")[0-9]+\.[0-9]+\.[0-9]+("\s*)/, `$1${engineVersion}$2`), /* 调用 new RegExp(`\\[package\\][\\s\\S]*?version\\s*=\\s*"${engineVersion.replaceAll('.', '\\.')}"`).test(source) 并返回调用结果。 */ source => new RegExp(`\\[package\\][\\s\\S]*?version\\s*=\\s*"${engineVersion.replaceAll('.', '\\.')}"`).test(source)],
  ['Cargo.lock', /* 调用 source.replace(/(name = "nova_[^"]+"\r?\nversion = ")[0-9]+\.[0-9]+\.[0-9]+("\r?\n)/g, `$1${engineVersion}$2`) 并返回调用结果。 */ source => source.replace(/(name = "nova_[^"]+"\r?\nversion = ")[0-9]+\.[0-9]+\.[0-9]+("\r?\n)/g, `$1${engineVersion}$2`), /** 确认至少七个 Nova 工作区包的锁定版本全部匹配目标引擎版本。 */ source => { const versions = [...source.matchAll(/^name = "nova_[^"]+"\r?\nversion = "([^"]+)"/gm)].map(/* 返回 match[1] 的当前值。 */ match => match[1]); return versions.length >= 7 && versions.every(/* 比较 version 与 engineVersion，返回严格相等的判断结果。 */ version => version === engineVersion) }],
  ['src-tauri/Cargo.lock', /* 调用 source.replace(/(name = "nova_a"\r?\nversion = ")[0-9]+\.[0-9]+\.[0-9]+("\r?\n)/, `$1${engineVersion}$2`) 并返回调用结果。 */ source => source.replace(/(name = "nova_a"\r?\nversion = ")[0-9]+\.[0-9]+\.[0-9]+("\r?\n)/, `$1${engineVersion}$2`), /** 兼容两种换行形式检查原生包锁中的版本。 */ source => source.includes(`name = "nova_a"\nversion = "${engineVersion}"`) || source.includes(`name = "nova_a"\r\nversion = "${engineVersion}"`)],
  ['src/projects/projectFormat.ts', /** 替换前端引擎机器版本和面向用户的发布名称常量。 */ source => source.replace(/NOVA_ENGINE_VERSION = '[0-9]+\.[0-9]+\.[0-9]+'/, `NOVA_ENGINE_VERSION = '${engineVersion}'`).replace(/NOVA_RELEASE_NAME = '[0-9]{2}\.[0-9]{2}'/, `NOVA_RELEASE_NAME = '${release}'`), /* 先计算 source.includes(`NOVA_ENGINE_VERSION = '${engineVersion}'`)；仅当其为真值时求右侧 source.includes(`NOVA_RELEASE_NAME = '${release}'`)，返回短路求值结果。 */ source => source.includes(`NOVA_ENGINE_VERSION = '${engineVersion}'`) && source.includes(`NOVA_RELEASE_NAME = '${release}'`)],
  ['crates/nova_format/src/lib.rs', /** 替换 Rust 项目格式模块中的当前引擎版本常量。 */ source => source.replace(/CURRENT_ENGINE_VERSION: &str = "[0-9]+\.[0-9]+\.[0-9]+"/, `CURRENT_ENGINE_VERSION: &str = "${engineVersion}"`), /* 调用 source.includes(`CURRENT_ENGINE_VERSION: &str = "${engineVersion}"`) 并返回调用结果。 */ source => source.includes(`CURRENT_ENGINE_VERSION: &str = "${engineVersion}"`)],
  ['tests/fixtures/migrations/public-schema-expected.json', /* 调用 source.replace(/("targetEngine"\s*:\s*")[0-9]+\.[0-9]+\.[0-9]+("\s*,)/, `$1${engineVersion}$2`) 并返回调用结果。 */ source => source.replace(/("targetEngine"\s*:\s*")[0-9]+\.[0-9]+\.[0-9]+("\s*,)/, `$1${engineVersion}$2`), /* 比较 JSON.parse(source).targetEngine 与 engineVersion，返回严格相等的判断结果。 */ source => JSON.parse(source).targetEngine === engineVersion],
  ['src/i18n.ts', /* 调用 source.replace(/Nova_A v[0-9]{2}\.[0-9]{2}/g, `Nova_A v${release}`) 并返回调用结果。 */ source => source.replace(/Nova_A v[0-9]{2}\.[0-9]{2}/g, `Nova_A v${release}`), /* 调用 source.includes(`Nova_A v${release}`) 并返回调用结果。 */ source => source.includes(`Nova_A v${release}`)]
]

// Preflight every authority before changing any file. The transaction is
// idempotent, and rollback backups make a partial filesystem failure recoverable.
const changes = []
for (const [path, transform, valid] of definitions) {
  const absolute = join(root, path)
  let before
  try { before = await readFile(absolute, 'utf8') } catch (error) { if (path === 'nova_core/pkg/package.json' && error.code === 'ENOENT') continue; throw error }
  const after = transform(before)
  if (!valid(after)) throw new Error(`${path} cannot be transformed to ${release} / ${engineVersion}. No files were changed.`)
  changes.push({ path, absolute, before, after, changed: before !== after, temporary: `${absolute}.nova-version-${process.pid}.tmp`, backup: `${absolute}.nova-version-${process.pid}.bak` })
}
const pending = changes.filter(/* 返回 item.changed 的当前值。 */ item => item.changed), committed = []
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
  wasm: changes.some(/* 比较 item.path 与 'nova_core/pkg/package.json'，返回严格相等的判断结果。 */ item => item.path === 'nova_core/pkg/package.json') ? JSON.parse(await readFile(join(root, 'nova_core/pkg/package.json'), 'utf8')).version : engineVersion
}
if ([authorities.package, authorities.tauri, authorities.wasm].some(/* 比较 value 与 engineVersion，返回严格不等的判断结果。 */ value => value !== engineVersion)) throw new Error(`Version authority mismatch: ${JSON.stringify(authorities)}`)
for (const [path, , valid] of definitions.filter(/** 判断预期路径是否出现在本轮版本更新的实际改动列表。 */ ([path]) => changes.some(/* 比较 item.path 与 path，返回严格相等的判断结果。 */ item => item.path === path))) if (!valid(await readFile(join(root, path), 'utf8'))) throw new Error(`Post-commit authority validation failed for ${path}.`)
console.log(`Nova_A version authorities now identify ${release} / ${engineVersion}; ${pending.length} files changed, ${changes.length - pending.length} already current.`)
