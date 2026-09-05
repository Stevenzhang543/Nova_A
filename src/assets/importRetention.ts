/** Explicit importer ownership budgets. Cached artifacts are disposable, authored assets are not. */
export const IMPORT_LIMITS = Object.freeze({ sourceBytes: 512 * 1024 * 1024, memoryBytes: 64 * 1024 * 1024, diskBytes: 256 * 1024 * 1024, cacheEntries: 128, retries: 32, retryBytes: 64 * 1024 * 1024, jobs: 128, changes: 64, watchers: 128 })

export class BoundedImportCache<K, V> {
  private readonly values = new Map<K, { value: V; bytes: number }>()
  private used = 0
  constructor(readonly maximumEntries: number, readonly maximumBytes: number, private readonly evicted: (key: K) => void = () => {}) {}
  get size(): number { return this.values.size }
  get bytes(): number { return this.used }
  get(key: K): V | undefined {
    const entry = this.values.get(key); if (!entry) return undefined
    this.values.delete(key); this.values.set(key, entry); return entry.value
  }
  set(key: K, value: V, bytes: number): boolean {
    this.delete(key)
    if (!Number.isFinite(bytes) || bytes < 0 || bytes > this.maximumBytes || this.maximumEntries < 1) return false
    while (this.values.size >= this.maximumEntries || this.used + bytes > this.maximumBytes) this.delete(this.values.keys().next().value!)
    this.values.set(key, { value, bytes }); this.used += bytes; return true
  }
  delete(key: K): boolean {
    const entry = this.values.get(key); if (!entry) return false
    this.used -= entry.bytes; this.values.delete(key); this.evicted(key); return true
  }
  clear(): void { for (const key of [...this.values.keys()]) this.delete(key) }
}

/** Module-owned derived caches share the project importer disposal boundary. */
const importSessionCleanups = new Set<() => void>()
export function registerImportSessionCleanup(cleanup: () => void): () => void { if (importSessionCleanups.size >= 128) throw new Error('IMPORT_OWNER_LIMIT: Too many module cache owners.'); importSessionCleanups.add(cleanup); return () => { importSessionCleanups.delete(cleanup) } }
export function resetImportSessionCaches(): void { for (const cleanup of importSessionCleanups) cleanup() }
