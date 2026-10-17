/** 输入消费台账：记录每条输入被哪个固定步**消费**、并绑定**首次受影响**的渲染包。
 *
 * 为什么只做这两件事（重要）：
 * 仓库已有 \`src/runtime/performance/observability.ts\` 的 \`FrameObservability\` 与 \`InputReceiptTokenMap\`，
 * 它们已经负责 receipt → submission 的 \`inputToSubmitMs\` 测量、保留上限与分位数统计。
 * 本模块**刻意不重复**那部分：不计算任何延迟、不与它争当时间权威。
 * 主指令 §26.4 真正缺失的是"输入序号 → 消费 tick → 首次受影响 packet"的身份绑定，
 * 以及据此判断积压，因此这里只提供该身份账本。
 *
 * 键为 \`(inputEpoch, sequence)\`，与既有观测面使用同一套身份，避免出现第二套编号。
 * 本模块不依赖 Runtime、渲染器或 Vue，可在 Node 中独立验证。 */

export interface InputConsumptionRecord {
  readonly inputEpoch: number
  readonly sequence: number
  /** 消费该输入的**第一个**固定步 tick；未消费为 null。 */
  consumedTick: number | null
  /** **首次受影响**的渲染包编号；未关联为 null。 */
  firstAffectedPacket: number | null
}

export interface InputConsumptionStats {
  /** 累计登记次数。 */
  tracked: number
  /** 已记录消费 tick 的次数。 */
  consumed: number
  /** 已绑定首次受影响包的次数。 */
  affected: number
  /** 保留中的记录条数。 */
  retained: number
  /** 已建立但尚未绑定受影响包的条数（积压指标）。 */
  pending: number
}

/** 保留上限：只保留最近若干条，避免无界增长。 */
const RETENTION = 512

export class InputConsumptionLedger {
  private readonly records = new Map<string, InputConsumptionRecord>()
  private readonly order: string[] = []
  private tracked = 0

  /** 由既有观测面的身份构造键；非法身份返回 null，调用方据此忽略。 */
  private key(inputEpoch: number, sequence: number): string | null {
    return Number.isSafeInteger(inputEpoch) && inputEpoch > 0 && Number.isSafeInteger(sequence) && sequence > 0 ? inputEpoch + ':' + sequence : null
  }

  /** 登记一条输入；重复登记保持首次记录，不覆盖已有消费信息。 */
  track(inputEpoch: number, sequence: number): boolean {
    const key = this.key(inputEpoch, sequence)
    if (key === null || this.records.has(key)) return false
    this.records.set(key, { inputEpoch, sequence, consumedTick: null, firstAffectedPacket: null })
    this.order.push(key)
    this.tracked += 1
    while (this.order.length > RETENTION) {
      const evicted = this.order.shift()
      if (evicted !== undefined) this.records.delete(evicted)
    }
    return true
  }

  /** 记录消费 tick；**只有第一个 tick 生效**——多步补算不得改写消费时点。 */
  markConsumed(inputEpoch: number, sequence: number, tick: number): boolean {
    const key = this.key(inputEpoch, sequence)
    const record = key === null ? undefined : this.records.get(key)
    if (!record || record.consumedTick !== null || !Number.isSafeInteger(tick) || tick < 0) return false
    record.consumedTick = tick
    return true
  }

  /** 绑定**首次受影响**的渲染包；必须先消费，且只有第一次调用生效。 */
  markFirstAffectedPacket(inputEpoch: number, sequence: number, packet: number): boolean {
    const key = this.key(inputEpoch, sequence)
    const record = key === null ? undefined : this.records.get(key)
    if (!record || record.consumedTick === null || record.firstAffectedPacket !== null || !Number.isSafeInteger(packet) || packet < 0) return false
    record.firstAffectedPacket = packet
    return true
  }

  /** 读取某条记录的当前状态；未登记或已淘汰时返回 undefined。 */
  get(inputEpoch: number, sequence: number): InputConsumptionRecord | undefined {
    const key = this.key(inputEpoch, sequence)
    return key === null ? undefined : this.records.get(key)
  }

  /** 返回已消费但尚未关联受影响包的输入，用于诊断积压与饥饿。 */
  pending(): InputConsumptionRecord[] {
    const out: InputConsumptionRecord[] = []
    for (const key of this.order) {
      const record = this.records.get(key)
      if (record && record.consumedTick !== null && record.firstAffectedPacket === null) out.push(record)
    }
    return out
  }

  /** 当前统计快照。 */
  stats(): InputConsumptionStats {
    let consumed = 0
    let affected = 0
    let pending = 0
    for (const record of this.records.values()) {
      if (record.consumedTick !== null) consumed += 1
      if (record.firstAffectedPacket !== null) affected += 1
      else if (record.consumedTick !== null) pending += 1
    }
    return { tracked: this.tracked, consumed, affected, retained: this.records.size, pending }
  }

  /** 清空台账但保留累计登记数，用于会话重置。 */
  clear(): void {
    this.records.clear()
    this.order.length = 0
  }
}
