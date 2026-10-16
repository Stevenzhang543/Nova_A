/** Exact old core preservation plus optional locked offline real Tauri runtime/FS contracts. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { resolve, join } from 'node:path'

const root = process.cwd(), base = join(root, '.cache/engine-overhaul/native-export-slice')
const runRust = process.argv.includes('--rust'), checks = [], commands = []
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const output = join(base, `verification-${runRust ? 'rust' : 'source'}-${stamp}.json`)
await mkdir(base, { recursive: true })
const text = path => readFile(join(root, path), 'utf8')
const digest = value => createHash('sha256').update(value).digest('hex')
const hashes = {}
async function check(name, fn) {
  try { await fn(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error) }); console.error('FAIL ' + name + ': ' + error) }
}
function coreBody(source, name) {
  const head = `fn ${name}(request: ExportRequest) -> Result<ExportResult, String> {`
  const start = source.indexOf(head)
  assert.ok(start >= 0, 'Expected unique core declaration')
  assert.equal(source.indexOf(head, start + 1), -1)
  const end = source.indexOf('// 定位应用诊断日志目录。', start)
  assert.ok(end > start)
  return source.slice(start + head.length, end)
}
async function cargo(name, args) {
  const stdoutPath = join(base, `${stamp}-${name}-stdout.log`), stderrPath = join(base, `${stamp}-${name}-stderr.log`)
  const started = performance.now()
  const result = await new Promise((resolveResult, reject) => {
    const child = spawn('cargo', args, { cwd: root, shell: false, env: process.env })
    let stdout = '', stderr = ''
    child.stdout.on('data', data => { stdout += data })
    child.stderr.on('data', data => { stderr += data })
    child.on('error', reject)
    child.on('close', (code, signal) => resolveResult({ code, signal, stdout, stderr }))
  })
  await writeFile(stdoutPath, result.stdout); await writeFile(stderrPath, result.stderr)
  commands.push({ name, command: ['cargo', ...args], exitCode: result.code, signal: result.signal,
    diagnosticWallMs: performance.now() - started, stdoutPath, stderrPath,
    stdoutSha256: digest(result.stdout), stderrSha256: digest(result.stderr) })
  assert.equal(result.code, 0, 'See preserved complete cargo stdout/stderr')
  return result
}

try {
  const before = await text('.cache/engine-overhaul/native-export-slice/before-lib.rs'), after = await text('src-tauri/src/lib.rs')
  const admission = await text('src-tauri/src/native_admission.rs')
  await check('Original export algorithm is byte-for-byte unchanged in the one core helper', () => {
    assert.equal(coreBody(after, 'export_game_core'), coreBody(before, 'export_game'))
    hashes.originalExportBody = digest(coreBody(before, 'export_game'))
  })
  await check('Public request/result and original 1GiB/2GiB/file-count/per-file safety bounds are unchanged', () => {
    for (const name of ['ExportRequest', 'ExportResult']) {
      const pattern = new RegExp(`struct ${name} \\{[^}]*\\}`)
      assert.equal(after.match(pattern)?.[0], before.match(pattern)?.[0])
    }
    for (const name of ['MAX_EMBEDDED_PACKAGE_BYTES', 'MAX_WEB_EXPORT_FILES', 'MAX_WEB_EXPORT_FILE_BYTES', 'MAX_WEB_EXPORT_TOTAL_BYTES']) {
      const pattern = new RegExp(`const ${name}[^;]*;`)
      assert.equal(after.match(pattern)?.[0], before.match(pattern)?.[0])
    }
  })
  await check('Actual async command reaches the unique admitted closure and retains the registered export command', () => {
    assert.match(after, /async fn export_game\(request: ExportRequest\) -> Result<ExportResult, String> \{\s*native_admission::run_export\(move \|\| export_game_core\(request\)\)\.await\s*\}/)
    assert.match(after, /generate_handler!\[[\s\S]*?\bexport_game,/)
    assert.match(admission, /let permit = admission\.try_acquire\(\)[\s\S]*?spawn_blocking\(move \|\| \{\s*let _permit = permit;\s*work\(\)/)
  })
  await check('No new dependency or toolchain change, and TS caller still has no claimed global staging integration', async () => {
    const proposal = JSON.parse(await text('.cache/engine-overhaul/native-export-preparation/staging-proposal.json'))
    for (const path of ['src-tauri/Cargo.toml', 'src-tauri/Cargo.lock', 'src/runtime/gameExporter.ts']) {
      assert.equal(digest(await readFile(join(root, path))), proposal.sourceHashes.find(item => item.path === path).sha256)
    }
  })
  if (runRust && checks.every(item => item.status === 'passed')) {
    await check('Locked offline native library tests exercise real blocking/abort/drop/panic and export filesystem contracts', async () => {
      const result = await cargo('test', ['test', '--manifest-path', 'src-tauri/Cargo.toml', '--lib', '--locked', '--offline', '--jobs', '1', '--', '--test-threads=1'])
      const summary = result.stdout.match(/test result: ok\. (\d+) passed; 0 failed/)
      assert.ok(summary, 'Missing real Rust harness summary')
      assert.ok(Number(summary[1]) >= 21, 'Expected all existing 14 plus seven new actual contracts')
      for (const name of ['native_export_dispatch_runs_on_a_real_blocking_thread', 'native_export_busy_rejects_before_another_closure_is_spawned',
        'native_export_cancelling_the_async_owner_keeps_actual_work_admitted_until_exit',
        'native_export_dropping_the_command_future_does_not_release_running_work',
        'native_export_error_preserves_original_error_and_releases_once',
        'native_export_real_blocking_panic_releases_permit_and_returns_join_failure',
        'native_export_async_command_matches_core_files_reports_cache_and_safety_errors']) {
        assert.ok(result.stdout.includes(name + ' ... ok'), 'Missing actual successful contract: ' + name)
      }
    })
    await check('Locked offline complete native command compilation passes', async () => {
      await cargo('check', ['check', '--manifest-path', 'src-tauri/Cargo.toml', '--locked', '--offline', '--jobs', '1'])
    })
  }
} catch (error) { checks.push({ name: 'verification setup', status: 'failed', error: String(error) }) }
finally {
  for (const path of ['src-tauri/src/lib.rs', 'src-tauri/src/native_admission.rs', 'src-tauri/src/native_export_tests.rs',
    'src-tauri/Cargo.toml', 'src-tauri/Cargo.lock', 'src/runtime/gameExporter.ts', 'scripts/verify-engine-native-export-admission.mjs']) {
    hashes[path] = digest(await readFile(join(root, path)))
  }
  const report = { format: 'nova-native-export-admission-contract', version: 1, generatedAt: new Date().toISOString(),
    status: checks.every(item => item.status === 'passed') ? 'passed' : 'failed', runRust, checks, commands, hashes,
    scope: 'Native local hard-cap-one off-invoke-stack slice only; unchanged core. Build/test elapsed is diagnostic, not benchmark.',
    notTested: [...(runRust ? [] : ['Real native runtime/FS contracts were not executed by this source-only report']),
      'True Tauri WebView/native GUI export responsiveness, IPC serialization and cancellation',
      'Forced Tokio blocking-pool queue cancellation before the closure starts; no artificial saturation of the default512-thread pool',
      'Runtime shutdown, native window close and panic=abort behavior; panic contract uses ordinary unwind',
      'Global JS Coordinator admission for actual large-package export', 'Staging/stream producer and complete large-payload retained/scratch accounting',
      'New user-visible cancel API; current native body still runs to actual end after command Future cancellation',
      'Formal performance comparison or new target-platform release/signing validation'],
    association30: 'Same request/result/core/PAKv1/footer/limits/registered command; no TS/loader/signing/launch change. Actual core/async web files comparison in Rust only.',
    association64: (runRust ? 'Local native CPU admission before spawn and RAII real-terminal ownership have real-runtime test evidence in this report. '
      : 'Local native CPU admission and RAII ownership are implemented; source-only checks do not verify runtime lifecycle. ')
      + 'Global JS quotas, checkpoints, staged temp lifecycle and user cancellation remain outstanding.' }
  await writeFile(output, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ path: resolve(output), status: report.status, runRust, passed: checks.filter(item => item.status === 'passed').length, checks: checks.length }))
}
if (checks.some(item => item.status !== 'passed')) process.exitCode = 1
