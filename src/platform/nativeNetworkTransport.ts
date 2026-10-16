import type { NetworkTransport, NetworkTransportContext } from '../runtime/networkSessionContracts'

export class NativeUdpTransport implements NetworkTransport {
  constructor(private readonly context:NetworkTransportContext) {}

  readonly kind = 'native-udp' as const
  private socketId: number | null = null
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private peers = new Map<string, string>()
  /** 结构说明（自动提取）：connect；输入 onMessage、onState；直接调用 Error、invoke、onState、poll；写入 socketId；等待异步结果；包含显式抛错路径。 */ async connect(onMessage: (source: string, peer: string) => void, onState: (state: string) => void): Promise<void> {
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) throw new Error('Native UDP transport is available only in a Nova_A desktop player.')
    const { invoke } = await import('@tauri-apps/api/core')
    this.socketId = await invoke<number>('udp_open', { bindAddress: this.context.configuration.networking.bindAddress })
    const poll = /** 结构说明（自动提取）：poll；无显式参数；直接调用 invoke、onMessage、onState、String、globalThis.setTimeout；写入 pollTimer；包含循环处理；等待异步结果。 */ async () => {
      if (this.socketId === null) return
      try {
        const packets = await invoke<Array<{ source: string; payload: string }>>('udp_receive', { socketId: this.socketId, maximum: 64 })
        for (const packet of packets) onMessage(packet.payload, packet.source)
      } catch (error) { onState(error instanceof Error ? error.message : String(error)) }
      if (this.socketId !== null) this.pollTimer = globalThis.setTimeout(poll, 8)
    }
    onState('connected'); void poll()
  }
  /** 结构说明（自动提取）：send；输入 source、target；直接调用 Error、productionSettings.networking.endpoint.replace、peers.get、peers.values、slice 等；包含循环处理；等待异步结果；包含显式抛错路径。 */ async send(source: string, target = ''): Promise<void> {
    if (this.socketId === null) throw new Error('UDP socket is not open.')
    const { invoke } = await import('@tauri-apps/api/core')
    const configured = this.context.configuration.networking.endpoint.replace(/^udp:\/\//i, '')
    const mappedTarget = target ? this.peers.get(target) : undefined
    if (target && !mappedTarget) throw new Error('Native UDP target has not completed bounded peer admission.')
    const targets = mappedTarget ? [mappedTarget] : this.context.configuration.networking.role === 'client' ? [configured] : [...this.peers.values()]
    for (const destination of [...new Set(targets)].slice(0, this.context.configuration.networking.maxPeers)) {
      await invoke('udp_admit_peer', { socketId: this.socketId, target: destination })
      await invoke('udp_send', { socketId: this.socketId, target: destination, payload: source })
    }
  }
  /** 结构说明（自动提取）：close；无显式参数；直接调用 clearTimeout、invoke、peers.clear；写入 pollTimer、socketId；等待异步结果。 */ async close(): Promise<void> {
    if (this.pollTimer !== null) clearTimeout(this.pollTimer); this.pollTimer = null
    if (this.socketId !== null) { const { invoke } = await import('@tauri-apps/api/core'); await invoke('udp_close', { socketId: this.socketId }) }
    this.socketId = null; this.peers.clear()
  }
  /** 结构说明（自动提取）：bindPeer；输入 peerId、endpoint；直接调用 peers.set。 */ bindPeer(peerId: string, endpoint: string): void { if (peerId && endpoint && this.peers.size < this.context.configuration.networking.maxPeers) this.peers.set(peerId, endpoint) }
  /** 结构说明（自动提取）：unbindPeer；输入 peerId；直接调用 peers.get、peers.delete、catch、then。 */ unbindPeer(peerId: string): void {
    const endpoint = this.peers.get(peerId), socketId = this.socketId
    this.peers.delete(peerId)
    if (endpoint && socketId !== null) void import('@tauri-apps/api/core').then(/* 调用 invoke('udp_forget_peer', { socketId, target: endpoint }) 并返回调用结果。 */ ({ invoke }) => invoke('udp_forget_peer', { socketId, target: endpoint })).catch(/* 返回 undefined 的当前值。 */ () => undefined)
  }
}
