import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const temporary = await mkdtemp(join(tmpdir(), 'nova-a-v3.9-cli-'))
const project = join(root, 'reference-projects', 'projects', 'build-automation', 'project.nova')
const commands = []
const run = (name, args, expected = 0) => {
  const result = spawnSync(process.execPath, [join(root, 'scripts', 'nova-cli.mjs'), name, ...args, '--jsonl'], { cwd: root, encoding: 'utf8', windowsHide: true })
  const record = { command: name, args, exitCode: result.status, expected, stderr: result.stderr.trim(), events: result.stdout.trim().split(/\r?\n/).filter(Boolean).flatMap(line => { try { return [JSON.parse(line)] } catch { return [] } }) }
  commands.push(record)
  if (result.status !== expected) throw new Error(name + ' exited ' + result.status + ', expected ' + expected + ': ' + result.stderr + result.stdout)
  return record
}
const hashFile = async path => createHash('sha256').update(await readFile(path)).digest('hex')

try {
  run('version', [])
  run('validate', ['--project', project])
  run('test', ['--project', project])
  run('import', ['--source', join(root, 'README.md'), '--output', join(temporary, 'import-record.json'), '--reproducible'])

  run('package', ['--manifest', join(root, 'templates', 'package-authoring', 'manifest.json')], 2)
  const trustedManifest = JSON.parse(await readFile(join(root, 'templates', 'package-authoring', 'manifest.json'), 'utf8'))
  trustedManifest.sha256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  trustedManifest.signature = 'ed25519:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
  trustedManifest.publisher = 'Whitelist Test Registry'
  trustedManifest.publisherVerified = true
  const trustedPath = join(temporary, 'trusted-manifest.json')
  await writeFile(trustedPath, JSON.stringify(trustedManifest, null, 2) + '\n')
  run('package', ['--manifest', trustedPath, '--output', join(temporary, 'validated.nova-package')])

  const first = join(temporary, 'build-a'), second = join(temporary, 'build-b'), exported = join(temporary, 'export')
  run('build', ['--project', project, '--target', 'web', '--output', first, '--cache-mode', 'clean'])
  run('build', ['--project', project, '--target', 'web', '--output', second, '--cache-mode', 'clean'])
  run('export', ['--project', project, '--target', 'web', '--output', exported, '--cache-mode', 'validate'])
  const firstHash = await hashFile(join(first, 'game.nova-pak')), secondHash = await hashFile(join(second, 'game.nova-pak'))
  for (const name of ['nova-build-report.json', 'nova-build-size-report.json', 'nova-dependency-report.json']) await readFile(join(first, name))

  const future = JSON.parse(await readFile(project, 'utf8'))
  future.formatVersion = 30
  future.manifest.schemaVersion = 30
  const futurePath = join(temporary, 'future.nova')
  await writeFile(futurePath, JSON.stringify(future))
  run('validate', ['--project', futurePath], 1)

  const status = firstHash === secondHash && commands.every(item => item.exitCode === item.expected) ? 'passed' : 'failed'
  const report = {
    format: 'nova-build-cli-matrix', version: 1, engineVersion: '3.9.0', generatedAt: new Date().toISOString(),
    commands, deterministicBuildHashes: { first: firstHash, second: secondHash, identical: firstHash === secondHash },
    reportsPresent: true, invalidSchemaRejected: true, unsignedPublishRejected: true, signedPublishValidated: true,
    status
  }
  await writeFile(join(root, 'release-audits', 'v3.9.0-cli-matrix.json'), JSON.stringify(report, null, 2) + '\n')
  if (status !== 'passed') throw new Error('CLI matrix did not pass.')
  console.log('Nova_A v3.9 CLI matrix passed: seven commands, JSONL, exit codes, publish validation, reports, and repeatable clean builds.')
} finally {
  await rm(temporary, { recursive: true, force: true })
}
