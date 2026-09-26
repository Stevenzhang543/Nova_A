<!-- 网络工作室：配置会话、传输及运行诊断，管理联网测试与授权。 -->
<template>
  <section class="network-studio" @change.capture="guardNetworkNumber18">
    <header class="studio-header">
      <div><strong>{{ t('networkStudio') }}</strong><span>{{ t('networkStudioHint') }}</span></div>
      <nav role="tablist" :aria-label="t('networkStudio')" @keydown="handleTabKeydown"><button v-for="tab in tabs" :id="`network-studio-tab-${tab.id}`" :key="tab.id" role="tab" :aria-selected="activeTab === tab.id" :aria-controls="`network-studio-panel-${tab.id}`" :tabindex="activeTab === tab.id ? 0 : -1" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ t(tab.label) }}</button></nav>
      <output :class="networkState?.status ?? 'disabled'" role="status" aria-live="polite" aria-atomic="true">{{ networkStatusLabel }}</output>
    </header>
    <p v-if="networkFormError18" class="network-draft-error" role="alert">{{ networkFormError18 }}</p>

    <main v-if="!networkPackageEnabled" :id="`network-studio-panel-${activeTab}`" class="empty-state" role="tabpanel" tabindex="0" :aria-labelledby="`network-studio-tab-${activeTab}`">
      <strong>{{ t('optionalNetworking') }}</strong><p>{{ t('networkingOptionalHint') }}</p><button class="primary" @click="installNetworking">{{ t('enableNetworkingPackage') }}</button>
    </main>

    <main v-else-if="activeTab === 'session'" id="network-studio-panel-session" data-measured-studio-layout class="studio-grid" role="tabpanel" tabindex="0" aria-labelledby="network-studio-tab-session">
      <section class="card">
        <header><strong>{{ t('session') }}</strong><span>{{ t('noMandatoryCloud') }}</span></header>
        <label><span>{{ t('networkingEnabled') }}</span><input v-model="settings.networking.enabled" type="checkbox" @change="commit"></label>
        <label><span>{{ t('networkPermission') }}</span><output>{{ settings.networking.permissionGranted ? t('granted') : t('notGranted') }}</output></label>
        <div class="button-row"><button v-if="!settings.networking.permissionGranted" class="primary" @click="grantPermission">{{ t('grantNetworkPermission') }}</button><button v-else class="danger-button" @click="revokePermission">{{ t('revokeNetworkPermission') }}</button></div>
        <label><span>{{ t('autoStart') }}</span><input v-model="settings.networking.autoStart" type="checkbox" :disabled="!settings.networking.permissionGranted" @change="commit"></label>
        <label><span>{{ t('sessionMode') }}</span><select v-model="settings.networking.sessionMode" @change="commit"><option value="local">{{ t('localLobby') }}</option><option value="direct">{{ t('directConnect') }}</option></select></label>
        <label><span>{{ t('networkRole') }}</span><select v-model="settings.networking.role" @change="commit"><option value="client">{{ t('client') }}</option><option value="server">{{ t('server') }}</option><option value="host">{{ t('host') }}</option></select></label>
        <p data-network-role-hint>{{ nl18(settings.networking.role === 'host' ? 'roleHost' : settings.networking.role === 'server' ? 'roleServer' : 'roleClient') }}</p>
        <label><span>{{ t('sessionName') }}</span><input v-model="settings.networking.sessionName" maxlength="80" @change="commit"></label>
        <label><span>{{ t('playerName') }}</span><input v-model="settings.networking.playerName" maxlength="80" @change="commit"></label>
        <label><span>{{ t('maximumPeers') }}</span><input v-model.lazy.number="settings.networking.maxPeers" :data-network-committed="settings.networking.maxPeers" type="number" min="1" max="64" @change="commit"></label>
      </section>
      <section class="card">
        <header><strong>{{ settings.networking.sessionMode === 'local' ? t('localLobby') : t('directConnect') }}</strong><span>{{ t('protocol') }} 2 · {{ t('networkSchema') }} {{ settings.networking.schemaVersion }}</span></header>
        <p>{{ settings.networking.sessionMode === 'local' ? t('localLobbyHint') : t('directConnectHint') }}</p>
        <template v-if="settings.networking.sessionMode === 'direct'">
          <label><span>{{ t('transport') }}</span><select v-model="settings.networking.transport" @change="commit"><option value="websocket">WebSocket</option><option value="native-udp">Native UDP</option></select></label>
          <label><span>{{ t('reviewedAdapter') }}</span><select v-model="settings.networking.transportAdapterId" @change="commit"><option value="">{{ t('builtInTransport') }}</option><option v-for="adapter in reviewedAdapters" :key="adapter.id" :value="adapter.id">{{ adapter.label }} · {{ adapter.version }}</option></select></label>
          <label><span>{{ t('endpoint') }}</span><input v-model="settings.networking.endpoint" maxlength="512" spellcheck="false" @change="commit"></label>
          <label><span>{{ t('bindAddress') }}</span><input v-model="settings.networking.bindAddress" maxlength="256" spellcheck="false" @change="commit"></label>
        </template>
        <label><span>{{ t('autoReconnect') }}</span><input v-model="settings.networking.reconnect" type="checkbox" @change="commit"></label>
        <label><span>{{ t('reconnectLimit') }}</span><input v-model.lazy.number="settings.networking.reconnectMaxAttempts" :data-network-committed="settings.networking.reconnectMaxAttempts" type="number" min="0" max="32" @change="commit"></label>
        <label><span>{{ t('lateJoin') }}</span><input v-model="settings.networking.lateJoin" type="checkbox" @change="commit"></label>
        <p>{{ nl18('identityHint') }}</p>
        <p v-if="connectionEdited18" role="status">{{ nl18('reconnectEdited') }}</p>
        <div class="button-row"><button class="primary" :disabled="networkBusy || !canConnect" @click="connect">{{ t('connect') }}</button><button :disabled="networkBusy || !canConnect" @click="reconnect18">{{ nl18('reconnect') }}</button><button :disabled="networkBusy || networkState?.status === 'disabled'" @click="disconnect">{{ t('disconnect') }}</button></div>
        <div v-if="settings.networking.sessionMode === 'local'" class="button-row"><button :disabled="networkBusy || !canConnect" @click="hostLocalLobby">{{ t('hostLocalLobby') }}</button><button :disabled="!settings.networking.permissionGranted" @click="discoverLocalLobbies">{{ t('discoverLocalLobbies') }}</button></div>
        <p :class="securityGuidance.severity">{{ securityGuidance.message }}</p>
        <div v-if="networkState?.lastError" class="danger breakable" role="alert"><p>{{ networkFailure18(networkState.lastError) }}</p><details><summary>{{ nl18('technicalDetails') }}</summary><pre>{{ networkState.lastError }}</pre></details></div>
      </section>
      <section class="card peers-card">
        <header><strong>{{ t('peers') }}</strong><span>{{ networkState?.peers ?? 0 }}/{{ settings.networking.maxPeers }}</span></header>
        <article v-for="peer in networkState?.peerDetails ?? []" :key="peer.id"><span><strong>{{ peer.name }}</strong><small>{{ peer.role }} · {{ peer.verified ? t('verified') : t('unverified') }}</small></span><code>{{ peer.id }}</code></article>
        <p v-if="!networkState?.peerDetails.length">{{ t('noPeersConnected') }}</p>
      </section>
      <section class="card span-three reviewed-services-card">
        <header><strong>{{ t('reviewedNetworkServices') }}</strong><span>{{ t('explicitConfigurationOnly') }}</span></header>
        <p>{{ t('reviewedNetworkServicesHint') }}</p>
        <div class="service-selector-grid">
          <label><span>{{ t('identityProvider') }}</span><select v-model="settings.networking.services.identityProviderId" @change="commit"><option value="">{{ t('noReviewedService') }}</option><option v-for="service in identityServices" :key="service.id" :value="service.id">{{ service.label }} · {{ service.version }}</option></select></label>
          <label><span>{{ t('lobbyProvider') }}</span><select v-model="settings.networking.services.lobbyProviderId" @change="commit"><option value="">{{ t('noReviewedService') }}</option><option v-for="service in lobbyServices" :key="service.id" :value="service.id">{{ service.label }} · {{ service.version }}</option></select></label>
          <label><span>{{ t('relayProvider') }}</span><select v-model="settings.networking.services.relayProviderId" @change="commit"><option value="">{{ t('noReviewedService') }}</option><option v-for="service in relayServices" :key="service.id" :value="service.id">{{ service.label }} · {{ service.version }}</option></select></label>
        </div>
      </section>
      <section v-if="settings.networking.sessionMode === 'local'" class="card span-three lobby-card">
        <header><strong>{{ t('discoveredLocalLobbies') }}</strong><span>{{ localLobbyDirectoryState.lobbies.length }}</span></header>
        <p>{{ t('localRelayHint') }}</p>
        <div class="lobby-list"><article v-for="lobby in localLobbyDirectoryState.lobbies" :key="`${lobby.sessionName}-${lobby.hostName}`"><span><strong>{{ lobby.sessionName }}</strong><small>{{ lobby.hostName }} · {{ lobby.peers }}/{{ lobby.maximumPeers }} · schema {{ lobby.schemaVersion }}</small></span><button :disabled="networkBusy || !canConnect || lobby.schemaVersion !== settings.networking.schemaVersion" @click="joinLocalLobby(lobby.sessionName)">{{ t('join') }}</button></article></div>
      </section>
    </main>

    <main v-else-if="activeTab === 'protocol'" id="network-studio-panel-protocol" data-measured-studio-layout class="studio-grid network-wide-grid" role="tabpanel" tabindex="0" aria-labelledby="network-studio-tab-protocol">
      <section class="card span-two">
        <header><strong>{{ t('networkChannels') }}</strong><button :disabled="settings.networking.channels.length >= 32" @click="addChannel">＋ {{ t('channel') }}</button></header>
        <div class="table-scroll"><article v-for="channel in settings.networking.channels" :key="channel.id" class="channel-row">
          <label><span>{{ nl18('name') }}</span><input v-model="channel.id" maxlength="80" :disabled="builtInChannels.includes(channel.id)" @change="commit"></label>
          <label><span>{{ nl18('delivery') }}</span><select v-model="channel.delivery" @change="commit"><option value="reliable-ordered">{{ t('reliableOrdered') }}</option><option value="unreliable-sequenced">{{ t('unreliableSequenced') }}</option></select></label>
          <label><span>{{ t('payloadBytes') }}</span><input v-model.lazy.number="channel.maximumPayloadBytes" :data-network-committed="channel.maximumPayloadBytes" type="number" min="32" max="65507" @change="commit"></label>
          <label><span>{{ t('ratePerSecond') }}</span><input v-model.lazy.number="channel.messagesPerSecond" :data-network-committed="channel.messagesPerSecond" type="number" min="1" max="2000" @change="commit"></label>
          <label><span>{{ t('priority') }}</span><input v-model.lazy.number="channel.priority" :data-network-committed="channel.priority" type="number" min="0" max="100" @change="commit"></label>
          <button :disabled="builtInChannels.includes(channel.id)" :aria-label="nl18('remove') + ' ' + channel.id" @click="removeChannel(channel.id)">{{ nl18('remove') }}</button>
        </article></div>
      </section>
      <section class="card limits-card">
        <header><strong>{{ t('protocolBounds') }}</strong><span>{{ t('failClosed') }}</span></header>
        <label><span>{{ t('packetBytes') }}</span><input v-model.lazy.number="settings.networking.maximumPacketBytes" :data-network-committed="settings.networking.maximumPacketBytes" type="number" min="512" max="65507" @change="commit"></label>
        <label><span>{{ t('messageRate') }}</span><input v-model.lazy.number="settings.networking.maximumMessagesPerSecond" :data-network-committed="settings.networking.maximumMessagesPerSecond" type="number" min="1" max="10000" @change="commit"></label>
        <label><span>{{ t('pendingReliable') }}</span><input v-model.lazy.number="settings.networking.maximumPendingReliable" :data-network-committed="settings.networking.maximumPendingReliable" type="number" min="1" max="4096" @change="commit"></label>
        <label><span>{{ t('retryMs') }}</span><input v-model.lazy.number="settings.networking.reliableRetryMs" :data-network-committed="settings.networking.reliableRetryMs" type="number" min="10" max="5000" @change="commit"></label>
        <label><span>{{ t('retryLimit') }}</span><input v-model.lazy.number="settings.networking.reliableMaximumAttempts" :data-network-committed="settings.networking.reliableMaximumAttempts" type="number" min="1" max="32" @change="commit"></label>
        <label><span>{{ t('bandwidthLimit') }}</span><input v-model.lazy.number="settings.networking.bandwidthKbps" :data-network-committed="settings.networking.bandwidthKbps" type="number" min="8" max="1000000" @change="commit"></label>
      </section>
      <section class="card span-three">
        <header><strong>RPC</strong><button :disabled="settings.networking.rpcContracts.length >= 256" @click="addRpc">＋ RPC</button></header>
        <div class="table-scroll"><article v-for="rpc in settings.networking.rpcContracts" :key="rpc.name" class="rpc-row">
          <label><span>{{ nl18('name') }}</span><input v-model="rpc.name" maxlength="80" @change="commit"></label>
          <label><span>{{ t('channel') }}</span><select v-model="rpc.channelId" @change="commit"><option v-for="channel in settings.networking.channels" :key="channel.id" :value="channel.id">{{ channel.id }}</option></select></label>
          <label><span>{{ nl18('direction') }}</span><select v-model="rpc.direction" @change="commit"><option value="client-to-server">{{ t('client') }} → {{ t('server') }}</option><option value="server-to-client">{{ t('server') }} → {{ t('client') }}</option><option value="bidirectional">{{ t('bidirectional') }}</option></select></label>
          <label><span>{{ t('authority') }}</span><select v-model="rpc.authority" @change="commit"><option value="server">{{ t('server') }}</option><option value="owner">{{ t('owner') }}</option><option value="any">{{ t('any') }}</option></select></label>
          <label><span>{{ nl18('schema') }}</span><select v-model="rpc.payloadSchema" @change="commit"><option v-for="schema in payloadSchemas" :key="schema">{{ schema }}</option></select></label>
          <label><span>{{ t('payloadBytes') }}</span><input v-model.lazy.number="rpc.maximumPayloadBytes" :data-network-committed="rpc.maximumPayloadBytes" type="number" min="2" max="65507" @change="commit"></label>
          <label><span>{{ t('ratePerSecond') }}</span><input v-model.lazy.number="rpc.callsPerSecond" :data-network-committed="rpc.callsPerSecond" type="number" min="1" max="1000" @change="commit"></label>
          <button :aria-label="nl18('remove') + ' ' + rpc.name" @click="removeRpc(rpc.name)">{{ nl18('remove') }}</button>
        </article></div>
      </section>
    </main>

    <main v-else-if="activeTab === 'replication'" id="network-studio-panel-replication" data-measured-studio-layout class="studio-grid" role="tabpanel" tabindex="0" aria-labelledby="network-studio-tab-replication">
      <section class="card span-three"><header><strong>{{ nl18('rollbackTitle') }}</strong></header><p>{{ nl18('rollbackHint') }}</p></section>
      <section class="card">
        <header><strong>{{ t('replication') }}</strong><span>{{ settings.networking.replicatedEntities.length }}/2000</span></header>
        <p>{{ t('replicationHint') }}</p><button class="primary" :disabled="!selectedEntity || replicatedSelected" @click="replicateSelected">＋ {{ t('replicateSelected') }}</button>
        <label><span>{{ t('snapshotRate') }}</span><input v-model.lazy.number="settings.networking.snapshotRate" :data-network-committed="settings.networking.snapshotRate" type="number" min="1" max="120" @change="commit"></label>
        <label><span>{{ t('interpolationMs') }}</span><input v-model.lazy.number="settings.networking.interpolationMs" :data-network-committed="settings.networking.interpolationMs" type="number" min="0" max="2000" @change="commit"></label>
        <label><span>{{ t('rollbackFrames') }}</span><input v-model.lazy.number="settings.networking.rollbackFrames" :data-network-committed="settings.networking.rollbackFrames" type="number" min="0" max="600" @change="commit"></label>
        <label><span>{{ t('reconciliationThreshold') }}</span><input v-model.lazy.number="settings.networking.reconciliationThreshold" :data-network-committed="settings.networking.reconciliationThreshold" type="number" min="0" max="1000" step=".01" @change="commit"></label>
      </section>
      <section class="card span-two">
        <header><strong>{{ t('replicatedProperties') }}</strong><span>{{ t('authority') }}</span></header>
        <div class="table-scroll"><article v-for="definition in settings.networking.replicatedEntities" :key="definition.entityUuid" class="replication-row">
          <strong :title="definition.entityUuid">{{ entityName(definition.entityUuid) }}</strong>
          <label><span>{{ t('authority') }}</span><select v-model="definition.authority" @change="commit"><option value="server">{{ t('server') }}</option><option value="owner">{{ t('owner') }}</option></select></label>
          <label v-if="definition.authority === 'owner'"><span>{{ nl18('ownerId') }}</span><input v-model.lazy="definition.ownerPeerId" maxlength="80" spellcheck="false" @change="commit"></label>
          <fieldset><legend>{{ t('replicatedProperties') }}</legend><label><input v-model="definition.properties" type="checkbox" value="transform" @change="commit">{{ t('transform') }}</label><label><input v-model="definition.properties" type="checkbox" value="rotation" @change="commit">{{ t('rotation') }}</label><label><input v-model="definition.properties" type="checkbox" value="velocity" @change="commit">{{ t('velocity') }}</label></fieldset>
          <label class="toggle-field"><input v-model="definition.interpolate" type="checkbox" @change="commit">{{ t('interpolate') }}</label>
          <label class="toggle-field"><input v-model="definition.predict" type="checkbox" @change="commit">{{ t('predict') }}</label>
          <label class="toggle-field"><input v-model="definition.alwaysRelevant" type="checkbox" @change="commit">{{ t('alwaysRelevant') }}</label>
          <label><span>{{ t('interestRadius') }} (m)</span><input v-model.lazy.number="definition.interestRadius" :data-network-committed="definition.interestRadius" type="number" min="0" :max="settings.networking.interest.maximumRadius" step="0.1" @change="commit"></label>
          <button :aria-label="nl18('remove') + ' ' + entityName(definition.entityUuid)" @click="removeReplication(definition.entityUuid)">{{ nl18('remove') }}</button>
        </article></div>
      </section>
    </main>

    <main v-else-if="activeTab === 'orchestration'" id="network-studio-panel-orchestration" data-measured-studio-layout class="studio-grid network-orchestration-grid" role="tabpanel" tabindex="0" aria-labelledby="network-studio-tab-orchestration">
      <section class="card">
        <header><strong>{{ t('networkSecurity') }}</strong><span>{{ settings.networking.authentication.mode }}</span></header>
        <label><span>{{ t('authentication') }}</span><select v-model="settings.networking.authentication.mode" @change="commit"><option value="none">{{ t('none') }}</option><option value="hook">{{ t('authenticationHook') }}</option></select></label>
        <label v-if="settings.networking.authentication.mode === 'hook'"><span>{{ t('providerId') }}</span><input v-model="settings.networking.authentication.providerId" list="network-auth-providers" maxlength="80" @change="commit"><datalist id="network-auth-providers"><option v-for="provider in authenticationProviders" :key="provider.id" :value="provider.id">{{ provider.label }}</option></datalist></label>
        <label><span>{{ t('requireVerifiedPeers') }}</span><input v-model="settings.networking.authentication.requireVerifiedPeers" type="checkbox" @change="commit"></label>
        <label><span>{{ t('requireEncryption') }}</span><input v-model="settings.networking.security.requireEncryption" type="checkbox" @change="commit"></label>
        <label><span>{{ t('maximumPacketAge') }}</span><input v-model.lazy.number="settings.networking.security.maximumPacketAgeMs" :data-network-committed="settings.networking.security.maximumPacketAgeMs" type="number" min="1000" max="120000" @change="commit"></label>
        <label><span>{{ t('replayWindow') }}</span><input v-model.lazy.number="settings.networking.security.replayWindow" :data-network-committed="settings.networking.security.replayWindow" type="number" min="64" max="16384" @change="commit"></label>
        <p :class="securityGuidance.severity">{{ securityGuidance.message }}</p>
      </section>
      <section class="card">
        <header><strong>{{ t('interestManagement') }}</strong><span>{{ networkState?.peerInterests.length ?? 0 }}</span></header>
        <label><span>{{ t('enabled') }}</span><input v-model="settings.networking.interest.enabled" type="checkbox" @change="commit"></label>
        <label><span>{{ t('defaultRadius') }}</span><input v-model.lazy.number="settings.networking.interest.defaultRadius" :data-network-committed="settings.networking.interest.defaultRadius" type="number" min="0" max="1000000" @change="commit"></label>
        <label><span>{{ t('maximumRadius') }}</span><input v-model.lazy.number="settings.networking.interest.maximumRadius" :data-network-committed="settings.networking.interest.maximumRadius" type="number" min="1" max="1000000" @change="commit"></label>
        <div class="coordinate-row"><input v-model.lazy.number="interestX" :data-network-committed="interestX" type="number" step="any" :aria-label="nl18('interestX')"><input v-model.lazy.number="interestY" :data-network-committed="interestY" type="number" step="any" :aria-label="nl18('interestY')"><button @click="publishInterest">{{ t('publishInterest') }}</button></div>
        <p>{{ t('interestHint') }}</p>
      </section>
      <section class="card">
        <header><strong>{{ t('authorityTransfer') }}</strong><span>{{ networkState?.authorityTransfers ?? 0 }}</span></header>
        <label><span>{{ t('allowed') }}</span><input v-model="settings.networking.allowAuthorityTransfer" type="checkbox" @change="commit"></label>
        <label><span>{{ t('object') }}</span><select v-model="authorityEntity"><option value="">{{ t('none') }}</option><option v-for="owner in networkState?.ownership ?? []" :key="owner.entityUuid" :value="owner.entityUuid">{{ entityName(owner.entityUuid) }}</option></select></label>
        <label><span>{{ t('targetPeer') }}</span><select v-model="authorityPeer"><option value="">{{ t('none') }}</option><option :value="networkState?.localPeerId">{{ t('localPeer') }}</option><option v-for="peer in networkState?.peerDetails ?? []" :key="peer.id" :value="peer.id">{{ peer.name }}</option></select></label>
        <button :disabled="!authorityEntity || !authorityPeer || networkState?.status !== 'connected'" @click="transferAuthority">{{ t('transferAuthority') }}</button>
        <div class="ownership-list"><code v-for="owner in networkState?.ownership ?? []" :key="owner.entityUuid">{{ entityName(owner.entityUuid) }} → {{ owner.ownerPeerId || t('server') }}</code></div>
      </section>
      <section class="card">
        <header><strong>{{ t('sceneHandoff') }}</strong><span>{{ networkState?.sceneHandoffs ?? 0 }}</span></header>
        <label><span>{{ t('allowed') }}</span><input v-model="settings.networking.allowSceneHandoff" type="checkbox" @change="commit"></label>
        <label><span>{{ t('scene') }}</span><select v-model="handoffScene"><option value="">{{ t('none') }}</option><option v-for="scene in sceneManager.scenes" :key="scene.uuid" :value="scene.uuid">{{ scene.name }}</option></select></label>
        <label><span>{{ t('targetPeer') }}</span><select v-model="handoffPeer"><option value="">{{ t('none') }}</option><option v-for="peer in networkState?.peerDetails ?? []" :key="peer.id" :value="peer.id">{{ peer.name }}</option></select></label>
        <label><span>{{ t('spawnTag') }}</span><input v-model="handoffSpawnTag" maxlength="80"></label>
        <button :disabled="!handoffScene || !handoffPeer || networkState?.status !== 'connected'" @click="handoffSceneToPeer">{{ t('sendSceneHandoff') }}</button>
      </section>
      <section class="card span-two multi-instance-card">
        <header><strong>{{ t('multiInstancePlay') }}</strong><span>2–8</span></header>
        <p>{{ t('multiInstanceHint') }}</p>
        <label><span>{{ t('peerCount') }}</span><input v-model.lazy.number="settings.networking.multiInstance.peerCount" :data-network-committed="settings.networking.multiInstance.peerCount" type="number" min="2" max="8" @change="commit"></label>
        <div class="peer-count-picker" role="group" :aria-label="t('quickPeerCounts')"><button v-for="count in peerCountPresets" :key="count" type="button" :class="{ active: settings.networking.multiInstance.peerCount === count }" :aria-pressed="settings.networking.multiInstance.peerCount === count" @click="setPeerCount(count)">{{ count }}</button></div>
        <label><span>{{ t('separateLogs') }}</span><input v-model="settings.networking.multiInstance.separateLogs" type="checkbox" @change="commit"></label>
        <label><span>{{ t('separateInspectors') }}</span><input v-model="settings.networking.multiInstance.separateInspectors" type="checkbox" @change="commit"></label>
        <div class="button-row instance-actions"><button class="primary" :disabled="networkBusy || !canLaunchInstances" :aria-describedby="!canLaunchInstances ? 'multi-instance-prerequisite' : undefined" :title="multiInstancePrerequisiteReason || undefined" @click="buildAndLaunchInstances">{{ t('buildLaunchPeers') }}</button><button :disabled="networkBusy || !nativeInstanceControls" @click="refreshLaunchedInstances">{{ t('refreshInstances') }}</button><button class="danger-button" :disabled="networkBusy || launchedInstances.length === 0" @click="stopLaunchedInstances">{{ t('stopAllInstances') }}</button></div>
        <p v-if="multiInstancePrerequisiteReason" id="multi-instance-prerequisite" class="prerequisite-copy">{{ multiInstancePrerequisiteReason }}</p>
        <div v-if="launchedInstances.length" class="instance-grid">
          <article v-for="instance in launchedInstances" :key="instance.id" :class="[`instance-${instanceStatus(instance)}`, { selected: selectedInstance?.id === instance.id }]">
            <div class="instance-card-title"><strong :title="instance.playerName">{{ instance.playerName }}</strong><output :class="instanceStatus(instance)">{{ instanceStatusLabel(instance) }}</output></div>
            <span>{{ instance.role }} · PID {{ instance.processId }}</span>
            <code :title="instance.endpoint">{{ t('endpoint') }}: {{ instance.endpoint }}</code>
            <code :title="instance.bindAddress">{{ t('bindAddress') }}: {{ instance.bindAddress }}</code>
            <code :title="instance.logScope || t('sharedLogs')">{{ instance.logScope || t('sharedLogs') }}</code>
            <code :title="instance.inspectorId || t('sharedInspector')">{{ t('inspectorIdentity') }}: {{ instance.inspectorId || t('sharedInspector') }}</code>
            <span v-if="instance.exitCode != null">{{ t('exitCode') }} {{ instance.exitCode }}</span>
            <div class="instance-card-actions">
              <button type="button" :aria-label="t('openInstanceLogsLabel', { name: instance.playerName })" @click="openInstanceLogs(instance)">{{ t('instanceLogs') }}</button>
              <button type="button" :aria-label="t('openInstanceInspectorLabel', { name: instance.playerName })" @click="openInstanceInspector(instance)">{{ t('instanceInspector') }}</button>
              <button type="button" class="danger-button" :disabled="networkBusy || instanceStatus(instance) !== 'running'" :aria-label="t('stopInstanceLabel', { name: instance.playerName })" @click="stopNetworkInstance(instance)">{{ t('stop') }}</button>
            </div>
          </article>
        </div>
        <p>{{ nl18('instanceScope') }}</p>
        <section v-if="selectedInstance" class="instance-detail" :aria-label="t('instanceDetails', { name: selectedInstance.playerName })">
          <header><span><strong>{{ selectedInstance.playerName }}</strong><small>{{ instanceDetailMode === 'logs' ? t('instanceLogs') : t('instanceInspector') }}</small></span><button type="button" @click="selectedInstanceId = ''">{{ t('closeInstanceDetails') }}</button></header>
          <template v-if="instanceDetailMode === 'logs'">
            <p>{{ t('instanceLogsHint', { scope: selectedInstance.logScope || t('sharedLogs') }) }}</p>
            <div v-if="filteredInstanceEvents.length" class="instance-event-list"><article v-for="event in filteredInstanceEvents" :key="`${event.at}-${event.message}`"><time>{{ new Date(event.at).toLocaleTimeString() }}</time><span>{{ event.message }}</span></article></div>
            <p v-else>{{ t('noInstanceLogsAvailable') }}</p>
          </template>
          <template v-else>
            <p>{{ t('instanceInspectorHint') }}</p>
            <dl><div><dt>ID</dt><dd>{{ selectedInstance.id }}</dd></div><div><dt>{{ t('inspectorIdentity') }}</dt><dd>{{ selectedInstance.inspectorId || t('sharedInspector') }}</dd></div><div><dt>{{ t('networkRole') }}</dt><dd>{{ selectedInstance.role }}</dd></div><div><dt>{{ t('sessionName') }}</dt><dd>{{ selectedInstance.sessionName }}</dd></div><div><dt>{{ t('endpoint') }}</dt><dd>{{ selectedInstance.endpoint }}</dd></div><div><dt>{{ t('bindAddress') }}</dt><dd>{{ selectedInstance.bindAddress }}</dd></div><div><dt>PID</dt><dd>{{ selectedInstance.processId }}</dd></div><div><dt>{{ t('networkStatus') }}</dt><dd>{{ instanceStatusLabel(selectedInstance) }}</dd></div></dl>
          </template>
        </section>
        <p v-else class="empty-copy">{{ t('noInstancesLaunched') }}</p>
        <p v-if="multiInstanceNotice" class="success-copy" role="status" aria-live="polite">{{ multiInstanceNotice }}</p>
        <p v-if="multiInstanceError" class="danger breakable" role="alert">{{ multiInstanceError }}</p>
      </section>
    </main>

    <main v-else-if="activeTab === 'simulation'" id="network-studio-panel-simulation" data-measured-studio-layout class="studio-grid" role="tabpanel" tabindex="0" aria-labelledby="network-studio-tab-simulation">
      <section class="card">
        <header><strong>{{ t('lagSimulation') }}</strong><span>{{ settings.networking.simulation.enabled ? t('enabled') : t('disabled') }}</span></header>
        <label><span>{{ t('enabled') }}</span><input v-model="settings.networking.simulation.enabled" type="checkbox" @change="commit"></label>
        <label><span>{{ t('latencyMs') }}</span><input v-model.lazy.number="settings.networking.simulation.latencyMs" :data-network-committed="settings.networking.simulation.latencyMs" type="number" min="0" max="10000" @change="commit"></label>
        <label><span>{{ t('jitterMs') }}</span><input v-model.lazy.number="settings.networking.simulation.jitterMs" :data-network-committed="settings.networking.simulation.jitterMs" type="number" min="0" max="10000" @change="commit"></label>
        <label><span>{{ t('packetLoss') }} %</span><input v-model.lazy.number="settings.networking.simulation.lossPercent" :data-network-committed="settings.networking.simulation.lossPercent" type="number" min="0" max="100" step=".1" @change="commit"></label>
        <label><span>{{ t('duplicatePackets') }} %</span><input v-model.lazy.number="settings.networking.simulation.duplicatePercent" :data-network-committed="settings.networking.simulation.duplicatePercent" type="number" min="0" max="100" step=".1" @change="commit"></label>
        <label><span>{{ t('reorderPackets') }} %</span><input v-model.lazy.number="settings.networking.simulation.reorderPercent" :data-network-committed="settings.networking.simulation.reorderPercent" type="number" min="0" max="100" step=".1" @change="commit"></label>
        <label><span>{{ t('randomSeed') }}</span><input v-model.lazy.number="settings.networking.simulation.seed" :data-network-committed="settings.networking.simulation.seed" type="number" min="0" max="4294967295" @change="commit"></label>
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
        <p>{{ t('multiplayerSaveHint') }}</p><p>{{ nl18('restoreHint') }}</p>
      </section>
    </main>

    <main v-else id="network-studio-panel-diagnostics" data-measured-studio-layout class="studio-grid network-diagnostics-grid" role="tabpanel" tabindex="0" aria-labelledby="network-studio-tab-diagnostics">
      <section class="card span-three network-contract29"><header><strong>{{ nc29('contract') }}</strong></header><p><strong>{{ nc29('mode') }}</strong> — {{ nc29('limits') }}</p><dl><div><dt>{{ nc29('age') }}</dt><dd>{{ snapshotAge29 === null ? nc29('none') : snapshotAge29 + ' ms' }}</dd></div><div><dt>{{ nc29('tick') }}</dt><dd>{{ networkState?.lastAppliedSnapshotTick ?? '—' }}</dd></div><div><dt>{{ nc29('peer') }}</dt><dd>{{ networkState?.lastAppliedSnapshotPeer || '—' }}</dd></div></dl><p>{{ nc29('ageHint') }}</p></section>
      <section class="card metrics-card"><header><strong>{{ t('replication') }}</strong></header><p>{{ nl18('pagesHint') }}</p><dl><div><dt>{{ nl18('pageEntities') }}</dt><dd>{{ networkState?.snapshotPageEntities ?? 0 }}</dd></div><div><dt>{{ nl18('deferredEntities') }}</dt><dd>{{ networkState?.snapshotDeferredEntities ?? 0 }}</dd></div></dl></section>
      <section class="card metrics-card">
        <header><strong>{{ t('multiplayerDiagnostics') }}</strong><button @click="downloadDiagnostics">{{ t('exportDiagnostics') }}</button></header>
        <dl v-if="networkState"><div><dt>{{ t('sentReceived') }}</dt><dd>{{ networkState.sentBytes }} / {{ networkState.receivedBytes }} B</dd></div><div><dt>{{ t('bandwidth') }}</dt><dd>{{ networkState.bandwidthOutKbps }} / {{ networkState.bandwidthInKbps }} kbps</dd></div><div><dt>{{ t('packets') }}</dt><dd>{{ networkState.sentPackets }} / {{ networkState.receivedPackets }}</dd></div><div><dt>{{ t('droppedPackets') }}</dt><dd>{{ networkState.droppedPackets }}</dd></div><div><dt>{{ t('invalidPackets') }}</dt><dd>{{ networkState.invalidPackets }}</dd></div><div><dt>{{ t('rateLimited') }}</dt><dd>{{ networkState.rateLimited }}</dd></div><div><dt>{{ t('replayRejected') }}</dt><dd>{{ networkState.replayRejected }}</dd></div><div><dt>{{ t('authenticationRejected') }}</dt><dd>{{ networkState.authenticationRejected }}</dd></div><div><dt>{{ t('reliablePending') }}</dt><dd>{{ networkState.reliablePending }}</dd></div><div><dt>{{ t('resends') }}</dt><dd>{{ networkState.reliableResent }}</dd></div><div><dt>{{ t('lateJoins') }}</dt><dd>{{ networkState.lateJoins }}</dd></div><div><dt>{{ t('divergences') }}</dt><dd>{{ networkState.divergences }}</dd></div><div><dt>{{ t('rollbacks') }}</dt><dd>{{ networkState.rollbacks }}</dd></div><div><dt>{{ nc29('deltaFrames') }}</dt><dd>{{ networkState.replayedInputs }}</dd></div><div><dt>{{ t('interestCulled') }}</dt><dd>{{ networkState.interestCulled }}</dd></div><div><dt>{{ t('disconnectCleanups') }}</dt><dd>{{ networkState.disconnectCleanups }}</dd></div></dl>
      </section>
      <section class="card span-two">
        <header><strong>{{ t('networkEvents') }}</strong><span>{{ networkState?.events.length ?? 0 }}</span></header><div class="event-list"><article v-for="event in networkState?.events.slice(-200).reverse() ?? []" :key="`${event.at}-${event.message}`" :class="event.level"><code>{{ new Date(event.at).toLocaleTimeString() }}</code><strong>{{ event.level }}</strong><span>{{ event.message }}</span></article></div>
      </section>
      <section class="card span-three">
        <header><strong>{{ t('packetTimeline') }}</strong><span>{{ networkState?.packetSummaries.length ?? 0 }}</span></header><div class="packet-list"><article v-for="packet in networkState?.packetSummaries.slice(-300).reverse() ?? []" :key="`${packet.at}-${packet.direction}-${packet.sequence}`"><code>{{ packet.direction === 'in' ? '←' : '→' }} #{{ packet.sequence }}</code><span>{{ packet.channel }}</span><strong>{{ packet.kind }}</strong><span>{{ packet.bytes }} B</span><i :class="{ rejected: !packet.accepted }">{{ packet.accepted ? '✓' : '×' }}</i></article></div>
      </section>
      <section class="card span-two timeline-card"><header><strong>{{ t('rollbackTimeline') }}</strong><span>{{ networkState?.rollbackTimeline.length ?? 0 }}</span></header><div class="timeline-list"><article v-for="entry in networkState?.rollbackTimeline.slice(-200).reverse() ?? []" :key="`${entry.tick}-${entry.peerId}-${entry.reason}`"><code>#{{ entry.tick }}</code><strong>{{ entry.reason }}</strong><span>{{ entry.peerId }} · {{ entry.replayedInputs }} · Δ {{ entry.correction.toFixed(3) }}</span></article></div></section>
      <section class="card timeline-card"><header><strong>{{ t('replicationDiff') }}</strong><span>{{ networkState?.replicationDiffs.length ?? 0 }}</span></header><div class="timeline-list"><article v-for="diff in networkState?.replicationDiffs.slice(-200).reverse() ?? []" :key="`${diff.tick}-${diff.peerId}-${diff.entityUuid}`"><code>#{{ diff.tick }}</code><strong>{{ entityName(diff.entityUuid) }}</strong><span>{{ diff.fields.join(', ') }} · Δ {{ diff.error.toFixed(3) }}</span></article></div></section>
    </main>
  </section>
