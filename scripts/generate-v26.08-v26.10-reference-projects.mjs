import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const projectsRoot = join(root, 'reference-projects', 'projects')
const projectFormatMajor = 2
const schemaVersion = 29
const releaseOrder = new Map([['26.08', 8], ['26.09', 9], ['26.10', 10]])
const specifications = [
  {
    release: '26.08', engineVersion: '26.8.0', id: 'platform-v2608-touch-pen-accessibility', source: 'creator-v670-touch-platformer',
    title: 'Nova 26.08 Touch, Pen, and Accessibility Playground', authoring: 'no-code input actions',
    goals: ['keyboard, mouse, touch and compatibility-event deduplication', 'gesture and virtual-control input', 'gamepad remapping, calibration and prompts', 'pen pressure, tilt, twist, eraser and buttons', 'safe-area/orientation/DPI previews', 'semantic keyboard and screen-reader traversal']
  },
  {
    release: '26.08', engineVersion: '26.8.0', id: 'server-v2608-headless-authority', source: 'multiplayer-v2607-headless-authority', headless: true,
    title: 'Nova 26.08 Headless Authority', authoring: 'permission-gated headless server',
    goals: ['validate the retained Network Protocol 2 policy', 'export one embedded Windows authority', 'admit a loopback client and send snapshots', 'reject missing packages, grants and unsafe players', 'reconnect without stale peer state']
  },
  {
    release: '26.09', engineVersion: '26.9.0', id: 'performance-v2609-large-world', source: 'creator-v680-large-world',
    title: 'Nova 26.09 100k Large-world Playground', authoring: 'data-oriented no-code scene',
    goals: ['10k/50k/100k deterministic fixture behavior', 'dirty transform and component membership reuse', 'worker cancellation, timeout and fallback parity', 'frame-budgeted streaming and navigation', 'presentation-only adaptive quality', 'input-to-pixel and 1% low evidence']
  },
  {
    release: '26.09', engineVersion: '26.9.0', id: 'collaboration-v2609-semantic-merge', source: 'creator-v690-semantic-collaboration',
    title: 'Nova 26.09 Semantic Collaboration Playground', authoring: 'semantic change lists',
    goals: ['ownership-aware change lists', 'independent scene and graph auto-merge', 'same-property conflict resolution', 'delete and reorder preservation', 'stale-generation detection', 'canonical validation after resolution']
  },
  {
    release: '26.09', engineVersion: '26.9.0', id: 'server-v2609-headless-authority', source: 'multiplayer-v2607-headless-authority', headless: true,
    title: 'Nova 26.09 Headless Authority', authoring: 'permission-gated headless server',
    goals: ['retain server output during performance work', 'validate the embedded package and local player hash', 'serve deterministic loopback snapshots', 'reject every negative permission case', 'reconnect after complete cleanup']
  },
  {
    release: '26.10', engineVersion: '26.10.0', id: 'creator-v2610-code-game', source: 'creator-v60-snake',
    title: 'Nova 26.10 Code-authored Snake', authoring: 'Rhai code',
    goals: ['open and run the complete game', 'edit a Rhai movement rule', 'debug a statement and inspect state', 'build Web and Windows players', 'save, reload and replay deterministically']
  },
  {
    release: '26.10', engineVersion: '26.10.0', id: 'creator-v2610-block-game', source: 'visual-scripting-v53-production',
    title: 'Nova 26.10 Block-authored Game', authoring: 'Visual Graph blocks',
    goals: ['author variables, conditions, loops and entity actions', 'navigate, zoom, wire and tidy the graph', 'generate valid Rhai without source loss', 'play and inspect live block values', 'build Web and Windows players']
  },
  {
    release: '26.10', engineVersion: '26.10.0', id: 'creator-v2610-mixed-game', source: 'creator-v604-linked-build-performance',
    title: 'Nova 26.10 Mixed Code and Blocks', authoring: 'linked Rhai and Visual Graph',
    goals: ['select the same asset in Code and Visual modes', 'round-trip supported statements structurally', 'retain unsupported Rhai in explicit lossless blocks', 'edit from either side and preserve identities', 'validate and export the synchronized game']
  },
  {
    release: '26.10', engineVersion: '26.10.0', id: 'server-v2610-headless-authority', source: 'multiplayer-v2607-headless-authority', headless: true,
    title: 'Nova 26.10 Headless Authority', authoring: 'permission-gated headless server',
    goals: ['retain the stable Network Protocol 2 server path', 'validate exact current output authority', 'serve and reconnect loopback clients', 'fail closed on malformed permissions and unsafe paths', 'record honest renderer-disabled WebView scope']
  }
]

