import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const projectsRoot = join(root, 'reference-projects/projects')
const specs = [
  { id: 'gameplay-v54-snake-growth', source: 'snake-v51-playable', name: 'Snake Growth 5.4', kind: 'snake' },
  { id: 'gameplay-v54-platformer', source: 'platformer', name: 'Gameplay Platformer 5.4', kind: 'platformer' },
  { id: 'gameplay-v54-twin-stick', source: 'top-down', name: 'Twin-stick 5.4', kind: 'twin' },
  { id: 'gameplay-v54-menu', source: 'responsive-menu', name: 'Game Flow Menu 5.4', kind: 'menu' },
  { id: 'gameplay-v54-pooling', source: 'top-down', name: 'Projectile Pooling 5.4', kind: 'pooling' }
]

function uuid(seed) {
  const value = createHash('sha256').update(`nova-v54:${seed}`).digest('hex').slice(0, 32).split('')
  value[12] = '4'; value[16] = '8'
  const text = value.join('')
  return `${text.slice(0,8)}-${text.slice(8,12)}-${text.slice(12,16)}-${text.slice(16,20)}-${text.slice(20)}`
}
function hash(source) { return createHash('sha256').update(source).digest('hex') }
function entity(project, name) { return project.scenes.flatMap(scene => scene.entities).find(item => item.name === name) }
function component(owner, kind, data, seed) {
  owner.components = owner.components.filter(item => item.kind !== kind)
  owner.components.push({ uuid: uuid(`${seed}:${kind}`), kind, enabled: true, removed: false, data })
}
function removeComponent(owner, kind) { owner.components = owner.components.filter(item => item.kind !== kind) }
function enrichActions(project, context = 'Gameplay', map = 'Default') {
  project.projectSettings.inputMap = (project.projectSettings.inputMap ?? []).map(action => ({
    ...action, enabled: true, context, map, schemes: [], interaction: 'press', holdSeconds: .35,
    tapSeconds: .25, multiTapCount: 2, consume: false, priority: 0, callback: ''
  }))
}
function binding(device, code, extra = {}) { return { device, code, scale: 1, x: 1, y: 0, gamepad: 0, deviceId: '', deadzone: .18, threshold: .0001, invert: false, responseCurve: 'linear', modifiers: [], chord: [], ...extra } }
function action(name, kind, bindings, extra = {}) { return { name, kind, bindings, enabled: true, context: 'Gameplay', map: 'Default', schemes: [], interaction: 'press', holdSeconds: .35, tapSeconds: .25, multiTapCount: 2, consume: false, priority: 0, callback: '', ...extra } }
function updateScript(asset, source) {
  const digest = hash(source); asset.source = source; asset.byteLength = new TextEncoder().encode(source).byteLength
  asset.pipeline = { ...(asset.pipeline ?? {}), importerId: 'nova.inline', importerVersion: '5.4.0', platform: 'web', sourceHash: digest, artifactHash: digest, contentHash: digest, cacheKey: digest, status: 'ready', lastValidSource: source, error: '', dependencies: [], reverseDependencies: [] }
  asset.script = { ...(asset.script ?? {}), version: 2, apiVersion: 2, breakpoints: [], breakpointDetails: [], tests: [], packageDependencies: [], reloadPolicy: 'preserve' }
}
function addScript(project, name, source, owner, seed) {
  const template = project.assets.find(asset => asset.assetType === 'script')
  const id = uuid(`${seed}:script:${name}`)
  const asset = template ? structuredClone(template) : { uuid: id, name, path: `Assets/Scripts/${name}`, assetType: 'script', mimeType: 'text/x-rhai', sourceModified: 0, importedAt: 0, width: 0, height: 0, duration: 0, fontFamily: '', settings: { filterMode: 'Linear', compression: 'Lossless', pixelsPerUnit: 100, spriteRegion: null, pivot: { x: .5, y: .5 }, atlas: false }, pipeline: {}, script: {} }
  Object.assign(asset, { uuid: id, name, path: `Assets/Scripts/${name}` }); updateScript(asset, source); project.assets.push(asset)
  component(owner, 'Script2D', { scriptAsset: `asset://${id}`, properties: {} }, `${seed}:script-owner`)
  return asset
}
function addPrefab(project, name, sourceEntity, seed) {
  const id = uuid(`${seed}:prefab:${name}`), source = JSON.stringify(sourceEntity), digest = hash(source)
  project.assets.push({ uuid: id, name: `${name}.nova-prefab`, path: `Assets/Prefabs/${name}.nova-prefab`, assetType: 'prefab', mimeType: 'application/x-nova-prefab', byteLength: new TextEncoder().encode(source).byteLength, source, sourceModified: 0, importedAt: 0, width: 0, height: 0, duration: 0, fontFamily: '', settings: { filterMode: 'Linear', compression: 'Lossless', pixelsPerUnit: 100, spriteRegion: null, pivot: { x: .5, y: .5 }, atlas: false }, pipeline: { importerId: 'nova.inline', importerVersion: '5.4.0', platform: 'web', sourceHash: digest, artifactHash: digest, contentHash: digest, cacheKey: digest, status: 'ready', lastValidSource: source, error: '', dependencies: [], reverseDependencies: [] } })
  return `asset://${id}`
}

