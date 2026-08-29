<template>
  <section class="network-studio">
    <header class="studio-header">
      <div><strong>{{ t('networkStudio') }}</strong><span>{{ t('networkStudioHint') }}</span></div>
      <nav :aria-label="t('networkStudio')"><button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ t(tab.label) }}</button></nav>
      <output :class="networkState?.status ?? 'disabled'">{{ networkStatusLabel }}</output>
    </header>

    <main v-if="!networkPackageEnabled" class="empty-state">
      <strong>{{ t('optionalNetworking') }}</strong><p>{{ t('networkingOptionalHint') }}</p><button class="primary" @click="installNetworking">{{ t('enableNetworkingPackage') }}</button>
    </main>

    <main v-else-if="activeTab === 'session'" class="studio-grid">
      <section class="card">
        <header><strong>{{ t('session') }}</strong><span>{{ t('noMandatoryCloud') }}</span></header>
        <label><span>{{ t('networkingEnabled') }}</span><input v-model="settings.networking.enabled" type="checkbox" @change="commit"></label>
        <label><span>{{ t('networkPermission') }}</span><output>{{ settings.networking.permissionGranted ? t('granted') : t('notGranted') }}</output></label>
        <div class="button-row"><button v-if="!settings.networking.permissionGranted" class="primary" @click="grantPermission">{{ t('grantNetworkPermission') }}</button><button v-else class="danger-button" @click="revokePermission">{{ t('revokeNetworkPermission') }}</button></div>
        <label><span>{{ t('autoStart') }}</span><input v-model="settings.networking.autoStart" type="checkbox" :disabled="!settings.networking.permissionGranted" @change="commit"></label>
        <label><span>{{ t('sessionMode') }}</span><select v-model="settings.networking.sessionMode" @change="commit"><option value="local">{{ t('localLobby') }}</option><option value="direct">{{ t('directConnect') }}</option></select></label>
        <label><span>{{ t('networkRole') }}</span><select v-model="settings.networking.role" @change="commit"><option value="client">{{ t('client') }}</option><option value="server">{{ t('server') }}</option><option value="host">{{ t('host') }}</option></select></label>
        <label><span>{{ t('sessionName') }}</span><input v-model="settings.networking.sessionName" maxlength="80" @change="commit"></label>
        <label><span>{{ t('playerName') }}</span><input v-model="settings.networking.playerName" maxlength="80" @change="commit"></label>
        <label><span>{{ t('maximumPeers') }}</span><input v-model.number="settings.networking.maxPeers" type="number" min="1" max="64" @change="commit"></label>
      </section>
      <section class="card">
        <header><strong>{{ settings.networking.sessionMode === 'local' ? t('localLobby') : t('directConnect') }}</strong><span>{{ t('protocol') }} 2 · {{ t('networkSchema') }} {{ settings.networking.schemaVersion }}</span></header>
        <p>{{ settings.networking.sessionMode === 'local' ? t('localLobbyHint') : t('directConnectHint') }}</p>
        <template v-if="settings.networking.sessionMode === 'direct'">
          <label><span>{{ t('transport') }}</span><select v-model="settings.networking.transport" @change="commit"><option value="websocket">WebSocket</option><option value="native-udp">Native UDP</option></select></label>
          <label><span>{{ t('endpoint') }}</span><input v-model="settings.networking.endpoint" maxlength="512" spellcheck="false" @change="commit"></label>
          <label><span>{{ t('bindAddress') }}</span><input v-model="settings.networking.bindAddress" maxlength="256" spellcheck="false" @change="commit"></label>
        </template>
        <label><span>{{ t('autoReconnect') }}</span><input v-model="settings.networking.reconnect" type="checkbox" @change="commit"></label>
        <label><span>{{ t('reconnectLimit') }}</span><input v-model.number="settings.networking.reconnectMaxAttempts" type="number" min="0" max="32" @change="commit"></label>
        <label><span>{{ t('lateJoin') }}</span><input v-model="settings.networking.lateJoin" type="checkbox" @change="commit"></label>
        <div class="button-row"><button class="primary" :disabled="networkBusy || !canConnect" @click="connect">{{ t('connect') }}</button><button :disabled="networkBusy || networkState?.status === 'disabled'" @click="disconnect">{{ t('disconnect') }}</button></div>
        <p v-if="networkState?.lastError" class="danger">{{ networkState.lastError }}</p>
      </section>
      <section class="card peers-card">
        <header><strong>{{ t('peers') }}</strong><span>{{ networkState?.peers ?? 0 }}/{{ settings.networking.maxPeers }}</span></header>
        <article v-for="peer in networkState?.peerDetails ?? []" :key="peer.id"><span><strong>{{ peer.name }}</strong><small>{{ peer.role }}</small></span><code>{{ peer.id }}</code></article>
        <p v-if="!networkState?.peerDetails.length">{{ t('noPeersConnected') }}</p>
      </section>
    </main>

    <main v-else-if="activeTab === 'protocol'" class="studio-grid wide-grid">
      <section class="card span-two">
        <header><strong>{{ t('networkChannels') }}</strong><button :disabled="settings.networking.channels.length >= 32" @click="addChannel">＋ {{ t('channel') }}</button></header>
        <div class="table-scroll"><article v-for="channel in settings.networking.channels" :key="channel.id" class="channel-row"><input v-model="channel.id" maxlength="80" :disabled="builtInChannels.includes(channel.id)" @change="commit"><select v-model="channel.delivery" @change="commit"><option value="reliable-ordered">{{ t('reliableOrdered') }}</option><option value="unreliable-sequenced">{{ t('unreliableSequenced') }}</option></select><label><span>{{ t('payloadBytes') }}</span><input v-model.number="channel.maximumPayloadBytes" type="number" min="32" max="65507" @change="commit"></label><label><span>{{ t('ratePerSecond') }}</span><input v-model.number="channel.messagesPerSecond" type="number" min="1" max="2000" @change="commit"></label><label><span>{{ t('priority') }}</span><input v-model.number="channel.priority" type="number" min="0" max="100" @change="commit"></label><button :disabled="builtInChannels.includes(channel.id)" @click="removeChannel(channel.id)">×</button></article></div>
      </section>
      <section class="card limits-card">
        <header><strong>{{ t('protocolBounds') }}</strong><span>{{ t('failClosed') }}</span></header>
        <label><span>{{ t('packetBytes') }}</span><input v-model.number="settings.networking.maximumPacketBytes" type="number" min="512" max="65507" @change="commit"></label>
        <label><span>{{ t('messageRate') }}</span><input v-model.number="settings.networking.maximumMessagesPerSecond" type="number" min="1" max="10000" @change="commit"></label>
        <label><span>{{ t('pendingReliable') }}</span><input v-model.number="settings.networking.maximumPendingReliable" type="number" min="1" max="4096" @change="commit"></label>
        <label><span>{{ t('retryMs') }}</span><input v-model.number="settings.networking.reliableRetryMs" type="number" min="10" max="5000" @change="commit"></label>
        <label><span>{{ t('retryLimit') }}</span><input v-model.number="settings.networking.reliableMaximumAttempts" type="number" min="1" max="32" @change="commit"></label>
        <label><span>{{ t('bandwidthLimit') }}</span><input v-model.number="settings.networking.bandwidthKbps" type="number" min="8" max="1000000" @change="commit"></label>
      </section>
      <section class="card span-three">
        <header><strong>RPC</strong><button :disabled="settings.networking.rpcContracts.length >= 256" @click="addRpc">＋ RPC</button></header>
        <div class="table-scroll"><article v-for="rpc in settings.networking.rpcContracts" :key="rpc.name" class="rpc-row"><input v-model="rpc.name" maxlength="80" @change="commit"><select v-model="rpc.channelId" @change="commit"><option v-for="channel in settings.networking.channels" :key="channel.id" :value="channel.id">{{ channel.id }}</option></select><select v-model="rpc.direction" @change="commit"><option value="client-to-server">{{ t('client') }} → {{ t('server') }}</option><option value="server-to-client">{{ t('server') }} → {{ t('client') }}</option><option value="bidirectional">{{ t('bidirectional') }}</option></select><select v-model="rpc.authority" @change="commit"><option value="server">{{ t('server') }}</option><option value="owner">{{ t('owner') }}</option><option value="any">{{ t('any') }}</option></select><select v-model="rpc.payloadSchema" @change="commit"><option v-for="schema in payloadSchemas" :key="schema">{{ schema }}</option></select><input v-model.number="rpc.maximumPayloadBytes" type="number" min="2" max="65507" :title="t('payloadBytes')" @change="commit"><input v-model.number="rpc.callsPerSecond" type="number" min="1" max="1000" :title="t('ratePerSecond')" @change="commit"><button @click="removeRpc(rpc.name)">×</button></article></div>
      </section>
    </main>

    <main v-else-if="activeTab === 'replication'" class="studio-grid">
      <section class="card">
        <header><strong>{{ t('replication') }}</strong><span>{{ settings.networking.replicatedEntities.length }}/2000</span></header>
        <p>{{ t('replicationHint') }}</p><button class="primary" :disabled="!selectedEntity || replicatedSelected" @click="replicateSelected">＋ {{ t('replicateSelected') }}</button>
        <label><span>{{ t('snapshotRate') }}</span><input v-model.number="settings.networking.snapshotRate" type="number" min="1" max="120" @change="commit"></label>
        <label><span>{{ t('interpolationMs') }}</span><input v-model.number="settings.networking.interpolationMs" type="number" min="0" max="2000" @change="commit"></label>
        <label><span>{{ t('rollbackFrames') }}</span><input v-model.number="settings.networking.rollbackFrames" type="number" min="0" max="600" @change="commit"></label>
        <label><span>{{ t('reconciliationThreshold') }}</span><input v-model.number="settings.networking.reconciliationThreshold" type="number" min="0" max="1000" step=".01" @change="commit"></label>
      </section>
      <section class="card span-two">
        <header><strong>{{ t('replicatedProperties') }}</strong><span>{{ t('authority') }}</span></header>
        <div class="table-scroll"><article v-for="definition in settings.networking.replicatedEntities" :key="definition.entityUuid" class="replication-row"><strong :title="definition.entityUuid">{{ entityName(definition.entityUuid) }}</strong><select v-model="definition.authority" @change="commit"><option value="server">{{ t('server') }}</option><option value="owner">{{ t('owner') }}</option></select><div><label><input v-model="definition.properties" type="checkbox" value="transform" @change="commit">{{ t('transform') }}</label><label><input v-model="definition.properties" type="checkbox" value="rotation" @change="commit">{{ t('rotation') }}</label><label><input v-model="definition.properties" type="checkbox" value="velocity" @change="commit">{{ t('velocity') }}</label></div><label><input v-model="definition.interpolate" type="checkbox" @change="commit">{{ t('interpolate') }}</label><label><input v-model="definition.predict" type="checkbox" @change="commit">{{ t('predict') }}</label><button @click="removeReplication(definition.entityUuid)">×</button></article></div>
      </section>
    </main>

    <main v-else-if="activeTab === 'simulation'" class="studio-grid">
      <section class="card">
        <header><strong>{{ t('lagSimulation') }}</strong><span>{{ settings.networking.simulation.enabled ? t('enabled') : t('disabled') }}</span></header>
        <label><span>{{ t('enabled') }}</span><input v-model="settings.networking.simulation.enabled" type="checkbox" @change="commit"></label>
        <label><span>{{ t('latencyMs') }}</span><input v-model.number="settings.networking.simulation.latencyMs" type="number" min="0" max="10000" @change="commit"></label>
        <label><span>{{ t('jitterMs') }}</span><input v-model.number="settings.networking.simulation.jitterMs" type="number" min="0" max="10000" @change="commit"></label>
        <label><span>{{ t('packetLoss') }} %</span><input v-model.number="settings.networking.simulation.lossPercent" type="number" min="0" max="100" step=".1" @change="commit"></label>
        <label><span>{{ t('duplicatePackets') }} %</span><input v-model.number="settings.networking.simulation.duplicatePercent" type="number" min="0" max="100" step=".1" @change="commit"></label>
        <label><span>{{ t('reorderPackets') }} %</span><input v-model.number="settings.networking.simulation.reorderPercent" type="number" min="0" max="100" step=".1" @change="commit"></label>
        <label><span>{{ t('randomSeed') }}</span><input v-model.number="settings.networking.simulation.seed" type="number" min="0" max="4294967295" @change="commit"></label>
      </section>
      <section class="card">
        <header><strong>{{ t('multiplayerReplay') }}</strong><span>{{ multiplayerReplayState.frames.length }}</span></header>
        <div class="button-row"><button class="primary" :disabled="multiplayerReplayState.recording || networkState?.status !== 'connected'" @click="recordReplay">{{ t('recordReplay') }}</button><button :disabled="!multiplayerReplayState.recording" @click="finishReplay">{{ t('stopReplay') }}</button></div>
        <label><span>A</span><select v-model="replayA"><option value="">{{ t('none') }}</option><option v-for="asset in multiplayerReplayAssets" :key="asset.uuid" :value="asset.uuid">{{ asset.name }}</option></select></label>
        <label><span>B</span><select v-model="replayB"><option value="">{{ t('none') }}</option><option v-for="asset in multiplayerReplayAssets" :key="asset.uuid" :value="asset.uuid">{{ asset.name }}</option></select></label>
        <button :disabled="!replayA || !replayB" @click="compareReplays">{{ t('compareReplays') }}</button>
        <p v-if="multiplayerReplayState.lastComparison" :class="{ danger: !multiplayerReplayState.lastComparison.matching }">{{ multiplayerReplayState.lastComparison.matching ? t('replaysMatch') : t('replayDivergedAt', { tick: multiplayerReplayState.lastComparison.firstDivergenceTick ?? 0 }) }}</p>
      </section>
      <section class="card">
        <header><strong>{{ t('multiplayerSave') }}</strong><span>v1</span></header>
        <button class="primary" :disabled="networkState?.status !== 'connected'" @click="captureSessionSave">{{ t('captureSessionState') }}</button>
        <label><span>{{ t('saveAsset') }}</span><select v-model="saveAsset"><option value="">{{ t('none') }}</option><option v-for="asset in multiplayerSaveAssets" :key="asset.uuid" :value="asset.uuid">{{ asset.name }}</option></select></label>
        <button :disabled="!saveAsset || networkState?.status !== 'connected'" @click="restoreSessionSave">{{ t('restoreSessionState') }}</button>
        <p>{{ t('multiplayerSaveHint') }}</p>
      </section>
    </main>

    <main v-else class="studio-grid diagnostics-grid">
      <section class="card metrics-card">
        <header><strong>{{ t('multiplayerDiagnostics') }}</strong><button @click="downloadDiagnostics">{{ t('exportDiagnostics') }}</button></header>
        <dl v-if="networkState"><div><dt>{{ t('sentReceived') }}</dt><dd>{{ networkState.sentBytes }} / {{ networkState.receivedBytes }} B</dd></div><div><dt>{{ t('bandwidth') }}</dt><dd>{{ networkState.bandwidthOutKbps }} / {{ networkState.bandwidthInKbps }} kbps</dd></div><div><dt>{{ t('packets') }}</dt><dd>{{ networkState.sentPackets }} / {{ networkState.receivedPackets }}</dd></div><div><dt>{{ t('droppedPackets') }}</dt><dd>{{ networkState.droppedPackets }}</dd></div><div><dt>{{ t('invalidPackets') }}</dt><dd>{{ networkState.invalidPackets }}</dd></div><div><dt>{{ t('rateLimited') }}</dt><dd>{{ networkState.rateLimited }}</dd></div><div><dt>{{ t('reliablePending') }}</dt><dd>{{ networkState.reliablePending }}</dd></div><div><dt>{{ t('resends') }}</dt><dd>{{ networkState.reliableResent }}</dd></div><div><dt>{{ t('lateJoins') }}</dt><dd>{{ networkState.lateJoins }}</dd></div><div><dt>{{ t('divergences') }}</dt><dd>{{ networkState.divergences }}</dd></div><div><dt>{{ t('rollbacks') }}</dt><dd>{{ networkState.rollbacks }}</dd></div><div><dt>{{ t('replayedInputs') }}</dt><dd>{{ networkState.replayedInputs }}</dd></div></dl>
      </section>
      <section class="card span-two">
        <header><strong>{{ t('networkEvents') }}</strong><span>{{ networkState?.events.length ?? 0 }}</span></header><div class="event-list"><article v-for="event in networkState?.events.slice(-200).reverse() ?? []" :key="`${event.at}-${event.message}`" :class="event.level"><code>{{ new Date(event.at).toLocaleTimeString() }}</code><strong>{{ event.level }}</strong><span>{{ event.message }}</span></article></div>
      </section>
      <section class="card span-three">
        <header><strong>{{ t('packetTimeline') }}</strong><span>{{ networkState?.packetSummaries.length ?? 0 }}</span></header><div class="packet-list"><article v-for="packet in networkState?.packetSummaries.slice(-300).reverse() ?? []" :key="`${packet.at}-${packet.direction}-${packet.sequence}`"><code>{{ packet.direction === 'in' ? '←' : '→' }} #{{ packet.sequence }}</code><span>{{ packet.channel }}</span><strong>{{ packet.kind }}</strong><span>{{ packet.bytes }} B</span><i :class="{ rejected: !packet.accepted }">{{ packet.accepted ? '✓' : '×' }}</i></article></div>
      </section>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { assetState, createTextAsset, readTextAsset } from '../assets/AssetDatabase'
