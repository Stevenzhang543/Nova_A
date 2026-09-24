/** 功能回归脚本：执行 verify-v3.9-cli.mjs 对应场景，保留断言和证据输出。 */
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
const run = /** 结构说明（自动提取）：run；输入 name、args、expected；直接调用 spawnSync、join、result.stderr.trim、flatMap、filter 等；返回路径包含 record；包含显式抛错路径。 */ (name, args, expected = 0) => {
  const result = spawnSync(process.execPath, [join(root, 'scripts', 'nova-cli.mjs'), name, ...args, '--jsonl'], { cwd: root, encoding: 'utf8', windowsHide: true })
  const record = { command: name, args, exitCode: result.status, expected, stderr: result.stderr.trim(), events: result.stdout.trim().split(/\r?\n/).filter(Boolean).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 line；直接调用 JSON.parse。 */ line => { try { return [JSON.parse(line)] } catch { return [] } }) }
  commands.push(record)
  if (result.status !== expected) throw new Error(name + ' exited ' + result.status + ', expected ' + expected + ': ' + result.stderr + result.stdout)
  return record
}
const hashFile = /* 调用 createHash('sha256').update(await readFile(path)).digest('hex') 并返回调用结果。 */ async path => createHash('sha256').update(await readFile(path)).digest('hex')

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

  const status = firstHash === secondHash && commands.every(/* 比较 item.exitCode 与 item.expected，返回严格相等的判断结果。 */ item => item.exitCode === item.expected) ? 'passed' : 'failed'
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