function configureSnake(project, seed) {
  enrichActions(project)
  const head = entity(project, 'Snake Head'), food = entity(project, 'Food'), camera = entity(project, 'Main Camera')
  head.tags = ['player']; component(head, 'Health2D', { maximum: 1, current: 1, invulnerabilitySeconds: 0, destroyOnZero: true, damagedSignal: 'snake.hit', diedSignal: 'snake.game_over' }, seed)
  const segments = ['Snake Segment 1','Snake Segment 2','Snake Segment 3'].map(name => entity(project, name))
  for (const segment of segments) { segment.groups = ['snake-body']; removeComponent(segment, 'Script2D') }
  const prefabEntity = structuredClone(segments[0]); prefabEntity.name = 'Growing Segment'; prefabEntity.groups = ['snake-body']; prefabEntity.prefabAsset = null
  const prefab = addPrefab(project, 'SnakeSegment', prefabEntity, seed)
  const headScript = project.assets.find(asset => asset.name === 'SnakeHead.rhai')
  updateScript(headScript, `@export(type="float", min=-1, max=1, step=1) let direction_x = 1.0;\n@export(type="float", min=-1, max=1, step=1) let direction_y = 0.0;\nfn start(){ timer_start("snake-step",0.16,true); checkpoint_set("start"); }\nfn update(dt){ if input_pressed("MoveUp") && direction_y != 1.0 { direction_x=0.0;direction_y=-1.0; } if input_pressed("MoveDown") && direction_y != -1.0 { direction_x=0.0;direction_y=1.0; } if input_pressed("MoveLeft") && direction_x != 1.0 { direction_x=-1.0;direction_y=0.0; } if input_pressed("MoveRight") && direction_x != -1.0 { direction_x=1.0;direction_y=0.0; } }\nfn on_timer(name){ if name!="snake-step"{return;} let pose=transform(); let previous_x=pose.position_x; let previous_y=pose.position_y; for segment in query_group("snake-body",256){ let x=entity_position_x_on(segment); let y=entity_position_y_on(segment); entity_set_position(segment,previous_x,previous_y); previous_x=x; previous_y=y; } let x=pose.position_x+direction_x*1.2; let y=pose.position_y+direction_y*1.2; if x>8.4{x=-8.4;} if x< -8.4{x=8.4;} if y>4.8{y=-4.8;} if y< -4.8{y=4.8;} set_position(x,y); }`)
  const foodScript = project.assets.find(asset => asset.name === 'SnakeFood.rhai')
  updateScript(foodScript, `fn on_trigger_enter(other,px,py,nx,ny,rvx,rvy){ if other!=find_entity("Snake Head"){return;} let pose=transform(); let segment=spawn_at("${prefab}",pose.position_x,pose.position_y,0.0,1.0,1.0); entity_add_group(segment,"snake-body"); score_add(1.0); signal_emit("snake.scored",1); set_position(random_range(-7.2,7.2),random_range(-4.2,4.2)); }`)
  component(camera, 'CameraFollow2D', { targetUuid: head.uuid, targetTag: 'player', offset: { x: 0, y: 0 }, smoothing: 6, deadZone: { x: 1, y: .5 }, followX: true, followY: true }, seed)
}
function configurePlatformer(project, seed) {
  enrichActions(project); const player = entity(project, 'Player'), camera = entity(project, 'Main Camera'); player.tags = ['player','damageable']; removeComponent(player, 'Script2D')
  component(player, 'PlatformController2D', { moveAction: 'MoveHorizontal', jumpAction: 'Jump', speed: 6, acceleration: 36, airControl: .55, jumpImpulse: 10, maximumFallSpeed: 30 }, seed)
  component(player, 'Health2D', { maximum: 100, current: 100, invulnerabilitySeconds: .25, destroyOnZero: false, damagedSignal: 'player.damaged', diedSignal: 'player.died' }, seed)
  component(camera, 'CameraFollow2D', { targetUuid: player.uuid, targetTag: 'player', offset: { x: 0, y: 1 }, smoothing: 8, deadZone: { x: 1.5, y: .75 }, followX: true, followY: true }, seed)
}
function configureTwin(project, seed) {
  enrichActions(project); const player = entity(project, 'Player'), enemy = entity(project, 'Enemy'), camera = entity(project, 'Main Camera'); player.tags = ['player','damageable']; enemy.tags = ['enemy','damageable']; removeComponent(player, 'Script2D')
  const map = project.projectSettings.inputMap; if (!map.some(item => item.name === 'Move')) map.push(action('Move','vector2',[binding('keyboard','KeyA',{x:-1}),binding('keyboard','KeyD',{x:1}),binding('keyboard','KeyW',{x:0,y:1}),binding('keyboard','KeyS',{x:0,y:-1})]))
  map.push(action('Aim','vector2',[binding('mouse-motion','x',{x:1}),binding('mouse-motion','y',{x:0,y:1})],{ map:'Combat' }), action('Fire','button',[binding('mouse-button','0'),binding('gamepad-button','7')],{ map:'Combat', callback:'on_fire', consume:true, priority:20 }))
  component(player, 'TopDownController2D', { moveAction: 'Move', speed: 7, acceleration: 42, rotateToMovement: false }, seed); component(player, 'Health2D', { maximum: 100, current: 100, invulnerabilitySeconds: .2, destroyOnZero: false, damagedSignal: 'player.damaged', diedSignal: 'player.died' }, seed)
  component(enemy, 'Health2D', { maximum: 40, current: 40, invulnerabilitySeconds: .1, destroyOnZero: true, damagedSignal: 'enemy.damaged', diedSignal: 'enemy.died' }, seed); component(enemy, 'DamageHitbox2D', { damage: 12, knockback: 4, targetTag: 'player', hitCooldown: .5, destroyOnHit: false, hitSignal: 'enemy.hit' }, seed)
  component(camera, 'CameraFollow2D', { targetUuid: player.uuid, targetTag: 'player', offset: { x: 0, y: 0 }, smoothing: 10, deadZone: { x: .5, y: .5 }, followX: true, followY: true }, seed)
  const projectile = structuredClone(enemy); projectile.name = 'Player Projectile'; projectile.tags = ['player-projectile']; projectile.groups = ['projectiles']; removeComponent(projectile, 'Script2D'); removeComponent(projectile, 'Health2D'); removeComponent(projectile, 'DamageHitbox2D')
  component(projectile, 'Projectile2D', { speed: 14, direction: { x: 1, y: 0 }, damage: 12, ownerUuid: player.uuid, destroyOnImpact: true, lifetime: 2 }, `${seed}:projectile`); component(projectile, 'Lifetime2D', { seconds: 2, useDespawn: true }, `${seed}:projectile`)
  const projectilePrefab = addPrefab(project, 'TwinStickProjectile', projectile, seed)
  addScript(project, 'TwinStickFire.rhai', `fn start(){ input_map_enable("Combat"); }\nfn on_fire(){ let pose=transform(); let shot=spawn_at("${projectilePrefab}",pose.position_x,pose.position_y,pose.rotation,1.0,1.0); entity_add_group(shot,"projectiles"); }`, player, `${seed}:fire`)
}
function configureMenu(project, seed) {
  enrichActions(project, 'Menu'); project.projectSettings.inputMap.push(action('Pause','button',[binding('keyboard','Escape'),binding('gamepad-button','9')],{ context:'Gameplay', interaction:'press', consume:true, priority:100, callback:'on_pause' }))
  const button = entity(project, 'Play Button')
  addScript(project, 'GameFlowMenu.rhai', `fn start(){ input_context_push("Menu",100,true); }\nfn on_pause(){ game_pause(!game_paused()); }\nfn on_signal(name,payload,source){ if name=="menu.play"{ checkpoint_set("menu"); input_context_pop("Menu"); game_pause(false); scene_load("Main"); } if name=="menu.restart"{ scene_reload(); } if name=="menu.quit"{ scene_quit(); } }`, button, seed)
}
function configurePooling(project, seed) {
  enrichActions(project); const spawner = entity(project, 'World Navigation') ?? entity(project, 'Player'), prefabAsset = project.assets.find(asset => asset.assetType === 'prefab')
  const prefab = JSON.parse(prefabAsset.source); removeComponent(prefab, 'Script2D'); prefab.tags = ['projectile']; component(prefab, 'Projectile2D', { speed: 9, direction: { x: 1, y: 0 }, damage: 8, ownerUuid: '', destroyOnImpact: true, lifetime: 2 }, `${seed}:prefab`); component(prefab, 'Lifetime2D', { seconds: 2, useDespawn: true }, `${seed}:prefab`)
  const source = JSON.stringify(prefab), digest = hash(source); prefabAsset.source = source; prefabAsset.byteLength = new TextEncoder().encode(source).byteLength; Object.assign(prefabAsset.pipeline, { importerVersion:'5.4.0',sourceHash:digest,artifactHash:digest,contentHash:digest,cacheKey:digest,lastValidSource:source,status:'ready',error:'' })
  const reference = `asset://${prefabAsset.uuid}`
  component(spawner, 'ObjectPool2D', { prefabAsset: reference, prewarm: 8, capacity: 32, autoExpand: true, resetContract: 'FullSerializedState', maximumLifetime: 3 }, seed)
  component(spawner, 'Spawner2D', { prefabAsset: reference, interval: .25, initialDelay: 0, burst: 1, maximumAlive: 24, autoStart: true, inheritRotation: true }, seed)
  component(spawner, 'Cooldown2D', { duration: .25, autoStart: true, readySignal: 'pool.ready' }, seed)
}

