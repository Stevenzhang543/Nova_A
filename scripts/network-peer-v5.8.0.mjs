import { createServer } from 'vite'
import { createSocket } from 'node:dgram'

const role = process.argv[2] === 'client' ? 'client' : 'server'
const localPort = Number(process.argv[3]), remotePort = Number(process.argv[4])
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 4, userAgent: `Nova_A v5.8 ${role} peer` } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, addEventListener() {}, removeEventListener() {} }
globalThis.localStorage ??= { getItem() { return null }, setItem() {}, removeItem() {} }
globalThis.performance ??= { now: () => Date.now() }

const vite = await createServer({ root: process.cwd(), appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
await vite.watcher.close()
const production = await vite.ssrLoadModule('/src/runtime/production.ts')
const network = await vite.ssrLoadModule('/src/runtime/networking.ts')
const replay = await vite.ssrLoadModule('/src/runtime/networkReplay.ts')

production.loadProductionSettings({ networking: {
  enabled: true, permissionGranted: true, autoStart: false, role, sessionMode: 'direct', sessionName: 'v58-two-process-qualification', playerName: role, maxPeers: 4,
  transport: 'native-udp', endpoint: `udp://127.0.0.1:${remotePort}`, bindAddress: `127.0.0.1:${localPort}`, snapshotRate: 30, interpolationMs: 80, rollbackFrames: 120, bandwidthKbps: 512,
  reconnect: true, reconnectMaxAttempts: 4, schemaVersion: 1, maximumPacketBytes: 32_768, maximumMessagesPerSecond: 1_000, maximumPendingReliable: 128,
  reliableRetryMs: 30, reliableMaximumAttempts: 12, reconciliationThreshold: .01, lateJoin: true,
  channels: [{ id: 'state', delivery: 'unreliable-sequenced', maximumPayloadBytes: 16_000, messagesPerSecond: 120, priority: 8 }, { id: 'input', delivery: 'unreliable-sequenced', maximumPayloadBytes: 8_192, messagesPerSecond: 240, priority: 12 }, { id: 'events', delivery: 'reliable-ordered', maximumPayloadBytes: 8_192, messagesPerSecond: 120, priority: 16 }],
  rpcContracts: [{ name: 'player.ready', channelId: 'events', direction: 'bidirectional', authority: 'any', payloadSchema: 'boolean', maximumPayloadBytes: 32, callsPerSecond: 8 }],
  simulation: { enabled: false, latencyMs: 0, jitterMs: 0, lossPercent: 0, duplicatePercent: 0, reorderPercent: 0, seed: 58 }, replicatedEntities: []
} })

let rpcReceived = 0
network.registerRpc('player.ready', value => { if (value === true) rpcReceived++ })
const udp = createSocket('udp4'), peerAddresses = new Map()
const testTransport = {
  kind: 'native-udp',
  async connect(onMessage, onState) {
    udp.on('message', (message, remote) => { const source = message.toString('utf8'), endpoint = `${remote.address}:${remote.port}`; try { const packet = JSON.parse(source); if (typeof packet?.sender === 'string') peerAddresses.set(packet.sender, endpoint) } catch {}; onMessage(source, endpoint) })
    udp.on('error', error => onState(error.message))
    await new Promise((resolve, reject) => { udp.once('error', reject); udp.bind(localPort, '127.0.0.1', () => { udp.off('error', reject); resolve() }) })
    onState('connected')
  },
  async send(source, target = '') { const endpoint = peerAddresses.get(target) ?? target; const match = /^(?:127\.0\.0\.1:)?(\d+)$/.exec(endpoint) ?? /^127\.0\.0\.1:(\d+)$/.exec(endpoint); const port = match ? Number(match[1]) : remotePort; await new Promise((resolve, reject) => udp.send(Buffer.from(source), port, '127.0.0.1', error => error ? reject(error) : resolve())) },
  async close() { await new Promise(resolve => udp.close(resolve)) }
}
await network.startNetworkingWithTransport(testTransport)
process.send?.({ type: 'ready', role, peer: network.networkingState.localPeerId })

const input = { down: {}, pressed: {}, released: {}, performed: {}, cancelled: {}, phases: {}, durations: {}, tapCounts: {}, consumed: {}, axes: {}, vectors: {}, mousePosition: [0, 0], wheel: [0, 0], pointerDelta: [0, 0], touches: 0, devices: [], contexts: ['Gameplay'], maps: ['Default'], scheme: 'Any' }
async function report() {
  const state = JSON.parse(JSON.stringify(network.networkingState))
  process.send?.({ type: 'report', role, rpcReceived, state, runtime: network.networkRuntimeSnapshot(), replayFrames: replay.multiplayerReplayState.frames.length })
}

process.on('message', async message => {
  if (!message || typeof message !== 'object') return
  if (message.type === 'tick') { for (let index = 0; index < Math.max(1, Number(message.count) || 1); index++) network.updateNetworking([], 1 / 60, input, `tick-${index}`); process.send?.({ type: 'ticked', role }) }
  if (message.type === 'exercise') { await network.sendNetworkPacket('hello', { role, playerName: role, lateJoin: true }, 'events'); network.callRpc('player.ready', true); for (let index = 0; index < 8; index++) network.updateNetworking([], 1 / 60, input, `exercise-${index}`); setTimeout(report, 180) }
  if (message.type === 'report') await report()
  if (message.type === 'stop') { await network.stopNetworking(); await Promise.race([vite.close(), new Promise(resolve => setTimeout(resolve, 1_000))]); process.send?.({ type: 'stopped', role }); process.exit(0) }
})
