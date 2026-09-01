import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const projectsRoot = join(root, 'reference-projects/projects')
const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const clone = value => structuredClone(value)
const sha = value => createHash('sha256').update(value).digest('hex')
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)

const base = await readJson(join(projectsRoot, 'creator-v60-network-sample/project.nova'))
const scriptTemplateProject = await readJson(join(projectsRoot, 'creator-v601-mouse-knockout/project.nova'))
const scriptTemplate = scriptTemplateProject.assets.find(asset => asset.assetType === 'script')
if (!scriptTemplate) throw new Error('A retained Rhai asset template is required.')

function scriptAsset(uuid, name, source) {
  const asset = clone(scriptTemplate), digest = sha(source)
  Object.assign(asset, { uuid, name, path: `Assets/Scripts/${name}`, source, byteLength: Buffer.byteLength(source), sourceModified: 0, importedAt: 0 })
  asset.pipeline = { ...asset.pipeline, importerVersion: 'reference-6.6', sourceHash: digest, artifactHash: digest, contentHash: digest, cacheKey: digest, status: 'ready', lastValidSource: source, error: '', dependencies: [], reverseDependencies: [], cacheHit: false }
  asset.script = { ...asset.script, apiVersion: 2, reloadPolicy: 'preserve', signalConnections: [], recoverySource: '', lastSavedHash: digest }
  return asset
}
function attachScript(entity, componentUuid, assetUuid) {
  entity.components.push({ uuid: componentUuid, kind: 'Script2D', enabled: true, removed: false, data: { scriptAsset: `asset://${assetUuid}`, properties: {} } })
}
function productionNetworkDefaults(networking) {
  return Object.assign(networking, {
    transportAdapterId: '', authentication: { mode: 'none', providerId: '', requireVerifiedPeers: false, handshakeTimeoutMs: 10_000 }, security: { requireEncryption: false, maximumPacketAgeMs: 15_000, replayWindow: 2_048 }, interest: { enabled: true, defaultRadius: 24, maximumRadius: 256 }, multiInstance: { peerCount: 2, separateLogs: true, separateInspectors: true }, allowAuthorityTransfer: true, allowSceneHandoff: true
  })
}
function identify(project, name, template) {
  project.engineVersion = '6.6.0'; project.projectName = name; project.projectMetadata.name = name; project.projectMetadata.template = template; project.projectMetadata.updatedAt = '2026-09-01T00:00:00.000Z'
  project.manifest.name = name; project.manifest.engineCompatibility.maximumExclusive = '7.0.0'; project.projectSettings.scripting.apiVersion = 2
}

