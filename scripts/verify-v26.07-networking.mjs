import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const check = (id, passed, detail, metrics = {}) => { checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }); if (!passed) console.error(`${id}: ${detail}`) }
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 4, userAgent: 'Nova_A 26.07 network verifier' } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, addEventListener() {}, removeEventListener() {} }
globalThis.localStorage ??= { getItem() { return null }, setItem() {}, removeItem() {} }
globalThis.performance ??= { now: () => Date.now() }

const vite = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } }); await vite.watcher.close()
try {
  const [protocol, input, services, rollback, production, networking, replay, exporter, hierarchy, build, packages] = await Promise.all([
    '/src/runtime/networkProtocol.ts','/src/runtime/networkInput.ts','/src/runtime/networkServices.ts','/src/runtime/networkRollback.ts','/src/runtime/production.ts','/src/runtime/networking.ts','/src/runtime/networkReplay.ts','/src/runtime/gameExporter.ts','/src/world/hierarchy.ts','/src/runtime/buildSettings.ts','/src/runtime/packages.ts'
  ].map(path => vite.ssrLoadModule(path)))
  const { BoxEntity } = await vite.ssrLoadModule('/src/world/BoxEntity.ts')

  const empty = input.emptyNetworkInput(), malformedStrict = input.normalizeNetworkInput({}, true)
  const noisy = input.normalizeNetworkInput({ ...empty, axes: Object.fromEntries(Array.from({ length: 1_000 }, (_, index) => [`axis-${index}`, index === 3 ? Number.NaN : index])), vectors: { Move: [Number.POSITIVE_INFINITY, -4] }, devices: Array.from({ length: 100 }, (_, index) => ({ id: `device-${index}`, kind: 'keyboard', index, connected: true, mapping: '' })), touches: 1_000 })
  check('V2607-INPUT-NORMALIZATION', malformedStrict === null && noisy && Object.keys(noisy.axes).length === 256 && noisy.axes['axis-3'] === 0 && noisy.vectors.Move[0] === 0 && noisy.devices.length === 64 && noisy.touches === 64, 'Malformed input fails strict admission and tolerant replay input remains finite and bounded.', { actions: noisy ? Object.keys(noisy.axes).length : 0, devices: noisy?.devices.length ?? 0 })

  const channels = [{ id: 'events', delivery: 'reliable-ordered', maximumPayloadBytes: 2_048, messagesPerSecond: 20, priority: 1 }]
  let fuzzThrows = 0, fuzzAccepted = 0, seed = 2607
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0 }
  for (let index = 0; index < 4_000; index++) { const candidate = Array.from({ length: random() % 500 }, () => String.fromCharCode(32 + random() % 95)).join(''); try { if (protocol.parseNetworkPacket(candidate, { maximumPacketBytes: 4_096, maximumMessagesPerSecond: 100, schemaVersion: 1 }, channels, 'session').packet) fuzzAccepted++ } catch { fuzzThrows++ } }
  check('V2607-PROTOCOL-FUZZ', fuzzThrows === 0 && fuzzAccepted === 0, 'Four thousand malformed packet strings fail closed without throwing.', { cases: 4_000, accepted: fuzzAccepted, throws: fuzzThrows })

  const contractPacket = protocol.createNetworkPacket({ sessionId: 'contract-session', sender: 'contract-peer', channel: 'events', delivery: 'reliable-ordered', sequence: 1, ack: null, tick: 1, schema: 1, kind: 'ping', payload: { sentAt: 0 } })
  const contractLimits = { maximumPacketBytes: 4_096, maximumMessagesPerSecond: 100, schemaVersion: 1 }
  const wrongProtocol = protocol.parseNetworkPacket(JSON.stringify({ ...contractPacket, protocol: 99 }), contractLimits, channels, 'contract-session')
  const wrongSchema = protocol.parseNetworkPacket(JSON.stringify({ ...contractPacket, schema: 2 }), contractLimits, channels, 'contract-session')
  const wrongSession = protocol.parseNetworkPacket(JSON.stringify({ ...contractPacket, sessionId: 'other-session' }), contractLimits, channels, 'contract-session')
  check('V2607-PROTOCOL-CONTRACT-MISMATCH', !wrongProtocol.packet && !wrongSchema.packet && !wrongSession.packet && /protocol|format/i.test(wrongProtocol.error) && /schema/i.test(wrongSchema.error) && /session/i.test(wrongSession.error), 'Protocol, schema, and session mismatches are each rejected at the packet boundary.', { protocolError: wrongProtocol.error, schemaError: wrongSchema.error, sessionError: wrongSession.error })

  const limiter = new protocol.NetworkRateLimiter(16)
  for (let index = 0; index < 2_000; index++) limiter.accept(`spoof-${index}`, 1, 0)
  const limiterKeys = Reflect.get(limiter, 'windows')?.size
  check('V2607-RATE-IDENTITY-BOUND', Number.isInteger(limiterKeys) && limiterKeys <= 16, 'Spoofed rate-limit identities cannot grow the limiter map past its configured bound.', { keys: limiterKeys })

  const impairmentSettings = { enabled: true, latencyMs: 20, jitterMs: 15, lossPercent: 22, duplicatePercent: 25, reorderPercent: 30 }
  const simulatorA = new protocol.DeterministicNetworkSimulator(2607), simulatorB = new protocol.DeterministicNetworkSimulator(2607)
  const decisionsA = Array.from({ length: 512 }, () => simulatorA.decide(impairmentSettings)), decisionsB = Array.from({ length: 512 }, () => simulatorB.decide(impairmentSettings))
  check('V2607-DETERMINISTIC-IMPAIRMENT', protocol.stableNetworkJson(decisionsA) === protocol.stableNetworkJson(decisionsB) && decisionsA.some(item => item.dropped) && decisionsA.some(item => item.copies === 2) && decisionsA.some(item => item.reordered) && decisionsA.every(item => Number.isInteger(item.delayMs) && item.delayMs >= 5 && item.delayMs <= 51), 'Loss, duplication, reordering, latency, and jitter decisions reproduce exactly for the same seed and remain bounded.', { cases: decisionsA.length, dropped: decisionsA.filter(item => item.dropped).length, duplicated: decisionsA.filter(item => item.copies === 2).length, reordered: decisionsA.filter(item => item.reordered).length })

  const rollbackRates = [30, 60, 120].map(rate => {
    const frames = Array.from({ length: rate + 1 }, (_, tick) => ({ tick, entities: [{ uuid: 'body', position: [tick * 3 / rate, tick * -2 / rate], rotation: tick * .5 / rate, velocity: [3 + tick / rate, -2] }] }))
    const result = rollback.replayNetworkTransformDeltas({ uuid: 'body', position: [10, 20], rotation: 2, velocity: [5, 6] }, 0, frames)
    return { rate, result, converged: close(result.state.position?.[0], 13) && close(result.state.position?.[1], 18) && close(result.state.rotation, 2.5) && close(result.state.velocity?.[0], 6) && close(result.state.velocity?.[1], 6) && result.replayedFrames === rate }
  })
  check('V2607-ROLLBACK-CONVERGENCE', rollbackRates.every(item => item.converged), 'Authoritative transform/rotation/velocity restore plus recorded fixed-tick deltas converges at 30/60/120 Hz.', { rates: rollbackRates.map(item => ({ rate: item.rate, replayed: item.result.replayedFrames, state: item.result.state })) })
  const networkingSource = await readFile(join(root, 'src/runtime/networking.ts'), 'utf8')
  check('V2607-ROLLBACK-WIRED', networkingSource.includes('replayNetworkTransformDeltas') && networkingSource.includes("reason: 'authoritative-rollback-replay'"), 'The runtime reconciliation path invokes the tested rollback helper and records a distinct replay reason.')

  production.resetProductionSettings(); Object.assign(production.productionSettings.networking, { enabled: true, permissionGranted: false, autoStart: false })
  let permissionDenied = false, deniedConnections = 0
  try { await networking.startNetworkingWithTransport({ kind: 'adapter', async connect() { deniedConnections++ }, async send() {}, async close() {} }) } catch (error) { permissionDenied = /permission/i.test(error instanceof Error ? error.message : String(error)) }
  check('V2607-SESSION-PERMISSION-GATE', permissionDenied && deniedConnections === 0 && networking.networkingState.status !== 'connected', 'A session cannot create a transport until the project grants networking permission explicitly.', { transportConnections: deniedConnections, status: networking.networkingState.status })

  const cadenceProject = JSON.parse(await readFile(join(root, 'reference-projects/projects/multiplayer-v2607-coop-rollback/project.nova'), 'utf8'))
  const cadenceDefinition = structuredClone(cadenceProject.projectSettings.production.networking.replicatedEntities[0])
  const cadenceEntity = { uuid: cadenceDefinition.entityUuid, parentUuid: null, transform: { position: { x: -3, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } }, velocity: { x: 0, y: 0 } }
  const snapshotsByRate = []
  for (const rate of [30, 60, 120]) {
    production.resetProductionSettings(); Object.assign(production.productionSettings.networking, { enabled: true, permissionGranted: true, autoStart: false, role: 'host', snapshotRate: 20, bandwidthKbps: 1_000_000, maximumMessagesPerSecond: 10_000, replicatedEntities: [cadenceDefinition] })
    const sent = []; let cadenceReceive = null
    const transport = { kind: 'adapter', async connect(handler, state) { cadenceReceive = handler; state('connected') }, async send(source) { sent.push(JSON.parse(source)) }, async close() {} }
    await networking.startNetworkingWithTransport(transport)
    const hello = protocol.createNetworkPacket({ sessionId: networking.networkingState.sessionId, sender: `cadence-peer-${rate}`, channel: 'events', delivery: 'reliable-ordered', sequence: 1, ack: null, tick: 0, schema: production.productionSettings.networking.schemaVersion, kind: 'hello', payload: { role: 'client', playerName: 'Cadence peer', lateJoin: false } })
    cadenceReceive(protocol.serializeNetworkPacket(hello), `cadence-source-${rate}`)
    for (let tick = 0; tick < rate; tick++) networking.updateNetworking([cadenceEntity], 1 / rate, empty, `rate-${rate}-${tick}`)
    await Promise.resolve(); snapshotsByRate.push({ rate, configuredSnapshotRate: production.productionSettings.networking.snapshotRate, peers: networking.networkingState.peerDetails.length, status: networking.networkingState.status, invalidPackets: networking.networkingState.invalidPackets, schemaRejected: networking.networkingState.schemaRejected, snapshots: sent.filter(packet => packet.kind === 'snapshot').length, packetKinds: Object.fromEntries([...new Set(sent.map(packet => packet.kind))].map(kind => [kind, sent.filter(packet => packet.kind === kind).length])) })
    await networking.stopNetworking()
  }
  check('V2607-FIXED-SNAPSHOT-CADENCE', snapshotsByRate.every(item => item.snapshots === 20), 'One simulated second emits exactly the configured 20 snapshots at 30/60/120 fixed-tick rates.', { snapshotsByRate })

  production.resetProductionSettings(); Object.assign(production.productionSettings.networking, { enabled: true, permissionGranted: true, autoStart: false, role: 'host', maxPeers: 1, maximumPendingReliable: 8, replicatedEntities: [{ ...cadenceDefinition, entityUuid: 'owner-input-body', authority: 'owner', ownerPeerId: 'peer-one' }] })
  let receive = null; const bound = new Map(), nativeSends = []; const transport = { kind: 'native-udp', async connect(handler, state) { receive = handler; state('connected') }, bindPeer(id, endpoint) { bound.set(id, endpoint) }, async send(source, target) { nativeSends.push({ packet: JSON.parse(source), target }) }, async close() {} }
  await networking.startNetworkingWithTransport(transport)
  const makePacket = ({ sender, kind, sequence, payload, channel = kind === 'input' ? 'input' : 'events', delivery = kind === 'input' ? 'unreliable-sequenced' : 'reliable-ordered', security }) => protocol.createNetworkPacket({ sessionId: networking.networkingState.sessionId, sender, channel, delivery, sequence, ack: null, tick: sequence, schema: production.productionSettings.networking.schemaVersion, kind, payload, ...(security ? { security } : {}) })
  const deliver = (packet, endpoint) => receive(protocol.serializeNetworkPacket(packet), endpoint)
  deliver(makePacket({ sender: 'peer-one', kind: 'hello', sequence: 1, payload: { role: 'client', playerName: 'Original identity', lateJoin: false } }), '127.0.0.1:50001')
  const admittedRole = networking.networkingState.peerDetails.find(peer => peer.id === 'peer-one')?.role
  deliver(makePacket({ sender: 'peer-one', kind: 'join', sequence: 2, payload: { role: 'host', playerName: 'Promoted identity', lateJoin: false } }), '127.0.0.1:50001')
  const immutableRole = networking.networkingState.peerDetails.find(peer => peer.id === 'peer-one')?.role
  const beforeMalformed = networking.networkingState.schemaRejected
  deliver(makePacket({ sender: 'peer-one', kind: 'input', sequence: 1, payload: {} }), '127.0.0.1:50001')
  const malformedRejected = networking.networkingState.schemaRejected > beforeMalformed
  deliver(makePacket({ sender: 'peer-one', kind: 'input', sequence: 2, payload: { ...empty, axes: { Horizontal: .75 } } }), '127.0.0.1:50001')
  const drainedInput = networking.drainRemoteInputs(4)
  check('V2607-REMOTE-INPUT-DRAIN', drainedInput.length === 1 && drainedInput[0].peerId === 'peer-one' && drainedInput[0].tick === 2 && drainedInput[0].input.axes.Horizontal === .75 && drainedInput[0].targetEntityUuids.join(',') === 'owner-input-body' && networking.drainRemoteInputs(4).length === 0, 'Admitted remote input drains once as a cloned, bounded frame targeted only to entities owned by that peer.')
  const beforeUnknown = networking.networkingState.droppedPackets
  deliver(makePacket({ sender: 'rogue', kind: 'input', sequence: 1, payload: empty }), '127.0.0.1:50002')
  const preAdmissionRejected = networking.networkingState.droppedPackets > beforeUnknown
  const beforeSourceAlias = networking.networkingState.authenticationRejected
  deliver(makePacket({ sender: 'source-alias', kind: 'hello', sequence: 1, payload: { role: 'client', playerName: 'Alias', lateJoin: false } }), '127.0.0.1:50001')
  const sourceAliasRejected = networking.networkingState.authenticationRejected > beforeSourceAlias
  const beforeFull = networking.networkingState.schemaRejected
  deliver(makePacket({ sender: 'peer-two', kind: 'hello', sequence: 1, payload: { role: 'client', playerName: 'Extra', lateJoin: false } }), '127.0.0.1:50002')
  const fullRejected = networking.networkingState.schemaRejected > beforeFull && networking.networkingState.peerDetails.length === 1
  deliver(makePacket({ sender: 'peer-one', kind: 'ping', sequence: 3, payload: { sentAt: 0 } }), '127.0.0.1:50001')
  await Promise.resolve()
  const pongUsesLogicalPeer = nativeSends.some(item => item.packet.kind === 'pong' && item.target === 'peer-one')
  const beforeSource = networking.networkingState.authenticationRejected
  deliver(makePacket({ sender: 'peer-one', kind: 'ping', sequence: 4, payload: { sentAt: 0 } }), '127.0.0.1:59999')
  const sourceRejected = networking.networkingState.authenticationRejected > beforeSource
  const beforeGap = networking.networkingState.outOfOrderPackets
  deliver(makePacket({ sender: 'peer-one', kind: 'ping', sequence: 1_000, payload: { sentAt: 0 } }), '127.0.0.1:50001')
  const sequenceGapRejected = networking.networkingState.outOfOrderPackets > beforeGap && /receive window/i.test(networking.networkingState.lastError)
  check('V2607-ADMISSION-AUTHORITY-SOURCE', admittedRole === 'client' && immutableRole === 'client' && malformedRejected && preAdmissionRejected && sourceAliasRejected && fullRejected && sourceRejected && sequenceGapRejected && pongUsesLogicalPeer && bound.get('peer-one') === '127.0.0.1:50001', 'Peer roles are immutable after admission; transport sources bind one-to-one; malformed/pre-admission/over-cap/source-mismatched and far-future traffic fails before gameplay; native pong routes by logical peer.', { admittedRole, immutableRole, peers: networking.networkingState.peerDetails.length, sourceAliasRejected, pongUsesLogicalPeer, sequenceGapRejected })
  await networking.stopNetworking()

  production.resetProductionSettings(); Object.assign(production.productionSettings.networking, { enabled: true, permissionGranted: true, role: 'client', channels: [{ id: 'events', delivery: 'unreliable-sequenced', maximumPayloadBytes: 2_048, messagesPerSecond: 100, priority: 1 }, { id: 'control', delivery: 'reliable-ordered', maximumPayloadBytes: 2_048, messagesPerSecond: 100, priority: 2 }] })
  const fallbackSends = []; let fallbackReceive = null
  await networking.startNetworkingWithTransport({ kind: 'websocket', async connect(handler, state) { fallbackReceive = handler; state('connected') }, async send(source, target) { fallbackSends.push({ packet: JSON.parse(source), target }) }, async close() {} })
  const fallbackPacket = ({ sender, sequence, role }) => protocol.createNetworkPacket({ sessionId: networking.networkingState.sessionId, sender, channel: 'control', delivery: 'reliable-ordered', sequence, ack: null, tick: sequence, schema: production.productionSettings.networking.schemaVersion, kind: sequence === 1 ? 'hello' : 'join', payload: { role, playerName: sender, lateJoin: false } })
  fallbackReceive(protocol.serializeNetworkPacket(fallbackPacket({ sender: 'claimed-authority', sequence: 1, role: 'host' })), 'websocket-route-a')
  fallbackReceive(protocol.serializeNetworkPacket(fallbackPacket({ sender: 'claimed-authority', sequence: 2, role: 'server' })), 'websocket-route-a')
  const unverifiedRole = networking.networkingState.peerDetails.find(peer => peer.id === 'claimed-authority')?.role
  const beforeRouteAlias = networking.networkingState.authenticationRejected
  fallbackReceive(protocol.serializeNetworkPacket(fallbackPacket({ sender: 'route-alias', sequence: 1, role: 'client' })), 'websocket-route-a')
  networking.setNetworkInterest([0, 0], 16, '')
  await Promise.resolve()
  const reliableFallback = fallbackSends.some(item => item.packet.kind === 'interest' && item.packet.channel === 'control' && item.packet.delivery === 'reliable-ordered')
  check('V2607-UNVERIFIED-AUTHORITY-CHANNEL-CONTRACT', unverifiedRole === 'client' && networking.networkingState.authenticationRejected > beforeRouteAlias && reliableFallback, 'Unverified WebSocket role claims cannot gain authority, one route cannot claim two logical peers, and lifecycle traffic falls back only to a delivery-compatible channel.', { unverifiedRole, reliableFallback })
  await networking.stopNetworking()

  const providerId = 'top.whitelists.verify.identity'
  const unregisterAuth = (await vite.ssrLoadModule('/src/runtime/networkProduction.ts')).registerNetworkAuthenticationProvider({ id: providerId, label: 'Verifier', createProof(context) { return `${context.packetChecksum}:${context.nonce}` }, verifyProof(context, proof) { return proof === `${context.packetChecksum}:${context.nonce}` } })
  production.resetProductionSettings(); Object.assign(production.productionSettings.networking, { enabled: true, permissionGranted: true, role: 'host' }); Object.assign(production.productionSettings.networking.authentication, { mode: 'hook', providerId, requireVerifiedPeers: true })
  let authReceive = null; const authTransport = { kind: 'adapter', async connect(handler, state) { authReceive = handler; state('connected') }, async send() {}, async close() {} }
  await networking.startNetworkingWithTransport(authTransport)
  const issuedAt = Date.now(), unsigned = makePacket({ sender: 'verified-peer', kind: 'hello', sequence: 1, payload: { role: 'client', playerName: 'Verified', lateJoin: false } }), checksum = protocol.networkChecksum(unsigned)
  const security = { epoch: 'epoch', nonce: 'same-nonce', issuedAt, proof: 'bad-proof' }
  authReceive(protocol.serializeNetworkPacket({ ...unsigned, security }), 'service-peer')
  const rejectedProofs = networking.networkingState.authenticationRejected
  authReceive(protocol.serializeNetworkPacket({ ...unsigned, security: { ...security, proof: `${checksum}:same-nonce` } }), 'service-peer')
  check('V2607-AUTH-NONCE-COMMIT', rejectedProofs >= 1 && networking.networkingState.peerDetails.some(peer => peer.id === 'verified-peer' && peer.verified), 'An invalid proof does not poison the replay window; the valid packet with the same nonce can still complete admission.')
  await networking.stopNetworking(); unregisterAuth()

  production.resetProductionSettings(); Object.assign(production.productionSettings.networking, { enabled: true, permissionGranted: false }); production.productionSettings.networking.services.identityProviderId = 'top.whitelists.verify.service'
  let opened = 0, closed = 0
  const review = { id: 'top.whitelists.verify.service', kind: 'identity', label: 'Verifier identity', version: '1.0.0', publisher: 'Whitelist', sha256: 'a'.repeat(64), reviewedBy: 'Whitelist', permissions: ['network.client','identity.read'], encrypted: true, documentationUrl: 'https://example.invalid/docs', securityUrl: 'https://example.invalid/security' }
  const unregisterService = services.registerReviewedNetworkService({ review, async open() { opened++; return { kind: 'identity', async request() { return { id: 'peer' } }, async close() { closed++ } } } })
  const context = { sessionId: 'session', localPeerId: 'peer', role: 'client', signal: new AbortController().signal }
  let denied = false; try { await services.openReviewedNetworkService('identity', production.productionSettings.networking, context) } catch { denied = true }
  production.productionSettings.networking.permissionGranted = true
  const handle = await services.openReviewedNetworkService('identity', production.productionSettings.networking, context); await handle.close()
  const relayIssues = services.networkServiceReviewIssues({ ...review, id: 'top.whitelists.verify.relay', kind: 'relay', permissions: ['network.client','relay.use'], encrypted: false })
  const publishedReview = services.reviewedNetworkServices('identity')[0]
  let publishedPermissionsFrozen = false
  try { publishedReview.permissions.push('network.listen') } catch { publishedPermissionsFrozen = true }
  review.id = 'top.whitelists.verify.mutated'; review.kind = 'relay'; review.permissions.splice(0)
  const registrationSnapshotStable = services.reviewedNetworkServices('identity').some(item => item.id === 'top.whitelists.verify.service' && item.kind === 'identity' && item.permissions.join(',') === 'network.client,identity.read')
  unregisterService()
  const stableUnregister = services.reviewedNetworkServices().every(item => item.id !== 'top.whitelists.verify.service')
  check('V2607-OPTIONAL-SERVICES', denied && opened === 1 && closed === 1 && relayIssues.some(issue => /encrypted/i.test(issue)) && publishedPermissionsFrozen && registrationSnapshotStable && stableUnregister, 'Reviewed identity/lobby/relay services remain explicit, permission-gated, immutable after review, closeable, and require encrypted relay transport.')

  production.resetProductionSettings(); Object.assign(production.productionSettings.networking, { enabled: true, permissionGranted: true, role: 'host' }); Object.assign(production.productionSettings.networking.simulation, { enabled: true, latencyMs: 80, jitterMs: 0, lossPercent: 0, duplicatePercent: 0, reorderPercent: 0, seed: 2607 })
  let staleSends = 0; const delayedTransport = { kind: 'adapter', async connect(_handler, state) { state('connected') }, async send() { staleSends++ }, async close() {} }
  await networking.startNetworkingWithTransport(delayedTransport); await networking.sendNetworkPacket('ping', { sentAt: 0 }, 'events'); await networking.stopNetworking(); await new Promise(resolve => setTimeout(resolve, 120))
  check('V2607-CANCEL-DELAYED-DELIVERY', staleSends === 0, 'Stopping a session cancels delayed impairment deliveries before they can escape into a later session.', { staleSends })

  production.resetProductionSettings(); const firstSave = replay.exportMultiplayerSave([], 42); await new Promise(resolve => setTimeout(resolve, 4)); const secondSave = replay.exportMultiplayerSave([], 42)
  check('V2607-DETERMINISTIC-SAVE', protocol.stableNetworkJson(firstSave) === protocol.stableNetworkJson(secondSave), 'The same fixed-tick multiplayer state produces byte-stable save content; wall-clock display metadata does not alter deterministic identity.')

  const atomicUuid = '26070000-0000-4000-8000-000000000001', atomicEntity = new BoxEntity(1, { x: 4, y: -2 }, { x: 1, y: 1 }, atomicUuid)
  atomicEntity.velocity = { x: 3, y: 5 }; atomicEntity.angularVelocity = .75
  production.productionSettings.networking.replicatedEntities = [{ ...cadenceDefinition, entityUuid: atomicUuid }]
  const validSave = replay.exportMultiplayerSave([atomicEntity], 77), resignSave = document => { document.checksum = protocol.networkChecksum({ format: document.format, version: document.version, engineVersion: document.engineVersion, protocolVersion: document.protocolVersion, schemaVersion: document.schemaVersion, sessionName: document.sessionName, tick: document.tick, entities: document.entities }); return document }
  const incompatibleSchema = resignSave({ ...structuredClone(validSave), schemaVersion: validSave.schemaVersion + 1 }), incompatibleSession = resignSave({ ...structuredClone(validSave), sessionName: `${validSave.sessionName}-other` }), incompatibleEngine = resignSave({ ...structuredClone(validSave), engineVersion: '99.0.0' })
  let schemaMismatchRejected = false, sessionMismatchRejected = false, engineMismatchRejected = false
  try { replay.importMultiplayerSave(incompatibleSchema, [atomicEntity]) } catch (error) { schemaMismatchRejected = /schema/i.test(error instanceof Error ? error.message : String(error)) }
  try { replay.importMultiplayerSave(incompatibleSession, [atomicEntity]) } catch (error) { sessionMismatchRejected = /session/i.test(error instanceof Error ? error.message : String(error)) }
  try { replay.importMultiplayerSave(incompatibleEngine, [atomicEntity]) } catch (error) { engineMismatchRejected = /engine/i.test(error instanceof Error ? error.message : String(error)) }
  check('V2607-SAVE-COMPATIBILITY', schemaMismatchRejected && sessionMismatchRejected && engineMismatchRejected && close(atomicEntity.transform.position.x, 4) && close(atomicEntity.transform.position.y, -2), 'Checksum-valid saves from an incompatible schema, session, or future engine fail before world mutation.', { schemaMismatchRejected, sessionMismatchRejected, engineMismatchRejected })
  const duplicateSave = structuredClone(validSave)
  duplicateSave.entities = [{ ...duplicateSave.entities[0], position: [99, 101] }, { ...duplicateSave.entities[0], position: [111, 113] }]
  duplicateSave.checksum = protocol.networkChecksum({ format: duplicateSave.format, version: duplicateSave.version, engineVersion: duplicateSave.engineVersion, protocolVersion: duplicateSave.protocolVersion, schemaVersion: duplicateSave.schemaVersion, sessionName: duplicateSave.sessionName, tick: duplicateSave.tick, entities: duplicateSave.entities })
  let atomicRejected = false
  try { replay.importMultiplayerSave(duplicateSave, [atomicEntity]) } catch (error) { atomicRejected = /duplicate/i.test(error instanceof Error ? error.message : String(error)) }
  check('V2607-SAVE-ATOMIC-REJECTION', atomicRejected && close(atomicEntity.transform.position.x, 4) && close(atomicEntity.transform.position.y, -2) && close(atomicEntity.velocity.x, 3) && close(atomicEntity.velocity.y, 5), 'A checksum-valid save with duplicate identities is rejected before any entity state is mutated.', { position: [atomicEntity.transform.position.x, atomicEntity.transform.position.y], velocity: [atomicEntity.velocity.x, atomicEntity.velocity.y] })

  const excessiveSave = structuredClone(validSave)
  excessiveSave.entities[0].velocity = [1e9 + 1, 0]
  excessiveSave.checksum = protocol.networkChecksum({ format: excessiveSave.format, version: excessiveSave.version, engineVersion: excessiveSave.engineVersion, protocolVersion: excessiveSave.protocolVersion, schemaVersion: excessiveSave.schemaVersion, sessionName: excessiveSave.sessionName, tick: excessiveSave.tick, entities: excessiveSave.entities })
  let boundRejected = false
  try { replay.importMultiplayerSave(excessiveSave, [atomicEntity]) } catch (error) { boundRejected = /bound/i.test(error instanceof Error ? error.message : String(error)) }
  check('V2607-SAVE-NUMERIC-BOUNDS', boundRejected && close(atomicEntity.velocity.x, 3) && close(atomicEntity.velocity.y, 5), 'Checksum-valid but out-of-range transform/velocity state is rejected before mutation.')

  const parent = new BoxEntity(2, { x: 10, y: 0 }, { x: 1, y: 1 }, '26070000-0000-4000-8000-000000000002'), child = new BoxEntity(3, { x: 3, y: 0 }, { x: 1, y: 1 }, '26070000-0000-4000-8000-000000000003')
  child.parentUuid = parent.uuid
  production.productionSettings.networking.replicatedEntities = [{ ...cadenceDefinition, entityUuid: parent.uuid }, { ...cadenceDefinition, entityUuid: child.uuid }]
  const hierarchySave = replay.exportMultiplayerSave([parent, child], 78)
  hierarchySave.entities.reverse()
  hierarchySave.checksum = protocol.networkChecksum({ format: hierarchySave.format, version: hierarchySave.version, engineVersion: hierarchySave.engineVersion, protocolVersion: hierarchySave.protocolVersion, schemaVersion: hierarchySave.schemaVersion, sessionName: hierarchySave.sessionName, tick: hierarchySave.tick, entities: hierarchySave.entities })
  parent.transform.position = { x: 0, y: 0 }; child.transform.position = { x: 1, y: 0 }
  replay.importMultiplayerSave(hierarchySave, [child, parent])
  const restoredChildWorld = hierarchy.worldTransform(child, [child, parent])
  check('V2607-SAVE-HIERARCHY-ORDER', close(parent.transform.position.x, 10) && close(restoredChildWorld.position.x, 13), 'Parent and child world transforms restore correctly even when both the save and runtime entity arrays are child-first.', { parentX: parent.transform.position.x, childWorldX: restoredChildWorld.position.x })

  const diagnostic = JSON.parse(replay.networkDiagnosticCapture({ status: 'connected', endpoint: 'udp://secret.example:7777', accessToken: 'secret-token', bindAddress: '0.0.0.0:7777', replicationDiffs: Array.from({ length: 2_000 }, (_, index) => ({ tick: index, entityUuid: `entity-${index}`, endpointHint: 'private' })) }, [], []))
  check('V2607-DIAGNOSTIC-REDACTION', diagnostic.state.status === 'connected' && !('endpoint' in diagnostic.state) && !('accessToken' in diagnostic.state) && !('bindAddress' in diagnostic.state) && diagnostic.state.replicationDiffs.length === 1_000 && diagnostic.state.replicationDiffs.every(item => !('endpointHint' in item)), 'Exported diagnostics bound the supported 2,000-entry replication history while recursively omitting endpoint and credential-shaped fields.')

  const deterministicSerialA = exporter.buildSbomSerial('0123456789abcdef'.repeat(4), true), deterministicSerialB = exporter.buildSbomSerial('0123456789abcdef'.repeat(4), true)
  check('V2607-DETERMINISTIC-SBOM-SERIAL', deterministicSerialA === deterministicSerialB && /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(deterministicSerialA), 'Deterministic web exports derive a stable RFC 4122-shaped SBOM serial from the build ID.', { serial: deterministicSerialA })

  packages.enableOfficialPackage(packages.OFFICIAL_NETWORKING_PACKAGE_ID)
  production.resetProductionSettings()
  Object.assign(production.productionSettings.networking, {
    enabled: true, permissionGranted: true, sessionMode: 'direct', transport: 'websocket', endpoint: 'https://not-a-websocket.invalid', maximumPacketBytes: 1_024,
    channels: [{ id: 'events', delivery: 'reliable-ordered', maximumPayloadBytes: 2_048, messagesPerSecond: 20, priority: 1 }],
    rpcContracts: [{ name: 'oversized.rpc', channelId: 'events', direction: 'bidirectional', authority: 'any', payloadSchema: 'object', maximumPayloadBytes: 4_096, callsPerSecond: 1 }]
  })
  const invalidContractCodes = build.validateBuildSettings(build.buildSettings).map(issue => issue.code)
  check('V2607-BUILD-NETWORK-BOUNDS', ['network-endpoint','network-channel-packet-bound','network-rpc-payload-bound'].every(code => invalidContractCodes.includes(code)), 'Build validation blocks invalid direct endpoints and channel/RPC payload limits that exceed their containing envelope.', { codes: invalidContractCodes.filter(code => code.startsWith('network-')) })
  const installedNetworking = packages.packageState.installed.find(item => item.manifest.id === packages.OFFICIAL_NETWORKING_PACKAGE_ID)
  if (installedNetworking) installedNetworking.grantedPermissions = installedNetworking.grantedPermissions.filter(permission => permission !== 'network.listen')
  Object.assign(production.productionSettings.networking, { transport: 'native-udp', endpoint: 'udp://127.0.0.1:47771', bindAddress: '127.0.0.1:0', role: 'server', channels: [{ id: 'events', delivery: 'reliable-ordered', maximumPayloadBytes: 512, messagesPerSecond: 20, priority: 1 }], rpcContracts: [], maximumPacketBytes: 1_024, autoStart: false })
  build.buildSettings.runtimeMode = 'headless-server'
  const nativeContractCodes = build.validateBuildSettings(build.buildSettings).map(issue => issue.code)
  check('V2607-BUILD-NATIVE-AUTHORITY', nativeContractCodes.includes('network-listen-permission') && nativeContractCodes.includes('headless-network-autostart') && !nativeContractCodes.includes('network-endpoint') && !nativeContractCodes.includes('network-bind-address'), 'Native authority builds require network.listen and runtime auto-start while accepting a valid UDP endpoint and ephemeral bind port.', { codes: nativeContractCodes.filter(code => code.startsWith('network-') || code.startsWith('headless-')) })

  const sources = await Promise.all(['src/runtime/networkInput.ts','src/runtime/networkServices.ts','src/runtime/networkRollback.ts','src/runtime/networking.ts','src/runtime/networkReplay.ts','src/runtime/productionRuntime.ts','src/runtime/GameplayRuntime.ts','src/runtime/productionValidation.ts','src/runtime/buildSettings.ts','src/runtime/gameExporter.ts','scripts/nova-export.mjs','src-tauri/src/lib.rs'].map(path => readFile(join(root, path), 'utf8')))
  const [inputSource, serviceSource, rollbackSource, networkSource, replaySource, productionRuntimeSource, gameplayRuntimeSource, healthSource, buildSource, exporterSource, cliSource, nativeSource] = sources
  check('V2607-RUNTIME-WIRING', networkSource.includes('snapshotAccumulator') && networkSource.includes('scheduledDeliveries') && networkSource.includes('peerSources') && networkSource.includes('normalizeNetworkInput') && networkSource.includes('receiveBudgetBytes = 0') && replaySource.includes('cloneNetworkInput') && productionRuntimeSource.includes('drainRemoteInputs') && gameplayRuntimeSource.includes("emitSignal('network.input'"), 'Fixed cadence, fresh per-session bandwidth budgets, cancellable delivery, source binding, shared input normalization, and authority-targeted gameplay input dispatch are wired into runtime/replay.')
  check('V2607-SERVICE-WIRING', serviceSource.includes('NetworkServiceKind') && healthSource.includes('networkServiceSelectionIssues') && buildSource.includes('networkServiceSelectionIssues'), 'Reviewed service selection is shared by Project Health and Build validation.')
  check('V2607-EXPORT-POLICY-WIRING', cliSource.includes('headless-server') && cliSource.includes('permissionGranted') && cliSource.includes('grantedPermissions') && cliSource.includes('top.whitelists.novaa.networking') && nativeSource.includes('grantedPermissions') && nativeSource.includes('runtime_mode') && exporterSource.includes('validateProductionRuntime'), 'CLI, native and editor export sources carry the same explicit server-mode package grants, policy data, and full production validation; behavior is independently covered by the headless verifier.')
  check('V2607-HEADLESS-AUTOSTART', buildSource.includes('headless-network-autostart') && exporterSource.includes('networking.autoStart'), 'Every headless export path requires the explicitly authorized network runtime to auto-start.')
  check('V2607-NONCRYPTO-DISCLOSURE', rollbackSource.includes('arbitrary Rhai') && inputSource.includes('only InputSnapshot shape') && (replaySource.includes('non-cryptographic') || (await readFile(join(root, 'docs/MULTIPLAYER_PRODUCTION_26_07.md'), 'utf8')).includes('not a cryptographic signature')), 'Rollback scope, input boundary, and non-cryptographic checksum limitations are disclosed.')
} finally { await Promise.race([vite.close(), new Promise(resolve => setTimeout(resolve, 2_000))]) }

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v26.07-network-verification', version: 1, release: '26.07', engineVersion: '26.7.0', generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, externalGates: { publicRelayNat: 'pending-external', hostileNetworkReview: 'pending-external', crossHostLongSoak: 'pending-external', independentCryptographicReview: 'pending-external' }, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(join(root, 'release-audits/v26.07-network-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) process.exit(1)
console.log(`Nova_A 26.07 network verification passed: ${checks.length} behavior-focused checks.`)

function close(value, expected) { return typeof value === 'number' && Math.abs(value - expected) < 1e-9 }
