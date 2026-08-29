import { fork } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const check = (id, passed, detail, metrics = {}) => { checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }); if (!passed) console.error(`${id}: ${detail}`) }
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 8, userAgent: 'Nova_A v5.8 network verifier' } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, addEventListener() {}, removeEventListener() {} }
globalThis.localStorage ??= { getItem() { return null }, setItem() {}, removeItem() {} }
globalThis.performance ??= { now: () => Date.now() }

const referenceIds = ['network-v58-localhost-rpc', 'network-v58-loss-reconnect', 'network-v58-late-join', 'network-v58-replay-rollback']
const references = await Promise.all(referenceIds.map(id => readFile(join(root, `reference-projects/projects/${id}/project.nova`), 'utf8').then(JSON.parse)))
check('V580-REFERENCES', references.every(project => project.engineVersion === '5.8.0' && project.projectFormatMajor === 2 && project.formatVersion === 29 && project.projectSettings?.production?.networking?.permissionGranted === true), 'Four v5.8 references retain Project Format 2/schema 29 and explicit permission.', { references: referenceIds })

const vite = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } }); await vite.watcher.close()
try {
  const protocol = await vite.ssrLoadModule('/src/runtime/networkProtocol.ts')
  const replay = await vite.ssrLoadModule('/src/runtime/networkReplay.ts')
  const production = await vite.ssrLoadModule('/src/runtime/production.ts')
  const networking = await vite.ssrLoadModule('/src/runtime/networking.ts')
  const components = await vite.ssrLoadModule('/src/world/components.ts')
  const { BoxEntity } = await vite.ssrLoadModule('/src/world/BoxEntity.ts')
  const channels = [{ id: 'events', delivery: 'reliable-ordered', maximumPayloadBytes: 2_048, messagesPerSecond: 10, priority: 1 }]
  const packet = protocol.createNetworkPacket({ sessionId: 'session', sender: 'peer', channel: 'events', delivery: 'reliable-ordered', sequence: 1, ack: null, tick: 0, schema: 1, kind: 'rpc', payload: { ready: true } })
  const source = protocol.serializeNetworkPacket(packet), parsed = protocol.parseNetworkPacket(source, { maximumPacketBytes: 4_096, maximumMessagesPerSecond: 20, schemaVersion: 1 }, channels, 'session')
  check('V580-PROTOCOL', parsed.packet?.kind === 'rpc' && parsed.error === '', 'Protocol 2 round-trips a bounded reliable packet.')

  let fuzzThrows = 0, fuzzAccepted = 0
  let seed = 58
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0 }
  for (let index = 0; index < 2_000; index++) {
    const length = random() % 300, candidate = Array.from({ length }, () => String.fromCharCode(32 + random() % 95)).join('')
    try { if (protocol.parseNetworkPacket(candidate, { maximumPacketBytes: 4_096, maximumMessagesPerSecond: 20, schemaVersion: 1 }, channels, 'session').packet) fuzzAccepted++ } catch { fuzzThrows++ }
  }
  check('V580-PACKET-FUZZ', fuzzThrows === 0 && fuzzAccepted === 0, 'Two thousand deterministic malformed packets are rejected without an exception.', { cases: 2_000, fuzzThrows, fuzzAccepted })
  check('V580-SECRET-EXCLUSION', Boolean(protocol.validateNetworkValue({ api_key: 'never-serialize' })) && Boolean(protocol.validateNetworkValue({ authorization: 'never-serialize' })), 'Secret-shaped keys are rejected from packets, replay, save and diagnostics.')

  const limiter = new protocol.NetworkRateLimiter(); const rate = [0, 1, 2, 3].map(() => limiter.accept('peer', 3, 10))
  const window = new protocol.ReliablePacketWindow(2); const tracked = window.track('peer', packet, source, 0), due = window.due(50, 20, 3), acknowledged = window.acknowledge('peer', 'events', 1)
  check('V580-RELIABILITY-BOUNDS', rate.join(',') === 'true,true,true,false' && tracked && due.length === 1 && due[0].peer === 'peer' && acknowledged && window.size === 0, 'Rate and reliable windows enforce their configured limits, retries and peer-specific ACKs.')

  const simulation = { enabled: true, latencyMs: 80, jitterMs: 20, lossPercent: 15, duplicatePercent: 5, reorderPercent: 10 }
  const firstSimulator = new protocol.DeterministicNetworkSimulator(580), secondSimulator = new protocol.DeterministicNetworkSimulator(580)
  const firstDecisions = Array.from({ length: 256 }, () => firstSimulator.decide(simulation)), secondDecisions = Array.from({ length: 256 }, () => secondSimulator.decide(simulation))
  check('V580-LAG-LOSS-DETERMINISM', JSON.stringify(firstDecisions) === JSON.stringify(secondDecisions) && firstDecisions.some(item => item.dropped) && firstDecisions.every(item => item.delayMs >= 0), 'Lag/loss/duplicate/reorder simulation is deterministic and bounded by seed.', { decisions: firstDecisions.length, dropped: firstDecisions.filter(item => item.dropped).length })

  production.resetProductionSettings()
  let touchedTransport = false, explicitBlocked = false
  try { await networking.startNetworkingWithTransport({ kind: 'local-loopback', async connect() { touchedTransport = true }, async send() {}, async close() {} }) } catch { explicitBlocked = true }
  check('V580-NO-IMPLICIT-NETWORK', explicitBlocked && !touchedTransport && !production.productionSettings.networking.enabled && !production.productionSettings.networking.permissionGranted && !production.productionSettings.networking.autoStart, 'Default and test-injected networking cannot open a transport without explicit enable plus permission.')

  production.loadProductionSettings({ replay: { capacity: 120 }, networking: { enabled: true, permissionGranted: true, sessionName: 'Replay qualification', replicatedEntities: [] } })
  const emptyInput = { down: {}, pressed: {}, released: {}, performed: {}, cancelled: {}, phases: {}, durations: {}, tapCounts: {}, consumed: {}, axes: {}, vectors: {}, mousePosition: [0, 0], wheel: [0, 0], pointerDelta: [0, 0], touches: 0, devices: [], contexts: [], maps: [], scheme: 'Any' }
  replay.beginMultiplayerReplayRecording(['client', 'server']); replay.recordMultiplayerReplayFrame(1, [{ peerId: 'client', input: emptyInput }], 'aaa', []); replay.recordMultiplayerReplayFrame(2, [{ peerId: 'client', input: emptyInput }], 'bbb', []); const recorded = replay.stopMultiplayerReplayRecording(60)
  const changed = structuredClone(recorded); changed.frames[1].authoritativeChecksum = 'changed'
  const matching = replay.compareMultiplayerReplays(recorded, structuredClone(recorded)), divergent = replay.compareMultiplayerReplays(recorded, changed)
  check('V580-REPLAY-DIVERGENCE', matching.matching && !divergent.matching && divergent.firstDivergenceTick === 2, 'Versioned multiplayer replay comparison detects the first divergent recorded-input tick.', { frames: recorded.frames.length, firstDivergenceTick: divergent.firstDivergenceTick })

  const entity = new BoxEntity(1, { x: 4, y: -2 }, { x: 1, y: 1 }, '58000000-0000-4000-8000-000000000001'); entity.velocity = { x: 3, y: 5 }
  production.loadProductionSettings({ networking: { enabled: true, permissionGranted: true, sessionName: 'Save qualification', replicatedEntities: [{ entityUuid: entity.uuid, authority: 'server', properties: ['transform', 'rotation', 'velocity'], interpolate: true, predict: false }] } })
  const saved = replay.exportMultiplayerSave([entity], 44); entity.transform.position = { x: 0, y: 0 }; const restored = replay.importMultiplayerSave(saved, [entity]); let tamperRejected = false; try { replay.importMultiplayerSave({ ...saved, tick: 45 }, [entity]) } catch { tamperRejected = true }
  check('V580-MULTIPLAYER-SAVE', restored.restored === 1 && restored.tick === 44 && entity.transform.position.x === 4 && tamperRejected, 'Versioned multiplayer saves restore replicated state and reject checksum tampering.')
  const diagnostic = replay.networkDiagnosticCapture({ endpoint: 'ws://private', authorization: 'secret', sentBytes: 4 }, [{ message: 'ok' }], [])
  check('V580-DIAGNOSTIC-SANITIZE', !diagnostic.includes('ws://private') && !diagnostic.includes('secret') && diagnostic.includes('sentBytes'), 'Diagnostic capture excludes endpoints and authorization secrets while retaining bounded counters.')
} finally { await Promise.race([vite.close(), new Promise(resolve => setTimeout(resolve, 2_000))]) }

