/** 功能回归脚本：执行 verify-v5.9.0-ecosystem.mjs 对应场景，保留断言和证据输出。 */
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const check = /** 记录检查结果、详情和指标，失败时同步输出错误信息。 */ (id, passed, detail, metrics = {}) => { checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }); if (!passed) console.error(`${id}: ${detail}`) }
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 8, userAgent: 'Nova_A v5.9 ecosystem verifier' } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, /** 提供不注册监听器的测试事件接口。 */ addEventListener() {}, /** 提供无需移除监听器的测试事件接口。 */ removeEventListener() {} }
globalThis.localStorage ??= { /* 返回固定值 null。 */ getItem() { return null }, /** 隔离存储桩忽略写入，不持久化生成过程数据。 */ setItem() {}, /** 隔离存储桩忽略删除请求。 */ removeItem() {} }
globalThis.performance ??= { now: /* 调用 Date.now() 并返回调用结果。 */ () => Date.now() }
globalThis.location ??= { search: '' }
globalThis.atob ??= /* 调用 Buffer.from(value, 'base64').toString('binary') 并返回调用结果。 */ value => Buffer.from(value, 'base64').toString('binary')

const ids = ['ecosystem-v59-wasm-api-matrix', 'ecosystem-v59-malicious-corpus', 'delivery-v59-offline-registry', 'delivery-v59-platform-matrix']
const references = await Promise.all(ids.map(/* 调用 readFile(join(root, `reference-projects/projects/${id}/project.nova`), 'utf8').then(JSON.parse) 并返回调用结果。 */ id => readFile(join(root, `reference-projects/projects/${id}/project.nova`), 'utf8').then(JSON.parse)))
check('V590-REFERENCES', references.every(/** 结构说明（自动提取）：references.every 回调；输入 project；返回表达式求值结果。 */ project => project.engineVersion === '5.9.0' && project.projectFormatMajor === 2 && project.formatVersion === 29 && project.projectSettings?.ecosystem?.implicitExecution === false), 'Four v5.9 references retain frozen formats and no implicit execution.', { references: ids })

