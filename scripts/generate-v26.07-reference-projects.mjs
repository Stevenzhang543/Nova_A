import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const projects = join(root, 'reference-projects', 'projects')
const source = join(projects, 'creator-v660-coop-arena')
const release = '26.07'
const engineVersion = '26.7.0'
const updatedAt = '2026-09-04T00:00:00.000Z'

const references = [
  {
    id: 'multiplayer-v2607-coop-rollback',
    title: 'Nova 26.07 Co-op Rollback',
    gameName: 'Nova 26.07 Co-op Rollback',
    runtimeMode: 'game',
    role: 'host',
    sessionName: 'Nova 26.07 Co-op',
    playerName: 'Host',
    endpoint: 'udp://127.0.0.1:46801',
    bindAddress: '127.0.0.1:46800',
    exportTemplate: 'windows-x64-v1'
  },
  {
    id: 'multiplayer-v2607-headless-authority',
    title: 'Nova 26.07 Headless Authority',
    gameName: 'Nova 26.07 Headless Authority',
    runtimeMode: 'headless-server',
    role: 'server',
    sessionName: 'Nova 26.07 Authority',
    playerName: 'Authority',
    endpoint: 'udp://127.0.0.1:46811',
    bindAddress: '127.0.0.1:46810',
    exportTemplate: 'windows-headless-x64-v1'
  }
]

function updateProject(project, reference) {
  const build = project.projectSettings.build
  const network = project.projectSettings.production.networking
  project.engineVersion = engineVersion
  project.projectMetadata.name = reference.title
  project.projectMetadata.template = reference.id
  project.projectMetadata.updatedAt = updatedAt
  project.manifest.name = reference.title
  project.manifest.engineCompatibility = { minimum: '7.0.0', maximumExclusive: '27.0.0' }
  for (const installed of project.packages?.installed ?? []) {
    if (installed?.manifest?.id !== 'top.whitelists.novaa.networking') continue
    installed.manifest.engine = '>=2.9.0 <27.0.0'
    installed.securityStatus = 'verified'
    installed.grantedPermissions = ['network.client', 'network.listen']
    installed.deprecations ??= []
  }
  build.gameName = reference.gameName
  build.runtimeMode = reference.runtimeMode
  build.target = 'windows'
  build.architecture = 'x86_64'
  build.profile = 'release'
  build.packageIntoExecutable = true
  build.developmentBuild = false
  build.platform ??= {}
  build.platform.version = engineVersion
  build.delivery.exportTemplate = reference.exportTemplate
  if (build.releaseEngineering) build.releaseEngineering.release = release
  network.enabled = true
  network.permissionGranted = true
  network.autoStart = true
  network.role = reference.role
  network.sessionMode = 'direct'
  network.sessionName = reference.sessionName
  network.playerName = reference.playerName
  network.transport = 'native-udp'
  network.endpoint = reference.endpoint
  network.bindAddress = reference.bindAddress
  network.maxPeers = 8
  network.snapshotRate = 30
  network.rollbackFrames = 180
  network.reconciliationThreshold = 0.075
  network.reconnect = true
  network.reconnectMaxAttempts = 8
  network.lateJoin = true
  network.allowAuthorityTransfer = true
  network.allowSceneHandoff = true
  network.interest = { ...(network.interest ?? {}), enabled: true, defaultRadius: 32, maximumRadius: 256 }
  network.multiInstance = { peerCount: reference.runtimeMode === 'game' ? 4 : 2, separateLogs: true, separateInspectors: true }
  network.simulation = { enabled: false, latencyMs: 80, jitterMs: 20, lossPercent: 5, duplicatePercent: 2, reorderPercent: 3, seed: 2607 }
  network.security = { ...(network.security ?? {}), requireEncryption: false, maximumPacketAgeMs: 15_000, replayWindow: 2_048 }
  const clientSource = `fn fixed_update(dt) {
  if !network_enabled() || !network_connected() || network_role() != "client" || network_tick() % 2 != 0 { return; }
  network_rpc("coop.move", #{ x: input_vector_x("Move"), y: input_vector_y("Move") });
}
fn on_signal(name, payload, source) {
  let role = network_role();
  if name != "network.coop.move" || (role != "host" && role != "server") { return; }
  set_velocity(payload.payload.x.to_float() * 4.0, payload.payload.y.to_float() * 4.0);
}`
  for (const asset of project.assets ?? []) {
    if (asset?.name !== 'CoopClientPlayer.rhai') continue
    asset.source = clientSource
    asset.byteLength = Buffer.byteLength(clientSource, 'utf8')
    const sourceHash = createHash('sha256').update(clientSource).digest('hex')
    if (asset.pipeline) {
      asset.pipeline.sourceHash = sourceHash
      asset.pipeline.artifactHash = sourceHash
      asset.pipeline.contentHash = sourceHash
      asset.pipeline.cacheKey = sourceHash
      asset.pipeline.lastValidSource = clientSource
    }
    if (asset.script) {
      asset.script.lastSavedHash = sourceHash
      asset.script.lastValidSource = clientSource
    }
  }
  return project
}

