const canonicalType = value => value.replace(/\s+/g, '').replace(/^&(?:mut)?/, '').replace(/(?:types::dynamic::)?Dynamic/g, 'Dynamic').replace(/ImmutableString|String|&str/g, 'string').replace(/^str$/, 'string').replace(/^Map$/, 'map').replace(/^Array$/, 'array')
const functionKey = item => item.name + '(' + (item.params ?? []).map(parameter => canonicalType(parameter.type ?? 'Dynamic')).join(',') + ')'
const digestKey = value => value.replace(/[^A-Za-z0-9_.-]/g, character => '_' + character.charCodeAt(0).toString(16))
const semanticType = value => {
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
const editorDefault = (type, rustType, origin) => {
  // Opaque Rust numeric widths and handles need an actual value-producing node.
  if (type === 'opaque' || type === 'timestamp' || type === 'fn' || type === 'blob' || type === 'map' && origin === 'host') return null
  if (type === 'range') return /RangeInclusive<(?:i64|INT)>/.test(rustType) ? '0..=0' : /Range<(?:i64|INT)>/.test(rustType) ? '0..0' : null
  return { int: '0', float: '0.0', bool: 'false', string: '""', char: "' '", dynamic: '()', unit: '()', array: '[]', map: '#{}', range: '0..0' }[type] ?? null
}
const rustToMetadataType = type => canonicalType(({ FLOAT: 'f64', INT: 'i64', '&str': 'string' })[type] ?? type)

/** Closure parameter names come from Rust source; inferred returns come from the
 * compiler metadata. No callable's type is inferred from its English name. */
export function registeredHostDeclarations(source) {
  const result = []
  for (const match of source.matchAll(/engine\.register_fn\(\s*(?:"([^"]+)"|([A-Za-z_]\w*))\s*,\s*(?:move\s*)?\|([^|]*)\|/g)) {
    let names = match[1] ? [match[1]] : []
    if (!names.length) {
      const prefix = source.slice(0, match.index), variable = match[2], pattern = new RegExp('for\\s*\\(\\s*' + variable + '\\s*,[^)]*\\)\\s*in\\s*\\[([\\s\\S]*?)\\]\\s*\\{', 'g')
      const loop = [...prefix.matchAll(pattern)].at(-1)
      if (!loop) throw new Error('Unresolved registered callable variable: ' + variable)
      names = [...loop[1].matchAll(/\(\s*"([^"]+)"\s*,/g)].map(item => item[1])
    }
    const parameters = match[3].split(',').map(value => value.trim()).filter(Boolean).map(value => {
      const parsed = /^(\w+)\s*:\s*(.+)$/.exec(value)
      if (!parsed) throw new Error('Unrecognized explicit Rust closure parameter: ' + value)
      return { name: parsed[1], rustType: parsed[2].trim() }
    })
    for (const name of names) result.push({ name, parameters, line: source.slice(0, match.index).split('\n').length })
  }
  return result
}

export function createApiInventory({ rhaiVersion, sourceHash, source, manifest, native, wasm, packageFiles }) {
  const declarations = registeredHostDeclarations(source), disabled = [...source.matchAll(/engine\.disable_symbol\("([^"]+)"\)/g)].map(match => match[1])
  const hostKeys = new Set([...native.host.functions, ...wasm.host.functions].map(functionKey))
  const values = new Map(), packageByKey = new Map()
  for (const profile of [wasm, native]) for (const [name, metadata] of Object.entries(profile.packages)) for (const item of metadata.functions ?? []) if (!packageByKey.has(functionKey(item))) packageByKey.set(functionKey(item), name)
  for (const [profile, metadata] of [['native', native], ['wasm', wasm]]) {
    // Host overloads win dispatch over standard-package overloads.
    const host = new Map(metadata.host.functions.map(item => [functionKey(item), item]))
    const all = new Map((metadata.all.functions ?? []).map(item => [functionKey(item), item])); for (const [key, item] of host) all.set(key, item)
    for (const [key, item] of all) {
      const origin = hostKeys.has(key) ? 'host' : 'standard-package', declaration = origin === 'host' ? declarations.find(value => value.name === item.name && value.parameters.length === item.numParams && value.parameters.every((parameter, index) => rustToMetadataType(parameter.rustType) === canonicalType(item.params[index].type))) : null
      if (origin === 'host' && !declaration) throw new Error('Compiler host signature has no matching Rust declaration: ' + item.signature)
      const packageName = origin === 'host' ? null : packageByKey.get(key) ?? 'StandardPackage'
      const signature = {
        id: `rhai:${digestKey(key)}`, name: item.name, parameters: (item.params ?? []).map((parameter, index) => {
          const rustType = declaration?.parameters[index].rustType ?? parameter.type ?? 'Dynamic', type = semanticType(parameter.type ?? 'Dynamic')
          return { name: declaration?.parameters[index].name ?? parameter.name ?? `argument_${index + 1}`, type, rustType, defaultLiteral: editorDefault(type, rustType, origin), optional: false, mutable: /^&mut\s/.test(rustType) }
        }),
        returnType: ['print', 'debug'].includes(item.name) ? 'unit' : semanticType(item.returnType), rustReturnType: item.returnType ?? '()',
        role: 'callable', origin, package: packageName, source: { path: origin === 'host' ? 'crates/nova_script/src/lib.rs' : `rhai-${rhaiVersion}/src/packages/${packageFiles[packageName] ?? 'pkg_std'}.rs`, line: declaration?.line ?? 1 },
        available: !disabled.includes(item.name), internal: item.name.startsWith('__') || /^get\$|^set\$|^index\$/.test(item.name), operator: !/^[A-Za-z_]\w*$/.test(item.name), variadic: false,
        throws: /^Result</.test(item.returnType ?? ''), profiles: [profile], documentation: origin === 'host' ? '' : (item.docComments ?? []).map(value => value.replace(/^\/\/\/?\s?/gm, '')).join('\n').split(/\n\s*\n/)[0],
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
  for (const [name, parameters, returnType, variadic] of intrinsic) values.set('intrinsic:' + name, { id: 'rhai:intrinsic:' + name, name, parameters: parameters.map(([name, type], index) => ({ name, type, rustType: type, defaultLiteral: editorDefault(type, type, 'intrinsic'), optional: variadic && index > 0, mutable: false })), returnType, rustReturnType: 'language intrinsic', role: 'callable', origin: 'intrinsic', package: null, source: { path: `rhai-${rhaiVersion}/src/parser.rs`, line: 1 }, available: !disabled.includes(name), internal: false, operator: false, variadic, throws: true, profiles: ['native', 'wasm'], documentation: 'Language intrinsic. call/curry accept zero or more additional dynamic arguments; the function pointer must come from Fn or a closure.' })
  const callbacks = [...manifest.matchAll(/\['([^']+)',\s*'fn\s+\w+\(([^)]*)\)'/g)]
  for (const [, name, params] of callbacks) {
    const names = params.split(',').map(value => value.trim()).filter(Boolean)
    const rustTypes = ['update', 'late_update', 'fixed_update'].includes(name) ? ['f64'] : name === 'on_signal' ? ['String', 'Dynamic', 'String'] : /^on_(collision|trigger)_/.test(name) ? ['String', 'f64', 'f64', 'f64', 'f64', 'f64', 'f64'] : names.length ? ['String'] : []
    if (names.length !== rustTypes.length) throw new Error('Lifecycle argument contract changed: ' + name)
    values.set('lifecycle:' + name, { id: 'rhai:lifecycle:' + name, name, parameters: names.map((name, index) => ({ name, type: semanticType(rustTypes[index]), rustType: rustTypes[index], defaultLiteral: null, optional: false, mutable: false })), returnType: 'unit', rustReturnType: 'Dynamic (host discards callback result)', role: 'lifecycle', origin: 'host', package: null, source: { path: 'crates/nova_script/src/lib.rs', line: source.slice(0, source.indexOf('fn call_lifecycle(')).split('\n').length }, available: true, internal: false, operator: false, variadic: false, throws: true, profiles: ['native', 'wasm'], documentation: 'A host-dispatched script callback. Parameters are supplied by the host; this is a function declaration, not a registered host call.' })
  }
  const signatures = [...values.values()].sort((a, b) => a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id, 'en'))
  const declaredNames = new Set([...manifest.matchAll(/\['([^']+)',\s*'/g)].map(match => match[1]))
  return { format: 'nova-rhai-api-signatures', version: 1, rhaiVersion, sourceHash, productionFeatures: ['std'], introspectionFeatures: ['std', 'metadata'], disabled, signatures, packages: Object.entries(packageFiles).map(([name, file]) => ({ name, source: `rhai-${rhaiVersion}/src/packages/${file}.rs`, overloads: signatures.filter(item => item.package === name).length })), manifest: { names: [...declaredNames].sort(), missingHostNames: [...new Set(signatures.filter(item => item.origin === 'host' && item.role === 'callable' && item.available && !item.internal && !declaredNames.has(item.name)).map(item => item.name))].sort(), unregisteredNames: [...declaredNames].filter(name => !signatures.some(item => item.name === name)).sort() } }
}
