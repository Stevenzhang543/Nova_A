import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'docs/FEATURE_INVENTORY_26_01.md')
const compiled = await mkdtemp(join(tmpdir(), 'nova-v2601-inventory-'))
globalThis.localStorage ??= { getItem() { return null }, setItem() {}, removeItem() {} }

try {
  await build({
    configFile: false, root, logLevel: 'warn', ssr: { noExternal: true },
    build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: {
      input: { platform: join(root, 'src/runtime/stableCreatorPlatform.ts') },
      output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' }
    } }
  })
  const platform = await import(`${pathToFileURL(join(compiled, 'platform.mjs')).href}?v=${Date.now()}`)
  const groups = new Map()
  for (const item of platform.CREATOR_PLATFORM_READINESS) {
    const key = `${item.workspace} — ${item.panel}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  const lines = [
    '# Nova_A 26.01 complete feature and binding inventory', '',
    `Generated from the executable learning/readiness catalog. **${platform.CREATOR_PLATFORM_SUMMARY.features} public operations** are mapped over **${platform.CREATOR_PLATFORM_SUMMARY.dimensions} audit dimensions**.`, '',
    `Coverage: ${platform.CREATOR_PLATFORM_SUMMARY.covered} covered, ${platform.CREATOR_PLATFORM_SUMMARY.notApplicable} intentionally not applicable, ${platform.CREATOR_PLATFORM_SUMMARY.external} explicit external gates, ${platform.CREATOR_PLATFORM_SUMMARY.uncovered} unmapped.`, '',
    'Every row below has executable ownership plus validation, undo/recovery, persistence, runtime/export, documentation, and test dispositions in `CREATOR_PLATFORM_READINESS`. “External” is not reported as local success.', '',
    '## Summary by owning panel', '', '| Workspace / panel | Operations | Runtime/export operations | External test gates |', '|---|---:|---:|---:|'
  ]
  for (const [key, items] of groups) lines.push(`| ${key.replaceAll('|', '\\|')} | ${items.length} | ${items.filter(item => item.dimensions.runtimeExport.status === 'covered').length} | ${items.filter(item => item.dimensions.tests.status === 'external').length} |`)
  lines.push('', '## Complete operation list', '')
  for (const [key, items] of groups) {
    lines.push(`### ${key}`, '', '| Operation | Binding | Validation | Undo/recovery | Persistence | Runtime/export | Docs | Tests |', '|---|---|---|---|---|---|---|---|')
    for (const item of items) {
      const cell = dimension => `${item.dimensions[dimension].status}: ${item.dimensions[dimension].route}`.replaceAll('|', '\\|')
      lines.push(`| ${item.feature.replaceAll('|', '\\|')} | ${cell('binding')} | ${cell('validation')} | ${cell('undo')} | ${cell('persistence')} | ${cell('runtimeExport')} | ${cell('documentation')} | ${cell('tests')} |`)
    }
    lines.push('')
  }
  lines.push('## Source scope', '', 'This catalog is backed by the Vue panels, editor stores, project/asset serializers, runtime modules, Rust/WASM crates, build/export pipeline, release verification, and manuals. The generated inventory is deterministic: edit the owning source catalog and rerun `pnpm inventory:v26.01`.', '')
  await writeFile(output, `${lines.join('\n')}\n`)
  const written = await readFile(output, 'utf8')
  if (!written.includes(`${platform.CREATOR_PLATFORM_SUMMARY.features} public operations`) || platform.CREATOR_PLATFORM_SUMMARY.uncovered !== 0) throw new Error('Generated inventory failed its coverage invariant.')
  console.log(`Generated ${output} with ${platform.CREATOR_PLATFORM_SUMMARY.features} operations.`)
} finally {
  await rm(compiled, { recursive: true, force: true })
}
