/** 导入缓存保留策略：管理有界会话缓存及清理登记，避免旧导入会话持续持有数据。 */
/** Explicit importer ownership budgets. Cached artifacts are disposable, authored assets are not. */
export const IMPORT_LIMITS = Object.freeze({ sourceBytes: 512 * 1024 * 1024, memoryBytes: 64 * 1024 * 1024, diskBytes: 256 * 1024 * 1024, cacheEntries: 128, retries: 32, retryBytes: 64 * 1024 * 1024, jobs: 128, changes: 64, watchers: 128 })

export class BoundedImportCache<K, V> {
  private readonly values = new Map<K, { value: V; bytes: number }>()
  private used = 0
  /** 建立具条目数与字节预算的最近使用缓存，并保存可选逐项驱逐回调。 */ constructor(readonly maximumEntries: number, readonly maximumBytes: number, private readonly evicted: (key: K) => void = /** 未提供驱逐处理器时使用空操作，缓存删除无需额外通知。 */ () => {}) {}
  /* 返回 this.values.size 的当前值。 */ get size(): number { return this.values.size }
  /* 返回 this.used 的当前值。 */ get bytes(): number { return this.used }
  /** 读取缓存项并移至最近使用位置，未找到时返回 undefined。 */ get(key: K): V | undefined {
    const entry = this.values.get(key); if (!entry) return undefined
    this.values.delete(key); this.values.set(key, entry); return entry.value
  }
  /** 移除同键旧项，拒绝非法权重，再逐项驱逐最旧记录使新项满足数量和字节预算。 */ set(key: K, value: V, bytes: number): boolean {
    this.delete(key)
    if (!Number.isFinite(bytes) || bytes < 0 || bytes > this.maximumBytes || this.maximumEntries < 1) return false
    while (this.values.size >= this.maximumEntries || this.used + bytes > this.maximumBytes) this.delete(this.values.keys().next().value!)
    this.values.set(key, { value, bytes }); this.used += bytes; return true
  }
  /** 删除存在的缓存项、扣减已用字节并通知驱逐回调。 */ delete(key: K): boolean {
    const entry = this.values.get(key); if (!entry) return false
    this.used -= entry.bytes; this.values.delete(key); this.evicted(key); return true
  }
  /** 按键快照逐项删除全部缓存，确保每项执行驱逐回调。 */ clear(): void { for (const key of [...this.values.keys()]) this.delete(key) }
}

/** Module-owned derived caches share the project importer disposal boundary. */
const importSessionCleanups = new Set<() => void>()
/** 在最多一百二十八个所有者限制内登记会话清理函数，返回注销入口。 */ export function registerImportSessionCleanup(cleanup: () => void): () => void { if (importSessionCleanups.size >= 128) throw new Error('IMPORT_OWNER_LIMIT: Too many module cache owners.'); importSessionCleanups.add(cleanup); return /** 执行时调用 importSessionCleanups.delete(cleanup)；不显式返回调用结果。 */ () => { importSessionCleanups.delete(cleanup) } }
/** 调用所有登记的缓存所有者清理函数，释放上一导入会话资源。 */ export function resetImportSessionCaches(): void { for (const cleanup of importSessionCleanups) cleanup() }
