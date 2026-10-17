/** 有界信号队列：为每条信号分配单调序号，并**显式记录**丢弃数量与丢弃区间。
 * 设计理由（主指令 §5.3）：可靠边缘与事务不得静默丢弃。原实现遇到上限时只记一条 warning，
 * 既不计数也无法定位丢了什么；此处把丢弃变成可观测事实，并保留序号用于顺序与消费关联。
 * 本模块不依赖 Runtime 或 Vue，因此可在 Node 中独立验证。 */

export interface SignalQueueEntry {
  name: string
  payload: unknown
  target: string
  source: string
  deliveredCallbacks?: string[]
}

export interface QueuedSignal extends SignalQueueEntry {
  /** 单调递增的发送序号，从 1 开始；用于顺序校验与消费关联。 */
  sequence: number
}

export interface SignalQueueStats {
  /** 累计入队数量。 */
  emitted: number
  /** 累计被 drain 取出的数量。 */
  dispatched: number
  /** 因超限被丢弃的数量。 */
  dropped: number
  /** 发生过丢弃的批次数（用于判断是否为持续过载而非瞬时尖峰）。 */
  overflowEpisodes: number
  /** 当前队列深度。 */
  depth: number
  /** 最近一次分配的序号；未发送过为 0。 */
  lastSequence: number
  /** 被丢弃的最小与最大序号；从未丢弃时为 null。 */
  droppedRange: { from: number; to: number } | null
}

export class SignalQueue {
  private entries: QueuedSignal[] = []
  private sequence = 0
  private emitted = 0
  private dispatched = 0
  private dropped = 0
  private overflowEpisodes = 0
  private droppedFrom: number | null = null
  private droppedTo: number | null = null

  constructor(private readonly limit = 1024) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error('SignalQueue limit must be a positive integer.')
  }

  /** 入队一条信号；返回值带有本次分配的序号，便于调用方直接关联。 */
  enqueue(entry: SignalQueueEntry): QueuedSignal {
    const signal: QueuedSignal = { ...entry, sequence: ++this.sequence }
    this.entries.push(signal)
    this.emitted += 1
    if (this.entries.length > this.limit) {
      this.overflowEpisodes += 1
      // 只在超限时丢弃最旧的条目，并记录被丢弃的序号范围。
      while (this.entries.length > this.limit) {
        const droppedEntry = this.entries.shift()
        if (!droppedEntry) break
        this.dropped += 1
        this.droppedFrom = this.droppedFrom === null ? droppedEntry.sequence : Math.min(this.droppedFrom, droppedEntry.sequence)
        this.droppedTo = this.droppedTo === null ? droppedEntry.sequence : Math.max(this.droppedTo, droppedEntry.sequence)
      }
    }
    return signal
  }

  /** 取出当前全部信号并清空队列；取出的顺序与入队顺序一致。 */
  drain(): QueuedSignal[] {
    const batch = this.entries
    this.entries = []
    this.dispatched += batch.length
    return batch
  }

  /** 丢弃指向某个接收者的待发信号；返回被移除的数量。 */
  dropTarget(target: string): number {
    if (!target) return 0
    const before = this.entries.length
    this.entries = this.entries.filter(/** 保留与该接收者无关的信号。 */ signal => signal.target !== target)
    return before - this.entries.length
  }

  /** 清空队列但不改动累计计数，用于会话重置。 */
  clear(): void { this.entries = [] }

  /** 返回当前统计快照。 */
  stats(): SignalQueueStats {
    return {
      emitted: this.emitted,
      dispatched: this.dispatched,
      dropped: this.dropped,
      overflowEpisodes: this.overflowEpisodes,
      depth: this.entries.length,
      lastSequence: this.sequence,
      droppedRange: this.droppedFrom === null || this.droppedTo === null ? null : { from: this.droppedFrom, to: this.droppedTo },
    }
  }
}
