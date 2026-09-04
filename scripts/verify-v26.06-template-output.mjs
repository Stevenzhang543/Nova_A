import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build as viteBuild } from 'vite'

const execute = promisify(execFile)
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const engineVersion = String(packageJson.version ?? '')
const release = `${engineVersion.split('.')[0]}.${String(engineVersion.split('.')[1] ?? '').padStart(2, '0')}`
const workspace = await mkdtemp(join(tmpdir(), 'nova-v2606-output-'))
const compiled = join(workspace, 'compiled')
const dist = join(workspace, 'dist')
const projectsDirectory = join(workspace, 'projects')
const playerPath = join(workspace, 'nova-player-template.exe')
const exporter = join(root, 'scripts', 'nova-export.mjs')
const checks = []
const templateResults = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })

async function exportProject(projectPath, output, target, template, extra = []) {
  const args = [exporter, '--project', projectPath, '--target', target, '--output', output, '--profile', 'release', '--architecture', 'x86_64', '--runtime', 'game', '--compression', 'store', '--template', template, '--no-patch', ...extra]
  const result = await execute(process.execPath, args, { cwd: root, windowsHide: true, maxBuffer: 4 * 1024 * 1024 })
  return JSON.parse(result.stdout)
}

try {
  await viteBuild({
    configFile: false,
    root,
    logLevel: 'warn',
    ssr: { noExternal: true },
    build: {
      ssr: true,
      outDir: compiled,
      emptyOutDir: true,
      rollupOptions: { input: { templates: join(root, 'src', 'projects', 'templates.ts') }, output: { entryFileNames: '[name].mjs' } }
    }
  })
  const templates = await import(`${pathToFileURL(join(compiled, 'templates.mjs')).href}?v=${Date.now()}`)
  await mkdir(join(dist, '.vite'), { recursive: true })
  await mkdir(join(dist, 'assets'), { recursive: true })
  await writeFile(join(dist, '.vite', 'manifest.json'), `${JSON.stringify({ 'player.html': { file: 'assets/player-output-test.js', isEntry: true } }, null, 2)}\n`)
  await writeFile(join(dist, 'player.html'), '<!doctype html><meta charset="utf-8"><title>Nova Player output fixture</title><script type="module" src="./assets/player-output-test.js"></script>\n')
  await writeFile(join(dist, 'assets', 'player-output-test.js'), 'globalThis.__NOVA_OUTPUT_FIXTURE__ = true;\n')
  await writeFile(playerPath, Buffer.concat([Buffer.from('MZ'), Buffer.alloc(126), Buffer.from('Nova Player output fixture')]))
  await mkdir(projectsDirectory, { recursive: true })

  for (const descriptor of templates.PROJECT_TEMPLATES) {
    const project = templates.createTemplateProject(descriptor.id, `Output ${descriptor.name}`)
    const projectPath = join(projectsDirectory, `${descriptor.id}.nova`)
    const webOutput = join(workspace, 'web', descriptor.id)
    const nativeOutput = join(workspace, 'native', descriptor.id)
    await writeFile(projectPath, `${JSON.stringify(project)}\n`)

    try {
      const web = await exportProject(projectPath, webOutput, 'web', 'web-es2022-v1', ['--dist', dist])
      const webReport = JSON.parse(await readFile(join(webOutput, 'nova-build-report.json'), 'utf8'))
      const webPack = await readFile(join(webOutput, 'game.nova-pak'))
      const webOk = web.exportTemplate === 'web-es2022-v1'
        && webReport.engineVersion === engineVersion
        && webReport.exportTemplate === 'web-es2022-v1'
        && webPack.subarray(0, 8).toString('binary') === 'NOVAPAK\0'
        && Array.isArray(web.diagnostics) && web.diagnostics.length === 0

      const native = await exportProject(projectPath, nativeOutput, 'windows', 'windows-x64-v1', ['--single-file', '--player', playerPath])
      const nativeReport = JSON.parse(await readFile(join(nativeOutput, 'nova-build-report.json'), 'utf8'))
      const executable = await readFile(join(nativeOutput, nativeReport.files.find(file => file.path.endsWith('.exe'))?.path ?? ''))
      const trailer = executable.subarray(executable.length - 48)
      const nativeOk = native.exportTemplate === 'windows-x64-v1'
        && nativeReport.engineVersion === engineVersion
        && nativeReport.exportTemplate === 'windows-x64-v1'
        && executable.subarray(0, 2).toString() === 'MZ'
        && trailer.subarray(0, 8).toString() === 'NOVAPK2!'
        && Array.isArray(native.diagnostics) && native.diagnostics.length === 0

      templateResults.push({ template: descriptor.id, web: webOk ? 'passed' : 'failed', windowsPortable: nativeOk ? 'passed' : 'failed', webBuildId: webReport.buildId, windowsBuildId: nativeReport.buildId })
    } catch (error) {
      templateResults.push({ template: descriptor.id, web: 'failed', windowsPortable: 'failed', error: error instanceof Error ? error.message : String(error) })
    }
  }

  check('OUTPUT-ALL-TEMPLATES', templateResults.length === 20 && templateResults.every(result => result.web === 'passed' && result.windowsPortable === 'passed'), 'Every registered launcher template exports through the supported Web folder and Windows portable packaging paths.', { templateResults })

  const sampleProject = join(projectsDirectory, `${templates.PROJECT_TEMPLATES[0].id}.nova`)
  const incrementalOutput = join(workspace, 'incremental')
  const first = await exportProject(sampleProject, incrementalOutput, 'web', 'web-es2022-v1', ['--dist', dist])
  const second = await exportProject(sampleProject, incrementalOutput, 'web', 'web-es2022-v1', ['--dist', dist])
  check('OUTPUT-INCREMENTAL-DETERMINISM', first.buildId === second.buildId && second.cacheHits > 0, 'An unchanged second build keeps the exact build ID and reports reusable output cache hits.', { firstBuildId: first.buildId, secondBuildId: second.buildId, cacheHits: second.cacheHits })

  const legacyOutput = join(workspace, 'legacy-template')
  const legacy = await exportProject(sampleProject, legacyOutput, 'windows', 'windows-x86_64-v1', ['--single-file', '--player', playerPath])
  check('OUTPUT-LEGACY-TEMPLATE-MIGRATION', legacy.exportTemplate === 'windows-x64-v1' && legacy.templateMigratedFrom === 'windows-x86_64-v1', 'The one known legacy Windows template alias migrates explicitly to the registered stable ID.', legacy)

  let unknownFailure = ''
  try {
    await exportProject(sampleProject, join(workspace, 'unknown-template'), 'web', 'unregistered-output-template', ['--dist', dist])
  } catch (error) {
    unknownFailure = `${error?.stderr ?? ''}\n${error?.message ?? ''}`
  }
  check('OUTPUT-ACTIONABLE-TEMPLATE-ERROR', unknownFailure.includes('EXPORT_TEMPLATE_NOT_REGISTERED') && unknownFailure.includes('Choose web-es2022-v1'), 'An unknown export-template ID fails before packaging with its error code and compatible registered choices.', { excerpt: unknownFailure.slice(0, 800) })

  const reservedProjectPath = join(projectsDirectory, 'reserved-package-path.nova')
  const reservedProject = JSON.parse(await readFile(sampleProject, 'utf8'))
  reservedProject.projectSettings ??= {}
  reservedProject.projectSettings.build ??= {}
  reservedProject.projectSettings.build.delivery ??= {}
  reservedProject.projectSettings.build.delivery.stripUnusedAssets = false
  reservedProject.projectSettings.build.delivery.include = []
  reservedProject.projectSettings.build.delivery.exclude = []
  reservedProject.assets.push({ uuid: '11111111-1111-4111-8111-111111111111', name: 'Manifest collision', path: 'PROJECT.NOVA', assetType: 'resource', mimeType: 'application/json', byteLength: 2, source: '{}', settings: {}, pipeline: { dependencies: [] } })
  await writeFile(reservedProjectPath, `${JSON.stringify(reservedProject)}\n`)
  let reservedFailure = ''
  try {
    await exportProject(reservedProjectPath, join(workspace, 'reserved-package-path'), 'web', 'web-es2022-v1', ['--dist', dist])
  } catch (error) {
    reservedFailure = `${error?.stderr ?? ''}\n${error?.message ?? ''}`
  }
  check('OUTPUT-RESERVED-PACKAGE-PATH', reservedFailure.includes('Project manifest') && reservedFailure.includes('PROJECT.NOVA'), 'Asset paths cannot shadow the reserved project.nova package manifest, including case variants.', { excerpt: reservedFailure.slice(0, 800) })

  const cleanOutput = join(workspace, 'clean-semantics')
  const cleanProjectPath = join(projectsDirectory, 'clean-semantics.nova')
  const cleanProject = JSON.parse(await readFile(sampleProject, 'utf8'))
  await writeFile(cleanProjectPath, `${JSON.stringify(cleanProject)}\n`)
  await exportProject(cleanProjectPath, cleanOutput, 'web', 'web-es2022-v1', ['--dist', dist])
  await writeFile(join(cleanOutput, 'user-notes.txt'), 'This untracked file must survive a clean build.\n')
  cleanProject.projectSettings.build.gameName = 'Current owned player'
  await writeFile(cleanProjectPath, `${JSON.stringify(cleanProject)}\n`)
  await exportProject(cleanProjectPath, cleanOutput, 'windows', 'windows-x64-v1', ['--single-file', '--player', playerPath, '--cache', 'clean'])
  const cleanReport = JSON.parse(await readFile(join(cleanOutput, 'nova-build-report.json'), 'utf8'))
  let staleOwnedExists = false, untrackedExists = false
  for (const stalePath of ['index.html', 'game.nova-pak', '_headers', 'assets/player-output-test.js']) {
    try { await readFile(join(cleanOutput, stalePath)); staleOwnedExists = true } catch { /* Expected after the target-switch clean. */ }
  }
  try { untrackedExists = (await readFile(join(cleanOutput, 'user-notes.txt'), 'utf8')).includes('must survive') } catch { /* Missing untracked file is a failure. */ }
  check('OUTPUT-CLEAN-CACHE-SEMANTICS', cleanReport.cacheMode === 'clean' && cleanReport.cacheSemantics === 'rewrite-current-remove-stale-report-owned-preserve-untracked' && cleanReport.removedOwnedFiles >= 4 && !staleOwnedExists && untrackedExists && cleanReport.ownedFiles.includes('Current owned player.exe') && !cleanReport.ownedFiles.includes('_headers'), 'A Web-to-native clean removes stale payload and metadata paths owned by the preceding report, rewrites current outputs, and preserves unrelated user files.', { cacheMode: cleanReport.cacheMode, cacheSemantics: cleanReport.cacheSemantics, removedOwnedFiles: cleanReport.removedOwnedFiles, ownedFiles: cleanReport.ownedFiles, staleOwnedExists, untrackedExists })
} finally {
  await rm(workspace, { recursive: true, force: true })
}

const failed = checks.filter(item => item.status === 'failed')
const report = {
  format: 'nova-v26.06-template-output-verification',
  version: 1,
  release,
  engineVersion,
  generatedAt: new Date().toISOString(),
  scope: { launcherTemplates: templateResults.length, targets: ['web', 'windows-portable-structural'], realPlayerLaunch: 'not-executed-by-this-headless-check' },
  checks,
  severity0Open: 0,
  severity1Open: failed.length,
  externalGates: { signedWindowsPlayerLaunch: 'pending-external', nonWindowsNativeHosts: 'pending-external', webBrowserMatrix: 'pending-external' },
  status: failed.length ? 'failed' : 'passed'
}
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits', 'v26.06-template-output.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.06 template output verification passed: ${templateResults.length} templates, ${checks.length} checks.`)