import { t } from '../i18n'
import { enableOfficialPackage, OFFICIAL_NETWORKING_PACKAGE_ID, packageEnabled } from '../runtime/packages'
import { beginMultiplayerReplayRecording, compareMultiplayerReplays, multiplayerReplayState, normalizeMultiplayerReplay, stopMultiplayerReplayRecording } from '../runtime/networkReplay'
import { networkingModule, startProductionNetworking, stopProductionNetworking } from '../runtime/productionRuntime'
import { reportRecoverableError } from '../runtime/faultCenter'
import { loadProductionSettings, productionSettings as settings, serializeProductionSettings, type NetworkPayloadSchema } from '../runtime/production'
import { requestConfirmation } from '../store/dialog'
import { physicsState, pushHistory } from '../store/physics'

type TabId = 'session' | 'protocol' | 'replication' | 'simulation' | 'diagnostics'
type NetworkModule = typeof import('../runtime/networking')
const tabs: Array<{ id: TabId; label: Parameters<typeof t>[0] }> = [{ id: 'session', label: 'session' }, { id: 'protocol', label: 'protocol' }, { id: 'replication', label: 'replication' }, { id: 'simulation', label: 'simulationReplay' }, { id: 'diagnostics', label: 'diagnostics' }]
const activeTab = ref<TabId>('session'), networkBusy = ref(false), moduleRef = shallowRef<NetworkModule | null>(null), networkState = shallowRef<NetworkModule['networkingState'] | null>(null)
const replayA = ref(''), replayB = ref(''), saveAsset = ref('')
const builtInChannels = ['state', 'input', 'events'], payloadSchemas: NetworkPayloadSchema[] = ['any', 'boolean', 'number', 'integer', 'string', 'vec2', 'object', 'array']
const networkPackageEnabled = computed(() => packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID)), selectedEntity = computed(() => physicsState.world.entities.find(entity => entity.id === physicsState.selectedEntityId) ?? null), replicatedSelected = computed(() => Boolean(selectedEntity.value && settings.networking.replicatedEntities.some(item => item.entityUuid === selectedEntity.value?.uuid)))
const canConnect = computed(() => settings.networking.enabled && settings.networking.permissionGranted && networkState.value?.status !== 'connected')
const networkStatusLabel = computed(() => t(({ disabled: 'disabled', 'permission-required': 'permissionRequired', connecting: 'connecting', connected: 'connected', reconnecting: 'reconnecting', error: 'networkError' } as const)[networkState.value?.status ?? 'disabled']))
const multiplayerReplayAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'replay' && readTextAsset(asset.uuid)?.includes('nova-multiplayer-replay')))
const multiplayerSaveAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'replay' && readTextAsset(asset.uuid)?.includes('nova-multiplayer-save')))

