import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const source = JSON.parse(await readFile(join(root, 'reference-projects/projects/creator-v670-touch-platformer/project.nova'), 'utf8'))
const target = join(root, 'reference-projects/projects/creator-v680-large-world')
await mkdir(target, { recursive: true })
source.engineVersion = '6.8.0'
source.projectName = 'Nova 6.8 Large-world Playground'
Object.assign(source.projectMetadata, { name: source.projectName, template: 'creator-v680-large-world', updatedAt: '2026-09-01T00:00:00.000Z', description: 'Playable no-code platformer plus deterministic large-world, worker, streaming and low-end performance qualification.' })
source.projectSettings.production ??= {}
source.projectSettings.production.performance = {
  ...(source.projectSettings.production.performance ?? {}), traceCapacity: 600, frameBudgetMs: 16.667,
  adaptiveQuality: true, frameWorkBudgetMs: 2.5, streamingBudgetMs: 1.5,
  maximumCommandsPerFrame: 2048, reactivePublishInterval: 4, spatialCellSize: 16
}
source.projectSettings.production.jobs = { ...(source.projectSettings.production.jobs ?? {}), maxWorkers: 2, maxQueued: 256, timeoutMs: 15_000 }
source.projectSettings.build.gameName = source.projectName
source.projectSettings.build.platform.version = '6.8.0'
source.projectSettings.build.platform.identifier = 'top.whitelists.novaa.largeworld'
await writeFile(join(target, 'project.nova'), `${JSON.stringify(source, null, 2)}\n`)
await writeFile(join(target, 'README.md'), `# Nova_A 6.8 large-world playground

Engine **6.8.0** · Project Format 2/schema 29.

This remains the complete no-code touch/keyboard/gamepad platformer from 6.7, so Play and exported-player behavior are directly comparable. Use Debug → Profiler while running the compact 10k/50k/100k manifests from \`release-fixtures/v6.8.0\`. Search and drag in Design while navigation/streaming work is active; switch workspaces repeatedly; cancel/supersede worker jobs; then save, reload and build. Adaptive quality is presentation-only.
`)
await writeFile(join(target, 'test-controls.json'), `${JSON.stringify({ engineVersion: '6.8.0', reference: 'creator-v680-large-world', fixtures: [10_000, 50_000, 100_000], controls: { move: 'A/D, gamepad axis, or virtual stick', jump: 'Space, gamepad button, or virtual Jump' }, workflow: ['capture baseline', 'run fixture verification', 'search hierarchy/assets during work', 'drag/select/draw', 'switch all workspaces', 'cancel and supersede jobs', 'save/reload', 'play/pause/step', 'build standalone player'], expected: { playable: true, fixedStepUnchanged: true, animationsRetained: true, virtualizedLists: true, staleResultsRejected: true, adaptivePresentationOnly: true } }, null, 2)}\n`)
await writeFile(join(target, 'expected-output.json'), `${JSON.stringify({ engineVersion: '6.8.0', status: 'passed', deterministicFixtures: 3, maximumObjects: 100_000, workerFallback: 'equivalent', streaming: 'frame-budgeted-and-not-dropped', external: ['real low-end hardware', 'clean-machine lifecycle', 'second-machine reproduction', 'real 72-hour soak'] }, null, 2)}\n`)
const indexPath = join(root, 'reference-projects/README.md')
let index = await readFile(indexPath, 'utf8')
const marker = '## Nova_A 6.8.0 large-world project'
if (!index.includes(marker)) index += `\n\n${marker}\n\n- \`creator-v680-large-world\` — playable no-code platformer and 10k/50k/100k deterministic performance workflow with worker fallback, frame-budgeted streaming, virtualized editor lists and adaptive-presentation evidence.\n`
await writeFile(indexPath, index)
console.log('Generated Nova_A v6.8.0 large-world reference project.')
