/** 中文注释草稿工具：只根据语法树描述可直接观察的参数、调用与控制流，不推断业务保证。 */
import ts from 'typescript'
import { parse } from 'vue/compiler-sfc'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { releaseSourceInventory } from './release-source-snapshot.mjs'
const root=dirname(dirname(fileURLToPath(import.meta.url)))
const han=/[\u3400-\u9fff]/u
const simpleOnly=process.argv.includes('--simple-only')
/** 将源码片段压成有界单行，避免注释结束符或意外换行破坏代码。 */
function label(value, limit=100){return value.replace(/\s+/g,' ').replaceAll('*/','* /').slice(0,limit)}
/** 判断具有实现体的函数；接口签名不伪装成可执行函数。 */
function executable(node){return Boolean(node.body)&&(ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node)||ts.isArrowFunction(node)||ts.isMethodDeclaration(node)||ts.isConstructorDeclaration(node)||ts.isGetAccessor(node)||ts.isSetAccessor(node))}
/** 只描述可直接证明的短表达式回调；复杂控制流交给人工，不生成截断或猜测业务含义的说明。 */
function describeSimple(node,ast){
  if(!executable(node))return null
  let expression=node.body
  if(ts.isBlock(expression)){
    if(expression.statements.length!==1||!ts.isReturnStatement(expression.statements[0])||!expression.statements[0].expression)return null
    expression=expression.statements[0].expression
  }
  const text=expression.getText(ast)
  if(text.length>120||/[\r\n]/.test(text)||text.includes('*/'))return null
  if(ts.isPropertyAccessExpression(expression)||ts.isElementAccessExpression(expression)||ts.isIdentifier(expression))return `返回 ${text} 的当前值。`
  if(ts.isPrefixUnaryExpression(expression)&&expression.operator===ts.SyntaxKind.ExclamationToken)return `返回 ${expression.operand.getText(ast)} 的逻辑取反结果。`
  if(ts.isCallExpression(expression))return `调用 ${text} 并返回调用结果。`
  if(ts.isAwaitExpression(expression))return `等待 ${expression.expression.getText(ast)} 完成并返回其结果。`
  if(ts.isConditionalExpression(expression))return `根据 ${expression.condition.getText(ast)} 的真假，分别返回 ${expression.whenTrue.getText(ast)} 或 ${expression.whenFalse.getText(ast)}。`
  if(ts.isArrayLiteralExpression(expression))return `返回按声明顺序构造的数组 ${text}。`
  if(ts.isObjectLiteralExpression(expression))return `返回具有所列字段的新对象 ${text}。`
  if(ts.isStringLiteral(expression)||ts.isNumericLiteral(expression)||[ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword,ts.SyntaxKind.NullKeyword].includes(expression.kind))return `返回固定值 ${text}。`
  if(ts.isBinaryExpression(expression)){
    const relations=new Map([[ts.SyntaxKind.EqualsEqualsEqualsToken,'严格相等'],[ts.SyntaxKind.ExclamationEqualsEqualsToken,'严格不等'],[ts.SyntaxKind.LessThanToken,'小于'],[ts.SyntaxKind.LessThanEqualsToken,'小于或等于'],[ts.SyntaxKind.GreaterThanToken,'大于'],[ts.SyntaxKind.GreaterThanEqualsToken,'大于或等于']])
    const relation=relations.get(expression.operatorToken.kind)
    if(relation)return `比较 ${expression.left.getText(ast)} 与 ${expression.right.getText(ast)}，返回${relation}的判断结果。`
    if(expression.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken)return `先计算 ${expression.left.getText(ast)}；仅当其为真值时求右侧 ${expression.right.getText(ast)}，返回短路求值结果。`
    if(expression.operatorToken.kind===ts.SyntaxKind.BarBarToken)return `先计算 ${expression.left.getText(ast)}；仅当其为假值时求右侧 ${expression.right.getText(ast)}，返回短路求值结果。`
    if(expression.operatorToken.kind===ts.SyntaxKind.QuestionQuestionToken)return `当 ${expression.left.getText(ast)} 为 null 或 undefined 时返回 ${expression.right.getText(ast)}，否则保留左侧值。`
    if([ts.SyntaxKind.PlusToken,ts.SyntaxKind.MinusToken,ts.SyntaxKind.AsteriskToken,ts.SyntaxKind.SlashToken,ts.SyntaxKind.PercentToken,ts.SyntaxKind.AsteriskAsteriskToken].includes(expression.operatorToken.kind))return `计算表达式 ${text} 并返回结果，沿用操作数的原有类型规则。`

  }
  return null
}

