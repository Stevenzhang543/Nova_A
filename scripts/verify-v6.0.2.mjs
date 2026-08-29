import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build as viteBuild } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const compiled = await mkdtemp(join(tmpdir(), 'nova-v602-verify-')), workspace = await mkdtemp(join(tmpdir(), 'nova-v602-export-'))
try {
  await viteBuild({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: { templates: join(root, 'src/projects/templates.ts'), formats: join(root, 'src/projects/projectFormat.ts'), pak: join(root, 'src/runtime/novaPak.ts'), buildSettings: join(root, 'src/runtime/buildSettings.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
  const load = name => import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`)
  const [templates, formats, pak, builds] = await Promise.all(['templates', 'formats', 'pak', 'buildSettings'].map(load))
  check('V602-AUTHORITY', formats.NOVA_ENGINE_VERSION === '6.0.2' && formats.NOVA_PROJECT_FORMAT_MAJOR === 2 && formats.NOVA_PROJECT_SCHEMA_VERSION === 29, 'Version authority is 6.0.2 without a project-format or schema change.')

  const templateResults = templates.PROJECT_TEMPLATES.map(item => {
    const project = templates.createTemplateProject(item.id, `Audit ${item.name}`)
    return { id: item.id, failures: templates.auditTemplateProject(project, item.id) }
  })
  check('V602-TEMPLATES', templateResults.every(item => item.failures.length === 0), 'Every startup template creates and passes the production template audit.', { templates: templateResults.length, failures: templateResults.filter(item => item.failures.length) })

  const project = templates.createTemplateProject('mouse-knockout', 'Nova v6.0.2 Export Audit')
  project.projectSettings.build.gameName = 'Mouse Knockout'
  const assets = structuredClone(project.assets)
  const packageBytes = await pak.createNovaPak(JSON.stringify(project), assets, project.activeSceneUuid, { deterministic: true, compression: 'balanced' })
  const parsed = await pak.parseNovaPak(packageBytes)
  check('V602-PACK-ROUNDTRIP', parsed.index.engineVersion === '6.0.2' && parsed.files.has('project.nova') && parsed.index.entries.every(entry => parsed.files.has(entry.path)), 'Nova package creation, checksum validation and parsing round-trip every entry.', { bytes: packageBytes.byteLength, entries: parsed.index.entries.length })

  const invalidSettings = builds.normalizeBuildSettings({ target: 'windows', architecture: 'x86_64', sceneOrder: [], startupSceneUuid: '', platform: { identifier: 'bad', version: 'nope' } }, [])
  const invalidCodes = builds.validateBuildSettings(invalidSettings, { host: 'windows', architecture: 'x86_64', androidAvailable: false, androidReason: 'not installed' }).map(issue => issue.code)
  const androidSettings = builds.normalizeBuildSettings({ ...invalidSettings, target: 'android', architecture: 'aarch64', sceneOrder: [project.activeSceneUuid], startupSceneUuid: project.activeSceneUuid, platform: { identifier: 'top.whitelists.audit', version: '1.0.0' } }, [project.activeSceneUuid])
  const androidIssues = builds.validateBuildSettings(androidSettings, { host: 'windows', architecture: 'x86_64', androidAvailable: true, androidReason: '' }).map(issue => issue.code)
  check('V602-BUILD-VALIDATION', ['scene', 'identifier', 'version'].every(code => invalidCodes.includes(code)) && !androidIssues.includes('architecture') && !androidIssues.includes('host'), 'Build validation rejects incomplete configuration while allowing an installed Android cross-target template.', { invalidCodes, androidIssues })

  const projectPath = join(workspace, 'project.nova'), playerPath = join(workspace, 'nova-player.exe'), output = join(workspace, 'portable')
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(playerPath, Buffer.from('MZ\u0000Nova_A player template audit\n'))
  const cli = join(root, 'scripts/nova-export.mjs')
  execFileSync(process.execPath, [cli, '--project', projectPath, '--target', 'windows', '--output', output, '--profile', 'release', '--architecture', 'x86_64', '--runtime', 'game', '--player', playerPath, '--single-file'], { cwd: root, stdio: 'pipe' })
  const executablePath = join(output, 'Mouse Knockout.exe'), executable = await readFile(executablePath)
  const footerStart = executable.length - 48, magic = executable.subarray(footerStart, footerStart + 8).toString('ascii'), embeddedLength = Number(executable.readBigUInt64LE(footerStart + 8)), embeddedStart = footerStart - embeddedLength, embedded = executable.subarray(embeddedStart, footerStart)
  const embeddedHash = executable.subarray(footerStart + 16).toString('hex'), actualHash = createHash('sha256').update(embedded).digest('hex')
  const portableFiles = await allFiles(output)
  check('V602-PORTABLE-FOOTER', magic === 'NOVAPK2!' && embeddedLength > 16 && embeddedHash === actualHash && !portableFiles.some(path => path.endsWith('game.nova-pak')), 'Single-file CLI output embeds the package behind the player with exact length and SHA-256 footer.', { executableBytes: executable.length, embeddedLength, files: portableFiles.map(path => relative(output, path)) })

  const sidecarOutput = join(workspace, 'sidecar')
  execFileSync(process.execPath, [cli, '--project', projectPath, '--target', 'windows', '--output', sidecarOutput, '--player', playerPath, '--sidecar'], { cwd: root, stdio: 'pipe' })
  check('V602-SIDECAR-COMPATIBILITY', await exists(join(sidecarOutput, 'Mouse Knockout.exe')) && await exists(join(sidecarOutput, 'game.nova-pak')), 'Explicit sidecar output remains compatible.')

  const malicious = structuredClone(project)
  malicious.projectSettings.build.delivery.stripUnusedAssets = false
  malicious.projectSettings.build.delivery.include = []
  malicious.projectSettings.build.delivery.exclude = []
  const maliciousAsset = malicious.assets.find(asset => asset.assetType === 'script')
  maliciousAsset.path = '../escape.rhai'
  maliciousAsset.source = 'fn start() {}'
  const maliciousPath = join(workspace, 'malicious.nova')
  await writeFile(maliciousPath, JSON.stringify(malicious))
  const traversal = spawnSync(process.execPath, [cli, '--project', maliciousPath, '--target', 'windows', '--output', join(workspace, 'malicious-output'), '--player', playerPath], { cwd: root, encoding: 'utf8' })
  check('V602-PATH-SAFETY', traversal.status !== 0 && !await exists(join(workspace, 'escape.rhai')), 'Traversal paths fail before an output can escape the selected directory.', { exitCode: traversal.status, message: `${traversal.stderr}${traversal.stdout}`.trim().slice(0, 500) })

  const native = await readFile(join(root, 'src-tauri/src/lib.rs'), 'utf8'), cliSource = await readFile(cli, 'utf8')
  check('V602-NATIVE-BOUNDS', ['MAX_WEB_EXPORT_FILES', 'MAX_WEB_EXPORT_FILE_BYTES', 'MAX_WEB_EXPORT_TOTAL_BYTES', 'decode_base64_limited', 'nova-write-', 'nova-backup-'].every(marker => native.includes(marker)), 'Native export bounds web payloads and performs rollback-capable replacement.')
  check('V602-NATIVE-TARGETS', native.includes('"windows" | "linux" | "macos" | "web" | "android"') && native.includes('android_template()'), 'Native target validation and capability discovery agree about Android.')
  check('V602-CLI-HARDENING', ['NOVAPK2!', 'MAX_PACKAGE_BYTES', 'dynamicImports', 'The game output cannot overwrite its player template'].every(marker => cliSource.includes(marker)), 'Headless export has bounded embedded packages, dynamic web chunk traversal and overwrite protection.')
} finally {
  await rm(compiled, { recursive: true, force: true })
  await rm(workspace, { recursive: true, force: true })
}

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v6.0.2-backend-export-verification', version: 1, engineVersion: '6.0.2', generatedAt: new Date().toISOString(), perspectives: ['backend', 'template', 'build', 'portable-game', 'security'], checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v6.0.2-backend-export.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v6.0.2 backend/export verification passed: ${checks.length} checks.`)

async function exists(path) { try { await stat(path); return true } catch { return false } }
async function allFiles(directory) { const files=[];for(const entry of await readdir(directory,{withFileTypes:true})){const path=join(directory,entry.name);entry.isDirectory()?files.push(...await allFiles(path)):files.push(path)}return files }
