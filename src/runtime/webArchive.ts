export interface WebArchiveFile { path: string; bytes: Uint8Array }
export const WEB_ARCHIVE_LIMITS = Object.freeze({ files: 16_384, bytes: 512 * 1024 * 1024, pathBytes: 1024 })
const encoder = new TextEncoder()
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  return crc >>> 0
})
function cancellation(signal?: AbortSignal): void { if (signal?.aborted) throw new DOMException('Web export cancelled', 'AbortError') }
function safePath(path: string): string {
  if (!path || path !== path.normalize('NFC') || path.includes('\\') || /[\x00-\x1f\x7f:]/.test(path) || path.startsWith('/') || path.endsWith('/')) throw new Error('Unsafe Web export path: ' + path)
  for (const segment of path.split('/')) if (!segment || segment === '.' || segment === '..' || /[. ]$/.test(segment) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment)) throw new Error('Unsafe Web export path: ' + path)
  if (encoder.encode(path).length > WEB_ARCHIVE_LIMITS.pathBytes) throw new Error('Web export path is too long')
  return path
}
function validateFiles(files: readonly WebArchiveFile[]): WebArchiveFile[] {
  if (!files.length || files.length > WEB_ARCHIVE_LIMITS.files) throw new Error('Web archive file count exceeds its limit')
  const names = new Set<string>(); let total = 22
  const ordered = [...files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
  for (const file of ordered) {
    const path = safePath(file.path), name = path.toLocaleLowerCase('en-US')
    if (names.has(name)) throw new Error('Colliding Web export paths: ' + path)
    names.add(name)
    if (!(file.bytes instanceof Uint8Array) || !(file.bytes.buffer instanceof ArrayBuffer)) throw new Error('Invalid Web export bytes: ' + path)
    total += file.bytes.byteLength + 76 + encoder.encode(path).length * 2
    if (!Number.isSafeInteger(total) || total > WEB_ARCHIVE_LIMITS.bytes) throw new Error('Web archive exceeds512 MiB; use folder export or reduce build content')
  }
  for (const file of ordered) {
    const segments = file.path.toLocaleLowerCase('en-US').split('/')
    while (segments.length > 1) { segments.pop(); if (names.has(segments.join('/'))) throw new Error('Web export file/directory collision: ' + file.path) }
  }
  return ordered
}
/** Stored ZIP with UTF-8 names, sorted entries and fixed1980 timestamps; no ZIP64 or dependency install. */
export async function createWebArchive(files: readonly WebArchiveFile[], signal?: AbortSignal): Promise<Blob> {
  cancellation(signal)
  const ordered = validateFiles(files), parts: BlobPart[] = [], directory: Uint8Array[] = []
  let offset = 0, directoryBytes = 0, work = 0
  for (const file of ordered) {
    cancellation(signal)
    const name = encoder.encode(file.path), bytes = file.bytes; let crc = 0xffffffff
    for (let at = 0; at < bytes.length; at++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[at]) & 255]
      if (++work === 1024 * 1024) { work = 0; await new Promise<void>(resolve => setTimeout(resolve, 0)); cancellation(signal) }
    }
    crc = (crc ^ 0xffffffff) >>> 0
    const local = new Uint8Array(30 + name.length), lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x800, true); lv.setUint16(12, 33, true)
    lv.setUint32(14, crc, true); lv.setUint32(18, bytes.length, true); lv.setUint32(22, bytes.length, true); lv.setUint16(26, name.length, true); local.set(name, 30)
    const central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true); cv.setUint16(14, 33, true)
    cv.setUint32(16, crc, true); cv.setUint32(20, bytes.length, true); cv.setUint32(24, bytes.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); central.set(name, 46)
    parts.push(local, bytes); directory.push(central); directoryBytes += central.length; offset += local.length + bytes.length
  }
  cancellation(signal)
  const end = new Uint8Array(22), ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, ordered.length, true); ev.setUint16(10, ordered.length, true); ev.setUint32(12, directoryBytes, true); ev.setUint32(16, offset, true)
  return new Blob([...parts, ...directory, end], { type: 'application/zip' })
}
