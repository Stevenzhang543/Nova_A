const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024
const MAX_PROJECT_BYTES = 64 * 1024 * 1024

function safeArchivePath(value: string): boolean {
  return Boolean(value) && value.length <= 500 && !value.startsWith('/') && !/^[a-z]:/i.test(value) && !value.split(/[\\/]/).some(part => !part || part === '.' || part === '..')
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) { crc ^= byte; for (let bit=0;bit<8;bit++) crc = crc >>> 1 ^ (crc & 1 ? 0xedb88320 : 0) }
  return (crc ^ 0xffffffff) >>> 0
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot decompress Deflate project archives.')
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Reads one bounded, traversal-safe project.nova from a ZIP archive. */
export async function readProjectArchive(file: File): Promise<{ source: string; entry: string; entries: number }> {
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error('Project archive exceeds the 256 MB safety limit.')
  const bytes = new Uint8Array(await file.arrayBuffer()), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  for (let offset = Math.max(0, bytes.length - 65_557); offset <= bytes.length - 22; offset++) if (view.getUint32(offset, true) === 0x06054b50) eocd = offset
  if (eocd < 0) throw new Error('The selected archive has no valid ZIP directory.')
  const entries = view.getUint16(eocd + 10, true), centralOffset = view.getUint32(eocd + 16, true)
  if (entries < 1 || entries > 10_000 || centralOffset >= bytes.length) throw new Error('The project archive directory is empty or unbounded.')
  let offset = centralOffset, selected: { name:string; method:number; crc:number; compressed:number; uncompressed:number; local:number } | null = null
  for (let index=0;index<entries;index++) {
    if (offset + 46 > bytes.length || view.getUint32(offset,true)!==0x02014b50) throw new Error('The ZIP central directory is truncated.')
    const method=view.getUint16(offset+10,true), crc=view.getUint32(offset+16,true), compressed=view.getUint32(offset+20,true), uncompressed=view.getUint32(offset+24,true), nameLength=view.getUint16(offset+28,true), extraLength=view.getUint16(offset+30,true), commentLength=view.getUint16(offset+32,true), local=view.getUint32(offset+42,true)
    const name = new TextDecoder().decode(bytes.subarray(offset+46,offset+46+nameLength)).replace(/\\/g,'/')
    if (!safeArchivePath(name)) throw new Error(`Unsafe archive path: ${name || '<empty>'}`)
    if (!selected && (name.toLowerCase()==='project.nova' || name.toLowerCase().endsWith('/project.nova'))) selected={name,method,crc,compressed,uncompressed,local}
    offset += 46+nameLength+extraLength+commentLength
  }
  if (!selected) throw new Error('The archive does not contain project.nova.')
  if (selected.uncompressed>MAX_PROJECT_BYTES || selected.local+30>bytes.length || view.getUint32(selected.local,true)!==0x04034b50) throw new Error('The archived project is too large or has an invalid local header.')
  const nameLength=view.getUint16(selected.local+26,true), extraLength=view.getUint16(selected.local+28,true), start=selected.local+30+nameLength+extraLength, end=start+selected.compressed
  if (end>bytes.length) throw new Error('The archived project payload is truncated.')
  const payload=selected.method===0?bytes.slice(start,end):selected.method===8?await inflate(bytes.slice(start,end)):null
  if (!payload) throw new Error(`ZIP compression method ${selected.method} is not supported.`)
  if (payload.length!==selected.uncompressed || crc32(payload)!==selected.crc) throw new Error('The archived project checksum or length is invalid.')
  return { source:new TextDecoder('utf-8',{fatal:true}).decode(payload), entry:selected.name, entries }
}
