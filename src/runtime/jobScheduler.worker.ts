type WorkerJob = { id: number; kind: 'parseJson' | 'parseCsv' | 'hash' | 'compare'; payload: unknown }

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

self.onmessage = (event: MessageEvent<WorkerJob>) => {
  const { id, kind, payload } = event.data
  try {
    const result = kind === 'parseJson' ? JSON.parse(String(payload))
      : kind === 'parseCsv' ? parseCsv(String(payload))
        : kind === 'hash' ? hash(String(payload))
          : JSON.stringify((payload as { first?: unknown }).first) === JSON.stringify((payload as { second?: unknown }).second)
    self.postMessage({ id, result })
  } catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : String(error) }) }
}
