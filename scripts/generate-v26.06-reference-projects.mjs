import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const projects = join(root, 'reference-projects', 'projects')
const id = 'simulation-v2606-physics-navigation-ai'
const output = join(projects, id)
const sourcePhysics = join(projects, 'creator-v650-physics-renderer')
const sourceAi = join(projects, 'ai-v57-perception-utility')
const uuid = seed => {
  const value = createHash('sha256').update(`nova-26.06:${seed}`).digest('hex')
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-4${value.slice(13, 16)}-8${value.slice(17, 20)}-${value.slice(20, 32)}`
}
const component = (seed, kind, data) => ({ uuid: uuid(`${seed}:${kind}`), kind, enabled: true, removed: false, data })

await mkdir(output, { recursive: true })
await cp(sourcePhysics, output, { recursive: true, force: true })

const projectPath = join(output, 'project.nova')
const project = JSON.parse(await readFile(projectPath, 'utf8'))
const aiProject = JSON.parse(await readFile(join(sourceAi, 'project.nova'), 'utf8'))
const scene = project.scenes[0]
const byName = name => scene.entities.find(entity => entity.name === name)
const transform = entity => entity.components.find(item => item.kind === 'Transform2D')?.data
const collider = entity => entity.components.find(item => item.kind.endsWith('Collider2D'))?.data

project.engineVersion = '26.6.0'
project.projectMetadata.name = 'Simulation Production 26.06'
project.projectMetadata.template = id
project.projectMetadata.updatedAt = '2026-09-04T00:00:00.000Z'
project.manifest.name = 'Simulation Production 26.06'
project.manifest.engineCompatibility = { minimum: '7.0.0', maximumExclusive: '27.0.0' }
project.assetFolders = [...new Set([...project.assetFolders, 'Assets/AI'])]
project.projectSettings.physics = {
  ...project.projectSettings.physics,
  units: { gridUnitMeters: 1, gravityMetersPerSecondSquared: 9.80665 },
  profile: 'Balanced',
  fixedTimestep: 1 / 60,
  deterministic: true
}
if (project.projectSettings?.build?.releaseEngineering) project.projectSettings.build.releaseEngineering.release = '26.06'
if (project.projectSettings?.build) project.projectSettings.build.gameName = 'Nova 26.06 Simulation Production'

// One rigid body owns a primary box plus two child shapes. The solver keeps a
// single authoritative transform, mass, inertia and contact response.
const compound = byName('Jointed Box')
compound.name = 'Compound Cross Body'
collider(compound).shapes = [
  { id: 'cross-horizontal', kind: 'Box', offset: { x: 0, y: 0 }, rotation: 0, size: { x: 3.2, y: .65 }, radius: .325, points: [], enabled: true, sensor: false, physicsLayer: 0, collisionMask: 0xffffffff, oneWay: false, oneWayNormal: { x: 0, y: 1 } },
  { id: 'cross-vertical', kind: 'Box', offset: { x: 0, y: 0 }, rotation: 0, size: { x: .65, y: 3.2 }, radius: .325, points: [], enabled: true, sensor: false, physicsLayer: 0, collisionMask: 0xffffffff, oneWay: false, oneWayNormal: { x: 0, y: 1 } }
]
const joint = compound.components.find(item => item.kind === 'DistanceJoint2D')
Object.assign(joint.data, { limitsEnabled: true, lowerLimit: 2.5, upperLimit: 3.4, motorEnabled: true, motorSpeed: .7, maxMotorForce: 220, breakForce: 980, breakTorque: 420 })

const ropeEnd = byName('Rope End')
const ropeBall = byName('Rope Ball')
const third = structuredClone(aiProject.scenes[0].entities.find(entity => entity.name === 'Enemy'))
third.uuid = uuid('entity:rope-collider')
third.name = 'Rope Collision Body'
third.tags = ['rope-obstacle']
third.components = third.components.filter(item => ['Transform2D', 'ShapeRenderer2D', 'RigidBody2D', 'BoxCollider2D'].includes(item.kind)).map(item => ({ ...item, uuid: uuid(`rope-collider:${item.kind}`) }))
Object.assign(transform(third), { position: { x: 3, y: -1.65 } })
scene.entities.push(third)

const ropeDefaults = { type: 'rope', componentType: 'Rope2D', route: 'manual', manualSegments: [], restLengths: [], stretchable: true, bendable: true, stiffness: 120, damping: 24, maxStretch: .18, maxStretchRatio: 1.18, bendTolerance: 120, stretchTolerance: 180, collisionEnabled: true, thickness: .18, segmentCount: 16, ropeNodes: [], breakState: 'intact', breakLink: -1, tension: 0, strain: 0 }
const anchor = entityUuid => ({ entityUuid, mode: 'center', localPoint: { x: 0, y: 0 }, index: 0, sideT: .5 })
const rope = (seed, first, second, points) => {
  const authoredLength = points.slice(1).reduce((total, point, index) => total + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0)
  return { uuid: uuid(`connection:${seed}`), name: seed, ...ropeDefaults, restLengths: [authoredLength], anchors: [anchor(first.uuid), anchor(second.uuid)], manualPoints: points }
}
scene.connections = [
  rope('Lattice A-B', ropeEnd, ropeBall, [{ x: 1, y: -2 }, { x: 3, y: -.8 }, { x: 5, y: -2 }]),
  rope('Lattice B-C', ropeBall, third, [{ x: 5, y: -2 }, { x: 4, y: -3.25 }, { x: 3, y: -1.65 }]),
  rope('Lattice C-A', third, ropeEnd, [{ x: 3, y: -1.65 }, { x: 2, y: -3.25 }, { x: 1, y: -2 }])
]

const region = structuredClone(aiProject.scenes[0].entities.find(entity => entity.name === 'World Navigation'))
region.uuid = uuid('entity:navigation-region')
region.name = 'Manual Navigation Region'
region.components = region.components.map(item => ({ ...item, uuid: uuid(`navigation-region:${item.kind}`) }))
Object.assign(region.components.find(item => item.kind === 'NavigationRegion2D').data, {
  polygon: [{ x: -9, y: -4 }, { x: 9, y: -4 }, { x: 9, y: 4 }, { x: -9, y: 4 }], navigationMode: 'Polygon', algorithm: 'HierarchicalAStar', source: 'Manual', sourceEntityUuid: null,
  cellSize: .5, clusterSize: 8, traversalCost: 1, agentRadius: .45, navigationLayer: 1, navigationMask: 1,
  links: [{ id: 'bridge-link', start: { x: -1, y: 0 }, end: { x: 1, y: 0 }, bidirectional: true, cost: 1, enabled: true }],
  costAreas: [{ id: 'slow-center', name: 'Slow center', shape: 'Circle', center: { x: 0, y: 0 }, size: { x: 2, y: 2 }, radius: 1, multiplier: 2, navigationLayer: 1, enabled: true }]
})
scene.entities.push(region)

const behaviorAsset = structuredClone(aiProject.assets.find(asset => asset.assetType === 'behaviorTree'))
behaviorAsset.uuid = uuid('asset:simulation-behavior')
behaviorAsset.name = 'SimulationEnemy.nova-behavior'
behaviorAsset.path = 'Assets/AI/SimulationEnemy.nova-behavior'
project.assets.push(behaviorAsset)
const machineSource = JSON.stringify({ version: 1, initialState: 'Patrol', states: [{ id: 'Patrol', transitions: [{ target: 'Chase', condition: 'target_visible' }] }, { id: 'Chase', transitions: [{ target: 'Patrol', condition: 'target_lost' }] }] }, null, 2)
const machineAsset = structuredClone(behaviorAsset)
machineAsset.uuid = uuid('asset:simulation-state-machine')
machineAsset.name = 'SimulationEnemy.nova-state-machine'
machineAsset.path = 'Assets/AI/SimulationEnemy.nova-state-machine'
machineAsset.assetType = 'stateMachine'
machineAsset.mimeType = 'application/x-nova-state-machine'
machineAsset.source = machineSource
machineAsset.byteLength = machineSource.length
const contentHash = createHash('sha256').update(machineSource).digest('hex')
Object.assign(machineAsset.pipeline, { sourceHash: contentHash, artifactHash: contentHash, contentHash, cacheKey: contentHash, lastValidSource: machineSource })
project.assets.push(machineAsset)

const enemy = structuredClone(aiProject.scenes[0].entities.find(entity => entity.name === 'Enemy'))
enemy.uuid = uuid('entity:navigation-enemy')
enemy.name = 'Navigating Enemy'
enemy.tags = ['enemy', 'ai-agent']
enemy.components = enemy.components.filter(item => ['Transform2D', 'ShapeRenderer2D', 'RigidBody2D', 'BoxCollider2D'].includes(item.kind)).map(item => ({ ...item, uuid: uuid(`navigation-enemy:${item.kind}`) }))
Object.assign(transform(enemy), { position: { x: 7, y: 2.5 } })
enemy.components.push(
  component('navigation-enemy', 'NavigationAgent2D', { targetEntityUuid: ropeEnd.uuid, targetPosition: { x: 1, y: -2 }, speed: 4, acceleration: 20, radius: .45, stoppingDistance: .2, avoidance: true, avoidanceRadius: 1.2, avoidancePriority: .5, maximumAvoidanceNeighbors: 16, pathSmoothing: true, repathInterval: .25, navigationLayer: 1, navigationMask: 1, path: [], pathIndex: 0, velocity: { x: 0, y: 0 }, pathStatus: 'Idle' }),
  component('navigation-enemy', 'BehaviorTree2D', { treeAsset: `asset://${behaviorAsset.uuid}`, tickRate: 10, currentNode: '', blackboardOverrides: { aggression: .75 } }),
  component('navigation-enemy', 'StateMachine2D', { machineAsset: `asset://${machineAsset.uuid}`, currentState: 'Patrol' })
)
scene.entities.push(enemy)

