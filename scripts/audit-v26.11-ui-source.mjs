/* 递归建立 26.11 Vue 界面的控件、容器查询及文本省略源码清单。 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
/* 递归收集 Vue 文件路径，供界面源码结构清单使用。 */
async function files(folder) {
  const result = []
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name)
    if (entry.isDirectory()) result.push(...await files(path))
    else if (entry.name.endsWith('.vue')) result.push(path)
  }
  return result
}
const records = []
for (const path of (await files(join(root, 'src'))).sort()) {
  const source = await readFile(path, 'utf8')
  const template = source.slice(source.indexOf('<template>') + '<template>'.length, source.lastIndexOf('</template>'))
  const style = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(/* 返回 match[1] 的当前值。 */ match => match[1]).join('\n')
  records.push({
    file: relative(root, path).replaceAll('\\', '/'), lines: source.split('\n').length,
    controls: (template.match(/<(?:button|input|select|textarea|summary)(?:\s|>)/g) ?? []).length,
    handlers: (template.match(/(?:@|v-on:)[\w.-]+=/g) ?? []).length,
    childPanels: [...new Set([...source.matchAll(/(?:from\s*|import\()\s*['"]([^'"]+\.vue)['"]/g)].map(/* 返回 match[1] 的当前值。 */ match => match[1]))],
    widthRules: [...new Set([...style.matchAll(/(?:min-|max-)?width\s*:\s*\d+(?:px|vw|%)/g)].map(/* 返回 match[0] 的当前值。 */ match => match[0]))],
    containerQueries: (style.match(/@container/g) ?? []).length,
    ellipsisRules: (style.match(/text-overflow\s*:\s*ellipsis/g) ?? []).length,
    status: 'source inventory only; not a user-interaction pass'
  })
}
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v26.11-ui-source-inventory.json'), JSON.stringify({ scope: 'Every Vue SFC read, structural control/import/CSS inventory. Manual review focused on the confirmed issues listed in UI_LAYOUT_AUDIT_26_11.md.', files: records }, null, 2))
console.log(JSON.stringify(records.map(/* 保留面板文件、行数、控件数、容器查询及省略规则等汇总字段。 */ ({ file, lines, controls, containerQueries, ellipsisRules }) => ({ file, lines, controls, containerQueries, ellipsisRules })), null, 2))
