/** 基于词法绑定身份重命名 Rhai 标识符，阻止引用捕获和无法证明完整性的跨脚本改名。 */
import { emitRhai, parseRhai, walkRhai, type RhaiNode } from './rhaiSyntax'
import { decodeRhaiString } from './rhaiSyntaxLexer'
export interface RhaiRenameSelection { offset?: number; bindingId?: string; externalSources?: readonly string[] }
/** 检查成员引用或 Fn 动态目标是否可能引用待改名函数，无法静态解析时保守拒绝。 */ const uncertainFunctionReference = (node: RhaiNode, name: string): boolean => {
  if (node.kind === 'Member') return node.property === name
  if (node.kind !== 'Call' || node.callee.kind !== 'Identifier' || node.callee.name !== 'Fn') return false
  const target = node.arguments[0]
  if (target?.kind !== 'Literal' || target.literalKind !== 'string') return true
  try { return decodeRhaiString(target.raw) === name } catch { return true }
}
/** Patches one lexical identity; an ambiguous name is never a workspace-wide regex. */
/** 选中唯一绑定，检查导出与外部依赖，按精确源码区间替换，再验证全部引用仍指向原绑定。 */ export function renameRhaiBinding(source: string, name: string, replacement: string, selection: RhaiRenameSelection = {}): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(replacement)) throw new Error('Replacement is not a valid Rhai identifier')
  const program = parseRhai(source, { moduleMode: 'host' })
  if (!program.valid) throw new Error('Fix syntax errors before renaming a binding.')
  const candidates = program.bindings.filter(/** 收集同名声明；多个作用域中的同名变量仍保留独立身份。 */ binding => binding.name === name)
  const selectedOffset = selection.offset === undefined ? undefined : selection.offset > 0 && !/[A-Za-z0-9_]/.test(source[selection.offset] ?? '') && /[A-Za-z0-9_]/.test(source[selection.offset - 1]) ? selection.offset - 1 : selection.offset
  const pointed = selectedOffset === undefined ? null : program.references.find(/** 在光标所在源码区间定位引用绑定。 */ /** 提取绑定引用在原源码中的精确区间。 */ reference => reference.span.start <= selectedOffset && selectedOffset < reference.span.end)?.bindingId ?? candidates.find(/** 在光标所在声明区间定位绑定。 */ binding => binding.span.start <= selectedOffset && selectedOffset < binding.span.end)?.id
  const selectedId = selection.bindingId ?? pointed
  const binding = selectedId ? candidates.find(/** 按用户选择的绑定标识精确定位声明。 */ candidate => candidate.id === selectedId) : selection.offset === undefined && selection.bindingId === undefined && candidates.length === 1 ? candidates[0] : null
  if (!binding) throw new Error(candidates.length > 1 ? 'This name has multiple bindings; select its declaration or reference before renaming.' : 'No unambiguous local binding was found for this rename.')
  const nodes = [...walkRhai(program)]
  if (nodes.some(/** 识别已导出的属性声明，要求通过项目属性迁移处理。 */ node => node.kind === 'VariableDeclaration' && node.bindingId === binding.id && node.exported)) throw new Error('Exported properties require a project-property migration before renaming.')
  if (binding.receiverType !== undefined || binding.kind === 'function' && nodes.some(/** 识别方法或动态函数指针引用，防止只改部分调用点。 */ node => uncertainFunctionReference(node, name))) throw new Error('Method or function-pointer references need an explicit semantic rename; this operation would be incomplete.')
  if (nodes.some(/** 识别模块导出别名，要求显式模块迁移。 */ node => node.kind === 'ExportDeclaration' && node.bindingId === binding.id)) throw new Error('Native module export aliases need an explicit module rename; this operation would be incomplete.')
  if (binding.scopeId === 'scope:module' && selection.externalSources?.length) {
    if (selection.externalSources.length > 256 || selection.externalSources.reduce(/** 累计外部脚本字符数，限制跨脚本静态分析输入规模。 */ (total, text) => total + text.length, 0) > 16_000_000) throw new Error('This project exceeds the bounded cross-script rename analysis; use an explicit module migration.')
    for (const text of selection.externalSources) {
      const external = parseRhai(text, { moduleMode: 'host' })
      if (!external.valid) throw new Error('Fix syntax errors in other project scripts before renaming a shared module binding.')
      if (external.references.some(/** 检测其他脚本中可能解析为当前模块绑定的未绑定引用。 */ reference => reference.name === name && !reference.bindingId)) throw new Error('Another script references this shared binding; an explicit cross-module rename is required.')
      if (binding.kind === 'function' && [...walkRhai(external)].some(/** 识别方法或动态函数指针引用，防止只改部分调用点。 */ node => uncertainFunctionReference(node, name))) throw new Error('Another script may reference this function through a method or function pointer; an explicit cross-module rename is required.')
    }
  }
  if (replacement === name) return source
  const spans = [binding.span, ...program.references.filter(/** 仅选择指向目标绑定的引用，不改动被遮蔽的同名变量。 */ reference => reference.bindingId === binding.id).map(/** 提取绑定引用在原源码中的精确区间。 */ reference => reference.span)]
  const edits = [...new Map(spans.map(/** 按起点去重替换区间，并保留预期旧文本以检测失效编辑。 */ span => [span.start, { start: span.start, end: span.end, text: replacement, expected: name }])).values()]
  const result = emitRhai(program, edits), after = parseRhai(result, { moduleMode: 'host', previous: program })
  if (!after.valid) throw new Error('The replacement would create invalid syntax or duplicate declarations.')
  const afterReferences = new Map(after.references.map(/** 建立修改后引用身份索引，用于比较改名前后的绑定关系。 */ reference => [reference.nodeId, reference]))
  if (program.references.some(/** 任何既有引用发生捕获、丢失或绑定改变都使改名失败。 */ reference => afterReferences.get(reference.nodeId)?.bindingId !== reference.bindingId)) throw new Error('The replacement would change another binding or capture a reference.')
  return result
}

