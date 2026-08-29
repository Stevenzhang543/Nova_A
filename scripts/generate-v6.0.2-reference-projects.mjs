import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'reference-projects/projects/creator-v602-interaction-export-audit')
const compiled = await mkdtemp(join(tmpdir(), 'nova-v602-reference-'))
try {
  await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: 'src/projects/templates.ts', outDir: compiled, emptyOutDir: false, rollupOptions: { output: { entryFileNames: 'templates.mjs' } } } })
  const templates = await import(`${pathToFileURL(join(compiled, 'templates.mjs')).href}?v=${Date.now()}`)
  const project = templates.createTemplateProject('mouse-knockout', 'Nova 6.0.2 Interaction and Export Audit')
  project.projectSettings.build.gameName = 'Mouse Knockout'
  const failures = templates.auditTemplateProject(project, 'mouse-knockout')
  if (failures.length) throw new Error(`Mouse Knockout template failed: ${failures.join('; ')}`)
  await mkdir(output, { recursive: true })
  await writeFile(join(output, 'project.nova'), `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(join(output, 'README.md'), `# Nova_A 6.0.2 interaction and exported-game audit

Engine **6.0.2**, Project Format 2/schema 29.

Open **project.nova**, then exercise Design, Script, Animation, Interface, Debug and Manage. At 100%, 125%, 150%, 175% and 200% UI scale, every English, German and Chinese control must remain inside a reachable panel. Resize Hierarchy, Inspector and the bottom dock, reorder bottom tabs, change a safe setting and restore it, then Play/Stop.

The gameplay is the complete Mouse Knockout reference: move the blue player with the pointer, hit all eight orange targets out of the active camera, reach 8 / 8 and display the congratulations bar. Build a Windows x86-64 Release game with **Package into executable** enabled. The output is one portable executable with an embedded SHA-256-verified Nova package; explicit sidecar mode remains supported.

External signing, a separate clean-machine lifecycle, second-machine reproducibility and the real 72-hour soak remain pending external evidence.
`)
  await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ engineVersion: '6.0.2', reference: 'creator-v602-interaction-export-audit', locales: ['en', 'de', 'zh'], uiScales: [1, 1.25, 1.5, 1.75, 2], actions: ['traverse all workspaces and panel families', 'inventory every registered control', 'mutate and restore safe settings', 'resize hierarchy inspector and bottom dock', 'reorder bottom tabs', 'play and stop Mouse Knockout', 'build one portable game executable', 'launch and close exported game'], expected: { viewportContained: true, targetCount: 8, finalScore: 8, completionBanner: true, singleFilePortable: true, embeddedPackageVerified: true, authoredStateRestoredAfterStop: true } }, null, 2)}\n`)
  await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion: '6.0.2', status: 'passed', projectFormat: 2, schema: 29, layout: { minimumViewport: [1024, 640], maximumUiScale: 2, locales: ['en', 'de', 'zh'] }, game: { scene: 'Mouse Knockout Arena', fixedTickHz: 60, gravity: 0, targetCount: 8, finalScore: 8 }, export: { target: 'windows', architecture: 'x86_64', runtime: 'game', packageIntoExecutable: true, footer: 'NOVAPK2!', hash: 'SHA-256' }, externalCertification: 'pending' }, null, 2)}\n`)
} finally { await rm(compiled, { recursive: true, force: true }) }

const indexPath = join(root, 'reference-projects/README.md')
let index = await readFile(indexPath, 'utf8')
const start = '<!-- NOVA_V602_REFERENCES_START -->', end = '<!-- NOVA_V602_REFERENCES_END -->'
const block = `${start}\n## Nova_A 6.0.2 interaction and export correction project\n\n- [Interaction and exported-game audit](projects/creator-v602-interaction-export-audit/README.md) — three-language/scaled UI traversal, safe settings and drag exercises, complete Mouse Knockout gameplay, and a verified embedded-package Windows game.\n${end}`
const expression = new RegExp(`${start}[\\s\\S]*?${end}`, 'm')
index = expression.test(index) ? index.replace(expression, block) : `${index.trimEnd()}\n\n${block}\n`
await writeFile(indexPath, index, 'utf8')
console.log('Generated the Nova_A v6.0.2 interaction and export reference project.')
