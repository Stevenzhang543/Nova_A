#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

const MAX_FILES = 50_000, MAX_FILE_BYTES = 256 * 1024 * 1024, MAX_TOTAL_BYTES = 512 * 1024 * 1024
const args = process.argv.slice(2), command = args.shift() ?? 'help'
const option = (name, fallback = '') => { const index = args.indexOf(`--${name}`); return index >= 0 && args[index + 1] ? args[index + 1] : fallback }
const flag = name => args.includes(`--${name}`)
const sha256 = value => createHash('sha256').update(value).digest('hex')
const canonical = value => `${JSON.stringify(normalize(value), null, 2)}\n`
const normalize = value => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])])) : value
const fail = message => { console.error(`nova-package: ${message}`); process.exitCode = 1 }
const output = value => console.log(flag('json') ? JSON.stringify(value) : `${value.status}: ${value.detail}`)
function safePath(value) { const path = value.replaceAll('\\', '/').replace(/^\.\//, ''); if (!path || path.length > 240 || path.startsWith('/') || path.split('/').includes('..') || /^[a-z]+:/i.test(path) || path.includes('\0')) throw new Error(`unsafe package path: ${value}`); return path }
async function contained(root, target) { const base = await realpath(root), candidate = await realpath(target); if (candidate !== base && !candidate.startsWith(`${base}${sep}`)) throw new Error(`${target} escapes package root`); return candidate }
async function walk(root, directory = root, records = []) {
  const entries = await readdir(directory, { withFileTypes: true }); entries.sort((a, b) => a.name.localeCompare(b.name))
  for (const entry of entries) {
    const absolute = join(directory, entry.name), stat = await lstat(absolute)
    if (stat.isSymbolicLink()) throw new Error(`symbolic links are not allowed: ${relative(root, absolute)}`)
    if (entry.isDirectory()) await walk(root, absolute, records)
    else if (entry.isFile()) {
      const path = safePath(relative(root, absolute)), bytes = stat.size
      if (bytes > MAX_FILE_BYTES) throw new Error(`${path} exceeds 256 MB`)
      if (/\.(?:exe|dll|dylib|so|cmd|bat|ps1|sh)$/i.test(path)) throw new Error(`${path} is executable content; use the reviewed native-sidecar workflow`)
      const content = await readFile(absolute); records.push({ path, sha256: sha256(content), bytes, contentBase64: content.toString('base64') })
      if (records.length > MAX_FILES || records.reduce((sum, file) => sum + file.bytes, 0) > MAX_TOTAL_BYTES) throw new Error('package file-count or expanded-size bound exceeded')
    }
  }
  return records
}
async function readJson(path) { return JSON.parse(await readFile(path, 'utf8')) }
function validateManifest(manifest) {
  const errors = []
  if (manifest?.manifestVersion !== 1) errors.push('manifestVersion must be 1')
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(manifest?.id ?? '')) errors.push('id must use reverse-domain style')
  if (!/^\d+\.\d+\.\d+(?:[-+].*)?$/.test(manifest?.version ?? '')) errors.push('version must be semantic')
  if (!manifest?.engine || !manifest?.apiCompatibility) errors.push('engine and API compatibility are required')
  if (!manifest?.publisher || !manifest?.license || !manifest?.provenance || !manifest?.securityUrl || !manifest?.documentationUrl) errors.push('publisher, license, provenance, security URL and documentation URL are required')
  if (!Array.isArray(manifest?.permissions) || !manifest?.dependencies || !manifest?.dependencyHashes) errors.push('permissions and dependency locks are required')
  return errors
}
async function createArchive(rootValue, manifestPathValue) {
  const root = resolve(rootValue), manifestPath = resolve(manifestPathValue)
  await contained(root, manifestPath)
  const manifest = await readJson(manifestPath), errors = validateManifest(manifest)
  if (errors.length) throw new Error(errors.join('; '))
  const files = await walk(root), sourceDateEpoch = Math.max(0, Number.parseInt(process.env.SOURCE_DATE_EPOCH ?? option('source-date-epoch', '0'), 10) || 0)
  const identity = { format: 'nova-package-archive', version: 1, package: { ...manifest, sha256: '', signature: '', publisherVerified: false }, sourceDateEpoch, compression: 'store', files, reproducible: true }
  const archiveSha256 = sha256(canonical(identity))
  return { ...identity, package: { ...manifest, sha256: archiveSha256 }, archiveSha256 }
}
async function validateArchive(archive) {
  const errors = []
  if (archive?.format !== 'nova-package-archive' || archive?.version !== 1 || archive?.compression !== 'store' || archive?.reproducible !== true) errors.push('unsupported archive envelope')
  errors.push(...validateManifest(archive?.package))
  if (!Array.isArray(archive?.files) || !archive.files.length || archive.files.length > MAX_FILES) errors.push('file list is empty or exceeds its bound')
  else {
    const paths = new Set(), sorted = [...archive.files].sort((a, b) => a.path.localeCompare(b.path))
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
async function pack() {
  const root = option('root', '.'), manifest = option('manifest', join(root, 'package.json')), out = resolve(option('out', `${basename(resolve(root))}.nova-package`))
  const archive = await createArchive(root, manifest), errors = await validateArchive(archive); if (errors.length) throw new Error(errors.join('; '))
  await mkdir(dirname(out), { recursive: true }); await writeFile(out, canonical(archive)); output({ status: 'passed', detail: `${out} · ${archive.archiveSha256} · ${archive.files.length} files`, archive: out, sha256: archive.archiveSha256, files: archive.files.length })
}
async function validate() {
  const archivePath = option('archive')
  if (archivePath) { const archive = await readJson(resolve(archivePath)), errors = await validateArchive(archive); output({ status: errors.length ? 'blocked' : 'passed', detail: errors.join('; ') || `${archive.package.id}@${archive.package.version} is reproducible and sandbox-safe`, errors }); if (errors.length) process.exitCode = 1; return }
  const root = option('root', '.'), manifest = option('manifest', join(root, 'package.json')), archive = await createArchive(root, manifest), errors = await validateArchive(archive); output({ status: errors.length ? 'blocked' : 'passed', detail: errors.join('; ') || `${archive.package.id}@${archive.package.version} validates without publishing`, errors }); if (errors.length) process.exitCode = 1
}
async function mirror() {
  const directory = resolve(option('out', 'nova-offline-mirror')), paths = args.filter(value => !value.startsWith('--') && value.endsWith('.nova-package')).map(resolve)
  if (!paths.length) throw new Error('pass one or more .nova-package archive paths after the mirror command')
  const packages = []
  for (const path of paths) { const archive = await readJson(path), errors = await validateArchive(archive); if (errors.length) throw new Error(`${path}: ${errors.join('; ')}`); packages.push({ ...archive.package, archive: basename(path), archiveSha256: archive.archiveSha256 }) }
  packages.sort((a, b) => a.id.localeCompare(b.id) || a.version.localeCompare(b.version)); await mkdir(directory, { recursive: true })
  const registry = { format: 'nova-local-registry', version: 1, generatedAt: new Date(0).toISOString(), offline: true, packages }
  await writeFile(join(directory, 'registry.json'), canonical(registry)); output({ status: 'passed', detail: `${directory} · ${packages.length} indexed packages`, packages: packages.length, implicitNetworkOperation: false })
}
try {
  if (command === 'pack') await pack()
  else if (command === 'validate') await validate()
  else if (command === 'mirror') await mirror()
  else console.log('Nova_A package publisher\n  pack --root DIR --manifest FILE --out FILE [--source-date-epoch N] [--json]\n  validate --archive FILE [--json]\n  validate --root DIR --manifest FILE [--json]\n  mirror ARCHIVE... --out DIR [--json]\n\nAll commands are local-only. No command performs an implicit network operation or handles a private key.')
} catch (error) { fail(error instanceof Error ? error.message : String(error)) }
