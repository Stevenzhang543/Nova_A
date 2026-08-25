import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const projectsRoot = join(root, 'reference-projects', 'projects')
const fixtures = [
  { slug: 'physics-v45-platformer', source: 'platformer-character', name: 'Nova_A 4.5 Platformer Physics', demonstrates: ['fixed-step input separation', 'slopes, steps, snap and moving-platform transfer', 'floor, wall and ceiling classification'], ids: ['PHY-CHAR-001', 'PHY-CHAR-002', 'PHY-CHAR-004'] },
  { slug: 'physics-v45-top-down', source: 'top-down-character', name: 'Nova_A 4.5 Top-down Physics', demonstrates: ['normalized two-axis character velocity', 'named-layer interaction', 'fixed-profile consistency'], ids: ['PHY-CHAR-006', 'PHY-PROFILE-001'] },
  { slug: 'physics-v45-queries-triggers', source: 'trigger-showcase', name: 'Nova_A 4.5 Queries and Triggers', demonstrates: ['ray, point, overlap, sweep, nearest and contact queries', 'trigger enter, stay and exit', 'stable callback ordering'], ids: ['PHY-QUERY-001', 'PHY-EVENT-001'] },
  { slug: 'physics-v45-joints', source: 'joint-showcase', name: 'Nova_A 4.5 Joint Laboratory', demonstrates: ['distance, revolute, prismatic, weld, spring and motor joints', 'limits, anchors, connected collision and break telemetry'], ids: ['PHY-JOINT-001', 'PHY-JOINT-004'] },
  { slug: 'physics-v45-rope2d', source: 'physics-sandbox', name: 'Nova_A 4.5 Rope2D Laboratory', demonstrates: ['Rope2D segment count, compliance, damping and collision', 'endpoint-owner exclusion and third-body contacts', 'break link and fragment behavior'], ids: ['PHY-ROPE-001', 'PHY-ROPE-003', 'PHY-ROPE-005'] },
  { slug: 'physics-v45-diagnostics', source: 'stacking-test', name: 'Nova_A 4.5 Physics Diagnostics', demonstrates: ['virtual body monitor, sorting, pins and sparklines', 'collision and constraint timelines', 'capture export and snapshot comparison'], ids: ['PHY-DIAG-001', 'PHY-DIAG-004'] }
]

function uuidFor(slug) {
  const hex = createHash('sha256').update(`Nova_A/v4.5/${slug}`).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

const profile = { id: 'Balanced', name: 'Balanced', tickRate: 60, maxCatchUpSteps: 8, minimumSubsteps: 8, velocityIterations: 20, positionIterations: 16, interpolation: 'Interpolate', droppedTimePolicy: 'Drop', sleepLinearThreshold: .001, sleepAngularThreshold: .001, timeToSleep: .5, physicsBudgetMs: 4 }

for (const fixture of fixtures) {
  const sourceDirectory = join(projectsRoot, fixture.source), outputDirectory = join(projectsRoot, fixture.slug)
  await mkdir(outputDirectory, { recursive: true })
  await cp(sourceDirectory, outputDirectory, { recursive: true, force: true })
  const projectPath = join(outputDirectory, 'project.nova'), project = JSON.parse(await readFile(projectPath, 'utf8'))
  const projectUuid = uuidFor(fixture.slug)
  project.engineVersion = '4.5.0'
  project.projectMetadata = { ...project.projectMetadata, id: projectUuid, name: fixture.name, updatedAt: '2026-08-24T00:00:00.000Z', template: fixture.slug }
  project.manifest = { ...project.manifest, projectUuid, name: fixture.name }
  project.projectSettings = { ...project.projectSettings, physics: { profile, layers: project.scenes?.[0]?.globalSettings?.layers ?? [], collisionMatrix: project.scenes?.[0]?.globalSettings?.collisionMatrix ?? [] } }
  for (const scene of project.scenes ?? []) {
    scene.globalSettings = { ...scene.globalSettings, tickRate: profile.tickRate, maxCatchUpSteps: profile.maxCatchUpSteps, interpolation: profile.interpolation, profile }
  }
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`, 'utf8')
  const entityCount = (project.scenes ?? []).reduce((total, scene) => total + (scene.entities?.length ?? 0), 0)
  await writeFile(join(outputDirectory, 'expected-output.json'), `${JSON.stringify({ engineVersion: '4.5.0', schema: 29, projectName: fixture.name, minimumScenes: project.scenes?.length ?? 0, minimumEntities: entityCount, expectedValidation: 'pass', demonstrates: fixture.demonstrates, testIds: fixture.ids }, null, 2)}\n`, 'utf8')
  await writeFile(join(outputDirectory, 'test-controls.json'), `${JSON.stringify({ open: 'Project Manager > Open Project > project.nova', run: 'Top action bar > Play; Pause; Step; Stop', monitor: 'Debug > Physics Monitor', profile: 'Manage > Project Settings > Physics > Quality profile', capture: 'Physics Monitor > Captures > Capture', testIds: fixture.ids, command: `pnpm nova export --project ./reference-projects/projects/${fixture.slug}/project.nova --target web --profile release --output ./Builds/reference-${fixture.slug} --cache validate --jsonl` }, null, 2)}\n`, 'utf8')
  await writeFile(join(outputDirectory, 'README.md'), `# ${fixture.name}\n\nEngine **4.5.0**, Project Format 2, schema 29.\n\n## Expected behavior\n\n${fixture.demonstrates.map(item => `- ${item}`).join('\n')}\n\n## Test procedure and IDs\n\n1. Open \`project.nova\` and confirm Project Health has no blocking format error.\n2. Run Play, Pause, single Step, and Stop using the stable controls in \`test-controls.json\`.\n3. Select Balanced, then Accurate and Fast; repeat the test IDs: ${fixture.ids.join(', ')}.\n4. Inspect Physics Monitor/API values and compare them with \`expected-output.json\`.\n5. Export Windows x64 and web using the command recorded in \`test-controls.json\`.\n\n## Requirements\n\n- Required packages: none; Nova_A core only.\n- Target platforms: Windows x86-64 and the documented Chromium web runtime.\n- The project, expected output, test controls, and test IDs are version pinned.\n\n## Known limitations\n\nThis focused fixture proves only its listed behavior. External clean-machine, browser-matrix, signing, real wall-clock 24-hour soak, and physical accessibility gates remain release-environment evidence.\n`, 'utf8')
}

// Keep retained 4.3/4.4 focused fixtures executable under the current engine
// without changing the historical workflow named by their directory.
for (const entry of await readdir(projectsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const directory = join(projectsRoot, entry.name)
  for (const name of ['project.nova', 'expected-output.json', 'test-controls.json', 'README.md']) {
    try {
      const path = join(directory, name), source = await readFile(path, 'utf8')
      await writeFile(path, source.replaceAll('4.4.0', '4.5.0'), 'utf8')
    } catch { /* Not every legacy fixture is a directory bundle. */ }
  }
}

console.log(`Generated ${fixtures.length} Nova_A v4.5 physics reference projects.`)
