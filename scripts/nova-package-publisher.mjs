#!/usr/bin/env node
/** 本地包制作工具：校验清单和资源、生成可复现归档及离线索引；不上传、不签名。 */
import { createHash } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

const MAX_FILES = 50_000, MAX_FILE_BYTES = 256 * 1024 * 1024, MAX_TOTAL_BYTES = 512 * 1024 * 1024
const args = process.argv.slice(2), command = args.shift() ?? 'help'
const option = /** 查找指定选项后的值，缺少值时使用默认值。 */ (name, fallback = '') => { const index = args.indexOf(`--${name}`); return index >= 0 && args[index + 1] ? args[index + 1] : fallback }
const flag = /* 调用 args.includes(`--${name}`) 并返回调用结果。 */ name => args.includes(`--${name}`)
const sha256 = /* 调用 createHash('sha256').update(value).digest('hex') 并返回调用结果。 */ value => createHash('sha256').update(value).digest('hex')
const canonical = /** 规范化对象键后以固定缩进及末尾换行序列化归档。 */ value => `${JSON.stringify(normalize(value), null, 2)}\n`
const normalize = /** 递归排序对象键；保留数组顺序和标量值。 */ value => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(/* 返回按声明顺序构造的数组 [key, normalize(value[key])]。 */ key => [key, normalize(value[key])])) : value
const fail = /** 输出包工具错误并设置失败退出码。 */ message => { console.error(`nova-package: ${message}`); process.exitCode = 1 }
const output = /* 调用 console.log(flag('json') ? JSON.stringify(value) : `${value.status}: ${value.detail}`) 并返回调用结果。 */ value => console.log(flag('json') ? JSON.stringify(value) : `${value.status}: ${value.detail}`)
/** 标准化包内路径，拒绝绝对路径、父级跳转、空字符和过长路径。 */ function safePath(value) { const path = value.replaceAll('\\', '/').replace(/^\.\//, ''); if (!path || path.length > 240 || path.startsWith('/') || path.split('/').includes('..') || /^[a-z]+:/i.test(path) || path.includes('\0')) throw new Error(`unsafe package path: ${value}`); return path }
/** 解析真实路径，拒绝包根目录之外的目标。 */ async function contained(root, target) { const base = await realpath(root), candidate = await realpath(target); if (candidate !== base && !candidate.startsWith(`${base}${sep}`)) throw new Error(`${target} escapes package root`); return candidate }
/** 按名称遍历普通文件并记录内容及哈希；拒绝链接、可执行文件和超出文件数/大小限制的内容。 */ async function walk(root, directory = root, records = []) {
  const entries = await readdir(directory, { withFileTypes: true }); entries.sort(/* 调用 a.name.localeCompare(b.name) 并返回调用结果。 */ (a, b) => a.name.localeCompare(b.name))
  for (const entry of entries) {
    const absolute = join(directory, entry.name), stat = await lstat(absolute)
    if (stat.isSymbolicLink()) throw new Error(`symbolic links are not allowed: ${relative(root, absolute)}`)
    if (entry.isDirectory()) await walk(root, absolute, records)
    else if (entry.isFile()) {
      const path = safePath(relative(root, absolute)), bytes = stat.size
      if (bytes > MAX_FILE_BYTES) throw new Error(`${path} exceeds 256 MB`)
      if (/\.(?:exe|dll|dylib|so|cmd|bat|ps1|sh)$/i.test(path)) throw new Error(`${path} is executable content; use the reviewed native-sidecar workflow`)
      const content = await readFile(absolute); records.push({ path, sha256: sha256(content), bytes, contentBase64: content.toString('base64') })
      if (records.length > MAX_FILES || records.reduce(/* 计算表达式 sum + file.bytes 并返回结果，沿用操作数的原有类型规则。 */ (sum, file) => sum + file.bytes, 0) > MAX_TOTAL_BYTES) throw new Error('package file-count or expanded-size bound exceeded')
    }
  }
  return records
}
/* 调用 JSON.parse(await readFile(path, 'utf8')) 并返回调用结果。 */ async function readJson(path) { return JSON.parse(await readFile(path, 'utf8')) }
/** 收集清单版本、包标识、兼容性、发布者、许可和权限锁字段的缺失诊断。 */ function validateManifest(manifest) {
  const errors = []
  if (manifest?.manifestVersion !== 1) errors.push('manifestVersion must be 1')
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(manifest?.id ?? '')) errors.push('id must use reverse-domain style')
  if (!/^\d+\.\d+\.\d+(?:[-+].*)?$/.test(manifest?.version ?? '')) errors.push('version must be semantic')
  if (!manifest?.engine || !manifest?.apiCompatibility) errors.push('engine and API compatibility are required')
  if (!manifest?.publisher || !manifest?.license || !manifest?.provenance || !manifest?.securityUrl || !manifest?.documentationUrl) errors.push('publisher, license, provenance, security URL and documentation URL are required')
  if (!Array.isArray(manifest?.permissions) || !manifest?.dependencies || !manifest?.dependencyHashes) errors.push('permissions and dependency locks are required')
  return errors
}
/** 检查清单归属并收集资产，用固定来源时间及清除签名后的规范内容计算归档身份。 */ async function createArchive(rootValue, manifestPathValue) {
  const root = resolve(rootValue), manifestPath = resolve(manifestPathValue)
  await contained(root, manifestPath)
  const manifest = await readJson(manifestPath), errors = validateManifest(manifest)
  if (errors.length) throw new Error(errors.join('; '))
  const files = await walk(root), sourceDateEpoch = Math.max(0, Number.parseInt(process.env.SOURCE_DATE_EPOCH ?? option('source-date-epoch', '0'), 10) || 0)
  const identity = { format: 'nova-package-archive', version: 1, package: { ...manifest, sha256: '', signature: '', publisherVerified: false }, sourceDateEpoch, compression: 'store', files, reproducible: true }
  const archiveSha256 = sha256(canonical(identity))
  return { ...identity, package: { ...manifest, sha256: archiveSha256 }, archiveSha256 }
}
/** 检查归档封装、清单、路径重复、内容大小及逐文件和整体哈希。 */ async function validateArchive(archive) {
  const errors = []
  if (archive?.format !== 'nova-package-archive' || archive?.version !== 1 || archive?.compression !== 'store' || archive?.reproducible !== true) errors.push('unsupported archive envelope')
  errors.push(...validateManifest(archive?.package))
  if (!Array.isArray(archive?.files) || !archive.files.length || archive.files.length > MAX_FILES) errors.push('file list is empty or exceeds its bound')
  else {
    const paths = new Set(), sorted = [...archive.files].sort(/* 调用 a.path.localeCompare(b.path) 并返回调用结果。 */ (a, b) => a.path.localeCompare(b.path))
    for (const file of sorted) {
      try { safePath(file.path) } catch (error) { errors.push(error.message); continue }
      const key = file.path.toLocaleLowerCase(); if (paths.has(key)) errors.push(`duplicate path ${file.path}`); paths.add(key)
      const content = Buffer.from(file.contentBase64 ?? '', 'base64')
      if (content.length !== file.bytes || sha256(content) !== file.sha256) errors.push(`${file.path} content/hash/size mismatch`)
    }
    const identity = { ...archive, package: { ...archive.package, sha256: '', signature: '', publisherVerified: false } }; delete identity.archiveSha256
    if (sha256(canonical(identity)) !== archive.archiveSha256 || archive.package.sha256 !== archive.archiveSha256) errors.push('archive canonical digest mismatch')
  }
  return errors
}
/** 构造并自检本地归档，写出稳定序列化文件和哈希摘要。 */ async function pack() {
  const root = option('root', '.'), manifest = option('manifest', join(root, 'package.json')), out = resolve(option('out', `${basename(resolve(root))}.nova-package`))
  const archive = await createArchive(root, manifest), errors = await validateArchive(archive); if (errors.length) throw new Error(errors.join('; '))
  await mkdir(dirname(out), { recursive: true }); await writeFile(out, canonical(archive)); output({ status: 'passed', detail: `${out} · ${archive.archiveSha256} · ${archive.files.length} files`, archive: out, sha256: archive.archiveSha256, files: archive.files.length })
}
/** 验证现有归档或从目录构造待验证归档，报告诊断，不发布。 */ async function validate() {
  const archivePath = option('archive')
  if (archivePath) { const archive = await readJson(resolve(archivePath)), errors = await validateArchive(archive); output({ status: errors.length ? 'blocked' : 'passed', detail: errors.join('; ') || `${archive.package.id}@${archive.package.version} is reproducible and sandbox-safe`, errors }); if (errors.length) process.exitCode = 1; return }
  const root = option('root', '.'), manifest = option('manifest', join(root, 'package.json')), archive = await createArchive(root, manifest), errors = await validateArchive(archive); output({ status: errors.length ? 'blocked' : 'passed', detail: errors.join('; ') || `${archive.package.id}@${archive.package.version} validates without publishing`, errors }); if (errors.length) process.exitCode = 1
}
/** 验证指定归档并按包标识和版本排序，生成本地注册表索引。 */ async function mirror() {
  const directory = resolve(option('out', 'nova-offline-mirror')), paths = args.filter(/* 先计算 !value.startsWith('--')；仅当其为真值时求右侧 value.endsWith('.nova-package')，返回短路求值结果。 */ value => !value.startsWith('--') && value.endsWith('.nova-package')).map(/** 只把归档路径传给解析函数，避免数组序号被当作额外路径段。 */ path => resolve(path))
  if (!paths.length) throw new Error('pass one or more .nova-package archive paths after the mirror command')
  const packages = []
  for (const path of paths) { const archive = await readJson(path), errors = await validateArchive(archive); if (errors.length) throw new Error(`${path}: ${errors.join('; ')}`); packages.push({ ...archive.package, archive: basename(path), archiveSha256: archive.archiveSha256 }) }
  packages.sort(/* 先计算 a.id.localeCompare(b.id)；仅当其为假值时求右侧 a.version.localeCompare(b.version)，返回短路求值结果。 */ (a, b) => a.id.localeCompare(b.id) || a.version.localeCompare(b.version)); await mkdir(directory, { recursive: true })
  const registry = { format: 'nova-local-registry', version: 1, generatedAt: new Date(0).toISOString(), offline: true, packages }
  await writeFile(join(directory, 'registry.json'), canonical(registry)); output({ status: 'passed', detail: `${directory} · ${packages.length} indexed packages`, packages: packages.length, implicitNetworkOperation: false })
}
try {
  if (command === 'pack') await pack()
  else if (command === 'validate') await validate()
  else if (command === 'mirror') await mirror()
  else console.log('Nova_A package publisher\n  pack --root DIR --manifest FILE --out FILE [--source-date-epoch N] [--json]\n  validate --archive FILE [--json]\n  validate --root DIR --manifest FILE [--json]\n  mirror ARCHIVE... --out DIR [--json]\n\nAll commands are local-only. No command performs an implicit network operation or handles a private key.')
} catch (error) { fail(error instanceof Error ? error.message : String(error)) }