const coop = clone(base)
identify(coop, 'Nova 6.6 Co-op Arena', 'creator-v660-coop-arena')
coop.projectMetadata.description = 'Playable two-player local-first RPC and replication reference.'
coop.projectSettings.build.gameName = 'Nova 6.6 Co-op Arena'
coop.projectSettings.build.packageIntoExecutable = true
coop.projectSettings.build.platform.version = '6.6.0'
coop.projectSettings.build.platform.identifier = 'top.whitelists.novaa.cooparena'
coop.projectSettings.build.delivery.exportTemplate = 'windows-x64-v1'
const coopNetwork = productionNetworkDefaults(coop.projectSettings.production.networking)
Object.assign(coopNetwork, { enabled: true, permissionGranted: true, autoStart: true, role: 'host', sessionMode: 'local', sessionName: 'Nova 6.6 Co-op Arena', playerName: 'Host', maxPeers: 8, protocolVersion: 2, schemaVersion: 1 })
coopNetwork.rpcContracts = [{ name: 'coop.move', channelId: 'events', direction: 'client-to-server', authority: 'any', payloadSchema: 'object', maximumPayloadBytes: 128, callsPerSecond: 40 }]
const scene = coop.scenes[0], host = scene.entities.find(entity => entity.name === 'Server Player'), remote = scene.entities.find(entity => entity.name === 'Remote Player')
if (!host || !remote) throw new Error('Retained network sample players are missing.')
host.name = 'Host Player'; remote.name = 'Client Player'
const hostSource = `fn fixed_update(dt) {
  if !network_enabled() || !network_connected() { return; }
  let role = network_role();
  if role == "host" || role == "server" { set_velocity(input_vector_x("Move") * 4.0, input_vector_y("Move") * 4.0); }
}`
const clientSource = `fn fixed_update(dt) {
  if !network_enabled() || !network_connected() || network_role() != "client" || network_tick() % 2 != 0 { return; }
  network_rpc("coop.move", #{ x: input_vector_x("Move"), y: input_vector_y("Move") });
}
fn on_signal(name, payload, source) {
  let role = network_role();
  if name != "network.coop.move" || (role != "host" && role != "server") { return; }
  set_velocity(payload.x.to_float() * 4.0, payload.y.to_float() * 4.0);
}`
const hostScriptId = '66000000-0000-4000-8000-000000000001', clientScriptId = '66000000-0000-4000-8000-000000000002'
coop.assets.push(scriptAsset(hostScriptId, 'CoopHostPlayer.rhai', hostSource), scriptAsset(clientScriptId, 'CoopClientPlayer.rhai', clientSource))
attachScript(host, '66000000-0000-4000-8000-000000000011', hostScriptId); attachScript(remote, '66000000-0000-4000-8000-000000000012', clientScriptId)
coopNetwork.replicatedEntities = [host, remote].map((entity, index) => ({ entityUuid: entity.uuid, authority: 'server', properties: ['transform', 'rotation', 'velocity'], interpolate: true, predict: index === 1, ownerPeerId: '', alwaysRelevant: false, interestRadius: 24, sceneUuid: scene.uuid }))

const coopDir = join(projectsRoot, 'creator-v660-coop-arena'); await mkdir(coopDir, { recursive: true }); await writeJson(join(coopDir, 'project.nova'), coop)
await writeFile(join(coopDir, 'README.md'), `# Nova_A 6.6 co-op arena

Engine **6.6.0** · Project Format 2/schema 29 · Network Protocol 2

This two-player reference is playable and intentionally local-first. Open the project, install/verify Nova Networking, and review its already-saved explicit permission before Play. In Network Studio choose **2 instances → Build and launch**. The first process is Host; the second is Client. Focus either player and use **WASD** or a gamepad Move action. Host input moves the blue Host Player. Client input sends bounded \`coop.move\` RPCs; host/server moves the orange Client Player and replicates both authoritative transforms/velocities.

Use Orchestration to inspect verified peers, ownership, relevance radius, replication diffs and rollback timeline. Turn on 80 ms latency, 20 ms jitter, 5% loss, 3% reordering and 2% duplication; motion must recover without a fatal error. Stop one client and confirm stale ownership/input/replay state is cleaned. Reconnect/late-join, save/reload, then revoke permission and confirm networking refuses to start while ordinary offline Play still works.

Local lobby discovery is explicit and uses no Nova_A cloud. Internet play requires the user's WSS/reviewed adapter, authentication system, relay/NAT design and security review.
`)
await writeJson(join(coopDir, 'test-controls.json'), { engineVersion: '6.6.0', reference: 'creator-v660-coop-arena', peers: [2, 4, 8], controls: { host: 'WASD / Move', client: 'WASD / Move through coop.move RPC' }, workflow: ['grant explicit permission', 'build and launch peers', 'move host and client', 'inspect replication and rollback', 'simulate bad network', 'disconnect/reconnect/late join', 'save and reload', 'revoke permission', 'confirm offline play'], expected: { playable: true, protocol: 2, packageOptional: true, implicitCloud: false, frozenSchema: 29 } })
await writeJson(join(coopDir, 'expected-output.json'), { engineVersion: '6.6.0', status: 'passed', authority: 'host/server', replicatedEntities: 2, rpc: 'coop.move', interestRadius: 24, lateJoin: true, replaySave: true, externalInternetInfrastructure: 'not-bundled' })

