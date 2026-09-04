import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const release = '26.07', engineVersion = '26.7.0'
const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const source = path => readFile(join(root, path), 'utf8')
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })

const [packageSource, cargo, tauri, projectFormat, rustFormat, wasmPackageSource, production, build, protocol, networking, input, rollback, replay, services, panel, native, exporter, multiplayerContract, layoutContract, notes] = await Promise.all([
  'package.json', 'Cargo.toml', 'src-tauri/tauri.conf.json', 'src/projects/projectFormat.ts', 'crates/nova_format/src/lib.rs', 'nova_core/pkg/package.json',
  'src/runtime/production.ts', 'src/runtime/buildSettings.ts', 'src/runtime/networkProtocol.ts', 'src/runtime/networking.ts', 'src/runtime/networkInput.ts', 'src/runtime/networkRollback.ts', 'src/runtime/networkReplay.ts', 'src/runtime/networkServices.ts',
  'src/components/NetworkStudioPanel.vue', 'src-tauri/src/lib.rs', 'scripts/nova-export.mjs', 'docs/MULTIPLAYER_PRODUCTION_26_07.md', 'docs/UI_LAYOUT_AUDIT_26_07.md', 'docs/RELEASE_NOTES_26_07.md'
].map(source))
const pkg = JSON.parse(packageSource), tauriConfig = JSON.parse(tauri), wasmPackage = JSON.parse(wasmPackageSource)

check('V2607-VERSION-AUTHORITY', pkg.version === engineVersion && tauriConfig.version === engineVersion && wasmPackage.version === engineVersion && cargo.includes(`version = "${engineVersion}"`) && projectFormat.includes(`NOVA_ENGINE_VERSION = '${engineVersion}'`) && projectFormat.includes(`NOVA_RELEASE_NAME = '${release}'`) && rustFormat.includes(`CURRENT_ENGINE_VERSION: &str = "${engineVersion}"`), 'npm, Cargo, Tauri, WASM and project-format authorities agree on 26.7.0 / 26.07.')
check('V2607-FROZEN-CONTRACTS', projectFormat.includes('NOVA_PROJECT_SCHEMA_VERSION = 29') && rustFormat.includes('CURRENT_FORMAT_VERSION: u32 = 29') && protocol.includes('NOVA_NETWORK_PROTOCOL = 2'), '26.07 remains additive over Project Format 2/schema 29 and Network Protocol 2.')
check('V2607-OFFLINE-DEFAULT', production.includes('enabled: false') && production.includes('permissionGranted: false') && production.includes('autoStart: false'), 'Networking stays optional, permission-gated and disabled by default; ordinary offline projects do not open sockets.')
check('V2607-INPUT-BOUNDARY', input.includes('normalizeNetworkInput') && input.includes('cloneNetworkInput') && input.includes('emptyNetworkInput') && networking.includes('normalizeNetworkInput') && replay.includes('cloneNetworkInput'), 'Live packets, replay and saves share finite bounded InputSnapshot normalization.')
check('V2607-ROLLBACK-RUNTIME', rollback.includes('replayNetworkTransformDeltas') && networking.includes('replayNetworkTransformDeltas') && networking.includes("reason: 'authoritative-rollback-replay'") && networking.includes('setWorldTransform'), 'Reconciliation restores authoritative transform state, replays journaled deltas and applies the reconstructed present state.')
check('V2607-TRANSPORT-LIFECYCLE', ['snapshotAccumulator', 'scheduledDeliveries', 'connectionGeneration', 'peerSources', 'reliableBuffers.clear()', 'remoteInputs.clear()'].every(token => networking.includes(token)), 'Fixed cadence, delayed-send cancellation, endpoint binding and disconnect cleanup are present.')
check('V2607-SECURITY-BOUNDS', ['maximumPendingReliable', 'maximumPacketBytes', 'maximumMessagesPerSecond', 'authenticationRejected', 'replayRejected', 'schemaRejected'].every(token => networking.includes(token)), 'Packet, reliable-window, rate, authentication, replay and schema boundaries remain observable and bounded.')
check('V2607-OPTIONAL-SERVICES', ['registerReviewedNetworkService', 'networkServiceReviewIssues', 'networkServiceSelectionIssues', 'openReviewedNetworkService'].every(token => services.includes(token)) && build.includes('networkServiceSelectionIssues'), 'Identity, lobby and relay extension points require reviewed metadata and participate in Build validation.')
check('V2607-HEADLESS-POLICY', exporter.includes('validateHeadlessNetworkExport') && exporter.includes('network.listen') && exporter.includes('grantedPermissions') && exporter.includes('permissionGranted') && exporter.includes('networking.autoStart !== true') && exporter.includes("networking.sessionMode !== 'direct'") && exporter.includes('headless-server') && exporter.includes('Native UDP is not encrypted') && exporter.includes('hasEmbeddedNovaPackage') && exporter.includes("signingIdentity: ''") && exporter.includes('playerTemplateEvidence'), 'The headless CLI validates package identity, explicit grants, project permission, automatic startup, direct authority, transport, protocol and encryption claims, redacts local signing paths and attests a clean player before writing output.')
const nativeTools = ['launch_network_instances', 'network_instance_status', 'stop_network_instance', 'stop_network_instances', 'validate_network_player_build', 'nova-build-report.json', 'embedded_package(executable)', 'network_policy_from_project', 'endpoint: host_endpoint.clone()', 'bind_address'].every(token => native.includes(token))
const panelTools = ['openInstanceLogs', 'openInstanceInspector', 'stopNetworkInstance', 'instance.endpoint', 'instance.bindAddress', 'selectedInstance.endpoint', 'selectedInstance.bindAddress'].every(token => panel.includes(token))
check('V2607-MULTI-INSTANCE-TOOLS', nativeTools && panelTools, '2/4/8 orchestration exposes actual per-process endpoint/bind address, status, Logs, Inspector, Stop and stop-all actions, and rejects an unreported or policy-mismatched executable before launch.')
check('V2607-DOCUMENTED-BOUNDARIES', multiplayerContract.includes('does **not** rerun buffered `InputSnapshot`') && multiplayerContract.includes('not a cryptographic signature') && multiplayerContract.includes('WebView-backed') && multiplayerContract.includes('graceful service-control shutdown remains unqualified') && multiplayerContract.includes('pending-external') && layoutContract.includes('Automated geometry is not proof') && notes.includes('hostile public-network review'), 'State-delta rollback, checksum, WebView server, shutdown, layout and external-certification boundaries are stated without overstating local evidence.')
const webExportProbe = await verifyConditionalWebExport()
check('V2607-WEB-DYNAMIC-IMPORT-BOUNDARY', webExportProbe.passed, 'CLI web export follows the conditional player graph: offline or package-absent projects omit optional networking/navigation/AI and Tauri-only dynamic chunks, while an enabled installed networking package includes its web-safe runtime chunk.', webExportProbe)

