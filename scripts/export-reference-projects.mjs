import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'reference-projects')
const projectsDirectory = join(output, 'projects')
const pluginsDirectory = join(output, 'plugins', 'hello-plugin')
await mkdir(projectsDirectory, { recursive: true })
await mkdir(pluginsDirectory, { recursive: true })

async function writeProjectBundle(slug, project, demonstrates) {
  const directory = join(projectsDirectory, slug)
  await mkdir(directory, { recursive: true })
  const source = `${JSON.stringify(project, null, 2)}\n`
  await writeFile(join(directory, 'project.nova'), source, 'utf8')
  const entityCount = (project.scenes ?? []).reduce((total, scene) => total + (scene.entities?.length ?? 0), 0)
  await writeFile(join(directory, 'expected-output.json'), `${JSON.stringify({ engineVersion: '3.2.0', schema: 23, projectName: project.projectMetadata?.name ?? project.name ?? slug, minimumScenes: project.scenes?.length ?? 0, minimumEntities: entityCount, expectedValidation: slug === 'data-foundation-validation' ? 'repair-required' : 'pass', demonstrates }, null, 2)}\n`, 'utf8')
  await writeFile(join(directory, 'test-controls.json'), `${JSON.stringify({ open: 'Project Manager > Open Project > project.nova', run: 'Top action bar > Play; Pause; Step; Stop', validate: 'Project Health must report no blocking project-format error', export: 'Build Settings > Overview > Build', command: `pnpm export -- --project ./reference-projects/projects/${slug}/project.nova --target web --profile release --output ./Builds/reference-${slug}` }, null, 2)}\n`, 'utf8')
  await writeFile(join(directory, 'README.md'), `# ${project.projectMetadata?.name ?? slug}\n\nEngine **3.2.0**, Project Format 2, schema 23.\n\nDemonstrates: ${demonstrates.join(', ')}.\n\n1. Open \`project.nova\` from Project Manager.\n2. Confirm Project Health has no blocking format error.\n3. Use Play, Pause, Step, and Stop; compare the scene/entity minimums with \`expected-output.json\`.\n4. Run the validation export:\n\n\`\`\`powershell\npnpm export -- --project ./reference-projects/projects/${slug}/project.nova --target web --profile release --output ./Builds/reference-${slug}\n\`\`\`\n\nThe exact keyboard and UI controls are recorded in \`test-controls.json\`.\n`, 'utf8')
}

if (!globalThis.btoa) globalThis.btoa = value => Buffer.from(value, 'binary').toString('base64')
const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
try {
  const { PROJECT_TEMPLATES, createTemplateProject } = await server.ssrLoadModule('/src/projects/templates.ts')
  for (const descriptor of PROJECT_TEMPLATES) {
    const project = createTemplateProject(descriptor.id, `Nova_A ${descriptor.name} Reference`)
    await writeFile(join(projectsDirectory, `${descriptor.id}.nova`), `${JSON.stringify(project, null, 2)}\n`, 'utf8')
    await writeProjectBundle(descriptor.id, project, descriptor.features)
  }
  const recoveryProject = createTemplateProject('empty', 'Workspace and Recovery Validation')
  await writeFile(join(projectsDirectory, 'workspace-recovery-validation.nova'), `${JSON.stringify(recoveryProject, null, 2)}\n`, 'utf8')
  await writeProjectBundle('workspace-recovery-validation', recoveryProject, ['workspace import/export', 'docking', '100-step history', 'autosave recovery', 'safe layout', 'read-only recovery'])
} finally {
  await server.close()
}

const dataFoundationSource = await readFile(join(projectsDirectory, 'data-foundation-validation.nova'), 'utf8')
await writeProjectBundle('data-foundation-validation', JSON.parse(dataFoundationSource), ['manifest and directory policy', 'nested scenes', 'nested prefabs', 'per-property overrides', 'imported artifact hashes', 'dependency graph', 'missing-resource repair'])