</template>

<script setup lang="ts">
import { networkCopy29 as nc29 } from '../editor/networkCopy29'
import { nextTick, computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { assetState, createTextAsset, readTextAsset } from '../assets/AssetDatabase'
import { t } from '../i18n'
import { networkLabel18 as nl18, networkFailure18 } from '../editor/networkLabels18'
import { useNetworkForm18 } from '../editor/networkForm18'
import { enableOfficialPackage, OFFICIAL_NETWORKING_PACKAGE_ID, packageEnabled, packageState } from '../runtime/packages'
import { beginMultiplayerReplayRecording, compareMultiplayerReplays, multiplayerReplayState, normalizeMultiplayerReplay, stopMultiplayerReplayRecording } from '../runtime/networkReplay'
import { reviewedNetworkServices } from '../runtime/networkServices'
import { advertiseLocalLobby, createNetworkPlayPlan, localLobbyDirectoryState, networkAuthenticationProviders, networkEncryptionGuidance, reviewedNetworkTransports, startLocalLobbyDirectory, stopLocalLobbyAdvertisement, stopLocalLobbyDirectory } from '../runtime/networkProduction'
import { networkingModule, startProductionNetworking, stopProductionNetworking } from '../runtime/productionRuntime'
import { buildGame } from '../runtime/gameExporter'
import { buildSettings } from '../runtime/buildSettings'
import { reportRecoverableError } from '../runtime/faultCenter'
import { loadProductionSettings, productionSettings as settings, serializeProductionSettings, type NetworkPayloadSchema } from '../runtime/production'
import { requestConfirmation } from '../store/dialog'
import { physicsState, pushHistory, sceneManager } from '../store/physics'

const { error: networkFormError18, change: guardNetworkNumber18 } = useNetworkForm18()
const connectionEdited18 = ref(false)

type TabId = 'session' | 'protocol' | 'replication' | 'orchestration' | 'simulation' | 'diagnostics'
type NetworkModule = typeof import('../runtime/networking')
interface LaunchedNetworkInstance { id: string; role: string; playerName: string; sessionName: string; logScope: string; inspectorId: string; endpoint: string; bindAddress: string; processId: number; status?: string; running?: boolean; exitCode?: number | null }
const tabs: Array<{ id: TabId; label: Parameters<typeof t>[0] }> = [{ id: 'session', label: 'session' }, { id: 'protocol', label: 'protocol' }, { id: 'replication', label: 'replication' }, { id: 'orchestration', label: 'orchestration' }, { id: 'simulation', label: 'simulationReplay' }, { id: 'diagnostics', label: 'diagnostics' }]
const activeTab = ref<TabId>('session'), networkBusy = ref(false), moduleRef = shallowRef<NetworkModule | null>(null), networkState = shallowRef<NetworkModule['networkingState'] | null>(null)
const diagnosticNow29 = ref(performance.now())
let diagnosticTimer29: ReturnType<typeof setInterval> | null = null
/** 只在打开诊断页且已有授权快照时推进年龄显示，离开或断开后停止计时。 */
watch(/** 监听实际可见页与会话快照状态。 */ () => activeTab.value === 'diagnostics' && networkState.value?.lastAppliedSnapshotAt != null, /** 释放旧定时器并按需建立唯一订阅。 */ active => {
  if (diagnosticTimer29 !== null) clearInterval(diagnosticTimer29)
  diagnosticTimer29 = null; diagnosticNow29.value = performance.now()
  if (active) diagnosticTimer29 = setInterval(/** 更新时间，不采集或修改游戏数据。 */ () => { diagnosticNow29.value = performance.now() }, 1000)
})
const snapshotAge29 = computed(/** 接受时间只与本地单调时钟比较。 */ () => networkState.value?.lastAppliedSnapshotAt == null ? null : Math.max(0, Math.round(diagnosticNow29.value - networkState.value.lastAppliedSnapshotAt)))
onBeforeUnmount(/** 卸载时释放诊断页计时器。 */ () => { if (diagnosticTimer29 !== null) clearInterval(diagnosticTimer29) })

const replayA = ref(''), replayB = ref(''), saveAsset = ref(''), interestX = ref(0), interestY = ref(0), authorityEntity = ref(''), authorityPeer = ref(''), handoffScene = ref(''), handoffPeer = ref(''), handoffSpawnTag = ref(''), multiInstanceError = ref(''), multiInstanceNotice = ref(''), launchedInstances = ref<LaunchedNetworkInstance[]>([]), selectedInstanceId = ref(''), instanceDetailMode = ref<'logs' | 'inspector'>('inspector')
const peerCountPresets = [2, 4, 8] as const
const builtInChannels = ['state', 'input', 'events'], payloadSchemas: NetworkPayloadSchema[] = ['any', 'boolean', 'number', 'integer', 'string', 'vec2', 'object', 'array']
const nativeInstanceControls = '__TAURI_INTERNALS__' in window
const networkPackageEnabled = computed(/* 调用 packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID) 并返回调用结果。 */ () => packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID)), selectedEntity = computed(/** 查找当前选中实体，缺失返回空值。 */ () => physicsState.world.entities.find(/* 比较 entity.id 与 physicsState.selectedEntityId，返回严格相等的判断结果。 */ entity => entity.id === physicsState.selectedEntityId) ?? null), replicatedSelected = computed(/** 检查所选实体是否已存在复制配置。 */ () => Boolean(selectedEntity.value && settings.networking.replicatedEntities.some(/* 比较 item.entityUuid 与 selectedEntity.value?.uuid，返回严格相等的判断结果。 */ item => item.entityUuid === selectedEntity.value?.uuid)))
const canConnect = computed(/* 先计算 settings.networking.enabled && settings.networking.permissionGranted；仅当其为真值时求右侧 networkState.value?.status !== 'connected'，返回短路求值结果。 */ () => settings.networking.enabled && settings.networking.permissionGranted && networkState.value?.status !== 'connected')
const reviewedAdapters = computed(/* 调用 reviewedNetworkTransports() 并返回调用结果。 */ () => reviewedNetworkTransports()), authenticationProviders = computed(/* 调用 networkAuthenticationProviders() 并返回调用结果。 */ () => networkAuthenticationProviders())
const identityServices = computed(/* 调用 reviewedNetworkServices('identity') 并返回调用结果。 */ () => reviewedNetworkServices('identity')), lobbyServices = computed(/* 调用 reviewedNetworkServices('lobby') 并返回调用结果。 */ () => reviewedNetworkServices('lobby')), relayServices = computed(/* 调用 reviewedNetworkServices('relay') 并返回调用结果。 */ () => reviewedNetworkServices('relay'))
const selectedInstance = computed(/** 查找当前选中的已启动网络实例。 */ () => launchedInstances.value.find(/* 比较 instance.id 与 selectedInstanceId.value，返回严格相等的判断结果。 */ instance => instance.id === selectedInstanceId.value) ?? null)
const filteredInstanceEvents = computed(/** 以实例编号、玩家名和日志范围筛选相关网络事件，取最近四十条逆序显示。 */ () => { const instance = selectedInstance.value; if (!instance) return []; const terms = [instance.id, instance.playerName, instance.logScope].filter(Boolean).map(/* 调用 value.toLowerCase() 并返回调用结果。 */ value => value.toLowerCase()); return (networkState.value?.events ?? []).filter(/* 调用 terms.some(term => event.message.toLowerCase().includes(term)) 并返回调用结果。 */ event => terms.some(/* 调用 event.message.toLowerCase().includes(term) 并返回调用结果。 */ term => event.message.toLowerCase().includes(term))).slice(-40).reverse() })
const securityGuidance = computed(/** 根据网络设置及已审核适配器的加密能力生成指导说明。 */ () => networkEncryptionGuidance(settings.networking, reviewedAdapters.value.find(/* 比较 adapter.id 与 settings.networking.transportAdapterId，返回严格相等的判断结果。 */ adapter => adapter.id === settings.networking.transportAdapterId)?.encrypted === true))
const networkingPackage = computed(/** 查找项目中已启用的官方联网包。 */ () => packageState.installed.find(/* 先计算 item.manifest.id === OFFICIAL_NETWORKING_PACKAGE_ID && item.project；仅当其为真值时求右侧 item.enabled，返回短路求值结果。 */ item => item.manifest.id === OFFICIAL_NETWORKING_PACKAGE_ID && item.project && item.enabled) ?? null)
const multiInstanceLaunchIssue = computed<Parameters<typeof t>[0] | null>(/** 依序检查桌面、授权、主机角色、原生 UDP、内置服务及 Windows 单文件构建等多实例先决条件。 */ () => {
  if (!nativeInstanceControls) return 'multiInstanceRequiresDesktop'
  if (!networkPackageEnabled.value) return 'multiInstanceRequiresPackage'
  if (!settings.networking.enabled) return 'multiInstanceRequiresNetworking'
  if (!settings.networking.permissionGranted) return 'multiInstanceRequiresPermission'
  if (!settings.networking.autoStart) return 'multiInstanceRequiresAutoStart'
  if (settings.networking.role !== 'host' && settings.networking.role !== 'server') return 'multiInstanceRequiresAuthority'
  if (settings.networking.sessionMode !== 'direct') return 'multiInstanceRequiresDirect'
  if (settings.networking.transport !== 'native-udp') return 'multiInstanceRequiresNativeUdp'
  if (settings.networking.transportAdapterId || Object.values(settings.networking.services).some(Boolean)) return 'multiInstanceRequiresBuiltIn'
  if (!networkingPackage.value?.grantedPermissions.includes('network.client')) return 'multiInstanceRequiresClientGrant'
  if (!networkingPackage.value.grantedPermissions.includes('network.listen')) return 'multiInstanceRequiresListenGrant'
  if (buildSettings.target !== 'windows' || buildSettings.runtimeMode !== 'game') return 'multiInstanceRequiresWindowsGame'
  if (!buildSettings.packageIntoExecutable) return 'multiInstanceRequiresPackagedExecutable'
  return null
})
const multiInstancePrerequisiteReason = computed(/* 根据 multiInstanceLaunchIssue.value 的真假，分别返回 t(multiInstanceLaunchIssue.value) 或 ''。 */ () => multiInstanceLaunchIssue.value ? t(multiInstanceLaunchIssue.value) : '')
const canLaunchInstances = computed(/* 比较 multiInstanceLaunchIssue.value 与 null，返回严格相等的判断结果。 */ () => multiInstanceLaunchIssue.value === null)
const networkStatusLabel = computed(/** 把连接状态转换为本地化标签。 */ () => t(({ disabled: 'disabled', 'permission-required': 'permissionRequired', connecting: 'connecting', connected: 'connected', reconnecting: 'reconnecting', error: 'networkError' } as const)[networkState.value?.status ?? 'disabled']))
const multiplayerReplayAssets = computed(/** 筛选包含多人重放格式标记的重放资源。 */ () => assetState.records.filter(/* 先计算 asset.assetType === 'replay'；仅当其为真值时求右侧 readTextAsset(asset.uuid)?.includes('nova-multiplayer-replay')，返回短路求值结果。 */ asset => asset.assetType === 'replay' && readTextAsset(asset.uuid)?.includes('nova-multiplayer-replay')))
const multiplayerSaveAssets = computed(/** 筛选包含多人存档格式标记的重放资源。 */ () => assetState.records.filter(/* 先计算 asset.assetType === 'replay'；仅当其为真值时求右侧 readTextAsset(asset.uuid)?.includes('nova-multiplayer-save')，返回短路求值结果。 */ asset => asset.assetType === 'replay' && readTextAsset(asset.uuid)?.includes('nova-multiplayer-save')))

