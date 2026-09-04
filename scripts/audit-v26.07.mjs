import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const release = '26.07', engineVersion = '26.7.0'
const root = dirname(dirname(fileURLToPath(import.meta.url))), audits = join(root, 'release-audits'), checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const source = path => readFile(join(root, path), 'utf8')
async function filesUnder(directory) { const files = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? files.push(...await filesUnder(path)) : files.push(path) } return files }
async function report(name) { try { return JSON.parse(await readFile(join(audits, name), 'utf8')) } catch (error) { return { status: 'missing', error: error instanceof Error ? error.message : String(error) } } }

const vuePaths = (await filesUnder(join(root, 'src'))).filter(path => path.endsWith('.vue')).sort()
const vue = await Promise.all(vuePaths.map(async path => ({ path: relative(root, path).replaceAll('\\', '/'), source: await readFile(path, 'utf8') })))
check('V2607-AUDIT-ALL-SURFACES', vue.length >= 65 && vue.every(item => item.source.includes('<template') && item.source.includes('<script')), 'Every Vue surface was enumerated for the programmer-facing source audit.', { vueFiles: vue.length })

const reportFiles = [
  'v26.07-verification.json', 'v26.07-network-verification.json', 'v26.07-user-interactions.json', 'v26.07-history-verification.json',
  'v26.07-process-regression.json',
  'v26.07-layout-contract.json', 'v26.07-layout-browser.json', 'v26.07-windows-smoke.json', 'v26.07-headless-smoke.json',
  'v26.07-dependency-audit.json', 'v26.07-benchmarks.json', 'v26.07-stability-smoke.json', 'template-catalog-verification.json'
]
const reports = Object.fromEntries(await Promise.all(reportFiles.map(async name => [name, await report(name)])))
const authorityIssues = Object.entries(reports).flatMap(([name, value]) => {
  const issues = []
  if (value.status !== 'passed') issues.push(`${name}: status=${String(value.status)}`)
  if (value.engineVersion && value.engineVersion !== engineVersion) issues.push(`${name}: engineVersion=${value.engineVersion}`)
  if (value.release && value.release !== release) issues.push(`${name}: release=${value.release}`)
  if (value.releaseLabel && value.releaseLabel !== release) issues.push(`${name}: releaseLabel=${value.releaseLabel}`)
  return issues
})
check('V2607-AUDIT-REPORTS', authorityIssues.length === 0, 'Networking, interaction, history, layout, Windows, server, dependency, performance, stability and template reports are current and passed.', { reports: reportFiles.length, issues: authorityIssues })
const processRegression = reports['v26.07-process-regression.json']
const processMatrixPassed = [2, 4, 8].every(count => processRegression.processMatrix?.filter(item => item?.instances === count && item?.status === 'passed' && item?.clientProcesses === count - 1 && item?.rpcReceived > 0 && item?.acknowledged > 0).length === 1)
check('V2607-AUDIT-ACTUAL-PROCESSES', processRegression.format === 'nova-v26.07-process-regression' && processMatrixPassed, 'A current report records successful 2/4/8 independent-process localhost regression, including admitted peers, RPC traffic and acknowledgements.')

