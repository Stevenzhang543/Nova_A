import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const check = (id, passed, detail, metrics = {}) => { checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }); if (!passed) console.error(`${id}: ${detail}`) }
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 8, userAgent: 'Nova_A v5.7 world verifier' } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, addEventListener() {}, removeEventListener() {} }
globalThis.localStorage ??= { getItem() { return null }, setItem() {}, removeItem() {} }
globalThis.performance ??= { now: () => Date.now() }

const referenceIds = ['navigation-v57-10000-agents', 'ai-v57-perception-utility', 'world-v57-streaming-handoff', 'tilemap-v57-background-bake']
const projects = Object.fromEntries(await Promise.all(referenceIds.map(async id => [id, JSON.parse(await readFile(join(root, `reference-projects/projects/${id}/project.nova`), 'utf8'))])))
check('V570-REFERENCES', referenceIds.every(id => projects[id].engineVersion === '5.7.0' && projects[id].projectFormatMajor === 2 && projects[id].formatVersion === 29), 'Four v5.7 references retain Project Format 2/schema 29.', { references: referenceIds })

const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } }); await server.watcher.close()
try {
  const navigation = await server.ssrLoadModule('/src/runtime/navigation2d.ts')
  const ai = await server.ssrLoadModule('/src/runtime/aiTools.ts')
  const streaming = await server.ssrLoadModule('/src/runtime/worldStreaming.ts')
  const tilemap = await server.ssrLoadModule('/src/runtime/tilemap.ts')
  const components = await server.ssrLoadModule('/src/world/components.ts')
  const { BoxEntity } = await server.ssrLoadModule('/src/world/BoxEntity.ts')

  const regionEntity = new BoxEntity(1, { x: 0, y: 0 }, { x: 10, y: 10 }, '00000000-0000-4000-8000-000000000001')
  const region = regionEntity.addComponent(new components.NavigationRegion2D())
  Object.assign(region, { polygon: [{ x: -5, y: -5 }, { x: 5, y: -5 }, { x: 5, y: 5 }, { x: -5, y: 5 }], cellSize: .25, algorithm: 'HierarchicalAStar', clusterSize: 8, agentRadius: 0, links: [], costAreas: [{ id: 'mud', name: 'Mud', shape: 'Box', center: { x: 0, y: -2 }, size: { x: 4, y: 1 }, radius: 1, multiplier: 4, navigationLayer: 1, enabled: true }] })
  const obstacleEntity = new BoxEntity(2, { x: 0, y: 0 }, { x: 1, y: 10 }, '00000000-0000-4000-8000-000000000002')
  const obstacle = obstacleEntity.addComponent(new components.NavigationObstacle2D()); Object.assign(obstacle, { shape: 'Box', size: { x: 1, y: 10 }, radius: .5, dynamic: false, navigationLayer: 1 })
  navigation.bakeNavigationGrid(regionEntity, [regionEntity, obstacleEntity])
  const impossible = navigation.findNavigationPath(regionEntity, { x: -4, y: 0 }, { x: 4, y: 0 }, [regionEntity, obstacleEntity])
  check('V570-IMPOSSIBLE-PATH', impossible.length === 0 && navigation.navigationProfileSnapshot().failedQueries > 0, 'A solid world-height obstacle produces a finite Unreachable result instead of an invalid route.', { points: impossible.length })

  const cancellation = navigation.requestNavigationBake([regionEntity, obstacleEntity]); const navCancelAccepted = navigation.cancelNavigationBake(); const cancelledBake = await cancellation
  check('V570-NAV-BAKE-CANCEL', navCancelAccepted && cancelledBake.cancelled && !navigation.navigationBakeState.active, 'Navigation baking accepts cancellation before the first bounded region and leaves the worker idle.', { progress: navigation.navigationBakeState.progress })

  const navigationAgents = Array.from({ length: 10_001 }, (_, index) => { const entity = new BoxEntity(10_000 + index, { x: index % 100, y: Math.floor(index / 100) }, { x: .2, y: .2 }, `10000000-0000-4000-${String(8000 + Math.floor(index / 10_000)).padStart(4, '0')}-${String(index).padStart(12, '0')}`); const agent = entity.addComponent(new components.NavigationAgent2D()); agent.avoidance = false; return entity })
  const navStarted = performance.now(); navigation.updateNavigation(navigationAgents, 1 / 60, 0); const navElapsedMs = performance.now() - navStarted; const navProfile = navigation.navigationProfileSnapshot()
  check('V570-NAV-10000-BOUND', navProfile.activeAgents === 10_000 && navProfile.droppedAgents === 1 && navProfile.maximumNeighbors <= navigation.MAX_NAVIGATION_AVOIDANCE_NEIGHBORS, 'Navigation processes at most 10,000 agents and enforces its local avoidance-neighbor cap.', { elapsedMs: navElapsedMs, activeAgents: navProfile.activeAgents, droppedAgents: navProfile.droppedAgents, maximumNeighbors: navProfile.maximumNeighbors })

  const legacyTree = ai.normalizeBehaviorTree({ version: 1, root: 'act', nodes: [{ id: 'act', type: 'Action', name: 'Act', children: [], condition: '', action: 'act', seconds: 0 }] })
  const modernTree = ai.normalizeBehaviorTree({ version: 2, root: 'choose', blackboard: { danger: .5 }, perception: [{ id: 'vision', tags: ['target'], radius: 20, fieldOfView: 90, maximumResults: 999, blackboardKey: 'seen' }], nodes: [{ id: 'choose', type: 'UtilitySelector', name: 'Choose', children: ['act'], condition: '', action: '', seconds: 0 }, { id: 'act', type: 'Action', name: 'Act', children: [], condition: '', action: 'act', seconds: 0, scoreKey: 'danger', weight: 2, bias: .1 }] })
  check('V570-AI-MIGRATION', legacyTree?.version === 1 && modernTree?.version === 2 && modernTree.perception?.[0].maximumResults === ai.MAX_PERCEPTION_RESULTS && modernTree.nodes[0].type === 'UtilitySelector', 'Behavior Tree v1 remains readable while v2 safely bounds blackboards, perception and utility data.')
  for (const entity of navigationAgents) entity.addComponent(new components.BehaviorTree2D())
  const aiStarted = performance.now(); ai.updateAi(navigationAgents, 1 / 60, 0); const aiElapsedMs = performance.now() - aiStarted
  check('V570-AI-10000-BOUND', ai.aiDebugState.activeAgents === 10_000 && ai.aiDebugState.droppedAgents === 1 && ai.aiDebugState.tickedAgents === ai.MAX_AI_TICKS_PER_FRAME, 'AI retains 10,000 active agents and time-slices graph work to the deterministic per-frame budget.', { elapsedMs: aiElapsedMs, activeAgents: ai.aiDebugState.activeAgents, tickedAgents: ai.aiDebugState.tickedAgents, deferredAgents: ai.aiDebugState.deferredAgents, droppedAgents: ai.aiDebugState.droppedAgents })

  const cell = new BoxEntity(30_001, { x: 0, y: 0 }, { x: 4, y: 4 }, '30000000-0000-4000-8000-000000000001')
  cell.addComponent(new components.WorldChunk2D())
  const member = new BoxEntity(30_002, { x: 3, y: 4 }, { x: 1, y: 1 }, '30000000-0000-4000-8000-000000000002'); member.parentUuid = cell.uuid; member.velocity = { x: 7, y: -2 }; member.angularVelocity = .75
  streaming.captureStreamCellState(cell.uuid, [cell, member]); const serialized = streaming.exportWorldStreamingHandoffs(); streaming.resetWorldStreaming(); const imported = streaming.importWorldStreamingHandoffs(serialized)
  member.transform.position = { x: 999, y: 999 }; member.velocity = { x: 0, y: 0 }; member.angularVelocity = 0
  const restored = streaming.restoreStreamCellState(cell.uuid, [cell, member])
  check('V570-STREAM-SAVE-RELOAD', imported === 1 && restored && member.transform.position.x === 3 && member.transform.position.y === 4 && member.velocity.x === 7 && member.velocity.y === -2 && member.angularVelocity === .75, 'Streamed descendants serialize and restore transform plus physics state across reset/reload.', { bytes: serialized.length })

  const map = new components.TileMap2D(); Object.assign(map, { width: 64, height: 32, chunkSize: 8, bakeCollision: false, bakeNavigation: false, bakeOccluders: false }); map.tiles = Array(map.width * map.height).fill(-1); map.layers[0].tiles = map.tiles; map.layers[0].transforms = Array(map.tiles.length).fill(0)
  const firstStorage = tilemap.deterministicTileMapStorage(map), secondStorage = tilemap.deterministicTileMapStorage(map)
  check('V570-TILE-DETERMINISM', firstStorage === secondStorage && firstStorage.includes('tilesRle'), 'TileMap storage is byte-stable and run-length encoded for identical authored state.', { bytes: firstStorage.length })
  const tileCancellation = tilemap.requestTileMapBake(map); const tileCancelAccepted = tilemap.cancelTileMapBake(); const cancelledTileBake = await tileCancellation
  check('V570-TILE-BAKE-CANCEL', tileCancelAccepted && cancelledTileBake.cancelled && !tilemap.tileBakeState.active, 'Background TileMap baking cancels cleanly between bounded chunks.', { totalChunks: tilemap.tileBakeState.totalChunks })
} finally { await Promise.race([server.close(), new Promise(resolve => setTimeout(resolve, 2_000))]) }

const failed = checks.filter(item => item.status === 'failed'), report = { format: 'nova-v5.7.0-world-verification', version: 1, engineVersion: '5.7.0', generatedAt: new Date().toISOString(), checks, severity0Open: 0, severity1Open: failed.length, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(join(root, 'release-audits/v5.7.0-world-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) process.exit(1)
console.log(`Nova_A v5.7.0 world verification passed: ${checks.length} checks.`)
