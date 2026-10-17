/** Rhai 无损词法分析：保留空白、注释和错误区域的原始文本，提供 UTF-16 区间与有界诊断。 */
import type { RhaiDiagnostic, RhaiLimits, RhaiParseOptions, RhaiSpan, RhaiToken, RhaiTokenKind } from './rhaiSyntaxTypes'

export const RHAI_SYNTAX_LIMITS: Readonly<RhaiLimits> = Object.freeze({ maxSourceLength: 1_000_000, maxTokens: 200_000, maxNodes: 100_000, maxDepth: 128, maxDiagnostics: 200, maxCommentDepth: 64 })
const KEYWORDS = new Set('let const fn private if else for in while loop do until return break continue throw try catch switch true false import export as use this'.split(' '))
// Enabled Rhai 1.25 RESERVED_LIST entries that cannot be called as functions.
const RESERVED = new Set('case async public package super var protected spawn shared is sync static default thread yield new match await null with void nil module go goto'.split(' '))
const RESERVED_OPERATORS = ['===', '!==', '::<', '...', '++', '--', '->', '<-', '<|', '|>', '!.', ':=', ':;', '(*', '*)']
const OPERATORS = ['**=', '<<=', '>>=', '..=', '!in', '?.', '?[', '??', '::', '=>', '#{', '&&', '||', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '**', '..', '+', '-', '*', '/', '%', '!', '<', '>', '=', '&', '|', '^', '.', '@']
const TRIVIA = new Set<RhaiTokenKind>(['whitespace', 'lineComment', 'blockComment'])
/** 识别空白和注释词元，语法分析可跳过它们而源码往返仍保留原文。 */
export function isRhaiTrivia(token: RhaiToken): boolean { return TRIVIA.has(token.kind) }
/** 计算 UTF-16 内容的快速 FNV 风格标识，用于源码匹配；这不是密码学完整性校验。 */
export function rhaiSourceHash(source: string): string { let hash = 2166136261; for (let index = 0; index < source.length; index++) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619); return (hash >>> 0).toString(16).padStart(8, '0') }
/** 记录每个换行之后的 UTF-16 偏移，供多次源码位置查询复用。 */
export function rhaiLineStarts(source: string): number[] { const lines = [0]; for (let index = 0; index < source.length; index++) if (source[index] === '\n') lines.push(index + 1); return lines }
/** 根据偏移构造源码区间和一基行列；位置查询夹在源码边界内，原始区间值保留。 */
export function rhaiSpan(source: string, start: number, end: number, lines = rhaiLineStarts(source)): RhaiSpan {
  /** 二分查找不大于偏移的行起点，返回一基行列。 */ const position = (offset: number) => { let low = 0, high = lines.length; while (low + 1 < high) { const middle = (low + high) >>> 1; if (lines[middle] <= offset) low = middle; else high = middle }; return { line: low + 1, column: offset - lines[low] + 1 } }
  const first = position(Math.max(0, Math.min(source.length, start))), last = position(Math.max(0, Math.min(source.length, end)))
  return { start, end, ...first, endLine: last.line, endColumn: last.column }
}
/** 从请求中读取更严格的资源上限，最低为一且不得高于内置最大值。 */
export function rhaiLimits(options: RhaiParseOptions = {}): RhaiLimits {
  return Object.fromEntries(Object.entries(RHAI_SYNTAX_LIMITS).map(/** 逐项接受有限请求值，取整后夹在每项允许范围内。 */ ([key, maximum]) => {
    const requested = options.limits?.[key as keyof RhaiLimits]
    return [key, Math.max(1, Math.min(maximum, Number.isFinite(requested) ? Math.floor(requested!) : maximum))]
  })) as unknown as RhaiLimits
}
export interface RhaiLexResult { tokens: RhaiToken[]; diagnostics: RhaiDiagnostic[]; limits: RhaiLimits }