// Minimal, dependency-free Plugin API 2 WASM. It exports the required API
// version and initialization functions and deliberately has no permissions.
const wasm = Uint8Array.from([
  0x00,0x61,0x73,0x6d,0x01,0x00,0x00,0x00,
  0x01,0x05,0x01,0x60,0x00,0x01,0x7f,
  0x03,0x03,0x02,0x00,0x00,
  0x07,0x2e,0x02,
  0x17,0x6e,0x6f,0x76,0x61,0x5f,0x70,0x6c,0x75,0x67,0x69,0x6e,0x5f,0x61,0x70,0x69,0x5f,0x76,0x65,0x72,0x73,0x69,0x6f,0x6e,0x00,0x00,
  0x10,0x6e,0x6f,0x76,0x61,0x5f,0x70,0x6c,0x75,0x67,0x69,0x6e,0x5f,0x69,0x6e,0x69,0x74,0x00,0x01,
  0x0a,0x0b,0x02,0x04,0x00,0x41,0x02,0x0b,0x04,0x00,0x41,0x01,0x0b
])
if (!WebAssembly.validate(wasm)) throw new Error('The generated reference plugin is not valid WebAssembly.')
await writeFile(join(pluginsDirectory, 'hello-plugin.wasm'), wasm)
await writeFile(join(pluginsDirectory, 'plugin.json'), `${JSON.stringify({
  id: 'top.whitelists.novaa.samples.hello', name: 'Hello Plugin API 2', version: '1.0.0', apiVersion: 2,
  engine: '>=3.0.0 <4.0.0', entry: 'hello-plugin.wasm', entryType: 'wasm', permissions: [], enabled: true,
  projectEnabled: true, sha256: createHash('sha256').update(wasm).digest('hex'), signature: '', publicKey: '', contributions: {}
}, null, 2)}\n`, 'utf8')

await writeFile(join(output, 'workspace-recovery-validation.nova-workspaces'), `${JSON.stringify({
  format: 'nova-workspaces', version: 2,
  workspaces: [{ id: 'validation-layout', name: 'Recovery Validation', page: 'scene', hierarchyVisible: true, inspectorVisible: true, bottomPanelVisible: true, bottomPanelOpen: true, bottomPanelTab: 'project', bottomPanelHeight: 300, hierarchyWidth: 260, inspectorWidth: 310, hierarchyDock: 'left', inspectorDock: 'right' }]
}, null, 2)}\n`, 'utf8')

await writeFile(join(output, 'README.md'), `# Nova_A 3.2 reference projects

These are generated, schema-valid source projects. Open any \`.nova\` file through **File → Import Project**, inspect it, press **Play**, run its project tests, and export it from **Build Settings**.

| Project | Demonstrates |
| --- | --- |
| \`empty.nova\` | Camera, input map, scene editing, save/load, and build settings |
| \`platformer.nova\` | Platformer movement, collisions, tilemap, animation, audio, lighting/shadows, UI, scripts, and export |
| \`top-down.nova\` | Top-down input, prefabs, particles, triggers, scene transitions, and Save API |
| \`physics-sandbox.nova\` | Rigid bodies, materials, joints, Rope2D, collision diagnostics, and physics monitoring |
| \`ui-showcase.nova\` | Responsive UI, text input, themes, localization, focus navigation, and audio mixer |
| \`networked-optional.nova\` | Opt-in networking package, replication, prediction, diagnostics, and headless test configuration |
| \`workspace-recovery-validation.nova\` | Workspace import/export, docking, 100-step undo, autosave recovery, safe layout, and read-only recovery qualification |
| \`data-foundation-validation.nova\` | Manifest, nested scenes/prefabs, overrides, imported hashes, dependency graph, and missing-resource repair |

\`plugins/hello-plugin\` is a minimal, permission-free Plugin API 2 package. Import its manifest in **Packages → Plugin API** and select the included WASM entry. Plugin failures are isolated and can be bypassed with Safe Mode.

Import \`workspace-recovery-validation.nova-workspaces\` from **View → Manage Workspaces**. The validation project is deliberately small enough to exercise repeated edits, 100 undo/redo operations, autosave snapshots, forced termination, safe-layout startup, and monitor recovery without unrelated content noise.

Generated by \`pnpm references\`. Do not hand-edit generated project files; edit \`src/projects/templates.ts\` and regenerate them.
`, 'utf8')

console.log('Generated eight audited source projects, a workspace layout fixture, and one Plugin API 2 reference package.')