const obstacle = byName('Joint Anchor')
obstacle.components.push(component('navigation-obstacle', 'NavigationObstacle2D', { shape: 'Box', size: { x: .8, y: .8 }, radius: .4, dynamic: false, navigationLayer: 1, avoidanceVelocity: { x: 0, y: 0 } }))

await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`)
await writeFile(join(output, 'README.md'), `# Simulation Production 26.06\n\nEngine **26.6.0**, Project Format 2/schema 29. This authored reference keeps one exact convention: **1 grid unit = 1 metre**. It contains a compound cross collider, a motor/limit/break joint, a three-body collision-enabled Rope2D lattice with a body inside it, a manual navigation region with link/cost area/obstacle, one avoidance-enabled navigating enemy, and linked Behavior Tree plus hierarchical state-machine assets.\n\nUse \`test-controls.json\` as the manual normal-user gate. Automated checks may validate structure and output; they do not replace the pending visual, hardware, or independent-player gates.\n`)
await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ engineVersion: '26.6.0', reference: 'simulation-production', actions: [
  { action: 'Open Scene, show grid and ruler, select Compound Cross Body', expected: 'Inspector and ruler agree that 1 grid unit is exactly 1 m; both collider children are visible without duplicate bodies' },
  { action: 'Play, observe the compound body and motor joint, then apply enough load to exceed the break threshold', expected: 'The cross moves and collides as one body; limits and motor act; the joint reports one deterministic break event' },
  { action: 'Play the Lattice A-B/B-C/C-A Rope2D cycle and collide Rope Collision Body with it', expected: 'Sixteen-segment paths bend, stretch and collide; anchors apply reaction to their owning bodies; no rope self-collision pins an endpoint' },
  { action: 'Select Navigating Enemy, move its target and the Navigation Obstacle', expected: 'The enemy repaths inside the manual region, respects link/cost/agent masks and visibly avoids the obstacle' },
  { action: 'Inspect AI debug and switch the linked Behavior Tree/HSM assets', expected: 'Current node/state, blackboard and transition evidence refer to the same enemy and persisted assets' },
  { action: 'Capture replay evidence, save/reload, Play again, then build Web and Windows portable outputs', expected: 'Checksum/frame evidence is reproducible; authored physics/navigation/AI survives reload and the supported export paths' },
  { action: 'Repeat at 1024×640 and 2560×1440, 80/100/125/150%, English/German/Chinese', expected: 'No control, label, diagnostics row or textbox overlaps, clips, escapes its panel or creates a root horizontal scrollbar' }
] }, null, 2)}\n`)
await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion: '26.6.0', status: 'candidate', projectFormat: 2, schema: 29, reference: 'simulation-production', gridUnitMeters: 1, fixedTimestep: 1 / 60, compoundColliderChildren: 2, ropePaths: 3, ropeSegmentsPerPath: 16, navigationAgents: 1, aiAgents: 1, deterministicReplay: true, localStructuralVerification: 'required', visualHardwareCertification: 'pending-external' }, null, 2)}\n`)

const readmePath = join(root, 'reference-projects', 'README.md')
const readme = await readFile(readmePath, 'utf8')
const marker = '## Nova_A 26.06 simulation-production reference'
if (!readme.includes(marker)) await writeFile(readmePath, `${readme.trimEnd()}\n\n${marker}\n\n- \`simulation-v2606-physics-navigation-ai\`: one 1-unit=1-m scene covering a compound collider, breakable motor/limit joint, three-body Rope2D lattice, navigation region/link/cost/obstacle/agent, Behavior Tree, HSM, replay evidence and Web/Windows export checks.\n`)
console.log('Generated the Nova_A 26.06 simulation-production reference project.')
