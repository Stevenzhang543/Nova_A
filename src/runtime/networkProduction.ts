/** Authoring lobby compatibility plus the unique Runtime network values. */
import { reactive } from 'vue'
export type { NetworkTransportContract, NetworkTransportReview, ReviewedNetworkTransportAdapter, NetworkAuthenticationContext, NetworkAuthenticationProvider, NetworkSecurityEnvelope, NetworkReplayDecision, NetworkInterestView, NetworkRollbackEntry, NetworkReplicationDiff, NetworkPlayInstance } from './networkProductionValues'
export { transportReviewIssues, registerReviewedNetworkTransport, reviewedNetworkTransports, createReviewedNetworkTransport, registerNetworkAuthenticationProvider, networkAuthenticationProviders, createAuthenticationProof, verifyAuthenticationProof, NetworkReplayProtectionWindow, NetworkAuthorityTable, entityRelevantToPeer, NetworkTimeline, createNetworkPlayPlan, networkEncryptionGuidance } from './networkProductionValues'
export { createNetworkEpoch, createNetworkNonce } from '../platform/networkPlatformFactory'

export const localLobbyDirectoryState = reactive({
  active: false,
  advertising: false,
  lobbies: [] as Array<{ sessionName: string; hostName: string; peers: number; maximumPeers: number; schemaVersion: number; lastSeenAt: number }>,
  lastError: ''
})

let directoryChannel: BroadcastChannel | null = null

let directoryTimer: ReturnType<typeof setInterval> | null = null

export function startLocalLobbyDirectory(): void {
  if (directoryChannel) return
  if (typeof BroadcastChannel === 'undefined') throw new Error('Local lobby discovery is unavailable in this runtime.')
  directoryChannel = new BroadcastChannel('nova-a-local-lobby-directory-v1')
  directoryChannel.onmessage = /** 结构说明（自动提取）：匿名回调；输入 event；直接调用 value.sessionName.slice、value.hostName.slice、Math.max、Math.min、Number 等；写入 localLobbyDirectoryState.lobbies。 */ event => {
    const value = event.data as Record<string, unknown>
    if (value?.format !== 'nova-local-lobby' || value.version !== 1 || typeof value.sessionName !== 'string' || typeof value.hostName !== 'string') return
    const lobby = { sessionName: value.sessionName.slice(0, 80), hostName: value.hostName.slice(0, 80), peers: Math.max(0, Math.min(64, Number(value.peers) || 0)), maximumPeers: Math.max(1, Math.min(64, Number(value.maximumPeers) || 1)), schemaVersion: Math.max(1, Math.min(65_535, Number(value.schemaVersion) || 1)), lastSeenAt: Date.now() }
    const existing = localLobbyDirectoryState.lobbies.find(/* 先计算 item.sessionName === lobby.sessionName；仅当其为真值时求右侧 item.hostName === lobby.hostName，返回短路求值结果。 */ item => item.sessionName === lobby.sessionName && item.hostName === lobby.hostName)
    existing ? Object.assign(existing, lobby) : localLobbyDirectoryState.lobbies.push(lobby)
    localLobbyDirectoryState.lobbies = localLobbyDirectoryState.lobbies.filter(/* 比较 Date.now() - item.lastSeenAt 与 5_000，返回小于的判断结果。 */ item => Date.now() - item.lastSeenAt < 5_000).slice(0, 64)
  }
  localLobbyDirectoryState.active = true; localLobbyDirectoryState.lastError = ''
}

export function advertiseLocalLobby(input: { sessionName: string; hostName: string; peers: number; maximumPeers: number; schemaVersion: number }): void {
  startLocalLobbyDirectory(); stopLocalLobbyAdvertisement(); localLobbyDirectoryState.advertising = true
  const publish = /** 结构说明（自动提取）：publish；无显式参数；直接调用 directoryChannel.postMessage、input.sessionName.slice、input.hostName.slice；返回表达式求值结果。 */ () => directoryChannel?.postMessage({ format: 'nova-local-lobby', version: 1, sessionName: input.sessionName.slice(0, 80), hostName: input.hostName.slice(0, 80), peers: input.peers, maximumPeers: input.maximumPeers, schemaVersion: input.schemaVersion })
  publish(); directoryTimer = globalThis.setInterval(publish, 1_000)
}

export function stopLocalLobbyAdvertisement(): void { if (directoryTimer !== null) clearInterval(directoryTimer); directoryTimer = null; localLobbyDirectoryState.advertising = false }

export function stopLocalLobbyDirectory(): void { stopLocalLobbyAdvertisement(); directoryChannel?.close(); directoryChannel = null; localLobbyDirectoryState.active = false; localLobbyDirectoryState.lobbies.splice(0) }
