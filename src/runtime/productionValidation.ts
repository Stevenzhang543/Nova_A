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

export interface ProductionValidationIssue { code: string; severity: 'warning' | 'error'; message: string; fix: string }

export function validateProductionRuntime(assets: Pick<AssetDatabaseState, 'records'>, renderer: RendererStats, audio: AudioProjectSettings): ProductionValidationIssue[] {
  const issues: ProductionValidationIssue[] = [], capability = rendererCapabilityState.report ?? queryRendererCapabilities(renderer.backend)
  if (renderingSettings.rendererPath === 'Native' && capability.target === 'web') issues.push({ code: 'REN-PATH-UNAVAILABLE', severity: renderingSettings.unsupportedPolicy === 'Block' ? 'error' : 'warning', message: 'The Native renderer path was requested for a web runtime.', fix: 'Choose Auto or Compatibility for web builds.' })
  if (capability.path === 'Diagnostic fallback' && (renderingSettings.lightingEnabled || renderingSettings.postProcessing.enabled)) issues.push({ code: 'REN-FALLBACK-ACTIVE', severity: renderingSettings.unsupportedPolicy === 'Block' ? 'error' : 'warning', message: 'Advanced rendering is enabled while the Canvas2D diagnostic fallback is active.', fix: 'Restore WebGL2 or disable lighting/post processing in Rendering → Quality.' })
  for (const event of materialRuntimeDiagnostics.fallbackEvents.slice(0, 8)) issues.push({ code: 'SHD-EXPLICIT-FALLBACK', severity: renderingSettings.unsupportedPolicy === 'Block' ? 'error' : 'warning', message: `${event.reference}: ${event.reason}`, fix: event.actionableFix })
  for (const asset of assets.records.filter(asset => asset.assetType === 'material').slice(0, 512)) {
    const source = readTextAsset(asset.uuid); if (!source) { issues.push({ code: 'SHD-SOURCE-MISSING', severity: 'error', message: `${asset.name} has no readable material source.`, fix: 'Reimport or restore the material asset.' }); continue }
    try { const diagnostics = validateMaterialForPlatform(normalizeMaterial(JSON.parse(source)), capability.target, capability.backend); for (const diagnostic of diagnostics.filter(item => item.severity === 'error')) issues.push({ code: 'SHD-PLATFORM', severity: 'error', message: `${asset.name}: ${diagnostic.message}`, fix: 'Open Rendering → Shaders and use the indicated diagnostic line.' }) } catch { issues.push({ code: 'SHD-JSON', severity: 'error', message: `${asset.name} is not valid material JSON.`, fix: 'Restore the last valid material source or recreate the asset.' }) }
  }
  const textureMb = renderer.textureMemoryBytes / 1048576
  if (renderer.drawCalls > productionSettings.performance.drawCallBudget) issues.push({ code: 'REN-DRAW-BUDGET', severity: 'warning', message: `${renderer.drawCalls} draw calls exceed the ${productionSettings.performance.drawCallBudget} budget.`, fix: 'Open Rendering → Diagnostics and resolve the reported batch-break reasons.' })
  if (textureMb > productionSettings.performance.textureBudgetMb) issues.push({ code: 'REN-TEXTURE-BUDGET', severity: 'error', message: `${textureMb.toFixed(1)} MB of GPU textures exceed the ${productionSettings.performance.textureBudgetMb} MB budget.`, fix: 'Reduce texture max sizes/compression or atlas compatible sprites.' })
  if (renderer.gpuMs !== null && renderer.gpuMs > productionSettings.performance.gpuBudgetMs) issues.push({ code: 'REN-GPU-BUDGET', severity: 'warning', message: `${renderer.gpuMs.toFixed(2)} ms GPU time exceeds the ${productionSettings.performance.gpuBudgetMs} ms budget.`, fix: 'Capture the frame, inspect overdraw and reduce expensive post/material passes.' })
  if (particleDiagnostics.updateMs > productionSettings.performance.particleBudgetMs || particleDiagnostics.budgetExceeded) issues.push({ code: 'REN-PARTICLE-BUDGET', severity: 'warning', message: `${particleDiagnostics.activeParticles} particles use ${particleDiagnostics.updateMs.toFixed(2)} ms.`, fix: 'Lower emitter rates/lifetimes or the per-emitter maximum.' })
  const knownBuses = new Set(audio.mixer.buses.map(bus => bus.id))
  for (const bus of audio.mixer.buses) for (const send of bus.sends) if (!knownBuses.has(send.target)) issues.push({ code: 'AUD-ROUTE-MISSING', severity: 'error', message: `${bus.name} sends to missing bus ${send.target}.`, fix: 'Choose an existing target bus in Presentation → Audio.' })
  if (audioRuntime.diagnostics.contextState === 'suspended' && audioRuntime.diagnostics.activeVoices) issues.push({ code: 'AUD-SUSPENDED', severity: 'error', message: 'Audio output is suspended while voices are active.', fix: 'Open Presentation → Audio and press Recover audio.' })
  if (audioRuntime.diagnostics.underruns > 0) issues.push({ code: 'AUD-UNDERRUN', severity: 'warning', message: `${audioRuntime.diagnostics.underruns} audio underruns were detected.`, fix: 'Prefer streaming for long music, preload short effects, and reduce simultaneous voices.' })
  if (audioRuntime.diagnostics.failures.length) issues.push({ code: 'AUD-FAILURE', severity: 'error', message: audioRuntime.diagnostics.failures[0].message, fix: audioRuntime.diagnostics.failures[0].recovery })
  const network = productionSettings.networking
  if (network.enabled && !packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID)) issues.push({ code: 'NET-PACKAGE-MISSING', severity: 'error', message: 'Networking is enabled but the optional Nova Networking package is not installed.', fix: 'Open Network Studio and install the reviewed optional package.' })
  if (network.enabled && !network.permissionGranted) issues.push({ code: 'NET-PERMISSION-DENIED', severity: 'error', message: 'Networking is enabled without an explicit project network permission.', fix: 'Review the transport and endpoint in Network Studio, then grant permission.' })
  if (network.enabled && !network.channels.some(channel => channel.delivery === 'reliable-ordered')) issues.push({ code: 'NET-RELIABLE-MISSING', severity: 'error', message: 'Networking has no reliable ordered channel for lifecycle and RPC messages.', fix: 'Restore or create a reliable ordered channel in Network Studio → Protocol.' })
  if (network.enabled && network.rpcContracts.some(rpc => !network.channels.some(channel => channel.id === rpc.channelId))) issues.push({ code: 'NET-RPC-CHANNEL', severity: 'error', message: 'At least one RPC references a missing channel.', fix: 'Choose an existing channel for every RPC contract.' })
  const assetReferences = assets.records.flatMap(asset => [asset.uuid, asset.path])
  const enabledPackages = packageState.installed.filter(item => item.enabled && item.project).map(item => item.manifest.id)
  for (const asset of assets.records.filter(item => item.assetType === 'script').slice(0, 1024)) {
    const source = readTextAsset(asset.uuid) ?? ''
    const owners = physicsState.world.entities.filter(entity => resolveAsset(entity.script2D?.scriptAsset ?? '')?.uuid === asset.uuid)
    const contexts = owners.length ? owners.map(entity => ({ label: entity.name, components: entity.components.map(component => component.kind) })) : [{ label: asset.name, components: undefined }]
    for (const context of contexts) {
      const report = validateScriptContract(source, { components: context.components, inputActions: physicsState.inputMap.map(action => action.name), assets: assetReferences, packages: enabledPackages })
      for (const diagnostic of report.diagnostics) issues.push({ code: diagnostic.code, severity: diagnostic.severity, message: `${context.label} · ${asset.path}:${diagnostic.line}: ${diagnostic.message}`, fix: 'Open Script Studio → Contract and satisfy or correct the declared behavior requirement.' })
    }
  }
  for (const resource of validateResourceProject(assets.records)) issues.push({ code: resource.code, severity: resource.severity, message: resource.message, fix: 'Open Assets → Content Studio → Resource and repair the parent, kind, or JSON overrides.' })
  for (const asset of assets.records.filter(item => item.interchange).slice(0, 4_096)) {
    const metadata = asset.interchange!, ids = new Set<string>(), sourceKeys = new Set<string>()
    if (!/^[0-9a-f]{64}$/i.test(metadata.sourceHash)) issues.push({ code: 'CONTENT-SOURCE-HASH', severity: 'error', message: `${asset.path} has no deterministic external-source identity.`, fix: 'Reimport the original metadata source in Content Studio.' })
    for (const slice of metadata.slices) {
      if (ids.has(slice.id) || sourceKeys.has(slice.sourceKey)) { issues.push({ code: 'CONTENT-SLICE-IDENTITY', severity: 'error', message: `${asset.path} contains duplicate frame identity ${slice.sourceKey}.`, fix: 'Make frame names unique in the source tool, then reimport.' }); break }
      ids.add(slice.id); sourceKeys.add(slice.sourceKey)
    }
    if (asset.assetType === 'atlas' && metadata.texturePath) {
      const expected = metadata.texturePath.replace(/\\/g, '/').split('/').pop()?.toLowerCase()
      if (expected && !assets.records.some(candidate => candidate.assetType === 'image' && (candidate.name.toLowerCase() === expected || candidate.path.toLowerCase().endsWith(`/${expected}`)))) issues.push({ code: 'CONTENT-TEXTURE-MISSING', severity: 'error', message: `${asset.path} references missing texture ${metadata.texturePath}.`, fix: 'Import the texture beside the metadata or repair the texture reference in Content Studio.' })
    }
  }
  return issues.slice(0, 256)
}
