import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const compiled = await mkdtemp(join(tmpdir(), 'nova-v2611-templates-'))
const checks = []
const check = (name, run) => { run(); checks.push({ name, status: 'passed' }) }
const report = async (status, error) => {
  await mkdir(join(root, 'release-audits'), { recursive: true })
  await writeFile(join(root, 'release-audits/v26.11-template-behavior.json'), JSON.stringify({ status, generatedAt: new Date().toISOString(), checks, error, scope: 'Source factories, catalog discovery, component hydration, particle simulation/draw submissions, and actual WASM script execution. Does not certify full rendered playthroughs or native exports.' }, null, 2))
}
try {
  await writeFile(join(compiled, 'package.json'), '{"type":"module"}\n')
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: { templates: join(root, 'src/projects/templates.ts'), discovery: join(root, 'src/projects/templateDiscovery.ts'), components: join(root, 'src/world/components.ts'), particles: join(root, 'src/runtime/particles.ts'), box: join(root, 'src/world/BoxEntity.ts') }, output: { entryFileNames: '[name].mjs' } } } })
  const { PROJECT_TEMPLATES: catalog, createTemplateProject } = await import(pathToFileURL(join(compiled, 'templates.mjs')).href)
  const { discoverTemplates } = await import(pathToFileURL(join(compiled, 'discovery.mjs')).href)
  const { ParticleEmitter2D, pasteComponentValues } = await import(pathToFileURL(join(compiled, 'components.mjs')).href)
  const { ParticleRuntime } = await import(pathToFileURL(join(compiled, 'particles.mjs')).href)
  const { BoxEntity } = await import(pathToFileURL(join(compiled, 'box.mjs')).href)
  const additions = catalog.filter(value => value.introduced === '26.11')
  check('40 unique starters; 20 additional localized recipes', () => { assert.equal(catalog.length, 40); assert.equal(additions.length, 20); assert.equal(new Set(catalog.map(value => value.id)).size, 40); for (const item of additions) for (const locale of ['de', 'zh']) { assert.ok(item.localized[locale].name); assert.ok(item.localized[locale].description) } })
  check('Every original and new particle recipe hydrates its authored fields', () => {
    for (const descriptor of catalog) for (const scene of createTemplateProject(descriptor.id, descriptor.name).scenes) for (const entity of scene.entities) for (const part of entity.components.filter(value => value.kind === 'ParticleEmitter2D')) {
      const emitter = new ParticleEmitter2D()
      for (const key of Object.keys(part.data)) assert.ok(key in emitter, `${descriptor.id}/${entity.name}: ignored particle field ${key}`)
      pasteComponentValues(emitter, part.data)
      for (const [key, value] of Object.entries(part.data)) assert.deepEqual(emitter[key], value, `${descriptor.id}/${entity.name}: hydration dropped ${key}`)
      assert.ok(emitter.startOpacity >= 10 && emitter.startOpacity <= 100)
    }
  })
  for (const id of ['rendering-lab', 'particle-fireworks', 'rain-room', 'starfield']) check(`${id}: real particle simulation submits visible moving particles`, () => {
    const project = createTemplateProject(id, id), entities = project.scenes[0].entities.filter(value => value.components.some(part => part.kind === 'ParticleEmitter2D')).map((value, index) => {
      const transform = value.components.find(part => part.kind === 'Transform2D').data, part = value.components.find(part => part.kind === 'ParticleEmitter2D')
      const entity = new BoxEntity(index + 1, transform.position, { x: 1, y: 1 }, value.uuid)
      const emitter = new ParticleEmitter2D(part.uuid); pasteComponentValues(emitter, part.data); entity.addComponent(emitter); return entity
    })
    const runtime = new ParticleRuntime(), commands = []
    runtime.reset(); runtime.update(entities, .1, true)
    runtime.submit({ stats: { backend: 'Canvas2D' }, submitShape: command => commands.push(command), submitSprite: command => commands.push(command) }, entities)
    assert.ok(commands.length > 0)
    assert.ok(commands.every(command => (command.fill?.a ?? command.tint?.a ?? 0) > .1))
    if (id === 'rain-room') assert.ok(commands.every(command => command.position.y < 5), 'rain should fall')
    if (id === 'starfield') assert.ok(commands.every(command => command.position.x < 8.5), 'stars should drift left')
    runtime.reset()
  })
  const display = locale => item => `${item.localized?.[locale]?.name ?? item.name} ${item.localized?.[locale]?.description ?? item.description}`
  const filters = { category: 'all', difficulty: 'all', query: '', sort: 'catalog', locale: 'en' }
  check('Localized, multiword, category, difficulty, empty and sorted discovery', () => {
    assert.equal(discoverTemplates(catalog, filters, display('en')).length, 40)
    assert.deepEqual(discoverTemplates(catalog, { ...filters, query: '轨道 闪避', locale: 'zh' }, display('zh')).map(item => item.id), ['orbit-dodge'])
    assert.deepEqual(discoverTemplates(catalog, { ...filters, query: 'Münzpfad', locale: 'de' }, display('de')).map(item => item.id), ['coin-trail'])
    assert.equal(discoverTemplates(catalog, { ...filters, query: 'no-such-template' }, display('en')).length, 0)
    assert.ok(discoverTemplates(catalog, { ...filters, category: 'game', difficulty: 'beginner' }, display('en')).every(item => item.category === 'game' && item.difficulty === 'beginner'))
    assert.ok(discoverTemplates(catalog, { ...filters, sort: 'newest' }, display('en')).slice(0, 20).every(item => item.introduced === '26.11'))
    const quick = discoverTemplates(catalog, { ...filters, sort: 'time' }, display('en')); assert.ok(quick.every((item, index) => index === 0 || quick[index - 1].setupMinutes <= item.setupMinutes))
  })
  const wasm = await import(pathToFileURL(join(root, 'nova_core/pkg/nova_core.js')).href)
  await wasm.default({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  const pose = entity => entity.components.find(value => value.kind === 'Transform2D').data.position
  const context = (project, owner, properties = {}, position = pose(owner)) => {
    const entities = project.scenes[0].entities
    return {
      apiVersion: 2, entity: owner.uuid, entityName: owner.name, components: owner.components.map(value => value.kind),
      entities: Object.fromEntries(entities.map(value => [value.name, value.uuid])), sceneEntities: entities.map(value => ({ uuid: value.uuid, name: value.name, enabled: value.enabled !== false, tags: [], groups: [], components: value.components.map(part => part.kind), position: [pose(value).x, pose(value).y] })),
      time: { delta: 1 / 60, fixedDelta: 1 / 60, elapsed: 0, scale: 1, frame: 1 }, randomSeed: 7,
      input: { down: {}, pressed: {}, released: {}, performed: {}, cancelled: {}, phases: {}, durations: {}, axes: {}, vectors: {}, mousePosition: [960, 540], mouseWorldPosition: [0, 0], viewBounds: [-10.66, 10.66, -6, 6], viewportSize: [1920, 1080], wheel: [0, 0], contexts: ['Gameplay'], maps: ['Default'], scheme: 'keyboard-mouse' },
      contact: null, event: null, properties, save: {}, transform: { position: [position.x, position.y], rotation: 0, scale: [1, 1] }, rigidBody: null, character: null,
      gameFlow: { paused: false, score: 0, session: {}, checkpoints: [] }, networking: { enabled: false, connected: false, authority: true, peerCount: 0, localPeerId: '', role: 'offline', tick: 0 }
    }
  }
  for (const descriptor of additions) {
    const project = createTemplateProject(descriptor.id, descriptor.name), entities = project.scenes[0].entities
    check(`${descriptor.id}: authored scene and safe asset references`, () => {
      assert.equal(project.projectMetadata.template, descriptor.id)
      assert.ok(entities.length > 4)
      const ids = new Set(project.assets.map(value => value.uuid))
      for (const value of entities) for (const part of value.components) for (const [key, reference] of Object.entries(part.data)) if (key.endsWith('Asset') && typeof reference === 'string' && reference.startsWith('asset://')) assert.ok(ids.has(reference.slice(8)), `${value.name}: missing ${reference}`)
    })
    if (descriptor.id === 'rain-room') check('rain-room: silhouette sorts in front of every rain emitter', () => {
      const orders = kind => entities.flatMap(value => value.components.filter(part => part.kind === kind).map(part => part.data.orderInLayer ?? 0))
      assert.ok(Math.min(...orders('ShapeRenderer2D')) > Math.max(...orders('ParticleEmitter2D')))
    })
    for (const owner of entities.filter(value => value.components.some(part => part.kind === 'Script2D'))) {
      const reference = owner.components.find(part => part.kind === 'Script2D').data.scriptAsset
      const asset = project.assets.find(value => `asset://${value.uuid}` === reference)
      const runtime = new wasm.WasmScriptRuntime()
      try {
        runtime.compile_cached(asset.uuid, asset.source)
        const run = (fn, data) => JSON.parse(runtime.execute_cached_json(asset.uuid, fn, JSON.stringify(data)))
        if (descriptor.category !== 'game') {
          check(`${descriptor.id}/${asset.name}: actual WASM orbit tick`, () => { const result = run('update', context(project, owner)); assert.ok(result.commands.some(command => command.type === 'setPosition')); assert.ok(Number.isFinite(result.properties.angle)) })
          continue
        }
        let current
        check(`${descriptor.id}: initialize HUD and exactly one checkpoint`, () => { current = run('start', context(project, owner)); assert.equal(current.properties.checkpoint, 0); assert.equal(current.properties.finished, false); assert.ok(current.commands.some(command => command.type === 'scoreSet')); assert.equal(current.commands.filter(command => command.type === 'targetSetEnabled' && command.enabled === true).length, 1) })
        check(`${descriptor.id}: movement and bounds execute in WASM`, () => { const data = context(project, owner, current.properties, { x: 8, y: 4.5 }); data.input.axes = { MoveHorizontal: 1, MoveVertical: 1 }; const result = run('update', data); const move = result.commands.find(command => command.type === 'setPosition'); assert.ok(move); assert.ok(move.x <= 8 && move.y <= 4.5); current = result })
        check(`${descriptor.id}: full course scores, wins, freezes and restarts`, () => {
          const goals = entities.filter(value => value.name.startsWith('Checkpoint '))
          for (let index = 0; index < goals.length; index++) {
            // A hazard-free instant supplies a position at the exact next authored checkpoint.
            const data = context(project, owner, { ...current.properties, elapsed: 0 }, pose(goals[index]))
            current = run('update', data)
            assert.equal(current.properties.checkpoint, index + 1)
            assert.ok(current.commands.some(command => command.type === 'scoreAdd'))
          }
          assert.equal(current.properties.finished, true)
          assert.ok(current.commands.some(command => command.type === 'targetSetUiText' && command.text.includes('complete')))
          assert.equal(run('update', context(project, owner, current.properties)).commands.length, 0)
          const restart = context(project, owner, current.properties); restart.input.pressed.Restart = true; current = run('update', restart)
          assert.equal(current.properties.finished, false); assert.equal(current.properties.checkpoint, 0)
        })
        if (['checkpoint-sprint', 'target-circuit'].includes(descriptor.id)) check(`${descriptor.id}: timer expires`, () => { const result = run('update', context(project, owner, { ...current.properties, elapsed: 30 })); assert.equal(result.properties.finished, true); assert.ok(result.commands.some(command => command.text?.includes('Time expired'))) })
        const hazards = entities.filter(value => value.name.startsWith('Hazard '))
        if (hazards.length) check(`${descriptor.id}: hazard ends round`, () => {
          // Execute once to read the actual moving hazard command, then sample that
          // exact elapsed time at its reported position in an independent tick.
          const first = run('update', context(project, owner, current.properties))
          const moving = first.commands.find(command => command.type === 'targetSetPosition')
          const hitPosition = moving ? { x: moving.x, y: moving.y } : pose(hazards[0])
          const hit = run('update', context(project, owner, current.properties, hitPosition)); assert.equal(hit.properties.finished, true); assert.ok(hit.commands.some(command => command.text?.includes('Hazard hit')))
        })
      } finally { runtime.free() }
    }
  }
  await report('passed')
  console.log(`26.11 template behavior: ${checks.length} checks passed`)
} catch (error) {
  await report('failed', String(error))
  throw error
} finally { await rm(compiled, { recursive: true, force: true }) }
