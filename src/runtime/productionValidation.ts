/** 生产配置验证：检查制作数据的一致性并返回可定位的诊断。 */
import { resolveInterchangeTexture } from '../assets/interchangeBindings'
import { readTextAsset, resolveAsset, type AssetDatabaseState } from '../assets/AssetDatabase'
import { queryRendererCapabilities, rendererCapabilityState } from '../renderer/capabilities'
import { materialRuntimeDiagnostics, normalizeMaterial, validateMaterialForPlatform } from '../renderer/materials'
import { renderingSettings } from '../renderer/renderSettings'
import type { RendererStats } from '../renderer/types'
import type { AudioProjectSettings } from './audio'
import { audioRuntime } from './audio'
import { particleDiagnostics } from './particles'
import { OFFICIAL_NETWORKING_PACKAGE_ID, packageEnabled, packageState } from './packages'
import { productionSettings } from './production'
import { physicsState } from '../store/physics'
import { validateScriptContract } from './scriptContracts'
import { validateResourceProject } from './resources'
import { networkAuthenticationProviders, networkEncryptionGuidance, reviewedNetworkTransports } from './networkProduction'
import { networkServiceSelectionIssues } from './networkServices'
import { buildMediaProductionReport } from './mediaProduction26'
import { buildSimulationProductionReport } from './simulationAuthoring26'

export interface ProductionValidationIssue { code: string; severity: 'warning' | 'error'; message: string; fix: string }

