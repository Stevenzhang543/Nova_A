/** 项目 ZIP 读取：校验归档路径与数据校验值，解压并读取项目文件。 */
const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024
const MAX_PROJECT_BYTES = 64 * 1024 * 1024

/** 拒绝绝对路径、盘符、空段及点段，限制名称长度；ZIP 中任意不安全条目都会拒绝整个导入。 */
function safeArchivePath(value: string): boolean {
  return Boolean(value) && value.length <= 500 && !value.startsWith('/') && !/^[a-z]:/i.test(value) && !value.split(/[\\/]/).some(/* 先计算 !part || part === '.'；仅当其为假值时求右侧 part === '..'，返回短路求值结果。 */ part => !part || part === '.' || part === '..')
}

/** 对实际解压字节计算 ZIP CRC-32，不以归档声明的校验值代替内容验证。 */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) { crc ^= byte; for (let bit=0;bit<8;bit++) crc = crc >>> 1 ^ (crc & 1 ? 0xedb88320 : 0) }
  return (crc ^ 0xffffffff) >>> 0
}

/** 逐块限制实际解压长度；超出声明或全局上限立即取消流，避免伪造元数据导致完整分配解压炸弹。 */
async function inflate(bytes: Uint8Array, expectedBytes: number): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot decompress Deflate project archives.')
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader()
  const chunks: Uint8Array[] = [], limit = Math.min(MAX_PROJECT_BYTES, expectedBytes)
  let total = 0
  try {
    while (true) {
      const {value, done} = await reader.read()
      if (done) break
      if (value.byteLength > limit - total) {
        try { await reader.cancel('Project archive decompression limit exceeded.') } catch { /* 保留长度越界错误，取消流失败不能将其覆盖。 */ }
        throw new Error('The archived project exceeds its declared length or the 64 MB safety limit.')
      }
      total += value.byteLength
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength }
  return result
}

/** 从 ZIP 中读取一个有界且路径安全的 project.nova；成功返回前核对真实长度、CRC 与严格 UTF-8。 */
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
  if (selected.method===0 && (selected.compressed!==selected.uncompressed || selected.compressed>MAX_PROJECT_BYTES)) throw new Error('The archived project checksum or length is invalid.')
  const payload=selected.method===0?bytes.subarray(start,end):selected.method===8?await inflate(bytes.subarray(start,end),selected.uncompressed):null
  if (!payload) throw new Error(`ZIP compression method ${selected.method} is not supported.`)
  if (payload.length!==selected.uncompressed || crc32(payload)!==selected.crc) throw new Error('The archived project checksum or length is invalid.')
  return { source:new TextDecoder('utf-8',{fatal:true}).decode(payload), entry:selected.name, entries }
}
