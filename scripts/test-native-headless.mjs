/** 在当前宿主构建并测试原生物理进程，不生成或替代 Windows 发布验收报告。 */
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {verifyNativeHeadless} from './lib/nativeHeadlessChecks.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const {version} = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
// Cargo reports the real path, including a configured target directory/triple
// and the host's executable suffix. Do not guess a Windows release path.
const build = spawnSync('cargo', [
  'build', '--locked', '-p', 'nova_headless', '--release', '--message-format=json',
], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
  windowsHide: true,
  timeout: 600_000,
  maxBuffer: 8 * 1024 * 1024,
})
assert.equal(build.error, undefined, build.error?.message)
assert.equal(build.status, 0, 'Native physics build failed')
const artifacts = build.stdout.trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
const artifact = artifacts.find(message => message.reason === 'compiler-artifact'
  && message.target?.name === 'nova_headless'
  && message.target.kind.includes('bin')
  && message.executable)
assert.ok(artifact, 'Cargo did not report a native physics executable')

const checks = verifyNativeHeadless(artifact.executable, version)
for (const check of checks) {
  console.log(`${check.status === 'passed' ? 'PASS' : 'FAIL'} ${check.name}`)
  if (check.error) console.error(check.error)
}
const failed = checks.filter(check => check.status !== 'passed').length
console.log(`Native physics (${process.platform}/${process.arch}): ${checks.length - failed}/${checks.length} passed. Development checks only; no platform release qualification.`)
if (failed) process.exitCode = 1