/** 加载联网模块并绑定其状态，返回模块实例。 */ async function loadModule() { moduleRef.value = await networkingModule(); networkState.value = moduleRef.value.networkingState; return moduleRef.value }
/** 安全加载联网模块，失败报告可恢复错误并返回空值。 */ async function safelyLoadModule() { try { return await loadModule() } catch (error) { reportRecoverableError(error, 'Load optional networking studio', 'Runtime'); return null } }
/** 用左右键、Home 和 End 切换网络标签，下一帧聚焦对应按钮。 */ function handleTabKeydown(event: KeyboardEvent) {
  const supported = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (!supported.includes(event.key)) return
  event.preventDefault()
  const current = tabs.findIndex(/* 比较 tab.id 与 activeTab.value，返回严格相等的判断结果。 */ tab => tab.id === activeTab.value)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
  activeTab.value = tabs[next].id
  requestAnimationFrame(/* 调用 document.getElementById(`network-studio-tab-${tabs[next].id}`)?.focus() 并返回调用结果。 */ () => document.getElementById(`network-studio-tab-${tabs[next].id}`)?.focus())
}
/** 等待模型更新后归一化网络设置并记录项目范围历史。 */ function commit() { void nextTick(/** 重新载入序列化生产设置并记录网络历史。 */ () => { loadProductionSettings(serializeProductionSettings()); pushHistory('Edit networking settings', 'project:networking') }) }
/** 设置多实例对等端数量并保存配置。 */ function setPeerCount(count: typeof peerCountPresets[number]) { settings.networking.multiInstance.peerCount = count; commit() }
/** 结合状态字段与运行标志判断实例为运行、退出、已停止或未知。 */ function instanceStatus(instance: LaunchedNetworkInstance): 'running' | 'exited' | 'stopped' | 'unknown' { return instance.status === 'stopped' ? 'stopped' : instance.status === 'exited' || instance.running === false ? 'exited' : instance.status === 'running' || instance.running === true || !instance.status ? 'running' : 'unknown' }
/** 将实例状态映射为本地化标签。 */ function instanceStatusLabel(instance: LaunchedNetworkInstance) { return t(({ running: 'instanceRunning', exited: 'instanceExited', stopped: 'instanceStopped', unknown: 'instanceUnknown' } as const)[instanceStatus(instance)]) }
/** 启用官方联网包，成功记录安装历史并加载模块。 */ function installNetworking() { if (enableOfficialPackage(OFFICIAL_NETWORKING_PACKAGE_ID)) { pushHistory('Install Nova Networking package', 'project:packages'); void safelyLoadModule() } }
/** 确认后授予网络权限并启用联网，保存配置。 */ async function grantPermission() { if (!await requestConfirmation({ title: t('grantNetworkPermission'), message: t('networkPermissionPrompt'), confirmLabel: t('grant'), cancelLabel: t('cancel'), destructive: false })) return; settings.networking.permissionGranted = true; settings.networking.enabled = true; commit() }
/** 确认后断开联网、撤销权限并关闭自动启动，保存配置。 */ async function revokePermission() { if (!await requestConfirmation({ title: t('revokeNetworkPermission'), message: t('revokeNetworkPermissionPrompt'), confirmLabel: t('revoke'), cancelLabel: t('cancel'), destructive: true })) return; await disconnect(); settings.networking.permissionGranted = false; settings.networking.autoStart = false; commit() }
/** 清除待重连标记并启动联网，捕获连接错误且始终清理忙碌状态。 */ async function connect() { connectionEdited18.value = false; networkBusy.value = true; try { moduleRef.value = await startProductionNetworking(); networkState.value = moduleRef.value.networkingState } catch (error) { if (networkState.value) networkState.value.lastError = error instanceof Error ? error.message : String(error) } finally { networkBusy.value = false } }
/** 先断开再重新连接。 */ async function reconnect18() { await disconnect(); await connect() }
/** 停止联网及本地大厅广播，结束后同步模块状态并清除忙碌标记。 */ async function disconnect() { networkBusy.value = true; try { await stopProductionNetworking(); stopLocalLobbyAdvertisement() } finally { networkBusy.value = false; if (moduleRef.value) networkState.value = moduleRef.value.networkingState } }
/** 添加默认可靠有序通道并保存。 */ function addChannel() { settings.networking.channels.push({ id: `channel-${settings.networking.channels.length + 1}`, delivery: 'reliable-ordered', maximumPayloadBytes: 8192, messagesPerSecond: 60, priority: 0 }); commit() }
/** 禁止删除内置通道；删除自定义通道后把引用它的 RPC 迁至 events 通道并保存。 */ function removeChannel(id: string) { if (builtInChannels.includes(id)) return; settings.networking.channels = settings.networking.channels.filter(/* 比较 item.id 与 id，返回严格不等的判断结果。 */ item => item.id !== id); for (const rpc of settings.networking.rpcContracts) if (rpc.channelId === id) rpc.channelId = 'events'; commit() }
/** 为首个可靠有序或首通道添加默认客户端到服务端 RPC 契约并保存。 */ function addRpc() { settings.networking.rpcContracts.push({ name: `rpc-${settings.networking.rpcContracts.length + 1}`, channelId: settings.networking.channels.find(/* 比较 item.delivery 与 'reliable-ordered'，返回严格相等的判断结果。 */ item => item.delivery === 'reliable-ordered')?.id ?? settings.networking.channels[0].id, direction: 'client-to-server', authority: 'any', payloadSchema: 'any', maximumPayloadBytes: 8192, callsPerSecond: 30 }); commit() }
/** 按名称删除 RPC 契约并保存。 */ function removeRpc(name: string) { settings.networking.rpcContracts = settings.networking.rpcContracts.filter(/* 比较 item.name 与 name，返回严格不等的判断结果。 */ item => item.name !== name); commit() }
/** 未被复制的选中实体添加服务端权威位置、旋转和速度复制设置并保存。 */ function replicateSelected() { const entity = selectedEntity.value; if (!entity || replicatedSelected.value) return; settings.networking.replicatedEntities.push({ entityUuid: entity.uuid, authority: 'server', properties: ['transform', 'rotation', 'velocity'], interpolate: true, predict: false, ownerPeerId: '', alwaysRelevant: false, interestRadius: settings.networking.interest.defaultRadius, sceneUuid: sceneManager.activeSceneUuid }); commit() }
/** 按实体标识移除复制配置并保存。 */ function removeReplication(uuid: string) { settings.networking.replicatedEntities = settings.networking.replicatedEntities.filter(/* 比较 item.entityUuid 与 uuid，返回严格不等的判断结果。 */ item => item.entityUuid !== uuid); commit() }
/** 查找实体名称，缺失显示标识。 */ function entityName(uuid: string) { return physicsState.world.entities.find(/* 比较 entity.uuid 与 uuid，返回严格相等的判断结果。 */ entity => entity.uuid === uuid)?.name ?? uuid }
/** 以当前对等端编号启动多人重放录制。 */ function recordReplay() { beginMultiplayerReplayRecording(networkState.value?.peerDetails.map(/* 返回 peer.id 的当前值。 */ peer => peer.id) ?? []) }
/** 停止录制并生成重放资源，更新比较选择并记录历史。 */ function finishReplay() { const document = stopMultiplayerReplayRecording(physicsState.globalSettings.tickRate), asset = createTextAsset(`Multiplayer Replay ${new Date().toISOString().replace(/[:.]/g, '-')}`, 'replay', JSON.stringify(document, null, 2), 'Assets/Replays'); replayA.value ||= asset.uuid; replayB.value = asset.uuid; pushHistory('Record multiplayer replay') }
/** 读取并规范化两份重放后比较，异常报告可恢复错误。 */ function compareReplays() { try { const first = readTextAsset(replayA.value), second = readTextAsset(replayB.value); if (first && second) compareMultiplayerReplays(normalizeMultiplayerReplay(JSON.parse(first)), normalizeMultiplayerReplay(JSON.parse(second))) } catch (error) { reportRecoverableError(error, 'Compare multiplayer replays', 'Runtime') } }
/** 捕获多人会话存档为资源，选中并记录历史，失败报告错误。 */ async function captureSessionSave() { try { const module = await loadModule(), document = module.multiplayerSave(), asset = createTextAsset(`Multiplayer Save ${new Date().toISOString().replace(/[:.]/g, '-')}`, 'replay', JSON.stringify(document, null, 2), 'Assets/Replays'); saveAsset.value = asset.uuid; pushHistory('Capture multiplayer session state') } catch (error) { reportRecoverableError(error, 'Capture multiplayer session state', 'Runtime') } }
/** 读取并恢复多人存档，记录恢复实体数量，失败报告错误。 */ async function restoreSessionSave() { try { const source = readTextAsset(saveAsset.value); if (!source) return; const module = await loadModule(), result = module.restoreMultiplayerSave(JSON.parse(source)); pushHistory(`Restore multiplayer session state (${result.restored})`) } catch (error) { reportRecoverableError(error, 'Restore multiplayer session state', 'Runtime') } }
/** 下载 JSON 内容，稍后释放临时对象地址。 */ function download(name: string, source: string) { const url = URL.createObjectURL(new Blob([source], { type: 'application/json' })), anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(/* 调用 URL.revokeObjectURL(url) 并返回调用结果。 */ () => URL.revokeObjectURL(url), 0) }
/** 加载模块并下载网络诊断，异常报告可恢复错误。 */ async function downloadDiagnostics() { try { const module = await loadModule(); download(`nova-network-diagnostics-${Date.now()}.json`, module.captureNetworkDiagnostics()) } catch (error) { reportRecoverableError(error, 'Export network diagnostics', 'Runtime') } }
/** 启动本地大厅发现，失败报告可恢复错误。 */ function discoverLocalLobbies() { try { startLocalLobbyDirectory() } catch (error) { reportRecoverableError(error, 'Discover local lobbies', 'Runtime') } }
/** 设置本地主机模式并保存，广播大厅信息后连接。 */ async function hostLocalLobby() { settings.networking.sessionMode = 'local'; settings.networking.role = 'host'; commit(); advertiseLocalLobby({ sessionName: settings.networking.sessionName, hostName: settings.networking.playerName, peers: networkState.value?.peers ?? 0, maximumPeers: settings.networking.maxPeers, schemaVersion: settings.networking.schemaVersion }); await connect() }
/** 设置本地客户端及目标会话名称，保存后连接。 */ async function joinLocalLobby(sessionName: string) { settings.networking.sessionMode = 'local'; settings.networking.role = 'client'; settings.networking.sessionName = sessionName; commit(); await connect() }
/** 发布指定兴趣位置、半径及场景，拒绝时显示无效兴趣提示。 */ async function publishInterest() { const module = await loadModule(); if (!module.setNetworkInterest([interestX.value, interestY.value], settings.networking.interest.defaultRadius, sceneManager.activeSceneUuid)) multiInstanceError.value = t('invalidInterest') }
/** 转移指定实体权威，拒绝时显示提示。 */ async function transferAuthority() { const module = await loadModule(); if (!module.transferNetworkAuthority(authorityEntity.value, authorityPeer.value)) multiInstanceError.value = t('authorityTransferRejected') }
/** 向指定端转交场景及出生标签，拒绝时显示提示。 */ async function handoffSceneToPeer() { const module = await loadModule(); if (!module.handoffNetworkScene(handoffPeer.value, handoffScene.value, handoffSpawnTag.value)) multiInstanceError.value = t('sceneHandoffRejected') }
/** 选中实例并打开其日志详情。 */ function openInstanceLogs(instance: LaunchedNetworkInstance) { selectedInstanceId.value = instance.id; instanceDetailMode.value = 'logs' }
/** 选中实例并打开其检查器详情。 */ function openInstanceInspector(instance: LaunchedNetworkInstance) { selectedInstanceId.value = instance.id; instanceDetailMode.value = 'inspector' }
/** 确认后停止指定原生实例，刷新状态并显示结果；失败报告可恢复错误，结束清除忙碌标记。 */ async function stopNetworkInstance(instance: LaunchedNetworkInstance) {
  if (!nativeInstanceControls) return
  if (!await requestConfirmation({ title: t('stopInstanceLabel', { name: instance.playerName }), message: t('stopInstancePrompt', { name: instance.playerName }), confirmLabel: t('stop'), cancelLabel: t('cancel'), destructive: true })) return
  multiInstanceError.value = ''; multiInstanceNotice.value = ''; networkBusy.value = true
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const stopped = await invoke<boolean>('stop_network_instance', { instanceId: instance.id })
    launchedInstances.value = await invoke<LaunchedNetworkInstance[]>('network_instance_status')
    if (selectedInstanceId.value === instance.id) selectedInstanceId.value = ''
    multiInstanceNotice.value = stopped ? t('networkInstanceStopped', { name: instance.playerName }) : t('networkInstanceNotFound', { name: instance.playerName })
  } catch (error) { multiInstanceError.value = error instanceof Error ? error.message : String(error); reportRecoverableError(error, 'Stop network peer', 'Runtime') } finally { networkBusy.value = false }
}
/** 查询原生网络实例状态并显示数量，失败记录错误，始终清除忙碌标记。 */ async function refreshLaunchedInstances() {
  if (!nativeInstanceControls) return
  multiInstanceError.value = ''; multiInstanceNotice.value = ''; networkBusy.value = true
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    launchedInstances.value = await invoke<LaunchedNetworkInstance[]>('network_instance_status')
    multiInstanceNotice.value = t('networkInstancesRefreshed', { count: launchedInstances.value.length })
  } catch (error) { multiInstanceError.value = error instanceof Error ? error.message : String(error); reportRecoverableError(error, 'Refresh network peer status', 'Runtime') } finally { networkBusy.value = false }
}
/** 确认后停止全部原生实例并清空列表，失败记录错误，始终清除忙碌标记。 */ async function stopLaunchedInstances() {
  if (!nativeInstanceControls || !launchedInstances.value.length) return
  if (!await requestConfirmation({ title: t('stopAllInstances'), message: t('stopAllInstancesPrompt'), confirmLabel: t('stopAllInstances'), cancelLabel: t('cancel'), destructive: true })) return
  multiInstanceError.value = ''; multiInstanceNotice.value = ''; networkBusy.value = true
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('stop_network_instances')
    launchedInstances.value = []
    multiInstanceNotice.value = t('networkInstancesStopped')
  } catch (error) { multiInstanceError.value = error instanceof Error ? error.message : String(error); reportRecoverableError(error, 'Stop network peers', 'Runtime') } finally { networkBusy.value = false }
}
/** 检查先决条件后构建游戏，查找单文件可执行产物并通过原生命令启动计划数量实例，记录结果或错误。 */ async function buildAndLaunchInstances() {
  multiInstanceError.value = ''; multiInstanceNotice.value = ''; networkBusy.value = true
  try {
    if (!canLaunchInstances.value) throw new Error(multiInstancePrerequisiteReason.value || t('multiInstancePrerequisites'))
    const plan = createNetworkPlayPlan(settings.networking.multiInstance.peerCount, settings.networking.sessionName), result = await buildGame(false)
    const executableName = result.files.find(/* 调用 /^[^/\\]+\.exe$/i.test(file) 并返回调用结果。 */ file => /^[^/\\]+\.exe$/i.test(file))
    if (!executableName) throw new Error(t('multiInstanceExecutableMissing'))
    const executable = `${result.outputPath.replace(/[\\/]+$/, '')}\\${executableName}`
    const { invoke } = await import('@tauri-apps/api/core')
    launchedInstances.value = await invoke<LaunchedNetworkInstance[]>('launch_network_instances', { request: { executable, workingDirectory: result.outputPath, sessionName: settings.networking.sessionName, count: plan.length, separateLogs: settings.networking.multiInstance.separateLogs, separateInspectors: settings.networking.multiInstance.separateInspectors } })
    multiInstanceNotice.value = t('networkInstancesLaunched', { count: launchedInstances.value.length })
  } catch (error) { multiInstanceError.value = error instanceof Error ? error.message : String(error); reportRecoverableError(error, 'Build and launch network peers', 'Runtime') } finally { networkBusy.value = false }
}

