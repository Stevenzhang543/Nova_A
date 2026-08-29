import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'reference-projects/projects/snake-v51-playable')
Object.defineProperty(globalThis, 'navigator', { configurable:true, value:{ platform:'Win32', hardwareConcurrency:8 } })
globalThis.window ??= { addEventListener(){}, removeEventListener(){}, dispatchEvent(){} }
globalThis.localStorage ??= { getItem(){ return null }, setItem(){}, removeItem(){} }
const server = await createServer({ root, appType:'custom', logLevel:'silent', server:{ middlewareMode:true } })
await server.watcher.close()
try {
  const { createTemplateProject, auditTemplateProject } = await server.ssrLoadModule('/src/projects/templates.ts')
  const project = createTemplateProject('snake', 'Nova Snake')
  const failures = auditTemplateProject(project, 'snake')
  if (failures.length) throw new Error(failures.join('; '))
  await mkdir(output, { recursive:true })
  await writeFile(join(output, 'project.nova'), `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(join(output, 'README.md'), `# Snake v5.1 playable reference\n\nEngine **5.1.0**, Project Format 2, schema 29.\n\nRequired packages: None; Nova_A core only.\n\nTarget platforms: Windows x86-64 and Web (Tier 1). The single-file executable is a matching-host Windows build.\n\nKnown limitations: this focused fixture does not certify publisher signing, independent clean-machine launch, other desktop hosts, gamepad hardware, or a long-duration soak.\n\n## Purpose\n\nOpen \`project.nova\`, press Play, and steer with Arrow keys, WASD, or a standard gamepad D-pad. The head moves on a timer; body segments follow through signals; the food uses a trigger and deterministic random relocation; the score listens for the score signal. Build Settings defaults to a single portable Windows executable.\n\n## Validation\n\nCreate/open, Play, steer in four directions, collect food, rebind one action, Build & Run, then launch the copied executable without a sidecar pack.\n`)
  await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ version:1, engineVersion:'5.1.0', actions:[{ action:'Play', expected:'Runtime starts without script errors' },{ action:'Arrow/WASD/D-pad', expected:'Direction changes without reversing into the next segment' },{ action:'Collect food', expected:'Food relocates and score increments' },{ action:'Build portable', expected:'One executable launches in player mode' }] }, null, 2)}\n`)
  await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion:'5.1.0', template:'snake', scripts:6, bodySegments:3, inputActions:4, portableDefault:true, status:'passed' }, null, 2)}\n`)
} finally {
  await Promise.race([server.close(), new Promise(resolve => setTimeout(resolve, 2_000))])
}

// Release archives carry old focused fixtures forward. Keep their machine and
// human metadata on the current compatible engine authority instead of
// shipping a mixed-version reference catalog.
const projects = join(root, 'reference-projects/projects')
for (const entry of await readdir(projects, { withFileTypes:true })) {
  if (!entry.isDirectory()) continue
  const directory = join(projects, entry.name)
  try {
    const projectPath = join(directory, 'project.nova')
    const project = JSON.parse(await readFile(projectPath, 'utf8'))
    project.engineVersion = '5.1.0'
    if (project.projectSettings?.build?.releaseEngineering) project.projectSettings.build.releaseEngineering.release = '5.1.0'
    await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`)
    const readmePath = join(directory, 'README.md')
    const readme = await readFile(readmePath, 'utf8')
    await writeFile(readmePath, readme.replace(/Engine \*\*\d+\.\d+\.\d+\*\*/g, 'Engine **5.1.0**'))
    for (const name of ['expected-output.json', 'test-controls.json']) {
      const path = join(directory, name)
      const document = JSON.parse(await readFile(path, 'utf8'))
      document.engineVersion = '5.1.0'
      await writeFile(path, `${JSON.stringify(document, null, 2)}\n`)
    }
  } catch (error) {
    throw new Error(`Unable to refresh v5.1 reference metadata for ${entry.name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
console.log('Generated the Nova_A v5.1.0 playable Snake reference project.')
