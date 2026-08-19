import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
try {
  const { SCRIPT_API, SCRIPT_API_VERSION, generatedApiMarkdown } = await server.ssrLoadModule('/src/editor/scriptApi.ts')
  const rust = await readFile(join(root, 'crates/nova_script/src/lib.rs'), 'utf8')
  const callbacks = new Set(SCRIPT_API.filter(entry => entry.signature.startsWith('fn ')).map(entry => entry.name))
  const bindings = SCRIPT_API.filter(entry => !callbacks.has(entry.name)).map(entry => ({ name: entry.name, registered: rust.includes(`"${entry.name}"`) }))
  const documented = SCRIPT_API.filter(entry => entry.detail && entry.signature && entry.documentation).length
  const examples = SCRIPT_API.filter(entry => entry.example).length
  const deprecated = SCRIPT_API.filter(entry => entry.deprecated).map(entry => ({ name: entry.name, replacement: entry.deprecated.replacement, removal: entry.deprecated.removal }))
  const contractPath = join(root, 'tests', 'fixtures', 'scripting', 'api-v1-contract.json')
  const contract = { format: 'nova-rhai-api-contract', version: 1, apiVersion: SCRIPT_API_VERSION, symbols: SCRIPT_API.map(entry => ({ name: entry.name, signature: entry.signature, namespace: entry.namespace, deprecated: entry.deprecated ?? null })) }
  if (process.argv.includes('--update-contract')) {
    await mkdir(dirname(contractPath), { recursive: true })
    await writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8')
  }
  let archivedContract = null
  try { archivedContract = JSON.parse(await readFile(contractPath, 'utf8')) } catch { /* first intentional contract generation uses --update-contract */ }
  const breakingChanges = archivedContract?.symbols ? archivedContract.symbols.flatMap(previous => {
    const current = contract.symbols.find(entry => entry.name === previous.name)
    if (!current) return [`removed ${previous.name}`]
    return current.signature !== previous.signature || current.namespace !== previous.namespace ? [`changed ${previous.name}: ${previous.signature} -> ${current.signature}`] : []
  }) : ['API v1 contract fixture missing']
  const markdown = `# Nova Rhai API v${SCRIPT_API_VERSION}\n\nNova_A 3.5 freezes this contract through the 3.x line. Callable names remain flat \`snake_case\` because that is idiomatic Rhai; each symbol also has a stable namespace used by completion, documentation, permissions, diagnostics, and compatibility tooling.\n\n## Contract rules\n\n- Scripts are sandboxed: no filesystem, network, process, DOM, \`eval\`, or raw Rhai \`import\`. Project modules use \`use "Module.rhai";\` and are resolved under \`Assets/Scripts\`.\n- Entity, component, and resource handles contain \`valid\`, \`kind\`, \`id\`, \`error\`, \`api_version\`, and a deterministic \`generation\`. Invalid handles are values, not host exceptions.\n- Runtime commands are queued and applied at safe engine boundaries. Non-finite or invalid arguments report script errors instead of silently mutating state.\n- Missing lifecycle callbacks are optional. A present callback that throws is reported with its source and does not replace the last valid hot-reload program.\n- Deprecated aliases run throughout API v1, produce \`NOVA-COMPAT-001\`/\`NOVA-SCRIPT-DEPRECATED\`, and list their API-v2 replacement.\n\n## Exported properties\n\n\`@export(type="float", min=0, max=20, step=0.1, enum="A|B", resource="Texture2D", group="Movement", tooltip="Speed", serialize=true) let speed = 5.0;\`\n\nSupported metadata: type, default value, minimum, maximum, step, enum choices, resource type, group, tooltip, and serialization. The Inspector derives its control and validation directly from this metadata. Old \`@export let value = ...;\` declarations remain valid.\n\n## Events, tasks, and reload\n\nSignals are bounded, serializable, delivered at a safe frame boundary, and may have editor-visible signal-to-callback connections. Timers and deferred tasks are owned by the entity/scene and support cancellation. Hot reload validates the complete module graph first; Preserve keeps type-compatible state, Recreate resets defaults and lifecycle, Disabled opts out. A failed compile retains the prior AST and state.\n\n## Tests and debugger\n\nUse \`// @test tags=unit timeout=1000 seed=42 cases=a|b\` before \`fn test_*\`. Optional \`before_all\`, \`before_each\`, \`after_each\`, and \`after_all\` callbacks are isolated per case. The headless runner returns non-zero on failures and emits JSON or JUnit. The debugger supports line/function/conditional/hit-count breakpoints, logpoints, callback-safe stepping, call stack, locals, watches, evaluation, restart, persistence, and break-on-error.\n\n${generatedApiMarkdown()}\n`
  await mkdir(join(root, 'release-audits'), { recursive: true })
  await writeFile(join(root, 'docs', 'RHAI_API_V1.md'), markdown, 'utf8')
  const report = { format: 'nova-script-api-coverage', version: 1, engineVersion: '3.5.0', apiVersion: SCRIPT_API_VERSION, generatedAt: new Date().toISOString(), symbols: SCRIPT_API.length, documented, examples, documentationCoverage: documented / SCRIPT_API.length, exampleCoverage: examples / SCRIPT_API.length, bindingCoverage: bindings.filter(item => item.registered).length / bindings.length, missingBindings: bindings.filter(item => !item.registered).map(item => item.name), namespaces: [...new Set(SCRIPT_API.map(entry => entry.namespace))], deprecated, contractFixture: 'tests/fixtures/scripting/api-v1-contract.json', breakingChanges, status: documented === SCRIPT_API.length && examples / SCRIPT_API.length >= .9 && bindings.every(item => item.registered) && breakingChanges.length === 0 ? 'passed' : 'failed' }
  await writeFile(join(root, 'release-audits', 'v3.5.0-api-coverage.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  if (report.status !== 'passed') throw new Error(`API coverage failed: ${report.missingBindings.join(', ')}`)
  console.log(`Nova Rhai API v1 documentation generated: ${documented}/${SCRIPT_API.length} documented; ${examples}/${SCRIPT_API.length} examples; ${bindings.length} host bindings.`)
} finally { await server.close() }
