/** 场景标识工具：生成 UUID，校验已有标识并统一字母大小写。 */
/** 生成指定字节数的随机十六进制串；优先使用密码学随机源，旧环境退回普通随机数。 */ function randomHex(bytes: number): string {
  const values = new Uint8Array(bytes)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(values)
  else for (let index = 0; index < values.length; index++) values[index] = Math.floor(Math.random() * 256)
  return Array.from(values, /* 调用 value.toString(16).padStart(2, '0') 并返回调用结果。 */ value => value.toString(16).padStart(2, '0')).join('')
}

/** 优先调用平台 UUID 接口，否则设置版本和变体位并组装随机 UUID。 */ export function createUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = randomHex(16).split('')
  bytes[12] = '4'
  bytes[16] = ['8', '9', 'a', 'b'][Number.parseInt(bytes[16], 16) % 4]
  return `${bytes.slice(0, 8).join('')}-${bytes.slice(8, 12).join('')}-${bytes.slice(12, 16).join('')}-${bytes.slice(16, 20).join('')}-${bytes.slice(20).join('')}`
}

/** 保留合法版本 1 至 5 UUID 并转小写；输入非法时生成新标识。 */ export function normalizeUuid(value: unknown): string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase()
    : createUuid()
}

