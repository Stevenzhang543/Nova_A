type WorkerJob = { id: number; lease: number; kind: 'parseJson' | 'parseCsv' | 'hash' | 'compare' | 'sampleAnimation' | 'advanceParticles' | 'buildSpatialGrid'; payload: unknown }

function parseCsv(source: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], field = '', quoted = false
  for (let index = 0; index <= source.length; index++) {
    const character = source[index] ?? '\n'
    if (quoted && character === '"' && source[index + 1] === '"') { field += '"'; index++; continue }
    if (character === '"') { quoted = !quoted; continue }
    if (!quoted && (character === ',' || character === '\n' || character === '\r')) {
      if (character === '\r' && source[index + 1] === '\n') index++
      row.push(field); field = ''
      if (character !== ',') { if (row.some(value => value.length)) rows.push(row); row = [] }
      continue
    }
    field += character
  }
  return rows.slice(0, 100_001).map(columns => columns.slice(0, 512))
}

function hash(value: string): string {
  let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < value.length; index++) { const code = value.charCodeAt(index); first = Math.imul(first ^ code, 0x01000193) >>> 0; second = Math.imul(second ^ (code + index), 0x85ebca6b) >>> 0 }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

function sampleAnimation(payload: unknown): number {
  const source = payload && typeof payload === 'object' ? payload as { time?: number; keys?: Array<{ time?: number; value?: number }> } : {}
  const keys = (Array.isArray(source.keys) ? source.keys : []).flatMap(key => Number.isFinite(key?.time) && Number.isFinite(key?.value) ? [{ time: Number(key.time), value: Number(key.value) }] : []).sort((a, b) => a.time - b.time).slice(0, 100_000)
  if (!keys.length) return 0
  const time = Number.isFinite(source.time) ? Number(source.time) : 0, nextIndex = keys.findIndex(key => key.time >= time)
  if (nextIndex <= 0) return keys[Math.max(0, nextIndex)].value
  if (nextIndex < 0) return keys[keys.length - 1].value
  const previous = keys[nextIndex - 1], next = keys[nextIndex], factor = Math.min(1, Math.max(0, (time - previous.time) / Math.max(1e-12, next.time - previous.time)))
  return previous.value + (next.value - previous.value) * factor
}

function advanceParticles(payload: unknown) {
  const source = payload && typeof payload === 'object' ? payload as { dt?: number; gravity?: number; particles?: Array<{ x?: number; y?: number; vx?: number; vy?: number }> } : {}
  const dt = Math.min(1, Math.max(0, Number(source.dt) || 0)), gravity = Math.min(1e6, Math.max(-1e6, Number(source.gravity) || 0))
  return (Array.isArray(source.particles) ? source.particles : []).slice(0, 100_000).map(item => { const x = Number(item.x) || 0, y = Number(item.y) || 0, vx = Number(item.vx) || 0, vy = (Number(item.vy) || 0) + gravity * dt; return { x: x + vx * dt, y: y + vy * dt, vx, vy } })
}

function buildSpatialGrid(payload: unknown) {
  const source = payload && typeof payload === 'object' ? payload as { cellSize?: number; entries?: Array<{ id?: string; x?: number; y?: number }> } : {}
  const cellSize = Math.min(1e6, Math.max(.01, Number(source.cellSize) || 16)), buckets: Record<string, string[]> = {}
  for (const entry of (Array.isArray(source.entries) ? source.entries : []).slice(0, 100_000)) { const id = String(entry.id ?? '').slice(0, 128); if (!id) continue; const key = `${Math.floor((Number(entry.x) || 0) / cellSize)}:${Math.floor((Number(entry.y) || 0) / cellSize)}`; (buckets[key] ??= []).push(id) }
  for (const values of Object.values(buckets)) values.sort()
  return Object.fromEntries(Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)))
}

self.onmessage = (event: MessageEvent<WorkerJob>) => {
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
