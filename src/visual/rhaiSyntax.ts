/** Rhai 结构语法：解析源码、建立词法绑定与稳定节点身份，并在保留原文范围的基础上发射代码。 */
import type * as T from './rhaiSyntaxTypes'
import { decodeRhaiString, isRhaiTrivia, lexRhai, rhaiLineStarts, rhaiSourceHash, rhaiSpan } from './rhaiSyntaxLexer'
export * from './rhaiSyntaxTypes'
export { lexRhai, RHAI_SYNTAX_LIMITS, rhaiSourceHash, rhaiSpan } from './rhaiSyntaxLexer'

// Matches the enabled Rhai 1.25 tokenizer, including its non-JavaScript shift
// precedence and the shared precedence of bitwise/short-circuit operators.
const PRECEDENCE: Readonly<Record<string, number>> = { '||': 30, '^': 30, '|': 30, '&&': 60, '&': 60, '==': 90, '!=': 90, in: 110, '!in': 110, '<': 130, '<=': 130, '>': 130, '>=': 130, '??': 135, '..': 140, '..=': 140, '+': 150, '-': 150, '*': 180, '/': 180, '%': 180, '**': 190, '<<': 210, '>>': 210 }
const ASSIGNMENTS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '&=', '|=', '^='])
const SELF_TERMINATED = new Set(['Block', 'If', 'Switch', 'For', 'While', 'Loop', 'Try', 'FunctionDeclaration'])
const DEFAULT_KNOWN = new Set(['this', 'print', 'debug', 'type_of', 'len', 'is_def_var', 'is_def_fn', 'to_float', 'to_int', 'to_string', 'Fn', 'call', 'curry', 'sin', 'cos'])
class ParseLimit extends Error {}

