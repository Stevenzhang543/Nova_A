/** 动态对象检查：把脚本动态值转换为编辑器可查看的字段与状态描述。 */
/** Read-only inspection of supplied snapshot data, never a script evaluator. */
export function snapshotPath(root: unknown, path: string): unknown {
  if (!path.trim() || path.length > 512) throw new Error('A snapshot path of 1–512 characters is required.');
  const parts: string[] = [];
  let cursor = 0;
  const space = /** 推进游标跳过属性路径中的空白。 */ () => { while (/\s/.test(path[cursor] ?? '') && cursor < path.length) cursor++; };
  const identifier = /** 从当前游标解析属性标识符，点后允许数字开头，无法匹配时抛出路径错误。 */ (afterDot = false) => { const match = (afterDot ? /^[\w$]+/ : /^[A-Za-z_$][\w$]*/).exec(path.slice(cursor)); if (!match) throw new Error('Expected a snapshot property name.'); cursor += match[0].length; return match[0]; };
  space(); parts.push(identifier());
  while (cursor < path.length) {
    space(); if (cursor === path.length) break;
    if (path[cursor] === '.') { cursor++; space(); parts.push(identifier(true)); }
    else if (path[cursor] === '[') {
      cursor++; space(); let key: string;
      if (path[cursor] === '"') {
        const begin = cursor++;
        let escaped = false, closed = false;
        while (cursor < path.length) { const ch = path[cursor++]; if (!escaped && ch === '"') { closed = true; break; } if (!escaped && ch === '\\') escaped = true; else escaped = false; }
        if (!closed) throw new Error('Unclosed map key.');
        key = JSON.parse(path.slice(begin, cursor));
      } else {
        const match = /^(?:0|[1-9]\d*)/.exec(path.slice(cursor));
        if (!match) throw new Error('Use an array index or double-quoted map key.');
        key = match[0]; cursor += key.length;
      }
      space(); if (path[cursor++] !== ']') throw new Error('Expected closing bracket.'); parts.push(key);
    } else throw new Error('Only snapshot property paths are supported.');
    if (parts.length > 32) throw new Error('Snapshot path exceeds 32 segments.');
  }
  let value = root;
  for (const part of parts) {
    if (['__proto__', 'prototype', 'constructor'].includes(part)) throw new Error('Prototype access is unavailable.');
    if (!value || typeof value !== 'object') throw new Error(`Unknown snapshot property: ${part}`);
    const descriptor = Object.getOwnPropertyDescriptor(value, part);
    if (!descriptor) throw new Error(`Unknown snapshot property: ${part}`);
    if (!('value' in descriptor)) throw new Error('Accessor properties are not evaluated.');
    value = descriptor.value;
  }
  return value;
}

/** 用字符、深度和节点预算渲染调试快照，避免调用访问器并标记循环或截断内容。 */ export function snapshotPreview(value: unknown, maxCharacters = 12000): string {
  const limit = Math.max(64, Math.min(12000, Math.floor(maxCharacters) || 12000));
  let output = '', visited = 0, exhausted = false;
  const ancestors = new WeakSet<object>();
  const put = /** 按剩余字符预算追加预览片段，超出时记录截断标记。 */ (text: string) => { const remaining = limit - output.length; if (text.length > remaining) exhausted = true; output += text.slice(0, Math.max(0, remaining)); };
  const render = /** 递归展示基础值和自有数据字段，限制深度及成员数，跳过访问器并识别祖先循环。 */ (item: unknown, depth: number): void => {
    if (output.length >= limit) { exhausted = true; return; }
    if (++visited > 256) { put('[item limit]'); return; }
    if (item === null) { put('null'); return; }
    if (typeof item === 'string') { const clipped = item.slice(0, Math.min(2048, limit - output.length)); put(JSON.stringify(clipped)); if (clipped.length < item.length) put('…[string truncated]'); return; }
    if (typeof item === 'number' || typeof item === 'boolean' || typeof item === 'bigint' || typeof item === 'undefined') { put(String(item)); return; }
    if (typeof item !== 'object') { put(`[${typeof item}]`); return; }
    if (ancestors.has(item)) { put('[circular]'); return; }
    if (depth >= 6) { put('[depth limit]'); return; }
    ancestors.add(item);
    const array = Array.isArray(item); put(array ? '[' : '{'); let count = 0;
    for (const key in item) {
      if (!Object.prototype.hasOwnProperty.call(item, key)) continue;
      if (count >= 40 || visited >= 256 || output.length >= limit) { put('…[items truncated]'); break; }
      if (count++) put(', ');
      if (!array) put(JSON.stringify(key.slice(0, 256)) + ': ');
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (descriptor && 'value' in descriptor) render(descriptor.value, depth + 1); else put('[accessor omitted]');
    }
    put(array ? ']' : '}'); ancestors.delete(item);
  };
  render(value, 0);
  if (exhausted) output = output.slice(0, limit - 12) + '…[truncated]';
  return output;
}

/* 根据 value === null 的真假，分别返回 'null' 或 Array.isArray(value) ? 'array' : typeof value === 'object' ? 'map' : typeof value。 */ export function snapshotValueType(value: unknown): string {
  return value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value === 'object' ? 'map' : typeof value
}

/** Find comparison operators outside quoted literals and bracket keys. */
/** 扫描引号与方括号层级，在顶层拆出首个支持的比较运算符及两侧表达式。 */ export function snapshotComparison(expression: string): [string, string, string] | null {
  let quote = '', escaped = false, depth = 0
  for (let index = 0; index < expression.length; index++) {
    const ch = expression[index]
    if (quote) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === quote) quote = ''; continue }
    if (ch === '"' || ch === "'") { quote = ch; continue }
    if (ch === '[') { depth++; continue }
    if (ch === ']') { depth--; continue }
    if (!depth) {
      const operator = /^(===|!==|==|!=|>=|<=|>|<)/.exec(expression.slice(index))?.[0]
      if (operator) return [expression.slice(0, index), operator, expression.slice(index + operator.length)]
    }
  }
  return null
}
