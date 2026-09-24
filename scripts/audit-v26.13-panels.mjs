/* 解析 26.13 Vue 模板，枚举面板根结构、条件分支、折叠区及控件，保留实际观察状态。 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { parse as parseSfc } from 'vue/compiler-sfc'

const root = process.cwd(), sourceOption = process.argv.find(/* 调用 arg.startsWith('--source-root=') 并返回调用结果。 */ arg => arg.startsWith('--source-root='))?.slice(14)
const overlay = sourceOption ? resolve(root, sourceOption) : root
const output = overlay === root ? join(root, 'release-audits') : join(overlay, 'reports')
const files = new Set()
/* 递归将 Vue 文件的规范相对路径加入去重集合。 */
async function list(folder, base) { for (const item of await readdir(folder, { withFileTypes: true })) { const path = join(folder, item.name); if (item.isDirectory()) await list(path, base); else if (item.name.endsWith('.vue')) files.add(relative(base, path).replaceAll('\\', '/')) } }
await list(join(root, 'src'), root)
if (overlay !== root) await list(join(overlay, 'src'), overlay)
const records = []
for (const file of [...files].sort()) {
  let source; try { source = await readFile(join(overlay, file), 'utf8') } catch { source = await readFile(join(root, file), 'utf8') }
  const { descriptor, errors } = parseSfc(source, { filename: file }); assert.deepEqual(errors, [], file)
  const template = descriptor.template, conditions = [], disclosures = [], controls = [], children = new Set(), roots = []
  if (template) {
    const ast = template.ast
    assert.ok(ast, `Vue must expose the parsed template AST: ${file}`)
    const visit = /* 遍历 Vue 模板元素，收集根元素、子组件、条件分支、折叠区与控件属性，保留待实测标记。 */ (node, depth = 0) => {
      if (node.type === 1) {
        const line = template.loc.start.line + node.loc.start.line - 1
        const attributes = Object.fromEntries(node.props.filter(/* 比较 prop.type 与 6，返回严格相等的判断结果。 */ prop => prop.type === 6).map(/* 返回按声明顺序构造的数组 [prop.name, prop.value?.content ?? '']。 */ prop => [prop.name, prop.value?.content ?? '']))
        if (/^[A-Z]/.test(node.tag)) children.add(node.tag)
        if (!depth) roots.push({ tag: node.tag, class: attributes.class ?? null })
        for (const prop of node.props) if (prop.type === 7 && ['if', 'else-if', 'else', 'show', 'for'].includes(prop.name)) conditions.push({ line, tag: node.tag, directive: prop.name, expression: prop.exp?.content ?? '', observed: false })
        if (node.tag === 'details') disclosures.push({ line, class: attributes.class ?? null, observed: false })
        if (['input', 'select', 'textarea', 'button', 'summary'].includes(node.tag)) controls.push({ line, tag: node.tag, type: attributes.type ?? null, class: attributes.class ?? null, name: attributes['aria-label'] ?? null, boundName: node.props.find(/* 先计算 prop.type === 7 && prop.name === 'bind'；仅当其为真值时求右侧 prop.arg?.content === 'aria-label'，返回短路求值结果。 */ prop => prop.type === 7 && prop.name === 'bind' && prop.arg?.content === 'aria-label')?.exp?.content ?? null })
      }
      for (const child of node.children ?? []) visit(child, node.type === 1 ? depth + 1 : depth)
    }
    visit(ast)
  }
  const imports = [...source.matchAll(/(?:from\s*|import\()\s*['"]([^'"]+\.vue)['"]/g)].map(/* 调用 relative(root, resolve(root, dirname(file), match[1])).replaceAll('\\', '/') 并返回调用结果。 */ match => relative(root, resolve(root, dirname(file), match[1])).replaceAll('\\', '/'))
  records.push({ file, sha256: createHash('sha256').update(source).digest('hex'), roots, imports: [...new Set(imports)], children: [...children].sort(), conditions, disclosures, controls, scope: 'Parsed source and conditional-state inventory; observed flags require matching browser evidence.' })
}
const byFile = new Map(records.map(/* 返回按声明顺序构造的数组 [record.file, record]。 */ record => [record.file, record]))
const reachable = new Set(), pending = ['src/App.vue', 'src/PlayerApp.vue']
while (pending.length) { const file = pending.shift(); if (reachable.has(file)) continue; reachable.add(file); pending.push(...(byFile.get(file)?.imports ?? [])) }
for (const record of records) { record.importReachable = reachable.has(record.file); record.parents = records.filter(/* 调用 parent.imports.includes(record.file) 并返回调用结果。 */ parent => parent.imports.includes(record.file)).map(/* 返回 parent.file 的当前值。 */ parent => parent.file) }
await mkdir(output, { recursive: true })
await writeFile(join(output, 'panel-source-inventory.json'), JSON.stringify({ format: 'nova-v26.13-panel-source-inventory', version: 1, status: 'passed', generatedAt: new Date().toISOString(), scope: 'Complete Vue template AST/import/conditional/disclosure/control inventory. Static import reachability is not proof of runtime reachability; this report does not qualify click behavior or accessibility.', sourceFiles: records.length, importedFiles: records.filter(/* 返回 record.importReachable 的当前值。 */ record => record.importReachable).length, records }, null, 2) + '\n')
const escape = /* 调用 String(value).replaceAll('|', '\\|').replaceAll('\n', ' ') 并返回调用结果。 */ value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')
const lines = ['# 26.13 complete Vue panel/state inventory', '', 'This register is generated from every Vue template AST, including conditional branches, list states, disclosures and controls. The accompanying `panel-source-inventory.json` records each expression and line. Source inventory and import reachability do not constitute observed user tests. Actual panel cases, geometry, controls, locale/scale/theme and screenshots belong to the separate browser reports.', '', '| Source | Import route / parent | Conditional/list states | Disclosures | Controls |', '| --- | --- | ---: | ---: | ---: |']
for (const record of records) lines.push(`| \`${record.file}\` | ${escape(record.parents.join(', ') || (record.importReachable ? 'Application entry' : 'No current static SFC import; inspect dynamic use before declaring reachable'))} | ${record.conditions.length} | ${record.disclosures.length} | ${record.controls.length} |`)
await writeFile(join(output, 'PANEL_SOURCE_INVENTORY_26_13.md'), lines.join('\n') + '\n')
console.log(JSON.stringify({ sourceFiles: records.length, importedFiles: records.filter(/* 返回 record.importReachable 的当前值。 */ record => record.importReachable).length, conditions: records.reduce(/* 计算表达式 sum + record.conditions.length 并返回结果，沿用操作数的原有类型规则。 */ (sum, record) => sum + record.conditions.length, 0), disclosures: records.reduce(/* 计算表达式 sum + record.disclosures.length 并返回结果，沿用操作数的原有类型规则。 */ (sum, record) => sum + record.disclosures.length, 0), controls: records.reduce(/* 计算表达式 sum + record.controls.length 并返回结果，沿用操作数的原有类型规则。 */ (sum, record) => sum + record.controls.length, 0), output }))
