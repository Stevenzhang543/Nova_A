import { emitRhai, parseRhai, walkRhai, type RhaiNode } from './rhaiSyntax'
import { decodeRhaiString } from './rhaiSyntaxLexer'
export interface RhaiRenameSelection { offset?: number; bindingId?: string; externalSources?: readonly string[] }
const uncertainFunctionReference = (node: RhaiNode, name: string): boolean => {
  if (node.kind === 'Member') return node.property === name
  if (node.kind !== 'Call' || node.callee.kind !== 'Identifier' || node.callee.name !== 'Fn') return false
  const target = node.arguments[0]
  if (target?.kind !== 'Literal' || target.literalKind !== 'string') return true
  try { return decodeRhaiString(target.raw) === name } catch { return true }
}
/** Patches one lexical identity; an ambiguous name is never a workspace-wide regex. */
export function renameRhaiBinding(source: string, name: string, replacement: string, selection: RhaiRenameSelection = {}): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(replacement)) throw new Error('Replacement is not a valid Rhai identifier')
  const program = parseRhai(source, { moduleMode: 'host' })
  if (!program.valid) throw new Error('Fix syntax errors before renaming a binding.')
  const candidates = program.bindings.filter(binding => binding.name === name)
  const selectedOffset = selection.offset === undefined ? undefined : selection.offset > 0 && !/[A-Za-z0-9_]/.test(source[selection.offset] ?? '') && /[A-Za-z0-9_]/.test(source[selection.offset - 1]) ? selection.offset - 1 : selection.offset
  const pointed = selectedOffset === undefined ? null : program.references.find(reference => reference.span.start <= selectedOffset && selectedOffset < reference.span.end)?.bindingId ?? candidates.find(binding => binding.span.start <= selectedOffset && selectedOffset < binding.span.end)?.id
  const selectedId = selection.bindingId ?? pointed
  const binding = selectedId ? candidates.find(candidate => candidate.id === selectedId) : selection.offset === undefined && selection.bindingId === undefined && candidates.length === 1 ? candidates[0] : null
  if (!binding) throw new Error(candidates.length > 1 ? 'This name has multiple bindings; select its declaration or reference before renaming.' : 'No unambiguous local binding was found for this rename.')
  const nodes = [...walkRhai(program)]
  if (nodes.some(node => node.kind === 'VariableDeclaration' && node.bindingId === binding.id && node.exported)) throw new Error('Exported properties require a project-property migration before renaming.')
  if (binding.receiverType !== undefined || binding.kind === 'function' && nodes.some(node => uncertainFunctionReference(node, name))) throw new Error('Method or function-pointer references need an explicit semantic rename; this operation would be incomplete.')
  if (nodes.some(node => node.kind === 'ExportDeclaration' && node.bindingId === binding.id)) throw new Error('Native module export aliases need an explicit module rename; this operation would be incomplete.')
  if (binding.scopeId === 'scope:module' && selection.externalSources?.length) {
    if (selection.externalSources.length > 256 || selection.externalSources.reduce((total, text) => total + text.length, 0) > 16_000_000) throw new Error('This project exceeds the bounded cross-script rename analysis; use an explicit module migration.')
    for (const text of selection.externalSources) {
      const external = parseRhai(text, { moduleMode: 'host' })
      if (!external.valid) throw new Error('Fix syntax errors in other project scripts before renaming a shared module binding.')
      if (external.references.some(reference => reference.name === name && !reference.bindingId)) throw new Error('Another script references this shared binding; an explicit cross-module rename is required.')
      if (binding.kind === 'function' && [...walkRhai(external)].some(node => uncertainFunctionReference(node, name))) throw new Error('Another script may reference this function through a method or function pointer; an explicit cross-module rename is required.')
    }
  }
  if (replacement === name) return source
  const spans = [binding.span, ...program.references.filter(reference => reference.bindingId === binding.id).map(reference => reference.span)]
  const edits = [...new Map(spans.map(span => [span.start, { start: span.start, end: span.end, text: replacement, expected: name }])).values()]
  const result = emitRhai(program, edits), after = parseRhai(result, { moduleMode: 'host', previous: program })
  if (!after.valid) throw new Error('The replacement would create invalid syntax or duplicate declarations.')
  const afterReferences = new Map(after.references.map(reference => [reference.nodeId, reference]))
  if (program.references.some(reference => afterReferences.get(reference.nodeId)?.bindingId !== reference.bindingId)) throw new Error('The replacement would change another binding or capture a reference.')
  return result
}

