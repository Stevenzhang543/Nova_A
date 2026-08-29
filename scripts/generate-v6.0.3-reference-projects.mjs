import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'reference-projects/projects/creator-v603-template-export-accessibility')
const compiled = await mkdtemp(join(tmpdir(), 'nova-v603-reference-'))
try {
  await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: 'src/projects/templates.ts', outDir: compiled, emptyOutDir: false, rollupOptions: { output: { entryFileNames: 'templates.mjs' } } } })
  const templates = await import(`${pathToFileURL(join(compiled, 'templates.mjs')).href}?v=${Date.now()}`)
  const project = templates.createTemplateProject('mouse-knockout', 'Nova 6.0.3 Template Export and Accessibility Audit')
  project.projectSettings.build.gameName = 'Mouse Knockout'
  const failures = templates.auditTemplateProject(project, 'mouse-knockout')
  if (failures.length) throw new Error(`Mouse Knockout template failed: ${failures.join('; ')}`)
  await mkdir(output, { recursive: true })
  await writeFile(join(output, 'project.nova'), `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(join(output, 'README.md'), `# Nova_A 6.0.3 template export and accessibility audit

Engine **6.0.3**, Project Format 2/schema 29.

Open **project.nova** without changing Build Settings. The Windows x86-64 Game target must select the installed **windows-x64-v1** export template and produce no template-registration error. Build a single portable executable, launch it, move the blue block, clear all eight orange targets, reach 8 / 8, and show the congratulations UI.

The Game HUD, score, instructions, congratulations panel, and congratulations text are passive visual nodes. They must not enter keyboard/gamepad focus or produce accessible-name and duplicate-reading-order findings. Interactive UI authored in Interface uses explicit roles, labels, reachable focus, and positive unique order; order 0 remains automatic scene order.

At 1024 × 640 through 2560 × 1440, 100% through 200% scale, and English/German/Chinese, every editor block and label remains inside a reachable owning panel. Publisher signing and independent clean-machine/hardware/72-hour evidence remain pending external gates.
`)
  await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ engineVersion: '6.0.3', reference: 'creator-v603-template-export-accessibility', locales: ['en', 'de', 'zh'], uiScales: [1, 1.25, 1.5, 1.75, 2], actions: ['create every startup template unchanged', 'validate registered export template', 'audit passive and interactive UI semantics', 'traverse all editor panels and localized layouts', 'build and launch one portable game'], expected: { exportTemplate: 'windows-x64-v1', buildErrors: 0, buildWarnings: 0, accessibilityErrors: 0, accessibilityWarnings: 0, viewportContained: true, targetCount: 8, finalScore: 8, completionBanner: true, singleFilePortable: true } }, null, 2)}\n`)
  await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion: '6.0.3', status: 'passed', projectFormat: 2, schema: 29, templates: { total: 12, registeredDefault: 'windows-x64-v1' }, accessibility: { passiveHudFocusable: false, automaticReadingOrder: 0, explicitOrderUnique: true }, layout: { minimumViewport: [1024, 640], maximumUiScale: 2, locales: ['en', 'de', 'zh'] }, export: { target: 'windows', architecture: 'x86_64', runtime: 'game', packageIntoExecutable: true, footer: 'NOVAPK2!', hash: 'SHA-256' }, externalCertification: 'pending' }, null, 2)}\n`)
} finally { await rm(compiled, { recursive: true, force: true }) }

const indexPath = join(root, 'reference-projects/README.md')
let index = await readFile(indexPath, 'utf8')
const start = '<!-- NOVA_V603_REFERENCES_START -->', end = '<!-- NOVA_V603_REFERENCES_END -->'
const block = `${start}\n## Nova_A 6.0.3 template/export/accessibility correction project\n\n- [Template export and accessibility audit](projects/creator-v603-template-export-accessibility/README.md) — untouched registered-template export, passive HUD semantics, localized layout traversal, complete Mouse Knockout gameplay, and verified portable Windows output.\n${end}`
const expression = new RegExp(`${start}[\\s\\S]*?${end}`, 'm')
index = expression.test(index) ? index.replace(expression, block) : `${index.trimEnd()}\n\n${block}\n`
await writeFile(indexPath, index, 'utf8')
console.log('Generated the Nova_A v6.0.3 template/export/accessibility reference project.')
