import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'reference-projects/projects/creator-v601-mouse-knockout')
const compiled = await mkdtemp(join(tmpdir(), 'nova-v601-template-'))
try {
  await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: 'src/projects/templates.ts', outDir: compiled, emptyOutDir: false, rollupOptions: { output: { entryFileNames: 'templates.mjs' } } } })
  const templates = await import(`${pathToFileURL(join(compiled, 'templates.mjs')).href}?v=${Date.now()}`)
  const project = templates.createTemplateProject('mouse-knockout', 'Nova Mouse Knockout')
  const failures = templates.auditTemplateProject(project, 'mouse-knockout')
  if (failures.length) throw new Error(`Mouse Knockout template failed: ${failures.join('; ')}`)
  await mkdir(output, { recursive: true })
  await writeFile(join(output, 'project.nova'), `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(join(output, 'README.md'), `# Nova_A 6.0.1 Mouse Knockout

Engine **6.0.1**, Project Format 2/schema 29.

Open **project.nova** in the Nova_A desktop editor. Press **Play**, move the blue player with the mouse, and knock all eight orange runtime-prefab targets outside the active camera. Each target adds one point; the congratulations bar appears at 8 / 8.

The project demonstrates exact world-space pointer conversion from screen coordinates, fixed-step kinematic motion, dynamic-body collision response, valid Prefab v2 runtime spawning, active-camera bounds, signals, session score, targeted UI updates, deferred destruction, and a portable Windows game build.

Follow the complete localized workflow in **manual/MANUAL.en.md**, **manual/MANUAL.de.md**, or **manual/MANUAL.zh-CN.md** under **Nova_A 6.0.1**.

External code signing, independent clean-machine lifecycle, second-machine reproducibility, and the real 72-hour soak remain pending external evidence.
`)
  await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ engineVersion: '6.0.1', reference: 'creator-v601-mouse-knockout', actions: ['open project', 'save', 'play', 'move pointer in game view', 'collide with eight targets', 'observe score 8 / 8', 'observe congratulations bar', 'stop', 'build and run portable application'], expected: { playerUsesWorldPointer: true, targetCount: 8, score: 8, completionBanner: true, runtimeSpawning: true, authoredStateRestoredAfterStop: true, portableBuildConfigured: true } }, null, 2)}\n`)
  await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion: '6.0.1', status: 'passed', projectFormat: 2, schema: 29, scene: 'Mouse Knockout Arena', fixedTickHz: 60, gravity: 0, targetPrefabVersion: 2, targetCount: 8, scorePerTarget: 1, finalScore: 8, completionBanner: 'Congratulations!  All targets cleared.', externalCertification: 'pending' }, null, 2)}\n`)
} finally { await rm(compiled, { recursive: true, force: true }) }

const indexPath = join(root, 'reference-projects/README.md')
let index = await readFile(indexPath, 'utf8')
const start = '<!-- NOVA_V601_REFERENCES_START -->', end = '<!-- NOVA_V601_REFERENCES_END -->'
const block = `${start}\n## Nova_A 6.0.1 playable correction project\n\n- [Mouse Knockout](projects/creator-v601-mouse-knockout/README.md) — world-space mouse control, physics collisions, runtime target prefabs, score, completion UI, and portable Windows configuration.\n${end}`
const expression = new RegExp(`${start}[\\s\\S]*?${end}`, 'm')
index = expression.test(index) ? index.replace(expression, block) : `${index.trimEnd()}\n\n${block}\n`
await writeFile(indexPath, index, 'utf8')
console.log('Generated the Nova_A v6.0.1 Mouse Knockout reference project.')
