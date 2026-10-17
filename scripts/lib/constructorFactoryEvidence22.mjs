/** 操作审计证据辅助库，保留证据来源与适用范围。 */
import ts from 'typescript'
/** Resolve only straight-line factories returning a directly constructed const.
 * Parameters shadow outer aliases. Branches, reassignment and computed returns
 * deliberately remain unresolved rather than receiving inferred evidence. */
/** 保守识别同步函数中直接构造并返回的实例引用，拒绝不确定控制流及身份写入。 */ export function constructorFactoryReference22(node, outerScope, resolveReference) {
 if (!ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) return null
 if (node.asteriskToken || node.modifiers?.some(/* 比较 mod.kind 与 ts.SyntaxKind.AsyncKeyword，返回严格相等的判断结果。 */ mod => mod.kind === ts.SyntaxKind.AsyncKeyword)) return null
 const scope = new Map(outerScope)
 const unbind = /** 递归解除参数绑定名称，防止遮蔽外层构造器引用。 */ name => { if (ts.isIdentifier(name)) scope.delete(name.text); else for (const part of name.elements ?? []) if (ts.isBindingElement(part)) unbind(part.name) }
 for (const parameter of node.parameters) unbind(parameter.name)
 if (ts.isNewExpression(node.body)) { const value = resolveReference(node.body.expression, scope); return value?.source && value.path ? value : null }
 if (!ts.isBlock(node.body)) return null
 const statements = node.body.statements, last = statements.at(-1)
 if (!last || !ts.isReturnStatement(last) || !last.expression || !ts.isIdentifier(last.expression)) return null
 const returned = last.expression.text
 let result = null
 for (const statement of statements.slice(0, -1)) {
  if (ts.isVariableStatement(statement)) {
   for (const declaration of statement.declarationList.declarations) {
    if (!ts.isIdentifier(declaration.name)) { unbind(declaration.name); continue }
    const key = declaration.name.text
    const value = declaration.initializer && ts.isNewExpression(declaration.initializer) ? resolveReference(declaration.initializer.expression, scope) : null
    scope.delete(key)
    if (key === returned) {
     if (!(statement.declarationList.flags & ts.NodeFlags.Const) || result || !value?.source || !value.path) return null
     result = value
    }
   }
  } else if (ts.isExpressionStatement(statement)) {
   let writesIdentity = false
   const scan = /** 递归检测赋值或自增减对标识符身份的修改。 */ child => {
    if (ts.isBinaryExpression(child) && child.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && child.operatorToken.kind <= ts.SyntaxKind.LastAssignment && ts.isIdentifier(child.left)) writesIdentity = true
    if ((ts.isPrefixUnaryExpression(child) || ts.isPostfixUnaryExpression(child)) && ts.isIdentifier(child.operand) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(child.operator)) writesIdentity = true
    ts.forEachChild(child, scan)
   }
   scan(statement)
   if (writesIdentity) return null
  } else return null
 }
 return result
}
