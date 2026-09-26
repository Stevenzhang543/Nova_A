/** 26.28 本地化定向检查：检查真实字典、可视帮助及响应式临时消息，盘点翻译来源而不宣称人工语义验收。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { computed, reactive, ref } from 'vue'
const require = createRequire(import.meta.url), locales = ['en', 'de', 'zh'], cache = new Map(), state = reactive({ locale: 'en' })
/** 转译并执行实际纯文案模块；只替换偏好存储宿主，保留真实 Vue 响应式行为。 */
function load(file) {
  file = path.resolve(file)
  if (cache.has(file)) return cache.get(file)
  const output = {}; cache.set(file, output)
  let source = fs.readFileSync(file, 'utf8')
  if (file.endsWith(`${path.sep}i18n.ts`)) source += '\nexport const auditDictionaries = dictionaries;'
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports: output,
    /** 仅在真实偏好模块边界隔离浏览器宿主依赖，其余相对文案模块使用真实源码。 */
    require(specifier) {
      if (specifier.endsWith('/store/preferences')) return { preferencesState: state }
      if (specifier.endsWith('.json')) return JSON.parse(fs.readFileSync(path.resolve(path.dirname(file), specifier), 'utf8'))
      if (specifier.startsWith('.')) return load(path.resolve(path.dirname(file), `${specifier}.ts`))
      return require(specifier)
    },
  }, { filename: file })
  return output
}
/** 获取固定字符串属性名，动态表达式另行计入未解析范围。 */
function name(node) { return node && (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) ? node.text : undefined }
/** 从直接对象字面量提取键，遇到展开语法时不假装已证明完整覆盖。 */
function keys(node) { while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) node = node.expression; return ts.isObjectLiteralExpression(node) ? node.properties.filter(/** 只选择有静态名称的显式属性。 */ p => ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p)).map(/** 读取稳定属性名称。 */ p => name(p.name)).filter(Boolean).sort() : null }
/** 枚举源文件，跳过依赖及生成目录。 */
function files(directory) { return fs.readdirSync(directory, { withFileTypes: true }).flatMap(/** 递归实际源码目录并筛选可读代码。 */ item => item.isDirectory() ? files(path.join(directory, item.name)) : /\.(?:ts|vue)$/.test(item.name) ? [path.join(directory, item.name)] : []) }
const inventory = [], groups = [], unknownCalls = [], dictionaryExplicit = { en: new Set(), de: new Set(), zh: new Set() }
for (const file of files('src')) {
  const source = fs.readFileSync(file, 'utf8'), ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true), localeSignals = (source.match(/\b(?:locale|localization|translation)\b/g) ?? []).length
  if (localeSignals || /Copy\.(ts|vue)$/.test(file) || file.endsWith('i18n.ts')) inventory.push({ path: file.replaceAll('\\', '/'), sha256: createHash('sha256').update(source).digest('hex'), localeSignals })
  /** 记录三语言字典组、中央字典显式覆盖及直接翻译调用。 */
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const entries = new Map(node.properties.filter(/** 只解析直接属性，展开对象保留为未解析边界。 */ p => ts.isPropertyAssignment(p)).map(/** 建立固定名称到初始值的映射。 */ p => [name(p.name), p.initializer]))
      if (locales.every(/** 三种语言都明确出现才属于三语对象组。 */ locale => entries.has(locale))) {
        const sets = Object.fromEntries(locales.map(/** 记录每种语言的直接键集。 */ locale => [locale, keys(entries.get(locale))]))
        groups.push({ path: file.replaceAll('\\', '/'), line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, keys: sets, comparable: locales.every(/** 仅直接对象且不含展开属性时能机械判定键对齐。 */ locale => sets[locale] !== null && !entries.get(locale).properties.some(/** 标记需要运行时合并的展开记录。 */ p => ts.isSpreadAssignment(p))) })
      }
    }
    if (file.endsWith('i18n.ts')) {
      if (ts.isVariableDeclaration(node) && dictionaryExplicit[name(node.name)] && node.initializer) for (const key of keys(node.initializer) ?? []) dictionaryExplicit[name(node.name)].add(key)
      if (ts.isCallExpression(node) && node.expression.getText(ast) === 'Object.assign' && dictionaryExplicit[node.arguments[0]?.getText(ast)]) for (const arg of node.arguments.slice(1)) for (const key of keys(arg) ?? []) dictionaryExplicit[node.arguments[0].getText(ast)].add(key)
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
}
const { t, auditDictionaries: dictionaries, localizedUiLabel } = load('src/i18n.ts')
const dictionaryKeys = Object.keys(dictionaries.en).sort()
for (const locale of locales) { assert.equal(dictionaries[locale].releaseLabel, 'Nova_A v26.28'); assert.equal(dictionaries[locale].version, 'Nova_A v26.28') }
for (const file of files('src')) {
  const source = fs.readFileSync(file, 'utf8')
  if (!/import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*['"][^'"]*i18n['"]/.test(source)) continue
  for (const match of source.matchAll(/\bt\(\s*(['"])([^'"\n]+)\1/g)) if (!Object.hasOwn(dictionaries.en, match[2])) unknownCalls.push({ path: file.replaceAll('\\', '/'), key: match[2], line: source.slice(0, match.index).split('\n').length })
}
assert.deepEqual(unknownCalls, [], 'Direct static translation calls must resolve to a registered key')
const qualification = process.argv.find(/** 读取正式门禁声明的目标版本。 */ arg => arg.startsWith('--qualification-release='))?.split('=')[1]
if (qualification) { assert.equal(qualification, '26.28'); assert.equal(JSON.parse(fs.readFileSync('package.json', 'utf8')).version, '26.28.0') }
for (const locale of locales) {
  assert.deepEqual(Object.keys(dictionaries[locale]).sort(), dictionaryKeys, `${locale}: final key parity`)
  assert.deepEqual(dictionaryKeys.filter(/** 检查实际发布键是否有该语言显式文案，防止英文展开掩盖缺译。 */ key => !dictionaryExplicit[locale].has(key)), [], `${locale}: explicit translations, not inherited English`)
  for (const key of dictionaryKeys) {
    assert.ok(dictionaries[locale][key].trim(), `${locale}:${key} blank`)
    assert.deepEqual((dictionaries[locale][key].match(/\{\w+\}/g) ?? []).sort(), (dictionaries.en[key].match(/\{\w+\}/g) ?? []).sort(), `${locale}:${key} parameters`)
  }
}
const { syntaxNodeHelp, syntaxNodeTitle } = load('src/editor/graphSyntaxCopy.ts'), { RHAI_API_SIGNATURES } = load('src/visual/rhaiApiSignatures.ts'), { graphStatusMessage } = load('src/editor/graphStatusCopy.ts')
let helpCount = 0
const missingHelp = []
for (const signature of RHAI_API_SIGNATURES) {
  if (!signature.available || !signature.profiles.includes('wasm') || signature.internal || signature.operator) continue
  for (const locale of ['de', 'zh']) {
    const result = syntaxNodeHelp(`rhai-api.${signature.id}`, locale, '__UNTRANSLATED__')
    if (result === '__UNTRANSLATED__') missingHelp.push({ locale, id: signature.id, documentation: signature.documentation }); assert.ok(result.trim()); helpCount++
  }
}
assert.deepEqual(missingHelp, [], 'Every supported public visual API must have localized help or an explicit no-description explanation')
const status = ref({ kind: 'label', key: 'wireMismatch' }), statusText = computed(/** 显示真实状态格式化器的响应式结果。 */ () => graphStatusMessage(status.value, state.locale)), translated = computed(/** 使用真实中央翻译函数读取当前语言。 */ () => t('noReferencesFound'))
const observed = []
for (const locale of ['en', 'de', 'zh', 'en']) { state.locale = locale; observed.push({ locale, status: statusText.value, translation: translated.value }); assert.equal(translated.value, dictionaries[locale].noReferencesFound) }
assert.equal(new Set(observed.slice(0, 3).map(/** 对比三个语言的连线消息。 */ item => item.status)).size, 3)
assert.equal(observed[0].status, observed[3].status)
status.value = { kind: 'result', nodes: 3, milliseconds: 12.5 }; state.locale = 'zh'; assert.equal(statusText.value, '3 节点 · 12.5 ms'); state.locale = 'de'; assert.equal(statusText.value, '3 Knoten · 12.5 ms')
status.value = { kind: 'label', key: 'layoutRunning', suffix: ' 2/4' }; assert.ok(statusText.value.endsWith(' 2/4'))
status.value = { kind: 'diagnostics', items: [{ code: 'RHAI-LIMIT-DEPTH', message: 'Technical source text' }] }; state.locale = 'zh'; assert.match(statusText.value, /嵌套/); state.locale = 'de'; assert.match(statusText.value, /Verschachtelung/)
status.value = 'author custom error'; assert.equal(statusText.value, 'author custom error')
assert.equal(syntaxNodeHelp('plugin.custom', 'zh', 'Author description'), 'Author description')
assert.equal(syntaxNodeTitle({ type: 'rhai.If', title: 'My title' }, 'de'), 'My title')
assert.equal(localizedUiLabel('Unregistered author text', 'de'), 'Unregistered author text')
const unequalGroups = groups.filter(/** 记录确定可比较但键不同的本地文案组，留给具体所有者处理。 */ group => group.comparable && (JSON.stringify(group.keys.en) !== JSON.stringify(group.keys.de) || JSON.stringify(group.keys.en) !== JSON.stringify(group.keys.zh)))
const report = { release: '26.28', engineVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version, generatedAt: new Date().toISOString(), status: 'passed', checks: ['central dictionary final and explicit key parity', 'placeholder parity and nonempty strings', 'supported visual API help coverage', 'reactive locale switch and preserved author text', 'direct static translation calls resolve', 'mechanical translation source inventory'], dictionaryKeys: dictionaryKeys.length, helpChecks: helpCount, observed, inventory, groups, unequalGroups, unknownCalls, missingHelp, scope: 'Actual module key/placeholder/explicit coverage and Vue reactive presentation tests. Inventory locates locale-bearing source; it does not establish natural-language accuracy, full document coverage or device accessibility. Unknown/plugin/user text intentionally preserves original detail.' }
fs.mkdirSync('release-audits', { recursive: true }); if(fs.existsSync('release-audits/v26.28-localization.json')) fs.copyFileSync('release-audits/v26.28-localization.json', `release-audits/v26.28-localization.previous-${Date.now()}.json`); fs.writeFileSync('release-audits/v26.28-localization.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify({ status: report.status, keys: dictionaryKeys.length, helpCount, sourceFiles: inventory.length, groups: groups.length, missingHelp: missingHelp.length, unknownCalls, unequalGroups }, null, 2))
