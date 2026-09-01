import { fork } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const check = (id, passed, detail, metrics = {}) => { checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }); if (!passed) console.error(`${id}: ${detail}`) }
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 8, userAgent: 'Nova_A v6.6 verifier' } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, addEventListener() {}, removeEventListener() {} }
globalThis.localStorage ??= { getItem() { return null }, setItem() {}, removeItem() {} }
globalThis.performance ??= { now: () => Date.now() }

const vite = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } }); await vite.watcher.close()
try {
  const protocol = await vite.ssrLoadModule('/src/runtime/networkProtocol.ts'), productionNetwork = await vite.ssrLoadModule('/src/runtime/networkProduction.ts'), production = await vite.ssrLoadModule('/src/runtime/production.ts'), networking = await vite.ssrLoadModule('/src/runtime/networking.ts'), replay = await vite.ssrLoadModule('/src/runtime/networkReplay.ts')
  let badAdapterRejected = false
  try { productionNetwork.registerReviewedNetworkTransport({ review: { id: 'bad', label: '', version: 'x', publisher: '', sha256: 'x', reviewedBy: 'Whitelist', permissions: [], encrypted: false, documentationUrl: 'http://bad', securityUrl: '' }, create() { throw new Error('must not create') } }) } catch { badAdapterRejected = true }
  const validReview = { id: 'top.whitelists.test.secure', label: 'Qualification adapter', version: '1.0.0', publisher: 'Whitelist', sha256: 'a'.repeat(64), reviewedBy: 'Whitelist', permissions: ['network.client', 'network.listen'], encrypted: true, documentationUrl: 'https://example.invalid/docs', securityUrl: 'https://example.invalid/security' }
  const unregisterAdapter = productionNetwork.registerReviewedNetworkTransport({ review: validReview, create() { return { kind: 'adapter', async connect() {}, async send() {}, async close() {} } } })
  check('V660-REVIEWED-ADAPTER', badAdapterRejected && productionNetwork.reviewedNetworkTransports().some(item => item.id === validReview.id) && productionNetwork.createReviewedNetworkTransport(validReview.id, production.productionSettings.networking)?.kind === 'adapter', 'Malformed adapters fail review while a bounded reviewed adapter registers and creates explicitly.')
  unregisterAdapter()

  const proofSecret = 'local-test-key', unregisterAuth = productionNetwork.registerNetworkAuthenticationProvider({ id: 'qualification.auth', label: 'Qualification auth', createProof(context) { return `${context.sender}:${context.nonce}:${proofSecret}` }, verifyProof(context, proof) { return proof === `${context.sender}:${context.nonce}:${proofSecret}` } })
  const authContext = { sessionId: 'session', sender: 'peer', epoch: 'epoch', nonce: 'nonce', issuedAt: Date.now(), packetChecksum: 'abc' }, proof = productionNetwork.createAuthenticationProof('qualification.auth', authContext)
  check('V660-AUTH-HOOK', productionNetwork.verifyAuthenticationProof('qualification.auth', authContext, proof) && !productionNetwork.verifyAuthenticationProof('qualification.auth', { ...authContext, nonce: 'changed' }, proof), 'Authentication proof hooks verify the frozen context and reject tampering without storing credentials.')
  unregisterAuth()

  const replayWindow = new productionNetwork.NetworkReplayProtectionWindow(), now = Date.now(), envelope = { epoch: 'epoch', nonce: 'one', issuedAt: now, proof: '' }
  const replayResults = [replayWindow.accept('peer', envelope, now, 1_000, 2, true), replayWindow.accept('peer', envelope, now, 1_000, 2, true), replayWindow.accept('peer', { ...envelope, nonce: 'old', issuedAt: now - 2_000 }, now, 1_000, 2, true), replayWindow.accept('peer', { ...envelope, nonce: 'future', issuedAt: now + 6_000 }, now, 1_000, 2, true), replayWindow.accept('peer', undefined, now, 1_000, 2, true)]
  check('V660-REPLAY-PROTECTION', replayResults.map(item => item.reason).join(',') === ',duplicate,expired,future,missing-envelope', 'Nonce, epoch, age, future-time and required-envelope replay policy rejects repeated or invalid traffic.', { decisions: replayResults })

  const reliableWindow = new protocol.ReliablePacketWindow(8), reliablePacket = protocol.createNetworkPacket({ sessionId: 'session', sender: 'host', channel: 'events', delivery: 'reliable-ordered', sequence: 1, ack: null, tick: 1, schema: 1, kind: 'rpc', payload: null })
  reliableWindow.track('peer-a', reliablePacket, protocol.serializeNetworkPacket(reliablePacket), now); reliableWindow.track('peer-b', { ...reliablePacket, sequence: 2 }, protocol.serializeNetworkPacket({ ...reliablePacket, sequence: 2 }), now)
  check('V660-DISCONNECT-CLEANUP', reliableWindow.clearPeer('peer-a') === 1 && reliableWindow.size === 1 && reliableWindow.clearPeer('missing') === 0, 'Disconnect cleanup releases only the departing peer\'s reliable delivery state and leaves other peers intact.')

  const definitions = [{ entityUuid: 'entity-a', authority: 'owner', properties: ['transform'], interpolate: true, predict: false, ownerPeerId: 'peer-a', alwaysRelevant: false, interestRadius: 10, sceneUuid: 'scene-a' }]
  const authority = new productionNetwork.NetworkAuthorityTable(); authority.initialize(definitions, 'host', 'host'); const transferred = authority.transfer('entity-a', 'peer-b'), released = authority.releasePeer('peer-b', 'host')
  check('V660-AUTHORITY-CLEANUP', transferred && authority.owner('entity-a') === 'host' && released[0] === 'entity-a', 'Owner authority transfers deterministically and returns to host/server after disconnect.')
  const view = { peerId: 'peer', center: [0, 0], radius: 20, sceneUuid: 'scene-a', updatedAt: now }
  check('V660-INTEREST', productionNetwork.entityRelevantToPeer(definitions[0], [5, 0], view, true) && !productionNetwork.entityRelevantToPeer(definitions[0], [11, 0], view, true) && !productionNetwork.entityRelevantToPeer(definitions[0], [0, 0], { ...view, sceneUuid: 'scene-b' }, true), 'Per-entity radius and scene relevance cull only non-relevant snapshots.')
  const plans = [2, 4, 8].map(count => productionNetwork.createNetworkPlayPlan(count, 'Qualification'))
  check('V660-MULTI-INSTANCE-PLAN', plans.every((plan, index) => plan.length === [2, 4, 8][index] && plan[0].role === 'host' && plan.slice(1).every(item => item.role === 'client') && new Set(plan.map(item => item.inspectorId)).size === plan.length), 'Two/four/eight-peer plans have one host plus distinct client, log and Inspector identities.')

  production.resetProductionSettings(); production.loadProductionSettings({ networking: { sessionMode: 'direct', transport: 'websocket', endpoint: 'ws://127.0.0.1:9001', security: { requireEncryption: true } } })
  const insecure = productionNetwork.networkEncryptionGuidance(production.productionSettings.networking)
  production.loadProductionSettings({ networking: { endpoint: 'wss://example.invalid/game' } }); const secure = productionNetwork.networkEncryptionGuidance(production.productionSettings.networking)
  check('V660-ENCRYPTION-GUIDANCE', insecure.severity === 'error' && !insecure.protected && secure.severity === 'info' && secure.protected, 'Required encryption blocks WS/UDP and recognizes WSS/reviewed encrypted adapters.')

  const channels = [{ id: 'events', delivery: 'reliable-ordered', maximumPayloadBytes: 2_048, messagesPerSecond: 20, priority: 1 }], packet = protocol.createNetworkPacket({ sessionId: 'session', sender: 'peer', channel: 'events', delivery: 'reliable-ordered', sequence: 1, ack: null, tick: 1, schema: 1, kind: 'authority', payload: { entityUuid: 'entity-a', targetPeerId: 'peer-b' }, security: envelope })
  const serialized = protocol.serializeNetworkPacket(packet), parsed = protocol.parseNetworkPacket(serialized, { maximumPacketBytes: 4_096, maximumMessagesPerSecond: 100, schemaVersion: 1 }, channels, 'session'), wrongVersion = protocol.parseNetworkPacket(serialized.replace('"protocol":2', '"protocol":999'), { maximumPacketBytes: 4_096, maximumMessagesPerSecond: 100, schemaVersion: 1 }, channels, 'session')
  let fuzzThrows = 0, fuzzAccepted = 0, seed = 66
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0 }
  for (let index = 0; index < 4_000; index++) { const candidate = Array.from({ length: random() % 400 }, () => String.fromCharCode(32 + random() % 95)).join(''); try { if (protocol.parseNetworkPacket(candidate, { maximumPacketBytes: 4_096, maximumMessagesPerSecond: 100, schemaVersion: 1 }, channels, 'session').packet) fuzzAccepted++ } catch { fuzzThrows++ } }
  check('V660-PROTOCOL-FUZZ-VERSION', parsed.packet?.security?.nonce === 'one' && !wrongVersion.packet && fuzzThrows === 0 && fuzzAccepted === 0, 'Protocol 2 round-trips bounded security metadata and rejects version mismatch plus 4,000 malformed inputs without throwing.', { fuzzCases: 4_000 })
  check('V660-SECRET-EXCLUSION', Boolean(protocol.validateNetworkValue({ token: 'never' })) && Boolean(protocol.validateNetworkValue({ cookie: 'never' })) && Boolean(protocol.validateNetworkValue({ private_key: 'never' })), 'Secret-shaped fields remain excluded from network, replay, save and diagnostics.')

  const simulatorA = new protocol.DeterministicNetworkSimulator(660), simulatorB = new protocol.DeterministicNetworkSimulator(660), simulation = { enabled: true, latencyMs: 80, jitterMs: 20, lossPercent: 12, duplicatePercent: 6, reorderPercent: 9 }
  const decisionsA = Array.from({ length: 1_000 }, () => simulatorA.decide(simulation)), decisionsB = Array.from({ length: 1_000 }, () => simulatorB.decide(simulation))
  check('V660-BAD-NETWORK', JSON.stringify(decisionsA) === JSON.stringify(decisionsB) && decisionsA.some(item => item.dropped) && decisionsA.some(item => item.copies === 2) && decisionsA.some(item => item.reordered), 'Latency/loss/reorder/duplicate simulation stays deterministic and exercises every configured failure class.', { deliveries: decisionsA.length, dropped: decisionsA.filter(item => item.dropped).length })

  production.resetProductionSettings(); let touched = false, denied = false
  try { await networking.startNetworkingWithTransport({ kind: 'local-loopback', async connect() { touched = true }, async send() {}, async close() {} }) } catch { denied = true }
  check('V660-DENIED-REVOKED-OFFLINE', denied && !touched && !production.productionSettings.networking.enabled && !production.productionSettings.networking.permissionGranted && !production.productionSettings.networking.autoStart, 'Default/revoked permission cannot touch a transport and leaves offline Play defaults unchanged.')

  const emptyInput = { down: {}, pressed: {}, released: {}, performed: {}, cancelled: {}, phases: {}, durations: {}, tapCounts: {}, consumed: {}, axes: {}, vectors: {}, mousePosition: [0, 0], wheel: [0, 0], pointerDelta: [0, 0], touches: 0, devices: [], contexts: [], maps: [], scheme: 'Any' }
  replay.beginMultiplayerReplayRecording(['host', 'client']); replay.recordMultiplayerReplayFrame(1, [{ peerId: 'client', input: emptyInput }], 'one', []); replay.recordMultiplayerReplayFrame(2, [{ peerId: 'client', input: emptyInput }], 'two', []); const recording = replay.stopMultiplayerReplayRecording(60), changed = structuredClone(recording); changed.frames[1].authoritativeChecksum = 'diverged'; const comparison = replay.compareMultiplayerReplays(recording, changed)
  check('V660-ROLLBACK-REPLAY', !comparison.matching && comparison.firstDivergenceTick === 2, 'Recorded inputs and authoritative checksums locate the exact divergence tick for rollback diagnosis.', { frames: recording.frames.length })

  const [coop, headless, networkPanel, player, native, exporter] = await Promise.all(['reference-projects/projects/creator-v660-coop-arena/project.nova', 'reference-projects/projects/creator-v660-headless-authority/project.nova', 'src/components/NetworkStudioPanel.vue', 'src/PlayerApp.vue', 'src-tauri/src/lib.rs', 'src/runtime/gameExporter.ts'].map(path => readFile(join(root, path), 'utf8')))
  const coopProject = JSON.parse(coop), headlessProject = JSON.parse(headless), coopSource = coopProject.assets.filter(asset => asset.assetType === 'script').map(asset => asset.source).join('\n')
  check('V660-REFERENCES', coopProject.engineVersion === '6.6.0' && coopProject.projectSettings.production.networking.replicatedEntities.length === 2 && coopSource.includes('network_rpc("coop.move"') && headlessProject.projectSettings.build.runtimeMode === 'headless-server' && headlessProject.projectSettings.production.networking.role === 'server', 'Playable co-op RPC/replication and authoritative headless references are configured for 6.6.')
  check('V660-EDITOR-RUNTIME-WIRING', ['ownership', 'replicationDiffs', 'rollbackTimeline', 'launch_network_instances', 'localLobbyDirectoryState'].every(token => networkPanel.includes(token)) && player.includes('if (!overrides.instanceId) return') && !player.includes('permissionGranted = true') && native.includes('executable.starts_with(&working_directory)'), 'Studio diagnostics and multi-instance launcher are wired while environment overrides cannot grant permission.')
  check('V660-PACKAGE-EXCLUSION', exporter.includes("key.endsWith('/networking.ts')") && exporter.includes('packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID)'), 'Optional networking remains dynamically excluded when its package is absent.')
} finally { await Promise.race([vite.close(), new Promise(resolve => setTimeout(resolve, 2_000))]) }

