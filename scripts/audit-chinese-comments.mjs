/** 中文注释审计：枚举自有源码中的函数，不把字符串、界面译文或文件头当作函数注释。 */
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import assert from 'node:assert/strict'
import { parse } from 'vue/compiler-sfc'
import { releaseSourceInventory } from './release-source-snapshot.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const han = /[\u3400-\u9fff]/u
const output = join(root, 'release-audits/v26.24-chinese-comments.json')
const codeExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.vue'])

/** 只读取紧邻声明的注释；变量初始化函数允许使用其变量声明前的说明。 */
function leadingComments(source, node) {
  const candidates = [node]
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    if (ts.isVariableDeclaration(node.parent)) candidates.push(node.parent, node.parent.parent.parent)
    else if (ts.isPropertyAssignment(node.parent)) candidates.push(node.parent)
  }
  return candidates.map(/** 扫描完整前导 trivia；同一行括号或等号后的块注释也属于该函数。 */ candidate => {
    const trivia=source.slice(candidate.getFullStart(),candidate.getStart())
    const scanner=ts.createScanner(ts.ScriptTarget.Latest,false,ts.LanguageVariant.Standard,trivia),comments=[]
    for(let token=scanner.scan();token!==ts.SyntaxKind.EndOfFileToken;token=scanner.scan())if(token===ts.SyntaxKind.MultiLineCommentTrivia||token===ts.SyntaxKind.SingleLineCommentTrivia)comments.push(scanner.getTokenText())
    return comments.join('\n')
  }).join('\n')
}

/** 使用 TypeScript 语法树枚举声明、方法及匿名回调，不用正则猜测函数边界。 */
function scanFunctions(source, path, offset = 0, original = source) {
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : path.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS)
  const functions = []
  /** 深度遍历每个语法节点，记录原文件行号及紧邻中文说明是否存在。 */
  function visit(node) {
    if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node) || ts.isGetAccessor(node) || ts.isSetAccessor(node)) && node.body) {
      const start = offset + node.getStart(ast)
      const label = node.name?.getText(ast) ?? (ts.isVariableDeclaration(node.parent) ? node.parent.name.getText(ast) : '<anonymous>')
      functions.push({ line: original.slice(0, start).split('\n').length, name: label, kind: ts.SyntaxKind[node.kind], chineseComment: han.test(leadingComments(source, node)) })
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return functions
}

/** 分类全部发布源码；不能解析的语言明确待审，不把零个识别结果当作全部覆盖。 */
async function audit() {
  const files = []
  for (const entry of await releaseSourceInventory(root)) {
    const extension = extname(entry.path).toLowerCase()
    if (!codeExtensions.has(extension)) {
      files.push({ path: entry.path, classification: ['.rs', '.rhai', '.ps1', '.py', '.sh'].includes(extension) ? 'requires-language-review' : 'requires-file-documentation', sha256: entry.sha256 })
      continue
    }
    const source = await readFile(join(root, entry.path), 'utf8')
    let functions, header, templateExpressionsPending = false
    if (extension === '.vue') {
      const { descriptor, errors } = parse(source, { filename: entry.path })
      if (errors.length) throw new Error(`SFC parse failed: ${entry.path}: ${errors.join('; ')}`)
      functions = [descriptor.script, descriptor.scriptSetup].filter(Boolean).flatMap(/* 调用 scanFunctions(block.content, entry.path + (block.lang === 'ts' ? '.ts' : '.js'), block.loc.start.offset, source) 并返回调用结果。 */ block => scanFunctions(block.content, entry.path + (block.lang === 'ts' ? '.ts' : '.js'), block.loc.start.offset, source))
      header = source.match(/^\s*<!--([\s\S]*?)-->/)?.[1] ?? ''
      templateExpressionsPending = Boolean(descriptor.template)
    } else {
      functions = scanFunctions(source, entry.path)
      header = (ts.getLeadingCommentRanges(source, 0) ?? []).map(/* 调用 source.slice(range.pos, range.end) 并返回调用结果。 */ range => source.slice(range.pos, range.end)).join('\n')
    }
    files.push({ path: entry.path, sha256: entry.sha256, classification: 'syntax-audited', chineseFileComment: han.test(header), functions, templateExpressionsPending })
  }
  const parsed = files.filter(/* 比较 file.classification 与 'syntax-audited'，返回严格相等的判断结果。 */ file => file.classification === 'syntax-audited')
  const functions = parsed.flatMap(/* 返回 file.functions 的当前值。 */ file => file.functions)
  const guide = await readFile(join(root, 'docs/SOURCE_FILE_GUIDE_ZH_26_24.md'), 'utf8')
  const undocumentedFiles = files.filter(/** 严格数据和二进制也必须在中文伴随索引中有精确路径记录。 */ file => !guide.includes('| `' + file.path + '` |'))
  const syntaxComplete = parsed.every(/** 每个解析成功的文件都必须有文件头和所有函数的中文说明。 */ file => file.chineseFileComment && file.functions.every(/** 检查该函数是否有紧邻中文注释。 */ fn => fn.chineseComment))
  const report = {
    format: 'nova-chinese-comment-coverage', version: 1, targetRelease: '26.24', generatedAt: new Date().toISOString(),
    status: syntaxComplete && !undocumentedFiles.length ? 'passed' : 'incomplete', undocumentedFiles: undocumentedFiles.map(/** 报告缺少伴随说明的精确文件路径。 */ file => file.path), scope: 'Release-owned files; dependency/cache/reference-Godot exclusions follow release-source-snapshot. AST inspection covers JS/TS and Vue scripts. Vue template callbacks and Rust/PowerShell/Rhai have separate recorded reviews in docs/LANGUAGE_COMMENT_COVERAGE_26_24.md. This gate checks syntax-comment presence and file-index coverage, not semantic quality or runtime correctness.',
    counts: { files: files.length, parsedFiles: parsed.length, filesWithChineseHeader: parsed.filter(/* 返回 file.chineseFileComment 的当前值。 */ file => file.chineseFileComment).length, functions: functions.length, functionsWithChineseComment: functions.filter(/* 返回 fn.chineseComment 的当前值。 */ fn => fn.chineseComment).length, otherFiles: files.length - parsed.length }, files
  }
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, JSON.stringify(report) + '\n')
  console.log(JSON.stringify({ path: output, status: report.status, ...report.counts }))
  if (process.argv.includes('--strict') && report.status !== 'passed') process.exitCode = 1
}
// 审计器自身先验证同行注释、普通字符串与嵌套回调，避免漏计或把界面中文误计为说明。
assert.equal(scanFunctions('const f=/** 返回常量。 */()=>42','check.ts')[0].chineseComment,true)
assert.equal(scanFunctions('const f=()=>"中文值"','check.ts')[0].chineseComment,false)
assert.equal(scanFunctions('items.map(/** 提取标识。 */ item=>item.id)','check.ts')[0].chineseComment,true)
assert.equal(scanFunctions('/* 文件概览 */ const label="中文"; const f=()=>42','check.ts')[0].chineseComment,false)
assert.deepEqual(scanFunctions('function outer(){return items.map(/** 提取标识。 */ x=>x.id)}','check.ts').map(/** 仅取函数级注释布尔值。 */ item=>item.chineseComment),[false,true])
await audit()