const headlessBase = await readJson(join(projectsRoot, 'headless-networking/project.nova'))
const headless = clone(headlessBase)
identify(headless, 'Nova 6.6 Headless Authority', 'creator-v660-headless-authority')
headless.projectMetadata.description = 'Authoritative native-UDP headless server export and diagnostics reference.'
const headlessNetwork = productionNetworkDefaults(headless.projectSettings.production.networking)
Object.assign(headlessNetwork, { enabled: true, permissionGranted: true, autoStart: true, role: 'server', sessionMode: 'direct', sessionName: 'Nova 6.6 Headless Authority', playerName: 'Authority', maxPeers: 8, transport: 'native-udp', endpoint: 'udp://127.0.0.1:45811', bindAddress: '127.0.0.1:45810', protocolVersion: 2, schemaVersion: 1 })
headlessNetwork.security.requireEncryption = false
headless.projectSettings.build.gameName = 'Nova 6.6 Headless Authority'
headless.projectSettings.build.target = 'windows'; headless.projectSettings.build.architecture = 'x86_64'; headless.projectSettings.build.runtimeMode = 'headless-server'; headless.projectSettings.build.packageIntoExecutable = true
headless.projectSettings.build.platform.version = '6.6.0'; headless.projectSettings.build.platform.identifier = 'top.whitelists.novaa.headlessauthority'
headless.projectSettings.build.delivery.exportTemplate = 'windows-headless-x64-v1'
const headlessDir = join(projectsRoot, 'creator-v660-headless-authority'); await mkdir(headlessDir, { recursive: true }); await writeJson(join(headlessDir, 'project.nova'), headless)
await writeFile(join(headlessDir, 'README.md'), `# Nova_A 6.6 headless authority

Engine **6.6.0** · Project Format 2/schema 29 · Network Protocol 2

This reference configures an explicit-permission **Server**, native UDP at \`127.0.0.1:45810\`, deterministic fixed ticks, no renderer, bounded Protocol 2 messages, late join/save/replay, ownership cleanup and diagnostics. Build Settings selects the registered Windows headless template.

Build on Windows, launch the server, then configure a client copy to \`udp://127.0.0.1:45810\`. Native UDP is not encrypted; localhost qualification is not evidence for public deployment. Production use needs an independently reviewed encrypted tunnel/adapter, authentication provider, firewall/relay/NAT design and hostile-network review. Web and Android headless builds remain blocked.
`)
await writeJson(join(headlessDir, 'test-controls.json'), { engineVersion: '6.6.0', reference: 'creator-v660-headless-authority', expected: { runtimeMode: 'headless-server', role: 'server', transport: 'native-udp', bind: '127.0.0.1:45810', renderer: false, fixedTick: true, explicitPermission: true, implicitCloud: false } })
await writeJson(join(headlessDir, 'expected-output.json'), { engineVersion: '6.6.0', status: 'passed', headless: true, authority: true, protocol: 2, nativeUdpEncryption: false, publicDeploymentQualification: 'pending-external' })

const indexPath = join(root, 'reference-projects/README.md'), start = '<!-- NOVA_V660_REFERENCES_START -->', end = '<!-- NOVA_V660_REFERENCES_END -->'
let index = await readFile(indexPath, 'utf8')
const block = `${start}\n## Nova_A 6.6.0 production multiplayer projects\n\n- [Co-op arena](projects/creator-v660-coop-arena/README.md) — playable host/client Rhai RPC, authoritative replication, relevance, bad-network and reconnect workflow.\n- [Headless authority](projects/creator-v660-headless-authority/README.md) — native-UDP authoritative server export, honest encryption limits and client connection workflow.\n${end}`
const expression = new RegExp(`${start}[\\s\\S]*?${end}`, 'm')
index = expression.test(index) ? index.replace(expression, block) : `${index.trimEnd()}\n\n${block}\n`
await writeFile(indexPath, index, 'utf8')
console.log('Generated Nova_A v6.6.0 co-op and headless multiplayer reference projects.')