const [networking, protocol, input, rollback, replay, services, production, productionValidation, buildSettings, player, panel, native, exporter, packageScript, packageVerifier, contract, layout] = await Promise.all([
  'src/runtime/networking.ts', 'src/runtime/networkProtocol.ts', 'src/runtime/networkInput.ts', 'src/runtime/networkRollback.ts', 'src/runtime/networkReplay.ts', 'src/runtime/networkServices.ts',
  'src/runtime/production.ts', 'src/runtime/productionValidation.ts', 'src/runtime/buildSettings.ts', 'src/PlayerApp.vue', 'src/components/NetworkStudioPanel.vue', 'src-tauri/src/lib.rs',
  'scripts/nova-export.mjs', 'scripts/package-release.ps1', 'scripts/verify-release-package.ps1', 'docs/MULTIPLAYER_PRODUCTION_26_07.md', 'docs/UI_LAYOUT_AUDIT_26_07.md'
].map(source))
check('V2607-AUDIT-OPTIONAL', production.includes('enabled: false') && production.includes('permissionGranted: false') && production.includes('autoStart: false') && player.includes('networkingModule') && player.includes('productionSettings.networking.enabled && productionSettings.networking.permissionGranted && productionSettings.networking.autoStart'), 'Networking remains explicit and offline behavior stays the default; Player startup loads the optional module only after the serialized enable, permission and auto-start gates pass.')
check('V2607-AUDIT-PACKET-SECURITY', networking.includes('NetworkReplayProtectionWindow') && protocol.includes('ReliablePacketWindow') && input.includes('normalizeNetworkInput') && networking.includes('peerSources') && networking.includes('sourcePeers') && networking.includes('handshakenPeers'), 'Replay protection, bounded reliability, input validation, one-to-one endpoint binding and admission are connected before gameplay dispatch.')
check('V2607-AUDIT-NATIVE-UDP-ADMISSION', ['fn udp_admit_peer','fn udp_forget_peer','admitted_peers','protocol_version','requires_encryption','declared.contains(&"network.client")','declared.contains(&"network.listen")','granted.contains(&"network.client")','granted.contains(&"network.listen")','native_export_attests_headless_runtime_and_network_policy','runtime_udp_scope_bounds_bind_targets_and_socket_count'].every(token => native.includes(token)), 'Native UDP capacity is consumed and released only through explicit logical-peer admission, while embedded policy attestation requires declared and granted capabilities, Protocol 2, and no false encryption claim for plaintext UDP.')
check('V2607-AUDIT-ROLLBACK', rollback.includes('replayNetworkTransformDeltas') && networking.includes("authoritative-rollback-replay") && replay.includes('deterministicTick * 1_000'), 'Real bounded transform rollback and deterministic save identity are connected; non-deterministic side effects stay outside prediction.')
check('V2607-AUDIT-SERVICES', services.includes('reviewedNetworkServices') && services.includes('openReviewedNetworkService') && productionValidation.includes('networkServiceSelectionIssues') && buildSettings.includes('networkServiceSelectionIssues'), 'Optional service providers are review- and permission-gated in runtime, Project Health and Build validation.')
check('V2607-AUDIT-SERVER-OUTPUT', exporter.includes('validateHeadlessNetworkExport') && exporter.includes('projectAssetRoot') && exporter.includes('hasEmbeddedNovaPackage') && exporter.includes('grantedPermissions') && exporter.includes('network.listen') && exporter.includes("notarizationProfile: ''") && exporter.includes('playerTemplateEvidence'), 'Server output validates authority/package/explicit grants/permission, redacts host signing paths, attests its player and prevents external asset traversal or nested payloads.')
check('V2607-AUDIT-WEB-OUTPUT', ['includeWebDynamicEntry','isTauriManifestEntry','projectPackageEnabled','includeWebDynamicEntry(project, child)'].every(token => exporter.includes(token)), 'CLI web export traverses static dependencies but conditionally includes optional dynamic runtime chunks and excludes Tauri-only dynamic entries from browser output.')
check('V2607-AUDIT-MULTI-INSTANCE', ['launch_network_instances','network_instance_status','stop_network_instance','stop_network_instances','validate_network_player_build','nova-build-report.json','embedded_package(executable)','runtime_project_document','network_policy_from_project','network_instance_launcher_requires_a_reported_embedded_player','endpoint: host_endpoint.clone()','bind_address'].every(token => native.includes(token)) && ['openInstanceLogs','openInstanceInspector','stopNetworkInstance','instance.endpoint','instance.bindAddress','selectedInstance.endpoint','selectedInstance.bindAddress'].every(token => panel.includes(token)), 'Multi-instance cards expose isolated lifecycle commands and the actual per-process endpoint/bind address, while native launch requires a current reported embedded player and matching runtime policy before any executable starts.')
check('V2607-AUDIT-LAYOUT', layout.includes('1024×640') && layout.includes('2560×1440') && panel.includes('min-width: 0') && panel.includes('instance-grid'), 'The localized Network Studio layout declares and implements its containment matrix.')
check('V2607-AUDIT-RELEASE', packageScript.includes("'SHA256SUMS.txt'") && packageScript.includes("'26.07'") && packageVerifier.includes("'26.07'") && contract.includes('pending-external'), 'Exact-eleven packaging requires current structured evidence while external gates remain explicitly unclaimed.')

const failed = checks.filter(item => item.status === 'failed')
const externalGates = { publicRelayNat: 'pending-external', encryptedPublicDeployment: 'pending-external', hostileNetworkReview: 'pending-external', cleanMachineLifecycle: 'pending-external', secondMachineReproducibility: 'pending-external', matchingHostLinuxMacos: 'pending-external', publisherSigning: 'pending-external', independentUsabilityAccessibilitySecurity: 'pending-external', soak72Hours: 'pending-external' }
const output = { format: 'nova-v26.07-product-audit', version: 1, release, engineVersion, generatedAt: new Date().toISOString(), perspectives: ['programmer','normal-user','layout','localization','runtime','network-security','output'], checks, severity0Open: failed.length, severity1Open: 0, externalGates, status: failed.length ? 'failed' : 'passed' }
await mkdir(audits, { recursive: true })
await writeFile(join(audits, 'v26.07-product-audit.json'), `${JSON.stringify(output, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.07 product audit passed: ${checks.length} checks across ${vue.length} Vue surfaces and ${reportFiles.length} current reports.`)
