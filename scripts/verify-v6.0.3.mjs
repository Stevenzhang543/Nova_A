/** 功能回归脚本：执行 verify-v6.0.3.mjs 对应场景，保留断言和证据输出。 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build as viteBuild } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const check = /* 调用 checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }) 并返回调用结果。 */ (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const compiled = await mkdtemp(join(tmpdir(), 'nova-v603-verify-')), workspace = await mkdtemp(join(tmpdir(), 'nova-v603-export-'))
try {
  await viteBuild({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: { templates: join(root, 'src/projects/templates.ts'), formats: join(root, 'src/projects/projectFormat.ts'), pak: join(root, 'src/runtime/novaPak.ts'), buildSettings: join(root, 'src/runtime/buildSettings.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
  const load = /* 调用 import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`) 并返回调用结果。 */ name => import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`)
  const [templates, formats, pak, builds] = await Promise.all(['templates', 'formats', 'pak', 'buildSettings'].map(load))
  check('V603-AUTHORITY', formats.NOVA_ENGINE_VERSION === '6.0.3' && formats.NOVA_PROJECT_FORMAT_MAJOR === 2 && formats.NOVA_PROJECT_SCHEMA_VERSION === 29, 'Version authority is 6.0.3 without a format/schema change.')

  const capabilities = { host: 'windows', architecture: 'x86_64', androidAvailable: false, androidReason: 'not installed' }
  const templateResults = templates.PROJECT_TEMPLATES.map(/** 结构说明（自动提取）：templates.PROJECT_TEMPLATES.map 回调；输入 item；直接调用 templates.createTemplateProject、project.scenes.map、builds.normalizeBuildSettings、filter、builds.validateBuildSettings 等。 */ item => {
    const project = templates.createTemplateProject(item.id, `Audit ${item.name}`), sceneIds = project.scenes.map(/* 返回 scene.uuid 的当前值。 */ scene => scene.uuid)
    const settings = builds.normalizeBuildSettings(project.projectSettings.build, sceneIds)
    const issues = builds.validateBuildSettings(settings, capabilities).filter(/* 比较 issue.severity 与 'info'，返回严格不等的判断结果。 */ issue => issue.severity !== 'info')
    return { id: item.id, factoryFailures: templates.auditTemplateProject(project, item.id), exportTemplate: settings.delivery.exportTemplate, issues }
  })
  check('V603-UNTOUCHED-TEMPLATES', templateResults.every(/* 先计算 item.factoryFailures.length === 0 && item.exportTemplate === 'windows-x64-v1'；仅当其为真值时求右侧 item.issues.length === 0，返回短路求值结果。 */ item => item.factoryFailures.length === 0 && item.exportTemplate === 'windows-x64-v1' && item.issues.length === 0), 'All twelve untouched templates resolve the bundled Windows player with no errors or warnings.', { templates: templateResults })

  const sceneId = templates.createTemplateProject('empty', 'Alias').activeSceneUuid
  const legacy = builds.normalizeBuildSettings({ target: 'windows', architecture: 'x86_64', runtimeMode: 'game', sceneOrder: [sceneId], startupSceneUuid: sceneId, platform: { identifier: 'top.whitelists.alias', version: '1.0.0' }, delivery: { exportTemplate: 'windows-x86_64-v1', include: ['Assets/**'] } }, [sceneId])
  const custom = builds.normalizeBuildSettings({ ...legacy, delivery: { ...legacy.delivery, exportTemplate: 'studio-custom-player-v7' } }, [sceneId])
  const headless = builds.normalizeBuildSettings({ ...legacy, runtimeMode: 'headless-server', delivery: { ...legacy.delivery, exportTemplate: '' } }, [sceneId])
  check('V603-TEMPLATE-ID-MIGRATION', legacy.delivery.exportTemplate === 'windows-x64-v1' && custom.delivery.exportTemplate === 'studio-custom-player-v7' && headless.delivery.exportTemplate === 'windows-headless-x64-v1', 'Known synthesized IDs migrate, custom IDs remain visible, and headless selects its registered template.', { legacy: legacy.delivery.exportTemplate, custom: custom.delivery.exportTemplate, headless: headless.delivery.exportTemplate })

  const catalog = JSON.parse(await readFile(join(root, 'release-audits/template-catalog-verification.json'), 'utf8'))
  check('V603-ACCESSIBILITY-REGRESSION', catalog.engineVersion === '6.0.3' && catalog.status === 'passed' && ['CATALOG-UI-SEMANTICS', 'CATALOG-UI-COMPATIBILITY', 'CATALOG-BUILD-DEFAULTS'].every(/* 调用 catalog.checks.some(item => item.id === id && item.status === 'passed') 并返回调用结果。 */ id => catalog.checks.some(/* 先计算 item.id === id；仅当其为真值时求右侧 item.status === 'passed'，返回短路求值结果。 */ item => item.id === id && item.status === 'passed')), 'Catalog evidence covers passive HUDs, automatic/explicit reading order and export defaults.', { checks: catalog.checks.length })

  const project = templates.createTemplateProject('mouse-knockout', 'Nova v6.0.3 Export Audit')
  project.projectSettings.build.gameName = 'Mouse Knockout'
  const packageBytes = await pak.createNovaPak(JSON.stringify(project), structuredClone(project.assets), project.activeSceneUuid, { deterministic: true, compression: 'balanced' })
  const parsed = await pak.parseNovaPak(packageBytes)
  check('V603-PACK-ROUNDTRIP', parsed.index.engineVersion === '6.0.3' && parsed.files.has('project.nova') && parsed.index.entries.every(/* 调用 parsed.files.has(entry.path) 并返回调用结果。 */ entry => parsed.files.has(entry.path)), 'Nova package checksums and files round-trip under 6.0.3.', { bytes: packageBytes.byteLength, entries: parsed.index.entries.length })

  const projectPath = join(workspace, 'project.nova'), playerPath = join(workspace, 'nova-player.exe'), output = join(workspace, 'portable')
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`); await writeFile(playerPath, Buffer.from('MZ\u0000Nova_A player template audit\n'))
  execFileSync(process.execPath, [join(root, 'scripts/nova-export.mjs'), '--project', projectPath, '--target', 'windows', '--output', output, '--profile', 'release', '--architecture', 'x86_64', '--runtime', 'game', '--player', playerPath, '--single-file'], { cwd: root, stdio: 'pipe' })
  const executablePath = join(output, 'Mouse Knockout.exe'), executable = await readFile(executablePath), footerStart = executable.length - 48
  const magic = executable.subarray(footerStart, footerStart + 8).toString('ascii'), embeddedLength = Number(executable.readBigUInt64LE(footerStart + 8)), embedded = executable.subarray(footerStart - embeddedLength, footerStart)
  const expectedHash = executable.subarray(footerStart + 16).toString('hex'), actualHash = createHash('sha256').update(embedded).digest('hex')
  check('V603-PORTABLE-EXPORT', magic === 'NOVAPK2!' && embeddedLength > 16 && expectedHash === actualHash && !await exists(join(output, 'game.nova-pak')), 'Untouched Mouse Knockout exports as one SHA-256-verified portable player.', { executable: relative(root, executablePath), bytes: executable.length, embeddedLength })
} finally {
  await rm(compiled, { recursive: true, force: true }); await rm(workspace, { recursive: true, force: true })
}

const failed = checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed')
const report = { format: 'nova-v6.0.3-backend-export-verification', version: 1, engineVersion: '6.0.3', generatedAt: new Date().toISOString(), perspectives: ['backend', 'template', 'accessibility', 'build', 'portable-game'], checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(join(root, 'release-audits/v6.0.3-backend-export.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v6.0.3 backend/export verification passed: ${checks.length} checks.`)
/** 读取文件状态判断路径存在性，失败时返回假。 */ async function exists(path) { try { await stat(path); return true } catch { return false } }
