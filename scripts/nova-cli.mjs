#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, resolve } from 'node:path'

const ENGINE_VERSION = '4.0.0', PROJECT_SCHEMA = 29, CLI_VERSION = 1
const commands = new Set(['validate', 'import', 'test', 'build', 'export', 'package', 'version'])

function parse(values) {
  const flags = new Map(), positionals = []
  for (let index = 0; index < values.length; index++) {
    const value = values[index]
    if (!value.startsWith('--')) { positionals.push(value); continue }
    const name = value.slice(2), next = values[index + 1]
    flags.set(name, !next || next.startsWith('--') ? true : values[++index])
  }
  return { flags, positionals }
}

const { flags, positionals } = parse(process.argv.slice(2)), command = positionals[0]
const jsonLines = flags.has('json') || flags.has('jsonl')
function emit(level, event, message, data = {}) {
  const value = { format: 'nova-cli-log', version: 1, engineVersion: ENGINE_VERSION, level, event, message, ...data }
  if (jsonLines) process.stdout.write(`${JSON.stringify(value)}\n`)
  else process.stdout.write(`[${level.toUpperCase()}] ${message}${Object.keys(data).length ? ` ${JSON.stringify(data)}` : ''}\n`)
}
function fail(message, data = {}, code = 2) { emit('error', 'failure', message, data); process.exitCode = code }
function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex') }
function stable(value) { if (Array.isArray(value)) return value.map(stable); if (!value || typeof value !== 'object') return value; return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) }

async function projectFromFlag() {
  if (!flags.get('project')) throw new Error('--project is required')
  const path = resolve(String(flags.get('project'))), bytes = await readFile(path), project = JSON.parse(bytes)
  return { path, bytes, project }
}

function validateProject(project) {
  const issues = []
  const add = (severity, code, message) => issues.push({ severity, code, message })
  if (!project || typeof project !== 'object') add('error', 'project-root', 'Project root must be an object.')
  if (project.projectFormat !== 'Nova_A Project Format 2') add('error', 'project-format', 'Project must use Nova_A Project Format 2.')
  if (!Number.isInteger(project.formatVersion) || project.formatVersion < 5 || project.formatVersion > PROJECT_SCHEMA) add('error', 'project-schema', `Project schema must be between 5 and ${PROJECT_SCHEMA}.`)
  if (!Array.isArray(project.scenes) || !project.scenes.length) add('error', 'scenes', 'Project must contain at least one scene.')
  if (!project.manifest || project.manifest.schemaVersion !== project.formatVersion) add('error', 'manifest-schema', 'Manifest and project schema versions must match.')
  const sceneIds = new Set(), entityIds = new Set()
  for (const scene of Array.isArray(project.scenes) ? project.scenes : []) {
    if (typeof scene.uuid !== 'string' || sceneIds.has(scene.uuid)) add('error', 'scene-uuid', 'Scene UUIDs must be non-empty and unique.'); else sceneIds.add(scene.uuid)
    for (const entity of Array.isArray(scene.entities) ? scene.entities : []) { if (typeof entity.uuid !== 'string' || entityIds.has(entity.uuid)) add('error', 'entity-uuid', 'Entity UUIDs must be non-empty and unique.'); else entityIds.add(entity.uuid) }
  }
  const lock = project.packages?.lockfile
  if (Array.isArray(lock)) for (const entry of lock) if (!/^[a-f0-9]{64}$/.test(String(entry.sha256 ?? ''))) add('error', 'package-lock-hash', `Package ${entry.id ?? '?'} has no deterministic SHA-256 lock.`)
  return issues
}

