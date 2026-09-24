/** 网络多进程测试辅助端：使用本机 UDP 适配器和父进程消息驱动实际网络运行时。 */
import { createSocket } from 'node:dgram'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'

const startup = /* 调用 process.send?.({ type: 'startup', name, at: Date.now() }) 并返回调用结果。 */ name => process.send?.({ type: 'startup', name, at: Date.now() })
startup('module-loaded')
const role = process.argv[2] === 'host' ? 'host' : 'client', localPort = Number(process.argv[3]), serverPort = Number(process.argv[4]), sessionName = process.argv[5] || 'v66-peer-soak'
const impairedLink = sessionName.includes('-2-')
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 4, userAgent: `Nova_A v6.6 ${role} peer` } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, /** 无窗口事件的环境替身，本辅助进程不注册浏览器事件。 */ addEventListener() {}, /** 对应无窗口环境的空移除操作。 */ removeEventListener() {} }
globalThis.localStorage ??= { /* 返回固定值 null。 */ getItem() { return null }, /** 无持久化的存储替身，不写入用户设置。 */ setItem() {}, /** 无持久化的存储替身，不删除用户设置。 */ removeItem() {} }
globalThis.performance ??= { now: /* 调用 Date.now() 并返回调用结果。 */ () => Date.now() }

startup('vite-create')
const vite = await createServer({ cacheDir: join(process.cwd(), '.cache', 'network-peer-v66'), root: process.cwd(), appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } }); await vite.watcher.close()
startup('production-load')
const production = await vite.ssrLoadModule('/src/runtime/production.ts')
startup('network-load')
const network = await vite.ssrLoadModule('/src/runtime/networking.ts')
startup('network-loaded')
// Optional decoded-package settings keep headless clients on the authority's actual replication schema.
// Pace the connectivity workload at60Hz with bandwidth for8peers. Budget refusal is tested separately; oversubscribed retry expiry must not masquerade as connectivity.
// Older soak invocations omit this argument and retain their existing empty-world defaults.
const packagedSettings = process.argv[6] ? JSON.parse(await readFile(process.argv[6], 'utf8')) : null
if (packagedSettings && (packagedSettings.format !== 'nova-headless-peer-settings' || packagedSettings.version !== 1 || !Array.isArray(packagedSettings.replicatedEntities))) throw new Error('Invalid packaged headless peer settings.')
production.resetProductionSettings(); production.loadProductionSettings({ networking: {
  enabled: true, permissionGranted: true, autoStart: false, role, sessionMode: 'direct', sessionName, playerName: role === 'host' ? 'Host' : `Client ${localPort}`, maxPeers: 8,
  transport: 'native-udp', endpoint: `udp://127.0.0.1:${serverPort}`, bindAddress: `127.0.0.1:${localPort}`, snapshotRate: 30, interpolationMs: 80, rollbackFrames: 120, bandwidthKbps: 8_192,
  reconnect: true, reconnectMaxAttempts: 4, schemaVersion: 1, maximumPacketBytes: 32_768, maximumMessagesPerSecond: 2_000, maximumPendingReliable: 512,
  reliableRetryMs: 40, reliableMaximumAttempts: 16, reconciliationThreshold: .01, lateJoin: true,
  authentication: { mode: 'none', providerId: '', requireVerifiedPeers: false, handshakeTimeoutMs: 10_000 }, security: { requireEncryption: false, maximumPacketAgeMs: 15_000, replayWindow: 2_048 },
  channels: [{ id: 'state', delivery: 'unreliable-sequenced', maximumPayloadBytes: 16_000, messagesPerSecond: 240, priority: 8 }, { id: 'input', delivery: 'unreliable-sequenced', maximumPayloadBytes: 8_192, messagesPerSecond: 480, priority: 12 }, { id: 'events', delivery: 'reliable-ordered', maximumPayloadBytes: 8_192, messagesPerSecond: 240, priority: 16 }],
  rpcContracts: [{ name: 'soak.ready', channelId: 'events', direction: 'bidirectional', authority: 'any', payloadSchema: 'integer', maximumPayloadBytes: 32, callsPerSecond: 64 }],
  simulation: { enabled: true, latencyMs: impairedLink ? 8 : 2, jitterMs: impairedLink ? 3 : 1, lossPercent: impairedLink ? 1 : 0, duplicatePercent: impairedLink ? 1 : 0, reorderPercent: impairedLink ? 1 : 0, seed: localPort }, replicatedEntities: [],
  ...(packagedSettings ? { schemaVersion: packagedSettings.schemaVersion, protocolVersion: packagedSettings.protocolVersion, replicatedEntities: packagedSettings.replicatedEntities, channels: packagedSettings.channels, rpcContracts: packagedSettings.rpcContracts } : {})
} })
const replicaEntities = []
if (packagedSettings) {
  startup('entity-load')
  const { BoxEntity } = await vite.ssrLoadModule('/src/world/BoxEntity.ts')
  for (const [index, definition] of production.productionSettings.networking.replicatedEntities.entries()) replicaEntities.push(new BoxEntity(index + 1, { x: 999_999, y: 999_999 }, { x: 1, y: 1 }, definition.entityUuid))
}

