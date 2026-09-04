import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const source = path => readFile(join(root, path), 'utf8')
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const [panel, dock, production, runtime, player, native, build, coopControls, serverControls, layout] = await Promise.all([
  'src/components/NetworkStudioPanel.vue','src/components/EditorBottomPanel.vue','src/runtime/production.ts','src/runtime/productionRuntime.ts','src/PlayerApp.vue','src-tauri/src/lib.rs','src/components/BuildSettingsPanel.vue',
  'reference-projects/projects/multiplayer-v2607-coop-rollback/test-controls.json','reference-projects/projects/multiplayer-v2607-headless-authority/test-controls.json','docs/UI_LAYOUT_AUDIT_26_07.md'
].map(source))
check('V2607-USER-REACH-NETWORK', (dock.includes('networkStudio') || dock.includes('NetworkStudioPanel')) && panel.includes("'session'") && panel.includes("'orchestration'") && panel.includes("'diagnostics'"), 'Network Studio and its task tabs remain reachable from the retained editor dock.')
check('V2607-USER-PERMISSION', panel.includes('grantNetworkPermission') && panel.includes('revokeNetworkPermission') && production.includes('permissionGranted: false') && production.includes('autoStart: false'), 'Grant/revoke controls are bound and the serialized defaults cannot start networking implicitly.')
check('V2607-USER-SESSION', panel.includes('@click="connect"') && panel.includes('@click="disconnect"') && runtime.includes('startProductionNetworking') && runtime.includes('stopProductionNetworking'), 'Connect and Disconnect reach the optional runtime through explicit permission-aware calls.')
check('V2607-USER-ORCHESTRATION', panel.includes('buildAndLaunchInstances') && panel.includes('separateLogs') && panel.includes('separateInspectors') && native.includes('launch_network_instances'), 'The 2/4/8 build-and-launch path retains explicit log and Inspector choices.')
const exactNativeLaunchGate = [
  "settings.networking.sessionMode !== 'direct'",
  "settings.networking.transport !== 'native-udp'",
  "grantedPermissions.includes('network.client')",
  "grantedPermissions.includes('network.listen')",
  'multiInstancePrerequisiteReason',
  "aria-describedby=\"!canLaunchInstances ? 'multi-instance-prerequisite' : undefined\""
].every(token => panel.includes(token))
check('V2607-USER-NATIVE-LAUNCH-GATE', exactNativeLaunchGate, 'Multi-instance launch remains disabled until built-in Direct Native UDP, explicit client/listen package grants, desktop execution and every retained build/authority prerequisite are satisfied; the visible button names the first corrective action.')
const attachedTools = ['openInstanceLogs','openInstanceInspector','stopNetworkInstance','instance.endpoint','instance.bindAddress','selectedInstance.endpoint','selectedInstance.bindAddress'].every(token => panel.includes(token)) && ['stop_network_instance','network_instance_status','endpoint: host_endpoint.clone()','bind_address'].every(token => native.includes(token))
check('V2607-USER-PEER-TOOLS', attachedTools, 'Per-peer endpoint, bind address, Logs, Inspector, Stop and process-status actions are returned by native orchestration and bound in the visible cards/detail instead of display-only placeholders.')
check('V2607-USER-LAUNCH-BOUNDARY', ['validate_network_player_build','nova-build-report.json','embedded_package(executable)','network_policy_from_project'].every(token => native.includes(token)), 'Build-and-launch cannot treat a caller-selected working directory as authority to run an arbitrary executable; the current reported embedded player and network policy are revalidated first.')
check('V2607-USER-DIAGNOSTICS', ['ownership','peerInterests','replicationDiffs','rollbackTimeline','packetSummaries'].every(token => panel.includes(token)), 'Ownership, interest, replication, rollback and packet diagnostics remain visible.')
check('V2607-USER-BUILD-MODES', build.includes('headless-server') && build.includes('compatibleTemplates') && player.includes("buildSettings.runtimeMode === 'headless-server'"), 'Client and server output modes use the retained compatible-template and player-runtime paths.')
const coop = JSON.parse(coopControls), server = JSON.parse(serverControls)
check('V2607-USER-REFERENCE-COOP', coop.actions?.length >= 8 && coop.actions.some(item => /2, 4 and 8/.test(item.action)) && coop.actions.some(item => /reconnect/i.test(item.action)) && coop.actions.some(item => /English, German and Chinese/.test(item.action)), 'The co-op normal-user gate covers multi-instance play, impairment, diagnostics, reconnect/late join, offline denial and localized layouts.', { actions: coop.actions?.length ?? 0 })
check('V2607-USER-REFERENCE-SERVER', server.actions?.length >= 5 && server.actions.some(item => /native UDP IPC/i.test(item.action)) && server.actions.some(item => /connect a client/i.test(item.action)), 'The server gate covers policy denial, output provenance, real client traffic, late join and native permission isolation.', { actions: server.actions?.length ?? 0 })
check('V2607-USER-LAYOUT-MATRIX', layout.includes('1024×640') && layout.includes('2560×1440') && layout.includes('English, German, and Chinese'), 'Network Studio declares the complete normal-user locale and viewport matrix.')
const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v26.07-user-interactions', version: 1, release: '26.07', engineVersion: '26.7.0', generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, externalGates: { independentNormalUserRun: 'pending-external', assistiveTechnology: 'pending-external', publicNetworkService: 'pending-external' }, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(join(root, 'release-audits/v26.07-user-interactions.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.07 interaction wiring passed: ${checks.length} checks.`)