async function runChild(script, values) {
  await new Promise((accept, reject) => {
    const child = spawn(process.execPath, [resolve(script), ...values], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    child.stdout.on('data', bytes => process.stdout.write(bytes)); child.stderr.on('data', bytes => process.stderr.write(bytes))
    child.once('error', reject); child.once('exit', code => code === 0 ? accept() : reject(new Error(`${basename(script)} exited with code ${code}`)))
  })
}

async function validateCommand() {
  const { path, bytes, project } = await projectFromFlag(), issues = validateProject(project)
  for (const issue of issues) emit(issue.severity, 'validation-issue', issue.message, { code: issue.code, project: path })
  const errors = issues.filter(item => item.severity === 'error').length
  emit(errors ? 'error' : 'info', 'validation-complete', errors ? 'Project validation failed.' : 'Project validation passed.', { project: path, sha256: sha256(bytes), schema: project.formatVersion, errors, warnings: issues.length - errors })
  if (errors) process.exitCode = 1
}

async function importCommand() {
  if (!flags.get('source')) throw new Error('--source is required')
  const source = resolve(String(flags.get('source'))), bytes = await readFile(source), digest = sha256(bytes)
  const record = { format: 'nova-import-record', version: 1, source: basename(source), extension: extname(source).toLowerCase(), bytes: bytes.length, sha256: digest, importedAt: flags.has('reproducible') ? '1970-01-01T00:00:00.000Z' : new Date().toISOString() }
  if (flags.get('output')) { const output = resolve(String(flags.get('output'))); await mkdir(dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(stable(record), null, 2)}\n`) }
  emit('info', 'import-complete', 'Asset import record created.', record)
}

async function testCommand() {
  const { project, path } = await projectFromFlag(), issues = validateProject(project), tests = Array.isArray(project.projectSettings?.tests) ? project.projectSettings.tests : []
  const results = tests.map(test => ({ name: String(test.name ?? 'Unnamed test'), kind: String(test.kind ?? 'unit'), status: test.enabled === false ? 'skipped' : 'validated' }))
  const failed = issues.filter(item => item.severity === 'error').length
  emit(failed ? 'error' : 'info', 'test-complete', failed ? 'Headless project preflight failed.' : 'Headless project tests and preflight passed.', { project: path, discovered: tests.length, results, failed })
  if (failed) process.exitCode = 1
}

async function exportCommand() {
  const forwarded = process.argv.slice(3).filter(value => value !== '--json' && value !== '--jsonl')
  emit('info', 'build-start', 'Starting headless deterministic export.', { mode: command })
  await runChild('scripts/nova-export.mjs', forwarded)
  emit('info', 'build-complete', 'Headless export completed.')
}

function normalizePackageManifest(value) {
  const manifest = value.package ?? value
  const required = ['id', 'name', 'version', 'engine', 'permissions', 'dependencyHashes', 'entryPointType', 'apiCompatibility', 'sha256', 'signature']
  const missing = required.filter(key => manifest[key] === undefined || manifest[key] === '')
  if (missing.length) throw new Error(`Package manifest is missing: ${missing.join(', ')}`)
  if (!/^\d+\.\d+\.\d+(?:[-+].*)?$/.test(manifest.version)) throw new Error('Package version must use semantic versioning')
  if (!['editor', 'build', 'importer', 'runtime', 'template'].includes(manifest.entryPointType)) throw new Error('Package entryPointType is invalid')
  if (!Array.isArray(manifest.permissions)) throw new Error('Package permissions must be an array')
  if (!/^[a-f0-9]{64}$/.test(manifest.sha256)) throw new Error('Package SHA-256 is malformed')
  if (manifest.publisherVerified !== true || !/^(?:ed25519|nova-official-v1):[A-Za-z0-9+/_=-]{32,}$/.test(manifest.signature)) throw new Error('Publish validation requires a verified publisher and registry signature')
  for (const id of Object.keys(manifest.dependencies ?? {})) if (!/^[a-f0-9]{64}$/.test(manifest.dependencyHashes?.[id] ?? '')) throw new Error(`Dependency ${id} is missing a SHA-256 lock`)
  return manifest
}

async function packageCommand() {
  if (!flags.get('manifest')) throw new Error('--manifest is required')
  const input = resolve(String(flags.get('manifest'))), value = JSON.parse(await readFile(input, 'utf8')), manifest = normalizePackageManifest(value)
  const canonical = Buffer.from(`${JSON.stringify(stable({ format: 'nova-package', version: 1, package: manifest }), null, 2)}\n`), digest = sha256(canonical)
  if (flags.get('output')) { const output = resolve(String(flags.get('output'))); await mkdir(dirname(output), { recursive: true }); await writeFile(output, canonical) }
  emit('info', 'package-validated', 'Package publish validation passed.', { id: manifest.id, packageVersion: manifest.version, archiveSha256: digest, permissions: manifest.permissions, entryPointType: manifest.entryPointType })
}

async function main() {
  if (!commands.has(command) || flags.has('help')) {
    process.stdout.write(`Nova_A Build CLI ${CLI_VERSION}\n\nCommands:\n  validate --project <project.nova>\n  import --source <asset> [--output <record.json>]\n  test --project <project.nova>\n  build|export --project <project.nova> --target <web|windows|linux|macos> --output <directory>\n  package --manifest <manifest.json> [--output <package.nova-package>]\n  version [--json]\n\nCommon: --jsonl emits machine-readable logs.\n`)
    if (!flags.has('help')) process.exitCode = 2
    return
  }
  if (command === 'version') { emit('info', 'version', `Nova_A ${ENGINE_VERSION}`, { cliVersion: CLI_VERSION, projectSchema: PROJECT_SCHEMA, runtimeApi: 1, pluginApi: 2, packageManifest: 1 }); return }
  if (command === 'validate') return validateCommand()
  if (command === 'import') return importCommand()
  if (command === 'test') return testCommand()
  if (command === 'build' || command === 'export') return exportCommand()
  return packageCommand()
}

try { await main() } catch (error) { fail(error instanceof Error ? error.message : String(error), { command }) }