const connectionIdentity18 = /** 序列化连接角色、会话、版本、传输、认证、服务及通道配置作为变化签名。 */ () => JSON.stringify([settings.networking.role, settings.networking.sessionMode, settings.networking.sessionName, settings.networking.schemaVersion, settings.networking.transport, settings.networking.transportAdapterId, settings.networking.endpoint, settings.networking.bindAddress, settings.networking.authentication, settings.networking.services, settings.networking.channels.map(/* 返回按声明顺序构造的数组 [channel.id, channel.delivery]。 */ channel => [channel.id, channel.delivery])])
watch(connectionIdentity18, /** 活动连接参数变化时标记需要重新连接并断开，禁用或待授权状态不处理。 */ async (next, previous) => {
  if (next === previous || !networkState.value || networkState.value.status === 'disabled' || networkState.value.status === 'permission-required') return
  connectionEdited18.value = true
  await disconnect()
})
watch(networkPackageEnabled, /** 联网包启用时安全加载模块。 */ enabled => { if (enabled) void safelyLoadModule() })
onMounted(/** 挂载时若联网包启用则加载模块。 */ () => { if (networkPackageEnabled.value) void safelyLoadModule() })
onBeforeUnmount(/* 调用 stopLocalLobbyDirectory() 并返回调用结果。 */ () => stopLocalLobbyDirectory())
</script>