async function loadModule() { moduleRef.value = await networkingModule(); networkState.value = moduleRef.value.networkingState; return moduleRef.value }
async function safelyLoadModule() { try { return await loadModule() } catch (error) { reportRecoverableError(error, 'Load optional networking studio', 'Runtime'); return null } }
function commit() { loadProductionSettings(serializeProductionSettings()); pushHistory('Edit networking settings', 'project:networking') }
function installNetworking() { if (enableOfficialPackage(OFFICIAL_NETWORKING_PACKAGE_ID)) { pushHistory('Install Nova Networking package', 'project:packages'); void safelyLoadModule() } }
async function grantPermission() { if (!await requestConfirmation({ title: t('grantNetworkPermission'), message: t('networkPermissionPrompt'), confirmLabel: t('grant'), cancelLabel: t('cancel'), destructive: false })) return; settings.networking.permissionGranted = true; settings.networking.enabled = true; commit() }
async function revokePermission() { if (!await requestConfirmation({ title: t('revokeNetworkPermission'), message: t('revokeNetworkPermissionPrompt'), confirmLabel: t('revoke'), cancelLabel: t('cancel'), destructive: true })) return; await disconnect(); settings.networking.permissionGranted = false; settings.networking.autoStart = false; commit() }
async function connect() { networkBusy.value = true; try { moduleRef.value = await startProductionNetworking(); networkState.value = moduleRef.value.networkingState } catch (error) { if (networkState.value) networkState.value.lastError = error instanceof Error ? error.message : String(error) } finally { networkBusy.value = false } }
async function disconnect() { networkBusy.value = true; try { await stopProductionNetworking() } finally { networkBusy.value = false; if (moduleRef.value) networkState.value = moduleRef.value.networkingState } }
function addChannel() { settings.networking.channels.push({ id: `channel-${settings.networking.channels.length + 1}`, delivery: 'reliable-ordered', maximumPayloadBytes: 8192, messagesPerSecond: 60, priority: 0 }); commit() }
function removeChannel(id: string) { if (builtInChannels.includes(id)) return; settings.networking.channels = settings.networking.channels.filter(item => item.id !== id); for (const rpc of settings.networking.rpcContracts) if (rpc.channelId === id) rpc.channelId = 'events'; commit() }
function addRpc() { settings.networking.rpcContracts.push({ name: `rpc-${settings.networking.rpcContracts.length + 1}`, channelId: settings.networking.channels.find(item => item.delivery === 'reliable-ordered')?.id ?? settings.networking.channels[0].id, direction: 'client-to-server', authority: 'any', payloadSchema: 'any', maximumPayloadBytes: 8192, callsPerSecond: 30 }); commit() }
function removeRpc(name: string) { settings.networking.rpcContracts = settings.networking.rpcContracts.filter(item => item.name !== name); commit() }
function replicateSelected() { const entity = selectedEntity.value; if (!entity || replicatedSelected.value) return; settings.networking.replicatedEntities.push({ entityUuid: entity.uuid, authority: 'server', properties: ['transform', 'rotation', 'velocity'], interpolate: true, predict: false }); commit() }
function removeReplication(uuid: string) { settings.networking.replicatedEntities = settings.networking.replicatedEntities.filter(item => item.entityUuid !== uuid); commit() }
function entityName(uuid: string) { return physicsState.world.entities.find(entity => entity.uuid === uuid)?.name ?? uuid }
function recordReplay() { beginMultiplayerReplayRecording(networkState.value?.peerDetails.map(peer => peer.id) ?? []) }
function finishReplay() { const document = stopMultiplayerReplayRecording(physicsState.globalSettings.tickRate), asset = createTextAsset(`Multiplayer Replay ${new Date().toISOString().replace(/[:.]/g, '-')}`, 'replay', JSON.stringify(document, null, 2), 'Assets/Replays'); replayA.value ||= asset.uuid; replayB.value = asset.uuid; pushHistory('Record multiplayer replay') }
function compareReplays() { try { const first = readTextAsset(replayA.value), second = readTextAsset(replayB.value); if (first && second) compareMultiplayerReplays(normalizeMultiplayerReplay(JSON.parse(first)), normalizeMultiplayerReplay(JSON.parse(second))) } catch (error) { reportRecoverableError(error, 'Compare multiplayer replays', 'Runtime') } }
async function captureSessionSave() { try { const module = await loadModule(), document = module.multiplayerSave(), asset = createTextAsset(`Multiplayer Save ${new Date().toISOString().replace(/[:.]/g, '-')}`, 'replay', JSON.stringify(document, null, 2), 'Assets/Replays'); saveAsset.value = asset.uuid; pushHistory('Capture multiplayer session state') } catch (error) { reportRecoverableError(error, 'Capture multiplayer session state', 'Runtime') } }
async function restoreSessionSave() { try { const source = readTextAsset(saveAsset.value); if (!source) return; const module = await loadModule(), result = module.restoreMultiplayerSave(JSON.parse(source)); pushHistory(`Restore multiplayer session state (${result.restored})`) } catch (error) { reportRecoverableError(error, 'Restore multiplayer session state', 'Runtime') } }
function download(name: string, source: string) { const url = URL.createObjectURL(new Blob([source], { type: 'application/json' })), anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0) }
async function downloadDiagnostics() { try { const module = await loadModule(); download(`nova-network-diagnostics-${Date.now()}.json`, module.captureNetworkDiagnostics()) } catch (error) { reportRecoverableError(error, 'Export network diagnostics', 'Runtime') } }

