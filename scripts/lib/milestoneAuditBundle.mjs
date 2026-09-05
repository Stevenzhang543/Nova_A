import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join, relative, resolve, isAbsolute } from 'node:path'
import assert from 'node:assert/strict'

export async function runAudit(root, script, args = []) {
  const startedAt = Date.now()
  await new Promise((done, reject) => {
    const child = spawn(process.execPath, [join(root, script), ...args], { cwd: root, stdio: 'inherit', windowsHide: true })
    child.on('error', reject); child.on('exit', code => code === 0 ? done() : reject(Error(`${script} exited ${code}`)))
  })
  return { script, args, startedAt, completedAt: Date.now() }
}

/** Preserve fresh raw reports and their actual screenshots/downloads inside a hash-bound gate report. */
export async function writeAuditBundle(root, release, kind, executions) {
  const engineVersion = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version
  assert.equal(engineVersion, `${release}.0`)
  const reports = [], attachments = new Map(); let total = 0
  async function attach(path) {
    const absolute = resolve(root, path), local = relative(join(root, 'release-audits'), absolute).replaceAll('\\', '/')
    assert.ok(local && !isAbsolute(local) && !local.startsWith('..') && !local.includes('/../'), 'Audit attachment stays inside release-audits')
    if (attachments.has(local)) return
    assert.match(local, /\.(?:png|nova|nova-workspaces|zip)$/)
    const bytes = await readFile(absolute); total += bytes.length
    assert.ok(bytes.length <= 32 * 1024 * 1024 && total <= 256 * 1024 * 1024, 'Bounded self-contained audit attachments')
    attachments.set(local, { path: local, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), base64: bytes.toString('base64') })
  }
  for (const execution of executions) {
    for (const path of execution.reports ?? []) {
      const source = await readFile(join(root, path)), report = JSON.parse(source.toString())
      assert.equal(report.status, 'passed', path)
      assert.ok(Date.parse(report.generatedAt) >= execution.startedAt - 1000, `${path} must come from the executed command`)
      if (report.development !== undefined) {
        assert.equal(report.development, false); assert.equal(report.expectedRelease, release)
        if (report.qualificationTarget !== undefined) {
          assert.equal(report.qualificationTarget, release); assert.equal(report.release, release)
          assert.equal(report.engineVersion, engineVersion); assert.equal(report.buildEngineVersion, engineVersion)
          assert.equal(report.qualifiedRelease, null); assert.deepEqual(report.sourceRoots, ['.']); assert.equal(report.buildRoot, '.')
          assert.equal(report.baselineVersion, null); assert.equal(report.overlayVersion, null)
        } else assert.equal(report.qualifiedRelease, release)
      }
      reports.push({ path, bytes: source.length, sha256: createHash('sha256').update(source).digest('hex'), report })
      for (const capture of [...(report.captures ?? []), ...(report.overviewCapture ? [report.overviewCapture] : [])]) {
        const file = typeof capture === 'string' ? capture : capture?.file
        assert.ok(typeof file === 'string' && file.length > 0, 'Audit capture must name an actual file')
        await attach(join('release-audits', file))
      }
      for (const observation of report.observations ?? []) {
        const file = observation.artifact ?? observation.file
        if (typeof file === 'string' && /\.(?:nova|nova-workspaces|zip)$/.test(file)) await attach(file)
      }
    }
  }
  const report = { format: `nova-v${release}-${kind}-bundle`, version: 1, release, engineVersion, generatedAt: new Date().toISOString(), status: 'passed', executions, reports, attachments: [...attachments.values()], scope: 'Fresh commands and their retained raw evidence. Screenshots and actual downloaded authoring files are embedded with hashes. Individual reports distinguish programmer fixtures, software-rendered browser input and unmeasured external contexts.' }
  const path = join(root, 'release-audits', `v${release}-${kind}-bundle.json`)
  await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(path, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ path, status: report.status, reports: reports.length, attachments: attachments.size, attachmentBytes: total }))
  return report
}
