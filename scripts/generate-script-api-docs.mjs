import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
try {
  const api = await server.ssrLoadModule('/src/editor/scriptApi.ts')
  const { SCRIPT_API, SCRIPT_API_VERSION, SCRIPT_API_V2_MANIFEST, SCRIPT_API_V1_TO_V2, generatedApiMarkdown } = api
  const rust = await readFile(join(root, 'crates/nova_script/src/lib.rs'), 'utf8')
  const callbacks = new Set(SCRIPT_API.filter(entry => entry.signature.startsWith('fn ')).map(entry => entry.name))
  const bindings = SCRIPT_API.filter(entry => !callbacks.has(entry.name)).map(entry => ({ name: entry.name, registered: rust.includes(`"${entry.name}"`) }))
  const documented = SCRIPT_API.filter(entry => entry.detail && entry.signature && entry.documentation).length
  const examples = SCRIPT_API.filter(entry => entry.example).length
  const deprecated = SCRIPT_API.filter(entry => entry.deprecated).map(entry => ({ name: entry.name, ...entry.deprecated }))
  const contractPath = join(root, 'tests', 'fixtures', 'scripting', 'api-v2-contract.json')
  const contract = { format: 'nova-rhai-api-contract', version: 2, apiVersion: SCRIPT_API_VERSION, symbols: SCRIPT_API_V2_MANIFEST.entries.map(entry => ({ id: entry.id, name: entry.name, signature: entry.signature, module: entry.module, resultConvention: entry.resultConvention, lifetime: entry.lifetime, threadRule: entry.threadRule, determinism: entry.determinism, deprecated: entry.deprecated ?? null })) }
  let archivedContract = null
  try { archivedContract = JSON.parse(await readFile(contractPath, 'utf8')) } catch { /* generated below when explicitly approved */ }
  const breakingChanges = archivedContract?.symbols ? archivedContract.symbols.flatMap(previous => {
    const current = contract.symbols.find(entry => entry.id === previous.id)
    if (!current) return [`removed ${previous.id}`]
    return current.signature !== previous.signature || current.module !== previous.module ? [`changed ${previous.id}: ${previous.signature} -> ${current.signature}`] : []
  }) : process.argv.includes('--update-contract') ? [] : ['API v2 contract fixture missing']
  if (process.argv.includes('--update-contract')) {
    await mkdir(dirname(contractPath), { recursive: true })
    await writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8')
  }

  const markdown = `# Nova Rhai API v2\n\nNova_A 4.6 introduces API v2 while retaining API v1 through a per-script compatibility adapter. New scripts use v2; imported v1 assets keep their selected version until migrated.\n\n## Contract\n\n- The manifest is versioned and records module, callable, signature, result convention, lifetime, thread rule, determinism, permissions, deprecation, documentation, and an executable example.\n- Handles are typed, versioned copied values. Validate them at callback boundaries; invalid handles are explicit values rather than host exceptions.\n- Host mutations are queued and applied at safe engine boundaries. Runtime failures become bounded diagnostics.\n- Filesystem, network, process, DOM, unrestricted eval, and unrestricted editor-time execution are absent from the stable sandbox.\n- API v1 is selectable per asset. Deprecated calls produce migration diagnostics and remain available through 4.x; removal is scheduled no earlier than API v3.\n\n## Thread, lifetime, and determinism\n\nFixed-step mutations run only from fixed-step ownership. Callback values expire at the callback boundary; scene handles must be revalidated after structural changes. Seeded random APIs reproduce with the captured seed. Pointer and device values are host-dependent inputs and are recorded for replay.\n\n## Error and result conventions\n\nQueries return values or explicit invalid handles/results. Queued commands never expose raw host exceptions. Compile, semantic, permission, runtime, and compatibility diagnostics use stable NOVA-* codes.\n\n## Hot reload\n\nThe complete module graph is analyzed and compiled before apply. Export layout changes are classified as compatible, recreate-instances, restart-required, or rejected. Swaps occur transactionally at a frame boundary, retain a rollback source, and never silently replace a valid program with an incompatible candidate.\n\n## Tests and coverage\n\nUse \`// @test tags=unit timeout=1000 seed=42 cases=a|b\` before \`fn test_*\`. The headless runner supports filters, tags, deterministic seeds, cancellation, explicit infrastructure-only retries, sharding, JSON, JUnit XML, LCOV/JSON coverage, and stable exit codes.\n\n${generatedApiMarkdown()}\n`
  await mkdir(join(root, 'docs'), { recursive: true })
  await mkdir(join(root, 'release-audits'), { recursive: true })
  await writeFile(join(root, 'docs', 'RHAI_API_V2.md'), markdown, 'utf8')
  await writeFile(join(root, 'docs', 'RHAI_API_V2_MANIFEST.json'), `${JSON.stringify(SCRIPT_API_V2_MANIFEST, null, 2)}\n`, 'utf8')
  await writeFile(join(root, 'docs', 'RHAI_V1_TO_V2.json'), `${JSON.stringify({ format: 'nova-rhai-api-migration', version: 1, from: 1, to: 2, mappings: SCRIPT_API_V1_TO_V2, retainedThrough: '4.x', removal: 'API v3 or later' }, null, 2)}\n`, 'utf8')
  const stubs = [`// Nova_A Rhai API v2 generated editor stubs.`, `// Metadata only: this file is not executed or bundled into a game.`, `// API ${SCRIPT_API_VERSION}; generated from src/editor/scriptApi.ts.`, '', ...SCRIPT_API_V2_MANIFEST.entries.map(entry => `// @nova-api module=${entry.module} lifetime=${entry.lifetime} thread=${entry.threadRule} determinism=${entry.determinism}\n// ${entry.signature}\n// ${entry.detail}${entry.deprecated ? `\n// DEPRECATED: use ${entry.deprecated.replacement}; removal ${entry.deprecated.removal}.` : ''}`), ''].join('\n')
  await writeFile(join(root, 'docs', 'NOVA_RHAI_API_V2_STUBS.rhai'), stubs, 'utf8')
  const report = { format: 'nova-script-api-coverage', version: 2, engineVersion: '6.0.0', apiVersion: SCRIPT_API_VERSION, generatedAt: new Date().toISOString(), symbols: SCRIPT_API.length, documented, examples, documentationCoverage: documented / SCRIPT_API.length, exampleCoverage: examples / SCRIPT_API.length, bindingCoverage: bindings.filter(item => item.registered).length / bindings.length, missingBindings: bindings.filter(item => !item.registered).map(item => item.name), modules: [...new Set(SCRIPT_API.map(entry => entry.namespace))], deprecated, v1MigrationMappings: Object.keys(SCRIPT_API_V1_TO_V2).length, contractFixture: 'tests/fixtures/scripting/api-v2-contract.json', breakingChanges, status: documented === SCRIPT_API.length && examples / SCRIPT_API.length >= .9 && bindings.every(item => item.registered) && breakingChanges.length === 0 ? 'passed' : 'failed' }
  await writeFile(join(root, 'release-audits', 'v4.6.0-api-contract.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  if (report.status !== 'passed') throw new Error(`API v2 coverage failed: ${[...report.missingBindings, ...breakingChanges].join(', ')}`)
  console.log(`Nova Rhai API v2: ${documented}/${SCRIPT_API.length} documented; ${examples}/${SCRIPT_API.length} examples; ${bindings.length} host bindings; ${Object.keys(SCRIPT_API_V1_TO_V2).length} v1 migrations.`)
} finally { await server.close() }
