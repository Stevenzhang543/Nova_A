import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const projectsRoot = join(root, 'reference-projects', 'projects')
const generatedAt = new Date().toISOString()
const projectFiles = []
for (const entry of await readdir(projectsRoot, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.nova')) projectFiles.push(join(projectsRoot, entry.name))
  if (entry.isDirectory()) {
    const path = join(projectsRoot, entry.name, 'project.nova')
    try { await readFile(path); projectFiles.push(path) } catch { /* helper directory */ }
  }
}
projectFiles.sort()
const temporary = await mkdtemp(join(tmpdir(), 'nova-a-v50-reference-ci-'))
const results = []
function run(script, args) {
  return spawnSync(process.execPath, [join(root, 'scripts', script), ...args], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 120_000, maxBuffer: 4 * 1024 * 1024 })
}
try {
  for (let index = 0; index < projectFiles.length; index++) {
    const project = projectFiles[index], id = relative(projectsRoot, project).replaceAll('\\', '/')
    const document = JSON.parse(await readFile(project, 'utf8'))
    const metadataOk = document.engineVersion === '5.0.0' && document.formatVersion === 29 && document.manifest?.engineCompatibility?.maximumExclusive === '6.0.0'
    const validate = run('nova-cli.mjs', ['validate', '--project', project, '--jsonl'])
    const targetResults = []
    for (const target of ['web', 'windows']) {
      const output = join(temporary, target)
      await rm(output, { recursive: true, force: true }); await mkdir(output, { recursive: true })
      const exported = run('nova-export.mjs', ['--project', project, '--target', target, '--profile', 'release', '--cache', 'clean', '--channel', 'beta', '--output', output])
      let manifests = false
      if (exported.status === 0) manifests = ['nova-build-report.json','nova-content-manifest.json','nova-build-provenance.json','nova-sbom.cdx.json','nova-deployment-manifest.json'].every(name => existsSync(join(output, name)))
      targetResults.push({ target, status: exported.status === 0 && manifests ? 'passed' : 'failed', exitCode: exported.status, manifests, error: `${exported.stderr || exported.stdout || ''}`.slice(0, 2_000) })
    }
    results.push({ id, metadata: metadataOk ? 'passed' : 'failed', validation: validate.status === 0 ? 'passed' : 'failed', targets: targetResults })
    if ((index + 1) % 10 === 0 || index + 1 === projectFiles.length) console.log(`Reference CI ${index + 1}/${projectFiles.length}`)
  }
} finally {
  await rm(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 })
}

const failed = results.filter(result => result.metadata !== 'passed' || result.validation !== 'passed' || result.targets.some(target => target.status !== 'passed'))
const report = { format: 'nova-v5.0-reference-project-ci', version: 1, engineVersion: '5.0.0', generatedAt, projectCount: results.length, targets: ['web','windows'], packageExample: 'package-v50-extension-sdk/project.nova', pluginExample: 'reference-projects/plugins/hello-plugin/plugin.json', results, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits', 'v5.0.0-reference-ci.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(`Reference CI failed for ${failed.length}/${results.length} projects.`); process.exit(1) }
console.log(`Nova_A v5.0 reference CI passed: ${results.length} projects × Windows/Web.`)
