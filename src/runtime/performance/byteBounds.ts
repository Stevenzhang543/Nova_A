/** Explicit retained-data estimate for admission, not a physical heap measurement. */
export function measurePayloadBytes(value: unknown, maximum: number, maximumNodes = 1_000_000): number {
  const seen = new Set<object>(), stack = [value]
  let bytes = 0, nodes = 0
  while (stack.length) {
    if (++nodes > maximumNodes) throw new Error('Job payload graph is too large')
    const current = stack.pop()
    if (typeof current === 'string') bytes += current.length * 2
    else if (typeof current === 'number' || typeof current === 'bigint') bytes += 8
    else if (typeof current === 'boolean') bytes += 1
    else if (current instanceof ArrayBuffer) bytes += current.byteLength
    else if (ArrayBuffer.isView(current)) bytes += current.byteLength
    else if (current && typeof current === 'object' && !seen.has(current)) {
      seen.add(current); bytes += 32
      for (const [key, item] of Object.entries(current)) { bytes += key.length * 2; stack.push(item) }
    }
    if (!Number.isSafeInteger(bytes) || bytes > maximum) throw new Error('Job payload byte budget exceeded')
  }
  return bytes
}