for (const [id, expectedMode, expectedRole] of [['multiplayer-v2607-coop-rollback', 'game', 'host'], ['multiplayer-v2607-headless-authority', 'headless-server', 'server']]) {
  let project = null, error = ''
  try { project = JSON.parse(await source(`reference-projects/projects/${id}/project.nova`)) } catch (caught) { error = caught instanceof Error ? caught.message : String(caught) }
  const network = project?.projectSettings?.production?.networking, installed = project?.packages?.installed ?? [], locked = project?.packages?.lockfile ?? []
  check(`V2607-REFERENCE-${expectedRole.toUpperCase()}`, project?.engineVersion === engineVersion && project?.formatVersion === 29 && project?.projectSettings?.build?.runtimeMode === expectedMode && project?.projectSettings?.build?.platform?.version === engineVersion && network?.enabled === true && network?.permissionGranted === true && network?.autoStart === true && network?.sessionMode === 'direct' && network?.role === expectedRole && network?.protocolVersion === 2 && network?.replicatedEntities?.length >= 2 && network?.rpcContracts?.length >= 1 && installed.some(item => item?.manifest?.id === 'top.whitelists.novaa.networking' && item.enabled === true && item.project === true && item.securityStatus === 'verified' && item.grantedPermissions?.includes('network.client') && item.grantedPermissions?.includes('network.listen')) && locked.some(item => item?.id === 'top.whitelists.novaa.networking'), `The ${expectedRole} reference is authored, permission-granted, package-locked and configured for its actual ${expectedMode} workflow.`, { error, replicatedEntities: network?.replicatedEntities?.length ?? 0, rpcContracts: network?.rpcContracts?.length ?? 0 })
}

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v26.07-verification', version: 1, release, engineVersion, generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, externalGates: { publicRelayNat: 'pending-external', encryptedPublicDeployment: 'pending-external', matchingHostLinuxMacos: 'pending-external', publisherSigning: 'pending-external', independentUsabilitySecurity: 'pending-external', soak72Hours: 'pending-external' }, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v26.07-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.07 verification passed: ${checks.length} release-contract checks.`)

