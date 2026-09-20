import assert from 'node:assert/strict'
import {cpus,totalmem} from 'node:os'
import {mkdir, writeFile} from 'node:fs/promises'
import {dirname} from 'node:path'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
import {resolveMilestoneAuditContext} from './lib/milestoneAuditContext.mjs'

const context = resolveMilestoneAuditContext(import.meta.url, {release: '26.18', reportName: 'networking'})
const checks = []
let clock = 0
Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {platform: 'Win32', hardwareConcurrency: 4, userAgent: 'Nova_A network programmer audit'}})
Object.defineProperty(globalThis, 'performance', {configurable: true, value: {now: () => clock}})
globalThis.window = {setTimeout, clearTimeout, setInterval, clearInterval, addEventListener() {}, removeEventListener() {}}
globalThis.localStorage = {getItem() {return null}, setItem() {}, removeItem() {}}
const networkingWindow = globalThis.window
let networking, opened
try {
  // Bundle actual source roots together, avoiding development-server cyclic fetch deadlocks.
  opened = await openMediaAuditModules(context,{net:'runtime/networking',production:'runtime/production',protocol:'runtime/networkProtocol',replay:'runtime/networkReplay',input:'runtime/networkInput',authority:'runtime/networkProduction',boxes:'world/BoxEntity',services:'runtime/networkServices',hierarchy:'world/hierarchy',productionRuntime:'runtime/productionRuntime',packages:'runtime/packages'})
  globalThis.window = networkingWindow // Preserve the original real networking timers.
  const {net,production,protocol,replay,input,authority,boxes,services,hierarchy,productionRuntime,packages} = opened.modules
  networking = net
  let settings = production.productionSettings.networking
  const definition = {entityUuid: '00000001-0000-4000-8000-000000000000', authority: 'server', properties: ['transform'], interpolate: false, predict: false, ownerPeerId: '', alwaysRelevant: true, interestRadius: 100, sceneUuid: ''}
  const rpc = {name: 'audit', channelId: 'events', direction: 'bidirectional', authority: 'any', payloadSchema: 'number', maximumPayloadBytes: 4096, callsPerSecond: 1000}
  async function session(overrides = {}, kind = 'adapter') {
    await net.stopNetworking()
    production.resetProductionSettings()
    settings = production.productionSettings.networking
    Object.assign(settings, {enabled: true, permissionGranted: true, autoStart: false, reconnect: false, role: 'host', maximumPacketBytes: 65507, bandwidthKbps: 1000000, maximumMessagesPerSecond: 10000, maximumPendingReliable: 256, rpcContracts: [rpc], ...overrides})
    for (const channel of settings.channels) {channel.messagesPerSecond = 10000; channel.maximumPayloadBytes = 48000}
    clock += 2000
    const sent = []
    let receive, sendHook
    await net.startNetworkingWithTransport({kind, async connect(handler, state) {receive = handler; state('connected')}, async send(source, target) {sent.push({packet: JSON.parse(source), target}); if (sendHook) await sendHook(JSON.parse(source), target)}, async close() {}})
    const packet = (sequence, kind, payload, extra = {}) => protocol.createNetworkPacket({sessionId: net.networkingState.sessionId, sender: 'remote', channel: 'events', delivery: 'reliable-ordered', sequence, ack: null, tick: sequence, schema: settings.schemaVersion, kind, payload, security: {epoch: 'epoch-a', nonce: 'nonce-' + sequence, issuedAt: Date.now(), proof: ''}, ...extra})
    const deliver = p => receive(protocol.serializeNetworkPacket(p), 'remote')
    return {sent, packet, deliver, setSendHook(handler) {sendHook = handler}, admit(role = 'client') {deliver(packet(1, 'hello', {role, playerName: 'Remote', lateJoin: false}))}}
  }
  async function check(name, run) {
    const began = process.hrtime.bigint()
    try {const observations = await run(); checks.push({name, status: 'passed', elapsedMs:Number(process.hrtime.bigint()-began)/1e6, ...(observations ? {observations} : {})})}
    catch (error) {checks.push({name, status: 'failed', error: error.stack ?? String(error)})}
    finally {await net.stopNetworking()}
  }
  await check('Rejected packet size does not consume an ordered sequence', async () => {
    const s = await session()
    assert.equal(await net.sendNetworkPacket('rpc', {name: 'audit', value: 1}, 'events'), true)
    settings.maximumPacketBytes = 512
    assert.equal(await net.sendNetworkPacket('rpc', {name: 'audit', value: 'x'.repeat(450)}, 'events'), false)
    settings.maximumPacketBytes = 65507
    assert.equal(await net.sendNetworkPacket('rpc', {name: 'audit', value: 2}, 'events'), true)
    assert.equal(s.sent[1].packet.sequence, s.sent[0].packet.sequence + 1)
  })
  await check('Reliable-window backpressure does not consume an ordered sequence', async () => {
    const s = await session({maximumPendingReliable: 1})
    s.admit()
    const first = s.sent.find(item => item.packet.kind === 'join').packet
    let refused = false
    for (let i = 0; i < 1024; i++) if (!await net.sendNetworkPacket('rpc', {name: 'audit', value: 1}, 'events', 'remote')) {refused = true; break}
    assert.equal(refused, true)
    const previous = s.sent.findLast(item => item.packet.kind !== 'ack').packet.sequence
    s.deliver(s.packet(0, 'ack', null, {ack: first.sequence, security: {epoch: 'epoch-a', nonce: 'ack-join', issuedAt: Date.now(), proof: ''}}))
    assert.equal(await net.sendNetworkPacket('rpc', {name: 'audit', value: 2}, 'events', 'remote'), true)
    const last = s.sent.findLast(item => item.packet.kind === 'rpc').packet
    assert.equal(last.sequence, previous + 1)
  })
  await check('A channel-throttled reliable packet can be accepted when retried', async () => {
    const s = await session()
    settings.channels.find(channel => channel.id === 'events').messagesPerSecond = 2
    const values = [], unregister = net.registerRpc('audit', value => values.push(value))
    try {
      s.admit()
      s.deliver(s.packet(2, 'rpc', {name: 'audit', value: 2}))
      const retried = s.packet(3, 'rpc', {name: 'audit', value: 3})
      s.deliver(retried)
      assert.deepEqual(values, [2])
      clock += 1100
      s.deliver(retried)
      assert.deepEqual(values, [2, 3])
    } finally {unregister()}
  })
  await check('Invalid late-join ownership preserves entity transforms and ownership', async () => {
    const s = await session({role: 'client', replicatedEntities: [definition]}, 'local-loopback')
    const body = new boxes.BoxEntity(1, {x: 0, y: 0}, {x: 1, y: 1}, '00000001-0000-4000-8000-000000000000')
    net.updateNetworking([body], 1 / 60, input.emptyNetworkInput())
    s.admit('host')
    body.transform.position.x = 77
    const save = replay.exportMultiplayerSave([body], 5)
    assert.equal(save.entities.length, 1)
    assert.equal(save.entities[0].position[0], 77)
    body.transform.position.x = 0
    const document = {format: 'nova-network-baseline', version: 1, save, authority: [{entityUuid: 'unknown-body', ownerPeerId: 'remote'}], scenes: []}
    const source = protocol.stableNetworkJson(document)
    s.deliver(s.packet(2, 'resync', {transferId: 'baseline', index: 0, count: 1, checksum: protocol.networkChecksum(source), chunk: source}))
    assert.match(net.networkingState.lastError, /ownership/i)
    assert.equal(body.transform.position.x, 0)
    assert.equal(s.sent.some(item => item.packet.kind === 'ack' && item.packet.ack === 2), false)
    assert.equal(net.networkingState.peers, 0)
    assert.deepEqual(net.networkingState.ownership.map(item => ({...item})), [{entityUuid: '00000001-0000-4000-8000-000000000000', ownerPeerId: ''}])
  })
  await check('Authority restore rejects malformed entries and over-bound trailing data atomically', () => {
    const table = new authority.NetworkAuthorityTable()
    table.initialize([definition], 'host', 'host')
    assert.equal(table.restore([null], [definition]), false)
    assert.equal(table.owner('00000001-0000-4000-8000-000000000000'), 'host')
    const definitions = Array.from({length: 2000}, (_, i) => ({...definition, entityUuid: 'body-' + i}))
    table.initialize(definitions, 'host', 'host')
    const entries = definitions.map(item => ({entityUuid: item.entityUuid, ownerPeerId: 'client'}))
    assert.equal(table.restore([...entries, {entityUuid: 'excess', ownerPeerId: 'client'}], definitions), false)
    assert.equal(table.owner('body-0'), 'host')
  })
  await check('A peer cannot change its admitted epoch with a gameplay packet', async () => {
    const s = await session()
    const values = [], unregister = net.registerRpc('audit', value => values.push(value))
    try {
      s.admit()
      s.deliver(s.packet(2, 'rpc', {name: 'audit', value: 2}, {security: {epoch: 'different-epoch', nonce: 'different-nonce', issuedAt: Date.now(), proof: ''}}))
      assert.deepEqual(values, [])
    } finally {unregister()}
  })

  await check('Incoming snapshots obey the authored property allowlist', async () => {
    const s = await session({role: 'client', replicatedEntities: [definition]}, 'local-loopback')
    const body = new boxes.BoxEntity(1, {x: 0, y: 0}, {x: 1, y: 1}, definition.entityUuid)
    s.admit('host')
    s.deliver(s.packet(1, 'snapshot', {entities: [{uuid: body.uuid, position: [3, 4], rotation: 2, velocity: [8, 9]}], checksum: '', full: false}, {channel: 'state', delivery: 'unreliable-sequenced', security: {epoch: 'epoch-a', nonce: 'snapshot-1', issuedAt: Date.now(), proof: ''}}))
    net.updateNetworking([body], 1 / 60, input.emptyNetworkInput())
    assert.equal(body.transform.position.x, 3)
    assert.equal(body.transform.rotation, 0)
    assert.deepEqual({...body.velocity}, {x: 0, y: 0})
  })
  await check('Unassigned owner replication cannot be claimed by an arbitrary client', async () => {
    const s = await session({role: 'client', replicatedEntities: [{...definition, authority: 'owner', ownerPeerId: ''}]}, 'local-loopback')
    const body = new boxes.BoxEntity(1, {x: 0, y: 0}, {x: 1, y: 1}, definition.entityUuid)
    s.admit('client')
    s.deliver(s.packet(1, 'snapshot', {entities: [{uuid: body.uuid, position: [99, 0]}], checksum: '', full: false}, {channel: 'state', delivery: 'unreliable-sequenced', security: {epoch: 'epoch-a', nonce: 'snapshot-1', issuedAt: Date.now(), proof: ''}}))
    net.updateNetworking([body], 1 / 60, input.emptyNetworkInput())
    assert.equal(body.transform.position.x, 0)
  })
  const review = {id: 'top.nova.audit18', label: 'Audit fixture', version: '1.0.0', publisher: 'Whitelist', sha256: 'a'.repeat(64), reviewedBy: 'Whitelist', permissions: ['network.client', 'network.listen'], encrypted: true, documentationUrl: 'https://example.invalid/docs', securityUrl: 'https://example.invalid/security'}
  await check('A reviewed service returned after cancellation is closed without becoming active', async () => {
    await session()
    const abort = new AbortController()
    let resolveOpen, closed = 0
    const unregister = services.registerReviewedNetworkService({review: {...review, kind: 'identity', permissions: ['network.client', 'identity.read']}, open: () => new Promise(resolve => {resolveOpen = resolve})})
    settings.services.identityProviderId = review.id
    try {
      const pending = services.openReviewedNetworkService('identity', settings, {sessionId: 'audit', localPeerId: 'local', role: 'client', signal: abort.signal})
      abort.abort()
      resolveOpen({kind: 'identity', async request() {}, async close() {closed++}})
      await assert.rejects(pending, /cancel|abort/i)
      assert.equal(closed, 1)
    } finally {unregister()}
  })
  await check('Stop during real adapter connection prevents late completion and callbacks from reviving the session', async () => {
    await session()
    await net.stopNetworking()
    settings.sessionMode = 'direct'; settings.transportAdapterId = review.id
    let resolveConnect, stateCallback, messageCallback, closed = 0
    const entered = new Promise(resolve => {
      const unregister = authority.registerReviewedNetworkTransport({review, create: () => ({kind: 'adapter', connect(message, state) {messageCallback = message; stateCallback = state; resolve(); return new Promise(done => {resolveConnect = done})}, async send() {}, async close() {closed++}})})
      globalThis.audit18Unregister = unregister
    })
    try {
      const pending = net.startNetworking()
      await entered
      await net.stopNetworking()
      resolveConnect()
      await assert.rejects(pending, /cancel|abort/i)
      stateCallback('connected')
      messageCallback('{}', 'late-peer')
      assert.equal(net.networkingState.status, 'disabled')
      assert.ok(closed >= 1)
    } finally {globalThis.audit18Unregister(); delete globalThis.audit18Unregister}
  })

  await check('Explicit live owner edits reach ownership while unrelated property edits preserve transfers', async () => {
    const s = await session({replicatedEntities: [{...definition, authority: 'owner', ownerPeerId: ''}]})
    s.admit()
    const body = new boxes.BoxEntity(1, {x: 0, y: 0}, {x: 1, y: 1}, definition.entityUuid)
    settings.replicatedEntities[0].ownerPeerId = 'remote'
    net.updateNetworking([body], 1 / 60, input.emptyNetworkInput())
    assert.equal(net.networkingState.ownership[0].ownerPeerId, 'remote')
    assert.equal(net.transferNetworkAuthority(body.uuid, net.networkingState.localPeerId), true)
    settings.replicatedEntities[0].properties = ['velocity']
    net.updateNetworking([body], 1 / 60, input.emptyNetworkInput())
    assert.equal(net.networkingState.ownership[0].ownerPeerId, net.networkingState.localPeerId)
    settings.replicatedEntities = []
    net.updateNetworking([body], 1 / 60, input.emptyNetworkInput())
    assert.equal(net.networkingState.ownership.length, 0)
  })
  await check('Revoking permission blocks already connected incoming RPCs', async () => {
    const s = await session(), values = [], unregister = net.registerRpc('audit', value => values.push(value))
    try {s.admit(); settings.permissionGranted = false; s.deliver(s.packet(2, 'rpc', {name: 'audit', value: 7})); assert.deepEqual(values, []); assert.notEqual(net.networkingState.status, 'connected')}
    finally {unregister()}
  })
  await check('An RPC cannot bypass its authored reliable channel through state traffic', async () => {
    const s = await session(), values = [], unregister = net.registerRpc('audit', value => values.push(value))
    try {s.admit(); s.deliver(s.packet(1, 'rpc', {name: 'audit', value: 7}, {channel: 'state', delivery: 'unreliable-sequenced', security: {epoch: 'epoch-a', nonce: 'wrong-channel', issuedAt: Date.now(), proof: ''}})); assert.deepEqual(values, [])}
    finally {unregister()}
  })
  await check('Manual save restoration preserves unacknowledged reliable traffic and the live network clock', async () => {
    const s = await session({replicatedEntities: [definition]})
    const body = new boxes.BoxEntity(1, {x: 0, y: 0}, {x: 1, y: 1}, definition.entityUuid)
    const save = replay.exportMultiplayerSave([body], 0)
    s.admit(); net.updateNetworking([body], 1 / 60, input.emptyNetworkInput())
    const before = net.networkRuntimeSnapshot()
    assert.ok(before.reliablePending > 0)
    net.restoreMultiplayerSave(save)
    const after = net.networkRuntimeSnapshot()
    assert.equal(after.reliablePending, before.reliablePending)
    assert.equal(after.tick, before.tick)
  })

  await check('Fresh lifecycle epoch reconnects but the retired epoch cannot return', async () => {
    const s = await session(), values = [], unregister = net.registerRpc('audit', value => values.push(value))
    const envelope = (epoch, nonce) => ({epoch, nonce, issuedAt: Date.now(), proof: ''})
    try {
      s.admit()
      s.deliver(s.packet(1, 'hello', {role: 'client', playerName: 'Reconnected', lateJoin: false}, {security: envelope('epoch-b', 'new-hello')}))
      s.deliver(s.packet(2, 'rpc', {name: 'audit', value: 2}, {security: envelope('epoch-b', 'new-rpc')}))
      assert.deepEqual(values, [2])
      s.deliver(s.packet(1, 'hello', {role: 'client', playerName: 'Old', lateJoin: false}, {security: envelope('epoch-a', 'old-hello')}))
      s.deliver(s.packet(2, 'rpc', {name: 'audit', value: 99}, {security: envelope('epoch-a', 'old-rpc')}))
      assert.deepEqual(values, [2])
    } finally {unregister()}
  })
  await check('Receive-window refusal does not poison an eventual reliable retry', async () => {
    const s = await session({maximumPendingReliable: 1}), values = [], unregister = net.registerRpc('audit', value => values.push(value))
    try {
      s.admit()
      const later = s.packet(3, 'rpc', {name: 'audit', value: 3})
      s.deliver(later)
      assert.deepEqual(values, [])
      s.deliver(s.packet(2, 'rpc', {name: 'audit', value: 2}))
      s.deliver(later)
      assert.deepEqual(values, [2, 3])
    } finally {unregister()}
  })
  await check('Exhausted reliable delivery retires the peer and reports actionable failure', async () => {
    const s = await session({reliableRetryMs: 10, reliableMaximumAttempts: 1})
    s.admit()
    assert.equal(net.networkingState.peers, 1)
    clock += 100
    net.updateNetworking([], 1 / 60, input.emptyNetworkInput())
    assert.equal(net.networkingState.peers, 0)
    assert.match(net.networkingState.lastError, /reliable|acknowledg/i)
    assert.equal(net.networkRuntimeSnapshot().reliablePending, 0)
  })

  await check('Multi-chunk baseline holds deferred gameplay until every chunk is queued and acknowledged', async () => {
    const definitions = Array.from({length: 8}, (_, i) => ({...definition, entityUuid: (i + 10).toString(16).padStart(8, '0') + '-0000-4000-8000-000000000000'}))
    const s = await session({replicatedEntities: definitions})
    settings.channels.find(channel => channel.id === 'events').maximumPayloadBytes = 1024
    const entities = definitions.map((def, i) => new boxes.BoxEntity(i + 10, {x: i, y: 0}, {x: 1, y: 1}, def.entityUuid))
    net.updateNetworking(entities, 1 / 60, input.emptyNetworkInput())
    let releaseFirst
    const gate = new Promise(resolve => {releaseFirst = resolve})
    let held = false
    s.setSendHook(packet => {if (packet.kind === 'resync' && !held) {held = true; return gate}})
    const values = [], unregister = net.registerRpc('audit', value => values.push(value)), acknowledged = new Set()
    const acknowledge = packet => {acknowledged.add(packet.sequence); s.deliver(s.packet(0, 'ack', null, {ack: packet.sequence, security: {epoch: 'epoch-a', nonce: 'ack-' + packet.sequence, issuedAt: Date.now(), proof: ''}}))}
    try {
      s.admit()
      const first = s.sent.find(item => item.packet.kind === 'resync')?.packet
      assert.ok(first); assert.ok(first.payload.count > 1)
      acknowledge(first)
      s.deliver(s.packet(2, 'rpc', {name: 'audit', value: 2}))
      assert.deepEqual(values, [])
      releaseFirst()
      for (let i = 0; i < 2000 && values.length === 0; i++) {
        await Promise.resolve()
        for (const item of [...s.sent]) if (['resync', 'join'].includes(item.packet.kind) && !acknowledged.has(item.packet.sequence)) acknowledge(item.packet)
      }
      assert.deepEqual(values, [2])
      const chunks = s.sent.filter(item => item.packet.kind === 'resync').map(item => item.packet)
      assert.equal(chunks.length, first.payload.count)
      for (const packet of chunks) assert.ok(protocol.utf8Bytes(protocol.stableNetworkJson(packet.payload)) <= 1024)
    } finally {releaseFirst(); unregister()}
  })

  await check('Large late-join baseline chunks include JSON escaping in their byte budget', async () => {
    const definitions = Array.from({length: 300}, (_, i) => ({...definition, entityUuid: (i + 100).toString(16).padStart(8, '0') + '-0000-4000-8000-000000000000'}))
    const s = await session({replicatedEntities: definitions})
    const entities = definitions.map((def, i) => new boxes.BoxEntity(i + 100, {x: i, y: 0}, {x: 1, y: 1}, def.entityUuid))
    net.updateNetworking(entities, 1 / 60, input.emptyNetworkInput())
    s.admit()
    const acknowledged = new Set()
    for (let i = 0; i < 5000; i++) {
      await Promise.resolve()
      for (const {packet} of [...s.sent]) if (['join', 'resync'].includes(packet.kind) && !acknowledged.has(packet.sequence)) {acknowledged.add(packet.sequence); s.deliver(s.packet(0, 'ack', null, {ack: packet.sequence, security: {epoch: 'epoch-a', nonce: 'large-ack-' + packet.sequence, issuedAt: Date.now(), proof: ''}}))}
      const chunks = s.sent.filter(item => item.packet.kind === 'resync')
      if (chunks.length && chunks.length === chunks[0].packet.payload.count) break
    }
    const chunks = s.sent.filter(item => item.packet.kind === 'resync').map(item => item.packet)
    assert.ok(chunks.length > 1, net.networkingState.lastError)
    assert.equal(chunks.length, chunks[0].payload.count)
    for (const packet of chunks) assert.ok(protocol.utf8Bytes(protocol.stableNetworkJson(packet.payload)) <= 48000)
  })

  await check('All 2000 replicated entities receive bounded fair snapshot pages', async () => {
    const definitions = Array.from({length: 2000}, (_, i) => ({...definition, entityUuid: (i + 1000).toString(16).padStart(8, '0') + '-0000-4000-8000-000000000000'}))
    const s = await session({replicatedEntities: definitions, snapshotRate: 20, rollbackFrames: 0})
    const entities = definitions.map((def, i) => new boxes.BoxEntity(i + 1000, {x: i, y: 0}, {x: 1, y: 1}, def.entityUuid))
    s.admit()
    for (let i = 0; i < 20; i++) {net.updateNetworking(entities, .05, input.emptyNetworkInput()); await Promise.resolve()}
    const snapshots = s.sent.filter(item => item.packet.kind === 'snapshot').map(item => item.packet)
    assert.ok(snapshots.length > 0, net.networkingState.lastError)
    const seen = new Set()
    for (const packet of snapshots) {assert.equal(packet.payload.checksum, protocol.networkChecksum([...packet.payload.entities].sort((a, b) => a.uuid.localeCompare(b.uuid)))); assert.ok(packet.payload.entities.length <= 1024); assert.ok(protocol.utf8Bytes(protocol.stableNetworkJson(packet.payload)) <= 48000); for (const entity of packet.payload.entities) seen.add(entity.uuid)}
    assert.equal(seen.size, 2000)
  })

  await check('Cyclic and exponentially shared outgoing payloads fail within the validation work bound', async () => {
    const s = await session()
    const cyclic = []; cyclic.push(cyclic)
    let shared = [0]
    for (let i = 0; i < 8; i++) shared = Array.from({length: 16}, () => shared)
    const started = process.hrtime.bigint()
    assert.match(protocol.validateNetworkValue(cyclic), /depth/)
    assert.match(protocol.validateNetworkValue(shared), /work bound/)
    assert.equal(await net.sendNetworkPacket('rpc', shared, 'events'), false)
    assert.equal(s.sent.length, 0)
    return {elapsedMs: Number(process.hrtime.bigint() - started) / 1e6, maximumVisitedValues: 65536, hypotheticalExpandedLeaves: 16 ** 8}
  })

  await check('Parented snapshot corrections and interpolation preserve world coordinates independent of UUID order', async () => {
    for (const interpolate of [false, true]) {
      const parentId = 'f0000001-0000-4000-8000-000000000000', childId = definition.entityUuid
      const definitions = [childId, parentId].map(entityUuid => ({...definition, entityUuid, properties: ['transform', 'velocity'], interpolate}))
      const s = await session({role: 'client', replicatedEntities: definitions, interpolationMs: 100}, 'local-loopback')
      const parent = new boxes.BoxEntity(2, {x: 0, y: 0}, {x: 1, y: 1}, parentId), child = new boxes.BoxEntity(1, {x: 0, y: 0}, {x: 1, y: 1}, childId)
      child.parentUuid = parent.uuid
      const entities = [child, parent]
      s.admit('host')
      s.deliver(s.packet(1, 'snapshot', {entities: [{uuid: childId, position: [10, 0], velocity: [4, 0]}, {uuid: parentId, position: [5, 0]}], checksum: '', full: false}, {channel: 'state', delivery: 'unreliable-sequenced', security: {epoch: 'epoch-a', nonce: 'parent-snapshot', issuedAt: Date.now(), proof: ''}}))
      net.updateNetworking(entities, .05, input.emptyNetworkInput())
      assert.equal(hierarchy.worldTransform(parent, entities).position.x, interpolate ? 2.5 : 5)
      assert.equal(hierarchy.worldTransform(child, entities).position.x, interpolate ? 5 : 10)
      assert.equal(child.velocity.x, interpolate ? 2 : 4)
      settings.replicatedEntities = []
      net.updateNetworking(entities, .05, input.emptyNetworkInput())
      assert.equal(hierarchy.worldTransform(child, entities).position.x, interpolate ? 5 : 10)
    }
  })
  await check('Host relay snapshots cannot overwrite a locally owned object', async () => {
    const s = await session({role:'client',replicatedEntities:[{...definition,authority:'owner',ownerPeerId:net.networkingState.localPeerId}]},'local-loopback')
    s.admit('host')
    const body = new boxes.BoxEntity(1,{x:42,y:0},{x:1,y:1},definition.entityUuid)
    s.deliver(s.packet(1,'snapshot',{checksum:'',entities:[{uuid:body.uuid,position:[12,0]}]}, {channel:'state',delivery:'unreliable-sequenced',security:{epoch:'epoch-a',nonce:'host-relay',issuedAt:Date.now(),proof:''}}))
    net.updateNetworking([body],1/60,input.emptyNetworkInput())
    assert.equal(body.transform.position.x,42)
  })
  await check('RPC contracts added during a live session reach gameplay listeners', async () => {
    const s=await session(),received=[]
    packages.enableOfficialPackage(packages.OFFICIAL_NETWORKING_PACKAGE_ID)
    await productionRuntime.networkingModule()
    const unsubscribe=productionRuntime.onProductionRpc((name,value)=>received.push([name,value]))
    try {
      s.admit();settings.rpcContracts.push({...rpc,name:'added-live'})
      productionRuntime.updateProductionRuntime([],1/60,input.emptyNetworkInput())
      s.deliver(s.packet(2,'rpc',{name:'added-live',value:7}))
      assert.deepEqual(received,[['added-live',7]])
      settings.rpcContracts=settings.rpcContracts.filter(c=>c.name!=='added-live')
      productionRuntime.updateProductionRuntime([],1/60,input.emptyNetworkInput())
      s.deliver(s.packet(3,'rpc',{name:'added-live',value:8}))
      assert.deepEqual(received,[['added-live',7]])
    } finally {unsubscribe();await productionRuntime.stopProductionNetworking()}
  })
  await check('Late-join baseline applies only authored replication properties', async () => {
    const s=await session({role:'client',replicatedEntities:[{...definition,properties:['velocity']}]},'local-loopback')
    const body=new boxes.BoxEntity(1,{x:77,y:0},{x:1,y:1},definition.entityUuid);body.velocity.x=5;body.enabled=false
    const save=replay.exportMultiplayerSave([body],5);body.transform.position.x=12;body.velocity.x=0;body.enabled=true
    net.updateNetworking([body],1/60,input.emptyNetworkInput());s.admit('host')
    const document={format:'nova-network-baseline',version:1,save,authority:[{entityUuid:body.uuid,ownerPeerId:'remote'}],scenes:[]},source=protocol.stableNetworkJson(document)
    s.deliver(s.packet(2,'resync',{transferId:'masked',index:0,count:1,checksum:protocol.networkChecksum(source),chunk:source}))
    assert.equal(body.velocity.x,5);assert.equal(body.transform.position.x,12);assert.equal(body.enabled,true)
  })
  await check('Failed bootstrap delivery clears all unadmitted reliable packets', async () => {
    const s=await session({role:'client',reliableRetryMs:10,reliableMaximumAttempts:1})
    await net.sendNetworkPacket('hello',{role:'client',playerName:'Client',lateJoin:true},'events')
    clock+=5;await net.sendNetworkPacket('ping',{sentAt:clock},'events')
    clock+=6;net.updateNetworking([],1/60,input.emptyNetworkInput())
    assert.equal(net.networkingState.status,'error');assert.equal(net.networkRuntimeSnapshot().reliablePending,0)
  })

  await check('Late failed-start cleanup cannot close a replacement session service or schedule its reconnect', async () => {
    await session(); await net.stopNetworking(); settings.sessionMode='direct';settings.transportAdapterId=review.id;settings.services.identityProviderId=review.id;
    let releaseClose, enteredClose, created=0, currentServiceClosed=0;
    const closing=new Promise(done=>enteredClose=done);
    const removeService=services.registerReviewedNetworkService({review:{...review,kind:'identity',permissions:['network.client','identity.read']},async open(){const instance=created;return {kind:'identity',async request(){},async close(){if(instance===2)currentServiceClosed++}}}});
    const removeTransport=authority.registerReviewedNetworkTransport({review,create(){const instance=created++;return {kind:'adapter',async connect(){if(instance===0)throw Error('deliberate failed connect')},async send(){},async close(){if(instance===0){enteredClose();await new Promise(done=>releaseClose=done)}}}}});
    let pending;
    try{pending=net.startNetworking().then(()=>null,error=>error);await closing;await net.stopNetworking();await net.startNetworking();settings.reconnect=true;releaseClose();assert.match((await pending).message,/deliberate|cancel/i);assert.equal(currentServiceClosed,0);assert.equal(net.networkingState.status,'connected')}
    finally{releaseClose?.();await pending;await net.stopNetworking();removeTransport();removeService()}
  });
  await check('Maximum replicated population retains a bounded600-frame history and clears it on Stop', async () => {
    const definitions=Array.from({length:2000},(_,i)=>({...definition,entityUuid:(i+50000).toString(16).padStart(8,'0')+'-0000-4000-8000-000000000000'}))
    await session({replicatedEntities:definitions,rollbackFrames:600,snapshotRate:1})
    const entities=definitions.map((d,i)=>new boxes.BoxEntity(i+50000,{x:i,y:0},{x:1,y:1},d.entityUuid)),times=[],heapBefore=process.memoryUsage().heapUsed
    for(let frame=0;frame<720;frame++){clock+=1000/60;entities[0].transform.position.x=frame;const start=process.hrtime.bigint();net.updateNetworking(entities,1/60,input.emptyNetworkInput());times.push(Number(process.hrtime.bigint()-start)/1e6);assert.ok(net.networkRuntimeSnapshot().localHistory<=600)}
    assert.equal(net.networkRuntimeSnapshot().localHistory,600);const heapAfter=process.memoryUsage().heapUsed;await net.stopNetworking();assert.equal(net.networkRuntimeSnapshot().localHistory,0);assert.equal(net.networkRuntimeSnapshot().reliablePending,0);times.sort((a,b)=>a-b)
    return {entities:2000,updates:720,retainedFrames:600,retainedFrameEntityUpperBound:1200000,medianMs:times[360],p95Ms:times[Math.floor(times.length*.95)],maximumMs:times.at(-1),heapBefore,heapAfter,heapDelta:heapAfter-heapBefore,scope:'Actual networking update and transform history only; excludes solver/renderer, includes JS allocation/GC and concurrent host activity. Heap delta is not an isolated leak measurement.'}
  })
} catch (error) {
  checks.push({name:'Runtime module loading and suite setup',status:'failed',error:error.stack??String(error)})
} finally {if (networking) await networking.stopNetworking(); if (opened) await opened.close()}
const report = {...context.metadata(), sourceModuleLoader:'Production Vite SSR bundle / native ESM; original networking timers restored', host:{platform:process.platform,architecture:process.arch,node:process.version,cpu:cpus()[0]?.model,logicalCpus:cpus().length,totalMemoryBytes:totalmem()}, status: checks.every(item => item.status === 'passed') ? 'passed' : 'failed', scope: 'Programmer regression: actual runtime modules with explicit in-memory transport, controlled monotonic clock; not a user or multi-process audit.', checks}
await mkdir(dirname(context.reportPath), {recursive: true})
await writeFile(context.reportPath, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({status: report.status, checks, report: context.reportPath}, null, 2))
if (report.status !== 'passed') process.exitCode = 1
