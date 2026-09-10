import { createHash } from 'node:crypto'
import { fork, spawn, spawnSync } from 'node:child_process'
import { createSocket } from 'node:dgram'
import { mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { observeHeadlessPeer, waitForHeadlessPeer } from './lib/headlessPeerDiagnostics.mjs'

const release = process.env.NOVA_HEADLESS_RELEASE || '26.07'
const engineVersion = process.env.NOVA_HEADLESS_ENGINE_VERSION || '26.7.0'
const referenceId = process.env.NOVA_HEADLESS_REFERENCE || 'multiplayer-v2607-headless-authority'
const gameName = process.env.NOVA_HEADLESS_GAME_NAME || 'Nova 26.07 Headless Authority'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
if (process.platform !== 'win32') throw new Error(`The Nova_A ${release} headless authority verifier requires a Windows matching-host runner.`)
const editor = join(root, 'src-tauri/target/release/nova_a.exe')
const referenceProjectPath = join(root, `reference-projects/projects/${referenceId}/project.nova`)
const output = join(root, `release-audits/headless-output-v${release}`)
const negativeRoot = join(root, `release-audits/headless-negative-v${release}`)
const runtimeInputRoot = join(root, `release-audits/headless-runtime-input-v${release}`)
const executable = join(output, `${gameName}.exe`)
for (const path of [editor, referenceProjectPath]) await stat(path)
await rm(output, { recursive: true, force: true }); await rm(negativeRoot, { recursive: true, force: true }); await rm(runtimeInputRoot, { recursive: true, force: true })
await mkdir(output, { recursive: true }); await mkdir(negativeRoot, { recursive: true }); await mkdir(runtimeInputRoot, { recursive: true })
const [serverPort, clientPort, reconnectPort, wrongSessionPort] = await distinctUdpPorts(4)
const baseProject = JSON.parse(await readFile(referenceProjectPath, 'utf8'))
baseProject.projectSettings.production.networking.bindAddress = `127.0.0.1:${serverPort}`
baseProject.projectSettings.production.networking.endpoint = `udp://127.0.0.1:${clientPort}`
const projectPath = join(runtimeInputRoot, 'project.nova')
await writeFile(projectPath, `${JSON.stringify(baseProject)}\n`)

const exportCommand = (project, destination) => [join(root, 'scripts/nova-export.mjs'), '--project', project, '--target', 'windows', '--output', destination, '--profile', 'release', '--architecture', 'x86_64', '--runtime', 'headless-server', '--single-file']
const command = exportCommand(projectPath, output)
const exported = spawnSync(process.execPath, command, { cwd: root, encoding: 'utf8', windowsHide: true })
if (exported.status !== 0) throw new Error(`${release} headless export failed: ${exported.stderr || exported.stdout}`)
const bytes = await readFile(executable), footerStart = bytes.length - 48
if (footerStart <= 0 || bytes.subarray(footerStart, footerStart + 8).toString('ascii') !== 'NOVAPK2!') throw new Error('Exported headless authority has no Nova embedded-package footer.')
const packageLength = Number(bytes.readBigUInt64LE(footerStart + 8)), packageStart = footerStart - packageLength
if (!Number.isSafeInteger(packageLength) || packageStart <= 0) throw new Error('Exported headless authority reports an invalid embedded-package length.')
const embedded = bytes.subarray(packageStart, footerStart), expectedPackageHash = bytes.subarray(footerStart + 16).toString('hex'), packageSha256 = createHash('sha256').update(embedded).digest('hex')
if (packageSha256 !== expectedPackageHash) throw new Error('Exported headless authority embedded-package SHA-256 does not match.')
const { project: packagedProject } = decodeRuntimeProject(embedded)
const sessionName = packagedProject.projectSettings?.production?.networking?.sessionName
if (typeof sessionName !== 'string' || !sessionName.trim() || sessionName.length > 80) throw new Error('Packaged server session identity must be a nonempty name of at most 80 characters.')
const networkSettings = packagedProject.projectSettings.production.networking, peerSettingsPath = join(output, 'headless-peer-settings.json')
await writeFile(peerSettingsPath, JSON.stringify({ format: 'nova-headless-peer-settings', version: 1, schemaVersion: networkSettings.schemaVersion, protocolVersion: networkSettings.protocolVersion, replicatedEntities: networkSettings.replicatedEntities ?? [], channels: networkSettings.channels, rpcContracts: networkSettings.rpcContracts }) + '\n')
const packagedDelivery = packagedProject.projectSettings?.build?.delivery ?? {}
if (packagedProject.projectSettings?.build?.platform?.signingIdentity || packagedProject.projectSettings?.build?.platform?.notarizationProfile || packagedDelivery.signingHook || packagedDelivery.notarizationHook || packagedDelivery.deploymentDestination) throw new Error('Packaged server retained editor-only signing, notarization, or deployment configuration.')
for (const entry of [...(packagedProject.packages?.installed ?? []), ...(packagedProject.packages?.lockfile ?? [])]) if (/[\\/:@]/.test(String(entry?.source?.location ?? ''))) throw new Error('Packaged server retained a path- or credential-shaped package source location.')
const buildReport = JSON.parse(await readFile(join(output, 'nova-build-report.json'), 'utf8')), editorBytes = await readFile(editor), editorSha256 = createHash('sha256').update(editorBytes).digest('hex')
if (buildReport.playerTemplate?.sha256 !== editorSha256 || buildReport.playerTemplate?.templateId !== 'windows-headless-x64-v1' || buildReport.playerTemplate?.source !== 'matching-host-default' || buildReport.playerTemplate?.trust !== 'local-build-observed-unsigned' || buildReport.playerTemplate?.registeredHashVerification !== 'pending-signed-template-registry') throw new Error('Headless build report does not record the exact local matching-host player and its unsigned trust boundary.')

const negativeCases = [
  ['package-absent', project => { project.packages.installed = project.packages.installed.filter(item => item.manifest?.id !== 'top.whitelists.novaa.networking'); project.packages.lockfile = project.packages.lockfile.filter(item => item.id !== 'top.whitelists.novaa.networking') }],
  ['network-disabled', project => { project.projectSettings.production.networking.enabled = false }],
  ['permission-revoked', project => { project.projectSettings.production.networking.permissionGranted = false }],
  ['package-grants-revoked', project => { const installed = project.packages.installed.find(item => item.manifest?.id === 'top.whitelists.novaa.networking'); installed.grantedPermissions = [] }],
  ['autostart-disabled', project => { project.projectSettings.production.networking.autoStart = false }],
  ['client-authority', project => { project.projectSettings.production.networking.role = 'client' }],
  ['local-session', project => { project.projectSettings.production.networking.sessionMode = 'local' }],
  ['unsupported-transport', project => { project.projectSettings.production.networking.transport = 'websocket'; project.projectSettings.production.networking.transportAdapterId = ''; project.projectSettings.production.networking.endpoint = 'wss://example.invalid/game' }]
]
const policyRejections = []
for (const [id, mutate] of negativeCases) {
  const project = structuredClone(baseProject); mutate(project)
  const caseRoot = join(negativeRoot, id), invalidProject = join(caseRoot, 'project.nova'), caseOutput = join(caseRoot, 'output')
  await mkdir(caseRoot, { recursive: true }); await writeFile(invalidProject, `${JSON.stringify(project)}\n`)
  const result = spawnSync(process.execPath, exportCommand(invalidProject, caseOutput), { cwd: root, encoding: 'utf8', windowsHide: true })
  policyRejections.push({ id, rejected: result.status !== 0, status: result.status, diagnostic: `${result.stderr || result.stdout}`.trim().slice(0, 1_000) })
}
const explicitPlayer = spawnSync(process.execPath, [...exportCommand(projectPath, join(negativeRoot, 'explicit-player-output')), '--player', editor], { cwd: root, encoding: 'utf8', windowsHide: true })
policyRejections.push({ id: 'unverified-explicit-headless-player', rejected: explicitPlayer.status !== 0, status: explicitPlayer.status, diagnostic: `${explicitPlayer.stderr || explicitPlayer.stdout}`.trim().slice(0, 1_000) })
const nestedPayload = Buffer.from('nested-project'), nestedLength = Buffer.alloc(8); nestedLength.writeBigUInt64LE(BigInt(nestedPayload.length))
const nestedPlayerPath = join(negativeRoot, 'nested-player.exe')
await writeFile(nestedPlayerPath, Buffer.concat([Buffer.from('MZ-nova-verifier'), nestedPayload, Buffer.from('NOVAPK2!'), nestedLength, createHash('sha256').update(nestedPayload).digest()]))
const nestedPlayer = spawnSync(process.execPath, [join(root, 'scripts/nova-export.mjs'), '--project', projectPath, '--target', 'windows', '--output', join(negativeRoot, 'nested-player-output'), '--profile', 'release', '--architecture', 'x86_64', '--runtime', 'game', '--single-file', '--template', 'windows-x64-v1', '--player', nestedPlayerPath], { cwd: root, encoding: 'utf8', windowsHide: true })
policyRejections.push({ id: 'nested-embedded-player', rejected: nestedPlayer.status !== 0, status: nestedPlayer.status, diagnostic: `${nestedPlayer.stderr || nestedPlayer.stdout}`.trim().slice(0, 1_000) })

const escapeCaseRoot = join(negativeRoot, 'asset-junction-escape'), escapeAssetRoot = join(escapeCaseRoot, 'Assets'), outsideAssetRoot = join(negativeRoot, 'outside-project-assets')
await mkdir(escapeAssetRoot, { recursive: true }); await mkdir(outsideAssetRoot, { recursive: true }); await writeFile(join(outsideAssetRoot, 'secret.bin'), 'must-not-package')
await symlink(outsideAssetRoot, join(escapeAssetRoot, 'Escape'), 'junction')
const escapeProject = structuredClone(baseProject)
escapeProject.assets.push({ uuid: '67000000-0000-4000-8000-000000000099', name: 'Escaped asset', path: 'Assets/Escape/secret.bin', assetType: 'image', mimeType: 'application/octet-stream', byteLength: 16, hash: '' })
const escapeProjectPath = join(escapeCaseRoot, 'project.nova')
await writeFile(escapeProjectPath, `${JSON.stringify(escapeProject)}\n`)
const escapedAsset = spawnSync(process.execPath, exportCommand(escapeProjectPath, join(escapeCaseRoot, 'output')), { cwd: root, encoding: 'utf8', windowsHide: true })
policyRejections.push({ id: 'asset-junction-outside-project', rejected: escapedAsset.status !== 0 && /outside the project directory/i.test(`${escapedAsset.stderr || escapedAsset.stdout}`), status: escapedAsset.status, diagnostic: `${escapedAsset.stderr || escapedAsset.stdout}`.trim().slice(0, 1_000) })

const traffic = await serverTrafficSmoke(executable, serverPort, clientPort, reconnectPort, wrongSessionPort, sessionName)
const policyPassed = policyRejections.every(item => item.rejected)
const artifact = { path: executable, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
const status = traffic.status === 'passed' && policyPassed ? 'passed' : 'failed'
const report = {
  format: `nova-v${release}-headless-authority-verification`, version: 1, release, engineVersion, generatedAt: new Date().toISOString(),
  export: { command: command.slice(1), sourceReference: referenceProjectPath, output: executable, runtimeMode: 'headless-server', singleFile: !await exists(join(output, 'game.nova-pak')), packageLength, packageSha256, playerTemplate: buildReport.playerTemplate, localBuildMetadataRedacted: true, sessionName, ephemeralPorts: { server: serverPort, firstClient: clientPort, reconnectClient: reconnectPort, wrongSessionClient: wrongSessionPort } },
  artifact, policyRejections, traffic,
  qualification: { worldRendererDisabled: 'verified-by-runtime-contract', nativeNoWindowService: 'pending-external-separate-template-required', signedPlayerTemplateRegistry: 'pending-external', publicEncryptedDeployment: 'pending-external', hostileNetworkReview: 'pending-external', soak72Hours: 'pending-external' },
  status
}
await writeFile(join(root, `release-audits/v${release}-headless-smoke.json`), `${JSON.stringify(report, null, 2)}\n`)
if (status !== 'passed') throw new Error(`${release} local server smoke failed: policy=${policyPassed}, traffic=${traffic.status}`)
console.log(`Nova_A ${release} WebView-backed server export policy, embedded package, authoritative snapshots and localhost reconnect traffic passed; no-window service qualification remains pending.`)

async function serverTrafficSmoke(path, serverPort, clientPort, reconnectPort, wrongSessionPort, sessionName) {
  const server = spawn(path, [], { cwd: dirname(path), windowsHide: true, stdio: 'ignore' })
  let serverExit = null, serverError = ''
  server.once('exit', (code, signal) => { serverExit = { code, signal } })
  server.once('error', error => { serverError = error instanceof Error ? error.message : String(error) })
  try {
    const first = await exercisePeer(clientPort, serverPort, 'first-connect', sessionName)
    const wrongSession = await exercisePeer(wrongSessionPort, serverPort, 'wrong-session', `rejected-${createHash('sha256').update(sessionName).digest('hex').slice(0, 32)}`, false)
    await new Promise(resolve => setTimeout(resolve, 250))
    const reconnect = await exercisePeer(reconnectPort, serverPort, 'late-reconnect', sessionName)
    const passed = serverExit === null && !serverError && first.status === 'passed' && wrongSession.status === 'passed' && reconnect.status === 'passed'
    return { status: passed ? 'passed' : 'failed', serverStayedAlive: serverExit === null && !serverError, serverExit, serverError, first, wrongSession, reconnect, shutdown: 'terminated-by-local-verification-harness' }
  } catch (error) {
    return { status: 'failed', serverStayedAlive: serverExit === null && !serverError, serverExit, serverError, error: error instanceof Error ? error.message : String(error), shutdown: 'terminated-by-local-verification-harness' }
  } finally {
    if (serverExit === null) server.kill()
    await Promise.race([new Promise(resolve => server.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 2_000))])
  }
}

async function exercisePeer(localPort, serverPort, phase, sessionName, expectAdmission = true) {
  const peer = fork(join(root, 'scripts/network-peer-v6.6.0.mjs'), ['client', String(localPort), String(serverPort), sessionName, peerSettingsPath], { cwd: root, stdio: ['ignore','pipe','pipe','ipc'] })
  const messages = [], diagnostic = observeHeadlessPeer(peer); let step = 'ready'
  peer.on('message', value => messages.push(value))
  try {
    const ready = await waitForHeadlessPeer(() => messages.find(item => item?.type === 'ready'), diagnostic, `${phase}:ready`, 15_000)
    await new Promise(resolve => setTimeout(resolve, 1_500)); peer.send({ type: 'exercise' })
    step = 'report'
    const result = await waitForHeadlessPeer(() => [...messages].reverse().find(item => item?.type === 'report'), diagnostic, `${phase}:report`, 20_000)
    const authorityPeer = result.state?.peerDetails?.find(item => item.role === 'server' || item.role === 'host')
    const timedOutClosed = result.state?.status === 'error' && /^Reliable delivery to \* exhausted its acknowledgement retries\./.test(result.state?.lastError ?? '') && result.runtime?.reliablePending === 0
    const exercised = Boolean(ready) && (result.state?.status === 'connected' || !expectAdmission && timedOutClosed) && result.state?.sentPackets > 0 && result.exercisedTicks === 180
    const expectedReplicaCount = networkSettings.replicatedEntities?.length ?? 0
    const restoredBaseline = (result.state?.events ?? []).map(item => /^Late-join baseline restored (\d+) entities and current authority state\.$/.exec(item.message ?? '')).filter(Boolean).map(match => Number(match[1]))
    const replicaStateApplied = result.replicaState?.length === expectedReplicaCount && result.replicaState.every(entity => entity.position?.length === 2 && entity.position.every(Number.isFinite) && !entity.position.every(value => value === 999_999))
    const admitted = result.state?.peers >= 1 && result.state?.receivedPackets > 0 && result.state?.snapshots > 0 && result.state?.invalidPackets === 0 && result.state?.schemaRejected === 0 && result.state?.lateJoins > 0 && restoredBaseline.some(count => count >= expectedReplicaCount) && replicaStateApplied && Boolean(authorityPeer)
    const rejected = result.state?.peers === 0 && result.state?.snapshots === 0 && result.state?.receivedPackets === 0 && result.state?.lateJoins === 0 && !authorityPeer && result.replicaState?.length === expectedReplicaCount && result.replicaState.every(entity => entity.position?.length === 2 && entity.position.every(value => value === 999_999))
    const passed = exercised && (expectAdmission ? admitted : rejected)
    return { phase, status: passed ? 'passed' : 'failed', expectedAdmission: expectAdmission, timedOutClosed, networkStatus: result.state?.status, reliablePending: result.runtime?.reliablePending, sessionName, localPort, id: result.state?.localPeerId, authorityPeer: authorityPeer ? { id: authorityPeer.id, role: authorityPeer.role } : null, peers: result.state?.peers, snapshots: result.state?.snapshots, receivedPackets: result.state?.receivedPackets, sentPackets: result.state?.sentPackets, invalidPackets: result.state?.invalidPackets, schemaRejected: result.state?.schemaRejected, lateJoins: result.state?.lateJoins, expectedReplicaCount, restoredBaseline, replicaState: result.replicaState, lastError: result.state?.lastError, fixedTicks: result.runtime?.tick, exercisedTicks: result.exercisedTicks, startup: diagnostic.startup, stderr: diagnostic.stderr, stdout: diagnostic.stdout }
  } catch (error) {
    return { phase, step, status: 'failed', expectedAdmission: expectAdmission, sessionName, localPort, peerExit: diagnostic.exit, peerError: diagnostic.error, startup: diagnostic.startup, stdout: diagnostic.stdout, stderr: diagnostic.stderr, error: error instanceof Error ? error.message : String(error) }
  } finally {
    if (peer.connected) peer.send({ type: 'stop' })
    await Promise.race([new Promise(resolve => peer.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 2_000))])
    if (!peer.killed) peer.kill()
  }
}

