/** 运行任务工作线程入口：执行调度器发来的独立计算任务并返回对应结果。 */
type WorkerJob = { id: number; lease: number; kind: 'parseJson' | 'parseCsv' | 'hash' | 'compare' | 'sampleAnimation' | 'advanceParticles' | 'buildSpatialGrid'; payload: unknown }

/** 在工作线程逐字符解析带引号的 CSV，返回有行列上限的非空记录。 */ function parseCsv(source: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], field = '', quoted = false
  for (let index = 0; index <= source.length; index++) {
    const character = source[index] ?? '\n'
    if (quoted && character === '"' && source[index + 1] === '"') { field += '"'; index++; continue }
    if (character === '"') { quoted = !quoted; continue }
    if (!quoted && (character === ',' || character === '\n' || character === '\r')) {
      if (character === '\r' && source[index + 1] === '\n') index++
      row.push(field); field = ''
      if (character !== ',') { if (row.some(/* 返回 value.length 的当前值。 */ value => value.length)) rows.push(row); row = [] }
      continue
    }
    field += character
  }
  return rows.slice(0, 100_001).map(/* 调用 columns.slice(0, 512) 并返回调用结果。 */ columns => columns.slice(0, 512))
}

/** 按字符串码元计算双路快速摘要，与本地回退摘要规则保持一致。 */ function hash(value: string): string {
  let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < value.length; index++) { const code = value.charCodeAt(index); first = Math.imul(first ^ code, 0x01000193) >>> 0; second = Math.imul(second ^ (code + index), 0x85ebca6b) >>> 0 }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

/** 过滤并排序有效数值关键帧，查找采样位置并在相邻帧间线性插值。 */ function sampleAnimation(payload: unknown): number {
  const source = payload && typeof payload === 'object' ? payload as { time?: number; keys?: Array<{ time?: number; value?: number }> } : {}
  const keys = (Array.isArray(source.keys) ? source.keys : []).flatMap(/* 根据 Number.isFinite(key?.time) && Number.isFinite(key?.value) 的真假，分别返回 [{ time: Number(key.time), value: Number(key.value) }] 或 []。 */ key => Number.isFinite(key?.time) && Number.isFinite(key?.value) ? [{ time: Number(key.time), value: Number(key.value) }] : []).sort(/* 计算表达式 a.time - b.time 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a.time - b.time).slice(0, 100_000)
  if (!keys.length) return 0
  const time = Number.isFinite(source.time) ? Number(source.time) : 0, nextIndex = keys.findIndex(/* 比较 key.time 与 time，返回大于或等于的判断结果。 */ key => key.time >= time)
  // 首帧之前保持首值；超过末帧的 -1 留给下方末值分支。
  if (nextIndex === 0) return keys[0].value
  if (nextIndex < 0) return keys[keys.length - 1].value
  const previous = keys[nextIndex - 1], next = keys[nextIndex], factor = Math.min(1, Math.max(0, (time - previous.time) / Math.max(1e-12, next.time - previous.time)))
  return previous.value + (next.value - previous.value) * factor
}

/** 限制粒子数量与步长后按重力更新速度和位置，返回新粒子记录。 */ function advanceParticles(payload: unknown) {
  const source = payload && typeof payload === 'object' ? payload as { dt?: number; gravity?: number; particles?: Array<{ x?: number; y?: number; vx?: number; vy?: number }> } : {}
  const dt = Math.min(1, Math.max(0, Number(source.dt) || 0)), gravity = Math.min(1e6, Math.max(-1e6, Number(source.gravity) || 0))
  return (Array.isArray(source.particles) ? source.particles : []).slice(0, 100_000).map(/** 积分单个粒子的竖直速度与二维位置，并保留水平速度。 */ item => { const x = Number(item.x) || 0, y = Number(item.y) || 0, vx = Number(item.vx) || 0, vy = (Number(item.vy) || 0) + gravity * dt; return { x: x + vx * dt, y: y + vy * dt, vx, vy } })
}

/** 按有界网格尺寸给有效身份分桶，排序桶内身份及桶键形成稳定输出。 */ function buildSpatialGrid(payload: unknown) {
  const source = payload && typeof payload === 'object' ? payload as { cellSize?: number; entries?: Array<{ id?: string; x?: number; y?: number }> } : {}
  const cellSize = Math.min(1e6, Math.max(.01, Number(source.cellSize) || 16)), buckets: Record<string, string[]> = {}
  for (const entry of (Array.isArray(source.entries) ? source.entries : []).slice(0, 100_000)) { const id = String(entry.id ?? '').slice(0, 128); if (!id) continue; const key = `${Math.floor((Number(entry.x) || 0) / cellSize)}:${Math.floor((Number(entry.y) || 0) / cellSize)}`; (buckets[key] ??= []).push(id) }
  for (const values of Object.values(buckets)) values.sort()
  return Object.fromEntries(Object.entries(buckets).sort(/* 调用 a.localeCompare(b) 并返回调用结果。 */ ([a], [b]) => a.localeCompare(b)))
}

self.onmessage = /** 按任务类型执行线程计算，并携带原任务身份和租约回传结果或错误文本。 */ (event: MessageEvent<WorkerJob>) => {
  const { id, lease, kind, payload } = event.data
  try {
    const result = kind === 'parseJson' ? JSON.parse(String(payload))
      : kind === 'parseCsv' ? parseCsv(String(payload))
        : kind === 'hash' ? hash(String(payload))
          : kind === 'compare' ? JSON.stringify((payload as { first?: unknown }).first) === JSON.stringify((payload as { second?: unknown }).second)
            : kind === 'sampleAnimation' ? sampleAnimation(payload)
              : kind === 'advanceParticles' ? advanceParticles(payload)
                : buildSpatialGrid(payload)
    self.postMessage({ id, lease, result })
  } catch (error) { self.postMessage({ id, lease, error: error instanceof Error ? error.message : String(error) }) }
}
