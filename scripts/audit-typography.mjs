import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = new URL('..', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1')
const sourceRoot = join(root, 'src')
const failures = []
const checked = []

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await visit(path)
    else if (/\.(?:vue|css)$/.test(entry.name)) checked.push(path)
  }
}

await visit(sourceRoot)
for (const path of checked) {
  const source = await readFile(path, 'utf8')
  for (const match of source.matchAll(/font-size\s*:\s*([0-9]+(?:\.[0-9]+)?)px/g)) {
    const size = Number(match[1])
    if (size > 0 && size < 11) failures.push(`${relative(root, path)} uses ${size}px text`)
  }
  for (const match of source.matchAll(/(?:^|[;{])\s*font\s*:\s*(?:[^;{}]*?\s)?([0-9]+(?:\.[0-9]+)?)px(?:\/[0-9.]+)?/gm)) {
    const size = Number(match[1])
    if (size > 0 && size < 11) failures.push(`${relative(root, path)} uses ${size}px shorthand text`)
  }
}

const main = await readFile(join(sourceRoot, 'assets', 'main.css'), 'utf8')
if (!main.includes('font-size: calc(16px * var(--ui-scale))')) failures.push('The normal application text base is not 16px.')
for (const family of ['Segoe UI Variable Text', 'Noto Sans SC', 'Microsoft YaHei UI']) if (!main.includes(family)) failures.push(`The friendly multilingual font stack is missing ${family}.`)
for (const rule of ['-webkit-font-smoothing: antialiased', '-moz-osx-font-smoothing: grayscale', 'text-rendering: optimizeLegibility']) if (!main.includes(rule)) failures.push(`Font rendering rule is missing: ${rule}.`)
if (!main.includes("[data-reduce-motion='true']")) failures.push('Reduced-motion support is missing.')

if (failures.length) {
  console.error(`Typography audit failed (${failures.length}):\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log(`Typography audit passed: ${checked.length} UI styles, 16px scalable base, 11px absolute floor, multilingual rounded system stack, and reduced-motion rendering.`)
