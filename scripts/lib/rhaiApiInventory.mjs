/** Rhai API 清单构造：合并真实编译元数据、Rust 宿主注册和生命周期声明，保留两种运行平台的差异。 */
const canonicalType = /** 规范化 Rust 类型的空白、引用和常用字符串/容器别名，用于匹配签名。 */ value => value.replace(/\s+/g, '').replace(/^&(?:mut)?/, '').replace(/(?:types::dynamic::)?Dynamic/g, 'Dynamic').replace(/ImmutableString|String|&str/g, 'string').replace(/^str$/, 'string').replace(/^Map$/, 'map').replace(/^Array$/, 'array')
const functionKey = /* 计算表达式 item.name + '(' + (item.params ?? []).map(parameter => canonicalType(parameter.type ?? 'Dynamic')).join(',') + ')' 并返回结果，沿用操作数的原有类型规则。 */ item => item.name + '(' + (item.params ?? []).map(/* 调用 canonicalType(parameter.type ?? 'Dynamic') 并返回调用结果。 */ parameter => canonicalType(parameter.type ?? 'Dynamic')).join(',') + ')'
const digestKey = /* 调用 value.replace(/[^A-Za-z0-9_.-]/g, character => '_' + character.charCodeAt(0).toString(16)) 并返回调用结果。 */ value => value.replace(/[^A-Za-z0-9_.-]/g, /* 计算表达式 '_' + character.charCodeAt(0).toString(16) 并返回结果，沿用操作数的原有类型规则。 */ character => '_' + character.charCodeAt(0).toString(16))
const semanticType = /** 展开 Result 成功类型并映射为编辑器语义类型；未知类型保留 opaque 标记。 */ value => {
  let type = canonicalType(value || '()')
  if (type.startsWith('Result<')) { let depth = 0, end = 7; for (; end < type.length; end++) { if (type[end] === '<') depth++; else if (type[end] === '>') depth--; else if (type[end] === ',' && depth === 0) break }; type = type.slice(7, end) }
  if (type === '()') return 'unit'
  if (type === 'i64' || type === 'INT') return 'int'
  if (type === 'f64' || type === 'FLOAT') return 'float'
  if (['bool', 'char', 'string', 'map', 'array'].includes(type)) return type
  if (type === 'Dynamic') return 'dynamic'
  if (type.endsWith('FnPtr')) return 'fn'
  if (type.includes('Range')) return 'range'
  if (type.includes('Instant')) return 'timestamp'
  if (type === 'Blob' || type === 'Vec<u8>') return 'blob'
  return 'opaque'
}
const editorDefault = /** 为可安全构造的类型提供 Rhai 默认字面量，句柄和宿主映射等需要真实生产节点时返回空。 */ (type, rustType, origin) => {
  // Opaque Rust numeric widths and handles need an actual value-producing node.
  if (type === 'opaque' || type === 'timestamp' || type === 'fn' || type === 'blob' || type === 'map' && origin === 'host') return null
  if (type === 'range') return /RangeInclusive<(?:i64|INT)>/.test(rustType) ? '0..=0' : /Range<(?:i64|INT)>/.test(rustType) ? '0..0' : null
  return { int: '0', float: '0.0', bool: 'false', string: '""', char: "' '", dynamic: '()', unit: '()', array: '[]', map: '#{}', range: '0..0' }[type] ?? null
}
const rustToMetadataType = /* 调用 canonicalType(({ FLOAT: 'f64', INT: 'i64', '&str': 'string' })[type] ?? type) 并返回调用结果。 */ type => canonicalType(({ FLOAT: 'f64', INT: 'i64', '&str': 'string' })[type] ?? type)

