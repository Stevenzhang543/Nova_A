/** Nova_A language IR 1. Spans are UTF-16, half-open; lines/columns are 1-based. */
export interface RhaiSpan { start: number; end: number; line: number; column: number; endLine: number; endColumn: number }
export interface RhaiDiagnostic { code: string; severity: 'error' | 'warning' | 'info'; message: string; span: RhaiSpan; nodeId?: string; related?: Array<{ message: string; span: RhaiSpan }> }
export type RhaiTokenKind = 'identifier' | 'keyword' | 'number' | 'string' | 'character' | 'operator' | 'punctuation' | 'whitespace' | 'lineComment' | 'blockComment' | 'templateStart' | 'templateText' | 'templateEnd' | 'interpolationStart' | 'interpolationEnd' | 'invalid' | 'eof'
export interface RhaiToken { kind: RhaiTokenKind; text: string; span: RhaiSpan }
export interface RhaiNodeBase { id: string; kind: string; span: RhaiSpan; scopeId: string }
export interface RhaiIdentifier extends RhaiNodeBase { kind: 'Identifier'; name: string; bindingId: string | null }
export interface RhaiLiteral extends RhaiNodeBase { kind: 'Literal'; literalKind: 'integer' | 'float' | 'string' | 'character' | 'boolean' | 'unit'; raw: string }
export interface RhaiArray extends RhaiNodeBase { kind: 'Array'; elements: RhaiExpression[] }
export interface RhaiMapEntry extends RhaiNodeBase { kind: 'MapEntry'; key: string; keySpan: RhaiSpan; quoted: boolean; value: RhaiExpression }
export interface RhaiMap extends RhaiNodeBase { kind: 'Map'; entries: RhaiMapEntry[] }
export interface RhaiUnary extends RhaiNodeBase { kind: 'Unary'; operator: string; operand: RhaiExpression }
export interface RhaiBinary extends RhaiNodeBase { kind: 'Binary'; operator: string; left: RhaiExpression; right: RhaiExpression; shortCircuit: boolean }
export interface RhaiAssignment extends RhaiNodeBase { kind: 'Assignment'; operator: string; target: RhaiExpression; value: RhaiExpression }
export interface RhaiCall extends RhaiNodeBase { kind: 'Call'; callee: RhaiExpression; arguments: RhaiExpression[]; optional: boolean }
export interface RhaiMember extends RhaiNodeBase { kind: 'Member'; object: RhaiExpression; property: string; propertySpan: RhaiSpan; optional: boolean; namespace: boolean }
export interface RhaiIndex extends RhaiNodeBase { kind: 'Index'; object: RhaiExpression; index: RhaiExpression; optional: boolean }
export interface RhaiParameter extends RhaiNodeBase { kind: 'Parameter'; name: string; bindingId: string | null }
export interface RhaiClosure extends RhaiNodeBase { kind: 'Closure'; parameters: RhaiParameter[]; body: RhaiExpression; captureBindingIds: string[] }
export interface RhaiTemplateText extends RhaiNodeBase { kind: 'TemplateText'; raw: string }
export interface RhaiInterpolatedString extends RhaiNodeBase { kind: 'InterpolatedString'; parts: Array<RhaiTemplateText | RhaiExpression> }
export interface RhaiBlock extends RhaiNodeBase { kind: 'Block'; body: RhaiStatement[] }
export interface RhaiIf extends RhaiNodeBase { kind: 'If'; condition: RhaiExpression; consequent: RhaiBlock; alternate: RhaiBlock | RhaiIf | null }
export interface RhaiSwitchCase extends RhaiNodeBase { kind: 'SwitchCase'; patterns: RhaiExpression[]; guard: RhaiExpression | null; body: RhaiStatement; isDefault: boolean }
export interface RhaiSwitch extends RhaiNodeBase { kind: 'Switch'; value: RhaiExpression; cases: RhaiSwitchCase[] }
export interface RhaiFor extends RhaiNodeBase { kind: 'For'; variable: RhaiParameter; counter: RhaiParameter | null; iterable: RhaiExpression; body: RhaiBlock }
export interface RhaiWhile extends RhaiNodeBase { kind: 'While'; condition: RhaiExpression; body: RhaiBlock }
export interface RhaiLoop extends RhaiNodeBase { kind: 'Loop'; body: RhaiBlock }
export interface RhaiDoWhile extends RhaiNodeBase { kind: 'DoWhile'; body: RhaiBlock; condition: RhaiExpression; until: boolean }
export interface RhaiTry extends RhaiNodeBase { kind: 'Try'; body: RhaiBlock; parameter: RhaiParameter | null; handler: RhaiBlock }
export interface RhaiInvalid extends RhaiNodeBase { kind: 'Invalid'; raw: string; reason: string }
export type RhaiExpression = RhaiIdentifier | RhaiLiteral | RhaiArray | RhaiMap | RhaiUnary | RhaiBinary | RhaiAssignment | RhaiCall | RhaiMember | RhaiIndex | RhaiClosure | RhaiInterpolatedString | RhaiBlock | RhaiIf | RhaiSwitch | RhaiFor | RhaiWhile | RhaiLoop | RhaiDoWhile | RhaiTry | RhaiInvalid
export interface RhaiExportMetadata extends RhaiNodeBase { kind: 'ExportMetadata'; name: string; value: RhaiExpression }
export interface RhaiVariableDeclaration extends RhaiNodeBase { kind: 'VariableDeclaration'; name: string; nameSpan: RhaiSpan; declarationKind: 'let' | 'const'; initializer: RhaiExpression | null; bindingId: string | null; exported: boolean; metadata: RhaiExportMetadata[]; terminated: boolean }
export interface RhaiFunctionDeclaration extends RhaiNodeBase { kind: 'FunctionDeclaration'; name: string; nameSpan: RhaiSpan; receiver: RhaiIdentifier | RhaiLiteral | null; parameters: RhaiParameter[]; body: RhaiBlock; private: boolean; bindingId: string | null }
export interface RhaiExpressionStatement extends RhaiNodeBase { kind: 'ExpressionStatement'; expression: RhaiExpression; terminated: boolean }
export interface RhaiReturn extends RhaiNodeBase { kind: 'Return'; value: RhaiExpression | null; terminated: boolean }
export interface RhaiBreak extends RhaiNodeBase { kind: 'Break'; value: RhaiExpression | null; terminated: boolean }
export interface RhaiContinue extends RhaiNodeBase { kind: 'Continue'; terminated: boolean }
export interface RhaiThrow extends RhaiNodeBase { kind: 'Throw'; value: RhaiExpression | null; terminated: boolean }
export interface RhaiModuleDeclaration extends RhaiNodeBase { kind: 'ModuleDeclaration'; keyword: 'import' | 'use'; path: RhaiExpression; alias: RhaiParameter | null; terminated: boolean }
export interface RhaiExportDeclaration extends RhaiNodeBase { kind: 'ExportDeclaration'; name: string; nameSpan: RhaiSpan; alias: string | null; declaration: RhaiVariableDeclaration | null; bindingId: string | null; terminated: boolean }
export interface RhaiEmpty extends RhaiNodeBase { kind: 'Empty' }
export type RhaiStatement = RhaiVariableDeclaration | RhaiFunctionDeclaration | RhaiExpressionStatement | RhaiBlock | RhaiIf | RhaiSwitch | RhaiFor | RhaiWhile | RhaiLoop | RhaiDoWhile | RhaiTry | RhaiReturn | RhaiBreak | RhaiContinue | RhaiThrow | RhaiModuleDeclaration | RhaiExportDeclaration | RhaiEmpty | RhaiInvalid
export type RhaiNode = RhaiStatement | RhaiExpression | RhaiMapEntry | RhaiParameter | RhaiTemplateText | RhaiExportMetadata | RhaiSwitchCase
export interface RhaiScope { id: string; kind: 'module' | 'function' | 'block' | 'loop' | 'catch' | 'closure'; parentId: string | null; span: RhaiSpan; nodeId: string | null; bindingIds: string[] }
export interface RhaiBinding { id: string; name: string; kind: 'function' | 'global' | 'local' | 'parameter' | 'loop' | 'catch' | 'module'; scopeId: string; declarationNodeId: string; span: RhaiSpan; mutable: boolean; arity?: number; receiverType?: string; captured: boolean }
export interface RhaiReference { nodeId: string; name: string; span: RhaiSpan; scopeId: string; bindingId: string | null; access: 'read' | 'write' | 'readWrite' | 'call'; captured: boolean }
export interface RhaiLimits { maxSourceLength: number; maxTokens: number; maxNodes: number; maxDepth: number; maxDiagnostics: number; maxCommentDepth: number }
export interface RhaiParseOptions { limits?: Partial<RhaiLimits>; sandbox?: boolean; moduleMode?: 'sandbox' | 'host'; signal?: AbortSignal; previous?: RhaiProgram; knownGlobals?: readonly string[]; knownFunctions?: readonly string[]; reportUnresolved?: boolean }
export interface RhaiProgram { format: 'nova-rhai-ir'; version: 1; source: string; tokens: RhaiToken[]; body: RhaiStatement[]; scopes: RhaiScope[]; bindings: RhaiBinding[]; references: RhaiReference[]; diagnostics: RhaiDiagnostic[]; valid: boolean; limits: RhaiLimits; sourceHash: string }
export interface RhaiSourceEdit { start: number; end: number; text: string; expected?: string }