for (const spec of specs) {
  const source = join(projectsRoot, spec.source), output = join(projectsRoot, spec.id)
  await mkdir(output, { recursive: true }); await cp(source, output, { recursive: true, force: true })
  const projectPath = join(output, 'project.nova'), project = JSON.parse(await readFile(projectPath, 'utf8'))
  project.engineVersion = '5.4.0'; project.projectMetadata.name = spec.name; project.projectMetadata.template = spec.id; project.projectMetadata.updatedAt = '2026-08-26T00:00:00.000Z'
  if (project.projectSettings?.build?.releaseEngineering) project.projectSettings.build.releaseEngineering.release = '5.4.0'
  if (spec.kind === 'snake') configureSnake(project, spec.id)
  else if (spec.kind === 'platformer') configurePlatformer(project, spec.id)
  else if (spec.kind === 'twin') configureTwin(project, spec.id)
  else if (spec.kind === 'menu') configureMenu(project, spec.id)
  else configurePooling(project, spec.id)
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(join(output, 'README.md'), `# ${spec.name}\n\nEngine **5.4.0**, Project Format 2 schema 29, Rhai API v2. This is the **${spec.kind}** audit reference for dynamic objects, gameplay components, game flow and advanced input. Open project.nova, inspect gameplay components and Input Map, press Play, then review Console, Physics Monitor, Visual Debugger and Profiler.\n\nExternal signing, independent clean-machine lifecycle and real wall-clock soak remain pending external gates.\n`)
  await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ engineVersion:'5.4.0',reference:spec.kind,actions:[{action:'Play for 30 seconds',expected:'No fatal error, stale mutation or non-finite transform'},{action:'Stop and Play again',expected:'Authored health, cooldown, projectile and lifetime values reset'},{action:'Switch English, German and Chinese',expected:'Gameplay Inspector and Input action details remain readable without overlap'}]},null,2)}\n`)
  await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion:'5.4.0',status:'passed',projectFormat:2,schema:29,apiVersion:2,reference:spec.kind,staleHandles:'explicit-error-no-mutation',queryLimit:256 },null,2)}\n`)
}

for (const entry of await readdir(projectsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const projectPath = join(projectsRoot, entry.name, 'project.nova')
  try { const project = JSON.parse(await readFile(projectPath, 'utf8')); project.engineVersion = '5.4.0'; if (project.projectSettings?.build?.releaseEngineering) project.projectSettings.build.releaseEngineering.release = '5.4.0'; await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`) } catch {}
}
console.log('Generated five Nova_A v5.4.0 gameplay reference projects and refreshed reference metadata.')