class Parser {
  readonly program: T.RhaiProgram
  readonly tokens: T.RhaiToken[]
  private readonly lines: number[]
  private offset = 0
  private count = 0
  private depth = 0
  private functionDepth = 0
  private blockDepth = 0
  private loopDepth = 0
  /** 词法分析源码并建立程序元信息；移除普通空白注释，将旧式导出注释重新词法化为有效声明标记。 */ constructor(readonly source: string, readonly options: T.RhaiParseOptions) {
    const lexical = lexRhai(source, options)
    this.lines = rhaiLineStarts(source)
    this.program = { format: 'nova-rhai-ir', version: 1, source, tokens: lexical.tokens, body: [], scopes: [], bindings: [], references: [], diagnostics: lexical.diagnostics, valid: true, limits: lexical.limits, sourceHash: rhaiSourceHash(source) }
    this.tokens = lexical.tokens.flatMap(/** 把旧式导出注释转为带原始位置的有效词法单元，其余内容只保留非空白非注释单元。 */ token => {
      // Nova's actual runtime preprocesses this legacy comment annotation.
      if (token.kind === 'lineComment' && /^\/\/\s*@export\b/.test(token.text)) {
        const start = token.span.start + token.text.indexOf('@')
        return lexRhai(source.slice(start, token.span.end), options).tokens.filter(/* 先计算 item.kind !== 'eof'；仅当其为真值时求右侧 !isRhaiTrivia(item)，返回短路求值结果。 */ item => item.kind !== 'eof' && !isRhaiTrivia(item)).map(/** 构造并返回记录 { ...item, span: this.span(item.span.start + start, item.span.end + start) }，字段按当前实参及捕获状态求值。 */ item => ({ ...item, span: this.span(item.span.start + start, item.span.end + start) }))
      }
      return isRhaiTrivia(token) ? [] : [token]
    })
  }
  /* 调用 rhaiSpan(this.source, start, end, this.lines) 并返回调用结果。 */ private span(start: number, end: number): T.RhaiSpan { return rhaiSpan(this.source, start, end, this.lines) }
  /* 返回 this.tokens[Math.min(this.offset, this.tokens.length - 1)] 的当前值。 */ private current(): T.RhaiToken { return this.tokens[Math.min(this.offset, this.tokens.length - 1)] }
  /* 返回 this.tokens[Math.max(0, this.offset - 1)] 的当前值。 */ private previous(): T.RhaiToken { return this.tokens[Math.max(0, this.offset - 1)] }
  /* 比较 this.current().text 与 text，返回严格相等的判断结果。 */ private at(text: string): boolean { return this.current().text === text }
  /* 比较 this.current().kind 与 'eof'，返回严格相等的判断结果。 */ private eof(): boolean { return this.current().kind === 'eof' }
  /** 返回当前词法单元，尚未到文件末尾时推进读取位置。 */ private take(): T.RhaiToken { const token = this.current(); if (!this.eof()) this.offset++; return token }
  /** 仅当当前单元匹配指定文本时消费它并返回真。 */ private consume(text: string): boolean { if (!this.at(text)) return false; this.take(); return true }
  /** 在诊断数量上限内记录带源码范围的解析错误。 */ private error(code: string, message: string, span = this.current().span): void { if (this.program.diagnostics.length < this.program.limits.maxDiagnostics) this.program.diagnostics.push({ code, severity: 'error', message, span }) }
  /** 匹配时消费目标单元，否则报告缺失符号并返回零宽的无效占位单元。 */ private expect(text: string): T.RhaiToken { if (this.at(text)) return this.take(); this.error('RHAI-PARSE-EXPECTED', `Expected ${JSON.stringify(text)}, found ${this.eof() ? 'end of source' : JSON.stringify(this.current().text)}.`); return { kind: 'invalid', text, span: this.span(this.current().span.start, this.current().span.start) } }
  /** 接受普通标识符或 this；非法输入记录诊断并在安全情况下前进，以占位名称恢复解析。 */ private identifier(): T.RhaiToken { const token = this.current(); if (token.kind === 'identifier' || token.text === 'this') return this.take(); this.error('RHAI-PARSE-IDENTIFIER', 'Expected an identifier.'); if (!['}', ')', ']', ',', ';'].includes(token.text) && !this.eof()) this.take(); return { ...token, text: '__missing' } }
  /** 增加节点计数并检查上限，创建带种类、源码范围及临时身份的语法节点。 */ private make<K extends T.RhaiNode['kind']>(kind: K, start: number, fields: Omit<Extract<T.RhaiNode, { kind: K }>, keyof T.RhaiNodeBase>, end = this.previous().span.end): Extract<T.RhaiNode, { kind: K }> {
    if (++this.count > this.program.limits.maxNodes) throw new ParseLimit(`AST exceeds ${this.program.limits.maxNodes} nodes.`)
    return { id: `syntax:${kind}:${this.count}`, kind, span: this.span(start, Math.max(start, end)), scopeId: '', ...fields } as Extract<T.RhaiNode, { kind: K }>
  }
  /** 检查解析嵌套上限及取消信号，执行受保护解析并在退出时恢复深度计数。 */ private guarded<R>(run: () => R): R { if (++this.depth > this.program.limits.maxDepth) throw new ParseLimit(`Syntax nesting exceeds ${this.program.limits.maxDepth}.`); try { if (this.options.signal?.aborted) throw new ParseLimit('Language parsing was cancelled.'); return run() } finally { this.depth-- } }
  /** 消费可选分号；遇到需要语句分隔的位置而没有分号时报告错误。 */ private finish(): boolean {
    if (this.consume(';')) return true
    if (!this.eof() && !['}', ','].includes(this.current().text) && this.current().kind !== 'interpolationEnd') this.error('RHAI-PARSE-SEMICOLON', 'Expected a semicolon between statements.')
    return false
  }
  /** 逐条解析模块语句并保证游标前进；捕获解析预算或取消异常后返回已收集结果。 */ run(): T.RhaiProgram {
    try {
      if (this.program.diagnostics.some(/* 调用 item.code.startsWith('RHAI-LIMIT') 并返回调用结果。 */ item => item.code.startsWith('RHAI-LIMIT'))) return this.complete()
      while (!this.eof()) { const before = this.offset; this.program.body.push(this.statement()); if (before === this.offset) this.take() }
    } catch (error) {
      if (!(error instanceof ParseLimit)) throw error
      this.error(this.options.signal?.aborted ? 'RHAI-CANCELLED' : 'RHAI-LIMIT-PARSER', error.message)
    }
    return this.complete()
  }
  /** 建立词法绑定，按前一版程序调和稳定身份，并根据错误诊断设置程序有效标记。 */ private complete(): T.RhaiProgram { bindRhai(this.program, this.options); if (this.options.previous) reconcileRhaiIdentity(this.options.previous, this.program); this.program.valid = !this.program.diagnostics.some(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error'); return this.program }
  /** 在嵌套预算内按关键字分派语句解析，保留分号终止状态及宿主模块声明约束。 */ private statement(): T.RhaiStatement {
    return this.guarded(/** 按当前关键字解析声明、控制流、模块或普通表达式语句，并保留错误恢复边界。 */ () => {
      const start = this.current().span.start
      if (this.consume(';')) return this.make('Empty', start, {})
      if (this.at('let') || this.at('const') || this.at('@')) return this.variable()
      if (this.at('fn') || this.at('private')) return this.functionDeclaration()
      if (this.at('{')) return this.block()
      if (this.at('if')) return this.ifExpression()
      if (this.at('switch')) return this.switchExpression()
      if (this.at('for') || this.at('while') || this.at('loop') || this.at('do')) return this.loopExpression()
      if (this.at('try')) return this.tryExpression()
      if (['return', 'break', 'continue', 'throw'].includes(this.current().text)) {
        const keyword = this.take().text
        if ((keyword === 'break' || keyword === 'continue') && !this.loopDepth) this.error('RHAI-SCOPE-LOOP', `${keyword} is only valid inside a loop.`, this.previous().span)
        if (keyword === 'continue') { const terminated = this.finish(); return this.make('Continue', start, { terminated }) }
        const value = [';', '}'].includes(this.current().text) || this.eof() ? null : this.expression()
        const terminated = this.finish(), kind = keyword === 'return' ? 'Return' : keyword === 'break' ? 'Break' : 'Throw'
        return this.make(kind, start, { value, terminated })
      }
      if (this.at('import') || this.at('use')) {
        const keyword = this.take().text as 'import' | 'use', path = this.expression(), alias = this.consume('as') ? this.parameter() : null
        const hostUse = keyword === 'use' && this.options.moduleMode === 'host'
        const terminated = hostUse && this.current().span.line > path.span.endLine ? this.consume(';') : this.finish()
        const node = this.make('ModuleDeclaration', start, { keyword, path, alias, terminated })
        if (hostUse) {
          if (this.functionDepth || this.blockDepth) this.error('RHAI-HOST-MODULE-SCOPE', 'Project use dependencies are only valid at module scope.', node.span)
          const lineStart = this.source.lastIndexOf('\n', start - 1) + 1, newline = this.source.indexOf('\n', node.span.end), lineEnd = newline < 0 ? this.source.length : newline
          const constantPath = path.kind === 'Literal' && path.literalKind === 'string' || path.kind === 'InterpolatedString' && path.parts.every(/* 比较 part.kind 与 'TemplateText'，返回严格相等的判断结果。 */ part => part.kind === 'TemplateText')
          if (alias || !constantPath || !/^\s*use\s+["'`]([^"'`]+)["'`]\s*;?\s*$/.test(this.source.slice(lineStart, lineEnd))) this.error('RHAI-HOST-MODULE-SHAPE', 'A project dependency must occupy one whole line: use "path"; with no alias or interpolated path.', node.span)
        } else if (this.options.sandbox !== false) this.error('RHAI-SANDBOX-MODULE', `${keyword} is not accepted by the enabled Nova Rhai sandbox; project module resolution must provide an explicit binding before execution.`, node.span)
        return node
      }
      if (this.consume('export')) {
        if (this.functionDepth || this.blockDepth) this.error('RHAI-SCOPE-EXPORT', 'Native exports are only valid at module scope.', this.previous().span)
        if (this.at('let') || this.at('const')) { const declaration = this.variable(); return this.make('ExportDeclaration', start, { name: declaration.name, nameSpan: declaration.nameSpan, alias: null, declaration, bindingId: null, terminated: declaration.terminated }) }
        const name = this.identifier(), alias = this.consume('as') ? this.identifier().text : null, terminated = this.finish()
        return this.make('ExportDeclaration', start, { name: name.text, nameSpan: name.span, alias, declaration: null, bindingId: null, terminated })
      }
      const expression = this.expression(0, new Set(), true), terminated = SELF_TERMINATED.has(expression.kind) ? this.consume(';') : this.finish()
      return this.make('ExpressionStatement', start, { expression, terminated })
    })
  }
  /** 解析导出元数据、可变或常量声明及初始化式，拒绝 Rhai 不支持的行内类型注解。 */ private variable(): T.RhaiVariableDeclaration {
    const start = this.current().span.start, metadata: T.RhaiExportMetadata[] = [], exported = this.consume('@')
    if (exported) {
      this.expect('export')
      if (this.consume('(')) {
        while (!this.eof() && !this.at(')')) {
          const before = this.offset, field = this.identifier(); this.expect('='); const value = this.expression(0, new Set([',', ')']))
          metadata.push(this.make('ExportMetadata', field.span.start, { name: field.text, value }))
          if (!this.consume(',')) break
          if (before === this.offset) this.take()
        }
        this.expect(')')
      }
    }
    const declarationKind = this.at('const') ? (this.take(), 'const') : (this.expect('let'), 'let'), name = this.identifier()
    if (this.consume(':')) { this.identifier(); this.error('RHAI-LIMITATION-INLINE-TYPE', 'Inline type syntax is not supported by Rhai; use a comment annotation.', name.span) }
    const initializer = this.consume('=') ? this.expression() : null
    if (declarationKind === 'const' && !initializer) this.error('RHAI-PARSE-CONSTANT', 'A constant requires an initializer.', name.span)
    const terminated = this.finish()
    return this.make('VariableDeclaration', start, { name: name.text, nameSpan: name.span, declarationKind, initializer, exported, metadata, bindingId: null, terminated })
  }
  /** 消费参数标识符并创建带绑定占位的参数节点。 */ private parameter(): T.RhaiParameter { const token = this.identifier(); return this.make('Parameter', token.span.start, { name: token.text, bindingId: null }, token.span.end) }
  /** 读取逗号分隔参数直到指定闭合符号，检查终止符并避免无进展循环。 */ private parameters(closing = ')'): T.RhaiParameter[] {
    const parameters: T.RhaiParameter[] = []
    while (!this.eof() && !this.at(closing)) { const before = this.offset; parameters.push(this.parameter()); if (!this.consume(',')) break; if (before === this.offset) this.take() }
    this.expect(closing); return parameters
  }
  /** 解析私有标记、可选接收类型和参数，要求具名函数位于模块级，并隔离函数内循环深度。 */ private functionDeclaration(): T.RhaiFunctionDeclaration {
    const start = this.current().span.start, privateFunction = this.consume('private'); this.expect('fn')
    let receiver: T.RhaiIdentifier | T.RhaiLiteral | null = null
    if (this.tokens[this.offset + 1]?.text === '.' && ['identifier', 'string'].includes(this.current().kind)) {
      const type = this.take(); receiver = type.kind === 'string' ? this.make('Literal', type.span.start, { literalKind: 'string', raw: type.text }) : this.make('Identifier', type.span.start, { name: type.text, bindingId: null }); this.expect('.')
    }
    const name = this.identifier(); this.expect('('); const parameters = this.parameters()
    if (this.functionDepth || this.blockDepth) this.error('RHAI-SCOPE-FUNCTION', 'Named Rhai functions must be declared at module scope.', name.span)
    this.functionDepth++; const oldLoop = this.loopDepth; this.loopDepth = 0
    const body = this.block(); this.loopDepth = oldLoop; this.functionDepth--
    return this.make('FunctionDeclaration', start, { name: name.text, nameSpan: name.span, receiver, parameters, body, private: privateFunction, bindingId: null })
  }
  /** 在嵌套预算内读取花括号语句块，维护块深度并在缺失闭合符号时恢复。 */ private block(): T.RhaiBlock {
    return this.guarded(/** 读取语句块并维护块深度，到闭合花括号或插值边界时停止。 */ () => {
      const opening = this.expect('{'), body: T.RhaiStatement[] = []
      this.blockDepth++
      while (!this.eof() && !this.at('}') && this.current().kind !== 'interpolationEnd') { const before = this.offset; body.push(this.statement()); if (before === this.offset) this.take() }
      const closing = this.expect('}'); this.blockDepth--; return this.make('Block', opening.span.start, { body }, closing.span.end)
    })
  }
  /** 解析条件、真分支及可选 else 或 else-if 分支，构建条件表达式节点。 */ private ifExpression(): T.RhaiIf {
    const start = this.expect('if').span.start, condition = this.expression(), consequent = this.block(), alternate = this.consume('else') ? this.at('if') ? this.ifExpression() : this.block() : null
    return this.make('If', start, { condition, consequent, alternate })
  }
  /** 解析 for、while、loop 及 do-while/until，维护循环上下文并保留迭代变量和计数变量。 */ private loopExpression(): T.RhaiFor | T.RhaiWhile | T.RhaiLoop | T.RhaiDoWhile {
    const token = this.take(), start = token.span.start
    if (token.text === 'for') {
      const tuple = this.consume('('), variable = this.parameter(); let counter: T.RhaiParameter | null = null
      if (tuple) { this.expect(','); counter = this.parameter(); this.expect(')') }
      this.expect('in'); const iterable = this.expression(); this.loopDepth++; const body = this.block(); this.loopDepth--
      return this.make('For', start, { variable, counter, iterable, body })
    }
    if (token.text === 'while') { const condition = this.expression(); this.loopDepth++; const body = this.block(); this.loopDepth--; return this.make('While', start, { condition, body }) }
    this.loopDepth++; const body = this.block(); this.loopDepth--
    if (token.text === 'loop') return this.make('Loop', start, { body })
    const until = this.consume('until'); if (!until) this.expect('while'); const condition = this.expression(); this.finish()
    return this.make('DoWhile', start, { body, condition, until })
  }
  /** 解析受保护语句块、可选异常参数及 catch 处理块。 */ private tryExpression(): T.RhaiTry {
    const start = this.expect('try').span.start, body = this.block(); this.expect('catch')
    const parameter = this.consume('(') ? this.parameter() : null; if (parameter) this.expect(')')
    const handler = this.block(); return this.make('Try', start, { body, parameter, handler })
  }
  /** 解析多模式分支、条件守卫和默认分支，检查箭头、分隔逗号及结束花括号。 */ private switchExpression(): T.RhaiSwitch {
    const start = this.expect('switch').span.start, value = this.expression(), cases: T.RhaiSwitchCase[] = []; this.expect('{')
    while (!this.eof() && !this.at('}')) {
      const before = this.offset, caseStart = this.current().span.start, patterns: T.RhaiExpression[] = [], isDefault = this.consume('_')
      if (!isDefault) { do { patterns.push(this.expression(0, new Set(['|', 'if', '=>']))) } while (this.consume('|')) }
      const guard = this.consume('if') ? this.expression(0, new Set(['=>'])) : null; this.expect('=>')
      const body = this.statement(); cases.push(this.make('SwitchCase', caseStart, { patterns, guard, body, isDefault }))
      if (!this.consume(',') && !this.at('}') && !SELF_TERMINATED.has(body.kind)) this.error('RHAI-PARSE-SWITCH-COMMA', 'Expected a comma after the switch arm.')
      if (before === this.offset) this.take()
    }
    this.expect('}'); return this.make('Switch', start, { value, cases })
  }
  /** 按实际 Rhai 运算优先级解析后缀和二元表达式，赋值只允许出现在明确授权的语句位置。 */ private expression(minimum = 0, stop = new Set<string>(), allowAssignment = false): T.RhaiExpression {
    return this.guarded(/** 从前缀表达式开始，依次解析调用、成员、索引和按优先级结合的二元或赋值结构。 */ () => {
      let left = this.prefix(stop)
      while (!this.eof() && !stop.has(this.current().text)) {
        const operator = this.current().text
        if (operator === '(') { this.take(); const args: T.RhaiExpression[] = []; while (!this.eof() && !this.at(')')) { const before = this.offset; args.push(this.expression(0, new Set([',', ')']))); if (!this.consume(',')) break; if (before === this.offset) this.take() }; this.expect(')'); left = this.make('Call', left.span.start, { callee: left, arguments: args, optional: left.kind === 'Member' && left.optional }); continue }
        if (operator === '.' || operator === '?.' || operator === '::') { this.take(); const property = this.identifier(); left = this.make('Member', left.span.start, { object: left, property: property.text, propertySpan: property.span, optional: operator === '?.', namespace: operator === '::' }); continue }
        if (operator === '[' || operator === '?[') { this.take(); const index = this.expression(); this.expect(']'); left = this.make('Index', left.span.start, { object: left, index, optional: operator === '?[' }); continue }
        if (ASSIGNMENTS.has(operator) && minimum === 0) {
          this.take(); if (!allowAssignment) this.error('RHAI-PARSE-ASSIGNMENT-EXPRESSION', 'Assignment is a statement in Rhai, not a value expression.', this.previous().span)
          if (!['Identifier', 'Member', 'Index'].includes(left.kind)) this.error('RHAI-PARSE-ASSIGNMENT-TARGET', 'Assignment requires a variable, property or index.', left.span)
          const value = this.expression(); left = this.make('Assignment', left.span.start, { operator, target: left, value }); continue
        }
        const precedence = PRECEDENCE[operator]
        if (!precedence || precedence < minimum) break
        this.take(); const right = this.expression(precedence + (operator === '**' ? 0 : 1), stop)
        left = this.make('Binary', left.span.start, { operator, left, right, shortCircuit: ['&&', '||', '??'].includes(operator) })
      }
      return left
    })
  }
  /** 解析字面量、容器、闭包、插值、控制表达式及标识符；错误时保留无效节点并安全推进游标。 */ private prefix(stop: Set<string>): T.RhaiExpression {
    const token = this.current(), start = token.span.start
    if (stop.has(token.text) || this.eof()) { this.error('RHAI-PARSE-EXPRESSION', 'Expected an expression.'); return this.make('Invalid', start, { raw: '', reason: 'Missing expression' }, start) }
    if (['+', '-', '!'].includes(token.text)) { this.take(); const operand = this.expression(220, stop); return this.make('Unary', start, { operator: token.text, operand }) }
    if (token.kind === 'number' || token.kind === 'string' || token.kind === 'character' || ['true', 'false'].includes(token.text)) {
      this.take(); const literalKind = token.kind === 'number' ? /[.eE]/.test(token.text.replace(/^0[xX][\da-fA-F_]+$/, 'integer')) ? 'float' : 'integer' : token.kind === 'string' ? 'string' : token.kind === 'character' ? 'character' : 'boolean'
      return this.make('Literal', start, { literalKind, raw: token.text })
    }
    if (this.consume('(')) { if (this.consume(')')) return this.make('Literal', start, { literalKind: 'unit', raw: this.source.slice(start, this.previous().span.end) }); const expression = this.expression(0, new Set([')'])); const close = this.expect(')'); expression.span = this.span(start, close.span.end); return expression }
    if (this.consume('[')) { const elements: T.RhaiExpression[] = []; while (!this.eof() && !this.at(']')) { const before = this.offset; elements.push(this.expression(0, new Set([',', ']']))); if (!this.consume(',')) break; if (before === this.offset) this.take() }; this.expect(']'); return this.make('Array', start, { elements }) }
    if (this.consume('#{')) {
      const entries: T.RhaiMapEntry[] = []
      while (!this.eof() && !this.at('}')) {
        const before = this.offset, key = this.current(); let keyText = key.text, keySpan = key.span, quoted = false
        if (key.kind === 'string') { this.take(); quoted = true; keyText = decodeString(key.text, key.span.column) }
        else if (key.kind === 'templateStart') {
          const template = this.prefix(new Set()); quoted = true; keySpan = template.span
          if (template.kind === 'InterpolatedString' && template.parts.every(/* 比较 part.kind 与 'TemplateText'，返回严格相等的判断结果。 */ part => part.kind === 'TemplateText')) keyText = decodeString(this.source.slice(template.span.start, template.span.end), template.span.column)
          else this.error('RHAI-PARSE-MAP-KEY', 'Object map keys must be constant strings or identifiers.', template.span)
        } else this.identifier()
        if (entries.some(/* 比较 entry.key 与 keyText，返回严格相等的判断结果。 */ entry => entry.key === keyText)) this.error('RHAI-PARSE-MAP-DUPLICATE', `Duplicate object map key ${JSON.stringify(keyText)}.`, keySpan)
        this.expect(':'); const value = this.expression(0, new Set([',', '}']))
        entries.push(this.make('MapEntry', key.span.start, { key: keyText, keySpan, quoted, value }))
        if (!this.consume(',')) break; if (before === this.offset) this.take()
      }
      this.expect('}'); return this.make('Map', start, { entries })
    }
    if (this.at('{')) return this.block()
    if (this.at('if')) return this.ifExpression()
    if (this.at('switch')) return this.switchExpression()
    if (this.at('for') || this.at('while') || this.at('loop') || this.at('do')) return this.loopExpression()
    if (this.at('try')) return this.tryExpression()
    if (this.at('|') || this.at('||')) {
      const empty = this.consume('||'); if (!empty) this.expect('|'); const parameters = empty ? [] : this.parameters('|')
      const oldLoop = this.loopDepth; this.loopDepth = 0; this.functionDepth++
      const body = this.expression(); this.functionDepth--; this.loopDepth = oldLoop
      return this.make('Closure', start, { parameters, body, captureBindingIds: [] })
    }
    if (token.kind === 'templateStart') {
      this.take(); const parts: Array<T.RhaiTemplateText | T.RhaiExpression> = []
      while (!this.eof() && this.current().kind !== 'templateEnd') {
        const before = this.offset
        if (this.current().kind === 'templateText') { const text = this.take(); parts.push(this.make('TemplateText', text.span.start, { raw: text.text })) }
        else if (this.current().kind === 'interpolationStart') {
          const opening = this.take(), body: T.RhaiStatement[] = []
          while (!this.eof() && this.current().kind !== 'interpolationEnd' && this.current().kind !== 'templateEnd') {
            const beforeStatement = this.offset; body.push(this.statement()); if (beforeStatement === this.offset) this.take()
          }
          const closing = this.current(); if (closing.kind === 'interpolationEnd') this.take(); else this.error('RHAI-PARSE-INTERPOLATION', 'Expected the end of interpolation.')
          parts.push(this.make('Block', opening.span.start + 1, { body }, closing.span.end))
        }
        else { this.error('RHAI-PARSE-TEMPLATE', 'Unexpected token in string interpolation.'); this.take() }
        if (before === this.offset) this.take()
      }
      if (this.current().kind === 'templateEnd') this.take(); else this.error('RHAI-PARSE-TEMPLATE-END', 'Missing closing backtick.')
      return this.make('InterpolatedString', start, { parts })
    }
    if (token.kind === 'identifier' || token.text === 'this') { this.take(); return this.make('Identifier', start, { name: token.text, bindingId: null }) }
    this.error('RHAI-PARSE-EXPRESSION', `Expected an expression, found ${JSON.stringify(token.text)}.`)
    if (!['}', ')', ']', ';', ','].includes(token.text)) this.take()
    return this.make('Invalid', start, { raw: this.source.slice(start, Math.max(start, this.previous().span.end)), reason: 'Unexpected expression token' })
  }
}

/** 使用 Rhai 字符串解码器；解码失败时保留去掉外层引号的原始内容供后续诊断。 */ function decodeString(raw: string, column = 1): string { try { return decodeRhaiString(raw, column) } catch { return raw.slice(1, -1) } }
/** 逐字符转义引号、反斜杠和控制字符，生成双引号 Rhai 字符串字面量。 */ function quoteRhaiString(value: string): string { return '"' + [...value].map(/** 为 Rhai 字符串逐个转义引号、反斜杠、常用换行和其他控制字符。 */ character => character === '"' ? '\\"' : character === '\\' ? '\\\\' : character === '\n' ? '\\n' : character === '\r' ? '\\r' : character === '\t' ? '\\t' : character.charCodeAt(0) < 32 ? `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}` : character).join('') + '"' }
/* 调用 new Parser(source, options).run() 并返回调用结果。 */ export function parseRhai(source: string, options: T.RhaiParseOptions = {}): T.RhaiProgram { return new Parser(source, options).run() }

/** Enumerates AST nodes only, never trivia, metadata tables or source strings. */
/** 以显式栈遍历真正语法节点，排除范围元数据、普通字符串和其他非节点对象。 */ export function* walkRhai(value: T.RhaiProgram | T.RhaiNode): Generator<T.RhaiNode> {
  const stack: unknown[] = ['format' in value ? value.body : value]
  while (stack.length) {
    const item = stack.pop()
    if (Array.isArray(item)) { for (let index = item.length - 1; index >= 0; index--) stack.push(item[index]); continue }
    if (!item || typeof item !== 'object' || !('kind' in item) || !('span' in item)) continue
    const node = item as T.RhaiNode; yield node
    const children = Object.entries(node).filter(/* 先计算 !['span', 'nameSpan', 'propertySpan', 'keySpan'].includes(key) && child；仅当其为真值时求右侧 typeof child === 'object'，返回短路求值结果。 */ ([key, child]) => !['span', 'nameSpan', 'propertySpan', 'keySpan'].includes(key) && child && typeof child === 'object').map(/* 返回 child 的当前值。 */ ([, child]) => child)
    for (let index = children.length - 1; index >= 0; index--) stack.push(children[index])
  }
}

// Implemented below using the same AST rather than a second source recognizer.
/** 在同一语法树上建立作用域、声明与引用，处理前置函数、声明顺序、重载、闭包捕获和沙箱诊断。 */ function bindRhai(program: T.RhaiProgram, options: T.RhaiParseOptions): void {
  const known = new Set([...DEFAULT_KNOWN, ...(options.knownGlobals ?? []), ...(options.knownFunctions ?? [])])
  const scopes = new Map<string, T.RhaiScope>(), symbols = new Map<string, Map<string, T.RhaiBinding[]>>(), occurrences = new Map<string, number>()
  const diagnostic = /** 在诊断预算内记录与语法节点身份和范围关联的绑定错误或警告。 */ (code: string, message: string, node: T.RhaiNode, severity: 'error' | 'warning' = 'error') => { if (program.diagnostics.length < program.limits.maxDiagnostics) program.diagnostics.push({ code, severity, message, span: node.span, nodeId: node.id }) }
  const ordinal = /** 按作用域或节点特征键递增出现序号，供重复结构生成唯一稳定身份。 */ (key: string) => { const result = (occurrences.get(key) ?? 0) + 1; occurrences.set(key, result); return result }
  const scope = /** 创建作用域及其符号表，连接父级并登记源码范围和所属节点。 */ (kind: T.RhaiScope['kind'], parentId: string | null, node: T.RhaiNode | null, key: string): T.RhaiScope => {
    const id = parentId ? `${parentId}/${key}:${ordinal(`${parentId}/${key}`)}` : 'scope:module'
    const item: T.RhaiScope = { id, kind, parentId, span: node?.span ?? rhaiSpan(program.source, 0, program.source.length), nodeId: node?.id ?? null, bindingIds: [] }
    program.scopes.push(item); scopes.set(id, item); symbols.set(id, new Map()); return item
  }
  const module = scope('module', null, null, 'module')
  const declare = /** 检查同作用域参数及同签名函数冲突，登记具有可变性、元数和接收类型的绑定。 */ (node: T.RhaiNode, name: string, target: T.RhaiScope, kind: T.RhaiBinding['kind'], mutable: boolean, span: T.RhaiSpan, arity?: number, receiverType?: string): T.RhaiBinding => {
    const prior = symbols.get(target.id)!.get(name) ?? [], collision = prior.find(/** 识别同元数及接收类型的函数重载冲突，或重复参数、循环与异常参数声明。 */ item => kind === 'function' ? item.kind === 'function' && item.arity === arity && item.receiverType === receiverType : ['parameter', 'loop', 'catch'].includes(kind) && item.kind === kind)
    if (collision) diagnostic('RHAI-BIND-DUPLICATE', `Duplicate ${kind} binding ${name}${arity === undefined ? '' : `/${arity}`}.`, node)
    const item: T.RhaiBinding = { id: `${target.id}/binding:${kind}:${name}${arity === undefined ? '' : `/${arity}`}${receiverType === undefined ? '' : `@${receiverType}`}:${prior.length + 1}`, name, kind, scopeId: target.id, declarationNodeId: node.id, span, mutable, captured: false, ...(arity === undefined ? {} : { arity }), ...(receiverType === undefined ? {} : { receiverType }) }
    prior.push(item); symbols.get(target.id)!.set(name, prior); target.bindingIds.push(item.id); program.bindings.push(item); return item
  }
  const resolve = /** 由内向外查找同名绑定；调用给定元数时优先匹配函数重载，否则使用最近声明。 */ (name: string, target: T.RhaiScope, arity?: number): T.RhaiBinding | null => {
    let current: T.RhaiScope | undefined = target
    while (current) { const entries = symbols.get(current.id)?.get(name); if (entries?.length) { if (arity !== undefined) { const callable = [...entries].reverse().find(/* 先计算 item.kind === 'function'；仅当其为真值时求右侧 item.arity === arity，返回短路求值结果。 */ item => item.kind === 'function' && item.arity === arity); if (callable) return callable }; return entries[entries.length - 1] }; current = current.parentId ? scopes.get(current.parentId) : undefined }
    return null
  }
  const functions = program.body.filter(/* 比较 node.kind 与 'FunctionDeclaration'，返回严格相等的判断结果。 */ (node): node is T.RhaiFunctionDeclaration => node.kind === 'FunctionDeclaration')
  // Function declarations are available before their textual definitions.
  for (const node of functions) node.bindingId = declare(node, node.name, module, 'function', false, node.nameSpan, node.parameters.length, node.receiver ? node.receiver.kind === 'Identifier' ? node.receiver.name : decodeString(node.receiver.raw) : undefined).id
  const closures: Array<{ node: T.RhaiClosure; scope: T.RhaiScope }> = []
  const identity = /** 以作用域、节点类型及名称或源码摘要生成节点身份，并用出现序号区分重复结构。 */ (node: T.RhaiNode, target: T.RhaiScope) => {
    node.scopeId = target.id
    const signature = node.kind === 'FunctionDeclaration' ? `${node.kind}:${node.name}/${node.parameters.length}` : node.kind === 'VariableDeclaration' || node.kind === 'Parameter' || node.kind === 'Identifier' ? `${node.kind}:${node.name}` : `${node.kind}:${rhaiSourceHash(program.source.slice(node.span.start, node.span.end).replace(/\s+/g, ' '))}`
    node.id = `${target.id}/node:${signature}:${ordinal(`${target.id}/node:${signature}`)}`
  }
  const reference = /** 解析读写或调用引用，标记闭包捕获，检查不可变写入并报告未解析名称及禁用沙箱调用。 */ (node: T.RhaiIdentifier, target: T.RhaiScope, access: T.RhaiReference['access'], arity?: number) => {
    const binding = resolve(node.name, target, arity); node.bindingId = binding?.id ?? null
    let captured = false
    const closure = closures[closures.length - 1]
    if (binding && closure && binding.scopeId !== closure.scope.id && !binding.scopeId.startsWith(`${closure.scope.id}/`) && binding.kind !== 'function') { captured = true; binding.captured = true; if (!closure.node.captureBindingIds.includes(binding.id)) closure.node.captureBindingIds.push(binding.id) }
    program.references.push({ nodeId: node.id, name: node.name, span: node.span, scopeId: target.id, bindingId: node.bindingId, access, captured })
    if (binding && access !== 'read' && access !== 'call' && !binding.mutable) diagnostic('RHAI-BIND-IMMUTABLE', `Cannot assign to immutable binding ${node.name}.`, node)
    if (!binding && options.reportUnresolved && !known.has(node.name)) diagnostic('RHAI-BIND-UNRESOLVED', `Unresolved ${access === 'call' ? 'function' : 'binding'} ${node.name}.`, node, 'warning')
    if (options.sandbox !== false && access === 'call' && node.name === 'eval') diagnostic('RHAI-SANDBOX-EVAL', 'eval is disabled by the Nova Rhai sandbox.', node)
    if (options.sandbox !== false && access === 'call' && node.name === 'sleep') diagnostic('RHAI-SANDBOX-SLEEP', 'Blocking sleep is disabled; use timer_start or task_wait for deferred work.', node)
  }
  const visit = /** 按语法种类建立函数、块、闭包、循环及异常作用域，按求值顺序登记声明和读写引用。 */ (node: T.RhaiNode, target: T.RhaiScope, access: T.RhaiReference['access'] = 'read'): void => {
    identity(node, target)
    if (node.kind === 'Identifier') { reference(node, target, access); return }
    if (node.kind === 'VariableDeclaration') { node.metadata.forEach(/* 调用 visit(item, target) 并返回调用结果。 */ item => visit(item, target)); if (node.initializer) visit(node.initializer, target); node.bindingId = declare(node, node.name, target, target.kind === 'module' ? 'global' : 'local', node.declarationKind === 'let', node.nameSpan).id; return }
    if (node.kind === 'FunctionDeclaration') {
      const binding = program.bindings.find(/* 比较 item.id 与 node.bindingId，返回严格相等的判断结果。 */ item => item.id === node.bindingId); if (binding) binding.declarationNodeId = node.id
      const inner = scope('function', module.id, node, `function:${node.name}/${node.parameters.length}`)
      if (node.receiver) identity(node.receiver, inner)
      if ([...walkRhai(node.body)].some(/* 先计算 item.kind === 'Identifier'；仅当其为真值时求右侧 item.name === 'this'，返回短路求值结果。 */ item => item.kind === 'Identifier' && item.name === 'this')) declare(node, 'this', inner, 'parameter', true, node.receiver?.span ?? node.nameSpan)
      for (const parameter of node.parameters) { identity(parameter, inner); parameter.bindingId = declare(parameter, parameter.name, inner, 'parameter', true, parameter.span).id }
      identity(node.body, inner); node.body.body.forEach(/* 调用 visit(item, inner) 并返回调用结果。 */ item => visit(item, inner)); return
    }
    if (node.kind === 'Block') { const inner = scope('block', target.id, node, 'block'); node.scopeId = inner.id; node.body.forEach(/* 调用 visit(item, inner) 并返回调用结果。 */ item => visit(item, inner)); return }
    if (node.kind === 'Closure') {
      const inner = scope('closure', target.id, node, 'closure'); closures.push({ node, scope: inner })
      for (const parameter of node.parameters) { identity(parameter, inner); parameter.bindingId = declare(parameter, parameter.name, inner, 'parameter', true, parameter.span).id }
      visit(node.body, inner); closures.pop(); return
    }
    if (node.kind === 'For') {
      visit(node.iterable, target); const inner = scope('loop', target.id, node, 'for')
      for (const parameter of [node.variable, node.counter]) if (parameter) { identity(parameter, inner); parameter.bindingId = declare(parameter, parameter.name, inner, 'loop', true, parameter.span).id }
      visit(node.body, inner); return
    }
    if (node.kind === 'Try') {
      visit(node.body, target); const inner = scope('catch', target.id, node.handler, 'catch')
      if (node.parameter) { identity(node.parameter, inner); node.parameter.bindingId = declare(node.parameter, node.parameter.name, inner, 'catch', true, node.parameter.span).id }
      visit(node.handler, inner); return
    }
    if (node.kind === 'Assignment') { visit(node.target, target, node.operator === '=' ? 'write' : 'readWrite'); visit(node.value, target); return }
    if (node.kind === 'Call') {
      if (node.callee.kind === 'Identifier') { identity(node.callee, target); reference(node.callee, target, 'call', node.arguments.length) } else visit(node.callee, target, 'call')
      node.arguments.forEach(/* 调用 visit(argument, target) 并返回调用结果。 */ argument => visit(argument, target)); return
    }
    if (node.kind === 'Member' || node.kind === 'Index') { visit(node.object, target, access === 'read' || access === 'call' ? 'read' : 'readWrite'); if (node.kind === 'Index') visit(node.index, target); return }
    if (node.kind === 'ModuleDeclaration') { visit(node.path, target); if (node.alias) { identity(node.alias, target); node.alias.bindingId = declare(node.alias, node.alias.name, target, 'module', false, node.alias.span).id }; return }
    if (node.kind === 'ExportDeclaration') { if (node.declaration) visit(node.declaration, target); node.bindingId = resolve(node.name, target)?.id ?? null; if (!node.bindingId) diagnostic('RHAI-BIND-EXPORT', `Cannot export unresolved binding ${node.name}.`, node); return }
    for (const child of directChildren(node)) visit(child, target)
  }
  // Globals have declaration-time ordering. Function bodies are resolved after
  // module declarations so references to module state share its binding IDs.
  for (const node of program.body) if (node.kind !== 'FunctionDeclaration') visit(node, module)
  for (const node of functions) visit(node, module)
}

/** 仅枚举节点直接拥有的语法子节点，排除范围记录和普通元数据。 */ function directChildren(node: T.RhaiNode): T.RhaiNode[] {
  return Object.entries(node).flatMap(/** 排除源码范围等非语法数据，只返回真正节点或节点数组成员。 */ ([key, value]): T.RhaiNode[] => {
    if (['span', 'nameSpan', 'propertySpan', 'keySpan'].includes(key) || !value || typeof value !== 'object') return []
    if (Array.isArray(value)) return value.filter(/* 调用 Boolean(item && typeof item === 'object' && 'kind' in item && 'span' in item) 并返回调用结果。 */ (item): item is T.RhaiNode => Boolean(item && typeof item === 'object' && 'kind' in item && 'span' in item))
    return 'kind' in value && 'span' in value ? [value as T.RhaiNode] : []
  })
}

/** Match unchanged siblings first, then edited nodes in the same structural slot.
 * This is linear per sibling list: no quadratic LCS on large script bodies. */
/** 先按同级唯一指纹匹配，再对齐相同结构槽位，保留节点、作用域和绑定身份并同步所有引用。 */ function reconcileRhaiIdentity(previous: T.RhaiProgram, program: T.RhaiProgram): void {
  if (previous.format !== program.format || previous.version !== program.version) return
  const pairs = new Map<T.RhaiNode, T.RhaiNode>()
  const key = /** 以节点种类及声明名称、元数或无空白源码摘要生成兄弟节点匹配指纹。 */ (node: T.RhaiNode, source: string) => `${node.kind}:${node.kind === 'FunctionDeclaration' ? `${node.name}/${node.parameters.length}` : node.kind === 'VariableDeclaration' || node.kind === 'Parameter' || node.kind === 'Identifier' ? node.name : rhaiSourceHash(source.slice(node.span.start, node.span.end).replace(/\s+/g, ''))}`
  const isNode = /* 调用 Boolean(value && typeof value === 'object' && 'kind' in value && 'span' in value) 并返回调用结果。 */ (value: unknown): value is T.RhaiNode => Boolean(value && typeof value === 'object' && 'kind' in value && 'span' in value)
  const matchArray = /** 按唯一指纹建立稳定锚点，在等长未匹配区间对齐同种节点，再递归匹配子树。 */ (older: T.RhaiNode[], newer: T.RhaiNode[]) => {
    const buckets = new Map<string, number[]>(), selected = new Map<number, number>(), used = new Set<number>()
    older.forEach(/** 把旧同级节点按指纹归入索引桶，保留重复位置供匹配判断。 */ (node, index) => { const fingerprint = key(node, previous.source), entries = buckets.get(fingerprint) ?? []; entries.push(index); buckets.set(fingerprint, entries) })
    newer.forEach(/** 仅将具有唯一旧候选且未被占用的新节点设为稳定锚点。 */ (node, index) => { const candidates = buckets.get(key(node, program.source)); if (candidates?.length === 1 && !used.has(candidates[0])) { selected.set(index, candidates[0]); used.add(candidates[0]) } })
    // Stable anchors preserve insertions/deletions. Within equal-size unmatched
    // runs, a renamed declaration or changed literal keeps its identity.
    let newStart = 0, oldStart = 0
    const anchors = [...selected].filter(/* 先计算 index === 0；仅当其为假值时求右侧 old > all[index - 1][1]，返回短路求值结果。 */ ([, old], index, all) => index === 0 || old > all[index - 1][1]).concat([[newer.length, older.length]])
    for (const [newEnd, oldEnd] of anchors) {
      const newRun = Array.from({ length: Math.max(0, newEnd - newStart) }, /* 计算表达式 index + newStart 并返回结果，沿用操作数的原有类型规则。 */ (_, index) => index + newStart).filter(/* 返回 selected.has(index) 的逻辑取反结果。 */ index => !selected.has(index))
      const oldRun = Array.from({ length: Math.max(0, oldEnd - oldStart) }, /* 计算表达式 index + oldStart 并返回结果，沿用操作数的原有类型规则。 */ (_, index) => index + oldStart).filter(/* 返回 used.has(index) 的逻辑取反结果。 */ index => !used.has(index))
      if (newRun.length === oldRun.length) newRun.forEach(/** 在等长未匹配片段中按位置配对同种节点，保留改名或字面量变化后的身份。 */ (newIndex, index) => { const oldIndex = oldRun[index]; if (newer[newIndex].kind === older[oldIndex].kind) { selected.set(newIndex, oldIndex); used.add(oldIndex) } })
      newStart = newEnd + 1; oldStart = oldEnd + 1
    }
    for (const [newIndex, oldIndex] of selected) match(older[oldIndex], newer[newIndex])
  }
  const match = /** 种类一致时登记新旧节点配对，再按字段递归匹配子节点及节点数组。 */ (older: T.RhaiNode, newer: T.RhaiNode): void => {
    if (older.kind !== newer.kind) return
    pairs.set(newer, older)
    for (const [field, value] of Object.entries(newer)) {
      const oldValue = (older as unknown as Record<string, unknown>)[field]
      if (Array.isArray(value) && Array.isArray(oldValue)) matchArray(oldValue.filter(isNode), value.filter(isNode))
      else if (isNode(value) && isNode(oldValue)) match(oldValue, value)
    }
  }
  matchArray(previous.body, program.body)
  const nodeIds = new Map<string, string>(), usedIds = new Set<string>()
  for (const [node, old] of pairs) if (!usedIds.has(old.id)) { nodeIds.set(node.id, old.id); usedIds.add(old.id) }
  let fresh = 0
  for (const node of walkRhai(program)) if (!nodeIds.has(node.id)) { let id = node.id; while (usedIds.has(id)) id = `${node.id}:revision:${program.sourceHash}:${++fresh}`; nodeIds.set(node.id, id); usedIds.add(id) }
  const identities = /** 优先采用未重复的旧身份，为剩余项目生成无冲突的当前修订身份映射。 */ <V extends { id: string }>(values: V[], preferred: (value: V) => string | undefined) => {
    const result = new Map<string, string>(), used = new Set<string>()
    for (const value of values) { const id = preferred(value); if (id && !used.has(id)) { result.set(value.id, id); used.add(id) } }
    for (const value of values) if (!result.has(value.id)) { let id = value.id; while (used.has(id)) id = `${value.id}:revision:${program.sourceHash}:${++fresh}`; result.set(value.id, id); used.add(id) }
    return result
  }
  const oldScopes = new Map(previous.scopes.filter(/* 返回 scope.nodeId 的当前值。 */ scope => scope.nodeId).map(/* 返回按声明顺序构造的数组 [`${scope.kind}:${scope.nodeId}`, scope]。 */ scope => [`${scope.kind}:${scope.nodeId}`, scope]))
  const scopeIds = identities(program.scopes, /* 返回 oldScopes.get(`${scope.kind}:${scope.nodeId ? nodeIds.get(scope.nodeId) : ''}`)?.id 的当前值。 */ scope => oldScopes.get(`${scope.kind}:${scope.nodeId ? nodeIds.get(scope.nodeId) : ''}`)?.id)
  const oldBindings = new Map(previous.bindings.map(/* 返回按声明顺序构造的数组 [`${binding.kind}:${binding.declarationNodeId}`, binding]。 */ binding => [`${binding.kind}:${binding.declarationNodeId}`, binding]))
  const bindingIds = identities(program.bindings, /* 返回 oldBindings.get(`${binding.kind}:${nodeIds.get(binding.declarationNodeId)}`)?.id 的当前值。 */ binding => oldBindings.get(`${binding.kind}:${nodeIds.get(binding.declarationNodeId)}`)?.id)
  const nodeId = /* 当 nodeIds.get(id) 为 null 或 undefined 时返回 id，否则保留左侧值。 */ (id: string) => nodeIds.get(id) ?? id, scopeId = /* 当 scopeIds.get(id) 为 null 或 undefined 时返回 id，否则保留左侧值。 */ (id: string) => scopeIds.get(id) ?? id, bindingId = /* 当 bindingIds.get(id) 为 null 或 undefined 时返回 id，否则保留左侧值。 */ (id: string) => bindingIds.get(id) ?? id
  for (const node of walkRhai(program)) { node.id = nodeId(node.id); node.scopeId = scopeId(node.scopeId); if ('bindingId' in node && node.bindingId) node.bindingId = bindingId(node.bindingId); if (node.kind === 'Closure') node.captureBindingIds = node.captureBindingIds.map(bindingId) }
  for (const scope of program.scopes) { scope.id = scopeId(scope.id); if (scope.parentId) scope.parentId = scopeId(scope.parentId); if (scope.nodeId) scope.nodeId = nodeId(scope.nodeId); scope.bindingIds = scope.bindingIds.map(bindingId) }
  for (const binding of program.bindings) { binding.id = bindingId(binding.id); binding.scopeId = scopeId(binding.scopeId); binding.declarationNodeId = nodeId(binding.declarationNodeId) }
  for (const reference of program.references) { reference.nodeId = nodeId(reference.nodeId); reference.scopeId = scopeId(reference.scopeId); if (reference.bindingId) reference.bindingId = bindingId(reference.bindingId) }
  for (const diagnostic of program.diagnostics) if (diagnostic.nodeId) diagnostic.nodeId = nodeId(diagnostic.nodeId)
}

/** 使用节点或显式范围的偏移直接截取原源码，保留原空白及注释。 */ export function sourceSlice(program: T.RhaiProgram, node: T.RhaiNode | T.RhaiSpan): string { const span = 'span' in node ? node.span : node; return program.source.slice(span.start, span.end) }
/** 按源码区间顺序应用修改，拒绝重叠、非法范围或预期原文不匹配，其余源码逐字保留。 */ export function emitRhai(program: T.RhaiProgram, edits: readonly T.RhaiSourceEdit[] = []): string {
  const ordered = [...edits].sort(/* 先计算 a.start - b.start；仅当其为假值时求右侧 a.end - b.end，返回短路求值结果。 */ (a, b) => a.start - b.start || a.end - b.end)
  let end = 0, output = ''
  for (const edit of ordered) {
    if (!Number.isInteger(edit.start) || !Number.isInteger(edit.end) || edit.start < end || edit.end < edit.start || edit.end > program.source.length) throw new Error('Rhai source edits overlap or have invalid spans.')
    if (edit.expected !== undefined && program.source.slice(edit.start, edit.end) !== edit.expected) throw new Error('Rhai source changed since the edit was prepared.')
    output += program.source.slice(end, edit.start) + edit.text; end = edit.end
  }
  return output + program.source.slice(end)
}

/** Structural emitter, used for graph edits and independent VM differential tests. */
/** 按结构节点递归生成等价 Rhai 语法，保留字面量及终止信息；无效节点禁止生成。 */ export function emitRhaiNode(node: T.RhaiNode): string {
  const emit = emitRhaiNode, semi = /* 根据 terminated 的真假，分别返回 ';' 或 ''。 */ (terminated: boolean) => terminated ? ';' : ''
  const postfix = /** 直接发射可作为后缀接收者的表达式，其余表达式先加括号以保持解析含义。 */ (value: T.RhaiExpression) => ['Identifier', 'Literal', 'Array', 'Map', 'Call', 'Member', 'Index', 'Unary', 'Binary', 'InterpolatedString'].includes(value.kind) ? emit(value) : `(${emit(value)})`
  switch (node.kind) {
    case 'Literal': return node.literalKind === 'string' && node.raw.startsWith('"') && /\\\r?\n/.test(node.raw) ? quoteRhaiString(decodeString(node.raw, node.span.column)) : node.raw
    case 'Identifier': case 'Parameter': return node.name
    case 'Array': return `[${node.elements.map(emit).join(', ')}]`
    case 'Map': return `#{${node.entries.map(emit).join(', ')}}`
    case 'MapEntry': return `${node.quoted ? quoteRhaiString(node.key) : node.key}: ${emit(node.value)}`
    case 'Unary': return `(${node.operator}${emit(node.operand)})`
    case 'Binary': return `(${emit(node.left)} ${node.operator} ${emit(node.right)})`
    case 'Assignment': return `${emit(node.target)} ${node.operator} ${emit(node.value)}`
    case 'Call': return `${postfix(node.callee)}(${node.arguments.map(emit).join(', ')})`
    case 'Member': return `${postfix(node.object)}${node.namespace ? '::' : node.optional ? '?.' : '.'}${node.property}`
    case 'Index': return `${postfix(node.object)}${node.optional ? '?[' : '['}${emit(node.index)}]`
    case 'Closure': return `|${node.parameters.map(emit).join(', ')}| ${emit(node.body)}`
    case 'TemplateText': return node.raw
    case 'InterpolatedString': return '`' + node.parts.map(/** 原样保留插值字符串的文本段，将表达式或语句块重新包入插值标记。 */ part => part.kind === 'TemplateText' ? part.raw : '${' + (part.kind === 'Block' ? part.body.map(emit).join('\n') : emit(part)) + '}').join('') + '`'
    case 'Block': return `{\n${node.body.map(emit).join('\n')}\n}`
    case 'If': return `if ${emit(node.condition)} ${emit(node.consequent)}${node.alternate ? ` else ${emit(node.alternate)}` : ''}`
    case 'Switch': return `switch ${emit(node.value)} {\n${node.cases.map(emit).join(',\n')}\n}`
    case 'SwitchCase': return `${node.isDefault ? '_' : node.patterns.map(emit).join(' | ')}${node.guard ? ` if ${emit(node.guard)}` : ''} => ${emit(node.body)}`
    case 'For': return `for ${node.counter ? `(${emit(node.variable)}, ${emit(node.counter)})` : emit(node.variable)} in ${emit(node.iterable)} ${emit(node.body)}`
    case 'While': return `while ${emit(node.condition)} ${emit(node.body)}`
    case 'Loop': return `loop ${emit(node.body)}`
    case 'DoWhile': return `do ${emit(node.body)} ${node.until ? 'until' : 'while'} ${emit(node.condition)};`
    case 'Try': return `try ${emit(node.body)} catch${node.parameter ? ` (${emit(node.parameter)})` : ''} ${emit(node.handler)}`
    case 'ExportMetadata': return `${node.name}=${emit(node.value)}`
    case 'VariableDeclaration': return `${node.exported ? `@export${node.metadata.length ? `(${node.metadata.map(emit).join(', ')})` : ''} ` : ''}${node.declarationKind} ${node.name}${node.initializer ? ` = ${emit(node.initializer)}` : ''}${semi(node.terminated)}`
    case 'FunctionDeclaration': return `${node.private ? 'private ' : ''}fn ${node.receiver ? `${emit(node.receiver)}.` : ''}${node.name}(${node.parameters.map(emit).join(', ')}) ${emit(node.body)}`
    case 'ExpressionStatement': return `${emit(node.expression)}${semi(node.terminated)}`
    case 'Return': case 'Break': case 'Throw': return `${node.kind.toLowerCase()}${node.value ? ` ${emit(node.value)}` : ''}${semi(node.terminated)}`
    case 'Continue': return `continue${semi(node.terminated)}`
    case 'ModuleDeclaration': return `${node.keyword} ${emit(node.path)}${node.alias ? ` as ${emit(node.alias)}` : ''}${semi(node.terminated)}`
    case 'ExportDeclaration': return node.declaration ? `export ${emit(node.declaration)}` : `export ${node.name}${node.alias ? ` as ${node.alias}` : ''}${semi(node.terminated)}`
    case 'Empty': return ';'
    case 'Invalid': throw new Error(`Cannot structurally emit invalid Rhai: ${node.reason}`)
  }
}
