import { createSocket } from 'node:dgram'
import { createServer } from 'vite'

const role = process.argv[2] === 'host' ? 'host' : 'client', localPort = Number(process.argv[3]), serverPort = Number(process.argv[4]), sessionName = process.argv[5] || 'v66-peer-soak'
const impairedLink = sessionName.includes('-2-')
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 4, userAgent: `Nova_A v6.6 ${role} peer` } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, addEventListener() {}, removeEventListener() {} }
globalThis.localStorage ??= { getItem() { return null }, setItem() {}, removeItem() {} }
globalThis.performance ??= { now: () => Date.now() }

const vite = await createServer({ root: process.cwd(), appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } }); await vite.watcher.close()
const production = await vite.ssrLoadModule('/src/runtime/production.ts'), network = await vite.ssrLoadModule('/src/runtime/networking.ts')
production.resetProductionSettings(); production.loadProductionSettings({ networking: {
  enabled: true, permissionGranted: true, autoStart: false, role, sessionMode: 'direct', sessionName, playerName: role === 'host' ? 'Host' : `Client ${localPort}`, maxPeers: 8,
  transport: 'native-udp', endpoint: `udp://127.0.0.1:${serverPort}`, bindAddress: `127.0.0.1:${localPort}`, snapshotRate: 30, interpolationMs: 80, rollbackFrames: 120, bandwidthKbps: 1_024,
  reconnect: true, reconnectMaxAttempts: 4, schemaVersion: 1, maximumPacketBytes: 32_768, maximumMessagesPerSecond: 2_000, maximumPendingReliable: 512,
  reliableRetryMs: 40, reliableMaximumAttempts: 16, reconciliationThreshold: .01, lateJoin: true,
  authentication: { mode: 'none', providerId: '', requireVerifiedPeers: false, handshakeTimeoutMs: 10_000 }, security: { requireEncryption: false, maximumPacketAgeMs: 15_000, replayWindow: 2_048 },
  channels: [{ id: 'state', delivery: 'unreliable-sequenced', maximumPayloadBytes: 16_000, messagesPerSecond: 240, priority: 8 }, { id: 'input', delivery: 'unreliable-sequenced', maximumPayloadBytes: 8_192, messagesPerSecond: 480, priority: 12 }, { id: 'events', delivery: 'reliable-ordered', maximumPayloadBytes: 8_192, messagesPerSecond: 240, priority: 16 }],
  rpcContracts: [{ name: 'soak.ready', channelId: 'events', direction: 'bidirectional', authority: 'any', payloadSchema: 'integer', maximumPayloadBytes: 32, callsPerSecond: 64 }],
  simulation: { enabled: true, latencyMs: impairedLink ? 8 : 2, jitterMs: impairedLink ? 3 : 1, lossPercent: impairedLink ? 1 : 0, duplicatePercent: impairedLink ? 1 : 0, reorderPercent: impairedLink ? 1 : 0, seed: localPort }, replicatedEntities: []
} })

let rpcReceived = 0
network.registerRpc('soak.ready', value => { if (Number.isSafeInteger(value)) rpcReceived++ })
const udp = createSocket('udp4'), peerEndpoints = new Map()
const testTransport = {
  kind: 'native-udp',
  async connect(onMessage, onState) {
    udp.on('message', (message, remote) => { const source = message.toString('utf8'), endpoint = `${remote.address}:${remote.port}`; try { const packet = JSON.parse(source); if (typeof packet?.sender === 'string') peerEndpoints.set(packet.sender, endpoint) } catch {}; onMessage(source, endpoint) })
    udp.on('error', error => onState(error.message))
    await new Promise((resolve, reject) => { udp.once('error', reject); udp.bind(localPort, '127.0.0.1', () => { udp.off('error', reject); resolve() }) }); onState('connected')
  },
  async send(source, target = '') { const resolved = peerEndpoints.get(target) ?? target, match = /^127\.0\.0\.1:(\d+)$/.exec(resolved), port = match ? Number(match[1]) : serverPort; await new Promise((resolve, reject) => udp.send(Buffer.from(source), port, '127.0.0.1', error => error ? reject(error) : resolve())) },
  async close() { if (udp) await new Promise(resolve => udp.close(resolve)) }
}
await network.startNetworkingWithTransport(testTransport)
process.send?.({ type: 'ready', role, peerId: network.networkingState.localPeerId })

const input = { down: {}, pressed: {}, released: {}, performed: {}, cancelled: {}, phases: {}, durations: {}, tapCounts: {}, consumed: {}, axes: {}, vectors: {}, mousePosition: [0, 0], wheel: [0, 0], pointerDelta: [0, 0], touches: 0, devices: [], contexts: ['Gameplay'], maps: ['Default'], scheme: 'KeyboardMouse' }
async function report() { process.send?.({ type: 'report', role, rpcReceived, state: JSON.parse(JSON.stringify(network.networkingState)), runtime: network.networkRuntimeSnapshot() }) }
process.on('message', async message => {
  if (!message || typeof message !== 'object') return
  if (message.type === 'exercise') {
    await network.sendNetworkPacket('hello', { role, playerName: role, lateJoin: true }, 'events')
    for (let tick = 0; tick < 180; tick++) { if (tick % 12 === 0) network.callRpc('soak.ready', localPort); network.updateNetworking([], 1 / 60, input, `soak-${tick}`); await new Promise(resolve => setTimeout(resolve, 1)) }
    await new Promise(resolve => setTimeout(resolve, 700)); await report()
  }
  if (message.type === 'report') await report()
  if (message.type === 'stop') { await network.stopNetworking(); await Promise.race([vite.close(), new Promise(resolve => setTimeout(resolve, 1_000))]); process.exit(0) }
})
