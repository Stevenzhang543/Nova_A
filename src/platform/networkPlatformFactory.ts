import type { NetworkPlatformPorts, NetworkTransportContext } from '../runtime/networkSessionContracts'
import { safeId } from '../runtime/networkProductionValues'
import { openReviewedNetworkService } from '../runtime/networkServices'
import { LocalLobbyTransport, WebSocketTransport } from './webNetworkTransports'
import { NativeUdpTransport } from './nativeNetworkTransport'

export function createNetworkEpoch(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return safeId(random, 80)
}

export function createNetworkNonce(sequence: number): string {
  const random = typeof crypto !== 'undefined' && 'getRandomValues' in crypto ? crypto.getRandomValues(new Uint32Array(2)) : new Uint32Array([Date.now() >>> 0, Math.floor(Math.random() * 0xffff_ffff)])
  return `${sequence.toString(36)}-${random[0].toString(36)}-${random[1].toString(36)}`.slice(0, 120)
}

function peerIdentity(playerName: string): string { const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; return `${playerName.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 32)}-${uuid.slice(0, 12)}` }

export function createNetworkPlatformPorts():NetworkPlatformPorts {
  return Object.freeze({
    now:()=>performance.now(),wallNow:()=>Date.now(),
    setTimeout:(callback:()=>void,delay:number)=>globalThis.setTimeout(callback,delay),clearTimeout:(handle:ReturnType<typeof globalThis.setTimeout>)=>globalThis.clearTimeout(handle),
    createAbortController:()=>new AbortController(),abortError:(message:string)=>new DOMException(message,'AbortError'),
    createEpoch:createNetworkEpoch,createNonce:createNetworkNonce,peerIdentity,
    openService:openReviewedNetworkService,
    createTransport(kind:'local-loopback'|'websocket'|'native-udp',context:NetworkTransportContext) { return kind==='local-loopback'?new LocalLobbyTransport(context):kind==='native-udp'?new NativeUdpTransport(context):new WebSocketTransport(context) }
  })
}
