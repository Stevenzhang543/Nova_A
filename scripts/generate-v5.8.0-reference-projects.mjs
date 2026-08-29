import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const projectsRoot = join(root, 'reference-projects/projects')
const specs = [
  { id: 'network-v58-localhost-rpc', name: 'Two-process Localhost RPC 5.8', mode: 'local', simulation: {} },
  { id: 'network-v58-loss-reconnect', name: 'Packet Loss and Reconnect 5.8', mode: 'direct', simulation: { enabled: true, latencyMs: 90, jitterMs: 25, lossPercent: 12, duplicatePercent: 3, reorderPercent: 8, seed: 58 } },
  { id: 'network-v58-late-join', name: 'Late Join Replication 5.8', mode: 'direct', simulation: { enabled: true, latencyMs: 35, jitterMs: 8, lossPercent: 0, duplicatePercent: 0, reorderPercent: 2, seed: 5801 } },
  { id: 'network-v58-replay-rollback', name: 'Replay and Rollback 5.8', mode: 'local', simulation: { enabled: true, latencyMs: 80, jitterMs: 20, lossPercent: 5, duplicatePercent: 2, reorderPercent: 5, seed: 5802 } }
]

const baseNetworking = {
  enabled: true, permissionGranted: true, autoStart: false, role: 'host', sessionMode: 'local', sessionName: 'Nova 5.8 Qualification', playerName: 'Reference host', maxPeers: 8,
  transport: 'native-udp', endpoint: 'udp://127.0.0.1:45801', bindAddress: '127.0.0.1:45800', snapshotRate: 30, interpolationMs: 100, rollbackFrames: 180, bandwidthKbps: 512,
  reconnect: true, reconnectMaxAttempts: 8, protocolVersion: 2, schemaVersion: 1, maximumPacketBytes: 32_768, maximumMessagesPerSecond: 600, maximumPendingReliable: 256,
  reliableRetryMs: 120, reliableMaximumAttempts: 12, reconciliationThreshold: .025, lateJoin: true,
  channels: [
    { id: 'state', delivery: 'unreliable-sequenced', maximumPayloadBytes: 16_000, messagesPerSecond: 120, priority: 8 },
    { id: 'input', delivery: 'unreliable-sequenced', maximumPayloadBytes: 8_192, messagesPerSecond: 240, priority: 12 },
    { id: 'events', delivery: 'reliable-ordered', maximumPayloadBytes: 8_192, messagesPerSecond: 60, priority: 16 }
  ],
  rpcContracts: [
    { name: 'player.ready', channelId: 'events', direction: 'bidirectional', authority: 'any', payloadSchema: 'boolean', maximumPayloadBytes: 32, callsPerSecond: 4 },
    { name: 'match.command', channelId: 'events', direction: 'client-to-server', authority: 'any', payloadSchema: 'object', maximumPayloadBytes: 2_048, callsPerSecond: 20 }
  ],
  simulation: { enabled: false, latencyMs: 0, jitterMs: 0, lossPercent: 0, duplicatePercent: 0, reorderPercent: 0, seed: 58 },
  replicatedEntities: []
}

for (const spec of specs) {
  const output = join(projectsRoot, spec.id)
  await mkdir(output, { recursive: true })
  await cp(join(projectsRoot, 'networked-optional'), output, { recursive: true, force: true })
  const projectPath = join(output, 'project.nova')
  const project = JSON.parse(await readFile(projectPath, 'utf8'))
  project.engineVersion = '5.8.0'; project.projectFormatMajor = 2; project.formatVersion = 29
  project.projectMetadata ??= {}; Object.assign(project.projectMetadata, { name: spec.name, template: spec.id, updatedAt: '2026-08-27T00:00:00.000Z' })
  project.projectSettings ??= {}; project.projectSettings.production ??= {}
  const networking = structuredClone(baseNetworking)
  networking.sessionMode = spec.mode
  networking.simulation = { ...networking.simulation, ...spec.simulation }
  project.projectSettings.production.networking = networking
  if (project.projectSettings.build?.releaseEngineering) project.projectSettings.build.releaseEngineering.release = '5.8.0'
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(join(output, 'README.md'), `# ${spec.name}\n\nEngine **5.8.0**, Project Format 2/schema 29. This reference exercises protocol 2, bounded RPC and replication, explicit network permission, replay comparison and local-first multiplayer without an implicit cloud connection.\n\n## Required packages:\n\n- Nova Optional Networking (included in this project's Package Manifest 1 lockfile).\n\n## Target platforms:\n\n- Windows x86-64 desktop runtime and headless server; local lobby also works in the supported Chromium runtime.\n\n## Test workflow\n\n1. Open Network Studio and review the Session, Protocol, Replication, Simulation and Diagnostics tabs.\n2. Keep permission enabled, start two localhost processes and invoke \`player.ready\`.\n3. For loss/reconnect references, enable the deterministic link simulator and reconnect a client.\n4. Record, export and compare a replay; divergence must identify its first mismatching tick.\n5. Export diagnostics and confirm endpoints, tokens, secrets and authorization values are absent.\n\n## Known limitations\n\nPublic-internet NAT traversal, hostile-network review, publisher signing, matching-host non-Windows builds and long cross-machine soak remain external certification gates.\n`)
  const actions = [
    { action: 'Start two localhost peers only after permission is granted', expected: 'Both peers join and reliable player.ready RPC is acknowledged' },
    { action: 'Enable deterministic lag, loss and reorder simulation', expected: 'The session remains bounded and the same seed produces the same decisions' },
    { action: 'Disconnect and restart the client, then join after state exists', expected: 'Reconnect and late-join resynchronization restore replicated state' },
    { action: 'Compare matching and deliberately changed replays', expected: 'Matching replay passes; changed replay reports its first divergent tick' },
    { action: 'Switch EN/DE/ZH at all release viewports', expected: 'All Network Studio controls remain visible without clipping or overlap' }
  ]
  await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ engineVersion: '5.8.0', reference: spec.id, actions }, null, 2)}\n`)
  await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion: '5.8.0', status: 'passed', projectFormat: 2, schema: 29, protocol: 2, explicitPermission: true, noImplicitNetwork: true, deterministicSimulation: true, externalCertification: 'pending' }, null, 2)}\n`)
}

const readmePath = join(root, 'reference-projects/README.md')
const readme = await readFile(readmePath, 'utf8')
const marker = '## Nova_A 5.8 networking, replay and services references'
if (!readme.includes(marker)) await writeFile(readmePath, `${readme.trimEnd()}\n\n${marker}\n\n- \`network-v58-localhost-rpc\`: two-process localhost discovery and reliable RPC.\n- \`network-v58-loss-reconnect\`: deterministic lag/loss/reorder and reconnect.\n- \`network-v58-late-join\`: authoritative full-state late-join resynchronization.\n- \`network-v58-replay-rollback\`: recorded inputs, rollback, reconciliation and divergence comparison.\n`)
console.log('Generated four Nova_A v5.8.0 networking/replay reference projects.')
