import type { NetworkTransport, NetworkTransportContext } from '../runtime/networkSessionContracts'
import { stableNetworkJson } from '../runtime/networkProtocol'

export class LocalLobbyTransport implements NetworkTransport {
  constructor(private readonly context:NetworkTransportContext) {}

  readonly kind = 'local-loopback' as const
  private channel: BroadcastChannel | null = null
  /** 结构说明（自动提取）：connect；输入 onMessage、onState；直接调用 Error、BroadcastChannel、networkSessionId、onState；写入 channel、channel.onmessage、channel.onmessageerror；包含显式抛错路径。 */ async connect(onMessage: (source: string, peer: string) => void, onState: (state: string) => void): Promise<void> {
    if (typeof BroadcastChannel === 'undefined') throw new Error('This runtime does not provide local lobby channels.')
    this.channel = new BroadcastChannel(`nova-a-${this.context.networkSessionId()}`)
    this.channel.onmessage = /** 结构说明（自动提取）：匿名回调；输入 event；直接调用 onMessage。 */ event => { const value = event.data as { source?: unknown; peer?: unknown; target?: unknown }; if (typeof value?.source === 'string' && typeof value.peer === 'string' && value.peer !== this.context.networkingState.localPeerId && (typeof value.target !== 'string' || !value.target || value.target === this.context.networkingState.localPeerId)) onMessage(value.source, value.peer) }
    this.channel.onmessageerror = /* 调用 onState('Local lobby message could not be decoded.') 并返回调用结果。 */ () => onState('Local lobby message could not be decoded.')
    onState('connected')
  }
  /** 结构说明（自动提取）：send；输入 source、target；直接调用 Error、channel.postMessage；包含显式抛错路径。 */ async send(source: string, target = ''): Promise<void> { if (!this.channel) throw new Error('Local lobby is not open.'); this.channel.postMessage({ source, peer: this.context.networkingState.localPeerId, target }) }
  /** 结构说明（自动提取）：close；无显式参数；直接调用 channel.close；写入 channel。 */ async close(): Promise<void> { this.channel?.close(); this.channel = null }
}

export class WebSocketTransport implements NetworkTransport {
  constructor(private readonly context:NetworkTransportContext) {}

  readonly kind = 'websocket' as const
  private socket: WebSocket | null = null
  private cancelOpening: (() => void) | null = null
  /** 结构说明（自动提取）：connect；输入 onMessage、onState；直接调用 test、Error、Promise；等待异步结果；包含显式抛错路径。 */ async connect(onMessage: (source: string, peer: string) => void, onState: (state: string) => void): Promise<void> {
    if (!/^wss?:\/\//i.test(this.context.configuration.networking.endpoint)) throw new Error('WebSocket endpoint must begin with ws:// or wss://.')
    await new Promise<void>(/** 结构说明（自动提取）：匿名回调；输入 resolve、reject；直接调用 WebSocket、globalThis.setTimeout；写入 socket、socket.onopen、socket.onmessage、socket.onerror 等。 */ (resolve, reject) => {
      const socket = new WebSocket(this.context.configuration.networking.endpoint); this.socket = socket
      let settled = false
      /** 握手只完成一次；所有成功、失败和主动停止路径均释放超时。 */
      const finish = (error?: Error): void => {
        if (settled) return
        settled = true; clearTimeout(timeout); this.cancelOpening = null
        if (error) reject(error); else resolve()
      }
      const timeout = globalThis.setTimeout(/** 超时必须拒绝当前握手而非遗留挂起承诺。 */ () => finish(new Error('WebSocket connection timed out.')), 10_000)
      this.cancelOpening = /** 主动停止立刻结束尚未完成的握手。 */ () => finish(new DOMException('WebSocket connection cancelled.', 'AbortError'))
      socket.onopen = /** 结构说明（自动提取）：匿名回调；无显式参数；直接调用 clearTimeout、onState、resolve。 */ () => { if (settled || this.socket !== socket) return; onState('connected'); finish() }
      socket.onmessage = /** 结构说明（自动提取）：匿名回调；输入 event；直接调用 JSON.parse、test、onMessage。 */ event => {
        const source = typeof event.data === 'string' ? event.data : ''
        try {
          const route = JSON.parse(source) as { format?: unknown; version?: unknown; target?: unknown; sender?: unknown; payload?: unknown }
          if (route.format === 'nova-network-route' && route.version === 1 && typeof route.payload === 'string' && route.payload.length <= this.context.configuration.networking.maximumPacketBytes && typeof route.sender === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(route.sender) && (route.target === '' || route.target === this.context.networkingState.localPeerId)) { onMessage(route.payload, route.sender); return }
        } catch { /* A one-peer/raw broker remains backwards compatible. */ }
        onMessage(source, 'websocket-peer')
      }
      socket.onerror = /** 结构说明（自动提取）：匿名回调；无显式参数；直接调用 clearTimeout、reject、Error。 */ () => { finish(new Error('WebSocket transport failed.')); if (this.socket === socket) onState('WebSocket transport failed.') }
      socket.onclose = /** 对端握手前关闭时也立即失败，避免等待残留超时。 */ () => { finish(new Error('WebSocket closed before connection completed.')); if (this.socket === socket) onState('closed') }
    })
  }
  /** 结构说明（自动提取）：send；输入 source、target；直接调用 Error、socket.send、stableNetworkJson；包含显式抛错路径。 */ async send(source: string, target = ''): Promise<void> { if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('WebSocket is not connected.'); this.socket.send(target ? stableNetworkJson({ format: 'nova-network-route', version: 1, sender: this.context.networkingState.localPeerId, target, payload: source }) : source) }
  /** 结构说明（自动提取）：close；无显式参数；直接调用 socket.close；写入 socket。 */ async close(): Promise<void> { const socket = this.socket; this.socket = null; this.cancelOpening?.(); this.cancelOpening = null; if (socket) { socket.onopen = null; socket.onmessage = null; socket.onerror = null; socket.onclose = null; socket.close(1000, 'Nova_A session stopped') } }
}