/** 跳过 Rust 空白、行注释和可嵌套块注释，返回原文偏移；不删除字符，因此来源行号不漂移。 */
function skipRustTrivia(source, offset) {
  while(offset<source.length){
    if(/\s/.test(source[offset])){offset++;continue}
    if(source.startsWith('//',offset)){const end=source.indexOf('\n',offset+2);offset=end<0?source.length:end+1;continue}
    if(source.startsWith('/*',offset)){
      let depth=1;offset+=2
      while(offset<source.length&&depth){
        if(source.startsWith('/*',offset)){depth++;offset+=2}
        else if(source.startsWith('*/',offset)){depth--;offset+=2}
        else offset++
      }
      if(depth)throw new Error('Unterminated Rust registration comment.')
      continue
    }
    break
  }
  return offset
}
/** 闭包参数名取自 Rust 注册处，返回类型取自编译器元数据；允许闭包前有注释，不根据英文函数名猜测类型。 */
export function registeredHostDeclarations(source) {
  const result = []
  for (const match of source.matchAll(/engine\.register_fn\(\s*(?:"([^"]+)"|([A-Za-z_]\w*))\s*,/g)) {
    let start=skipRustTrivia(source,match.index+match[0].length)
    if(/^move\b/.test(source.slice(start)))start=skipRustTrivia(source,start+4)
    if(source[start]!=='|')continue
    const end=source.indexOf('|',start+1)
    if(end<0)throw new Error('Unterminated Rust registration closure parameters.')
    let names = match[1] ? [match[1]] : []
    if (!names.length) {
      const prefix = source.slice(0, match.index), variable = match[2], pattern = new RegExp('for\\s*\\(\\s*' + variable + '\\s*,[^)]*\\)\\s*in\\s*\\[([\\s\\S]*?)\\]\\s*\\{', 'g')
      const loop = [...prefix.matchAll(pattern)].at(-1)
      if (!loop) throw new Error('Unresolved registered callable variable: ' + variable)
      names = [...loop[1].matchAll(/\(\s*"([^"]+)"\s*,/g)].map(/* 返回 item[1] 的当前值。 */ item => item[1])
    }
    const parameters = source.slice(start+1,end).split(',').map(/* 调用 value.trim() 并返回调用结果。 */ value => value.trim()).filter(Boolean).map(/** 解析显式 Rust 闭包参数的名称和类型；不能识别时拒绝生成。 */ value => {
      const parsed = /^(\w+)\s*:\s*(.+)$/.exec(value)
      if (!parsed) throw new Error('Unrecognized explicit Rust closure parameter: ' + value)
      return { name: parsed[1], rustType: parsed[2].trim() }
    })
    for (const name of names) result.push({ name, parameters, line: source.slice(0, match.index).split('\n').length })
  }
  return result
}

/** 匹配宿主声明并合并原生/WASM 重载，补充语言内建和生命周期契约，再生成来源及清单覆盖统计。 */ export function createApiInventory({ rhaiVersion, sourceHash, source, manifest, native, wasm, packageFiles }) {
  const declarations = registeredHostDeclarations(source), disabled = [...source.matchAll(/engine\.disable_symbol\("([^"]+)"\)/g)].map(/* 返回 match[1] 的当前值。 */ match => match[1])
  const hostKeys = new Set([...native.host.functions, ...wasm.host.functions].map(functionKey))
  const values = new Map(), packageByKey = new Map()
  for (const profile of [wasm, native]) for (const [name, metadata] of Object.entries(profile.packages)) for (const item of metadata.functions ?? []) if (!packageByKey.has(functionKey(item))) packageByKey.set(functionKey(item), name)
  for (const [profile, metadata] of [['native', native], ['wasm', wasm]]) {
    // Host overloads win dispatch over standard-package overloads.
    const host = new Map(metadata.host.functions.map(/* 返回按声明顺序构造的数组 [functionKey(item), item]。 */ item => [functionKey(item), item]))
    const all = new Map((metadata.all.functions ?? []).map(/* 返回按声明顺序构造的数组 [functionKey(item), item]。 */ item => [functionKey(item), item])); for (const [key, item] of host) all.set(key, item)
    for (const [key, item] of all) {
      const origin = hostKeys.has(key) ? 'host' : 'standard-package', declaration = origin === 'host' ? declarations.find(/** 按名称、参数数量和规范化类型匹配真实宿主注册声明。 */ value => value.name === item.name && value.parameters.length === item.numParams && value.parameters.every(/* 比较 rustToMetadataType(parameter.rustType) 与 canonicalType(item.params[index].type)，返回严格相等的判断结果。 */ (parameter, index) => rustToMetadataType(parameter.rustType) === canonicalType(item.params[index].type))) : null
      if (origin === 'host' && !declaration) throw new Error('Compiler host signature has no matching Rust declaration: ' + item.signature)
      const packageName = origin === 'host' ? null : packageByKey.get(key) ?? 'StandardPackage'
      const signature = {
        id: `rhai:${digestKey(key)}`, name: item.name, parameters: (item.params ?? []).map(/** 保留真实参数名和 Rust 类型，推导语义类型、默认字面量及可变借用标记。 */ (parameter, index) => {
          const rustType = declaration?.parameters[index].rustType ?? parameter.type ?? 'Dynamic', type = semanticType(parameter.type ?? 'Dynamic')
          return { name: declaration?.parameters[index].name ?? parameter.name ?? `argument_${index + 1}`, type, rustType, defaultLiteral: editorDefault(type, rustType, origin), optional: false, mutable: /^&mut\s/.test(rustType) }
        }),
        returnType: ['print', 'debug'].includes(item.name) ? 'unit' : semanticType(item.returnType), rustReturnType: item.returnType ?? '()',
        role: 'callable', origin, package: packageName, source: { path: origin === 'host' ? 'crates/nova_script/src/lib.rs' : `rhai-${rhaiVersion}/src/packages/${packageFiles[packageName] ?? 'pkg_std'}.rs`, line: declaration?.line ?? 1 },
        available: !disabled.includes(item.name), internal: item.name.startsWith('__') || /^get\$|^set\$|^index\$/.test(item.name), operator: !/^[A-Za-z_]\w*$/.test(item.name), variadic: false,
        throws: /^Result</.test(item.returnType ?? ''), profiles: [profile], documentation: origin === 'host' ? '' : (item.docComments ?? []).map(/* 调用 value.replace(/^\/\/\/?\s?/gm, '') 并返回调用结果。 */ value => value.replace(/^\/\/\/?\s?/gm, '')).join('\n').split(/\n\s*\n/)[0],
      }
      const old = values.get(key)
      if (old) { old.profiles.push(profile); if (old.rustReturnType !== signature.rustReturnType) throw new Error('Native/WASM return signature differs: ' + key) } else values.set(key, signature)
    }
  }
  // These calls are parsed/intercepted by Rhai, so registration metadata alone
  // cannot describe their actual script-facing call/return contract.
  const intrinsic = [
    ['Fn', [['name', 'string']], 'fn', false], ['type_of', [['value', 'dynamic']], 'string', false],
    ['is_def_var', [['name', 'string']], 'bool', false], ['is_def_fn', [['name', 'string'], ['arity', 'int']], 'bool', false],
    ['is_shared', [['value', 'dynamic']], 'bool', false], ['call', [['function', 'fn'], ['argument', 'dynamic']], 'dynamic', true], ['curry', [['function', 'fn'], ['argument', 'dynamic']], 'fn', true],
  ]
  for (const [name, parameters, returnType, variadic] of intrinsic) values.set('intrinsic:' + name, { id: 'rhai:intrinsic:' + name, name, parameters: parameters.map(/** 转换语言内建参数，只有可变参数部分标为可选。 */ ([name, type], index) => ({ name, type, rustType: type, defaultLiteral: editorDefault(type, type, 'intrinsic'), optional: variadic && index > 0, mutable: false })), returnType, rustReturnType: 'language intrinsic', role: 'callable', origin: 'intrinsic', package: null, source: { path: `rhai-${rhaiVersion}/src/parser.rs`, line: 1 }, available: !disabled.includes(name), internal: false, operator: false, variadic, throws: true, profiles: ['native', 'wasm'], documentation: 'Language intrinsic. call/curry accept zero or more additional dynamic arguments; the function pointer must come from Fn or a closure.' })
  const callbacks = [...manifest.matchAll(/\['([^']+)',\s*'fn\s+\w+\(([^)]*)\)'/g)]
  for (const [, name, params] of callbacks) {
    const names = params.split(',').map(/* 调用 value.trim() 并返回调用结果。 */ value => value.trim()).filter(Boolean)
    const rustTypes = ['update', 'late_update', 'fixed_update'].includes(name) ? ['f64'] : name === 'on_signal' ? ['String', 'Dynamic', 'String'] : /^on_(collision|trigger)_/.test(name) ? ['String', 'f64', 'f64', 'f64', 'f64', 'f64', 'f64'] : names.length ? ['String'] : []
    if (names.length !== rustTypes.length) throw new Error('Lifecycle argument contract changed: ' + name)
    values.set('lifecycle:' + name, { id: 'rhai:lifecycle:' + name, name, parameters: names.map(/** 为宿主分发的生命周期参数记录类型，禁止生成调用默认值。 */ (name, index) => ({ name, type: semanticType(rustTypes[index]), rustType: rustTypes[index], defaultLiteral: null, optional: false, mutable: false })), returnType: 'unit', rustReturnType: 'Dynamic (host discards callback result)', role: 'lifecycle', origin: 'host', package: null, source: { path: 'crates/nova_script/src/lib.rs', line: source.slice(0, source.indexOf('fn call_lifecycle(')).split('\n').length }, available: true, internal: false, operator: false, variadic: false, throws: true, profiles: ['native', 'wasm'], documentation: 'A host-dispatched script callback. Parameters are supplied by the host; this is a function declaration, not a registered host call.' })
  }
  const signatures = [...values.values()].sort(/* 先计算 a.name.localeCompare(b.name, 'en')；仅当其为假值时求右侧 a.id.localeCompare(b.id, 'en')，返回短路求值结果。 */ (a, b) => a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id, 'en'))
  const declaredNames = new Set([...manifest.matchAll(/\['([^']+)',\s*'/g)].map(/* 返回 match[1] 的当前值。 */ match => match[1]))
  return { format: 'nova-rhai-api-signatures', version: 1, rhaiVersion, sourceHash, productionFeatures: ['std'], introspectionFeatures: ['std', 'metadata'], disabled, signatures, packages: Object.entries(packageFiles).map(/** 统计各标准包的重载数量并关联对应版本源码路径。 */ ([name, file]) => ({ name, source: `rhai-${rhaiVersion}/src/packages/${file}.rs`, overloads: signatures.filter(/* 比较 item.package 与 name，返回严格相等的判断结果。 */ item => item.package === name).length })), manifest: { names: [...declaredNames].sort(), missingHostNames: [...new Set(signatures.filter(/* 先计算 item.origin === 'host' && item.role === 'callable' && item.available && !item.internal；仅当其为真值时求右侧 !declaredNames.has(item.name)，返回短路求值结果。 */ item => item.origin === 'host' && item.role === 'callable' && item.available && !item.internal && !declaredNames.has(item.name)).map(/* 返回 item.name 的当前值。 */ item => item.name))].sort(), unregisteredNames: [...declaredNames].filter(/* 返回 signatures.some(item => item.name === name) 的逻辑取反结果。 */ name => !signatures.some(/* 比较 item.name 与 name，返回严格相等的判断结果。 */ item => item.name === name)).sort() } }
}