<style scoped>
.network-contract29 dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:12px}.network-contract29 dd{margin:4px 0;overflow-wrap:anywhere}.network-contract29 p{line-height:1.5;overflow-wrap:anywhere}

.network-studio {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface-1);
  container-type: inline-size;
}
.studio-header {
  flex: 0 0 auto;
  min-height: 52px;
  padding: 7px 10px;
  display: grid;
  grid-template-columns: minmax(170px, .5fr) minmax(500px, 1.65fr) auto;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
}
.studio-header > div { display: flex; flex-direction: column; min-width: 0; }
.studio-header > div span,
.card p,
.peers-card small { color: var(--text-muted); font-size: 11px; line-height: 1.5; }
.studio-header nav {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(6, minmax(76px, 1fr));
  gap: 5px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
}
.studio-header button,
.card button,
.empty-state button {
  min-height: 30px;
  max-width: 100%;
  padding: 4px 9px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  color: var(--text-secondary);
  background: var(--surface-2);
  font-size: 11px;
  line-height: 1.25;
  white-space: normal;
  transition: border-color .16s ease, background-color .16s ease, color .16s ease, transform .16s ease;
}
.studio-header button:hover:not(:disabled),
.card button:hover:not(:disabled) { transform: translateY(-1px); }
.studio-header button.active,
.primary,
.peer-count-picker button.active { color: var(--accent-contrast) !important; border-color: var(--accent) !important; background: var(--accent) !important; }
.studio-header [role="tab"]:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.studio-header > output {
  max-width: 150px;
  padding: 5px 9px;
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.3;
  text-align: center;
  overflow-wrap: anywhere;
}
.studio-header > output.connected { color: var(--success); border-color: color-mix(in srgb, var(--success) 55%, var(--border-subtle)); }
.studio-header > output.error,
.danger,
.error { color: var(--danger) !important; }
.warning { color: var(--warning) !important; }
.studio-grid {
  min-height: 0;
  flex: 1;
  padding: 9px;
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  grid-auto-rows: min-content;
  gap: 9px;
  align-items: start;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}
