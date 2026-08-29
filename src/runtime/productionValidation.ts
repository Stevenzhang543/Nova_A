import { readTextAsset, type AssetDatabaseState } from '../assets/AssetDatabase'
import { queryRendererCapabilities, rendererCapabilityState } from '../renderer/capabilities'
import { materialRuntimeDiagnostics, normalizeMaterial, validateMaterialForPlatform } from '../renderer/materials'
import { renderingSettings } from '../renderer/renderSettings'
import type { RendererStats } from '../renderer/types'
import type { AudioProjectSettings } from './audio'
import { audioRuntime } from './audio'
import { particleDiagnostics } from './particles'
import { OFFICIAL_NETWORKING_PACKAGE_ID, packageEnabled } from './packages'
import { productionSettings } from './production'

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
  return issues.slice(0, 256)
}