/** Decodes enabled Rhai string forms; malformed escape sequences are rejected. */
/** 解码普通、字符、原始和反引号字符串；验证转义、Unicode 标量及单字符约束。 */
export function decodeRhaiString(raw: string, column = 1, characterCheck = true): string {
  const rawMatch = /^(#+)"/.exec(raw)
  if (rawMatch) { const suffix = '"' + rawMatch[1]; if (!raw.endsWith(suffix)) throw new Error('Unterminated raw string.'); return raw.slice(rawMatch[0].length, -suffix.length).replace(/\r\n/g, '\n') }
  const quote = raw[0]
  if (!['"', "'", '`'].includes(quote) || raw.at(-1) !== quote) throw new Error('Unterminated string.')
  let content = raw.slice(1, -1)
  if (quote === '`') return content.replace(/^\r?\n/, '').replace(/\r\n/g, '\n').replace(/``/g, '`').replace(/\\\$\{/g, '${')
  let result = ''
  for (let index = 0; index < content.length; index++) {
    const character = content[index]
    if (character === quote && content[index + 1] === quote) { result += quote; index++; continue }
    if (character === '\r' && content[index + 1] === '\n') continue
    if (character !== '\\') { if (character === '\n') throw new Error('Unescaped line break in string.'); result += character; continue }
    const escape = content[++index]
    if (escape === quote || escape === '\\') { result += escape; continue }
    if (['r', 'n', 't'].includes(escape)) { result += { r: '\r', n: '\n', t: '\t' }[escape]; continue }
    if (escape === '\n' || escape === '\r' && content[index + 1] === '\n') {
      if (quote === "'") throw new Error('Character literals cannot continue on another line.')
      if (escape === '\r') index++
      let skipped = 0; while (skipped < column && /[ \t]/.test(content[index + 1] ?? '')) { index++; skipped++ }; continue
    }
    const length = escape === 'x' ? 2 : escape === 'u' ? 4 : escape === 'U' ? 8 : 0, hex = content.slice(index + 1, index + 1 + length)
    if (!length || hex.length !== length || !/^[\da-fA-F]+$/.test(hex)) throw new Error('Malformed string escape sequence.')
    const value = Number.parseInt(hex, 16); if (value > 0x10ffff || value >= 0xd800 && value <= 0xdfff) throw new Error('String escape is not a Unicode scalar value.')
    result += String.fromCodePoint(value); index += length
  }
  if (quote === "'" && characterCheck && [...result].length !== 1) throw new Error('A character literal requires exactly one Unicode scalar value.')
  return result
}

/** Exact tokens include every source character once, including malformed input. */
/** 将每个源码字符归入词元并收集有界诊断；超限或取消后剩余原文作为错误区域保留。 */
export function lexRhai(source: string, options: RhaiParseOptions = {}): RhaiLexResult {
  const limits = rhaiLimits(options), lines = rhaiLineStarts(source), tokens: RhaiToken[] = [], diagnostics: RhaiDiagnostic[] = []
  let offset = 0, stopped = false
  /** 在诊断上限内记录错误及精确区间，不无限累积错误对象。 */ const error = (code: string, message: string, start: number, end = offset) => { if (diagnostics.length < limits.maxDiagnostics) diagnostics.push({ code, severity: 'error', message, span: rhaiSpan(source, start, end, lines) }) }
  /** 保存当前词元原文与区间；达到词元数量上限时停止后续扫描。 */ const token = (kind: RhaiTokenKind, start: number, end = offset) => {
    tokens.push({ kind, text: source.slice(start, end), span: rhaiSpan(source, start, end, lines) })
    if (tokens.length >= limits.maxTokens && end < source.length) { error('RHAI-LIMIT-TOKENS', `Token count exceeds ${limits.maxTokens}.`, end, end); stopped = true }
  }
  if (source.length > limits.maxSourceLength) { error('RHAI-LIMIT-SOURCE', `Source exceeds ${limits.maxSourceLength} UTF-16 code units.`, limits.maxSourceLength, source.length); stopped = true }
  /** 扫描普通字符串或字符字面量，处理转义与连续引号；宿主 use 路径沿用独立规则。 */ const quoted = (quote: string) => {
    const start = offset++
    const hostPath = options.moduleMode === 'host' && /^\s*use\s*$/.test(source.slice(source.lastIndexOf('\n', start - 1) + 1, start))
    let closed = false
    while (offset < source.length) {
      if (source[offset] === '\\') { offset = Math.min(source.length, offset + (source[offset + 1] === '\r' && source[offset + 2] === '\n' ? 3 : 2)); continue }
      if (source[offset++] === quote) { if (source[offset] === quote) { offset++; continue }; closed = true; break }
      if (source[offset - 1] === '\n') { error('RHAI-LEX-STRING-LINE', 'Use a backtick string for multiple lines.', start); break }
    }
    if (!closed) error('RHAI-LEX-STRING-END', `Unterminated ${quote === "'" ? 'character' : 'string'} literal.`, start)
    else if (!hostPath) { try { decodeRhaiString(source.slice(start, offset), rhaiSpan(source, start, start, lines).column) } catch (cause) { error('RHAI-LEX-STRING-VALUE', (cause as Error).message, start) } }
    token(quote === "'" && !hostPath ? 'character' : 'string', start)
  }
  /** 扫描反引号文本并递归处理插值，完整记录文本、插值边界和缺失结束符。 */ const template = (depth: number) => {
    const opening = offset; token('templateStart', offset++, offset)
    let start = offset
    while (offset < source.length && !stopped) {
      if (source.startsWith('\\${', offset)) { offset += 3; continue }
      if (source[offset] === '`') { if (source[offset + 1] === '`') { offset += 2; continue }; if (offset > start) token('templateText', start); token('templateEnd', offset++, offset); return }
      if (source.startsWith('${', offset)) {
        if (offset > start) token('templateText', start)
        const interpolation = offset; offset += 2; token('interpolationStart', interpolation)
        region(true, depth + 1); start = offset; continue
      }
      offset++
    }
    if (offset > start) token('templateText', start)
    error('RHAI-LEX-TEMPLATE-END', 'Unterminated interpolated string.', opening)
  }
  /** 扫描普通区域或插值区域，维护括号深度、取消标志、嵌套注释及保留运算符限制。 */ const region = (interpolation: boolean, depth: number) => {
    if (depth > limits.maxDepth) { error('RHAI-LIMIT-DEPTH', `Lexical nesting exceeds ${limits.maxDepth}.`, offset, offset); stopped = true; return }
    let braces = 0
    while (offset < source.length && !stopped) {
      if (options.signal?.aborted) { error('RHAI-CANCELLED', 'Language parsing was cancelled.', offset, offset); stopped = true; return }
      const start = offset, character = source[offset]
      if (interpolation && character === '}' && braces === 0) { token('interpolationEnd', offset++, offset); return }
      if (/\s/.test(character)) { while (offset < source.length && /\s/.test(source[offset])) offset++; token('whitespace', start); continue }
      if (source.startsWith('//', offset)) { offset += 2; while (offset < source.length && source[offset] !== '\n') offset++; token('lineComment', start); continue }
      if (source.startsWith('/*', offset)) {
        offset += 2; let comments = 1
        while (offset < source.length && comments) {
          if (source.startsWith('/*', offset)) { comments++; offset += 2; if (comments > limits.maxCommentDepth) { error('RHAI-LIMIT-COMMENTS', `Comment nesting exceeds ${limits.maxCommentDepth}.`, start); stopped = true; break } }
          else if (source.startsWith('*/', offset)) { comments--; offset += 2 } else offset++
        }
        if (comments) error('RHAI-LEX-COMMENT-END', 'Unterminated block comment.', start)
        token('blockComment', start); continue
      }
      if (character === '"' || character === "'") { quoted(character); continue }
      if (character === '#' && /^(#+)"/.test(source.slice(offset))) {
        const opening = /^(#+)"/.exec(source.slice(offset))!, closing = '"' + opening[1]
        offset += opening[0].length; const end = source.indexOf(closing, offset)
        if (end < 0) { offset = source.length; error('RHAI-LEX-RAW-STRING-END', 'Unterminated raw string.', start) } else offset = end + closing.length
        token('string', start); continue
      }
      if (character === '`') { template(depth + 1); continue }
      if (/[0-9]/.test(character)) {
        const number = source.slice(offset).match(/^(?:0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|[0-9][0-9_]*(?:\.(?![.A-DF-Za-df-z_])(?:[0-9][0-9_]*)?)?(?:[eE][+-]?[0-9][0-9_]*)?)/)?.[0] ?? character
        offset += number.length; token('number', start)
        if (/[A-Za-z_]/.test(source[offset] ?? '')) error('RHAI-LEX-NUMBER', 'Invalid numeric literal or missing operator.', start, offset + 1)
        continue
      }
      if (/[A-Za-z_]/.test(character)) { offset++; while (offset < source.length && /[A-Za-z0-9_]/.test(source[offset])) offset++; const word = source.slice(start, offset); token(KEYWORDS.has(word) ? 'keyword' : 'identifier', start); if (RESERVED.has(word)) error('RHAI-LEX-RESERVED', `${word} is reserved by the enabled Rhai language.`, start); if (word !== '_' && !/^_*[A-Za-z][A-Za-z0-9_]*$/.test(word)) error('RHAI-LEX-IDENTIFIER', 'An identifier needs an ASCII letter before any digit.', start); continue }
      const reserved = RESERVED_OPERATORS.find(/** 按已声明顺序匹配禁用运算符，将整个匹配区域记为错误词元。 */ value => source.startsWith(value, offset))
      if (reserved) { offset += reserved.length; token('invalid', start); error('RHAI-LEX-RESERVED', `${reserved} is reserved by the enabled Rhai language.`, start); continue }
      const operator = OPERATORS.find(/** 优先匹配较长运算符，并检查 !in 后的标识符边界。 */ value => source.startsWith(value, offset) && (value !== '!in' || !/[A-Za-z0-9_]/.test(source[offset + 3] ?? '')))
      if (operator) { offset += operator.length; if (operator === '#{') braces++; token('operator', start); continue }
      if ('()[]{};:,'.includes(character)) { if (character === '{') braces++; else if (character === '}') braces--; token('punctuation', offset++, offset); continue }
      offset++; token('invalid', start); error('RHAI-LEX-CHARACTER', `Unexpected character ${JSON.stringify(character)}.`, start)
    }
    if (interpolation && !stopped) error('RHAI-LEX-INTERPOLATION-END', 'Missing } in string interpolation.', offset, offset)
  }
  if (!stopped) region(false, 0)
  if (offset < source.length) { const start = offset; offset = source.length; token('invalid', start) }
  tokens.push({ kind: 'eof', text: '', span: rhaiSpan(source, source.length, source.length, lines) })
  return { tokens, diagnostics, limits }
}