/** 结构说明（自动提取）：validateProductionRuntime；输入 assets、renderer、audio；直接调用 queryRendererCapabilities、issues.push、materialRuntimeDiagnostics.fallbackEvents.slice、slice、assets.records.filter 等；包含循环处理。 */ export function validateProductionRuntime(assets: Pick<AssetDatabaseState, 'records'>, renderer: RendererStats, audio: AudioProjectSettings): ProductionValidationIssue[] {
  const issues: ProductionValidationIssue[] = [], capability = rendererCapabilityState.report ?? queryRendererCapabilities(renderer.backend)
  if (renderingSettings.rendererPath === 'Native' && capability.target === 'web') issues.push({ code: 'REN-PATH-UNAVAILABLE', severity: renderingSettings.unsupportedPolicy === 'Block' ? 'error' : 'warning', message: 'The Native renderer path was requested for a web runtime.', fix: 'Choose Auto or Compatibility for web builds.' })
  if (capability.path === 'Diagnostic fallback' && (renderingSettings.lightingEnabled || renderingSettings.postProcessing.enabled)) issues.push({ code: 'REN-FALLBACK-ACTIVE', severity: renderingSettings.unsupportedPolicy === 'Block' ? 'error' : 'warning', message: 'Advanced rendering is enabled while the Canvas2D diagnostic fallback is active.', fix: 'Restore WebGL2 or disable lighting/post processing in Rendering → Quality.' })
  for (const event of materialRuntimeDiagnostics.fallbackEvents.slice(0, 8)) issues.push({ code: 'SHD-EXPLICIT-FALLBACK', severity: renderingSettings.unsupportedPolicy === 'Block' ? 'error' : 'warning', message: `${event.reference}: ${event.reason}`, fix: event.actionableFix })
  for (const asset of assets.records.filter(/* 比较 asset.assetType 与 'material'，返回严格相等的判断结果。 */ asset => asset.assetType === 'material').slice(0, 512)) {
    const source = readTextAsset(asset.uuid); if (!source) { issues.push({ code: 'SHD-SOURCE-MISSING', severity: 'error', message: `${asset.name} has no readable material source.`, fix: 'Reimport or restore the material asset.' }); continue }
    try { const diagnostics = validateMaterialForPlatform(normalizeMaterial(JSON.parse(source)), capability.target, capability.backend); for (const diagnostic of diagnostics.filter(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error')) issues.push({ code: 'SHD-PLATFORM', severity: 'error', message: `${asset.name}: ${diagnostic.message}`, fix: 'Open Rendering → Shaders and use the indicated diagnostic line.' }) } catch { issues.push({ code: 'SHD-JSON', severity: 'error', message: `${asset.name} is not valid material JSON.`, fix: 'Restore the last valid material source or recreate the asset.' }) }
  }
  const textureMb = renderer.textureMemoryBytes / 1048576
  if (renderer.drawCalls > productionSettings.performance.drawCallBudget) issues.push({ code: 'REN-DRAW-BUDGET', severity: 'warning', message: `${renderer.drawCalls} draw calls exceed the ${productionSettings.performance.drawCallBudget} budget.`, fix: 'Open Rendering → Diagnostics and resolve the reported batch-break reasons.' })
  if (textureMb > productionSettings.performance.textureBudgetMb) issues.push({ code: 'REN-TEXTURE-BUDGET', severity: 'error', message: `${textureMb.toFixed(1)} MB of GPU textures exceed the ${productionSettings.performance.textureBudgetMb} MB budget.`, fix: 'Reduce texture max sizes/compression or atlas compatible sprites.' })
  if (renderer.gpuMs !== null && renderer.gpuMs > productionSettings.performance.gpuBudgetMs) issues.push({ code: 'REN-GPU-BUDGET', severity: 'warning', message: `${renderer.gpuMs.toFixed(2)} ms GPU time exceeds the ${productionSettings.performance.gpuBudgetMs} ms budget.`, fix: 'Capture the frame, inspect overdraw and reduce expensive post/material passes.' })
  if (particleDiagnostics.updateMs > productionSettings.performance.particleBudgetMs || particleDiagnostics.budgetExceeded) issues.push({ code: 'REN-PARTICLE-BUDGET', severity: 'warning', message: `${particleDiagnostics.activeParticles} particles use ${particleDiagnostics.updateMs.toFixed(2)} ms.`, fix: 'Lower emitter rates/lifetimes or the per-emitter maximum.' })
  const knownBuses = new Set(audio.mixer.buses.map(/* 返回 bus.id 的当前值。 */ bus => bus.id))
  for (const bus of audio.mixer.buses) for (const send of bus.sends) if (!knownBuses.has(send.target)) issues.push({ code: 'AUD-ROUTE-MISSING', severity: 'error', message: `${bus.name} sends to missing bus ${send.target}.`, fix: 'Choose an existing target bus in Presentation → Audio.' })
  if (audioRuntime.diagnostics.contextState === 'suspended' && audioRuntime.diagnostics.activeVoices) issues.push({ code: 'AUD-SUSPENDED', severity: 'error', message: 'Audio output is suspended while voices are active.', fix: 'Open Presentation → Audio and press Recover audio.' })
  if (audioRuntime.diagnostics.underruns > 0) issues.push({ code: 'AUD-UNDERRUN', severity: 'warning', message: `${audioRuntime.diagnostics.underruns} audio underruns were detected.`, fix: 'Prefer streaming for long music, preload short effects, and reduce simultaneous voices.' })
  if (audioRuntime.diagnostics.failures.length) issues.push({ code: 'AUD-FAILURE', severity: 'error', message: audioRuntime.diagnostics.failures[0].message, fix: audioRuntime.diagnostics.failures[0].recovery })
  for (const media of buildMediaProductionReport(assets.records, physicsState.world.entities, renderer, audio).issues) {
    if (issues.some(/* 先计算 item.code === media.code；仅当其为真值时求右侧 item.message === media.message，返回短路求值结果。 */ item => item.code === media.code && item.message === media.message)) continue
    issues.push({ code: media.code, severity: media.status === 'blocked' ? 'error' : 'warning', message: `${media.subsystem}: ${media.message}`, fix: media.fix })
  }
  for (const simulation of buildSimulationProductionReport(physicsState.world.entities, physicsState.world.connections, physicsState.globalSettings).issues) {
    issues.push({ code: simulation.code, severity: simulation.status === 'blocked' ? 'error' : 'warning', message: simulation.message, fix: simulation.fix })
  }
  const network = productionSettings.networking
  if (network.enabled && !packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID)) issues.push({ code: 'NET-PACKAGE-MISSING', severity: 'error', message: 'Networking is enabled but the optional Nova Networking package is not installed.', fix: 'Open Network Studio and install the reviewed optional package.' })
  if (network.enabled && !network.permissionGranted) issues.push({ code: 'NET-PERMISSION-DENIED', severity: 'error', message: 'Networking is enabled without an explicit project network permission.', fix: 'Review the transport and endpoint in Network Studio, then grant permission.' })
  if (network.enabled && !network.channels.some(/* 比较 channel.delivery 与 'reliable-ordered'，返回严格相等的判断结果。 */ channel => channel.delivery === 'reliable-ordered')) issues.push({ code: 'NET-RELIABLE-MISSING', severity: 'error', message: 'Networking has no reliable ordered channel for lifecycle and RPC messages.', fix: 'Restore or create a reliable ordered channel in Network Studio → Protocol.' })
  if (network.enabled && network.rpcContracts.some(/* 返回 network.channels.some(channel => channel.id === rpc.channelId) 的逻辑取反结果。 */ rpc => !network.channels.some(/* 比较 channel.id 与 rpc.channelId，返回严格相等的判断结果。 */ channel => channel.id === rpc.channelId))) issues.push({ code: 'NET-RPC-CHANNEL', severity: 'error', message: 'At least one RPC references a missing channel.', fix: 'Choose an existing channel for every RPC contract.' })
  if (network.enabled && network.transportAdapterId && !reviewedNetworkTransports().some(/* 比较 adapter.id 与 network.transportAdapterId，返回严格相等的判断结果。 */ adapter => adapter.id === network.transportAdapterId)) issues.push({ code: 'NET-ADAPTER-MISSING', severity: 'error', message: `Reviewed transport adapter ${network.transportAdapterId} is not registered.`, fix: 'Install a reviewed adapter or choose the built-in local, WebSocket, or native UDP transport.' })
  if (network.enabled && network.authentication.mode === 'hook' && !networkAuthenticationProviders().some(/* 比较 provider.id 与 network.authentication.providerId，返回严格相等的判断结果。 */ provider => provider.id === network.authentication.providerId)) issues.push({ code: 'NET-AUTH-HOOK-MISSING', severity: 'error', message: `Authentication provider ${network.authentication.providerId || '(empty)'} is not registered.`, fix: 'Register the reviewed provider before play/build or choose no authentication hook for an offline/local prototype.' })
  if (network.enabled && network.authentication.requireVerifiedPeers && network.authentication.mode !== 'hook') issues.push({ code: 'NET-AUTH-VERIFICATION-MISSING', severity: 'error', message: 'Verified peers are required without an authentication hook.', fix: 'Choose and register a reviewed authentication provider, or disable verified-peer enforcement for trusted local development.' })
  if (network.enabled) {
    for (const serviceIssue of networkServiceSelectionIssues(network)) issues.push({ code: 'NET-SERVICE-MISSING', severity: 'error', message: serviceIssue, fix: 'Install a reviewed provider or clear the optional identity/lobby/relay selection in Network Studio.' })
    const selectedAdapter = reviewedNetworkTransports().find(/* 比较 adapter.id 与 network.transportAdapterId，返回严格相等的判断结果。 */ adapter => adapter.id === network.transportAdapterId)
    const encryption = networkEncryptionGuidance(network, selectedAdapter?.encrypted === true)
    if (encryption.severity !== 'info') issues.push({ code: 'NET-ENCRYPTION', severity: encryption.severity, message: encryption.message, fix: 'Use a secure WebSocket/reviewed encrypted adapter, or disable the strict encryption requirement only for trusted local development.' })
    const replicated = new Set<string>()
    for (const definition of network.replicatedEntities) {
      if (replicated.has(definition.entityUuid)) issues.push({ code: 'NET-REPLICATION-DUPLICATE', severity: 'error', message: `Entity ${definition.entityUuid} has more than one replication definition.`, fix: 'Keep one replication definition per entity in Network Studio → Replication.' })
      replicated.add(definition.entityUuid)
      if (!physicsState.world.entities.some(/* 比较 entity.uuid 与 definition.entityUuid，返回严格相等的判断结果。 */ entity => entity.uuid === definition.entityUuid)) issues.push({ code: 'NET-REPLICATION-ENTITY', severity: 'error', message: `Replication references missing entity ${definition.entityUuid}.`, fix: 'Remove the stale row or restore the entity before building.' })
      if (definition.authority === 'owner' && !definition.ownerPeerId.trim()) issues.push({ code: 'NET-OWNER-MISSING', severity: 'warning', message: `Owner-authoritative entity ${definition.entityUuid} has no initial peer owner.`, fix: 'Assign an initial owner or allow the host/server to own it until an explicit authority transfer.' })
      if (!definition.alwaysRelevant && network.interest.enabled && definition.interestRadius <= 0) issues.push({ code: 'NET-INTEREST-RADIUS', severity: 'warning', message: `Entity ${definition.entityUuid} uses the global interest radius.`, fix: 'Set an entity radius when it needs a different visibility range, or keep the global radius intentionally.' })
    }
  }
  const assetReferences = assets.records.flatMap(/* 返回按声明顺序构造的数组 [asset.uuid, asset.path]。 */ asset => [asset.uuid, asset.path])
  const enabledPackages = packageState.installed.filter(/* 先计算 item.enabled；仅当其为真值时求右侧 item.project，返回短路求值结果。 */ item => item.enabled && item.project).map(/* 返回 item.manifest.id 的当前值。 */ item => item.manifest.id)
  for (const asset of assets.records.filter(/* 比较 item.assetType 与 'script'，返回严格相等的判断结果。 */ item => item.assetType === 'script').slice(0, 1024)) {
    const source = readTextAsset(asset.uuid) ?? ''
    const owners = physicsState.world.entities.filter(/* 比较 resolveAsset(entity.script2D?.scriptAsset ?? '')?.uuid 与 asset.uuid，返回严格相等的判断结果。 */ entity => resolveAsset(entity.script2D?.scriptAsset ?? '')?.uuid === asset.uuid)
    const contexts = owners.length ? owners.map(/** 结构说明（自动提取）：owners.map 回调；输入 entity；直接调用 entity.components.map；返回表达式求值结果。 */ entity => ({ label: entity.name, components: entity.components.map(/* 返回 component.kind 的当前值。 */ component => component.kind) })) : [{ label: asset.name, components: undefined }]
    for (const context of contexts) {
      const report = validateScriptContract(source, { components: context.components, inputActions: physicsState.inputMap.map(/* 返回 action.name 的当前值。 */ action => action.name), assets: assetReferences, packages: enabledPackages })
      for (const diagnostic of report.diagnostics) issues.push({ code: diagnostic.code, severity: diagnostic.severity, message: `${context.label} · ${asset.path}:${diagnostic.line}: ${diagnostic.message}`, fix: 'Open Script Studio → Contract and satisfy or correct the declared behavior requirement.' })
    }
  }
  for (const resource of validateResourceProject(assets.records)) issues.push({ code: resource.code, severity: resource.severity, message: resource.message, fix: 'Open Assets → Content Studio → Resource and repair the parent, kind, or JSON overrides.' })
  for (const asset of assets.records.filter(/* 返回 item.interchange 的当前值。 */ item => item.interchange).slice(0, 4_096)) {
    const metadata = asset.interchange!, ids = new Set<string>(), sourceKeys = new Set<string>()
    if (!/^[0-9a-f]{64}$/i.test(metadata.sourceHash)) issues.push({ code: 'CONTENT-SOURCE-HASH', severity: 'error', message: `${asset.path} has no deterministic external-source identity.`, fix: 'Reimport the original metadata source in Content Studio.' })
    for (const slice of metadata.slices) {
      if (ids.has(slice.id) || sourceKeys.has(slice.sourceKey)) { issues.push({ code: 'CONTENT-SLICE-IDENTITY', severity: 'error', message: `${asset.path} contains duplicate frame identity ${slice.sourceKey}.`, fix: 'Make frame names unique in the source tool, then reimport.' }); break }
      ids.add(slice.id); sourceKeys.add(slice.sourceKey)
    }
    if (asset.assetType === 'atlas' && metadata.texturePath) for (const issue of resolveInterchangeTexture(asset, assets.records).diagnostics) issues.push({code:issue.code,severity:issue.severity,message:issue.message,fix:'Assign the intended image by stable asset reference in Content Studio.'})
  }
  return issues.slice(0, 256)
}