/** 根据函数所属调用与实现体给出可核查的中文说明；嵌套函数另行说明。 */
function describe(node, ast){
  if(simpleOnly)return describeSimple(node,ast)
  const name=node.name?.getText(ast)??(ts.isVariableDeclaration(node.parent)?node.parent.name.getText(ast):'')
  const owner=ts.isCallExpression(node.parent)?label(node.parent.expression.getText(ast),70):''
  const params=node.parameters.map(/* 调用 label(parameter.name.getText(ast),40) 并返回调用结果。 */ parameter=>label(parameter.name.getText(ast),40)).join('、')
  const calls=new Set(), effects=new Set();let branches=0,loops=0,awaits=0,throws=0
  /** 收集当前函数直接实现的动作，避免把内部回调的副作用归给外层。 */
  function inspect(child){
    if(child!==node&&executable(child))return
    if(ts.isCallExpression(child))calls.add(label(child.expression.getText(ast),70))
    if(ts.isIfStatement(child)||ts.isConditionalExpression(child)||ts.isSwitchStatement(child))branches++
    if(ts.isForStatement(child)||ts.isForOfStatement(child)||ts.isForInStatement(child)||ts.isWhileStatement(child)||ts.isDoStatement(child))loops++
    if(ts.isAwaitExpression(child))awaits++
    if(ts.isThrowStatement(child))throws++
    if(ts.isBinaryExpression(child)&&child.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&child.operatorToken.kind<=ts.SyntaxKind.LastAssignment)effects.add(label(child.left.getText(ast),55))
    ts.forEachChild(child,inspect)
  }
  inspect(node.body)
  const action=name?`函数 ${label(name)}`:owner?`${owner} 的回调`:'匿名回调'
  const details=[`${action}；${params?'接收 '+params:'无显式参数'}`]
  if(calls.size)details.push('调用 '+[...calls].slice(0,4).join('、')+(calls.size>4?' 等':' '))
  if(effects.size)details.push('更新 '+[...effects].slice(0,3).join('、')+(effects.size>3?' 等':' '))
  if(branches)details.push('按条件选择处理路径')
  if(loops)details.push('逐项或循环处理')
  if(awaits)details.push('等待异步结果后继续')
  if(throws)details.push('不满足条件时抛出异常')
  if(!ts.isBlock(node.body))details.push('返回表达式 '+label(node.body.getText(ast),90))
  return '实现说明：'+details.join('；').trim()+'。'
}
/** 为单个脚本生成插入位置，并比较忽略注释后的完整语法树打印结果。 */
function annotate(source,path){
  const kind=path.endsWith('.ts')?ts.ScriptKind.TS:ts.ScriptKind.JS
  const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,kind), edits=[]
  /** 只在缺少紧邻中文说明时插入块注释，不删除或替换既有英文说明。 */
  function visit(node){
    if(executable(node)){
      const trivia=source.slice(node.getFullStart(),node.getStart(ast))
      if(!han.test(trivia)){const description=describe(node,ast);if(description)edits.push({at:node.getStart(ast),text:'/* '+description+' */ '})}
    }
    ts.forEachChild(node,visit)
  }
  visit(ast)
  let updated=source
  for(const edit of edits.sort(/* 计算表达式 b.at-a.at 并返回结果，沿用操作数的原有类型规则。 */ (a,b)=>b.at-a.at))updated=updated.slice(0,edit.at)+edit.text+updated.slice(edit.at)
  const printer=ts.createPrinter({removeComments:true})
  const next=ts.createSourceFile(path,updated,ts.ScriptTarget.Latest,true,kind)
  if(printer.printFile(ast)!==printer.printFile(next))throw Error('Comment-only AST mismatch: '+path)
  return {updated,functions:edits.length}
}
/** 默认仅在缓存目录预览；显式 --write 才写回审核过的指定文件。 */
async function main(){
  const chosen=process.argv.filter(/* 调用 arg.startsWith('--file=') 并返回调用结果。 */ arg=>arg.startsWith('--file=')).map(/* 调用 arg.slice(7) 并返回调用结果。 */ arg=>arg.slice(7))
  if(!chosen.length)throw Error('Specify reviewed files with --file=relative/path; bulk implicit mutation is disabled.')
  const inventory=await releaseSourceInventory(root), own=new Set(inventory.map(/* 返回 entry.path 的当前值。 */ entry=>entry.path)), results=[]
  for(const path of chosen){
    if(!own.has(path)||!['.ts','.js','.mjs','.vue'].includes(extname(path)))throw Error('Not an owned supported source: '+path)
    const source=await readFile(join(root,path),'utf8');let updated=source,functions=0
    if(path.endsWith('.vue')){
      const parsed=parse(source,{filename:path});if(parsed.errors.length)throw Error('Invalid SFC: '+path)
      for(const block of [parsed.descriptor.script,parsed.descriptor.scriptSetup].filter(Boolean).sort(/* 计算表达式 b.loc.start.offset-a.loc.start.offset 并返回结果，沿用操作数的原有类型规则。 */ (a,b)=>b.loc.start.offset-a.loc.start.offset)){
        const result=annotate(block.content,path+(block.lang==='ts'?'.ts':'.js'));functions+=result.functions
        updated=updated.slice(0,block.loc.start.offset)+result.updated+updated.slice(block.loc.end.offset)
      }
    }else{const result=annotate(source,path);updated=result.updated;functions=result.functions}
    const destination=process.argv.includes('--write')?join(root,path):join(root,'.cache/chinese-comment-preview',path)
    await mkdir(dirname(destination),{recursive:true});await writeFile(destination,updated)
    results.push({path,functions,mode:process.argv.includes('--write')?'applied':'preview'})
  }
  console.log(JSON.stringify(results))
}
await main()