let rpcReceived = 0, exercisedTicks = 0
network.registerRpc('soak.ready', /** 收到安全整数 RPC 参数时累计接收次数。 */ value => { if (Number.isSafeInteger(value)) rpcReceived++ })
const udp = createSocket('udp4'), peerEndpoints = new Map()
const testTransport = {
  kind: 'native-udp',
  /** 监听数据与错误，在回环地址绑定端口后通知连接就绪。 */ async connect(onMessage, onState) {
    udp.on('message', /** 读取收到的数据及源地址，尝试更新发送方路由，然后交给运行时处理。 */ (message, remote) => { const source = message.toString('utf8'), endpoint = `${remote.address}:${remote.port}`; try { const packet = JSON.parse(source); if (typeof packet?.sender === 'string') peerEndpoints.set(packet.sender, endpoint) } catch {}; onMessage(source, endpoint) })
    udp.on('error', /* 调用 onState(error.message) 并返回调用结果。 */ error => onState(error.message))
    await new Promise(/** 等待回环端口绑定成功，绑定错误则拒绝等待。 */ (resolve, reject) => { udp.once('error', reject); udp.bind(localPort, '127.0.0.1', /** 绑定成功后移除临时错误监听并完成等待。 */ () => { udp.off('error', reject); resolve() }) }); onState('connected')
  },
  /** 将对端标识解析为回环端口，发送数据并等待发送结果。 */ async send(source, target = '') { const resolved = peerEndpoints.get(target) ?? target, match = /^127\.0\.0\.1:(\d+)$/.exec(resolved), port = match ? Number(match[1]) : serverPort; await new Promise(/* 调用 udp.send(Buffer.from(source), port, '127.0.0.1', error => error ? reject(error) : resolve()) 并返回调用结果。 */ (resolve, reject) => udp.send(Buffer.from(source), port, '127.0.0.1', /* 根据 error 的真假，分别返回 reject(error) 或 resolve()。 */ error => error ? reject(error) : resolve())) },
  /** 等待 UDP 套接字关闭，释放本地端口。 */ async close() { if (udp) await new Promise(/* 调用 udp.close(resolve) 并返回调用结果。 */ resolve => udp.close(resolve)) }
}
startup('transport-connect')
await network.startNetworkingWithTransport(testTransport)
startup('transport-ready')
process.send?.({ type: 'ready', role, peerId: network.networkingState.localPeerId })

const input = { down: {}, pressed: {}, released: {}, performed: {}, cancelled: {}, phases: {}, durations: {}, tapCounts: {}, consumed: {}, axes: {}, vectors: {}, mousePosition: [0, 0], wheel: [0, 0], pointerDelta: [0, 0], touches: 0, devices: [], contexts: ['Gameplay'], maps: ['Default'], scheme: 'KeyboardMouse' }
/** 向父进程发送网络状态及运行时快照，供测试比较。 */ async function report() { process.send?.({ type: 'report', role, rpcReceived, exercisedTicks, replicaState: replicaEntities.map(/** 提取副本实体标识与二维位置，加入网络快照。 */ entity => ({ uuid: entity.uuid, position: [entity.transform.position.x, entity.transform.position.y] })), state: JSON.parse(JSON.stringify(network.networkingState)), runtime: network.networkRuntimeSnapshot() }) }
if (packagedSettings) network.updateNetworking(replicaEntities, 0)
process.on('message', /** 按父进程消息运行网络帧与 RPC 样本、发送状态或关闭；运行帧按定时间隔推进。 */ async message => {
  if (!message || typeof message !== 'object') return
  if (message.type === 'exercise') {
    await network.sendNetworkPacket('hello', { role, playerName: role, lateJoin: true }, 'events')
    for (let tick = 0; tick < 180; tick++) { if (tick % 12 === 0 && !packagedSettings) network.callRpc('soak.ready', localPort); network.updateNetworking(replicaEntities, 1 / 60, input, `soak-${tick}`); exercisedTicks++; await new Promise(/* 调用 setTimeout(resolve, 16) 并返回调用结果。 */ resolve => setTimeout(resolve, 16)) }
    await new Promise(/* 调用 setTimeout(resolve, 700) 并返回调用结果。 */ resolve => setTimeout(resolve, 700)); await report()
  }
  if (message.type === 'report') await report()
  if (message.type === 'stop') { await network.stopNetworking(); await Promise.race([vite.close(), new Promise(/* 调用 setTimeout(resolve, 1_000) 并返回调用结果。 */ resolve => setTimeout(resolve, 1_000))]); process.exit(0) }
})