for (const reference of references) {
  const destination = join(projects, reference.id)
  await mkdir(destination, { recursive: true })
  await cp(source, destination, { recursive: true, force: true })
  const projectPath = join(destination, 'project.nova')
  const project = updateProject(JSON.parse(await readFile(projectPath, 'utf8')), reference)
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`)

  const isServer = reference.runtimeMode === 'headless-server'
  await writeFile(join(destination, 'README.md'), isServer
    ? `# Nova_A 26.07 headless authority\n\nEngine **${engineVersion}** · Project Format 2/schema 29 · Network Protocol 2\n\nThis reference reuses the co-op world so an exported authority has real scripts, two replicated rigid bodies, an RPC contract, interest data, deterministic inputs/checksums, late join and scene handoff state to serve. It is explicitly configured as a Windows **headless-server**, Server role, Direct session, native UDP on \`127.0.0.1:46810\`, package enabled and locked, \`network.client\` plus \`network.listen\` granted, project permission granted, and auto-start enabled.\n\nUse the matching co-op project as a client on \`udp://127.0.0.1:46810\`. Native UDP is unencrypted; this is a localhost qualification fixture, not public-deployment guidance. The 26.07 Windows server is a WebView-backed player with its world renderer disabled, not a separately qualified no-window service. The automated local gate requires admission, fixed ticks, authoritative snapshots and reconnect traffic. RPC behavior, graceful service-control shutdown, a signed player-template registry, public relay/NAT, hostile-network review, signing, clean-machine lifecycle, and the 72-hour soak remain separate manual or external gates.\n`
    : `# Nova_A 26.07 co-op rollback\n\nEngine **${engineVersion}** · Project Format 2/schema 29 · Network Protocol 2\n\nThis local-first reference contains two scripted rigid-body players, a bounded \`coop.move\` RPC, server-authoritative transform/rotation/velocity replication, prediction on the client body, interest radius, reconnect, late join, scene handoff, replay/save settings, and deterministic bad-network controls. Networking is explicit and uses native UDP loopback; no Nova_A cloud is contacted.\n\nIn **Network Studio → Orchestration**, build once and exercise 2, 4, then 8 instances. Each process must expose a distinct role/identity, bind/endpoint, editor-event log scope and player Inspector identity. Simulate 80 ms latency, 20 ms jitter, 5% loss, 3% reorder and 2% duplication with seed 2607. The 26.07 rollback check restores authoritative transform/rotation/velocity and reapplies recorded fixed-tick state deltas; it does not rerun InputSnapshot values through physics or Rhai. A counter or visual blend is not enough. Follow \`test-controls.json\` for the normal-user gate.\n`)

  const actions = isServer ? [
    { action: 'Run Build/Project Health without the networking package, permission, or Server/Host authority', expected: 'Every invalid server configuration is blocked consistently in editor, CLI and native validation before output is published' },
    { action: 'Build the registered Windows headless template and inspect its report/provenance/SBOM', expected: 'Runtime mode, template ID/version, local unsigned player hash, project/build ID and redacted local signing paths are recorded; publisher attestation remains external' },
    { action: 'Launch the exported authority and connect a client to 127.0.0.1:46810', expected: 'The server admits the client, advances fixed ticks and sends authoritative snapshots while its WebView-backed world renderer is disabled' },
    { action: 'Disconnect, reconnect and late join during play, then stop the authority', expected: 'Scene then baseline then ACK precede live deltas; stale session state cleans up; the local harness terminates the process and does not claim graceful service-control shutdown' },
    { action: 'Attempt native UDP IPC with package absent, network disabled and permission revoked', expected: 'Every attempt fails closed even though the command is invoked from an exported player' }
  ] : [
    { action: 'Open Network Studio and review package, permission, role, transport and encryption guidance', expected: 'Nothing connects automatically; native UDP is identified as unencrypted localhost-only qualification' },
    { action: 'Build and launch 2, 4 and 8 instances', expected: 'One Host and distinct Clients start from the returned executable path with unique PID, role, bind/endpoint, log scope and Inspector identity' },
    { action: 'Focus each player and use WASD or the Move gamepad action', expected: 'Host movement stays authoritative; client input reaches the bounded coop.move contract and both bodies replicate' },
    { action: 'Enable seed 2607 with 80 ms latency, 20 ms jitter, 5% loss, 3% reorder and 2% duplication', expected: 'Prediction remains responsive and authoritative restore plus recorded transform/rotation/velocity state-delta replay converges; the timeline records corrected ticks' },
    { action: 'Inspect ownership, interest, bandwidth, replication diff, packets and rollback for each peer', expected: 'Logs filters bounded editor-observed events by instance; the editor Inspector opens only process identity/status detail, while the corresponding player Inspector toggle shows live network state and its bounded editorState log' },
    { action: 'Stop one client, reconnect it, then perform a late join and scene handoff', expected: 'Stale ownership/reliable/input/timer state is removed; scene and baseline apply before live deltas resume' },
    { action: 'Revoke permission and repeat ordinary offline Play', expected: 'Connection and native socket access are denied while offline physics, scripts, rendering and input remain unchanged' },
    { action: 'Repeat at every supported viewport/scale in English, German and Chinese', expected: 'Tabs, fields, instance cards, log/Inspector controls and diagnostic rows remain readable with no overlap, clipping or root overflow' }
  ]
  await writeFile(join(destination, 'test-controls.json'), `${JSON.stringify({ engineVersion, release, reference: reference.id, classification: isServer ? ['manual', 'runtime', 'build', 'security', 'external-gated'] : ['manual', 'runtime', 'multi-instance', 'reversible'], actions }, null, 2)}\n`)
  await writeFile(join(destination, 'expected-output.json'), `${JSON.stringify({ engineVersion, release, projectFormat: 2, schema: 29, networkProtocol: 2, reference: reference.id, runtimeMode: reference.runtimeMode, role: reference.role, status: 'candidate', replicatedEntities: project.projectSettings.production.networking.replicatedEntities.length, rpcContracts: project.projectSettings.production.networking.rpcContracts.length, fixedTickReplication: true, rollbackConvergence: 'bounded-state-delta-required-behavior-test', permissionIsolation: 'required-native-test', localStructuralVerification: 'required', headlessPresentation: isServer ? 'webview-world-renderer-disabled' : 'interactive-player', gracefulServiceShutdown: 'pending-external', signedPlayerTemplateRegistry: 'pending-external', publicNetworkQualification: 'pending-external' }, null, 2)}\n`)
}

const readmePath = join(root, 'reference-projects', 'README.md')
let readme = await readFile(readmePath, 'utf8')
const start = '<!-- NOVA_V2607_REFERENCES_START -->'
const end = '<!-- NOVA_V2607_REFERENCES_END -->'
const block = `${start}\n## Nova_A 26.07 multiplayer and server references\n\n- [Co-op rollback](projects/multiplayer-v2607-coop-rollback/README.md) — 2/4/8 local instances, RPC/authority/interest, deterministic impairment, bounded state-delta convergence, reconnect/late join, editor-event Logs filters, process detail cards, and player-side Inspector toggles.\n- [Headless authority](projects/multiplayer-v2607-headless-authority/README.md) — replicated server scene, native permission/export gates, real localhost snapshot/reconnect traffic, WebView renderer-disabled operation, and explicit no-window/graceful-shutdown/public-deployment limitations.\n${end}`
if (readme.includes(start) && readme.includes(end)) readme = `${readme.slice(0, readme.indexOf(start))}${block}${readme.slice(readme.indexOf(end) + end.length)}`
else readme = `${readme.trimEnd()}\n\n${block}\n`
await writeFile(readmePath, readme)
console.log('Generated the Nova_A 26.07 co-op rollback and headless authority references.')