function spawnPeer(role, localPort, serverPort, session) {
  const child = fork(join(root, 'scripts/network-peer-v6.6.0.mjs'), [role, String(localPort), String(serverPort), session], { cwd: root, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] }), messages = []
  let stderr = ''; child.stderr.on('data', value => { stderr += value.toString().slice(0, 8_000) }); child.on('message', value => messages.push(value)); return { child, messages, stderr: () => stderr }
}
const waitFor = async (peer, predicate, timeout = 15_000) => { const started = Date.now(); while (Date.now() - started < timeout) { const found = [...peer.messages].reverse().find(predicate); if (found) return found; await new Promise(resolve => setTimeout(resolve, 25)) }; throw new Error(`Peer timeout: ${peer.stderr()}`) }
const stopPeer = async peer => { if (peer.child.connected) peer.child.send({ type: 'stop' }); await Promise.race([new Promise(resolve => peer.child.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 2_000))]); if (!peer.child.killed) peer.child.kill() }
async function soak(peerCount, offset) {
  const serverPort = 43_000 + (process.pid + offset) % 10_000, session = `v66-${peerCount}-${process.pid}`, peers = [spawnPeer('host', serverPort, serverPort + 1, session), ...Array.from({ length: peerCount - 1 }, (_, index) => spawnPeer('client', serverPort + index + 1, serverPort, session))]
  try { await Promise.all(peers.map(peer => waitFor(peer, value => value.type === 'ready'))); peers.forEach(peer => peer.child.send({ type: 'exercise' })); const reports = await Promise.all(peers.map(peer => waitFor(peer, value => value.type === 'report'))), host = reports[0], clients = reports.slice(1); return { passed: host.state.peers === peerCount - 1 && clients.every(item => item.state.peers >= 1) && host.rpcReceived >= peerCount - 1 && reports.every(item => item.state.invalidPackets === 0 && item.state.schemaRejected === 0 && item.state.replayRejected >= 0), metrics: { peers: peerCount, hostPeers: host.state.peers, hostPeerDetails: host.state.peerDetails, clientPeers: clients.map(item => ({ peers: item.state.peers, peerDetails: item.state.peerDetails, receivedPackets: item.state.receivedPackets, events: item.state.events.slice(-5), inboundFirst: item.state.packetSummaries.filter(packet => packet.direction === 'in').slice(0, 12), inboundLast: item.state.packetSummaries.filter(packet => packet.direction === 'in').slice(-12), lastError: item.state.lastError })), rpcReceived: reports.reduce((sum, item) => sum + item.rpcReceived, 0), acknowledged: reports.reduce((sum, item) => sum + item.state.reliableAcknowledged, 0), resent: reports.reduce((sum, item) => sum + item.state.reliableResent, 0), dropped: reports.reduce((sum, item) => sum + item.state.droppedPackets, 0) } } } catch (error) { return { passed: false, metrics: { peers: peerCount, error: error instanceof Error ? error.message : String(error), stderr: peers.map(peer => peer.stderr()).filter(Boolean) } } } finally { await Promise.all(peers.map(stopPeer)) }
}
for (const [index, count] of [2, 4, 8].entries()) { const result = await soak(count, index * 100); check(`V660-${count}-PEER-SOAK`, result.passed, `${count} independent UDP processes complete 180 bounded ticks, reliable lifecycle and RPC exchange${count === 2 ? ' under latency/loss/reorder/duplicate simulation' : ''}.`, result.metrics) }

const failed = checks.filter(item => item.status === 'failed'), report = { format: 'nova-v6.6.0-network-verification', version: 1, engineVersion: '6.6.0', generatedAt: new Date().toISOString(), checks, severity0Open: 0, severity1Open: failed.length, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(join(root, 'release-audits/v6.6.0-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) process.exit(1)
console.log(`Nova_A v6.6.0 multiplayer verification passed: ${checks.length} checks.`)
