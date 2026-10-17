/** Inventory editor UI source; counts are structural evidence, not runtime coverage. */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse } from 'vue/compiler-sfc'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const postcss = createRequire(require.resolve('vite/package.json'))('postcss')

async function files(dir) {
  const result = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name).replaceAll('\\', '/')
    if (entry.isDirectory()) result.push(...await files(path))
    else if (/\.(vue|css)$/.test(path)) result.push(path)
  }
  return result.sort()
}
const inventory = []
for (const path of await files('src')) {
  if (path === 'src/PlayerApp.vue') continue
  const source = await readFile(path, 'utf8')
  const descriptor = path.endsWith('.vue') ? parse(source, { filename: path }).descriptor : null
  const controls = [], handlers = new Set(), components = new Set(), declarations = []
  const visit = node => {
    if (node.type === 1) {
      if (/^[A-Z]/.test(node.tag)) components.add(node.tag)
      const attribute = name => node.props.find(p => p.type === 6 && p.name === name)?.value?.content
      const events = node.props.filter(p => p.type === 7 && p.name === 'on').map(p => ({ event: p.arg?.content, handler: p.exp?.content }))
      for (const event of events) if (event.handler) handlers.add(event.handler)
      if (['button', 'input', 'select', 'textarea', 'summary'].includes(node.tag) || /Numeric|Slider|Property|SettingRow|^Ui/.test(node.tag)) controls.push({ tag: node.tag, type: attribute('type'), line: node.loc.start.line, text: node.loc.source.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140), model: node.props.find(p => p.type === 7 && p.name === 'model')?.exp?.content, events })
    }
    for (const child of node.children ?? []) visit(child)
  }
  if (descriptor?.template?.ast) visit(descriptor.template.ast)
  for (const css of descriptor ? descriptor.styles.map(s => s.content) : [source]) {
    postcss.parse(css, { from: path }).walkDecls(d => {
      if (/(#[\da-f]{3,8}\b|rgba?\(|hsla?\()/i.test(d.value) || /\b\d+(?:\.\d+)?px\b/.test(d.value)) declarations.push({ property: d.prop, value: d.value, selector: d.parent.selector })
    })
  }
  inventory.push({ path, bytes: Buffer.byteLength(source), components: [...components].sort(), controls, handlers: [...handlers], localVisualDeclarations: declarations, lifecycle: [...source.matchAll(/\b(onMounted|onBeforeUnmount|onUnmounted|onActivated|onDeactivated|setInterval|defineAsyncComponent)\s*\(/g)].map(m => m[1]), transitions: [...source.matchAll(/<Transition\b[^>]*>/g)].map(m => m[0]) })
}
const totals = { files: inventory.length, vue: inventory.filter(f => f.path.endsWith('.vue')).length, nativeButtons: inventory.flatMap(f => f.controls).filter(c => c.tag === 'button').length, nativeRanges: inventory.flatMap(f => f.controls).filter(c => c.tag === 'input' && c.type === 'range').length, nativeNumbers: inventory.flatMap(f => f.controls).filter(c => c.tag === 'input' && c.type === 'number').length, visualDeclarations: inventory.reduce((n, f) => n + f.localVisualDeclarations.length, 0) }
const output = process.argv.find(a => a.startsWith('--output='))?.slice(9) ?? 'docs/ui/UI_INVENTORY.json'
await mkdir(output.slice(0, output.lastIndexOf('/')), { recursive: true })
await writeFile(output, JSON.stringify({ format: 'nova-ui-source-inventory', version: 1, scope: 'Editor Vue templates and CSS; source declarations only, not executed feature coverage.', totals, files: inventory }, null, 2) + '\n')
console.log(JSON.stringify({ output, ...totals }))
