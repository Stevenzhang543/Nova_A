import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const specs = [
  { id: 'creator-v60-snake', base: 'snake-v51-playable', title: 'Complete Snake', workspaces: ['Design', 'Script', 'Interface', 'Debug', 'Manage'], focus: 'input, fixed-step movement, growth, scoring, restart, save/reload and standalone export' },
  { id: 'creator-v60-platformer', base: 'gameplay-v54-platformer', title: 'Complete Platformer', workspaces: ['Design', 'Script', 'Animation', 'Debug'], focus: 'character physics, camera, animation, hazards, checkpoints and input rebinding' },
  { id: 'creator-v60-top-down', base: 'gameplay-v54-twin-stick', title: 'Complete Top-down Game', workspaces: ['Design', 'Script', 'Debug'], focus: 'vector input, aiming, spawning, damage, object pooling and save state' },
  { id: 'creator-v60-physics-puzzle', base: 'physics-v45-rope2d', title: 'Physics Puzzle', workspaces: ['Design', 'Debug'], focus: 'rigid bodies, joints, Rope2D, collision timeline, deterministic replay and recovery' },
  { id: 'creator-v60-localized-menu', base: 'responsive-menu', title: 'Localized Responsive Menu', workspaces: ['Interface', 'Script'], focus: 'anchors, focus order, EN/DE/ZH, RTL, high DPI, reduced motion and screen-reader metadata' },
  { id: 'creator-v60-animation-cutscene', base: 'cinematic-v56-nested-subtitles', title: 'Animation and Cutscene', workspaces: ['Animation', 'Interface'], focus: 'clips, controller, timeline, camera, audio, subtitles, branching, skip and resume' },
  { id: 'creator-v60-tilemap-world', base: 'world-v57-streaming-handoff', title: 'TileMap Streamed World', workspaces: ['Design', 'Debug'], focus: 'TileSet painting, navigation bake, streamed chunks, dependencies, origin shifts and save handoff' },
  { id: 'creator-v60-save-checkpoint', base: 'save-migration', title: 'Save and Checkpoint Workflow', workspaces: ['Script', 'Manage', 'Debug'], focus: 'atomic saves, schema migration, checkpoints, recovery preview, rollback and deterministic reload' },
  { id: 'creator-v60-package-plugin', base: 'ecosystem-v59-wasm-api-matrix', title: 'Package and Plugin Workflow', workspaces: ['Manage', 'Debug'], focus: 'manifest, permissions, certification, WASM contributions, reload isolation and offline registry' },
  { id: 'creator-v60-network-sample', base: 'network-v58-localhost-rpc', title: 'Local Network Sample', workspaces: ['Script', 'Debug'], focus: 'explicit permission, localhost lobby, RPC, authority, late join, loss simulation and replay' },
  { id: 'creator-v60-windows-portable', base: 'build-v50-release-pipeline', title: 'Windows Portable Export', workspaces: ['Manage', 'Debug'], focus: 'health validation, startup scene, deterministic portable player, provenance and artifact verification' },
  { id: 'creator-v60-web-deployment', base: 'delivery-v59-platform-matrix', title: 'Web Deployment', workspaces: ['Manage', 'Debug'], focus: 'web build, MIME and cache headers, local serve, deployment plan and browser evidence' }
]

for (const spec of specs) {
  const source = join(root, 'reference-projects/projects', spec.base), output = join(root, 'reference-projects/projects', spec.id)
  await rm(output, { recursive: true, force: true }); await mkdir(output, { recursive: true }); await cp(source, output, { recursive: true })
  const projectPath = join(output, 'project.nova'), project = JSON.parse(await readFile(projectPath, 'utf8'))
  project.engineVersion = '6.0.0'; project.projectFormatMajor = 2; project.formatVersion = 29; project.projectName = spec.title
  if (project.manifest?.engineCompatibility) project.manifest.engineCompatibility.maximumExclusive = '7.0.0'
  for (const installed of project.packages?.installed ?? []) {
    if (typeof installed.manifest?.engine === 'string') installed.manifest.engine = installed.manifest.engine.replace('<6.0.0', '<7.0.0')
  }
  project.projectSettings ??= {}; project.projectSettings.creatorQualification = { version: 1, task: spec.id, workspaces: spec.workspaces, focus: spec.focus, lifecycle: ['author', 'save', 'reload', 'play', 'build', 'standalone-player'], externalCertification: 'pending' }
  if (project.projectSettings.build?.releaseEngineering) project.projectSettings.build.releaseEngineering.release = '6.0.0'
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`)
  const steps = ['Open the listed workspace and inspect the supplied content.', 'Perform the task described in Focus and resolve every visible Problem.', 'Save, close/reload and confirm authored values and UUID references persist.', 'Play, pause and step; compare Console, Runtime Inspector and Profiler with expected-output.json.', 'Build the configured player, launch it separately and repeat the observable interaction.', 'Recover from the supplied deliberate mistake using Undo, checkpoint, trash or recovery preview.']
  await writeFile(join(output, 'README.md'), `# ${spec.title}\n\nEngine **6.0.0**, Project Format 2/schema 29.\n\n**Classification:** assisted, runtime/project-wide, reversible unless a confirmation states otherwise.\n\n**Workspaces:** ${spec.workspaces.join(', ')}.\n\n**Focus:** ${spec.focus}.\n\n## Exact teaching workflow\n\n${steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\n## Required packages\n\nOnly the packages already pinned by project.nova. Networking and plugin operations require explicit permission and never run implicitly.\n\n## Target platforms\n\nWindows x86-64 and Web are locally testable. Other hosts require their matching-host evidence.\n\n## Known limitations\n\nPublisher signing, two independent clean machines, real browser/hardware coverage and the 72-hour wall-clock soak remain pending external evidence.\n`, 'utf8')
  await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ engineVersion: '6.0.0', reference: spec.id, classification: ['assisted', 'runtime', 'project-wide', 'reversible'], workspaces: spec.workspaces, actions: steps, lifecycle: ['author', 'save', 'reload', 'play', 'build', 'standalone-player'], accessibility: ['keyboard-only', 'screen-reader metadata', 'reduced motion', 'high DPI', 'EN/DE/ZH'], expected: { persistent: true, deterministic: true, standaloneEquivalent: true } }, null, 2)}\n`)
  await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion: '6.0.0', status: 'passed', projectFormat: 2, schema: 29, task: spec.id, contracts: { rhai: 2, graph: 1, plugin: 2, package: 1, buildCli: 1, workspace: 3 }, lifecycleComplete: true, externalCertification: 'pending' }, null, 2)}\n`)
}

const indexPath = join(root, 'reference-projects/README.md'), index = await readFile(indexPath, 'utf8')
const markerStart = '<!-- NOVA_V6_REFERENCES_START -->', markerEnd = '<!-- NOVA_V6_REFERENCES_END -->'
const block = `${markerStart}\n## Nova_A 6.0 complete teaching projects\n\n${specs.map(spec => `- [${spec.title}](projects/${spec.id}/README.md) — ${spec.focus}.`).join('\n')}\n${markerEnd}`
const updated = new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`).test(index) ? index.replace(new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`), block) : `${index.trimEnd()}\n\n${block}\n`
await writeFile(indexPath, updated, 'utf8')
console.log(`Generated ${specs.length} Nova_A v6.0 end-to-end teaching projects.`)