.studio-grid:focus-visible { outline: 2px solid var(--accent); outline-offset: -3px; }
.network-wide-grid { grid-template-columns: repeat(3, minmax(240px, 1fr)); }
.card {
  min-width: 0;
  max-width: 100%;
  padding: 10px;
  border: 1px solid var(--border-subtle);
  border-radius: 11px;
  background: var(--surface-2);
  overflow: hidden;
}
.card > header { min-height: 32px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.card > header > * { min-width: 0; }
.card > header span { color: var(--text-muted); font-size: 11px; }
.card > label,
.limits-card label {
  min-height: 35px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 11px;
}
.card > label > span { min-width: 0; overflow-wrap: anywhere; }
.card > label input:not([type="checkbox"]),
.card > label select { width: 56%; min-width: 0; max-width: 100%; }
.card input,
.card select { max-width: 100%; }
.card p,
.card code,
.card small,
.event-list span,
.packet-list span,
.timeline-list span,
.breakable { overflow-wrap: anywhere; word-break: break-word; }
.button-row { margin: 7px 0; display: flex; gap: 6px; flex-wrap: wrap; }
.danger-button { color: var(--danger) !important; border-color: var(--danger) !important; }
.span-two { grid-column: span 2; }
.span-three { grid-column: 1 / -1; }
.table-scroll,
.event-list,
.packet-list,
.timeline-list { max-width: 100%; max-height: 310px; overflow: auto; overscroll-behavior: contain; }
.channel-row,
.rpc-row,
.replication-row {
  min-width: 720px;
  padding: 6px 0;
  display: grid;
  gap: 6px;
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 11px;
}
.channel-row { grid-template-columns: 120px 160px 1fr 1fr 1fr 28px; }
.rpc-row { grid-template-columns: 120px 105px 145px 90px 85px 90px 75px 28px; }
.replication-row { min-width: 880px; grid-template-columns: minmax(120px, 1fr) 90px minmax(210px, 1.4fr) 88px 72px 105px 86px 28px; }
.channel-row label,
.replication-row label { min-height: 28px; display: flex; align-items: center; gap: 5px; color: var(--text-muted); }
.channel-row label { justify-content: space-between; }
.channel-row label input { width: 100%; }
.replication-row > div { display: flex; gap: 8px; flex-wrap: wrap; }
.peers-card article,
.lobby-list article { padding: 7px; display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px solid var(--border-subtle); }
.peers-card article span,
.lobby-list article span { display: flex; flex-direction: column; min-width: 0; }
.peers-card code { max-width: 55%; white-space: normal; }
.metrics-card dl { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.metrics-card dl div { min-width: 0; padding: 6px; display: flex; justify-content: space-between; gap: 6px; border-radius: 6px; background: var(--surface-3); font-size: 11px; }
.metrics-card dt { min-width: 0; color: var(--text-muted); overflow-wrap: anywhere; }
.metrics-card dd { margin: 0; text-align: end; overflow-wrap: anywhere; }
.event-list article,
.packet-list article,
.timeline-list article { min-height: 29px; padding: 4px 6px; display: grid; gap: 7px; align-items: center; border-bottom: 1px solid var(--border-subtle); font-size: 11px; }
.event-list article { grid-template-columns: 72px 58px minmax(0, 1fr); }
.packet-list article { grid-template-columns: 80px 90px minmax(0, 1fr) 70px 24px; }
.timeline-list article { grid-template-columns: 64px minmax(0, .8fr) minmax(0, 1.5fr); }
.event-list article.warning { color: var(--warning); }
.event-list article.error,
.packet-list .rejected { color: var(--danger); }
.coordinate-row button { grid-column: 1 / -1; }
.coordinate-row { margin: 8px 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.ownership-list { margin-top: 8px; display: grid; gap: 4px; max-height: 130px; overflow: auto; }
.ownership-list code { padding: 5px 7px; border-radius: 6px; background: var(--surface-3); white-space: normal; }
.peer-count-picker { margin: 7px 0; display: grid; grid-template-columns: repeat(3, minmax(48px, 1fr)); gap: 6px; }
.peer-count-picker button { min-height: 34px; font-variant-numeric: tabular-nums; }
.service-selector-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.service-selector-grid label { min-width: 0; display: grid; gap: 5px; color: var(--text-muted); font-size: 11px; }
.service-selector-grid select { width: 100%; min-width: 0; }
.instance-actions > button { flex: 1 1 132px; }
.instance-grid { margin-top: 9px; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 7px; }
.instance-grid article { min-width: 0; padding: 8px; display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-3); }
.instance-grid article.selected { border-color: var(--accent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent); }
.instance-grid span,
.instance-grid code { min-width: 0; color: var(--text-muted); font-size: 11px; white-space: normal; }
.instance-card-title { display: flex; align-items: start; justify-content: space-between; gap: 7px; }
.instance-card-title strong { min-width: 0; overflow-wrap: anywhere; }
.instance-card-title output { flex: 0 0 auto; padding: 2px 6px; border: 1px solid var(--border-subtle); border-radius: 999px; color: var(--text-muted); font-size: var(--type-caption); }
.instance-card-title output.running { color: var(--success); border-color: color-mix(in srgb, var(--success) 45%, var(--border-subtle)); }
.instance-card-title output.exited,
.instance-card-title output.stopped { color: var(--text-muted); }
.instance-card-actions { margin-top: 4px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
.instance-card-actions button { min-width: 0; padding-inline: 5px; }
.instance-detail { margin-top: 9px; padding: 9px; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-1); }
.instance-detail > header { display: flex; justify-content: space-between; gap: 8px; }
.instance-detail > header span { display: flex; flex-direction: column; min-width: 0; }
.instance-detail dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; }
.instance-detail dl div { min-width: 0; padding: 6px; border-radius: 6px; background: var(--surface-3); }
.instance-detail dt { color: var(--text-muted); font-size: var(--type-caption); }
.instance-detail dd { margin: 2px 0 0; overflow-wrap: anywhere; }
.instance-event-list { max-height: 150px; overflow: auto; }
.instance-event-list article { display: grid; grid-template-columns: 78px minmax(0, 1fr); gap: 7px; padding: 5px; border-bottom: 1px solid var(--border-subtle); font-size: 11px; }
.success-copy { color: var(--success) !important; }
.prerequisite-copy { margin: 5px 0 0; color: var(--warning) !important; }
.empty-copy { margin: 8px 0 0; }
.empty-state { margin: auto; padding: 24px; max-width: 520px; text-align: center; }
.empty-state p { color: var(--text-muted); }

@container (max-width: 1000px) {
  .studio-header { grid-template-columns: minmax(0, 1fr) auto; }
  .studio-header nav { grid-column: 1 / -1; grid-row: 2; display: flex; padding-bottom: 2px; }
  .studio-header nav button { flex: 1 0 max-content; }
  .studio-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .span-three { grid-column: 1 / -1; }
  .span-two { grid-column: span 2; }
}

@container (max-width: 880px) {
  .service-selector-grid { grid-template-columns: 1fr; }
  .channel-row,
  .rpc-row,
  .replication-row {
    min-width: 0;
    margin-bottom: 7px;
    padding: 8px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    background: var(--surface-3);
  }
  .channel-row > *,
  .rpc-row > *,
  .replication-row > * { min-width: 0; width: 100%; }
  .channel-row > button,
  .rpc-row > button,
  .replication-row > button { width: auto; justify-self: end; }
  .replication-row > strong,
  .replication-row > div { grid-column: 1 / -1; }
}

@container (max-width: 620px) {
  .studio-header { display: flex; flex-wrap: wrap; }
  .studio-header > div { width: calc(100% - 100px); }
  .studio-header nav { width: 100%; }
  .studio-header > output { margin-inline-start: auto; }
  .studio-grid { display: flex; flex-direction: column; }
  .card { width: 100%; }
  .span-two,
  .span-three { grid-column: auto; }
  .metrics-card dl { grid-template-columns: 1fr; }
  .instance-detail dl { grid-template-columns: 1fr; }
  .table-scroll { max-height: 360px; }
  .channel-row,
  .rpc-row,
  .replication-row { display: flex; flex-wrap: wrap; }
  .channel-row > *:not(button),
  .rpc-row > *:not(button),
  .replication-row > *:not(button) { flex: 1 1 145px; }
  .replication-row > strong,
  .replication-row > div { flex-basis: 100%; }
  .event-list article,
  .timeline-list article { grid-template-columns: 62px minmax(0, 1fr); }
  .event-list article span,
  .timeline-list article span { grid-column: 1 / -1; }
  .packet-list article { grid-template-columns: 72px minmax(0, 1fr) 44px 22px; }
  .packet-list article strong { grid-column: 1 / -1; }
  .coordinate-row { grid-template-columns: 1fr 1fr; }
  .coordinate-row button { grid-column: 1 / -1; }
}

@container (max-width: 420px) {
  .studio-header > div { width: 100%; }
  .studio-header > output { margin-inline-start: 0; }
  .card > label { align-items: stretch; flex-direction: column; padding: 6px 0; }
  .card > label input:not([type="checkbox"]),
  .card > label select { width: 100%; }
  .peer-count-picker { grid-template-columns: repeat(3, 1fr); }
}

@media (prefers-reduced-motion: reduce) {
  .studio-header button,
  .card button { transition: none; }
}
/* 26.18: labeled forms use their available container rather than fixed table widths. */
.network-draft-error { flex: 0 0 auto; max-height: 25%; overflow: auto; margin: 0; padding: 8px 12px; color: var(--danger); overflow-wrap: anywhere; }
.studio-header nav { grid-template-columns: repeat(6, minmax(max-content, 1fr)); }
.studio-header nav button { white-space: nowrap; word-break: normal; overflow-wrap: normal; }
.card > header { flex-wrap: wrap; }
.card > label { gap: 12px; padding-block: 7px; }
.card > label input:not([type="checkbox"]), .card > label select { min-width: min(100%, 96px); }
.table-scroll { max-height: none; overflow: visible; }
.channel-row, .rpc-row, .replication-row { min-width: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); align-items: start; gap: 12px; padding: 12px 0; }
.channel-row > label, .rpc-row > label, .replication-row > label { min-width: 0; display: flex; flex-direction: column; align-items: stretch; gap: 6px; }
.channel-row > label > span, .rpc-row > label > span, .replication-row > label > span { overflow-wrap: anywhere; }
.channel-row input, .channel-row select, .rpc-row input, .rpc-row select, .replication-row input:not([type="checkbox"]), .replication-row select { width: 100%; min-width: 0; }
.replication-row > strong, .replication-row > fieldset { grid-column: 1 / -1; min-width: 0; overflow-wrap: anywhere; }
.replication-row fieldset { display: flex; flex-wrap: wrap; gap: 10px; border: 1px solid var(--border-subtle); padding: 10px; }
.replication-row > .toggle-field { flex-direction: row; align-items: center; }
.card pre { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
.card details { max-width: 100%; }
</style>