const requestedRelease = process.argv.find(value => value.startsWith('--release='))?.slice('--release='.length) ?? await inferReleaseFromAuthority()
const verifyOnly = process.argv.includes('--verify-only')
if (!releaseOrder.has(requestedRelease)) throw new Error('Use --release=26.08, --release=26.09, or --release=26.10.')
const selectedSpecifications = specifications.filter(item => releaseOrder.get(item.release) <= releaseOrder.get(requestedRelease))

async function inferReleaseFromAuthority() {
  const authority = await readFile(join(root, 'src', 'projects', 'projectFormat.ts'), 'utf8')
  const match = authority.match(/NOVA_RELEASE_NAME\s*=\s*['"](26\.(?:08|09|10))['"]/)
  if (!match) throw new Error('Cannot infer the calendar release. Pass --release=26.08, --release=26.09, or --release=26.10.')
  return match[1]
}

function binding(device, code, extra = {}) {
  return { device, code, scale: 1, x: 1, y: 0, gamepad: 0, deviceId: '', deadzone: 0, threshold: 0.0001, invert: false, responseCurve: 'linear', modifiers: [], chord: [], ...extra }
}

function action(name, kind, bindings) {
  return { name, kind, bindings, enabled: true, context: 'Gameplay', map: 'Default', schemes: ['Pen'], interaction: 'press', holdSeconds: 0.35, tapSeconds: 0.25, multiTapCount: 2, consume: false, priority: 0, callback: '' }
}

function authorPenActions(project) {
  project.projectSettings ??= {}
  const existing = Array.isArray(project.projectSettings.inputMap) ? project.projectSettings.inputMap : []
  const penNames = new Set(['PenPressure', 'PenTilt', 'PenTwist', 'PenTip', 'PenBarrel', 'PenEraser'])
  project.projectSettings.inputMap = [
    ...existing.filter(item => !penNames.has(item?.name)),
    action('PenPressure', 'axis', [binding('pen-pressure', 'pressure')]),
    action('PenTilt', 'vector2', [binding('pen-tilt', 'x', { x: 1, y: 0 }), binding('pen-tilt', 'y', { x: 0, y: 1 })]),
    action('PenTwist', 'axis', [binding('pen-twist', 'twist')]),
    action('PenTip', 'button', [binding('pen-button', 'tip')]),
    action('PenBarrel', 'button', [binding('pen-button', 'barrel')]),
    action('PenEraser', 'button', [binding('pen-button', 'eraser')])
  ]
}

function updateCurrentProject(project, specification) {
  project.engineVersion = specification.engineVersion
  project.projectName = specification.title
  project.projectMetadata ??= {}
  project.projectMetadata.name = specification.title
  project.projectMetadata.template = specification.id
  project.projectMetadata.updatedAt = '2026-09-04T00:00:00.000Z'
  project.manifest ??= {}
  project.manifest.name = specification.title
  project.manifest.schemaVersion = schemaVersion
  project.manifest.engineCompatibility = { minimum: '7.0.0', maximumExclusive: '27.0.0' }
  const build = project.projectSettings?.build
  if (build) {
    build.gameName = specification.title
    build.target = 'windows'
    build.architecture = 'x86_64'
    build.runtimeMode = specification.headless ? 'headless-server' : 'game'
    build.packageIntoExecutable = true
    build.delivery ??= {}
    build.delivery.exportTemplate = specification.headless ? 'windows-headless-x64-v1' : 'windows-x64-v1'
    build.platform ??= {}
    build.platform.version = specification.engineVersion
    build.platform.identifier = `top.whitelists.novaa.${specification.id.replace(/[^a-z0-9]/gi, '').toLowerCase()}`
    if (build.releaseEngineering) build.releaseEngineering.release = specification.release
  }
  if (specification.id === 'platform-v2608-touch-pen-accessibility') authorPenActions(project)
  if (specification.headless && project.projectSettings?.production?.networking) {
    const network = project.projectSettings.production.networking
    network.sessionName = specification.title
    network.playerName = 'Authority'
    network.role = 'server'
    network.enabled = true
    network.permissionGranted = true
    network.autoStart = true
  }
  return project
}

function behaviorsFor(specification) {
  return specification.goals.map((description, index) => ({
    id: `${specification.id}-behavior-${index + 1}`,
    description,
    expectedOutcome: `The ${specification.authoring} path visibly demonstrates ${description}, survives save/reload, and fails with an actionable diagnostic when a required capability is unavailable.`
  }))
}

function controlsFor(specification) {
  const behaviors = behaviorsFor(specification)
  const actions = behaviors.map((behavior, index) => ({ action: `${index + 1}. Demonstrate ${behavior.description}.`, expected: behavior.expectedOutcome, behaviorId: behavior.id }))
  actions.push({ action: 'Repeat the workflow in English, German, and Chinese at 1024×640 through 3840×2160 and 80–200% UI scale.', expected: 'Text, controls, canvases, popovers, focus order, and scrolling remain contained and keyboard reachable.', behaviorId: `${specification.id}-localized-layout` })
  actions.push({ action: 'Build supported Web and Windows outputs from the unmodified reference.', expected: `Validation passes, the player launches, and output metadata reports public release ${specification.release}, engine ${specification.engineVersion}, Project Format ${projectFormatMajor}, and schema ${schemaVersion}.`, behaviorId: `${specification.id}-build-output` })
  return {
    format: 'nova-reference-test-controls', version: 1,
    publicRelease: specification.release, release: specification.release,
    engineVersion: specification.engineVersion,
    projectFormatMajor, schemaVersion, schema: schemaVersion,
    referenceId: specification.id, reference: specification.id,
    authoring: specification.authoring,
    classification: ['manual', 'runtime', 'save-reload', 'build', 'localized-layout'],
    actions
  }
}

function outputFor(specification, project) {
  return {
    format: 'nova-reference-expected-output', version: 1,
    publicRelease: specification.release, release: specification.release,
    engineVersion: specification.engineVersion,
    projectFormatMajor, projectFormat: projectFormatMajor, schemaVersion, schema: schemaVersion,
    referenceId: specification.id, reference: specification.id,
    authoring: specification.authoring,
    preservedScenes: project.scenes?.length ?? 0,
    preservedAssets: project.assets?.length ?? 0,
    behaviors: behaviorsFor(specification),
    localStructuralVerification: 'required', webOutput: 'required', windowsOutput: 'required',
    independentUserObservation: 'pending-external'
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function projectDocumentsBelow(directory) {
  const documents = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) documents.push(...await projectDocumentsBelow(path))
    else if (entry.isFile() && entry.name.endsWith('.nova')) {
      const document = JSON.parse(await readFile(path, 'utf8'))
      if (document?.projectFormat === 'Nova_A Project Format 2' && Array.isArray(document.scenes)) documents.push({ path, document })
    }
  }
  return documents
}

function assertPenAuthoring(project) {
  const map = new Map(project.projectSettings?.inputMap?.map(item => [item.name, item]) ?? [])
  const expected = [
    ['PenPressure', 'axis', [['pen-pressure', 'pressure']]],
    ['PenTilt', 'vector2', [['pen-tilt', 'x'], ['pen-tilt', 'y']]],
    ['PenTwist', 'axis', [['pen-twist', 'twist']]],
    ['PenTip', 'button', [['pen-button', 'tip']]],
    ['PenBarrel', 'button', [['pen-button', 'barrel']]],
    ['PenEraser', 'button', [['pen-button', 'eraser']]]
  ]
  for (const [name, kind, bindings] of expected) {
    const value = map.get(name)
    assert(value?.kind === kind && value.enabled === true && value.context === 'Gameplay' && value.map === 'Default', `${name} is not an enabled authored ${kind} action.`)
    assert(bindings.every(([device, code]) => value.bindings?.some(item => item.device === device && item.code === code && item.deadzone === 0)), `${name} does not contain its exact zero-dead-zone pen binding.`)
  }
  const tilt = map.get('PenTilt')
  assert(tilt.bindings.find(item => item.code === 'x')?.x === 1 && tilt.bindings.find(item => item.code === 'x')?.y === 0, 'PenTilt X does not author the X vector contribution.')
  assert(tilt.bindings.find(item => item.code === 'y')?.x === 0 && tilt.bindings.find(item => item.code === 'y')?.y === 1, 'PenTilt Y does not author the Y vector contribution.')
  assert(project.projectSettings?.deviceInput?.virtualControls?.length >= 2, 'The platform input reference lost its authored virtual controls.')
}

function assertCompanion(document, format, specification) {
  assert(document?.format === format && document.version === 1, `${specification.id} has an invalid ${format} envelope.`)
  assert(document.publicRelease === specification.release && document.release === specification.release, `${specification.id} has mismatched public release metadata.`)
  assert(document.engineVersion === specification.engineVersion, `${specification.id} has mismatched engine metadata.`)
  assert(document.projectFormatMajor === projectFormatMajor && document.schemaVersion === schemaVersion && document.schema === schemaVersion, `${specification.id} has mismatched Project Format/schema metadata.`)
  assert(document.referenceId === specification.id && document.reference === specification.id, `${specification.id} has mismatched reference identity metadata.`)
}

function assertReference(specification, project, controls, output) {
  assert(project.engineVersion === specification.engineVersion, `${specification.id} project engine version is stale.`)
  assert(project.projectFormatMajor === projectFormatMajor && project.formatVersion === schemaVersion, `${specification.id} project format/schema is stale.`)
  assert(project.projectMetadata?.template === specification.id && project.projectMetadata?.name === specification.title && project.projectName === specification.title, `${specification.id} project identity is inconsistent.`)
  assert(project.manifest?.schemaVersion === schemaVersion && project.manifest?.name === specification.title, `${specification.id} manifest identity/schema is inconsistent.`)
  assert((project.scenes?.length ?? 0) > 0, `${specification.id} has no authored scene.`)
  const build = project.projectSettings?.build
  const expectedTemplate = specification.headless ? 'windows-headless-x64-v1' : 'windows-x64-v1'
  assert(build?.target === 'windows' && build?.architecture === 'x86_64' && build?.runtimeMode === (specification.headless ? 'headless-server' : 'game') && build?.delivery?.exportTemplate === expectedTemplate, `${specification.id} does not contain a self-consistent Windows build tuple and export template.`)
  assertCompanion(controls, 'nova-reference-test-controls', specification)
  assertCompanion(output, 'nova-reference-expected-output', specification)
  assert(Array.isArray(output.behaviors) && output.behaviors.length === specification.goals.length, `${specification.id} expected output does not cover every required behavior.`)
  assert(output.behaviors.every((item, index) => item.id === `${specification.id}-behavior-${index + 1}` && item.description === specification.goals[index] && item.expectedOutcome?.includes(item.description)), `${specification.id} behavior oracles are incomplete or ambiguous.`)
  assert(Array.isArray(controls.actions) && controls.actions.length === specification.goals.length + 2, `${specification.id} controls do not cover behavior, layout, and output workflows.`)
  assert(new Set(controls.actions.map(item => item.behaviorId)).size === controls.actions.length && controls.actions.every(item => item.action && item.expected && item.behaviorId), `${specification.id} controls have missing or duplicate behavioral assertions.`)
  if (specification.id === 'platform-v2608-touch-pen-accessibility') assertPenAuthoring(project)
}

async function writeReference(specification) {
  const source = join(projectsRoot, specification.source)
  const destination = join(projectsRoot, specification.id)
  await mkdir(destination, { recursive: true })
  await cp(source, destination, { recursive: true, force: true })
  const projectPath = join(destination, 'project.nova')
  const project = updateCurrentProject(JSON.parse(await readFile(projectPath, 'utf8')), specification)
  for (const nested of await projectDocumentsBelow(destination)) {
    if (nested.path === projectPath) continue
    await writeFile(nested.path, `${JSON.stringify(updateCurrentProject(nested.document, specification), null, 2)}\n`)
  }
  const controls = controlsFor(specification)
  const output = outputFor(specification, project)
  assertReference(specification, project, controls, output)
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(join(destination, 'README.md'), `# ${specification.title}\n\nPublic release **${specification.release}** · Engine **${specification.engineVersion}** · Project Format ${projectFormatMajor}/schema ${schemaVersion}.\n\nThis is the representative **${specification.authoring}** project. It is copied from a previously qualified playable/reference project and advanced without deleting authored scenes, components, assets, scripts, graphs, animations, controls, or build settings.\n\nUse \`test-controls.json\` for the repeatable user workflow and \`expected-output.json\` for its machine-readable behavior oracles. Automated local checks cover structure and supported output; signing, matching-host platforms, real assistive hardware, independent observation, and a real-duration soak remain external.\n`)
  await writeFile(join(destination, 'test-controls.json'), `${JSON.stringify(controls, null, 2)}\n`)
  await writeFile(join(destination, 'expected-output.json'), `${JSON.stringify(output, null, 2)}\n`)
}

async function verifyReference(specification) {
  const destination = join(projectsRoot, specification.id)
  const [project, controls, output, readme] = await Promise.all([
    readFile(join(destination, 'project.nova'), 'utf8').then(JSON.parse),
    readFile(join(destination, 'test-controls.json'), 'utf8').then(JSON.parse),
    readFile(join(destination, 'expected-output.json'), 'utf8').then(JSON.parse),
    readFile(join(destination, 'README.md'), 'utf8')
  ])
  assertReference(specification, project, controls, output)
  for (const nested of await projectDocumentsBelow(destination)) {
    assert(nested.document.engineVersion === specification.engineVersion && nested.document.formatVersion === schemaVersion, `${specification.id} contains a stale nested project document.`)
  }
  assert(readme.includes(`Public release **${specification.release}**`) && readme.includes(`Engine **${specification.engineVersion}**`) && readme.includes(`Project Format ${projectFormatMajor}/schema ${schemaVersion}`), `${specification.id} README metadata is stale.`)
}

if (!verifyOnly) for (const specification of selectedSpecifications) await writeReference(specification)
for (const specification of selectedSpecifications) await verifyReference(specification)

const readmePath = join(root, 'reference-projects', 'README.md')
const start = '<!-- NOVA_V2608_V2610_REFERENCES_START -->'
const end = '<!-- NOVA_V2608_V2610_REFERENCES_END -->'
if (!verifyOnly) {
  let readme = await readFile(readmePath, 'utf8')
  const lines = selectedSpecifications.map(item => `- [${item.title}](projects/${item.id}/README.md) — public release ${item.release}; ${item.authoring}; ${item.goals.join('; ')}.`).join('\n')
  const block = `${start}\n## Nova_A calendar qualification references\n\nThis generated region contains the cumulative qualified reference set through public release ${requestedRelease}.\n\n${lines}\n${end}`
  if (readme.includes(start) && readme.includes(end)) readme = `${readme.slice(0, readme.indexOf(start))}${block}${readme.slice(readme.indexOf(end) + end.length)}`
  else readme = `${readme.trimEnd()}\n\n${block}\n`
  await writeFile(readmePath, readme)
}
const index = await readFile(readmePath, 'utf8')
assert(index.includes(start) && index.includes(end), 'Reference index is missing the generated calendar region.')
for (const specification of selectedSpecifications) assert(index.includes(`projects/${specification.id}/README.md`), `Reference index is missing ${specification.id}.`)

console.log(`${verifyOnly ? 'Verified' : 'Generated and verified'} ${selectedSpecifications.length} cumulative reference projects through Nova_A ${requestedRelease}; no future release was generated.`)