watch(networkPackageEnabled, enabled => { if (enabled) void safelyLoadModule() })
onMounted(() => { if (networkPackageEnabled.value) void safelyLoadModule() })
</script>

<style scoped>
.network-studio{height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:var(--surface-1);container-type:inline-size}.studio-header{min-height:52px;padding:7px 10px;display:grid;grid-template-columns:minmax(180px,.55fr) minmax(420px,1.5fr) auto;gap:10px;align-items:center;border-bottom:1px solid var(--border-subtle)}.studio-header>div{display:flex;flex-direction:column;min-width:0}.studio-header>div span,.card p,.peers-card small{color:var(--text-muted);font-size:11px;line-height:1.45}.studio-header nav{display:grid;grid-template-columns:repeat(5,minmax(78px,1fr));gap:5px}.studio-header button,.card button,.empty-state button{min-height:30px;padding:0 9px;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-secondary);background:var(--surface-2);font-size:11px}.studio-header button.active,.primary{color:var(--accent-contrast)!important;border-color:var(--accent)!important;background:var(--accent)!important}.studio-header>output{padding:5px 9px;border:1px solid var(--border-subtle);border-radius:999px;color:var(--text-muted);font-size:11px}.studio-header>output.connected{color:var(--success);border-color:color-mix(in srgb,var(--success) 55%,var(--border-subtle))}.studio-header>output.error,.danger{color:var(--danger)!important}.studio-grid{min-height:0;flex:1;padding:9px;display:grid;grid-template-columns:repeat(3,minmax(250px,1fr));gap:9px;align-items:start;overflow:auto}.wide-grid{grid-template-columns:repeat(3,minmax(270px,1fr))}.card{min-width:0;padding:10px;border:1px solid var(--border-subtle);border-radius:11px;background:var(--surface-2);overflow:hidden}.card>header{min-height:32px;display:flex;justify-content:space-between;align-items:center;gap:8px}.card>header span{color:var(--text-muted);font-size:11px}.card>label,.limits-card label{min-height:35px;display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-size:11px}.card>label input:not([type=checkbox]),.card>label select{width:56%;min-width:0}.button-row{margin:7px 0;display:flex;gap:6px;flex-wrap:wrap}.danger-button{color:var(--danger)!important;border-color:var(--danger)!important}.span-two{grid-column:span 2}.span-three{grid-column:1/-1}.table-scroll,.event-list,.packet-list{max-height:310px;overflow:auto}.channel-row,.rpc-row,.replication-row{min-width:760px;padding:6px 0;display:grid;gap:6px;align-items:center;border-bottom:1px solid var(--border-subtle);font-size:11px}.channel-row{grid-template-columns:120px 170px 1fr 1fr 1fr 28px}.rpc-row{grid-template-columns:120px 105px 145px 90px 85px 90px 75px 28px}.replication-row{min-width:650px;grid-template-columns:minmax(120px,1fr) 90px minmax(210px,1.4fr) 90px 75px 28px}.channel-row label,.replication-row label{min-height:28px;display:flex;align-items:center;gap:5px;color:var(--text-muted)}.channel-row label{justify-content:space-between}.channel-row label input{width:82px}.replication-row>div{display:flex;gap:8px;flex-wrap:wrap}.peers-card article{padding:7px;display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid var(--border-subtle)}.peers-card article span{display:flex;flex-direction:column}.peers-card code{max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.metrics-card dl{display:grid;grid-template-columns:1fr 1fr;gap:5px}.metrics-card dl div{padding:6px;display:flex;justify-content:space-between;gap:6px;border-radius:6px;background:var(--surface-3);font-size:11px}.metrics-card dt{color:var(--text-muted)}.metrics-card dd{margin:0}.event-list article,.packet-list article{min-height:29px;padding:4px 6px;display:grid;gap:7px;align-items:center;border-bottom:1px solid var(--border-subtle);font-size:11px}.event-list article{grid-template-columns:72px 58px minmax(150px,1fr)}.packet-list article{grid-template-columns:80px 90px minmax(100px,1fr) 70px 24px}.event-list article.warning{color:var(--warning)}.event-list article.error,.packet-list .rejected{color:var(--danger)}.empty-state{margin:auto;padding:24px;max-width:520px;text-align:center}.empty-state p{color:var(--text-muted)}
@container(max-width:900px){.studio-header{grid-template-columns:1fr auto}.studio-header nav{grid-column:1/-1;grid-row:2;grid-template-columns:repeat(5,1fr)}.studio-grid{grid-template-columns:1fr 1fr}.span-three{grid-column:1/-1}.span-two{grid-column:span 2}}@container(max-width:620px){.studio-header{display:flex;flex-wrap:wrap}.studio-header>div{width:calc(100% - 90px)}.studio-header nav{width:100%;grid-template-columns:repeat(2,1fr)}.studio-header nav button:last-child{grid-column:1/-1}.studio-grid{display:flex;flex-direction:column}.card{width:100%}.span-two,.span-three{grid-column:auto}.metrics-card dl{grid-template-columns:1fr}.table-scroll{max-height:360px}.channel-row,.rpc-row,.replication-row{min-width:0;display:flex;flex-wrap:wrap}.channel-row>*:not(button),.rpc-row>*:not(button),.replication-row>*:not(button){flex:1 1 130px}.replication-row>strong,.replication-row>div{flex-basis:100%}.event-list article{grid-template-columns:62px 55px 1fr}}
</style>