const vite = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } }); await vite.watcher.close()
try {
  const plugins = await vite.ssrLoadModule('/src/runtime/plugins.ts'), packages = await vite.ssrLoadModule('/src/runtime/packages.ts')
  const ecosystem = await vite.ssrLoadModule('/src/runtime/extensionEcosystem.ts'), templates = await vite.ssrLoadModule('/src/runtime/exportTemplates.ts'), delivery = await vite.ssrLoadModule('/src/runtime/deliveryPipeline.ts')
  const expectedKinds = ['docks', 'inspectors', 'importers', 'components', 'graphNodes', 'renderPasses', 'buildSteps', 'templates', 'commands', 'settings']
  check('V590-API-MATRIX', expectedKinds.every(/* 调用 plugins.PLUGIN_API_MATRIX.some(item => item.kind === kind && item.permission && item.exportName) 并返回调用结果。 */ kind => plugins.PLUGIN_API_MATRIX.some(/* 先计算 item.kind === kind && item.permission；仅当其为真值时求右侧 item.exportName，返回短路求值结果。 */ item => item.kind === kind && item.permission && item.exportName)) && new Set(plugins.PLUGIN_API_MATRIX.map(/* 返回 item.permission 的当前值。 */ item => item.permission)).size === 10, 'All ten required contribution families have explicit permissions and host exports.')
  const manifest = plugins.normalizePluginManifest({ id: 'top.whitelists.audit.extension', name: 'Audit extension', version: '1.0.0', apiVersion: 2, engine: '>=5.9.0 <6.0.0', entry: 'audit.wasm', entryType: 'wasm', permissions: plugins.PLUGIN_API_MATRIX.map(/* 返回 item.permission 的当前值。 */ item => item.permission), contributions: Object.fromEntries(plugins.PLUGIN_API_MATRIX.map(/* 返回按声明顺序构造的数组 [item.kind, [{ id: `${item.kind}.audit`, label: item.kind, entry: 'log' }]]。 */ item => [item.kind, [{ id: `${item.kind}.audit`, label: item.kind, entry: 'log' }]])) })
  check('V590-CONTRIBUTIONS', Object.values(manifest.contributions).flat().length === 10, 'Manifest normalization retains every bounded, permission-reviewed contribution family.')
  let unknownPermissionBlocked = false; try { plugins.normalizePluginManifest({ ...manifest, permissions: [...manifest.permissions, 'filesystem.write'] }) } catch { unknownPermissionBlocked = true }
  check('V590-PERMISSION-BOUNDARY', unknownPermissionBlocked, 'Unknown plugin capabilities fail closed.')

  const wasm = await readFile(join(root, 'reference-projects/plugins/hello-plugin/hello-plugin.wasm')), wasmManifest = JSON.parse(await readFile(join(root, 'reference-projects/plugins/hello-plugin/plugin.json'), 'utf8'))
  const first = await plugins.instantiateWasmPlugin(wasmManifest, wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength)), second = await plugins.instantiateWasmPlugin(wasmManifest, wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength))
  check('V590-RELOAD', first !== second && first.exports.nova_plugin_api_version() === 2 && second.exports.nova_plugin_api_version() === 2, 'The certified WASM fixture initializes in two isolated generations without shared state.')

  const native = { abiVersion: 1, entrySymbol: 'nova_extension_v1', isolation: 'sidecar-process', heartbeatMs: 1000, restartLimit: 2, permissions: ['project.read'], binaries: [{ platform: 'windows', architecture: 'x86_64', path: 'bin/extension.exe', sha256: '1'.repeat(64) }] }
  let nativePermissionBlocked = false; try { ecosystem.nativeExtensionLaunchPlan('top.whitelists.native', native, 'windows', 'x86_64', []) } catch { nativePermissionBlocked = true }
  const plan = ecosystem.nativeExtensionLaunchPlan('top.whitelists.native', native, 'windows', 'x86_64', ['project.read'])
  check('V590-NATIVE-ABI', nativePermissionBlocked && plan.abiVersion === 1 && plan.isolation === 'sidecar-process' && plan.implicitExecution === false, 'Native ABI 1 requires explicit grants and produces an isolated non-implicit launch plan.')

  const official = packages.packageState.registryCatalog[0], good = ecosystem.scanPackageCandidate(official, { compressedBytes: 1024, expandedBytes: 4096, files: ['package.json', 'README.md', 'tests/certification.json'] })
  const malicious = [
    ecosystem.scanPackageCandidate(official, { compressedBytes: 1024, expandedBytes: 1024, files: ['../escape.exe'] }),
    ecosystem.scanPackageCandidate(official, { compressedBytes: 1024, expandedBytes: 1024 * 1024 * 1000, files: ['package.json'] }),
    ecosystem.scanPackageCandidate({ ...official, permissions: [...official.permissions, 'process.root'] }),
    ecosystem.scanPackageCandidate({ ...official, native: true })
  ]
  check('V590-MALICIOUS-CORPUS', good.status === 'passed' && malicious.every(/* 比较 report.status 与 'blocked'，返回严格相等的判断结果。 */ report => report.status === 'blocked'), 'Safe official input passes while traversal/executable, archive bomb, unknown permission and native-browser candidates fail closed.', { cases: malicious.length })
  const registry = ecosystem.createLocalRegistry([official]), imported = ecosystem.importLocalRegistry(registry)
  check('V590-OFFLINE', registry.offline === true && imported.imported === 1 && packages.packageState.offlineMode, 'A clean bounded official registry imports entirely offline without fetching content.')

  const win = templates.platformQualification('windows', { host: 'windows', architecture: 'x86_64', androidAvailable: false, androidReason: '' }), linux = templates.platformQualification('linux', { host: 'windows', architecture: 'x86_64', androidAvailable: false, androidReason: '' }), android = templates.platformQualification('android', { host: 'windows', architecture: 'x86_64', androidAvailable: false, androidReason: '' })
  check('V590-PLATFORM-GATES', win.status === 'pending-external' && linux.status === 'pending-external' && android.status === 'blocked', 'Windows clean-machine and Linux matching-host evidence remain pending; Android remains blocked.', { windows: win.status, linux: linux.status, android: android.status })
  const keyA = delivery.contentCacheKey({ b: 2, a: 1 }), keyB = delivery.contentCacheKey({ a: 1, b: 2 }), delta = delivery.createDeltaBuild('base', 'target', [{ path: 'a', sha256: '1' }, { path: 'b', sha256: '2' }], [{ path: 'a', sha256: '3' }, { path: 'c', sha256: '4' }])
  check('V590-CACHE-DELTA', keyA === keyB && delta.changed[0] === 'a' && delta.added[0] === 'c' && delta.removed[0] === 'b', 'Content cache keys are order-independent and delta manifests classify changes deterministically.')
  const connector = delivery.normalizeDeploymentConnector({ id: 'audit', name: 'Audit HTTPS', kind: 'https-webhook', destination: 'https://example.invalid/deploy', enabled: true, permissionGranted: false, headers: [] }); delivery.deliveryPipelineState.connectors.push(connector)
  let implicitBlocked = false; try { delivery.prepareDeployment(connector.id, 'game.zip', '0'.repeat(64)) } catch { implicitBlocked = true }
  connector.permissionGranted = true; const deploymentPlan = delivery.prepareDeployment(connector.id, 'game.zip', '0'.repeat(64))
  check('V590-NETWORK-TRANSPARENCY', implicitBlocked && deploymentPlan.implicitNetworkOperation === false && deploymentPlan.executableAction === false && deploymentPlan.explicitConfirmationRequired, 'Remote delivery is permission-gated and yields a non-executable, no-network plan.')
} finally { await vite.close() }

const failed = checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed'), report = { format: 'nova-v5.9.0-ecosystem-verification', version: 1, engineVersion: '5.9.0', generatedAt: new Date().toISOString(), checks, severity0Open: 0, severity1Open: failed.length, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(join(root, 'release-audits/v5.9.0-ecosystem-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) process.exit(1)
console.log(`Nova_A v5.9.0 ecosystem verification passed: ${checks.length} checks.`)
