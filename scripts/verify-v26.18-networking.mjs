/** 功能回归脚本：执行 verify-v26.18-networking.mjs 对应场景，保留断言和证据输出。 */
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
Object.defineProperty(globalThis, 'performance', {configurable: true, value: {now: /* 返回 clock 的当前值。 */ () => clock}})
globalThis.window = {setTimeout, clearTimeout, setInterval, clearInterval, /** 提供不注册监听器的测试事件接口。 */ addEventListener() {}, /** 提供无需移除监听器的测试事件接口。 */ removeEventListener() {}}
globalThis.localStorage = {/* 返回固定值 null。 */ getItem() {return null}, /** 隔离存储桩忽略写入，不持久化生成过程数据。 */ setItem() {}, /** 隔离存储桩忽略删除请求。 */ removeItem() {}}
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
  /** 重置网络设置并建立可控制时钟、收发和握手的测试会话。 */ async function session(overrides = {}, kind = 'adapter') {
    await net.stopNetworking()
    production.resetProductionSettings()
    settings = production.productionSettings.networking
    Object.assign(settings, {enabled: true, permissionGranted: true, autoStart: false, reconnect: false, role: 'host', maximumPacketBytes: 65507, bandwidthKbps: 1000000, maximumMessagesPerSecond: 10000, maximumPendingReliable: 256, rpcContracts: [rpc], ...overrides})
    for (const channel of settings.channels) {channel.messagesPerSecond = 10000; channel.maximumPayloadBytes = 48000}
    clock += 2000
    const sent = []
    let receive, sendHook
    await net.startNetworkingWithTransport({kind, /** 保存测试接收回调并报告连接成功。 */ async connect(handler, state) {receive = handler; state('connected')}, /** 记录发送的数据包与目标，并调用可选发送钩子模拟传输行为。 */ async send(source, target) {sent.push({packet: JSON.parse(source), target}); if (sendHook) await sendHook(JSON.parse(source), target)}, /** 提供无需释放真实传输资源的异步测试关闭接口。 */ async close() {}})
    const packet = /** 按当前会话和安全元数据构造指定序号、种类与负载的测试数据包。 */ (sequence, kind, payload, extra = {}) => protocol.createNetworkPacket({sessionId: net.networkingState.sessionId, sender: 'remote', channel: 'events', delivery: 'reliable-ordered', sequence, ack: null, tick: sequence, schema: settings.schemaVersion, kind, payload, security: {epoch: 'epoch-a', nonce: 'nonce-' + sequence, issuedAt: Date.now(), proof: ''}, ...extra})
    const deliver = /* 调用 receive(protocol.serializeNetworkPacket(p), 'remote') 并返回调用结果。 */ p => receive(protocol.serializeNetworkPacket(p), 'remote')
    return {sent, packet, deliver, /** 设置测试会话的发送钩子，以控制或观察数据包发送。 */ setSendHook(handler) {sendHook = handler}, /** 投递指定远端角色的握手包，使测试会话接纳远端。 */ admit(role = 'client') {deliver(packet(1, 'hello', {role, playerName: 'Remote', lateJoin: false}))}}
  }
  /** 执行网络检查并记录耗时或错误，无论结果如何均关闭网络会话。 */ async function check(name, run) {
    const began = process.hrtime.bigint()
    try {const observations = await run(); checks.push({name, status: 'passed', elapsedMs:Number(process.hrtime.bigint()-began)/1e6, ...(observations ? {observations} : {})})}
    catch (error) {checks.push({name, status: 'failed', error: error.stack ?? String(error)})}
    finally {await net.stopNetworking()}
  }
  await check('Rejected packet size does not consume an ordered sequence', /** 验证超出包大小限制的发送被拒绝且不会消耗后续成功发送的序号。 */ async () => {
    const s = await session()
    assert.equal(await net.sendNetworkPacket('rpc', {name: 'audit', value: 1}, 'events'), true)
    settings.maximumPacketBytes = 512
    assert.equal(await net.sendNetworkPacket('rpc', {name: 'audit', value: 'x'.repeat(450)}, 'events'), false)
    settings.maximumPacketBytes = 65507
    assert.equal(await net.sendNetworkPacket('rpc', {name: 'audit', value: 2}, 'events'), true)
    assert.equal(s.sent[1].packet.sequence, s.sent[0].packet.sequence + 1)
  })
  await check('Reliable-window backpressure does not consume an ordered sequence', /** 验证可靠发送队列满时拒绝新包，收到确认腾出容量后序号仍连续。 */ async () => {
    const s = await session({maximumPendingReliable: 1})
    s.admit()
    const first = s.sent.find(/* 比较 item.packet.kind 与 'join'，返回严格相等的判断结果。 */ item => item.packet.kind === 'join').packet
    let refused = false
    for (let i = 0; i < 1024; i++) if (!await net.sendNetworkPacket('rpc', {name: 'audit', value: 1}, 'events', 'remote')) {refused = true; break}
    assert.equal(refused, true)
    const previous = s.sent.findLast(/* 比较 item.packet.kind 与 'ack'，返回严格不等的判断结果。 */ item => item.packet.kind !== 'ack').packet.sequence
    s.deliver(s.packet(0, 'ack', null, {ack: first.sequence, security: {epoch: 'epoch-a', nonce: 'ack-join', issuedAt: Date.now(), proof: ''}}))
    assert.equal(await net.sendNetworkPacket('rpc', {name: 'audit', value: 2}, 'events', 'remote'), true)
    const last = s.sent.findLast(/* 比较 item.packet.kind 与 'rpc'，返回严格相等的判断结果。 */ item => item.packet.kind === 'rpc').packet
    assert.equal(last.sequence, previous + 1)
  })
  await check('A channel-throttled reliable packet can be accepted when retried', /** 验证被接收限速暂时拒绝的可靠包可在限速窗口结束后重试成功。 */ async () => {
    const s = await session()
    settings.channels.find(/* 比较 channel.id 与 'events'，返回严格相等的判断结果。 */ channel => channel.id === 'events').messagesPerSecond = 2
    const values = [], unregister = net.registerRpc('audit', /* 调用 values.push(value) 并返回调用结果。 */ value => values.push(value))
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
  await check('Invalid late-join ownership preserves entity transforms and ownership', /** 验证含未知实体所有权的基线被原子拒绝，不改变实体位置或授予非法所有权。 */ async () => {
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
    assert.equal(s.sent.some(/* 先计算 item.packet.kind === 'ack'；仅当其为真值时求右侧 item.packet.ack === 2，返回短路求值结果。 */ item => item.packet.kind === 'ack' && item.packet.ack === 2), false)
    assert.equal(net.networkingState.peers, 0)
    assert.deepEqual(net.networkingState.ownership.map(/** 浅拷贝记录，保留检查时的数据快照。 */ item => ({...item})), [{entityUuid: '00000001-0000-4000-8000-000000000000', ownerPeerId: ''}])
  })
  await check('Authority restore rejects malformed entries and over-bound trailing data atomically', /** 验证非法或超量所有权恢复输入被拒绝，并保留原有所有权表。 */ () => {
    const table = new authority.NetworkAuthorityTable()
    table.initialize([definition], 'host', 'host')
    assert.equal(table.restore([null], [definition]), false)
    assert.equal(table.owner('00000001-0000-4000-8000-000000000000'), 'host')
    const definitions = Array.from({length: 2000}, /** 以顺序实体名称生成大规模所有权恢复测试定义。 */ (_, i) => ({...definition, entityUuid: 'body-' + i}))
    table.initialize(definitions, 'host', 'host')
    const entries = definitions.map(/** 将实体定义转换为由客户端持有的所有权记录。 */ item => ({entityUuid: item.entityUuid, ownerPeerId: 'client'}))
    assert.equal(table.restore([...entries, {entityUuid: 'excess', ownerPeerId: 'client'}], definitions), false)
    assert.equal(table.owner('body-0'), 'host')
  })
  await check('A peer cannot change its admitted epoch with a gameplay packet', /** 验证会话接纳后拒绝来自不同安全世代的 RPC 包。 */ async () => {
    const s = await session()
    const values = [], unregister = net.registerRpc('audit', /* 调用 values.push(value) 并返回调用结果。 */ value => values.push(value))
    try {
      s.admit()
      s.deliver(s.packet(2, 'rpc', {name: 'audit', value: 2}, {security: {epoch: 'different-epoch', nonce: 'different-nonce', issuedAt: Date.now(), proof: ''}}))
      assert.deepEqual(values, [])
    } finally {unregister()}
  })

  await check('Incoming snapshots obey the authored property allowlist', /** 验证状态复制只更新授权属性，不修改未声明的旋转和速度。 */ async () => {
    const s = await session({role: 'client', replicatedEntities: [definition]}, 'local-loopback')
    const body = new boxes.BoxEntity(1, {x: 0, y: 0}, {x: 1, y: 1}, definition.entityUuid)
    s.admit('host')
    s.deliver(s.packet(1, 'snapshot', {entities: [{uuid: body.uuid, position: [3, 4], rotation: 2, velocity: [8, 9]}], checksum: '', full: false}, {channel: 'state', delivery: 'unreliable-sequenced', security: {epoch: 'epoch-a', nonce: 'snapshot-1', issuedAt: Date.now(), proof: ''}}))
    net.updateNetworking([body], 1 / 60, input.emptyNetworkInput())
    assert.equal(body.transform.position.x, 3)
    assert.equal(body.transform.rotation, 0)
    assert.deepEqual({...body.velocity}, {x: 0, y: 0})
  })
  await check('Unassigned owner replication cannot be claimed by an arbitrary client', /** 验证没有实体所有权的普通客户端快照不能改变实体位置。 */ async () => {
    const s = await session({role: 'client', replicatedEntities: [{...definition, authority: 'owner', ownerPeerId: ''}]}, 'local-loopback')
    const body = new boxes.BoxEntity(1, {x: 0, y: 0}, {x: 1, y: 1}, definition.entityUuid)
    s.admit('client')
    s.deliver(s.packet(1, 'snapshot', {entities: [{uuid: body.uuid, position: [99, 0]}], checksum: '', full: false}, {channel: 'state', delivery: 'unreliable-sequenced', security: {epoch: 'epoch-a', nonce: 'snapshot-1', issuedAt: Date.now(), proof: ''}}))
    net.updateNetworking([body], 1 / 60, input.emptyNetworkInput())
    assert.equal(body.transform.position.x, 0)
  })
  const review = {id: 'top.nova.audit18', label: 'Audit fixture', version: '1.0.0', publisher: 'Whitelist', sha256: 'a'.repeat(64), reviewedBy: 'Whitelist', permissions: ['network.client', 'network.listen'], encrypted: true, documentationUrl: 'https://example.invalid/docs', securityUrl: 'https://example.invalid/security'}
  await check('A reviewed service returned after cancellation is closed without becoming active', /** 验证服务打开期间取消请求会拒绝结果，并关闭随后才创建的服务资源。 */ async () => {
    await session()
    const abort = new AbortController()
    let resolveOpen, closed = 0
    const unregister = services.registerReviewedNetworkService({review: {...review, kind: 'identity', permissions: ['network.client', 'identity.read']}, open: /** 返回可由测试代码手动完成的服务打开承诺。 */ () => new Promise(/** 保存服务打开承诺的完成函数，以模拟取消后的延迟完成。 */ resolve => {resolveOpen = resolve})})
    settings.services.identityProviderId = review.id
    try {
      const pending = services.openReviewedNetworkService('identity', settings, {sessionId: 'audit', localPeerId: 'local', role: 'client', signal: abort.signal})
      abort.abort()
      resolveOpen({kind: 'identity', /** 提供无需返回数据的异步请求桩，供服务生命周期测试使用。 */ async request() {}, /** 递增测试服务的关闭次数。 */ async close() {closed++}})
      await assert.rejects(pending, /cancel|abort/i)
      assert.equal(closed, 1)
    } finally {unregister()}
  })
  await check('Stop during real adapter connection prevents late completion and callbacks from reviving the session', /** 验证连接过程中停止网络后，迟到的连接和消息回调不会重新启用会话。 */ async () => {
    await session()
    await net.stopNetworking()
    settings.sessionMode = 'direct'; settings.transportAdapterId = review.id
    let resolveConnect, stateCallback, messageCallback, closed = 0
    const entered = new Promise(/** 注册可延迟完成连接的测试传输，并保存注销函数供清理。 */ resolve => {
      const unregister = authority.registerReviewedNetworkTransport({review, create: /** 创建具备可控连接及异步发送、关闭接口的传输测试对象。 */ () => ({kind: 'adapter', /** 保存消息与状态回调并通知测试已进入连接阶段，再等待手动完成连接。 */ connect(message, state) {messageCallback = message; stateCallback = state; resolve(); return new Promise(/** 保存连接承诺完成函数，供停止会话后的迟到连接测试使用。 */ done => {resolveConnect = done})}, /** 提供不执行传输操作的异步测试发送接口。 */ async send() {}, /** 递增测试服务的关闭次数。 */ async close() {closed++}})})
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

  await check('Explicit live owner edits reach ownership while unrelated property edits preserve transfers', /** 验证动态复制配置更新所有者，同时保留运行时转移结果，并在移除定义后清理所有权。 */ async () => {
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
  await check('Revoking permission blocks already connected incoming RPCs', /** 验证撤销网络权限后不再执行收到的 RPC 且连接不再保持已连接状态。 */ async () => {
    const s = await session(), values = [], unregister = net.registerRpc('audit', /* 调用 values.push(value) 并返回调用结果。 */ value => values.push(value))
    try {s.admit(); settings.permissionGranted = false; s.deliver(s.packet(2, 'rpc', {name: 'audit', value: 7})); assert.deepEqual(values, []); assert.notEqual(net.networkingState.status, 'connected')}
    finally {unregister()}
  })
  await check('An RPC cannot bypass its authored reliable channel through state traffic', /** 验证 RPC 不能通过错误的状态通道和交付模式绕过协议约束。 */ async () => {
    const s = await session(), values = [], unregister = net.registerRpc('audit', /* 调用 values.push(value) 并返回调用结果。 */ value => values.push(value))
    try {s.admit(); s.deliver(s.packet(1, 'rpc', {name: 'audit', value: 7}, {channel: 'state', delivery: 'unreliable-sequenced', security: {epoch: 'epoch-a', nonce: 'wrong-channel', issuedAt: Date.now(), proof: ''}})); assert.deepEqual(values, [])}
    finally {unregister()}
  })
  await check('Manual save restoration preserves unacknowledged reliable traffic and the live network clock', /** 验证恢复多人存档不会重置当前会话的可靠队列或网络时钟。 */ async () => {
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

  await check('Fresh lifecycle epoch reconnects but the retired epoch cannot return', /** 验证重新握手切换安全世代后，旧握手和旧 RPC 重放不会替换当前会话。 */ async () => {
    const s = await session(), values = [], unregister = net.registerRpc('audit', /* 调用 values.push(value) 并返回调用结果。 */ value => values.push(value))
    const envelope = /** 构造指定安全世代与随机标识的测试安全信封。 */ (epoch, nonce) => ({epoch, nonce, issuedAt: Date.now(), proof: ''})
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
  await check('Receive-window refusal does not poison an eventual reliable retry', /** 验证乱序可靠包等待缺失前序包，补齐后按序执行且允许重试。 */ async () => {
    const s = await session({maximumPendingReliable: 1}), values = [], unregister = net.registerRpc('audit', /* 调用 values.push(value) 并返回调用结果。 */ value => values.push(value))
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
  await check('Exhausted reliable delivery retires the peer and reports actionable failure', /** 验证可靠包确认耗尽重试次数后移除远端并清空待确认队列。 */ async () => {
    const s = await session({reliableRetryMs: 10, reliableMaximumAttempts: 1})
    s.admit()
    assert.equal(net.networkingState.peers, 1)
    clock += 100
    net.updateNetworking([], 1 / 60, input.emptyNetworkInput())
    assert.equal(net.networkingState.peers, 0)
    assert.match(net.networkingState.lastError, /reliable|acknowledg/i)
    assert.equal(net.networkRuntimeSnapshot().reliablePending, 0)
  })

  await check('Multi-chunk baseline holds deferred gameplay until every chunk is queued and acknowledged', /** 验证分块基线发送完成前暂停 RPC，完成后放行，并确保每块满足通道负载限制。 */ async () => {
    const definitions = Array.from({length: 8}, /** 生成八实体基线测试使用的唯一复制定义。 */ (_, i) => ({...definition, entityUuid: (i + 10).toString(16).padStart(8, '0') + '-0000-4000-8000-000000000000'}))
    const s = await session({replicatedEntities: definitions})
    settings.channels.find(/* 比较 channel.id 与 'events'，返回严格相等的判断结果。 */ channel => channel.id === 'events').maximumPayloadBytes = 1024
    const entities = definitions.map(/** 按复制定义创建带顺序位置的基线分块测试实体。 */ (def, i) => new boxes.BoxEntity(i + 10, {x: i, y: 0}, {x: 1, y: 1}, def.entityUuid))
    net.updateNetworking(entities, 1 / 60, input.emptyNetworkInput())
    let releaseFirst
    const gate = new Promise(/** 保存首个基线分块发送的放行函数。 */ resolve => {releaseFirst = resolve})
    let held = false
    s.setSendHook(/** 仅暂停首次基线重同步发送，以检查握手期间的数据屏障。 */ packet => {if (packet.kind === 'resync' && !held) {held = true; return gate}})
    const values = [], unregister = net.registerRpc('audit', /* 调用 values.push(value) 并返回调用结果。 */ value => values.push(value)), acknowledged = new Set()
    const acknowledge = /** 记录已确认序号并向测试会话投递对应确认包。 */ packet => {acknowledged.add(packet.sequence); s.deliver(s.packet(0, 'ack', null, {ack: packet.sequence, security: {epoch: 'epoch-a', nonce: 'ack-' + packet.sequence, issuedAt: Date.now(), proof: ''}}))}
    try {
      s.admit()
      const first = s.sent.find(/* 比较 item.packet.kind 与 'resync'，返回严格相等的判断结果。 */ item => item.packet.kind === 'resync')?.packet
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
      const chunks = s.sent.filter(/* 比较 item.packet.kind 与 'resync'，返回严格相等的判断结果。 */ item => item.packet.kind === 'resync').map(/* 返回 item.packet 的当前值。 */ item => item.packet)
      assert.equal(chunks.length, first.payload.count)
      for (const packet of chunks) assert.ok(protocol.utf8Bytes(protocol.stableNetworkJson(packet.payload)) <= 1024)
    } finally {releaseFirst(); unregister()}
  })

  await check('Large late-join baseline chunks include JSON escaping in their byte budget', /** 验证大型迟加入基线完整分块发送，且每个负载符合默认字节上限。 */ async () => {
    const definitions = Array.from({length: 300}, /** 生成三百实体基线压力测试的唯一复制定义。 */ (_, i) => ({...definition, entityUuid: (i + 100).toString(16).padStart(8, '0') + '-0000-4000-8000-000000000000'}))
    const s = await session({replicatedEntities: definitions})
    const entities = definitions.map(/** 创建大型迟加入基线测试的顺序实体和位置。 */ (def, i) => new boxes.BoxEntity(i + 100, {x: i, y: 0}, {x: 1, y: 1}, def.entityUuid))
    net.updateNetworking(entities, 1 / 60, input.emptyNetworkInput())
    s.admit()
    const acknowledged = new Set()
    for (let i = 0; i < 5000; i++) {
      await Promise.resolve()
      for (const {packet} of [...s.sent]) if (['join', 'resync'].includes(packet.kind) && !acknowledged.has(packet.sequence)) {acknowledged.add(packet.sequence); s.deliver(s.packet(0, 'ack', null, {ack: packet.sequence, security: {epoch: 'epoch-a', nonce: 'large-ack-' + packet.sequence, issuedAt: Date.now(), proof: ''}}))}
      const chunks = s.sent.filter(/* 比较 item.packet.kind 与 'resync'，返回严格相等的判断结果。 */ item => item.packet.kind === 'resync')
      if (chunks.length && chunks.length === chunks[0].packet.payload.count) break
    }
    const chunks = s.sent.filter(/* 比较 item.packet.kind 与 'resync'，返回严格相等的判断结果。 */ item => item.packet.kind === 'resync').map(/* 返回 item.packet 的当前值。 */ item => item.packet)
    assert.ok(chunks.length > 1, net.networkingState.lastError)
    assert.equal(chunks.length, chunks[0].payload.count)
    for (const packet of chunks) assert.ok(protocol.utf8Bytes(protocol.stableNetworkJson(packet.payload)) <= 48000)
  })

  await check('All 2000 replicated entities receive bounded fair snapshot pages', /** 验证两千实体快照分批发送覆盖全部实体，并符合校验和、实体数量和字节限制。 */ async () => {
    const definitions = Array.from({length: 2000}, /** 生成两千实体快照测试的唯一复制定义。 */ (_, i) => ({...definition, entityUuid: (i + 1000).toString(16).padStart(8, '0') + '-0000-4000-8000-000000000000'}))
    const s = await session({replicatedEntities: definitions, snapshotRate: 20, rollbackFrames: 0})
    const entities = definitions.map(/** 按定义创建大规模快照测试实体。 */ (def, i) => new boxes.BoxEntity(i + 1000, {x: i, y: 0}, {x: 1, y: 1}, def.entityUuid))
    s.admit()
    for (let i = 0; i < 20; i++) {net.updateNetworking(entities, .05, input.emptyNetworkInput()); await Promise.resolve()}
    const snapshots = s.sent.filter(/* 比较 item.packet.kind 与 'snapshot'，返回严格相等的判断结果。 */ item => item.packet.kind === 'snapshot').map(/* 返回 item.packet 的当前值。 */ item => item.packet)
    assert.ok(snapshots.length > 0, net.networkingState.lastError)
    const seen = new Set()
    for (const packet of snapshots) {assert.equal(packet.payload.checksum, protocol.networkChecksum([...packet.payload.entities].sort(/* 调用 a.uuid.localeCompare(b.uuid) 并返回调用结果。 */ (a, b) => a.uuid.localeCompare(b.uuid)))); assert.ok(packet.payload.entities.length <= 1024); assert.ok(protocol.utf8Bytes(protocol.stableNetworkJson(packet.payload)) <= 48000); for (const entity of packet.payload.entities) seen.add(entity.uuid)}
    assert.equal(seen.size, 2000)
  })

  await check('Cyclic and exponentially shared outgoing payloads fail within the validation work bound', /** 验证循环和指数展开共享数据受深度及工作量限制，发送被拒绝且不产生数据包。 */ async () => {
    const s = await session()
    const cyclic = []; cyclic.push(cyclic)
    let shared = [0]
    for (let i = 0; i < 8; i++) shared = Array.from({length: 16}, /* 返回 shared 的当前值。 */ () => shared)
    const started = process.hrtime.bigint()
    assert.match(protocol.validateNetworkValue(cyclic), /depth/)
    assert.match(protocol.validateNetworkValue(shared), /work bound/)
    assert.equal(await net.sendNetworkPacket('rpc', shared, 'events'), false)
    assert.equal(s.sent.length, 0)
    return {elapsedMs: Number(process.hrtime.bigint() - started) / 1e6, maximumVisitedValues: 65536, hypotheticalExpandedLeaves: 16 ** 8}
  })

  await check('Parented snapshot corrections and interpolation preserve world coordinates independent of UUID order', /** 验证父子实体无论列表顺序及插值开关如何，世界坐标和速度复制均正确，移除定义后停止更新。 */ async () => {
    for (const interpolate of [false, true]) {
      const parentId = 'f0000001-0000-4000-8000-000000000000', childId = definition.entityUuid
      const definitions = [childId, parentId].map(/** 生成包含变换、速度和指定插值开关的实体复制定义。 */ entityUuid => ({...definition, entityUuid, properties: ['transform', 'velocity'], interpolate}))
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
  await check('Host relay snapshots cannot overwrite a locally owned object', /** 验证本地拥有实体不会被主机转发的旧快照覆盖。 */ async () => {
    const s = await session({role:'client',replicatedEntities:[{...definition,authority:'owner',ownerPeerId:net.networkingState.localPeerId}]},'local-loopback')
    s.admit('host')
    const body = new boxes.BoxEntity(1,{x:42,y:0},{x:1,y:1},definition.entityUuid)
    s.deliver(s.packet(1,'snapshot',{checksum:'',entities:[{uuid:body.uuid,position:[12,0]}]}, {channel:'state',delivery:'unreliable-sequenced',security:{epoch:'epoch-a',nonce:'host-relay',issuedAt:Date.now(),proof:''}}))
    net.updateNetworking([body],1/60,input.emptyNetworkInput())
    assert.equal(body.transform.position.x,42)
  })
  await check('RPC contracts added during a live session reach gameplay listeners', /** 验证运行时新增 RPC 合约立即可接收，删除后不再派发该 RPC。 */ async () => {
    const s=await session(),received=[]
    packages.enableOfficialPackage(packages.OFFICIAL_NETWORKING_PACKAGE_ID)
    await productionRuntime.networkingModule()
    const unsubscribe=productionRuntime.onProductionRpc(/* 调用 received.push([name,value]) 并返回调用结果。 */ (name,value)=>received.push([name,value]))
    try {
      s.admit();settings.rpcContracts.push({...rpc,name:'added-live'})
      productionRuntime.updateProductionRuntime([],1/60,input.emptyNetworkInput())
      s.deliver(s.packet(2,'rpc',{name:'added-live',value:7}))
      assert.deepEqual(received,[['added-live',7]])
      settings.rpcContracts=settings.rpcContracts.filter(/* 比较 c.name 与 'added-live'，返回严格不等的判断结果。 */ c=>c.name!=='added-live')
      productionRuntime.updateProductionRuntime([],1/60,input.emptyNetworkInput())
      s.deliver(s.packet(3,'rpc',{name:'added-live',value:8}))
      assert.deepEqual(received,[['added-live',7]])
    } finally {unsubscribe();await productionRuntime.stopProductionNetworking()}
  })
  await check('Late-join baseline applies only authored replication properties', /** 验证迟加入基线遵守属性掩码，只恢复速度而不覆盖位置和启用状态。 */ async () => {
    const s=await session({role:'client',replicatedEntities:[{...definition,properties:['velocity']}]},'local-loopback')
    const body=new boxes.BoxEntity(1,{x:77,y:0},{x:1,y:1},definition.entityUuid);body.velocity.x=5;body.enabled=false
    const save=replay.exportMultiplayerSave([body],5);body.transform.position.x=12;body.velocity.x=0;body.enabled=true
    net.updateNetworking([body],1/60,input.emptyNetworkInput());s.admit('host')
    const document={format:'nova-network-baseline',version:1,save,authority:[{entityUuid:body.uuid,ownerPeerId:'remote'}],scenes:[]},source=protocol.stableNetworkJson(document)
    s.deliver(s.packet(2,'resync',{transferId:'masked',index:0,count:1,checksum:protocol.networkChecksum(source),chunk:source}))
    assert.equal(body.velocity.x,5);assert.equal(body.transform.position.x,12);assert.equal(body.enabled,true)
  })
  await check('Failed bootstrap delivery clears all unadmitted reliable packets', /** 验证客户端握手可靠包重试耗尽时进入错误状态并清空待确认队列。 */ async () => {
    const s=await session({role:'client',reliableRetryMs:10,reliableMaximumAttempts:1})
    await net.sendNetworkPacket('hello',{role:'client',playerName:'Client',lateJoin:true},'events')
    clock+=5;await net.sendNetworkPacket('ping',{sentAt:clock},'events')
    clock+=6;net.updateNetworking([],1/60,input.emptyNetworkInput())
    assert.equal(net.networkingState.status,'error');assert.equal(net.networkRuntimeSnapshot().reliablePending,0)
  })

  await check('Late failed-start cleanup cannot close a replacement session service or schedule its reconnect', /** 验证旧连接失败后的延迟清理不会关闭新会话的身份服务或改变其已连接状态。 */ async () => {
    await session(); await net.stopNetworking(); settings.sessionMode='direct';settings.transportAdapterId=review.id;settings.services.identityProviderId=review.id;
    let releaseClose, enteredClose, created=0, currentServiceClosed=0;
    const closing=new Promise(/** 保存开始关闭旧传输时的通知函数。 */ done=>enteredClose=done);
    const removeService=services.registerReviewedNetworkService({review:{...review,kind:'identity',permissions:['network.client','identity.read']},/** 创建绑定当前实例编号的身份服务，供跨会话清理隔离测试使用。 */ async open(){const instance=created;return {kind:'identity',/** 提供无需返回数据的异步请求桩，供服务生命周期测试使用。 */ async request(){},/** 仅统计当前身份服务实例被关闭的次数。 */ async close(){if(instance===2)currentServiceClosed++}}}});
    const removeTransport=authority.registerReviewedNetworkTransport({review,/** 分配递增实例编号并创建用于连接失败及延迟关闭测试的传输对象。 */ create(){const instance=created++;return {kind:'adapter',/** 让首个传输连接故意失败，以触发旧会话清理。 */ async connect(){if(instance===0)throw Error('deliberate failed connect')},/** 提供不执行传输操作的异步测试发送接口。 */ async send(){},/** 首个传输关闭时通知测试并暂停，模拟与新会话并发的旧清理。 */ async close(){if(instance===0){enteredClose();await new Promise(/** 保存旧传输关闭的放行函数。 */ done=>releaseClose=done)}}}}});
    let pending;
    try{pending=net.startNetworking().then(/* 返回固定值 null。 */ ()=>null,/* 返回 error 的当前值。 */ error=>error);await closing;await net.stopNetworking();await net.startNetworking();settings.reconnect=true;releaseClose();assert.match((await pending).message,/deliberate|cancel/i);assert.equal(currentServiceClosed,0);assert.equal(net.networkingState.status,'connected')}
    finally{releaseClose?.();await pending;await net.stopNetworking();removeTransport();removeService()}
  });
  await check('Maximum replicated population retains a bounded600-frame history and clears it on Stop', /** 测量两千实体网络更新及六百帧历史保留，验证历史容量有界且停止会话后清空缓存。 */ async () => {
    const definitions=Array.from({length:2000},/** 生成网络历史性能检查使用的唯一实体复制定义。 */ (_,i)=>({...definition,entityUuid:(i+50000).toString(16).padStart(8,'0')+'-0000-4000-8000-000000000000'}))
    await session({replicatedEntities:definitions,rollbackFrames:600,snapshotRate:1})
    const entities=definitions.map(/** 创建网络历史容量检查使用的实体和初始位置。 */ (d,i)=>new boxes.BoxEntity(i+50000,{x:i,y:0},{x:1,y:1},d.entityUuid)),times=[],heapBefore=process.memoryUsage().heapUsed
    for(let frame=0;frame<720;frame++){clock+=1000/60;entities[0].transform.position.x=frame;const start=process.hrtime.bigint();net.updateNetworking(entities,1/60,input.emptyNetworkInput());times.push(Number(process.hrtime.bigint()-start)/1e6);assert.ok(net.networkRuntimeSnapshot().localHistory<=600)}
    assert.equal(net.networkRuntimeSnapshot().localHistory,600);const heapAfter=process.memoryUsage().heapUsed;await net.stopNetworking();assert.equal(net.networkRuntimeSnapshot().localHistory,0);assert.equal(net.networkRuntimeSnapshot().reliablePending,0);times.sort(/* 计算表达式 a-b 并返回结果，沿用操作数的原有类型规则。 */ (a,b)=>a-b)
    return {entities:2000,updates:720,retainedFrames:600,retainedFrameEntityUpperBound:1200000,medianMs:times[360],p95Ms:times[Math.floor(times.length*.95)],maximumMs:times.at(-1),heapBefore,heapAfter,heapDelta:heapAfter-heapBefore,scope:'Actual networking update and transform history only; excludes solver/renderer, includes JS allocation/GC and concurrent host activity. Heap delta is not an isolated leak measurement.'}
  })
} catch (error) {
  checks.push({name:'Runtime module loading and suite setup',status:'failed',error:error.stack??String(error)})
} finally {if (networking) await networking.stopNetworking(); if (opened) await opened.close()}
const report = {...context.metadata(), sourceModuleLoader:'Production Vite SSR bundle / native ESM; original networking timers restored', host:{platform:process.platform,architecture:process.arch,node:process.version,cpu:cpus()[0]?.model,logicalCpus:cpus().length,totalMemoryBytes:totalmem()}, status: checks.every(/* 比较 item.status 与 'passed'，返回严格相等的判断结果。 */ item => item.status === 'passed') ? 'passed' : 'failed', scope: 'Programmer regression: actual runtime modules with explicit in-memory transport, controlled monotonic clock; not a user or multi-process audit.', checks}
await mkdir(dirname(context.reportPath), {recursive: true})
await writeFile(context.reportPath, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({status: report.status, checks, report: context.reportPath}, null, 2))
if (report.status !== 'passed') process.exitCode = 1