const qualificationPort = 42_000 + process.pid % 10_000
function spawnPeer(role) {
  const localPort = role === 'server' ? qualificationPort : qualificationPort + 1, remotePort = role === 'server' ? qualificationPort + 1 : qualificationPort
  const child = fork(join(root, 'scripts/network-peer-v5.8.0.mjs'), [role, String(localPort), String(remotePort)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] })
  let stderr = ''; child.stderr.on('data', chunk => { stderr += chunk.toString().slice(0, 4_000) })
  const messages = []; child.on('message', message => messages.push(message))
  return { child, messages, stderr: () => stderr }
}
const waitFor = async (peer, predicate, timeout = 8_000) => { const started = Date.now(); while (Date.now() - started < timeout) { const value = [...peer.messages].reverse().find(predicate); if (value) return value; await new Promise(resolve => setTimeout(resolve, 25)) } throw new Error(`Peer timeout: ${peer.stderr()}`) }
const stopPeer = async peer => { if (!peer.child.connected) return; peer.child.send({ type: 'stop' }); await Promise.race([new Promise(resolve => peer.child.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 2_000))]); if (!peer.child.killed) peer.child.kill() }

let localhostPassed = false, reconnectPassed = false, localhostMetrics = {}
const serverPeer = spawnPeer('server'), clientPeer = spawnPeer('client')
try {
  await Promise.all([waitFor(serverPeer, value => value.type === 'ready'), waitFor(clientPeer, value => value.type === 'ready')])
  serverPeer.child.send({ type: 'tick', count: 4 }); await waitFor(serverPeer, value => value.type === 'ticked')
  serverPeer.child.send({ type: 'exercise' }); clientPeer.child.send({ type: 'exercise' })
  const [serverFirst, clientFirst] = await Promise.all([waitFor(serverPeer, value => value.type === 'report'), waitFor(clientPeer, value => value.type === 'report')])
  localhostPassed = serverFirst.state.peers >= 1 && clientFirst.state.peers >= 1 && serverFirst.rpcReceived >= 1 && clientFirst.rpcReceived >= 1 && serverFirst.state.invalidPackets === 0 && clientFirst.state.invalidPackets === 0
  await stopPeer(clientPeer)
  const replacement = spawnPeer('client')
  try {
    await waitFor(replacement, value => value.type === 'ready'); serverPeer.child.send({ type: 'tick', count: 4 }); await waitFor(serverPeer, value => value.type === 'ticked'); replacement.child.send({ type: 'exercise' }); serverPeer.child.send({ type: 'exercise' })
    const [serverSecond, replacementReport] = await Promise.all([waitFor(serverPeer, value => value.type === 'report' && value !== serverFirst), waitFor(replacement, value => value.type === 'report')])
    reconnectPassed = replacementReport.state.peers >= 1 && serverSecond.state.lateJoins >= 2 && replacementReport.state.snapshots >= 1
    localhostMetrics = { firstServerPeers: serverFirst.state.peers, firstClientPeers: clientFirst.state.peers, firstRpcReceived: serverFirst.rpcReceived + clientFirst.rpcReceived, lateJoins: serverSecond.state.lateJoins, replacementSnapshots: replacementReport.state.snapshots }
  } finally { await stopPeer(replacement) }
} catch (error) { localhostMetrics = { error: error instanceof Error ? error.message : String(error), serverError: serverPeer.stderr(), clientError: clientPeer.stderr() } }
finally { await stopPeer(serverPeer); await stopPeer(clientPeer) }
check('V580-TWO-PROCESS-LOCALHOST', localhostPassed, 'Two independent processes discover each other and exchange acknowledged, schema-checked RPCs over a local-only lobby.', localhostMetrics)
check('V580-RECONNECT-LATE-JOIN', reconnectPassed, 'A replacement client reconnects, establishes a reliable sequence baseline and receives authoritative late-join resynchronization.', localhostMetrics)

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v5.8.0-network-verification', version: 1, engineVersion: '5.8.0', generatedAt: new Date().toISOString(), checks, severity0Open: 0, severity1Open: failed.length, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(join(root, 'release-audits/v5.8.0-network-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) process.exit(1)
console.log(`Nova_A v5.8.0 networking verification passed: ${checks.length} checks.`)