function decodeRuntimeProject(pack) {
  const maximumProjectBytes = 64 * 1024 * 1024
  if (pack.length < 16 || pack.subarray(0, 8).toString('binary') !== 'NOVAPAK\0') throw new Error('Embedded runtime package header is invalid.')
  const packageVersion = pack.readUInt32LE(8)
  if (packageVersion !== 1) throw new Error(`Unsupported embedded runtime package version ${packageVersion}.`)
  const indexLength = pack.readUInt32LE(12)
  if (!indexLength || indexLength > 16 * 1024 * 1024 || 16 + indexLength > pack.length) throw new Error('Embedded runtime package index is invalid or truncated.')
  let index
  try { index = JSON.parse(pack.subarray(16, 16 + indexLength).toString('utf8')) } catch (error) { throw new Error(`Embedded runtime package index is invalid: ${error instanceof Error ? error.message : String(error)}`) }
  if (index?.format !== 'nova-pak' || index?.version !== 1 || !Array.isArray(index.entries) || index.entries.length > 20_000) throw new Error('Embedded runtime package index contract or entry bound is invalid.')
  const projectEntries = index.entries.filter(entry => entry?.path === 'project.nova')
  if (projectEntries.length !== 1) throw new Error('Embedded runtime package must contain exactly one project.nova authority.')
  const entry = projectEntries[0], offset = Number(entry.offset), length = Number(entry.length), originalLength = Number(entry.originalLength)
  if (![offset, length, originalLength].every(Number.isSafeInteger) || offset < 0 || length < 0 || originalLength <= 0 || originalLength > maximumProjectBytes) throw new Error('Embedded project.nova bounds are invalid.')
  const start = 16 + indexLength + offset, end = start + length
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 16 + indexLength || end > pack.length) throw new Error('Embedded project.nova entry is truncated.')
  const stored = pack.subarray(start, end)
  let decoded
  if (entry.codec === 'store') decoded = stored
  else if (entry.codec === 'gzip') decoded = gunzipSync(stored, { maxOutputLength: maximumProjectBytes + 1 })
  else throw new Error(`Unsupported embedded project.nova codec ${String(entry.codec)}.`)
  if (decoded.length !== originalLength) throw new Error('Embedded project.nova decoded length does not match its index.')
  if (!/^[a-f0-9]{64}$/.test(String(entry.sha256 ?? '')) || createHash('sha256').update(decoded).digest('hex') !== entry.sha256) throw new Error('Embedded project.nova SHA-256 does not match its index.')
  try { return { index, project: JSON.parse(decoded.toString('utf8')) } } catch (error) { throw new Error(`Embedded project.nova is invalid JSON: ${error instanceof Error ? error.message : String(error)}`) }
}

async function distinctUdpPorts(count) {
  const ports = new Set()
  while (ports.size < count) {
    const socket = createSocket('udp4')
    const port = await new Promise((resolve, reject) => { socket.once('error', reject); socket.bind(0, '127.0.0.1', () => { const address = socket.address(); resolve(typeof address === 'object' ? address.port : 0) }) })
    await new Promise(resolve => socket.close(resolve))
    if (Number.isInteger(port) && port > 0) ports.add(port)
  }
  return [...ports]
}
async function exists(path) { try { await stat(path); return true } catch { return false } }
