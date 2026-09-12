import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Qualification uses the integrated version only; staged overlays require explicit development authorization. */
export function resolveMilestoneAuditContext(moduleUrl, { release, reportName, argv = process.argv.slice(2), env = process.env } = {}) {
  assert.match(release, /^26\.(?:1[3-9]|2[0-9]|30)$/); assert.match(reportName, /^[a-z0-9-]+$/)
  const scriptRoot = dirname(dirname(fileURLToPath(moduleUrl))), option = name => argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3)
  const regressionOrigin = release, target = option('qualification-release')
  if (target) {
    assert.match(target, /^26\.(?:2[0-9]|30)$/, 'Integrated regression targets are 26.20 through 26.30')
    assert.ok(Number(release.split('.')[1]) <= Number(target.split('.')[1]), 'Cannot qualify a future suite')
    release = target
  }
  let repository = scriptRoot
  while (!existsSync(join(repository, 'package.json'))) { const parent = dirname(repository); assert.notEqual(parent, repository, 'Audit must live below a repository package.json'); repository = parent }
  const development = argv.includes('--development') || env.NOVA_AUDIT_DEVELOPMENT === '1'
  assert.ok(!(env.NOVA_AUDIT_DEVELOPMENT === '0' && argv.includes('--development')), 'Conflicting development and production flags')
  const versionAt = directory => JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')).version
  const sourceRoot = resolve(repository, option('source-root') ?? (development ? scriptRoot : repository))
  if (!development) {
    assert.equal(scriptRoot, repository, 'Staged audit scripts require --development or NOVA_AUDIT_DEVELOPMENT=1')
    assert.equal(sourceRoot, repository, 'Qualification source-root must be the integrated repository')
    assert.equal(versionAt(repository), `${release}.0`, `Qualification requires actual engine ${release}.0`)
  }
  assert.ok(existsSync(join(sourceRoot, 'src')), 'Audit source root requires an actual src directory')
  const engineVersion = versionAt(existsSync(join(sourceRoot, 'package.json')) ? sourceRoot : repository)
  assert.match(engineVersion, /^26\.\d+\.\d+$/)
  // Only the named authored staging tree composes prior stages. A merged check tree is already complete.
  const authoredStage = resolve(repository, `.cache/development-v${release}`)
  const bases = development && sourceRoot === authoredStage
    ? [...new Set([sourceRoot, ...Array.from({ length: Number(release.split('.')[1]) - 13 }, (_, index) => resolve(repository, `.cache/development-v26.${Number(release.split('.')[1]) - index - 1}`)).filter(directory => existsSync(join(directory, 'src'))), repository])]
    : [sourceRoot]
  const buildRoot = resolve(repository, option('build-root') ?? env.NOVA_AUDIT_ROOT ?? sourceRoot)
  if (!development) assert.equal(buildRoot, repository, 'Qualification build root must be the integrated repository')
  const buildEngineVersion = existsSync(join(buildRoot, 'package.json')) ? versionAt(buildRoot) : engineVersion
  const expectedRelease = development ? buildEngineVersion.split('.').slice(0, 2).join('.') : release
  if (env.NOVA_AUDIT_EXPECTED_RELEASE) assert.equal(env.NOVA_AUDIT_EXPECTED_RELEASE, expectedRelease, 'Expected browser release must match the selected build metadata')
  const reportPath = resolve(repository, option('report') ?? (development ? join(sourceRoot, 'reports', `v${release}-${reportName}.json`) : join(repository, 'release-audits', `v${release}-${reportName}.json`)))
  const metadata = () => ({ format: `nova-v${release}-${reportName}-audit`, version: 1, release, regressionOrigin, engineVersion, buildEngineVersion, generatedAt: new Date().toISOString(), development, expectedRelease, qualificationTarget: release, qualifiedRelease: null, baselineVersion: development ? engineVersion : null, overlayVersion: development ? `${release}.0` : null, sourceRoots: bases.map(directory => relative(repository, directory).replaceAll('\\', '/') || '.'), buildRoot: relative(repository, buildRoot).replaceAll('\\', '/') || '.' })
  return { repository, scriptRoot, sourceRoot, bases, development, engineVersion, buildEngineVersion, buildRoot, expectedRelease, reportPath, metadata }
}

/** Reuse real browser I/O, then attach fresh source/version provenance without declaring a whole release qualified. */
export async function runMilestoneBrowserAudit(context, { name, ...options }, task) {
  assert.match(name, /^[a-z0-9-]+$/)
  const { withBrowserAudit } = await import(pathToFileURL(join(context.repository, 'scripts/lib/browserUserAudit.mjs')).href)
  const metadata = context.metadata(), nativeReport = join(context.buildRoot, 'release-audits', `v${metadata.release}-${name}.json`), startedAt = Date.now()
  await rm(nativeReport, { force: true })
  try { return await withBrowserAudit({ ...options, release: metadata.release, name, root: context.buildRoot, development: context.development, expectedRelease: context.expectedRelease }, task) }
  finally {
    if (existsSync(nativeReport)) {
      const report = JSON.parse(await readFile(nativeReport, 'utf8'))
      assert.ok(Date.parse(report.generatedAt) >= startedAt - 1000, 'Browser report must be fresh for this invocation')
      const annotated = { ...report, ...context.metadata(), evidenceRoot: relative(dirname(context.reportPath), dirname(nativeReport)).replaceAll('\\', '/') || '.' }
      await writeFile(nativeReport, JSON.stringify(annotated, null, 2) + '\n')
      if (context.reportPath !== nativeReport) { await mkdir(dirname(context.reportPath), { recursive: true }); await writeFile(context.reportPath, JSON.stringify(annotated, null, 2) + '\n') }
    }
  }
}