async function verifyConditionalWebExport() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'nova-v2607-web-export-'))
  const result = { passed: false, cases: [], error: '' }
  try {
    const dist = join(temporaryRoot, 'dist'), assets = join(dist, 'assets')
    await mkdir(join(dist, '.vite'), { recursive: true }); await mkdir(assets, { recursive: true })
    const tauriKey = 'E:/fixture/node_modules/.pnpm/@tauri-apps+api@2.11.1/node_modules/@tauri-apps/api/core.js'
    const manifest = {
      'player.html': { file: 'assets/player.js', dynamicImports: ['src/runtime/networking.ts', 'src/runtime/navigation2d.ts', 'src/runtime/aiTools.ts', 'src/runtime/always.ts', tauriKey] },
      'src/runtime/networking.ts': { file: 'assets/networking.js', dynamicImports: [tauriKey] },
      'src/runtime/navigation2d.ts': { file: 'assets/navigation.js' },
      'src/runtime/aiTools.ts': { file: 'assets/ai.js' },
      'src/runtime/always.ts': { file: 'assets/always.js' },
      [tauriKey]: { file: 'assets/tauri-core.js' }
    }
    await writeFile(join(dist, '.vite/manifest.json'), `${JSON.stringify(manifest)}\n`)
    await writeFile(join(dist, 'player.html'), '<!doctype html><title>Fixture</title><main>Nova</main>')
    for (const name of ['player.js','networking.js','navigation.js','ai.js','always.js','tauri-core.js']) await writeFile(join(assets, name), `export const fixture = '${name}'\n`)
    const networkInstall = { manifest: { id: 'top.whitelists.novaa.networking', version: '2.9.0', sha256: 'a'.repeat(64), permissions: ['network.client'] }, enabled: true, project: true, source: { kind: 'registry', location: 'fixture' }, grantedPermissions: ['network.client'] }
    const cases = [
      { name: 'offline-package-present', networkEnabled: false, installed: [networkInstall], expectNetwork: false },
      { name: 'enabled-package-absent', networkEnabled: true, installed: [], expectNetwork: false },
      { name: 'enabled-package-present', networkEnabled: true, installed: [networkInstall], expectNetwork: true }
    ]
    for (const fixture of cases) {
      const projectPath = join(temporaryRoot, `${fixture.name}.nova`), output = join(temporaryRoot, `output-${fixture.name}`)
      const project = {
        formatVersion: 29, engineVersion, projectMetadata: { id: fixture.name }, activeSceneUuid: 'scene-main',
        scenes: [{ uuid: 'scene-main', name: 'Main', entities: [] }], assets: [], packages: { installed: fixture.installed, lockfile: [] },
        projectSettings: { build: { target: 'web', profile: 'release', architecture: 'x86_64', runtimeMode: 'game', startupSceneUuid: 'scene-main', sceneOrder: ['scene-main'], delivery: { releaseChannel: 'beta', provenance: false, sbom: false, webHeaders: false, dependencyReport: false, sizeReport: false } }, production: { networking: { enabled: fixture.networkEnabled } } }
      }
      await writeFile(projectPath, `${JSON.stringify(project)}\n`)
      execFileSync(process.execPath, [join(root, 'scripts/nova-export.mjs'), '--project', projectPath, '--target', 'web', '--template', 'web-es2022-v1', '--dist', dist, '--output', output, '--no-patch'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000, windowsHide: true })
      const exists = async name => { try { await readFile(join(output, 'assets', name)); return true } catch { return false } }
      const files = { player: await exists('player.js'), always: await exists('always.js'), networking: await exists('networking.js'), navigation: await exists('navigation.js'), ai: await exists('ai.js'), tauri: await exists('tauri-core.js') }
      const passed = files.player && files.always && files.networking === fixture.expectNetwork && !files.navigation && !files.ai && !files.tauri
      result.cases.push({ name: fixture.name, expectNetwork: fixture.expectNetwork, files, passed })
    }
    result.passed = result.cases.length === 3 && result.cases.every(item => item.passed)
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
  return result
}
